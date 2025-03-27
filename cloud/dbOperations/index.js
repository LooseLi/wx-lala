// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

/**
 * 通用数据库操作云函数
 * 支持多种批量数据库操作，如字段添加、字段更新、记录删除等
 * 
 * @param {Object} event - 事件参数
 * @param {string} event.operation - 操作类型，支持：addField, updateField, deleteField, deleteRecords, queryRecords
 * @param {string} event.collection - 要操作的集合名称
 * @param {Object} event.query - 查询条件，用于筛选要操作的记录
 * @param {Object} event.data - 要更新的数据
 * @param {number} event.batchSize - 批处理大小，默认为100
 * @returns {Object} 操作结果
 */
exports.main = async (event, context) => {
  console.log('收到请求参数:', event);
  
  try {
    // 参数验证
    if (!event.operation) {
      return { success: false, message: '缺少必要参数: operation' };
    }
    if (!event.collection) {
      return { success: false, message: '缺少必要参数: collection' };
    }
    
    // 设置默认批处理大小
    const batchSize = event.batchSize || 100;
    
    // 根据操作类型执行不同的处理逻辑
    switch (event.operation) {
      case 'addField':
        return await addField(event.collection, event.query, event.data, batchSize);
      
      case 'updateField':
        return await updateField(event.collection, event.query, event.data, batchSize);
      
      case 'deleteField':
        return await deleteField(event.collection, event.query, event.fieldName, batchSize);
      
      case 'deleteRecords':
        return await deleteRecords(event.collection, event.query, batchSize);
      
      case 'queryRecords':
        return await queryRecords(event.collection, event.query, event.options);
      
      default:
        return {
          success: false,
          message: `不支持的操作类型: ${event.operation}`
        };
    }
  } catch (error) {
    console.error('执行操作时发生错误:', error);
    return {
      success: false,
      message: '操作失败',
      error: error.message
    };
  }
};

/**
 * 为符合条件的记录添加新字段
 * @param {string} collection - 集合名称
 * @param {Object} query - 查询条件
 * @param {Object} data - 要添加的字段数据
 * @param {number} batchSize - 批处理大小
 * @returns {Object} 操作结果
 */
async function addField(collection, query, data, batchSize) {
  console.log(`开始为 ${collection} 集合添加字段`);
  
  // 构建查询条件，查找不存在指定字段的记录
  const fieldName = Object.keys(data)[0];
  const whereCondition = query || {};
  
  // 如果没有指定查询条件，则添加不存在该字段的条件
  if (!query || Object.keys(query).length === 0) {
    whereCondition[fieldName] = _.exists(false);
  }
  
  // 获取符合条件的记录
  const { data: records } = await db.collection(collection)
    .where(whereCondition)
    .get();
  
  console.log(`找到 ${records.length} 条需要更新的记录`);
  
  if (records.length === 0) {
    return {
      success: true,
      message: '没有找到需要更新的记录',
      updatedCount: 0
    };
  }
  
  // 批量更新记录
  const tasks = [];
  
  // 分批处理记录
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    // 为每一批创建更新任务
    const batchTasks = batch.map(record => {
      return db.collection(collection).doc(record._id).update({
        data: data
      });
    });
    
    // 等待当前批次的所有更新完成
    const batchResults = await Promise.all(batchTasks);
    tasks.push(...batchResults);
    
    console.log(`已完成第 ${Math.floor(i / batchSize) + 1} 批更新，共 ${batch.length} 条记录`);
  }
  
  return {
    success: true,
    message: '添加字段成功',
    updatedCount: records.length,
    details: tasks
  };
}

/**
 * 更新符合条件的记录的字段值
 * @param {string} collection - 集合名称
 * @param {Object} query - 查询条件
 * @param {Object} data - 要更新的字段数据
 * @param {number} batchSize - 批处理大小
 * @returns {Object} 操作结果
 */
async function updateField(collection, query, data, batchSize) {
  console.log(`开始更新 ${collection} 集合的字段`);
  
  if (!query || Object.keys(query).length === 0) {
    return {
      success: false,
      message: '更新操作需要指定查询条件'
    };
  }
  
  // 获取符合条件的记录
  const { data: records } = await db.collection(collection)
    .where(query)
    .get();
  
  console.log(`找到 ${records.length} 条需要更新的记录`);
  
  if (records.length === 0) {
    return {
      success: true,
      message: '没有找到需要更新的记录',
      updatedCount: 0
    };
  }
  
  // 批量更新记录
  const tasks = [];
  
  // 分批处理记录
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    // 为每一批创建更新任务
    const batchTasks = batch.map(record => {
      return db.collection(collection).doc(record._id).update({
        data: data
      });
    });
    
    // 等待当前批次的所有更新完成
    const batchResults = await Promise.all(batchTasks);
    tasks.push(...batchResults);
    
    console.log(`已完成第 ${Math.floor(i / batchSize) + 1} 批更新，共 ${batch.length} 条记录`);
  }
  
  return {
    success: true,
    message: '更新字段成功',
    updatedCount: records.length,
    details: tasks
  };
}

