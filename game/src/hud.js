// HUD, banners and menu screens for VOIDHARVEST, all drawn on the canvas so
// screenshots capture exactly what the player sees. The HUD shows hull,
// shield, shards, wave, score and combo; the minimap shows the whole arena;
// the menus cover title, upgrade choice, pause, victory and game over.
import { clamp } from './rng.js';

function bar(ctx, x, y, w, h, ratio, fill, label, valueText) {
  ctx.fillStyle = 'rgba(2, 6, 18, 0.72)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * clamp(ratio, 0, 1), h);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 4, y + h - 4);
  if (valueText) {
    ctx.textAlign = 'right';
    ctx.fillText(valueText, x + w - 4, y + h - 4);
  }
}

export function drawHud(ctx, g) {
  const p = g.player;
  ctx.textBaseline = 'alphabetic';
  // Top-left: hull + shield.
  bar(ctx, 16, 14, 240, 18, p.hull / p.maxHull, '#37d67a', 'HULL', `${Math.ceil(p.hull)} / ${p.maxHull}`);
  bar(ctx, 16, 38, 240, 14, p.shield / p.maxShield, '#4db8ff', 'SHIELD', `${Math.ceil(p.shield)}`);
  // Top-center: wave + score.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE  ${g.score.toLocaleString('en-US')}`, 640, 34);
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#7ee7ff';
  ctx.fillText(`WAVE ${g.wave} / 10`, 640, 56);
  // Win / lose, so the goal is readable at a glance.
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('WIN: clear wave 10  ·  LOSE: hull 0', 640, 78);
  // Combo, when it is running.
  if (g.combo >= 3 && g.comboTimer > 0) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`COMBO x${(1 + Math.floor(g.combo / 5) * 0.5).toFixed(1)}  (${g.combo} kills)`, 640, 102);
  }
  // Top-right: shards, kills, best.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7ee7ff';
  ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`◆ SHARDS ${g.shardsCollected}`, 1264, 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Kills ${g.kills}   Best ${g.best.toLocaleString('en-US')}`, 1264, 52);
  // Wave banner (counts down in game.js).
  if (g.waveBanner && g.waveBanner.t > 0) {
    const a = clamp(g.waveBanner.t, 0, 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
    ctx.shadowColor = '#7ee7ff';
    ctx.shadowBlur = 24;
    ctx.fillText(g.waveBanner.text, 640, 240);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  drawMinimap(ctx, g);
}

function drawMinimap(ctx, g) {
  const mw = 168;
  const mh = 126;
  const x0 = 1280 - mw - 14;
  const y0 = 720 - mh - 14;
  const sx = mw / g.world.w;
  const sy = mh / g.world.h;
  ctx.fillStyle = 'rgba(2, 6, 18, 0.72)';
  ctx.fillRect(x0 - 2, y0 - 2, mw + 4, mh + 4);
  ctx.strokeStyle = 'rgba(126, 231, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, mw, mh);
  // Camera view rectangle.
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.strokeRect(x0 + g.camera.x * sx, y0 + g.camera.y * sy, 1280 * sx, 720 * sy);
  for (const e of g.enemies) {
    if (!e.alive) continue;
    ctx.fillStyle = e.kind === 'boss' ? '#ff3d5e' : '#ff8ab0';
    ctx.fillRect(x0 + e.x * sx - 2, y0 + e.y * sy - 2, 4, 4);
  }
  for (const s of g.shards) {
    ctx.fillStyle = '#7ee7ff';
    ctx.fillRect(x0 + s.x * sx - 1, y0 + s.y * sy - 1, 2, 2);
  }
  const p = g.player;
  if (p.alive) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x0 + p.x * sx, y0 + p.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '11px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('NEBULA MAP', x0, y0 - 5);
}

function panel(ctx, x, y, w, h, title) {
  ctx.fillStyle = 'rgba(3, 7, 22, 0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(126, 231, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  if (title) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ee7ff';
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(title, x + w / 2, y + 36);
  }
}

export function drawTitle(ctx, g, time) {
  // Dim the live backdrop (the arena drifts behind the title).
  ctx.fillStyle = 'rgba(3, 5, 16, 0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  const bob = Math.sin(time * 1.2) * 6;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#b388ff';
  ctx.shadowBlur = 34;
  ctx.fillText('VOIDHARVEST', 640, 218 + bob);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#7ee7ff';
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('HARVEST THE NEBULA  •  SURVIVE 10 WAVES  •  SLAY THE VOID MAW', 640, 262 + bob);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('WASD / arrows to fly  •  Mouse to aim, click to fire  •  Space fires without a mouse', 640, 330);
  ctx.fillText('Collect star shards  •  Pick 1 of 3 upgrades between waves  •  Boss every 5 waves', 640, 358);
  ctx.fillText('P pause  •  M mute  •  R restart', 640, 386);
  // Start button.
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(520, 430, 240, 56);
  ctx.fillStyle = '#1a1206';
  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('▶  LAUNCH', 640, 467);
  ctx.fillStyle = '#9fb4d8';
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Best score: ${g.best.toLocaleString('en-US')}   •   Click LAUNCH or press Enter`, 640, 520);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('A complete original game — no assets, no network, all art and sound made in code.', 640, 690);
}

