/**
 * 主题管理模块
 * 负责主题的加载、切换、保存等核心功能
 */
// 延迟初始化数据库，确保云API已经初始化
let db = null;
let themes = null;

/**
 * 初始化数据库连接
 * 确保在使用数据库前已经初始化云API
 */
function initDatabase() {
  // 如果数据库已初始化，直接返回
  if (db && themes) {
    return true;
  }

  try {
    // 检查云API是否存在
    if (!wx.cloud) {
      console.error('微信云开发未引入，请使用正确的小程序基础库以及开通云开发后再使用此功能');
      return false;
    }

    // 不尝试自动初始化，避免与 App.js 中的初始化冲突
    // 直接尝试获取数据库实例
    try {
      db = wx.cloud.database();
      themes = db.collection('themes');
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
    console.error('数据库未初始化，无法获取默认主题');
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
    console.error('数据库未初始化，无法获取用户主题');
    return null;
  }

  try {
    // 查询用户-主题关系
    const userThemeRes = await db
      .collection('user_themes')
      .where({
        user_id: openid,
        is_active: true,
      })
      .get();

    if (userThemeRes.data && userThemeRes.data.length > 0) {
      // 获取主题详情
      const themeId = userThemeRes.data[0].theme_id;
      const themeRes = await themes.doc(themeId).get();

      if (themeRes.data) {
        return themeRes.data;
      }
    }

    // 如果没有找到用户主题，返回null
    return null;
  } catch (error) {
    console.error('获取用户主题失败:', error);
    return null;
  }
}

/**
 * 加载主题
 * 优先加载用户选择的主题，如果没有则加载默认主题
 * @param {string} openid 用户openid
 * @returns {Promise} 返回加载的主题
 */
async function loadTheme(openid) {
  try {
    // 先尝试从本地存储获取缓存的主题
    const cachedTheme = wx.getStorageSync('currentTheme');
    if (cachedTheme) {
      console.log('从缓存加载主题:', cachedTheme.name);
      return cachedTheme;
    }

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

    // 缓存主题到本地存储
    if (theme) {
      wx.setStorageSync('currentTheme', theme);
    }

    return theme;
  } catch (error) {
    console.error('加载主题失败:', error);
    return null;
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
 */
async function applyTheme(theme) {
  if (!theme) return;

  try {
    // 如果主题有图片，获取可访问的URL
    if (theme.themeImage && theme.themeImage.startsWith('cloud://')) {
      // 创建一个新的主题对象，避免修改原始对象
      const processedTheme = { ...theme };
      processedTheme.themeImageUrl = await getCloudFileURL(theme.themeImage);

      // 存储处理后的主题到本地
      wx.setStorageSync('currentTheme', processedTheme);

      // 发布主题变更事件
      const app = getApp();
      if (!app.globalData.themeChangeListeners) {
        app.globalData.themeChangeListeners = [];
      }

      // 通知所有监听器
      app.globalData.themeChangeListeners.forEach(listener => {
        if (typeof listener === 'function') {
          listener(processedTheme);
        }
      });
    } else {
      // 如果没有云存储图片，直接应用原始主题
      // 存储当前主题到本地
      wx.setStorageSync('currentTheme', theme);

      // 发布主题变更事件
      const app = getApp();
      if (!app.globalData.themeChangeListeners) {
        app.globalData.themeChangeListeners = [];
      }

      // 通知所有监听器
      app.globalData.themeChangeListeners.forEach(listener => {
        if (typeof listener === 'function') {
          listener(theme);
        }
      });
    }
  } catch (error) {
    console.error('应用主题失败:', error);

    // 出错时仍然应用原始主题
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

module.exports = {
  getDefaultTheme,
  getUserTheme,
  loadTheme,
  applyTheme,
  onThemeChange,
};
