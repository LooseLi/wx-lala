const DEFAULT_AVATAR = '/static/images/default-avatar.jpg';

function buildLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate();
  const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
  return {
    year,
    month,
    day,
    dateStr,
  };
}

Page({
  data: {
    avatar: DEFAULT_AVATAR,
    currentPoints: 0,
    continuousDays: 0,
    loading: true,
    loadError: false,
  },

  onShow() {
    this.applyUserFromStorage();
    this.fetchStatus();
  },

  onPullDownRefresh() {
    this.fetchStatus().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  applyUserFromStorage() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.avatar) {
      this.setData({
        avatar: userInfo.avatar,
      });
    } else {
      this.setData({
        avatar: DEFAULT_AVATAR,
      });
    }
  },

  async fetchStatus() {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      this.setData({
        loading: false,
        currentPoints: 0,
        continuousDays: 0,
        loadError: false,
      });
      return;
    }

    this.setData({ loading: true, loadError: false });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getCheckInStatus',
        data: {
          localDate: buildLocalDate(),
        },
      });

      if (result && result.success && result.data) {
        this.setData({
          currentPoints: result.data.currentPoints || 0,
          continuousDays: result.data.continuousDays || 0,
          loadError: false,
        });
      } else {
        this.setData({ loadError: true });
      }
    } catch (e) {
      console.error('game-hall getCheckInStatus', e);
      this.setData({ loadError: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  go2048() {
    wx.navigateTo({
      url: '/packageGames/pages/game-2048/index',
    });
  },

  goShop() {
    wx.navigateTo({
      url: '/packageGames/pages/points-mall/index',
    });
  },

  onComingSoon() {
    wx.showToast({
      title: '即将开放，敬请期待~',
      icon: 'none',
    });
  },
});
