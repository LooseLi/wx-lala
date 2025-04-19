// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { action, themeId, pointsCost } = event;

  switch (action) {
    case 'getUserPoints':
      return await getUserPoints(userId);
    case 'consumePoints':
      return await consumePoints(userId, pointsCost, themeId);
    default:
      return {
        success: false,
        error: '未知的操作类型',
      };
  }
};

/**
 * 获取用户积分
 * @param {string} userId 用户ID
 */
async function getUserPoints(userId) {
  try {
    // 查询userPoints集合
    const pointsRes = await db
      .collection('userPoints')
      .where({
        userId,
      })
      .get();

    // 如果找到记录，返回积分信息
    if (pointsRes.data && pointsRes.data.length > 0) {
      const pointsRecord = pointsRes.data[0];
      return {
        success: true,
        currentPoints: pointsRecord.currentPoints || 0,
        totalPoints: pointsRecord.totalPoints || 0,
      };
    }

    // 没有找到记录，创建初始积分记录
    await db.collection('userPoints').add({
      data: {
        userId,
        currentPoints: 0,
        totalPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      currentPoints: 0,
      totalPoints: 0,
      message: '已创建初始积分记录',
    };
  } catch (error) {
    console.error('获取用户积分失败:', error);
    return {
      success: false,
      error: error.message || '获取积分失败',
    };
  }
}

/**
 * 消费积分购买主题
 * @param {string} userId 用户ID
 * @param {number} pointsCost 消费的积分
 * @param {string} themeId 主题ID
 */
async function consumePoints(userId, pointsCost, themeId) {
  const transaction = await db.startTransaction();

  try {
    // 查询用户当前积分
    const userPointsRes = await transaction
      .collection('userPoints')
      .where({
        userId,
      })
      .get();

    if (!userPointsRes.data || userPointsRes.data.length === 0) {
      await transaction.rollback();
      return {
        success: false,
        error: '用户积分记录不存在',
      };
    }

    const userPoints = userPointsRes.data[0];

    // 检查积分是否足够
    if (userPoints.currentPoints < pointsCost) {
      await transaction.rollback();
      return {
        success: false,
        error: '积分不足',
      };
    }

    // 更新积分
    const newCurrentPoints = userPoints.currentPoints - pointsCost;
    await transaction
      .collection('userPoints')
      .doc(userPoints._id)
      .update({
        data: {
          currentPoints: newCurrentPoints,
          updatedAt: new Date(),
        },
      });

    // 记录购买记录
    await transaction.collection('themePurchases').add({
      data: {
        userId,
        themeId,
        pointsCost,
        purchasedAt: new Date(),
      },
    });

    // 提交事务
    await transaction.commit();

    return {
      success: true,
      currentPoints: newCurrentPoints,
      message: '主题购买成功',
    };
  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    console.error('消费积分失败:', error);
    return {
      success: false,
      error: error.message || '消费积分失败',
    };
  }
}
