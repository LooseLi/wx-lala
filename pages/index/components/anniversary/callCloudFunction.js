// 调用云函数的临时代码
Page({
  data: {
    result: '点击按钮调用云函数',
    isLoading: false
  },

  // 调用云函数
  callUpdateFunction() {
    this.setData({
      isLoading: true,
      result: '正在调用云函数...'
    });

    wx.cloud.callFunction({
      name: 'updateAnniversaryImages',
      success: res => {
        console.log('云函数调用成功:', res.result);
        
        let resultText = '';
        if (res.result.success) {
          resultText = `成功更新${res.result.updatedCount}条记录`;
          wx.showToast({
            title: resultText,
            icon: 'success'
          });
        } else {
          resultText = '更新失败: ' + (res.result.message || '未知错误');
          wx.showToast({
            title: '更新失败',
            icon: 'none'
          });
        }

        this.setData({
          result: resultText,
          isLoading: false
        });
      },
      fail: err => {
        console.error('云函数调用失败:', err);
        this.setData({
          result: '调用失败: ' + JSON.stringify(err),
          isLoading: false
        });
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      }
    });
  }
});
