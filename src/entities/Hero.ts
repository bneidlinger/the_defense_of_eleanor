import Phaser from "phaser";
import { TILE, FIELD_W, FIELD_H, COLORS, HERO } from "../config";
import type { Tile } from "../core/Grid";
import type { GameScene } from "../scenes/GameScene";
import { HpBar, popFlash } from "../core/effects";

// The Warden (§7.2): powerful but not safe. Auto-fights nearby enemies, but
// won't wander past its leash, regenerates only out of combat, and when its HP
// hits zero it is *downed* — limping back to the stockpile to recover rather
// than dying. Pulling it out to plug a breach should feel like the emergency
// generator, not easy mode.
export class Hero {
  x: number;
  y: number;
  hp = HERO.maxHp;
  readonly maxHp = HERO.maxHp;
  downed = false;
  private downedTimer = 0;

  private holdX: number;
  private holdY: number;
  private path: Tile[] = [];
  private attackTimer = 0;
  private combatTimer = 0;

  private body: Phaser.GameObjects.Arc;
  private bar: HpBar;

  constructor(private scene: GameScene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.holdX = x;
    this.holdY = y;
    this.body = scene.add.circle(x, y, 11, COLORS.hero).setStrokeStyle(2, COLORS.heroStroke).setDepth(22);
    this.bar = new HpBar(scene, 26);
  }

  get tileX(): number { return Math.floor(this.x / TILE); }
  get tileY(): number { return Math.floor(this.y / TILE); }
  get active(): boolean { return !this.downed; }

  // Right-click command. Ignored while downed.
  moveTo(wx: number, wy: number, scene: GameScene): void {
    if (this.downed) return;
    this.holdX = Phaser.Math.Clamp(wx, 6, FIELD_W - 6);
    this.holdY = Phaser.Math.Clamp(wy, 6, FIELD_H - 6);
    let goal = scene.grid.worldToTile(this.holdX, this.holdY);
    if (scene.grid.isBlocked(goal.x, goal.y)) {
      const w = scene.grid.nearestWalkable(goal.x, goal.y);
      if (w) {
        goal = w;
        const c = scene.grid.tileToWorld(w.x, w.y);
        this.holdX = c.x;
        this.holdY = c.y;
      }
    }
    this.path = scene.findPath(this.tileX, this.tileY, goal.x, goal.y) ?? [];
  }

  takeDamage(d: number): void {
    if (this.downed) return;
    this.hp -= d;
    this.combatTimer = 2;
    if (this.hp <= 0) {
      this.hp = 0;
      this.downed = true;
      this.downedTimer = HERO.downedTime;
      this.path = [];
    }
  }

  update(dt: number, scene: GameScene): void {
    if (this.downed) {
      this.updateDowned(dt, scene);
      this.draw();
      return;
    }

    this.attackTimer -= dt;
    this.combatTimer -= dt;

    const enemy = scene.nearestEnemy(this.x, this.y, HERO.aggro);
    if (enemy) {
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d <= HERO.attackRange) {
        if (this.attackTimer <= 0) {
          enemy.takeDamage(HERO.damage);
          popFlash(scene, enemy.x, enemy.y, 0xffffff, 5);
          this.attackTimer = HERO.attackCd;
          this.combatTimer = 2;
        }
      } else if (Math.hypot(enemy.x - this.holdX, enemy.y - this.holdY) <= HERO.leash) {
        this.stepToward(enemy.x, enemy.y, dt, scene);
      } else {
        this.returnToHold(dt, scene);
      }
    } else {
      this.returnToHold(dt, scene);
    }

    if (this.combatTimer <= 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + HERO.regen * dt);
    }

    this.draw();
  }

  private updateDowned(dt: number, scene: GameScene): void {
    this.downedTimer -= dt;
    const s = scene.stockpile.center;
    this.stepToward(s.x, s.y, dt, scene, 0.55); // limp home
    this.hp = Math.min(this.maxHp, this.hp + (this.maxHp / HERO.downedTime) * dt);
    if (this.downedTimer <= 0) {
      this.downed = false;
      this.hp = Math.max(this.hp, this.maxHp * HERO.reviveHpFrac);
      this.combatTimer = 0;
      this.holdX = this.x;
      this.holdY = this.y;
    }
  }

  private returnToHold(dt: number, scene: GameScene): void {
    const d = Math.hypot(this.holdX - this.x, this.holdY - this.y);
    if (d < 3) { this.path = []; return; }
    if (this.path.length > 0) this.followPath(dt, scene);
    else this.stepToward(this.holdX, this.holdY, dt, scene);
  }

  private followPath(dt: number, scene: GameScene): void {
    const next = this.path[0];
    const w = scene.grid.tileToWorld(next.x, next.y);
    const dx = w.x - this.x, dy = w.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) { this.path.shift(); return; }
    const step = Math.min(HERO.speed * dt, d);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
  }

  // Direct move with simple wall-sliding so the hero never clips into a wall.
  private stepToward(tx: number, ty: number, dt: number, scene: GameScene, scale = 1): void {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const step = Math.min(HERO.speed * scale * dt, d);
    let nx = this.x + (dx / d) * step;
    let ny = this.y + (dy / d) * step;
    if (scene.grid.isBlocked(Math.floor(nx / TILE), Math.floor(ny / TILE))) {
      const ax = this.x + Math.sign(dx) * step;
      const ay = this.y + Math.sign(dy) * step;
      if (!scene.grid.isBlocked(Math.floor(ax / TILE), Math.floor(this.y / TILE))) { nx = ax; ny = this.y; }
      else if (!scene.grid.isBlocked(Math.floor(this.x / TILE), Math.floor(ay / TILE))) { nx = this.x; ny = ay; }
      else return;
    }
    this.x = nx;
    this.y = ny;
  }

  private draw(): void {
    this.body.setPosition(this.x, this.y);
    this.body.fillColor = this.downed ? COLORS.heroDowned : COLORS.hero;
    this.bar.set(this.x, this.y - 18, this.hp / this.maxHp, true);
  }
}
