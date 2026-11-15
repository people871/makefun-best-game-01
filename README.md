# VOIDHARVEST — top-down nebula arena shooter (best-game-01)

Pilot a harvester ship through a nebula arena: collect star shards, fight
escalating waves of void creatures, choose 1 of 3 upgrades between waves,
and slay the Void Maw boss every 5 waves. Clear wave 10 to win — or keep
harvesting in endless mode. Lose when your hull hits 0.

## Controls
- **WASD / arrows** — fly (with glide + friction, not grid movement)
- **Mouse** — aim; **hold left click** — fire
- **Space** — fire without a mouse (auto-aims at the nearest enemy)
- **1 / 2 / 3 or click** — pick an upgrade between waves
- **P / Esc** — pause · **M** — mute · **R** — restart · **C** — endless after victory

## The loop
- 10 waves, escalating: motes (chasers), spitters (ranged), brutes (tanks),
  Void Maw boss on waves 5 and 10.
- Kills build a combo multiplier (up to x5); enemies drop star shards that
  magnetise to the ship, score points and restore a little shield.
- Wave clear: score bonus, +12 hull repair, then 1-of-3 upgrades
  (Twin Lance, Rapid Coils, Heavy Rounds, Aegis Plating, Hull Weave,
  Ion Thrusters, Magnet Coil, Nova Burst, Shard Siphon).
- HUD: hull + shield bars, score, wave, combo, shards, kills, best, minimap.
- Feel: particles, screen shake, engine trails, parallax starfield + nebula,
  fully synthesised WebAudio effects and a low ambient drone. No assets,
  no network requests, no external dependencies.

## Files
- `game/index.html` — canvas + HUD hint, loads `src/main.js`
- `game/src/main.js` — bootstrap, fixed 1/60 s loop, `?shot=` / `?selftest=`
- `game/src/game.js` — state machine (title / playing / upgrade / paused /
  victory / gameover), camera, scoring, wave flow
- `game/src/player.js` — ship movement, weapons, hull/shield, damage
- `game/src/enemies.js` — 4 enemy kinds + boss, bullets, shard pickups
- `game/src/waves.js` — wave composition, spawn queue, boss waves
- `game/src/upgrades.js` — the 1-of-3 upgrade pool
- `game/src/particles.js` — pooled particles + floating combat text
- `game/src/render.js` — parallax nebula, arena, entities
- `game/src/hud.js` — HUD, minimap, banners, menus
- `game/src/audio.js` — synthesised WebAudio SFX + drone
- `game/src/input.js` — keyboard + mouse, keyboard-only fallback
- `game/src/rng.js` — seeded RNG (deterministic screenshots/selftest)
- `game/src/shots.js` — staged screenshot scenes + scripted selftest
- `main.ts` — copies game/ + screenshots/ to /output, writes dossier.json
- `serve.ts` — local static server for play-testing

## License
MIT.
