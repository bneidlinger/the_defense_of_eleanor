import Phaser from "phaser";
import {
  CANVAS_W, CANVAS_H, FIELD_W, FIELD_H, HUD_H, COLORS,
  SCENE_GAME, SCENE_UI,
} from "../config";
import { BUILDABLES, canAfford, formatCost, type BuildingDef } from "../data/buildings";
import { hex } from "../core/effects";
import type { GameScene } from "./GameScene";

interface BuildButton { def: BuildingDef; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; }

// Parallel overlay scene: reads GameScene state each frame and paints the HUD.
// No game logic lives here.
export class UIScene extends Phaser.Scene {
  private dyn!: Phaser.GameObjects.Graphics;
  private woodText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private villLabel!: Phaser.GameObjects.Text;
  private heroLabel!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private buttons: BuildButton[] = [];

  private overlay!: Phaser.GameObjects.Rectangle;
  private overTitle!: Phaser.GameObjects.Text;
  private overReason!: Phaser.GameObjects.Text;
  private overStats!: Phaser.GameObjects.Text;
  private overScore!: Phaser.GameObjects.Text;
  private overPrompt!: Phaser.GameObjects.Text;

  private readonly y0 = FIELD_H; // top of the HUD strip

  constructor() { super(SCENE_UI); }

  create(): void {
    const mono = "monospace";

    // Panel background.
    this.add.rectangle(0, this.y0, CANVAS_W, HUD_H, COLORS.hudBg).setOrigin(0, 0).setDepth(50);
    this.add.rectangle(0, this.y0, CANVAS_W, 2, COLORS.hudStroke).setOrigin(0, 0).setDepth(51);

    this.dyn = this.add.graphics().setDepth(51);

    this.woodText = this.add.text(20, this.y0 + 14, "", { fontFamily: mono, fontSize: "16px", color: hex(COLORS.text), fontStyle: "bold" }).setDepth(52);
    this.goldText = this.add.text(20, this.y0 + 40, "", { fontFamily: mono, fontSize: "16px", color: hex(COLORS.stockpile), fontStyle: "bold" }).setDepth(52);

    this.villLabel = this.add.text(220, this.y0 + 12, "VILLAGER", { fontFamily: mono, fontSize: "12px", color: hex(COLORS.villager) }).setDepth(52);
    this.heroLabel = this.add.text(220, this.y0 + 46, "WARDEN", { fontFamily: mono, fontSize: "12px", color: hex(COLORS.accent) }).setDepth(52);

    this.waveText = this.add.text(FIELD_W / 2 - 40, this.y0 + 22, "", { fontFamily: mono, fontSize: "17px", color: hex(COLORS.warn), fontStyle: "bold" }).setOrigin(0.5).setDepth(52);
    this.killsText = this.add.text(FIELD_W / 2 - 40, this.y0 + 48, "", { fontFamily: mono, fontSize: "13px", color: hex(COLORS.textDim) }).setOrigin(0.5).setDepth(52);

    // Data-driven build menu, laid out from the right edge.
    const bw = 190, bh = 44, gap = 10;
    const totalW = BUILDABLES.length * bw + (BUILDABLES.length - 1) * gap;
    let bx = CANVAS_W - 16 - totalW;
    for (const def of BUILDABLES) {
      const cx = bx + bw / 2, cy = this.y0 + 28;
      const rect = this.add.rectangle(cx, cy, bw, bh, COLORS.hudPanel).setStrokeStyle(2, COLORS.hudStroke).setDepth(52).setInteractive({ useHandCursor: true });
      const label = this.add.text(cx, cy, `[${def.hotkey}] ${def.name}\n${formatCost(def.cost)}`, { fontFamily: mono, fontSize: "13px", color: hex(COLORS.text), align: "center" }).setOrigin(0.5).setDepth(53);
      rect.on("pointerdown", () => { const gs = this.scene.get(SCENE_GAME) as GameScene; if (gs && gs.state === "playing") gs.tool = def.id; });
      this.buttons.push({ def, rect, label });
      bx += bw + gap;
    }

    this.add.text(
      CANVAS_W - 16, this.y0 + 62,
      "L-drag: build   R-click: Warden   [1] wall   [2] tower   [Esc] cancel",
      { fontFamily: mono, fontSize: "11px", color: hex(COLORS.textDim) },
    ).setOrigin(1, 0).setDepth(52);

    // Defeat overlay (hidden until game over).
    const midX = CANVAS_W / 2, midY = CANVAS_H / 2;
    this.overlay = this.add.rectangle(0, 0, CANVAS_W, CANVAS_H, 0x000000, 0.66).setOrigin(0, 0).setDepth(60).setVisible(false);
    this.overTitle = this.add.text(midX, midY - 96, "DEFEAT", { fontFamily: mono, fontSize: "52px", color: hex(COLORS.danger), fontStyle: "bold" }).setOrigin(0.5).setDepth(61).setVisible(false);
    this.overReason = this.add.text(midX, midY - 44, "", { fontFamily: mono, fontSize: "18px", color: hex(COLORS.text) }).setOrigin(0.5).setDepth(61).setVisible(false);
    this.overStats = this.add.text(midX, midY - 10, "", { fontFamily: mono, fontSize: "16px", color: hex(COLORS.textDim) }).setOrigin(0.5).setDepth(61).setVisible(false);
    this.overScore = this.add.text(midX, midY + 30, "", { fontFamily: mono, fontSize: "20px", color: hex(COLORS.warn), fontStyle: "bold" }).setOrigin(0.5).setDepth(61).setVisible(false);
    this.overPrompt = this.add.text(midX, midY + 78, "Click or press [R] to try a better layout", { fontFamily: mono, fontSize: "16px", color: hex(COLORS.warn) }).setOrigin(0.5).setDepth(61).setVisible(false);
  }

