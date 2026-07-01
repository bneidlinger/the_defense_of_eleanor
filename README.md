<div align="center">

```
    _|""|_|""|_|""|_|""|_|""|_|""|_|""|_|""|_|""|_|""|_
   |                                                    |
   |            THE  DEFENSE  OF  ELEANOR               |
   |                                                    |
   |     a peasant, a knight, and a great many          |
   |             uninvited guests                       |
   |____________________________________________________|
        \\                                        //
         \\____________________________________ //
          |__|__|__|__|__|__|__|__|__|__|__|__|__|
```

**An endless medieval fortress-survival builder, played out in your browser.**
*One villager must build the whole castle by hand. She would like you to hurry.*

![status](https://img.shields.io/badge/status-tis_but_a_prototype-e08a2a)
![built with](https://img.shields.io/badge/built_with-TypeScript_+_Phaser_3-4ea3ff)
![physics](https://img.shields.io/badge/physics-deferred,_like_the_plague-9c9c9c)
![coconuts](https://img.shields.io/badge/coconuts-bring_your_own-8b5a2b)
![horses](https://img.shields.io/badge/horses-nil-d64536)

</div>

---

## Halt! Who Goes There?

This is **The Defense of Eleanor**, a `.io`-style siege game in which you begin
with almost nothing: an open green field, a modest pile of grain, a knight of
questionable durability, and **Eleanor** — a lone villager who is, regrettably,
the only person in the entire realm who knows how to stack a wall.

Unlike lesser tower-defense games, your walls do not spring into being because
you *wished* it. Eleanor must physically walk to each spot and build the thing
with her own two hands, one plank at a time, while an escalating parade of
brigands, raiders, and general ne'er-do-wells arrives from the north to express
their opinions about your grain.

The knight — **the Warden** — can hold them off for a while. He is very brave.
He is also made largely of optimism, and will fall over if you ask too much of
him. Your job is not to *win a fight*. Your job is to **design the machine**
that keeps Eleanor alive.

> *The villager builds the fortress. The fortress protects the villager.*
> *The Warden buys time. You design the machine.*

---

## The Moment It All Comes Together (or Doesn't)

You lay down five wall segments. Eleanor sets off, whistling, to build them.

The first raiders crest the hill before she's finished the third. The Warden
charges in, deletes two of them outright, and then — with the timing of a man
who has read the situation entirely wrong — begins taking damage. One raider
slips past the unfinished gap and makes directly for Eleanor, who is still
holding a plank and has strong opinions about being interrupted.

Now you must choose: send the Warden to save her and abandon the line, finish
the wall and pray, or accept that this particular castle was always going to be
a learning experience.

**If that moment made you lean forward, the game is working.**

---

## Summoning It From the Void

You will need [Node.js](https://nodejs.org) (v18+). Then:

```bash
npm install        # gather ye dependencies
npm run dev        # → http://localhost:5173
```

Other incantations:

```bash
npm run build      # typecheck + production bundle (into dist/)
npm run typecheck  # just the typechecking, thank you
```

There are no coconuts required. If someone tells you there are coconuts
required, they are having you on.

---

## Ye Controls

| Input | Deed |
|---|---|
| **Left-click / drag** | Lay palisade foundations (10 wood apiece) |
| **Right-click** | Command the Warden to march somewhere |
| **`1`** | Select the palisade (wall) tool |
| **`Esc`** | Put the tool down |
| **`R`** | Try again, on the inevitable defeat screen |

Eleanor works of her own accord — she builds the nearest foundation, then
repairs the nearest crumbling wall. You do not command her directly; you
influence her by *where* you choose to build, and you keep her breathing with
the Warden. She is not for arguing with. She has a plank.

---

## What Actually Works (Allegedly)

This is **MVP 0** — the deliberately ugly prototype whose only job is to prove
the core loop is fun *before* a single cannon, cosmetic, or coat of arms is
added. Present and accounted for:

- 🌾 A green field, a central **stockpile**, and the constant threat of losing both
- 👷 **Eleanor**, who grid-pathfinds, builds palisades over real time, and auto-repairs damage
- 🛡️ **The Warden**, who auto-fights, keeps to a leash, heals out of combat, and gets *knocked down* (not slain) when overwhelmed — then limps home while you sweat
- 🏹 **Enemies** (rabble, plus raiders who hunt Eleanor specifically) that march from the north, pour toward the stockpile, and **batter down walls** when you box them out
- 🌊 A wave director that opens with a prep window, then escalates and tightens the screws
- 🪵 A **wood** economy for building/repair, and **gold** bounties from the fallen

---

## 'Tis But a Prototype

Loudly and proudly **not yet implemented** (this is a feature — see the design
brief's stern warnings against feature creep):

- Physics juice (Rapier), because MVP 0 doesn't need it and setup is a tax
- Towers, gates, murder-holes, boiling oil, and other delightful cruelties
- The tech ages (Dark → Feudal → Castle → Imperial → Endless)
- Cosmetics, heraldry, banners, and gargoyles of dubious taste
- Leaderboards, seeds, replays, and anything resembling a server
- Killer rabbits (mercifully)

### The Road Ahead

| Milestone | Roughly |
|---|---|
| **MVP 1** | Real wave system, the first watchtower, gates, hero garrison, local scores |
| **MVP 2** | Line-of-sight towers, traps, fire on wooden walls, multi-directional sieges |
| **MVP 3** | Tech ages, stone walls, ballistae, a boss every ten waves, seeded maps |
| **MVP 4** | Online leaderboards, daily challenges, replays, basic anti-cheese |
| **MVP 5** | Gunpowder, procedural fortress art, cosmetics, co-op, and general showing-off |

We shall not be adding cannons until the peasant-panic is fun. This is
non-negotiable and possibly the only firmly-held belief in the entire project.

---

## Beneath the Ramparts

Built with **TypeScript · Vite · Phaser 3**. Deterministic tile grid + A\* for
all the logic that must never lie (placement, pathing, breaching); physics is
reserved strictly for future juice.

```
src/
  main.ts            Phaser bootstrap (GameScene + UIScene)
  config.ts          every tunable number, in one honest place
  core/              Grid, A* pathfinding, HP bars & visual effects
  entities/          Building, Villager (Eleanor), Hero (the Warden), Enemy
  systems/           WaveSystem — the minimal wave director
  scenes/            GameScene (the simulation), UIScene (the HUD)
```

The full design & architecture brief lives in
[`siegefield_io_game_design.md`](siegefield_io_game_design.md) — *Siegefield*
being the working title before Eleanor talked her way onto the marquee.

---

## Three Questions (as at any respectable bridge)

**Q: What is your name?**
It is *The Defense of Eleanor*. Please keep up.

**Q: What is your quest?**
To keep one villager alive against an infinite siege using nothing but clever
wall geometry and a knight who really should sit down.

**Q: What is the airspeed velocity of an incoming raider?**
94 pixels per second. (Eleanor manages 92, which is *exactly* the problem.)

---

## License

Currently unspecified, which legally means "all rights reserved." A permissive
license (MIT is a fine choice) would make this friendlier for public
consumption — happy to drop one in.

---

<div align="center">

*Lovingly inspired by — but legally quite distinct from — a certain 1975 film
about coconuts, killer rabbits, and constitutional theory. No copyrighted lines
were pilfered in the making of this README; every joke herein is our own, and
we accept full blame for each one.*

**Now go. Eleanor is waiting, and she is holding a plank.**

</div>
