import Phaser from "phaser";
import {
  TILE, COLS, ROWS, FIELD_W, FIELD_H, COLORS, PALISADE, ECON_START,
  SCENE_GAME, SCENE_UI, type EnemyKind,
} from "../config";
import { Grid, type Tile } from "../core/Grid";
import { findPath as aStar, type PathOpts } from "../core/astar";
import { Building } from "../entities/Building";
import { Villager } from "../entities/Villager";
import { Hero } from "../entities/Hero";
import { Enemy } from "../entities/Enemy";
import { WaveSystem } from "../systems/WaveSystem";
import { floatingText, popFlash, ringMarker, hex } from "../core/effects";

export type Tool = "palisade" | "none";
export type GameState = "playing" | "over";

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

  economy = { wood: 0, gold: 0 };
  tool: Tool = "palisade";
  state: GameState = "playing";
  overReason = "";
  kills = 0;

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
    this.economy = { wood: ECON_START.wood, gold: ECON_START.gold };
    this.tool = "palisade";
    this.state = "playing";
    this.overReason = "";
    this.kills = 0;
    this.dragging = false;
    this.lastPlacedIdx = -1;
    this.banner = undefined;

    this.drawBackground();

    const cx = Math.floor(COLS / 2) - 1;
    const cy = Math.floor(ROWS / 2) - 1;
    this.stockpile = new Building(this, cx, cy, "stockpile");
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
    this.input.keyboard?.on("keydown-ONE", () => { if (this.state === "playing") this.tool = "palisade"; });
    this.input.keyboard?.on("keydown-ESC", () => { if (this.state === "playing") this.tool = "none"; });
    this.input.keyboard?.on("keydown-R", () => { if (this.state === "over") this.restart(); });

    if (!this.scene.isActive(SCENE_UI)) this.scene.launch(SCENE_UI);

    this.showBanner("DEFEND THE STOCKPILE", COLORS.warn);
  }

  override update(_time: number, delta: number): void {
    if (this.state === "over") return;
    const dt = Math.min(delta / 1000, 0.05);

    this.wave.update(dt, this);
    this.villager.update(dt, this);
    this.hero.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);

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

  spendWood(n: number): void { this.economy.wood = Math.max(0, this.economy.wood - n); }
  addGold(n: number): void { this.economy.gold += n; }

  spawnEnemy(kind: EnemyKind, x: number, y: number): void {
    this.enemies.push(new Enemy(this, kind, x, y));
  }

  announceWave(w: number): void {
    this.showBanner(`WAVE ${w} — FROM THE NORTH`, COLORS.danger);
  }

  // A foundation finished: turn its tiles solid and shove anyone standing on them out.
  onBuildingCompleted(b: Building): void {
    for (const t of b.footprint) {
      this.grid.setBlocked(t.x, t.y, true);
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
        this.occupancy.set(this.grid.idx(t.x, t.y), b);
      }
    }
  }

  private freeTiles(b: Building): void {
    for (const t of b.footprint) {
      const i = this.grid.idx(t.x, t.y);
      this.grid.setBlocked(t.x, t.y, false);
      this.occupancy.delete(i);
      this.tileHasBuilding.delete(i);
    }
  }

  private ejectFromWall(b: Building): void {
    const reloc = (px: number, py: number): { x: number; y: number } | null => {
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      if (!this.grid.isBlocked(tx, ty)) return null;
      const w = this.grid.nearestWalkable(tx, ty);
      return w ? this.grid.tileToWorld(w.x, w.y) : null;
    };
    let p = reloc(this.villager.x, this.villager.y);
    if (p) this.villager.nudgeTo(p.x, p.y);
    p = reloc(this.hero.x, this.hero.y);
    if (p) { this.hero.x = p.x; this.hero.y = p.y; }
    for (const e of this.enemies) {
      p = reloc(e.x, e.y);
      if (p) { e.x = p.x; e.y = p.y; }
    }
    void b;
  }

  private canPlace(tx: number, ty: number): boolean {
    if (!this.grid.inBounds(tx, ty)) return false;
    if (this.tileHasBuilding.has(this.grid.idx(tx, ty))) return false;
    if (this.economy.wood < (PALISADE.cost.wood ?? 0)) return false;
    return true;
  }

  private tryPlaceAt(tx: number, ty: number): boolean {
    if (!this.canPlace(tx, ty)) return false;
    this.economy.wood -= PALISADE.cost.wood ?? 0;
    const b = new Building(this, tx, ty, "foundation");
    this.tileHasBuilding.add(this.grid.idx(tx, ty));
    this.buildings.push(b);
    return true;
  }

  // ---- input ----------------------------------------------------------------

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.state === "over") { this.restart(); return; }
    if (pointer.worldY >= FIELD_H) return; // HUD strip belongs to the UI scene

    if (pointer.rightButtonDown()) {
      this.hero.moveTo(pointer.worldX, pointer.worldY, this);
      ringMarker(this, pointer.worldX, pointer.worldY);
      return;
    }

    if (this.tool === "palisade") {
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

    if (this.dragging && this.tool === "palisade" && pointer.isDown && !pointer.rightButtonDown()
        && pointer.worldY < FIELD_H) {
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
    if (this.state !== "playing" || this.tool !== "palisade" || !this.hoverTile) return;
    const t = this.hoverTile;
    if (!this.grid.inBounds(t.x, t.y)) return;
    const col = this.canPlace(t.x, t.y) ? COLORS.ghostOk : COLORS.ghostBad;
    g.fillStyle(col, 0.32);
    g.fillRect(t.x * TILE + 1, t.y * TILE + 1, TILE - 2, TILE - 2);
    g.lineStyle(1.5, col, 0.9);
    g.strokeRect(t.x * TILE + 1, t.y * TILE + 1, TILE - 2, TILE - 2);
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
    this.ghost.clear();
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
