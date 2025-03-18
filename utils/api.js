// 从配置文件导入高德地图密钥
let config;
try {
  config = require('../config');
} catch (e) {
  console.error('请创建 config.js 文件并配置高德地图 API 密钥');
  throw new Error('缺少配置文件');
}

var amap = require('../lib/amap-wx.130');
var myAmapFun = new amap.AMapWX({
  key: config.map.key,
});

module.exports = {
  myAmapFun,
};
