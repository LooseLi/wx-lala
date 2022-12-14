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
    uid: '',
    dialog: false,
    todoObj: {
      title: '',
      time: ''
    },
    todoTitle: '',
    todoTime: ''
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
          uid: res.result.openid
        });
        const arr = infos.filter(item => item.uid === res.result.openid);
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
            avatar: res.userInfo.avatarUrl,
            nickname: res.userInfo.nickName,
          },
          success: function (res) {
            // res 是一个对象，其中有 _id 字段标记刚创建的记录的 id
            console.log(res)
          }
        })
      },
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