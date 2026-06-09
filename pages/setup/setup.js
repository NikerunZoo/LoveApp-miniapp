// 首次使用 → 设置昵称
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

// 生成 UUID v4（兜底用）
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

Page({
  data: { nickname: '', saving: false },

  onLoad() {
    // 确保有 userId（防止跳过 splash 直接进入 setup）
    let userId = wx.getStorageSync('love_user_id');
    if (!userId || !userId.match(/^[0-9a-f-]{36}$/)) {
      userId = generateId();
      wx.setStorageSync('love_user_id', userId);
      logger.log('[Setup] 兜底生成 userId', { userId });
    }
  },

  onNicknameInput(e) { this.setData({ nickname: e.detail.value }); },

  async save() {
    const nickname = this.data.nickname.trim();
    if (!nickname) { wx.showToast({ title: '请输入昵称', icon: 'none' }); return; }

    const userId = wx.getStorageSync('love_user_id');
    if (!userId || !userId.match(/^[0-9a-f-]{36}$/)) {
      wx.showToast({ title: '用户ID无效，请重启小程序', icon: 'none' });
      return;
    }

    this.setData({ saving: true });

    try {
      logger.start('[Setup] 创建用户', { userId, nickname });

      // 创建 profiles 记录
      await supabase.from('profiles').insert({ id: userId, nickname, mood_emoji: '😊' }).fetch();

      app.globalData.currentUser = { id: userId, nickname };
      app.globalData.isLoggedIn = true;

      logger.log('[Setup] 创建成功');
      wx.switchTab({ url: '/pages/home/home' });
    } catch (e) {
      logger.error('[Setup] 创建失败', e);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      this.setData({ saving: false });
    }
  },
});
