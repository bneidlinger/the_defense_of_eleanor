import Phaser from "phaser";
import { COLORS, PROJECTILE } from "../config";
import type { Enemy } from "./Enemy";
import type { GameScene } from "../scenes/GameScene";
import { popFlash } from "../core/effects";

// A tower arrow. Lightly homes onto its target's current position; on impact it
// deals damage to that enemy (if still alive) and vanishes. If the target dies
// mid-flight it continues to the last known point and fizzles.
export class Projectile {
  x: number;
  y: number;
  alive = true;
  private lastX: number;
  private lastY: number;
  private gfx: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, private target: Enemy, private damage: number) {
    this.x = x;
    this.y = y;
    this.lastX = target.x;
    this.lastY = target.y;
    this.gfx = scene.add.rectangle(x, y, PROJECTILE.length, 2, COLORS.projectile).setDepth(24);
  }

  update(dt: number, scene: GameScene): void {
    if (!this.alive) return;
    let tx = this.lastX, ty = this.lastY;
    if (this.target.alive) { tx = this.target.x; ty = this.target.y; this.lastX = tx; this.lastY = ty; }

    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = PROJECTILE.speed * dt;

    if (d <= Math.max(step, PROJECTILE.hitRadius)) {
      if (this.target.alive) {
        this.target.takeDamage(this.damage);
        popFlash(scene, this.target.x, this.target.y, COLORS.projectile, 4);
      }
      this.alive = false;
      return;
    }

    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.gfx.setPosition(this.x, this.y);
    this.gfx.rotation = Math.atan2(dy, dx);
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
