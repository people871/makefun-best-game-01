// Void creatures: four kinds, each with its own movement, attack and look.
// Enemies are plain data in g.enemies; spawnEnemy builds one, updateEnemies
// steps them all. Boss behaviour lives here too (the Void Maw, every 5 waves).
import { clamp, angleTo, distance } from './rng.js';
import { damagePlayer, damageEnemy, healPlayer } from './player.js';

export const ENEMY_DEFS = {
  mote: {
    name: 'Void Mote',
    hp: 20,
    speed: 95,
    radius: 13,
    contact: 8,
    score: 50,
    shards: 1,
    color: '#b388ff',
  },
  spitter: {
    name: 'Spitter',
    hp: 30,
    speed: 62,
    radius: 15,
    contact: 6,
    score: 100,
    shards: 2,
    color: '#ff7ad9',
  },
  brute: {
    name: 'Brute',
    hp: 95,
    speed: 46,
    radius: 24,
    contact: 16,
    score: 200,
    shards: 3,
    color: '#ff8a5c',
  },
  boss: {
    name: 'Void Maw',
    hp: 950,
    speed: 38,
    radius: 44,
    contact: 22,
    score: 2000,
    shards: 12,
    color: '#ff3d5e',
  },
};

export function spawnEnemy(g, kind, x, y) {
  const def = ENEMY_DEFS[kind];
  const hpScale = 1 + (g.wave - 1) * 0.12;
  const enemy = {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: def.radius,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * g.rng.range(0.9, 1.1),
    contact: def.contact,
    score: def.score,
    shards: def.shards,
    color: def.color,
    alive: true,
    flash: 0,
    // Spitters keep their distance and shoot on this timer.
    shootTimer: g.rng.range(1.2, 2.4),
    // Bosses fire radial bursts and spawn motes on this timer.
    burstTimer: 3,
    spawnTimer: 5,
    wobble: g.rng.angle(),
    // Contact hits hurt the player at most once per 0.6 s per enemy.
    touchTimer: 0,
  };
  g.enemies.push(enemy);
  return enemy;
}

// Pick a spawn point just outside the camera view, on a random side.
export function spawnPointOutsideView(g) {
  const cam = g.camera;
  const margin = 60;
  const side = g.rng.int(0, 3);
  if (side === 0) return { x: cam.x - margin, y: g.rng.range(cam.y, cam.y + 720) };
  if (side === 1) return { x: cam.x + 1280 + margin, y: g.rng.range(cam.y, cam.y + 720) };
  if (side === 2) return { x: g.rng.range(cam.x, cam.x + 1280), y: cam.y - margin };
  return { x: g.rng.range(cam.x, cam.x + 1280), y: cam.y + 720 + margin };
}

