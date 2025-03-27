const db = wx.cloud.database();
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
    showNicknameEdit: false, // 显示昵称编辑弹窗
    editingNickname: '', // 正在编辑的昵称
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

  // 待办事项相关功能已移除

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

        // 显示加载中提示
        wx.showLoading({
          title: '头像上传中...',
          mask: true,
        });

        // 获取openid前8位作为用户文件夹名
        const userFolder = this.data.openid.substring(0, 8);

        // 先查询数据库获取当前的头像历史记录
        db.collection('userInfo')
          .where({
            openid: this.data.openid,
          })
          .get()
          .then(res => {
            // 获取当前用户记录
            const user = res.data[0] || {};
            const currentAvatarHistory = user.avatarHistory || [];
            console.log('当前头像历史记录:', currentAvatarHistory);

            // 上传到云存储，使用优化的文件路径结构
            wx.cloud.uploadFile({
              cloudPath: `avatar/${userFolder}/${Date.now()}.jpg`,
              filePath: tempFilePath,
              success: res => {
                const newAvatar = res.fileID;
                console.log('新头像上传成功，文件ID:', newAvatar);

                // 保存当前头像作为上一个头像
                const previousAvatar = this.data.avatar;
                console.log('上一个头像:', previousAvatar);

                // 计算新的头像历史记录（只保留最新的两个）
                const newAvatarHistory = [newAvatar];
                if (previousAvatar) {
                  newAvatarHistory.push(previousAvatar);
                }
                console.log('新的头像历史记录:', newAvatarHistory);

                // 计算需要删除的头像文件
                const keepFileIDs = newAvatarHistory;
                const filesToDelete = currentAvatarHistory.filter(fileID => {
                  // 检查这个fileID是否应该保留
                  return !keepFileIDs.some(keepID => {
                    // 如果两个ID完全相等，或者一个包含另一个，则认为是同一个文件
                    return (
                      keepID === fileID ||
                      (keepID && fileID && (keepID.includes(fileID) || fileID.includes(keepID)))
                    );
                  });
                });
                console.log('需要删除的旧头像:', filesToDelete);

                // 更新本地和数据库
                this.updateUserInfo({
                  avatar: newAvatar,
                  previousAvatar: previousAvatar,
                  avatarHistory: newAvatarHistory,
                });

                // 删除旧头像文件
                if (filesToDelete.length > 0) {
                  wx.cloud.deleteFile({
                    fileList: filesToDelete,
                    success: res => {
                      console.log('删除旧头像成功:', res);
                      wx.hideLoading();
                    },
                    fail: err => {
                      console.error('删除旧头像失败:', err);
                      wx.hideLoading();
                    },
                  });
                } else {
                  console.log('没有需要删除的旧头像');
                  wx.hideLoading();
                }
              },
              fail: err => {
                wx.hideLoading();
                wx.showToast({
                  title: '上传失败',
                  icon: 'none',
                });
              },
            });
          })
          .catch(err => {
            console.error('查询用户信息失败:', err);
            wx.hideLoading();
          });
      },
    });
  },

  // 清理旧头像，保留最近一次的
  async cleanupOldAvatars(userFolder) {
    try {
      console.log('开始清理旧头像...');

      // 查询数据库获取用户历史头像记录
      const userRecord = await db
        .collection('userInfo')
        .where({
          openid: this.data.openid,
        })
        .get();

      // 检查用户记录是否存在
      if (!userRecord.data || userRecord.data.length === 0) {
        console.log('用户记录不存在，无需清理');
        return;
      }

      // 获取当前用户记录
      const user = userRecord.data[0];

      // 初始化头像历史记录（如果不存在）
      if (!user.avatarHistory) {
        console.log('用户没有头像历史记录，初始化空数组');
        await db
          .collection('userInfo')
          .where({ openid: this.data.openid })
          .update({
            data: { avatarHistory: [] },
          });
        return;
      }

      // 要保留的头像文件ID
      const keepFileIDs = [this.data.avatar, this.data.previousAvatar].filter(Boolean);
      console.log('当前保留的头像:', keepFileIDs);

      // 详细输出头像历史记录和当前头像，用于调试
      console.log('数据库中的头像历史记录:', user.avatarHistory);
      console.log('当前头像:', this.data.avatar);
      console.log('上一个头像:', this.data.previousAvatar);

      // 由于文件ID可能有不同的格式或前缀，我们使用部分匹配而不是完全相等
      // 找出需要删除的旧头像
      const filesToDelete = user.avatarHistory.filter(fileID => {
        // 检查这个fileID是否应该保留
        return !keepFileIDs.some(keepID => {
          // 如果两个ID完全相等，或者一个包含另一个，则认为是同一个文件
          return (
            keepID === fileID ||
            (keepID && fileID && (keepID.includes(fileID) || fileID.includes(keepID)))
          );
        });
      });

      console.log('需要删除的旧头像:', filesToDelete);

      // 如果有需要删除的头像
      if (filesToDelete.length > 0) {
        try {
          // 删除旧头像文件
          const deleteResult = await wx.cloud.deleteFile({
            fileList: filesToDelete,
          });

          console.log('删除结果:', deleteResult);

          // 更新数据库中的头像历史记录，只保留当前头像和上一个头像
          await db
            .collection('userInfo')
            .where({
              openid: this.data.openid,
            })
            .update({
              data: {
                avatarHistory: keepFileIDs.filter(Boolean),
              },
            });

          console.log('成功清理数据库中', filesToDelete.length, '个旧头像记录');
        } catch (deleteErr) {
          console.error('删除旧头像文件失败:', deleteErr);
        }
      } else {
        console.log('没有需要删除的旧头像文件');
      }
    } catch (err) {
      console.error('清理旧头像失败:', err);
      // 即使清理失败也不影响上传新头像
    }
  },

  // 更新头像历史记录数组
  updateAvatarHistory(newAvatar) {
    // 获取当前用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};

    // 初始化历史记录数组
    let history = userInfo.avatarHistory || [];

    // 将新头像添加到历史记录最前面
    history = [newAvatar, ...history.filter(item => item !== newAvatar)];

    // 只保留最近两个头像记录
    return history.slice(0, 2);
  },

  // 备用方法：如果清理失败，直接上传
  uploadAvatarWithoutCleanup(userFolder, tempFilePath) {
    wx.cloud.uploadFile({
      cloudPath: `avatar/${userFolder}/${Date.now()}.jpg`,
      filePath: tempFilePath,
      success: res => {
        const avatar = res.fileID;
        wx.hideLoading();

        // 更新本地和数据库
        this.updateUserInfo({
          avatar,
          previousAvatar: this.data.avatar, // 保存上一次头像路径
          avatarHistory: this.updateAvatarHistory(avatar), // 更新头像历史记录
        });
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '上传失败',
          icon: 'none',
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
