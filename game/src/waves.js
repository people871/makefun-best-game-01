// Wave director: what spawns, when, and when a wave is won.
// Waves 1–10 are the campaign; clearing wave 10 wins the game, and the
// player may keep harvesting in endless waves after that. Every 5th wave is
// a boss wave: the Void Maw plus a light escort.
import { spawnEnemy, spawnPointOutsideView } from './enemies.js';

// How many of each kind a wave fields (before the boss escort is added).
export function waveComposition(wave) {
  const motes = 4 + wave * 2;
  const spitters = wave >= 2 ? 1 + Math.floor(wave / 2) : 0;
  const brutes = wave >= 3 ? Math.floor((wave - 1) / 2) : 0;
  return { mote: motes, spitter: spitters, brute: brutes };
}

export function isBossWave(wave) {
  return wave % 5 === 0;
}

// Build the spawn queue for a wave: a shuffled list of kinds, trickled out
// over the wave instead of dumped all at once.
export function buildWaveQueue(g, wave) {
  const comp = waveComposition(wave);
  const queue = [];
  for (const [kind, count] of Object.entries(comp)) {
    for (let i = 0; i < count; i += 1) queue.push(kind);
  }
  // Shuffle with the game's seeded RNG so a staged shot is reproducible.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(g.rng.next() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  if (isBossWave(wave)) queue.unshift('boss');
  return queue;
}

export function startWave(g, wave) {
  g.wave = wave;
  g.spawnQueue = buildWaveQueue(g, wave);
  g.spawnTimer = 0.8;
  g.waveActive = true;
  g.waveBanner = { text: isBossWave(wave) ? `WAVE ${wave} — THE VOID MAW` : `WAVE ${wave}`, t: 2.4 };
  g.sounds.waveStart();
  if (isBossWave(wave)) g.sounds.boss();
}

export function updateWaveSpawning(g, dt) {
  if (!g.waveActive || g.spawnQueue.length === 0) return;
  g.spawnTimer -= dt;
  if (g.spawnTimer > 0) return;
  // Trickle: one spawn every ~0.55 s, faster on later waves, so the arena
  // fills up without ever overwhelming the opening seconds.
  g.spawnTimer = Math.max(0.25, 0.6 - g.wave * 0.02);
  const kind = g.spawnQueue.shift();
  const at = spawnPointOutsideView(g);
  // The boss always enters at the far side of the arena, on screen.
  if (kind === 'boss') {
    spawnEnemy(g, 'boss', g.world.w / 2, 140);
  } else {
    spawnEnemy(g, kind, at.x, at.y);
  }
}

// True when nothing is left to spawn and nothing is left alive.
export function isWaveCleared(g) {
  return (
    g.waveActive &&
    g.spawnQueue.length === 0 &&
    g.enemies.every((e) => !e.alive)
  );
}

export function clearDeadEnemies(g) {
  g.enemies = g.enemies.filter((e) => e.alive);
}
