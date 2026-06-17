// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event;

  switch (action) {
    case 'getAssets':
      return await getAssets(OPENID);
    case 'saveAssets':
      return await saveAssets(OPENID, event.assets);
    case 'archiveYear':
      return await archiveYear(OPENID, event.year, event.assets, event.totalAmount, event.note);
    case 'deleteRecord':
      return await deleteRecord(OPENID, event.recordId);
    default:
      return { success: false, error: '未知操作' };
  }
};

async function getAssets(openid) {
  let currentAssets = [];
  let history = [];

  try {
    const configRes = await db
      .collection('assetCurrentConfig')
      .where({ openid })
      .limit(1)
      .get();
    currentAssets = configRes.data[0] ? configRes.data[0].assets : [];
  } catch (error) {
    console.error('getAssets config error:', error);
  }

  try {
    const historyRes = await db
      .collection('assetHistory')
      .where({ openid })
      .orderBy('year', 'desc')
      .limit(50)
      .get();
    history = historyRes.data;
  } catch (error) {
    console.error('getAssets history error:', error);
  }

  return { success: true, currentAssets, history };
}

async function saveAssets(openid, assets) {
  try {
    const existing = await db
      .collection('assetCurrentConfig')
      .where({ openid })
      .limit(1)
      .get();
    if (existing.data.length > 0) {
      await db.collection('assetCurrentConfig').doc(existing.data[0]._id).update({
        data: { assets },
      });
    } else {
      await db.collection('assetCurrentConfig').add({ data: { openid, assets } });
    }
    return { success: true };
  } catch (error) {
    console.error('saveAssets error:', error);
    return { success: false, error: String(error) };
  }
}

async function archiveYear(openid, year, assets, totalAmount, note) {
  try {
    const existing = await db
      .collection('assetHistory')
      .where({ openid, year })
      .limit(1)
      .get();
    if (existing.data.length > 0) {
      return { success: false, error: '该年份已有归档记录' };
    }
    await db.collection('assetHistory').add({
      data: {
        openid,
        year,
        assets,
        totalAmount,
        note: note || '',
        archivedAt: db.serverDate(),
      },
    });
    return { success: true };
  } catch (error) {
    console.error('archiveYear error:', error);
    return { success: false, error: String(error) };
  }
}

async function deleteRecord(openid, recordId) {
  try {
    const record = await db.collection('assetHistory').doc(recordId).get();
    if (record.data.openid !== openid) {
      return { success: false, error: '无权删除' };
    }
    await db.collection('assetHistory').doc(recordId).remove();
    return { success: true };
  } catch (error) {
    console.error('deleteRecord error:', error);
    return { success: false, error: String(error) };
  }
}
