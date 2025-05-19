const db = wx.cloud.database();
const weatherDB = db.collection('weatherList');
const foodDB = db.collection('foodList');
const anniversary = db.collection('anniversaryList');
const countdownDay = db.collection('holidayList');
const API = require('../../utils/api');
const plugins = require('../../utils/plugins');
const themeManager = require('../../utils/themeManager'); // 引入主题管理模块
const announcementUtils = require('../../utils/announcementUtils'); // 引入公告工具模块

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
    todayUncompletedCount: 0, // 今日未完成待办数量
    themeBackground: '', // 主题背景图片
    unknow:
      'https://6c61-lala-tsum-6gem2abq66c46985-1308328307.tcb.qcloud.la/iconWeathers/wushuju.png?sign=343126b7a94dec3f6074005460ae9d5d&t=1735278996', // 天气图标无数据
    weathers: [],
    // 公告数据
    announcements: [],
    // 纪念日数据
    anniversaryList: [],
    // 倒计时数据
    countdownList: [],
    // 倒计时处理后的数据
    holidays: [],
    nowHoliday: null, //当前所处节日
    nextHoliday: null, //下一个节日
    events: [
      {
        id: 0,
        icon: './images/event/icon-jumao.png',
        title: '拉拉松松纪念日',
        page: '/pages/index/components/anniversary/index',
      },
      {
        id: 1,
        icon: './images/event/icon-xianluomao.png',
        title: '倒计时',
        page: '/pages/index/components/countdown/index',
      },
      {
        id: 2,
        icon: './images/event/icon-jinmao.png',
        title: '能放几天假鸭',
        page: '/pages/index/components/holidays/index',
      },
      {
        id: 3,
        icon: './images/event/icon-bianmu.png',
        title: '待办清单',
        page: '/pages/index/components/todo/index',
      },
      {
        id: 4,
        icon: './images/event/icon-gengduo.png',
        title: '想想要新加些啥',
        page: '',
      },
      // {
      //   id: 5,
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
          lives.tips = '快截图！让松松去更新天气小图标吧~';
        }
        this.setData(
          {
            today: lives,
          },
          () => {
            // 天气数据加载完成后，重新更新公告列表
            this.updateAnnouncements();
          },
        );
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
    try {
      const res = await wx.cloud.callFunction({
        name: 'getWeatherList',
      });

      if (res.result && res.result.success) {
        this.setData({
          weathers: res.result.data,
        });
      } else {
        console.error('获取天气列表失败:', res);
        // 失败时尝试本地查询作为备选
        const dbRes = await weatherDB.get();
        this.setData({
          weathers: dbRes.data,
        });
      }
    } catch (error) {
      console.error('调用天气列表云函数失败:', error);
      // 出错时尝试本地查询作为备选
      try {
        const dbRes = await weatherDB.get();
        this.setData({
          weathers: dbRes.data,
        });
      } catch (err) {
        console.error('本地查询天气列表也失败:', err);
      }
    }
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
    try {
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

      // 保存当天的食物数据和日期（覆盖之前的数据）
      const today = this.formatDate(new Date());
      wx.setStorageSync('randomFoodData', {
        foods: arr,
        date: today,
        timestamp: Date.now(),
      });
    } catch (error) {
      plugins.showToast({
        title: '获取食物失败，请重试',
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 格式化日期为 YYYY-MM-DD 格式
  formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
  },

  // 检查本地存储中的食物数据
  checkStoredFoodData() {
    const today = this.formatDate(new Date());
    const storedData = wx.getStorageSync('randomFoodData');

    // 检查存储的食物数据是否存在且为今天的数据
    if (
      storedData &&
      storedData.date === today &&
      storedData.foods &&
      storedData.foods.length > 0
    ) {
      // 如果是今天的数据，设置到页面上
      this.setData({
        foods: storedData.foods,
      });
      console.log('从缓存读取到今日食物数据:', storedData.foods);
    } else {
      // 如果不是今天的数据或没有数据，清空当前显示
      this.setData({
        foods: [],
      });
      console.log('没有找到今日食物数据缓存');
    }
  },

  /**
   * 获取纪念日数据
   */
  async getAnniversaryData() {
    try {
      plugins.showLoading();
      // 使用云函数获取纪念日数据
      const res = await wx.cloud.callFunction({
        name: 'getAnniversary',
      });

      const { result } = res;
      const { data } = result;

      if (data && data.length > 0) {
        // 处理纪念日数据
        data.forEach(item => {
          item.days = this.dateDiff(item.date);
        });

        // 按天数排序
        data.sort((a, b) => b.days - a.days);

        this.setData({
          anniversaryList: data,
        });
      }
    } catch (err) {
      console.error('获取纪念日数据失败:', err);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 获取倒计时数据
   */
  async getCountdownData() {
    try {
      plugins.showLoading();
      const res = await countdownDay.get();

      if (res.data && res.data.length > 0) {
        this.setData({
          countdownList: res.data,
          holidays: res.data,
        });

        // 处理倒计时数据
        this.handleHolidays();
      }
    } catch (err) {
      console.error('获取倒计时数据失败:', err);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 处理倒计时数据
   */
  handleHolidays() {
    const date = new Date();
    const arr = [];
    const currentFormattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    this.data.holidays.forEach(item => {
      const beginTime = new Date(item.beginDate.replace(/-/g, '/')).getTime();
      const endTime = new Date(item.endDate.replace(/-/g, '/')).getTime();
      item.begin = item.beginDate.split('-').slice(1).join('.');
      item.end = item.endDate.split('-').slice(1).join('.');

      if (currentFormattedDate === item.today) {
        // 当前正好是某个节假日
        this.setData({
          nowHoliday: item,
        });
      } else if (date.getTime() >= beginTime && date.getTime() <= endTime) {
        // 当前正在某个节假日范围
        this.setData({
          nowHoliday: item,
        });
      } else if (date.getTime() < beginTime) {
        // 还没到的节假日
        arr.push(item);
      }
    });

    // 按照 beginDate 字段升序排序
    arr.sort(
      (a, b) => new Date(a.beginDate.replace(/-/g, '/')) - new Date(b.beginDate.replace(/-/g, '/')),
    );

    const nextHolidays = arr;
    nextHolidays.forEach(item => {
      const nextBeginTime = new Date(item.beginDate.replace(/-/g, '/'));
      item.countDown = Math.ceil((nextBeginTime - date) / (1000 * 60 * 60 * 24));
    });

    this.setData({
      nextHoliday: nextHolidays,
    });
  },

  /**
   * 计算两个日期之间的天数差异
   * @param {String} date 日期字符串，格式为 YYYY-MM-DD
   * @returns {Number} 天数差异，负数表示未来的天数，正数表示过去的天数
   */
  dateDiff(date) {
    if (!date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date.replace(/-/g, '/'));
    targetDate.setHours(0, 0, 0, 0);

    const timeDiff = today.getTime() - targetDate.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  },

  /**
   * 更新公告数据
   */
  updateAnnouncements() {
    // 检查依赖数据是否都已加载完成
    if (!this.data.today || !this.data.anniversaryList || !this.data.nextHoliday) {
      console.log('公告数据依赖尚未全部加载完成，暂不更新公告');
      return;
    }

    // 使用公告工具函数生成公告数据，传递待办数量
    const announcements = announcementUtils.generateAnnouncements(
      this.data.today,
      this.data.anniversaryList,
      this.data.nextHoliday,
      this.data.todayUncompletedCount || 0, // 传递今日未完成待办数量
    );

    // 更新公告数据
    this.setData({
      announcements: announcements,
    });

    console.log('公告数据更新完成:', announcements);
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    // 检查本地存储中的食物数据
    this.checkStoredFoodData();

    // 获取用户openid并存储
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: res => {
        wx.setStorageSync('openid', res.result.OPENID);
      },
    });

    // 获取天气数据
    await this.getWeatherList();
    this.beforeGetLocation();

    // 获取纪念日和倒计时数据
    await Promise.all([this.getAnniversaryData(), this.getCountdownData()]);

    // 获取待办数量
    this.getTodayUncompletedCount();

    // 更新公告数据
    this.updateAnnouncements();

    // 主题相关设置
    themeManager.onThemeChange(this.handleThemeChange.bind(this));
    this.applyThemeBackground();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: async function () {
    // 每次显示页面时检查本地存储中的食物数据
    this.checkStoredFoodData();

    // 获取今日未完成待办数量
    this.getTodayUncompletedCount();

    // 刷新纪念日和倒计时数据
    await Promise.all([this.getAnniversaryData(), this.getCountdownData()]);

    // 更新公告数据
    this.updateAnnouncements();

    // 应用当前主题背景
    this.applyThemeBackground();
  },

  /**
   * 获取今日未完成待办数量
   */
  getTodayUncompletedCount: function () {
    // 获取当前本地日期信息
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // 调用云函数获取今日未完成待办数量，传递本地日期
    wx.cloud.callFunction({
      name: 'getTodos',
      data: {
        action: 'getTodayUncompletedCount',
        localDate: { year, month, day, dateStr },
      },
      success: res => {
        if (res.result && res.result.success) {
          const uncompletedCount = res.result.count || 0;

          this.setData({
            todayUncompletedCount: uncompletedCount,
          });
        } else {
          this.setData({
            todayUncompletedCount: 0,
          });
        }
      },
      fail: err => {
        console.error('获取待办数量失败:', err);
        this.setData({
          todayUncompletedCount: 0,
        });
      },
    });
  },

  // 打卡成功的回调
  onCheckInSuccess(e) {
    const checkInData = e.detail;
    this.setData({
      checkInData,
    });
  },

  /**
   * 处理主题变化
   * @param {Object} theme 新的主题对象
   * @param {Boolean} isTransition 是否是过渡准备阶段
   */
  handleThemeChange(theme, isTransition = false) {
    if (!theme) return;

    // 优先使用处理后的URL，如果没有则使用原始图片路径
    const backgroundImage = theme.themeImageUrl || theme.themeImage || '';

    this.setData({
      themeBackground: backgroundImage,
    });
  },

  /**
   * 应用当前主题背景
   */
  applyThemeBackground() {
    // 优先从本地缓存读取最新主题，确保在页面返回时显示最新主题
    const cachedTheme = wx.getStorageSync('currentTheme');
    if (cachedTheme) {
      // 优先使用处理后的URL，如果没有则使用原始图片路径
      const backgroundImage = cachedTheme.themeImageUrl || cachedTheme.themeImage || '';
      this.setData({
        themeBackground: backgroundImage,
      });
      return;
    }

    // 如果没有缓存，则从全局状态读取
    const app = getApp();
    const currentTheme = app.globalData.currentTheme;

    if (currentTheme) {
      // 优先使用处理后的URL，如果没有则使用原始图片路径
      const backgroundImage = currentTheme.themeImageUrl || currentTheme.themeImage || '';
      this.setData({
        themeBackground: backgroundImage,
      });
    }
  },

  /**
   * 处理公告点击事件
   * @param {Object} e 事件对象
   */
  onAnnouncementClick(e) {
    const announcement = e.detail.announcement;
    console.log('点击了公告:', announcement);

    // 如果有链接，跳转到对应页面
    if (announcement.link) {
      wx.navigateTo({
        url: announcement.link,
      });
    } else if (announcement.type === 'weather') {
      // 如果是天气公告，可以显示天气提示
      if (this.data.today && this.data.today.tips) {
        plugins.showToast({
          title: this.data.today.tips,
        });
      }
    }
  },
});
