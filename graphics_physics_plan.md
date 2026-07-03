# Graphics & Physics Plan — Siegefield.io / *The Defense of Eleanor*

**Status:** living plan · companion to [`siegefield_io_game_design.md`](siegefield_io_game_design.md)
**Last updated:** 2026-07-02 (after §3.1 — fixed-timestep sim + interpolated rendering)
**Scope:** how the *look* and the *juice* evolve, and the architecture they ride on.

This document refines **§15 (Physics Philosophy)** and **§16 (Tech Stack)** of the design
brief in light of the working MVP 0–1 build. Where it diverges from the brief, it says so
and why.

---

## 1. Where the build actually is

Facts, not aspirations (confirmed against the source, not memory):

| Aspect | Current state |
|---|---|
| Rendering | 100% procedural primitives (Phaser `Graphics` / `Arc` / `Rectangle`). Zero sprites, textures, atlases, or `RenderTexture`. |
| Art assets | None. Nothing to download but code. |
| Physics | No engine. The word "physics" appears once — a comment in `core/Grid.ts`. |
| Juice | Tween-based only: hit flashes, floating text, ring markers (`core/effects.ts`). |
| Simulation | Deterministic grid: A* pathfinding, dual friendly/enemy walkability layers, tile occupancy. Data-driven buildings (`data/buildings.ts`). |
| Timestep | **Fixed 60 Hz accumulator with interpolated rendering** (§3.1, done). Sim advances in identical `1/60`s ticks (`GameScene.stepSim`); the renderer draws an interpolated frame (`renderActors(alpha)`). Frame-rate independent; a spiral-of-death guard caps catch-up steps. *Not yet seeded* — replay determinism also needs a seeded PRNG (Math.random still used in repath/spawn/tower desync). |
| Stack | TypeScript · Vite · Phaser 3. (Rapier 2D from §16 intentionally **not** adopted.) |

One of these is load-bearing below: the **primitives-only renderer**, a strength to
preserve. The variable-timestep liability is now resolved (§3.1).

---

## 2. The governing principle

The brief wants deterministic replays and leaderboard validation (§21). Physics engines
are non-deterministic across machines (float rounding, solver iteration order). Therefore:

> **One authoritative simulation — grid-based and deterministic. Everything visible (art,
> particles, "physics") is a read-only presentation layer that can never alter the game's
> outcome.**

Consequences:

- Physics stops being a **foundation** (as §16 framed it) and becomes a **topping** added
  on our schedule.
- We keep total freedom over *which* physics (custom vs. Rapier) because nothing in the sim
  depends on it.
- `Grid.ts`'s "physics is cosmetic" comment becomes a structural contract, not a wish.

---

## 3. Foundation moves (do before art or FX)

Cheap now, expensive after everything ossifies around them.

### 3.1 Fixed-timestep sim + interpolated rendering — ✅ done (2026-07-02)
Replaced the variable, RAF-coupled `dt` with an accumulator: the sim advances in fixed
60 Hz steps; rendering interpolates between the two most recent states.

Delivered:
- **Frame-rate independence** — verified 60 sim ticks/wall-clock-second at both 30 Hz and
  144 Hz, with render frames decoupled (30 vs 144).
- **Smooth motion** — each moving actor (`Enemy`/`Villager`/`Hero`/`Projectile`) split into
  `step(dt)` (pure sim) + `render(alpha)` (interpolate `prev`→current). Teleports call
  `snap()` so they don't slide across the map.
- **A first cut of the sim ↔ view split** (§3.3) — `GameScene.stepSim` vs `renderActors`.
- **Spiral-of-death guard** — long stalls clamp to 0.1 s and cap at `MAX_STEPS` per frame.

Still open toward **replays & anti-cheat** (§21): the sim is fixed-step but not yet *seeded*.
`Math.random()` in enemy repath, wave spawn positions, and tower-fire desync must move to a
seeded PRNG before replays are reproducible. Tracked as the next determinism step.

Verification note: the loop is still RAF-driven, so the headless/backgrounded "freeze"
persists in the preview tool — pump `s.stepSim(1/60)` manually to advance it.

### 3.2 Camera (pan + zoom)
An endless fortress outgrows 1200×720 quickly. Phaser cameras: edge/drag/WASD pan, wheel
zoom, clamp to world bounds. Add before MVP 2 sprawl, not after.

### 3.3 Formalize the sim ↔ view ↔ FX split
Entities currently own and draw their own Phaser objects inside `update()`. As FX and the
camera arrive, draw a clean boundary:

- **Sim** — pure state, deterministic, fixed-step. Knows nothing about Phaser.
- **View** — reads sim state, interpolates, draws.
- **FX** — cosmetic emitters / "physics"; reads sim events, writes nothing back.

