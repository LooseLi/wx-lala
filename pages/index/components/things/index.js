const db = wx.cloud.database();
const things100 = db.collection('things100');
const BASE = require('../../../../utils/base');
import WeCropper from '../../../../utils/weCropper/we-cropper.min';
const device = wx.getSystemInfoSync(); // 获取设备信息
const width = device.windowWidth; // 示例为一个与屏幕等宽的正方形裁剪框
const height = width;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    things: [],
    dialog: false,
    date: BASE.dateFormat(new Date(), 'yyyy-MM-dd'),
    currentThing: {},
    imagePreviewUrl: '',
    showWeCropper: false, // 是否显示裁剪
    cropperOpt: {
      id: 'cropper',
      tranlateX: width / 2,
      tranlateY: height / 2,
      width,
      height,
      scale: 2.5,
      zoom: 8,
      cut: {
        x: (width - 300) / 2,
        y: (height - 300) / 2,
        width: 300,
        height: 300
      }
    }, // 裁剪配置
    testUrl: 'https://636c-cloud1-5g2h5bs5d6613df6-1308328307.tcb.qcloud.la/WechatIMG233.jpeg?sign=ada53e14a4d0eabd8c51c09e1c85f8ff&t=1663741253'
  },

  // 获取100件小事
  async getThings100() {
    const res = await things100.get();
    this.setData({
      things: res.data
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
  },

  // 点击上传
  onUpload(e) {
    const obj = e.currentTarget.dataset.eventIndex;
    this.setData({
      // type: 'add',
      currentThing: obj
    });
    this.openDialog();
  },

  // 选择本地照片
  choosePicture() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({
          showWeCropper: true
        });
        const src = res.tempFiles[0].tempFilePath
        this.cropper.pushOrign(src)
      },
      fail: (info) => {}
    })
  },

  bindDateChange(e) {
    this.setData({
      date: e.detail.value
    });
  },

  // 裁剪初始化
  initWeCropper() {
    const {
      cropperOpt
    } = this.data
    this.cropper = new WeCropper(cropperOpt)
      .on('ready', (ctx) => {
        console.log(`wecropper is ready for work!`)
      })
      .on('beforeImageLoad', (ctx) => {
        wx.showToast({
          title: '上传中',
          icon: 'loading',
          duration: 20000
        })
      })
      .on('imageLoad', (ctx) => {
        wx.hideToast()
      })
  },

  touchStart(e) {
    this.cropper.touchStart(e)
  },
  touchMove(e) {
    this.cropper.touchMove(e)
  },
  touchEnd(e) {
    this.cropper.touchEnd(e)
  },

  getCropperImage() {
    this.cropper.getCropperImage((res) => {
      this.setData({
        showWeCropper: false,
      })
      if (res) {
        this.setData({
          imagePreviewUrl: res
        });
      }
    })
  },

  // 已完成
  onSave() {
    this.uploadImage();
  },

  uploadImage() {
    let cloudPath = `uploadImageThings/${Date.now()}.jpg`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath: this.data.imagePreviewUrl,
      success: (res) => {
        const fileID = res.fileID;
        if (fileID) {
          things100.doc(this.data.currentThing._id).update({
            data: {
              picture: fileID
            },
            success: async (res) => {
              await this.getThings100();
              this.closeDialog();
            }
          })
        }
      },
      fail: info => {
        console.log(info);
      }
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    await this.getThings100();
    this.initWeCropper();
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