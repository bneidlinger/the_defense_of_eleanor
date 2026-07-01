# Siegefield.io — Game Design & Architecture Brief

**Status:** starter design document  
**Genre:** RTS tower defense survival builder  
**Format:** browser-first `.io`-style game  
**Core fantasy:** build a medieval fortress in real time while defending a lone villager from endless escalating siege waves.

---

## 1. Clean Synopsis

**Siegefield.io** is an endless medieval fortress survival game where the player begins in a wide open green field with one villager, one powerful but vulnerable hero, and barely enough time to survive the first attack.

Unlike normal tower defense games, buildings do not appear instantly. The player places foundations, but the villager must physically travel to each site and construct or repair the structure. This turns every wall, tower, gate, and defensive upgrade into a tactical risk. The hero can one-shot early enemies and buy the villager time, but the hero is not durable enough to remain exposed forever. After the opening scramble, the hero becomes a strategic garrison unit whose presence strengthens key structures.

The player earns gold and resources from kills, survives wave after wave, advances from rough Dark Age defenses into stone castles and gunpowder-era weapons, and gradually transforms an open field into an impressive custom fortress. Survival depends on clever fortress geometry: layered walls, kill zones, gates, repair access, trap placement, fallback compartments, and interior defensive planning.

The game does not end. Waves scale forever. The long-term goal is leaderboard competition, daily seeded challenges, efficiency showcases, and ridiculous late-game castles that look like something a paranoid medieval engineer designed after drinking too much coffee and trusting no one.

---

## 2. One-Line Pitch

**A browser-based endless fortress defense game where your only villager must physically build the castle while a fragile hero buys time against escalating siege waves.**

---

## 3. Player Experience Target

The game should feel like:

- The first ten minutes of an **Age of Empires II custom survival map**.
- A tower defense game where **positioning and construction logistics actually matter**.
- A castle builder where the castle is tested violently every few minutes.
- A `.io` game that starts fast, reads clearly, and rewards mastery.
- A survival sandbox where late-game players flex fortress efficiency and style.

The ideal opening moment:

> The player places five wall foundations. The villager starts building. The first enemies arrive before the last two sections are done. The hero intercepts, deletes a few attackers, then starts taking damage. One enemy slips around the unfinished wall and chases the villager. The player must choose: finish the wall, flee, or fight.

If that moment is fun, the game works.

---

## 4. Design Philosophy

### 4.1 Panic First, Complexity Second

The opening should be frantic immediately. Do not start with a slow economy phase. The player should understand within 30 seconds that the villager is precious, the field is dangerous, and the hero is temporary protection rather than a permanent solution.

### 4.2 The Villager Is the Game

The villager is not a cosmetic builder animation. The villager is the constraint that makes the game unique.

The villager must:

- Travel to build sites.
- Spend time constructing foundations.
- Repair damaged structures.
- Risk death outside the walls.
- Force the player to plan safe access routes.
- Create tension when multiple crises happen at once.

Later support crews can exist, but the starting villager should remain emotionally and mechanically important.

### 4.3 Geometry Is Gameplay

The player should win because their fortress is cleverly arranged, not because they spammed the most expensive tower.

Good fortress design should reward:

- Layered walls.
- Bent entrances.
- Gatehouses.
- Tower crossfire.
- Interior traps.
- Repair corridors.
- Safe villager paths.
- Fallback compartments.
- Anti-siege spacing.
- Efficient resource use.

Bad fortress design should fail because:

- One breach exposes the entire base.
- The villager cannot reach repair points.
- Towers block each other.
- Enemies path straight to the stockpile.
- Fire spreads through tightly packed wooden structures.
- Gates are placed as accidental enemy highways.

### 4.4 The Hero Is Powerful, Not Safe

The hero should dominate the early game but become too fragile to leave exposed forever. The hero is an emergency tool, not a one-unit army.

The best long-term use of the hero should be garrisoning them in key structures for strategic bonuses.

### 4.5 Physics Should Add Juice, Not Run the Whole Game

