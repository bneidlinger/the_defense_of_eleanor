import { TILE, COLS, ROWS } from "../config";

export interface Tile { x: number; y: number; }

// Deterministic tile grid. `blocked` drives pathfinding (1 = solid wall).
// Per §15, all navigation/placement logic stays grid-aware; physics is cosmetic.
export class Grid {
  readonly cols = COLS;
  readonly rows = ROWS;
  // Two walkability layers: `blocked` is what friendly units (villager, hero)
  // treat as solid; `enemyBlocked` is what enemies treat as solid. Walls/towers
  // set both; a gate sets only `enemyBlocked` (friendlies pass, enemies breach).
  readonly blocked = new Uint8Array(COLS * ROWS);
  readonly enemyBlocked = new Uint8Array(COLS * ROWS);

  idx(x: number, y: number): number { return y * this.cols + x; }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  // Out-of-bounds counts as blocked so the map edge behaves like a wall.
  isBlocked(x: number, y: number): boolean {
    return !this.inBounds(x, y) || this.blocked[this.idx(x, y)] === 1;
  }

  isEnemyBlocked(x: number, y: number): boolean {
    return !this.inBounds(x, y) || this.enemyBlocked[this.idx(x, y)] === 1;
  }

  setBlocked(x: number, y: number, b: boolean): void {
    if (this.inBounds(x, y)) this.blocked[this.idx(x, y)] = b ? 1 : 0;
  }

  setEnemyBlocked(x: number, y: number, b: boolean): void {
    if (this.inBounds(x, y)) this.enemyBlocked[this.idx(x, y)] = b ? 1 : 0;
  }

  worldToTile(px: number, py: number): Tile {
    return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
  }

  tileToWorld(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }

  // Closest walkable tile to (tx,ty), searched in expanding rings. Used to
  // un-stick a unit that ends up inside a freshly-built structure. `enemyLayer`
  // picks which walkability layer counts as solid.
  nearestWalkable(tx: number, ty: number, maxRadius = 6, enemyLayer = false): Tile | null {
    const solid = (x: number, y: number) => enemyLayer ? this.isEnemyBlocked(x, y) : this.isBlocked(x, y);
    if (!solid(tx, ty)) return { x: tx, y: ty };
    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = tx + dx, ny = ty + dy;
          if (!solid(nx, ny)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }
}
