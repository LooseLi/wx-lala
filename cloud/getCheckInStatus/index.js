// \u4e91\u51fd\u6570\u5165\u53e3\u6587\u4ef6
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    // 获取今日日期信息
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`

    // 1. 获取本月签到记录
    const monthRecord = await db.collection('checkInMonthly')
      .where({
        userId,
        yearMonth
      })
      .get()

    // 2. 获取用户状态
    const userStatus = await db.collection('userCheckInStatus')
      .where({ userId })
      .get()

    // 3. 获取用户积分
    const pointsRecord = await db.collection('userPoints')
      .where({ userId })
      .get()

    // 4. 处理签到状态
    const isCheckedIn = monthRecord.data.length > 0 && 
      monthRecord.data[0].checkInDays.includes(day)

    // 5. 获取连续签到天数和签到范围
    const status = userStatus.data[0] || {}
    const continuousDays = status.continuousDays || 0
    const currentStreak = status.currentStreak || { startDate: '', endDate: '' }

    return {
      success: true,
      data: {
        isCheckedIn,
        continuousDays,
        currentStreak,
        totalPoints: pointsRecord.data.length > 0 ? 
          pointsRecord.data[0].currentPoints : 0
      }
    }
  } catch (error) {
    console.error('获取签到状态失败：', error)
    return {
      success: false,
      error: error.message
    }
  }
}