Use physics for satisfying effects, impacts, projectiles, knockback, siege collisions, debris, and destruction.

Do not use full physics for every strategic system. Pathfinding, build validation, wall adjacency, targeting, and scoring should remain deterministic and grid-aware. Otherwise the game becomes chaos wearing a helmet.

### 4.6 Endless Does Not Mean Mindless Scaling

Infinite waves should scale problems, not just health bars.

Escalation should introduce:

- More directions of attack.
- New enemy roles.
- Siege pressure.
- Fire threats.
- Repair strain.
- Boss mechanics.
- Resource scarcity.
- Wave mutators.
- Anti-cheese behavior.

### 4.7 Fortress Expression Is the Endgame

Late-game players should care about more than survival. The fortress itself becomes the trophy.

Endgame should support:

- Unique structures.
- Cosmetic wall styles.
- Paint and heraldry.
- Procedural building details.
- Trophy structures from bosses.
- Daily challenge screenshots.
- Replayable seed variation.

---

## 5. Core Gameplay Loop

1. **Prepare**
   - Review incoming wave direction and enemy hints.
   - Place foundations for walls, towers, gates, traps, and support buildings.

2. **Build**
   - Villager travels to foundations and constructs them.
   - Player uses the hero to protect vulnerable construction areas.

3. **Defend**
   - Enemies attack from one or more sides of the map.
   - Walls delay enemies.
   - Towers and traps kill enemies.
   - Hero intervenes during emergencies.

4. **Repair**
   - Villager or support crews repair damaged walls and towers.
   - Fire, rubble, and active attacks complicate repairs.

5. **Earn**
   - Kills and wave clears grant gold and resources.
   - Risky resources may drop outside the fortress.

6. **Expand**
   - Player extends the perimeter, creates kill zones, and builds fallback layers.

7. **Advance**
   - Unlock new ages, stronger materials, siege defenses, and gunpowder tech.

8. **Endure Forever**
   - Waves scale endlessly.
   - Leaderboards track survival, efficiency, and style.

---

## 6. Starting Conditions

The player begins with:

| Asset | Purpose |
|---|---|
| One villager | Builds, repairs, gathers, and enables fortress growth. |
| One hero | Powerful opening defender and later garrison commander. |
| Small stockpile | Initial resource bank and central objective. |
| Open green field | Dangerous blank canvas for fortress construction. |
| Minimal resources | Enough to build a crude first perimeter, not enough to feel safe. |

Possible initial resources:

```txt
Wood: 120
Stone: 0
Gold: 30
Iron: 0
Powder: 0
```

The first wave should arrive quickly. The player should not have time to build a complete perfect square unless they are very efficient.

---

## 7. Primary Units

## 7.1 Villager

The villager is the main vulnerable worker.

### Villager Roles

| Mode | Behavior |
|---|---|
| Build | Travels to foundations and constructs them. |
| Repair | Repairs damaged structures using resources. |
| Gather | Retrieves resources from nearby nodes or drops. |
| Flee | Runs to nearest safe point. |
| Assist | Later option: boosts nearby repair/build crews. |

### Villager Design Rules

- The villager must physically reach the target.
- The villager should be vulnerable outside the walls.
- Construction and repair should take meaningful time.
- Villager path safety should be a major fortress-design consideration.
- If the villager dies, the run should either end or enter a severe failure state.

Recommended failure rule for MVP:

> If the villager dies, the game ends.

Later version:

> If the villager dies, a costly rescue/replacement mechanic may exist, but leaderboard categories should distinguish perfect villager survival.

---

## 7.2 Hero: The Warden

The hero is a powerful but fragile defender.

### Hero Fantasy

The Warden is the last competent person in a field full of problems. Early enemies are terrified of them. Later siege waves treat them as a priority target.

### Hero Strengths

- High damage.
- Can one-shot early enemies.
- Good emergency response.
- Can hold a breach briefly.
- Provides powerful bonuses while garrisoned.

### Hero Weaknesses

