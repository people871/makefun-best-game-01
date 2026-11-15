// World rendering for VOIDHARVEST: the parallax nebula, the arena, and every
// entity. The camera follows the ship; world coordinates are translated by
// g.camera plus a decaying screen shake. Nothing here mutates game state.
import { clamp } from './rng.js';

// Three star layers at different parallax depths, plus a few soft nebula
// blobs. Built once from a seed so the backdrop is stable between frames.
export function buildStarfield(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const layers = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const stars = [];
    const count = [90, 60, 36][layer];
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: next() * 1600,
        y: next() * 1200,
        r: 0.6 + next() * (layer === 0 ? 1.0 : layer === 1 ? 1.6 : 2.4),
        tw: next() * Math.PI * 2,
      });
    }
    layers.push({ depth: [0.25, 0.5, 0.8][layer], stars });
  }
  const nebulae = [];
  const colors = ['rgba(88, 60, 180, 0.20)', 'rgba(20, 110, 140, 0.18)', 'rgba(180, 60, 120, 0.14)', 'rgba(40, 60, 160, 0.16)'];
  for (let i = 0; i < 7; i += 1) {
    nebulae.push({ x: next() * 1600, y: next() * 1200, r: 220 + next() * 260, color: colors[i % colors.length] });
  }
  return { layers, nebulae };
}

