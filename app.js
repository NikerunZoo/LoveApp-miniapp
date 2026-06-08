// app.js — 小程序入口
// 使用本地ID + Supabase，无邮箱密码，微信打开即用
const logger = require('./utils/logger.js');

App({
  onLaunch() {
    logger.log('[App] 小程序启动');
  },

  globalData: {
    currentUser: null,
    couple: null,
    isLoggedIn: false,
    isPaired: false,
  },
});
