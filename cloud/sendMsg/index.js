// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
}); // 使用当前云环境

const db = cloud.database();
const todos = db.collection('todos');
const current_timestamp = new Date().getTime();

// 云函数入口函数
exports.main = async (event, context) => {
  // 5分钟的毫秒数
  const fiveMinu = 5 * 60 * 1000;
  const minTimestamp = current_timestamp - fiveMinu;
  const maxTimestamp = current_timestamp + fiveMinu;
  const _openid = cloud.getWXContext().OPENID;
  const _ = db.command;
  const arr = await todos
    .where({
      _openid,
      timestamp: _.and(_.gt(minTimestamp), _.lt(maxTimestamp)),
    })
    .get();
  console.log(arr);
  if (arr.length) {
    const obj = arr[0];
    try {
      const result = await cloud.openapi.subscribeMessage.send({
        touser: cloud.getWXContext().OPENID, // 通过 getWXContext 获取 OPENID
        page: 'user/index',
        data: {
          thing1: {
            value: obj.title,
          },
          time2: {
            value: obj.time,
          },
        },
        // 使用订阅消息模板ID
        // 注意：云函数中无法直接引用项目根目录的配置文件
        // 如需修改，请直接更新此处的模板ID
        templateId: 'GqXCTV7Ws4p-ADpD40fZz1mIfMd6Ab_71jOqkmKdkII',
        miniprogramState: 'trial',
      });
      return JSON.parse(JSON.stringify(result));
    } catch (error) {
      return error;
    }
  }
  return {};
};
