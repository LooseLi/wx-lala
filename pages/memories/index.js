const {
  TIMELINE_TILE_LIGHT_B64,
  TIMELINE_TILE_DARK_B64,
} = require('./timeline-tiles.js');

const db = wx.cloud.database();
const memoriesDB = db.collection('memories');

const ROTATIONS = [-17, 7, -15, 14, -8, 6];

// 根据屏幕宽度动态计算卡片实际像素高度
// 卡片宽 = 屏幕宽 × 25%，上方正方形高 = 卡片宽，下方文字区 = 88rpx
const _sysInfo = wx.getSystemInfoSync();
const _rpx = _sysInfo.windowWidth / 750; // 1rpx 对应的 px 值
// 与 WXSS 槽宽 33.33% 一致
const CARD_UPPER_PX = Math.round((_sysInfo.windowWidth * 33.33) / 100);
const CARD_TEXT_PX = Math.round(88 * _rpx); // 文字区 88rpx → px
const CARD_HEIGHT_PX = CARD_UPPER_PX + CARD_TEXT_PX;
const CARD_MARGIN_PX = Math.round(100 * _rpx); // margin-bottom 100rpx → px
const SLOT_HEIGHT_PX = CARD_HEIGHT_PX + CARD_MARGIN_PX;
// 容器 padding（对应 WXSS 中 padding: 40rpx 0 60rpx）
const CONTAINER_PAD_TOP_PX = Math.round(40 * _rpx);
const CONTAINER_PAD_BOTTOM_PX = Math.round(60 * _rpx);
const CHARM_ROPE_BASE_PX = Math.round(32 * _rpx);
const CHARM_ROPE_OVERLAP_PX = Math.round(6 * _rpx);
const PAGE_SIZE = 20;
// 引导线瓦片覆盖的槽位数（2 槽一周期，repeat-y 无缝）
const TIMELINE_TILE_SLOT_COUNT = 2;

function rotationExtendBelow(deg) {
  const rad = Math.abs(deg) * Math.PI / 180;
  const halfW = CARD_UPPER_PX / 2;
  const halfH = CARD_HEIGHT_PX / 2;
  return Math.round(halfW * Math.sin(rad) + halfH * (1 - Math.cos(rad)));
}

function parseTimeMs(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof value === 'object') {
    if (value.$date) return parseTimeMs(value.$date);
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (typeof value.getTime === 'function') return value.getTime();
  }
  return 0;
}

// 有 date 用记录日期 00:00，否则用 createdAt
function computeSortAt(record) {
  const dateStr = (record.date || '').trim();
  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const t = new Date(y, m, d).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }
  const ms = parseTimeMs(record.createdAt);
  return ms || Date.now();
}

function normalizeMemoryRecord(record) {
  return {
    ...record,
    sortAt: record.sortAt != null ? record.sortAt : computeSortAt(record),
  };
}

function compareMemoriesDesc(a, b) {
  const sa = a.sortAt != null ? a.sortAt : computeSortAt(a);
  const sb = b.sortAt != null ? b.sortAt : computeSortAt(b);
  if (sb !== sa) return sb - sa;
  const ca = parseTimeMs(a.createdAt);
  const cb = parseTimeMs(b.createdAt);
  if (cb !== ca) return cb - ca;
  return (b._id || '').localeCompare(a._id || '');
}

function sortMemoriesDesc(records) {
  return [...records].sort(compareMemoriesDesc);
}

function buildTimelineTileStyle(theme) {
  const b64 = theme === 'dark' ? TIMELINE_TILE_DARK_B64 : TIMELINE_TILE_LIGHT_B64;
  const heightPx = TIMELINE_TILE_SLOT_COUNT * SLOT_HEIGHT_PX;
  return `background-image:url(data:image/png;base64,${b64});background-repeat:repeat-y;background-position:top center;background-size:100% ${heightPx}px;`;
}

