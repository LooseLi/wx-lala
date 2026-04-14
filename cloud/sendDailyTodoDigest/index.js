const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const MAX_LIMIT = 100;

function formatYMD(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 上海时区当前日历 YYYY-MM-DD */
function shanghaiYMD() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

function shanghaiHourMinute() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
  return { hour, minute };
}

function inDigestWindow() {
  const { hour, minute } = shanghaiHourMinute();
  return hour === 12 && minute >= 30 && minute <= 39;
}

/** 与待办页「今天」分组一致：无截止日期视为今天；有则比较 YYYY-MM-DD */
function isTodayTodo(todo, todayStr) {
  if (todo.completed) return false;
  if (!todo.dueDate) return true;
  return formatYMD(todo.dueDate) === todayStr;
}

function clampChars(str, maxLen) {
  if (!str) return '';
  const arr = Array.from(str);
  if (arr.length <= maxLen) return str;
  return arr.slice(0, Math.max(0, maxLen - 1)).join('') + '…';
}

/** 模板 thing12「备注消息」固定文案（不展示具体待办标题） */
const REMARK_THING12 = '记得及时处理喔~';

exports.main = async event => {
  /** 跳过 12:30 窗口（仅用于手动联调，勿挂在长期定时器上） */
  const skipWindow = !!(event.skipWindow || event.debug);
  /** 不真实发送、不写去重表 */
  const dryRun = !!event.dryRun;
  const forceOpenid = event.forceOpenid || '';

  if (!skipWindow && !inDigestWindow()) {
    return { success: true, skipped: true, reason: 'not_in_window' };
  }

  const templateId = process.env.TODO_DIGEST_TEMPLATE_ID;
  if (!templateId) {
    console.error('sendDailyTodoDigest: missing TODO_DIGEST_TEMPLATE_ID');
    return { success: false, error: 'missing_template_id' };
  }

  const phrase25 = process.env.TODO_DIGEST_PHRASE25 || '待完成';
  const thing17 = clampChars(process.env.TODO_DIGEST_THING17 || '今日待办', 20);
  const miniprogramState = process.env.MINIPROGRAM_STATE || 'formal';
  const page = process.env.TODO_DIGEST_PAGE || 'pages/index/components/todo/index';

  const todayStr = shanghaiYMD();
  let sent = 0;
  let skipped = 0;
  const errors = [];

  const processOpenid = async openid => {
    if (!openid) return;

    if (!dryRun) {
      const dup = await db
        .collection('todo_daily_remind')
        .where({ openid, dateStr: todayStr })
        .count();
      if (dup.total > 0) {
        skipped += 1;
        return;
      }
    }

    const todoRes = await db
      .collection('todos')
      .where({ openid, completed: false })
      .limit(MAX_LIMIT)
      .get();

    const todayTodos = todoRes.data.filter(t => isTodayTodo(t, todayStr));
    if (todayTodos.length === 0) {
      if (!dryRun) {
        await db.collection('todo_daily_remind').add({
          data: {
            openid,
            dateStr: todayStr,
            sent: false,
            skipReason: 'no_todos',
            createdAt: new Date(),
          },
        });
      }
      skipped += 1;
      return;
    }

    const thing12 = clampChars(REMARK_THING12, 20);
    const number16 = String(todayTodos.length);

    try {
      if (dryRun) {
        console.log('sendDailyTodoDigest dryRun', {
          openid,
          thing17,
          phrase25,
          number16,
          thing12,
        });
      } else {
        await cloud.openapi.subscribeMessage.send({
          touser: openid,
          templateId,
          page,
          miniprogramState,
          lang: 'zh_CN',
          data: {
            thing17: { value: thing17 },
            phrase25: { value: phrase25 },
            number16: { value: number16 },
            thing12: { value: thing12 },
          },
        });
      }

      if (!dryRun) {
        await db.collection('todo_daily_remind').add({
          data: {
            openid,
            dateStr: todayStr,
            sent: true,
            count: todayTodos.length,
            createdAt: new Date(),
          },
        });
      }
      sent += 1;
    } catch (e) {
      console.error('sendDailyTodoDigest send fail', openid, e);
      errors.push({ openid, err: e.message || String(e) });
    }
  };

  if (forceOpenid) {
    if (!dryRun) {
      const settings = await db
        .collection('user_settings')
        .doc(forceOpenid)
        .get()
        .catch(() => ({ data: null }));
      const enabled = !!(settings.data && settings.data.dailyTodoRemindEnabled);
      if (!enabled) {
        return { success: false, error: 'user_remind_disabled' };
      }
    }
    await processOpenid(forceOpenid);
    return {
      success: true,
      todayStr,
      sent,
      skipped,
      errors,
      skipWindow,
      dryRun,
    };
  }

  if (dryRun) {
    return { success: false, error: 'dryRun_requires_forceOpenid' };
  }

  let skip = 0;
  while (true) {
    const batch = await db
      .collection('user_settings')
      .where({ dailyTodoRemindEnabled: true })
      .skip(skip)
      .limit(MAX_LIMIT)
      .field({ _id: true })
      .get();

    if (!batch.data.length) break;

    for (const doc of batch.data) {
      await processOpenid(doc._id);
    }

    if (batch.data.length < MAX_LIMIT) break;
    skip += MAX_LIMIT;
  }

  return { success: true, todayStr, sent, skipped, errors, skipWindow, dryRun };
};
