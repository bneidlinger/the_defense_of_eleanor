import Phaser from "phaser";
import { TILE, COLORS, ENEMIES, WALL_PATH_COST, type EnemyKind } from "../config";
import type { Tile } from "../core/Grid";
import type { GameScene } from "../scenes/GameScene";
import { HpBar, popFlash } from "../core/effects";

// A besieger. Default goal is the stockpile; it switches to hunting the
// villager when one strays into aggro range. Movement uses pass-through-walls
// A* so the *route* tells it whether to walk around a wall or breach it
// (§10). When its next step is a solid tile, that tile is the breach target.
export class Enemy {
  // NOTE: assigned in the constructor body, not as a field initializer —
  // with useDefineForClassFields, initializers run before `kind` is set.
  readonly def: (typeof ENEMIES)[EnemyKind];
  x: number;
  y: number;
  hp: number;
  alive = true;

  private attackTimer = 0;
  private repathTimer = 0;
  private path: Tile[] = [];
  private lastGoal: Tile | null = null;

  private body: Phaser.GameObjects.Arc;
  private bar: HpBar;

  constructor(private scene: GameScene, public kind: EnemyKind, x: number, y: number) {
    this.def = ENEMIES[kind];
    this.x = x;
    this.y = y;
    this.hp = this.def.maxHp;
    this.body = scene.add.circle(x, y, this.def.radius, this.def.color).setStrokeStyle(1.5, 0x000000, 0.35).setDepth(20);
    this.bar = new HpBar(scene, 16);
  }

  get tileX(): number { return Math.floor(this.x / TILE); }
  get tileY(): number { return Math.floor(this.y / TILE); }

  takeDamage(d: number): void {
    if (!this.alive) return;
    this.hp -= d;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  update(dt: number, scene: GameScene): void {
    if (!this.alive) return;
    this.attackTimer -= dt;

    // Choose navigation goal: stockpile, or a nearby exposed villager.
    const v = scene.villager;
    let gx = scene.stockpile.tx;
    let gy = scene.stockpile.ty;
    if (v.alive && Math.hypot(v.x - this.x, v.y - this.y) <= this.def.villagerAggro) {
      gx = v.tileX;
      gy = v.tileY;
    }

    this.repathTimer -= dt;
    if (this.path.length === 0 || this.repathTimer <= 0 ||
        !this.lastGoal || this.lastGoal.x !== gx || this.lastGoal.y !== gy) {
      this.path = scene.findPath(this.tileX, this.tileY, gx, gy, { passWalls: true, wallCost: WALL_PATH_COST, forEnemy: true }) ?? [];
      this.repathTimer = 0.4 + Math.random() * 0.3;
      this.lastGoal = { x: gx, y: gy };
    }

    if (this.tryAttack(scene)) { this.draw(); return; }
    this.move(dt, scene);
    this.draw();
  }

  // Returns true if engaged (attacking, or holding between swings).
  private tryAttack(scene: GameScene): boolean {
    const v = scene.villager;
    const h = scene.hero;
    const range = this.def.range;

    if (v.alive && Math.hypot(v.x - this.x, v.y - this.y) <= range) {
      return this.strike(scene, () => v.takeDamage(this.def.damage), v.x, v.y);
    }
    if (h.active && Math.hypot(h.x - this.x, h.y - this.y) <= range) {
      return this.strike(scene, () => h.takeDamage(this.def.damage), h.x, h.y);
    }
    // Wall / gate / stockpile directly on our route?
    const nt = this.path[0];
    if (nt && scene.grid.isEnemyBlocked(nt.x, nt.y)) {
      const b = scene.occupancyAt(nt.x, nt.y);
      if (b) {
        const c = b.center;
        if (Math.hypot(c.x - this.x, c.y - this.y) <= range + TILE * 0.5) {
          return this.strike(scene, () => b.damage(this.def.damage), c.x, c.y);
        }
      }
    }
    return false;
  }

  private strike(scene: GameScene, apply: () => void, fx: number, fy: number): boolean {
    if (this.attackTimer <= 0) {
      apply();
      this.attackTimer = this.def.cd;
      popFlash(scene, fx, fy, this.def.color, 4);
    }
    return true;
  }

  private move(dt: number, scene: GameScene): void {
    if (this.path.length === 0) {
      // Fallback: drift toward the stockpile centre.
      const s = scene.stockpile.center;
      this.driftToward(s.x, s.y, dt, scene);
      return;
    }
    const nt = this.path[0];
    const w = scene.grid.tileToWorld(nt.x, nt.y);
    const dx = w.x - this.x, dy = w.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 3 && !scene.grid.isEnemyBlocked(nt.x, nt.y)) { this.path.shift(); return; }
    if (d < 0.001) return;
    const step = Math.min(this.def.speed * dt, d);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    // Never walk into a solid tile — that is a breach target, not a path tile.
    if (!scene.grid.isEnemyBlocked(Math.floor(nx / TILE), Math.floor(ny / TILE))) {
      this.x = nx;
      this.y = ny;
    }
  }

  private driftToward(tx: number, ty: number, dt: number, scene: GameScene): void {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const step = Math.min(this.def.speed * dt, d);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    if (!scene.grid.isEnemyBlocked(Math.floor(nx / TILE), Math.floor(ny / TILE))) {
      this.x = nx;
      this.y = ny;
    }
  }

  private draw(): void {
    this.body.setPosition(this.x, this.y);
    this.bar.set(this.x, this.y - this.def.radius - 6, this.hp / this.def.maxHp, this.hp < this.def.maxHp);
  }

  destroy(): void {
    this.body.destroy();
    this.bar.destroy();
  }
}
