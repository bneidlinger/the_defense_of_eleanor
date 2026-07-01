import { TILE, COLS, ROWS } from "../config";

export interface Tile { x: number; y: number; }

// Deterministic tile grid. `blocked` drives pathfinding (1 = solid wall).
// Per §15, all navigation/placement logic stays grid-aware; physics is cosmetic.
export class Grid {
  readonly cols = COLS;
  readonly rows = ROWS;
  readonly blocked = new Uint8Array(COLS * ROWS);

  idx(x: number, y: number): number { return y * this.cols + x; }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  // Out-of-bounds counts as blocked so the map edge behaves like a wall.
  isBlocked(x: number, y: number): boolean {
    return !this.inBounds(x, y) || this.blocked[this.idx(x, y)] === 1;
  }

  setBlocked(x: number, y: number, b: boolean): void {
    if (this.inBounds(x, y)) this.blocked[this.idx(x, y)] = b ? 1 : 0;
  }

  worldToTile(px: number, py: number): Tile {
    return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
  }

  tileToWorld(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }

  // Closest walkable tile to (tx,ty), searched in expanding rings.
  // Used to un-stick a unit that ends up inside a freshly-built wall.
  nearestWalkable(tx: number, ty: number, maxRadius = 6): Tile | null {
    if (!this.isBlocked(tx, ty)) return { x: tx, y: ty };
    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = tx + dx, ny = ty + dy;
          if (!this.isBlocked(nx, ny)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }
}
