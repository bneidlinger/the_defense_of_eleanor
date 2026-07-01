import Phaser from "phaser";
import {
  TILE, COLS, ROWS, FIELD_W, FIELD_H, COLORS, ECON_START, KEEP,
  SCENE_GAME, SCENE_UI, type EnemyKind,
} from "../config";
import { Grid, type Tile } from "../core/Grid";
import { findPath as aStar, type PathOpts } from "../core/astar";
import { Building } from "../entities/Building";
import { Projectile } from "../entities/Projectile";
import { Villager } from "../entities/Villager";
import { Hero } from "../entities/Hero";
import { Enemy } from "../entities/Enemy";
import { WaveSystem } from "../systems/WaveSystem";
import { BUILD_DEFS, BUILDABLES, canAfford, type BuildingDef } from "../data/buildings";
import { floatingText, popFlash, ringMarker, hex } from "../core/effects";

// A build tool is a building id ("palisade", "watchtower", ...) or "none".
export type Tool = string;
export type GameState = "playing" | "over";

const DIGIT_KEY: Record<string, string> = { "1": "ONE", "2": "TWO", "3": "THREE", "4": "FOUR", "5": "FIVE" };

// The orchestrator. Owns world state and the per-frame update order, and
// exposes the small surface the entities call back into.
export class GameScene extends Phaser.Scene {
  grid!: Grid;
  buildings: Building[] = [];
  enemies: Enemy[] = [];
  villager!: Villager;
  hero!: Hero;
  stockpile!: Building;
  wave!: WaveSystem;

  projectiles: Projectile[] = [];
  economy = { wood: 0, gold: 0 };
  tool: Tool = "palisade";
  state: GameState = "playing";
  overReason = "";
  kills = 0;
  finalScore = 0;
  bestScore = 0;
  isNewBest = false;

  // Tile bookkeeping: solid tiles -> their building; any tile with a building.
  private occupancy = new Map<number, Building>();
  private tileHasBuilding = new Set<number>();

  private ghost!: Phaser.GameObjects.Graphics;
  private banner?: Phaser.GameObjects.Text;
  hoverTile: Tile | null = null;
  private dragging = false;
  private lastPlacedIdx = -1;

  constructor() { super(SCENE_GAME); }

  create(): void {
    // Full reset so scene.restart() gives a clean run.
    this.grid = new Grid();
    this.buildings = [];
    this.enemies = [];
    this.occupancy.clear();
    this.tileHasBuilding.clear();
    this.projectiles = [];
    this.economy = { wood: ECON_START.wood, gold: ECON_START.gold };
    this.tool = "palisade";
    this.state = "playing";
    this.overReason = "";
    this.kills = 0;
    this.finalScore = 0;
    this.bestScore = 0;
    this.isNewBest = false;
    this.dragging = false;
    this.lastPlacedIdx = -1;
    this.banner = undefined;

    this.drawBackground();

    const cx = Math.floor(COLS / 2) - 1;
    const cy = Math.floor(ROWS / 2) - 1;
    this.stockpile = new Building(this, cx, cy, BUILD_DEFS.stockpile, true);
    this.registerStatic(this.stockpile);

    const sc = this.stockpile.center;
    this.villager = new Villager(this, sc.x - TILE * 3, sc.y);
    this.hero = new Hero(this, sc.x + TILE * 3, sc.y);
    this.wave = new WaveSystem();

    this.ghost = this.add.graphics().setDepth(15);

    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
    for (const def of BUILDABLES) {
      const evt = def.hotkey ? DIGIT_KEY[def.hotkey] : undefined;
      if (evt) this.input.keyboard?.on("keydown-" + evt, () => { if (this.state === "playing") this.tool = def.id; });
    }
    this.input.keyboard?.on("keydown-ESC", () => { if (this.state === "playing") this.tool = "none"; });
    this.input.keyboard?.on("keydown-R", () => { if (this.state === "over") this.restart(); else this.tool = "repair"; });
    this.input.keyboard?.on("keydown-G", () => {
      if (this.state !== "playing") return;
      const h = this.hero;
      if (h.garrisoned || h.headingToGarrison) h.moveTo(h.x, h.y, this);
      else { const k = this.nearestKeep(h.x, h.y); if (k) h.garrisonAt(k, this); }
    });

    if (!this.scene.isActive(SCENE_UI)) this.scene.launch(SCENE_UI);

    this.showBanner("DEFEND THE STOCKPILE", COLORS.warn);
  }

