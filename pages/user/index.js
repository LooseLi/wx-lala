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
    showNicknameEdit: false, // 显示昵称编辑弹窗
    editingNickname: '', // 正在编辑的昵称
    todoObj: {
      title: '',
      time: '',
    },
    todoTitle: '',
    todoTime: '',
    dialogAnimation: false,
    checkInData: null,
  },

  // 打卡成功的回调
  onCheckInSuccess(e) {
    const checkInData = e.detail;
    console.log('打卡成功：', checkInData);

    // 如果需要，可以在这里更新页面上的其他数据
    this.setData({
      checkInData: checkInData,
    });
  },

  // 点击事件
  handleUser() {
    plugins.showToast({
      title: '小松秃头开发中~ 👨‍🦲',
    });
  },

  // 监听
  async handleTabBarChange() {
    try {
      this.setData({
        loading: true,
      });

      // 获取OpenID
      const openIdRes = await wx.cloud.callFunction({
        name: 'getOpenId',
      });
      const openid = openIdRes.result.OPENID;

      // 获取用户信息
      const res = await userInfo.get();
      const userRecord = res.data.find(item => item.openid === openid);

      // 更新状态
      if (userRecord) {
        this.setData({
          openid,
          avatar: userRecord.avatar,
          nickname: userRecord.nickname,
          isAuth: true,
          loading: false,
        });
      } else {
        this.setData({
          openid,
          loading: false,
          isAuth: false,
        });
      }
    } catch (err) {
      console.error('初始化失败:', err);
      this.setData({
        loading: false,
        isAuth: false,
      });
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
      });
    }
  },

  // 一键登录
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: res => {
        // 生成默认用户信息
        const defaultAvatar = '/static/images/default-avatar.jpg';
        const defaultNickname = '可爱用户' + this.data.openid.substring(0, 6);

        // 构建用户信息对象
        const userInfo = {
          avatar: defaultAvatar,
          nickname: defaultNickname,
          isAuth: true,
          originalAvatar: res.userInfo.avatarUrl, // 保存原始头像
          originalNickname: res.userInfo.nickName, // 保存原始昵称
          updateTime: new Date(),
        };

        // 存储用户信息到本地
        wx.setStorageSync('userInfo', userInfo);

        // 更新页面显示
        this.setData(userInfo);

        // 存储到数据库
        db.collection('userInfo').add({
          data: {
            ...userInfo, // 展开用户信息对象
            openid: this.data.openid,
            createTime: new Date(), // 创建时间
          },
          success: res => {
            // 刷新打卡组件状态
            setTimeout(() => {
              const checkInComponent = this.selectComponent('#checkIn');
              if (checkInComponent) {
                checkInComponent.checkTodayStatus();
              }
            }, 1500); // 等待 1.5 秒确保数据已经存储
            console.log('用户信息存储成功：', res);
          },
        });
      },
      fail: err => {
        console.error('获取用户信息失败：', err);
        wx.showToast({
          title: '获取信息失败',
          icon: 'none',
        });
      },
    });
  },

  openDialog() {
    this.setData({
      dialog: true,
    });
  },

  closeDialog() {
    this.setData({
      dialog: false,
    });
    this.resetData();
  },

  resetData() {
    this.setData({
      todoTitle: '',
      todoTime: '',
    });
  },

  // 添加待办
  addTodo() {
    this.openDialog();
  },

  bindTodoChange(e) {
    this.setData({
      todoTitle: e.detail.value,
    });
  },

  // 年月日时分秒选择器
  onChangeTime(e) {},

  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: ['GqXCTV7Ws4p-ADpD40fZz1mIfMd6Ab_71jOqkmKdkII'],
      success: res => {
        this.sendMessage();
      },
      fail: err => {
        console.log(err);
      },
      complete: () => {},
    });
  },

  // 发送消息
  sendMessage() {
    console.log(this.data.todoTitle);
    console.log(this.data.todoTime);
    wx.cloud.callFunction({
      name: 'sendMsg',
      data: {
        title: this.data.todoTitle,
        time: this.data.todoTime,
      },
      success: res => {
        console.log(res);
        this.closeDialog();
      },
      fail: err => {
        console.log(err);
      },
    });
  },

  // 添加待办事项到数据库
  add() {
    let todoTime = this.data.todoTime.replace(/-/g, '/') + ':00:00';
    const todoGetTime = new Date(todoTime).getTime();
    todos.add({
      data: {
        title: this.data.todoTitle,
        time: new Date(todoTime),
        timestamp: todoGetTime,
      },
    });
  },

  // 确认添加
  onSave() {
    wx.getSetting({
      withSubscriptions: true,
      success: async res => {
        await this.add();
        this.requestSubscribeMessage();
      },
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.handleTabBarChange();

    // 从本地存储读取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        avatar: userInfo.avatar,
        nickname: userInfo.nickname,
        isAuth: true,
      });
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
      const checkInComponent = this.selectComponent('#checkIn');
      if (checkInComponent) {
        checkInComponent.checkTodayStatus();
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

  // 编辑头像
  editAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePath = res.tempFilePaths[0];

        // 上传到云存储
        wx.cloud.uploadFile({
          cloudPath: `avatar/${this.data.openid}_${Date.now()}.jpg`,
          filePath: tempFilePath,
          success: res => {
            const avatar = res.fileID;

            // 更新本地和数据库
            this.updateUserInfo({
              avatar,
            });
          },
          fail: err => {
            wx.showToast({
              title: '上传失败',
              icon: 'none',
            });
          },
        });
      },
    });
  },

  // 编辑昵称
  editNickname() {
    this.setData({
      showNicknameEdit: true,
      editingNickname: this.data.nickname,
    });

    // 添加延迟，确保动画效果顺畅
    setTimeout(() => {
      this.setData({
        dialogAnimation: true,
      });
    }, 50);
  },

  // 关闭昵称编辑
  closeNicknameEdit() {
    this.setData({
      showNicknameEdit: false,
      editingNickname: '',
    });
  },

  // 昵称输入事件
  onNicknameInput(e) {
    const value = e.detail.value;
    this.setData({
      editingNickname: value,
    });
  },

  // 保存昵称
  saveNickname() {
    const nickname = this.data.editingNickname.trim();
    if (!nickname) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none',
      });
      return;
    }

    if (nickname === this.data.nickname) {
      this.closeNicknameEdit();
      return;
    }

    // 更新本地和数据库
    this.updateUserInfo({
      nickname,
    });
    this.closeNicknameEdit();
  },

  // 更新用户信息
  updateUserInfo(data) {
    // 更新本地数据
    const userInfo = wx.getStorageSync('userInfo');
    const newUserInfo = {
      ...userInfo,
      ...data,
      updateTime: new Date(),
    };
    wx.setStorageSync('userInfo', newUserInfo);

    // 更新页面显示
    this.setData(data);

    // 更新数据库
    db.collection('userInfo')
      .where({
        openid: this.data.openid,
      })
      .update({
        data: {
          ...data,
          updateTime: new Date(),
        },
      })
      .then(() => {
        wx.showToast({
          title: '更新成功',
          icon: 'success',
        });
      })
      .catch(err => {
        wx.showToast({
          title: '更新失败',
          icon: 'none',
        });
      });
  },
});
