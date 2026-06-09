// Splash → 自动登录（基于本地存储的用户ID）
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

// 生成 UUID v4（兼容 Supabase UUID 列类型）
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

Page({
  async onLoad() {
    let userId = wx.getStorageSync('love_user_id');

    // 兼容旧格式（非 UUID 的旧数据）
    if (userId && !userId.match(/^[0-9a-f-]{36}$/)) {
      wx.removeStorageSync('love_user_id');
      userId = null;
    }

    // 新用户：生成 UUID
    if (!userId) {
      userId = generateId();
      wx.setStorageSync('love_user_id', userId);
      logger.log('[Splash] 新用户', { userId });
      setTimeout(() => wx.redirectTo({ url: '/pages/setup/setup' }), 1000);
      return;
    }

    // 老用户：从 profiles 恢复数据，统一跳首页（配对状态由首页自己处理）
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

      // 恢复配对数据（如有）
      if (profile.couple_id) {
        const couples = await supabase.from('couple').select('*').eq('id', profile.couple_id).fetch();
        const couple = Array.isArray(couples) ? couples[0] : couples;
        if (couple) {
          app.globalData.couple = couple;
          app.globalData.isPaired = true;
          logger.log('[Splash] 配对已恢复');
        }
      }

      // 无论是否已配对，统一进首页（首页是 Tab 页，用 switchTab）
      setTimeout(() => wx.switchTab({ url: '/pages/home/home' }), 1000);
    } catch (e) {
      logger.error('[Splash] 恢复失败', e);
      setTimeout(() => wx.redirectTo({ url: '/pages/setup/setup' }), 1000);
    }
  },
});
