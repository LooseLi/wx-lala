// 获取云数据库引用
const db = wx.cloud.database();
const holidays = db.collection('holidays');

// 引入农历转换库
const solarlunar = require('../../../../miniprogram_npm/solarlunar/index');

// 自定义节日数据
const customFestivals = [
  {
    name: '小拉花',
    date: '9-1',
    tips: '生日快乐鸭🎂',
    isLunar: false,
  },
  {
    name: '小拉花',
    date: '七月-三十',
    tips: '农历生日快乐鸭~',
    isLunar: true,
  },
  {
    name: '母亲节',
    date: '5-11',
    tips: '',
    isLunar: false,
  },
  {
    name: '父亲节',
    date: '6-15',
    tips: '',
    isLunar: false,
  },
  {
    name: '元旦',
    date: '1-1',
    tips: '新的一年啦~',
    isLunar: false,
  },
  {
    name: '腊八节',
    date: '腊月-初八',
    tips: '尝尝腊八粥吧~',
    isLunar: true,
  },
  {
    name: '除夕',
    date: '腊月-廿九',
    tips: '吃年夜饭啦~',
    isLunar: true,
  },
  {
    name: '春节',
    date: '正月-初一',
    tips: '新年快乐~',
    isLunar: true,
  },
  {
    name: '情人节',
    date: '2-14',
    tips: '情人节不快乐',
    isLunar: false,
  },
  {
    name: '元宵节',
    date: '正月-十五',
    tips: '吃元宵啦~',
    isLunar: true,
  },
  {
    name: '妇女节',
    date: '3-8',
    tips: '女神节快乐~',
    isLunar: false,
  },
  {
    name: '劳动节',
    date: '5-1',
    tips: '牛马专属',
    isLunar: false,
  },
  {
    name: '端午节',
    date: '五月-初五',
    tips: '吃个粽子吧~',
    isLunar: true,
  },
  {
    name: '中秋节',
    date: '八月-十五',
    tips: '吃个月饼吧~',
    isLunar: true,
  },
  {
    name: '国庆节',
    date: '10-1',
    tips: '快乐假期！happy',
    isLunar: false,
  },
  {
    name: '七夕',
    date: '七月-初七',
    tips: '想你😔',
    isLunar: true,
  },
  {
    name: '重阳节',
    date: '九月-初九',
    tips: '给长辈打个电话吧',
    isLunar: true,
  },
  {
    name: '万圣夜',
    date: '10-31',
    tips: '捣蛋👻',
    isLunar: false,
  },
  {
    name: '万圣节',
    date: '11-1',
    tips: '',
    isLunar: false,
  },
  {
    name: '平安夜',
    date: '12-24',
    tips: '平安夜啦🍎',
    isLunar: false,
  },
  {
    name: '圣诞节',
    date: '12-25',
    tips: '圣诞节快乐🎄',
    isLunar: false,
  },
];

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentYear: new Date().getFullYear(),
    nextYear: new Date().getFullYear() + 1,
    activeYear: new Date().getFullYear(), // 当前选中的年份
    currentMonth: new Date().getMonth(), // 当前选中的月份（0-11）
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    months: [], // 三个月的日历数据（上个月、当前月、下个月）
    currentIndex: 1, // 当前显示的是中间月份
    holidayData: [], // 节假日数据
    selectedDate: null, // 选中的日期
    selectedDateInfo: null, // 选中日期的详细信息
    isLoading: true,
    isCurrentMonthActive: true, // 是否当前显示的是今天所在的月份
  },

  /**
   * 切换年份
   */
  switchYear(e) {
    const year = parseInt(e.currentTarget.dataset.year);

    // 检查是否是当前月份
    const today = new Date();
    const isCurrentMonthActive =
      year === today.getFullYear() && this.data.currentMonth === today.getMonth();

    this.setData({
      activeYear: year,
      isCurrentMonthActive, // 更新当前月份状态
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

    // 检查是否是当前月份
    const today = new Date();
    const isCurrentMonthActive =
      activeYear === today.getFullYear() && currentMonth === today.getMonth();

    this.setData({
      currentMonth,
      activeYear,
      currentIndex: 1, // 始终将当前视图重置为中间项
      isCurrentMonthActive, // 更新当前月份状态
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

    // 检查是否是当前月份
    const today = new Date();
    const isCurrentMonthActive =
      activeYear === today.getFullYear() && currentMonth === today.getMonth();

    this.setData({
      currentMonth,
      activeYear,
      currentIndex: 1, // 始终将当前视图重置为中间项
      isCurrentMonthActive, // 更新当前月份状态
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
   * 返回当前月份（今天按钮点击）
   */
  goToToday() {
    // 获取当前日期
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // 更新状态
    this.setData({
      activeYear: currentYear,
      currentMonth: currentMonth,
      currentIndex: 1, // 重置为中间视图
      isCurrentMonthActive: true, // 设置为当前月份
    });

    // 重新生成日历数据
    this.generateThreeMonths();

    // 选中今天的日期
    const todayString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.setData({
      selectedDate: todayString,
    });
    this.updateSelectedDateInCalendar(todayString);
    this.getSelectedDateInfo(today);
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
    // 调整星期几的计算，适应周一为一周的第一天
    let dayIndex = date.getDay() - 1;
    if (dayIndex === -1) dayIndex = 6; // 如果是周日，转换为6
    const weekday = this.data.weekdays[dayIndex];

    // 格式化日期字符串
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 从日期映射中获取假期信息
    const { holidayDateMap } = this.data;
    const dateInfo = holidayDateMap ? holidayDateMap[dateString] : null;

    // 获取农历信息
    const lunarInfo = solarlunar.solar2lunar(year, month, day);

    // 检查是否有匹配的自定义节日
    const solarDate = `${month}-${day}`;
    const lunarDate = `${lunarInfo.monthCn}-${lunarInfo.dayCn}`;

    // 查找自定义节日
    const customSolarFestival = customFestivals.find(
      item => !item.isLunar && item.date === solarDate,
    );
    const customLunarFestival = customFestivals.find(
      item => item.isLunar && item.date === lunarDate,
    );

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
        day: lunarInfo.dayCn,
        month: lunarInfo.monthCn,
        term: lunarInfo.term || '',
        festival: lunarInfo.festival || '',
        isLeap: lunarInfo.isLeap,
      },
      // 添加自定义节日信息
      customFestival: customSolarFestival || customLunarFestival || null,
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
    const currentMonthRows = this.generateCalendarForMonth(
      activeYear,
      currentMonth,
      holidayDateMap,
    );

    months.push({
      id: `${activeYear}-${currentMonth}`,
      year: activeYear,
      month: currentMonth,
      monthName: monthNames[currentMonth],
      rows: currentMonthRows,
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
    // 检查是否有匹配的自定义节日
    const solarDate = `${lunarInfo.cMonth}-${lunarInfo.cDay}`;
    const lunarDate = `${lunarInfo.monthCn}-${lunarInfo.dayCn}`;

    // 查找公历节日
    const solarFestival = customFestivals.find(item => !item.isLunar && item.date === solarDate);
    if (solarFestival) {
      return solarFestival.name;
    }

    // 查找农历节日
    const lunarFestival = customFestivals.find(item => item.isLunar && item.date === lunarDate);
    if (lunarFestival) {
      return lunarFestival.name;
    }

    // 原有的显示逻辑：节气 > 农历节日 > 公历节日 > 农历日期
    if (lunarInfo.term) {
      return lunarInfo.term;
    } else if (lunarInfo.festival) {
      return lunarInfo.festival;
    } else if (lunarInfo.solarFestival) {
      return lunarInfo.solarFestival;
    } else {
      // 农历月初显示月份
      if (lunarInfo.dayCn === '初一') {
        return lunarInfo.monthCn;
      } else {
        return lunarInfo.dayCn;
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

    // 获取当前月第一天是星期几（0-6，0表示周日）
    // 转换为周一为一周的第一天（0-6，0表示周一，6表示周日）
    let firstDayWeekday = firstDayOfMonth.getDay() - 1;
    if (firstDayWeekday === -1) firstDayWeekday = 6; // 如果是周日，转换为6
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

          // 检查是否有匹配的自定义节日
          const solarDate = `${prevMonth + 1}-${prevMonthDay}`;
          const lunarDate = `${lunarInfo.monthCn}-${lunarInfo.dayCn}`;
          const isCustomFestival = customFestivals.some(
            item =>
              (item.isLunar && item.date === lunarDate) ||
              (!item.isLunar && item.date === solarDate),
          );

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
            // 标记是否为自定义节日
            isCustomFestival: isCustomFestival,
            // 添加农历信息
            lunar: {
              day: lunarInfo.dayCn,
              month: lunarInfo.monthCn,
              term: lunarInfo.term || '',
              festival: lunarInfo.festival || '',
              display: lunarDisplay,
            },
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

          // 检查是否有匹配的自定义节日
          const solarDate = `${month + 1}-${dayCounter}`;
          const lunarDate = `${lunarInfo.monthCn}-${lunarInfo.dayCn}`;
          const isCustomFestival = customFestivals.some(
            item =>
              (item.isLunar && item.date === lunarDate) ||
              (!item.isLunar && item.date === solarDate),
          );

          weekRow.push({
            day: isCurrentMonth && today.getDate() === dayCounter ? '今' : dayCounter,
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
            // 标记是否为自定义节日
            isCustomFestival: isCustomFestival,
            // 添加农历信息
            lunar: {
              day: lunarInfo.dayCn,
              month: lunarInfo.monthCn,
              term: lunarInfo.term || '',
              festival: lunarInfo.festival || '',
              display: lunarDisplay,
            },
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

          // 检查是否有匹配的自定义节日
          const solarDate = `${nextMonth + 1}-${nextMonthDay}`;
          const lunarDate = `${lunarInfo.monthCn}-${lunarInfo.dayCn}`;
          const isCustomFestival = customFestivals.some(
            item =>
              (item.isLunar && item.date === lunarDate) ||
              (!item.isLunar && item.date === solarDate),
          );

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
            // 标记是否为自定义节日
            isCustomFestival: isCustomFestival,
            // 添加农历信息
            lunar: {
              day: lunarInfo.dayCn,
              month: lunarInfo.monthCn,
              term: lunarInfo.term || '',
              festival: lunarInfo.festival || '',
              display: lunarDisplay,
            },
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
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    return data.map(item => {
      // 创建日期对象
      const date = new Date(item.date);
      // 获取星期几，调整为周一为一周的第一天
      let dayIndex = date.getDay() - 1;
      if (dayIndex === -1) dayIndex = 6; // 如果是周日，转换为6
      const weekday = weekdays[dayIndex];
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
