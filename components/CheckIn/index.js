Component({
  properties: {
    checkInData: {
      type: Object,
      value: null,
    },
  },

  data: {
    isCheckedIn: false,
    continuousDays: 0,
    currentPoints: 0,
    loading: false,
    showMakeupDialog: false,
    selectedDate: null,
    checkedDates: [],
    makeupDates: [],
    currentStreak: {
      startDate: '',
      endDate: '',
    },
  },

  lifetimes: {
    attached() {
      // 添加延迟，确保 openid 已经加载
      setTimeout(() => {
        const openid = wx.getStorageSync('openid');
        if (openid) {
          this.checkTodayStatus();
        }
      }, 1000); // 等待1秒再查询
    },
  },

  observers: {
    checkInData: function (data) {
      if (data) {
        this.setData({
          isCheckedIn: true,
          continuousDays: data.continuousDays || 0,
          currentPoints: data.currentPoints || 0,
        });
      }
    },
  },

  methods: {
    /**
     * 格式化日期为 YYYY-MM-DD 字符串
     * @param {Date} date - 日期对象
     * @returns {string} - 格式化后的日期字符串
     */
    formatDate(date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    // 检查今日打卡状态
    async checkTodayStatus() {
      console.log('开始检查打卡状态');
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        console.log('没有openid，不进行状态查询');
        return;
      }

      wx.showLoading({
        title: '加载中...',
        mask: true,
      });

      try {
        // 获取当前本地日期信息
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate();
        const dateStr = this.formatDate(now);

        console.log('检查签到状态使用本地日期:', {
          year,
          month,
          day,
          dateStr,
          time: now.toLocaleTimeString(),
        });

        const localDate = {
          year,
          month,
          day,
          dateStr,
        };

        // 获取用户签到状态和积分，传递本地日期信息
        const { result } = await wx.cloud.callFunction({
          name: 'getCheckInStatus',
          data: {
            localDate,
          },
        });

        console.log('签到状态查询结果：', result);

        if (result.success) {
          this.setData({
            isCheckedIn: result.data.isCheckedIn,
            continuousDays: result.data.continuousDays,
            currentPoints: result.data.currentPoints,
          });
        } else {
          throw new Error(result.error || '查询失败');
        }
      } catch (error) {
        console.error('获取签到状态失败：', error);
        wx.showToast({
          title: '获取状态失败',
          icon: 'none',
        });
      } finally {
        wx.hideLoading();
      }
    },

    // 执行打卡
    async handleCheckIn() {
      if (this.data.isCheckedIn || this.data.loading) return;

      this.setData({
        loading: true,
      });

      try {
        // 获取当前本地日期信息
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate();
        const localDate = {
          year,
          month,
          day,
          dateStr: this.formatDate(now),
        };

        const res = await wx.cloud.callFunction({
          name: 'checkInV2',
          data: {
            localDate,
          },
        });

        if (res.result.success) {
          const { continuousDays, rewards } = res.result.data;

          // 显示打卡成功动画和提示
          wx.showToast({
            title: '签到成功啦~',
            icon: 'success',
          });

          // 更新状态
          this.setData({
            isCheckedIn: true,
            continuousDays,
            currentPoints: this.data.currentPoints + rewards.points,
          });

          // 触发父组件更新
          this.triggerEvent('checkInSuccess', {
            continuousDays,
            rewards,
          });

          // 刷新日历组件
          this.triggerEvent('refreshCalendar');
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none',
          });
        }
      } catch (error) {
        console.error('打卡失败：', error);
        wx.showToast({
          title: '签到失败，请重试喔～',
          icon: 'none',
        });
      } finally {
        this.setData({
          loading: false,
        });
      }
    },

    // 阻止弹窗背景滚动
    preventTouchMove() {
      return;
    },

    // 显示补签弹窗
    showMakeupDialog() {
      this.setData({
        showMakeupDialog: true,
        selectedDate: null,
      });
    },

    // 隐藏补签弹窗
    hideMakeupDialog() {
      this.setData({
        showMakeupDialog: false,
        selectedDate: null,
      });
    },

    // 选择补签日期
    onDateSelect(e) {
      const { date, isMakeup } = e.detail;
      console.log('选择日期：', date, '是否补签：', isMakeup);
      if (isMakeup) {
        this.setData({
          selectedDate: date,
        });
      }
    },

    // 处理补签
    async handleMakeup() {
      if (!this.data.selectedDate || this.data.loading) return;

      if (this.data.currentPoints < 30) {
        wx.showToast({
          title: '积分不足，补签需要30积分',
          icon: 'none',
        });
        return;
      }

      this.setData({
        loading: true,
      });

      try {
        // 获取当前本地日期信息
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate();
        const localDate = {
          year,
          month,
          day,
          dateStr: this.formatDate(now),
        };

        const res = await wx.cloud.callFunction({
          name: 'makeupCheckIn',
          data: {
            date: this.data.selectedDate,
            localDate,
          },
        });

        if (res.result.success) {
          const data = res.result.data || {};

          wx.showToast({
            title: '补签成功',
            icon: 'success',
          });

          // 更新状态
          // 补签固定扣除 30 积分
          const newPoints = this.data.currentPoints - 30;
          this.setData({
            showMakeupDialog: false,
            continuousDays: data.continuousDays || this.data.continuousDays,
            currentPoints: newPoints,
            checkedDates: data.checkedDates || [],
          });

          // 触发父组件更新，使用与 handleCheckIn 相同的数据格式
          // 注意：补签会扣除积分，所以积分变化应该是负值
          const pointsChange = -30; // 补签固定扣除 30 积分
          this.triggerEvent('checkInSuccess', {
            continuousDays: data.continuousDays || this.data.continuousDays,
            rewards: {
              points: pointsChange,
            },
          });

          // 刷新日历组件
          this.triggerEvent('refreshCalendar');
        } else {
          wx.showToast({
            title: res.result.message || '补签失败',
            icon: 'none',
          });
        }
      } catch (error) {
        console.error('补签失败：', error);
        wx.showToast({
          title: '补签失败，请重试',
          icon: 'none',
        });
      } finally {
        this.setData({
          loading: false,
        });
      }
    },
  },
});
