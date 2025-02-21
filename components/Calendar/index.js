Component({
  properties: {
    checkedDates: {
      type: Array,
      value: []
    }
  },

  data: {
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    months: [],
    currentMonthIndex: 0,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  },

  lifetimes: {
    attached() {
      this.initCalendar()
    }
  },

  methods: {
    initCalendar() {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1

      // 生成当前月和上个月的数据
      const currentMonthData = this.generateMonthData(currentYear, currentMonth)
      
      // 计算上个月的年和月
      let prevYear = currentYear
      let prevMonth = currentMonth - 1
      if (prevMonth === 0) {
        prevYear--
        prevMonth = 12
      }
      const prevMonthData = this.generateMonthData(prevYear, prevMonth)

      this.setData({
        year: currentYear,
        month: currentMonth,
        months: [prevMonthData, currentMonthData],
        currentMonthIndex: 1  // 默认显示当前月
      })
    },



    generateMonthData(year, month) {
      console.log('Generating month data for:', year, month)
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0)
      const days = []
      
      const firstDayOfMonth = firstDay.getDay()
      const today = new Date()
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)
      
      // 添加上月末尾的空白日期
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push({
          day: '',
          isEmpty: true
        })
      }
      
      // 添加当月日期
      for (var i = 1; i <= lastDay.getDate(); i++) {
        const currentDate = new Date(year, month - 1, i)
        const dateStr = this.formatDate(currentDate)
        
        days.push({
          date: dateStr,
          day: i,
          isToday: this.isSameDay(currentDate, today),
          isChecked: this.properties.checkedDates.includes(dateStr),
          canMakeup: currentDate >= thirtyDaysAgo && currentDate < today && !this.isSameDay(currentDate, today) && !this.properties.checkedDates.includes(dateStr),
          isDisabled: currentDate < thirtyDaysAgo || currentDate > today,
          isSelected: false
        })
      }

      const monthData = {
        id: `${year}-${month}`,
        year,
        month,
        days,
        firstDayOfMonth
      }
      console.log('Generated month data:', monthData)
      return monthData
    },

    formatDate(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },

    isSameDay(date1, date2) {
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate()
    },

    selectDate(e) {
      const date = e.currentTarget.dataset.date
      const currentDate = new Date(date)
      const today = new Date()
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)

      if (currentDate >= thirtyDaysAgo && currentDate < today && !this.properties.checkedDates.includes(date)) {
        // 重置所有月份的选中状态
        const months = this.data.months.map(month => {
          const days = month.days.map(day => ({
            ...day,
            isSelected: day.date === date
          }))
          return { ...month, days }
        })
        
        // 更新所有月份数据
        this.setData({ months })
        
        // 触发事件
        this.triggerEvent('dateSelect', { date })
      }
    },

    onSwiperChange(e) {
      const current = e.detail.current
      this.setData({ currentMonthIndex: current })
      
      // 更新年月显示
      const monthData = this.data.months[current]
      if (monthData) {
        const date = new Date(monthData.days.find(day => !day.isEmpty)?.date || '')
        if (!isNaN(date.getTime())) {
          this.setData({
            year: date.getFullYear(),
            month: date.getMonth() + 1
          })
        }
      }
    },

    prevMonth() {
      // 如果已经在上个月，不需要切换
      if (this.data.currentMonthIndex === 0) return
      
      this.setData({
        currentMonthIndex: 0
      })
    },

    nextMonth() {
      // 如果已经在当前月，不需要切换
      if (this.data.currentMonthIndex === 1) return
      
      this.setData({
        currentMonthIndex: 1
      })
    }
  }
})
