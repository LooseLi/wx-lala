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
  const { prefix, limit = 100 } = event;

  try {
    // 获取文件列表
    const { fileList } = await cloud.getTempFileURL({
      fileList: [],
    });

    // 使用云存储API获取文件列表
    const { fileList: files } = await cloud.listFiles({
      prefix: prefix || '',
      limit: limit,
    });

    return {
      success: true,
      fileList: files,
      total: files.length,
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
