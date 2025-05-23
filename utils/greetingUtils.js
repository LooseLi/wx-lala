/**
 * 问候语工具函数
 * 根据不同时段返回不同的问候语和表情
 */

/**
 * 获取基于时间的问候语和表情
 * @returns {string} 问候语和表情组合
 */
function getTimeBasedGreeting() {
  const now = new Date();
  const hour = now.getHours();

  const greetings = {
    // 早上 (6:00-11:59)
    morning: [
      '早安，新的一天开始啦 ☀️',
      '早安，今天也要加油喔 🌅',
      '🐨🐨🐨',
      '🎄🎄🎄',
      '🐱🐱🐱',
      '😘😘😘',
      '🦭🦭🦭',
    ],

    // 中午 (12:00-13:59)
    noon: [
      '午安，休息一下吧 🍵',
      '午安，放松一下吧 🌿',
      '干饭时间到! 🍲',
      '🐨🐨🐨',
      '🎄🎄🎄',
      '🍲🍲🍲',
      '😘😘😘',
    ],

    // 下午 (14:00-17:59)
    afternoon: ['摸摸鱼吧 🐟', '🐨🐨🐨', '🎄🎄🎄', '🐱🐱🐱', '😘😘😘', '🐟🐟🐟'],

    // 傍晚 (18:00-22:59)
    evening: ['辛苦啦 🌙', '🐨🐨🐨', '🎄🎄🎄', '🐱🐱🐱', '😘😘😘', '🦭🦭🦭'],

    // 深夜 (23:00-5:59)
    lateNight: [
      '夜深了，早点休息喔 💤',
      '晚安，好梦 🌜',
      '记得早点睡觉喔 ⭐',
      '🐨🐨🐨',
      '🎄🎄🎄',
      '🐱🐱🐱',
      '🛌🛌🛌',
      '💤💤💤',
      '😘😘😘',
    ],
  };

  // 根据当前时间选择合适的问候语池
  let timePool;
  if (hour >= 6 && hour < 12) {
    // 早上 (6:00-11:59)
    timePool = greetings.morning;
  } else if (hour >= 12 && hour < 14) {
    // 中午 (12:00-13:59)
    timePool = greetings.noon;
  } else if (hour >= 14 && hour < 18) {
    // 下午 (14:00-17:59)
    timePool = greetings.afternoon;
  } else if (hour >= 18 && hour < 23) {
    // 傌晚 (18:00-22:59)
    timePool = greetings.evening;
  } else {
    // 深夜 (23:00-5:59)
    timePool = greetings.lateNight;
  }

  // 从选定的池中随机选择一个问候语
  const randomIndex = Math.floor(Math.random() * timePool.length);
  return timePool[randomIndex];
}

module.exports = {
  getTimeBasedGreeting,
};
