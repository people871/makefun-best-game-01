// The harvester ship: movement, weapons, hull and shield.
// The player object is plain data; the functions here are its only writers,
// so the game, the selftest and the staged shots all drive one behaviour.
import { clamp, angleTo } from './rng.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 16,
    angle: -Math.PI / 2,
    // Base stats; upgrades in upgrades.js modify the *_bonus fields.
    speed: 270,
    speedBonus: 0,
    hull: 100,
    maxHull: 100,
    shield: 50,
    maxShield: 50,
    shieldRegen: 9,
    shieldDelay: 3,
    timeSinceHurt: 99,
    fireRate: 0.16,
    fireRateBonus: 0,
    bulletSpeed: 640,
    bulletDamage: 12,
    damageBonus: 0,
    bulletCount: 1,
    magnetRadius: 80,
    magnetBonus: 0,
    novaCooldown: 0,
    novaInterval: 0, // 0 = no Nova Burst upgrade yet
    fireTimer: 0,
    invulnerable: 0,
    thrust: 0,
    alive: true,
  };
}

// Move with the input axis, aim at the mouse (or the nearest enemy when the
// keyboard fires), and spawn bullets while firing. Returns nothing; bullets
// are pushed into g.bullets by the caller-facing fireWeapon below.
export function updatePlayer(g, dt) {
  const p = g.player;
  if (!p.alive) return;
  const input = g.input;

  const axis = input.moveAxis();
  const speed = p.speed + p.speedBonus;
  const accel = 2400;
  p.vx += axis.x * accel * dt;
  p.vy += axis.y * accel * dt;
  // Friction only when no input, so the ship glides to a stop instead of
  // sliding; while thrusting there is no drag and the ship answers at once.
  if (axis.x === 0 && axis.y === 0) {
    const damp = Math.pow(0.001, dt);
    p.vx *= damp;
    p.vy *= damp;
  }
  const v = Math.hypot(p.vx, p.vy);
  if (v > speed) {
    p.vx = (p.vx / v) * speed;
    p.vy = (p.vy / v) * speed;
  }
  p.x = clamp(p.x + p.vx * dt, 24, g.world.w - 24);
  p.y = clamp(p.y + p.vy * dt, 24, g.world.h - 24);
  p.thrust = Math.hypot(axis.x, axis.y);
  if (p.thrust > 0.1) {
    g.particles.trail(p.x - Math.cos(p.angle) * 14, p.y - Math.sin(p.angle) * 14, p.vx, p.vy);
  }

  // Aim: mouse by default. Space (keyboard-only fire) aims at the nearest
  // enemy so the game is fully playable without a mouse.
  let aimX;
  let aimY;
  if (input.usingKeyboardFire()) {
    const target = nearestEnemy(g);
    if (target) {
      aimX = target.x;
      aimY = target.y;
    } else {
      aimX = p.x;
      aimY = p.y - 100;
    }
  } else {
    const aim = input.aimPoint();
    aimX = aim.x + g.camera.x;
    aimY = aim.y + g.camera.y;
  }
  p.angle = angleTo(p.x, p.y, aimX, aimY);

  // Shield regenerates after a few seconds without taking damage.
  p.timeSinceHurt += dt;
  if (p.timeSinceHurt > p.shieldDelay && p.shield < p.maxShield) {
    p.shield = Math.min(p.maxShield, p.shield + p.shieldRegen * dt);
  }
  if (p.invulnerable > 0) p.invulnerable -= dt;

  // Nova Burst: a periodic shockwave once the upgrade is owned.
  if (p.novaInterval > 0) {
    p.novaCooldown -= dt;
    if (p.novaCooldown <= 0) {
      p.novaCooldown = p.novaInterval;
      fireNova(g);
    }
  }

  p.fireTimer -= dt;
  if (input.firing() && p.fireTimer <= 0) {
    fireWeapon(g);
    p.fireTimer = Math.max(0.05, p.fireRate + p.fireRateBonus);
  }
}