export function updateEnemies(g, dt) {
  const p = g.player;
  for (const e of g.enemies) {
    if (!e.alive) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.touchTimer > 0) e.touchTimer -= dt;
    e.wobble += dt * 2;

    const d = distance(e.x, e.y, p.x, p.y);
    const a = angleTo(e.x, e.y, p.x, p.y);

    if (e.kind === 'mote') {
      // Drifts toward the player with a sine wobble, so the swarm never
      // moves in a straight predictable line.
      const wob = Math.sin(e.wobble) * 0.5;
      e.vx = Math.cos(a + wob) * e.speed;
      e.vy = Math.sin(a + wob) * e.speed;
    } else if (e.kind === 'spitter') {
      // Holds a ring around the player and fires a void bolt.
      const want = 280;
      const radial = d > want + 30 ? 1 : d < want - 30 ? -0.6 : 0;
      const strafe = Math.sin(e.wobble * 0.7) * 0.7;
      e.vx = (Math.cos(a) * radial + Math.cos(a + Math.PI / 2) * strafe) * e.speed;
      e.vy = (Math.sin(a) * radial + Math.sin(a + Math.PI / 2) * strafe) * e.speed;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < 560 && p.alive) {
        e.shootTimer = g.rng.range(2.0, 2.8);
        const ba = angleTo(e.x, e.y, p.x, p.y) + g.rng.range(-0.08, 0.08);
        g.enemyBullets.push({
          x: e.x + Math.cos(ba) * e.radius,
          y: e.y + Math.sin(ba) * e.radius,
          vx: Math.cos(ba) * 230,
          vy: Math.sin(ba) * 230,
          radius: 6,
          damage: 7,
          life: 3.2,
          friendly: false,
        });
        g.particles.burst(e.x, e.y, { count: 5, speed: 90, life: 0.3, size: 2, color: e.color });
      }
    } else if (e.kind === 'brute') {
      e.vx = Math.cos(a) * e.speed;
      e.vy = Math.sin(a) * e.speed;
    } else if (e.kind === 'boss') {
      e.vx = Math.cos(a) * e.speed;
      e.vy = Math.sin(a) * e.speed;
      // Radial burst of void bolts.
      e.burstTimer -= dt;
      if (e.burstTimer <= 0 && p.alive) {
        e.burstTimer = 3.2;
        const n = 10;
        for (let i = 0; i < n; i += 1) {
          const ba = (i / n) * Math.PI * 2 + e.wobble;
          g.enemyBullets.push({
            x: e.x + Math.cos(ba) * e.radius,
            y: e.y + Math.sin(ba) * e.radius,
            vx: Math.cos(ba) * 190,
            vy: Math.sin(ba) * 190,
            radius: 7,
            damage: 10,
            life: 4,
            friendly: false,
          });
        }
        g.sounds.boss();
        g.shake = Math.min(g.shake + 5, 14);
      }
      // Calls in a couple of motes to keep the pressure on.
      e.spawnTimer -= dt;
      if (e.spawnTimer <= 0) {
        e.spawnTimer = 6;
        for (let i = 0; i < 2; i += 1) {
          spawnEnemy(g, 'mote', e.x + g.rng.range(-60, 60), e.y + g.rng.range(-60, 60));
        }
      }
    }

    e.x = clamp(e.x + e.vx * dt, e.radius, g.world.w - e.radius);
    e.y = clamp(e.y + e.vy * dt, e.radius, g.world.h - e.radius);

    // Contact damage, throttled per enemy so a brush is not instant death.
    if (p.alive && d < e.radius + p.radius + 2 && e.touchTimer <= 0) {
      e.touchTimer = 0.6;
      if (damagePlayer(g, e.contact)) g.onPlayerDied?.();
      // The enemy bounces off a little so it does not sit on the ship.
      e.vx = -Math.cos(a) * 120;
      e.vy = -Math.sin(a) * 120;
    }
  }
}

// Step bullets, test hits, and remove the dead. Friendly bullets hit enemies;
// enemy bullets hit the player.
export function updateBullets(g, dt) {
  for (const b of g.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (b.x < 0 || b.x > g.world.w || b.y < 0 || b.y > g.world.h) {
      b.life = 0;
      continue;
    }
    for (const e of g.enemies) {
      if (!e.alive) continue;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      const rr = e.radius + b.radius;
      if (dx * dx + dy * dy < rr * rr) {
        b.life = 0;
        g.particles.burst(b.x, b.y, { count: 6, speed: 140, life: 0.3, size: 2, color: '#ffe9a8' });
        damageEnemy(g, e, b.damage);
        break;
      }
    }
  }
  g.bullets = g.bullets.filter((b) => b.life > 0);

  const p = g.player;
  for (const b of g.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (p.alive) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const rr = p.radius + b.radius;
      if (dx * dx + dy * dy < rr * rr) {
        b.life = 0;
        if (damagePlayer(g, b.damage)) g.onPlayerDied?.();
      }
    }
  }
  g.enemyBullets = g.enemyBullets.filter((b) => b.life > 0);
}

// Star shards drift toward the ship inside the magnet radius and are
// collected on touch: +score, a little shield, and a harvest count.
export function updateShards(g, dt) {
  const p = g.player;
  const magnet = p.magnetRadius + p.magnetBonus;
  for (const s of g.shards) {
    s.life -= dt;
    if (s.life <= 0) continue;
    const d = distance(s.x, s.y, p.x, p.y);
    if (p.alive && d < magnet) {
      const a = angleTo(s.x, s.y, p.x, p.y);
      const pull = 520 * (1 - d / magnet) + 120;
      s.vx += Math.cos(a) * pull * dt * 4;
      s.vy += Math.sin(a) * pull * dt * 4;
    } else {
      s.vx *= Math.pow(0.2, dt);
      s.vy *= Math.pow(0.2, dt);
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (p.alive && d < p.radius + s.radius + 2) {
      s.life = 0;
      g.shardsCollected += 1;
      g.score += s.value;
      p.shield = Math.min(p.maxShield, p.shield + 1);
      if (p.shardHeal) healPlayer(g, p.shardHeal);
      g.particles.floatText(s.x, s.y, `+${s.value}`, '#7ee7ff', 13);
      g.sounds.pickup();
    }
  }
  g.shards = g.shards.filter((s) => s.life > 0);
}
