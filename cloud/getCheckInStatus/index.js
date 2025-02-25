// \u4e91\u51fd\u6570\u5165\u53e3\u6587\u4ef6
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 计算连续签到天数
const calculateContinuousDays = (dates) => {
  if (!dates || dates.length === 0) return 0
  
  // 按日期排序
  const sortedDates = [...dates].sort()
  
  // 获取今天的日期字符串
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  
  // 获取最后一次打卡日期
  const lastCheckInDate = sortedDates[sortedDates.length - 1]
  
  // 如果今天已打卡，从今天往前数
  if (lastCheckInDate === todayStr) {
    let continuous = 1
    let lastDate = now
    
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const currentDate = new Date(sortedDates[i])
      const dayDiff = Math.floor((lastDate - currentDate) / (24 * 60 * 60 * 1000))
      
      if (dayDiff === 1) {
        continuous++
        lastDate = currentDate
      } else {
        break
      }
    }
    return continuous
  } 
  // 如果今天未打卡，看是否是昨天
  else {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    // 如果最后打卡日期是昨天，就从昨天开始数
    if (lastCheckInDate === yesterdayStr) {
      let continuous = 1
      let lastDate = yesterday
      
      for (let i = sortedDates.length - 2; i >= 0; i--) {
        const currentDate = new Date(sortedDates[i])
        const dayDiff = Math.floor((lastDate - currentDate) / (24 * 60 * 60 * 1000))
        
        if (dayDiff === 1) {
          continuous++
          lastDate = currentDate
        } else {
          break
        }
      }
      return continuous
    } 
    // 如果最后打卡日期不是昨天，说明连续中断了
    else {
      return 0
    }
  }
}

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

    // 1. 获取本月和上月的签到记录
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const lastYearMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
    
    const [currentMonthRecord, lastMonthRecord] = await Promise.all([
      db.collection('checkInMonthly').where({ userId, yearMonth }).get(),
      db.collection('checkInMonthly').where({ userId, yearMonth: lastYearMonth }).get()
    ])

    // 2. 获取用户状态
    const userStatus = await db.collection('userCheckInStatus')
      .where({ userId })
      .get()

    // 3. 获取用户积分
    const pointsRecord = await db.collection('userPoints')
      .where({ userId })
      .get()

    // 4. 处理签到状态
    const isCheckedIn = currentMonthRecord.data.length > 0 && 
      currentMonthRecord.data[0].checkInDays.includes(day)

    // 5. 获取所有签到日期并计算连续天数
    const allDates = []
    
    // 添加本月签到日期
    if (currentMonthRecord.data.length > 0) {
      allDates.push(...currentMonthRecord.data[0].checkInDays.map(d => 
        `${yearMonth}-${String(d).padStart(2, '0')}`
      ))
    }
    
    // 添加上月签到日期
    if (lastMonthRecord.data.length > 0) {
      allDates.push(...lastMonthRecord.data[0].checkInDays.map(d => 
        `${lastYearMonth}-${String(d).padStart(2, '0')}`
      ))
    }
    
    const continuousDays = calculateContinuousDays(allDates)
    const status = userStatus.data[0] || {}
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