- Low durability relative to wave scaling.
- Slow healing.
- Vulnerable to ranged enemies and siege.
- Suffers fatigue while deployed outside a garrison.
- Expensive or slow to revive if defeated.

### Fatigue Mechanic

While the hero is outside a garrison:

- Attack speed gradually decreases.
- Armor or damage resistance gradually decreases.
- Healing stops or slows.
- At maximum fatigue, the hero becomes wounded and must rest.

This prevents the hero from replacing fortress design.

### Garrison Bonuses

| Garrison Structure | Bonus |
|---|---|
| Keep | Global morale, faster repairs, small economy bonus. |
| Watchtower | Precision shot or increased tower range. |
| Gatehouse | Stronger gate, enemy slow near entrance. |
| Barracks | Faster militia/support crew response. |
| Shrine/Chapel | Hero healing, anti-undead or morale aura. |

The correct emotional beat:

> Pulling the hero out of garrison should feel like using the emergency generator, not turning on easy mode.

---

## 8. Building System

Buildings use a foundation system.

1. Player selects a structure.
2. Player places a ghost/foundation.
3. The villager receives or chooses a build task.
4. The villager pathfinds to the site.
5. Construction progresses over time.
6. The completed building becomes active.

### Placement Rules

- Must be on valid terrain.
- Must be reachable by villager, unless special scaffolding rules apply.
- Walls should snap to a grid.
- Gates must attach to wall segments.
- Towers need clearance and line of sight.
- Traps need valid trigger spaces.
- Support buildings may need stockpile range.
- Placement should not create impossible pathfinding without allowing enemies to attack blockers.

### Building Categories

## 8.1 Walls

| Building | Age | Role |
|---|---:|---|
| Palisade | Dark | Cheap early barrier. Vulnerable to fire. |
| Reinforced Palisade | Dark/Feudal | Better wood wall. Still fire-prone. |
| Stone Wall | Feudal/Castle | Main durable wall. |
| Thick Stone Wall | Castle | Expensive high-health defensive layer. |
| Curtain Wall | Castle/Imperial | Strong wall with tower/platform synergy. |
| Ornate/Legendary Wall | Endless | Cosmetic or prestige version of existing wall tiers. |

## 8.2 Gates

| Building | Role |
|---|---|
| Wooden Gate | Cheap early access point. |
| Reinforced Gate | Better health and slower breach. |
| Portcullis | Stronger anti-rush gate. |
| Murder Gate | Damages or slows enemies passing through. |
| Drawbridge Gate | Works with moat or ditch mechanics. |

## 8.3 Towers

| Building | Role |
|---|---|
| Watchtower | Basic ranged defense. |
| Archer Tower | Sustained anti-infantry damage. |
| Crossbow Tower | Better armor penetration. |
| Ballista Tower | Line-based heavy damage. |
| Cannon Tower | Late gunpowder splash damage. |
| Signal Tower | Buffs nearby towers or reveals wave composition. |

## 8.4 Interior Defenses

| Building | Role |
|---|---|
| Spike Trap | Cheap anti-rush trap. |
| Burning Pitch Trench | Fire zone near walls/gates. |
| Ballista Lane | Long straight-line defense. |
| Mangonel Platform | Area damage over walls. |
| Bombard Emplacement | Late siege counter. |
| Oil Cauldron | Punishes enemies attacking adjacent wall/gate. |
| Kill-Box Barricade | Creates interior fallback choke points. |

## 8.5 Economy and Support

| Building | Role |
|---|---|
| Stockpile | Resource drop-off and core objective. |
| Lumber Hut | Improves wood access. |
| Quarry Marker | Improves stone access. |
| Forge | Unlocks weapon and armor upgrades. |
| Workshop | Unlocks siege defenses and engineering. |
| Mason Lodge | Improves stone repair and durability. |
| Engineer Guild | Reloads advanced defenses and gunpowder structures. |
| Hero Keep | Main garrison and hero recovery site. |
| Barracks | Unlocks support crews or temporary defenders. |
| Shrine/Chapel | Morale, healing, and special defensive auras. |

