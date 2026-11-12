'use strict';
// SHIFT HAPPENS - Game Off 2026 (theme: SHIFT)
// Two worlds. Every enemy and bullet belongs to one. You can only hurt (and be hurt by) things in the world you stand in.
(() => {
const W = 960, H = 600, TAU = Math.PI * 2;
const cv = document.getElementById('c'), cx = cv.getContext('2d');
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const fmt = n => Math.floor(n).toLocaleString('en-US');
const FONT = '"Trebuchet MS","Segoe UI",system-ui,sans-serif';

const REAL = [
  { name: 'PINK', main: '#ff2e9a', light: '#ffc2e4', dark: '#3a0b2c', bg: '#13051a', rgb: '255,46,154' },
  { name: 'CYAN', main: '#16e0ff', light: '#c2f8ff', dark: '#06303b', bg: '#02121a', rgb: '22,224,255' }
];

// ───────────── save ─────────────
const SAVE = 'shift_happens_v1';
const save = { best: 0, bestWave: 0, muted: false };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE)) || {}); } catch (e) {}
const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify(save)); } catch (e) {} };

// ───────────── audio: two music layers, one per world. The world you are NOT in is muffled underneath. ─────────────
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const Snd = {
  ac: null, master: null, bus: [], filt: [], noise: null, step: 0, next: 0, tempo: 112, world: 0, last: {},
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ac.createGain(); this.master.gain.value = save.muted ? 0 : 0.8; this.master.connect(this.ac.destination);
      for (let i = 0; i < 2; i++) {
        const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = i === 0 ? 16000 : 420;
        const g = this.ac.createGain(); g.gain.value = i === 0 ? 1 : 0.22;
        g.connect(f); f.connect(this.master); this.bus[i] = g; this.filt[i] = f;
      }
      const len = this.ac.sampleRate, b = this.ac.createBuffer(1, len, this.ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b; this.next = this.ac.currentTime + 0.1;
      setInterval(() => this.tick(), 90);
    } catch (e) { this.ac = null; }
  },
  setMuted(m) { save.muted = m; persist(); if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ac.currentTime, 0.02); },
  setWorld(w) {
    this.world = w; if (!this.ac) return;
    const t = this.ac.currentTime;
    for (let i = 0; i < 2; i++) {
      this.bus[i].gain.setTargetAtTime(i === w ? 1 : 0.22, t, 0.04);
      this.filt[i].frequency.setTargetAtTime(i === w ? 16000 : 420, t, 0.05);
    }
  },
  tick() {
    if (!this.ac) return;
    const sd = 60 / this.tempo / 4;
    if (this.next < this.ac.currentTime - 0.5) this.next = this.ac.currentTime;
    while (this.next < this.ac.currentTime + 0.3) { this.sched(this.step, this.next, sd); this.next += sd; this.step++; }
  },
  sched(s, t, sd) {
    const bar = Math.floor(s / 16) % 4, i = s % 16, r = [45, 41, 48, 43][bar];
    if (i % 4 === 0) this.kick(t);
    if (i === 4 || i === 12) this.snare(t);
    if (i % 2 === 1) this.hat(t, i % 4 === 3 ? 0.05 : 0.025);
    // pink world: driving saw bass + square arp
    if (i % 2 === 0) this.note(0, mtof(r + (i % 8 === 0 ? 0 : (i % 4 === 2 ? 12 : 7))), t, sd * 1.7, 'sawtooth', 0.07);
    if (i % 2 === 1) this.note(0, mtof(r + 24 + [0, 3, 7, 10][(i >> 1) % 4]), t, sd * 0.9, 'square', 0.026);
    // cyan world: floating pad + glassy bells
    if (i % 8 === 0) this.note(1, mtof(r + 12), t, sd * 7.5, 'sine', 0.13);
    if (i % 3 === 0) this.note(1, mtof(r + 31 + [0, 2, 5, 7, 9][(s * 3 + bar) % 5]), t, sd * 2.6, 'triangle', 0.07);
  },
  note(bus, f, t, dur, type, vol) {
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.bus[bus]); o.start(t); o.stop(t + dur + 0.05);
  },
  kick(t) {
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.22);
  },
  nz(t, type, freq, vol, dur) {
    const s = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  snare(t) { this.nz(t, 'bandpass', 1900, 0.16, 0.12); },
  hat(t, v) { this.nz(t, 'highpass', 7500, v, 0.04); },
  sfx(f, dur, type, vol, slide, key, gap) {
    if (!this.ac) return;
    const now = performance.now();
    if (key && now - (this.last[key] || 0) < (gap || 40)) return;
    if (key) this.last[key] = now;
    const t = this.ac.currentTime, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  shoot() { this.sfx(880, 0.05, 'square', 0.012, -500, 'shoot', 60); },
  hit() { this.sfx(300, 0.05, 'triangle', 0.035, -120, 'hit', 35); },
  kill() { this.sfx(520, 0.12, 'square', 0.05, -380, 'kill', 30); },
  hurt() { this.sfx(140, 0.35, 'sawtooth', 0.12, -90, 'hurt', 100); },
  pick() { this.sfx(1000 + Math.random() * 300, 0.06, 'sine', 0.03, 400, 'pick', 50); },
  shift(w) {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    this.nz(t, 'bandpass', w ? 3000 : 600, 0.25, 0.28);
    this.sfx(w ? 200 : 1400, 0.3, 'sawtooth', 0.09, w ? 1200 : -1100);
    this.sfx(w ? 400 : 700, 0.25, 'sine', 0.1, w ? 800 : -400);
  },
  level() { [523, 659, 784, 1047, 1319].forEach((f, j) => setTimeout(() => this.sfx(f, 0.16, 'triangle', 0.06), j * 70)); },
  boss() { [110, 98, 87].forEach((f, j) => setTimeout(() => this.sfx(f, 0.5, 'sawtooth', 0.12, -20), j * 220)); },
  over() { [440, 370, 311, 220].forEach((f, j) => setTimeout(() => this.sfx(f, 0.3, 'sawtooth', 0.09, -30), j * 160)); }
};

// ───────────── state ─────────────
const ETYPES = {
  grunt: { hp: 3, rad: 12, sp: 78, xp: 1 },
  dasher: { hp: 4, rad: 12, sp: 62, xp: 2 },
  splitter: { hp: 9, rad: 19, sp: 50, xp: 3 },
  mini: { hp: 1.2, rad: 8, sp: 118, xp: 0.5 },
  shooter: { hp: 5, rad: 13, sp: 58, xp: 3 },
  boss: { hp: 55, rad: 36, sp: 44, xp: 25 }
};
const baseStats = () => ({ fire: 3.2, dmg: 1, multi: 1, pierce: 0, speed: 235, magnet: 70, blastR: 110, blastD: 1, shiftCd: 0.55, trail: 0, slip: 0, shards: 0, bleed: 0 });

const UPS = [
  { id: 'rapid', ic: '⚡', name: 'Overclocked Gun', max: 6, desc: '+25% fire rate', ap: s => { s.fire *= 1.25; } },
  { id: 'power', ic: '💥', name: 'Hot Rounds', max: 6, desc: '+35% damage', ap: s => { s.dmg *= 1.35; } },
  { id: 'twin', ic: '🔱', name: 'Twin Shot', max: 4, desc: '+1 projectile', ap: s => { s.multi += 1; } },
  { id: 'pierce', ic: '🌀', name: 'Phase Rounds', max: 3, desc: 'Shots pierce +1 enemy', ap: s => { s.pierce += 1; } },
  { id: 'boots', ic: '👟', name: 'Glitch Boots', max: 5, desc: '+10% move speed', ap: s => { s.speed *= 1.1; } },
  { id: 'magnet', ic: '🧲', name: 'Gem Magnet', max: 4, desc: '+60 pickup range', ap: s => { s.magnet += 60; } },
  { id: 'heart', ic: '❤️', name: 'Extra Heart', max: 4, desc: '+1 max HP and heal 1', ap: (s, g) => { g.p.maxhp++; g.p.hp = Math.min(g.p.maxhp, g.p.hp + 1); } },
  { id: 'blast', ic: '🌊', name: 'Shift Shockwave', max: 5, desc: 'Bigger, harder shift blast', ap: s => { s.blastR *= 1.25; s.blastD += 1; } },
  { id: 'trail', ic: '👻', name: 'Afterimage', max: 3, desc: 'Shifting leaves a zone that hurts ALL enemies', ap: s => { s.trail++; } },
  { id: 'slip', ic: '⏳', name: 'Time Slip', max: 3, desc: 'Shifting slows every enemy', ap: s => { s.slip++; } },
  { id: 'shards', ic: '🗡️', name: 'Orbit Shards', max: 4, desc: '+1 blade orbits you', ap: s => { s.shards++; } },
  { id: 'cool', ic: '⚙️', name: 'Quantum Legs', max: 3, desc: 'Shift cooldown -20%', ap: s => { s.shiftCd *= 0.8; } },
  { id: 'bleed', ic: '👁️', name: 'Double Vision', max: 3, desc: 'Your shots also hurt ghosts a little', ap: s => { s.bleed++; } }
];

const G = {};
let anim = 0, titleT = 0, paused = false;
const keys = {}, mouse = { x: 0, y: 0 }, touch = { on: false, stick: null, sx: 0, sy: 0 };

function resetGame() {
  for (const k in G) delete G[k];
  Object.assign(G, {
    state: 'play', w: 0, t: 0, wave: 1, waveT: 0, score: 0, kills: 0, combo: 0, comboT: 0, mult: 1, shiftT: 99,
    p: { x: W / 2, y: H / 2, vx: 0, vy: 0, hp: 5, maxhp: 5, inv: 0, cd: 0, fireT: 0.4, ang: 0, trail: [] },
    en: [], bl: [], eb: [], gems: [], fx: [], tx: [], zones: [],
    xp: 0, lvl: 1, need: 5, up: {}, st: baseStats(), shake: 0, wipe: null, spawnAcc: 0, forceT: 15, forceWarn: 0,
    flash: 0, hf: 0, slow: 0, cards: [], cardT: 0, shardA: 0, banner: { txt: 'WAVE 1', t: 2 }, hint: 16, shifts: 0,
    newBest: false, deadT: 0, hitstop: 0, bossName: ''
  });
  Snd.tempo = 112; Snd.setWorld(0);
}
resetGame(); G.state = 'title';

// ───────────── spawning ─────────────
function makeEnemy(type, r, x, y, spawnT) {
  const d = ETYPES[type], hm = 1 + 0.08 * (G.wave - 1);
  const e = {
    type, r, x, y, spawnT: spawnT === undefined ? 0.9 : spawnT, rad: d.rad, xp: d.xp,
    hp: d.hp * (type === 'boss' ? 1 + 0.3 * (G.wave / 5 - 1) : hm), sp: d.sp * (1 + Math.min(0.5, G.wave * 0.025)),
    t: rnd(0.5, 2), st: 0, dx: 0, dy: 0, kx: 0, ky: 0, flash: 0, hc: 0, ang: rnd(0, TAU), flipT: 3.6, ph: rnd(0, 6.28), dead: false
  };
  e.mhp = e.hp; G.en.push(e); return e;
}
function spawnEnemy() {
  const w = G.wave, pool = [['grunt', 10]];
  if (w >= 2) pool.push(['dasher', 3 + w]);
  if (w >= 3) pool.push(['splitter', 2 + w * 0.6]);
  if (w >= 4) pool.push(['shooter', 2 + w * 0.6]);
  let tot = 0; pool.forEach(a => { tot += a[1]; });
  let r = Math.random() * tot, type = 'grunt';
  for (const a of pool) { r -= a[1]; if (r <= 0) { type = a[0]; break; } }
  let n0 = 0; G.en.forEach(e => { if (e.r === 0) n0++; });
  const n1 = G.en.length - n0;
  let real = Math.random() < 0.65 ? (n0 <= n1 ? 0 : 1) : rint(0, 1);
  if (G.t < 8) real = 0;                       // teach: first seconds only have enemies from your world
  let x, y, tries = 0;
  do { x = rnd(40, W - 40); y = rnd(70, H - 40); tries++; } while (Math.hypot(x - G.p.x, y - G.p.y) < 200 && tries < 20);
  return makeEnemy(type, real, x, y);
}
function spawnBoss() {
  G.bossName = 'THE GLITCH';
  makeEnemy('boss', G.w ^ 1, W / 2, 110, 1.6);
  G.banner = { txt: 'BOSS: THE GLITCH', t: 2.6 };
  Snd.boss();
}

// ───────────── helpers: fx ─────────────
function burst(x, y, col, n, sp) {
  for (let i = 0; i < n && G.fx.length < 380; i++) {
    const a = rnd(0, TAU), s = rnd(sp * 0.25, sp);
    G.fx.push({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(0.3, 0.7), mt: 0.7, c: col, s: rnd(1.5, 3.6) });
  }
}
function popText(x, y, txt, col, size) { if (G.tx.length < 30) G.tx.push({ x, y, txt, col, size: size || 18, t: 0.9, mt: 0.9 }); }
const solid = (e, v) => e.spawnT <= 0 && e.r === v;

// ───────────── combat ─────────────
function hurtEnemy(e, dmg) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 0.09;
  burst(e.x, e.y, REAL[e.r].main, 3, 140);
  if (e.hp <= 0) killEnemy(e); else Snd.hit();
}
function dotEnemy(e, amt) { if (e.dead) return; e.hp -= amt; e.flash = 0.05; if (e.hp <= 0) killEnemy(e); }

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  const col = REAL[e.r].main, phase = G.shiftT < 0.6;
  burst(e.x, e.y, col, e.type === 'boss' ? 70 : 14, e.type === 'boss' ? 420 : 240);
  G.fx.push({ k: 'ring', x: e.x, y: e.y, r: 0, mr: e.rad * 2.6, t: 0.3, mt: 0.3, c: e.r });
  G.kills++; G.combo++; G.comboT = 2.4; G.mult = 1 + Math.min(4, G.combo * 0.1);
  const pts = Math.round((e.type === 'boss' ? 1000 : 10 * (1 + e.xp)) * G.mult * (phase ? 2 : 1));
  G.score += pts;
  popText(e.x, e.y - 10, (phase ? 'PHASE KILL +' : '+') + pts, phase ? '#ffffff' : REAL[e.r].light, phase ? 20 : 15);
  Snd.kill();
  G.gems.push({ k: 'xp', x: e.x, y: e.y, v: e.xp, vx: rnd(-60, 60), vy: rnd(-60, 60) });
  if (e.type === 'boss') {
    for (let i = 0; i < 9; i++) G.gems.push({ k: 'xp', x: e.x, y: e.y, v: 2, vx: rnd(-200, 200), vy: rnd(-200, 200) });
    G.gems.push({ k: 'heart', x: e.x, y: e.y, v: 1, vx: 0, vy: 0 });
    G.shake = 26; G.flash = 0.3; G.hitstop = 0.12; G.bossName = '';
    G.eb = [];
  } else if (Math.random() < (e.type === 'splitter' || e.type === 'shooter' ? 0.07 : 0.025)) G.gems.push({ k: 'heart', x: e.x, y: e.y, v: 1, vx: 0, vy: 0 });
  if (e.type === 'splitter') {
    for (let i = 0; i < 2; i++) { const m = makeEnemy('mini', e.r ^ 1, e.x + (i ? 14 : -14), e.y, 0.35); m.kx = i ? 160 : -160; }
    popText(e.x, e.y - 30, 'SPLIT!', REAL[e.r ^ 1].light, 14);
  }
}

