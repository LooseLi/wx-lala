const db = wx.cloud.database();
const weatherDB = db.collection('weatherList'); // 天气icon
const foodDB = db.collection('foodList'); // 吃什么
const API = require('../../utils/api');
const plugins = require('../../utils/plugins');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    checkInData: null, // 打卡数据
    isShowMeet: false, //是否见面
    meetContent: '', //提示语
    today: null, //今日天气
    hasAuth: false, //是否有位置权限
    unknow:
      'https://6c61-lala-tsum-6gem2abq66c46985-1308328307.tcb.qcloud.la/iconWeathers/wushuju.png?sign=343126b7a94dec3f6074005460ae9d5d&t=1735278996', // 天气图标无数据
    weathers: [],
    events: [
      {
        id: 0,
        icon: './images/event/icon-anniversary.png',
        title: '拉拉松松纪念日',
        page: '/pages/index/components/anniversary/index',
      },
      {
        id: 1,
        icon: './images/event/icon-countdown.png',
        title: '倒计时',
        page: '/pages/index/components/countdown/index',
      },
      {
        id: 2,
        icon: './images/event/icon-hoildays.png',
        title: '能放几天假鸭',
        page: '',
      },
      {
        id: 3,
        icon: './images/event/icon-more.png',
        title: '想想要新加些啥',
        page: '',
      },
      // {
      //   id: 3,
      //   icon: './images/event/icon-things.png',
      //   title: '100 件小事',
      //   page: '/pages/index/components/things/index'
      // },
    ],
    foods: [],
  },

  // 点击天气图标
  handleTips() {
    plugins.showToast({
      title: this.data.today.tips,
    });
  },
  // 点击没有权限图片的事件
  handleNoAuth() {
    plugins.showToast({
      title: '没有给我位置权限，看我委屈的小眼神 🥺',
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
        plugins.showToast({
          title: '没有访问位置的权限 😵',
        });
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
    API.myAmapFun.getWeather({
      success: data => {
        const lives = data.liveData;
        const arr = this.data.weathers.filter(item => item.weather === lives.weather);
        if (arr.length) {
          lives.icon = arr[0].icon;
          lives.tips = arr[0].tips;
        } else {
          lives.icon = this.data.unknow;
          lives.tips = '快截图！让松松去更新天气小图标吧～';
        }
        this.setData({
          today: lives,
        });
      },
      fail: info => {
        console.log(info);
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

  // 获取列表(天气)
  async getWeatherList() {
    const res = await weatherDB.get();
    this.setData({
      weathers: res.data,
    });
  },

  // 点击
  eventClick(e) {
    const currentEventIndex = e.currentTarget.dataset.eventIndex;
    const url = this.data.events[currentEventIndex].page;
    if (url) {
      wx.navigateTo({
        url,
      });
    } else {
      plugins.showToast({
        title: '😵努力掉头发ing',
      });
    }
  },

  // 随机食物
  async randomFood() {
    plugins.showLoading('食物匹配中');
    const res = await foodDB
      .aggregate()
      .sample({
        size: 2,
      })
      .end();
    const arr = res.list.map(item => item.name);
    this.setData({
      foods: arr,
    });
    wx.hideLoading();
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    // 获取用户openid并存储
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: res => {
        wx.setStorageSync('openid', res.result.OPENID);
      },
    });

    await this.getWeatherList();
    this.beforeGetLocation();
  },

  // 打卡成功的回调
  onCheckInSuccess(e) {
    const checkInData = e.detail;
    this.setData({
      checkInData,
    });

    // 可以在这里添加其他打卡成功后的操作
    console.log('打卡成功：', checkInData);
  },
});
