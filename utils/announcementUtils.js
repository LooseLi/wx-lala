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

  // 恶劣天气类型列表
  const badWeatherTypes = [
    '暴雨',
    '大暴雨',
    '特大暴雨',
    '雷阵雨',
    '雷暴',
    '暴雪',
    '大暴雪',
    '特大暴雪',
    '浮尘',
    '扬沙',
    '沙尘暴',
    '强沙尘暴',
    '霾',
    '中度霾',
    '重度霾',
    '严重霾',
    '台风',
    '飓风',
    '龙卷风',
    '冰雹',
    '大风',
    '狂风',
    '飓风',
    '热带风暴',
  ];

  // 高温预警
  const isHighTemperature = weatherData.temperature && parseInt(weatherData.temperature) >= 35;
  // 大风预警
  const isStrongWind = weatherData.windpower && parseInt(weatherData.windpower) >= 4;
  // 检查天气类型
  const isBadWeatherType =
    weatherData.weather && badWeatherTypes.some(type => weatherData.weather.includes(type));

  if (isBadWeatherType || isHighTemperature || isStrongWind) {
    let content = '';

    if (isBadWeatherType) {
      content = `今日${weatherData.weather}，出门注意安全喔~`;
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
      priority: 10, // 恶劣天气优先级最高
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

  // 获取当前日期
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 检查是否有整周年纪念日
  const anniversaryToday = anniversaryList.filter(item => {
    if (!item.date) return false;

    // 解析纪念日日期
    const anniversaryDate = new Date(item.date.replace(/-/g, '/'));

    // 判断是否是同一天（月份和日期相同）
    const isSameMonthDay =
      today.getMonth() === anniversaryDate.getMonth() &&
      today.getDate() === anniversaryDate.getDate();

    // 如果是同一天，计算周年数
    if (isSameMonthDay) {
      const years = today.getFullYear() - anniversaryDate.getFullYear();
      return years > 0; // 只返回至少满1周年的纪念日
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

    return {
      id: 'anniversary-' + anniversary._id,
      type: 'anniversary',
      content: `今天是${anniversary.name}${years}周年纪念日~`,
      link: '/pages/index/components/anniversary/index',
      priority: 10, // 整周年纪念日优先级高
    };
  }

  // 如果当天没有整周年纪念日，返回null
  return null;
}

/**
 * 获取最近的倒计时公告
 * @param {Array} countdownList 倒计时列表
 * @param {Number} daysThreshold 天数阈值，只返回在这个天数内的倒计时
 * @returns {Object|null} 如果有符合条件的倒计时，返回公告对象；否则返回null
 */
function getRecentCountdown(countdownList, daysThreshold = 15) {
  if (!countdownList || !countdownList.length) return null;

  // 筛选出未来daysThreshold天内的倒计时
  const recentCountdowns = countdownList.filter(item => {
    return item.countDown > 0 && item.countDown <= daysThreshold;
  });

  // 按倒计时天数升序排序，找出最近的倒计时
  if (recentCountdowns.length > 0) {
    recentCountdowns.sort((a, b) => a.countDown - b.countDown);
    const nearest = recentCountdowns[0];

    return {
      id: 'countdown-' + nearest._id,
      type: 'countdown',
      content: `距离${nearest.id}还有${nearest.countDown}天~`,
      link: '/pages/index/components/countdown/index',
      priority: 3, // 倒计时优先级较低
    };
  }

  return null;
}

/**
 * 生成公告列表
 * @param {Object} weatherData 天气数据
 * @param {Array} anniversaryList 纪念日列表
 * @param {Array} countdownList 倒计时列表
 * @returns {Array} 公告列表
 */
function generateAnnouncements(weatherData, anniversaryList, countdownList) {
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
  const countdownAnnouncement = getRecentCountdown(countdownList);
  if (countdownAnnouncement) {
    announcements.push(countdownAnnouncement);
  }

  // 按优先级排序
  announcements.sort((a, b) => b.priority - a.priority);

  return announcements;
}

module.exports = {
  checkBadWeather,
  getRecentAnniversary,
  getRecentCountdown,
  generateAnnouncements,
};
