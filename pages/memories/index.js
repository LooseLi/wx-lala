const db = wx.cloud.database();
const memoriesDB = db.collection('memories');

const ROTATIONS = [-5, 4, -3, 5, -4, 3, -5, 4, -3, 5];

// 根据屏幕宽度动态计算卡片实际像素高度
// 卡片宽 = 屏幕宽 × 25%，上方正方形高 = 卡片宽，下方文字区 = 88rpx
const _sysInfo = wx.getSystemInfoSync();
const _rpx = _sysInfo.windowWidth / 750;           // 1rpx 对应的 px 值
const CARD_UPPER_PX = _sysInfo.windowWidth * 0.25; // 正方形上方区域（等于卡片宽度）
const CARD_TEXT_PX = Math.round(88 * _rpx);        // 文字区 88rpx → px
const CARD_HEIGHT_PX = CARD_UPPER_PX + CARD_TEXT_PX;
const CARD_MARGIN_PX = Math.round(80 * _rpx);      // margin-bottom 80rpx → px
const SLOT_HEIGHT_PX = CARD_HEIGHT_PX + CARD_MARGIN_PX;
// 容器 padding（对应 WXSS 中 padding: 40rpx 0 60rpx）
const CONTAINER_PAD_TOP_PX = Math.round(40 * _rpx);
const CONTAINER_PAD_BOTTOM_PX = Math.round(60 * _rpx);

