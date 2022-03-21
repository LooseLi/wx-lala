const db = wx.cloud.database();
const userInfo = db.collection('userInfo');
let app = getApp();

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
  async handleTabBarChange() {
    const res = await userInfo.get();
    const infos = res.data;
    wx.login({
      success: res => {
        wx.request({
          method: 'GET',
          url: 'https://api.weixin.qq.com/sns/jscode2session',
          data: {
            appid: app.globalData.APP_ID,
            secret: app.globalData.APP_SECRET,
            js_code: res.code,
            grant_type: 'authorization_code',
          },
          success: ({
            data
          }) => {
            wx.showToast({
              title: data.openid,
              duration: 3000,
              icon: 'none',
            });
            const arr = infos.filter(item => item.uid === data.openid);
            if (arr.length) {
              this.setData({
                avatar: arr[0].avatar,
                nickname: arr[0].nickname,
                isAuth: true,
                uid: data.openid
              });
              return;
            }
            this.setData({
              isAuth: false,
              uid: data.openid
            });
          },
          fail: err => {
            wx.showToast({
              title: err,
              duration: 3000,
              icon: 'none',
            });
          },
        })
      }
    })
  },

  // 一键登录
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: res => {
        this.setData({
          avatar: res.userInfo.avatarUrl,
          nickname: res.userInfo.nickName,
          isAuth: true
        });
        userInfo.add({
          // data 字段表示需新增的 JSON 数据
          data: {
            // _id: 'todo-identifiant-aleatoire', // 可选自定义 _id，在此处场景下用数据库自动分配的就可以了
            due: new Date(),
            uid: this.data.uid,
            avatar: this.data.avatar,
            nickname: this.data.nickname,
          },
          success: function (res) {
            // res 是一个对象，其中有 _id 字段标记刚创建的记录的 id
            console.log(res)
          }
        })
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