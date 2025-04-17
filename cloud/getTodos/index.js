// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init();

const db = cloud.database();
const _ = db.command;
const MAX_LIMIT = 100;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 如果是获取今日未完成待办数量的请求
  if (event.action === 'getTodayUncompletedCount') {
    return await getTodayUncompletedCount(openid);
  }

  // 构建查询条件
  let query = { openid };

  // 根据完成状态筛选
  if (event.status !== undefined) {
    query.completed = event.status;
  }

  // 根据分类筛选
  if (event.category) {
    query.category = event.category;
  }

  // 根据优先级筛选
  if (event.priority) {
    query.priority = event.priority;
  }

  // 根据日期筛选
  if (event.date) {
    const startDate = new Date(event.date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(event.date);
    endDate.setHours(23, 59, 59, 999);

    query.dueDate = _.gte(startDate).and(_.lte(endDate));
  }

  try {
    // 先取出集合记录总数
    const countResult = await db.collection('todos').where(query).count();
    const total = countResult.total;

    // 计算需分几次取
    const batchTimes = Math.ceil(total / MAX_LIMIT);

    // 承载所有读操作的 promise 的数组
    const tasks = [];

    for (let i = 0; i < batchTimes; i++) {
      const promise = db
        .collection('todos')
        .where(query)
        .skip(i * MAX_LIMIT)
        .limit(MAX_LIMIT)
        .orderBy('priority', 'asc') // 按优先级排序（高优先级在前）
        .orderBy('createTime', 'desc') // 按创建时间倒序
        .get();

      tasks.push(promise);
    }

    // 等待所有数据获取完成
    const results = await Promise.all(tasks);

    // 合并查询结果
    return {
      data: results.reduce((acc, cur) => {
        return {
          data: acc.data.concat(cur.data),
          errMsg: acc.errMsg,
        };
      }).data,
      total,
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
};

/**
 * 获取今日未完成待办数量
 * @param {string} openid - 用户的openid
 * @returns {Promise<Object>} - 返回今日未完成待办数量
 */
async function getTodayUncompletedCount(openid) {
  try {
    // 获取今天的日期字符串（仅年月日，不含时间部分）
    const today = new Date();
    const todayDateStr = formatDate(today); // 例如: "2023-04-15"

    // 查询未完成的待办事项
    const result = await db
      .collection('todos')
      .where({
        openid: openid,
        completed: false,
      })
      .get();

    // 手动筛选当天的待办事项
    let todayTodos = 0;

    result.data.forEach(todo => {
      if (todo.dueDate) {
        // 将 dueDate 转为日期字符串格式，只保留年月日
        const dueDateStr = formatDate(new Date(todo.dueDate));

        // 比较日期字符串
        if (dueDateStr === todayDateStr) {
          todayTodos++;
        }
      }
    });

    return {
      count: todayTodos,
      success: true,
    };
  } catch (error) {
    console.error('getTodayUncompletedCount error:', error);
    return {
      count: 0,
      success: false,
      error,
    };
  }
}

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 * @param {Date} date - 日期对象
 * @returns {string} - 格式化后的日期字符串
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
