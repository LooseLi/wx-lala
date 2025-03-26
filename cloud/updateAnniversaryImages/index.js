// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    console.log('开始更新 anniversaryList 集合中缺少 images 字段的记录')
    
    // 获取所有没有 images 字段的记录
    const { data: records } = await db.collection('anniversaryList')
      .where({
        images: _.exists(false)
      })
      .get()
    
    console.log(`找到 ${records.length} 条需要更新的记录`)
    
    if (records.length === 0) {
      return {
        success: true,
        message: '没有找到需要更新的记录',
        updatedCount: 0
      }
    }
    
    // 批量更新，添加空的 images 数组
    const batchSize = 100 // 云函数一次最多处理100条记录
    const tasks = []
    
    // 分批处理记录
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      // 为每一批创建更新任务
      const batchTasks = batch.map(record => {
        return db.collection('anniversaryList').doc(record._id).update({
          data: {
            images: [] // 添加空的 images 数组
          }
        })
      })
      
      // 等待当前批次的所有更新完成
      const batchResults = await Promise.all(batchTasks)
      tasks.push(...batchResults)
      
      console.log(`已完成第 ${Math.floor(i / batchSize) + 1} 批更新，共 ${batch.length} 条记录`)
    }
    
    return {
      success: true,
      message: '更新成功',
      updatedCount: records.length,
      details: tasks
    }
  } catch (error) {
    console.error('更新记录时发生错误:', error)
    return {
      success: false,
      message: '更新失败',
      error: error
    }
  }
}
