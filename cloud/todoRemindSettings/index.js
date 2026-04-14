const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function isDocumentNotFoundError(e) {
  if (!e) return false;
  if (e.errCode === -1) return true;
  const msg = `${e.errMsg || ''}${e.message || ''}`;
  return /cannot find document|document.*not exist|不存在|未找到/i.test(msg);
}

/**
 * action: 'get' | 'set'
 * set 时传 enabled: boolean
 */
exports.main = async event => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { action, enabled } = event;

  if (!openid) {
    return { success: false, error: 'no_openid' };
  }

  const coll = db.collection('user_settings');

  if (action === 'get') {
    try {
      const res = await coll.doc(openid).get();
      return {
        success: true,
        dailyTodoRemindEnabled: !!(res.data && res.data.dailyTodoRemindEnabled),
      };
    } catch (e) {
      if (isDocumentNotFoundError(e)) {
        return { success: true, dailyTodoRemindEnabled: false };
      }
      console.error('todoRemindSettings get', e);
      return { success: false, error: e.message || String(e) };
    }
  }

  if (action === 'set') {
    const on = !!enabled;
    try {
      // 统一用 set：不存在则创建，存在则覆盖该文档（避免 update 未命中时未走 set）
      await coll.doc(openid).set({
        data: {
          dailyTodoRemindEnabled: on,
          updateTime: db.serverDate(),
        },
      });
      return { success: true };
    } catch (e) {
      console.error('todoRemindSettings set', e);
      return { success: false, error: e.message || String(e), errMsg: e.errMsg };
    }
  }

  return { success: false, error: 'unknown_action' };
};
