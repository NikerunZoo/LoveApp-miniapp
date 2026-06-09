// 首页 — 计时器(已配对) / 配对卡片(未配对) + 心情 + 情话
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

const QUOTES = ['遇见你，是我这辈子最美丽的意外','我的心很小，只能装下一个你','世界再大，不如你一个微笑',
  '和你在一起的每一天，都是情人节','春风十里，不如你','余生很长，请多指教'];

Page({
  data: {
    isPaired: false,

    // 计时器
    daysTogether: 0,
    startDateStr: '',
    dailyQuote: '',
    moodEmoji: '😊',
    partnerMood: '😊',
    partnerName: 'TA',
    nickname: '',
    anniversary: '--',

    // 配对卡片
    pairTab: 0,
    pairStartDate: new Date().toISOString().split('T')[0],
    pairCode: '',
    joinCode: '',
    isCreating: false,
    hasCreated: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.initData();
  },

  async initData() {
    let couple = app.globalData.couple;
    const user = app.globalData.currentUser;

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

    const isPaired = !!(couple && couple.start_date);
    this.setData({ isPaired, nickname: user?.nickname || '我' });

    if (!isPaired) return;

    const startDate = new Date(couple.start_date);
    const days = Math.floor((Date.now() - startDate.getTime()) / 86400000);

    const now = new Date();
    let nextAnniv = new Date(now.getFullYear(), startDate.getMonth(), startDate.getDate());
    if (nextAnniv <= now) nextAnniv.setFullYear(nextAnniv.getFullYear() + 1);
    const anniversaryDays = Math.ceil((nextAnniv - now) / 86400000);

    this.setData({
      daysTogether: days,
      startDateStr: `${startDate.getFullYear()}.${String(startDate.getMonth()+1).padStart(2,'0')}.${String(startDate.getDate()).padStart(2,'0')}`,
      dailyQuote: QUOTES[days % QUOTES.length],
      anniversary: anniversaryDays,
    });

    // 对方信息
    try {
      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;
      if (partnerId) {
        const partnerRes = await supabase.from('profiles').select('nickname,mood_emoji').eq('id', partnerId).fetch();
        const partner = Array.isArray(partnerRes) ? partnerRes[0] : partnerRes;
        if (partner) this.setData({ partnerName: partner.nickname || 'TA', partnerMood: partner.mood_emoji || '😊' });
      }
    } catch (e) { /* ignore */ }
  },

  // ========== 配对逻辑 ==========
  switchPairTab(e) { this.setData({ pairTab: parseInt(e.currentTarget.dataset.tab) }); },
  bindPairDateChange(e) { this.setData({ pairStartDate: e.detail.value }); },
  onJoinCodeInput(e) { this.setData({ joinCode: e.detail.value }); },

  async createPair() {
    const userId = app.globalData.currentUser?.id;
    if (!userId) return wx.showToast({ title: '请先登录', icon: 'none' });
    this.setData({ isCreating: true });
    try {
      const code = String(100000 + Math.floor(Math.random() * 900000));
      const expiry = new Date(Date.now() + 30 * 60000).toISOString();
      const result = await supabase.from('couple').insert({
        start_date: this.data.pairStartDate, user1_id: userId, pair_code: code, pair_code_expiry: expiry,
      }).fetch();
      const coupleId = Array.isArray(result) ? result[0]?.id : result?.id;
      await supabase.from('profiles').update({ couple_id: coupleId }).eq('id', userId).fetch();
      app.globalData.couple = Array.isArray(result) ? result[0] : result;
      app.globalData.isPaired = true;
      logger.log('[Home] createPair 成功', { pairCode: code });
      this.setData({ pairCode: code, hasCreated: true, isCreating: false });
      this._startPolling();
    } catch (e) {
      logger.error('[Home] createPair', e);
      wx.showToast({ title: '创建失败', icon: 'none' });
      this.setData({ isCreating: false });
    }
  },

  _startPolling() {
    this._stopPolling();
    this._pollTimer = setInterval(() => this._pollCheck(), 3000);
  },

  _stopPolling() {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
  },

  async _pollCheck() {
    const coupleId = app.globalData.couple?.id;
    if (!coupleId) return;
    try {
      const res = await supabase.from('couple').select('user2_id').eq('id', coupleId).fetch();
      const c = Array.isArray(res) ? res[0] : res;
      if (c && c.user2_id) {
        this._stopPolling();
        const full = await supabase.from('couple').select('*').eq('id', coupleId).fetch();
        app.globalData.couple = Array.isArray(full) ? full[0] : full;
        app.globalData.isPaired = true;
        wx.showToast({ title: '💕 对方已加入!', icon: 'success' });
        this.setData({ isPaired: true, hasCreated: false });
        this.initData();
      }
    } catch (e) { /* ignore */ }
  },

  onHide() { this._stopPolling(); },
  onUnload() { this._stopPolling(); },

  async checkPairDone() {
    const coupleId = app.globalData.couple?.id;
    if (!coupleId) return;
    try {
      const res = await supabase.from('couple').select('*').eq('id', coupleId).fetch();
      const c = Array.isArray(res) ? res[0] : res;
      if (c && c.user2_id) {
        this._stopPolling();
        app.globalData.couple = c; app.globalData.isPaired = true;
        wx.showToast({ title: '对方已加入!', icon: 'success' });
        this.setData({ isPaired: true }); this.initData();
      } else { wx.showToast({ title: '对方还没加入', icon: 'none' }); }
    } catch (e) { /* ignore */ }
  },

  copyCode() { wx.setClipboardData({ data: this.data.pairCode }); },

  async joinPair() {
    const code = this.data.joinCode.trim();
    const userId = app.globalData.currentUser?.id;
    if (code.length !== 6) return wx.showToast({ title: '请输入6位配对码', icon: 'none' });
    if (!userId) return wx.showToast({ title: '请先登录', icon: 'none' });
    try {
      const res = await supabase.from('couple').select('*').eq('pair_code', code).fetch();
      if (!res || res.length === 0) throw new Error('配对码无效');
      const couple = res[0];
      if (couple.user1_id === userId) throw new Error('不能和自己配对');
      if (new Date(couple.pair_code_expiry) < new Date()) throw new Error('配对码已过期');
      if (couple.user2_id) throw new Error('该关系已有两人');
      await supabase.from('couple').update({ user2_id: userId }).eq('id', couple.id).fetch();
      await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', userId).fetch();
      app.globalData.couple = couple; app.globalData.isPaired = true;
      wx.showToast({ title: '配对成功!', icon: 'success' });
      this.setData({ isPaired: true }); this.initData();
    } catch (e) {
      wx.showToast({ title: e.message || '加入失败', icon: 'none' });
    }
  },

  goScan() { wx.navigateTo({ url: '/pages/scan/scan' }); },

  // ========== 已配对功能 ==========
  refreshQuote() { this.setData({ dailyQuote: QUOTES[Math.floor(Math.random() * QUOTES.length)] }); },
  async setMood(e) {
    const emoji = e.currentTarget.dataset.mood;
    const userId = app.globalData.currentUser?.id;
    if (!userId) return;
    this.setData({ moodEmoji: emoji });
    try { await supabase.from('profiles').update({ mood_emoji: emoji }).eq('id', userId).fetch(); } catch (e) { logger.error('Update mood', e); }
  },
  goAnniversary() { wx.navigateTo({ url: '/pages/anniversary/anniversary' }); },
});
