import Phaser from "phaser";
import { CANVAS_W, CANVAS_H, COLORS } from "./config";
import { GameScene } from "./scenes/GameScene";
import { UIScene } from "./scenes/UIScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: CANVAS_W,
  height: CANVAS_H,
  backgroundColor: COLORS.hudBg,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene, UIScene],
};

const game = new Phaser.Game(config);

// Expose the running game in dev for debugging/inspection only.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
