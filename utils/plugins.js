const showToast = (data) => {
  wx.showToast({
    title: data.title || '',
    duration: data.duration || 3000,
    icon: data.icon || 'none',
  });
}

const showLoading = (text) => {
  wx.showLoading({
    title: text || '加载中'
  });
}

module.exports = {
  showToast,
  showLoading
}