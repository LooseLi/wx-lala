const db = wx.cloud.database();
const userInfo = db.collection('userInfo');
const plugins = require('../../utils/plugins');
const themeManager = require('../../utils/themeManager'); // 引入主题管理模块

Page({
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
    // 登录状态标记，可能的值: 'idle', 'getting-openid', 'logging-in', 'logged-in'
    loginState: 'idle',
    themeBackground: '', // 主题背景图片
    // 主题相关数据
    currentTheme: {
      id: 'theme1',
      isDefault: true,
      price: 0,
    },
    previewThemes: [
      {
        id: 'theme1',
        price: 0,
        themeImage:
          'https://6c61-lala-tsum-6gem2abq66c46985-1308328307.tcb.qcloud.la/themes/IMG_3325.jpeg?sign=388e88c2ac1bd2e2761ae1faad064a26&t=1744257722',
        isDefault: true,
        unlocked: true,
      },
      {
        id: 'theme2',
        price: 520,
        themeImage:
          'https://6c61-lala-tsum-6gem2abq66c46985-1308328307.tcb.qcloud.la/themes/IMG_3503.jpeg?sign=960f3fc0a5a2c31e84c3510156c33a0a&t=1744949018',
        isDefault: false,
        unlocked: false,
      },
    ],
  },

  // 打卡成功的回调
  onCheckInSuccess(e) {
    const checkInData = e.detail;
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

  // 一键登录 - 仍然保留此方法用于用户手动点击登录按钮的情况
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: async res => {
        const defaultAvatar = '/static/images/default-avatar.jpg';
        const defaultNickname = '可爱用户' + this.data.openid.substring(0, 6);

        const userInfo = {
          avatar: defaultAvatar,
          nickname: defaultNickname,
          isAuth: true,
          originalAvatar: res.userInfo.avatarUrl,
          originalNickname: res.userInfo.nickName,
          updateTime: new Date(),
        };

        wx.setStorageSync('userInfo', userInfo);

        this.setData(userInfo);

        try {
          // 获取默认主题
          const defaultTheme = await themeManager.getDefaultTheme();

          // 添加用户到数据库
          await this.addUserToDatabase(userInfo);

          // 加载主题数据
          if (this.data.openid) {
            await this.loadThemeData();
          }
        } catch (err) {
          console.error('获取默认主题或保存用户信息失败:', err);
        }
      },
      fail: err => {
        wx.showToast({
          title: '获取信息失败',
          icon: 'none',
        });
      },
    });
  },

  // 自动登录
  autoLogin() {
    if (this.data.loginState !== 'getting-openid') {
      return;
    }

    this.setData({ loginState: 'logging-in' });

    const defaultAvatar = '/static/images/default-avatar.jpg';
    const defaultNickname = '可爱用户' + this.data.openid.substring(0, 6);

    const userInfo = {
      avatar: defaultAvatar,
      nickname: defaultNickname,
      isAuth: true,
      updateTime: new Date(),
    };

    wx.setStorageSync('userInfo', userInfo);

    this.setData({
      ...userInfo,
      loading: false,
    });

    // 添加到数据库，会同时设置默认主题
    this.addUserToDatabase(userInfo);
  },

  /**
   * 开始登录流程
   */
  startLoginProcess: function () {
    if (this.data.loginState !== 'idle') {
      return;
    }

    this.setData({ loginState: 'getting-openid' });

    const storedOpenid = wx.getStorageSync('openid');

    if (storedOpenid) {
      this.setData({ openid: storedOpenid });
      this.checkUserExists(storedOpenid);
    } else {
      this.getOpenId();
    }
  },

  /**
   * 获取用户openid
   */
  getOpenId: async function () {
    try {
      this.setData({ loading: true });

      const storedOpenid = wx.getStorageSync('openid');

      let openid;
      if (storedOpenid) {
        openid = storedOpenid;
      } else {
        const openIdRes = await wx.cloud.callFunction({
          name: 'getOpenId',
        });
        openid = openIdRes.result.OPENID;

        wx.setStorageSync('openid', openid);
      }

      this.setData({ openid });

      if (this.data.loginState === 'logged-in') {
        this.setData({ loading: false });
        return;
      }

      this.checkUserExists(openid);
    } catch (err) {
      this.setData({
        loading: false,
        loginState: 'idle',
      });
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none',
      });
    }
  },

  /**
   * 检查用户是否存在
   */
  checkUserExists: async function (openid) {
    try {
      const res = await db.collection('userInfo').where({ openid: openid }).get();

      if (res.data && res.data.length > 0) {
        const userRecord = res.data[0];
        this.setData({
          avatar: userRecord.avatar,
          nickname: userRecord.nickname,
          isAuth: true,
          loading: false,
          loginState: 'logged-in',
        });

        wx.setStorageSync('userInfo', {
          avatar: userRecord.avatar,
          nickname: userRecord.nickname,
          isAuth: true,
          updateTime: new Date(),
        });
      } else {
        // 用户不存在，自动登录
        this.autoLogin();
      }
    } catch (err) {
      this.setData({
        loading: false,
        loginState: 'idle',
      });
    }
  },

  /**
   * 将用户添加到数据库
   */
  addUserToDatabase: function (userInfo) {
    return new Promise((resolve, reject) => {
      // 检查是否已存在该用户
      db.collection('userInfo')
        .where({ openid: this.data.openid })
        .count()
        .then(res => {
          if (res.total === 0) {
            // 获取默认主题
            return themeManager.getDefaultTheme().then(defaultTheme => {
              // 用户不存在，添加新用户
              return db.collection('userInfo').add({
                data: {
                  ...userInfo,
                  openid: this.data.openid,
                  createTime: new Date(),
                  currentTheme: defaultTheme ? defaultTheme.id : 'theme1', // 设置默认主题
                },
              });
            });
          } else {
            return { success: true };
          }
        })
        .then(res => {
          this.setData({ loginState: 'logged-in' });

          setTimeout(() => {
            const checkInComponent = this.selectComponent('#checkIn');
            if (checkInComponent) {
              checkInComponent.checkTodayStatus();
            }
          }, 1000);
          resolve(res);
        })
        .catch(err => {
          console.error('添加用户到数据库失败:', err);
          this.setData({ loginState: 'idle' });
          reject(err);
        });
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const userInfo = wx.getStorageSync('userInfo');

    if (userInfo && userInfo.isAuth) {
      // 先从本地设置状态，但后续会从数据库更新
      this.setData({
        avatar: userInfo.avatar,
        nickname: userInfo.nickname,
        isAuth: true,
        loading: true,
        loginState: 'logged-in',
      });

      // 获取openid并从数据库获取最新用户数据
      this.getOpenIdAndFetchLatestData().then(() => {
        // 加载主题数据
        if (this.data.openid) {
          this.loadThemeData();
        }
      });
    } else {
      // 未登录，开始登录流程
      this.startLoginProcess();
    }

    // 监听主题变化
    themeManager.onThemeChange(this.handleThemeChange.bind(this));

    // 应用当前主题背景
    this.applyThemeBackground();
  },

  /**
   * 获取openid并从数据库获取最新用户数据
   */
  getOpenIdAndFetchLatestData: async function () {
    try {
      const openIdRes = await wx.cloud.callFunction({
        name: 'getOpenId',
      });
      const openid = openIdRes.result.OPENID;

      this.setData({ openid });

      // 检查数据库中是否存在该用户
      const res = await db.collection('userInfo').where({ openid: openid }).get();

      if (res.data && res.data.length > 0) {
        const userRecord = res.data[0];

        this.setData({
          avatar: userRecord.avatar,
          nickname: userRecord.nickname,
          isAuth: true,
          loading: false,
          loginState: 'logged-in',
        });

        // 更新本地存储，确保与数据库一致
        wx.setStorageSync('userInfo', {
          avatar: userRecord.avatar,
          nickname: userRecord.nickname,
          isAuth: true,
          updateTime: new Date(),
        });
      } else {
        const localUserInfo = wx.getStorageSync('userInfo');

        const userInfo = {
          avatar: localUserInfo.avatar,
          nickname: localUserInfo.nickname,
          isAuth: true,
          updateTime: new Date(),
        };

        await this.addUserToDatabase(userInfo);

        this.setData({ loading: false });
      }
      return openid;
    } catch (err) {
      this.setData({ loading: false });
      console.error('获取openid失败:', err);
      throw err;
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
    if (this.data.isAuth && this.data.loginState === 'logged-in') {
      const checkInComponent = this.selectComponent('#checkIn');
      if (checkInComponent) {
        checkInComponent.checkTodayStatus();
      }

      // 刷新主题数据
      this.loadThemeData();
    }

    if (this.data.loginState === 'idle' && !this.data.isAuth) {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.isAuth) {
        this.startLoginProcess();
      }
    }

    // 应用当前主题背景
    this.applyThemeBackground();
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

  /**
   * 处理主题变化
   * @param {Object} theme 新的主题对象
   */
  handleThemeChange(theme) {
    if (theme) {
      // 优先使用处理后的URL，如果没有则使用原始图片路径
      const backgroundImage = theme.themeImageUrl || theme.themeImage || '';
      this.setData({
        themeBackground: backgroundImage,
      });
    }
  },

  /**
   * 应用当前主题背景
   */
  applyThemeBackground() {
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

  // 编辑头像
  editAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePath = res.tempFilePaths[0];

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

            // 上传到云存储，使用优化的文件路径结构
            wx.cloud.uploadFile({
              cloudPath: `avatar/${userFolder}/${Date.now()}.jpg`,
              filePath: tempFilePath,
              success: res => {
                const newAvatar = res.fileID;

                // 保存当前头像作为上一个头像
                const previousAvatar = this.data.avatar;

                // 计算新的头像历史记录（只保留最新的两个）
                const newAvatarHistory = [newAvatar];
                if (previousAvatar) {
                  newAvatarHistory.push(previousAvatar);
                }

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
                      wx.hideLoading();
                    },
                    fail: err => {
                      wx.hideLoading();
                    },
                  });
                } else {
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
            wx.hideLoading();
          });
      },
    });
  },

  // 清理旧头像，保留最近一次的
  async cleanupOldAvatars(userFolder) {
    try {
      // 查询数据库获取用户历史头像记录
      const userRecord = await db
        .collection('userInfo')
        .where({
          openid: this.data.openid,
        })
        .get();

      // 检查用户记录是否存在
      if (!userRecord.data || userRecord.data.length === 0) {
        return;
      }

      // 获取当前用户记录
      const user = userRecord.data[0];

      // 初始化头像历史记录（如果不存在）
      if (!user.avatarHistory) {
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

      // 如果有需要删除的头像
      if (filesToDelete.length > 0) {
        try {
          // 删除旧头像文件
          const deleteResult = await wx.cloud.deleteFile({
            fileList: filesToDelete,
          });

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
        } catch (deleteErr) {}
      }
    } catch (err) {}
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

    this.setData(data);

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

  /**
   * 处理主题点击
   */
  handleThemeClick(e) {
    const themeId = e.currentTarget.dataset.themeId;
    // 找到点击的主题
    const theme = this.data.previewThemes.find(t => t.id === themeId);
    if (!theme) return;

    // 如果是当前使用的主题，不做任何操作
    if (this.data.currentTheme.id === themeId) {
      return;
    }

    // 免费主题或已解锁的付费主题，直接切换
    if (theme.price === 0 || theme.unlocked) {
      this.switchTheme(theme);
    } else {
      // 未解锁的付费主题，显示解锁确认对话框
      wx.showModal({
        title: '解锁主题',
        content: `确定使用 ${theme.price} 积分解锁该主题吗？`,
        success: res => {
          if (res.confirm) {
            this.unlockTheme(theme);
          }
        },
      });
    }
  },

  /**
   * 跳转到主题页面
   */
  goToThemesPage() {
    wx.navigateTo({
      url: '/pages/themes/index',
    });
  },

  /**
   * 加载用户主题数据
   */
  loadThemeData: async function () {
    if (!this.data.openid) return;

    wx.showLoading({ title: '加载中...' });

    try {
      // 获取用户可用的主题列表
      const themes = await themeManager.getUserAvailableThemes(this.data.openid);

      if (themes && themes.length > 0) {
        // 获取当前使用的主题
        const currentTheme = themes.find(theme => theme.current) || themes[0];

        // 选择前两个主题作为预览
        let previewThemes = [];

        // 首先加入当前主题
        previewThemes.push(currentTheme);

        // 然后添加一个不同的主题（优先选择未解锁的付费主题）
        const otherThemes = themes.filter(theme => theme.id !== currentTheme.id);

        // 优先展示付费未解锁的主题
        const premiumUnlocked = otherThemes.find(theme => theme.price > 0 && !theme.unlocked);
        const premiumLocked = otherThemes.find(theme => theme.price > 0 && theme.unlocked);
        const freeTheme = otherThemes.find(theme => theme.price === 0);

        // 添加第二个主题（按优先级）
        if (premiumUnlocked) {
          previewThemes.push(premiumUnlocked);
        } else if (premiumLocked) {
          previewThemes.push(premiumLocked);
        } else if (freeTheme) {
          previewThemes.push(freeTheme);
        } else if (otherThemes.length > 0) {
          previewThemes.push(otherThemes[0]);
        }

        // 如果只有一个主题，添加一个虚拟的付费主题
        if (previewThemes.length === 1) {
          previewThemes.push({
            id: 'theme2',
            price: 520,
            themeImage:
              'https://6c61-lala-tsum-6gem2abq66c46985-1308328307.tcb.qcloud.la/themes/IMG_3503.jpeg?sign=960f3fc0a5a2c31e84c3510156c33a0a&t=1744949018',
            isDefault: false,
            unlocked: false,
          });
        }

        this.setData({
          currentTheme,
          previewThemes,
        });
      }
    } catch (error) {
      console.error('加载主题数据失败:', error);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 切换主题
   */
  async switchTheme(theme) {
    if (!this.data.openid) return;

    wx.showLoading({ title: '正在切换主题...' });

    try {
      // 调用主题管理器的切换方法
      const result = await themeManager.switchTheme(this.data.openid, theme.id);

      if (result.success) {
        wx.showToast({
          title: '主题切换成功',
          icon: 'success',
        });

        // 刷新主题数据
        await this.loadThemeData();

        // 应用主题背景
        this.applyThemeBackground();
      } else {
        wx.showToast({
          title: result.message || '主题切换失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('切换主题失败:', error);
      wx.showToast({
        title: '主题切换失败',
        icon: 'none',
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 解锁主题
   */
  async unlockTheme(theme) {
    if (!this.data.openid) return;

    wx.showLoading({ title: '正在解锁主题...' });

    try {
      // 调用主题管理器的解锁方法
      const result = await themeManager.unlockTheme(this.data.openid, theme.id);

      if (result.success) {
        wx.showToast({
          title: '解锁成功',
          icon: 'success',
        });

        // 解锁成功后自动切换到该主题
        await this.switchTheme(theme);
      } else {
        wx.showToast({
          title: result.message || '解锁失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('解锁主题失败:', error);
      wx.showToast({
        title: '解锁失败',
        icon: 'none',
      });
    } finally {
      wx.hideLoading();
    }
  },
});
