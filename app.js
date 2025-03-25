App({
  /**
   * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
   */
  onLaunch: function () {
    wx.cloud.init();

    // 初始化主题设置
    this.initThemeSettings();

    // 监听系统主题变化
    wx.onThemeChange(({ theme }) => {
      console.log('系统主题变化事件：', theme);

      // 验证主题值是否有效
      if (theme === 'dark' || theme === 'light') {
        this.globalData.systemTheme = theme;

        // 如果用户设置为跟随系统，则应用系统主题
        const themePreference = wx.getStorageSync('themePreference') || 'auto';
        if (themePreference === 'auto') {
          this.applyTheme(theme);
        }
      }
    });
  },

  globalData: {
    systemTheme: 'light', // 系统当前主题模式
    userTheme: 'auto', // 用户主题偏好设置：'auto'(跟随系统),'light'(浅色),'dark'(深色)
  },

  getTopPages: () => {
    let pages = getCurrentPages();
    return pages[pages.length - 1];
  },

  /**
   * 初始化主题设置
   */
  initThemeSettings: function () {
    // 获取用户主题偏好设置
    const themePreference = wx.getStorageSync('themePreference') || 'auto';
    this.globalData.userTheme = themePreference;

    // 获取系统当前主题
    try {
      // 使用异步方法获取系统主题
      wx.getSystemInfoAsync({
        success: res => {
          // 尝试从屏幕亮度判断深色模式
          let detectedTheme = res.theme || 'light';

          // 如果是深色模式，但返回的是light，尝试使用其他方法判断
          if (detectedTheme === 'light' && wx.canIUse('getSystemSetting')) {
            wx.getSystemSetting({
              success: setting => {
                if (setting.darkmode) {
                  detectedTheme = 'dark';
                  console.log('从系统设置中检测到深色模式');
                }
                this.updateTheme(detectedTheme, themePreference);
              },
              fail: () => {
                this.updateTheme(detectedTheme, themePreference);
              },
            });
          } else {
            this.updateTheme(detectedTheme, themePreference);
          }
        },
        fail: () => {
          // 如果异步方法失败，尝试同步方法
          const res = wx.getSystemInfoSync();
          const systemTheme = res.theme || 'light';
          this.updateTheme(systemTheme, themePreference);
        },
      });
    } catch (e) {
      console.error('获取系统主题出错：', e);
      // 出错时使用默认主题
      this.updateTheme('light', themePreference);
    }
  },

  /**
   * 应用主题到系统组件
   * @param {string} theme 主题类型：'light' 或 'dark'
   */
  applyTheme: function (theme) {
    const isDark = theme === 'dark';

    // 设置导航栏样式
    wx.setNavigationBarColor({
      frontColor: isDark ? '#ffffff' : '#000000',
      backgroundColor: isDark ? '#1c1c1e' : '#daecff',
      animation: {
        duration: 300,
        timingFunc: 'easeIn',
      },
    });

    // 设置TabBar样式
    wx.setTabBarStyle({
      color: isDark ? '#8c8c8c' : '#8c8c8c',
      selectedColor: isDark ? '#0a84ff' : '#91d5ff',
      backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
      borderStyle: isDark ? 'black' : 'white',
    });
  },

  /**
   * 切换主题模式
   * @param {string} themePreference 主题偏好：'auto', 'light', 'dark'
   */
  toggleTheme: function (themePreference) {
    // 保存用户偏好
    wx.setStorageSync('themePreference', themePreference);
    this.globalData.userTheme = themePreference;

    // 应用主题
    if (themePreference === 'auto') {
      // 跟随系统
      this.applyTheme(this.globalData.systemTheme);
    } else {
      // 使用指定主题
      this.applyTheme(themePreference);
    }
  },

  /**
   * 更新主题设置
   */
  updateTheme: function (systemTheme, themePreference) {
    console.log('检测到的系统主题：', systemTheme);
    this.globalData.systemTheme = systemTheme;

    // 根据用户偏好设置应用主题
    if (themePreference === 'auto') {
      // 跟随系统
      this.applyTheme(systemTheme);
    } else {
      // 使用用户设置的主题
      this.applyTheme(themePreference);
    }
  },

  /**
   * 当小程序启动，或从后台进入前台显示，会触发 onShow
   */
  onShow: function (options) {
    // 在小程序显示时重新检测主题
    // 这样可以解决初始化时主题检测不准确的问题
    if (this.globalData.userTheme === 'auto') {
      try {
        const res = wx.getSystemInfoSync();
        const currentTheme = res.theme || 'light';

        // 如果主题发生变化，重新应用
        if (currentTheme !== this.globalData.systemTheme) {
          console.log('显示时检测到主题变化：', currentTheme);
          this.globalData.systemTheme = currentTheme;
          this.applyTheme(currentTheme);
        }
      } catch (e) {
        console.error('显示时检测主题出错：', e);
      }
    }
  },

  /**
   * 当小程序从前台进入后台，会触发 onHide
   */
  onHide: function () {},

  /**
   * 当小程序发生脚本错误，或者 api 调用失败时，会触发 onError 并带上错误信息
   */
  onError: function (msg) {},
});
