// Splash → 自动登录（基于本地存储的用户ID）
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

function generateId() {
  return 'wx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

Page({
  async onLoad() {
    let userId = wx.getStorageSync('love_user_id');

    // 新用户：生成一个唯一ID
    if (!userId) {
      userId = generateId();
      wx.setStorageSync('love_user_id', userId);
      logger.log('[Splash] 新用户', { userId });
      setTimeout(() => wx.redirectTo({ url: '/pages/setup/setup' }), 1000);
      return;
    }

    // 老用户：从 profiles 恢复数据
    logger.start('[Splash] 恢复用户', { userId });
    try {
      const profiles = await supabase.from('profiles').select('*').eq('id', userId).fetch();
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;

      if (!profile) {
        // profile 丢了（比如清过数据库），去设置页
        setTimeout(() => wx.redirectTo({ url: '/pages/setup/setup' }), 1000);
        return;
      }

      app.globalData.currentUser = { id: userId, nickname: profile.nickname };
      app.globalData.isLoggedIn = true;

      // 恢复配对
      if (profile.couple_id) {
        const couples = await supabase.from('couple').select('*').eq('id', profile.couple_id).fetch();
        const couple = Array.isArray(couples) ? couples[0] : couples;
        if (couple) {
          app.globalData.couple = couple;
          app.globalData.isPaired = true;
          logger.log('[Splash] 配对已恢复');
        }
      }

      const dest = app.globalData.isPaired ? '/pages/home/home' : '/pages/pair/pair';
      setTimeout(() => wx.redirectTo({ url: dest }), 1000);
    } catch (e) {
      logger.error('[Splash] 恢复失败', e);
      setTimeout(() => wx.redirectTo({ url: '/pages/setup/setup' }), 1000);
    }
  },
});
