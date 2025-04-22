// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 * @param {Date} date - 日期对象
 * @returns {string} - 格式化后的日期字符串
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 计算连续签到天数 - 使用纯字符串比较
const calculateContinuousDays = (dates, todayStr) => {
  if (!dates || dates.length === 0) return 0;

  // 按日期排序
  const sortedDates = [...dates].sort();

  // 获取最后一次打卡日期
  const lastCheckInDate = sortedDates[sortedDates.length - 1];

  // 如果今天已打卡，从今天往前数
  if (lastCheckInDate === todayStr) {
    let continuous = 1;
    let lastDateStr = todayStr;

    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const currentDateStr = sortedDates[i];

      // 计算日期差
      const [lastYear, lastMonth, lastDay] = lastDateStr.split('-').map(Number);
      const lastDate = new Date(lastYear, lastMonth - 1, lastDay);
      lastDate.setDate(lastDate.getDate() - 1);
      const expectedDateStr = formatDate(lastDate);

      if (currentDateStr === expectedDateStr) {
        continuous++;
        lastDateStr = currentDateStr;
      } else {
        break;
      }
    }
    return continuous;
  }
  // 如果今天未打卡，看是否是昨天
  else {
    // 计算昨天的日期
    const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);
    const today = new Date(todayYear, todayMonth - 1, todayDay);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    // 如果最后打卡日期是昨天，就从昨天开始数
    if (lastCheckInDate === yesterdayStr) {
      let continuous = 1;
      let lastDateStr = yesterdayStr;

      for (let i = sortedDates.length - 2; i >= 0; i--) {
        const currentDateStr = sortedDates[i];

        // 计算日期差
        const [lastYear, lastMonth, lastDay] = lastDateStr.split('-').map(Number);
        const lastDate = new Date(lastYear, lastMonth - 1, lastDay);
        lastDate.setDate(lastDate.getDate() - 1);
        const expectedDateStr = formatDate(lastDate);

        if (currentDateStr === expectedDateStr) {
          continuous++;
          lastDateStr = currentDateStr;
        } else {
          break;
        }
      }
      return continuous;
    }
    // 如果最后打卡日期不是昨天，说明连续中断了
    else {
      return 0;
    }
  }
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;

  try {
    // 使用前端传递的本地日期信息
    let year, month, day, todayStr, yearMonth;

    if (event.localDate) {
      // 使用前端传递的日期信息
      year = parseInt(event.localDate.year);
      month = parseInt(event.localDate.month);
      day = parseInt(event.localDate.day);
      todayStr = event.localDate.dateStr;
      yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

      console.log('使用前端传递的日期:', { year, month, day, todayStr, yearMonth });
    } else {
      // 兼容旧调用，使用云函数的日期（可能存在时区问题）
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
      day = now.getDate();
      yearMonth = `${year}-${String(month).padStart(2, '0')}`;
      todayStr = formatDate(now);

      console.log('使用云函数本地日期:', { year, month, day, todayStr, yearMonth });
    }

    // 1. 获取所有月份的签到记录
    const allMonthlyRecords = await db.collection('checkInMonthly').where({ userId }).get();

    // 2. 用户状态获取逻辑已移除（userCheckInStatus集合已删除）

    // 3. 获取用户积分
    const pointsRecord = await db.collection('userPoints').where({ userId }).get();

    // 4. 处理签到状态 - 确保使用前端传入的日期判断
    // 确保day作为数字处理，而不是字符串
    const dayNum = parseInt(day);
    const currentMonthRecord = allMonthlyRecords.data.find(
      record => record.yearMonth === yearMonth,
    );

    // 检查当前月份记录中是否包含今天的日期（作为数字）
    const isCheckedIn =
      currentMonthRecord &&
      currentMonthRecord.checkInDays &&
      currentMonthRecord.checkInDays.includes(dayNum);

    console.log('签到状态检查:', {
      yearMonth,
      day: dayNum,
      foundRecord: !!currentMonthRecord,
      checkInDays: currentMonthRecord ? currentMonthRecord.checkInDays : [],
      isCheckedIn,
    });

    // 5. 获取所有签到日期并计算连续天数
    // 从所有月份记录中提取签到日期，统一转为 YYYY-MM-DD 格式
    const allDates = allMonthlyRecords.data.reduce((acc, month) => {
      const dates = month.checkInDays.map(d => `${month.yearMonth}-${String(d).padStart(2, '0')}`);
      return [...acc, ...dates];
    }, []);

    // 按日期排序
    const sortedDates = [...allDates].sort();

    const continuousDays = calculateContinuousDays(sortedDates, todayStr);
    // userCheckInStatus集合已删除，使用默认值
    const currentStreak = { startDate: '', endDate: '' };

    return {
      success: true,
      data: {
        isCheckedIn,
        continuousDays,
        currentStreak,
        currentPoints: pointsRecord.data.length > 0 ? pointsRecord.data[0].currentPoints : 0,
      },
    };
  } catch (error) {
    console.error('获取签到状态失败：', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