## 8.6 Vanity and Endgame Structures

| Structure | Purpose |
|---|---|
| Banners | Visual identity and achievement display. |
| Heraldry | Player/faction customization. |
| Gargoyles | Cosmetic prestige and procedural variation. |
| Trophy Monuments | Earned from bosses or milestones. |
| Roof Styles | Procedural variety for towers and keeps. |
| Painted Walls | Endgame fortress personalization. |
| Decorative Roads | Improves visual clarity and fortress style. |

---

## 9. Tech Ages

Progression should visually and mechanically evolve from rough survival to advanced medieval artillery.

| Age | Theme | Unlocks |
|---|---|---|
| Dark Age | Panic survival | Palisades, torches, spike traps, basic watchtower. |
| Feudal Age | Organized defense | Gates, archer towers, reinforced palisades, early stone. |
| Castle Age | Fortress identity | Keeps, stone walls, murder holes, ballistae, moats. |
| Imperial Age | Gunpowder and heavy defense | Bombards, cannon towers, engineers, advanced masonry. |
| Endless Age | Mastery and style | Prestige structures, cosmetics, procedural variants, challenge modifiers. |

Each age should add new problems and new tools. Avoid dumping too many unlocks at once.

---

## 10. Enemy Design

Enemies should attack from different map edges and use different priorities. They should not all be identical bodies walking toward the center.

### Enemy Classes

| Enemy | Role |
|---|---|
| Rabble | Early swarm; tests basic wall timing. |
| Raiders | Fast enemies that exploit open routes and target villagers. |
| Archers | Shoot over low walls and punish exposed units. |
| Torchbearers | Ignite wooden structures. |
| Shieldmen | Resist tower fire. |
| Sappers | Target corners, gates, and clustered defenses. |
| Rams | Attack gates and walls directly. |
| Siege Towers | Deliver enemies over or past walls. |
| Ladder Teams | Force interior defense and wall coverage. |
| Knights | High armor; punish weak kill zones. |
| Bombard Crews | Late-game wall breakers. |
| Assassins | Target hero or villager if a path opens. |
| Boss Units | Force redesign rather than simple DPS scaling. |

### Targeting Priorities

| Enemy Type | Target Priority |
|---|---|
| Raiders | Villager, open gates, weak walls. |
| Sappers | Wall corners, towers, dense clusters. |
| Rams | Gates first, then nearest wall. |
| Torchbearers | Wood buildings and repair structures. |
| Archers | Villager, hero, exposed crews. |
| Bosses | Unique objectives by boss type. |

### Enemy AI Rule

If enemies cannot path to their target because the player has fully enclosed the fortress, they should choose intelligent breach targets instead of freezing.

Potential breach logic:

```txt
1. Try path to stockpile.
2. If blocked, find weakest reachable wall/gate segment near shortest route.
3. Prefer gates, damaged sections, corners, and low-defense areas.
4. Assign siege enemies to breach points.
5. Assign infantry to wait, escort, or attack nearby structures.
```

---

## 11. Wave System

Use a wave director rather than fully random spawns.

### Wave Director Responsibilities

- Pick spawn direction or directions.
- Select enemy composition.
- Escalate difficulty over time.
- Introduce new enemy types at milestones.
- Trigger bosses.
- Apply mutators.
- Avoid unfair impossible openings.
- Preserve replay consistency for seeded challenges.

### Example Milestones

| Wave | Event |
|---:|---|
| 1 | First rabble attack. |
| 3 | Torchbearers appear. |
| 5 | First mini-boss. |
| 8 | Two-sided attack. |
| 10 | Feudal tech unlock. |
| 15 | Rams appear. |
| 20 | Castle tech unlock. |
| 25 | Sappers appear. |
| 30 | First major siege boss. |
| 40 | Imperial tech unlock. |
| 50+ | Endless mutators stack. |

### Endless Mutators

Possible mutators:

- North-side raid arrives early.
- Wood structures take increased fire damage.
- Fog hides enemy composition.
- Siege engines have shield escorts.
- Hero fatigue increases faster.
- Repairs cost more this wave.
- Enemies prefer gates.
- Assassins spawn if the villager leaves walls.
- Fire spreads faster.
- Ranged enemies prioritize repair crews.
- Boss spawns with random armor type.

---

## 12. Resource Economy

Start simple. Add complexity only when the core loop is fun.

### Core Resources

| Resource | Source | Used For |
|---|---|---|
| Wood | Starting stockpile, trees, wave rewards | Palisades, towers, repairs. |
| Stone | Quarry nodes, wave rewards | Stone walls, keeps, advanced structures. |
| Gold | Enemy kills, bosses, objectives | Upgrades, hero recovery, advanced defenses. |
| Iron | Mid/late waves and map nodes | Ballistae, gates, armor upgrades. |
| Powder | Late-game production or rare drops | Cannons, bombards, explosive traps. |

### Resource Pressure

Resources should create risk.

Good mechanic:

> Valuable drops appear outside the walls after waves, forcing the villager or haulers to leave safety if the player wants faster progression.

Do not turn the game into a pure economy simulator. The economy exists to intensify defense decisions.

---

## 13. Map Design

The map should feel large, open, and replayable.

### Map Features

- Wide grassy field.
- Random hills.
- Forest patches.
- Stone outcrops.
- Ruins.
- Streams or marshes.
- Ancient roads.
- Enemy spawn camps near edges.
- Rare relic sites.
- Procedural terrain variation.

### Terrain Effects

| Terrain | Effect |
|---|---|
| Grass | Normal movement and building. |
| Mud | Slows units; poor for heavy construction. |
| Hill | Tower range or vision bonus. |
| Forest | Blocks building until cleared; source of wood. |
| Stone Patch | Quarry bonus or stone source. |
| Ruins | Can be rebuilt into unique structures. |
| Road | Faster villager and crew movement. |
| Water/Marsh | Blocks or slows units; enables bridge/drawbridge mechanics. |

### Seeded Maps

Daily challenge and leaderboard runs should use fixed seeds so all players face the same terrain and wave RNG.

---

## 14. Fortress Design Mechanics

The game should detect and reward fortress quality indirectly through survival pressure and directly through scoring categories.

### Important Fortress Concepts

| Concept | Gameplay Value |
|---|---|
| Layered Perimeters | Breaches are survivable. |
| Kill Zones | Enemies take focused damage before reaching key targets. |
| Bent Entrances | Prevent straight-line rushes. |
| Gatehouses | Turn necessary openings into defensive assets. |
| Repair Corridors | Allow villager/crews to reach damaged sections safely. |
| Compartments | Prevent one breach from ending the run. |
| Tower Crossfire | Rewards overlapping fields of fire. |
| Trap Access | Reload/reset paths matter. |
| Anti-Siege Spacing | Prevents splash damage from deleting clusters. |

### Anti-Cheese Goals

Avoid making the optimal fortress:

- One giant square.
- One endless maze.
- A wall blob with no gates.
- A single tower cluster.
- A pathfinding exploit.

Enemies, fire, siege, and repair logistics should punish boring designs.

---

## 15. Physics Philosophy

Use a hybrid simulation.

### Grid/Logic Systems

Use deterministic tile/grid logic for:

- Building placement.
- Wall snapping.
- Enemy pathfinding.
- Villager pathing.
- Repair access.
- Build validity.
- Fortress scoring.
- Wave replay validation.

### Physics Systems

Use physics for:

- Projectile impacts.
- Knockback.
- Siege ram collisions.
- Boulder rolls.
- Cannonballs.
- Wall collapse debris.
- Fire and explosion visuals.
- Satisfying enemy deaths.
- Hero charge or shove abilities.

### Principle

Physics should make the game feel alive. It should not decide whether the game is playable.

---

## 16. Recommended Technical Stack

### Prototype Stack

