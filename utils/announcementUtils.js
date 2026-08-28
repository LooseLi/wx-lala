/**
 * 公告工具函数
 * 用于处理首页公告数据
 */

/**
 * 判断是否为恶劣天气
 * @param {Object} weatherData 天气数据对象
 * @returns {Object|null} 如果是恶劣天气，返回公告对象；否则返回null
 */
function checkBadWeather(weatherData) {
  if (!weatherData) return null;

  // 天气分类
  const weatherCategories = {
    rain: ['大雨', '暴雨', '大暴雨', '特大暴雨', '极端降雨', '强阵雨'],
    shower: ['雷阵雨', '强雷阵雨'],
    snow: ['大雪', '暴雪'],
    haze: ['霾', '中度霾', '重度霾', '严重霾'],
    wind: ['劲风', '强风', '大风', '烈风', '风暴', '狂爆风', '飓风', '热带风暴'],
    fog: ['大雾', '浓雾', '强浓雾', '特强浓雾'],
    other: ['浮尘', '扬沙', '沙尘暴', '强沙尘暴', '龙卷风', '冰雹', '台风'],
  };
  // 文案模板
  const weatherMessages = {
    rain: '雨太大啦！别出门了吧~',
    shower: '出门要带伞，打雷要抱抱~',
    snow: '嫩大的雪，不上班行不行',
    haze: '口罩，救一下！',
    wind: '出门别被刮走啦，注意安全~',
    fog: '能见度太低，慢行慢行~',
    other: '出门注意安全喔~', // 默认文案
  };
  // 合并所有恶劣天气类型为一个数组
  const badWeatherTypes = Object.values(weatherCategories).flat();

  // 高温预警
  const isHighTemperature = weatherData.temperature && parseInt(weatherData.temperature) >= 35;
  // 大风预警
  const isStrongWind = weatherData.windpower && parseInt(weatherData.windpower) >= 4;
  const isBadWeatherType =
    weatherData.weather && badWeatherTypes.some(type => weatherData.weather.includes(type));

  if (isBadWeatherType || isHighTemperature || isStrongWind) {
    let content = '';

    if (isBadWeatherType) {
      // 根据天气类型获取对应文案
      let weatherMessage = weatherMessages.other; // 默认文案

      for (const [category, types] of Object.entries(weatherCategories)) {
        if (types.some(type => weatherData.weather.includes(type))) {
          weatherMessage = weatherMessages[category];
          break;
        }
      }

      content = `今日${weatherData.weather}：${weatherMessage}`;
    } else if (isHighTemperature) {
      content = `今日${weatherData.temperature}°C！西瓜🍉降暑~`;
    } else if (isStrongWind) {
      content = `今日${weatherData.winddirection}风${weatherData.windpower}级！别被刮走啦~`;
    }

    return {
      id: 'weather-' + Date.now(),
      type: 'weather',
      content: content,
      link: '',
      priority: 9, // 恶劣天气优先级第二高
      icon: './images/icon-tixing.png', // 恶劣天气图标
    };
  }

  return null;
}

/**
 * 获取当天整周年纪念日公告
 * @param {Array} anniversaryList 纪念日列表
 * @returns {Object|null} 如果当天有整周年纪念日，返回公告对象；否则返回null
 */
function getRecentAnniversary(anniversaryList) {
  if (!anniversaryList || !anniversaryList.length) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 检查是否有整周年纪念日
  const anniversaryToday = anniversaryList.filter(item => {
    if (!item.date) return false;

    const anniversaryDate = new Date(item.date.replace(/-/g, '/'));
    if (item.endDate) {
      const endDate = new Date(item.endDate.replace(/-/g, '/'));
      endDate.setHours(0, 0, 0, 0);
      if (today > endDate) return false;
    }

    const isSameMonthDay =
      today.getMonth() === anniversaryDate.getMonth() &&
      today.getDate() === anniversaryDate.getDate();

    if (isSameMonthDay) {
      const years = today.getFullYear() - anniversaryDate.getFullYear();
      return years > 0;
    }

    return false;
  });

  // 如果有整周年纪念日，返回公告
  if (anniversaryToday.length > 0) {
    // 按周年数降序排序，优先显示大周年（如十周年、五周年等）
    anniversaryToday.sort((a, b) => {
      const dateA = new Date(a.date.replace(/-/g, '/'));
      const dateB = new Date(b.date.replace(/-/g, '/'));
      const yearsA = today.getFullYear() - dateA.getFullYear();
      const yearsB = today.getFullYear() - dateB.getFullYear();
      return yearsB - yearsA;
    });

    const anniversary = anniversaryToday[0];
    const anniversaryDate = new Date(anniversary.date.replace(/-/g, '/'));
    const years = today.getFullYear() - anniversaryDate.getFullYear();

    // 优先使用announcementName，如果不存在则使用name
    const displayName = anniversary.announcementName || anniversary.name;

    return {
      id: 'anniversary-' + anniversary._id,
      type: 'anniversary',
      content: `距离${displayName}，已经 ${years} 年啦~`,
      link: '/pages/index/components/anniversary/index',
      priority: 10, // 纪念日优先级最高
      icon: './images/icon-heart.png', // 纪念日图标
    };
  }

  return null;
}

