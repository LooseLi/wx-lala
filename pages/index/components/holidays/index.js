// 获取云数据库引用
const db = wx.cloud.database();
const holidays = db.collection('holidays');

// 引入农历转换库
const solarlunar = require('solarlunar');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentYear: new Date().getFullYear(),
    nextYear: new Date().getFullYear() + 1,
    activeYear: new Date().getFullYear(), // 当前选中的年份
    currentMonth: new Date().getMonth(), // 当前选中的月份（0-11）
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    months: [], // 三个月的日历数据（上个月、当前月、下个月）
    currentIndex: 1, // 当前显示的是中间月份
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
   * 处理滑动切换事件
   */
  handleSwiperChange(e) {
    const lastIndex = this.data.currentIndex;
    const currentIndex = e.detail.current;

    // 判断滑动方向
    if ((lastIndex === 0 && currentIndex === 2) || (lastIndex === 2 && currentIndex === 0)) {
      // 不处理循环滑动的特殊情况
      return;
    } else if (currentIndex > lastIndex) {
      // 向左滑动（显示下个月）
      this.updateCalendarToNextMonth();
    } else if (currentIndex < lastIndex) {
      // 向右滑动（显示上个月）
      this.updateCalendarToPrevMonth();
    }
  },

  /**
   * 更新日历到上个月
   */
  updateCalendarToPrevMonth() {
    let { currentMonth, activeYear } = this.data;

    // 计算上个月的年和月
    currentMonth--;
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
      currentIndex: 1, // 始终将当前视图重置为中间项
    });

    // 重新生成三个月的日历数据
    this.generateThreeMonths();
  },

  /**
   * 更新日历到下个月
   */
  updateCalendarToNextMonth() {
    let { currentMonth, activeYear } = this.data;

    // 计算下个月的年和月
    currentMonth++;
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
      currentIndex: 1, // 始终将当前视图重置为中间项
    });

    // 重新生成三个月的日历数据
    this.generateThreeMonths();
  },

  /**
   * 上个月（按钮点击）
   */
  prevMonth() {
    this.updateCalendarToPrevMonth();
  },

  /**
   * 下个月（按钮点击）
   */
  nextMonth() {
    this.updateCalendarToNextMonth();
  },

  /**
   * 选择日期
   */
  selectDate(e) {
    const dateString = e.currentTarget.dataset.date;
    const monthIndex = e.currentTarget.dataset.monthIndex;
    const date = new Date(dateString);

    // 检查是否需要切换月份
    if (monthIndex !== undefined) {
      const selectedMonth = new Date(dateString).getMonth();
      const currentMonth =
        this.data.activeYear === new Date(dateString).getFullYear() ? this.data.currentMonth : null;

      // 如果选中的是上个月或下个月的日期，则切换到相应的月份
      if (currentMonth !== null && selectedMonth !== currentMonth) {
        const selectedYear = new Date(dateString).getFullYear();
        this.setData({
          activeYear: selectedYear,
          currentMonth: selectedMonth,
        });

        // 重新生成日历
        this.generateThreeMonths();
      }
    }

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
    const { months } = this.data;

    if (!months || months.length === 0) return;

    // 遍历所有月份的日历网格，更新选中状态
    const updatedMonths = months.map(month => {
      const updatedRows = month.rows.map(row => {
        return row.map(cell => {
          return {
            ...cell,
            isSelected: cell.date === selectedDate,
          };
        });
      });

      return {
        ...month,
        rows: updatedRows,
      };
    });

    this.setData({
      months: updatedMonths,
    });
  },

  /**
   * 获取选中日期的详细信息
   */
  getSelectedDateInfo(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = this.data.weekdays[date.getDay()];

    // 格式化日期字符串
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 从日期映射中获取假期信息
    const { holidayDateMap } = this.data;
    const dateInfo = holidayDateMap ? holidayDateMap[dateString] : null;
    
    // 获取农历信息
    const lunarInfo = solarlunar.solar2lunar(year, month, day);

    // 构建选中日期信息
    const selectedDateInfo = {
      year,
      month,
      day,
      weekday: `周${weekday}`,
      isHoliday: dateInfo ? dateInfo.type === 'holiday' : false,
      isWorkday: dateInfo ? dateInfo.type === 'workday' : false,
      holidayName: dateInfo ? dateInfo.name : '',
      // 添加农历信息
      lunar: {
        day: lunarInfo.IDayCn,
        month: lunarInfo.IMonthCn,
        term: lunarInfo.Term || '',
        festival: lunarInfo.festival || '',
        isLeap: lunarInfo.isLeap
      }
    };

    this.setData({
      selectedDateInfo,
    });
  },

  /**
   * 生成日历数据
   */
  /**
   * 生成三个月的日历数据
   */
  generateThreeMonths() {
    const { activeYear, currentMonth, holidayDateMap } = this.data;
    const months = [];

    // 计算上一个月
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? activeYear - 1 : activeYear;

    // 计算下一个月
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? activeYear + 1 : activeYear;

    // 设置月份名称
    const monthNames = [
      '一月',
      '二月',
      '三月',
      '四月',
      '五月',
      '六月',
      '七月',
      '八月',
      '九月',
      '十月',
      '十一月',
      '十二月',
    ];

    // 生成上个月的日历
    months.push({
      id: `${prevYear}-${prevMonth}`,
      year: prevYear,
      month: prevMonth,
      monthName: monthNames[prevMonth],
      rows: this.generateCalendarForMonth(prevYear, prevMonth, holidayDateMap),
    });

    // 生成当前月的日历
    months.push({
      id: `${activeYear}-${currentMonth}`,
      year: activeYear,
      month: currentMonth,
      monthName: monthNames[currentMonth],
      rows: this.generateCalendarForMonth(activeYear, currentMonth, holidayDateMap),
    });

    // 生成下个月的日历
    months.push({
      id: `${nextYear}-${nextMonth}`,
      year: nextYear,
      month: nextMonth,
      monthName: monthNames[nextMonth],
      rows: this.generateCalendarForMonth(nextYear, nextMonth, holidayDateMap),
    });

    this.setData({ months });

    // 如果有选中的日期，更新选中状态
    if (this.data.selectedDate) {
      this.updateSelectedDateInCalendar(this.data.selectedDate);
    }
  },

  /**
   * 获取农历显示内容
   * @param {Object} lunarInfo - 农历信息对象
   * @returns {String} 显示内容
   */
  getLunarDisplay(lunarInfo) {
    // 优先级：节气 > 农历节日 > 公历节日 > 农历日期
    if (lunarInfo.Term) {
      return lunarInfo.Term;
    } else if (lunarInfo.festival) {
      return lunarInfo.festival;
    } else if (lunarInfo.solarFestival) {
      return lunarInfo.solarFestival;
    } else {
      // 农历月初显示月份
      if (lunarInfo.IDayCn === '初一') {
        return lunarInfo.IMonthCn;
      } else {
        return lunarInfo.IDayCn;
      }
    }
  },

  /**
   * 生成指定年月的日历数据
   */
  generateCalendarForMonth(year, month, holidayDateMap) {
    // 获取当前月的第一天
    const firstDayOfMonth = new Date(year, month, 1);
    // 获取当前月的最后一天
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // 获取当前月第一天是星期几（0-6）
    const firstDayWeekday = firstDayOfMonth.getDay();
    // 获取当前月的总天数
    const daysInMonth = lastDayOfMonth.getDate();

    // 获取上个月的最后几天（用于填充日历第一行）
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // 获取今天的日期信息
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

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
          const prevMonth = month === 0 ? 11 : month - 1;
          const prevYear = month === 0 ? year - 1 : year;
          const dateString = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevMonthDay).padStart(2, '0')}`;

          // 获取日期类型信息
          const dateInfo = holidayDateMap ? holidayDateMap[dateString] : null;
          
          // 获取农历信息
          const lunarInfo = solarlunar.solar2lunar(prevYear, prevMonth + 1, prevMonthDay);
          const lunarDisplay = this.getLunarDisplay(lunarInfo);

          weekRow.push({
            day: prevMonthDay,
            currentMonth: false,
            date: dateString,
            isToday: false,
            isSelected: this.data.selectedDate === dateString,
            isHoliday: dateInfo && dateInfo.type === 'holiday',
            isWorkday: dateInfo && dateInfo.type === 'workday',
            isFirstDay: dateInfo && dateInfo.isFirstDay,
            isMiddleDay: dateInfo && dateInfo.isMiddleDay,
            isLastDay: dateInfo && dateInfo.isLastDay,
            holidayName: dateInfo ? dateInfo.name : '',
            holidayId: dateInfo ? dateInfo.holidayId : '',
            // 添加农历信息
            lunar: {
              day: lunarInfo.IDayCn,
              month: lunarInfo.IMonthCn,
              term: lunarInfo.Term || '',
              festival: lunarInfo.festival || '',
              display: lunarDisplay
            }
          });
        }
        // 当前月的日期
        else if (dayCounter <= daysInMonth) {
          const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;

          // 获取日期类型信息
          const dateInfo = holidayDateMap ? holidayDateMap[dateString] : null;
          
          // 获取农历信息
          const lunarInfo = solarlunar.solar2lunar(year, month + 1, dayCounter);
          const lunarDisplay = this.getLunarDisplay(lunarInfo);

          weekRow.push({
            day: dayCounter,
            currentMonth: true,
            date: dateString,
            isToday: isCurrentMonth && today.getDate() === dayCounter,
            isSelected: this.data.selectedDate === dateString,
            isHoliday: dateInfo && dateInfo.type === 'holiday',
            isWorkday: dateInfo && dateInfo.type === 'workday',
            isFirstDay: dateInfo && dateInfo.isFirstDay,
            isMiddleDay: dateInfo && dateInfo.isMiddleDay,
            isLastDay: dateInfo && dateInfo.isLastDay,
            holidayName: dateInfo ? dateInfo.name : '',
            holidayId: dateInfo ? dateInfo.holidayId : '',
            // 添加农历信息
            lunar: {
              day: lunarInfo.IDayCn,
              month: lunarInfo.IMonthCn,
              term: lunarInfo.Term || '',
              festival: lunarInfo.festival || '',
              display: lunarDisplay
            }
          });

          dayCounter++;
        }
        // 下个月的日期
        else {
          const nextMonth = month === 11 ? 0 : month + 1;
          const nextYear = month === 11 ? year + 1 : year;
          const dateString = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`;

          // 获取日期类型信息
          const dateInfo = holidayDateMap ? holidayDateMap[dateString] : null;
          
          // 获取农历信息
          const lunarInfo = solarlunar.solar2lunar(nextYear, nextMonth + 1, nextMonthDay);
          const lunarDisplay = this.getLunarDisplay(lunarInfo);

          weekRow.push({
            day: nextMonthDay,
            currentMonth: false,
            date: dateString,
            isToday: false,
            isSelected: this.data.selectedDate === dateString,
            isHoliday: dateInfo && dateInfo.type === 'holiday',
            isWorkday: dateInfo && dateInfo.type === 'workday',
            isFirstDay: dateInfo && dateInfo.isFirstDay,
            isMiddleDay: dateInfo && dateInfo.isMiddleDay,
            isLastDay: dateInfo && dateInfo.isLastDay,
            holidayName: dateInfo ? dateInfo.name : '',
            holidayId: dateInfo ? dateInfo.holidayId : '',
            // 添加农历信息
            lunar: {
              day: lunarInfo.IDayCn,
              month: lunarInfo.IMonthCn,
              term: lunarInfo.Term || '',
              festival: lunarInfo.festival || '',
              display: lunarDisplay
            }
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

    return calendarRows;
  },

  /**
   * 生成日历数据（兼容原有代码）
   */
  generateCalendar() {
    this.generateThreeMonths();
  },

  /**
   * 展开假期日期范围
   */
  expandHolidayDates(holidays) {
    const dateMap = {};

    holidays.forEach(holiday => {
      // 处理假期日期
      const start = new Date(holiday.startDate);
      const end = new Date(holiday.endDate);
      let current = new Date(start);

      // 计算连续假期的总天数
      const totalDays = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
      let dayCounter = 0;

      // 展开假期日期范围
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        dayCounter++;

        dateMap[dateStr] = {
          type: 'holiday',
          name: holiday.name,
          isFirstDay: dayCounter === 1,
          isMiddleDay: dayCounter > 1 && dayCounter < totalDays,
          isLastDay: dayCounter === totalDays,
          holidayId: holiday._id || holiday.name,
        };

        // 移动到下一天
        const nextDate = new Date(current);
        nextDate.setDate(nextDate.getDate() + 1);
        current = nextDate;
      }

      // 处理调休工作日
      if (holiday.workdays && holiday.workdays.length) {
        holiday.workdays.forEach(workday => {
          dateMap[workday] = {
            type: 'workday',
            name: `${holiday.name}调休`,
            isFirstDay: false,
            isMiddleDay: false,
            isLastDay: false,
            holidayId: holiday._id || holiday.name,
          };
        });
      }
    });

    return dateMap;
  },

  /**
   * 判断日期是否为节假日或调休日
   */
  isHoliday(year, month, day, holidayData, type) {
    return holidayData.some(item => {
      const date = new Date(item.date);
      return (
        date.getFullYear() === year &&
        date.getMonth() + 1 === month &&
        date.getDate() === day &&
        item.type === type
      );
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
        .get();

      console.log('获取到的假期数据:', res.data);

      // 展开假期日期范围
      const holidayDateMap = this.expandHolidayDates(res.data);

      this.setData({
        holidayData: res.data,
        holidayDateMap,
        isLoading: false,
      });

      // 生成三个月的日历数据
      this.generateThreeMonths();

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
