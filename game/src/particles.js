// Particles and floating combat text for VOIDHARVEST.
// One fixed-size pool, no per-frame allocation: bursts reuse dead slots, so a
// busy fight never stutters the garbage collector.
export class ParticleSystem {
  constructor(capacity = 600) {
    this.capacity = capacity;
    // Random source, defaulting to Math.random. The game wires this to its
    // seeded RNG so staged screenshots are pixel-deterministic.
    this.rand = Math.random;
    this.parts = [];
    for (let i = 0; i < capacity; i += 1) {
      this.parts.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0, gravity: 0, glow: false });
    }
    this.texts = [];
  }

  spawn(x, y, vx, vy, life, size, color, { drag = 0.9, gravity = 0, glow = true } = {}) {
    for (let i = 0; i < this.capacity; i += 1) {
      const p = this.parts[i];
      if (p.alive) continue;
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      p.drag = drag;
      p.gravity = gravity;
      p.glow = glow;
      return p;
    }
    return null;
  }

  // A radial burst of `count` sparks.
  burst(x, y, { count = 18, speed = 220, life = 0.6, size = 3, color = '#ffd166', spread = Math.PI * 2 } = {}) {
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * spread + this.rand() * 0.4;
      const v = speed * (0.4 + this.rand() * 0.8);
      this.spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.6 + this.rand() * 0.7), size * (0.6 + this.rand() * 0.8), color);
    }
  }

  // A short engine trail behind the ship.
  trail(x, y, vx, vy, color = '#7ee7ff') {
    this.spawn(x, y, -vx * 0.15 + (this.rand() - 0.5) * 30, -vy * 0.15 + (this.rand() - 0.5) * 30, 0.35, 2.5, color, { drag: 0.85, glow: true });
  }

  // Rising score / pickup text that fades out.
  floatText(x, y, text, color = '#ffffff', size = 16) {
    this.texts.push({ x, y, text, color, size, life: 1.0, maxLife: 1.0 });
    if (this.texts.length > 40) this.texts.shift();
  }

  update(dt) {
    for (let i = 0; i < this.capacity; i += 1) {
      const p = this.parts[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag;
      p.vy *= drag;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i -= 1) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 34 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  draw(ctx, camera) {
    for (let i = 0; i < this.capacity; i += 1) {
      const p = this.parts[i];
      if (!p.alive) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x - camera.x, t.y - camera.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    for (const p of this.parts) p.alive = false;
    this.texts.length = 0;
  }
}
