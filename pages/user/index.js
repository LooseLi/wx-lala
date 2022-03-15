// pages/user/index.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    avatar: '',
    nickName: '',
    isAuth: false,
  },

  // 点击事件
  handleUser() {
    wx.showToast({
      title: '小松秃头开发中~ 👨‍🦲',
      duration: 3000,
      icon: 'none',
    });
  },

  // 监听
  handleTabBarChange() {
    console.log(111);
    // 查看是否授权
    wx.getSetting({
      success: res => {
        console.log(res);
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称
          wx.getUserProfile({
            desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
            success: res => {
              console.log(res);
              // var userInfo = res.userInfo;
              // this.setData({
              //   nickName: userInfo.nickName,
              //   avatar: userInfo.avatarUrl,
              // });
            },
          });
        }
      },
    });
  },

  // 获取
  // getUserInfo(e) {
  //   let code = '';
  //   wx.login({
  //     success: function (res) {
  //       code = res.code;
  //       const rawData = e.detail.rawData;
  //       const signature = e.detail.signature;
  //       const encryptedData = e.detail.encryptedData;
  //       const iv = e.detail.iv;
  //       const data = {
  //         code: code,
  //         rawData: rawData,
  //         signature: signature,
  //         iv: iv,
  //         encryptedData: encryptedData,
  //       }
  //       wx.request({
  //         url: 'https://restapi.amap.com/login',
  //         data: data,
  //         method: 'POST',
  //         success: (res) => {
  //           console.log(res)
  //         },
  //       })
  //     }
  //   })
  // },

  getUserProfile(e) {
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: res => {
        this.setData({
          avatar: res.userInfo.avatarUrl,
          nickName: res.userInfo.nickName,
          isAuth: true,
        });
      },
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.handleTabBarChange();
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
