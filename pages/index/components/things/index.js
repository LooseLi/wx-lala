const db = wx.cloud.database();
const things100 = db.collection('things100');
const BASE = require('../../../../utils/base');
import WeCropper from '../../../../utils/weCropper/we-cropper.min';
const device = wx.getSystemInfoSync(); // 获取设备信息
const width = device.windowWidth; // 示例为一个与屏幕等宽的正方形裁剪框
const height = width;
const plugins = require('../../../../utils/plugins');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    selects: [
      {
        value: '全部小事',
        id: 0,
        flag: undefined,
      },
      {
        value: '未完成',
        id: 1,
        flag: false,
      },
      {
        value: '已完成',
        id: 2,
        flag: true,
      },
    ],
    currentSelectIndex: 0,
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
        height: 300,
      },
    }, // 裁剪配置
    pictureDefault: '../images/things/icon-default.png',
    fileID: '', // 裁剪后的图片地址
  },

  // 获取100件小事
  async getThings100(flag) {
    wx.showLoading({
      title: '加载中',
    });
    let count;
    if (flag === true || flag === false) {
      count = await things100
        .where({
          isUploaded: flag,
        })
        .count();
    } else {
      count = await things100.count();
    }
    let all = [];
    for (let i = 0; i < count.total; i += 20) {
      let res;
      if (flag === true || flag === false) {
        res = await things100
          .where({
            isUploaded: flag,
          })
          .skip(i)
          .get();
      } else {
        res = await things100.skip(i).get();
      }
      all = all.concat(res.data);
    }
    if (flag === undefined) {
      const thingTotal = all.length;
      const thingDone = all.filter(item => item.isUploaded);
      this.setData({
        thingTotal,
        thingDone: thingDone.length,
      });
    }
    this.setData({
      things: all,
    });
    wx.hideLoading();
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
  },

  // 点击上传
  onUpload(e) {
    const obj = e.currentTarget.dataset.eventIndex;
    this.setData({
      // type: 'add',
      currentThing: obj,
      date: obj.date,
    });
    if (obj.isUploaded) {
      this.setData({
        imagePreviewUrl: obj.picture,
      });
    } else {
      this.setData({
        imagePreviewUrl: '',
      });
    }
    this.openDialog();
  },

  // 选择本地照片
  choosePicture() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: res => {
        this.setData({
          showWeCropper: true,
        });
        const src = res.tempFiles[0].tempFilePath;
        this.cropper.pushOrign(src);
      },
      fail: info => {},
    });
  },

  bindDateChange(e) {
    this.setData({
      date: e.detail.value,
    });
  },

  // 裁剪初始化
  initWeCropper() {
    const { cropperOpt } = this.data;
    this.cropper = new WeCropper(cropperOpt)
      .on('ready', ctx => {
        console.log(`wecropper is ready for work!`);
      })
      .on('beforeImageLoad', ctx => {
        wx.showToast({
          title: '上传中',
          icon: 'loading',
          duration: 20000,
        });
      })
      .on('imageLoad', ctx => {
        wx.hideToast();
      });
  },

  touchStart(e) {
    this.cropper.touchStart(e);
  },
  touchMove(e) {
    this.cropper.touchMove(e);
  },
  touchEnd(e) {
    this.cropper.touchEnd(e);
  },

  getCropperImage() {
    this.cropper.getCropperImage(res => {
      this.setData({
        showWeCropper: false,
      });
      if (res) {
        this.setData({
          imagePreviewUrl: res,
        });
        let cloudPath = `uploadImageThings/${Date.now()}.jpg`;
        wx.cloud.uploadFile({
          cloudPath,
          filePath: this.data.imagePreviewUrl,
          success: res => {
            const fileID = res.fileID;
            this.setData({
              fileID,
            });
          },
          fail: info => {
            console.log(info);
          },
        });
      }
    });
  },

  // 已完成
  onSave() {
    if (!this.data.currentThing.isUploaded && !this.data.fileID) {
      plugins.showToast({
        title: '需要上传一张照片喔～',
      });
      return;
    }
    things100.doc(this.data.currentThing._id).update({
      data: {
        date: this.data.date,
        picture: this.data.fileID || this.data.currentThing.picture,
        isUploaded: true,
      },
      success: async res => {
        await this.getThings100();
        this.closeDialog();
        this.resetData();
      },
    });
  },

  // 重置数据
  resetData() {
    this.setData({
      fileID: '',
      currentThing: {},
      imagePreviewUrl: '',
    });
  },

  // 下拉选择
  bindPickerChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      currentSelectIndex: index,
    });
    const flag = this.data.selects[index].flag;
    this.getThings100(flag);
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
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},
});
