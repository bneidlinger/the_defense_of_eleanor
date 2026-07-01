import Phaser from "phaser";
import { TILE, COLORS, VILLAGER } from "../config";
import type { Tile } from "../core/Grid";
import type { Building } from "./Building";
import type { GameScene } from "../scenes/GameScene";
import { HpBar, popFlash } from "../core/effects";

type TaskKind = "build" | "repair";

// The villager IS the game (§4.2). It chooses its own tasks — build the
// nearest foundation, else repair the nearest damaged wall — and must walk
// there. It cannot fight and is fragile outside the walls. If it dies, the
// run ends.
export class Villager {
  x: number;
  y: number;
  hp = VILLAGER.maxHp;
  readonly maxHp = VILLAGER.maxHp;
  alive = true;

  private task: Building | null = null;
  private taskKind: TaskKind | null = null;
  private path: Tile[] = [];
  private repathTimer = 0;
  private priorityRepair: Building | null = null; // player-commanded repair

  private body: Phaser.GameObjects.Arc;
  private bar: HpBar;

  constructor(private scene: GameScene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.body = scene.add.circle(x, y, 8, COLORS.villager).setStrokeStyle(2, COLORS.villagerStroke).setDepth(20);
    this.bar = new HpBar(scene, 18);
  }

  get tileX(): number { return Math.floor(this.x / TILE); }
  get tileY(): number { return Math.floor(this.y / TILE); }
  get isWorking(): boolean { return this.task !== null && this.path.length === 0; }

  takeDamage(d: number): void {
    if (!this.alive) return;
    this.hp -= d;
    popFlash(this.scene, this.x, this.y, COLORS.danger, 4);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.body.setVisible(false);
      this.bar.set(this.x, this.y, 0, false);
    }
  }

  update(dt: number, scene: GameScene): void {
    if (!this.alive) return;

    if (this.task && !this.taskStillValid(this.task)) this.clearTask();
    if (!this.task) this.pickTask(scene);

    if (this.task) {
      const d = this.distToBuilding(this.task);
      if (d <= VILLAGER.workRange) {
        this.path = [];
        this.work(dt, scene);
      } else {
        this.advanceToTask(dt, scene);
      }
    } else {
      this.path = [];
    }

    this.draw();
  }

  private taskStillValid(b: Building): boolean {
    if (b.dead) return false;
    if (this.taskKind === "build") return !b.built;
    return b.isDamaged();
  }

  // Player clicked a damaged building with the repair tool — jump the queue.
  setRepairTarget(b: Building): void {
    this.priorityRepair = b;
    this.clearTask();
  }

  private pickTask(scene: GameScene): void {
    let best: Building | null = null;
    let bestD = Infinity;

    // Priority 0: a building the player explicitly ordered repaired.
    if (this.priorityRepair) {
      if (!this.priorityRepair.dead && this.priorityRepair.isDamaged() && scene.economy.wood > 0) {
        this.assign(this.priorityRepair, "repair");
        return;
      }
      this.priorityRepair = null;
    }

    // Priority 1: build the nearest unfinished foundation.
    for (const b of scene.buildings) {
      if (b.built) continue;
      const c = b.center;
      const d = (c.x - this.x) ** 2 + (c.y - this.y) ** 2;
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best) { this.assign(best, "build"); return; }

    // Priority 2: repair the nearest damaged wall (only if we can pay).
    if (scene.economy.wood <= 0) return;
    for (const b of scene.buildings) {
      if (!b.isDamaged()) continue;
      const c = b.center;
      const d = (c.x - this.x) ** 2 + (c.y - this.y) ** 2;
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best) this.assign(best, "repair");
  }

  private assign(b: Building, kind: TaskKind): void {
    this.task = b;
    this.taskKind = kind;
    this.path = [];
    this.repathTimer = 0;
  }

  private clearTask(): void {
    this.task = null;
    this.taskKind = null;
    this.path = [];
  }

  private work(dt: number, scene: GameScene): void {
    const task = this.task!;
    const speed = scene.villagerWorkSpeed(); // boosted while the Warden garrisons a Keep
    if (this.taskKind === "build") {
      const done = task.addBuildProgress(dt * speed);
      if (done) { scene.onFoundationBuilt(task); this.clearTask(); }
    } else {
      const heal = VILLAGER.repairRate * dt * speed;
      const woodCost = heal * VILLAGER.repairWoodPerHp;
      if (scene.economy.wood >= woodCost) {
        scene.spendWood(woodCost);
        task.repair(heal);
        if (!task.isDamaged()) this.clearTask();
      } else {
        this.clearTask();
      }
    }
  }

  // Distance from the villager to the nearest point of a building's footprint —
  // works for any footprint size (centre-distance fails for multi-tile builds).
  private distToBuilding(b: Building): number {
    const cx = Phaser.Math.Clamp(this.x, b.px, b.px + b.pw);
    const cy = Phaser.Math.Clamp(this.y, b.py, b.py + b.ph);
    return Math.hypot(this.x - cx, this.y - cy);
  }

  private advanceToTask(dt: number, scene: GameScene): void {
    this.repathTimer -= dt;
    if (this.path.length === 0 || this.repathTimer <= 0) {
      const goal = this.nearestApproach(this.task!, scene);
      this.path = goal ? scene.findPath(this.tileX, this.tileY, goal.x, goal.y) ?? [] : [];
      this.repathTimer = 0.5;
    }
    this.followPath(dt, scene);
  }

  // Closest walkable tile from which we can work on `b`. For a foundation
  // (intangible) the tile itself is a valid fallback; walls are approached
  // from an orthogonal neighbour.
  private nearestApproach(b: Building, scene: GameScene): Tile | null {
    const cand: Tile[] = [];
    const seen = new Set<number>();
    const add = (x: number, y: number) => {
      if (!scene.grid.inBounds(x, y)) return;
      const i = scene.grid.idx(x, y);
      if (seen.has(i)) return;
      seen.add(i);
      if (!scene.grid.isBlocked(x, y)) cand.push({ x, y });
    };
    for (const t of b.footprint) { add(t.x + 1, t.y); add(t.x - 1, t.y); add(t.x, t.y + 1); add(t.x, t.y - 1); }
    if (!b.built) for (const t of b.footprint) add(t.x, t.y);

    let best: Tile | null = null;
    let bd = Infinity;
    for (const c of cand) {
      const w = scene.grid.tileToWorld(c.x, c.y);
      const d = (w.x - this.x) ** 2 + (w.y - this.y) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  private followPath(dt: number, scene: GameScene): void {
    if (this.path.length === 0) return;
    const next = this.path[0];
    const w = scene.grid.tileToWorld(next.x, next.y);
    const dx = w.x - this.x, dy = w.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) { this.path.shift(); return; }
    const step = Math.min(VILLAGER.speed * dt, d);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
  }

  // Called by the scene if a wall finishes underneath us.
  nudgeTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.path = [];
  }

  private draw(): void {
    this.body.setPosition(this.x, this.y);
    this.bar.set(this.x, this.y - 14, this.hp / this.maxHp, this.alive);
  }
}
