const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

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
      if (e.errCode === -1 || (e.errMsg && e.errMsg.includes('cannot find document'))) {
        return { success: true, dailyTodoRemindEnabled: false };
      }
      console.error('todoRemindSettings get', e);
      return { success: false, error: e.message || String(e) };
    }
  }

  if (action === 'set') {
    const on = !!enabled;
    try {
      await coll.doc(openid).update({
        data: {
          dailyTodoRemindEnabled: on,
          updateTime: db.serverDate(),
        },
      });
    } catch (e) {
      if (e.errCode === -1 || (e.errMsg && e.errMsg.includes('cannot find document'))) {
        await coll.doc(openid).set({
          data: {
            dailyTodoRemindEnabled: on,
            updateTime: db.serverDate(),
          },
        });
      } else {
        console.error('todoRemindSettings set', e);
        return { success: false, error: e.message || String(e) };
      }
    }
    return { success: true };
  }

  return { success: false, error: 'unknown_action' };
};
