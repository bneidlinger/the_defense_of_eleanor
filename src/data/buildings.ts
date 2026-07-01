import { COLORS, type ResourceCost } from "../config";

// Behaviour category. Drives how a finished building acts each tick and how it
// blocks movement (a gate blocks enemies but lets friendly units pass).
export type BuildKind = "wall" | "tower" | "gate" | "stockpile";

export interface BuildingDef {
  id: string;
  name: string;
  kind: BuildKind;
  cost: ResourceCost;
  buildTime: number; // seconds of villager work
  maxHp: number;
  footprint: { w: number; h: number };
  blocksMovement: boolean;
  hotkey?: string; // build-menu shortcut, e.g. "1"
  fill: number;
  stroke: number;
  // tower-only
  range?: number;
  damage?: number;
  attackCd?: number;
}

export const BUILD_DEFS: Record<string, BuildingDef> = {
  palisade: {
    id: "palisade", name: "Palisade", kind: "wall",
    cost: { wood: 10 }, buildTime: 1.8, maxHp: 100,
    footprint: { w: 1, h: 1 }, blocksMovement: true, hotkey: "1",
    fill: COLORS.wall, stroke: COLORS.wallStroke,
  },
  watchtower: {
    id: "watchtower", name: "Watchtower", kind: "tower",
    cost: { wood: 60, gold: 20 }, buildTime: 6, maxHp: 180,
    footprint: { w: 2, h: 2 }, blocksMovement: true, hotkey: "2",
    fill: COLORS.tower, stroke: COLORS.towerStroke,
    range: 150, damage: 12, attackCd: 0.8,
  },
  gate: {
    id: "gate", name: "Gate", kind: "gate",
    cost: { wood: 25 }, buildTime: 3, maxHp: 140,
    footprint: { w: 1, h: 1 }, blocksMovement: true, hotkey: "3",
    fill: COLORS.gate, stroke: COLORS.gateStroke,
  },
  stockpile: {
    id: "stockpile", name: "Stockpile", kind: "stockpile",
    cost: {}, buildTime: 0, maxHp: 600,
    footprint: { w: 2, h: 2 }, blocksMovement: true,
    fill: COLORS.stockpile, stroke: COLORS.stockpileStroke,
  },
};

// The player-placeable buildings, in menu order.
export const BUILDABLES: BuildingDef[] = [BUILD_DEFS.palisade, BUILD_DEFS.watchtower, BUILD_DEFS.gate];

export function canAfford(econ: { wood: number; gold: number }, cost: ResourceCost): boolean {
  return econ.wood >= (cost.wood ?? 0) && econ.gold >= (cost.gold ?? 0);
}

export function formatCost(cost: ResourceCost): string {
  const parts: string[] = [];
  if (cost.wood) parts.push(`${cost.wood}w`);
  if (cost.gold) parts.push(`${cost.gold}g`);
  return parts.join(" ") || "free";
}