export function drawBackground(ctx, g, time) {
  const cam = g.camera;
  // Deep space.
  const grad = ctx.createRadialGradient(640, 360, 80, 640, 360, 900);
  grad.addColorStop(0, '#0d1030');
  grad.addColorStop(0.6, '#070818');
  grad.addColorStop(1, '#030409');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 720);

  // Nebula blobs, parallax 0.35.
  for (const n of g.starfield.nebulae) {
    const sx = n.x - cam.x * 0.35 - 200;
    const sy = n.y - cam.y * 0.35 - 200;
    const rg = ctx.createRadialGradient(sx, sy, 10, sx, sy, n.r);
    rg.addColorStop(0, n.color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(sx - n.r, sy - n.r, n.r * 2, n.r * 2);
  }

  // Arena bounds: a glowing rim and a faint hex grid inside it.
  const ax = -cam.x;
  const ay = -cam.y;
  ctx.strokeStyle = 'rgba(126, 231, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(ax, ay, g.world.w, g.world.h);
  ctx.strokeStyle = 'rgba(126, 231, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= g.world.w; x += 80) {
    ctx.moveTo(ax + x, ay);
    ctx.lineTo(ax + x, ay + g.world.h);
  }
  for (let y = 0; y <= g.world.h; y += 80) {
    ctx.moveTo(ax, ay + y);
    ctx.lineTo(ax + g.world.w, ay + y);
  }
  ctx.stroke();

  // Stars, twinkling slowly.
  for (const layer of g.starfield.layers) {
    for (const s of layer.stars) {
      const sx = s.x - cam.x * layer.depth;
      const sy = s.y - cam.y * layer.depth;
      if (sx < -4 || sx > 1284 || sy < -4 || sy > 724) continue;
      const tw = 0.55 + 0.45 * Math.sin(time * 1.4 + s.tw);
      ctx.globalAlpha = tw * (0.5 + layer.depth * 0.4);
      ctx.fillStyle = '#dfe9ff';
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawShip(ctx, g) {
  const p = g.player;
  const sx = p.x - g.camera.x;
  const sy = p.y - g.camera.y;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(p.angle);
  // Blink while invulnerable after a wave clear.
  if (p.invulnerable > 0 && Math.floor(p.invulnerable * 12) % 2 === 0) ctx.globalAlpha = 0.35;
  // Engine glow.
  ctx.fillStyle = '#ff9d3c';
  ctx.shadowColor = '#ff9d3c';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-14, -5);
  ctx.lineTo(-20 - p.thrust * 8, 0);
  ctx.lineTo(-14, 5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // Hull: a swept harvester dart.
  const hull = ctx.createLinearGradient(-16, 0, 18, 0);
  hull.addColorStop(0, '#2b6cb0');
  hull.addColorStop(0.6, '#7ee7ff');
  hull.addColorStop(1, '#e8fbff');
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(232, 251, 255, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Cockpit.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(6, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  // Harvest prongs.
  ctx.strokeStyle = '#7ee7ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, -6);
  ctx.lineTo(22, -10);
  ctx.moveTo(14, 6);
  ctx.lineTo(22, 10);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawEnemy(ctx, g, e) {
  const sx = e.x - g.camera.x;
  const sy = e.y - g.camera.y;
  if (sx < -80 || sx > 1360 || sy < -80 || sy > 800) return;
  ctx.save();
  ctx.translate(sx, sy);
  const flash = e.flash > 0;
  ctx.fillStyle = flash ? '#ffffff' : e.color;
  ctx.strokeStyle = flash ? '#ffffff' : e.color;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = e.kind === 'boss' ? 22 : 10;
  if (e.kind === 'mote') {
    // A spiked void mote, slowly spinning.
    ctx.rotate(e.wobble);
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? e.radius : e.radius * 0.55;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a0b2e';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'spitter') {
    // A three-lobed blossom that opens to fire.
    ctx.rotate(e.wobble * 0.5);
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 10, 6, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2a0a24';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'brute') {
    // A heavy armoured hexagon with a glowing core.
    ctx.rotate(e.wobble * 0.25);
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * e.radius;
      const py = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // The Void Maw: a big ringed maw with a pulsing core and teeth.
    const pulse = 1 + Math.sin(e.wobble * 2) * 0.06;
    ctx.scale(pulse, pulse);
    ctx.rotate(e.wobble * 0.2);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const r0 = e.radius - 6;
      const r1 = e.radius - 18;
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a + 0.12) * r1, Math.sin(a + 0.12) * r1);
    }
    ctx.stroke();
    ctx.fillStyle = '#1a0510';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius - 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff3d5e';
    ctx.beginPath();
    ctx.arc(0, 0, 12 + Math.sin(e.wobble * 3) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.shadowBlur = 0;
  // Health bar for anything hurt (boss always).
  if ((e.hp < e.maxHp && e.kind !== 'mote') || e.kind === 'boss') {
    const w = e.kind === 'boss' ? 90 : 34;
    const ratio = clamp(e.hp / e.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(sx - w / 2, sy - e.radius - 12, w, 5);
    ctx.fillStyle = e.kind === 'boss' ? '#ff3d5e' : '#ffd166';
    ctx.fillRect(sx - w / 2, sy - e.radius - 12, w * ratio, 5);
  }
}

export function drawWorld(ctx, g, time) {
  drawBackground(ctx, g, time);
  // Shards: small spinning diamonds.
  for (const s of g.shards) {
    const sx = s.x - g.camera.x;
    const sy = s.y - g.camera.y;
    if (sx < -10 || sx > 1290 || sy < -10 || sy > 730) continue;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(time * 3 + s.x * 0.01);
    ctx.fillStyle = '#7ee7ff';
    ctx.shadowColor = '#7ee7ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Bullets.
  for (const b of g.bullets) {
    const sx = b.x - g.camera.x;
    const sy = b.y - g.camera.y;
    ctx.strokeStyle = '#ffe9a8';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - b.vx * 0.016, sy - b.vy * 0.016);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }
  for (const b of g.enemyBullets) {
    const sx = b.x - g.camera.x;
    const sy = b.y - g.camera.y;
    ctx.fillStyle = '#ff5da2';
    ctx.shadowColor = '#ff5da2';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(sx, sy, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  for (const e of g.enemies) if (e.alive) drawEnemy(ctx, g, e);
  if (g.player.alive) drawShip(ctx, g);
  g.particles.draw(ctx, g.camera);
}
