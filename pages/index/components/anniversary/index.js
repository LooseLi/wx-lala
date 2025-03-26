const db = wx.cloud.database();
const anniversary = db.collection('anniversaryList');
const BASE = require('../../../../utils/base');
const plugins = require('../../../../utils/plugins');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    dialog: false,
    name: '',
    date: BASE.dateFormat(new Date(), 'yyyy-MM-dd'),
    id: '', // 某条纪念日id
    type: 'add', // 新增还是修改
    tempImages: [], // 临时存储选择的图片
    uploadedImages: [], // 已上传的图片
    imagesToDelete: [], // 需要删除的图片fileID列表
  },

  openDialog() {
    this.setData({
      dialog: true,
    });
  },

  closeDialog() {
    this.setData({
      dialog: false,
    });
    // 关闭对话框时重置数据，包括清空待删除图片列表
    this.resetData();
  },

  bindInputChange(e) {
    this.setData({
      name: e.detail.value,
    });
  },

  bindDateChange(e) {
    this.setData({
      date: e.detail.value,
    });
  },

  resetData() {
    this.setData({
      name: '',
      date: BASE.dateFormat(new Date(), 'yyyy-MM-dd'),
      tempImages: [],
      uploadedImages: [],
      imagesToDelete: [], // 重置待删除图片列表
    });
  },

  async getAnniversary() {
    plugins.showLoading();
    // 小程序直接获取列表一次请求上限 20 条
    // 用云函数获取列表一次请求上限 100 条，因此可能需要分批获取
    wx.cloud.callFunction({
      name: 'getAnniversary',
      success: res => {
        const { result } = res;
        const { data } = result;
        data.forEach(item => {
          item.days = BASE.dateDiff(item.date);
        });
        // 使用 sort 方法降序排序
        data.sort((a, b) => b.days - a.days);
        this.setData({
          list: data,
        });
        wx.hideLoading();
      },
      fail: err => {
        console.log('查询失败', err);
        wx.hideLoading();
      },
    });
  },

  // 选择图片
  chooseImages() {
    wx.chooseMedia({
      count: 9, // 最多可以选择的图片张数，最多9张
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: res => {
        // 获取已选择的图片临时路径
        const newTempImages = res.tempFiles.map(file => ({
          tempFilePath: file.tempFilePath,
          size: file.size,
          selected: true // 标记为已选中状态
        }));
        
        // 合并新选择的图片和已有的图片
        const currentTempImages = this.data.tempImages;
        const allImages = [...currentTempImages, ...newTempImages];
        
        // 限制图片数量最多9张
        const finalImages = allImages.slice(0, 9);
        
        this.setData({
          tempImages: finalImages
        });
      }
    });
  },

  // 删除选择的图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const tempImages = this.data.tempImages;
    tempImages.splice(index, 1);
    this.setData({
      tempImages
    });
  },

  // 预览临时图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.tempImages.map(item => item.tempFilePath);
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 预览已上传图片
  previewUploadedImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.uploadedImages.map(item => item.fileID);
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 删除已上传图片
  deleteUploadedImage(e) {
    const index = e.currentTarget.dataset.index;
    const uploadedImages = this.data.uploadedImages;
    
    // 获取要删除的图片信息
    const imageToDelete = uploadedImages[index];
    
    // 将要删除的图片fileID添加到待删除列表
    const imagesToDelete = this.data.imagesToDelete;
    imagesToDelete.push(imageToDelete.fileID);
    
    // 从界面上移除该图片
    uploadedImages.splice(index, 1);
    
    this.setData({
      uploadedImages,
      imagesToDelete
    });
    
    wx.showToast({
      title: '已移除',
      icon: 'none'
    });
  },

  // 上传图片到云存储
  async uploadImages() {
    if (this.data.tempImages.length === 0) {
      return [];
    }
    
    // 显示上传中提示
    wx.showLoading({
      title: '上传图片中...',
      mask: true
    });
    
    try {
      // 获取格式化的日期作为文件夹名
      const folderName = this.data.date.replace(/-/g, '');
      
      // 创建上传任务数组
      const uploadTasks = this.data.tempImages.map((image, index) => {
        // 获取文件扩展名
        const tempFilePath = image.tempFilePath;
        const extension = tempFilePath.substring(tempFilePath.lastIndexOf('.'));
        
        // 构建文件名：image序号+时间戳+扩展名
        const fileName = `image${index + 1}_${Date.now()}${extension}`;
        
        // 完整云存储路径
        const cloudPath = `anniversaryImages/${folderName}/${fileName}`;
        
        // 返回上传Promise
        return wx.cloud.uploadFile({
          cloudPath,
          filePath: tempFilePath
        });
      });
      
      // 并行上传所有图片
      const uploadResults = await Promise.all(uploadTasks);
      
      // 处理上传结果
      const uploadedImages = uploadResults.map(result => ({
        fileID: result.fileID,
        path: `anniversaryImages/${folderName}/${result.fileID.split('/').pop()}`
      }));
      
      wx.hideLoading();
      return uploadedImages;
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '图片上传失败',
        icon: 'none'
      });
      console.error('上传图片失败:', error);
      return [];
    }
  },

  add() {
    // 先处理需要删除的图片（如果有）
    this.deleteCloudImages().then(() => {
      // 然后上传新图片
      return this.uploadImages();
    }).then(uploadedImages => {
      anniversary.add({
        data: {
          name: this.data.name,
          date: this.data.date,
          canEdit: true,
          images: uploadedImages || [], // 添加图片数组字段
        },
        success: res => {
          wx.hideLoading();
          wx.showToast({
            title: '创建成功',
            icon: 'success',
            duration: 2000
          });
          // 清空待删除列表
          this.setData({
            imagesToDelete: []
          });
          this.closeDialog();
          this.getAnniversary();
        },
        fail: err => {
          wx.hideLoading();
          wx.showToast({
            title: '创建失败',
            icon: 'none',
            duration: 2000
          });
          console.error('创建纪念日失败:', err);
        }
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      });
      console.error('创建失败:', err);
    });
  },

  update() {
    // 先处理需要删除的图片
    this.deleteCloudImages().then(() => {
      // 然后上传新图片
      return this.uploadImages();
    }).then(newUploadedImages => {
      // 合并已有的图片和新上传图片
      const allImages = [...this.data.uploadedImages, ...newUploadedImages];
      
      anniversary.doc(this.data.id).update({
        data: {
          name: this.data.name,
          date: this.data.date,
          images: allImages, // 更新图片数组
        },
        success: res => {
          wx.hideLoading();
          wx.showToast({
            title: '更新成功',
            icon: 'success',
            duration: 2000
          });
          // 清空待删除列表
          this.setData({
            imagesToDelete: []
          });
          this.closeDialog();
          this.getAnniversary();
        },
        fail: err => {
          wx.hideLoading();
          wx.showToast({
            title: '更新失败',
            icon: 'none',
            duration: 2000
          });
          console.error('更新纪念日失败:', err);
        }
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      });
      console.error('更新失败:', err);
    });
  },

  // 保存
  onSave() {
    // 验证表单
    if (!this.data.name || this.data.name.trim() === '') {
      wx.showToast({
        title: '这是什么纪念日呀~',
        icon: 'none',
        duration: 2000,
      });
      return;
    }

    // 显示加载中提示
    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    if (this.data.type === 'add') {
      this.add();
    }
    if (this.data.type === 'update') {
      this.update();
    }
  },

  // 点击新增图标
  onAdd() {
    this.setData({
      type: 'add',
    });
    this.openDialog();
  },

  // 更新
  onUpdate(e) {
    const obj = e.currentTarget.dataset.eventIndex;
    if (obj.canEdit) {
      this.setData({
        name: obj.name,
        date: obj.date,
        id: obj._id,
        type: 'update',
        uploadedImages: obj.images || [], // 加载已有图片
        tempImages: [] // 清空临时图片
      });
      this.openDialog();
    }
  },

  // 查看纪念日图片
  viewImages(e) {
    // 注意：catchtap 已经阻止了事件冒泡，不需要再调用 stopPropagation
    // 在微信小程序中，catchtap 等同于 bindtap + stopPropagation
    
    const item = e.currentTarget.dataset.eventIndex;
    if (item.images && item.images.length > 0) {
      // 提取所有图片的fileID用于预览
      const imageUrls = item.images.map(img => img.fileID);
      
      wx.previewImage({
        current: imageUrls[0], // 默认显示第一张
        urls: imageUrls,
        showmenu: true, // 显示长按菜单，允许用户保存图片
        success: () => {
          console.log('图片预览成功');
        },
        fail: err => {
          console.error('图片预览失败:', err);
          wx.showToast({
            title: '图片加载失败',
            icon: 'none'
          });
        }
      });
    }
  },
  
  // 删除云存储中的图片
  deleteCloudImages() {
    return new Promise((resolve, reject) => {
      const { imagesToDelete } = this.data;
      
      // 如果没有需要删除的图片，直接返回
      if (imagesToDelete.length === 0) {
        resolve();
        return;
      }
      
      // 显示加载中提示
      wx.showLoading({
        title: '处理图片中...',
        mask: true
      });
      
      // 从云存储中删除图片
      wx.cloud.deleteFile({
        fileList: imagesToDelete,
        success: res => {
          console.log('删除云存储图片成功:', res.fileList);
          resolve();
        },
        fail: err => {
          console.error('删除云存储图片失败:', err);
          // 即使删除失败也继续执行
          resolve();
        }
      });
    });
  },

  // 删除
  onDelete(e) {
    wx.showModal({
      title: '提示🥹',
      content: '删掉就找不回来咯，确定要删咩',
      success: res => {
        if (res.confirm) {
          const item = e.currentTarget.dataset.eventIndex;
          const id = item._id;
          
          // 显示加载中提示
          wx.showLoading({
            title: '删除中...',
            mask: true
          });
          
          // 如果有图片，先删除云存储中的图片
          if (item.images && item.images.length > 0) {
            // 提取所有图片的fileID
            const fileIDs = item.images.map(img => img.fileID);
            
            // 删除云存储中的文件
            wx.cloud.deleteFile({
              fileList: fileIDs,
              success: res => {
                console.log('删除云存储文件成功', res.fileList);
              },
              fail: err => {
                console.error('删除云存储文件失败:', err);
              },
              complete: () => {
                // 无论图片删除成功与否，都删除纪念日记录
                anniversary.doc(id).remove({
                  success: res => {
                    wx.hideLoading();
                    this.getAnniversary();
                  },
                  fail: err => {
                    wx.hideLoading();
                    wx.showToast({
                      title: '删除失败',
                      icon: 'none'
                    });
                  }
                });
              }
            });
          } else {
            // 如果没有图片，直接删除纪念日记录
            anniversary.doc(id).remove({
              success: res => {
                wx.hideLoading();
                this.getAnniversary();
              },
              fail: err => {
                wx.hideLoading();
                wx.showToast({
                  title: '删除失败',
                  icon: 'none'
                });
              }
            });
          }
        } else if (res.cancel) {
          console.log('用户点击取消');
        }
      },
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    await this.getAnniversary();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {},
});
