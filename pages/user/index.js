const db = wx.cloud.database();
const userInfo = db.collection('userInfo');
const plugins = require('../../utils/plugins');
const themeManager = require('../../utils/themeManager'); // 引入主题管理模块
const greetingUtils = require('../../utils/greetingUtils'); // 引入问候语工具模块

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
    currentTheme: null,
    previewThemes: [],
    greeting: '', // 基于时间的问候语
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
        const defaultNickname =
          '可爱用户' + this.data.openid.substring(this.data.openid.length - 6);

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
    const defaultNickname = '可爱用户' + this.data.openid.substring(this.data.openid.length - 6);

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
    this.addUserToDatabase(userInfo).then(() => {
      // 确保用户创建后加载主题数据
      this.loadThemeData();
    });
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

          // 刷新页面数据
          setTimeout(() => {
            // 加载打卡组件状态
            const checkInComponent = this.selectComponent('#checkIn');
            if (checkInComponent) {
              checkInComponent.checkTodayStatus();
            }

            // 确保主题数据已加载
            if (!this.data.previewThemes || this.data.previewThemes.length === 0) {
              this.loadThemeData();
            }
          }, 500);

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
    // 生成基于时间的问候语
    this.generateGreeting();

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
    this.themeManagerUnsubscribe = themeManager.onThemeChange(this.handleThemeChange.bind(this));

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
    // 生成基于时间的问候语，每次显示页面时都更新
    this.generateGreeting();

    if (this.data.isAuth && this.data.loginState === 'logged-in') {
      const checkInComponent = this.selectComponent('#checkIn');
      if (checkInComponent) {
        checkInComponent.checkTodayStatus();
      }

      // 确保openid存在再进行主题相关操作
      if (this.data.openid) {
        // 检查是否从主题页返回且主题已更改
        const themeChanged = wx.getStorageSync('themeChanged');
        if (themeChanged) {
          console.log('检测到主题变更，强制刷新主题数据');
          // 清除标记
          wx.removeStorageSync('themeChanged');

          // 强制刷新主题数据
          this.loadThemeData().then(() => {
            // 应用主题背景
            this.applyThemeBackground();
          });
        } else {
          // 常规刷新主题数据
          this.loadThemeData();
        }
      } else {
        console.log('onShow: openid为空，尝试重新获取');
        // 尝试重新获取openid
        this.getOpenId()
          .then(() => {
            if (this.data.openid) {
              this.loadThemeData();
            }
          })
          .catch(err => {
            console.error('重新获取openid失败:', err);
          });
      }
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
  onUnload: function () {
    // 在页面卸载时清除标记，防止后续误操作
    try {
      // 移除主题变更的监听
      const themeManagerUnsubscribe = this.themeManagerUnsubscribe;
      if (themeManagerUnsubscribe && typeof themeManagerUnsubscribe === 'function') {
        themeManagerUnsubscribe();
        this.themeManagerUnsubscribe = null;
      }

      // 可能导致问题的其他清理工作
      if (wx.getStorageSync('themeChanged')) {
        wx.removeStorageSync('themeChanged');
      }
    } catch (err) {
      console.error('页面卸载清理失败:', err);
    }
  },

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
    // 优先从本地缓存读取最新主题，确保在页面返回时显示最新主题
    const cachedTheme = wx.getStorageSync('currentTheme');
    if (cachedTheme) {
      // 优先使用处理后的URL，如果没有则使用原始图片路径
      const backgroundImage = cachedTheme.themeImageUrl || cachedTheme.themeImage || '';
      this.setData({
        themeBackground: backgroundImage,
      });
      return;
    }

    // 如果没有缓存，则从全局状态读取
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

  // 更新头像历史记录数组
  updateAvatarHistory(newAvatar) {
    // 获取当前用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
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

  goToChangelogPage() {
    wx.navigateTo({
      url: '/pages/changelog/index',
    });
  },

  /**
   * 加载用户主题数据
   */
  loadThemeData: async function () {
    if (!this.data.openid) {
      console.log('loadThemeData: openid为空，无法加载主题数据');
      return Promise.reject('openid为空');
    }

    console.log('开始加载主题数据, openid:', this.data.openid);
    wx.showLoading({ title: '加载中...' });

    try {
      // 获取用户可用的主题列表
      const themes = await themeManager.getUserAvailableThemes(this.data.openid);
      console.log('获取到主题数据:', themes);

      if (themes && themes.length > 0) {
        // 获取当前使用的主题（只用于标记，不改变排序）
        const currentTheme = themes.find(theme => theme.current) || themes[0];

        // 保持主题原始顺序，选择前两个主题作为预览
        const previewThemes = themes.slice(0, 2);
        console.log('预览主题:', previewThemes);

        this.setData({
          currentTheme,
          previewThemes,
        });

        wx.hideLoading();
        return Promise.resolve(themes);
      } else {
        console.warn('未获取到主题数据或主题列表为空');
        wx.hideLoading();
        return Promise.resolve([]);
      }
    } catch (error) {
      console.error('加载主题数据失败:', error);
      wx.hideLoading();
      return Promise.reject(error);
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
    if (!this.data.openid) {
      wx.showToast({
        title: '先登录喔，去个人中心看看吧~',
        icon: 'none',
        duration: 2000,
      });
      return;
    }

    wx.showLoading({ title: '正在解锁主题...', mask: true });

    try {
      // 调用主题管理器的解锁方法
      const result = await themeManager.unlockTheme(this.data.openid, theme.id);

      if (result.success) {
        // 先隐藏加载框
        wx.hideLoading();

        wx.showToast({
          title: '解锁成功',
          icon: 'success',
          duration: 2000,
        });

        // 解锁成功后自动切换到该主题
        await this.switchTheme(theme);
      } else {
        // 先显示错误消息，延迟隐藏loading
        wx.showToast({
          title: result.message || '解锁失败',
          icon: 'none',
          duration: 2500, // 延长显示时间
          mask: true, // 添加遮罩防止用户点击
        });

        // 延迟隐藏加载框，确保用户能看到消息
        setTimeout(() => {
          wx.hideLoading();
        }, 500);
      }
    } catch (error) {
      console.error('解锁主题失败:', error);

      // 处理错误，先显示消息
      wx.showToast({
        title: '解锁失败，请稍后重试',
        icon: 'none',
        duration: 2500,
        mask: true,
      });

      // 延迟隐藏加载框
      setTimeout(() => {
        wx.hideLoading();
      }, 500);
    }
  },

  /**
   * 生成基于时间的问候语
   */
  generateGreeting() {
    // 使用问候语工具函数获取基于时间的问候语
    const greeting = greetingUtils.getTimeBasedGreeting();
    this.setData({ greeting });
  },
});
