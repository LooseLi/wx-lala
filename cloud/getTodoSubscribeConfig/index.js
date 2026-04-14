const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 供小程序 requestSubscribeMessage 使用；模板 ID 放在云函数环境变量 TODO_DIGEST_TEMPLATE_ID
 */
exports.main = async () => {
  const id = process.env.TODO_DIGEST_TEMPLATE_ID || '';
  return {
    success: true,
    tmplIds: id ? [id] : [],
  };
};
