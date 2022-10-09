const db = wx.cloud.database();
const things100 = db.collection('things100');
const BASE = require('../../../../utils/base')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    things: []
  },

  // 获取100件小事
  async getThings100() {
    const res = await things100.get();
    this.setData({
      things: res.data
    });
    console.log(this.data.things);
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    await this.getThings100();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})