function hurtPlayer() {
  const p = G.p;
  if (p.inv > 0 || G.state !== 'play') return;
  p.hp--; p.inv = 1.2; G.shake = 14; G.hf = 0.3; G.combo = 0; G.comboT = 0; G.mult = 1;
  burst(p.x, p.y, '#ff4d6d', 22, 260); Snd.hurt();
  if (p.hp <= 0) die();
}
function die() {
  G.state = 'dead'; G.deadT = 0;
  if (G.score > save.best) { save.best = G.score; G.newBest = true; }
  save.bestWave = Math.max(save.bestWave, G.wave); persist();
  burst(G.p.x, G.p.y, '#ffffff', 60, 380); Snd.over();
}

function doShift(forced) {
  const p = G.p, st = G.st;
  if (G.state !== 'play') return false;
  if (!forced && p.cd > 0) return false;
  const old = G.w; G.w ^= 1; G.shifts++; G.shiftT = 0; p.cd = st.shiftCd; p.inv = Math.max(p.inv, 0.35);
  G.wipe = { t: 0, from: old, x: p.x, y: p.y };
  G.shake = Math.max(G.shake, 7); G.flash = 0.12;
  Snd.setWorld(G.w); Snd.shift(G.w);
  // shockwave: enemies of the NEW world around you get blasted away; their bullets get wiped
  const R = st.blastR;
  G.fx.push({ k: 'ring', x: p.x, y: p.y, r: 0, mr: R, t: 0.35, mt: 0.35, c: G.w });
  for (const e of G.en) {
    if (e.spawnT > 0 || e.r !== G.w || e.dead) continue;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < R + e.rad) {
      const f = 1 - d / (R + e.rad), kb = e.type === 'boss' ? 120 : 480 + 300 * f;
      e.kx += dx / d * kb; e.ky += dy / d * kb; hurtEnemy(e, st.blastD * 1.5);
    }
  }
  G.eb = G.eb.filter(b => {
    if (b.r === G.w && Math.hypot(b.x - p.x, b.y - p.y) < R) { burst(b.x, b.y, REAL[b.r].main, 4, 120); return false; }
    return true;
  });
  if (st.trail > 0) G.zones.push({ x: p.x, y: p.y, r: 60 + 12 * st.trail, life: 2.5 + 0.3 * st.trail, dps: 4 * st.trail });
  if (st.slip > 0) G.slow = 0.8 + 0.4 * st.slip;
  if (!forced) G.hint = Math.min(G.hint, 4);
  return true;
}

