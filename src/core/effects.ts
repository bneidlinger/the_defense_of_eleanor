import Phaser from "phaser";
import { COLORS } from "../config";

// A two-rectangle health bar that floats above a unit. Kept dead simple —
// "juice, not a renderer" (§4.5 / §15).
export class HpBar {
  private bg: Phaser.GameObjects.Rectangle;
  private fg: Phaser.GameObjects.Rectangle;
  private readonly w: number;

  constructor(scene: Phaser.Scene, w = 18, h = 3, depth = 26) {
    this.w = w;
    this.bg = scene.add.rectangle(0, 0, w + 2, h + 2, COLORS.hpBack).setOrigin(0, 0.5).setDepth(depth);
    this.fg = scene.add.rectangle(0, 0, w, h, COLORS.hpGood).setOrigin(0, 0.5).setDepth(depth + 1);
  }

  set(cx: number, cy: number, ratio: number, visible: boolean): void {
    this.bg.setVisible(visible);
    this.fg.setVisible(visible);
    if (!visible) return;
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    const x = cx - this.w / 2;
    this.bg.setPosition(x - 1, cy);
    this.fg.setPosition(x, cy);
    this.fg.displayWidth = this.w * r;
    this.fg.fillColor = r > 0.5 ? COLORS.hpGood : r > 0.25 ? COLORS.hpMid : COLORS.hpBad;
  }

  destroy(): void {
    this.bg.destroy();
    this.fg.destroy();
  }
}

// Small floating "+gold" style text that drifts up and fades.
export function floatingText(scene: Phaser.Scene, x: number, y: number, text: string, color: number = COLORS.text): void {
  const t = scene.add.text(x, y, text, {
    fontFamily: "monospace", fontSize: "13px", color: hex(color), fontStyle: "bold",
  }).setOrigin(0.5).setDepth(40);
  scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 700, ease: "Cubic.Out", onComplete: () => t.destroy() });
}

// Expanding ring — used for hits, deaths, and move markers.
export function popFlash(scene: Phaser.Scene, x: number, y: number, color: number = 0xffffff, radius = 5): void {
  const c = scene.add.circle(x, y, radius, color, 0.85).setDepth(39);
  scene.tweens.add({ targets: c, scale: 3, alpha: 0, duration: 260, ease: "Quad.Out", onComplete: () => c.destroy() });
}

// Brief stroked ring with no fill — right-click move marker for the hero.
export function ringMarker(scene: Phaser.Scene, x: number, y: number, color: number = COLORS.accent): void {
  const c = scene.add.circle(x, y, 14).setStrokeStyle(2, color, 0.9).setDepth(38);
  scene.tweens.add({ targets: c, scale: 0.4, alpha: 0, duration: 320, ease: "Quad.Out", onComplete: () => c.destroy() });
}

export function hex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}