  override update(): void {
    const gs = this.scene.get(SCENE_GAME) as GameScene;
    if (!gs || !gs.villager || !gs.hero || !gs.wave) return;

    this.woodText.setText(`WOOD  ${Math.floor(gs.economy.wood)}`);
    this.goldText.setText(`GOLD  ${Math.floor(gs.economy.gold)}`);
    this.waveText.setText(gs.wave.status(gs));
    this.killsText.setText(`Kills ${gs.kills}     Score ${gs.score}`);
    this.heroLabel.setText(gs.hero.downed ? "WARDEN — DOWNED" : "WARDEN");

    // Unit HP bars.
    const g = this.dyn;
    g.clear();
    this.bar(g, 220, this.y0 + 28, 150, 9, gs.villager.alive ? gs.villager.hp / gs.villager.maxHp : 0);
    this.bar(g, 220, this.y0 + 62, 150, 9, gs.hero.hp / gs.hero.maxHp);

    // Build menu state.
    for (const b of this.buttons) {
      const active = gs.tool === b.def.id;
      b.rect.setFillStyle(active ? 0x2b4a66 : COLORS.hudPanel);
      b.rect.setStrokeStyle(2, active ? COLORS.accent : COLORS.hudStroke);
      b.label.setColor(canAfford(gs.economy, b.def.cost) ? hex(COLORS.text) : hex(COLORS.danger));
    }

    // Defeat overlay.
    const over = gs.state === "over";
    this.overlay.setVisible(over);
    this.overTitle.setVisible(over);
    this.overReason.setVisible(over).setText(gs.overReason);
    this.overStats.setVisible(over).setText(`Reached Wave ${gs.wave.wave}  •  ${gs.kills} kills`);
    this.overScore.setVisible(over)
      .setText(`Score ${gs.finalScore}    Best ${gs.bestScore}${gs.isNewBest ? "   ★ NEW BEST" : ""}`)
      .setColor(hex(gs.isNewBest ? COLORS.hpGood : COLORS.warn));
    this.overPrompt.setVisible(over);
  }

  private bar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, ratio: number): void {
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    g.fillStyle(COLORS.hpBack, 1);
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    const c = r > 0.5 ? COLORS.hpGood : r > 0.25 ? COLORS.hpMid : COLORS.hpBad;
    g.fillStyle(c, 1);
    g.fillRect(x, y, w * r, h);
  }
}