Not a full ECS — just an honest boundary. It is the hook everything else hangs on.

---

## 4. Graphics track

Guiding idea: the primitives are an **asset** (crisp, resolution-free, tiny download,
readable at any zoom). **Elevate, don't replace** — art fidelity is the *last* priority per
the brief's readability-first target (§3); trophy-fortress expression (§4.7, §23) is the
endgame reward.

| Phase | Focus | Concretely |
|---|---|---|
| **Now (MVP 1)** | Keep procedural primitives | Already crisp & readable. Don't rush to sprites. |
| **MVP 2** | Make the flatness deliberate | Material/token system (wood · stone · iron · gold · cloth + damage/age tints); drop shadows, bevels, base ambient occlusion; real unit silhouettes (facing, walk-bob); terrain baked once to a `RenderTexture` with §13 patch variation. |
| **MVP 3** | Sprite/texture layer + age evolution | Structures visually evolve Dark → Feudal → Castle → Imperial. Old palisades peek through later stone — "the fortress tells the story" (§23). |
| **Endgame** | Procedural expression | Heraldry, wall paint, roof styles, banners, scorch/weathering decals, boss-trophy structures. A decal layer over sprites. |

Principle: keep the **look data-driven**, mirroring the already data-driven building table
(`data/buildings.ts`). Age + damage + cosmetics become table entries, not bespoke code.

---

## 5. Physics / FX track

What the brief wants from physics (§15) is *juice*, not simulation: impact sparks,
knockback, ram collisions, cannonball arcs, wall-collapse debris, fire, satisfying deaths.
A pooled **particle + simple-impulse layer** delivers all of it at a few KB — no rigid-body
engine — and, being cosmetic-by-contract, needs no determinism.

| Phase | Focus | Concretely |
|---|---|---|
| **Now (MVP 1)** | Tween flashes only | `popFlash`, floating text, ring markers. |
| **MVP 2** | The juice pass | Pooled emitters: hit sparks, dust, wood splinters, arrow trails, muzzle/impact flashes; **screen shake** + a few frames of **hit-stop** on heavy impacts; persistent scorch/rubble decals. *The cheapest way to make MVP 1 feel finished.* |
| **MVP 3** | Fire · collapse · siege | Fire/smoke emitters (spread *logic* deterministic on the grid; *visuals* are particles); wall collapse = gravity-fed "chunk" quads that fade; cosmetic knockback/shove; parabolic cannonball/boulder arcs + impact craters. Still custom, still light. |
| **Endgame** | *Evaluate* Rapier | Only for true rigid-body destruction (stacking debris, boulders through crowds), and only if the custom layer hits its ceiling. FX-world only, never the sim. |

---

## 6. The Rapier decision (divergence from §16)

The brief recommends "TypeScript + Vite + Phaser + Rapier 2D" from the start.
**We diverge: no Rapier now, likely not across the MVP range.**

Rationale:

1. **Load weight.** Rapier ships a sizable WASM payload — friction against the `.io`
   "instant load" expectation.
2. **Determinism.** It conflicts with replay / leaderboard validation (§21) unless
   carefully walled off.
3. **Sufficiency.** Every effect the brief lists is achievable with a lighter custom
   particle + impulse layer.

Rapier's status changes from *day-one dependency* to *optional, opt-in, FX-only upgrade if
and when it earns its place.*

---

## 7. Recommended sequencing

1. **Foundation** — ~~fixed-timestep~~ (✅ §3.1) + camera (§3.2, next) + finish the
   sim/view/FX split (§3.3).
2. **Juice pass** — the MVP 2 particle / shake / hit-stop layer.
3. **MVP 2 gameplay** — traps, multi-side attacks, sapper, fire — landing *on top of* a
   ready FX layer, so fire and collapse look great on debut.

This ordering means every new mechanic arrives already juicy, instead of retrofitting feel
later.

---

## 8. Decisions pending

- ~~**Foundation now vs. ride variable-dt longer?**~~ → **Resolved: done** (§3.1). Fixed
  timestep + interpolation landed. *Correction to the earlier note:* it does **not** fix the
  preview-freeze — the loop is still RAF-driven — and replay determinism additionally needs a
  seeded PRNG. Both are follow-ups, not blockers.
- **Post-playtest: juice-first vs. gameplay-first?** → Recommendation: **juice-first**,
  *unless* the playtest surfaces a balance problem (then tune `config.ts` /
  `data/buildings.ts` first).
- **When does age progression (MVP 3) justify the sprite layer?** → Revisit once ages are
  designed.

---

*This is a living document — update it as the build and the direction move.*

> **Motto (unchanged):** The villager builds the fortress. The fortress protects the
> villager. The Warden buys time. The player designs the machine.
