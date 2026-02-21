// ========================================
// 盤面描画 & タッチ操作
// ========================================

const Board = (() => {
  const boardEl = document.getElementById('game-board');
  let cells = []; // 2次元配列 [row][col] = DOM要素
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartRow = -1;
  let touchStartCol = -1;
  let selectedRow = -1;
  let selectedCol = -1;
  let touchInitialized = false;
  const SWIPE_THRESHOLD = 30;

  // ----------------------------------------
  // 盤面の描画
  // ----------------------------------------
  function render(board, action, data) {
    switch (action) {
      case 'init':
      case 'shuffle':
        renderFull(board);
        break;
      case 'swap':
        animateSwap(data.row1, data.col1, data.row2, data.col2);
        updateCellContent(data.row1, data.col1, board[data.row1][data.col1]);
        updateCellContent(data.row2, data.col2, board[data.row2][data.col2]);
        break;
      case 'invalid-swap':
        animateInvalidSwap(data.row1, data.col1, data.row2, data.col2);
        break;
      case 'match':
        animateMatch(data.matches);
        break;
      case 'drop':
        renderFull(board, true);
        break;
    }
  }

  function renderFull(board, animate = false) {
    boardEl.innerHTML = '';
    cells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      cells[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (animate) cell.classList.add('dropping');
        cell.dataset.row = row;
        cell.dataset.col = col;

        if (board[row][col]) {
          const img = document.createElement('img');
          img.src = FRUIT_SVGS[board[row][col]];
          img.alt = board[row][col];
          img.draggable = false;
          cell.appendChild(img);
        }

        boardEl.appendChild(cell);
        cells[row][col] = cell;
      }
    }
  }

  function updateCellContent(row, col, fruitType) {
    if (!cells[row] || !cells[row][col]) return;
    const cell = cells[row][col];
    cell.innerHTML = '';
    if (fruitType) {
      const img = document.createElement('img');
      img.src = FRUIT_SVGS[fruitType];
      img.alt = fruitType;
      img.draggable = false;
      cell.appendChild(img);
    }
  }

  // ----------------------------------------
  // アニメーション
  // ----------------------------------------
  function animateSwap(r1, c1, r2, c2) {
    if (!cells[r1] || !cells[r1][c1] || !cells[r2] || !cells[r2][c2]) return;
    cells[r1][c1].classList.add('swapping');
    cells[r2][c2].classList.add('swapping');
    setTimeout(() => {
      cells[r1][c1].classList.remove('swapping');
      cells[r2][c2].classList.remove('swapping');
    }, 300);
  }

  function animateInvalidSwap(r1, c1, r2, c2) {
    if (!cells[r1] || !cells[r1][c1] || !cells[r2] || !cells[r2][c2]) return;
    cells[r1][c1].classList.add('invalid-swap');
    cells[r2][c2].classList.add('invalid-swap');
    setTimeout(() => {
      cells[r1][c1].classList.remove('invalid-swap');
      cells[r2][c2].classList.remove('invalid-swap');
    }, 400);
  }

  function animateMatch(matches) {
    matches.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      if (cells[r] && cells[r][c]) {
        cells[r][c].classList.add('matched');
      }
    });
  }

  // ----------------------------------------
  // スコアポップアップ
  // ----------------------------------------
  function showScorePopup(matches, earnedScore) {
    // マッチの中心位置にポップアップを表示
    let sumX = 0, sumY = 0, count = 0;
    matches.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      if (cells[r] && cells[r][c]) {
        const rect = cells[r][c].getBoundingClientRect();
        sumX += rect.left + rect.width / 2;
        sumY += rect.top + rect.height / 2;
        count++;
      }
    });

    if (count === 0) return;

    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${earnedScore}`;
    popup.style.left = `${sumX / count}px`;
    popup.style.top = `${sumY / count}px`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
  }

  // ----------------------------------------
  // コンボテキスト
  // ----------------------------------------
  function showComboText(chainCount) {
    const combo = document.createElement('div');
    combo.className = 'combo-text';
    combo.textContent = `${chainCount}れんさ!`;
    document.body.appendChild(combo);
    setTimeout(() => combo.remove(), 700);
  }

  // ----------------------------------------
  // パーティクル
  // ----------------------------------------
  function showParticles(matches) {
    const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
    matches.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      if (!cells[r] || !cells[r][c]) return;
      const rect = cells[r][c].getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      for (let i = 0; i < 6; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const angle = (Math.PI * 2 * i) / 6;
        const dist = 30 + Math.random() * 40;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.setProperty('--dx', `${dx}px`);
        p.style.setProperty('--dy', `${dy}px`);
        p.style.animation = `particle-burst 0.5s ease-out forwards`;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 500);
      }
    });
  }

  // ----------------------------------------
  // タッチ操作
  // ----------------------------------------
  function initTouch() {
    if (touchInitialized) return;
    touchInitialized = true;

    boardEl.addEventListener('touchstart', onTouchStart, { passive: false });
    boardEl.addEventListener('touchmove', onTouchMove, { passive: false });
    boardEl.addEventListener('touchend', onTouchEnd, { passive: false });

    // マウス操作も対応（PC開発用）
    boardEl.addEventListener('mousedown', onMouseDown);
    boardEl.addEventListener('mouseup', onMouseUp);
  }

  function getCellFromEvent(e) {
    const target = e.target.closest('.cell');
    if (!target) return null;
    return {
      row: parseInt(target.dataset.row),
      col: parseInt(target.dataset.col),
    };
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (Game.isGameProcessing()) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    const cell = getCellFromEvent(e);
    if (cell) {
      touchStartRow = cell.row;
      touchStartCol = cell.col;
      selectCell(cell.row, cell.col);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
  }

  function onTouchEnd(e) {
    e.preventDefault();
    if (Game.isGameProcessing()) return;
    if (touchStartRow < 0) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let targetRow = touchStartRow;
    let targetCol = touchStartCol;

    if (absDx > SWIPE_THRESHOLD || absDy > SWIPE_THRESHOLD) {
      if (absDx > absDy) {
        targetCol += dx > 0 ? 1 : -1;
      } else {
        targetRow += dy > 0 ? 1 : -1;
      }

      clearSelection();
      Game.trySwap(touchStartRow, touchStartCol, targetRow, targetCol);
    }

    touchStartRow = -1;
    touchStartCol = -1;
  }

  // マウス操作（PC開発用）
  function onMouseDown(e) {
    if (Game.isGameProcessing()) return;
    touchStartX = e.clientX;
    touchStartY = e.clientY;

    const cell = getCellFromEvent(e);
    if (cell) {
      touchStartRow = cell.row;
      touchStartCol = cell.col;
      selectCell(cell.row, cell.col);
    }
  }

  function onMouseUp(e) {
    if (Game.isGameProcessing()) return;
    if (touchStartRow < 0) return;

    const dx = e.clientX - touchStartX;
    const dy = e.clientY - touchStartY;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let targetRow = touchStartRow;
    let targetCol = touchStartCol;

    if (absDx > SWIPE_THRESHOLD || absDy > SWIPE_THRESHOLD) {
      if (absDx > absDy) {
        targetCol += dx > 0 ? 1 : -1;
      } else {
        targetRow += dy > 0 ? 1 : -1;
      }
      clearSelection();
      Game.trySwap(touchStartRow, touchStartCol, targetRow, targetCol);
    }

    touchStartRow = -1;
    touchStartCol = -1;
  }

  function selectCell(row, col) {
    clearSelection();
    selectedRow = row;
    selectedCol = col;
    if (cells[row] && cells[row][col]) {
      cells[row][col].classList.add('selected');
    }
  }

  function clearSelection() {
    if (selectedRow >= 0 && selectedCol >= 0 && cells[selectedRow] && cells[selectedRow][selectedCol]) {
      cells[selectedRow][selectedCol].classList.remove('selected');
    }
    selectedRow = -1;
    selectedCol = -1;
  }

  return {
    render,
    showScorePopup,
    showComboText,
    showParticles,
    initTouch,
    clearSelection,
  };
})();
