// 恋爱日记列表
const supabase = require('../../utils/supabase.js');
const app = getApp();

Page({
  data: { entries: [], loading: true },

  onShow() { this.load(); },

  async load() {
    const coupleId = app.globalData.couple?.id;
    if (!coupleId) { this.setData({ loading: false }); return; }
    try {
      const res = await supabase.from('diary').select('*').eq('couple_id', coupleId).order('created_at', false).limit(100).fetch();
      this.setData({ entries: res || [], loading: false });
    } catch (e) { this.setData({ loading: false }); }
  },

  async deleteEntry(e) {
    const entry = e.currentTarget.dataset.entry;
    const res = await new Promise(r => wx.showModal({ title: '确定删除这条日记？', success: r }));
    if (!res.confirm) return;
    try {
      await supabase.from('diary').delete().eq('id', entry.id).fetch();
      wx.showToast({ title: '已删除', icon: 'success' });
      this.load();
    } catch (e) { wx.showToast({ title: '删除失败', icon: 'none' }); }
  },

  goCompose() { wx.navigateTo({ url: '/pages/diary-compose/diary-compose' }); },
});
