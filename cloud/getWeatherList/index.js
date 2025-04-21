// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  try {
    // 获取所有天气数据，不受20条限制
    const weatherRes = await db.collection('weatherList').get();

    return {
      success: true,
      data: weatherRes.data,
      openid: wxContext.OPENID,
    };
  } catch (error) {
    console.error('获取天气列表失败:', error);
    return {
      success: false,
      error: error.message,
      openid: wxContext.OPENID,
    };
  }
};
