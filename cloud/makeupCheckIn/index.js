const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 计算连续签到天数
const calculateContinuousDays = (dates, targetDate) => {
  // 确保所有日期都是 YYYY-MM-DD 格式的字符串
  const sortedDates = [...dates, targetDate].sort()
  let maxContinuous = 1
  let currentContinuous = 1
  let lastDate = new Date(sortedDates[0])

  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i])
    const dayDiff = Math.floor((currentDate - lastDate) / (24 * 60 * 60 * 1000))
    
    if (dayDiff === 1) {
      currentContinuous++
      maxContinuous = Math.max(maxContinuous, currentContinuous)
    } else {
      currentContinuous = 1
    }
    
    lastDate = currentDate
  }

  return maxContinuous
}

exports.main = async (event, context) => {
  const { date } = event
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    // 1. 验证补签日期
    const targetDate = new Date(date)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30))
    
    if (targetDate < thirtyDaysAgo) {
      return {
        success: false,
        message: '只能补签30天内的记录'
      }
    }

    // 2. 检查该日期是否已经签到
    const yearMonth = date.substring(0, 7) // 获取年月，如 "2025-02"
    const day = parseInt(date.substring(8, 10)) // 获取日期数字
    
    const checkInRecord = await db.collection('checkInMonthly')
      .where({
        userId,
        yearMonth,
        checkInDays: _.elemMatch(_.eq(day))
      })
      .get()

    if (checkInRecord.data.length > 0) {
      return {
        success: false,
        message: '该日期已经签到'
      }
    }

    // 3. 检查并扣除积分
    const userPoints = await db.collection('userPoints')
      .where({ userId })
      .get()

    if (!userPoints.data.length || userPoints.data[0].currentPoints < 30) {
      return {
        success: false,
        message: '积分不足'
      }
    }

    // 4. 开始补签事务
    const transaction = await db.startTransaction()
    
    try {
      // 4.1 扣除积分
      await transaction.collection('userPoints')
        .where({ userId })
        .update({
          data: {
            currentPoints: _.inc(-30),
            updatedAt: db.serverDate()
          }
        })

      // 4.2 添加补签记录
      let monthRecord = await transaction.collection('checkInMonthly')
        .where({
          userId,
          yearMonth
        })
        .get()

      if (monthRecord.data.length === 0) {
        // 如果没有该月记录，创建新记录
        await transaction.collection('checkInMonthly').add({
          data: {
            userId,
            yearMonth,
            checkInDays: [day],
            makeupDays: [day],
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        })
      } else {
        // 更新现有记录
        await transaction.collection('checkInMonthly')
          .where({
            userId,
            yearMonth
          })
          .update({
            data: {
              checkInDays: _.push([day]),
              makeupDays: _.push([day]),
              updatedAt: db.serverDate()
            }
          })
      }

      // 5. 获取所有签到记录并计算连续天数
      const allCheckInRecords = await transaction.collection('checkInMonthly')
        .where({ userId })
        .get()

      // 获取所有签到日期
      const allDates = allCheckInRecords.data.reduce((acc, month) => {
        const dates = month.checkInDays.map(day => 
          `${month.yearMonth}-${String(day).padStart(2, '0')}`
        )
        return [...acc, ...dates]
      }, [])

      // 计算新的连续签到天数
      const newContinuousDays = calculateContinuousDays(allDates, date)

      // 6. 更新用户签到状态
      await transaction.collection('userCheckInStatus')
        .where({ userId })
        .update({
          data: {
            continuousDays: newContinuousDays,
            lastCheckIn: date,
            totalCheckIns: _.inc(1),
            updatedAt: db.serverDate()
          }
        })

      // 7. 获取更新后的数据
      const [newPoints, userStatus] = await Promise.all([
        transaction.collection('userPoints')
          .where({ userId })
          .get(),
        transaction.collection('userCheckInStatus')
          .where({ userId })
          .get()
      ])

      // 8. 提交事务
      await transaction.commit()

      return {
        success: true,
        data: {
          totalPoints: newPoints.data[0].currentPoints,
          continuousDays: newContinuousDays,
          checkedDates: [...allDates, date].sort()
        }
      }

    } catch (error) {
      await transaction.rollback()
      throw error
    }

  } catch (error) {
    console.error('补签失败：', error)
    return {
      success: false,
      error: error.message
    }
  }
}
