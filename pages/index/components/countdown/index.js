const db = wx.cloud.database();
const list = db.collection('list');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 节假日
    holidays: [],
    nowHoliday: null, //当前所处节日
    nextHoliday: null, //下一个节日
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

  // 获取列表(节假日和天气)
  async getList() {
    const res = await list.get();
    const holidays = res.data.filter(item => item.name === 'holidays');
    this.setData({
      holidays: holidays[0].holidays,
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    await this.getList();
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