  override update(_time: number, delta: number): void {
    if (this.state === "over") return;
    const dt = Math.min(delta / 1000, 0.05);

    this.wave.update(dt, this);
    this.villager.update(dt, this);
    this.hero.update(dt, this);
    if (this.hero.garrisoned) this.economy.gold += KEEP.goldPerSec * dt; // Keep economy bonus
    for (const e of this.enemies) e.update(dt, this);
    for (const b of this.buildings) b.update(dt, this);   // towers acquire & fire
    for (const p of this.projectiles) p.update(dt, this); // arrows fly & strike

    // Reap spent projectiles.
    if (this.projectiles.length > 0) {
      const flying: Projectile[] = [];
      for (const p of this.projectiles) { if (p.alive) flying.push(p); else p.destroy(); }
      this.projectiles = flying;
    }

    // Reap dead enemies (award bounty).
    if (this.enemies.length > 0) {
      const survivors: Enemy[] = [];
      for (const e of this.enemies) {
        if (e.alive) survivors.push(e);
        else this.killEnemy(e);
      }
      this.enemies = survivors;
    }

    // Reap destroyed buildings (free their tiles).
    if (this.buildings.some((b) => b.dead)) {
      const keep: Building[] = [];
      for (const b of this.buildings) {
        if (!b.dead) { keep.push(b); continue; }
        this.freeTiles(b);
        const wasStockpile = b === this.stockpile;
        b.destroy();
        if (wasStockpile) this.gameOver("Your stockpile was overrun.");
      }
      this.buildings = keep;
    }

    if (!this.villager.alive) this.gameOver("Your villager has fallen.");
  }

  // ---- callbacks used by entities -------------------------------------------

  findPath(sx: number, sy: number, gx: number, gy: number, opts?: PathOpts): Tile[] | null {
    return aStar(this.grid, sx, sy, gx, gy, opts);
  }

  occupancyAt(tx: number, ty: number): Building | null {
    return this.occupancy.get(this.grid.idx(tx, ty)) ?? null;
  }

  nearestEnemy(x: number, y: number, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = range * range;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  }

