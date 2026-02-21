// ========================================
// 盤面描画 & タッチ操作（ドラッグ追従対応版）
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
  let isDragging = false;
  let dragImg = null; // ドラッグ中のフルーツ画像クローン
  let touchInitialized = false;
  const SWIPE_THRESHOLD = 20;

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
        animateSwap(board, data.row1, data.col1, data.row2, data.col2);
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
        if (animate) {
          cell.classList.add('dropping');
          cell.addEventListener('animationend', () => {
            cell.classList.remove('dropping');
          }, { once: true });
        }
        cell.dataset.row = row;
        cell.dataset.col = col;

        if (board[row][col]) {
          const img = document.createElement('img');
          img.src = FRUIT_IMAGES[board[row][col]];
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
      img.src = FRUIT_IMAGES[fruitType];
      img.alt = fruitType;
      img.draggable = false;
      cell.appendChild(img);
    }
  }

  // ----------------------------------------
  // アニメーション
  // ----------------------------------------
  function animateSwap(board, r1, c1, r2, c2) {
    if (!cells[r1] || !cells[r1][c1] || !cells[r2] || !cells[r2][c2]) return;

    const cell1 = cells[r1][c1];
    const cell2 = cells[r2][c2];
    const rect1 = cell1.getBoundingClientRect();
    const rect2 = cell2.getBoundingClientRect();

    const dx = rect2.left - rect1.left;
    const dy = rect2.top - rect1.top;

    // CSS transformでスライドアニメーション
    cell1.style.transition = 'transform 0.25s ease';
    cell2.style.transition = 'transform 0.25s ease';
    cell1.style.transform = `translate(${dx}px, ${dy}px)`;
    cell2.style.transform = `translate(${-dx}px, ${-dy}px)`;
    cell1.style.zIndex = '10';
    cell2.style.zIndex = '10';

    setTimeout(() => {
      cell1.style.transition = '';
      cell1.style.transform = '';
      cell1.style.zIndex = '';
      cell2.style.transition = '';
      cell2.style.transform = '';
      cell2.style.zIndex = '';

      // 実際のDOMコンテンツを入れ替え
      updateCellContent(r1, c1, board[r1][c1]);
      updateCellContent(r2, c2, board[r2][c2]);
    }, 260);
  }

  function animateInvalidSwap(r1, c1, r2, c2) {
    if (!cells[r1] || !cells[r1][c1] || !cells[r2] || !cells[r2][c2]) return;

    const cell1 = cells[r1][c1];
    const cell2 = cells[r2][c2];
    const rect1 = cell1.getBoundingClientRect();
    const rect2 = cell2.getBoundingClientRect();

    const dx = (rect2.left - rect1.left) * 0.4;
    const dy = (rect2.top - rect1.top) * 0.4;

    // 少し動いて戻るアニメーション
    cell1.style.transition = 'transform 0.15s ease';
    cell2.style.transition = 'transform 0.15s ease';
    cell1.style.transform = `translate(${dx}px, ${dy}px)`;
    cell2.style.transform = `translate(${-dx}px, ${-dy}px)`;
    cell1.style.zIndex = '10';
    cell2.style.zIndex = '10';

    setTimeout(() => {
      cell1.style.transition = 'transform 0.2s ease';
      cell2.style.transition = 'transform 0.2s ease';
      cell1.style.transform = '';
      cell2.style.transform = '';

      setTimeout(() => {
        cell1.style.transition = '';
        cell1.style.zIndex = '';
        cell2.style.transition = '';
        cell2.style.zIndex = '';
        // シェイクも追加
        cell1.classList.add('invalid-swap');
        cell2.classList.add('invalid-swap');
        setTimeout(() => {
          cell1.classList.remove('invalid-swap');
          cell2.classList.remove('invalid-swap');
        }, 300);
      }, 200);
    }, 150);
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

      for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const angle = (Math.PI * 2 * i) / 8;
        const dist = 40 + Math.random() * 50;
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
  // ドラッグ中のフルーツ画像（指に追従）
  // ----------------------------------------
  function createDragImage(row, col, x, y) {
    removeDragImage();
    if (!cells[row] || !cells[row][col]) return;
    const img = cells[row][col].querySelector('img');
    if (!img) return;

    dragImg = document.createElement('img');
    dragImg.src = img.src;
    dragImg.className = 'drag-ghost';
    dragImg.style.left = `${x}px`;
    dragImg.style.top = `${y}px`;
    document.body.appendChild(dragImg);

    // 元のセルのフルーツを半透明に
    cells[row][col].classList.add('dragging-source');
  }

  function moveDragImage(x, y) {
    if (!dragImg) return;
    dragImg.style.left = `${x}px`;
    dragImg.style.top = `${y}px`;
  }

  function removeDragImage() {
    if (dragImg) {
      dragImg.remove();
      dragImg = null;
    }
    // 半透明解除
    const source = boardEl.querySelector('.dragging-source');
    if (source) source.classList.remove('dragging-source');
  }

  // ----------------------------------------
  // タッチ操作（ドラッグ追従版）
  // ----------------------------------------
  function initTouch() {
    if (touchInitialized) return;
    touchInitialized = true;

    boardEl.addEventListener('touchstart', onTouchStart, { passive: false });
    boardEl.addEventListener('touchmove', onTouchMove, { passive: false });
    boardEl.addEventListener('touchend', onTouchEnd, { passive: false });
    boardEl.addEventListener('touchcancel', onTouchCancel, { passive: false });

    // マウス操作も対応（PC開発用）
    boardEl.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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
      isDragging = true;
      selectCell(cell.row, cell.col);
      createDragImage(cell.row, cell.col, touch.clientX, touch.clientY);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (!isDragging || !dragImg) return;
    const touch = e.touches[0];
    moveDragImage(touch.clientX, touch.clientY);
  }

  function onTouchEnd(e) {
    e.preventDefault();
    if (Game.isGameProcessing()) { cleanupDrag(); return; }
    if (touchStartRow < 0) { cleanupDrag(); return; }

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    handleSwipeEnd(dx, dy);
    cleanupDrag();
  }

  function onTouchCancel(e) {
    e.preventDefault();
    cleanupDrag();
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
      isDragging = true;
      selectCell(cell.row, cell.col);
      createDragImage(cell.row, cell.col, e.clientX, e.clientY);
    }
  }

  function onMouseMove(e) {
    if (!isDragging || !dragImg) return;
    moveDragImage(e.clientX, e.clientY);
  }

  function onMouseUp(e) {
    if (Game.isGameProcessing()) { cleanupDrag(); return; }
    if (touchStartRow < 0) { cleanupDrag(); return; }

    const dx = e.clientX - touchStartX;
    const dy = e.clientY - touchStartY;

    handleSwipeEnd(dx, dy);
    cleanupDrag();
  }

  function handleSwipeEnd(dx, dy) {
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
  }

  function cleanupDrag() {
    isDragging = false;
    removeDragImage();
    clearSelection();
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

  // ----------------------------------------
  // ヒント表示
  // ----------------------------------------
  function showHint(hint) {
    clearHint();
    if (!hint) return;
    const { row1, col1, row2, col2 } = hint;
    if (cells[row1] && cells[row1][col1]) cells[row1][col1].classList.add('hint');
    if (cells[row2] && cells[row2][col2]) cells[row2][col2].classList.add('hint');
  }

  function clearHint() {
    boardEl.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
  }

  return {
    render,
    showScorePopup,
    showComboText,
    showParticles,
    showHint,
    clearHint,
    initTouch,
    clearSelection,
  };
})();
