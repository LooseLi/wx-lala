// 高德key(小程序)
const LBS_KEY_WECHAT = '5e73baba61526e85b74d62d6d6b1fbda';
var amap = require('../lib/amap-wx.130');
var myAmapFun = new amap.AMapWX({
  key: LBS_KEY_WECHAT,
});

module.exports = {
  myAmapFun,
};
