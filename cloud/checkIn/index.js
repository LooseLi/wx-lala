// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'lala-tsum-6gem2abq66c46985'
}) // 使用固定的云环境ID

const db = cloud.database()
const _ = db.command
const checkInRecords = db.collection('checkInRecords')
const userPoints = db.collection('userPoints')

// 计算奖励积分
function calculatePoints(continuousDays) {
  if (continuousDays >= 100) return 50
  if (continuousDays >= 30) return 30
  if (continuousDays >= 15) return 25
  if (continuousDays >= 7) return 20
  if (continuousDays >= 3) return 15
  return 10
}

// 检查是否获得新徽章
function checkNewBadge(continuousDays) {
  const badges = []
  if (continuousDays === 3) badges.push('初心者')
  if (continuousDays === 7) badges.push('坚持者')
  if (continuousDays === 15) badges.push('习惯养成')
  if (continuousDays === 30) badges.push('月度达人')
  if (continuousDays === 100) badges.push('百日成就')
  return badges
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  console.log('userId',userId);
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0] // 如 "2025-02-18"
  console.log('当前时间：', now)
  console.log('日期字符串：', dateStr)


  try {
    // 检查今日是否已打卡
    console.log('开始查询今日打卡记录')
    const todayRecord = await checkInRecords
      .where({
        userId,
        dateStr: dateStr
      })
      .get()
    
    console.log('今日打卡记录：', todayRecord)
    if (todayRecord.data.length > 0) {
      return {
        success: false,
        message: '今日已打卡',
        data: todayRecord.data[0]
      }
    }

    // 获取最近一次打卡记录
    console.log('开始查询最近打卡记录')
    const lastRecord = await checkInRecords
      .where({
        userId
      })
      .orderBy('date', 'desc')
      .limit(1)
      .get()
    
    console.log('最近打卡记录：', lastRecord.data)
    let continuousDays = 1
    if (lastRecord.data.length > 0) {
      const lastDate = new Date(lastRecord.data[0].date)
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      
      console.log('最后打卡日期：', lastDate)
      console.log('昨天日期：', yesterday)

      // 如果最后打卡是昨天，连续天数+1，否则重置为1
      // 将时间转换为年月日字符串进行比较
      const lastDateStr = lastDate.toISOString().split('T')[0]
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      console.log('最后打卡日期字符串：', lastDateStr)
      console.log('昨天日期字符串：', yesterdayStr)
      
      if (lastDateStr === yesterdayStr) {
        continuousDays = lastRecord.data[0].continuousDays + 1
      }
    }

    // 计算奖励
    const points = calculatePoints(continuousDays)
    const badges = checkNewBadge(continuousDays)

    // 记录打卡
    const checkInData = {
      userId,
      date: now,
      dateStr: dateStr,
      timestamp: now,
      continuousDays,
      totalCheckIns: lastRecord.data.length + 1,
      rewards: {
        points,
        badges
      }
    }

    await checkInRecords.add({
      data: checkInData
    })

    // 更新用户积分
    const userPointsRecord = await userPoints.where({
      userId
    }).get()

    if (userPointsRecord.data.length === 0) {
      // 创建用户积分记录
      await userPoints.add({
        data: {
          userId,
          totalPoints: points,
          currentPoints: points,
          lastUpdateDate: now
        }
      })
    } else {
      // 更新用户积分
      await userPoints.where({
        userId
      }).update({
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
      data: checkInData
    }

  } catch (error) {
    console.error('打卡失败：', error)
    return {
      success: false,
      message: '打卡失败，请稍后重试',
      error
    }
  }
}
