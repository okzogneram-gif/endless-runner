(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const bestEl = document.getElementById('best');
  const startScreen = document.getElementById('start-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const finalScoreEl = document.getElementById('final-score');
  const newBestEl = document.getElementById('new-best');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const muteBtn = document.getElementById('mute-btn');

  const STORAGE_KEY = 'endless-run-best';
  const MUTE_KEY = 'endless-run-muted';

  let audioCtx = null;
  let masterGain = null;
  let muted = localStorage.getItem(MUTE_KEY) === '1';

  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 0.35;
    masterGain.connect(audioCtx.destination);
  }

  function setMuted(next) {
    muted = next;
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
    if (masterGain) masterGain.gain.value = next ? 0 : 0.35;
    muteBtn.textContent = next ? 'SOUND OFF' : 'SOUND ON';
    if (next) {
      bgmPlayer.stop();
      mysticalBgmPlayer.stop();
      stopGameOverMusic();
    } else if (state === State.PLAYING || state === State.FALLING) {
      if (mysticalBg) mysticalBgmPlayer.start();
      else bgmPlayer.start();
    } else if (state === State.OVER) {
      gameOverPlayer.start();
    }
  }

  function playTone(freq, start, dur, type, gain, glideTo) {
    if (!audioCtx || muted) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }

  function playJumpSfx() {
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playTone(320, t, 0.16, 'square', 0.22, 680);
  }

  function playCoinSfx() {
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playTone(988, t, 0.09, 'square', 0.18);
    playTone(1319, t + 0.06, 0.16, 'square', 0.22);
  }

  function playStarSfx() {
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const notes = [523, 659, 784, 1047, 1319];
    for (let i = 0; i < notes.length; i++) {
      playTone(notes[i], t + i * 0.05, 0.12, 'triangle', 0.24);
    }
    playTone(1760, t + 0.30, 0.20, 'sine', 0.20, 2600);
  }

  function playFireStarSfx() {
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playNoiseBurst(t, 0.20, 0.25, 800);
    playTone(180, t, 0.35, 'sawtooth', 0.30, 60);
    playTone(360, t + 0.10, 0.25, 'sawtooth', 0.28, 900);
    playTone(720, t + 0.25, 0.20, 'square', 0.22, 1400);
  }

  function playDestroySfx() {
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playNoiseBurst(t, 0.12, 0.30, 1400);
    playTone(140, t, 0.18, 'sawtooth', 0.28, 50);
  }

  function playHorseSfx() {
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playTone(880, t, 0.10, 'sawtooth', 0.28, 220);
    playTone(660, t + 0.10, 0.14, 'sawtooth', 0.24, 180);
    playTone(440, t + 0.24, 0.20, 'sawtooth', 0.22, 120);
    for (let i = 0; i < 4; i++) {
      playNoiseBurst(t + 0.30 + i * 0.09, 0.05, 0.18, 300);
    }
  }

  function playHoofBeat() {
    ensureAudio();
    if (!audioCtx) return;
    playNoiseBurst(audioCtx.currentTime, 0.04, 0.15, 400);
  }

  // ★ ユニコーン進化効果音
  function playUnicornSfx() {
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
    for (let i = 0; i < notes.length; i++) {
      playTone(notes[i], t + i * 0.07, 0.20, 'sine', 0.20);
    }
    playTone(2637, t + 0.55, 0.40, 'sine', 0.18, 3520);
    playNoiseBurst(t + 0.1, 0.5, 0.08, 3000);
  }

  // ★ 神秘的背景切替効果音
  function playMysticalSfx() {
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playTone(220, t, 0.6, 'sine', 0.12, 440);
    playTone(330, t + 0.2, 0.6, 'triangle', 0.10, 660);
    playTone(440, t + 0.4, 0.6, 'sine', 0.08, 880);
    playTone(880, t + 0.7, 0.8, 'sine', 0.14, 1760);
    playNoiseBurst(t, 0.8, 0.04, 2000);
  }

  function triggerHorseMode() {
    horseRemaining = HORSE_DURATION;
    starFlash = Math.max(starFlash, 0.35);
    shake = Math.max(shake, 0.35);
    floatingTexts.push({
      text: `🐎 ${HORSE_COIN_THRESHOLD} COINS! HORSE RIDE!`,
      x: player.x + player.w / 2, y: player.y - player.h - 30,
      vy: -70, age: 0, life: 2.0,
      color: '#c68b4f', size: 26,
    });
    for (let i = 0; i < 30; i++) {
      spawnParticle(
        player.x + player.w * 0.5 + randRange(-30, 30),
        groundY - randRange(0, 20),
        'rgba(180,140,90,0.85)'
      );
    }
    playHorseSfx();
  }

  function playNoiseBurst(start, dur, gain, filterFreq) {
    if (!audioCtx || muted) return;
    const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = audioCtx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  function playCrashSfx() {
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playNoiseBurst(t, 0.16, 0.3, 1200);
    playTone(150, t, 0.24, 'square', 0.26, 45);
  }

  function playFallSfx() {
    ensureAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    playTone(520, t, 0.5, 'sawtooth', 0.16, 90);
  }

  function playGameOverJingle() {
    ensureAudio();
    if (!audioCtx) return 0;
    const t = audioCtx.currentTime;
    const notes = [392.0, 311.13, 261.63, 196.0];
    const noteDur = 0.22;
    notes.forEach((freq, i) => playTone(freq, t + i * noteDur, noteDur * 1.1, 'triangle', 0.16));
    return notes.length * noteDur;
  }

  function createLoopPlayer(melody, bass, stepDur, melodyType, bassType, melodyGain, bassGain, bassSustainSteps) {
    let stepIndex = 0;
    let nextStepTime = 0;
    let handle = null;

    function schedule() {
      if (!audioCtx || muted) return;
      const lookahead = 0.2;
      while (nextStepTime < audioCtx.currentTime + lookahead) {
        const i = stepIndex % melody.length;
        const mFreq = melody[i];
        if (mFreq) playTone(mFreq, nextStepTime, stepDur * 0.85, melodyType, melodyGain);
        const bFreq = bass[i];
        if (bFreq) playTone(bFreq, nextStepTime, stepDur * bassSustainSteps, bassType, bassGain);
        nextStepTime += stepDur;
        stepIndex++;
      }
    }

    return {
      start() {
        ensureAudio();
        if (!audioCtx || muted || handle) return;
        stepIndex = 0;
        nextStepTime = audioCtx.currentTime + 0.05;
        schedule();
        handle = setInterval(schedule, 100);
      },
      stop() {
        if (handle) { clearInterval(handle); handle = null; }
      },
      get playing() { return handle !== null; },
    };
  }

  const BGM_STEP = 60 / 128 / 2;
  const BGM_MELODY = [
    523.25, 659.25, 783.99, 659.25, 523.25, 659.25, 587.33, 659.25,
    523.25, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25,
  ];
  const BGM_BASS = [
    130.81, 0, 0, 0, 196.0, 0, 0, 0,
    130.81, 0, 0, 0, 146.83, 0, 196.0, 0,
  ];
  const bgmPlayer = createLoopPlayer(BGM_MELODY, BGM_BASS, BGM_STEP, 'triangle', 'square', 0.1, 0.1, 3.5);

  // ★ 神秘的BGM（1000m以降）
  const MYSTICAL_STEP = 60 / 72 / 2;
  const MYSTICAL_MELODY = [
    659.25, 0, 783.99, 0, 880.0, 0, 1046.5, 0,
    987.77, 0, 880.0, 0, 783.99, 0, 659.25, 0,
  ];
  const MYSTICAL_BASS = [
    110.0, 0, 0, 0, 146.83, 0, 0, 0,
    130.81, 0, 0, 0, 110.0, 0, 0, 0,
  ];
  const mysticalBgmPlayer = createLoopPlayer(
    MYSTICAL_MELODY, MYSTICAL_BASS, MYSTICAL_STEP,
    'sine', 'sine', 0.09, 0.08, 4.0
  );

  const GAMEOVER_STEP = 60 / 76 / 2;
  const GAMEOVER_MELODY = [349.23, 0, 0, 0, 293.66, 0, 261.63, 0];
  const GAMEOVER_BASS = [87.31, 0, 0, 0, 65.41, 0, 0, 0];
  const gameOverPlayer = createLoopPlayer(GAMEOVER_MELODY, GAMEOVER_BASS, GAMEOVER_STEP, 'triangle', 'triangle', 0.09, 0.07, 3.5);

  let gameOverLoopTimeout = null;

  function playGameOverSting() {
    bgmPlayer.stop();
    mysticalBgmPlayer.stop();
    gameOverPlayer.stop();
    if (gameOverLoopTimeout) { clearTimeout(gameOverLoopTimeout); gameOverLoopTimeout = null; }
    const jingleDur = playGameOverJingle();
    gameOverLoopTimeout = setTimeout(() => {
      gameOverLoopTimeout = null;
      gameOverPlayer.start();
    }, jingleDur * 1000 + 150);
  }

  function stopGameOverMusic() {
    if (gameOverLoopTimeout) { clearTimeout(gameOverLoopTimeout); gameOverLoopTimeout = null; }
    gameOverPlayer.stop();
  }

  muteBtn.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  muteBtn.addEventListener('click', () => setMuted(!muted));

  let W = 0, H = 0, DPR = 1;
  let groundY = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    groundY = H * 0.78;
  }
  window.addEventListener('resize', resize);
  resize();

  const GRAVITY = 2600;
  const JUMP_VELOCITY = 980;
  const T_APEX = JUMP_VELOCITY / GRAVITY;
  const T_JUMP = T_APEX * 2;

  const BASE_SPEED = 210;
  const MAX_SPEED = 760;
  const SPEED_RAMP_TIME = 28;

  const COIN_VALUE = 0;
  const BUG_FREQ = (Math.PI * 2) / 1.7;

  function jumpArcHeight(t) {
    return Math.max(0, JUMP_VELOCITY * t - 0.5 * GRAVITY * t * t);
  }

  const State = { START: 'start', PLAYING: 'playing', FALLING: 'falling', OVER: 'over' };
  let state = State.START;

  const FALL_DURATION = 1.2;
  const FALL_GRAVITY_MULT = 0.55;

  function fallFadeDepth() { return Math.max(70, (H - groundY) * 0.78); }
  function fallEndDepth() { return Math.max(90, (H - groundY) * 0.95); }

  let player, obstacles, coins, particles, clouds, hills;
  let speed, distance, coinsCollected, elapsed, spawnTimer, nextSpawnGap, fallTimer;
  let shake = 0;
  let floatingTexts = [];
  let starFlash = 0;
  let boostRemaining = 0;
  let boostElapsed = 0;
  let boostStreaks = [];
  let fireRemaining = 0;
  let fireEmitTimer = 0;
  let horseRemaining = 0;
  let horseAnimPhase = 0;
  let horseMilestone = 0;

  // ★ 進化・ステージ状態（一本化：isUnicornは使わない）
  let unicornStage = 0;   // 0:通常 / 1:ユニコーン(白馬+角) / 2:翼ユニコーン(角+羽)
  let mysticalBg = false;
  let mysticalStars = [];
  let unicornAuraPhase = 0;

  // 閾値（要件反映）
  const UNICORN_COIN_THRESHOLD = 100;    // 100枚でユニコーン（白馬+角）
  const PEGASUS_COIN_THRESHOLD = 150;    // 150枚で翼ユニコーン（角+羽+速度）
  const MYSTICAL_DISTANCE = 1000;        // 1000mで神秘背景

  // 翼ユニコーンの速度倍率
  const PEGASUS_SPEED_MULT = 1.25;

  const STAR_SHORTCUT = 100;
  const BOOST_METERS_PER_SEC = 80;
  const BOOST_SPEED_MULT = 8;
  const FIRE_DURATION = 6;
  const HORSE_DURATION = Infinity;
  const HORSE_COIN_THRESHOLD = 50;

  const CHARACTERS = [
    {
      id: 0, name: 'ケンジ', gender: 'male', hobby: '登山家',
      skin: '#c68642', hair: '#2c1a0e', hairStyle: 'short',
      shirt: '#4a7c59', pants: '#3b3b2f', boots: '#5c3a1e',
      hat: null, accessory: 'backpack',
    },
    {
      id: 1, name: 'アヤカ', gender: 'female', hobby: 'バレリーナ',
      skin: '#f5cba7', hair: '#1a1a1a', hairStyle: 'bun',
      shirt: '#e8b4c8', pants: '#f7cad0', boots: '#f0e0e8',
      hat: null, accessory: 'ribbon',
    },
    {
      id: 2, name: 'タロウ', gender: 'male', hobby: 'サムライ',
      skin: '#d4a574', hair: '#1a1a1a', hairStyle: 'topknot',
      shirt: '#2d2d4e', pants: '#1a1a2e', boots: '#1a1a1a',
      hat: 'kabuto', accessory: 'sword',
    },
    {
      id: 3, name: 'ミク', gender: 'female', hobby: 'カウガール',
      skin: '#e8b88a', hair: '#8b4513', hairStyle: 'ponytail',
      shirt: '#c8392b', pants: '#4a3728', boots: '#6b3a2a',
      hat: 'cowboy', accessory: 'lasso',
    },
    {
      id: 4, name: 'リョウ', gender: 'male', hobby: '騎士',
      skin: '#c8a882', hair: '#4a3728', hairStyle: 'short',
      shirt: '#708090', pants: '#5a6470', boots: '#3a3a3a',
      hat: 'helmet', accessory: 'shield',
    },
  ];
  let selectedCharacter = CHARACTERS[0];

  let sunAngle = 0;

  function resetGame() {
    player = {
      x: W * 0.18, y: groundY,
      w: 44, h: 58,
      vy: 0,
      ducking: false, grounded: true,
      legPhase: 0, fallRotation: 0, fallLean: 0,
      jumpsRemaining: 2,
    };
    obstacles = [];
    coins = [];
    particles = [];
    floatingTexts = [];
    starFlash = 0;
    boostRemaining = 0;
    boostElapsed = 0;
    boostStreaks = [];
    fireRemaining = 0;
    fireEmitTimer = 0;
    horseRemaining = 0;
    horseAnimPhase = 0;
    horseMilestone = 0;
    speed = BASE_SPEED;
    distance = 0;
    coinsCollected = 0;
    elapsed = 0;
    spawnTimer = 0;
    nextSpawnGap = randRange(1.3, 1.9);
    fallTimer = 0;
    shake = 0;

    // ★ 進化・ステージリセット
    unicornStage = 0;
    mysticalBg = false;
    unicornAuraPhase = 0;
    mysticalStars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * groundY * 0.95,
      r: Math.random() * 1.8 + 0.4,
      alpha: Math.random(),
      twinkleSpeed: Math.random() * 3 + 1,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    clouds = Array.from({ length: 7 }, () => ({
      x: Math.random() * W,
      y: randRange(H * 0.04, H * 0.30),
      scale: randRange(0.5, 1.5),
      speed: randRange(8, 22),
      opacity: randRange(0.55, 0.92),
    }));
    hills = Array.from({ length: 6 }, (_, i) => ({
      x: i * (W / 4),
      w: randRange(160, 340),
      h: randRange(35, 100),
      colorIdx: i % 3,
    }));
  }

  function randRange(a, b) { return a + Math.random() * (b - a); }

  function currentScore() {
    return Math.floor(distance) + coinsCollected * COIN_VALUE;
  }

  function playerTop() { return player.ducking ? player.y - player.h * 0.5 : player.y - player.h; }
  function playerHeight() { return player.ducking ? player.h * 0.5 : player.h; }

  function spawnGroundBox(x) {
    const width = 30 + Math.random() * 34;
    const height = 40 + Math.random() * 60;
    const o = { type: 'ground', x, w: width, h: height, y: groundY };
    obstacles.push(o);
    return o;
  }

  function spawnFly(x) {
    const width = 46, height = 34;
    const flyHigh = Math.random() < 0.5;
    obstacles.push({
      type: 'fly', x, w: width, h: height,
      y: groundY - (flyHigh ? player.h + 6 : player.h * 0.55),
    });
  }

  function spawnBug(x) {
    const width = 32, height = 26;
    const midY = groundY - player.h * 0.55;
    const topY = groundY - player.h - 10;
    const centerY = (midY + topY) / 2;
    const amplitude = (midY - topY) / 2;
    obstacles.push({
      type: 'bug', x, w: width, h: height,
      centerY, amplitude,
      phase: Math.random() * Math.PI * 2,
      y: centerY,
    });
  }

  function spawnPit(x) {
    const width = 60 + Math.random() * 50;
    const o = { type: 'pit', x, w: width };
    obstacles.push(o);
    return o;
  }

  function spawnArcCoins(anchorX, tLo, tHi, count) {
    for (let i = 0; i < count; i++) {
      const f = count === 1 ? 0.5 : i / (count - 1);
      const t = tLo + (tHi - tLo) * f;
      const x = anchorX + speed * (t - T_APEX);
      coins.push({ x, y: groundY - jumpArcHeight(t), r: 10, collected: false, type: 'coin' });
    }
  }

  function spawnGroundCoins(startX, count) {
    const spacing = 40;
    const y = groundY - 26;
    for (let i = 0; i < count; i++) {
      coins.push({ x: startX + i * spacing, y, r: 10, collected: false, type: 'coin' });
    }
  }

  function spawnStar(anchorX) {
    const y = groundY - jumpArcHeight(T_APEX) - 60;
    coins.push({ x: anchorX, y, r: 16, collected: false, type: 'star', spin: 0 });
  }

  function spawnFireStar(anchorX) {
    const y = groundY - jumpArcHeight(T_APEX) * 0.7;
    coins.push({ x: anchorX, y, r: 16, collected: false, type: 'firestar', spin: 0 });
  }

  const SAFETY_BUFFER = 0.35;
  const PACE_FLOOR_MIN = 0.9;
  const PACE_FLOOR_MAX = 1.4;

  function paceFloor() {
    return randRange(PACE_FLOOR_MIN, PACE_FLOOR_MAX) * (BASE_SPEED / speed);
  }

  function spawnEncounter() {
    if (Math.random() < 0.05) {
      spawnStar(W + 40 + speed * T_APEX);
      return Math.max(paceFloor(), T_JUMP + SAFETY_BUFFER);
    }
    if (Math.random() < 0.04) {
      spawnFireStar(W + 40 + speed * T_APEX);
      return Math.max(paceFloor(), T_JUMP + SAFETY_BUFFER);
    }
    const roll = Math.random(), leadIn = W + 40;

    if (roll < 0.2) {
      const o = spawnGroundBox(leadIn);
      const anchor = o.x + o.w / 2;
      spawnArcCoins(anchor, T_APEX - T_JUMP * 0.2, T_APEX + T_JUMP * 0.2, 4);
      return Math.max(paceFloor(), T_APEX + T_JUMP * 0.2 + SAFETY_BUFFER);
    } else if (roll < 0.3) {
      spawnGroundBox(leadIn);
      return Math.max(paceFloor(), 0.5);
    } else if (roll < 0.42) {
      const o = spawnPit(leadIn);
      const anchor = o.x + o.w / 2;
      spawnArcCoins(anchor, T_APEX - T_JUMP * 0.35, T_APEX + T_JUMP * 0.35, 5);
      return Math.max(paceFloor(), T_APEX + T_JUMP * 0.35 + SAFETY_BUFFER);
    } else if (roll < 0.5) {
      spawnPit(leadIn);
      return Math.max(paceFloor(), 0.5);
    } else if (roll < 0.65) {
      spawnFly(leadIn);
      return Math.max(paceFloor(), 0.4);
    } else if (roll < 0.78) {
      spawnBug(leadIn);
      return Math.max(paceFloor(), 0.5);
    } else if (roll < 0.9) {
      const count = 4 + Math.floor(Math.random() * 3);
      spawnGroundCoins(leadIn, count);
      return Math.max(paceFloor(), (count * 40) / speed + SAFETY_BUFFER);
    } else {
      const anchor = leadIn + speed * T_APEX;
      spawnArcCoins(anchor, T_APEX - T_JUMP * 0.35, T_APEX + T_JUMP * 0.35, 5);
      return Math.max(paceFloor(), T_APEX + T_JUMP * 0.35 + SAFETY_BUFFER);
    }
  }

  function spawnParticle(x, y, color) {
    particles.push({
      x, y,
      vx: randRange(-60, 60),
      vy: randRange(-140, -40),
      life: 0.5, age: 0,
      r: randRange(2, 4),
      color: color || 'rgba(255,255,255,0.8)',
    });
  }

  function jump() {
    if (state !== State.PLAYING) return;
    if (player.ducking) return;
    if (player.jumpsRemaining <= 0) return;

    const isDoubleJump = !player.grounded;
    player.vy = -JUMP_VELOCITY * (isDoubleJump ? 0.85 : 1.0);
    player.grounded = false;
    player.jumpsRemaining -= 1;

    if (isDoubleJump) {
      for (let i = 0; i < 14; i++) {
        spawnParticle(
          player.x + player.w * 0.3 + randRange(-4, 4),
          player.y - 4,
          'rgba(120,200,255,0.9)'
        );
      }
    } else {
      for (let i = 0; i < 8; i++) spawnParticle(player.x + player.w * 0.3, groundY - 2);
    }
    playJumpSfx();
  }

  function setDuck(on) {
    if (state !== State.PLAYING) return;
    if (!player.grounded) return;
    player.ducking = on;
  }

  function collidesBox(o) {
    const pTop = playerTop();
    const pLeft = player.x + 6;
    const pRight = player.x + player.w - 10;
    const pBottom = player.y - 4;
    const pTopEdge = pTop + 4;
    return pRight > o.x && pLeft < o.x + o.w && pBottom > o.y - o.h && pTopEdge < o.y;
  }

  function pitUnderPlayer() {
    const pLeft = player.x + 12;
    const pRight = player.x + player.w - 12;
    return obstacles.find(o => o.type === 'pit' && pRight > o.x + 6 && pLeft < o.x + o.w - 6);
  }

  function startFalling() {
    state = State.FALLING;
    player.grounded = false;
    player.ducking = false;
    player.fallRotation = 0;
    player.fallLean = Math.random() < 0.5 ? -1 : 1;
    fallTimer = 0;
    shake = 8;
    for (let i = 0; i < 14; i++) {
      spawnParticle(
        player.x + player.w * 0.5 + randRange(-player.w * 0.4, player.w * 0.4),
        groundY - randRange(0, 6),
        'rgba(120,110,90,0.7)'
      );
    }
    playFallSfx();
  }

  function endGame() {
    state = State.OVER;
    const best = getBest();
    const score = currentScore();
    finalScoreEl.textContent = `${score} m`;
    if (score > best) {
      setBest(score);
      newBestEl.classList.remove('hidden');
    } else {
      newBestEl.classList.add('hidden');
    }
    bestEl.textContent = `BEST ${getBest()} m`;
    gameoverScreen.classList.remove('hidden');
    shake = 14;
    playGameOverSting();
  }

  function getBest() { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10); }
  function setBest(v) { localStorage.setItem(STORAGE_KEY, String(v)); }

  // ★ ユニコーン進化演出
  function showUnicornEvolution() {
    starFlash = Math.max(starFlash, 0.7);
    shake = Math.max(shake, 0.6);
    floatingTexts.push({
      text: (unicornStage >= 2) ? '🪽 PEGASUS UNICORN!' : '✨ UNICORN EVOLVED! ✨',
      x: player.x + player.w / 2,
      y: player.y - player.h - 40,
      vy: -80, age: 0, life: 2.5,
      color: '#c8a8ff', size: 32,
    });
    for (let i = 0; i < 60; i++) {
      const hue = Math.random() * 60 + 260;
      spawnParticle(
        player.x + player.w * 0.5 + randRange(-40, 40),
        player.y - player.h * 0.5 + randRange(-30, 10),
        `hsla(${hue}, 100%, 70%, 0.9)`
      );
    }
    playUnicornSfx();
  }

  // ★ 神秘的背景への切替演出
  function showMysticalTransition() {
    floatingTexts.push({
      text: '🌌 MYSTICAL WORLD 🌌',
      x: W / 2,
      y: H / 3,
      vy: -40, age: 0, life: 3.0,
      color: '#b8a0ff', size: 38,
    });
    playMysticalSfx();
    bgmPlayer.stop();
    mysticalBgmPlayer.start();
  }

  function update(dt) {
    elapsed += dt;
    sunAngle += dt * 0.04;

    speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * (1 - Math.exp(-elapsed / SPEED_RAMP_TIME));

    // ★ ユニコーンオーラアニメ更新
    if (unicornStage >= 1) unicornAuraPhase += dt * 3;

    // ★ 翼ユニコーン速度倍率
    const stageSpeedMult = (unicornStage >= 2) ? PEGASUS_SPEED_MULT : 1.0;

    let scrollSpeed = speed * stageSpeedMult;
    let distGain = (speed * stageSpeedMult * dt) / 50;

    if (boostRemaining > 0) {
      boostElapsed += dt;
      const boostMetersThisFrame = Math.min(boostRemaining, BOOST_METERS_PER_SEC * dt);
      distGain = boostMetersThisFrame;
      boostRemaining -= boostMetersThisFrame;
      scrollSpeed = speed * BOOST_SPEED_MULT;
      starFlash = Math.max(starFlash, 0.35);
      shake = Math.max(shake, 0.15);
      if (Math.random() < 0.9) {
        boostStreaks.push({
          x: W + 20, y: randRange(H * 0.15, H * 0.85),
          len: randRange(80, 220), w: randRange(1.5, 3.5),
          life: 0.35, age: 0,
          color: `hsla(${45 + Math.random() * 15}, 100%, ${70 + Math.random() * 15}%, 0.9)`,
        });
      }
      if (boostRemaining <= 0) { boostRemaining = 0; starFlash = 0.25; }
    }

    distance += distGain;
    scoreEl.textContent = `${currentScore()} m`;
    coinsEl.textContent = `COINS ${coinsCollected}`;

    // ★ 進化判定：100でユニコーン（stage=1）、150で翼ユニコーン（stage=2）
    if (unicornStage < 1 && coinsCollected >= UNICORN_COIN_THRESHOLD) {
      unicornStage = 1;
      showUnicornEvolution();
    }
    if (unicornStage < 2 && coinsCollected >= PEGASUS_COIN_THRESHOLD) {
      unicornStage = 2;
      showUnicornEvolution();
    }

    // ★ 神秘的背景切替判定（1000m）
    if (!mysticalBg && distance >= MYSTICAL_DISTANCE) {
      mysticalBg = true;
      showMysticalTransition();
    }

    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    if (player.y >= groundY) {
      const pit = pitUnderPlayer();
      // pitは「翼ユニコーンでも落下」（破壊対象外）という選択済み仕様
      if (pit && boostRemaining <= 0 && fireRemaining <= 0) { startFalling(); return; }
      player.y = groundY;
      player.vy = 0;
      if (!player.grounded) {
        for (let i = 0; i < 6; i++) spawnParticle(player.x + player.w * 0.3, groundY - 2);
      }
      player.grounded = true;
      player.jumpsRemaining = 2;
    }
    player.legPhase += dt * (player.grounded ? speed * 0.03 : 0);

    spawnTimer += dt;
    if (spawnTimer >= nextSpawnGap) { spawnTimer = 0; nextSpawnGap = spawnEncounter(); }

    for (const o of obstacles) {
      o.x -= scrollSpeed * dt;
      if (o.type === 'bug') { o.phase += dt * BUG_FREQ; o.y = o.centerY + Math.sin(o.phase) * o.amplitude; }
    }
    obstacles = obstacles.filter(o => !o.destroyed && o.x + o.w > -20);

    for (const c of coins) {
      c.x -= scrollSpeed * dt;
      if (c.type === 'star' || c.type === 'firestar') c.spin = (c.spin || 0) + dt * 1.6;
    }
    coins = coins.filter(c => !c.collected && c.x > -20);

    for (const t of floatingTexts) { t.age += dt; t.y += t.vy * dt; t.vy *= 0.98; }
    floatingTexts = floatingTexts.filter(t => t.age < t.life);

    if (starFlash > 0 && boostRemaining <= 0 && fireRemaining <= 0) starFlash = Math.max(0, starFlash - dt);

    for (const s of boostStreaks) { s.age += dt; s.x -= scrollSpeed * dt * 1.4; }
    boostStreaks = boostStreaks.filter(s => s.age < s.life && s.x + s.len > -20);

    if (horseRemaining > 0) {
      horseAnimPhase += dt * 12;
      if (Math.floor(elapsed * 4) !== Math.floor((elapsed - dt) * 4)) playHoofBeat();
      if (Math.random() < 0.6) {
        spawnParticle(
          player.x + player.w * 0.5 + randRange(-20, 20),
          groundY - randRange(-4, 10),
          'rgba(190,150,100,0.75)'
        );
      }
    }

    // ★ ユニコーン状態でのレインボーパーティクル
    if (unicornStage >= 1 && Math.random() < 0.4) {
      const hue = (unicornAuraPhase * 60) % 360;
      spawnParticle(
        player.x + player.w * 0.5 + randRange(-18, 18),
        player.y - player.h * (0.3 + Math.random() * 0.6),
        `hsla(${hue}, 100%, 70%, 0.85)`
      );
    }

    if (fireRemaining > 0) {
      fireRemaining = Math.max(0, fireRemaining - dt);
      fireEmitTimer += dt;
      while (fireEmitTimer > 0.025) {
        fireEmitTimer -= 0.025;
        const px = player.x + player.w * 0.5 + randRange(-16, 16);
        const py = player.y - player.h * (0.2 + Math.random() * 0.7);
        const hue = Math.random() * 40;
        particles.push({
          x: px, y: py,
          vx: randRange(-40, 40) - speed * 0.15,
          vy: randRange(-160, -60),
          r: randRange(3, 7),
          color: `hsla(${hue}, 100%, ${50 + Math.random() * 25}%, 0.95)`,
          age: 0, life: randRange(0.35, 0.7),
        });
      }
      starFlash = Math.max(starFlash, 0.22);
    }

    if (boostRemaining > 0) {
      /* skip collision */
    } else {
      for (const o of obstacles) {
        // 穴は衝突判定では扱わず、着地時 pitUnderPlayer() で落下させる
        if (o.type === 'pit') continue;

        if (collidesBox(o)) {
          // fireモードは従来通り
          if (fireRemaining > 0) {
            o.destroyed = true;
            shake = Math.max(shake, 0.32);
            const cx = o.x + o.w / 2, cy = o.y - o.h / 2;
            for (let i = 0; i < 28; i++) {
              spawnParticle(cx + randRange(-6, 6), cy + randRange(-8, 8),
                `hsla(${Math.random() * 40}, 100%, 60%, 0.95)`);
            }
            floatingTexts.push({ text: 'BURN!', x: cx, y: cy - 20, vy: -60, age: 0, life: 0.7, color: '#ff7043', size: 22 });
            playDestroySfx();
            continue;
          }

          // ★ 翼ユニコーン：pit以外の全障害物を破壊（ground / fly / bug）
          if (unicornStage >= 2) {
            o.destroyed = true;
            shake = Math.max(shake, 0.35);
            const cx = o.x + o.w / 2, cy = o.y - o.h / 2;
            for (let i = 0; i < 36; i++) {
              const hue = (performance.now() / 10 + i * 12) % 360;
              spawnParticle(cx + randRange(-10, 10), cy + randRange(-10, 10),
                `hsla(${hue}, 100%, 70%, 0.9)`);
            }
            floatingTexts.push({ text: '💥 BREAK!', x: cx, y: cy - 20, vy: -60, age: 0, life: 0.9, color: '#ffffff', size: 24 });
            playDestroySfx();
            continue;
          }

          // ★ ユニコーン（角のみ）：虫だけ破壊
          if (unicornStage >= 1 && o.type === 'bug') {
            o.destroyed = true;
            shake = Math.max(shake, 0.25);
            const cx = o.x + o.w / 2, cy = o.y - o.h / 2;
            for (let i = 0; i < 30; i++) {
              const hue = Math.random() * 60 + 260;
              spawnParticle(cx + randRange(-8, 8), cy + randRange(-8, 8),
                `hsla(${hue}, 100%, 70%, 0.95)`);
            }
            floatingTexts.push({ text: '💫 SMASH!', x: cx, y: cy - 20, vy: -65, age: 0, life: 0.9, color: '#c8a8ff', size: 24 });
            playDestroySfx();
            continue;
          }

          // 馬モードの ground 破壊は従来通り
          if (horseRemaining > 0 && o.type === 'ground') {
            o.destroyed = true;
            shake = Math.max(shake, 0.28);
            const cx = o.x + o.w / 2, cy = o.y - o.h / 2;
            for (let i = 0; i < 22; i++) {
              spawnParticle(cx + randRange(-6, 6), cy + randRange(-8, 8),
                Math.random() < 0.6 ? 'rgba(139,90,43,0.95)' : 'rgba(60,140,60,0.9)');
            }
            floatingTexts.push({ text: 'CRUSH!', x: cx, y: cy - 20, vy: -60, age: 0, life: 0.7, color: '#c68b4f', size: 22 });
            playDestroySfx();
            continue;
          }

          playCrashSfx();
          endGame();
          break;
        }
      }
    }

    if (state === State.PLAYING) {
      const pTop = playerTop(), pBottom = player.y;
      const pLeft = player.x, pRight = player.x + player.w;
      for (const c of coins) {
        if (c.collected) continue;
        let hit;
        if (boostRemaining > 0 && c.type !== 'star' && c.type !== 'firestar') {
          hit = c.x > pLeft - 500 && c.x < pRight + 40;
        } else {
          hit = c.x + c.r > pLeft && c.x - c.r < pRight && c.y + c.r > pTop && c.y - c.r < pBottom;
        }
        if (hit) {
          c.collected = true;
          if (c.type === 'star') {
            boostRemaining = STAR_SHORTCUT; boostElapsed = 0; starFlash = 0.5;
            shake = Math.max(shake, 0.45);
            floatingTexts.push({ text: `+${STAR_SHORTCUT}m BOOST!`, x: c.x, y: c.y, vy: -60, age: 0, life: 1.6, color: '#ffe066', size: 34 });
            for (let i = 0; i < 44; i++) spawnParticle(c.x, c.y, `hsla(${45 + Math.random() * 20}, 100%, 65%, 0.95)`);
            playStarSfx();
          } else if (c.type === 'firestar') {
            fireRemaining = FIRE_DURATION; starFlash = 0.5;
            shake = Math.max(shake, 0.5);
            floatingTexts.push({ text: '🔥 FIRE MODE!', x: c.x, y: c.y, vy: -70, age: 0, life: 1.8, color: '#ff5a3c', size: 36 });
            for (let i = 0; i < 60; i++) spawnParticle(c.x, c.y, `hsla(${Math.random() * 30}, 100%, 55%, 0.95)`);
            playFireStarSfx();
          } else {
            coinsCollected++;
            for (let i = 0; i < 6; i++) spawnParticle(c.x, c.y, 'rgba(255,213,74,0.9)');
            playCoinSfx();
            const milestone = Math.floor(coinsCollected / HORSE_COIN_THRESHOLD);
            if (milestone > horseMilestone) { horseMilestone = milestone; triggerHorseMode(); }
          }
        }
      }
    }

    for (const p of particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; }
    particles = particles.filter(p => p.age < p.life);

    for (const c of clouds) { c.x -= c.speed * dt; if (c.x < -120) c.x = W + 120; }
    for (const h of hills) {
      h.x -= speed * 0.18 * dt;
      if (h.x + h.w < 0) h.x += W + h.w + Math.random() * 200;
    }

    if (shake > 0) shake = Math.max(0, shake - dt * 40);
  }

  function updateFalling(dt) {
    fallTimer += dt;
    player.vy += GRAVITY * FALL_GRAVITY_MULT * dt;
    player.y += player.vy * dt;
    player.fallRotation += dt * 7 * player.fallLean;

    if (Math.random() < 0.55) {
      spawnParticle(
        player.x + player.w * 0.5 + randRange(-10, 10),
        Math.min(player.y - player.h * 0.3, groundY + 30),
        'rgba(150,140,120,0.55)'
      );
    }
    for (const p of particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; }
    particles = particles.filter(p => p.age < p.life);
    if (shake > 0) shake = Math.max(0, shake - dt * 20);
    if (fallTimer >= FALL_DURATION || player.y - groundY > fallEndDepth()) endGame();
  }

  // ★ drawBackground：通常 / 神秘的背景を切り替え
  function drawBackground() {
    if (mysticalBg) {
      drawMysticalBackground();
    } else {
      drawNormalBackground();
    }
  }

  function drawNormalBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0.00, '#1a3a6e');
    skyGrad.addColorStop(0.40, '#3a7bd5');
    skyGrad.addColorStop(0.75, '#7eb8e8');
    skyGrad.addColorStop(1.00, '#c8e8f8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, groundY);

    drawSun();

    const hazeGrad = ctx.createLinearGradient(0, groundY * 0.55, 0, groundY);
    hazeGrad.addColorStop(0, 'rgba(255,255,255,0)');
    hazeGrad.addColorStop(1, 'rgba(220,240,255,0.32)');
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, groundY * 0.55, W, groundY * 0.45);

    drawDistantHills();
    for (const c of clouds) drawCloud(c.x, c.y, c.scale, c.opacity);
    drawMidHills();
    drawGround();
  }

  // ★ 神秘的背景描画（1000m以降）
  function drawMysticalBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0.00, '#0a0018');
    skyGrad.addColorStop(0.35, '#1a0050');
    skyGrad.addColorStop(0.70, '#2d0060');
    skyGrad.addColorStop(1.00, '#3d1080');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, groundY);

    const now = performance.now() / 1000;
    for (const s of mysticalStars) {
      s.alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(now * s.twinkleSpeed + s.twinkleOffset));
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.r > 1.4) {
        ctx.strokeStyle = `rgba(255,255,220,${s.alpha * 0.5})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(s.x - s.r * 2.5, s.y);
        ctx.lineTo(s.x + s.r * 2.5, s.y);
        ctx.moveTo(s.x, s.y - s.r * 2.5);
        ctx.lineTo(s.x, s.y + s.r * 2.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawAurora(now);
    drawMoon();
    drawMysticalGround();

    const fogGrad = ctx.createLinearGradient(0, groundY * 0.80, 0, groundY + 20);
    fogGrad.addColorStop(0, 'rgba(120,60,200,0)');
    fogGrad.addColorStop(0.5, 'rgba(120,60,200,0.14)');
    fogGrad.addColorStop(1, 'rgba(80,20,160,0.28)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, groundY * 0.80, W, groundY * 0.20 + 20);

    drawMysticalHills();
    for (const c of clouds) drawMysticalCloud(c.x, c.y, c.scale, c.opacity * 0.6);
  }

  function drawAurora(now) {
    const auroraColors = [
      [0, 255, 180],
      [120, 80, 255],
      [255, 80, 200],
    ];
    for (let band = 0; band < 3; band++) {
      const [r, g, b] = auroraColors[band];
      const yBase = groundY * (0.22 + band * 0.12);
      const amp = groundY * 0.06;
      const phase = now * 0.4 + band * 2.1;

      ctx.save();
      ctx.globalAlpha = 0.12 + 0.05 * Math.sin(now + band);

      const grad = ctx.createLinearGradient(0, yBase - amp * 2, 0, yBase + amp * 2);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, yBase);
      for (let x = 0; x <= W; x += 12) {
        const y = yBase + Math.sin(x * 0.008 + phase) * amp
          + Math.sin(x * 0.013 + phase * 1.3) * amp * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, yBase + amp * 2);
      ctx.lineTo(0, yBase + amp * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMoon() {
    const mx = W * 0.80;
    const my = H * 0.10;
    const mr = Math.min(W, H) * 0.042;

    const moonGlow = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.5);
    moonGlow.addColorStop(0, 'rgba(200,180,255,0.30)');
    moonGlow.addColorStop(1, 'rgba(150,120,255,0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mx, my, mr * 3.5, 0, Math.PI * 2);
    ctx.fill();

    const moonGrad = ctx.createRadialGradient(mx - mr * 0.2, my - mr * 0.2, mr * 0.05, mx, my, mr);
    moonGrad.addColorStop(0, '#fffde8');
    moonGrad.addColorStop(0.6, '#e8d8ff');
    moonGrad.addColorStop(1, '#c0a0e0');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(160,120,200,0.18)';
    ctx.beginPath(); ctx.arc(mx + mr * 0.3, my + mr * 0.2, mr * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - mr * 0.25, my - mr * 0.1, mr * 0.14, 0, Math.PI * 2); ctx.fill();
  }

  function drawMysticalGround() {
    const dirtGrad = ctx.createLinearGradient(0, groundY, 0, H);
    dirtGrad.addColorStop(0, '#2a0840');
    dirtGrad.addColorStop(0.15, '#1a0530');
    dirtGrad.addColorStop(1, '#080010');
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(0, groundY, W, H - groundY);

    const grassGrad = ctx.createLinearGradient(0, groundY - 10, 0, groundY + 14);
    grassGrad.addColorStop(0, '#00ffb0');
    grassGrad.addColorStop(0.4, '#00a878');
    grassGrad.addColorStop(1, '#005040');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, groundY - 6, W, 18);

    ctx.shadowColor = '#00ffb0';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#80ffdc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY - 6);
    ctx.lineTo(W, groundY - 6);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawMysticalHills() {
    const hillColors = [
      ['#1a0040', '#2d0070'],
      ['#0a2040', '#0a3060'],
      ['#200040', '#400080'],
    ];
    for (const h of hills) {
      const ci = h.colorIdx ?? 0;
      const grad = ctx.createLinearGradient(h.x, groundY - h.h, h.x, groundY);
      grad.addColorStop(0, hillColors[ci][1]);
      grad.addColorStop(0.6, hillColors[ci][0]);
      grad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(h.x + h.w / 2, groundY, h.w / 2, h.h, 0, Math.PI, 0, true);
      ctx.fill();

      ctx.shadowColor = '#8060ff';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = 'rgba(180,100,255,0.30)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(h.x + h.w / 2, groundY, h.w * 0.48, h.h * 0.88, 0, Math.PI, 0, true);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function drawMysticalCloud(x, y, s, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    const cloudGrad = ctx.createRadialGradient(x, y - 4 * s, 2 * s, x, y + 6 * s, 28 * s);
    cloudGrad.addColorStop(0, 'rgba(200,180,255,0.9)');
    cloudGrad.addColorStop(0.6, 'rgba(160,120,220,0.7)');
    cloudGrad.addColorStop(1, 'rgba(100,60,180,0.3)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, 26 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 24 * s, y + 6 * s, 18 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 22 * s, y + 8 * s, 16 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 10 * s, y - 10 * s, 14 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSun() {
    const sx = W * 0.82;
    const sy = H * 0.08 + Math.sin(sunAngle) * H * 0.02;
    const r = Math.min(W, H) * 0.055;

    const corona = ctx.createRadialGradient(sx, sy, r * 0.3, sx, sy, r * 3.5);
    corona.addColorStop(0, 'rgba(255,240,180,0.30)');
    corona.addColorStop(0.5, 'rgba(255,210,100,0.10)');
    corona.addColorStop(1, 'rgba(255,180,60,0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 3.5, 0, Math.PI * 2);
    ctx.fill();

    const sunGrad = ctx.createRadialGradient(sx - r * 0.2, sy - r * 0.2, r * 0.05, sx, sy, r);
    sunGrad.addColorStop(0, '#fffde0');
    sunGrad.addColorStop(0.5, '#ffe680');
    sunGrad.addColorStop(1, '#ffb830');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDistantHills() {
    const layers = [
      { color: ['#5a8fbf', '#7fb0d8'], hScale: 0.18, offset: W * 0.05 },
      { color: ['#4a7a6e', '#6aa490'], hScale: 0.14, offset: W * 0.15 },
      { color: ['#3d6b52', '#5d9472'], hScale: 0.10, offset: W * 0.30 },
    ];
    layers.forEach(({ color, hScale, offset }) => {
      const grad = ctx.createLinearGradient(0, groundY * (1 - hScale * 1.6), 0, groundY);
      grad.addColorStop(0, color[0]);
      grad.addColorStop(1, color[1]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-10, groundY);
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const rx = (i / steps) * (W + 20) - 10;
        const ry = groundY - Math.sin((i / steps + offset / W) * Math.PI * 2.5) * groundY * hScale
          - Math.sin((i / steps * 1.7 + offset / W * 0.5) * Math.PI * 3.1) * groundY * hScale * 0.4;
        ctx.lineTo(rx, ry);
      }
      ctx.lineTo(W + 10, groundY);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawMidHills() {
    const hillColors = [
      ['#2e5c38', '#4a8a54'],
      ['#336640', '#509660'],
      ['#274d30', '#3d7248'],
    ];
    for (const h of hills) {
      const ci = h.colorIdx ?? 0;
      const grad = ctx.createLinearGradient(h.x, groundY - h.h, h.x, groundY);
      grad.addColorStop(0, hillColors[ci][1]);
      grad.addColorStop(0.6, hillColors[ci][0]);
      grad.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(h.x + h.w / 2, groundY, h.w / 2, h.h, 0, Math.PI, 0, true);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,200,100,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(h.x + h.w / 2, groundY, h.w * 0.42, h.h * 0.85, 0, Math.PI, 0, true);
      ctx.stroke();
    }
  }

  function drawGround() {
    const dirtGrad = ctx.createLinearGradient(0, groundY, 0, H);
    dirtGrad.addColorStop(0, '#7a5c3a');
    dirtGrad.addColorStop(0.12, '#5e4428');
    dirtGrad.addColorStop(1, '#2e1e0e');
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(0, groundY, W, H - groundY);

    const grassGrad = ctx.createLinearGradient(0, groundY - 10, 0, groundY + 14);
    grassGrad.addColorStop(0, '#7ec850');
    grassGrad.addColorStop(0.5, '#5aa83a');
    grassGrad.addColorStop(1, '#3d7a28');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, groundY - 6, W, 20);

    ctx.strokeStyle = '#a0e060';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY - 6);
    ctx.lineTo(W, groundY - 6);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,200,140,0.12)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, groundY + i * 10);
      ctx.lineTo(W, groundY + i * 10);
      ctx.stroke();
    }

    const shadowGrad = ctx.createLinearGradient(0, groundY + 12, 0, groundY + 30);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.28)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, groundY + 12, W, 18);
  }

  function drawCloud(x, y, s, opacity) {
    opacity = opacity ?? 0.85;
    ctx.save();
    ctx.globalAlpha = opacity;

    ctx.fillStyle = 'rgba(140,170,200,0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10 * s, 26 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 22 * s, y + 14 * s, 18 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 22 * s, y + 14 * s, 15 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const cloudGrad = ctx.createRadialGradient(x, y - 4 * s, 2 * s, x, y + 6 * s, 28 * s);
    cloudGrad.addColorStop(0, 'rgba(255,255,255,1.0)');
    cloudGrad.addColorStop(0.6, 'rgba(240,248,255,0.95)');
    cloudGrad.addColorStop(1, 'rgba(210,230,248,0.70)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, 26 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 24 * s, y + 6 * s, 18 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 22 * s, y + 8 * s, 16 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 10 * s, y - 10 * s, 14 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 8 * s, y - 8 * s, 12 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // =====================================================
  // drawPlayer：右向き統一 + ユニコーン対応版
  // =====================================================
  function drawPlayer() {
    const c = selectedCharacter;
    const onHorse = horseRemaining > 0;

    const x = player.x;
    const top = playerTop();
    const h = playerHeight();
    const w = player.w;
    const falling = state === State.FALLING;
    const fallDepth = falling ? Math.max(0, player.y - groundY) : 0;
    const fallAlpha = falling ? Math.max(0, 1 - fallDepth / fallFadeDepth()) : 1;
    const horseLift = onHorse ? -58 : 0;
    const scale = onHorse ? 0.82 : 1.0;

    ctx.save();
    ctx.translate(x + w / 2, player.y + horseLift);

    if (falling) { ctx.globalAlpha = fallAlpha; ctx.rotate(player.fallRotation); }
    ctx.scale(scale, scale);

    // ★ ユニコーンオーラ描画（プレイヤーの後ろに配置）
    if (unicornStage >= 1) {
      drawUnicornAura();
    }

    const bx = 0;
    const legSpread = onHorse ? 10 : 0;
    const bob = player.grounded ? Math.sin(player.legPhase) * 3 : 0;

    // 影
    ctx.fillStyle = 'rgba(20,20,20,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (player.ducking) {
      ctx.fillStyle = c.shirt;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h * 0.5, w, h * 0.5, 4);
      ctx.fill();
      ctx.fillStyle = c.skin;
      ctx.beginPath();
      ctx.ellipse(w / 2 - 4, -h * 0.35, 12, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // ブーツ
      ctx.fillStyle = c.boots;
      ctx.beginPath(); ctx.roundRect(bx - 8 - legSpread, -16, 10, 16, 3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bx + 0 + legSpread, -16, 10, 16, 3); ctx.fill();
      ctx.fillStyle = lighten(c.boots, 30);
      ctx.fillRect(bx - 8 - legSpread, -4, 10, 3);
      ctx.fillRect(bx + 0 + legSpread, -4, 10, 3);

      // 脚（ズボン）
      ctx.fillStyle = c.pants;
      ctx.beginPath(); ctx.roundRect(bx - 8 - legSpread, -34 + bob, 9, 20, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bx + 1 + legSpread, -34 - bob, 9, 20, 2); ctx.fill();

      // 胴体（シャツ）
      ctx.fillStyle = c.shirt;
      ctx.beginPath(); ctx.roundRect(bx - 10, -54, 22, 22, 4); ctx.fill();
      ctx.fillStyle = darken(c.shirt, 30);
      ctx.fillRect(bx, -52, 2, 18);

      // 腕
      ctx.fillStyle = c.skin;
      ctx.beginPath(); ctx.roundRect(bx - 16, -52 + bob * 0.5, 7, 16, 3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bx + 11, -52 - bob * 0.5, 7, 16, 3); ctx.fill();

      // 首
      ctx.fillStyle = c.skin;
      ctx.beginPath(); ctx.roundRect(bx - 3, -62, 8, 10, 2); ctx.fill();

      // 頭
      ctx.fillStyle = c.skin;
      ctx.beginPath();
      ctx.ellipse(bx + 1, -72, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = darken(c.skin, 20);
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 目（★右向き：視線を右に）
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.ellipse(bx - 2, -73, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx + 7, -73, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      // ハイライト（右上）
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(bx - 1.2, -74, 0.8, 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx + 7.8, -74, 0.8, 0.8, 0, 0, Math.PI * 2); ctx.fill();

      // 鼻（右向きに少しずらし）
      ctx.fillStyle = darken(c.skin, 20);
      ctx.beginPath(); ctx.ellipse(bx + 2, -70, 1.5, 1, 0, 0, Math.PI * 2); ctx.fill();

      // 口（右向き）
      ctx.strokeStyle = darken(c.skin, 35);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(bx + 2, -67, 3, 0.2, Math.PI - 0.2); ctx.stroke();

      // 女性：まつげ
      if (c.gender === 'female') {
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(bx - 2 + i * 1.5, -75); ctx.lineTo(bx - 2 + i * 1.5, -77.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx + 7 + i * 1.5, -75); ctx.lineTo(bx + 7 + i * 1.5, -77.5); ctx.stroke();
        }
      }

      drawHairStyle(bx, c);
      if (c.hat) drawHat(bx, c);
      if (c.accessory) drawAccessory(bx, c, onHorse);

      // ★ ユニコーンの角
      if (unicornStage >= 1) {
        drawUnicornHorn(bx);
      }
    }

    ctx.restore();
  }

  function drawUnicornAura() {
    const rings = 3;
    for (let i = 0; i < rings; i++) {
      const hue = ((unicornAuraPhase * 60) + i * 120) % 360;
      const scale = 1.0 + i * 0.18 + Math.sin(unicornAuraPhase + i) * 0.04;
      const alpha = (0.22 - i * 0.06) * (0.7 + 0.3 * Math.sin(unicornAuraPhase * 1.5 + i));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
      ctx.lineWidth = 2.5 - i * 0.5;
      ctx.beginPath();
      ctx.ellipse(0, -36, 28 * scale, 42 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawUnicornHorn(bx) {
    const now = performance.now() / 1000;
    const hornGrad = ctx.createLinearGradient(bx + 4, -96, bx + 12, -78);
    hornGrad.addColorStop(0, '#ffffff');
    hornGrad.addColorStop(0.4, '#ffd0ff');
    hornGrad.addColorStop(1, '#c080ff');
    ctx.fillStyle = hornGrad;
    ctx.strokeStyle = 'rgba(180,100,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 8, -96);
    ctx.lineTo(bx + 3, -80);
    ctx.lineTo(bx + 13, -80);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,180,255,0.6)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const ty = -94 + i * 5;
      ctx.beginPath();
      ctx.moveTo(bx + 5 + i * 1.5, ty);
      ctx.lineTo(bx + 11 - i * 1.5, ty + 3);
      ctx.stroke();
    }

    const glowAlpha = 0.6 + 0.4 * Math.sin(now * 4);
    ctx.save();
    ctx.globalAlpha = glowAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff80ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(bx + 8, -97, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawHairStyle(bx, c) {
    ctx.fillStyle = c.hair;
    ctx.strokeStyle = darken(c.hair, 20);
    ctx.lineWidth = 0.8;

    switch (c.hairStyle) {
      case 'short':
        ctx.beginPath();
        ctx.ellipse(bx + 1, -76, 11, 10, 0, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx - 8, -72, 4, 7, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + 10, -72, 4, 7, 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bun':
        ctx.beginPath();
        ctx.ellipse(bx + 1, -79, 9, 8, 0, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + 1, -84, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = lighten(c.hair, 20);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx + 1, -84, 4, Math.PI * 0.8, Math.PI * 1.6);
        ctx.stroke();
        break;

      case 'topknot':
        ctx.beginPath();
        ctx.ellipse(bx + 1, -77, 10, 8, 0, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(bx - 2, -90, 6, 14, 3);
        ctx.fill();
        ctx.fillStyle = '#8b6914';
        ctx.beginPath();
        ctx.ellipse(bx + 1, -80, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'ponytail':
        ctx.beginPath();
        ctx.ellipse(bx + 1, -77, 10, 9, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = c.hair;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx - 8, -74);
        ctx.bezierCurveTo(bx - 18, -66, bx - 16, -52, bx - 10, -44);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.strokeStyle = lighten(c.hair, 25);
        ctx.beginPath();
        ctx.moveTo(bx - 8, -73);
        ctx.bezierCurveTo(bx - 17, -65, bx - 15, -52, bx - 9, -44);
        ctx.stroke();
        break;

      default:
        ctx.beginPath();
        ctx.ellipse(bx + 1, -76, 11, 10, 0, Math.PI, 0);
        ctx.fill();
        break;
    }
  }

  function drawHat(bx, c) {
    switch (c.hat) {
      case 'kabuto': {
        const kColor = '#2a2a3e';
        const kHL = '#4a4a6e';
        ctx.fillStyle = kColor;
        ctx.beginPath();
        ctx.moveTo(bx - 14, -78);
        ctx.lineTo(bx - 16, -70);
        ctx.lineTo(bx + 18, -70);
        ctx.lineTo(bx + 16, -78);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = kColor;
        ctx.strokeStyle = kHL;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(bx + 1, -82, 13, 10, 0, Math.PI, 0);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c8a820';
        ctx.beginPath();
        ctx.moveTo(bx - 1, -92);
        ctx.lineTo(bx + 3, -92);
        ctx.lineTo(bx + 4, -84);
        ctx.lineTo(bx - 2, -84);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(bx - 3, -86, 5, 3, -0.4, 0, Math.PI);
        ctx.stroke();
        break;
      }

      case 'cowboy': {
        const brim = '#8b4513';
        ctx.fillStyle = brim;
        ctx.strokeStyle = darken(brim, 30);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(bx + 1, -82, 18, 4, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx - 10, -82);
        ctx.bezierCurveTo(bx - 11, -98, bx + 13, -98, bx + 12, -82);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#3a1a00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx - 10, -84);
        ctx.lineTo(bx + 12, -84);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,200,150,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - 6, -94);
        ctx.bezierCurveTo(bx - 4, -98, bx + 4, -98, bx + 6, -94);
        ctx.stroke();
        break;
      }

      case 'helmet': {
        const hColor = '#6a7a8a';
        const hHL = '#9aabb8';
        ctx.fillStyle = hColor;
        ctx.strokeStyle = darken(hColor, 30);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(bx + 1, -80, 13, 13, 0, Math.PI, 0);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = darken(hColor, 20);
        ctx.beginPath();
        ctx.roundRect(bx - 10, -80, 22, 8, [0, 0, 4, 4]);
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(bx - 7 + i * 5, -78);
          ctx.lineTo(bx - 7 + i * 5, -74);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(bx - 3, -86, 6, 4, -0.3, 0, Math.PI);
        ctx.stroke();
        break;
      }
    }
  }

  function drawAccessory(bx, c, onHorse) {
    switch (c.accessory) {
      case 'backpack': {
        ctx.fillStyle = darken(c.shirt, 40);
        ctx.strokeStyle = darken(c.shirt, 60);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(bx + 10, -50, 10, 18, 3);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = darken(c.shirt, 50);
        ctx.beginPath();
        ctx.roundRect(bx + 11, -40, 8, 7, 2);
        ctx.fill();
        ctx.strokeStyle = darken(c.shirt, 55);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + 10, -48);
        ctx.bezierCurveTo(bx + 5, -50, bx + 2, -48, bx + 2, -44);
        ctx.stroke();
        break;
      }

      case 'ribbon': {
        ctx.fillStyle = '#ff6699';
        ctx.strokeStyle = '#cc3366';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(bx - 2, -82);
        ctx.bezierCurveTo(bx - 10, -88, bx - 12, -82, bx - 2, -80);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + 4, -82);
        ctx.bezierCurveTo(bx + 12, -88, bx + 14, -82, bx + 4, -80);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff99bb';
        ctx.beginPath();
        ctx.arc(bx + 1, -81, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'sword': {
        ctx.strokeStyle = '#8a8a9a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx - 12, -42);
        ctx.lineTo(bx - 18, -20);
        ctx.stroke();
        ctx.strokeStyle = '#4a3010';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bx - 10, -46);
        ctx.lineTo(bx - 13, -38);
        ctx.stroke();
        ctx.fillStyle = '#c8a820';
        ctx.beginPath();
        ctx.ellipse(bx - 11, -41, 5, 2, -0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'lasso': {
        ctx.strokeStyle = '#8b5e3c';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(bx + 16, -38 + i * 3, 6 - i, 3 - i * 0.5, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(bx + 12, -40);
        ctx.lineTo(bx + 11, -50);
        ctx.stroke();
        break;
      }

      case 'shield': {
        ctx.fillStyle = '#708090';
        ctx.strokeStyle = '#3a3a4a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(bx - 18, -52);
        ctx.bezierCurveTo(bx - 24, -52, bx - 26, -38, bx - 18, -30);
        ctx.bezierCurveTo(bx - 12, -38, bx - 12, -52, bx - 18, -52);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#c8a820';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - 18, -48);
        ctx.lineTo(bx - 18, -34);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx - 24, -42);
        ctx.lineTo(bx - 12, -42);
        ctx.stroke();
        break;
      }
    }
  }

  function drawObstacles() {
    for (const o of obstacles) {
      if (o.destroyed) continue;
      if (o.type === 'ground') drawTree(o);
      else if (o.type === 'fly') drawFly(o);
      else if (o.type === 'bug') drawBug(o);
      else if (o.type === 'pit') drawPit(o);
    }
  }

  function drawTree(o) {
    const bw = Math.max(10, o.w * 0.28);
    const bx = o.x + o.w * 0.5 - bw / 2;
    const trunkH = o.h * 0.42;

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(o.x + o.w * 0.5 + 6, o.y + 4, bw * 0.6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const trunkGrad = ctx.createLinearGradient(bx, o.y - trunkH, bx + bw, o.y);
    trunkGrad.addColorStop(0, '#7a4e28');
    trunkGrad.addColorStop(0.4, '#5c3618');
    trunkGrad.addColorStop(1, '#3a2010');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.roundRect(bx, o.y - trunkH, bw, trunkH, [2, 2, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,120,60,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.25, o.y - trunkH + 4);
    ctx.lineTo(bx + bw * 0.25, o.y - 4);
    ctx.stroke();

    const leafCX = o.x + o.w * 0.5;
    const leafCY = o.y - trunkH - o.h * 0.32;
    const lw = o.w * 0.88;
    const lh = o.h * 0.64;

    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(leafCX + 5, leafCY + 8, lw * 0.52, lh * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    const leafGrad = ctx.createRadialGradient(leafCX - lw * 0.1, leafCY - lh * 0.2, lw * 0.05, leafCX, leafCY, lw * 0.6);
    leafGrad.addColorStop(0, '#7acc44');
    leafGrad.addColorStop(0.5, '#4a9c28');
    leafGrad.addColorStop(1, '#2d6018');
    ctx.fillStyle = leafGrad;
    ctx.beginPath();
    ctx.ellipse(leafCX, leafCY, lw * 0.50, lh * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(leafCX - lw * 0.28, leafCY + lh * 0.15, lw * 0.36, lh * 0.42, 0.3, 0, Math.PI * 2);
    ctx.ellipse(leafCX + lw * 0.28, leafCY + lh * 0.15, lw * 0.36, lh * 0.42, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,240,80,0.22)';
    ctx.beginPath();
    ctx.ellipse(leafCX - lw * 0.08, leafCY - lh * 0.18, lw * 0.24, lh * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // ★ ユニコーン状態では木に神秘的な光輪
    if (unicornStage >= 1) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(unicornAuraPhase * 2);
      ctx.strokeStyle = '#c0a0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#c0a0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(leafCX, leafCY, lw * 0.55, lh * 0.60, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  function drawFly(o) {
    const cx = o.x + o.w / 2, cy = o.y - o.h / 2;

    ctx.save();
    ctx.globalAlpha = 0.72;
    const wingGrad = ctx.createRadialGradient(cx, cy - 4, 1, cx, cy - 4, o.w * 0.38);
    wingGrad.addColorStop(0, 'rgba(200,230,255,0.9)');
    wingGrad.addColorStop(0.6, 'rgba(160,200,240,0.5)');
    wingGrad.addColorStop(1, 'rgba(100,160,220,0.1)');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy - 6, o.w * 0.30, o.h * 0.28, -0.3, 0, Math.PI * 2);
    ctx.ellipse(cx + 10, cy - 6, o.w * 0.30, o.h * 0.28, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const bodyGrad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, o.w * 0.36);
    bodyGrad.addColorStop(0, '#8a9db5');
    bodyGrad.addColorStop(0.5, '#4a5c78');
    bodyGrad.addColorStop(1, '#2a3448');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,40,80,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ff3030';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 3, 3, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBug(o) {
    const cx = o.x + o.w / 2, cy = o.y - o.h / 2;
    const wingFlap = Math.abs(Math.sin(o.phase * 4)) * 10;

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy - 8 - wingFlap * 0.2, 11, 5, -0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + 6, cy - 8 - wingFlap * 0.2, 11, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    const bugGrad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, o.w * 0.5);
    bugGrad.addColorStop(0, '#b060d0');
    bugGrad.addColorStop(0.6, '#7a28a0');
    bugGrad.addColorStop(1, '#460c6a');
    ctx.fillStyle = bugGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a0858';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = '#5c2678';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - o.h / 2); ctx.lineTo(cx - 10, cy - o.h / 2 - 8);
    ctx.moveTo(cx + 4, cy - o.h / 2); ctx.lineTo(cx + 10, cy - o.h / 2 - 8);
    ctx.stroke();

    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 2, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPit(o) {
    const depthGrad = ctx.createLinearGradient(0, groundY, 0, H);
    depthGrad.addColorStop(0, '#1a1a12');
    depthGrad.addColorStop(0.18, '#0e0e08');
    depthGrad.addColorStop(1, '#050503');
    ctx.fillStyle = depthGrad;
    ctx.fillRect(o.x, groundY, o.w, H - groundY);

    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(80,70,50,${0.18 - i * 0.03})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(o.x + 4, groundY + 20 + i * 14);
      ctx.lineTo(o.x + o.w - 4, groundY + 20 + i * 14);
      ctx.stroke();
    }

    const innerShadowL = ctx.createLinearGradient(o.x, 0, o.x + 22, 0);
    innerShadowL.addColorStop(0, 'rgba(0,0,0,0.55)');
    innerShadowL.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = innerShadowL;
    ctx.fillRect(o.x, groundY, 22, H - groundY);

    const innerShadowR = ctx.createLinearGradient(o.x + o.w, 0, o.x + o.w - 22, 0);
    innerShadowR.addColorStop(0, 'rgba(0,0,0,0.55)');
    innerShadowR.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = innerShadowR;
    ctx.fillRect(o.x + o.w - 22, groundY, 22, H - groundY);

    ctx.fillStyle = '#4a8c34';
    ctx.beginPath();
    ctx.moveTo(o.x, groundY - 6);
    ctx.lineTo(o.x + 14, groundY + 10);
    ctx.lineTo(o.x, groundY + 10);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(o.x + o.w, groundY - 6);
    ctx.lineTo(o.x + o.w - 14, groundY + 10);
    ctx.lineTo(o.x + o.w, groundY + 10);
    ctx.closePath();
    ctx.fill();

    const topShadow = ctx.createLinearGradient(0, groundY - 8, 0, groundY + 16);
    topShadow.addColorStop(0, 'rgba(0,0,0,0)');
    topShadow.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(o.x + 2, groundY - 8, o.w - 4, 24);
  }

  function drawCoins() {
    for (const c of coins) {
      if (c.collected) continue;
      if (c.type === 'star') drawStar(c);
      else if (c.type === 'firestar') drawFireStar(c);
      else drawCoin(c);
    }
  }

  function drawCoin(c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    const halo = ctx.createRadialGradient(0, 0, c.r * 0.5, 0, 0, c.r * 2.2);
    halo.addColorStop(0, 'rgba(255,220,60,0.35)');
    halo.addColorStop(1, 'rgba(255,200,40,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, c.r * 2.2, 0, Math.PI * 2); ctx.fill();
    const coinGrad = ctx.createRadialGradient(-c.r * 0.3, -c.r * 0.3, c.r * 0.05, 0, 0, c.r);
    coinGrad.addColorStop(0, '#fff0a0');
    coinGrad.addColorStop(0.4, '#ffd54a');
    coinGrad.addColorStop(1, '#c88a10');
    ctx.fillStyle = coinGrad;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b07808';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(-c.r * 0.3, -c.r * 0.3, c.r * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawStar(c) {
    const outer = c.r, inner = c.r * 0.42;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.spin || 0);
    const halo = ctx.createRadialGradient(0, 0, outer * 0.5, 0, 0, outer * 2.6);
    halo.addColorStop(0, 'rgba(255,240,120,0.55)');
    halo.addColorStop(1, 'rgba(255,240,120,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, outer * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffe066'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffb703'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(-outer * 0.35, -outer * 0.35, outer * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawFireStar(c) {
    const outer = c.r, inner = c.r * 0.42;
    const t = performance.now() / 1000;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.spin || 0);
    for (let ring = 0; ring < 2; ring++) {
      const wob = 1 + Math.sin(t * 8 + ring * 1.7) * 0.08;
      const halo = ctx.createRadialGradient(0, 0, outer * 0.4, 0, 0, outer * 2.8 * wob);
      halo.addColorStop(0, ring === 0 ? 'rgba(255,140,50,0.7)' : 'rgba(255,60,20,0.35)');
      halo.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, outer * 2.8 * wob, 0, Math.PI * 2); ctx.fill();
    }
    const bodyGrad = ctx.createLinearGradient(0, -outer, 0, outer);
    bodyGrad.addColorStop(0, '#ffb043');
    bodyGrad.addColorStop(0.6, '#ff5a3c');
    bodyGrad.addColorStop(1, '#c2185b');
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = bodyGrad; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#a01818'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(-outer * 0.35, -outer * 0.35, outer * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawFireEdgeGlow() {
    if (fireRemaining <= 0) return;
    const pulse = 0.55 + Math.sin(performance.now() / 90) * 0.15;
    const fade = fireRemaining >= 1 ? 1 : fireRemaining;
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(255,80,40,0)');
    g.addColorStop(1, `rgba(220,20,10,${0.55 * pulse * fade})`);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  function drawUnicornEdgeGlow() {
    if (unicornStage < 1) return;
    const pulse = 0.5 + 0.5 * Math.sin(unicornAuraPhase * 2);
    const hue = (unicornAuraPhase * 40) % 360;
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(200,160,255,0)');
    g.addColorStop(1, `hsla(${hue}, 100%, 70%, ${0.18 * pulse})`);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  function drawHorse() {
    if (horseRemaining <= 0) return;
    const fade = 1;
    const cx = player.x + player.w * 0.5;
    const groundLine = groundY;

    const feetY = player.y;
    const bodyCY = feetY - 40;
    const bodyCX = cx;

    const COAT = '#f7f7fb';
    const COAT_MID = '#dcdcea';
    const COAT_DARK = '#b8b8c8';
    const OUTLINE = '#2a2030';
    const MANE = (unicornStage >= 1) ? '#ffffff' : '#1c0d05';
    const HOOF = '#2a2a2a';
    const HOOF_HL = '#6a6a6a';
    const SKIN = '#f2c9a3';

    ctx.save();
    ctx.globalAlpha = fade;

    const jumpHeight = Math.max(0, -(player.y - groundY));
    const shadowAlpha = Math.max(0.08, 0.32 - jumpHeight * 0.003);
    const shadowScaleX = Math.max(0.4, 1 - jumpHeight * 0.006);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(bodyCX, groundLine + 2, 62 * shadowScaleX, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 後脚（左＝後方）
    drawHorseLeg(bodyCX - 30, bodyCX - 32, feetY, true, horseAnimPhase + 0.0, COAT_DARK, HOOF, HOOF_HL, OUTLINE);
    drawHorseLeg(bodyCX - 22, bodyCX - 24, feetY, true, horseAnimPhase + Math.PI, COAT_MID, HOOF, HOOF_HL, OUTLINE);

    // 胴体
    const bodyGrad = ctx.createLinearGradient(0, bodyCY - 18, 0, bodyCY + 18);
    bodyGrad.addColorStop(0, COAT);
    bodyGrad.addColorStop(0.6, COAT_MID);
    bodyGrad.addColorStop(1, COAT_DARK);
    ctx.fillStyle = bodyGrad; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bodyCX - 42, bodyCY - 4);
    ctx.bezierCurveTo(bodyCX - 42, bodyCY - 18, bodyCX + 20, bodyCY - 22, bodyCX + 40, bodyCY - 10);
    ctx.bezierCurveTo(bodyCX + 46, bodyCY - 2, bodyCX + 34, bodyCY + 16, bodyCX + 18, bodyCY + 18);
    ctx.bezierCurveTo(bodyCX, bodyCY + 22, bodyCX - 24, bodyCY + 18, bodyCX - 38, bodyCY + 14);
    ctx.bezierCurveTo(bodyCX - 46, bodyCY + 6, bodyCX - 48, bodyCY - 2, bodyCX - 42, bodyCY - 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // ★ 翼ユニコーンの羽（stage=2）：背中に描画（右向き）
    if (unicornStage >= 2) {
      const wingBaseX = bodyCX + 8;
      const wingBaseY = bodyCY - 18;
      const flap = Math.sin(horseAnimPhase * 0.9) * 6;

      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.shadowColor = 'rgba(200,180,255,0.65)';
      ctx.shadowBlur = 10;

      const wingGrad = ctx.createLinearGradient(wingBaseX - 10, wingBaseY - 30, wingBaseX + 40, wingBaseY + 20);
      wingGrad.addColorStop(0.0, 'rgba(255,255,255,0.95)');
      wingGrad.addColorStop(0.5, 'rgba(210,190,255,0.75)');
      wingGrad.addColorStop(1.0, 'rgba(140,110,255,0.25)');

      // 奥側
      ctx.fillStyle = wingGrad;
      ctx.strokeStyle = 'rgba(40,20,60,0.55)';
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(wingBaseX - 2, wingBaseY + 2);
      ctx.bezierCurveTo(
        wingBaseX + 10, wingBaseY - 18 - flap * 0.6,
        wingBaseX + 26, wingBaseY - 22 - flap,
        wingBaseX + 38, wingBaseY - 8 - flap * 0.4
      );
      ctx.bezierCurveTo(
        wingBaseX + 24, wingBaseY - 2,
        wingBaseX + 14, wingBaseY + 14,
        wingBaseX - 2, wingBaseY + 10
      );
      ctx.closePath();
      ctx.globalAlpha = 0.65;
      ctx.fill();
      ctx.stroke();

      // 手前
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(wingBaseX, wingBaseY);
      ctx.bezierCurveTo(
        wingBaseX + 14, wingBaseY - 22 - flap * 0.7,
        wingBaseX + 36, wingBaseY - 28 - flap,
        wingBaseX + 56, wingBaseY - 10 - flap * 0.4
      );
      ctx.bezierCurveTo(
        wingBaseX + 40, wingBaseY + 4,
        wingBaseX + 22, wingBaseY + 18,
        wingBaseX + 2, wingBaseY + 12
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // フェザー
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const sx = wingBaseX + 8 + t * 40;
        const sy = wingBaseY - 6 - t * (10 + flap * 0.3);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(
          sx + 10, sy + 4,
          sx + 16, sy + 14 + t * 6
        );
        ctx.stroke();
      }

      ctx.restore();
    }

    // 背中ハイライト
    ctx.strokeStyle = 'rgba(255,220,180,0.22)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bodyCX - 30, bodyCY - 14);
    ctx.bezierCurveTo(bodyCX - 5, bodyCY - 20, bodyCX + 20, bodyCY - 20, bodyCX + 34, bodyCY - 12);
    ctx.stroke();

    // 腹部ライン
    ctx.strokeStyle = 'rgba(60,40,20,0.65)'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bodyCX + 4, bodyCY - 20);
    ctx.bezierCurveTo(bodyCX + 6, bodyCY - 5, bodyCX + 6, bodyCY + 12, bodyCX + 4, bodyCY + 20);
    ctx.stroke();

    // 尻尾（左）
    const tailBaseX = bodyCX - 42, tailBaseY = bodyCY - 4;
    const tailSw = Math.sin(horseAnimPhase * 0.7) * 3;
    for (let i = 0; i < 10; i++) {
      const off = (i - 4.5) * 1.5;
      const sw = tailSw + Math.sin(horseAnimPhase * 0.6 + i * 0.4) * 1.5;
      ctx.strokeStyle = i % 2 === 0 ? MANE : '#0e0603';
      ctx.lineWidth = 2 + Math.random() * 0.5;
      ctx.beginPath();
      ctx.moveTo(tailBaseX + off * 0.4, tailBaseY);
      ctx.bezierCurveTo(
        tailBaseX - 12 + sw, tailBaseY + 4 + off,
        tailBaseX - 16 + sw, tailBaseY + 18 + off,
        tailBaseX - 12 + sw, tailBaseY + 26 + off * 0.6
      );
      ctx.stroke();
    }

    // 首（右）
    const neckBase = { x: bodyCX + 32, y: bodyCY - 12 };
    const neckTop = { x: bodyCX + 54, y: bodyCY - 40 };
    ctx.fillStyle = bodyGrad; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(neckBase.x, neckBase.y - 4);
    ctx.bezierCurveTo(bodyCX + 44, bodyCY - 32, bodyCX + 46, bodyCY - 42, neckTop.x, neckTop.y);
    ctx.lineTo(neckTop.x + 6, neckTop.y + 6);
    ctx.bezierCurveTo(bodyCX + 52, bodyCY - 26, bodyCX + 48, bodyCY - 14, neckBase.x + 4, neckBase.y + 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // 頭（右）
    const headTip = { x: bodyCX + 74, y: bodyCY - 32 };
    ctx.fillStyle = bodyGrad; ctx.strokeStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(neckTop.x + 2, neckTop.y - 4);
    ctx.bezierCurveTo(bodyCX + 62, bodyCY - 46, bodyCX + 70, bodyCY - 40, headTip.x, headTip.y);
    ctx.bezierCurveTo(bodyCX + 78, bodyCY - 28, bodyCX + 76, bodyCY - 22, bodyCX + 68, bodyCY - 22);
    ctx.bezierCurveTo(bodyCX + 62, bodyCY - 22, bodyCX + 58, bodyCY - 24, neckTop.x + 4, neckTop.y + 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = HOOF;
    ctx.beginPath(); ctx.ellipse(bodyCX + 72, bodyCY - 26, 1.6, 2.2, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bodyCX + 60, bodyCY - 38, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(bodyCX + 60.6, bodyCY - 37.6, 1.5, 0, Math.PI * 2); ctx.fill();

    // 耳
    for (const dx of [50, 56]) {
      ctx.fillStyle = COAT_MID; ctx.strokeStyle = OUTLINE;
      ctx.beginPath();
      ctx.moveTo(bodyCX + dx, bodyCY - 44);
      ctx.lineTo(bodyCX + dx + 3, bodyCY - 54);
      ctx.lineTo(bodyCX + dx + 6, bodyCY - 44);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.moveTo(bodyCX + dx + 1.5, bodyCY - 46);
      ctx.lineTo(bodyCX + dx + 3, bodyCY - 51);
      ctx.lineTo(bodyCX + dx + 4.5, bodyCY - 46);
      ctx.closePath(); ctx.fill();
    }

    // たてがみ
    ctx.strokeStyle = MANE; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const bx = neckBase.x - 2 + (neckTop.x - neckBase.x) * t;
      const by = neckBase.y - 6 + (neckTop.y - neckBase.y) * t;
      const wob = Math.sin(horseAnimPhase * 0.8 + i * 0.9) * 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.bezierCurveTo(bx - 6 + wob, by + 4, bx - 10 + wob, by + 10, bx - 6 + wob, by + 16);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const bx = neckTop.x + 4 + i;
      const by = neckTop.y - 2;
      const wob = Math.sin(horseAnimPhase * 1.2 + i) * 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + 2 + wob, by + 3, bx + 8 + wob, by + 6);
      ctx.stroke();
    }

    // 前脚（右＝前方）
    drawHorseLeg(bodyCX + 28, bodyCX + 30, feetY, false, horseAnimPhase + Math.PI, COAT_MID, HOOF, HOOF_HL, OUTLINE);
    drawHorseLeg(bodyCX + 20, bodyCX + 22, feetY, false, horseAnimPhase + 0.0, COAT, HOOF, HOOF_HL, OUTLINE);

    // ★ ユニコーン進化済みなら馬にも角
    if (unicornStage >= 1) {
      const hornX = bodyCX + 68;
      const hornY = bodyCY - 38;
      const hornGrad = ctx.createLinearGradient(hornX, hornY - 20, hornX + 8, hornY);
      hornGrad.addColorStop(0, '#ffffff');
      hornGrad.addColorStop(0.5, '#ffd0ff');
      hornGrad.addColorStop(1, '#c080ff');
      ctx.fillStyle = hornGrad;
      ctx.strokeStyle = 'rgba(180,100,255,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hornX + 2, hornY - 20);
      ctx.lineTo(hornX - 3, hornY - 4);
      ctx.lineTo(hornX + 8, hornY - 4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.save();
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(unicornAuraPhase * 4);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff80ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(hornX + 2, hornY - 20, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    ctx.restore();
  }

  function drawHorseLeg(hipX, hoofBaseX, feetY, isBack, phase, coat, hoof, hoofHL, outline) {
    const hipY = feetY - 40;
    const swing = Math.sin(phase) * 12;
    const kneeLift = Math.max(0, Math.sin(phase) * 8);
    const kneeX = hipX + swing * 0.4;
    const kneeY = feetY - 24 - kneeLift * 0.3;
    const fetlockX = hoofBaseX + swing * 0.9;
    const fetlockY = feetY - 8;
    const hoofX = hoofBaseX + swing;
    const hoofY = feetY;

    const gradU = ctx.createLinearGradient(hipX - 5, hipY, hipX + 5, hipY);
    gradU.addColorStop(0, coat);
    gradU.addColorStop(1, '#2c1608');
    ctx.strokeStyle = outline; ctx.lineWidth = 1.4; ctx.fillStyle = gradU;
    ctx.beginPath();
    ctx.moveTo(hipX - 6, hipY);
    ctx.quadraticCurveTo(hipX - 8, feetY - 30, kneeX - 3, kneeY);
    ctx.lineTo(kneeX + 3, kneeY);
    ctx.quadraticCurveTo(hipX + 4, feetY - 30, hipX + 6, hipY);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.strokeStyle = outline; ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(kneeX - 3, kneeY);
    ctx.lineTo(fetlockX - 2, fetlockY);
    ctx.lineTo(fetlockX + 2, fetlockY);
    ctx.lineTo(kneeX + 3, kneeY);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = hoof; ctx.strokeStyle = outline;
    ctx.beginPath();
    ctx.moveTo(fetlockX - 3, fetlockY);
    ctx.lineTo(hoofX + 4, hoofY);
    ctx.lineTo(hoofX - 5, hoofY);
    ctx.lineTo(fetlockX + 3, fetlockY);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hoofHL;
    ctx.fillRect(hoofX - 2, hoofY - 4, 2, 2);
  }

  function lighten(hex, amount) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (n >> 16) + amount);
    const g = Math.min(255, ((n >> 8) & 0xff) + amount);
    const b = Math.min(255, (n & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  }

  function darken(hex, amount) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - amount);
    const g = Math.max(0, ((n >> 8) & 0xff) - amount);
    const b = Math.max(0, (n & 0xff) - amount);
    return `rgb(${r},${g},${b})`;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function roundRectFill(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  }

  function roundRectStroke(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke();
  }

  function drawFireCountdown() {
    if (fireRemaining <= 0) return;
    const sec = Math.ceil(fireRemaining);
    const pulse = 1 + Math.sin(performance.now() / 120) * 0.06;
    const alpha = fireRemaining < 1.5
      ? 0.6 + Math.sin(performance.now() / 80) * 0.4 : 1;
    const size = Math.round(clamp(W * 0.045, 28, 52) * pulse);
    const cx = W * 0.5;
    const cy = H * 0.13;

    ctx.save();
    ctx.globalAlpha = alpha;

    const panelW = size * 4.2, panelH = size * 1.6;
    ctx.fillStyle = 'rgba(20,8,4,0.62)';
    roundRectFill(ctx, cx - panelW / 2, cy - panelH / 2, panelW, panelH, 8);

    const borderColor = fireRemaining < 2
      ? `rgba(255,60,20,${alpha})` : 'rgba(255,140,40,0.85)';
    ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
    roundRectStroke(ctx, cx - panelW / 2, cy - panelH / 2, panelW, panelH, 8);

    const barW = panelW - 16, barH = 5;
    const barX = cx - barW / 2;
    const barY = cy + panelH / 2 - 10;
    const ratio = clamp(fireRemaining / FIRE_DURATION, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRectFill(ctx, barX, barY, barW, barH, 3);
    ctx.fillStyle = ratio > 0.4 ? '#ff8c30' : '#ff2020';
    roundRectFill(ctx, barX, barY, barW * ratio, barH, 3);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px 'Oswald', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff5a20'; ctx.shadowBlur = 12;
    ctx.fillText(`🔥 ${sec}`, cx, cy - 4);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawFireAura() {
    if (fireRemaining <= 0) return;
    const cx = player.x + player.w * 0.5, cy = player.y - player.h * 0.5;
    const fade = fireRemaining >= 1 ? 1 : fireRemaining;
    const rad = 60 + Math.sin(performance.now() / 100) * 6;
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, rad);
    g.addColorStop(0, `rgba(255,180,60,${0.7 * fade})`);
    g.addColorStop(0.5, `rgba(255,80,40,${0.4 * fade})`);
    g.addColorStop(1, 'rgba(255,40,20,0)');
    ctx.save(); ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawFloatingTexts() {
    for (const t of floatingTexts) {
      const alpha = Math.max(0, 1 - t.age / t.life);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color || '#ffe066';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 4;
      ctx.font = `900 ${t.size || 28}px 'Oswald', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  function drawStarFlash() {
    if (starFlash <= 0) return;
    const a = Math.min(0.55, starFlash * 1.3);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff8c8';
    ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  function drawBoostStreaks() {
    for (const s of boostStreaks) {
      const alpha = Math.max(0, 1 - s.age / s.life);
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.strokeStyle = s.color; ctx.lineWidth = s.w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.len, s.y); ctx.stroke();
      ctx.restore();
    }
  }

  function drawBoostEdgeGlow() {
    if (boostRemaining <= 0) return;
    const intensity = Math.min(1, Math.min(boostElapsed, boostRemaining / 20) / 0.3);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(255,220,80,0)');
    g.addColorStop(1, `rgba(255,180,40,${0.55 * intensity})`);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  function drawBoostTrail() {
    if (boostRemaining <= 0) return;
    const trails = 6;
    for (let i = 0; i < trails; i++) {
      const back = 16 + i * 14;
      const alpha = (0.35 * (trails - i)) / trails;
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ffd54a';
      ctx.beginPath();
      ctx.ellipse(player.x + player.w * 0.5 - back, player.y - player.h * 0.5, 24, 18, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMysticalHUD() {
    if (!mysticalBg) return;
    const now = performance.now() / 1000;
    const alpha = 0.5 + 0.5 * Math.sin(now * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(clamp(W * 0.018, 12, 20))}px sans-serif`;
    ctx.fillStyle = '#c8a0ff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('🌌 MYSTICAL WORLD', W - 12, 48);
    ctx.restore();
  }

  function drawUnicornHUD() {
    if (unicornStage < 1) return;
    const now = performance.now() / 1000;
    const alpha = 0.6 + 0.4 * Math.sin(now * 3);
    const hue = (now * 50) % 360;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(clamp(W * 0.018, 12, 20))}px sans-serif`;
    ctx.fillStyle = `hsl(${hue}, 100%, 75%)`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const label = (unicornStage >= 2) ? '🪽 PEGASUS UNICORN' : '🦄 UNICORN MODE';
    ctx.fillText(label, W - 12, mysticalBg ? 72 : 48);
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawBackground();
    drawBoostStreaks();
    drawObstacles();
    drawCoins();
    drawParticles();
    drawBoostTrail();
    drawFireAura();
    drawHorse();
    drawPlayer();
    drawFloatingTexts();
    ctx.restore();
    drawStarFlash();
    drawUnicornEdgeGlow();
    drawBoostEdgeGlow();
    drawFireEdgeGlow();
    drawFireCountdown();
    drawMysticalHUD();
    drawUnicornHUD();
  }

  let lastTime = 0;
  function loop(t) {
    const dt = Math.min(0.033, (t - lastTime) / 1000 || 0);
    lastTime = t;
    if (state === State.PLAYING) { update(dt); }
    else if (state === State.FALLING) { updateFalling(dt); }
    else {
      for (const c of clouds || []) { c.x -= c.speed * dt; if (c.x < -120) c.x = W + 120; }
    }
    render();
    requestAnimationFrame(loop);
  }

  function startGame() {
    ensureAudio();
    resetGame();
    state = State.PLAYING;
    startScreen.classList.add('hidden');
    startScreen.style.display = 'none';
    gameoverScreen.classList.add('hidden');
    bestEl.textContent = `BEST ${getBest()} m`;
    stopGameOverMusic();
    if (!muted) {
      bgmPlayer.start();
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (state === State.START) startGame(); else jump();
    } else if (e.code === 'ArrowDown') {
      e.preventDefault(); setDuck(true);
    }
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'ArrowDown') setDuck(false); });

  let touchStartY = null;
  canvas.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    if (state === State.START) { startGame(); return; }
    if (state === State.OVER) return;
    jump();
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (touchStartY === null || state !== State.PLAYING) return;
    if (e.touches[0].clientY - touchStartY > 40) setDuck(true);
  }, { passive: true });
  canvas.addEventListener('touchend', () => { setDuck(false); touchStartY = null; });
  canvas.addEventListener('mousedown', () => {
    if (state === State.START) { startGame(); return; }
    if (state === State.OVER) return;
    jump();
  });

  bestEl.textContent = `BEST ${getBest()} m`;
  resetGame();
  requestAnimationFrame(loop);

  window.__game = {
    getState: () => state,
    getPlayer: () => ({ ...player }),
    getDistance: () => distance,
    getCoinsCollected: () => coinsCollected,
    getCoinsList: () => coins.map(c => ({ x: c.x, y: c.y, r: c.r, type: c.type, collected: c.collected })),
    forceStar: (x) => spawnStar(x ?? player.x + 60),
    forceStarAt: (x, y) => coins.push({ x, y, r: 16, collected: false, type: 'star', spin: 0 }),
    forceStart: () => { if (state === State.START) startGame(); },
    forceJump: () => jump(),
    getFloatingTexts: () => [...floatingTexts],
    getStarFlash: () => starFlash,
    getBoostRemaining: () => boostRemaining,
    getBoostStreakCount: () => boostStreaks.length,
    setBoost: (m) => { boostRemaining = m; boostElapsed = 0; starFlash = 0.5; },
    forceFireStarAt: (x, y) => coins.push({ x, y, r: 16, collected: false, type: 'firestar', spin: 0 }),
    setFire: (s) => { fireRemaining = s; starFlash = 0.5; },
    getFireRemaining: () => fireRemaining,
    getObstacleCount: () => obstacles.length,
    setCoins: (n) => { coinsCollected = n; },
    setHorse: (s) => { horseRemaining = s; },
    getHorseRemaining: () => horseRemaining,

    // ★ デバッグ用
    getUnicornStage: () => unicornStage,
    forceUnicornStage: (s = 1) => { if (unicornStage < s) { unicornStage = s; showUnicornEvolution(); } },
    getMysticalBg: () => mysticalBg,
    forceMystical: () => { if (!mysticalBg) { mysticalBg = true; showMysticalTransition(); } },

    STAR_SHORTCUT, BOOST_METERS_PER_SEC, FIRE_DURATION, HORSE_DURATION, HORSE_COIN_THRESHOLD,
    UNICORN_COIN_THRESHOLD, PEGASUS_COIN_THRESHOLD, MYSTICAL_DISTANCE,
  };

  // =====================================================
  // キャラクター選択UI制御
  // =====================================================
  const charCards = document.querySelectorAll('.char-card');
  const charStartBtn = document.getElementById('char-start-btn');
  const charSelectUI = document.getElementById('character-select');

  charCards.forEach(card => {
    card.addEventListener('click', () => {
      charCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCharacter = CHARACTERS[parseInt(card.dataset.id, 10)];
    });
  });

  if (charStartBtn) {
    charStartBtn.addEventListener('click', () => {
      ensureAudio();
      if (charSelectUI) {
        charSelectUI.style.display = 'none';
        charSelectUI.style.pointerEvents = 'none';
      }
      startGame();
    });
  }

  if (restartBtn) restartBtn.addEventListener('click', startGame);

})();