function eshot(e, ang, sp) {
  G.eb.push({ x: e.x, y: e.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: e.r, rad: 7, life: 7 });
}

// ───────────── update ─────────────
function target() {
  const p = G.p; let best = null, bd = 520 * 520;
  for (const e of G.en) { if (e.spawnT > 0 || e.dead || e.r !== G.w) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; best = e; } }
  if (!best && G.st.bleed > 0) for (const e of G.en) { if (e.spawnT > 0 || e.dead) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function fire(tg) {
  const p = G.p, st = G.st, ang = Math.atan2(tg.y - p.y, tg.x - p.x); p.ang = ang;
  for (let i = 0; i < st.multi; i++) {
    const a = ang + (i - (st.multi - 1) / 2) * 0.17;
    G.bl.push({ x: p.x, y: p.y, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: 1.1, dmg: st.dmg, pierce: st.pierce, hit: [], c: G.w });
  }
  Snd.shoot();
}

function updatePlayer(dt) {
  const p = G.p, st = G.st;
  let ix = 0, iy = 0;
  if (keys.a || keys.arrowleft) ix--; if (keys.d || keys.arrowright) ix++;
  if (keys.w || keys.arrowup) iy--; if (keys.s || keys.arrowdown) iy++;
  if (touch.stick) { ix += touch.sx; iy += touch.sy; }
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  const k = Math.min(1, 14 * dt);
  p.vx += (ix * st.speed - p.vx) * k; p.vy += (iy * st.speed - p.vy) * k;
  p.x = clamp(p.x + p.vx * dt, 14, W - 14); p.y = clamp(p.y + p.vy * dt, 14, H - 14);
  p.inv = Math.max(0, p.inv - dt); p.cd = Math.max(0, p.cd - dt);
  p.trail.push({ x: p.x, y: p.y, t: 0.22 });
  for (const q of p.trail) q.t -= dt;
  while (p.trail.length && p.trail[0].t <= 0) p.trail.shift();
  p.fireT -= dt;
  if (p.fireT <= 0) { const tg = target(); if (tg) { p.fireT = 1 / st.fire; fire(tg); } else p.fireT = 0.04; }
}

function updateEnemies(dt) {
  const p = G.p, slow = G.slow > 0 ? 0.5 : 1;
  if (G.slow > 0) G.slow -= dt;
  for (const e of G.en) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt); e.hc = Math.max(0, e.hc - dt);
    if (e.spawnT > 0) { e.spawnT -= dt; continue; }
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, sp = e.sp * slow;
    e.x += e.kx * dt; e.y += e.ky * dt; const dec = Math.pow(0.015, dt); e.kx *= dec; e.ky *= dec;
    e.ang += dt * 1.2;
    switch (e.type) {
      case 'dasher':
        e.t -= dt;
        if (e.st === 0) { e.x += ux * sp * dt; e.y += uy * sp * dt; e.ang = Math.atan2(uy, ux); if (e.t <= 0) { e.st = 1; e.t = 0.6; e.dx = ux; e.dy = uy; } }
        else if (e.st === 1) { e.ang = Math.atan2(e.dy, e.dx); if (e.t <= 0) { e.st = 2; e.t = 0.45; } }
        else { e.x += e.dx * 430 * slow * dt; e.y += e.dy * 430 * slow * dt; if (e.t <= 0) { e.st = 0; e.t = rnd(1.6, 2.6); } }
        break;
      case 'shooter':
        if (d > 250) { e.x += ux * sp * dt; e.y += uy * sp * dt; } else if (d < 175) { e.x -= ux * sp * dt; e.y -= uy * sp * dt; }
        e.t -= dt * slow;
        if (e.t <= 0) { e.t = rnd(1.8, 2.7); eshot(e, Math.atan2(uy, ux), 185); }
        break;
      case 'boss':
        e.x += ux * sp * dt; e.y += uy * sp * dt;
        e.flipT -= dt * slow;
        if (e.flipT <= 0) { e.r ^= 1; e.flipT = 3.6; G.fx.push({ k: 'ring', x: e.x, y: e.y, r: 0, mr: 120, t: 0.4, mt: 0.4, c: e.r }); }
        e.t -= dt * slow;
        if (e.t <= 0) { e.t = 3.1; const n = 14, off = rnd(0, TAU); for (let i = 0; i < n; i++) eshot(e, off + i * TAU / n, 150); }
        break;
      default:
        e.x += (ux * sp + Math.cos(e.ph + anim * 3) * 14) * dt; e.y += (uy * sp + Math.sin(e.ph + anim * 3) * 14) * dt;
    }
    e.x = clamp(e.x, 8, W - 8); e.y = clamp(e.y, 8, H - 8);
    if (e.r === G.w && d < e.rad + 10) hurtPlayer();
  }
  G.en = G.en.filter(e => !e.dead);
}

