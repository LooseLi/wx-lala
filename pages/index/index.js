const db = wx.cloud.database();
const list = db.collection('list');
const API = require('../../utils/api')
const plugins = require('../../utils/plugins');

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
    events: [{
        id: 0,
        icon: './images/event/icon-anniversary.png',
        title: '拉拉松松纪念日',
        page: '/pages/index/components/anniversary/index'
      },
      {
        id: 1,
        icon: './images/event/icon-countdown.png',
        title: '倒计时',
        page: '/pages/index/components/countdown/index'
      },
      {
        id: 2,
        icon: './images/event/icon-hoildays.png',
        title: '能放几天假鸭',
        page: ''
      },
      {
        id: 3,
        icon: './images/event/icon-things.png',
        title: '100 件小事',
        page: '/pages/index/components/things/index'
      },
      {
        id: 4,
        icon: './images/event/icon-more.png',
        title: '想想要新加些啥',
        page: ''
      },
    ],
    foods: []
  },

  // 点击天气图标
  handleTips() {
    plugins.showToast({
      title: this.data.today.tips
    });
  },
  // 点击没有权限图片的事件
  handleNoAuth() {
    plugins.showToast({
      title: '没有给我位置权限，看我委屈的小眼神 🥺'
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
          title: '没有访问位置的权限 😵'
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
      success: (data) => {
        const lives = data.liveData;
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
      },
      fail: (info) => {
        console.log(info);
      }
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
  async getList() {
    const res = await list.get();
    const weathers = res.data.filter(item => item.name === 'weathers');
    this.setData({
      weathers: weathers[0].weathers
    });
  },

  // 点击
  eventClick(e) {
    const currentEventIndex = e.currentTarget.dataset.eventIndex
    const url = this.data.events[currentEventIndex].page
    if (url) {
      wx.navigateTo({
        url,
      })
    }
  },

  // 随机食物
  randomFood() {
    wx.request({
      url: 'https://eolink.o.apispace.com/eat222/api/v1/forward/chishenme',
      data: {
        size: 2,
      },
      header: {
        'X-APISpace-Token': '07oamggx9fyvu7c8mu0kbrbnyceauyh6',
        'Authorization-Type': 'apikey'
      },
      success: (res) => {
        console.log(res);
        this.setData({
          foods: res.data.data
        });
      },
      fail: (err) => {
        console.log(err);
      }
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    await this.getList();
    this.beforeGetLocation();
  },
});