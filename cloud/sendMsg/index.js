// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境

const db = cloud.database();
const todos = db.collection('todos');
const current_timestamp = new Date().getTime();

// 云函数入口函数
exports.main = async (event, context) => {
  const _openid = cloud.getWXContext().OPENID;
  const arr = await todos.where({
    _openid,
    timestamp: current_timestamp
  }).get();
  if (arr.length) {
    const obj = arr[0];
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
        miniprogramState: 'developer'
      })
      return JSON.parse(JSON.stringify(result))
    } catch (error) {
      return error
    }
  }
  return {};
}