class Game {
  board = document.querySelectorAll('.column');
  countdown = document.querySelector('.countdown');
  flagsCounter = document.querySelector('.flags-count');
  tableEl = document.querySelector('.board');
  startBtn = document.querySelector('.start-btn');
  stopBtn = document.querySelector('.stop-btn');

  seconds = 0;
  flags = 6;
  isStarted = false;
  isGameOver = false;

  rows = 6;
  cols = 6;
  minesCount = 6;
  mesh = [];

  constructor() {
    this.initEvents();
  }

  initEvents() {
    this.startBtn.addEventListener('click', () => this.start());
    this.stopBtn.addEventListener('click', () => this.stop());

    this.board.forEach((cell, index) => {
      const r = Math.floor(index / this.cols);
      const c = index % this.cols;

      cell.addEventListener('click', () => this.openCell(r, c));
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.toggleFlag(r, c);
      });
    });
  }

  createMesh(safeRow = -1, safeCol = -1) {
    this.mesh = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ({
        isMine: false,
        adjacentMines: 0,
        isOpened: false,
        isFlagged: false,
      }))
    );

    let minesPlaced = 0;
    while (minesPlaced < this.minesCount) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);

      // Исключаем саму клетку и все 8 клеток вокруг неё, чтобы гарантировать 0 мин
      if (safeRow !== -1 && Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) {
        continue;
      }
      if (this.mesh[r][c].isMine) continue;

      this.mesh[r][c].isMine = true;
      minesPlaced++;
    }

    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [ 0, -1],          [ 0, 1],
      [ 1, -1], [ 1, 0], [ 1, 1],
    ];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.mesh[r][c].isMine) continue;

        let count = 0;
        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.mesh[nr][nc].isMine) {
            count++;
          }
        }
        this.mesh[r][c].adjacentMines = count;
      }
    }
  }

  start() {
    clearInterval(this.timer);
    this.isStarted = true;
    this.isGameOver = false;
    this.firstClick = true;
    this.startBtn.disabled = true;
    this.stopBtn.disabled = false;
    this.tableEl.classList.add('game-active');

    this.seconds = 0;
    this.flags = this.minesCount;
    this.countdown.textContent = `${this.seconds} s`;
    this.flagsCounter.textContent = `${this.flags} flags`;

    this.resetBoardUI();

    this.timer = setInterval(() => {
      this.seconds++;
      this.countdown.textContent = `${this.seconds} s`;
    }, 1000);
  }

  stop() {
    this.isStarted = false;
    this.isGameOver = true;
    this.firstClick = true;
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.tableEl.classList.remove('game-active');
    clearInterval(this.timer);
    this.resetBoardUI();
    this.seconds = 0;
    this.countdown.textContent = '0 s';
    this.flagsCounter.textContent = '0 flags';
  }

  resetBoardUI() {
    this.board.forEach((cell) => {
      cell.className = 'column closed';
      cell.textContent = '';
    });
  }

  getCellElement(r, c) {
    return this.board[r * this.cols + c];
  }

  openCell(r, c) {
    if (!this.isStarted || this.isGameOver) return;

    if (this.firstClick) {
      this.createMesh(r, c);
      this.firstClick = false;
    }

    const cellData = this.mesh[r][c];
    if (cellData.isOpened || cellData.isFlagged) return;

    // Попадание на мину
    if (cellData.isMine) {
      this.gameOver(r, c);
      return;
    }

    this.revealCell(r, c);

    // Проверка на победу
    if (this.checkWin()) {
      this.winGame();
    }
  }

  revealCell(r, c) {
    const cellData = this.mesh[r][c];
    if (cellData.isOpened || cellData.isFlagged || cellData.isMine) return;

    cellData.isOpened = true;
    const cellEl = this.getCellElement(r, c);
    cellEl.classList.remove('closed');
    cellEl.classList.add('opened');
    cellEl.textContent = cellData.adjacentMines || '';

    // Если вокруг нет мин, открываем соседние клетки каскадом
    if (cellData.adjacentMines === 0) {
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [ 0, -1],          [ 0, 1],
        [ 1, -1], [ 1, 0], [ 1, 1],
      ];

      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          this.revealCell(nr, nc);
        }
      }
    }
  }

  toggleFlag(r, c) {
    if (!this.isStarted || this.isGameOver) return;

    const cellData = this.mesh[r][c];
    if (cellData.isOpened) return;

    const cellEl = this.getCellElement(r, c);

    if (cellData.isFlagged) {
      cellData.isFlagged = false;
      this.flags++;
      cellEl.classList.remove('flagged');
      cellEl.textContent = '';
    } else {
      if (this.flags <= 0) return;
      cellData.isFlagged = true;
      this.flags--;
      cellEl.classList.add('flagged');
      cellEl.textContent = '🚩';
    }

    this.flagsCounter.textContent = `${this.flags} flags`;

    if (this.checkWin()) {
      this.winGame();
    }
  }

  gameOver(explodedR, explodedC) {
    this.isStarted = false;
    this.isGameOver = true;
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.tableEl.classList.remove('game-active');
    clearInterval(this.timer);

    // Раскрываем все поле: мины, цифры и ошибочные флаги
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cellData = this.mesh[r][c];
        const cellEl = this.getCellElement(r, c);

        if (r === explodedR && c === explodedC) {
          cellEl.className = 'column first-exploded';
          cellEl.textContent = '💣';
        } else if (cellData.isMine) {
          if (cellData.isFlagged) {
            cellEl.className = 'column flagged';
            cellEl.textContent = '🚩';
          } else {
            cellEl.className = 'column bombed';
            cellEl.textContent = '💣';
          }
        } else {
          // Безопасная клетка
          if (cellData.isFlagged) {
            cellEl.className = 'column flagged wrong';
            cellEl.textContent = '🚩';
          } else {
            cellEl.className = 'column opened';
            cellEl.textContent = cellData.adjacentMines || '';
          }
        }
      }
    }
  }

  checkWin() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cellData = this.mesh[r][c];
        // Если хоть одна безопасная клетка не открыта — игра еще не выиграна
        if (!cellData.isMine && !cellData.isOpened) {
          return false;
        }
      }
    }
    return true;
  }

  winGame() {
    this.tableEl.classList.remove('game-active');
    this.stop();
    alert(`Поздравляем! Вы победили за ${this.seconds} секунд!`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Game();
});