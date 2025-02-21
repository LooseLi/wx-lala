const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { year, month } = event
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`
  
  try {
    const result = await db.collection('checkInMonthly')
      .where({
        userId,
        yearMonth
      })
      .get()
    
    if (result.data.length === 0) {
      return {
        success: true,
        data: {
          checkInDays: [],
          makeupDays: []
        }
      }
    }
    
    const record = result.data[0]
    return {
      success: true,
      data: {
        checkInDays: record.checkInDays || [],
        makeupDays: record.makeupDays || []
      }
    }
  } catch (error) {
    console.error('获取月度签到数据失败：', error)
    return {
      success: false,
      error: error.message
    }
  }
}
