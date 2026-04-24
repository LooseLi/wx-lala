const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const TIER_POINTS = {
  512: 100,
  1024: 200,
  2048: 500,
};

const MILESTONE_TIERS = [512, 1024, 2048];
const LOG_COLLECTION = 'game2048MilestoneLog';

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

  const { sessionId, tier } = event || {};
  if (typeof sessionId !== 'string' || sessionId.length < 4 || sessionId.length > 128) {
    return { success: false, error: 'invalid session' };
  }

  const tierNum = Number(tier);
  if (!MILESTONE_TIERS.includes(tierNum)) {
    return { success: false, error: 'invalid tier' };
  }

  const points = TIER_POINTS[tierNum];
  if (points == null) {
    return { success: false, error: 'invalid tier' };
  }

  const userPoints = db.collection('userPoints');
  const logCol = db.collection(LOG_COLLECTION);

  try {
    const existing = await logCol
      .where({
        userId,
        sessionId,
        tier: tierNum,
      })
      .get();

    if (existing.data && existing.data.length > 0) {
      const currentPoints = await getCurrentPoints(userId);
      return {
        success: true,
        already: true,
        grantedPoints: 0,
        currentPoints,
      };
    }

    const now = new Date();
    let newLogId = null;
    try {
      const addRes = await logCol.add({
        data: {
          userId,
          sessionId,
          tier: tierNum,
          points,
          createdAt: now,
        },
      });
      newLogId = addRes._id;

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
    } catch (inner) {
      if (newLogId) {
        try {
          await logCol.doc(newLogId).remove();
        } catch (e) {
          console.error('rollback milestone log', e);
        }
      }
      throw inner;
    }

    const currentPoints = await getCurrentPoints(userId);
    return {
      success: true,
      already: false,
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
