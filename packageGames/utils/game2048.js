/**
 * 2048 纯逻辑（4×4，0 表示空）
 */

const SIZE = 4;

/** 达成该数字即弹出胜利遮罩 */
const WIN_TARGET = 2048;

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

/**
 * 单行向左合并
 * @returns {{ line: number[], scoreAdd: number }}
 */
function mergeLine(line) {
  const filtered = line.filter((x) => x !== 0);
  const out = [];
  let scoreAdd = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const v = filtered[i] * 2;
      out.push(v);
      scoreAdd += v;
      i += 2;
    } else {
      out.push(filtered[i]);
      i += 1;
    }
  }
  while (out.length < SIZE) {
    out.push(0);
  }
  return { line: out.slice(0, SIZE), scoreAdd };
}

function lineChanged(a, b) {
  return a.some((v, i) => v !== b[i]);
}

/**
 * @param {number[][]} board
 * @param {'left'|'right'|'up'|'down'} direction
 * @returns {{ board: number[][], changed: boolean, scoreAdd: number }}
 */
function moveBoard(board, direction) {
  const nb = cloneBoard(board);
  let changed = false;
  let scoreAdd = 0;

  if (direction === 'left') {
    for (let r = 0; r < SIZE; r++) {
      const { line, scoreAdd: s } = mergeLine(nb[r]);
      scoreAdd += s;
      if (lineChanged(nb[r], line)) {
        changed = true;
      }
      nb[r] = line;
    }
    return { board: nb, changed, scoreAdd };
  }

  if (direction === 'right') {
    for (let r = 0; r < SIZE; r++) {
      const row = nb[r].slice().reverse();
      const { line, scoreAdd: s } = mergeLine(row);
      const merged = line.slice().reverse();
      scoreAdd += s;
      if (lineChanged(nb[r], merged)) {
        changed = true;
      }
      nb[r] = merged;
    }
    return { board: nb, changed, scoreAdd };
  }

  if (direction === 'up') {
    for (let c = 0; c < SIZE; c++) {
      const col = [nb[0][c], nb[1][c], nb[2][c], nb[3][c]];
      const { line, scoreAdd: s } = mergeLine(col);
      scoreAdd += s;
      for (let r = 0; r < SIZE; r++) {
        if (nb[r][c] !== line[r]) {
          changed = true;
        }
        nb[r][c] = line[r];
      }
    }
    return { board: nb, changed, scoreAdd };
  }

  if (direction === 'down') {
    for (let c = 0; c < SIZE; c++) {
      const col = [nb[0][c], nb[1][c], nb[2][c], nb[3][c]].reverse();
      const { line, scoreAdd: s } = mergeLine(col);
      const merged = line.slice().reverse();
      scoreAdd += s;
      for (let r = 0; r < SIZE; r++) {
        if (nb[r][c] !== merged[r]) {
          changed = true;
        }
        nb[r][c] = merged[r];
      }
    }
    return { board: nb, changed, scoreAdd };
  }

  return { board: nb, changed: false, scoreAdd: 0 };
}

function emptyBoard() {
  return Array(SIZE)
    .fill(0)
    .map(() => Array(SIZE).fill(0));
}

function getEmptyCells(board) {
  const list = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) {
        list.push([r, c]);
      }
    }
  }
  return list;
}

/**
 * 在随机空位生成 2（90%）或 4（10%）
 */
function spawnTile(board) {
  const empty = getEmptyCells(board);
  if (empty.length === 0) {
    return false;
  }
  const pick = empty[Math.floor(Math.random() * empty.length)];
  const [r, c] = pick;
  const v = Math.random() < 0.9 ? 2 : 4;
  board[r][c] = v;
  return true;
}

/**
 * 是否还能移动或合并
 */
function hasValidMove(board) {
  for (const d of ['left', 'right', 'up', 'down']) {
    const { changed } = moveBoard(board, d);
    if (changed) {
      return true;
    }
  }
  return false;
}

function hasReached2048(board) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] >= WIN_TARGET) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 初始盘面：两个随机 2
 */
function initNewGame() {
  const b = emptyBoard();
  spawnTile(b);
  spawnTile(b);
  return b;
}

module.exports = {
  SIZE,
  moveBoard,
  emptyBoard,
  spawnTile,
  getEmptyCells,
  hasValidMove,
  hasReached2048,
  initNewGame,
  cloneBoard,
};
