const db = wx.cloud.database();
const anniversary = db.collection('anniversary');
const BASE = require('../../../../utils/base')

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

  bindDateChange(e) {
    this.setData({
      date: e.detail.value
    });
  },

  resetData() {
    this.setData({
      name: '',
      date: BASE.dateFormat(new Date(), 'yyyy-MM-dd')
    });
  },

  async getAnniversary() {
    console.log(111);
    const res = await anniversary.get();
    res.data.forEach(item => {
      item.days = BASE.dateDiff(item.date);
    });
    this.setData({
      list: res.data
    });
  },

  add() {
    anniversary.add({
      data: {
        name: this.data.name,
        date: this.data.date
      },
      success: (res) => {
        this.closeDialog();
        this.getAnniversary();
      }
    })
  },

  update() {
    anniversary.doc(this.data.id).update({
      data: {
        name: this.data.name,
        date: this.data.date
      },
      success: (res) => {
        this.closeDialog();
        this.getAnniversary();
      }
    })
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
      type: 'add'
    });
    this.openDialog();
  },

  // 更新
  onUpdate(e) {
    const obj = e.currentTarget.dataset.eventIndex;
    this.setData({
      name: obj.name,
      date: obj.date,
      id: obj._id,
      type: 'update'
    });
    this.openDialog();
  },

  // 删除
  onDelete(e) {
    const id = e.currentTarget.dataset.eventIndex._id;
    anniversary.doc(id).remove({
      success: (res) => {
        this.getAnniversary();
      }
    })
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