| Layer | Recommendation |
|---|---|
| Language | TypeScript |
| Build Tool | Vite |
| Renderer/Game Framework | Phaser or PixiJS |
| Physics | Rapier 2D |
| Pathfinding | Custom grid A* or pathfinding library |
| Data Format | TypeScript data objects first, JSON later |
| Persistence | Local storage first |
| Backend | Add after core loop works |

### Online Stack Later

| Need | Recommendation |
|---|---|
| Leaderboards | Lightweight Node/Express or serverless API |
| Multiplayer Rooms | Colyseus |
| Replays | Input logs plus seeded deterministic simulation |
| Anti-Cheat | Server validation and replay sanity checks |

### Opinionated Recommendation

Start with:

```txt
TypeScript + Vite + Phaser + Rapier 2D
```

Add server features only after the single-player loop is fun.

---

## 17. Suggested Project Structure

```txt
src/
  game/
    scenes/
      BootScene.ts
      GameScene.ts
      UIScene.ts

    systems/
      BuildSystem.ts
      WaveSystem.ts
      EconomySystem.ts
      CombatSystem.ts
      PathfindingSystem.ts
      PhysicsSystem.ts
      RepairSystem.ts
      GarrisonSystem.ts
      UpgradeSystem.ts
      ScoringSystem.ts

    entities/
      Villager.ts
      Hero.ts
      Enemy.ts
      Building.ts
      Projectile.ts
      ResourceDrop.ts

    data/
      buildings.ts
      enemies.ts
      waves.ts
      upgrades.ts
      resources.ts
      ages.ts

    map/
      TileMap.ts
      MapGenerator.ts
      Terrain.ts
      PathGrid.ts

    ui/
      BuildMenu.ts
      ResourceBar.ts
      AlertPanel.ts
      WavePanel.ts
      SelectionPanel.ts

    net/
      LeaderboardClient.ts
      ReplayRecorder.ts
      SeedManager.ts
```

---

## 18. Core Systems

## 18.1 Build System

Responsibilities:

- Validate placement.
- Place ghost/foundation entities.
- Queue construction tasks.
- Assign villager or crews.
- Convert foundations into completed buildings.
- Cancel/refund foundations when needed.

## 18.2 Pathfinding System

Responsibilities:

- Maintain tile walkability.
- Calculate villager paths.
- Calculate enemy paths.
- Update paths when walls/gates are built or destroyed.
- Detect blocked targets and trigger breach behavior.

## 18.3 Combat System

Responsibilities:

- Handle targeting.
- Resolve melee and ranged attacks.
- Apply armor, damage types, and resistances.
- Spawn projectiles.
- Award kill resources.

## 18.4 Wave System

Responsibilities:

- Generate wave compositions.
- Spawn enemies.
- Track wave progress.
- Apply mutators.
- Trigger bosses.
- Unlock age milestones.

## 18.5 Repair System

Responsibilities:

- Track damaged buildings.
- Prioritize repair targets.
- Calculate repair cost and time.
- Handle fire/rubble restrictions.
- Support villager and crew behavior.

## 18.6 Garrison System

Responsibilities:

- Move hero into structures.
- Apply garrison bonuses.
- Heal or rest hero.
- Handle ungarrison commands.
- Track hero fatigue.

## 18.7 Economy System

Responsibilities:

- Track resources.
- Award resources from kills and waves.
- Spend resources on builds/upgrades/repairs.
- Spawn resource drops.
- Handle risky outside-wall collection.

## 18.8 Scoring System

Responsibilities:

- Track wave reached.
- Track kills.
- Track fortress value.
- Track villager damage.
- Track hero deployments.
- Track efficiency metrics.
- Generate leaderboard payloads.

---

## 19. Data Model Examples

### Building Definition

