// VOIDHARVEST — bootstrap.
// Normal play: a requestAnimationFrame loop with a fixed 1/60 s simulation
// step (accumulator, capped so a background tab never spiral-steps).
// ?shot=start|play|end&seed=N stages one deterministic screenshot frame and
// sets window.__shotReady. ?selftest=1 runs the scripted play-through and
// reports window.__selftest.
import { Game } from './game.js';
import { stageShot, runSelftest } from './shots.js';

const canvas = document.getElementById('game');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 20261116) || 20261116;
const game = new Game(canvas, seed);
window.__game = game;

if (params.get('selftest') === '1') {
  try {
    runSelftest(game);
  } catch (err) {
    window.__selftest = { error: String(err) };
  }
  game.render();
} else if (params.has('shot')) {
  const scene = params.get('shot');
  try {
    stageShot(game, scene, seed);
  } catch (err) {
    document.title = `shot failed: ${err.message}`;
    throw err;
  }
} else {
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      game.step(STEP);
      acc -= STEP;
      guard += 1;
    }
    if (guard === 5) acc = 0;
    game.handleFrameInput();
    game.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
