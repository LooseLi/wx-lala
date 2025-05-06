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
    '暴雨', '大暴雨', '特大暴雨', 
    '雷阵雨', '雷暴', 
    '暴雪', '大暴雪', '特大暴雪',
    '沙尘暴', '强沙尘暴', 
    '雾', '浓雾', '强浓雾', '大雾', '特强浓雾',
    '霾', '中度霾', '重度霾', '严重霾',
    '台风', '飓风', '龙卷风',
    '冰雹',
    '大风', '狂风', '飓风', '热带风暴'
  ];

  // 高温预警
  const isHighTemperature = weatherData.temperature && parseInt(weatherData.temperature) >= 35;
  
  // 强风预警
  const isStrongWind = weatherData.windpower && parseInt(weatherData.windpower) >= 6;

  // 检查天气类型
  const isBadWeatherType = weatherData.weather && 
    badWeatherTypes.some(type => weatherData.weather.includes(type));

  if (isBadWeatherType || isHighTemperature || isStrongWind) {
    let content = '';
    
    if (isBadWeatherType) {
      content = `今日${weatherData.weather}，出门请注意安全`;
    } else if (isHighTemperature) {
      content = `今日高温${weatherData.temperature}°C，请注意防暑降温`;
    } else if (isStrongWind) {
      content = `今日${weatherData.winddirection}风${weatherData.windpower}级，出门请注意安全`;
    }
    
    return {
      id: 'weather-' + Date.now(),
      type: 'weather',
      content: content,
      link: '',
      priority: 10 // 恶劣天气优先级最高
    };
  }
  
  return null;
}

/**
 * 获取最近的纪念日公告
 * @param {Array} anniversaryList 纪念日列表
 * @param {Number} daysThreshold 天数阈值，只返回在这个天数内的纪念日
 * @returns {Object|null} 如果有符合条件的纪念日，返回公告对象；否则返回null
 */
function getRecentAnniversary(anniversaryList, daysThreshold = 7) {
  if (!anniversaryList || !anniversaryList.length) return null;
  
  // 筛选出未来daysThreshold天内的纪念日
  const recentAnniversaries = anniversaryList.filter(item => {
    // days字段是距离纪念日的天数，正数表示已过去的天数，负数表示未来的天数
    return item.days < 0 && item.days >= -daysThreshold;
  });
  
  // 按天数升序排序，找出最近的纪念日
  if (recentAnniversaries.length > 0) {
    recentAnniversaries.sort((a, b) => Math.abs(a.days) - Math.abs(b.days));
    const nearest = recentAnniversaries[0];
    
    return {
      id: 'anniversary-' + nearest._id,
      type: 'anniversary',
      content: `距离${nearest.name}还有${Math.abs(nearest.days)}天，记得准备礼物哦`,
      link: '/pages/index/components/anniversary/index',
      priority: 5 // 纪念日优先级中等
    };
  }
  
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
      content: `距离${nearest.id}还有${nearest.countDown}天，${nearest.content || ''}`,
      link: '/pages/index/components/countdown/index',
      priority: 3 // 倒计时优先级较低
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
  generateAnnouncements
};
