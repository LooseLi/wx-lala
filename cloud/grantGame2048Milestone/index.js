const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/* 与客户端 MILESTONE_TIERS 对应；发奖以客户端本局去重为主，这里只做档位白名单 + 固定加分 */
const TIER_POINTS = {
  512: 100,
  1024: 200,
  2048: 500,
};

const MILESTONE_TIERS = [512, 1024, 2048];

/**
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getCurrentPoints(userId) {
  const res = await db.collection('userPoints').where({ userId }).get();
  if (!res.data || res.data.length === 0) {
    return 0;
  }
  return res.data[0].currentPoints || 0;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  if (!userId) {
    return { success: false, error: '未登录' };
  }

  const { tier } = event || {};
  const tierNum = Number(tier);
  if (!MILESTONE_TIERS.includes(tierNum)) {
    return { success: false, error: 'invalid tier' };
  }

  const points = TIER_POINTS[tierNum];
  if (points == null) {
    return { success: false, error: 'invalid tier' };
  }

  const userPoints = db.collection('userPoints');
  const now = new Date();

  try {
    const pointsResult = await userPoints.where({ userId }).get();
    if (pointsResult.data.length === 0) {
      await userPoints.add({
        data: {
          userId,
          totalPoints: points,
          currentPoints: points,
          lastUpdateDate: now,
        },
      });
    } else {
      await userPoints.where({ userId }).update({
        data: {
          totalPoints: _.inc(points),
          currentPoints: _.inc(points),
          lastUpdateDate: now,
        },
      });
    }

    const currentPoints = await getCurrentPoints(userId);
    return {
      success: true,
      grantedPoints: points,
      currentPoints,
    };
  } catch (err) {
    console.error('grantGame2048Milestone', err);
    return {
      success: false,
      error: err.message || '发放失败',
    };
  }
};
