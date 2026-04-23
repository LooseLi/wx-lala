/**
 * 带 id 的 2048 状态：每个格子 null | { id, v }
 * 与 game2048.js 数值规则一致，合并时保留「左侧/上方」方块的 id，便于动效连续。
 */

const SIZE = 4;

function empty() {
  return Array.from({ length: SIZE }, () => [null, null, null, null].slice());
}

function cloneGrid(g) {
  return g.map((row) =>
    row.map((c) => (c ? { id: c.id, v: c.v } : null)),
  );
}

/**
 * 单行对象合并（同 mergeLine 逻辑）
 * @param {{ id: number, v: number }[]} line 从左到右非空入列
 * @returns {{ out: { id: number, v: number }[], scoreAdd: number }}
 */
function mergeLineObjects(line) {
  const out = [];
  let scoreAdd = 0;
  let i = 0;
  while (i < line.length) {
    if (i + 1 < line.length && line[i].v === line[i + 1].v) {
      const v = line[i].v * 2;
      out.push({ id: line[i].id, v });
      scoreAdd += v;
      i += 2;
    } else {
      out.push({ id: line[i].id, v: line[i].v });
      i += 1;
    }
  }
  return { out, scoreAdd };
}

function lineCellsChanged(before, after) {
  for (let c = 0; c < SIZE; c += 1) {
    const bv = before[c] ? before[c].v : 0;
    const av = after[c] ? after[c].v : 0;
    const bi = before[c] ? before[c].id : -1;
    const ai = after[c] ? after[c].id : -1;
    if (bv !== av || bi !== ai) {
      return true;
    }
  }
  return false;
}

/**
 * 将 non-null 对象列表 pack 为长度 4 的左齐行
 */
function packLeftObjectRow(objects) {
  const row = [null, null, null, null];
  for (let j = 0; j < objects.length; j += 1) {
    row[j] = { id: objects[j].id, v: objects[j].v };
  }
  return row;
}

/**
 * @returns {{ grid: (null|{id:number,v:number})[][], changed: boolean, scoreAdd: number }}
 */
function moveTileGrid(tg, direction) {
  const nb = cloneGrid(tg);
  let changed = false;
  let scoreAdd = 0;

  if (direction === 'left') {
    for (let r = 0; r < SIZE; r += 1) {
      const line = [];
      for (let c = 0; c < SIZE; c += 1) {
        if (nb[r][c]) {
          line.push(nb[r][c]);
        }
      }
      const { out, scoreAdd: s } = mergeLineObjects(line);
      const newRow = packLeftObjectRow(out);
      scoreAdd += s;
      if (lineCellsChanged(nb[r], newRow)) {
        changed = true;
      }
      nb[r] = newRow;
    }
    return { grid: nb, changed, scoreAdd };
  }

  if (direction === 'right') {
    for (let r = 0; r < SIZE; r += 1) {
      const line = [];
      for (let c = SIZE - 1; c >= 0; c -= 1) {
        if (nb[r][c]) {
          line.push(nb[r][c]);
        }
      }
      const { out, scoreAdd: s } = mergeLineObjects(line);
      const packed = packLeftObjectRow(out);
      const newRow = [null, null, null, null];
      for (let j = 0; j < SIZE; j += 1) {
        newRow[SIZE - 1 - j] = packed[j];
      }
      scoreAdd += s;
      if (lineCellsChanged(nb[r], newRow)) {
        changed = true;
      }
      nb[r] = newRow;
    }
    return { grid: nb, changed, scoreAdd };
  }

  if (direction === 'up') {
    for (let c = 0; c < SIZE; c += 1) {
      const beforeCol = [nb[0][c], nb[1][c], nb[2][c], nb[3][c]];
      const line = [];
      for (let r = 0; r < SIZE; r += 1) {
        if (nb[r][c]) {
          line.push(nb[r][c]);
        }
      }
      const { out, scoreAdd: s } = mergeLineObjects(line);
      const newCol = packLeftObjectRow(out);
      scoreAdd += s;
      if (lineCellsChanged(beforeCol, newCol)) {
        changed = true;
      }
      for (let r = 0; r < SIZE; r += 1) {
        nb[r][c] = newCol[r];
      }
    }
    return { grid: nb, changed, scoreAdd };
  }

  if (direction === 'down') {
    for (let c = 0; c < SIZE; c += 1) {
      const beforeCol = [nb[0][c], nb[1][c], nb[2][c], nb[3][c]];
      const line = [];
      for (let r = SIZE - 1; r >= 0; r -= 1) {
        if (nb[r][c]) {
          line.push(nb[r][c]);
        }
      }
      const { out, scoreAdd: s } = mergeLineObjects(line);
      const packed = packLeftObjectRow(out);
      const newCol = [null, null, null, null];
      for (let j = 0; j < SIZE; j += 1) {
        newCol[SIZE - 1 - j] = packed[j];
      }
      scoreAdd += s;
      if (lineCellsChanged(beforeCol, newCol)) {
        changed = true;
      }
      for (let r = 0; r < SIZE; r += 1) {
        nb[r][c] = newCol[r];
      }
    }
    return { grid: nb, changed, scoreAdd };
  }

  return { grid: nb, changed: false, scoreAdd: 0 };
}

function boardFromGrid(grid) {
  return grid.map((row) => row.map((c) => (c ? c.v : 0)));
}

/**
 * 从只含数字的 board 建 grid（行优先编号 id）
 */
function gridFromNumberBoard(board, startId) {
  const grid = empty();
  let id = startId;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] > 0) {
        grid[r][c] = { id, v: board[r][c] };
        id += 1;
      }
    }
  }
  return { grid, nextId: id };
}

function toTilesList(grid) {
  const list = [];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (grid[r][c]) {
        list.push({ id: grid[r][c].id, v: grid[r][c].v, r, c });
      }
    }
  }
  return list;
}

/**
 * 在随机空位落子，与 game2048 spawn 概率一致
 * @param {number} nextId
 * @returns {{ nextId: number, spawnId: number } | { nextId: number, spawnId: -1 }} spawnId 为本次新块 id，未落子为 -1
 */
function spawnInGrid(grid, nextId) {
  const b = boardFromGrid(grid);
  const emptyCells = [];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (b[r][c] === 0) {
        emptyCells.push([r, c]);
      }
    }
  }
  if (emptyCells.length === 0) {
    return { nextId, spawnId: -1 };
  }
  const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const v = Math.random() < 0.9 ? 2 : 4;
  const sid = nextId;
  grid[r][c] = { id: nextId, v };
  return { nextId: nextId + 1, spawnId: sid };
}

module.exports = {
  SIZE,
  empty,
  cloneGrid,
  moveTileGrid,
  boardFromGrid,
  gridFromNumberBoard,
  toTilesList,
  spawnInGrid,
};
