// Siegefield.io — MVP 0 tuning constants & lightweight data tables.
// Everything that we might want to tweak while finding the fun lives here.

export const TILE = 24;
export const COLS = 50;
export const ROWS = 30;
export const FIELD_W = COLS * TILE; // 1200
export const FIELD_H = ROWS * TILE; // 720
export const HUD_H = 88;
export const CANVAS_W = FIELD_W; // 1200
export const CANVAS_H = FIELD_H + HUD_H; // 808

export const SCENE_GAME = "game";
export const SCENE_UI = "ui";

export const COLORS = {
  grassA: 0x4a7c3a,
  grassB: 0x517f3c,
  grid: 0x436b34,
  fieldEdge: 0x2c4a22,
  hudBg: 0x17130d,
  hudPanel: 0x231d13,
  hudStroke: 0x4a3c25,

  wall: 0x86643c,
  wallStroke: 0x5e451f,
  wallDamaged: 0xa5562f,
  foundationFill: 0x6d6450,
  foundationProgress: 0xc9b173,
  ghostOk: 0x9fe07a,
  ghostBad: 0xe06868,

  stockpile: 0xd0a93a,
  stockpileStroke: 0x8a6c14,

  tower: 0x9a8f77,
  towerStroke: 0x4f4636,
  towerRoof: 0x5f5645,
  projectile: 0xf3e6ad,

  villager: 0x74e88a,
  villagerStroke: 0x2f7e43,
  hero: 0x4ea3ff,
  heroStroke: 0xeaf3ff,
  heroDowned: 0x6c7f93,

  enemyRabble: 0xd6483b,
  enemyRaider: 0xe69128,

  hpBack: 0x101010,
  hpGood: 0x5fd95f,
  hpMid: 0xe0c34a,
  hpBad: 0xd95151,

  text: 0xf4eede,
  textDim: 0xb6ab92,
  warn: 0xffd25c,
  danger: 0xff6b5e,
  accent: 0x7ec8ff,
} as const;

export type ResourceCost = { wood?: number; gold?: number };

// Building definitions now live in src/data/buildings.ts (data-driven since MVP 1).

// Tower arrows / bolts.
export const PROJECTILE = {
  speed: 340, // px/sec
  hitRadius: 9,
  length: 10,
};

export const ECON_START = { wood: 120, gold: 30 };

export const VILLAGER = {
  speed: 92, // px/sec
  maxHp: 50,
  workRange: TILE * 1.15, // how close it must be to build/repair
  repairRate: 20, // hp/sec
  repairWoodPerHp: 0.05, // wood spent per hp healed
};

export const HERO = {
  speed: 152, // px/sec
  maxHp: 220,
  damage: 26, // one-shots rabble (24hp), two-shots raiders (36hp)
  attackRange: 30,
  attackCd: 0.42, // seconds between swings
  aggro: 124, // auto-engages enemies within this radius...
  leash: 92, // ...but won't chase further than this from its hold point
  regen: 7, // hp/sec when out of combat
  downedTime: 9, // seconds incapacitated before reviving
  reviveHpFrac: 0.6,
};

export type EnemyKind = "rabble" | "raider";

export const ENEMIES: Record<EnemyKind, {
  name: string; maxHp: number; speed: number; damage: number;
  range: number; cd: number; gold: number; color: number; radius: number;
  huntsVillager: boolean; villagerAggro: number;
}> = {
  rabble: {
    name: "Rabble", maxHp: 24, speed: 52, damage: 4, range: 20, cd: 1.2,
    gold: 2, color: COLORS.enemyRabble, radius: 8,
    huntsVillager: false, villagerAggro: 64, // only lunges at a villager right next to it
  },
  raider: {
    name: "Raider", maxHp: 36, speed: 94, damage: 6, range: 20, cd: 0.9,
    gold: 4, color: COLORS.enemyRaider, radius: 8,
    huntsVillager: true, villagerAggro: 260, // actively chases an exposed villager
  },
};

// Wave director pacing (a deliberately minimal stand-in for §11's full system).
export const WAVES = {
  prepTime: 15, // opening build window before the first attack
  gapBase: 22, // breather between waves...
  gapMin: 10, // ...shrinking as waves climb
};

// Breach routing: how many tiles of detour an enemy will accept before it
// decides to just smash through a wall instead of walking around.
export const WALL_PATH_COST = 13;
