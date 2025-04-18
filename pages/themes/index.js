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

      // 排序：当前使用的主题 > 已解锁的主题 > 未解锁的主题
      themeList.sort((a, b) => {
        if (a.current) return -1;
        if (b.current) return 1;
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        return (a.index || 0) - (b.index || 0);
      });

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
      const openid = wx.getStorageSync('openid');
      if (!openid) return;

      const pointsRes = await userPoints.where({ userId: openid }).get();
      if (pointsRes.data && pointsRes.data.length > 0) {
        const points = pointsRes.data[0].currentPoints || 0;
        this.setData({ userPoints: points });
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

      // 在实际项目中，这里应该调用themeManager.switchTheme方法
      // 这里使用模拟实现
      await new Promise(resolve => setTimeout(resolve, 500));

      // 更新全局主题
      const app = getApp();
      app.globalData.currentTheme = theme;

      // 更新当前页面状态
      const themeList = this.data.themeList.map(item => ({
        ...item,
        current: item.id === theme.id,
      }));

      this.setData({
        themeList,
        currentTheme: theme,
      });

      wx.hideLoading();
      wx.showToast({ title: '主题切换成功' });
    } catch (error) {
      console.error('切换主题失败:', error);
      wx.hideLoading();
      wx.showToast({ title: '切换主题失败', icon: 'none' });
    }
  },

  /**
   * 显示解锁确认对话框
   */
  showUnlockConfirm(theme) {
    // 检查积分是否足够
    if (this.data.userPoints < theme.price) {
      wx.showToast({
        title: '积分不足，无法解锁该主题',
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

      // 在实际项目中，这里应该调用云函数或themeManager.unlockTheme方法
      // 这里使用模拟实现
      await new Promise(resolve => setTimeout(resolve, 500));

      // 更新用户积分（模拟）
      const newPoints = this.data.userPoints - theme.price;

      // 更新主题列表
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

      // 更新全局主题
      const app = getApp();
      app.globalData.currentTheme = theme;

      this.setData({
        themeList,
        currentTheme: theme,
        userPoints: newPoints,
      });

      wx.hideLoading();
      wx.showToast({ title: '解锁并切换主题成功' });
    } catch (error) {
      console.error('解锁主题失败:', error);
      wx.hideLoading();
      wx.showToast({ title: '解锁主题失败', icon: 'none' });
    }
  },
});