/**
 * 删除符合条件的记录的指定字段
 * @param {string} collection - 集合名称
 * @param {Object} query - 查询条件
 * @param {string} fieldName - 要删除的字段名
 * @param {number} batchSize - 批处理大小
 * @returns {Object} 操作结果
 */
async function deleteField(collection, query, fieldName, batchSize) {
  console.log(`开始删除 ${collection} 集合的 ${fieldName} 字段`);
  
  if (!fieldName) {
    return {
      success: false,
      message: '删除字段操作需要指定字段名'
    };
  }
  
  // 构建查询条件，查找存在指定字段的记录
  const whereCondition = query || {};
  whereCondition[fieldName] = _.exists(true);
  
  // 获取符合条件的记录
  const { data: records } = await db.collection(collection)
    .where(whereCondition)
    .get();
  
  console.log(`找到 ${records.length} 条需要更新的记录`);
  
  if (records.length === 0) {
    return {
      success: true,
      message: '没有找到需要更新的记录',
      updatedCount: 0
    };
  }
  
  // 准备删除字段的数据
  const updateData = {};
  updateData[fieldName] = _.remove();
  
  // 批量更新记录
  const tasks = [];
  
  // 分批处理记录
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    // 为每一批创建更新任务
    const batchTasks = batch.map(record => {
      return db.collection(collection).doc(record._id).update({
        data: updateData
      });
    });
    
    // 等待当前批次的所有更新完成
    const batchResults = await Promise.all(batchTasks);
    tasks.push(...batchResults);
    
    console.log(`已完成第 ${Math.floor(i / batchSize) + 1} 批更新，共 ${batch.length} 条记录`);
  }
  
  return {
    success: true,
    message: '删除字段成功',
    updatedCount: records.length,
    details: tasks
  };
}

/**
 * 删除符合条件的记录
 * @param {string} collection - 集合名称
 * @param {Object} query - 查询条件
 * @param {number} batchSize - 批处理大小
 * @returns {Object} 操作结果
 */
async function deleteRecords(collection, query, batchSize) {
  console.log(`开始删除 ${collection} 集合中的记录`);
  
  if (!query || Object.keys(query).length === 0) {
    return {
      success: false,
      message: '删除操作需要指定查询条件，为防止误删除所有数据'
    };
  }
  
  // 获取符合条件的记录
  const { data: records } = await db.collection(collection)
    .where(query)
    .get();
  
  console.log(`找到 ${records.length} 条需要删除的记录`);
  
  if (records.length === 0) {
    return {
      success: true,
      message: '没有找到需要删除的记录',
      deletedCount: 0
    };
  }
  
  // 批量删除记录
  const tasks = [];
  
  // 分批处理记录
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    // 为每一批创建删除任务
    const batchTasks = batch.map(record => {
      return db.collection(collection).doc(record._id).remove();
    });
    
    // 等待当前批次的所有删除完成
    const batchResults = await Promise.all(batchTasks);
    tasks.push(...batchResults);
    
    console.log(`已完成第 ${Math.floor(i / batchSize) + 1} 批删除，共 ${batch.length} 条记录`);
  }
  
  return {
    success: true,
    message: '删除记录成功',
    deletedCount: records.length,
    details: tasks
  };
}

/**
 * 查询符合条件的记录
 * @param {string} collection - 集合名称
 * @param {Object} query - 查询条件
 * @param {Object} options - 查询选项，如排序、限制等
 * @returns {Object} 查询结果
 */
async function queryRecords(collection, query, options = {}) {
  console.log(`开始查询 ${collection} 集合中的记录`);
  
  // 创建查询
  let dbQuery = db.collection(collection);
  
  // 添加查询条件
  if (query && Object.keys(query).length > 0) {
    dbQuery = dbQuery.where(query);
  }
  
  // 添加排序
  if (options.orderBy) {
    const { field, direction } = options.orderBy;
    dbQuery = dbQuery.orderBy(field, direction || 'asc');
  }
  
  // 添加限制
  if (options.limit) {
    dbQuery = dbQuery.limit(options.limit);
  }
  
  // 添加偏移
  if (options.skip) {
    dbQuery = dbQuery.skip(options.skip);
  }
  
  // 执行查询
  const { data: records, errMsg } = await dbQuery.get();
  
  console.log(`查询到 ${records.length} 条记录`);
  
  return {
    success: true,
    message: '查询成功',
    count: records.length,
    data: records,
    errMsg
  };
}
