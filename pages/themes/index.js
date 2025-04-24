const db = wx.cloud.database();
const themes = db.collection('themes');
const userPoints = db.collection('userPoints');
const themeManager = require('../../utils/themeManager');

Page({
  data: {
    themeList: [],
    currentTheme: {},
    userPoints: 0,
    loading: true,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.getThemeList();
    this.getUserPoints();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.getThemeList();
    this.getUserPoints();
  },

  /**
   * 获取所有主题
   */
  async getThemeList() {
    try {
      this.setData({ loading: true });

      // 获取用户openid
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        wx.showToast({
          title: '请先登录',
          icon: 'none',
        });
        this.setData({ loading: false });
        return;
      }

      // 获取所有主题
      const themesRes = await themes.get();
      if (!themesRes || !themesRes.data) {
        this.setData({ loading: false });
        return;
      }

      // 获取用户信息（检查解锁状态）
      const userInfoRes = await db.collection('userInfo').where({ openid }).get();
      const userInfo = userInfoRes.data && userInfoRes.data.length > 0 ? userInfoRes.data[0] : null;

      // 获取当前使用的主题
      const app = getApp();
      const currentThemeId = app.globalData.currentTheme ? app.globalData.currentTheme.id : null;

      // 处理主题列表
      const themeList = themesRes.data.map(theme => {
        // 默认主题或价格为0的主题自动解锁
        let unlocked = theme.isDefault || theme.price === 0;

        // 检查用户是否已解锁该主题
        if (!unlocked && userInfo && userInfo.unlockedThemes) {
          unlocked = userInfo.unlockedThemes.some(item => item.themeId === theme.id);
        }

        return {
          ...theme,
          unlocked,
          current: theme.id === currentThemeId,
        };
      });

      // 不再进行排序，保持原始顺序

      this.setData({
        themeList,
        currentTheme: themeList.find(theme => theme.current) || {},
        loading: false,
      });
    } catch (error) {
      console.error('获取主题列表失败:', error);
      this.setData({ loading: false });

      wx.showToast({
        title: '获取主题列表失败',
        icon: 'none',
      });
    }
  },

  /**
   * 获取用户积分
   */
  async getUserPoints() {
    try {
      // 使用themeManager获取用户积分
      const result = await themeManager.getUserPoints();
      if (result.success) {
        this.setData({
          userPoints: result.currentPoints || 0,
        });
      }
    } catch (error) {
      console.error('获取用户积分失败:', error);
    }
  },

  /**
   * 处理主题点击
   */
  handleThemeClick(e) {
    const themeId = e.currentTarget.dataset.id;
    const theme = this.data.themeList.find(item => item.id === themeId);

    if (!theme) return;

    // 如果是当前使用的主题，不做任何操作
    if (theme.current) {
      return;
    }

    // 免费主题或已解锁的付费主题，直接切换
    if (theme.price === 0 || theme.unlocked) {
      this.switchTheme(theme);
    } else {
      // 未解锁的付费主题，显示解锁确认对话框
      this.showUnlockConfirm(theme);
    }
  },

  /**
   * 切换主题
   */
  async switchTheme(theme) {
    wx.showLoading({ title: '正在切换主题...' });

    try {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        wx.hideLoading();
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      // 调用themeManager的切换主题方法
      const result = await themeManager.switchTheme(openid, theme.id);

      if (result.success) {
        // 更新当前页面状态，只更新current标记而不改变顺序
        const themeList = this.data.themeList.map(item => ({
          ...item,
          current: item.id === theme.id,
        }));

        this.setData({
          themeList,
          currentTheme: theme,
        });

        // 添加标记，表示主题已经更改，这样我的页面返回时可以识别并刷新
        wx.setStorageSync('themeChanged', true);

        wx.showToast({ title: '主题切换成功' });
      } else {
        wx.showToast({
          title: result.message || '切换主题失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('切换主题失败:', error);
      wx.showToast({ title: '切换主题失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 显示解锁确认对话框
   */
  showUnlockConfirm(theme) {
    // 使用themeManager获取用户积分
    themeManager.getUserPoints().then(result => {
      if (!result.success) {
        wx.showToast({
          title: '获取积分失败',
          icon: 'none',
        });
        return;
      }

      const userPoints = result.currentPoints;
      this.setData({ userPoints }); // 更新最新积分

      // 检查积分是否足够
      if (userPoints < theme.price) {
        wx.showToast({
          title: '积分不足，加油签到喔~',
          icon: 'none',
        });
        return;
      }

      wx.showModal({
        title: '解锁主题',
        content: `确定使用 ${theme.price} 积分解锁该主题吗？`,
        success: res => {
          if (res.confirm) {
            this.unlockTheme(theme);
          }
        },
      });
    });
  },

  /**
   * 解锁主题
   */
  async unlockTheme(theme) {
    wx.showLoading({ title: '正在解锁主题...' });

    try {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        wx.hideLoading();
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      // 调用themeManager的解锁方法
      const result = await themeManager.unlockTheme(openid, theme.id);

      if (result.success) {
        // 更新用户积分
        const newPoints = result.currentPoints;

        // 更新主题列表，只更新状态标记而不改变顺序
        const themeList = this.data.themeList.map(item => {
          if (item.id === theme.id) {
            return {
              ...item,
              unlocked: true,
              current: true, // 解锁后自动使用
            };
          }
          return {
            ...item,
            current: false,
          };
        });

        this.setData({
          themeList,
          currentTheme: theme,
          userPoints: newPoints,
        });

        // 添加标记，表示主题已经更改，这样我的页面返回时可以识别并刷新
        wx.setStorageSync('themeChanged', true);

        // 确保主题已经在数据库中更新后再切换
        await themeManager.switchTheme(openid, theme.id);

        wx.showToast({ title: '解锁并切换主题成功' });
      } else {
        wx.showToast({
          title: result.message || '解锁主题失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('解锁主题失败:', error);
      wx.showToast({ title: '解锁主题失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
});