function updateBullets(dt) {
  for (const b of G.bl) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) b.life = 0;
    if (b.life <= 0) continue;
    for (const e of G.en) {
      if (e.dead || e.spawnT > 0 || b.hit.includes(e)) continue;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > (e.rad + 5) ** 2) continue;
      const sol = e.r === G.w;                               // is the enemy in the world we are in right now?
      if (!sol && G.st.bleed <= 0) continue;
      b.hit.push(e); hurtEnemy(e, sol ? b.dmg : b.dmg * 0.25 * G.st.bleed);
      if (b.pierce <= 0) { b.life = 0; break; } b.pierce--;
    }
  }
  G.bl = G.bl.filter(b => b.life > 0);
  const p = G.p;
  for (const b of G.eb) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) b.life = 0;
    if (b.life > 0 && b.r === G.w && (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.rad + 9) ** 2) { b.life = 0; hurtPlayer(); }
  }
  G.eb = G.eb.filter(b => b.life > 0);
}

function levelUp() {
  G.lvl++; G.xp -= G.need; G.need = Math.floor(G.need * 1.25 + 2);
  const pool = UPS.filter(u => (G.up[u.id] || 0) < u.max);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  G.cards = pool.slice(0, 3);
  if (!G.cards.length) { G.score += 500; popText(G.p.x, G.p.y - 30, 'MAXED! +500', '#fff', 20); return; }
  G.state = 'levelup'; G.cardT = 0; Snd.level();
}
function chooseCard(i) {
  const u = G.cards[i]; if (!u) return;
  G.up[u.id] = (G.up[u.id] || 0) + 1; u.ap(G.st, G);
  G.state = 'play'; G.p.inv = Math.max(G.p.inv, 1); G.cards = [];
  burst(G.p.x, G.p.y, '#ffffff', 24, 260);
  if (G.xp >= G.need) levelUp();
}

function updateGems(dt) {
  const p = G.p, mg = G.st.magnet;
  for (const g of G.gems) {
    const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
    g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= Math.pow(0.05, dt); g.vy *= Math.pow(0.05, dt);
    if (d < mg) { const s = 420 * (1 - d / mg) + 160; g.x += dx / d * s * dt; g.y += dy / d * s * dt; }
    if (d < 17) {
      g.dead = true;
      if (g.k === 'heart') { if (p.hp < p.maxhp) { p.hp++; popText(p.x, p.y - 22, '+1 HP', '#ff7a95', 18); } else G.score += 100; Snd.sfx(660, 0.18, 'triangle', 0.07, 400); }
      else { G.xp += g.v; Snd.pick(); }
    }
  }
  G.gems = G.gems.filter(g => !g.dead);
  if (G.state === 'play' && G.xp >= G.need) levelUp();
}

function updateZones(dt) {
  for (const z of G.zones) {
    z.life -= dt;
    for (const e of G.en) if (!e.dead && e.spawnT <= 0 && (e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + e.rad) ** 2) dotEnemy(e, z.dps * dt);
  }
  G.zones = G.zones.filter(z => z.life > 0);
  const n = G.st.shards;
  if (n > 0) {
    G.shardA += dt * 3.4;
    for (let i = 0; i < n; i++) {
      const a = G.shardA + i * TAU / n, sx = G.p.x + Math.cos(a) * 74, sy = G.p.y + Math.sin(a) * 74;
      for (const e of G.en) if (!e.dead && e.spawnT <= 0 && e.r === G.w && e.hc <= 0 && (e.x - sx) ** 2 + (e.y - sy) ** 2 < (e.rad + 9) ** 2) { e.hc = 0.3; hurtEnemy(e, G.st.dmg * 1.3); }
    }
  }
}

function updateFx(dt) {
  for (const f of G.fx) {
    f.t -= dt;
    if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.pow(0.1, dt); f.vy *= Math.pow(0.1, dt); }
    else if (f.k === 'ring') f.r = f.mr * ease(1 - f.t / f.mt);
  }
  G.fx = G.fx.filter(f => f.t > 0);
  for (const t of G.tx) { t.t -= dt; t.y -= 34 * dt; }
  G.tx = G.tx.filter(t => t.t > 0);
  G.shake = Math.max(0, G.shake - 40 * dt); G.flash = Math.max(0, G.flash - dt); G.hf = Math.max(0, G.hf - dt);
  if (G.wipe) { G.wipe.t += dt; if (G.wipe.t > 0.45) G.wipe = null; }
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
}

function waves(dt) {
  G.waveT += dt;
  if (G.waveT >= 25) {
    G.waveT = 0; G.wave++; G.banner = { txt: 'WAVE ' + G.wave, t: 2 }; Snd.tempo = Math.min(150, 112 + G.wave * 3);
    if (G.wave % 5 === 0) spawnBoss();
  }
  G.spawnAcc += dt * (0.8 + G.wave * 0.3);
  while (G.spawnAcc >= 1) { G.spawnAcc -= 1; if (G.en.length < 46) spawnEnemy(); }
  if (G.wave >= 3) {                                          // reality gets unstable: forced shifts
    G.forceT -= dt; G.forceWarn = G.forceT < 1.3 ? G.forceT : 0;
    if (G.forceT <= 0) { G.forceT = Math.max(7, 16 - G.wave * 0.8); G.forceWarn = 0; doShift(true); }
  }
  G.hint = Math.max(0, G.hint - dt);
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) { G.combo = 0; G.mult = 1; } }
}

function step(dt) {
  anim += dt;
  if (G.state === 'title') { titleT += dt; return; }
  if (G.state === 'pause') return;
  if (G.state === 'levelup') { G.cardT += dt; updateFx(dt * 0.3); return; }
  if (G.state === 'dead') { G.deadT += dt; updateFx(dt * 0.6); return; }
  dt = Math.min(dt, 0.033);
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  G.t += dt; G.shiftT += dt;
  waves(dt); updatePlayer(dt); updateEnemies(dt); updateBullets(dt); updateGems(dt); updateZones(dt); updateFx(dt);
}

