const db = wx.cloud.database();
const booksDB = db.collection('books');

const PAGE_SIZE = 20;

const GENRES = ['全部', '文学', '历史', '哲学', '科技', '社科', '传记', '小说', '心理'];
const GENRE_OPTIONS = GENRES.filter((g) => g !== '全部');
const STATUS_FILTERS = ['全部', '已读', '在读', '想读'];
const STATUS_OPTIONS = ['想读', '在读', '已读'];
const STATUS_MOD = { 已读: 'read', 在读: 'reading', 想读: 'wishlist' };

function emptyAddForm() {
  return {
    title: '',
    author: '',
    genre: '文学',
    status: '想读',
    notes: '',
  };
}

function emptyDetail() {
  return {
    _id: '',
    title: '',
    author: '',
    genre: '',
    status: '想读',
    rating: 0,
    notes: '',
    quote: '',
    finishedAt: '',
    coverIndex: 0,
    edited: false,
  };
}

function hashCoverIndex(book) {
  const seed = String(book._id || book.title || '').charCodeAt(0) || 0;
  return ((seed % 7) + 7) % 7;
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

function compareBooksDesc(a, b) {
  const sa = a.sortAt != null ? a.sortAt : parseTimeMs(a.createdAt);
  const sb = b.sortAt != null ? b.sortAt : parseTimeMs(b.createdAt);
  if (sb !== sa) return sb - sa;
  return (b._id || '').localeCompare(a._id || '');
}

function sortBooksDesc(records) {
  return [...records].sort(compareBooksDesc);
}

function mergeRecords(existing, incoming) {
  const map = new Map();
  [...existing, ...incoming].forEach((r) => {
    if (r && r._id) map.set(r._id, r);
  });
  return sortBooksDesc([...map.values()]);
}

Page({
  data: {
    rawBooks: [],
    filtered: [],
    stats: { total: 0, read: 0, reading: 0, wishlist: 0 },
    search: '',
    activeGenre: '全部',
    activeStatus: '全部',
    hasMore: true,
    loadingMore: false,
    addOpen: false,
    addForm: emptyAddForm(),
    detailOpen: false,
    detail: emptyDetail(),
    GENRES,
    GENRE_OPTIONS,
    STATUS_FILTERS,
    STATUS_OPTIONS,
    starsTemplate: [1, 2, 3, 4, 5],
  },

  onLoad() {
    this.loadBooks({ reset: true });
  },

  onPullDownRefresh() {
    this.loadBooks({ reset: true }).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadBooks({ reset: false });
  },

  // ─── 数据加载 ─────────────────────────────────────────────────
  async _fetchPage(skip) {
    const res = await booksDB
      .orderBy('sortAt', 'desc')
      .skip(skip)
      .limit(PAGE_SIZE)
      .get();
    return res.data || [];
  },

  async loadBooks(options = {}) {
    const reset = options.reset === true;
    if (!reset) {
      if (!this.data.hasMore || this.data.loadingMore) return;
      this.setData({ loadingMore: true });
    } else {
      wx.showLoading({ title: '加载中...', mask: true });
    }

    try {
      const skip = reset ? 0 : this.data.rawBooks.length;
      const page = await this._fetchPage(skip);
      const rawBooks = reset
        ? sortBooksDesc(page)
        : mergeRecords(this.data.rawBooks, page);
      const hasMore = page.length === PAGE_SIZE;
      this.setData({ rawBooks, hasMore, loadingMore: false }, () => this._applyFilter());
    } catch (e) {
      console.error('加载书单失败', e);
      if (reset) {
        this.setData({ rawBooks: [], hasMore: false, loadingMore: false }, () => this._applyFilter());
      } else {
        this.setData({ loadingMore: false });
      }
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      if (reset) wx.hideLoading();
    }
  },

  // ─── 过滤与统计派生 ──────────────────────────────────────────
  _applyFilter() {
    const { rawBooks, search, activeGenre, activeStatus } = this.data;
    const kw = (search || '').trim().toLowerCase();
    const filtered = rawBooks
      .filter((b) => {
        const matchKw =
          !kw ||
          (b.title || '').toLowerCase().includes(kw) ||
          (b.author || '').toLowerCase().includes(kw);
        const matchG = activeGenre === '全部' || b.genre === activeGenre;
        const matchS = activeStatus === '全部' || b.status === activeStatus;
        return matchKw && matchG && matchS;
      })
      .map((b) => ({
        ...b,
        coverIndex: hashCoverIndex(b),
        statusMod: STATUS_MOD[b.status] || 'wishlist',
        notesPreview: (b.notes || '').replace(/\s+/g, ' ').slice(0, 60),
      }));

    const stats = {
      total: rawBooks.length,
      read: rawBooks.filter((b) => b.status === '已读').length,
      reading: rawBooks.filter((b) => b.status === '在读').length,
      wishlist: rawBooks.filter((b) => b.status === '想读').length,
    };

    this.setData({ filtered, stats });
  },

  // ─── 顶部统计卡（点击切换状态过滤） ─────────────────────────
  onTapStatusFilter(e) {
    const status = e.currentTarget.dataset.status;
    if (!status) return;
    this.setData({ activeStatus: status }, () => this._applyFilter());
  },

  // ─── 搜索框 ──────────────────────────────────────────────────
  onSearchInput(e) {
    this.setData({ search: e.detail.value }, () => this._applyFilter());
  },

  onClearSearch() {
    if (!this.data.search) return;
    this.setData({ search: '' }, () => this._applyFilter());
  },

  // ─── 分类筛选 ────────────────────────────────────────────────
  onTapGenre(e) {
    const genre = e.currentTarget.dataset.genre;
    if (!genre) return;
    this.setData({ activeGenre: genre }, () => this._applyFilter());
  },

  // ─── 添加书籍弹窗 ────────────────────────────────────────────
  openAddDialog() {
    this.setData({ addOpen: true, addForm: emptyAddForm() });
  },

  closeAddDialog() {
    this.setData({ addOpen: false });
  },

  onAddTitleInput(e) {
    this.setData({ 'addForm.title': e.detail.value });
  },

  onAddAuthorInput(e) {
    this.setData({ 'addForm.author': e.detail.value });
  },

  onAddNotesInput(e) {
    this.setData({ 'addForm.notes': e.detail.value });
  },

  onAddGenreTap(e) {
    const genre = e.currentTarget.dataset.genre;
    if (genre) this.setData({ 'addForm.genre': genre });
  },

  onAddStatusTap(e) {
    const status = e.currentTarget.dataset.status;
    if (status) this.setData({ 'addForm.status': status });
  },

  async onConfirmAdd() {
    const { title, author, genre, status, notes } = this.data.addForm;
    const t = (title || '').trim();
    const a = (author || '').trim();
    if (!t || !a) {
      wx.showToast({ title: '书名和作者不能为空', icon: 'none' });
      return;
    }

    const sortAt = Date.now();
    wx.showLoading({ title: '添加中...', mask: true });
    try {
      const payload = {
        title: t,
        author: a,
        genre,
        status,
        notes: (notes || '').trim(),
        quote: '',
        rating: 0,
        finishedAt: '',
        sortAt,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      };
      const res = await booksDB.add({ data: payload });
      const newRecord = {
        _id: res._id,
        ...payload,
        createdAt: sortAt,
        updatedAt: sortAt,
      };
      const rawBooks = sortBooksDesc([newRecord, ...this.data.rawBooks]);
      this.setData(
        { rawBooks, addOpen: false, addForm: emptyAddForm() },
        () => this._applyFilter()
      );
      wx.showToast({ title: '已添加', icon: 'success' });
    } catch (err) {
      console.error('添加书籍失败', err);
      wx.showToast({ title: '添加失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ─── 详情/编辑弹窗 ───────────────────────────────────────────
  onOpenDetail(e) {
    const id = e.currentTarget.dataset.id;
    const book = this.data.rawBooks.find((b) => b._id === id);
    if (!book) return;
    this.setData({
      detailOpen: true,
      detail: {
        _id: book._id,
        title: book.title || '',
        author: book.author || '',
        genre: book.genre || '',
        status: book.status || '想读',
        rating: book.rating || 0,
        notes: book.notes || '',
        quote: book.quote || '',
        finishedAt: book.finishedAt || '',
        coverIndex: hashCoverIndex(book),
        edited: false,
      },
    });
  },

  closeDetailDialog() {
    this.setData({ detailOpen: false, detail: emptyDetail() });
  },

  onDetailStatusTap(e) {
    const status = e.currentTarget.dataset.status;
    if (!status) return;
    this.setData({ 'detail.status': status, 'detail.edited': true });
  },

  onDetailRatingTap(e) {
    const value = parseInt(e.currentTarget.dataset.value, 10);
    if (!Number.isFinite(value)) return;
    const next = this.data.detail.rating === value ? 0 : value;
    this.setData({ 'detail.rating': next, 'detail.edited': true });
  },

  onDetailNotesInput(e) {
    this.setData({ 'detail.notes': e.detail.value, 'detail.edited': true });
  },

  onDetailQuoteInput(e) {
    this.setData({ 'detail.quote': e.detail.value, 'detail.edited': true });
  },

  async onSaveDetail() {
    const { _id, status, rating, notes, quote, edited } = this.data.detail;
    if (!_id || !edited) {
      this.closeDetailDialog();
      return;
    }
    wx.showLoading({ title: '保存中...', mask: true });
    try {
      const patch = {
        status,
        rating: rating || 0,
        notes: (notes || '').trim(),
        quote: (quote || '').trim(),
        updatedAt: db.serverDate(),
      };
      await booksDB.doc(_id).update({ data: patch });
      const rawBooks = this.data.rawBooks.map((b) =>
        b._id === _id ? { ...b, ...patch, updatedAt: Date.now() } : b
      );
      this.setData({ rawBooks, detailOpen: false, detail: emptyDetail() }, () => this._applyFilter());
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (err) {
      console.error('保存书籍失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onDeleteBook() {
    const { _id, title } = this.data.detail;
    if (!_id) return;
    wx.showModal({
      title: '删除书籍',
      content: `确认删除《${title || '这本书'}》及其读书心得？`,
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...', mask: true });
        try {
          await booksDB.doc(_id).remove();
          const rawBooks = this.data.rawBooks.filter((b) => b._id !== _id);
          this.setData(
            { rawBooks, detailOpen: false, detail: emptyDetail() },
            () => this._applyFilter()
          );
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (err) {
          console.error('删除书籍失败', err);
          wx.showToast({ title: '删除失败', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      },
    });
  },

  noop() {},
});
