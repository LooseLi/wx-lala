const showToast = (data) => {
  wx.showToast({
    title: data.title || '',
    duration: data.duration || 3000,
    icon: data.icon || 'none',
  });
}

module.exports = {
  showToast
}