// ───────────── rendering ─────────────
const glows = {};
function glowSpr(rgb) {
  if (glows[rgb]) return glows[rgb];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(' + rgb + ',0.6)'); gr.addColorStop(0.35, 'rgba(' + rgb + ',0.2)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (glows[rgb] = c);
}
function halo(x, y, r, rgb, a) {
  cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = a === undefined ? 1 : a;
  cx.drawImage(glowSpr(rgb), x - r, y - r, r * 2, r * 2);
  cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
}
const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: rnd(0.6, 2), p: rnd(0, 6.28) }));
let vign = null;
function vignette() {
  if (vign) return vign;
  vign = document.createElement('canvas'); vign.width = W; vign.height = H;
  const g = vign.getContext('2d'), gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.6)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); return vign;
}
function beat() { return Math.pow(0.5 + 0.5 * Math.cos(anim * Snd.tempo / 60 * TAU), 5); }

function drawBG(v) {
  const R = REAL[v], b = beat();
  cx.fillStyle = R.bg; cx.fillRect(0, 0, W, H);
  for (const s of stars) { cx.fillStyle = 'rgba(' + R.rgb + ',' + (0.25 + 0.3 * Math.sin(anim * 2 + s.p)).toFixed(2) + ')'; cx.fillRect(s.x, s.y, s.s, s.s); }
  if (v === 0) {                                              // striped retro sun
    const gr = cx.createLinearGradient(0, 120, 0, 380); gr.addColorStop(0, 'rgba(255,170,60,0.55)'); gr.addColorStop(1, 'rgba(255,46,154,0.5)');
    cx.fillStyle = gr; cx.beginPath(); cx.arc(W / 2, 250, 130 + b * 6, 0, TAU); cx.fill();
    cx.fillStyle = R.bg; for (let i = 0; i < 6; i++) { const y = 250 + i * 22, h = 3 + i * 1.6; cx.fillRect(W / 2 - 140, y, 280, h); }
  } else {                                                    // crescent moon
    cx.fillStyle = 'rgba(22,224,255,0.4)'; cx.beginPath(); cx.arc(W / 2, 240, 120 + b * 5, 0, TAU); cx.fill();
    cx.fillStyle = R.bg; cx.beginPath(); cx.arc(W / 2 + 46, 218, 112 + b * 5, 0, TAU); cx.fill();
  }
  cx.strokeStyle = 'rgba(' + R.rgb + ',' + (0.08 + 0.1 * b).toFixed(3) + ')'; cx.lineWidth = 1; cx.beginPath();
  const off = (anim * 16) % 40;
  for (let x = 0; x <= W; x += 40) { cx.moveTo(x, 0); cx.lineTo(x, H); }
  for (let y = off - 40; y <= H; y += 40) { cx.moveTo(0, y); cx.lineTo(W, y); }
  cx.stroke();
  cx.strokeStyle = 'rgba(' + R.rgb + ',0.55)'; cx.lineWidth = 3; cx.strokeRect(2, 2, W - 4, H - 4);
  cx.drawImage(vignette(), 0, 0);
}

function shapePath(e) {
  const r = e.rad; cx.beginPath();
  if (e.type === 'dasher') {
    const a = e.ang; cx.moveTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5);
    cx.lineTo(Math.cos(a + 2.4) * r, Math.sin(a + 2.4) * r); cx.lineTo(Math.cos(a - 2.4) * r, Math.sin(a - 2.4) * r); cx.closePath();
  } else if (e.type === 'splitter') {
    for (let i = 0; i < 6; i++) { const a = e.ang * 0.3 + i * TAU / 6; cx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } cx.closePath();
  } else if (e.type === 'shooter') {
    for (let i = 0; i < 4; i++) { const a = e.ang * 0.5 + i * TAU / 4; cx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); } cx.closePath();
  } else if (e.type === 'boss') {
    for (let i = 0; i < 16; i++) { const a = e.ang * 0.4 + i * TAU / 16, rr = i % 2 ? r * 0.72 : r * 1.05; cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } cx.closePath();
  } else cx.arc(0, 0, r, 0, TAU);
}

function drawEnemy(e, v) {
  const R = REAL[e.r];
  if (e.spawnT > 0) {
    const k = clamp(e.spawnT / 0.9, 0, 1);
    cx.strokeStyle = R.main; cx.globalAlpha = 0.9 - 0.6 * k; cx.lineWidth = 2; cx.setLineDash([3, 4]);
    cx.beginPath(); cx.arc(e.x, e.y, e.rad + 4 + 22 * k, 0, TAU); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1; return;
  }
  const sol = e.r === v;
  cx.save(); cx.translate(e.x, e.y);
  if (sol) {
    halo(0, 0, e.rad * 2.8, R.rgb, e.flash > 0 ? 1 : 0.75);
    cx.fillStyle = e.flash > 0 ? '#fff' : R.dark; cx.strokeStyle = e.flash > 0 ? '#fff' : R.main; cx.lineWidth = 3;
  } else {
    cx.globalAlpha = 0.55 + 0.15 * Math.sin(anim * 6 + e.ph); cx.strokeStyle = R.main; cx.lineWidth = e.type === 'boss' ? 3 : 2; cx.fillStyle = 'rgba(' + R.rgb + ',0.1)'; cx.setLineDash([5, 5]);
  }
  shapePath(e); cx.fill(); cx.stroke(); cx.setLineDash([]);
  if (sol) {
    cx.fillStyle = '#fff';
    if (e.type === 'dasher' && e.st === 1) {                   // dash telegraph
      cx.strokeStyle = (Math.floor(anim * 20) % 2) ? '#fff' : R.main; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(e.dx * 150, e.dy * 150); cx.stroke();
    }
    if (e.type === 'shooter') { cx.beginPath(); cx.arc(0, 0, 3.5, 0, TAU); cx.fill(); }
    else if (e.type === 'boss') {
      cx.strokeStyle = e.flipT < 0.8 && Math.floor(anim * 18) % 2 ? REAL[e.r ^ 1].main : '#fff'; cx.lineWidth = 3; cx.beginPath(); cx.arc(0, 0, e.rad * 0.45, 0, TAU); cx.stroke();
    } else if (e.type === 'splitter') { cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(-e.rad * 0.5, 0); cx.lineTo(e.rad * 0.5, 0); cx.stroke(); }
    else { const a = Math.atan2(G.p.y - e.y, G.p.x - e.x); cx.beginPath(); cx.arc(Math.cos(a) * e.rad * 0.35, Math.sin(a) * e.rad * 0.35, e.type === 'mini' ? 1.8 : 2.8, 0, TAU); cx.fill(); }
  }
  cx.restore(); cx.globalAlpha = 1;
  if (sol && e.hp < e.mhp && e.type !== 'boss') {
    cx.fillStyle = 'rgba(0,0,0,0.5)'; cx.fillRect(e.x - 12, e.y - e.rad - 9, 24, 3);
    cx.fillStyle = R.main; cx.fillRect(e.x - 12, e.y - e.rad - 9, 24 * Math.max(0, e.hp / e.mhp), 3);
  }
}