Page({
  data: {
    filledRecords: [],
    hasMore: true,
    loadingMore: false,
    slots: [],
    draftText: '',
    draftDate: '',
    uploading: false,
    timelineTileStyle: '',
    charmTapIndex: -1,
    addTapIndex: -1,
    viewer: {
      show: false,
      slotIndex: -1,
      images: [],
      current: 0,
    },
  },

  onLoad() {
    this._initTimelineLayer();
    this.loadMemories({ reset: true });
    wx.onThemeChange(({ theme }) => {
      const resolved = theme === 'dark' ? 'dark' : 'light';
      this.setData({
        timelineTileStyle: buildTimelineTileStyle(resolved),
      });
    });
  },

  _initTimelineLayer() {
    const theme = wx.getSystemInfoSync().theme === 'dark' ? 'dark' : 'light';
    this.setData({
      timelineTileStyle: buildTimelineTileStyle(theme),
    });
  },

  // ─── 云数据库读取（分页） ──────────────────────────────────────
  async _fetchMemoriesPage(skip) {
    const res = await memoriesDB
      .orderBy('sortAt', 'desc')
      .skip(skip)
      .limit(PAGE_SIZE)
      .get();
    const raw = res.data || [];
    raw.forEach(item => {
      if (item.sortAt == null && item._id) {
        const sortAt = computeSortAt(item);
        memoriesDB.doc(item._id).update({ data: { sortAt } }).catch(() => {});
      }
    });
    return raw.map(normalizeMemoryRecord);
  },

  _applySlots() {
    const slots = this.buildSlots(this.data.filledRecords);
    this.setData({ slots });
  },

  async loadMemories(options = {}) {
    const reset = options.reset === true;
    if (!reset) {
      if (!this.data.hasMore || this.data.loadingMore) return;
      this.setData({ loadingMore: true });
    } else {
      wx.showLoading({ title: '加载中...', mask: true });
    }

    try {
      const skip = reset ? 0 : this.data.filledRecords.length;
      const page = await this._fetchMemoriesPage(skip);
      const merged = reset ? page : [...this.data.filledRecords, ...page];
      const filledRecords = sortMemoriesDesc(merged);
      const hasMore = page.length === PAGE_SIZE;
      const patch = { filledRecords, hasMore, loadingMore: false };
      if (reset) {
        patch.draftText = '';
        patch.draftDate = '';
      }
      this.setData(patch, () => this._applySlots());
    } catch (e) {
      console.error('加载回忆失败', e);
      if (reset) {
        this.setData({
          filledRecords: [],
          hasMore: false,
          loadingMore: false,
          draftText: '',
          draftDate: '',
        }, () => this._applySlots());
      } else {
        this.setData({ loadingMore: false });
      }
    } finally {
      if (reset) wx.hideLoading();
    }
  },

  loadMoreMemories() {
    this.loadMemories({ reset: false });
  },

  onReachBottom() {
    this.loadMoreMemories();
  },

  // ─── buildSlots：顶部唯一空槽 + 已加载记录（sortAt 降序） ─────
  buildSlots(filledCards) {
    const sorted = sortMemoriesDesc(filledCards);

    const emptySlot = {
      _id: null,
      slotKey: 'empty-slot',
      images: [],
      text: '',
      date: '',
      dateFormatted: '',
      rotation: 0,
      isLeft: true,
      dateY: CARD_HEIGHT_PX / 2,
    };

    const filled = sorted.map((card, i) => {
      const layoutIndex = i + 1;
      const isLeft = layoutIndex % 2 === 0;
      const rotation = ROTATIONS[layoutIndex % ROTATIONS.length];
      const extend = rotationExtendBelow(rotation);
      const ropePull = extend + CHARM_ROPE_OVERLAP_PX;
      const ropeH = CHARM_ROPE_BASE_PX + ropePull + CHARM_ROPE_OVERLAP_PX;
      return {
        ...card,
        slotKey: card._id,
        rotation,
        isLeft,
        dateY: layoutIndex * SLOT_HEIGHT_PX + CARD_HEIGHT_PX / 2,
        dateFormatted: this._formatDate(card.date),
        charmRopeLayerStyle: `margin-top:${extend}px;`,
        charmRopeStyle: `height:${ropeH}px;margin-top:-${ropePull}px;`,
        charmIconWrapStyle: `margin-top:${extend + CHARM_ROPE_BASE_PX}px;`,
      };
    });

    return [emptySlot, ...filled];
  },

  // ─── 日期格式化 ────────────────────────────────────────────────
  _formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[0]}.${parseInt(parts[1])}.${parseInt(parts[2])}`;
  },

  // ─── 图片选择 + 上传（共用） ────────────────────────────────────
  async _chooseAndUploadImages() {
    try {
      const chosen = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 9,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject,
        });
      });
      const tempFiles = chosen.tempFiles;
      if (!tempFiles || tempFiles.length === 0) return null;

      this.setData({
        uploading: true
      });
      wx.showLoading({
        title: '上传中...'
      });
      const fileIDs = await Promise.all(tempFiles.map(f => this._uploadFile(f.tempFilePath)));
      wx.hideLoading();
      this.setData({
        uploading: false
      });
      return fileIDs;
    } catch (e) {
      wx.hideLoading();
      this.setData({
        uploading: false
      });
      if (e && e.errMsg && e.errMsg.includes('cancel')) return null;
      console.error('图片上传失败', e);
      wx.showToast({
        title: '上传失败，请重试',
        icon: 'none'
      });
      return null;
    }
  },

  _uploadFile(tempFilePath) {
    const ext = tempFilePath.split('.').pop() || 'jpg';
    const cloudPath = `memories/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
        success: res => resolve(res.fileID),
        fail: reject,
      });
    });
  },

  // ─── 检查是否存在空的已有卡片 ─────────────────────────────────
  _hasEmptyFilledCard() {
    return this.data.filledRecords.some(
      r => (!r.images || r.images.length === 0) && !(r.text || '').trim()
    );
  },

  _playIconTapScale(dataKey, index) {
    this.setData({
      [dataKey]: -1
    });
    setTimeout(() => {
      this.setData({
        [dataKey]: index
      });
      setTimeout(() => {
        if (this.data[dataKey] === index) {
          this.setData({
            [dataKey]: -1
          });
        }
      }, 280);
    }, 0);
  },

  // ─── 点击 + 按钮：新建或追加图片 ──────────────────────────────
  async onAddImageTap(e) {
    if (this.data.uploading) return;
    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.slots[index];

    this._playIconTapScale('addTapIndex', index);

    if (!slot._id && this._hasEmptyFilledCard()) {
      wx.showToast({
        title: '先完善或删除已有的空卡片喔ฅ^•ﻌ•^ฅ',
        icon: 'none'
      });
      return;
    }

    const fileIDs = await this._chooseAndUploadImages();
    if (!fileIDs) return;

    if (slot._id) {
      const newImages = [...(slot.images || []), ...fileIDs];
      await this._updateRecord(slot._id, {
        images: newImages
      });
    } else {
      await this._addRecord({
        images: fileIDs,
        text: this.data.draftText.trim(),
        date: this.data.draftDate
      });
    }
  },

  // ─── 空槽文字输入（草稿） ──────────────────────────────────────
  onDraftTextInput(e) {
    this.setData({
      draftText: e.detail.value
    });
  },

  async onDraftTextBlur() {
    const text = this.data.draftText.trim();
    if (!text) return;
    if (this._hasEmptyFilledCard()) {
      wx.showToast({
        title: '先完善或删除已有的空卡片喔ฅ^•ﻌ•^ฅ',
        icon: 'none'
      });
      return;
    }
    await this._addRecord({
      images: [],
      text,
      date: this.data.draftDate
    });
  },

  // ─── 日期选择 ──────────────────────────────────────────────────
  async onDateChange(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.slots[index];
    const date = e.detail.value;
    if (slot._id) {
      await this._updateRecord(slot._id, {
        date
      });
    } else {
      const slots = this.data.slots.map((s, i) =>
        i === index ? {
          ...s,
          date,
          dateFormatted: this._formatDate(date)
        } : s
      );
      this.setData({
        slots,
        draftDate: date
      });
    }
  },

  // ─── 已有卡片文字编辑（失焦保存） ─────────────────────────────
  async onFilledTextBlur(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.slots[index];
    if (!slot || !slot._id) return;
    const newText = e.detail.value.trim();
    if (newText === (slot.text || '').trim()) return;
    await this._updateRecord(slot._id, {
      text: newText
    });
  },

  // ─── 删除整张卡片 ──────────────────────────────────────────────
  onDeleteCard(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.slots[index];
    if (!slot || !slot._id) return;

    this._playIconTapScale('charmTapIndex', index);

    wx.showModal({
      title: '删除',
      content: '确认要删除嘛(=ＴェＴ=)',
      confirmColor: '#ff3b30',
      success: async res => {
        if (!res.confirm) return;
        await this._deleteRecord(slot._id);
      },
    });
  },

  // ─── 云数据库写操作 ────────────────────────────────────────────
  async _addRecord(data) {
    const date = data.date || '';
    const createdAtMs = Date.now();
    const sortAt = computeSortAt({ date, createdAt: createdAtMs });
    const res = await memoriesDB.add({
      data: {
        sortAt,
        images: data.images || [],
        text: data.text || '',
        date,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    });
    const newRecord = normalizeMemoryRecord({
      _id: res._id,
      sortAt,
      images: data.images || [],
      text: data.text || '',
      date,
      createdAt: createdAtMs,
    });
    const filledRecords = sortMemoriesDesc([...this.data.filledRecords, newRecord]);
    this.setData({ filledRecords, draftText: '', draftDate: '' }, () => this._applySlots());
  },

  async _updateRecord(docId, updates) {
    const current = this.data.filledRecords.find(r => r._id === docId);
    if (!current) return;

    const merged = { ...current, ...updates };
    const cloudPatch = {
      ...updates,
      updatedAt: db.serverDate(),
    };
    if (Object.prototype.hasOwnProperty.call(updates, 'date')) {
      cloudPatch.sortAt = computeSortAt(merged);
    }

    await memoriesDB.doc(docId).update({ data: cloudPatch });

    let filledRecords = this.data.filledRecords.map(r => {
      if (r._id !== docId) return r;
      return normalizeMemoryRecord({
        ...r,
        ...updates,
        sortAt: cloudPatch.sortAt != null ? cloudPatch.sortAt : r.sortAt,
      });
    });
    if (Object.prototype.hasOwnProperty.call(updates, 'date')) {
      filledRecords = sortMemoriesDesc(filledRecords);
    }
    this.setData({ filledRecords }, () => this._applySlots());
  },

  async _deleteRecord(docId) {
    await memoriesDB.doc(docId).remove();
    const filledRecords = this.data.filledRecords.filter(r => r._id !== docId);
    this.setData({ filledRecords }, () => this._applySlots());
  },

  // ─── 全屏图片预览 Overlay ──────────────────────────────────────
  openViewer(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.slots[index];
    if (!slot || !slot.images || slot.images.length === 0) return;
    this.setData({
      viewer: {
        show: true,
        slotIndex: index,
        images: [...slot.images],
        current: 0,
      },
    });
  },

  closeViewer() {
    this.setData({
      'viewer.show': false
    });
  },

  noop() {},

  onViewerSwiperChange(e) {
    this.setData({
      'viewer.current': e.detail.current
    });
  },

  viewerDeleteCurrent() {
    const {
      slotIndex,
      images,
      current
    } = this.data.viewer;
    const slot = this.data.slots[slotIndex];
    if (!slot || !slot._id) return;
    wx.showModal({
      title: '删除图片',
      content: '确认删除这张图片嘛(=ＴェＴ=)',
      success: async res => {
        if (!res.confirm) return;
        const newImages = images.filter((_, i) => i !== current);
        if (newImages.length === 0) {
          this.closeViewer();
        }
        await this._updateRecord(slot._id, {
          images: newImages
        });
        if (newImages.length > 0) {
          this.setData({
            viewer: {
              ...this.data.viewer,
              images: newImages,
              current: Math.min(current, newImages.length - 1),
            },
          });
        }
      },
    });
  },

  async viewerAddImages() {
    const {
      slotIndex
    } = this.data.viewer;
    const slot = this.data.slots[slotIndex];
    if (!slot || !slot._id) return;

    const fileIDs = await this._chooseAndUploadImages();
    if (!fileIDs) return;

    const newImages = [...this.data.viewer.images, ...fileIDs];
    await this._updateRecord(slot._id, {
      images: newImages
    });
    this.setData({
      'viewer.images': newImages
    });
  },

});