export function nearestEnemy(g) {
  const p = g.player;
  let best = null;
  let bestD = Infinity;
  for (const e of g.enemies) {
    if (!e.alive) continue;
    const d = (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function fireWeapon(g) {
  const p = g.player;
  const count = p.bulletCount;
  const spread = 0.09;
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
    const a = p.angle + offset;
    g.bullets.push({
      x: p.x + Math.cos(a) * 20,
      y: p.y + Math.sin(a) * 20,
      vx: Math.cos(a) * p.bulletSpeed,
      vy: Math.sin(a) * p.bulletSpeed,
      radius: 4,
      damage: p.bulletDamage + p.damageBonus,
      life: 1.1,
      friendly: true,
    });
  }
  g.sounds.shoot();
  g.shake = Math.min(g.shake + 0.6, 4);
}

// The Nova Burst shockwave: damages everything near the ship.
function fireNova(g) {
  const p = g.player;
  const radius = 190;
  g.particles.burst(p.x, p.y, { count: 36, speed: 420, life: 0.5, size: 3, color: '#b388ff' });
  for (const e of g.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < radius + e.radius) {
      damageEnemy(g, e, 30 + p.damageBonus, true);
    }
  }
  g.sounds.explode(false);
}

// Damage flows shield-first, then hull. Returns true when the ship dies.
export function damagePlayer(g, amount) {
  const p = g.player;
  if (!p.alive || p.invulnerable > 0) return false;
  p.timeSinceHurt = 0;
  let rest = amount;
  if (p.shield > 0) {
    const absorbed = Math.min(p.shield, rest);
    p.shield -= absorbed;
    rest -= absorbed;
  }
  if (rest > 0) {
    p.hull -= rest;
    g.particles.burst(p.x, p.y, { count: 14, speed: 200, life: 0.5, color: '#ff5d5d' });
    g.sounds.hurt();
    g.shake = Math.min(g.shake + 7, 14);
  }
  if (p.hull <= 0) {
    p.hull = 0;
    p.alive = false;
    g.particles.burst(p.x, p.y, { count: 60, speed: 380, life: 1.0, size: 4, color: '#ffd166' });
    g.particles.burst(p.x, p.y, { count: 40, speed: 260, life: 0.9, size: 3, color: '#7ee7ff' });
    g.sounds.explode(true);
    g.shake = 18;
    return true;
  }
  return false;
}

export function healPlayer(g, amount) {
  const p = g.player;
  p.hull = Math.min(p.maxHull, p.hull + amount);
}

// Shared by player.js and enemies.js: one place where an enemy takes damage,
// dies, drops shards and feeds the combo. Kept here so both call sites agree.
export function damageEnemy(g, enemy, amount, silent = false) {
  if (!enemy.alive) return;
  enemy.hp -= amount;
  enemy.flash = 0.08;
  if (!silent) g.sounds.enemyHit();
  if (enemy.hp <= 0) {
    enemy.alive = false;
    g.kills += 1;
    g.combo += 1;
    g.comboTimer = 3;
    const mult = comboMultiplier(g);
    const gained = Math.round(enemy.score * mult);
    g.score += gained;
    g.particles.floatText(enemy.x, enemy.y - 10, `+${gained}`, '#ffd166', 15);
    g.particles.burst(enemy.x, enemy.y, {
      count: enemy.kind === 'brute' || enemy.kind === 'boss' ? 34 : 16,
      speed: enemy.kind === 'boss' ? 420 : 240,
      life: 0.7,
      color: enemy.color,
    });
    g.sounds.explode(enemy.kind === 'boss' || enemy.kind === 'brute');
    g.shake = Math.min(g.shake + (enemy.kind === 'boss' ? 12 : 3), 14);
    dropShards(g, enemy);
    if (enemy.kind === 'boss') g.onBossKilled?.();
  }
}

export function comboMultiplier(g) {
  return Math.min(5, 1 + Math.floor(g.combo / 5) * 0.5);
}

function dropShards(g, enemy) {
  const count = enemy.shards;
  for (let i = 0; i < count; i += 1) {
    const a = g.rng.angle();
    const d = g.rng.range(6, 26);
    g.shards.push({
      x: enemy.x + Math.cos(a) * d,
      y: enemy.y + Math.sin(a) * d,
      vx: Math.cos(a) * 40,
      vy: Math.sin(a) * 40,
      radius: 6,
      value: 10,
      life: 12,
    });
  }
}
