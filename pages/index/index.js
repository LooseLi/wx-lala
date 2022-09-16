const db = wx.cloud.database();
const list = db.collection('list');
const API = require('../../utils/api')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isShowMeet: false, //是否见面
    meetContent: '', //提示语
    today: null, //今日天气
    hasAuth: false, //是否有位置权限
    unknow: 'cloud://cloud1-5g2h5bs5d6613df6.636c-cloud1-5g2h5bs5d6613df6-1308328307/weather/unknow.png',
    weathers: [],
    // 节假日
    holidays: [],
    nowHoliday: null, //当前所处节日
    nextHoliday: null, //下一个节日
    countDownDay: 0, //倒计时
  },

  // 点击天气图标
  handleTips() {
    wx.showToast({
      title: this.data.today.tips,
      duration: 3000,
      icon: 'none',
    });
  },
  // 点击没有权限图片的事件
  handleNoAuth() {
    wx.showToast({
      title: '没有给我位置权限，看我委屈的小眼神 🥺',
      duration: 3000,
      icon: 'none',
    });
  },
  // 没有权限toast
  showToast() {
    wx.showToast({
      title: '没有访问位置的权限 😵',
      duration: 3000,
      icon: 'none',
    });
  },

  // 设置面板
  openSetting() {
    wx.openSetting({
      success: res => {
        console.log(res);
        if (res.authSetting['scope.userLocation']) {
          return;
        }
        this.showToast();
      },
      fail: err => {
        console.log(err);
      },
    });
  },

  // 无权限
  noLocationAuth() {
    wx.showModal({
      title: '温馨提示 🥺',
      content: '请求授权位置权限',
      success: res => {
        if (res.confirm) {
          wx.getSetting({
            success: res => {
              console.log(res);
              if (res.authSetting.hasOwnProperty('scope.userLocation')) {
                this.setData({
                  hasAuth: true,
                });
                this.openSetting();
              } else {
                wx.authorize({
                  scope: 'scope.userLocation',
                  success: res => {
                    if (res.errMsg === 'authorize:ok') {
                      this.setData({
                        hasAuth: true,
                      });
                      this.getLocation();
                    }
                  },
                });
              }
            },
          });
          return;
        }
        this.setData({
          hasAuth: false,
        });
      },
      fail: err => {
        console.log(err);
      },
    });
  },

  // 获取当前位置
  getLocation() {
    wx.getLocation({
      success: async res => {
        const {
          longitude,
          latitude
        } = res;
        const code = await API.getCityCode({
          location: `${longitude},${latitude}`
        })
        const adcode = code.regeocode.addressComponent.adcode;
        API.getCityWeather({
          city: adcode,
          extensions: 'base',
        }).then(res => {
          const lives = res.lives.length && res.lives[0];
          const arr = this.data.weathers.filter(item => item.weather === lives.weather);
          if (arr.length) {
            lives.icon = arr[0].day;
            lives.tips = arr[0].tips;
          } else {
            lives.icon = this.data.unknow;
            lives.tips = '快截图！让松松去更新天气小图标吧～';
          }
          this.setData({
            today: lives,
          });
        })
      },
    });
  },

  // 查询是否有位置权限
  beforeGetLocation() {
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userLocation']) {
          this.setData({
            hasAuth: true,
          });
          this.getLocation();
          return;
        }
        this.noLocationAuth();
      },
      fail: err => {
        console.log(err);
      },
    });
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
    const nextHolidays = arr.length > 3 ? arr.slice(0, 3) : arr;
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
    const weathers = res.data.filter(item => item.name === 'weathers');
    this.setData({
      holidays: holidays[0].holidays,
      weathers: weathers[0].weathers
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    await this.getList();
    this.beforeGetLocation();
    this.handleHolidays();
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