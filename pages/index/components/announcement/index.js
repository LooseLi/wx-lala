// 公告组件
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 公告列表
    announcements: {
      type: Array,
      value: [],
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 当前显示的公告索引
    current: 0,
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 公告切换事件
    onAnnouncementChange(e) {
      this.setData({
        current: e.detail.current,
      });
    },

    // 点击公告事件
    onAnnouncementTap(e) {
      const index = e.currentTarget.dataset.index;
      const announcement = this.data.announcements[index];

      // 触发点击事件，将公告信息传递给父组件
      this.triggerEvent('announcementclick', { announcement });
    },
  },
});
