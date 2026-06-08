// 首次使用 → 设置昵称
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

Page({
  data: { nickname: '', saving: false },

  onNicknameInput(e) { this.setData({ nickname: e.detail.value }); },

  async save() {
    const nickname = this.data.nickname.trim();
    if (!nickname) { wx.showToast({ title: '请输入昵称', icon: 'none' }); return; }

    const userId = wx.getStorageSync('love_user_id');
    this.setData({ saving: true });

    try {
      logger.start('[Setup] 创建用户', { userId, nickname });

      // 创建 profiles 记录
      await supabase.from('profiles').insert({ id: userId, nickname, mood_emoji: '😊' }).fetch();

      app.globalData.currentUser = { id: userId, nickname };
      app.globalData.isLoggedIn = true;

      logger.log('[Setup] 创建成功');
      wx.redirectTo({ url: '/pages/pair/pair' });
    } catch (e) {
      logger.error('[Setup] 创建失败', e);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      this.setData({ saving: false });
    }
  },
});
