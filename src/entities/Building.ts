import Phaser from "phaser";
import { TILE, COLORS } from "../config";
import type { Tile } from "../core/Grid";
import type { BuildingDef } from "../data/buildings";
import type { GameScene } from "../scenes/GameScene";

// A placed structure, driven entirely by its BuildingDef. Before `built` it is
// an intangible foundation the villager must construct; once built it blocks
// movement (if the def says so) and, for towers, fires at nearby enemies.
export class Building {
  readonly def: BuildingDef;
  readonly footprint: Tile[];
  readonly px: number;
  readonly py: number;
  readonly pw: number;
  readonly ph: number;

  readonly maxHp: number;
  hp: number;
  readonly buildTime: number;
  buildProgress = 0;
  built: boolean;
  dead = false;

  private cooldown = 0;
  private gfx: Phaser.GameObjects.Graphics;

  constructor(private scene: GameScene, public tx: number, public ty: number, def: BuildingDef, preBuilt = false) {
    this.def = def;
    this.built = preBuilt;
    this.maxHp = def.maxHp;
    this.hp = def.maxHp;
    this.buildTime = def.buildTime;

    this.footprint = [];
    for (let dy = 0; dy < def.footprint.h; dy++)
      for (let dx = 0; dx < def.footprint.w; dx++)
        this.footprint.push({ x: tx + dx, y: ty + dy });

    this.px = tx * TILE;
    this.py = ty * TILE;
    this.pw = def.footprint.w * TILE;
    this.ph = def.footprint.h * TILE;

    // Desync tower fire so a row of them doesn't volley in lockstep.
    if (def.kind === "tower") this.cooldown = Math.random() * (def.attackCd ?? 1);

    this.gfx = scene.add.graphics().setDepth(10);
    this.redraw();
  }

  get center(): { x: number; y: number } {
    return { x: this.px + this.pw / 2, y: this.py + this.ph / 2 };
  }

  get blocks(): boolean {
    return this.built && this.def.blocksMovement;
  }

  get kind(): BuildingDef["kind"] {
    return this.def.kind;
  }

  isDamaged(): boolean {
    return this.built && this.hp < this.maxHp;
  }

  // Returns true on the tick that finishes construction.
  addBuildProgress(seconds: number): boolean {
    if (this.built) return false;
    this.buildProgress += seconds;
    if (this.buildProgress >= this.buildTime) {
      this.buildProgress = this.buildTime;
      this.built = true;
      this.hp = this.maxHp;
      this.scene.onBuildingCompleted(this);
      this.redraw();
      return true;
    }
    this.redraw();
    return false;
  }

  repair(hp: number): void {
    this.hp = Math.min(this.maxHp, this.hp + hp);
    this.redraw();
  }

  damage(d: number): void {
    if (!this.built || this.dead) return; // foundations are intangible
    this.hp -= d;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    this.redraw();
  }

  // Per-frame behaviour. Only towers do anything here.
  update(dt: number, scene: GameScene): void {
    if (!this.built || this.def.kind !== "tower") return;
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      const c = this.center;
      const target = scene.nearestEnemy(c.x, c.y, this.def.range ?? 0);
      if (target) {
        scene.fireProjectile(c.x, c.y, target, this.def.damage ?? 0);
        this.cooldown = this.def.attackCd ?? 1;
      }
    }
  }

  private redraw(): void {
    const g = this.gfx;
    g.clear();

    if (!this.built) {
      const ratio = Phaser.Math.Clamp(this.buildProgress / this.buildTime, 0, 1);
      g.fillStyle(COLORS.foundationFill, 0.35);
      g.fillRect(this.px + 2, this.py + 2, this.pw - 4, this.ph - 4);
      const fillH = (this.ph - 4) * ratio;
      g.fillStyle(COLORS.foundationProgress, 0.9);
      g.fillRect(this.px + 2, this.py + this.ph - 2 - fillH, this.pw - 4, fillH);
      g.lineStyle(1.5, this.def.stroke, 0.7);
      g.strokeRect(this.px + 1.5, this.py + 1.5, this.pw - 3, this.ph - 3);
      return;
    }

    const ratio = this.hp / this.maxHp;
    const c = this.center;
    if (this.def.kind === "wall") {
      g.fillStyle(ratio > 0.5 ? this.def.fill : COLORS.wallDamaged, 1);
      g.fillRect(this.px + 1, this.py + 1, this.pw - 2, this.ph - 2);
      g.lineStyle(1.5, this.def.stroke, 1);
      g.strokeRect(this.px + 1, this.py + 1, this.pw - 2, this.ph - 2);
    } else if (this.def.kind === "tower") {
      g.fillStyle(this.def.fill, 1);
      g.fillRect(this.px + 1, this.py + 1, this.pw - 2, this.ph - 2);
      g.lineStyle(2, this.def.stroke, 1);
      g.strokeRect(this.px + 1, this.py + 1, this.pw - 2, this.ph - 2);
      g.fillStyle(COLORS.towerRoof, 1);
      g.fillRect(this.px + 5, this.py + 5, this.pw - 10, this.ph - 10);
      g.fillStyle(COLORS.projectile, 1);
      g.fillCircle(c.x, c.y, 3);
      if (ratio <= 0.5) { g.fillStyle(COLORS.wallDamaged, 0.35); g.fillRect(this.px + 1, this.py + 1, this.pw - 2, this.ph - 2); }
    } else {
      g.fillStyle(this.def.fill, 1);
      g.fillRect(this.px + 2, this.py + 2, this.pw - 4, this.ph - 4);
      g.lineStyle(2, this.def.stroke, 1);
      g.strokeRect(this.px + 2, this.py + 2, this.pw - 4, this.ph - 4);
    }

    if (this.isDamaged() || this.def.kind === "stockpile") {
      const bw = this.pw - 4;
      g.fillStyle(COLORS.hpBack, 1);
      g.fillRect(this.px + 2, this.py - 6, bw, 3);
      const col = ratio > 0.5 ? COLORS.hpGood : ratio > 0.25 ? COLORS.hpMid : COLORS.hpBad;
      g.fillStyle(col, 1);
      g.fillRect(this.px + 2, this.py - 6, bw * ratio, 3);
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
