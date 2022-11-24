// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境

const db = cloud.database();
const todos = db.collection('todos');

// 云函数入口函数
exports.main = async (event, context) => {
  const _openid = cloud.getWXContext().OPENID;
  const arr = await todos.where({
    _openid
  }).get();
  if (!arr.length) return {};
  const currentTime = new Date().getTime();
  const obj = null;
  arr.forEach(item => {
    const time = item.time.getTime();
    if (time === currentTime) {
      obj = item;
    }
  });
  if (!obj) return obj;
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: cloud.getWXContext().OPENID, // 通过 getWXContext 获取 OPENID
      page: 'user/index',
      data: {
        thing1: {
          value: obj.title
        },
        time2: {
          value: obj.time
        },
      },
      templateId: 'GqXCTV7Ws4p-ADpD40fZz1mIfMd6Ab_71jOqkmKdkII',
    })
    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    return error
  }
}