Page({
  data: {
    slots: [],
    // 空槽的文字草稿（唯一空槽专用）
    draftText: '',
    uploading: false,
    svgBg: '',
    // 全屏图片预览 overlay 状态
    viewer: {
      show: false,
      slotIndex: -1,
      images: [],
      current: 0,
    },
  },

  onLoad() {
    this.loadMemories();
  },

  // ─── 云数据库读取 ──────────────────────────────────────────────
  async loadMemories() {
    try {
      const res = await memoriesDB.orderBy('order', 'asc').get();
      const filled = res.data || [];
      const slots = this.buildSlots(filled);
      this.setData({ slots, draftText: '', svgBg: this.buildSvgBackground(slots) });
    } catch (e) {
      console.error('加载回忆失败', e);
      const slots = this.buildSlots([]);
      this.setData({ slots, svgBg: this.buildSvgBackground(slots) });
    }
  },

  // ─── buildSlots：已有记录 + 末尾唯一空槽 ───────────────────────
  buildSlots(filledCards) {
    const n = filledCards.length;
    const filled = filledCards.map((card, i) => ({
      ...card,
      rotation: ROTATIONS[i % ROTATIONS.length],
      isLeft: i % 2 === 0,
    }));
    const emptySlot = {
      _id: null,
      images: [],
      text: '',
      rotation: ROTATIONS[n % ROTATIONS.length],
      isLeft: n % 2 === 0,
    };
    return [...filled, emptySlot];
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

      this.setData({ uploading: true });
      wx.showLoading({ title: '上传中...' });
      const fileIDs = await Promise.all(tempFiles.map(f => this._uploadFile(f.tempFilePath)));
      wx.hideLoading();
      this.setData({ uploading: false });
      return fileIDs;
    } catch (e) {
      wx.hideLoading();
      this.setData({ uploading: false });
      if (e && e.errMsg && e.errMsg.includes('cancel')) return null;
      console.error('图片上传失败', e);
      wx.showToast({ title: '上传失败，请重试', icon: 'none' });
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

  // ─── 点击 + 按钮：新建或追加图片 ──────────────────────────────
  async onAddImageTap(e) {
    if (this.data.uploading) return;
    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.slots[index];

    const fileIDs = await this._chooseAndUploadImages();
    if (!fileIDs) return;

    if (slot._id) {
      // 已有记录：追加图片
      const newImages = [...(slot.images || []), ...fileIDs];
      await this._updateRecord(slot._id, { images: newImages });
    } else {
      // 空槽：新建记录
      await this._addRecord({ images: fileIDs, text: this.data.draftText.trim() });
    }
  },

  // ─── 空槽文字输入（草稿） ──────────────────────────────────────
  onDraftTextInput(e) {
    this.setData({ draftText: e.detail.value });
  },

  async onDraftTextBlur() {
    const text = this.data.draftText.trim();
    if (!text) return;
    await this._addRecord({ images: [], text });
  },

  // ─── 已有卡片文字编辑（失焦保存） ─────────────────────────────
  async onFilledTextBlur(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const slot = this.data.slots[index];
    if (!slot || !slot._id) return;
    const newText = e.detail.value.trim();
    if (newText === (slot.text || '').trim()) return;
    await this._updateRecord(slot._id, { text: newText });
  },

  // ─── 云数据库写操作 ────────────────────────────────────────────
  async _addRecord(data) {
    const order = this.data.slots.filter(s => s._id).length;
    await memoriesDB.add({
      data: {
        order,
        images: data.images || [],
        text: data.text || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    });
    await this.loadMemories();
  },

  async _updateRecord(docId, updates) {
    await memoriesDB.doc(docId).update({
      data: { ...updates, updatedAt: db.serverDate() },
    });
    await this.loadMemories();
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
    this.setData({ 'viewer.show': false });
  },

  noop() {},

  onViewerTouchStart(e) {
    this._touchStartX = e.touches[0].clientX;
    this._touchStartY = e.touches[0].clientY;
  },

  onViewerTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - this._touchStartX;
    const dy = endY - this._touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 移动幅度极小：视为点击，关闭预览
    if (absDx < 20 && absDy < 20) {
      this.closeViewer();
      return;
    }

    // 水平滑动且幅度超过阈值：切换图片
    if (absDx > 50 && absDx > absDy) {
      const { current, images } = this.data.viewer;
      if (dx < 0 && current < images.length - 1) {
        // 左滑：下一张
        this.setData({ 'viewer.current': current + 1 });
      } else if (dx > 0 && current > 0) {
        // 右滑：上一张
        this.setData({ 'viewer.current': current - 1 });
      }
    }
  },

  viewerDeleteCurrent() {
    const { slotIndex, images, current } = this.data.viewer;
    const slot = this.data.slots[slotIndex];
    if (!slot || !slot._id) return;
    wx.showModal({
      title: '删除图片',
      content: '确认删除这张图片吗？',
      success: async res => {
        if (!res.confirm) return;
        const newImages = images.filter((_, i) => i !== current);
        await this._updateRecord(slot._id, { images: newImages });
        if (newImages.length === 0) {
          this.closeViewer();
        } else {
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
    const { slotIndex } = this.data.viewer;
    const slot = this.data.slots[slotIndex];
    if (!slot || !slot._id) return;

    const fileIDs = await this._chooseAndUploadImages();
    if (!fileIDs) return;

    const newImages = [...this.data.viewer.images, ...fileIDs];
    await this._updateRecord(slot._id, { images: newImages });
    this.setData({ 'viewer.images': newImages });
  },

  // ─── SVG 背景图生成（同步） ────────────────────────────────────
  buildSvgBackground(slots) {
    if (!slots || slots.length === 0) return '';

    const w = _sysInfo.windowWidth;
    const totalHeight = CONTAINER_PAD_TOP_PX + slots.length * SLOT_HEIGHT_PX + CONTAINER_PAD_BOTTOM_PX;

    const leftX = w * 0.35;
    const rightX = w * 0.65;

    const cardTopY = i => CONTAINER_PAD_TOP_PX + i * SLOT_HEIGHT_PX;
    const cardBottomY = i => CONTAINER_PAD_TOP_PX + i * SLOT_HEIGHT_PX + CARD_HEIGHT_PX;
    const cx = slot => slot.isLeft ? leftX : rightX;

    const paths = [];

    // 入场线：顶部 → 第一张卡片上边缘
    paths.push(`M ${w / 2} 0 L ${cx(slots[0])} ${cardTopY(0)}`);

    // 卡片间隙段：贝塞尔曲线
    for (let i = 0; i < slots.length - 1; i++) {
      const x0 = cx(slots[i]);
      const y0 = cardBottomY(i);
      const x1 = cx(slots[i + 1]);
      const y1 = cardTopY(i + 1);
      const midY = (y0 + y1) / 2;
      paths.push(`M ${x0} ${y0} C ${x0} ${midY} ${x1} ${midY} ${x1} ${y1}`);
    }

    // 退场线：最后一张卡片下边缘 → 底部
    const last = slots.length - 1;
    paths.push(`M ${cx(slots[last])} ${cardBottomY(last)} L ${w / 2} ${totalHeight}`);

    const d = paths.join(' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${totalHeight}"><path d="${d}" stroke="rgba(0,0,0,0.13)" stroke-width="2" stroke-dasharray="10 10" fill="none" stroke-linecap="round"/></svg>`;

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  },
});
