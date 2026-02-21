// ========================================
// メイン - 画面遷移 & UI管理
// ========================================

const App = (() => {
  let currentLevelIndex = 0;
  // レベルクリア状態を管理（0=ロック, 1=アンロック, 2=クリア済み）
  // 星の数も記録
  let levelState = LEVELS.map((_, i) => ({
    unlocked: i === 0,
    stars: 0,
    highScore: 0,
  }));

  // ローカルストレージから復元
  function loadProgress() {
    try {
      const saved = localStorage.getItem('fruitMatchProgress');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.levelState) {
          levelState = data.levelState;
        }
      }
    } catch (e) {
      // 無視
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem('fruitMatchProgress', JSON.stringify({ levelState }));
    } catch (e) {
      // 無視
    }
  }

  // ----------------------------------------
  // 画面管理
  // ----------------------------------------
  const screens = {
    title: document.getElementById('screen-title'),
    levels: document.getElementById('screen-levels'),
    game: document.getElementById('screen-game'),
    clear: document.getElementById('screen-clear'),
    gameover: document.getElementById('screen-gameover'),
    allclear: document.getElementById('screen-allclear'),
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // ----------------------------------------
  // タイトル画面
  // ----------------------------------------
  document.getElementById('btn-play').addEventListener('click', () => {
    AudioManager.init();
    AudioManager.playButtonTap();
    showLevelSelect();
  });

  // ----------------------------------------
  // レベル選択画面
  // ----------------------------------------
  function showLevelSelect() {
    const container = document.getElementById('level-buttons');
    container.innerHTML = '';

    LEVELS.forEach((level, i) => {
      const btn = document.createElement('button');
      btn.className = `level-btn ${levelState[i].unlocked ? 'unlocked' : 'locked'}`;

      const num = document.createElement('span');
      num.textContent = level.level;
      btn.appendChild(num);

      // 星表示
      const starsEl = document.createElement('div');
      starsEl.className = 'level-stars';
      if (levelState[i].unlocked && levelState[i].stars > 0) {
        for (let s = 0; s < 3; s++) {
          starsEl.textContent += s < levelState[i].stars ? '\u2605' : '\u2606';
        }
      }
      btn.appendChild(starsEl);

      if (levelState[i].unlocked) {
        btn.addEventListener('click', () => {
          AudioManager.playButtonTap();
          startLevel(i);
        });
      }

      container.appendChild(btn);
    });

    showScreen('levels');
  }

  document.getElementById('btn-back-title').addEventListener('click', () => {
    AudioManager.playButtonTap();
    showScreen('title');
  });

  // ----------------------------------------
  // ゲーム開始
  // ----------------------------------------
  function startLevel(levelIndex) {
    currentLevelIndex = levelIndex;
    const level = LEVELS[levelIndex];

    document.getElementById('display-level').textContent = level.level;
    document.getElementById('display-target').textContent = level.targetScore;

    showScreen('game');

    // ゲーム開始
    Game.startGame(levelIndex);
    Board.initTouch();
  }

  // ----------------------------------------
  // ゲームイベント登録
  // ----------------------------------------
  Game.on('scoreUpdate', (score) => {
    document.getElementById('display-score').textContent = score;
  });

  Game.on('timeUpdate', (remaining, total) => {
    document.getElementById('display-time').textContent = remaining;
    const bar = document.getElementById('timer-bar');
    const pct = (remaining / total) * 100;
    bar.style.width = `${pct}%`;

    bar.classList.remove('warning', 'danger');
    if (remaining <= 10) {
      bar.classList.add('danger');
    } else if (remaining <= 30) {
      bar.classList.add('warning');
    }
  });

  Game.on('boardUpdate', (board, action, data) => {
    Board.render(board, action, data);
  });

  Game.on('matchFound', (matches, earnedScore, chainCount) => {
    Board.showScorePopup(matches, earnedScore);
    Board.showParticles(matches);
  });

  Game.on('chain', (chainCount) => {
    Board.showComboText(chainCount);
  });

  Game.on('gameClear', (score, targetScore) => {
    // 星の計算
    let stars = 1;
    if (score >= targetScore * 1.5) stars = 2;
    if (score >= targetScore * 2) stars = 3;

    // 状態を更新
    if (stars > levelState[currentLevelIndex].stars) {
      levelState[currentLevelIndex].stars = stars;
    }
    if (score > levelState[currentLevelIndex].highScore) {
      levelState[currentLevelIndex].highScore = score;
    }

    // 次のレベルをアンロック
    if (currentLevelIndex + 1 < LEVELS.length) {
      levelState[currentLevelIndex + 1].unlocked = true;
    }

    saveProgress();

    // クリア画面を表示
    document.getElementById('clear-score').textContent = score;

    const starsEl = document.getElementById('clear-stars');
    starsEl.textContent = '';
    for (let s = 0; s < 3; s++) {
      starsEl.textContent += s < stars ? '\u2605 ' : '\u2606 ';
    }

    // 全レベルクリアか判定
    const isAllClear = currentLevelIndex >= LEVELS.length - 1;

    if (isAllClear) {
      showScreen('allclear');
    } else {
      showScreen('clear');
    }
  });

  Game.on('gameOver', (score, targetScore) => {
    document.getElementById('gameover-score').textContent = score;
    document.getElementById('gameover-target').textContent = targetScore;
    showScreen('gameover');
  });

  Game.on('noMoves', () => {
    // シャッフル中の表示（短いので特に何もしなくてOK）
  });

  // ----------------------------------------
  // 結果画面のボタン
  // ----------------------------------------
  document.getElementById('btn-next-level').addEventListener('click', () => {
    AudioManager.playButtonTap();
    if (currentLevelIndex + 1 < LEVELS.length) {
      startLevel(currentLevelIndex + 1);
    } else {
      showScreen('allclear');
    }
  });

  document.getElementById('btn-clear-to-levels').addEventListener('click', () => {
    AudioManager.playButtonTap();
    showLevelSelect();
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    AudioManager.playButtonTap();
    startLevel(currentLevelIndex);
  });

  document.getElementById('btn-gameover-to-levels').addEventListener('click', () => {
    AudioManager.playButtonTap();
    showLevelSelect();
  });

  document.getElementById('btn-allclear-to-title').addEventListener('click', () => {
    AudioManager.playButtonTap();
    showScreen('title');
  });

  // ----------------------------------------
  // 初期化
  // ----------------------------------------
  function init() {
    loadProgress();
    showScreen('title');
  }

  return { init };
})();

// アプリ起動
App.init();
