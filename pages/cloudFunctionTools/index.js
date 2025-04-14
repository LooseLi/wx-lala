// 云函数工具主页面
Page({
  data: {
    tools: [
      {
        name: '更新纪念日图片字段',
        description: '为所有没有images字段的纪念日记录添加空的images数组',
        functionName: 'dbOperations',
        id: 'updateImages',
        params: {
          operation: 'addField',
          collection: 'anniversaryList',
          data: { images: [] },
        },
      },
      {
        name: '查询纪念日记录',
        description: '查询所有纪念日记录，检查数据完整性',
        functionName: 'dbOperations',
        id: 'queryAnniversary',
        params: {
          operation: 'queryRecords',
          collection: 'anniversaryList',
          options: { limit: 100 },
        },
      },
      // 未来可以在这里添加更多工具
    ],
    currentResult: '',
    isLoading: false,
  },

  // 调用指定的云函数
  callCloudFunction(e) {
    const toolId = e.currentTarget.dataset.id;
    const tool = this.data.tools.find(item => item.id === toolId);

    if (!tool) {
      wx.showToast({
        title: '工具不存在',
        icon: 'none',
      });
      return;
    }

    this.setData({
      isLoading: true,
      currentResult: `正在调用云函数 ${tool.functionName}...`,
    });

    wx.cloud.callFunction({
      name: tool.functionName,
      data: tool.params || {},
      success: res => {
        let resultText = '';
        if (res.result.success) {
          resultText = `成功完成操作，${res.result.message || ''}`;
          if (res.result.updatedCount !== undefined) {
            resultText += `\n更新了 ${res.result.updatedCount} 条记录`;
          }
          wx.showToast({
            title: '操作成功',
            icon: 'success',
          });
        } else {
          resultText = `操作失败: ${res.result.message || '未知错误'}`;
          wx.showToast({
            title: '操作失败',
            icon: 'none',
          });
        }

        this.setData({
          currentResult: resultText,
          isLoading: false,
        });
      },
      fail: err => {
        this.setData({
          currentResult: `调用失败: ${JSON.stringify(err)}`,
          isLoading: false,
        });
        wx.showToast({
          title: '操作失败',
          icon: 'none',
        });
      },
    });
  },

  // 添加新工具（开发者功能）
  addNewTool() {
    wx.showToast({
      title: '此功能正在开发中',
      icon: 'none',
    });
  },
});
