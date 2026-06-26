const ASSET_COLORS = [
  '#EF4444',
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#10B981',
  '#EC4899',
];

const DEFAULT_CATEGORIES = ['基金', '债券', '现金', '黄金', '股票', '其他'];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function calcTotal(assets) {
  return assets.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
}

function formatAmount(amount) {
  if (amount >= 100000000) return (amount / 100000000).toFixed(2) + ' 亿';
  if (amount >= 10000) return (amount / 10000).toFixed(2) + ' 万';
  return amount.toLocaleString('zh-CN');
}

function formatAmountShort(amount) {
  if (amount >= 100000000) return (amount / 100000000).toFixed(1) + '亿';
  if (amount >= 10000) return Math.round(amount / 10000) + '万';
  return String(Math.round(amount));
}

function calcPercent(amount, total) {
  if (!total) return '0.0';
  return ((amount / total) * 100).toFixed(1);
}

function processHistory(history) {
  return history.map(yr => {
    const total = yr.totalAmount || calcTotal(yr.assets);
    const sortedAssets = [...yr.assets].sort((a, b) => b.amount - a.amount);
    const top3 = sortedAssets.slice(0, 3).map(a => ({
      ...a,
      percent: calcPercent(a.amount, total),
    }));
    const assets = yr.assets.map(a => ({
      ...a,
      amountStr: formatAmount(a.amount),
      percent: calcPercent(a.amount, total),
    }));
    return {
      ...yr,
      totalAmountStr: formatAmount(total),
      top3,
      assets,
    };
  });
}

