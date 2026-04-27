const lottie = require('lottie-miniprogram');
const g = require('../../utils/game2048.js');
const tgrid = require('../../utils/game2048Tiles.js');

/** 胜利 Lottie 云地址；path 需配「下载」合法域名；带 sign 的 URL 会过期，上线后换长期链接 */
const WIN_LOTTE_JSON_URL =
  'https://6c61-lala-tsum-6gem2abq66c46985-1308328307.tcb.qcloud.la/lottie/emoji_celebrate.json?sign=1b451d8f28ec10070945129e881c07f1&t=1776934185';

const BEST_KEY = 'lala_2048_best';
const THRESHOLD = 30;

/** 里程碑格值；与云 grantGame2048Milestone 一致 */
const MILESTONE_TIERS = [512, 1024, 2048];

/** 与 wxss 中 .row / .board-bg 的 gap 一致 */
const GAP_RPX = 12;

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

/**
 * 把 tile-layer 的 px 宽高换算为 rpx 后，按与底格 flex+gap 相同公式求单格与坐标
 * @param {number} widthPx
 * @param {number} heightPx
 * @param {number} windowWidth
 */
function metricsFromRect(widthPx, heightPx, windowWidth) {
  if (!widthPx || !heightPx) {
    return null;
  }
  const wR = (widthPx * 750) / windowWidth;
  const hR = (heightPx * 750) / windowWidth;
  const cellW = (wR - 3 * GAP_RPX) / 4;
  const cellH = (hR - 3 * GAP_RPX) / 4;
  return { cellW, cellH, gap: GAP_RPX, wR, hR };
}

/**
 * 根据量到的 metrics 将盘面列表变成带 rpx 的样式项
 */
function layoutTilesRpx(flat, spawnNudgeId, m) {
  if (!m || m.cellW <= 0 || m.cellH <= 0) {
    return null;
  }
  const { cellW, cellH, gap } = m;
  return flat.map((item) => {
    return {
      id: item.id,
      v: item.v,
      r: item.r,
      c: item.c,
      l: (item.c * (cellW + gap)).toFixed(2),
      tp: (item.r * (cellH + gap)).toFixed(2),
      w: cellW.toFixed(2),
      h: cellH.toFixed(2),
      isSpawn: spawnNudgeId > 0 && item.id === spawnNudgeId,
    };
  });
}

