/**
 * 主题管理模块
 * 负责主题的加载、切换、保存等核心功能
 */
// 延迟初始化数据库，确保云API已经初始化
let db = null;
let themes = null;
let userInfo = null;
let userPoints = null;

/**
 * 初始化数据库连接
 * 确保在使用数据库前已经初始化云API
 * @param {boolean} forceInit 是否强制重新初始化
 */
function initDatabase(forceInit = false) {
  if (!forceInit && db && themes && userInfo && userPoints) {
    return true;
  }

  try {
    if (!wx.cloud) {
      console.error('微信云开发未引入，请使用正确的小程序基础库以及开通云开发后再使用此功能');
      return false;
    }

    // 直接尝试获取数据库实例
    try {
      db = wx.cloud.database();
      themes = db.collection('themes');
      userInfo = db.collection('userInfo');
      userPoints = db.collection('userPoints');
      console.log('数据库初始化成功');
      return true;
    } catch (dbError) {
      console.error('获取数据库实例失败，可能是云环境未初始化:', dbError);
      return false;
    }
  } catch (error) {
    console.error('初始化数据库失败:', error);
    return false;
  }
}

/**
 * 获取默认主题
 * @returns {Promise} 返回默认主题信息
 */
async function getDefaultTheme() {
  if (!initDatabase()) {
    return null;
  }

  try {
    const res = await themes
      .where({
        isDefault: true,
      })
      .get();

    if (res.data && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  } catch (error) {
    console.error('获取默认主题失败:', error);
    return null;
  }
}

/**
 * 获取用户当前使用的主题
 * @param {string} openid 用户openid
 * @returns {Promise} 返回用户当前使用的主题
 */
async function getUserTheme(openid) {
  if (!openid) {
    return null;
  }

  if (!initDatabase()) {
    return null;
  }

  try {
    // 查询用户信息获取当前主题ID
    const userInfoRes = await userInfo.where({ openid }).get();

    if (userInfoRes.data && userInfoRes.data.length > 0) {
      const user = userInfoRes.data[0];

      // 如果用户设置了当前主题，查询该主题详情
      if (user.currentTheme) {
        const themeRes = await themes.where({ id: user.currentTheme }).get();
        if (themeRes.data && themeRes.data.length > 0) {
          return themeRes.data[0];
        }
      }
    }

    return null;
  } catch (error) {
    console.error('获取用户主题失败:', error);
    return null;
  }
}

/**
 * 加载主题
 * 优先加载用户选择的主题，如果没有则加载默认主题
 * 添加时间戳验证机制，确保多设备同步
 * @param {string} openid 用户openid
 * @returns {Promise} 返回加载的主题
 */
async function loadTheme(openid) {
  try {
    let shouldRefreshUI = false;
    let initialTheme = null;

    // 先尝试从本地存储获取缓存的主题（快速显示）
    const cachedTheme = wx.getStorageSync('currentTheme');
    if (cachedTheme) {
      console.log('从缓存加载主题:', cachedTheme.name);
      initialTheme = cachedTheme;

      // 立即返回缓存的主题用于UI渲染，但继续在后台验证
      setTimeout(() => {
        validateAndUpdateTheme(openid, cachedTheme);
      }, 100);

      return cachedTheme;
    }

    // 如果没有缓存，同步加载主题
    return await loadAndCacheTheme(openid);
  } catch (error) {
    console.error('加载主题失败:', error);
    return null;
  }
}

/**
 * 验证并更新主题（后台操作）
 * @param {string} openid 用户openid
 * @param {Object} cachedTheme 缓存的主题
 */
async function validateAndUpdateTheme(openid, cachedTheme) {
  if (!openid) return;

  try {
    // 获取云端最新的主题
    let cloudTheme = await getUserTheme(openid);

    // 如果没有用户主题，获取默认主题
    if (!cloudTheme) {
      cloudTheme = await getDefaultTheme();
    }

    if (!cloudTheme) return;

    // 检查主题是否需要更新
    const needsUpdate = isThemeNeedsUpdate(cachedTheme, cloudTheme);

    if (needsUpdate) {
      console.log('检测到主题更新，从云端更新主题:', cloudTheme.name);

      // 为云端主题添加时间戳
      cloudTheme.lastModified = Date.now();

      // 处理云存储图片URL
      if (cloudTheme.themeImage && cloudTheme.themeImage.startsWith('cloud://')) {
        cloudTheme.themeImageUrl = await getCloudFileURL(cloudTheme.themeImage);
      }

      // 更新本地缓存
      wx.setStorageSync('currentTheme', cloudTheme);

      // 应用新主题（平滑过渡）
      applyTheme(cloudTheme);
    }
  } catch (error) {
    console.error('验证主题更新失败:', error);
  }
}

/**
 * 检查主题是否需要更新
 * @param {Object} cachedTheme 缓存的主题
 * @param {Object} cloudTheme 云端主题
 * @returns {boolean} 是否需要更新
 */
function isThemeNeedsUpdate(cachedTheme, cloudTheme) {
  // 如果ID不同，肯定需要更新
  if (cachedTheme.id !== cloudTheme.id) {
    return true;
  }

  // 如果云端主题有更新时间且比缓存的新，需要更新
  if (
    cloudTheme.updateTime &&
    (!cachedTheme.lastModified ||
      new Date(cloudTheme.updateTime) > new Date(cachedTheme.lastModified))
  ) {
    return true;
  }

  // 如果主题内容有变化（比如图片URL变了），需要更新
  if (cachedTheme.themeImage !== cloudTheme.themeImage) {
    return true;
  }

  return false;
}

/**
 * 加载并缓存主题（同步操作）
 * @param {string} openid 用户openid
 * @returns {Promise} 返回加载的主题
 */
async function loadAndCacheTheme(openid) {
  // 如果有openid，尝试获取用户主题
  let theme = null;
  if (openid) {
    theme = await getUserTheme(openid);
  }

  // 如果没有用户主题，获取默认主题
  if (!theme) {
    theme = await getDefaultTheme();
    console.log('加载默认主题:', theme ? theme.name : '无默认主题');
  } else {
    console.log('加载用户主题:', theme.name);
  }

  // 添加时间戳
  if (theme) {
    theme.lastModified = Date.now();

    // 处理云存储图片URL
    if (theme.themeImage && theme.themeImage.startsWith('cloud://')) {
      theme.themeImageUrl = await getCloudFileURL(theme.themeImage);
    }

    // 缓存主题到本地存储
    wx.setStorageSync('currentTheme', theme);
  }

  return theme;
}

/**
 * 获取用户可用的所有主题
 * 包括默认主题、价格为0的主题和已解锁的付费主题
 * @param {string} openid 用户openid
 * @returns {Promise<Array>} 返回用户可用的主题列表
 */
async function getUserAvailableThemes(openid) {
  if (!openid) {
    console.error('获取用户可用主题失败: openid为空');
    return [];
  }

  // 在关键函数中使用强制初始化以确保数据库连接
  if (!initDatabase(true)) {
    console.error('数据库未初始化，无法获取用户可用主题');
    return [];
  }

  try {
    console.log('开始获取主题数据');
    // 获取所有主题
    const themesRes = await themes.get();
    if (!themesRes.data || themesRes.data.length === 0) {
      console.warn('未找到任何主题数据');
      return [];
    }
    console.log('从数据库获取到主题数量:', themesRes.data.length);

    // 获取用户信息（获取已解锁主题列表）
    const userInfoRes = await userInfo.where({ openid }).get();
    const user = userInfoRes.data && userInfoRes.data.length > 0 ? userInfoRes.data[0] : null;

    if (!user) {
      console.warn('未找到用户信息');
    }

    // 获取用户当前使用的主题
    const currentThemeId = user && user.currentTheme ? user.currentTheme : null;
    console.log('当前主题ID:', currentThemeId);

    // 处理主题列表，添加解锁状态
    const availableThemes = themesRes.data.map(theme => {
      // 默认主题或价格为0的主题自动解锁
      let unlocked = theme.isDefault || theme.price === 0;

      // 检查用户是否已解锁该主题
      if (!unlocked && user && user.unlockedThemes) {
        unlocked = user.unlockedThemes.some(item => item.themeId === theme.id);
      }

      return {
        ...theme,
        unlocked,
        current: theme.id === currentThemeId,
      };
    });

    // 不进行排序，保持原始顺序
    console.log('处理后的主题数量:', availableThemes.length);
    return availableThemes;
  } catch (error) {
    console.error('获取用户可用主题失败:', error);
    return [];
  }
}

/**
 * 检查主题是否已解锁
 * @param {string} openid 用户openid
 * @param {string} themeId 主题ID
 * @returns {Promise<boolean>} 返回主题是否已解锁
 */
async function isThemeUnlocked(openid, themeId) {
  if (!openid || !themeId) {
    return false;
  }

  if (!initDatabase()) {
    return false;
  }

  try {
    // 先查询主题信息
    const themeRes = await themes.where({ id: themeId }).get();
    if (!themeRes.data || themeRes.data.length === 0) {
      return false;
    }

    const theme = themeRes.data[0];

    // 默认主题或价格为0的主题自动解锁
    if (theme.isDefault || theme.price === 0) {
      return true;
    }

    // 查询用户是否已解锁该主题
    const userInfoRes = await userInfo.where({ openid }).get();
    if (!userInfoRes.data || userInfoRes.data.length === 0) {
      return false;
    }

    const user = userInfoRes.data[0];

    if (!user.unlockedThemes) {
      return false;
    }

    return user.unlockedThemes.some(item => item.themeId === themeId);
  } catch (error) {
    console.error('检查主题解锁状态失败:', error);
    return false;
  }
}

/**
 * 解锁主题
 * @param {string} openid 用户openid
 * @param {string} themeId 主题ID
 * @returns {Promise<Object>} 返回解锁结果，包含success和message字段
 */
async function unlockTheme(openid, themeId) {
  if (!openid || !themeId) {
    return { success: false, message: '参数不完整' };
  }

  if (!initDatabase()) {
    return { success: false, message: '数据库未初始化' };
  }

  try {
    // 检查主题是否已解锁
    const alreadyUnlocked = await isThemeUnlocked(openid, themeId);
    if (alreadyUnlocked) {
      return { success: true, message: '主题已解锁' };
    }

    // 获取主题信息
    const themeRes = await themes.where({ id: themeId }).get();
    if (!themeRes.data || themeRes.data.length === 0) {
      return { success: false, message: '主题不存在' };
    }

    const theme = themeRes.data[0];
    const themePrice = theme.price || 0;

    // 使用themeServices云函数获取用户积分信息
    const userPointsRes = await wx.cloud.callFunction({
      name: 'themeServices',
      data: {
        action: 'getUserPoints',
      },
    });

    if (!userPointsRes.result || !userPointsRes.result.success) {
      console.error('获取用户积分失败:', userPointsRes);
      return { success: false, message: '获取用户积分信息失败' };
    }

    const currentPoints = userPointsRes.result.currentPoints || 0;

    // 检查积分是否足够
    if (currentPoints < themePrice) {
      return { success: false, message: '积分不足，加油签到喔~' };
    }

    // 使用themeServices云函数消费积分
    const consumeResult = await wx.cloud.callFunction({
      name: 'themeServices',
      data: {
        action: 'consumePoints',
        pointsCost: themePrice,
        themeId: themeId,
      },
    });

    if (!consumeResult.result || !consumeResult.result.success) {
      console.error('消费积分失败:', consumeResult);
      return { success: false, message: consumeResult.result?.error || '消费积分失败' };
    }

    // 获取用户信息
    const userInfoRes = await userInfo.where({ openid }).get();
    if (!userInfoRes.data || userInfoRes.data.length === 0) {
      return { success: false, message: '用户信息不存在' };
    }

    const user = userInfoRes.data[0];

    // 更新用户解锁主题记录
    const unlockRecord = {
      themeId,
      unlockTime: new Date(),
      price: themePrice,
    };

    try {
      if (user.unlockedThemes) {
        // 已有解锁记录，添加新记录
        await userInfo.where({ openid }).update({
          data: {
            unlockedThemes: db.command.push(unlockRecord),
          },
        });
      } else {
        // 首次解锁，创建数组
        await userInfo.where({ openid }).update({
          data: {
            unlockedThemes: [unlockRecord],
          },
        });
      }

      return {
        success: true,
        message: '👏快去试试新皮肤吧',
        currentPoints: consumeResult.result.currentPoints,
      };
    } catch (error) {
      console.error('更新用户解锁主题记录失败:', error);
      return { success: false, message: '数据库操作失败' };
    }
  } catch (error) {
    console.error('解锁主题失败:', error);
    return { success: false, message: '系统错误' };
  }
}

/**
 * 切换主题
 * @param {string} openid 用户openid
 * @param {string} themeId 主题ID
 * @returns {Promise<Object>} 返回切换结果，包含success和message字段
 */
async function switchTheme(openid, themeId) {
  if (!openid || !themeId) {
    return { success: false, message: '参数不完整' };
  }

  if (!initDatabase()) {
    return { success: false, message: '数据库未初始化' };
  }

  try {
    // 检查主题是否存在
    const themeRes = await themes.where({ id: themeId }).get();
    if (!themeRes.data || themeRes.data.length === 0) {
      return { success: false, message: '主题不存在' };
    }

    const theme = themeRes.data[0];

    // 检查主题是否已解锁
    const unlocked = await isThemeUnlocked(openid, themeId);
    if (!unlocked) {
      return { success: false, message: '主题未解锁' };
    }

    // 更新用户当前主题，并添加更新时间
    const now = new Date();
    await userInfo.where({ openid }).update({
      data: {
        currentTheme: themeId,
        themeUpdateTime: now,
      },
    });

    // 为主题添加时间戳
    theme.lastModified = Date.now();
    theme.updateTime = now;

    // 处理云存储图片URL
    if (theme.themeImage && theme.themeImage.startsWith('cloud://')) {
      theme.themeImageUrl = await getCloudFileURL(theme.themeImage);
    }

    // 更新本地缓存
    wx.setStorageSync('currentTheme', theme);

    // 直接更新全局状态，确保切换后立即生效
    const app = getApp();
    app.globalData.currentTheme = theme;

    // 应用新主题
    applyTheme(theme);

    return { success: true, message: '主题切换成功' };
  } catch (error) {
    console.error('切换主题失败:', error);
    return { success: false, message: '系统错误' };
  }
}

/**
 * 获取云存储文件的可访问 URL
 * @param {String} fileID 云存储文件ID（cloud://格式）
 * @returns {Promise<String>} 可访问的临时URL
 */
async function getCloudFileURL(fileID) {
  if (!fileID || typeof fileID !== 'string') {
    return '';
  }

  // 如果不是云存储文件ID格式，直接返回
  if (!fileID.startsWith('cloud://')) {
    return fileID;
  }

  try {
    // 获取临时文件URL
    const result = await wx.cloud.getTempFileURL({
      fileList: [fileID],
    });

    if (result && result.fileList && result.fileList[0] && result.fileList[0].tempFileURL) {
      return result.fileList[0].tempFileURL;
    } else {
      console.error('获取云文件URL失败:', result);
      return fileID; // 失败时返回原始 fileID
    }
  } catch (error) {
    console.error('获取云文件URL失败:', error);
    return fileID; // 失败时返回原始 fileID
  }
}

/**
 * 应用主题
 * @param {Object} theme 主题对象
 * @param {Boolean} smoothTransition 是否使用平滑过渡效果
 */
async function applyTheme(theme, smoothTransition = true) {
  if (!theme) return;

  try {
    // 获取应用实例
    const app = getApp();
    if (!app.globalData.themeChangeListeners) {
      app.globalData.themeChangeListeners = [];
    }

    // 更新全局状态，确保其他页面可以读取到最新主题
    app.globalData.currentTheme = theme;

    // 如果启用平滑过渡，先记录当前主题状态
    let isBackgroundTransition = false;
    if (smoothTransition) {
      // 检查是否是背景图片变更（最需要平滑过渡的情况）
      const currentTheme = wx.getStorageSync('currentTheme');
      if (currentTheme && currentTheme.id !== theme.id) {
        const oldBg = currentTheme.themeImageUrl || currentTheme.themeImage;
        const newBg = theme.themeImageUrl || theme.themeImage;
        isBackgroundTransition = oldBg !== newBg;
      }
    }

    // 如果主题有图片，获取可访问的URL
    if (theme.themeImage && theme.themeImage.startsWith('cloud://')) {
      // 创建一个新的主题对象，避免修改原始对象
      const processedTheme = { ...theme };
      processedTheme.themeImageUrl = await getCloudFileURL(theme.themeImage);

      // 存储处理后的主题到本地
      wx.setStorageSync('currentTheme', processedTheme);

      // 如果需要平滑过渡，使用动画效果
      if (smoothTransition && isBackgroundTransition) {
        // 先通知监听器准备过渡
        app.globalData.themeChangeListeners.forEach(listener => {
          if (typeof listener === 'function' && listener.name === 'prepareTransition') {
            listener(processedTheme, true);
          }
        });

        // 延迟一小段时间后应用新主题，让过渡效果更平滑
        setTimeout(() => {
          // 通知所有监听器
          app.globalData.themeChangeListeners.forEach(listener => {
            if (typeof listener === 'function') {
              listener(processedTheme);
            }
          });
        }, 50);
      } else {
        // 直接通知所有监听器
        app.globalData.themeChangeListeners.forEach(listener => {
          if (typeof listener === 'function') {
            listener(processedTheme);
          }
        });
      }
    } else {
      // 如果没有云存储图片，直接应用原始主题
      // 存储当前主题到本地
      wx.setStorageSync('currentTheme', theme);

      // 如果需要平滑过渡，使用动画效果
      if (smoothTransition && isBackgroundTransition) {
        // 先通知监听器准备过渡
        app.globalData.themeChangeListeners.forEach(listener => {
          if (typeof listener === 'function' && listener.name === 'prepareTransition') {
            listener(theme, true);
          }
        });

        // 延迟一小段时间后应用新主题
        setTimeout(() => {
          // 通知所有监听器
          app.globalData.themeChangeListeners.forEach(listener => {
            if (typeof listener === 'function') {
              listener(theme);
            }
          });
        }, 50);
      } else {
        // 直接通知所有监听器
        app.globalData.themeChangeListeners.forEach(listener => {
          if (typeof listener === 'function') {
            listener(theme);
          }
        });
      }
    }
  } catch (error) {
    console.error('应用主题失败:', error);

    // 出错时仍然应用原始主题，但不使用过渡效果
    wx.setStorageSync('currentTheme', theme);

    const app = getApp();
    if (app.globalData.themeChangeListeners) {
      app.globalData.themeChangeListeners.forEach(listener => {
        if (typeof listener === 'function') {
          listener(theme);
        }
      });
    }
  }
}

/**
 * 监听主题变化
 * @param {Function} callback 主题变化时的回调函数
 */
function onThemeChange(callback) {
  if (typeof callback !== 'function') return;

  const app = getApp();
  if (!app.globalData.themeChangeListeners) {
    app.globalData.themeChangeListeners = [];
  }

  // 添加到监听器列表
  app.globalData.themeChangeListeners.push(callback);

  // 返回取消监听的函数
  return function unsubscribe() {
    const index = app.globalData.themeChangeListeners.indexOf(callback);
    if (index !== -1) {
      app.globalData.themeChangeListeners.splice(index, 1);
    }
  };
}

/**
 * 获取用户积分
 * @returns {Promise<Object>} 返回用户积分信息
 */
async function getUserPoints() {
  try {
    const result = await wx.cloud.callFunction({
      name: 'themeServices',
      data: {
        action: 'getUserPoints',
      },
    });

    if (result.result && result.result.success) {
      return {
        success: true,
        currentPoints: result.result.currentPoints || 0,
        totalPoints: result.result.totalPoints || 0,
      };
    } else {
      console.error('获取用户积分失败:', result);
      return {
        success: false,
        error: result.result?.error || '获取积分失败',
      };
    }
  } catch (error) {
    console.error('调用积分云函数失败:', error);
    return {
      success: false,
      error: error.message || '系统错误',
    };
  }
}

module.exports = {
  getDefaultTheme,
  getUserTheme,
  loadTheme,
  applyTheme,
  onThemeChange,
  getUserAvailableThemes,
  isThemeUnlocked,
  unlockTheme,
  switchTheme,
  getUserPoints,
};
