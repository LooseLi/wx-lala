Component({
  properties: {
    checkInData: {
      type: Object,
      value: null
    }
  },

  data: {
    isCheckedIn: false,
    continuousDays: 0,
    totalPoints: 0,
    loading: false,
    showMakeupDialog: false,
    selectedDate: null,
    checkedDates: []
  },

  lifetimes: {
    attached() {
      // 添加延迟，确保 openid 已经加载
      setTimeout(() => {
        const openid = wx.getStorageSync('openid')
        if (openid) {
          this.checkTodayStatus()
        }
      }, 1000) // 等待1秒再查询
    }
  },

  observers: {
    'checkInData': function (data) {
      if (data) {
        this.setData({
          isCheckedIn: true,
          continuousDays: data.continuousDays,
          totalPoints: data.rewards.points
        })
      }
    }
  },

  methods: {
    // 检查今日打卡状态
    async checkTodayStatus() {
      console.log('开始检查打卡状态')
      const openid = wx.getStorageSync('openid')
      if (!openid) {
        console.log('没有openid，不进行状态查询')
        return
      }

      wx.showLoading({
        title: '加载中...',
        mask: true
      })

      try {
        console.log('调用云函数查询打卡状态')
        const {
          result
        } = await wx.cloud.callFunction({
          name: 'getCheckInStatus'
        })

        console.log('打卡状态查询结果：', result)

        if (result.success) {
          this.setData({
            isCheckedIn: result.data.isCheckedIn,
            continuousDays: result.data.continuousDays,
            totalPoints: result.data.totalPoints
          })
        } else {
          throw new Error(result.error || '查询失败')
        }
      } catch (error) {
        console.error('获取打卡状态失败：', error)
        wx.showToast({
          title: '获取状态失败',
          icon: 'none'
        })
      } finally {
        wx.hideLoading()
      }
    },

    // 执行打卡
    // 执行打卡
    async handleCheckIn() {
      if (this.data.isCheckedIn || this.data.loading) return

      this.setData({
        loading: true
      })

      try {
        const res = await wx.cloud.callFunction({
          name: 'checkIn'
        })

        if (res.result.success) {
          const {
            continuousDays,
            rewards,
            checkedDates
          } = res.result.data

          // 显示打卡成功动画和提示
          wx.showToast({
            title: '打卡成功',
            icon: 'success'
          })

          // 如果有新徽章，显示徽章获得提示
          if (rewards.badges && rewards.badges.length > 0) {
            setTimeout(() => {
              wx.showModal({
                title: '🎉 恭喜获得新徽章',
                content: `获得徽章：${rewards.badges.join('、')}`,
                showCancel: false
              })
            }, 1500)
          }

          // 更新状态
          this.setData({
            isCheckedIn: true,
            continuousDays,
            totalPoints: this.data.totalPoints + rewards.points,
            checkedDates
          })

          // 触发父组件更新
          this.triggerEvent('checkInSuccess', res.result.data)
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('打卡失败：', error)
        wx.showToast({
          title: '打卡失败，请重试',
          icon: 'none'
        })
      } finally {
        this.setData({
          loading: false
        })
      }
    },

    // 显示补签弹窗
    showMakeupDialog() {
      this.setData({
        showMakeupDialog: true,
        selectedDate: null
      })
    },

    // 隐藏补签弹窗
    hideMakeupDialog() {
      this.setData({
        showMakeupDialog: false,
        selectedDate: null
      })
    },

    // 选择补签日期
    onDateSelect(e) {
      const { date } = e.detail
      console.log('e',date);
      this.setData({ selectedDate: date })
    },

    // 处理补签
    async handleMakeup() {
      if (!this.data.selectedDate || this.data.loading) return
      
      if (this.data.totalPoints < 30) {
        wx.showToast({
          title: '积分不足',
          icon: 'none'
        })
        return
      }

      this.setData({ loading: true })

      try {
        const res = await wx.cloud.callFunction({
          name: 'makeupCheckIn',
          data: {
            date: this.data.selectedDate
          }
        })

        if (res.result.success) {
          const {
            continuousDays,
            totalPoints,
            checkedDates
          } = res.result.data

          wx.showToast({
            title: '补签成功',
            icon: 'success'
          })

          // 更新状态
          this.setData({
            showMakeupDialog: false,
            continuousDays,
            totalPoints,
            checkedDates
          })

          // 触发父组件更新
          this.triggerEvent('checkInSuccess', res.result.data)
        } else {
          wx.showToast({
            title: res.result.message || '补签失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('补签失败：', error)
        wx.showToast({
          title: '补签失败，请重试',
          icon: 'none'
        })
      } finally {
        this.setData({ loading: false })
      }
    }
  }
})