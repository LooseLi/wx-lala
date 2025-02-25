const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const day = now.getDate()
  const dateStr = now.toISOString().split('T')[0]

  const checkInMonthly = db.collection('checkInMonthly')
  const userCheckInStatus = db.collection('userCheckInStatus')
  const userPoints = db.collection('userPoints')

  try {
    // 1. 检查今日是否已打卡
    const monthRecord = await checkInMonthly.where({
      userId,
      yearMonth,
      checkInDays: _.elemMatch(_.eq(day))
    }).get()

    if (monthRecord.data.length > 0) {
      return { success: false, message: '今日已打卡' }
    }

    // 2. 获取用户状态
    let userStatus = await userCheckInStatus.where({ userId }).get()
    let continuousDays = 1
    let points = 10 // 基础积分

    if (userStatus.data.length > 0) {
      const lastStatus = userStatus.data[0]
      const lastCheckIn = new Date(lastStatus.lastCheckIn)
      
      // 计算最后打卡日期和今天的天数差
      const diffTime = now.getTime() - lastCheckIn.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      // 判断是否连续签到（只差一天）
      if (diffDays === 1) {
        continuousDays = lastStatus.continuousDays + 1
        // 连续签到额外积分
        points += Math.min(Math.floor(continuousDays / 7) * 5, 20)
      } else {
        // 如果间隔超过一天，重置连续天数为1
        continuousDays = 1
      }
    }

    // 3. 更新月度记录
    const monthlyRecord = await checkInMonthly.where({
      userId,
      yearMonth
    }).get()

    if (monthlyRecord.data.length === 0) {
      // 如果没有当月记录，创建新记录
      await checkInMonthly.add({
        data: {
          userId,
          yearMonth,
          checkInDays: [day],
          makeupDays: [],
          updatedAt: now
        }
      })
    } else {
      // 更新现有记录
      await checkInMonthly.where({
        userId,
        yearMonth
      }).update({
        data: {
          checkInDays: _.addToSet(day),
          updatedAt: now
        }
      })
    }

    // 4. 更新用户状态
    if (userStatus.data.length === 0) {
      await userCheckInStatus.add({
        data: {
          userId,
          continuousDays,
          totalCheckIns: 1,
          lastCheckIn: dateStr,
          currentStreak: {
            startDate: dateStr,
            endDate: dateStr
          },
          updatedAt: now
        }
      })
    } else {
      await userCheckInStatus.where({ userId }).update({
        data: {
          continuousDays,
          totalCheckIns: _.inc(1),
          lastCheckIn: dateStr,
          currentStreak: {
            startDate: continuousDays === 1 ? dateStr : userStatus.data[0].currentStreak.startDate,
            endDate: dateStr
          },
          updatedAt: now
        }
      })
    }

    // 5. 更新用户积分
    const pointsResult = await userPoints.where({ userId }).get()
    if (pointsResult.data.length === 0) {
      await userPoints.add({
        data: {
          userId,
          totalPoints: points,
          currentPoints: points,
          lastUpdateDate: now
        }
      })
    } else {
      await userPoints.where({ userId }).update({
        data: {
          totalPoints: _.inc(points),
          currentPoints: _.inc(points),
          lastUpdateDate: now
        }
      })
    }

    return {
      success: true,
      message: '打卡成功',
      data: {
        continuousDays,
        rewards: { points }
      }
    }
  } catch (error) {
    console.error('打卡失败：', error)
    return {
      success: false,
      error: error.message
    }
  }
}