/**
 * 获取最近的倒计时公告
 * @param {Array} countdownList 倒计时列表
 * @param {Number} daysThreshold 天数阈值，只返回在这个天数内的倒计时
 * @returns {Array} 返回所有符合条件的倒计时公告数组
 */
function getRecentCountdown(countdownList, daysThreshold = 15) {
  if (!countdownList || !countdownList.length) return [];

  // 筛选出未来daysThreshold天内的倒计时
  const recentCountdowns = countdownList.filter(item => {
    return item.countDown > 0 && item.countDown <= daysThreshold;
  });

  // 按倒计时天数升序排序，最近的排在前面
  if (recentCountdowns.length > 0) {
    recentCountdowns.sort((a, b) => a.countDown - b.countDown);
    
    // 返回所有符合条件的倒计时公告
    return recentCountdowns.map(item => ({
      id: 'countdown-' + item._id,
      type: 'countdown',
      content: `距离${item.id}还有 ${item.countDown} 天~`,
      link: '/pages/index/components/countdown/index',
      priority: 5, // 倒计时优先级最低
      icon: './images/icon-gonggao.png', // 倒计时图标使用默认图标
    }));
  }

  return [];
}

/**
 * 生成公告列表
 * @param {Object} weatherData 天气数据
 * @param {Array} anniversaryList 纪念日列表
 * @param {Array} countdownList 倒计时列表
 * @param {Number} todoCount 今日未完成待办数量
 * @returns {Array} 公告列表
 */
function generateAnnouncements(weatherData, anniversaryList, countdownList, todoCount) {
  const announcements = [];

  // 检查恶劣天气
  const weatherAnnouncement = checkBadWeather(weatherData);
  if (weatherAnnouncement) {
    announcements.push(weatherAnnouncement);
  }

  // 获取近期纪念日
  const anniversaryAnnouncement = getRecentAnniversary(anniversaryList);
  if (anniversaryAnnouncement) {
    announcements.push(anniversaryAnnouncement);
  }

  // 获取近期倒计时
  const countdownAnnouncements = getRecentCountdown(countdownList);
  if (countdownAnnouncements.length > 0) {
    announcements.push(...countdownAnnouncements);
  }

  // 获取今日待办
  const todoAnnouncement = getTodayTodos(todoCount);
  if (todoAnnouncement) {
    announcements.push(todoAnnouncement);
  }

  // 按优先级排序
  announcements.sort((a, b) => b.priority - a.priority);

  return announcements;
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date 日期对象
 * @returns {String} 格式化后的日期字符串
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取今日待办公告
 * @param {Number} todoCount 今日未完成待办数量
 * @returns {Object|null} 如果今日有待办事项，返回公告对象；否则返回null
 */
function getTodayTodos(todoCount) {
  // 如果没有待办或数量为0，不显示公告
  if (!todoCount || todoCount <= 0) return null;

  // 返回公告对象
  return {
    id: 'todo-' + Date.now(),
    type: 'todo',
    content: `今日有 ${todoCount} 项待办事项待完成`,
    link: '/pages/index/components/todo/index',
    priority: 7, // 今日待办优先级第三高
    icon: './images/icon-todo.png', // 待办事项图标
  };
}

module.exports = {
  checkBadWeather,
  getRecentAnniversary,
  getRecentCountdown,
  getTodayTodos,
  generateAnnouncements,
  formatDate,
};
