import { COLS, TILE, WAVES, type EnemyKind } from "../config";
import type { GameScene } from "../scenes/GameScene";

type Phase = "prep" | "active" | "gap";
interface PendingSpawn { kind: EnemyKind; t: number; }

// A deliberately tiny wave director (§11 is the real thing later). Opens with a
// prep window, then alternates active waves and shrinking breathers. Each wave
// adds more rabble and, from wave 2, raiders that hunt the villager.
export class WaveSystem {
  phase: Phase = "prep";
  timer = WAVES.prepTime;
  wave = 0;
  private pending: PendingSpawn[] = [];

  update(dt: number, scene: GameScene): void {
    if (scene.state !== "playing") return;

    if (this.phase === "prep" || this.phase === "gap") {
      this.timer -= dt;
      if (this.timer <= 0) this.startWave(scene);
      return;
    }

    // active: release scheduled spawns, then watch for the field to clear.
    let spawned = false;
    for (const p of this.pending) {
      p.t -= dt;
      if (p.t <= 0) { this.spawn(scene, p.kind); spawned = true; }
    }
    if (spawned) this.pending = this.pending.filter((p) => p.t > 0);

    if (this.pending.length === 0 && scene.enemies.length === 0) {
      this.phase = "gap";
      this.timer = Math.max(WAVES.gapMin, WAVES.gapBase - this.wave);
    }
  }

  private startWave(scene: GameScene): void {
    this.wave++;
    this.phase = "active";
    const w = this.wave;
    const rabble = 3 + w * 2;
    const raiders = w >= 2 ? Math.floor(w / 2) : 0;

    this.pending = [];
    let t = 0;
    for (let i = 0; i < rabble; i++) { this.pending.push({ kind: "rabble", t }); t += 0.6; }
    for (let i = 0; i < raiders; i++) { this.pending.push({ kind: "raider", t: 1.5 + i * 0.9 }); }

    scene.announceWave(w);
  }

  private spawn(scene: GameScene, kind: EnemyKind): void {
    // All attacks come from the north edge in MVP 0.
    const x = (2 + Math.random() * (COLS - 4)) * TILE;
    const y = TILE * 0.5;
    scene.spawnEnemy(kind, x, y);
  }

  // Compact status line for the HUD.
  status(scene: GameScene): string {
    if (this.phase === "prep") return `PREP — first attack in ${Math.ceil(this.timer)}s`;
    if (this.phase === "gap") return `WAVE ${this.wave} cleared — next in ${Math.ceil(this.timer)}s`;
    const left = this.pending.length + scene.enemies.length;
    return `WAVE ${this.wave} — ${left} foe${left === 1 ? "" : "s"} remaining`;
  }
}