function drawPlayer(v) {
  const p = G.p, R = REAL[v], O = REAL[v ^ 1];
  for (const q of p.trail) { cx.globalAlpha = Math.max(0, q.t / 0.22) * 0.25; cx.fillStyle = R.main; cx.beginPath(); cx.arc(q.x, q.y, 9 * (q.t / 0.22) + 2, 0, TAU); cx.fill(); }
  cx.globalAlpha = p.inv > 0 && Math.floor(anim * 22) % 2 === 0 ? 0.4 : 1;
  halo(p.x, p.y, 40, R.rgb, 0.9);
  cx.save(); cx.translate(p.x, p.y);
  cx.strokeStyle = R.main; cx.lineWidth = 3; cx.beginPath(); cx.arc(0, 0, 13, 0, TAU); cx.stroke();
  cx.rotate(anim * 2); cx.strokeStyle = R.light; cx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { cx.beginPath(); cx.arc(0, 0, 18, i * TAU / 3, i * TAU / 3 + 0.9); cx.stroke(); }
  cx.rotate(-anim * 2);
  cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(0, 0, 7, 0, TAU); cx.fill();
  cx.fillStyle = O.main; cx.beginPath(); cx.arc(0, 0, 3.6, 0, TAU); cx.fill();            // core shows the world you would shift to
  cx.rotate(p.ang); cx.fillStyle = R.light; cx.beginPath(); cx.moveTo(24, 0); cx.lineTo(17, -4); cx.lineTo(17, 4); cx.closePath(); cx.fill();
  cx.restore();
  if (p.cd > 0) { cx.strokeStyle = 'rgba(255,255,255,0.85)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(p.x, p.y, 26, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.cd / G.st.shiftCd)); cx.stroke(); }
  cx.globalAlpha = 1;
  const n = G.st.shards;
  for (let i = 0; i < n; i++) {
    const a = G.shardA + i * TAU / n, sx = p.x + Math.cos(a) * 74, sy = p.y + Math.sin(a) * 74;
    halo(sx, sy, 18, R.rgb, 0.8); cx.save(); cx.translate(sx, sy); cx.rotate(a + 1.57); cx.fillStyle = '#fff'; cx.beginPath(); cx.moveTo(0, -10); cx.lineTo(4, 4); cx.lineTo(-4, 4); cx.closePath(); cx.fill(); cx.restore();
  }
}

function heartPath(x, y, s) {
  cx.beginPath(); cx.moveTo(x, y + s * 0.9);
  cx.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.4);
  cx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.3, y - s * 0.1, x, y + s * 0.9); cx.closePath();
}

function drawScene(v) {
  drawBG(v);
  for (const z of G.zones) {
    cx.strokeStyle = 'rgba(255,255,255,' + clamp(z.life, 0, 0.6).toFixed(2) + ')'; cx.fillStyle = 'rgba(255,255,255,0.07)'; cx.lineWidth = 2; cx.setLineDash([6, 6]);
    cx.beginPath(); cx.arc(z.x, z.y, z.r, 0, TAU); cx.fill(); cx.stroke(); cx.setLineDash([]);
  }
  for (const g of G.gems) {
    if (g.k === 'heart') { halo(g.x, g.y, 20, '255,77,109', 0.9); cx.fillStyle = '#ff4d6d'; heartPath(g.x, g.y, 7 + Math.sin(anim * 6) * 1); cx.fill(); }
    else { halo(g.x, g.y, 12, '190,255,90', 0.8); cx.fillStyle = '#c8ff5e'; cx.save(); cx.translate(g.x, g.y); cx.rotate(anim * 3 + g.x); cx.fillRect(-3, -3, 6, 6); cx.restore(); }
  }
  for (const e of G.en) drawEnemy(e, v);
  for (const b of G.eb) {
    const R = REAL[b.r], sol = b.r === v;
    if (sol) { halo(b.x, b.y, 22, R.rgb, 0.9); cx.fillStyle = R.main; cx.beginPath(); cx.arc(b.x, b.y, b.rad, 0, TAU); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(b.x, b.y, b.rad * 0.4, 0, TAU); cx.fill(); }
    else { cx.globalAlpha = 0.6; cx.strokeStyle = R.main; cx.lineWidth = 2; cx.setLineDash([3, 3]); cx.beginPath(); cx.arc(b.x, b.y, b.rad, 0, TAU); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1; }
  }
  for (const b of G.bl) {
    const R = REAL[b.c]; cx.strokeStyle = R.light; cx.lineWidth = 4; cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(b.x, b.y); cx.lineTo(b.x - b.vx * 0.028, b.y - b.vy * 0.028); cx.stroke();
    halo(b.x, b.y, 12, R.rgb, 0.7);
  }
  if (G.state !== 'dead') drawPlayer(v);
  for (const f of G.fx) {
    if (f.k === 'p') { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = clamp(f.t / 0.4, 0, 1); cx.fillStyle = f.c; cx.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
    else { cx.strokeStyle = REAL[f.c].light; cx.globalAlpha = clamp(f.t / f.mt, 0, 1) * 0.8; cx.lineWidth = 3; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, TAU); cx.stroke(); cx.globalAlpha = 1; }
  }
  cx.textAlign = 'center';
  for (const t of G.tx) { cx.globalAlpha = clamp(t.t / 0.4, 0, 1); cx.font = '800 ' + t.size + 'px ' + FONT; cx.fillStyle = '#000'; cx.fillText(t.txt, t.x + 1.5, t.y + 1.5); cx.fillStyle = t.col; cx.fillText(t.txt, t.x, t.y); }
  cx.globalAlpha = 1;
}

function text(s, x, y, size, col, al, w) {
  cx.font = (w || 800) + ' ' + size + 'px ' + FONT; cx.textAlign = al || 'left'; cx.fillStyle = 'rgba(0,0,0,0.55)'; cx.fillText(s, x + 2, y + 2); cx.fillStyle = col; cx.fillText(s, x, y);
}

