const db = wx.cloud.database();
const todos = db.collection('todos');
const userInfo = db.collection('userInfo');
const plugins = require('../../utils/plugins');

// pages/user/index.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: true,
    avatar: '',
    nickname: '',
    isAuth: false,
    openid: '',
    dialog: false,
    todoObj: {
      title: '',
      time: ''
    },
    todoTitle: '',
    todoTime: ''
  },

  // 打卡成功的回调
  onCheckInSuccess(e) {
    const checkInData = e.detail
    console.log('打卡成功：', checkInData)

    // 如果获得了新的徽章，可以在这里更新界面显示
    if (checkInData.rewards.badges && checkInData.rewards.badges.length > 0) {
      // TODO: 更新徽章展示
    }
  },

  // 点击事件
  handleUser() {
    plugins.showToast({
      title: '小松秃头开发中~ 👨‍🦲'
    });
  },

  // 监听
  async handleTabBarChange() {
    const res = await userInfo.get();
    const infos = res.data;
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: res => {
        this.setData({
          isAuth: false,
          loading: true,
          openid: res.result.OPENID
        });
        const arr = infos.filter(item => item.openid === res.result.OPENID);
        if (arr.length) {
          this.setData({
            avatar: arr[0].avatar,
            nickname: arr[0].nickname,
            isAuth: true,
            loading: false,
          });
          return;
        } else {
          this.setData({
            loading: false,
            isAuth: false,
          });
        }
      },
      fail: err => {
        console.log('查询失败', err);
        this.setData({
          loading: false,
        });
      },
    });
  },

  // 一键登录
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: res => {
        // 存储用户信息到本地
        const userInfo = {
          avatar: res.userInfo.avatarUrl,
          nickname: res.userInfo.nickName,
          isAuth: true
        }
        wx.setStorageSync('userInfo', userInfo)
        
        // 更新页面显示
        this.setData(userInfo)

        // 存储到数据库
        db.collection('userInfo').add({
          data: {
            due: new Date(),
            openid: this.data.openid,
            avatar: res.userInfo.avatarUrl,
            nickname: res.userInfo.nickName,
            createTime: new Date()
          },
          success: res => {
            // 刷新打卡组件状态
            setTimeout(() => {
              const checkInComponent = this.selectComponent('#checkIn')
              if (checkInComponent) {
                checkInComponent.checkTodayStatus()
              }
            }, 1500) // 等待 1.5 秒确保数据已经存储
            console.log('用户信息存储成功：', res)
          }
        })
      },
      fail: err => {
        console.error('获取用户信息失败：', err)
        wx.showToast({
          title: '获取信息失败',
          icon: 'none'
        })
      }
    });
  },

  openDialog() {
    this.setData({
      dialog: true
    })
  },

  closeDialog() {
    this.setData({
      dialog: false
    })
    this.resetData();
  },

  resetData() {
    this.setData({
      todoTitle: '',
      todoTime: ''
    });
  },

  // 添加待办
  addTodo() {
    this.openDialog();
  },

  bindTodoChange(e) {
    this.setData({
      todoTitle: e.detail.value
    });
  },

  // 年月日时分秒选择器
  onChangeTime(e) {},

  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: ['GqXCTV7Ws4p-ADpD40fZz1mIfMd6Ab_71jOqkmKdkII'],
      success: (res) => {
        this.sendMessage();
      },
      fail: (err) => {
        console.log(err);
      },
      complete: () => {}
    })
  },

  // 发送消息
  sendMessage() {
    console.log(this.data.todoTitle);
    console.log(this.data.todoTime);
    wx.cloud.callFunction({
      name: 'sendMsg',
      data: {
        title: this.data.todoTitle,
        time: this.data.todoTime
      },
      success: (res) => {
        console.log(res);
        this.closeDialog();
      },
      fail: (err) => {
        console.log(err);
      }
    })
  },

  // 添加待办事项到数据库
  add() {
    let todoTime = this.data.todoTime.replace(/-/g, '/') + ':00:00';
    const todoGetTime = new Date(todoTime).getTime();
    todos.add({
      data: {
        title: this.data.todoTitle,
        time: new Date(todoTime),
        timestamp: todoGetTime
      }
    })
  },

  // 确认添加
  onSave() {
    wx.getSetting({
      withSubscriptions: true,
      success: async (res) => {
        await this.add();
        this.requestSubscribeMessage();
      }
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.handleTabBarChange();
    
    // 从本地存储读取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        avatar: userInfo.avatar,
        nickname: userInfo.nickname,
        isAuth: true
      })
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    if (this.data.isAuth) {
      // 刷新打卡组件状态
      const checkInComponent = this.selectComponent('#checkIn')
      if (checkInComponent) {
        checkInComponent.checkTodayStatus()
      }
    }
  },

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