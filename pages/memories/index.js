const db = wx.cloud.database();
const memoriesDB = db.collection('memories');

const ROTATIONS = [-17, 7, -15, 14, -8, 6];

// 根据屏幕宽度动态计算卡片实际像素高度
// 卡片宽 = 屏幕宽 × 25%，上方正方形高 = 卡片宽，下方文字区 = 88rpx
const _sysInfo = wx.getSystemInfoSync();
const _rpx = _sysInfo.windowWidth / 750; // 1rpx 对应的 px 值
const CARD_UPPER_PX = _sysInfo.windowWidth / 3; // 正方形上方区域（等于卡片宽度）
const CARD_TEXT_PX = Math.round(88 * _rpx); // 文字区 88rpx → px
const CARD_HEIGHT_PX = CARD_UPPER_PX + CARD_TEXT_PX;
const CARD_MARGIN_PX = Math.round(100 * _rpx); // margin-bottom 100rpx → px
const SLOT_HEIGHT_PX = CARD_HEIGHT_PX + CARD_MARGIN_PX;
// 容器 padding（对应 WXSS 中 padding: 40rpx 0 60rpx）
const CONTAINER_PAD_TOP_PX = Math.round(40 * _rpx);
const CONTAINER_PAD_BOTTOM_PX = Math.round(60 * _rpx);
const CHARM_ROPE_BASE_PX = Math.round(32 * _rpx);
const CHARM_ROPE_OVERLAP_PX = Math.round(6 * _rpx);

// 旋转后卡片视觉底边相对布局底边的下移量（绕槽位中心旋转）
function rotationExtendBelow(deg) {
  const rad = Math.abs(deg) * Math.PI / 180;
  const halfW = CARD_UPPER_PX / 2;
  const halfH = CARD_HEIGHT_PX / 2;
  return Math.round(halfW * Math.sin(rad) + halfH * (1 - Math.cos(rad)));
}

Page({
  data: {
    slots: [],
    draftText: '',
    draftDate: '',
    uploading: false,
    svgBg: '',
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
    this.loadMemories();
    wx.onThemeChange(() => {
      const slots = this.data.slots;
      if (slots && slots.length > 0) {
        this.setData({
          svgBg: this.buildSvgBackground(slots)
        });
      }
    });
  },

  // ─── 云数据库读取 ──────────────────────────────────────────────
  async loadMemories() {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    try {
      const res = await memoriesDB.orderBy('order', 'asc').get();
      const filled = res.data || [];
      const slots = this.buildSlots(filled);
      this.setData({
        slots,
        draftText: '',
        draftDate: '',
        svgBg: this.buildSvgBackground(slots)
      });
    } catch (e) {
      console.error('加载回忆失败', e);
      const slots = this.buildSlots([]);
      this.setData({
        slots,
        draftText: '',
        draftDate: '',
        svgBg: this.buildSvgBackground(slots)
      });
    } finally {
      wx.hideLoading();
    }
  },

  // ─── buildSlots：已有记录 + 末尾唯一空槽 ───────────────────────
  buildSlots(filledCards) {
    const n = filledCards.length;
    const w = _sysInfo.windowWidth;
    const cardBottomY = i => CONTAINER_PAD_TOP_PX + i * SLOT_HEIGHT_PX + CARD_HEIGHT_PX;
    const charmCenterX = i => Math.round((i % 2 === 0 ? 0.25 : 0.75) * w);

    const filled = filledCards.map((card, i) => {
      const isLeft = i % 2 === 0;
      const rotation = ROTATIONS[i % ROTATIONS.length];
      const extend = rotationExtendBelow(rotation);
      const y = cardBottomY(i) + extend;
      const ropePull = extend + CHARM_ROPE_OVERLAP_PX;
      // 总高 = 上探 + 可见段 + 下探（上下 overlap 各一段，避免与卡片/图标断档）
      const ropeH = CHARM_ROPE_BASE_PX + ropePull + CHARM_ROPE_OVERLAP_PX;
      return {
        ...card,
        rotation,
        isLeft,
        dateY: CONTAINER_PAD_TOP_PX + i * SLOT_HEIGHT_PX + CARD_HEIGHT_PX / 2,
        dateFormatted: this._formatDate(card.date),
        charmStyle: `top:${y}px;left:${charmCenterX(i)}px;transform:translateX(-50%);`,
        charmRopeStyle: `height:${ropeH}px;margin-top:-${ropePull}px;`,
        charmIconStyle: `top:${y + CHARM_ROPE_BASE_PX}px;left:${charmCenterX(i)}px;transform:translateX(-50%);`,
      };
    });
    const emptySlot = {
      _id: null,
      images: [],
      text: '',
      date: '',
      dateFormatted: '',
      rotation: ROTATIONS[n % ROTATIONS.length],
      isLeft: n % 2 === 0,
      dateY: CONTAINER_PAD_TOP_PX + n * SLOT_HEIGHT_PX + CARD_HEIGHT_PX / 2,
    };
    return [...filled, emptySlot];
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
    return this.data.slots.some(
      s => s._id && (!s.images || s.images.length === 0) && !(s.text || '').trim()
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
    const order = this.data.slots.filter(s => s._id).length;
    await memoriesDB.add({
      data: {
        order,
        images: data.images || [],
        text: data.text || '',
        date: data.date || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    });
    await this.loadMemories();
  },

  async _updateRecord(docId, updates) {
    await memoriesDB.doc(docId).update({
      data: {
        ...updates,
        updatedAt: db.serverDate()
      },
    });
    await this.loadMemories();
  },

  async _deleteRecord(docId) {
    await memoriesDB.doc(docId).remove();
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

  // ─── SVG 背景图生成（同步） ────────────────────────────────────
  buildSvgBackground(slots) {
    if (!slots || slots.length === 0) return '';

    const w = _sysInfo.windowWidth;
    const totalHeight = CONTAINER_PAD_TOP_PX + slots.length * SLOT_HEIGHT_PX + CONTAINER_PAD_BOTTOM_PX;

    // const leftX = w * 0.25;
    // const rightX = w * 0.75;
    const leftX = w * 0.30;
    const rightX = w * 0.70;

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
    const isDark = (wx.getSystemInfoSync().theme === 'dark');
    const strokeColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${totalHeight}"><path d="${d}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="10 10" fill="none" stroke-linecap="round"/></svg>`;

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  },
});