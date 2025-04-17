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
const calculateContinuousDays = dates => {
  if (!dates || dates.length === 0) return 0;

  // 按日期排序
  const sortedDates = [...dates].sort();

  // 获取今天的日期字符串（本地时区）
  const now = new Date();
  const todayStr = formatDate(now);

  // 获取最后一次打卡日期
  const lastCheckInDate = sortedDates[sortedDates.length - 1];

  // 如果今天已打卡，从今天往前数
  if (lastCheckInDate === todayStr) {
    let continuous = 1;
    let lastDateStr = todayStr;

    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const currentDateStr = sortedDates[i];

      // 计算日期差
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - continuous);
      const expectedDateStr = formatDate(yesterday);

      if (currentDateStr === expectedDateStr) {
        continuous++;
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
    const yesterdayStr = formatDate(yesterday);

    // 如果最后打卡日期是昨天，就从昨天开始数
    if (lastCheckInDate === yesterdayStr) {
      let continuous = 1;
      let lastDateStr = yesterdayStr;

      for (let i = sortedDates.length - 2; i >= 0; i--) {
        const currentDateStr = sortedDates[i];

        // 计算日期差
        const refDate = new Date(yesterday);
        refDate.setDate(refDate.getDate() - (continuous - 1));
        const expectedDateStr = formatDate(refDate);

        if (currentDateStr === expectedDateStr) {
          continuous++;
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

  // 获取今日日期信息（使用本地时区）
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate();
  // 年月格式：YYYY-MM
  const yearMonth = `${year}-${month}`;
  // 完整日期格式：YYYY-MM-DD
  const todayStr = formatDate(now);

  const checkInMonthly = db.collection('checkInMonthly');
  const userPoints = db.collection('userPoints');

  try {
    // 1. 检查今日是否已打卡
    const monthRecord = await checkInMonthly
      .where({
        userId,
        yearMonth,
        checkInDays: _.elemMatch(_.eq(day)),
      })
      .get();

    if (monthRecord.data.length > 0) {
      return { success: false, message: '今日已签到~' };
    }

    // 2. 获取所有打卡记录
    let points = 10; // 基础积分

    // 获取所有月份的打卡记录
    const allMonthlyRecords = await checkInMonthly.where({ userId }).get();

    // 获取所有打卡日期，统一转为 YYYY-MM-DD 格式
    const allDates = allMonthlyRecords.data.reduce((acc, month) => {
      const dates = month.checkInDays.map(d => `${month.yearMonth}-${String(d).padStart(2, '0')}`);
      return [...acc, ...dates];
    }, []);

    // 添加今天的日期（因为还未更新到数据库）
    const allDatesWithToday = [...allDates, todayStr];

    // 使用统一的方法计算连续天数
    const continuousDays = calculateContinuousDays(allDatesWithToday);

    // 计算额外积分
    if (continuousDays > 1) {
      // 连续签到额外积分
      points += Math.min(Math.floor(continuousDays / 7) * 5, 15);
    }

    // 3. 更新月度记录
    const monthlyRecord = await checkInMonthly
      .where({
        userId,
        yearMonth,
      })
      .get();

    if (monthlyRecord.data.length === 0) {
      // 如果没有当月记录，创建新记录
      await checkInMonthly.add({
        data: {
          userId,
          yearMonth,
          checkInDays: [Number(day)], // 确保存储为数字类型
          makeupDays: [],
          updatedAt: now,
        },
      });
    } else {
      // 更新现有记录
      await checkInMonthly
        .where({
          userId,
          yearMonth,
        })
        .update({
          data: {
            checkInDays: _.addToSet(Number(day)), // 确保存储为数字类型
            updatedAt: now,
          },
        });
    }

    // 4. 用户状态更新逻辑已移除（userCheckInStatus集合已删除）

    // 5. 更新用户积分
    const pointsResult = await userPoints.where({ userId }).get();
    if (pointsResult.data.length === 0) {
      await userPoints.add({
        data: {
          userId,
          totalPoints: points,
          currentPoints: points,
          lastUpdateDate: now,
        },
      });
    } else {
      await userPoints.where({ userId }).update({
        data: {
          totalPoints: _.inc(points),
          currentPoints: _.inc(points),
          lastUpdateDate: now,
        },
      });
    }

    return {
      success: true,
      message: '签到成功，太棒啦～',
      data: {
        continuousDays,
        rewards: { points },
      },
    };
  } catch (error) {
    console.error('签到失败：', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
