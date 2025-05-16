// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init();

const db = cloud.database();
const _ = db.command;

const config = require('./config');
const templateId = config.subscribeMessage.todoReminder.templateId;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 根据action参数执行不同的操作
  switch (event.action) {
    case 'subscribe':
      return await subscribe(openid, event);
    case 'unsubscribe':
      return await unsubscribe(openid);
    case 'getStatus':
      return await getStatus(openid);
    default:
      return {
        success: false,
        message: '未知的操作类型',
      };
  }
};

/**
 * 订阅提醒
 * @param {string} openid 用户openid
 * @param {object} event 事件对象
 * @returns {object} 操作结果
 */
async function subscribe(openid, event) {
  try {
    // 计算订阅过期时间（7天后）
    const expireTime = new Date();
    expireTime.setDate(expireTime.getDate() + 7);

    // 构建提醒数据
    const reminderData = {
      openid,
      isActive: true,
      tmplId: templateId, // 模板ID
      expireTime,
      reminderTime: '17:20', // 固定提醒时间
      reminderTypes: {
        todo: true,
        weather: false,
        anniversary: false,
        countdown: false,
      },
      reminderSettings: {
        todo: {
          includeImportant: true,
          includeTomorrow: true,
        },
      },
      updateTime: new Date(),
    };

    // 查询是否已有记录
    const userReminder = await db.collection('userReminders').where({ openid }).get();

    if (userReminder.data.length > 0) {
      // 更新现有记录
      await db.collection('userReminders').doc(userReminder.data[0]._id).update({
        data: reminderData,
      });

      return {
        success: true,
        message: '订阅更新成功',
        isNew: false,
      };
    } else {
      // 创建新记录
      reminderData.createTime = new Date();
      await db.collection('userReminders').add({
        data: reminderData,
      });

      return {
        success: true,
        message: '订阅创建成功',
        isNew: true,
      };
    }
  } catch (error) {
    console.error('订阅提醒失败:', error);
    return {
      success: false,
      message: '订阅提醒失败',
      error: error,
    };
  }
}

/**
 * 取消订阅提醒
 * @param {string} openid 用户openid
 * @returns {object} 操作结果
 */
async function unsubscribe(openid) {
  try {
    // 查询是否已有记录
    const userReminder = await db.collection('userReminders').where({ openid }).get();

    if (userReminder.data.length > 0) {
      // 更新为未激活状态
      await db
        .collection('userReminders')
        .doc(userReminder.data[0]._id)
        .update({
          data: {
            isActive: false,
            updateTime: new Date(),
          },
        });

      return {
        success: true,
        message: '取消订阅成功',
      };
    } else {
      return {
        success: false,
        message: '未找到订阅记录',
      };
    }
  } catch (error) {
    console.error('取消订阅失败:', error);
    return {
      success: false,
      message: '取消订阅失败',
      error: error,
    };
  }
}

/**
 * 获取订阅状态
 * @param {string} openid 用户openid
 * @returns {object} 订阅状态
 */
async function getStatus(openid) {
  try {
    const userReminder = await db.collection('userReminders').where({ openid }).get();

    if (userReminder.data.length > 0) {
      const reminder = userReminder.data[0];
      const now = new Date();

      // 检查订阅是否已过期
      const isExpired = reminder.expireTime < now;

      return {
        success: true,
        data: {
          ...reminder,
          isExpired,
        },
      };
    } else {
      return {
        success: true,
        data: null,
      };
    }
  } catch (error) {
    console.error('获取订阅状态失败:', error);
    return {
      success: false,
      message: '获取订阅状态失败',
      error: error,
    };
  }
}