export function drawUpgradeScreen(ctx, g) {
  ctx.fillStyle = 'rgba(3, 5, 16, 0.62)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#7ee7ff';
  ctx.shadowBlur = 20;
  ctx.fillText(`WAVE ${g.wave} CLEARED`, 640, 130);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CHOOSE AN UPGRADE  —  press 1, 2 or 3, or click a card', 640, 172);
  const cards = g.upgradeChoices;
  const rects = upgradeCardRects(cards.length);
  const y0 = 230;
  cards.forEach((u, i) => {
    const { x, w: cw, h: ch } = rects[i];
    const owned = g.upgradesOwned[u.id] || 0;
    panel(ctx, x, y0, cw, ch, null);
    ctx.fillStyle = '#b388ff';
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`[${i + 1}]`, x + cw / 2, y0 + 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(u.name, x + cw / 2, y0 + 66);
    ctx.fillStyle = '#cdd8f0';
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    wrapText(ctx, u.desc, x + cw / 2, y0 + 104, cw - 36, 22);
    ctx.fillStyle = owned > 0 ? '#ffd166' : '#8fa3c8';
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(owned > 0 ? `Owned x${owned}` : 'New', x + cw / 2, y0 + ch - 22);
  });
  ctx.fillStyle = '#9fb4d8';
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Hull ${Math.ceil(g.player.hull)}/${g.player.maxHull}  •  Shield ${Math.ceil(g.player.shield)}/${g.player.maxShield}  •  Score ${g.score.toLocaleString('en-US')}`, 640, 520);
}

// Card geometry shared by the upgrade screen and the click handler, so a
// click always lands on the card the player sees.
export function upgradeCardRects(count) {
  const cw = 300;
  const ch = 210;
  const gap = 30;
  const total = count * cw + (count - 1) * gap;
  const x0 = (1280 - total) / 2;
  const y0 = 230;
  const rects = [];
  for (let i = 0; i < count; i += 1) {
    rects.push({ x: x0 + i * (cw + gap), y: y0, w: cw, h: ch });
  }
  return rects;
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [''];
  for (const w of words) {
    const test = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && lines[lines.length - 1]) lines.push(w);
    else lines[lines.length - 1] = test;
  }
  lines.forEach((line, i) => ctx.fillText(line, cx, y + i * lineHeight));
}

export function drawPause(ctx, g) {
  ctx.fillStyle = 'rgba(3, 5, 16, 0.66)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', 640, 320);
  ctx.fillStyle = '#cdd8f0';
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('P or Esc to resume  •  R to restart the run  •  M to mute', 640, 366);
}

function statsLines(g) {
  return [
    `Score  ${g.score.toLocaleString('en-US')}`,
    `Wave reached  ${g.wave}  •  Kills  ${g.kills}  •  Shards  ${g.shardsCollected}`,
    `Time  ${formatTime(g.runTime)}  •  Best  ${g.best.toLocaleString('en-US')}`,
  ];
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function drawVictory(ctx, g) {
  ctx.fillStyle = 'rgba(3, 10, 4, 0.62)';
  ctx.fillRect(0, 0, 1280, 720);
  // Golden celebration glow behind the title, so winning reads as winning.
  const glow = ctx.createRadialGradient(640, 220, 20, 640, 220, 420);
  glow.addColorStop(0, 'rgba(255, 209, 102, 0.30)');
  glow.addColorStop(0.5, 'rgba(255, 157, 60, 0.13)');
  glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 30;
  ctx.fillText('★ NEBULA HARVESTED ★', 640, 220);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('You cleared all 10 waves and slew the Void Maw. The nebula is yours.', 640, 272);
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e8ecff';
  statsLines(g).forEach((line, i) => ctx.fillText(line, 640, 330 + i * 34));
  ctx.fillStyle = '#7ee7ff';
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('C — keep harvesting (endless)      R — play again', 640, 470);
}

export function drawGameOver(ctx, g) {
  ctx.fillStyle = 'rgba(16, 3, 8, 0.66)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d7a';
  ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#ff3d5e';
  ctx.shadowBlur = 30;
  ctx.fillText('SHIP LOST', 640, 220);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`The void took your harvester on wave ${g.wave}.`, 640, 272);
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e8ecff';
  statsLines(g).forEach((line, i) => ctx.fillText(line, 640, 330 + i * 34));
  ctx.fillStyle = '#7ee7ff';
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('R — launch again      Enter — launch again', 640, 470);
}
