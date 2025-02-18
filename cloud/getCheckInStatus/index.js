// \u4e91\u51fd\u6570\u5165\u53e3\u6587\u4ef6
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'lala-tsum-6gem2abq66c46985'
})

// \u4e91\u51fd\u6570\u5165\u53e3\u51fd\u6570
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const db = cloud.database()
  const checkInRecords = db.collection('checkInRecords')
  const userPoints = db.collection('userPoints')

  try {
    // \u83b7\u53d6\u4eca\u65e5\u6253\u5361\u72b6\u6001
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    
    const todayRecord = await checkInRecords
      .where({
        userId,
        dateStr: dateStr
      })
      .get()

    // \u83b7\u53d6\u7528\u6237\u79ef\u5206
    const pointsRecord = await userPoints
      .where({
        userId
      })
      .get()

    return {
      success: true,
      data: {
        isCheckedIn: todayRecord.data.length > 0,
        continuousDays: todayRecord.data.length > 0 ? todayRecord.data[0].continuousDays : 0,
        totalPoints: pointsRecord.data.length > 0 ? pointsRecord.data[0].currentPoints : 0
      }
    }
  } catch (error) {
    console.error(error)
    return {
      success: false,
      error: error.message
    }
  }
}
