const db = wx.cloud.database();
const anniversary = db.collection('anniversaryList');
const BASE = require('../../../../utils/base');
const plugins = require('../../../../utils/plugins');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    dialog: false,
    name: '',
    date: BASE.dateFormat(new Date(), 'yyyy-MM-dd'),
    id: '', // 某条纪念日id
    type: 'add', // 新增还是修改
  },

  openDialog() {
    this.setData({
      dialog: true,
    });
  },

  closeDialog() {
    this.setData({
      dialog: false,
    });
    this.resetData();
  },

  bindInputChange(e) {
    this.setData({
      name: e.detail.value,
    });
  },

  bindDateChange(e) {
    this.setData({
      date: e.detail.value,
    });
  },

  resetData() {
    this.setData({
      name: '',
      date: BASE.dateFormat(new Date(), 'yyyy-MM-dd'),
    });
  },

  async getAnniversary() {
    plugins.showLoading();
    // 小程序直接获取列表一次请求上限 20 条
    // 用云函数获取列表一次请求上限 100 条，因此可能需要分批获取
    wx.cloud.callFunction({
      name: 'getAnniversary',
      success: res => {
        const { result } = res;
        const { data } = result;
        data.forEach(item => {
          item.days = BASE.dateDiff(item.date);
        });
        // 使用 sort 方法降序排序
        data.sort((a, b) => b.days - a.days);
        this.setData({
          list: data,
        });
        wx.hideLoading();
      },
      fail: err => {
        console.log('查询失败', err);
        wx.hideLoading();
      },
    });
  },

  add() {
    anniversary.add({
      data: {
        name: this.data.name,
        date: this.data.date,
        canEdit: true,
      },
      success: res => {
        this.closeDialog();
        this.getAnniversary();
      },
    });
  },

  update() {
    anniversary.doc(this.data.id).update({
      data: {
        name: this.data.name,
        date: this.data.date,
      },
      success: res => {
        this.closeDialog();
        this.getAnniversary();
      },
    });
  },

  // 保存
  onSave() {
    if (this.data.type === 'add') {
      this.add();
    }
    if (this.data.type === 'update') {
      this.update();
    }
  },

  // 点击新增图标
  onAdd() {
    this.setData({
      type: 'add',
    });
    this.openDialog();
  },

  // 更新
  onUpdate(e) {
    const obj = e.currentTarget.dataset.eventIndex;
    if (obj.canEdit) {
      this.setData({
        name: obj.name,
        date: obj.date,
        id: obj._id,
        type: 'update',
      });
      this.openDialog();
    }
  },

  // 删除
  onDelete(e) {
    wx.showModal({
      title: '提示🥹',
      content: '删掉就找不回来咯，确定要删咩',
      success: res => {
        if (res.confirm) {
          const id = e.currentTarget.dataset.eventIndex._id;
          anniversary.doc(id).remove({
            success: res => {
              this.getAnniversary();
            },
          });
        } else if (res.cancel) {
          console.log('用户点击取消');
        }
      },
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    await this.getAnniversary();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {},
});
