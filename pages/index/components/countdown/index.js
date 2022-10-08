const db = wx.cloud.database();
const countdownDay = db.collection('countdownDay');
const BASE = require('../../../../utils/base')

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
    id: ''
  },

  // 节假日
  handleHolidays() {
    const date = new Date();
    const arr = [];
    this.data.holidays.forEach(item => {
      const beginTime = new Date(item.beginDate).getTime();
      const endTime = new Date(item.endDate).getTime();
      // 当前正在某个节假日
      if (date.getTime() >= beginTime && date.getTime() <= endTime) {
        item.begin = item.beginDate.split(' ')[0];
        item.end = item.endDate.split(' ')[0];
        this.setData({
          nowHoliday: item,
        });
      }
      if (date.getTime() < beginTime) {
        item.begin = item.beginDate.split(' ')[0];
        item.end = item.endDate.split(' ')[0];
        arr.push(item);
      }
    });
    // const nextHolidays = arr.length > 3 ? arr.slice(0, 3) : arr;
    const nextHolidays = arr;
    nextHolidays.forEach(item => {
      const nextBeginTime = new Date(item.beginDate);
      item.countDown = Math.ceil((nextBeginTime - date) / (1000 * 60 * 60 * 24));
    });
    this.setData({
      nextHoliday: nextHolidays,
    });
  },

  // 获取倒计时(节假日)
  async getCountdownDay() {
    const res = await countdownDay.get();
    this.setData({
      holidays: res.data,
    });
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
    const formatDate = this.data.date.replace(/-/g, '/');
    countdownDay.add({
      data: {
        id: this.data.name,
        beginDate: `${formatDate} 00:00`,
        endDate: `${formatDate} 23:59`,
        canEdit: true,
        days: 1,
        content: this.data.content,
        imgUrl: 'cloud://cloud1-5g2h5bs5d6613df6.636c-cloud1-5g2h5bs5d6613df6-1308328307/weather/icon-countdown-other.png'
      },
      success: async (res) => {
        this.closeDialog();
        await this.getCountdownDay();
        this.handleHolidays();
      }
    })
  },

  update() {
    const formatDate = this.data.date.replace(/-/g, '/');
    countdownDay.doc(this.data.id).update({
      data: {
        id: this.data.name,
        beginDate: `${formatDate} 00:00`,
        endDate: `${formatDate} 23:59`,
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

  }
})