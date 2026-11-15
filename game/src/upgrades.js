// Between-wave upgrades: after every cleared wave the player picks 1 of 3.
// Each upgrade is a small, named, stackable bonus with a cap, so the choice
// is a real build decision (damage now, defence later, or a new weapon) and
// the same pool drives the upgrade screen, the HUD icons and the selftest.
export const UPGRADE_POOL = [
  {
    id: 'twin-lance',
    name: 'Twin Lance',
    desc: '+1 projectile per shot',
    max: 2,
    apply(p) {
      p.bulletCount += 1;
    },
  },
  {
    id: 'rapid-coils',
    name: 'Rapid Coils',
    desc: '+22% fire rate',
    max: 4,
    apply(p) {
      p.fireRateBonus -= p.fireRate * 0.22;
    },
  },
  {
    id: 'heavy-rounds',
    name: 'Heavy Rounds',
    desc: '+5 bullet damage',
    max: 5,
    apply(p) {
      p.damageBonus += 5;
    },
  },
  {
    id: 'aegis-plating',
    name: 'Aegis Plating',
    desc: '+25 max shield, restore shield',
    max: 4,
    apply(p) {
      p.maxShield += 25;
      p.shield = p.maxShield;
    },
  },
  {
    id: 'hull-weave',
    name: 'Hull Weave',
    desc: '+30 max hull, repair 30 hull',
    max: 4,
    apply(p) {
      p.maxHull += 30;
      p.hull = Math.min(p.maxHull, p.hull + 30);
    },
  },
  {
    id: 'ion-thrusters',
    name: 'Ion Thrusters',
    desc: '+12% ship speed',
    max: 3,
    apply(p) {
      p.speedBonus += p.speed * 0.12;
    },
  },
  {
    id: 'magnet-coil',
    name: 'Magnet Coil',
    desc: '+60% shard pickup radius',
    max: 3,
    apply(p) {
      p.magnetBonus += 60;
    },
  },
  {
    id: 'nova-burst',
    name: 'Nova Burst',
    desc: 'Shockwave every 6 s, damages all nearby',
    max: 2,
    apply(p) {
      if (p.novaInterval === 0) {
        p.novaInterval = 6;
        p.novaCooldown = 3;
      } else {
        p.novaInterval = Math.max(3.5, p.novaInterval - 1.2);
      }
    },
  },
  {
    id: 'shard-siphon',
    name: 'Shard Siphon',
    desc: 'Shards also repair 2 hull each',
    max: 1,
    apply(p) {
      p.shardHeal = 2;
    },
  },
];

// Roll 3 distinct upgrades the player has not maxed out yet.
export function rollUpgrades(g) {
  const owned = g.upgradesOwned;
  const available = UPGRADE_POOL.filter((u) => (owned[u.id] || 0) < u.max);
  const picks = [];
  const pool = [...available];
  while (picks.length < 3 && pool.length > 0) {
    const i = Math.floor(g.rng.next() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  // If everything is maxed (endless mode), offer hull repair instead.
  while (picks.length < 3) {
    picks.push({
      id: 'field-repair',
      name: 'Field Repair',
      desc: 'Repair 40 hull now',
      max: 99,
      apply(p) {
        p.hull = Math.min(p.maxHull, p.hull + 40);
      },
    });
  }
  return picks;
}

export function applyUpgrade(g, upgrade) {
  upgrade.apply(g.player);
  g.upgradesOwned[upgrade.id] = (g.upgradesOwned[upgrade.id] || 0) + 1;
  g.sounds.upgrade();
  g.particles.floatText(g.player.x, g.player.y - 30, upgrade.name, '#b388ff', 18);
}
