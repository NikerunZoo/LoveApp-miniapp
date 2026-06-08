// 纪念日
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

Page({
  data: { anniversaries: [], startDate: null, daysTogether: 0, yearCount: 0, daysToNext: 0, loading: true },

  onShow() { this.load(); },

  async load() {
    const couple = app.globalData.couple;
    if (!couple) { this.setData({ loading: false }); return; }

    const startDate = new Date(couple.start_date);
    const days = Math.floor((Date.now() - startDate.getTime()) / 86400000);
    const yearCount = new Date().getFullYear() - startDate.getFullYear();

    // 计算下一个纪念日
    let nextDate = new Date(new Date().getFullYear(), startDate.getMonth(), startDate.getDate());
    if (nextDate < new Date()) nextDate.setFullYear(nextDate.getFullYear() + 1);
    const daysToNext = Math.floor((nextDate - new Date()) / 86400000);

    try {
      logger.start('[Anniversary] load', { coupleId: couple.id });
      const res = await supabase.from('anniversary').select('*').eq('couple_id', couple.id).order('date', true).fetch();
      logger.log('[Anniversary] load 完成', { count: (res || []).length });
      this.setData({ anniversaries: res || [], startDate, daysTogether: days, yearCount, daysToNext, loading: false });
    } catch (e) { logger.error('[Anniversary] load', e); this.setData({ loading: false }); }
  },

  async editStartDate() {
    const res = await new Promise(r => wx.showModal({ title: '修改纪念日', editable: true, placeholderText: this.data.startDate.toISOString().split('T')[0], success: r }));
    if (!res.confirm || !res.content) return;
    const newDate = res.content;
    try {
      await supabase.from('couple').update({ start_date: newDate }).eq('id', app.globalData.couple.id).fetch();
      wx.showToast({ title: '已更新', icon: 'success' });
      this.load();
    } catch (e) { wx.showToast({ title: '更新失败', icon: 'none' }); }
  },

  async deleteItem(e) {
    const item = e.currentTarget.dataset.item;
    const res = await new Promise(r => wx.showModal({ title: `删除「${item.title}」？`, success: r }));
    if (!res.confirm) return;
    try {
      await supabase.from('anniversary').delete().eq('id', item.id).fetch();
      wx.showToast({ title: '已删除', icon: 'success' });
      this.load();
    } catch (e) { wx.showToast({ title: '删除失败', icon: 'none' }); }
  },

  async add() {
    const res = await new Promise(r => wx.showModal({ title: '添加纪念日', editable: true, placeholderText: '输入名称 如: 她生日 2025-12-20', success: r }));
    if (!res.confirm || !res.content) return;
    const parts = res.content.split(' ');
    const title = parts[0] || '纪念日';
    const dateStr = parts[1] || new Date().toISOString().split('T')[0];
    try {
      await supabase.from('anniversary').insert({ title, date: dateStr, couple_id: app.globalData.couple.id }).fetch();
      wx.showToast({ title: '已添加', icon: 'success' });
      this.load();
    } catch (e) { wx.showToast({ title: '添加失败', icon: 'none' }); }
  },
});
