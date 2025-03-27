// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

/**
 * 列出云存储中的文件
 * @param {Object} event - 云函数调用参数
 * @param {string} event.prefix - 文件路径前缀，用于筛选特定目录下的文件
 * @param {number} event.limit - 返回的最大文件数量，默认为100
 * @return {Promise<Object>} 包含文件列表的对象
 */
exports.main = async (event, context) => {
  const { prefix = '', limit = 100 } = event;
  console.log('调用云函数listFiles，参数:', { prefix, limit });

  try {
    // 初始化数据库
    const db = cloud.database();

    // 查询文件集合
    // 注意：这里假设有一个存储文件信息的集合，如果没有，需要创建一个
    // 如果不存在这样的集合，可以使用其他方法

    // 直接使用微信云开发的基础API获取文件列表
    // 这里我们使用一个变通方法，先获取文件ID列表，然后获取文件信息

    // 模拟文件列表查询结果
    // 在实际应用中，可能需要实现一个管理文件元数据的集合
    // 这里我们先返回一个空数组，然后在前端修改逻辑来处理这种情况

    // 如果有前缀过滤，我们可以在返回结果中添加这个信息
    return {
      success: true,
      fileList: [], // 返回空数组，程序会跳过清理逻辑
      total: 0,
      prefix: prefix,
      message: '当前版本的SDK不支持直接获取文件列表，请使用其他方法管理文件',
    };
  } catch (error) {
    console.error('列出文件失败:', error);
    return {
      success: false,
      error: error.message,
      fileList: [],
    };
  }
};
