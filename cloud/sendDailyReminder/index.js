// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init();

const db = cloud.database();
const _ = db.command;

const config = require('./config');
const templateId = config.subscribeMessage.todoReminder.templateId;

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取当前日期和时间
    const now = new Date();
    const currentDate = formatDate(now);

    // 获取所有已订阅且未过期的用户
    const reminders = await db
      .collection('userReminders')
      .where({
        isActive: true,
        expireTime: _.gt(now),
      })
      .get();

    if (reminders.data.length === 0) {
      return {
        success: true,
        message: '没有需要发送提醒的用户',
        date: currentDate,
      };
    }

    // 处理每个用户的提醒
    const sendPromises = reminders.data.map(async reminder => {
      // 检查今天是否已经发送过提醒
      if (reminder.lastRemindDate === currentDate) {
        return {
          openid: reminder.openid,
          status: 'already_sent_today',
        };
      }

      // 获取用户今日待办事项
      const todayStart = new Date(currentDate);
      const todayEnd = new Date(currentDate);
      todayEnd.setHours(23, 59, 59, 999);

      const todos = await db
        .collection('todos')
        .where({
          openid: reminder.openid,
          dueDate: _.gte(todayStart).and(_.lte(todayEnd)),
          completed: false,
        })
        .get();

      // 获取明天的待办事项
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = formatDate(tomorrow);
      const tomorrowStart = new Date(tomorrowDate);
      const tomorrowEnd = new Date(tomorrowDate);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const tomorrowTodos = await db
        .collection('todos')
        .where({
          openid: reminder.openid,
          dueDate: _.gte(tomorrowStart).and(_.lte(tomorrowEnd)),
          completed: false,
        })
        .get();

      // 如果今天和明天都没有待办事项，可以选择不发送提醒
      if (todos.data.length === 0 && tomorrowTodos.data.length === 0) {
        return {
          openid: reminder.openid,
          status: 'no_todos',
        };
      }

      // 发送订阅消息
      try {
        // 构建提醒内容
        let reminderContent = '';
        if (todos.data.length > 0) {
          reminderContent += `今日有${todos.data.length}项待办`;

          // 如果有重要待办（这里假设待办有priority字段，值大于等于2表示重要）
          const importantTodos = todos.data.filter(todo => todo.priority >= 2);
          if (importantTodos.length > 0) {
            reminderContent += `，其中${importantTodos.length}项重要`;
          }
        }

        if (tomorrowTodos.data.length > 0) {
          if (reminderContent) {
            reminderContent += '；';
          }
          reminderContent += `明日有${tomorrowTodos.data.length}项待办`;
        }

        // 如果内容为空，提供默认内容
        if (!reminderContent) {
          reminderContent = '点击查看您的待办清单';
        }

        // 发送订阅消息
        await cloud.openapi.subscribeMessage.send({
          touser: reminder.openid,
          templateId: templateId,
          data: {
            // 根据您的模板格式填充数据，以下是示例
            thing1: { value: '待办事项提醒' },
            thing2: { value: reminderContent },
            date3: { value: currentDate },
            thing4: { value: '点击查看详情' },
          },
          page: '/pages/index/components/todo/index', // 点击消息后跳转的页面
          miniprogramState: 'trial', // 修改为 trial，表示体验版
        });

        // 更新最后发送时间
        await db
          .collection('userReminders')
          .doc(reminder._id)
          .update({
            data: {
              lastRemindDate: currentDate,
              updateTime: now,
            },
          });

        return {
          openid: reminder.openid,
          status: 'success',
          todoCount: todos.data.length,
          tomorrowTodoCount: tomorrowTodos.data.length,
        };
      } catch (error) {
        console.error('发送订阅消息失败:', error);

        // 如果是用户取消订阅导致的失败，更新订阅状态
        if (error.errCode === 43101) {
          await db
            .collection('userReminders')
            .doc(reminder._id)
            .update({
              data: {
                isActive: false,
                updateTime: now,
              },
            });
        }

        return {
          openid: reminder.openid,
          status: 'failed',
          error: error.errCode || error.message,
        };
      }
    });

    const results = await Promise.all(sendPromises);

    // 统计发送结果
    const stats = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      alreadySent: results.filter(r => r.status === 'already_sent_today').length,
      noTodos: results.filter(r => r.status === 'no_todos').length,
      failed: results.filter(r => r.status === 'failed').length,
    };

    return {
      success: true,
      results,
      stats,
      date: currentDate,
    };
  } catch (error) {
    console.error('处理每日提醒失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}