function drawHUD() {
  const p = G.p, R = REAL[G.w];
  for (let i = 0; i < p.maxhp; i++) {
    heartPath(26 + i * 28, 28, 9);
    if (i < p.hp) { cx.fillStyle = '#ff4d6d'; cx.fill(); } else { cx.strokeStyle = 'rgba(255,77,109,0.5)'; cx.lineWidth = 2; cx.stroke(); }
  }
  text('WAVE ' + G.wave, W / 2, 30, 22, '#fff', 'center');
  cx.fillStyle = 'rgba(255,255,255,0.15)'; cx.fillRect(W / 2 - 70, 38, 140, 5); cx.fillStyle = R.main; cx.fillRect(W / 2 - 70, 38, 140 * G.waveT / 25, 5);
  text(fmt(G.score), W - 20, 30, 24, '#fff', 'right');
  if (G.combo >= 3) text('x' + G.mult.toFixed(1) + '  COMBO ' + G.combo, W - 20, 54, 16, R.light, 'right');
  cx.fillStyle = 'rgba(255,255,255,0.12)'; cx.fillRect(0, H - 7, W, 7); cx.fillStyle = '#c8ff5e'; cx.fillRect(0, H - 7, W * clamp(G.xp / G.need, 0, 1), 7);
  text('LV ' + G.lvl, 12, H - 16, 14, '#c8ff5e');
  // world indicator
  cx.fillStyle = 'rgba(0,0,0,0.45)'; cx.fillRect(W - 200, H - 52, 188, 34);
  cx.strokeStyle = R.main; cx.lineWidth = 2; cx.strokeRect(W - 200, H - 52, 188, 34);
  text(R.name + ' WORLD', W - 106, H - 28, 16, R.main, 'center');
  const boss = G.en.find(e => e.type === 'boss' && e.spawnT <= 0);
  if (boss) {
    cx.fillStyle = 'rgba(0,0,0,0.5)'; cx.fillRect(W / 2 - 160, 56, 320, 12); cx.fillStyle = REAL[boss.r].main; cx.fillRect(W / 2 - 160, 56, 320 * Math.max(0, boss.hp / boss.mhp), 12);
    text('THE GLITCH', W / 2, 90, 14, '#fff', 'center');
  }
  if (G.forceWarn > 0 && Math.floor(anim * 12) % 2 === 0) text('REALITY UNSTABLE: SHIFTING IN ' + G.forceWarn.toFixed(1), W / 2, 120, 20, '#ffe14a', 'center');
  if (G.banner) { cx.globalAlpha = clamp(G.banner.t, 0, 1); text(G.banner.txt, W / 2, H / 2 - 120, 54, '#fff', 'center'); cx.globalAlpha = 1; }
  if (G.hint > 0 && G.state === 'play') {
    let h = '';
    const anySolid = G.en.some(e => e.spawnT <= 0 && e.r === G.w), anyGhost = G.en.some(e => e.spawnT <= 0 && e.r !== G.w);
    if (G.t < 6) h = 'WASD / ARROWS to move. Your gun fires by itself at enemies in YOUR world.';
    else if (!anySolid && anyGhost && G.shifts === 0) h = 'The others are ghosts in the other world: press SPACE / SHIFT to shift!';
    else if (G.shifts < 4) h = 'Shift to dodge things and to reach the other world\'s enemies. Shifting blasts nearby foes.';
    if (h) { cx.globalAlpha = clamp(G.hint, 0, 1); text(h, W / 2, H - 70, 18, '#fff', 'center'); cx.globalAlpha = 1; }
  }
  if (touch.on) {
    if (touch.stick) { cx.strokeStyle = 'rgba(255,255,255,0.3)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(touch.stick.ox, touch.stick.oy, 50, 0, TAU); cx.stroke(); cx.fillStyle = 'rgba(255,255,255,0.35)'; cx.beginPath(); cx.arc(touch.stick.ox + touch.sx * 50, touch.stick.oy + touch.sy * 50, 20, 0, TAU); cx.fill(); }
    else text('drag = move', 90, H - 90, 16, 'rgba(255,255,255,0.4)', 'center');
    text('TAP RIGHT = SHIFT', W - 120, H - 90, 16, 'rgba(255,255,255,0.4)', 'center');
  }
}

function cardRect(i) { return { x: 105 + i * 265, y: 170, w: 230, h: 300 }; }
function cardAt(q) { for (let i = 0; i < G.cards.length; i++) { const c = cardRect(i); if (q.x >= c.x && q.x <= c.x + c.w && q.y >= c.y && q.y <= c.y + c.h) return i; } return -1; }

function drawLevelUp() {
  cx.fillStyle = 'rgba(5,0,12,0.78)'; cx.fillRect(0, 0, W, H);
  text('LEVEL UP!', W / 2, 110, 46, '#c8ff5e', 'center');
  text('pick one (click or press 1 / 2 / 3)', W / 2, 145, 16, '#fff', 'center', 600);
  const hov = cardAt(mouse);
  G.cards.forEach((u, i) => {
    const c = cardRect(i), k = ease(G.cardT * 4 - i * 0.25), R = REAL[i % 2];
    cx.save(); cx.translate(c.x + c.w / 2, c.y + c.h / 2 + (1 - k) * 60); cx.globalAlpha = k;
    const s = hov === i ? 1.05 : 1; cx.scale(s, s);
    cx.fillStyle = '#12061c'; cx.strokeStyle = hov === i ? '#fff' : R.main; cx.lineWidth = 4;
    cx.beginPath(); cx.rect(-c.w / 2, -c.h / 2, c.w, c.h); cx.fill(); cx.stroke();
    halo(0, -50, 90, R.rgb, 0.8);
    cx.font = '64px ' + FONT; cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.fillText(u.ic, 0, -30);
    text(u.name, 0, 30, 20, R.light, 'center');
    cx.font = '600 15px ' + FONT; cx.fillStyle = '#ddd'; wrap(u.desc, 0, 62, c.w - 30, 20);
    const lv = G.up[u.id] || 0;
    for (let j = 0; j < u.max; j++) { cx.fillStyle = j < lv ? '#c8ff5e' : (j === lv ? '#ffffff' : 'rgba(255,255,255,0.2)'); cx.fillRect(-u.max * 9 + j * 18, 118, 14, 6); }
    text(String(i + 1), -c.w / 2 + 16, -c.h / 2 + 28, 20, 'rgba(255,255,255,0.5)');
    cx.restore();
  });
}
function wrap(s, x, y, maxW, lh) {
  const words = s.split(' '); let line = '';
  cx.textAlign = 'center';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (cx.measureText(t).width > maxW && line) { cx.fillText(line, x, y); y += lh; line = w; } else line = t; }
  cx.fillText(line, x, y);
}

function drawDead() {
  const k = ease(G.deadT * 2);
  cx.fillStyle = 'rgba(5,0,12,' + (0.75 * k).toFixed(2) + ')'; cx.fillRect(0, 0, W, H);
  cx.globalAlpha = k;
  cx.font = '900 72px ' + FONT; cx.textAlign = 'center';
  cx.fillStyle = REAL[1].main; cx.fillText('SHIFTED OUT', W / 2 - 4, 190); cx.fillStyle = REAL[0].main; cx.fillText('SHIFTED OUT', W / 2 + 4, 190); cx.fillStyle = '#fff'; cx.fillText('SHIFTED OUT', W / 2, 190);
  text('SCORE ' + fmt(G.score), W / 2, 270, 40, '#fff', 'center');
  text(G.newBest ? 'NEW BEST!' : 'best ' + fmt(save.best), W / 2, 308, 22, G.newBest ? '#c8ff5e' : '#bbb', 'center');
  text('wave ' + G.wave + '   ·   ' + G.kills + ' kills   ·   ' + G.shifts + ' shifts', W / 2, 350, 20, '#ddd', 'center', 600);
  if (G.deadT > 0.6) text(Math.floor(anim * 2) % 2 ? 'CLICK or press R / ENTER to try again' : '', W / 2, 430, 22, '#fff', 'center');
  cx.globalAlpha = 1;
}

