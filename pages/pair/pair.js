// 配对页 — 创建/加入
const supabase = require('../../utils/supabase.js');
const app = getApp();

Page({
  data: {
    tab: 0, // 0=创建, 1=加入
    startDate: new Date().toISOString().split('T')[0],
    pairCode: '',
    joinCode: '',
    isCreating: false,
    hasCreated: false,
  },

  switchTab(e) { this.setData({ tab: parseInt(e.currentTarget.dataset.tab) }); },

  bindDateChange(e) { this.setData({ startDate: e.detail.value }); },
  onJoinCodeInput(e) { this.setData({ joinCode: e.detail.value }); },

  async createPair() {
    const userId = app.globalData.currentUser?.id;
    if (!userId) return wx.showToast({ title: '请先登录', icon: 'none' });
    this.setData({ isCreating: true });

    try {
      const code = String(100000 + Math.floor(Math.random() * 900000));
      const expiry = new Date(Date.now() + 3 * 60000).toISOString();

      const result = await supabase.from('couple').insert({
        start_date: this.data.startDate, user1_id: userId, pair_code: code, pair_code_expiry: expiry,
      }).fetch();

      await supabase.from('profiles').update({ couple_id: result[0]?.id }).eq('id', userId).fetch();

      app.globalData.couple = result[0];
      app.globalData.isPaired = true;

      this.setData({ pairCode: code, hasCreated: true, isCreating: false });
    } catch (e) {
      wx.showToast({ title: '创建失败', icon: 'none' });
      this.setData({ isCreating: false });
    }
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

      app.globalData.couple = couple;
      app.globalData.isPaired = true;
      wx.redirectTo({ url: '/pages/home/home' });
    } catch (e) {
      wx.showToast({ title: e.message || '加入失败', icon: 'none' });
    }
  },

  goScan() { wx.navigateTo({ url: '/pages/scan/scan' }); },
});
