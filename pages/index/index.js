// Splash → 恢复 Session + 配对数据后再跳转
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

Page({
  async onLoad() {
    const hasSession = !!wx.getStorageSync('supabase_session');
    if (!hasSession) {
      setTimeout(() => wx.redirectTo({ url: '/pages/login/login' }), 1000);
      return;
    }

    // 尝试验证 session 并恢复数据
    try {
      logger.start('[Splash] 恢复Session');

      // 获取当前用户
      const userRes = await supabase.request('GET', '/auth/v1/user');
      app.globalData.currentUser = userRes;
      app.globalData.isLoggedIn = true;

      // 恢复配对数据
      const userId = userRes.id;
      const profiles = await supabase.from('profiles').select('couple_id').eq('id', userId).fetch();
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;

      if (profile && profile.couple_id) {
        const couples = await supabase.from('couple').select('*').eq('id', profile.couple_id).fetch();
        const couple = Array.isArray(couples) ? couples[0] : couples;
        if (couple) {
          app.globalData.couple = couple;
          app.globalData.isPaired = true;
          logger.log('[Splash] 配对已恢复');
        }
      }

      // 根据配对状态跳转
      const dest = app.globalData.isPaired ? '/pages/home/home' : '/pages/pair/pair';
      setTimeout(() => wx.redirectTo({ url: dest }), 1000);
    } catch (e) {
      // Session 过期，重新登录
      logger.error('[Splash] Session恢复失败', e);
      wx.removeStorageSync('supabase_session');
      setTimeout(() => wx.redirectTo({ url: '/pages/login/login' }), 1000);
    }
  },
});