// title screen: demo enemies drifting, world flips every few seconds
const demo = Array.from({ length: 16 }, (_, i) => ({ type: ['grunt', 'dasher', 'splitter', 'shooter', 'mini'][i % 5], r: i % 2, x: rnd(0, W), y: rnd(0, H), vx: rnd(-30, 30), vy: rnd(-30, 30), rad: [12, 12, 19, 13, 8][i % 5], ang: rnd(0, 6), spawnT: 0, flash: 0, ph: rnd(0, 6), hp: 1, mhp: 1, st: 0, dx: 0, dy: 0 }));
function drawTitle() {
  const cyc = 2.4, ph = titleT / cyc, v = Math.floor(ph) % 2, k = (ph % 1) * cyc;
  const saveP = { x: G.p.x, y: G.p.y };
  G.p.x = W / 2; G.p.y = H / 2;
  demo.forEach(e => { e.x += e.vx * 0.016; e.y += e.vy * 0.016; e.ang += 0.016; if (e.x < 0 || e.x > W) e.vx *= -1; if (e.y < 0 || e.y > H) e.vy *= -1; });
  if (k < 0.5 && titleT > cyc) {
    drawBG(v ^ 1); demo.forEach(e => drawEnemy(e, v ^ 1));
    cx.save(); cx.beginPath(); cx.arc(W / 2, H / 2, ease(k / 0.5) * 900, 0, TAU); cx.clip(); drawBG(v); demo.forEach(e => drawEnemy(e, v)); cx.restore();
  } else { drawBG(v); demo.forEach(e => drawEnemy(e, v)); }
  G.p.x = saveP.x; G.p.y = saveP.y;
  cx.fillStyle = 'rgba(5,0,12,0.45)'; cx.fillRect(0, 0, W, H);
  cx.font = '900 128px ' + FONT; cx.textAlign = 'center';
  const j = Math.sin(titleT * 30) > 0.97 ? rnd(-8, 8) : 0;
  cx.globalCompositeOperation = 'lighter';
  cx.fillStyle = REAL[0].main; cx.fillText('SHIFT', W / 2 - 5 + j, 215); cx.fillStyle = REAL[1].main; cx.fillText('SHIFT', W / 2 + 5 - j, 215);
  cx.globalCompositeOperation = 'source-over'; cx.fillStyle = '#fff'; cx.fillText('SHIFT', W / 2, 215);
  text('H A P P E N S', W / 2, 262, 38, REAL[v].light, 'center');
  text('Two worlds. Every enemy lives in one of them.', W / 2, 330, 22, '#fff', 'center', 700);
  text('You can only hurt, and be hurt by, enemies from the world you are in.', W / 2, 362, 19, '#ddd', 'center', 600);
  text('WASD / ARROWS: move (auto-fire)      SPACE / SHIFT / CLICK: SHIFT WORLDS', W / 2, 405, 18, '#fff', 'center', 700);
  if (Math.floor(titleT * 2) % 2 === 0) text('CLICK or press any key to start', W / 2, 470, 28, REAL[v].main, 'center');
  text(save.best ? 'best ' + fmt(save.best) + '  ·  wave ' + save.bestWave : 'Game Off 2026  ·  theme: SHIFT', W / 2, 520, 17, '#bbb', 'center', 600);
  text('M = mute', W - 14, H - 14, 13, '#888', 'right', 600);
}

function render() {
  cx.setTransform(K, 0, 0, K, 0, 0);
  if (G.state === 'title') { drawTitle(); return; }
  cx.save();
  if (G.shake > 0.4) cx.translate(rnd(-G.shake, G.shake) * 0.6, rnd(-G.shake, G.shake) * 0.6);
  if (G.wipe) {
    const k = ease(G.wipe.t / 0.45);
    drawScene(G.wipe.from);
    cx.save(); cx.beginPath(); cx.arc(G.wipe.x, G.wipe.y, k * 1100, 0, TAU); cx.clip(); drawScene(G.w); cx.restore();
    cx.strokeStyle = 'rgba(255,255,255,' + (1 - k).toFixed(2) + ')'; cx.lineWidth = 6; cx.beginPath(); cx.arc(G.wipe.x, G.wipe.y, k * 1100, 0, TAU); cx.stroke();
  } else drawScene(G.w);
  cx.restore();
  if (G.flash > 0) { cx.globalCompositeOperation = 'lighter'; cx.fillStyle = 'rgba(' + REAL[G.w].rgb + ',' + (G.flash * 1.2).toFixed(2) + ')'; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = 'source-over'; }
  if (G.hf > 0) { cx.fillStyle = 'rgba(255,40,70,' + (G.hf * 0.9).toFixed(2) + ')'; cx.fillRect(0, 0, W, H); }
  drawHUD();
  if (G.state === 'levelup') drawLevelUp();
  if (G.state === 'dead') drawDead();
  if (G.state === 'pause') { cx.fillStyle = 'rgba(5,0,12,0.7)'; cx.fillRect(0, 0, W, H); text('PAUSED', W / 2, H / 2, 64, '#fff', 'center'); text('press P or click to resume', W / 2, H / 2 + 44, 20, '#ddd', 'center', 600); }
}

// ───────────── input ─────────────
function startGame() { resetGame(); Snd.setWorld(0); }
function togglePause() {
  if (G.state === 'play') G.state = 'pause'; else if (G.state === 'pause') G.state = 'play';
}
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (!e.repeat) Snd.init();
  keys[k] = true;
  if (e.repeat) return;
  if (k === 'm') { Snd.setMuted(!save.muted); return; }
  if (G.state === 'title') { startGame(); return; }
  if (G.state === 'dead') { if (G.deadT > 0.6 && (k === 'r' || k === 'enter' || k === ' ')) startGame(); return; }
  if (G.state === 'levelup') { const i = '123'.indexOf(k); if (i >= 0 && i < G.cards.length) chooseCard(i); return; }
  if (k === 'p' || k === 'escape') { togglePause(); return; }
  if (G.state === 'play' && (k === ' ' || k === 'shift' || k === 'e' || k === 'f')) doShift();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G.state === 'play') G.state = 'pause'; });
cv.addEventListener('contextmenu', e => e.preventDefault());
function toW(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); Snd.init(); try { cv.focus(); window.focus(); } catch (er) {}
  const q = toW(e); mouse.x = q.x; mouse.y = q.y;
  if (e.pointerType === 'touch') touch.on = true;
  if (G.state === 'title') { startGame(); return; }
  if (G.state === 'dead') { if (G.deadT > 0.6) startGame(); return; }
  if (G.state === 'levelup') { const i = cardAt(q); if (i >= 0) chooseCard(i); return; }
  if (G.state === 'pause') { G.state = 'play'; return; }
  if (e.pointerType === 'touch') {
    if (q.x < W * 0.5 && !touch.stick) { touch.stick = { id: e.pointerId, ox: q.x, oy: q.y }; touch.sx = touch.sy = 0; try { cv.setPointerCapture(e.pointerId); } catch (er) {} }
    else doShift();
  } else doShift();
});
cv.addEventListener('pointermove', e => {
  const q = toW(e); mouse.x = q.x; mouse.y = q.y;
  if (touch.stick && touch.stick.id === e.pointerId) {
    const dx = q.x - touch.stick.ox, dy = q.y - touch.stick.oy, d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / 50);
    touch.sx = dx / d * m; touch.sy = dy / d * m;
  }
});
const endPtr = e => { if (touch.stick && touch.stick.id === e.pointerId) { touch.stick = null; touch.sx = touch.sy = 0; } };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);

// ───────────── canvas sizing + main loop ─────────────
let K = 1;
function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H), px = window.devicePixelRatio || 1;
  cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
  cv.width = Math.floor(W * s * px); cv.height = Math.floor(H * s * px); K = cv.width / W;
}
window.addEventListener('resize', resize); resize();
let last = performance.now();
function frame(ts) {
  const dt = clamp((ts - last) / 1000 || 0, 0, 0.1); last = ts;
  step(dt); render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__SH = { G, step, render, makeEnemy, spawnEnemy, spawnBoss, doShift, hurtEnemy, killEnemy, hurtPlayer, levelUp, chooseCard, startGame, keys, UPS, REAL, ETYPES, save, Snd, eshot, target, W, H, resize };
})();
