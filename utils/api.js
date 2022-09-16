// 高德天气api
const LBS_BASE_URL = 'https://restapi.amap.com/v3'
// 高德key
const LBS_KEY = '0d5e9e7ec4881a5c3ed194b2338a6aca'
/**
 * 封装 高德请求函数
 */
const LBSRequest = (url, method, data) => {
  data.key = LBS_KEY;
  return new Promise((resolve, reject) => {
    wx.request({
      method,
      url,
      data,
      header: {
        'content-type': 'application/json',
      },
      success(res) {
        resolve(res.data)
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

module.exports = {
  // 经纬度转城市编码
  getCityCode: (data) => {
    return LBSRequest(LBS_BASE_URL + '/geocode/regeo', 'get', data)
  },
  // 获取所在地天气
  getCityWeather: (data) => {
    return LBSRequest(LBS_BASE_URL + '/weather/weatherInfo', 'get', data)
  }
}