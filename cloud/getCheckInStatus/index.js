// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 计算连续签到天数
const calculateContinuousDays = dates => {
  if (!dates || dates.length === 0) return 0;

  // 按日期排序
  const sortedDates = [...dates].sort();

  // 获取今天的日期字符串
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 获取最后一次打卡日期
  const lastCheckInDate = sortedDates[sortedDates.length - 1];

  // 如果今天已打卡，从今天往前数
  if (lastCheckInDate === todayStr) {
    let continuous = 1;
    let lastDate = now;

    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const currentDate = new Date(sortedDates[i]);
      const dayDiff = Math.floor((lastDate - currentDate) / (24 * 60 * 60 * 1000));

      if (dayDiff === 1) {
        continuous++;
        lastDate = currentDate;
      } else {
        break;
      }
    }
    return continuous;
  }
  // 如果今天未打卡，看是否是昨天
  else {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 如果最后打卡日期是昨天，就从昨天开始数
    if (lastCheckInDate === yesterdayStr) {
      let continuous = 1;
      let lastDate = yesterday;

      for (let i = sortedDates.length - 2; i >= 0; i--) {
        const currentDate = new Date(sortedDates[i]);
        const dayDiff = Math.floor((lastDate - currentDate) / (24 * 60 * 60 * 1000));

        if (dayDiff === 1) {
          continuous++;
          lastDate = currentDate;
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
    // 获取今日日期信息
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];

    // 1. 获取所有月份的签到记录
    const allMonthlyRecords = await db.collection('checkInMonthly').where({ userId }).get();

    // 2. 用户状态获取逻辑已移除（userCheckInStatus集合已删除）

    // 3. 获取用户积分
    const pointsRecord = await db.collection('userPoints').where({ userId }).get();

    // 4. 处理签到状态
    const currentMonthRecord = allMonthlyRecords.data.find(
      record => record.yearMonth === yearMonth,
    );
    const isCheckedIn = currentMonthRecord && currentMonthRecord.checkInDays.includes(day);

    // 5. 获取所有签到日期并计算连续天数
    // 从所有月份记录中提取签到日期
    const allDates = allMonthlyRecords.data.reduce((acc, month) => {
      const dates = month.checkInDays.map(d => `${month.yearMonth}-${String(d).padStart(2, '0')}`);
      return [...acc, ...dates];
    }, []);

    // 按日期排序
    const sortedDates = [...allDates].sort();

    const continuousDays = calculateContinuousDays(sortedDates);
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
