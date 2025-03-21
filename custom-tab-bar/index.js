Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/icons/icon-home-unselected.png",
        selectedIconPath: "/icons/icon-home-selected.png"
      },
      {
        pagePath: "/pages/user/index",
        text: "我的",
        iconPath: "/icons/icon-mine-unselected.png",
        selectedIconPath: "/icons/icon-mine-selected.png"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      
      wx.switchTab({
        url
      });
      
      this.setData({
        selected: data.index
      });
    }
  }
})
