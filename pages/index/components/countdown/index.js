const db = wx.cloud.database();
const countdownDay = db.collection('holidayList');
const BASE = require('../../../../utils/base');
const plugins = require('../../../../utils/plugins');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 节假日
    holidays: [],
    nowHoliday: null, //当前所处节日
    nextHoliday: null, //下一个节日
    dialog: false,
    name: '',
    date: BASE.dateFormat(new Date(), 'yyyy-MM-dd'),
    content: '',
    type: 'add', // 新增还是修改,
    id: '',
    activeTab: 'current' // 当前激活的标签页：current或upcoming
  },

  // 节假日
  handleHolidays() {
    const date = new Date();
    const arr = [];
    const currentFormattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    this.data.holidays.forEach(item => {
      const beginTime = new Date(item.beginDate.replace(/-/g, '/')).getTime();
      const endTime = new Date(item.endDate.replace(/-/g, '/')).getTime();
      item.begin = item.beginDate.split("-").slice(1).join(".");
      item.end = item.endDate.split("-").slice(1).join(".");
      if (currentFormattedDate === item.today) {
        // 当前正好是某个节假日
        this.setData({
          nowHoliday: item,
        });
      } else if (date.getTime() >= beginTime && date.getTime() <= endTime) {
        // 当前正在某个节假日范围
        this.setData({
          nowHoliday: item,
        });
      } else if (date.getTime() < beginTime) {
        // 还没到的节假日
        arr.push(item);
      }
    });
    // 按照 beginDate 字段升序排序
    arr.sort((a, b) => new Date(a.beginDate.replace(/-/g, '/')) - new Date(b.beginDate.replace(/-/g, '/')));
    const nextHolidays = arr;
    nextHolidays.forEach(item => {
      const nextBeginTime = new Date(item.beginDate.replace(/-/g, '/'));
      item.countDown = Math.ceil((nextBeginTime - date) / (1000 * 60 * 60 * 24));
    });
    this.setData({
      nextHoliday: nextHolidays,
    });
  },

  // 获取倒计时(节假日)
  async getCountdownDay() {
    plugins.showLoading();
    const res = await countdownDay.get();
    this.setData({
      holidays: res.data,
    });
    wx.hideLoading();
  },

  openDialog() {
    this.setData({
      dialog: true
    })
  },

  closeDialog() {
    this.setData({
      dialog: false
    })
    this.resetData();
  },

  bindInputChange(e) {
    this.setData({
      name: e.detail.value
    });
  },

  bindContentChange(e) {
    this.setData({
      content: e.detail.value
    });
  },

  bindDateChange(e) {
    this.setData({
      date: e.detail.value
    });
  },

  resetData() {
    this.setData({
      name: '',
      date: BASE.dateFormat(new Date(), 'yyyy-MM-dd'),
      content: ''
    });
  },

  add() {
    // const formatDate = this.data.date.replace(/-/g, '/');
    const date = BASE.dateFormat(this.data.date, 'yyyy-M-d')
    countdownDay.add({
      data: {
        id: this.data.name,
        beginDate: date,
        endDate: date,
        today: date,
        canEdit: true,
        days: 1,
        content: this.data.content,
        imgUrl: 'https://6c61-lala-tsum-6gem2abq66c46985-1308328307.tcb.qcloud.la/iconHolidays/kaixinguo.png?sign=931efe25e5f43cfd1cf614f6796a62a9&t=1735550502'
      },
      success: async (res) => {
        this.closeDialog();
        await this.getCountdownDay();
        this.handleHolidays();
      }
    })
  },

  update() {
    // const formatDate = this.data.date.replace(/-/g, '/');
    const date = BASE.dateFormat(this.data.date, 'yyyy-M-d')
    countdownDay.doc(this.data.id).update({
      data: {
        id: this.data.name,
        beginDate: date,
        endDate: date,
        today: date,
        content: this.data.content,
      },
      success: async (res) => {
        this.closeDialog();
        await this.getCountdownDay();
        this.handleHolidays();
      }
    })
  },

  // 点击新增图标
  onAdd() {
    this.setData({
      type: 'add'
    });
    this.openDialog();
  },

  // 更新
  onUpdate(e) {
    const obj = e.currentTarget.dataset.eventIndex;
    if (!obj.canEdit) return;
    const date = obj.beginDate.split(' ')[0].replace(/\//g, '-');
    this.setData({
      name: obj.id,
      date,
      id: obj._id,
      content: obj.content,
      type: 'update'
    });
    this.openDialog();
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

  // 删除
  onDelete(e) {
    wx.showModal({
      title: '提示🥹',
      content: '删掉就找不回来咯，确定要删咩',
      success: (res) => {
        if (res.confirm) {
          const id = e.currentTarget.dataset.eventIndex._id;
          countdownDay.doc(id).remove({
            success: async (res) => {
              await this.getCountdownDay();
              this.handleHolidays();
            }
          })
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    await this.getCountdownDay();
    this.handleHolidays();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  // 切换标签页
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  }
})