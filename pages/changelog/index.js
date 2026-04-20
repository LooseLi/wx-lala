const changelog = require('../../data/changelog.js');

Page({
  data: {
    list: [],
  },

  onLoad() {
    const raw = Array.isArray(changelog) ? changelog : [];
    const list = raw
      .filter(
        item =>
          item &&
          typeof item.version === 'string' &&
          item.version &&
          typeof item.date === 'string' &&
          item.date &&
          Array.isArray(item.items) &&
          item.items.length > 0,
      )
      .map((item, index) => ({
        ...item,
        _key: `${item.version}-${item.date}-${index}`,
      }));
    this.setData({ list });
  },
});
