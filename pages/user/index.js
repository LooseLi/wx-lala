// pages/user/index.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    avatar: '',
    nickname: '',
    isAuth: false,
    APP_KEY: 'EA2BD5AA28FF7BD4A39F219DF4650EDE',
    uid: '',
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
    const APP_ID = 'wxab00d9afbda623cf';
    const secret = '5f1d10c89d82fe00f0f55d4391c5584e';
    wx.login({
      success: res => {
        wx.request({
          method: 'GET',
          url: 'https://api.weixin.qq.com/sns/jscode2session',
          data: {
            appid: APP_ID,
            secret,
            js_code: res.code,
            grant_type: 'authorization_code',
          },
          success: res => {
            this.setData({
              uid: res.data.openid,
            });
            wx.request({
              method: 'GET',
              url: 'http://api.yesapi.cn/api/App/Table/GetOneDataByOneField',
              data: {
                model_name: 'userInfo',
                field_name: 'uid',
                field_value: res.data.openid,
                app_key: this.data.APP_KEY,
              },
              success: res => {
                console.log(res);
                this.setData({
                  loading: true,
                });
                const {data} = res;
                if (data.data.err_code === 3) {
                  this.setData({
                    isAuth: false,
                  });
                  return;
                }
                this.setData({
                  avatar: data.data.data.avatar,
                  nickname: data.data.data.nickname,
                  isAuth: true,
                });
              },
            });
          },
        });
      },
    });
    // 查看是否授权
    // wx.getSetting({
    //   success: res => {
    //     console.log(res);
    //     if (res.authSetting['scope.userInfo']) {
    //       // 已经授权，可以直接调用 getUserInfo 获取头像昵称
    //       wx.getUserProfile({
    //         desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
    //         success: res => {
    //           console.log(res);
    //           // var userInfo = res.userInfo;
    //           // this.setData({
    //           //   nickname: userInfo.nickName,
    //           //   avatar: userInfo.avatarUrl,
    //           // });
    //         },
    //       });
    //     }
    //   },
    // });
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
        console.log(res);
        wx.request({
          method: 'POST',
          url: 'http://api.yesapi.cn/api/App/Table/Create',
          data: {
            model_name: 'userInfo',
            app_key: this.data.APP_KEY,
            data: {
              avatar: res.userInfo.avatarUrl,
              nickname: res.userInfo.nickName,
              uid: this.data.uid,
            },
          },
        });
        this.setData({
          avatar: res.userInfo.avatarUrl,
          nickname: res.userInfo.nickName,
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
