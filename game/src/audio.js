// Synthesised WebAudio sound for VOIDHARVEST. No audio files: every effect is
// built from oscillators and filtered noise, and a quiet ambient drone runs
// underneath play. Audio starts only after the first user gesture (browsers
// require it) and every call is safe before that — headless runs never crash
// on a missing AudioContext.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.drone = null;
    this.droneGain = null;
  }

  // Call from the first pointer/key gesture. Safe to call twice.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  // A short oscillator blip: frequency slides from `from` to `to`.
  blip({ from = 440, to = 220, dur = 0.12, type = 'square', vol = 0.2, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A burst of filtered white noise (explosions, hits, pickups).
  noise({ dur = 0.2, vol = 0.3, freq = 1200, type = 'lowpass', when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() {
    this.blip({ from: 880, to: 320, dur: 0.07, type: 'square', vol: 0.08 });
  }

  enemyHit() {
    this.blip({ from: 300, to: 140, dur: 0.06, type: 'triangle', vol: 0.12 });
  }

  explode(big = false) {
    this.noise({ dur: big ? 0.5 : 0.25, vol: big ? 0.4 : 0.25, freq: big ? 700 : 1400 });
    this.blip({ from: 160, to: 40, dur: big ? 0.5 : 0.25, type: 'sine', vol: 0.3 });
  }

  pickup() {
    this.blip({ from: 660, to: 990, dur: 0.09, type: 'sine', vol: 0.14 });
    this.blip({ from: 990, to: 1320, dur: 0.09, type: 'sine', vol: 0.1, when: 0.06 });
  }

  hurt() {
    this.blip({ from: 220, to: 70, dur: 0.2, type: 'sawtooth', vol: 0.22 });
    this.noise({ dur: 0.15, vol: 0.15, freq: 500 });
  }

  waveStart() {
    this.blip({ from: 220, to: 440, dur: 0.25, type: 'triangle', vol: 0.18 });
    this.blip({ from: 440, to: 660, dur: 0.25, type: 'triangle', vol: 0.14, when: 0.18 });
  }

  upgrade() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this.blip({ from: f, to: f, dur: 0.14, type: 'sine', vol: 0.14, when: i * 0.07 });
    });
  }

  boss() {
    this.blip({ from: 90, to: 45, dur: 0.8, type: 'sawtooth', vol: 0.25 });
    this.noise({ dur: 0.6, vol: 0.2, freq: 300 });
  }

  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.blip({ from: f, to: f, dur: 0.22, type: 'triangle', vol: 0.16, when: i * 0.11 });
    });
  }

  defeat() {
    [392, 330, 262, 196].forEach((f, i) => {
      this.blip({ from: f, to: f * 0.9, dur: 0.3, type: 'sawtooth', vol: 0.14, when: i * 0.16 });
    });
  }

  // A low two-oscillator drone that starts with play and stops at the menus.
  startDrone() {
    if (!this.ctx || this.drone) return;
    try {
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      o1.type = 'sine';
      o2.type = 'sine';
      o1.frequency.value = 55;
      o2.frequency.value = 55 * 1.5;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      o1.connect(filter);
      o2.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      o1.start();
      o2.start();
      this.drone = [o1, o2];
      this.droneGain = g;
    } catch {
      this.drone = null;
    }
  }

  stopDrone() {
    if (!this.drone) return;
    try {
      this.drone.forEach((o) => o.stop());
    } catch {
      /* already stopped */
    }
    this.drone = null;
    this.droneGain = null;
  }
}
