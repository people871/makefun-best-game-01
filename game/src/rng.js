// Seeded random numbers for VOIDHARVEST.
// Every run that needs to look the same twice (staged screenshots, the selftest)
// drives its randomness from one of these generators instead of Math.random.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // One element of an array.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // True with probability p.
    chance(p) {
      return next() < p;
    },
    // Angle in [0, 2π).
    angle() {
      return next() * Math.PI * 2;
    },
  };
}

// A point on a circle of radius r around (cx, cy), at a random angle.
export function randomPointOnCircle(rng, cx, cy, r) {
  const a = rng.angle();
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? value : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}
