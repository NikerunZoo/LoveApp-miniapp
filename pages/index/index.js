// Splash → 判断登录状态后跳转
const app = getApp();
Page({
  onLoad() {
    setTimeout(() => {
      const isLoggedIn = app.globalData.isLoggedIn || !!wx.getStorageSync('supabase_session');
      if (isLoggedIn) {
        wx.redirectTo({ url: app.globalData.isPaired ? '/pages/home/home' : '/pages/pair/pair' });
      } else {
        wx.redirectTo({ url: '/pages/login/login' });
      }
    }, 1500);
  },
});