Page({
  data: {
    rowIdx: [0, 1, 2, 3],
    board: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    tiles: [],
    score: 0,
    best: 0,
    gameOver: false,
    won: false,
    showWinMask: false,
    /** 本局是否已用掉免费复活（新局在 _startNewGame 里会置为 false） */
    reviveFreeUsed: false,
    currentPoints: 0,
  },

  _tx: 0,
  _ty: 0,
  _touching: false,
  _grid: null,
  _nextId: 1,
  _spawnTimer: null,
  /** @type {null | { cellW: number, cellH: number, gap: number, wR: number, hR: number }} */
  _layoutMetrics: null,
  _measureTries: 0,
  _winLottieAnim: null,
  /** @type {object | null} 预拉取的 Lottie JSON，胜利时用 animationData 避免再请求 */
  _winLottieJsonData: null,
  _winLottiePrefetching: false,
  /** @type {Record<number, boolean>} 本局已确认发放的档位 */
  _milestoneGranted: null,
  /** @type {Record<number, boolean>} 本档是否正在请求云函数 */
  _milestoneInFlight: null,
  _reviveInFlight: false,

  onLoad() {
    this.setData({ best: loadBest() });
    this._prefetchWinLottieJson();
    this._startNewGame();
  },

  onReady() {
    this._scheduleMeasureLayout();
  },

  onShow() {
    this.setData({ best: loadBest() });
    this._scheduleMeasureLayout();
    this._fetchCurrentPoints();
    if (!this._winLottieJsonData) {
      this._prefetchWinLottieJson();
    }
  },

  _fetchCurrentPoints() {
    if (!wx.cloud) {
      return;
    }
    wx.cloud.callFunction({
      name: 'getCheckInStatus',
      data: {},
      success: (res) => {
        const r = res.result;
        if (r && r.success && r.data && typeof r.data.currentPoints === 'number') {
          this.setData({ currentPoints: r.data.currentPoints || 0 });
        }
      },
    });
  },

  onUnload() {
    if (this._spawnTimer) {
      clearTimeout(this._spawnTimer);
      this._spawnTimer = null;
    }
    this._destroyWinLottie();
    this._winLottieJsonData = null;
    this._winLottiePrefetching = false;
  },

  _destroyWinLottie() {
    if (this._winLottieAnim) {
      try {
        this._winLottieAnim.destroy();
      } catch (e) {
        /* noop */
      }
      this._winLottieAnim = null;
    }
  },

  /**
   * 进页预下载 Lottie JSON（downloadFile 合法域名需含云存储 host）；
   * 成功则解析为对象，_initWinLottie 优先用 animationData，避免首屏等 CDN。
   */
  _prefetchWinLottieJson() {
    if (this._winLottieJsonData || this._winLottiePrefetching) {
      return;
    }
    this._winLottiePrefetching = true;
    const fs = wx.getFileSystemManager();
    wx.downloadFile({
      url: WIN_LOTTE_JSON_URL,
      success: (res) => {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          this._winLottiePrefetching = false;
          return;
        }
        fs.readFile({
          filePath: res.tempFilePath,
          encoding: 'utf8',
          success: (readRes) => {
            this._winLottiePrefetching = false;
            try {
              this._winLottieJsonData = JSON.parse(
                readRes.data,
              );
            } catch (e) {
              this._winLottieJsonData = null;
            }
          },
          fail: () => {
            this._winLottiePrefetching = false;
          },
        });
      },
      fail: () => {
        this._winLottiePrefetching = false;
      },
    });
  },

  _initWinLottie() {
    if (!this.data.showWinMask || this.data.gameOver) {
      return;
    }
    this._destroyWinLottie();
    const query = wx.createSelectorQuery().in(this);
    query
      .select('#g2048-win-lottie')
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0];
        const canvas = info && info.node;
        if (!canvas) {
          return;
        }
        const w = info.width || 220;
        const h = info.height || 220;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 1;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
        lottie.setup(canvas);
        const animOpts = {
          loop: true,
          autoplay: true,
          rendererSettings: {
            context: ctx,
          },
        };
        if (this._winLottieJsonData) {
          animOpts.animationData = this._winLottieJsonData;
        } else {
          animOpts.path = WIN_LOTTE_JSON_URL;
        }
        this._winLottieAnim = lottie.loadAnimation(animOpts);
      });
  },

  _scheduleMeasureLayout() {
    this._measureTries = 0;
    const run = () => {
      const sys = wx.getSystemInfoSync();
      const q = wx.createSelectorQuery().in(this);
      q.select('#g2048-tile-layer').boundingClientRect();
      q.exec((res) => {
        const rect = res && res[0];
        if (rect && rect.width > 2 && rect.height > 2) {
          this._layoutMetrics = metricsFromRect(
            rect.width,
            rect.height,
            sys.windowWidth,
          );
          this._rebuildTilesInView(-1);
          return;
        }
        this._measureTries += 1;
        if (this._measureTries < 8) {
          setTimeout(run, 50);
        }
      });
    };
    run();
  },

  /**
   * 用当前 _layoutMetrics 重算 setData 中的 tiles、board
   * @param {number} spawnNudgeId
   */
  _rebuildTilesInView(spawnNudgeId) {
    if (!this._grid) {
      return;
    }
    const board = tgrid.boardFromGrid(this._grid);
    const list = tgrid.toTilesList(this._grid);
    const tiles = layoutTilesRpx(list, spawnNudgeId, this._layoutMetrics);
    this.setData({
      board,
      tiles: tiles || [],
    });
  },

  _initGameSession() {
    this._milestoneGranted = { 512: false, 1024: false, 2048: false };
    this._milestoneInFlight = { 512: false, 1024: false, 2048: false };
  },

  /**
   * 死局盘面上互不相同的正数值升序，取最小两个
   * @param {number[][]} numBoard
   * @returns {null | { a: number, b: number }}
   */
  _getTwoSmallestDistinctValues(numBoard) {
    const s = new Set();
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const v = numBoard[r][c];
        if (v > 0) {
          s.add(v);
        }
      }
    }
    const arr = Array.from(s).sort((x, y) => x - y);
    if (arr.length < 2) {
      return null;
    }
    return { a: arr[0], b: arr[1] };
  },

  /**
   * 将盘面上值等于 a 或 b 的格清空，保留 tile id
   * @param {number} a
   * @param {number} b
   * @returns {boolean} 清盘后是否仍有可移动
   */
  _applyReviveClear(a, b) {
    if (!this._grid) {
      return false;
    }
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const cell = this._grid[r][c];
        if (cell && (cell.v === a || cell.v === b)) {
          this._grid[r][c] = null;
        }
      }
    }
    this._rebuildTilesInView(-1);
    return g.hasValidMove(tgrid.boardFromGrid(this._grid));
  },

  /**
   * 合并后根据盘面最大格尝试发放里程碑（每档本局只发成功一次）
   * @param {number} maxTile
   */
  _checkMilestonesAfterMove(maxTile) {
    if (!this._milestoneGranted) {
      return;
    }
    for (const tier of MILESTONE_TIERS) {
      if (maxTile < tier) {
        break;
      }
      if (this._milestoneGranted[tier]) {
        continue;
      }
      this._grantMilestone(tier);
    }
  },

  _grantMilestone(tier) {
    if (!this._milestoneGranted || this._milestoneGranted[tier]) {
      return;
    }
    if (this._milestoneInFlight[tier]) {
      return;
    }
    this._milestoneInFlight[tier] = true;
    if (!wx.cloud) {
      this._milestoneInFlight[tier] = false;
      return;
    }
    wx.cloud.callFunction({
      name: 'grantGame2048Milestone',
      data: { tier },
      success: (res) => {
        this._milestoneInFlight[tier] = false;
        const r = res.result;
        if (!r || !r.success) {
          const msg = (r && r.error) || '发奖失败';
          wx.showToast({ title: String(msg), icon: 'none' });
          return;
        }
        this._milestoneGranted[tier] = true;
        const gp = r.grantedPoints;
        if (typeof gp === 'number' && gp > 0) {
          wx.showToast({
            title: `+${gp} 积分`,
            icon: 'none',
          });
        }
      },
      fail: (err) => {
        this._milestoneInFlight[tier] = false;
        wx.showToast({
          title: (err && err.errMsg) || '网络异常',
          icon: 'none',
        });
      },
    });
  },

  _startNewGame() {
    if (this._spawnTimer) {
      clearTimeout(this._spawnTimer);
      this._spawnTimer = null;
    }
    this._initGameSession();
    const b = g.initNewGame();
    const built = tgrid.gridFromNumberBoard(b, 1);
    this._grid = built.grid;
    this._nextId = built.nextId;
    this._destroyWinLottie();
    this.setData({
      score: 0,
      gameOver: false,
      won: false,
      showWinMask: false,
      reviveFreeUsed: false,
    });
    this._rebuildTilesInView(-1);
    this._scheduleMeasureLayout();
  },

  _syncView(spawnNudgeId) {
    this._rebuildTilesInView(spawnNudgeId);
    if (spawnNudgeId > 0) {
      this._spawnTimer = setTimeout(() => {
        this.setData({
          tiles: layoutTilesRpx(
            tgrid.toTilesList(this._grid),
            -1,
            this._layoutMetrics,
          ) || [],
        });
        this._spawnTimer = null;
      }, 200);
    }
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
    if (this._spawnTimer) {
      clearTimeout(this._spawnTimer);
      this._spawnTimer = null;
    }

    const { grid, changed, scoreAdd } = tgrid.moveTileGrid(
      tgrid.cloneGrid(this._grid),
      dir,
    );
    if (!changed) {
      return;
    }

    this._grid = grid;
    const { nextId, spawnId } = tgrid.spawnInGrid(this._grid, this._nextId);
    this._nextId = nextId;

    let { score, won, showWinMask } = this.data;
    score += scoreAdd;

    if (!won && g.hasReached2048(tgrid.boardFromGrid(this._grid))) {
      won = true;
      showWinMask = true;
    }

    const best = saveBest(score);
    const gameOver = !g.hasValidMove(tgrid.boardFromGrid(this._grid));

    this.setData({
      score,
      best,
      won,
      showWinMask,
      gameOver,
    });

    if (showWinMask) {
      wx.nextTick(() => {
        this._initWinLottie();
      });
    }

    this._syncView(spawnId);

    const maxTile = g.getMaxTile(tgrid.boardFromGrid(this._grid));
    this._checkMilestonesAfterMove(maxTile);

    if (gameOver) {
      saveBest(score);
    }
  },

  onContinueAfterWin() {
    this._destroyWinLottie();
    this.setData({ showWinMask: false });
  },

  touchStart(e) {
    if (this.data.gameOver) {
      return;
    }
    const t0 = e.touches[0];
    this._tx = t0.clientX;
    this._ty = t0.clientY;
    this._touching = true;
  },

  touchEnd(e) {
    if (!this._touching || this.data.gameOver) {
      return;
    }
    this._touching = false;
    const t0 = e.changedTouches[0];
    const dx = t0.clientX - this._tx;
    const dy = t0.clientY - this._ty;
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

  onRevive() {
    if (!this.data.gameOver) {
      return;
    }
    if (this._reviveInFlight) {
      return;
    }
    const numBoard = tgrid.boardFromGrid(this._grid);
    const ab = this._getTwoSmallestDistinctValues(numBoard);
    if (!ab) {
      wx.showToast({ title: '无法复活', icon: 'none' });
      return;
    }

    const { a, b } = ab;
    const usePaid = this.data.reviveFreeUsed;

    if (!usePaid) {
      this._reviveInFlight = true;
      const stillPlayable = this._applyReviveClear(a, b);
      this._reviveInFlight = false;
      if (stillPlayable) {
        this.setData({ gameOver: false, reviveFreeUsed: true });
      } else {
        wx.showToast({ title: '仍无法继续', icon: 'none' });
        this.setData({ reviveFreeUsed: true });
      }
      return;
    }

    if (!wx.cloud) {
      wx.showToast({ title: '未开通云', icon: 'none' });
      return;
    }
    this._reviveInFlight = true;
    wx.cloud.callFunction({
      name: 'spendGame2048Revive',
      data: {},
      success: (res) => {
        this._reviveInFlight = false;
        const r = res.result;
        if (!r || !r.success) {
          wx.showToast({ title: (r && r.error) || '扣费失败', icon: 'none' });
          return;
        }
        if (typeof r.currentPoints === 'number') {
          this.setData({ currentPoints: r.currentPoints });
        } else {
          this._fetchCurrentPoints();
        }
        const ok = this._applyReviveClear(a, b);
        if (ok) {
          this.setData({ gameOver: false });
        } else {
          wx.showToast({ title: '仍无法继续', icon: 'none' });
        }
      },
      fail: (err) => {
        this._reviveInFlight = false;
        wx.showToast({ title: (err && err.errMsg) || '网络异常', icon: 'none' });
      },
    });
  },

  catchMove() {},

  onShareAppMessage() {
    return {
      title: '来 lala 玩 2048',
      path: '/pages/index/index',
    };
  },
});
