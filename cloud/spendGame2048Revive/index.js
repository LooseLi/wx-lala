const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COST = 10;

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  if (!userId) {
    return { success: false, error: '未登录' };
  }

  try {
    const res = await db
      .collection('userPoints')
      .where({ userId })
      .get();
    if (!res.data || res.data.length === 0) {
      return { success: false, error: '无积分记录' };
    }
    const doc = res.data[0];
    if (doc.currentPoints < COST) {
      return { success: false, error: '积分不足' };
    }
    const newCurrent = doc.currentPoints - COST;
    await db.collection('userPoints').doc(doc._id).update({
      data: {
        currentPoints: newCurrent,
        lastUpdateDate: new Date(),
      },
    });
    return { success: true, currentPoints: newCurrent, spent: COST };
  } catch (err) {
    console.error('spendGame2048Revive', err);
    return { success: false, error: err.message || '扣费失败' };
  }
};