Page({
  data: {
    ASSET_COLORS,
    loading: true,
    currentAssets: [],
    history: [],

    // 统计数据
    totalAmountStr: '0',
    categoryCount: 0,
    growthAmountStr: '',
    growthPercent: null,
    isPositive: true,
    hasHistory: false,

    // 环形图图例
    donutLegend: [],

    // 历年视图
    historyView: 'table',
    expandedYears: {},

    // 折线图图例
    lineLegend: [],

    // 编辑弹窗
    editorVisible: false,
    editingAssets: [],

    // 归档弹窗
    archiveVisible: false,
    archiveYear: String(new Date().getFullYear()),
    archiveNote: '',
    archiveError: '',

    // 计算器
    calcVisible: false,
    fabX: 0,
    fabY: 0,
  },

  // 原始历史数据（不放入 data 以避免频繁 setData）
  _rawHistory: [],

  onLoad() {
    this._initFabPosition();
    this.loadData();
  },

  _initFabPosition() {
    const sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const FAB_SIZE = 96 / 750 * sysInfo.windowWidth;
    const x = sysInfo.windowWidth - FAB_SIZE - (40 / 750 * sysInfo.windowWidth);
    const y = sysInfo.windowHeight - FAB_SIZE - (120 / 750 * sysInfo.windowWidth);
    this.setData({ fabX: x, fabY: y });
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'assetServices',
        data: { action: 'getAssets' },
      });
      const result = res.result || {};
      if (result.success === false) {
        console.error('getAssets returned error:', result.error);
        wx.showToast({ title: '加载失败，请重试', icon: 'none' });
        return;
      }
      this._updatePageState(result.currentAssets || [], result.history || []);
    } catch (e) {
      console.error('loadData error:', e);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  _updatePageState(currentAssets, rawHistory) {
    this._rawHistory = [...rawHistory].sort((a, b) => b.year - a.year);
    const processedHistory = processHistory(this._rawHistory);

    const total = calcTotal(currentAssets);
    const categoryCount = currentAssets.length;

    // 同比变化：与上一年（当前年份 - 1）的归档记录对比
    let growthAmountStr = '';
    let growthPercent = null;
    let isPositive = true;
    const lastYear = new Date().getFullYear() - 1;
    const lastYearRecord = this._rawHistory.find(r => r.year === lastYear);
    const hasHistory = !!lastYearRecord;
    if (hasHistory) {
      const lastTotal = lastYearRecord.totalAmount || calcTotal(lastYearRecord.assets);
      const diff = total - lastTotal;
      isPositive = diff >= 0;
      growthAmountStr = formatAmount(Math.abs(diff));
      if (lastTotal > 0) {
        growthPercent = Math.abs((diff / lastTotal) * 100).toFixed(1);
      }
    }

    // 环形图图例
    const donutLegend = currentAssets.map(a => ({
      ...a,
      percent: calcPercent(a.amount, total),
      amountStr: formatAmount(a.amount),
    }));

    // 折线图图例
    const catMap = new Map();
    this._rawHistory.forEach(yr => {
      yr.assets.forEach(a => {
        if (!catMap.has(a.name)) catMap.set(a.name, a.color);
      });
    });
    const lineLegend = [
      { name: '总资产', color: '#6366F1', isTotal: true },
      ...[...catMap.entries()].map(([name, color]) => ({ name, color, isTotal: false })),
    ];

    this.setData({
      currentAssets,
      history: processedHistory,
      totalAmountStr: formatAmount(total),
      categoryCount,
      growthAmountStr,
      growthPercent,
      isPositive,
      hasHistory,
      donutLegend,
      lineLegend,
    });

    wx.nextTick(() => {
      if (currentAssets.length) this._drawDonutChart(currentAssets, total);
      if (this.data.historyView === 'chart') this._drawLineChart();
    });
  },

  // ─── 环形图 ──────────────────────────────────────────────────
  _drawDonutChart(assets, total) {
    if (!assets || !assets.length) return;
    const query = wx.createSelectorQuery().in(this);
    query
      .select('#donutCanvas')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = sysInfo.pixelRatio || 2;
        const w = res[0].width;
        const h = res[0].height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const outerR = Math.min(w, h) * 0.42;
        const innerR = outerR * 0.62;
        let startAngle = -Math.PI / 2;

        assets.forEach(asset => {
          const slice = (asset.amount / total) * 2 * Math.PI;
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
          ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
          ctx.closePath();
          ctx.fillStyle = asset.color;
          ctx.fill();
          startAngle += slice;
        });
      });
  },

  // ─── 折线图 ──────────────────────────────────────────────────
  _drawLineChart() {
    const rawHistory = this._rawHistory;
    if (!rawHistory || rawHistory.length < 2) return;
    const query = wx.createSelectorQuery().in(this);
    query
      .select('#lineCanvas')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = sysInfo.pixelRatio || 2;
        const w = res[0].width;
        const h = res[0].height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        const pL = 60,
          pR = 16,
          pT = 16,
          pB = 38;
        const cW = w - pL - pR;
        const cH = h - pT - pB;

        // 按年份升序排列用于绘制
        const sorted = [...rawHistory].sort((a, b) => a.year - b.year);
        const n = sorted.length;

        // 收集所有类别
        const catNames = [];
        const catColors = {};
        sorted.forEach(yr => {
          yr.assets.forEach(a => {
            if (!catNames.includes(a.name)) {
              catNames.push(a.name);
              catColors[a.name] = a.color;
            }
          });
        });

        const totalVals = sorted.map(yr => yr.totalAmount || calcTotal(yr.assets));
        const catVals = catNames.map(name =>
          sorted.map(yr => {
            const found = yr.assets.find(a => a.name === name);
            return found ? found.amount : 0;
          })
        );

        const allVals = [...totalVals, ...catVals.flat()];
        const maxVal = Math.max(...allVals) * 1.08 || 1;
        const xStep = n > 1 ? cW / (n - 1) : cW;
        const toX = i => pL + i * xStep;
        const toY = v => pT + cH - (v / maxVal) * cH;

        // 网格线
        ctx.strokeStyle = 'rgba(134,134,139,0.18)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([]);
        for (let i = 0; i <= 4; i++) {
          const y = pT + (cH / 4) * i;
          ctx.beginPath();
          ctx.moveTo(pL, y);
          ctx.lineTo(w - pR, y);
          ctx.stroke();
        }

        // Y 轴标签
        ctx.fillStyle = '#86868b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) {
          const v = (maxVal * (4 - i)) / 4;
          const y = pT + (cH / 4) * i;
          ctx.fillText(formatAmountShort(v), pL - 5, y);
        }

        // X 轴标签
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        sorted.forEach((yr, i) => {
          ctx.fillText(String(yr.year), toX(i), pT + cH + 7);
        });

        // 各类别折线
        catNames.forEach((name, ni) => {
          ctx.beginPath();
          ctx.setLineDash([]);
          ctx.strokeStyle = catColors[name];
          ctx.lineWidth = 1.5;
          catVals[ni].forEach((v, i) => {
            if (i === 0) ctx.moveTo(toX(i), toY(v));
            else ctx.lineTo(toX(i), toY(v));
          });
          ctx.stroke();
        });

        // 总资产折线（实线）
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#6366F1';
        ctx.lineWidth = 2.5;
        totalVals.forEach((v, i) => {
          if (i === 0) ctx.moveTo(toX(i), toY(v));
          else ctx.lineTo(toX(i), toY(v));
        });
        ctx.stroke();

        // 总资产数据点
        totalVals.forEach((v, i) => {
          ctx.beginPath();
          ctx.setLineDash([]);
          ctx.arc(toX(i), toY(v), 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#6366F1';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      });
  },

  // ─── 历年视图切换 ─────────────────────────────────────────────
  switchView(e) {
    const view = e.currentTarget.dataset.view;
    this.setData({ historyView: view });
    if (view === 'chart') {
      wx.nextTick(() => this._drawLineChart());
    }
  },

  toggleYearExpand(e) {
    const year = e.currentTarget.dataset.year;
    const expandedYears = Object.assign({}, this.data.expandedYears);
    if (expandedYears[year]) {
      delete expandedYears[year];
    } else {
      expandedYears[year] = true;
    }
    this.setData({ expandedYears });
  },

  onDeleteRecord(e) {
    const { id, year } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除确认',
      content: `确定删除 ${year} 年的归档记录吗？`,
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: async res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...' });
        try {
          await wx.cloud.callFunction({
            name: 'assetServices',
            data: { action: 'deleteRecord', recordId: id },
          });
          const rawHistory = this._rawHistory.filter(r => r._id !== id);
          this._updatePageState(this.data.currentAssets, rawHistory);
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch {
          wx.showToast({ title: '删除失败', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      },
    });
  },

  // ─── 编辑弹窗 ─────────────────────────────────────────────────
  openEditorDialog() {
    // 以固定类别为基准，回填已有金额
    const existing = {};
    this.data.currentAssets.forEach(a => { existing[a.name] = a; });
    const editingAssets = DEFAULT_CATEGORIES.map((name, i) => ({
      id: existing[name] ? existing[name].id : generateId(),
      name,
      amount: existing[name] ? String(existing[name].amount) : '0',
      color: ASSET_COLORS[i],
    }));
    this.setData({ editorVisible: true, editingAssets });
  },

  closeEditorDialog() {
    this.setData({ editorVisible: false });
  },

  onAssetAmountChange(e) {
    const eidx = Number(e.currentTarget.dataset.eidx);
    const editingAssets = [...this.data.editingAssets];
    editingAssets[eidx] = { ...editingAssets[eidx], amount: e.detail.value };
    this.setData({ editingAssets });
  },

  async onSaveAssets() {
    // 过滤金额为空或 0 的类别
    const assets = this.data.editingAssets
      .filter(a => Number(a.amount) > 0)
      .map(a => ({
        id: a.id,
        name: a.name,
        amount: Number(a.amount),
        color: a.color,
      }));

    if (!assets.length) {
      wx.showToast({ title: '请至少填写一项资产金额', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'assetServices',
        data: { action: 'saveAssets', assets },
      });
      if (!res.result || !res.result.success) {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
        return;
      }
      this._updatePageState(assets, this._rawHistory);
      this.setData({ editorVisible: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ─── 归档弹窗 ─────────────────────────────────────────────────
  openArchiveDialog() {
    if (!this.data.currentAssets.length) {
      wx.showToast({ title: '请先配置资产', icon: 'none' });
      return;
    }
    this.setData({
      archiveVisible: true,
      archiveYear: String(new Date().getFullYear()),
      archiveNote: '',
      archiveError: '',
    });
  },

  closeArchiveDialog() {
    this.setData({ archiveVisible: false });
  },

  onArchiveYearChange(e) {
    this.setData({ archiveYear: e.detail.value, archiveError: '' });
  },

  onArchiveNoteChange(e) {
    this.setData({ archiveNote: e.detail.value });
  },

  async onArchive() {
    const year = parseInt(this.data.archiveYear, 10);
    if (!year || year < 2000 || year > 2100) {
      wx.showToast({ title: '请输入有效年份（2000–2100）', icon: 'none' });
      return;
    }
    const existingYears = this._rawHistory.map(r => r.year);
    if (existingYears.includes(year)) {
      wx.showToast({ title: '该年份已归档，请先删除已有归档', icon: 'none' });
      return;
    }

    const assets = this.data.currentAssets;
    const totalAmount = calcTotal(assets);

    wx.showLoading({ title: '归档中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'assetServices',
        data: {
          action: 'archiveYear',
          year,
          assets,
          totalAmount,
          note: this.data.archiveNote,
        },
      });
      if (!res.result || !res.result.success) {
        wx.showToast({ title: (res.result && res.result.error) || '归档失败', icon: 'none' });
        return;
      }
      await this.loadData();
      this.setData({ archiveVisible: false });
      wx.showToast({ title: '归档成功', icon: 'success' });
    } catch {
      wx.showToast({ title: '归档失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onOverlayTap() {
    if (this.data.editorVisible) this.closeEditorDialog();
    if (this.data.archiveVisible) this.closeArchiveDialog();
  },

  // ─── 计算器 ──────────────────────────────────────────────────
  toggleCalc() {
    this.setData({ calcVisible: !this.data.calcVisible });
  },

  closeCalc() {
    this.setData({ calcVisible: false });
  },
});
