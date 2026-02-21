// ========================================
// ゲームロジック
// ========================================

const BOARD_SIZE = 6;
const FRUIT_TYPES = ['apple', 'banana', 'grape', 'orange'];
const FRUIT_SVGS = {
  apple: 'svg/apple.svg',
  banana: 'svg/banana.svg',
  grape: 'svg/grape.svg',
  orange: 'svg/orange.svg',
};

const SCORE_TABLE = {
  3: 100,
  4: 200,
  5: 500,
  6: 500, // 6個以上も500点
};

const Game = (() => {
  let board = [];       // 2次元配列 [row][col]
  let score = 0;
  let currentLevel = null;
  let timeRemaining = 0;
  let timerInterval = null;
  let isProcessing = false;
  let chainCount = 0;

  // コールバック
  let onScoreUpdate = null;
  let onTimeUpdate = null;
  let onBoardUpdate = null;
  let onMatchFound = null;
  let onChain = null;
  let onGameClear = null;
  let onGameOver = null;
  let onNoMoves = null;

  // ----------------------------------------
  // 盤面の初期化
  // ----------------------------------------
  function initBoard() {
    board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      board[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        board[row][col] = randomFruit(row, col);
      }
    }
  }

  // 初期配置で3マッチが生じないようにランダム選択
  function randomFruit(row, col) {
    const available = [...FRUIT_TYPES];
    // 左2つが同じなら除外
    if (col >= 2 && board[row][col - 1] === board[row][col - 2]) {
      const exclude = board[row][col - 1];
      const idx = available.indexOf(exclude);
      if (idx !== -1) available.splice(idx, 1);
    }
    // 上2つが同じなら除外
    if (row >= 2 && board[row - 1][col] === board[row - 2][col]) {
      const exclude = board[row - 1][col];
      const idx = available.indexOf(exclude);
      if (idx !== -1) available.splice(idx, 1);
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  function randomFruitSimple() {
    return FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
  }

  // ----------------------------------------
  // ゲーム開始
  // ----------------------------------------
  function startGame(levelIndex) {
    currentLevel = LEVELS[levelIndex];
    score = 0;
    timeRemaining = currentLevel.timeLimit;
    isProcessing = false;
    chainCount = 0;

    initBoard();

    if (onScoreUpdate) onScoreUpdate(score);
    if (onTimeUpdate) onTimeUpdate(timeRemaining, currentLevel.timeLimit);
    if (onBoardUpdate) onBoardUpdate(board, 'init');

    startTimer();
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeRemaining--;
      if (onTimeUpdate) onTimeUpdate(timeRemaining, currentLevel.timeLimit);

      if (timeRemaining <= 10 && timeRemaining > 0) {
        AudioManager.playCountdown();
      }

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        // ゲームオーバー
        if (onGameOver) onGameOver(score, currentLevel.targetScore);
        AudioManager.playGameOver();
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  // ----------------------------------------
  // スワイプ処理
  // ----------------------------------------
  function trySwap(row1, col1, row2, col2) {
    if (isProcessing) return false;

    // 隣接チェック
    const dr = Math.abs(row1 - row2);
    const dc = Math.abs(col1 - col2);
    if (dr + dc !== 1) return false;

    // 範囲チェック
    if (!isValidPos(row1, col1) || !isValidPos(row2, col2)) return false;

    isProcessing = true;
    chainCount = 0;

    // 入れ替え実行
    swap(row1, col1, row2, col2);

    // マッチ判定
    const matches = findAllMatches();
    if (matches.size > 0) {
      AudioManager.playSwap();
      if (onBoardUpdate) onBoardUpdate(board, 'swap', { row1, col1, row2, col2 });
      // マッチ処理を少し遅延させてアニメーションを見せる
      setTimeout(() => processMatches(matches), 300);
      return true;
    } else {
      // マッチなし → 元に戻す
      swap(row1, col1, row2, col2);
      AudioManager.playInvalidSwap();
      if (onBoardUpdate) onBoardUpdate(board, 'invalid-swap', { row1, col1, row2, col2 });
      setTimeout(() => { isProcessing = false; }, 400);
      return false;
    }
  }

  function swap(r1, c1, r2, c2) {
    const tmp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = tmp;
  }

  function isValidPos(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  // ----------------------------------------
  // マッチ判定
  // ----------------------------------------
  function findAllMatches() {
    const matched = new Set();

    // 横方向
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        const fruit = board[row][col];
        if (!fruit) continue;
        let count = 1;
        while (col + count < BOARD_SIZE && board[row][col + count] === fruit) {
          count++;
        }
        if (count >= 3) {
          for (let i = 0; i < count; i++) {
            matched.add(`${row},${col + i}`);
          }
        }
      }
    }

    // 縦方向
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 2; row++) {
        const fruit = board[row][col];
        if (!fruit) continue;
        let count = 1;
        while (row + count < BOARD_SIZE && board[row + count][col] === fruit) {
          count++;
        }
        if (count >= 3) {
          for (let i = 0; i < count; i++) {
            matched.add(`${row + i},${col}`);
          }
        }
      }
    }

    return matched;
  }

  // ----------------------------------------
  // マッチ処理 → 消去 → 落下 → 連鎖チェック
  // ----------------------------------------
  function processMatches(matches) {
    chainCount++;

    // マッチしたグループごとにスコア計算
    const groups = groupMatches(matches);
    let earnedScore = 0;
    groups.forEach(group => {
      const count = group.length;
      const baseScore = SCORE_TABLE[Math.min(count, 6)] || SCORE_TABLE[6];
      earnedScore += baseScore * chainCount; // 連鎖ボーナス
    });

    score += earnedScore;
    if (onScoreUpdate) onScoreUpdate(score);
    if (onMatchFound) onMatchFound(matches, earnedScore, chainCount);

    AudioManager.playMatch(chainCount);

    if (chainCount >= 2 && onChain) {
      onChain(chainCount);
    }

    // マッチしたセルを消去
    matches.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      board[r][c] = null;
    });

    if (onBoardUpdate) onBoardUpdate(board, 'match', { matches });

    // 落下処理（少し遅延）
    setTimeout(() => {
      dropAndFill();

      if (onBoardUpdate) onBoardUpdate(board, 'drop');

      // 再度マッチチェック（連鎖）
      setTimeout(() => {
        const newMatches = findAllMatches();
        if (newMatches.size > 0) {
          processMatches(newMatches);
        } else {
          // 連鎖終了
          isProcessing = false;
          checkClearCondition();
          checkForValidMoves();
        }
      }, 350);
    }, 400);
  }

  // マッチしたセルをグループ化（連続したセルごと）
  function groupMatches(matches) {
    const groups = [];
    const visited = new Set();
    const matchArr = [...matches];

    matchArr.forEach(key => {
      if (visited.has(key)) return;
      const group = [];
      const stack = [key];
      while (stack.length > 0) {
        const current = stack.pop();
        if (visited.has(current)) continue;
        if (!matches.has(current)) continue;
        visited.add(current);
        group.push(current);
        const [r, c] = current.split(',').map(Number);
        // 隣接セルをチェック
        const neighbors = [`${r - 1},${c}`, `${r + 1},${c}`, `${r},${c - 1}`, `${r},${c + 1}`];
        neighbors.forEach(n => {
          if (matches.has(n) && !visited.has(n)) stack.push(n);
        });
      }
      if (group.length > 0) groups.push(group);
    });

    return groups;
  }

  // ----------------------------------------
  // 落下 & 補充
  // ----------------------------------------
  function dropAndFill() {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // 下から上へ走査、空セルを詰める
      let emptyRow = BOARD_SIZE - 1;
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        if (board[row][col] !== null) {
          if (row !== emptyRow) {
            board[emptyRow][col] = board[row][col];
            board[row][col] = null;
          }
          emptyRow--;
        }
      }
      // 上部の空セルに新しいフルーツを補充
      for (let row = emptyRow; row >= 0; row--) {
        board[row][col] = randomFruitSimple();
      }
    }
  }

  // ----------------------------------------
  // クリア条件チェック
  // ----------------------------------------
  function checkClearCondition() {
    if (score >= currentLevel.targetScore) {
      stopTimer();
      setTimeout(() => {
        if (onGameClear) onGameClear(score, currentLevel.targetScore);
        AudioManager.playClear();
      }, 300);
    }
  }

  // ----------------------------------------
  // 有効手チェック
  // ----------------------------------------
  function checkForValidMoves() {
    if (hasValidMoves()) return;

    // 有効な手がない場合、盤面をシャッフル
    if (onNoMoves) onNoMoves();
    shuffleBoard();
    if (onBoardUpdate) onBoardUpdate(board, 'shuffle');
  }

  function hasValidMoves() {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        // 右との交換
        if (col < BOARD_SIZE - 1) {
          swap(row, col, row, col + 1);
          if (findAllMatches().size > 0) {
            swap(row, col, row, col + 1);
            return true;
          }
          swap(row, col, row, col + 1);
        }
        // 下との交換
        if (row < BOARD_SIZE - 1) {
          swap(row, col, row + 1, col);
          if (findAllMatches().size > 0) {
            swap(row, col, row + 1, col);
            return true;
          }
          swap(row, col, row + 1, col);
        }
      }
    }
    return false;
  }

  function shuffleBoard() {
    // Fisher-Yates シャッフル
    const flat = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        flat.push(board[row][col]);
      }
    }
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    let idx = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        board[row][col] = flat[idx++];
      }
    }

    // シャッフル後もマッチがあれば消す（初期状態を安定させる）
    const matches = findAllMatches();
    if (matches.size > 0) {
      matches.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        board[r][c] = randomFruitSimple();
      });
    }

    // まだ有効手がなければ再シャッフル
    if (!hasValidMoves()) {
      shuffleBoard();
    }
  }

  // ----------------------------------------
  // ゲッター
  // ----------------------------------------
  function getBoard() { return board; }
  function getScore() { return score; }
  function isGameProcessing() { return isProcessing; }
  function getCurrentLevel() { return currentLevel; }

  // ----------------------------------------
  // コールバック登録
  // ----------------------------------------
  function on(event, callback) {
    switch (event) {
      case 'scoreUpdate': onScoreUpdate = callback; break;
      case 'timeUpdate': onTimeUpdate = callback; break;
      case 'boardUpdate': onBoardUpdate = callback; break;
      case 'matchFound': onMatchFound = callback; break;
      case 'chain': onChain = callback; break;
      case 'gameClear': onGameClear = callback; break;
      case 'gameOver': onGameOver = callback; break;
      case 'noMoves': onNoMoves = callback; break;
    }
  }

  return {
    startGame,
    stopTimer,
    trySwap,
    getBoard,
    getScore,
    isGameProcessing,
    getCurrentLevel,
    on,
  };
})();
