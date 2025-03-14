App({
  /**
   * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
   */
  onLaunch: function () {
    wx.cloud.init({
      // env: 'cloud1-5g2h5bs5d6613df6'
      env: 'lala-tsum-6gem2abq66c46985',
    });
  },

  globalData: {
    APP_ID: 'wxab00d9afbda623cf',
    APP_SECRET: '5f1d10c89d82fe00f0f55d4391c5584e',
  },

  getTopPages: () => {
    let pages = getCurrentPages();
    return pages[pages.length - 1];
  },

  /**
   * 当小程序启动，或从后台进入前台显示，会触发 onShow
   */
  onShow: function (options) {},

  /**
   * 当小程序从前台进入后台，会触发 onHide
   */
  onHide: function () {},

  /**
   * 当小程序发生脚本错误，或者 api 调用失败时，会触发 onError 并带上错误信息
   */
  onError: function (msg) {},
});
