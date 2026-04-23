const g = require('../../utils/game2048.js');

const BEST_KEY = 'lala_2048_best';
const THRESHOLD = 30; // 滑动有效最小像素

function loadBest() {
  const v = wx.getStorageSync(BEST_KEY);
  return typeof v === 'number' && v >= 0 ? v : 0;
}

function saveBest(score) {
  const prev = loadBest();
  if (score > prev) {
    wx.setStorageSync(BEST_KEY, score);
    return score;
  }
  return prev;
}

Page({
  data: {
    board: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    score: 0,
    best: 0,
    gameOver: false,
    won: false,
    showWinMask: false,
  },

  _tx: 0,
  _ty: 0,
  _touching: false,

  onLoad() {
    this.setData({ best: loadBest() });
    this._startNewGame();
  },

  onShow() {
    this.setData({ best: loadBest() });
  },

  _startNewGame() {
    const board = g.initNewGame();
    this.setData({
      board,
      score: 0,
      gameOver: false,
      won: false,
      showWinMask: false,
    });
  },

  onNewGame() {
    wx.showModal({
      title: '新游戏',
      content: '要重新开始吗？',
      success: (res) => {
        if (res.confirm) {
          this._startNewGame();
        }
      },
    });
  },

  onNewGameQuick() {
    this._startNewGame();
  },

  handleMove(dir) {
    if (this.data.gameOver) {
      return;
    }
    const prevBoard = g.cloneBoard(this.data.board);
    const { board: next, changed, scoreAdd } = g.moveBoard(prevBoard, dir);
    if (!changed) {
      return;
    }

    g.spawnTile(next);
    let { score, won, showWinMask } = this.data;
    score += scoreAdd;

    if (!won && g.hasReached2048(next)) {
      won = true;
      showWinMask = true;
    }

    const best = saveBest(score);
    const gameOver = !g.hasValidMove(next);

    this.setData({
      board: next,
      score,
      best,
      won,
      showWinMask,
      gameOver,
    });

    if (gameOver) {
      saveBest(score);
    }
  },

  onContinueAfterWin() {
    this.setData({ showWinMask: false });
  },

  touchStart(e) {
    if (this.data.gameOver) {
      return;
    }
    const t = e.touches[0];
    this._tx = t.clientX;
    this._ty = t.clientY;
    this._touching = true;
  },

  touchEnd(e) {
    if (!this._touching || this.data.gameOver) {
      return;
    }
    this._touching = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - this._tx;
    const dy = t.clientY - this._ty;
    if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) {
      return;
    }
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.handleMove(dx > 0 ? 'right' : 'left');
    } else {
      this.handleMove(dy > 0 ? 'down' : 'up');
    }
  },

  onRetry() {
    this._startNewGame();
  },

  /** 阻止棋盘区域把滑动冒泡到页面产生滚动 */
  catchMove() {},

  onShareAppMessage() {
    return {
      title: '来 lala 玩 2048',
      path: '/pages/index/index',
    };
  },
});
