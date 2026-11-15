// VOIDHARVEST — game orchestration: the state machine, the fixed-step loop,
// scoring, camera, wave flow and menus. One Game object owns all state;
// the modules in this folder each own one slice of behaviour.
import { makeRng, clamp } from './rng.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { ParticleSystem } from './particles.js';
import { createPlayer, updatePlayer, damagePlayer, healPlayer } from './player.js';
import { updateEnemies, updateBullets, updateShards } from './enemies.js';
import { startWave, updateWaveSpawning, isWaveCleared, clearDeadEnemies } from './waves.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';
import { buildStarfield, drawWorld } from './render.js';
import { drawHud, drawTitle, drawUpgradeScreen, drawPause, drawVictory, drawGameOver, upgradeCardRects } from './hud.js';

export const WORLD = { w: 1600, h: 1200 };
export const VIEW = { w: 1280, h: 720 };
export const FINAL_WAVE = 10;

export class Game {
  constructor(canvas, seed = 20261116) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.seed = seed;
    this.rng = makeRng(seed);
    this.input = new Input(canvas);
    this.sounds = new SoundBank();
    this.particles = new ParticleSystem();
    this.starfield = buildStarfield(seed);
    this.world = WORLD;
    this.best = this.loadBest();
    this.pendingClicks = [];
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.pendingClicks.push({
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      });
      this.sounds.ensure();
    });
    window.addEventListener('keydown', () => this.sounds.ensure(), { once: true });
    this.resetRun(seed);
    this.state = 'title';
    this.time = 0;
  }

  loadBest() {
    try {
      return Number(window.localStorage.getItem('voidharvest-best') || 0) || 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    try {
      window.localStorage.setItem('voidharvest-best', String(this.best));
    } catch {
      /* storage unavailable (private mode, file://) — best is session-only */
    }
  }

  // A fresh run: new ship, empty arena, wave 1 queued but not started.
  resetRun(seed = this.seed) {
    this.rng = makeRng(seed);
    // Particles draw from the same seeded RNG, so a staged screenshot
    // renders byte-identically from the same seed.
    this.particles.rand = () => this.rng.next();
    this.player = createPlayer(WORLD.w / 2, WORLD.h / 2);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.shards = [];
    this.particles.clear();
    this.camera = { x: 0, y: 0 };
    this.shake = 0;
    this.wave = 0;
    this.waveActive = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveBanner = null;
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.shardsCollected = 0;
    this.runTime = 0;
    this.upgradesOwned = {};
    this.upgradeChoices = [];
    this.endless = false;
    this.victoryShown = false;
  }

  startRun() {
    this.resetRun();
    this.state = 'playing';
    this.sounds.startDrone();
    startWave(this, 1);
  }

  // One fixed 1/60 s simulation step. Rendering is separate.
  step(dt) {
    this.time += dt;
    if (this.state === 'playing') {
      this.runTime += dt;
      updatePlayer(this, dt);
      updateWaveSpawning(this, dt);
      updateEnemies(this, dt);
      updateBullets(this, dt);
      updateShards(this, dt);
      clearDeadEnemies(this);
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.combo = 0;
      }
      if (this.waveBanner && this.waveBanner.t > 0) this.waveBanner.t -= dt;
      this.updateCamera(dt);
      if (this.waveActive && isWaveCleared(this)) this.onWaveCleared();
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    this.particles.update(dt);
  }

  updateCamera(dt) {
    const p = this.player;
    const tx = clamp(p.x - VIEW.w / 2, 0, WORLD.w - VIEW.w);
    const ty = clamp(p.y - VIEW.h / 2, 0, WORLD.h - VIEW.h);
    // Smooth follow; snap instantly when the jump is huge (run start).
    const k = 1 - Math.pow(0.0001, dt);
    this.camera.x += (tx - this.camera.x) * k;
    this.camera.y += (ty - this.camera.y) * k;
  }

  onWaveCleared() {
    this.waveActive = false;
    this.score += 100 * this.wave;
    this.particles.floatText(this.player.x, this.player.y - 30, `WAVE BONUS +${100 * this.wave}`, '#ffd166', 18);
    healPlayer(this, 12);
    this.player.invulnerable = 2;
    if (this.wave >= FINAL_WAVE && !this.endless) {
      this.state = 'victory';
      this.victoryShown = true;
      if (this.score > this.best) {
        this.best = this.score;
        this.saveBest();
      }
      this.sounds.victory();
      this.sounds.stopDrone();
      return;
    }
    this.upgradeChoices = rollUpgrades(this);
    this.state = 'upgrade';
    this.sounds.upgrade();
  }

  chooseUpgrade(index) {
    const choice = this.upgradeChoices[index];
    if (!choice) return;
    applyUpgrade(this, choice);
    this.state = 'playing';
    startWave(this, this.wave + 1);
  }

  onPlayerDied() {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    if (this.score > this.best) {
      this.best = this.score;
      this.saveBest();
    }
    this.sounds.defeat();
    this.sounds.stopDrone();
  }

  onBossKilled() {
    // The boss is the last thing standing on its wave; the wave-clear check
    // in step() handles the transition. Kept as a hook for the banner.
    this.waveBanner = { text: 'VOID MAW DESTROYED', t: 2.0 };
  }

  // Per-frame input that is not part of the fixed simulation: menus, pause,
  // mute, restart, clicks. Called once per animation frame.
  handleFrameInput() {
    const input = this.input;
    if (input.wasPressed('m') || input.wasPressed('M')) this.sounds.toggleMute();
    if (this.state === 'title') {
      if (input.wasPressed('Enter') || input.wasPressed(' ')) this.startRun();
    } else if (this.state === 'playing') {
      if (input.wasPressed('p') || input.wasPressed('P') || input.wasPressed('Escape')) {
        this.state = 'paused';
      }
      if (input.wasPressed('r') || input.wasPressed('R')) this.startRun();
    } else if (this.state === 'paused') {
      if (input.wasPressed('p') || input.wasPressed('P') || input.wasPressed('Escape')) {
        this.state = 'playing';
      }
      if (input.wasPressed('r') || input.wasPressed('R')) this.startRun();
    } else if (this.state === 'upgrade') {
      if (input.wasPressed('1')) this.chooseUpgrade(0);
      if (input.wasPressed('2')) this.chooseUpgrade(1);
      if (input.wasPressed('3')) this.chooseUpgrade(2);
    } else if (this.state === 'victory') {
      if (input.wasPressed('c') || input.wasPressed('C')) {
        this.endless = true;
        this.state = 'playing';
        this.sounds.startDrone();
        startWave(this, this.wave + 1);
      }
      if (input.wasPressed('r') || input.wasPressed('R') || input.wasPressed('Enter')) this.startRun();
    } else if (this.state === 'gameover') {
      if (input.wasPressed('r') || input.wasPressed('R') || input.wasPressed('Enter')) this.startRun();
    }

    // Clicks: the title LAUNCH button and the upgrade cards.
    for (const click of this.pendingClicks) {
      if (this.state === 'title') {
        if (click.x >= 520 && click.x <= 760 && click.y >= 430 && click.y <= 486) this.startRun();
      } else if (this.state === 'upgrade') {
        const rects = upgradeCardRects(this.upgradeChoices.length);
        rects.forEach((r, i) => {
          if (click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h) {
            this.chooseUpgrade(i);
          }
        });
      }
    }
    this.pendingClicks.length = 0;
    this.input.endOfFrame();
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0.2) {
      const s = this.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    // On the title screen the camera slowly pans across the nebula.
    if (this.state === 'title') {
      this.camera.x = 160 + Math.sin(this.time * 0.05) * 160;
      this.camera.y = 120 + Math.cos(this.time * 0.04) * 120;
    }
    drawWorld(ctx, this, this.time);
    ctx.restore();
    if (this.state === 'playing' || this.state === 'paused' || this.state === 'upgrade') {
      drawHud(ctx, this);
    }
    if (this.state === 'title') drawTitle(ctx, this, this.time);
    else if (this.state === 'upgrade') drawUpgradeScreen(ctx, this);
    else if (this.state === 'paused') drawPause(ctx, this);
    else if (this.state === 'victory') drawVictory(ctx, this);
    else if (this.state === 'gameover') drawGameOver(ctx, this);
  }
}

// Damage the player from outside the player module (enemy contact, bullets)
// without importing player.js twice: re-exported for enemies.js.
export { damagePlayer };
