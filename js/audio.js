// ========================================
// 効果音 (Web Audio API)
// ========================================

const AudioManager = (() => {
  let ctx = null;

  function getContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function playTone(frequency, duration, type = 'sine', volume = 0.15) {
    const c = getContext();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  function playMatch(chainCount) {
    // 連鎖ごとに音程が上がる
    const baseFreq = 523; // C5
    const freq = baseFreq * Math.pow(1.122, chainCount); // 半音ずつ上昇
    playTone(freq, 0.2, 'sine', 0.15);
    setTimeout(() => playTone(freq * 1.25, 0.15, 'sine', 0.12), 80);
  }

  function playSwap() {
    playTone(400, 0.1, 'sine', 0.08);
  }

  function playInvalidSwap() {
    playTone(200, 0.15, 'square', 0.06);
    setTimeout(() => playTone(180, 0.15, 'square', 0.06), 100);
  }

  function playClear() {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.12), i * 150);
    });
  }

  function playGameOver() {
    const notes = [392, 349, 330, 262]; // G4, F4, E4, C4
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.4, 'sine', 0.1), i * 200);
    });
  }

  function playButtonTap() {
    playTone(660, 0.08, 'sine', 0.08);
  }

  function playCountdown() {
    playTone(440, 0.15, 'square', 0.08);
  }

  // ユーザー操作で AudioContext を初期化するためのヘルパー
  function init() {
    getContext();
  }

  return {
    init,
    playMatch,
    playSwap,
    playInvalidSwap,
    playClear,
    playGameOver,
    playButtonTap,
    playCountdown,
  };
})();
