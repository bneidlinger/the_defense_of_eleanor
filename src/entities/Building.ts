import Phaser from "phaser";
import { TILE, COLORS, PALISADE, STOCKPILE_HP } from "../config";
import type { Tile } from "../core/Grid";
import type { GameScene } from "../scenes/GameScene";

export type BuildingType = "foundation" | "wall" | "stockpile";

// A placed structure. In MVP 0 there are exactly three flavours:
//  - foundation: a ghost the villager must physically build (does NOT block movement)
//  - wall:       a finished palisade (blocks movement, can be breached)
//  - stockpile:  the 2x2 central objective; losing it ends the run
export class Building {
  readonly type: BuildingType;
  readonly footprint: Tile[];
  readonly px: number;
  readonly py: number;
  readonly pw: number;
  readonly ph: number;

  maxHp: number;
  hp: number;
  buildTime: number;
  buildProgress = 0;
  built: boolean;
  dead = false;

  private gfx: Phaser.GameObjects.Graphics;

  constructor(private scene: GameScene, public tx: number, public ty: number, type: BuildingType) {
    this.type = type;

    if (type === "stockpile") {
      this.footprint = [
        { x: tx, y: ty }, { x: tx + 1, y: ty },
        { x: tx, y: ty + 1 }, { x: tx + 1, y: ty + 1 },
      ];
      this.maxHp = STOCKPILE_HP;
      this.buildTime = 0;
      this.built = true;
    } else {
      this.footprint = [{ x: tx, y: ty }];
      this.maxHp = PALISADE.maxHp;
      this.buildTime = PALISADE.buildTime;
      this.built = type === "wall";
    }
    this.hp = this.maxHp;

    const minX = Math.min(...this.footprint.map((t) => t.x));
    const minY = Math.min(...this.footprint.map((t) => t.y));
    const maxX = Math.max(...this.footprint.map((t) => t.x));
    const maxY = Math.max(...this.footprint.map((t) => t.y));
    this.px = minX * TILE;
    this.py = minY * TILE;
    this.pw = (maxX - minX + 1) * TILE;
    this.ph = (maxY - minY + 1) * TILE;

    this.gfx = scene.add.graphics().setDepth(10);
    this.redraw();
  }

  get center(): { x: number; y: number } {
    return { x: this.px + this.pw / 2, y: this.py + this.ph / 2 };
  }

  // Walls and the stockpile are solid; an unbuilt foundation is intangible.
  get blocks(): boolean {
    return this.type !== "foundation";
  }

  isDamaged(): boolean {
    return this.built && this.hp < this.maxHp;
  }

  // Returns true when this tick of construction finishes the building.
  addBuildProgress(seconds: number): boolean {
    if (this.type !== "foundation") return false;
    this.buildProgress += seconds;
    if (this.buildProgress >= this.buildTime) {
      this.completeBuild();
      return true;
    }
    this.redraw();
    return false;
  }

  private completeBuild(): void {
    (this as { type: BuildingType }).type = "wall";
    this.built = true;
    this.buildProgress = this.buildTime;
    this.hp = this.maxHp;
    this.scene.onBuildingCompleted(this);
    this.redraw();
  }

  repair(hp: number): void {
    this.hp = Math.min(this.maxHp, this.hp + hp);
    this.redraw();
  }

  damage(d: number): void {
    if (this.type === "foundation" || this.dead) return;
    this.hp -= d;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    this.redraw();
  }

  private redraw(): void {
    const g = this.gfx;
    g.clear();

    if (this.type === "foundation") {
      const ratio = Phaser.Math.Clamp(this.buildProgress / this.buildTime, 0, 1);
      // Dashed-looking translucent footprint.
      g.fillStyle(COLORS.foundationFill, 0.35);
      g.fillRect(this.px + 2, this.py + 2, this.pw - 4, this.ph - 4);
      // Progress fills from the bottom up.
      const fillH = (this.ph - 4) * ratio;
      g.fillStyle(COLORS.foundationProgress, 0.9);
      g.fillRect(this.px + 2, this.py + this.ph - 2 - fillH, this.pw - 4, fillH);
      g.lineStyle(1.5, COLORS.foundationProgress, 0.8);
      g.strokeRect(this.px + 1.5, this.py + 1.5, this.pw - 3, this.ph - 3);
      return;
    }

    const ratio = this.hp / this.maxHp;
    if (this.type === "stockpile") {
      g.fillStyle(COLORS.stockpile, 1);
      g.fillRect(this.px + 2, this.py + 2, this.pw - 4, this.ph - 4);
      g.lineStyle(2, COLORS.stockpileStroke, 1);
      g.strokeRect(this.px + 2, this.py + 2, this.pw - 4, this.ph - 4);
    } else {
      // Wall: shifts toward a scorched red as it takes damage.
      const fill = ratio > 0.5 ? COLORS.wall : COLORS.wallDamaged;
      g.fillStyle(fill, 1);
      g.fillRect(this.px + 1, this.py + 1, this.pw - 2, this.ph - 2);
      g.lineStyle(1.5, COLORS.wallStroke, 1);
      g.strokeRect(this.px + 1, this.py + 1, this.pw - 2, this.ph - 2);
    }

    // HP bar above, shown when hurt (always for the stockpile).
    if (this.isDamaged() || this.type === "stockpile") {
      const bw = this.pw - 4;
      g.fillStyle(COLORS.hpBack, 1);
      g.fillRect(this.px + 2, this.py - 6, bw, 3);
      const c = ratio > 0.5 ? COLORS.hpGood : ratio > 0.25 ? COLORS.hpMid : COLORS.hpBad;
      g.fillStyle(c, 1);
      g.fillRect(this.px + 2, this.py - 6, bw * ratio, 3);
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
