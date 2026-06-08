// app.js — 小程序入口，初始化 Supabase SDK
const { initSupabase } = require('./utils/supabase.js');

App({
  onLaunch() {
    // 初始化 Supabase 客户端
    initSupabase();
    console.log('[LoveApp] 小程序启动');
  },

  globalData: {
    // 全局状态（类似 AuthProvider）
    currentUser: null,
    couple: null,
    isLoggedIn: false,
    isPaired: false,
  },
});
