const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const GAME_ID_2048 = 'game_2048';
const MAX_SCORE = 1e7;

function readStoredBest(doc) {
  if (!doc || !doc.bestScoreByGameId) {
    return 0;
  }
  const v = doc.bestScoreByGameId[GAME_ID_2048];
  return typeof v === 'number' && v >= 0 ? v : 0;
}

function isValidScore(score) {
  return Number.isFinite(score) && score >= 0 && score <= MAX_SCORE && Number.isInteger(score);
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  if (!userId) {
    return { success: false, error: '未登录' };
  }

  const { score: rawScore } = event || {};
  let score = null;
  if (rawScore != null) {
    score = Number(rawScore);
    if (!isValidScore(score)) {
      return { success: false, error: 'invalid score' };
    }
  }

  const userPoints = db.collection('userPoints');
  const now = new Date();

  try {
    const res = await userPoints.where({ userId }).get();

    if (res.data.length === 0) {
      if (score != null && score > 0) {
        await userPoints.add({
          data: {
            userId,
            totalPoints: 0,
            currentPoints: 0,
            lastUpdateDate: now,
            earnedCheckIn: 0,
            earnedGamesByGameId: {},
            spentMakeup: 0,
            spentReviveByGameId: {},
            spentThemes: 0,
            bestScoreByGameId: { [GAME_ID_2048]: score },
          },
        });
        return { success: true, bestScore: score };
      }
      return { success: true, bestScore: 0 };
    }

    const doc = res.data[0];
    const stored = readStoredBest(doc);

    if (score != null && score > stored) {
      await userPoints.doc(doc._id).update({
        data: {
          lastUpdateDate: now,
          [`bestScoreByGameId.${GAME_ID_2048}`]: score,
        },
      });
      return { success: true, bestScore: score };
    }

    return { success: true, bestScore: stored };
  } catch (err) {
    console.error('syncGame2048BestScore', err);
    return {
      success: false,
      error: err.message || '同步失败',
    };
  }
};
