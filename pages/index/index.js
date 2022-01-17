Page({
  /**
   * 页面的初始数据
   */
  data: {
    isShowMeet: false, //是否见面
    meetContent: '', //提示语
    province: '', //省
    city: '', //市
    today: null, //今日天气
    casts: null, //四天天气情况
    hasAuth: false, //是否有位置权限
    unknow: './images/weather/unknow.png',
    weathers: [
      {
        weather: '晴',
        day: './images/weather/qing.png',
        night: './images/weather/qing.png',
        tips: '大好日子，想个松吧～',
      },
      {
        weather: '少云',
        day: './images/weather/qingtianduoyun.png',
        night: './images/weather/qingtianduoyun.png',
        tips: '天上的云有点少呢～',
      },
      {
        weather: '晴间多云',
        day: './images/weather/qingtianduoyun.png',
        night: './images/weather/qingtianduoyun.png',
        tips: '天气还算不错～',
      },
      {
        weather: '多云',
        day: './images/weather/qingtianduoyun.png',
        night: './images/weather/qingtianduoyun.png',
        tips: '看看真的有很多云吗～ 🤔',
      },
      {
        weather: '阴',
        day: './images/weather/yin.png',
        night: './images/weather/yin.png',
        tips: '今天阴沉沉的 🤨',
      },
      {
        weather: '霾',
        day: './images/weather/wumai.png',
        night: './images/weather/wumai.png',
        tips: '有雾霾！戴口罩喔～ 😷',
      },
      {
        weather: '风',
        day: './images/weather/feng.png',
        night: './images/weather/feng.png',
        tips: '吹呀吹呀，我的宝宝宝宝',
      },
      {
        weather: '雷阵雨',
        day: './images/weather/leizhenyu.png',
        night: './images/weather/leizhenyu.png',
        tips: '打雷不怕，松松抱～',
      },
      {
        weather: '小雨',
        day: './images/weather/xiaoyu.png',
        night: './images/weather/xiaoyu.png',
        tips: '记得带伞🌂喔～',
      },
      {
        weather: '中雨',
        day: './images/weather/zhongyu.png',
        night: './images/weather/zhongyu.png',
        tips: '记得带伞🌂喔～',
      },
      {
        weather: '大雨',
        day: './images/weather/dayu.png',
        night: './images/weather/dayu.png',
        tips: '啊啊啊，好大的雨！',
      },
      {
        weather: '暴雨',
        day: './images/weather/baoyu.png',
        night: './images/weather/baoyu.png',
        tips: '这雨，出不了门拉～',
      },
      {
        weather: '大暴雨',
        day: './images/weather/dabaoyu.png',
        night: './images/weather/dabaoyu.png',
        tips: '没见过这么大雨 🤯',
      },
      {
        weather: '特大暴雨',
        day: './images/weather/tedabaoyu.png',
        night: './images/weather/tedabaoyu.png',
        tips: '要不我们请个假？',
      },
      {
        weather: '冻雨',
        day: './images/weather/dongyu.png',
        night: './images/weather/dongyu.png',
        tips: '这是什么天气？🤔',
      },
      {
        weather: '雨夹雪',
        day: './images/weather/yujiaxue.png',
        night: './images/weather/yujiaxue.png',
        tips: '这雪不知道能不能下',
      },
      {
        weather: '阵雨夹雪',
        day: './images/weather/zhenyujiaxue.png',
        night: './images/weather/zhenyujiaxue.png',
        tips: '这雪不知道能不能下',
      },
      {
        weather: '小雪',
        day: './images/weather/xiaoxue.png',
        night: './images/weather/xiaoxue.png',
        tips: '下雪拉～',
      },
      {
        weather: '中雪',
        day: './images/weather/zhongxue.png',
        night: './images/weather/zhongxue.png',
        tips: '想和宝宝一起看雪～',
      },
      {
        weather: '大雪',
        day: './images/weather/daxue.png',
        night: './images/weather/daxue.png',
        tips: '这雪还挺大，南方是肯定没有的',
      },
      {
        weather: '暴雪',
        day: './images/weather/baoxue.png',
        night: './images/weather/baoxue.png',
        tips: '不知道能不能见到这么大的雪',
      },
      {
        weather: '浮尘',
        day: './images/weather/fuchen.png',
        night: './images/weather/fuchen.png',
        tips: '漂浮的尘埃？',
      },
      {
        weather: '扬沙',
        day: './images/weather/yangsha.png',
        night: './images/weather/yangsha.png',
        tips: '扬起的沙子？😂',
      },
      {
        weather: '沙尘暴',
        day: './images/weather/shachenbao.png',
        night: './images/weather/shachenbao.png',
        tips: '抱紧小拉花',
      },
      {
        weather: '热',
        day: './images/weather/reqiwengao.png',
        night: './images/weather/reqiwengao.png',
        tips: '火娃小心鸭',
      },
      {
        weather: '冷',
        day: './images/weather/lengqiwendi.png',
        night: './images/weather/lengqiwendi.png',
        tips: '要注意保暖喔～',
      },
    ],
    // 节假日
    holidays: [
      {
        index: 0,
        id: '元旦节',
        days: 3,
        beginDate: '2022/01/01 00:00',
        endDate: '2022/01/03 23:59',
      },
      {
        index: 1,
        id: '腊八节',
        days: 1,
        beginDate: '2022/01/10 00:00',
        endDate: '2022/01/10 23:59',
      },
      {
        index: 2,
        id: '除夕',
        days: 1,
        beginDate: '2022/01/31 00:00',
        endDate: '2022/01/31 23:59',
      },
      {
        index: 3,
        id: '春节',
        days: 6,
        beginDate: '2022/02/01 00:00',
        endDate: '2022/02/06 23:59',
      },
      {
        index: 4,
        id: '情人节',
        days: 1,
        beginDate: '2022/02/14 00:00',
        endDate: '2022/02/14 23:59',
      },
      {
        index: 5,
        id: '元宵节',
        days: 1,
        beginDate: '2022/02/15 00:00',
        endDate: '2022/02/15 23:59',
      },
      {
        index: 6,
        id: '清明节',
        days: 3,
        beginDate: '2022/04/03 00:00:00',
        endDate: '2022/04/05 23:59:59',
      },
      {
        index: 7,
        id: '劳动节',
        days: 5,
        beginDate: '2022/04/30 00:00:00',
        endDate: '2022/05/04 23:59:59',
      },
      {
        index: 8,
        id: '端午节',
        days: 3,
        beginDate: '2022/06/03 00:00',
        endDate: '2022/06/05 23:59',
      },
      {
        index: 9,
        id: '七夕节',
        days: 1,
        beginDate: '2022/08/04 00:00',
        endDate: '2022/08/04 23:59',
      },
      {
        index: 10,
        id: '中秋节',
        days: 3,
        beginDate: '2022/09/10 00:00',
        endDate: '2022/09/12 23:59',
      },
      {
        index: 11,
        id: '国庆节',
        days: 7,
        beginDate: '2022/10/01 00:00',
        endDate: '2022/10/07 23:59',
      },
      {
        index: 12,
        id: '周年纪念日',
        days: 1,
        beginDate: '2022/11/13 00:00',
        endDate: '2022/11/13 23:59',
      },
      {
        index: 13,
        id: '平安夜',
        days: 1,
        beginDate: '2022/12/24 00:00',
        endDate: '2022/12/24 23:59',
      },
      {
        index: 14,
        id: '圣诞节',
        days: 1,
        beginDate: '2022/12/25 00:00',
        endDate: '2022/12/25 23:59',
      },
    ],
    nowHoliday: null, //当前所处节日
    nextHoliday: null, //下一个节日
    countDownDay: 0, //倒计时
  },

  // 点击天气图标
  handleTips() {
    console.log(this.data.today);
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
    const APP_ID = '0d5e9e7ec4881a5c3ed194b2338a6aca';
    wx.getLocation({
      success: res => {
        const {longitude, latitude} = res;
        wx.request({
          url: 'https://restapi.amap.com/v3/geocode/regeo',
          data: {
            key: APP_ID,
            location: `${longitude},${latitude}`,
          },
          header: {
            'content-type': 'application/json',
          },
          success: result => {
            const adcode = result.data.regeocode.addressComponent.adcode;
            wx.request({
              url: 'https://restapi.amap.com/v3/weather/weatherInfo',
              data: {
                key: APP_ID,
                city: adcode,
                extensions: 'base',
              },
              header: {
                'content-type': 'application/json',
              },
              success: res => {
                const lives = res.data.lives.length && res.data.lives[0];
                const arr = this.data.weathers.filter(item => item.weather === lives.weather);
                if (arr.length) {
                  lives.icon = arr[0].day;
                  lives.tips = arr[0].tips;
                } else {
                  lives.icon = this.data.unknow;
                }
                this.setData({
                  today: lives,
                });
                console.log(this.data.hasAuth);
                // const obj = res.data.forecasts[0];
                // console.log(obj);
                // this.setData({
                //   province:obj.province,
                //   city:obj.city,
                //   today:obj.casts.length && obj.casts[0],
                //   casts:obj.casts
                // });
              },
            });
          },
        });
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

  // 见面时间
  beforeMeet() {
    const meetTime = new Date('2021/12/03 23:59:59').getTime();
    const currentTime = new Date().getTime();
    const currentM = new Date().getMonth();
    const currentD = new Date().getDate();
    if (currentM === 11 && currentD === 3) {
      this.setData({
        isShowMeet: true,
        meetContent: '小松今天要来啦～',
      });
      return;
    }
    if (currentM === 11 && currentD > 3) {
      this.setData({
        isShowMeet: false,
        meetContent: '',
      });
      return;
    }
    const needTime = meetTime - currentTime;
    const day = 1000 * 3600 * 24;
    const needDay = parseInt(needTime / day);
    if (needDay >= 1) {
      this.setData({
        isShowMeet: true,
      });
      if (needDay === 4) {
        this.setData({
          meetContent: '今天是蛋糕小拉～ 但别忘了还有 4 天就要见松啦',
        });
      }
      if (needDay === 3) {
        this.setData({
          meetContent: '倒计时 3 天～ 爱你喔',
        });
      }
      if (needDay === 2) {
        this.setData({
          meetContent: '嘿嘿，还有 2 天，冲冲冲',
        });
      }
      if (needDay === 1) {
        this.setData({
          meetContent: '还有 1 天就能见到拉啦 要洗白白喔～',
        });
      }
    }
  },

  // 日期格式化
  format(date) {
    const y = date.getFullYear();
    let m = date.getMonth() + 1;
    m = m <= 9 ? '0' + m : m;
    let d = date.getDate();
    d = d <= 9 ? '0' + d : d;
    let h = date.getHours();
    h = h <= 9 ? '0' + h : h;
    let min = date.getMinutes();
    min = min <= 9 ? '0' + min : min;
    let s = date.getSeconds();
    s = s <= 9 ? '0' + s : s;
    return {y, m, d, h, min, s};
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
    this.setData({
      nextHoliday: arr.length && arr[0],
    });
    const nextBeginTime = this.data.nextHoliday && new Date(this.data.nextHoliday.beginDate);
    const countDown = (nextBeginTime - date) / (1000 * 60 * 60 * 24);
    this.setData({
      countDownDay: Math.ceil(countDown),
    });
    console.log(Math.ceil(countDown));
    console.log(this.data.nextHoliday);
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.beforeMeet();
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
