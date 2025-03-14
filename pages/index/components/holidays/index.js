// 获取云数据库引用
const db = wx.cloud.database();
const holidays = db.collection('holidays');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentYear: new Date().getFullYear(),
    nextYear: new Date().getFullYear() + 1,
    activeTab: 'current', // 默认显示当前年份
    currentYearHolidays: [],
    nextYearHolidays: [],
    isLoading: true,
  },

  /**
   * 切换年份标签
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab,
    });
  },

  /**
   * 获取节假日数据
   */
  async fetchHolidayData() {
    wx.showLoading({
      title: '加载中...',
    });

    try {
      // 获取当前年份的节假日数据
      const currentYearRes = await holidays
        .where({
          year: this.data.currentYear,
        })
        .orderBy('date', 'asc')
        .get();

      // 获取下一年的节假日数据
      const nextYearRes = await holidays
        .where({
          year: this.data.nextYear,
        })
        .orderBy('date', 'asc')
        .get();

      // 处理数据，添加星期几信息
      const currentYearHolidays = this.processHolidayData(currentYearRes.data);
      const nextYearHolidays = this.processHolidayData(nextYearRes.data);

      this.setData({
        currentYearHolidays,
        nextYearHolidays,
        isLoading: false,
      });
    } catch (error) {
      console.error('获取节假日数据失败', error);
      wx.showToast({
        title: '获取数据失败',
        icon: 'none',
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 处理节假日数据，添加星期几信息
   */
  processHolidayData(data) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    return data.map(item => {
      // 创建日期对象
      const date = new Date(item.date);
      // 获取星期几
      const weekday = weekdays[date.getDay()];

      return {
        ...item,
        weekday,
      };
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.fetchHolidayData();
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
  onPullDownRefresh: function () {
    this.fetchHolidayData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '节假日日历 - 能放几天假鸭',
      path: '/pages/index/components/holidays/index',
    };
  },
});
