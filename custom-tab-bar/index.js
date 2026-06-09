Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/home', text: '首页', icon: '💕' },
      { pagePath: '/pages/note/note', text: '纸条', icon: '💌' },
      { pagePath: '/pages/diary/diary', text: '日记', icon: '📝' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: '👤' },
    ],
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      const index = data.index;
      wx.switchTab({ url });
    },
  },
});