  nearestKeep(x: number, y: number): Building | null {
    let best: Building | null = null;
    let bd = Infinity;
    for (const b of this.buildings) {
      if (b.def.kind !== "keep" || !b.built) continue;
      const c = b.center;
      const d = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // Villager build/repair speed multiplier — boosted while the Warden garrisons a Keep.
  villagerWorkSpeed(): number {
    return this.hero.garrisoned ? KEEP.workMult : 1;
  }

  spendWood(n: number): void { this.economy.wood = Math.max(0, this.economy.wood - n); }
  addGold(n: number): void { this.economy.gold += n; }

  spawnEnemy(kind: EnemyKind, x: number, y: number): void {
    this.enemies.push(new Enemy(this, kind, x, y));
  }

  fireProjectile(x: number, y: number, target: Enemy, damage: number): void {
    this.projectiles.push(new Projectile(this, x, y, target, damage));
  }

  announceWave(w: number): void {
    this.showBanner(`WAVE ${w} — FROM THE NORTH`, COLORS.danger);
  }

  // A foundation finished: turn its tiles solid and shove anyone standing on them out.
  // Gates block only the enemy layer so friendly units keep passing through.
  onBuildingCompleted(b: Building): void {
    const friendlySolid = b.def.kind !== "gate";
    for (const t of b.footprint) {
      if (friendlySolid) this.grid.setBlocked(t.x, t.y, true);
      this.grid.setEnemyBlocked(t.x, t.y, true);
      this.occupancy.set(this.grid.idx(t.x, t.y), b);
    }
    this.ejectFromWall(b);
  }

  onFoundationBuilt(b: Building): void {
    popFlash(this, b.center.x, b.center.y, COLORS.foundationProgress, 7);
  }

  // ---- internals ------------------------------------------------------------

  private killEnemy(e: Enemy): void {
    this.kills++;
    this.addGold(e.def.gold);
    floatingText(this, e.x, e.y - 6, `+${e.def.gold}`, COLORS.stockpile);
    popFlash(this, e.x, e.y, e.def.color, 7);
    e.destroy();
  }

  private registerStatic(b: Building): void {
    this.buildings.push(b);
    for (const t of b.footprint) {
      this.tileHasBuilding.add(this.grid.idx(t.x, t.y));
      if (b.blocks) {
        this.grid.setBlocked(t.x, t.y, true);
        this.grid.setEnemyBlocked(t.x, t.y, true);
        this.occupancy.set(this.grid.idx(t.x, t.y), b);
      }
    }
  }

  private freeTiles(b: Building): void {
    for (const t of b.footprint) {
      const i = this.grid.idx(t.x, t.y);
      this.grid.setBlocked(t.x, t.y, false);
      this.grid.setEnemyBlocked(t.x, t.y, false);
      this.occupancy.delete(i);
      this.tileHasBuilding.delete(i);
    }
  }

  private ejectFromWall(b: Building): void {
    const relocFriendly = (px: number, py: number): { x: number; y: number } | null => {
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      if (!this.grid.isBlocked(tx, ty)) return null;
      const w = this.grid.nearestWalkable(tx, ty);
      return w ? this.grid.tileToWorld(w.x, w.y) : null;
    };
    const relocEnemy = (px: number, py: number): { x: number; y: number } | null => {
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      if (!this.grid.isEnemyBlocked(tx, ty)) return null;
      const w = this.grid.nearestWalkable(tx, ty, 6, true);
      return w ? this.grid.tileToWorld(w.x, w.y) : null;
    };
    let p = relocFriendly(this.villager.x, this.villager.y);
    if (p) this.villager.nudgeTo(p.x, p.y);
    p = relocFriendly(this.hero.x, this.hero.y);
    if (p) { this.hero.x = p.x; this.hero.y = p.y; }
    for (const e of this.enemies) {
      const q = relocEnemy(e.x, e.y);
      if (q) { e.x = q.x; e.y = q.y; }
    }
    void b;
  }

  private currentDef(): BuildingDef | null {
    return this.tool === "none" ? null : BUILD_DEFS[this.tool] ?? null;
  }

  private canPlace(tx: number, ty: number, def: BuildingDef): boolean {
    for (let dy = 0; dy < def.footprint.h; dy++)
      for (let dx = 0; dx < def.footprint.w; dx++) {
        const x = tx + dx, y = ty + dy;
        if (!this.grid.inBounds(x, y)) return false;
        if (this.tileHasBuilding.has(this.grid.idx(x, y))) return false;
      }
    return canAfford(this.economy, def.cost);
  }

  private tryPlaceAt(tx: number, ty: number): boolean {
    const def = this.currentDef();
    if (!def || !this.canPlace(tx, ty, def)) return false;
    this.economy.wood -= def.cost.wood ?? 0;
    this.economy.gold -= def.cost.gold ?? 0;
    const b = new Building(this, tx, ty, def, false);
    for (const t of b.footprint) this.tileHasBuilding.add(this.grid.idx(t.x, t.y));
    this.buildings.push(b);
    return true;
  }

  // ---- input ----------------------------------------------------------------

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.state === "over") { this.restart(); return; }
    if (pointer.worldY >= FIELD_H) return; // HUD strip belongs to the UI scene

    if (pointer.rightButtonDown()) {
      const t = this.grid.worldToTile(pointer.worldX, pointer.worldY);
      const b = this.occupancyAt(t.x, t.y);
      if (b && b.def.kind === "keep" && b.built) {
        this.hero.garrisonAt(b, this);
        ringMarker(this, b.center.x, b.center.y, COLORS.accent);
      } else {
        this.hero.moveTo(pointer.worldX, pointer.worldY, this);
        ringMarker(this, pointer.worldX, pointer.worldY);
      }
      return;
    }

    if (this.tool === "repair") {
      const t = this.grid.worldToTile(pointer.worldX, pointer.worldY);
      const b = this.occupancyAt(t.x, t.y);
      if (b && b.built && b.isDamaged()) {
        this.villager.setRepairTarget(b);
        ringMarker(this, b.center.x, b.center.y, COLORS.villager);
        floatingText(this, b.center.x, b.center.y - 8, "repair!", COLORS.villager);
      }
      return;
    }

    if (this.currentDef()) {
      this.dragging = true;
      const t = this.grid.worldToTile(pointer.worldX, pointer.worldY);
      this.tryPlaceAt(t.x, t.y);
      this.lastPlacedIdx = this.grid.idx(t.x, t.y);
      this.drawGhost();
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    this.hoverTile = pointer.worldY < FIELD_H
      ? this.grid.worldToTile(pointer.worldX, pointer.worldY)
      : null;

    const def = this.currentDef();
    if (this.dragging && def && def.footprint.w === 1 && def.footprint.h === 1
        && pointer.isDown && !pointer.rightButtonDown() && pointer.worldY < FIELD_H) {
      const t = this.grid.worldToTile(pointer.worldX, pointer.worldY);
      const i = this.grid.idx(t.x, t.y);
      if (i !== this.lastPlacedIdx) {
        this.tryPlaceAt(t.x, t.y);
        this.lastPlacedIdx = i;
      }
    }
    this.drawGhost();
  }

  private onPointerUp(): void {
    this.dragging = false;
    this.lastPlacedIdx = -1;
  }

  private drawGhost(): void {
    const g = this.ghost;
    g.clear();
    if (this.state !== "playing" || !this.hoverTile) return;

    // Repair tool: outline the damaged building under the cursor.
    if (this.tool === "repair") {
      const b = this.occupancyAt(this.hoverTile.x, this.hoverTile.y);
      if (b && b.built && b.isDamaged()) {
        g.lineStyle(2, COLORS.villager, 0.95);
        g.strokeRect(b.px + 1, b.py + 1, b.pw - 2, b.ph - 2);
      }
      return;
    }

    const def = this.currentDef();
    if (!def) return;
    const t = this.hoverTile;
    if (!this.grid.inBounds(t.x, t.y)) return;
    const col = this.canPlace(t.x, t.y, def) ? COLORS.ghostOk : COLORS.ghostBad;
    const w = def.footprint.w * TILE, h = def.footprint.h * TILE;
    g.fillStyle(col, 0.30);
    g.fillRect(t.x * TILE + 1, t.y * TILE + 1, w - 2, h - 2);
    g.lineStyle(1.5, col, 0.9);
    g.strokeRect(t.x * TILE + 1, t.y * TILE + 1, w - 2, h - 2);
  }

  private showBanner(text: string, color: number): void {
    this.banner?.destroy();
    this.banner = this.add.text(FIELD_W / 2, 56, text, {
      fontFamily: "monospace", fontSize: "26px", color: hex(color), fontStyle: "bold",
    }).setOrigin(0.5).setDepth(45);
    this.tweens.add({
      targets: this.banner, alpha: 0, y: 44, duration: 2600, ease: "Cubic.In",
      onComplete: () => { this.banner?.destroy(); this.banner = undefined; },
    });
  }

  private gameOver(reason: string): void {
    if (this.state === "over") return;
    this.state = "over";
    this.overReason = reason;
    this.finalScore = this.score;
    this.bestScore = this.loadBest();
    this.isNewBest = false;
    if (this.finalScore > this.bestScore) {
      this.bestScore = this.finalScore;
      this.isNewBest = true;
      this.saveBest(this.finalScore);
    }
    this.ghost.clear();
  }

  get score(): number {
    return this.wave.wave * 1000 + this.kills * 25;
  }

  private loadBest(): number {
    try { return parseInt(localStorage.getItem("eleanor.best") ?? "0", 10) || 0; } catch { return 0; }
  }

  private saveBest(v: number): void {
    try { localStorage.setItem("eleanor.best", String(v)); } catch { /* ignore */ }
  }

  restart(): void {
    this.scene.restart();
  }

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(0);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        g.fillStyle((x + y) % 2 === 0 ? COLORS.grassA : COLORS.grassB, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    g.lineStyle(1, COLORS.grid, 0.25);
    for (let x = 0; x <= COLS; x++) g.lineBetween(x * TILE, 0, x * TILE, FIELD_H);
    for (let y = 0; y <= ROWS; y++) g.lineBetween(0, y * TILE, FIELD_W, y * TILE);
    g.lineStyle(3, COLORS.fieldEdge, 1);
    g.strokeRect(0, 0, FIELD_W, FIELD_H);
  }
}