```ts
export type Age = "dark" | "feudal" | "castle" | "imperial" | "endless";

export type ResourceCost = {
  wood?: number;
  stone?: number;
  gold?: number;
  iron?: number;
  powder?: number;
};

export type BuildingDefinition = {
  id: string;
  name: string;
  age: Age;
  cost: ResourceCost;
  buildTime: number;
  maxHp: number;
  blocksMovement: boolean;
  footprint: { width: number; height: number };
  tags: string[];
};

export const Buildings: Record<string, BuildingDefinition> = {
  palisade: {
    id: "palisade",
    name: "Palisade",
    age: "dark",
    cost: { wood: 10 },
    buildTime: 1.8,
    maxHp: 100,
    blocksMovement: true,
    footprint: { width: 1, height: 1 },
    tags: ["wall", "wood", "flammable"],
  },

  watchtower: {
    id: "watchtower",
    name: "Watchtower",
    age: "dark",
    cost: { wood: 60, gold: 20 },
    buildTime: 6,
    maxHp: 180,
    blocksMovement: true,
    footprint: { width: 2, height: 2 },
    tags: ["tower", "ranged", "wood", "flammable"],
  },
};
```

### Enemy Definition

```ts
export type EnemyDefinition = {
  id: string;
  name: string;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  armor: number;
  goldValue: number;
  tags: string[];
  targetPreference: string[];
};

export const Enemies: Record<string, EnemyDefinition> = {
  rabble: {
    id: "rabble",
    name: "Rabble",
    maxHp: 24,
    speed: 1.0,
    damage: 4,
    attackRange: 1,
    attackCooldown: 1.2,
    armor: 0,
    goldValue: 2,
    tags: ["infantry", "swarm"],
    targetPreference: ["stockpile", "wall", "villager"],
  },

  raider: {
    id: "raider",
    name: "Raider",
    maxHp: 35,
    speed: 1.6,
    damage: 6,
    attackRange: 1,
    attackCooldown: 0.9,
    armor: 0,
    goldValue: 4,
    tags: ["infantry", "fast"],
    targetPreference: ["villager", "gate", "stockpile"],
  },
};
```

### Wave Definition

```ts
export type WaveDefinition = {
  wave: number;
  spawns: Array<{
    enemyId: string;
    count: number;
    side: "north" | "south" | "east" | "west" | "random";
    delay?: number;
  }>;
  rewards?: ResourceCost;
  unlocks?: string[];
  mutators?: string[];
};
```

---

## 20. Leaderboards and Scoring

Do not rely only on highest wave. That rewards grind and cheese.

### Leaderboard Categories

| Category | Measures |
|---|---|
| Highest Wave | Main survival ranking. |
| Daily Seed | Fair same-map/same-wave competition. |
| Fastest to Wave 25 | Early efficiency. |
| Smallest Fortress at Wave 50 | Compact engineering. |
| Most Kills Per Tile | Kill-zone quality. |
| Villager Never Hit | Clean defense. |
| Hero Garrison Discipline | Survived while rarely deploying hero. |
| Most Fortress Value | Impressive castle building. |
| Hardcore Seed | No pause, harsher waves, fixed rules. |

### Example Score Formula

```txt
score =
  waveReached * 10_000
  + kills * 25
  + bossesKilled * 2_500
  + fortressValue
  + villagerSurvivalBonus
  + heroPreservationBonus
  - tilesUsedPenalty
  - repairSpamPenalty
```

Use separate leaderboards rather than trying to make one formula perfect.

---

## 21. Replay and Anti-Cheat Strategy

For early local prototypes, do not worry about anti-cheat.

For online leaderboards:

- Server generates daily seed.
- Client records input log.
- Client submits score, seed, and input log.
- Server validates basic sanity.
- Suspicious top scores require replay validation.
- Long-term, use deterministic simulation validation.

Minimum leaderboard payload:

```ts
type ScoreSubmission = {
  playerId: string;
  seed: string;
  waveReached: number;
  score: number;
  elapsedSeconds: number;
  kills: number;
  buildingsBuilt: number;
  villagerDamageTaken: number;
  heroDeaths: number;
  inputLogHash: string;
  clientVersion: string;
};
```

---

## 22. MVP Roadmap

## MVP 0 — Ugly Prototype

