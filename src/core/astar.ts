import type { Grid, Tile } from "./Grid";

const SQRT2 = Math.SQRT2;
// 8-directional movement: orthogonals first, then diagonals.
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export interface PathOpts {
  // If true, blocked tiles are traversable but cost `wallCost` extra. This is
  // how enemies decide between detouring and smashing through (§10 breach logic).
  passWalls?: boolean;
  wallCost?: number;
  maxNodes?: number;
  // If true, path over the enemy walkability layer (gates are solid); otherwise
  // the friendly layer (gates are passable).
  forEnemy?: boolean;
}

// Octile distance — admissible heuristic for 8-way grids.
function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return (dx + dy) + (SQRT2 - 2) * Math.min(dx, dy);
}

// A* over the tile grid. Returns the list of tiles from just-after-start
// through goal, or null if unreachable. Start tile is excluded.
export function findPath(
  grid: Grid,
  sx: number, sy: number,
  gx: number, gy: number,
  opts: PathOpts = {},
): Tile[] | null {
  const passWalls = opts.passWalls ?? false;
  const wallCost = opts.wallCost ?? 0;
  const maxNodes = opts.maxNodes ?? 4000;

  // Pick the walkability layer: enemies see gates as solid, friendlies don't.
  const solidArr = opts.forEnemy ? grid.enemyBlocked : grid.blocked;
  const isSolid = (x: number, y: number) => !grid.inBounds(x, y) || solidArr[grid.idx(x, y)] === 1;

  if (!grid.inBounds(sx, sy) || !grid.inBounds(gx, gy)) return null;
  if (!passWalls && isSolid(gx, gy)) return null; // goal unreachable

  const cols = grid.cols;
  const n = cols * grid.rows;
  const gScore = new Float64Array(n).fill(Infinity);
  const fScore = new Float64Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);

  // Binary min-heap of tile indices keyed by fScore.
  const heap: number[] = [];
  const push = (i: number) => {
    heap.push(i);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (fScore[heap[p]] <= fScore[heap[c]]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = (): number => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1, r = l + 1;
        let s = c;
        if (l < heap.length && fScore[heap[l]] < fScore[heap[s]]) s = l;
        if (r < heap.length && fScore[heap[r]] < fScore[heap[s]]) s = r;
        if (s === c) break;
        [heap[s], heap[c]] = [heap[c], heap[s]];
        c = s;
      }
    }
    return top;
  };

  const start = grid.idx(sx, sy);
  const goal = grid.idx(gx, gy);
  gScore[start] = 0;
  fScore[start] = heuristic(sx, sy, gx, gy);
  push(start);

  let nodes = 0;
  while (heap.length > 0) {
    const cur = pop();
    if (cur === goal) return reconstruct(came, cur, cols);
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (++nodes > maxNodes) return null;

    const cx = cur % cols;
    const cy = (cur - cx) / cols;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!grid.inBounds(nx, ny)) continue;
      const ni = grid.idx(nx, ny);
      if (closed[ni]) continue;

      const blocked = solidArr[ni] === 1;
      if (blocked && !passWalls) continue;

      // No diagonal corner-cutting through solid tiles.
      if (dx !== 0 && dy !== 0) {
        const sideA = isSolid(cx + dx, cy);
        const sideB = isSolid(cx, cy + dy);
        if (!passWalls && (sideA || sideB)) continue;
      }

      const step = (dx !== 0 && dy !== 0) ? SQRT2 : 1;
      const tentative = gScore[cur] + step + (blocked ? wallCost : 0);
      if (tentative < gScore[ni]) {
        came[ni] = cur;
        gScore[ni] = tentative;
        fScore[ni] = tentative + heuristic(nx, ny, gx, gy);
        push(ni);
      }
    }
  }
  return null;
}

function reconstruct(came: Int32Array, goal: number, cols: number): Tile[] {
  const out: Tile[] = [];
  let cur = goal;
  while (cur !== -1) {
    out.push({ x: cur % cols, y: Math.floor(cur / cols) });
    cur = came[cur];
  }
  out.pop(); // drop the start tile
  out.reverse();
  return out;
}
