// 首页 — 计时器 + 心情 + 情话 + 功能入口
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

const QUOTES = ['遇见你，是我这辈子最美丽的意外','我的心很小，只能装下一个你','世界再大，不如你一个微笑',
  '和你在一起的每一天，都是情人节','春风十里，不如你','余生很长，请多指教'];
const MOODS = ['😍','😊','😐','😔','😤','🥰','😴','🎉'];

Page({
  data: {
    daysTogether: 0,
    startDate: null,
    startDateStr: '',
    dailyQuote: '',
    moodEmoji: '😊',
    partnerMood: '😊',
    partnerName: 'TA',
    nickname: '',
    email: '',
    unreadCount: 0,
  },

  onShow() {
    this.initData();
  },

  async initData() {
    let couple = app.globalData.couple;
    const user = app.globalData.currentUser;

    // 兜底：如果没恢复，尝试重新加载
    if (!couple && user) {
      try {
        const profiles = await supabase.from('profiles').select('couple_id').eq('id', user.id).fetch();
        const p = Array.isArray(profiles) ? profiles[0] : profiles;
        if (p && p.couple_id) {
          const couples = await supabase.from('couple').select('*').eq('id', p.couple_id).fetch();
          couple = Array.isArray(couples) ? couples[0] : couples;
          if (couple) { app.globalData.couple = couple; app.globalData.isPaired = true; }
        }
      } catch (e) { logger.error('[Home] loadCouple', e); }
    }

    if (user) {
      this.setData({ nickname: user.user_metadata?.nickname || user.email?.split('@')[0] || '我', email: user.email || '' });
    }

    if (couple) {
      const startDate = new Date(couple.start_date);
      const days = Math.floor((Date.now() - startDate.getTime()) / 86400000);
      this.setData({
        daysTogether: days,
        startDate,
        startDateStr: `${startDate.getFullYear()}.${String(startDate.getMonth()+1).padStart(2,'0')}.${String(startDate.getDate()).padStart(2,'0')}`,
        dailyQuote: QUOTES[days % QUOTES.length],
      });

      // 对方信息
      try {
        const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;
        if (partnerId) {
          const partnerRes = await supabase.from('profiles').select('nickname,mood_emoji').eq('id', partnerId).fetch();
          const partner = Array.isArray(partnerRes) ? partnerRes[0] : partnerRes;
          this.setData({ partnerName: partner.nickname || 'TA', partnerMood: partner.mood_emoji || '😊' });
        }
      } catch (e) { /* ignore */ }
    }

    // 获取纸条未读数
    if (user) {
      try {
        const notes = await supabase.from('note').select('id,is_read').eq('to_user_id', user.id).eq('is_read', 'false').fetch();
        this.setData({ unreadCount: notes?.length || 0 });
      } catch (e) { /* ignore */ }
    }
  },

  refreshQuote() {
    this.setData({ dailyQuote: QUOTES[Math.floor(Math.random() * QUOTES.length)] });
  },

  async setMood(e) {
    const emoji = e.currentTarget.dataset.mood;
    const userId = app.globalData.currentUser?.id;
    if (!userId) return;
    this.setData({ moodEmoji: emoji });
    try { await supabase.from('profiles').update({ mood_emoji: emoji }).eq('id', userId).fetch(); } catch (e) { logger.error('Update mood', e); }
  },

  goDiary() { wx.navigateTo({ url: '/pages/diary/diary' }); },
  goNote() { wx.navigateTo({ url: '/pages/note/note' }); },
  goAlbum() { wx.navigateTo({ url: '/pages/album/album' }); },
  goAnniversary() { wx.navigateTo({ url: '/pages/anniversary/anniversary' }); },
  goCompose() { wx.navigateTo({ url: '/pages/note-compose/note-compose' }); },

  // 退出登录
  logout() {
    wx.showModal({ title: '退出登录', content: '确定要退出吗？', success: (res) => {
      if (res.confirm) {
        wx.removeStorageSync('supabase_session');
        app.globalData = { currentUser: null, couple: null, isLoggedIn: false, isPaired: false };
        wx.redirectTo({ url: '/pages/login/login' });
      }
    }});
  },
});
