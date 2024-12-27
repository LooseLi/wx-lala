// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取用户信息
  let {
    APPID,
    OPENID
  } = cloud.getWXContext();
  return {
    APPID,
    OPENID
  }
}