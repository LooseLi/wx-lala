// 获取云数据库引用
const db = wx.cloud.database();
const holidays = db.collection('holidays');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentYear: new Date().getFullYear(),
    nextYear: new Date().getFullYear() + 1,
    activeYear: new Date().getFullYear(), // 当前选中的年份
    currentMonth: new Date().getMonth(), // 当前选中的月份（0-11）
    currentMonthName: '', // 当前月份名称
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarRows: [], // 日历网格数据
    holidayData: [], // 节假日数据
    selectedDate: null, // 选中的日期
    selectedDateInfo: null, // 选中日期的详细信息
    isLoading: true,
  },

  /**
   * 切换年份
   */
  switchYear(e) {
    const year = parseInt(e.currentTarget.dataset.year);
    this.setData({
      activeYear: year,
    });
    this.generateCalendar();
  },

  /**
   * 上个月
   */
  prevMonth() {
    let { currentMonth, activeYear } = this.data;
    currentMonth--;
    
    // 如果月份小于0，则切换到上一年的12月
    if (currentMonth < 0) {
      currentMonth = 11;
      // 只允许在当前年和下一年之间切换
      if (activeYear === this.data.nextYear) {
        activeYear = this.data.currentYear;
      }
    }
    
    this.setData({
      currentMonth,
      activeYear,
    });
    
    this.generateCalendar();
  },

  /**
   * 下个月
   */
  nextMonth() {
    let { currentMonth, activeYear } = this.data;
    currentMonth++;
    
    // 如果月份大于11，则切换到下一年的1月
    if (currentMonth > 11) {
      currentMonth = 0;
      // 只允许在当前年和下一年之间切换
      if (activeYear === this.data.currentYear) {
        activeYear = this.data.nextYear;
      }
    }
    
    this.setData({
      currentMonth,
      activeYear,
    });
    
    this.generateCalendar();
  },

  /**
   * 选择日期
   */
  selectDate(e) {
    const dateString = e.currentTarget.dataset.date;
    const date = new Date(dateString);
    
    // 更新选中的日期
    this.setData({
      selectedDate: dateString,
    });
    
    // 更新日历中选中状态
    this.updateSelectedDateInCalendar(dateString);
    
    // 获取选中日期的详细信息
    this.getSelectedDateInfo(date);
  },

  /**
   * 更新日历中选中日期的状态
   */
  updateSelectedDateInCalendar(selectedDate) {
    const { calendarRows } = this.data;
    
    // 遍历日历网格，更新选中状态
    const updatedRows = calendarRows.map(row => {
      return row.map(cell => {
        return {
          ...cell,
          isSelected: cell.date === selectedDate,
        };
      });
    });
    
    this.setData({
      calendarRows: updatedRows,
    });
  },

  /**
   * 获取选中日期的详细信息
   */
  getSelectedDateInfo(date) {
    const { holidayData } = this.data;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = this.data.weekdays[date.getDay()];
    
    // 查找该日期是否为节假日或调休日
    const holidayInfo = holidayData.find(item => {
      const itemDate = new Date(item.date);
      return itemDate.getFullYear() === year && 
             itemDate.getMonth() + 1 === month && 
             itemDate.getDate() === day;
    });
    
    // 构建选中日期信息
    const selectedDateInfo = {
      year,
      month,
      day,
      weekday: `周${weekday}`,
      isHoliday: holidayInfo ? holidayInfo.type === 'holiday' : false,
      isWorkday: holidayInfo ? holidayInfo.type === 'workday' : false,
      name: holidayInfo ? holidayInfo.name : '',
    };
    
    this.setData({
      selectedDateInfo,
    });
  },

  /**
   * 生成日历数据
   */
  generateCalendar() {
    const { activeYear, currentMonth, holidayData } = this.data;
    
    // 获取当前月的第一天
    const firstDayOfMonth = new Date(activeYear, currentMonth, 1);
    // 获取当前月的最后一天
    const lastDayOfMonth = new Date(activeYear, currentMonth + 1, 0);
    
    // 获取当前月第一天是星期几（0-6）
    const firstDayWeekday = firstDayOfMonth.getDay();
    // 获取当前月的总天数
    const daysInMonth = lastDayOfMonth.getDate();
    
    // 获取上个月的最后几天（用于填充日历第一行）
    const prevMonthLastDay = new Date(activeYear, currentMonth, 0).getDate();
    
    // 设置月份名称
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const currentMonthName = monthNames[currentMonth];
    
    // 获取今天的日期信息
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === activeYear && today.getMonth() === currentMonth;
    
    // 构建日历网格（6行7列）
    const calendarRows = [];
    let dayCounter = 1;
    let nextMonthDay = 1;
    
    // 遍历6行
    for (let row = 0; row < 6; row++) {
      const weekRow = [];
      
      // 遍历7列（周日到周六）
      for (let col = 0; col < 7; col++) {
        // 第一行，且还没到当前月第一天
        if (row === 0 && col < firstDayWeekday) {
          // 填充上个月的日期
          const prevMonthDay = prevMonthLastDay - (firstDayWeekday - col - 1);
          const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const prevYear = currentMonth === 0 ? activeYear - 1 : activeYear;
          const dateString = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevMonthDay).padStart(2, '0')}`;
          
          weekRow.push({
            day: prevMonthDay,
            currentMonth: false,
            date: dateString,
            isToday: false,
            isSelected: this.data.selectedDate === dateString,
            isHoliday: this.isHoliday(prevYear, prevMonth + 1, prevMonthDay, holidayData, 'holiday'),
            isWorkday: this.isHoliday(prevYear, prevMonth + 1, prevMonthDay, holidayData, 'workday'),
          });
        }
        // 当前月的日期
        else if (dayCounter <= daysInMonth) {
          const dateString = `${activeYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
          
          weekRow.push({
            day: dayCounter,
            currentMonth: true,
            date: dateString,
            isToday: isCurrentMonth && today.getDate() === dayCounter,
            isSelected: this.data.selectedDate === dateString,
            isHoliday: this.isHoliday(activeYear, currentMonth + 1, dayCounter, holidayData, 'holiday'),
            isWorkday: this.isHoliday(activeYear, currentMonth + 1, dayCounter, holidayData, 'workday'),
          });
          
          dayCounter++;
        }
        // 下个月的日期
        else {
          const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
          const nextYear = currentMonth === 11 ? activeYear + 1 : activeYear;
          const dateString = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`;
          
          weekRow.push({
            day: nextMonthDay,
            currentMonth: false,
            date: dateString,
            isToday: false,
            isSelected: this.data.selectedDate === dateString,
            isHoliday: this.isHoliday(nextYear, nextMonth + 1, nextMonthDay, holidayData, 'holiday'),
            isWorkday: this.isHoliday(nextYear, nextMonth + 1, nextMonthDay, holidayData, 'workday'),
          });
          
          nextMonthDay++;
        }
      }
      
      calendarRows.push(weekRow);
      
      // 如果已经填充完当前月的所有日期，且已经有至少4行，则可以提前结束
      if (dayCounter > daysInMonth && row >= 3) {
        // 检查这一行是否全部是下个月的日期
        const allNextMonth = weekRow.every(cell => !cell.currentMonth);
        if (allNextMonth) {
          break;
        }
      }
    }
    
    this.setData({
      calendarRows,
      currentMonthName,
    });
    
    // 如果有选中的日期，更新选中状态
    if (this.data.selectedDate) {
      this.updateSelectedDateInCalendar(this.data.selectedDate);
    }
  },

  /**
   * 判断日期是否为节假日或调休日
   */
  isHoliday(year, month, day, holidayData, type) {
    return holidayData.some(item => {
      const date = new Date(item.date);
      return date.getFullYear() === year && 
             date.getMonth() + 1 === month && 
             date.getDate() === day && 
             item.type === type;
    });
  },

  /**
   * 获取节假日数据
   */
  async fetchHolidayData() {
    wx.showLoading({
      title: '加载中...',
    });

    try {
      // 获取当前年份和下一年的节假日数据
      const res = await holidays
        .where({
          year: wx.cloud.database().command.in([this.data.currentYear, this.data.nextYear]),
        })
        .orderBy('date', 'asc')
        .get();

      // 处理数据，添加星期几信息
      const holidayData = this.processHolidayData(res.data);

      this.setData({
        holidayData,
        isLoading: false,
      });
      
      // 生成日历
      this.generateCalendar();
      
      // 默认选中今天
      const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      this.setData({
        selectedDate: todayString,
      });
      this.updateSelectedDateInCalendar(todayString);
      this.getSelectedDateInfo(today);
      
    } catch (error) {
      console.error('获取节假日数据失败', error);
      wx.showToast({
        title: '获取数据失败',
        icon: 'none',
      });
      
      // 即使获取数据失败，也生成日历
      this.generateCalendar();
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 处理节假日数据，添加星期几信息
   */
  processHolidayData(data) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    return data.map(item => {
      // 创建日期对象
      const date = new Date(item.date);
      // 获取星期几
      const weekday = weekdays[date.getDay()];
      // 获取月和日
      const month = date.getMonth() + 1;
      const day = date.getDate();

      return {
        ...item,
        weekday,
        month,
        day,
      };
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.fetchHolidayData();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {},

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
  onPullDownRefresh: function () {
    this.fetchHolidayData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '节假日日历 - 能放几天假鸭',
      path: '/pages/index/components/holidays/index',
    };
  },
});