Goal: prove the core loop.

Required:

- Green field.
- One villager.
- One hero.
- Place wall foundations.
- Villager walks to build walls.
- Enemies spawn from one side.
- Hero attacks enemies.
- Walls block enemies.
- Enemies attack walls if blocked.
- Gold from kills.
- Basic repair.
- Game over when villager dies.

No cosmetics. No ages. No multiplayer. No procedural fortress art. No cannon towers. No nonsense.

## MVP 1 — Basic Game Loop

Add:

- Wave system.
- Two enemy types.
- Archer/watchtower.
- Gate.
- Repair command.
- Wood and gold economy.
- Hero garrison in keep.
- Local score tracking.

## MVP 2 — Fortress Tactics

Add:

- Line-of-sight towers.
- Trap tiles.
- Gatehouse bonuses.
- Enemies from multiple sides.
- Sapper enemy.
- Fire on wooden structures.
- Villager flee behavior.

## MVP 3 — Progression

Add:

- Dark to Feudal to Castle tech.
- Stone walls.
- Ballista.
- Forge upgrades.
- Boss every 10 waves.
- Seeded map generation.

## MVP 4 — Online Layer

Add:

- Server-auth score submission.
- Daily challenge.
- Replay recording.
- Global leaderboard.
- Basic anti-cheat sanity checks.

## MVP 5 — Final Form Systems

Add:

- Imperial/gunpowder age.
- Procedural building variation.
- Cosmetic fortress customization.
- Advanced enemies and bosses.
- Replay sharing.
- Co-op or parallel competitive modes.

---

## 23. Final Form Vision

The finished game should support short frantic runs, long survival grinds, and screenshot-worthy fortress showcases.

### Final Form Features

- Endless wave survival.
- Large seeded maps.
- Procedural terrain.
- Dark Age to gunpowder progression.
- Physical villager construction.
- Hero garrison strategy.
- Layered wall and gatehouse tactics.
- Interior traps and defenses.
- Repair logistics.
- Fire, rubble, siege impacts, and physics-driven visual destruction.
- Daily challenge leaderboards.
- Replay/ghost fortress sharing.
- Cosmetic fortress identity.
- Unique boss trophy structures.
- Optional co-op or parallel survival mode.

### The Endgame Fantasy

A veteran player should be able to look at their fortress at Wave 100 and see:

- Old emergency palisades buried inside later stone walls.
- A scorched gatehouse that survived three boss waves.
- A carefully bent kill corridor covered by ballistae.
- A hero keep at the center powering the whole defense.
- Repair roads and compartments showing lessons learned from previous breaches.
- Cosmetic banners, wall paint, trophies, and procedural building details that make the run feel unique.

The fortress should tell the story of the run.

---

## 24. Non-Goals and Feature Creep Warnings

Do not start with:

- Full MMO multiplayer.
- 3D graphics.
- Complex economy simulation.
- Ten villager types.
- Huge tech tree.
- Cosmetic monetization.
- Full physics for every gameplay decision.
- Procedural everything.
- PvP balance.
- Perfect anti-cheat.

Build the ugly fun first.

The order of operations:

```txt
1. Make 10 minutes of panic fun.
2. Make fortress geometry matter.
3. Add progression.
4. Add visual juice.
5. Add leaderboards.
6. Add procedural cosmetics.
7. Add multiplayer only if the core loop deserves it.
```

---

## 25. First Prototype Success Test

The first prototype succeeds if this situation is tense and readable:

1. Player places a partial wall.
2. Villager starts building.
3. Enemies arrive before construction completes.
4. Hero buys time but starts taking dangerous damage.
5. One enemy threatens the villager.
6. Player makes a meaningful choice under pressure.
7. The outcome feels fair.
8. The player immediately wants to try a better layout.

If this works, the rest of the game can grow from it.

If this does not work, do not add cannons. Fix this moment first.

---

## 26. Working Motto

> **The villager builds the fortress. The fortress protects the villager. The hero buys time. The player designs the machine.**

