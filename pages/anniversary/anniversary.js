// 纪念日
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

Page({
  data: {
    anniversaries: [],
    startDate: null,
    startDateStr: '',
    daysTogether: 0,
    yearCount: 0,
    daysToNext: 0,
    loading: true,

    // 编辑纪念日弹窗
    showEditModal: false,
    editDateValue: '',

    // 添加自定义纪念日弹窗
    showAddModal: false,
    addTitleValue: '',
    addDateValue: '',
  },

  onShow() { this.load(); },
  noop() {},

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

      // 计算每个纪念日的剩余天数
      const anniversaries = (res || []).map(a => {
        const d = new Date(a.date);
        let next = new Date(new Date().getFullYear(), d.getMonth(), d.getDate());
        if (next < new Date()) next.setFullYear(next.getFullYear() + 1);
        return { ...a, daysLeft: Math.floor((next - new Date()) / 86400000) };
      });

      logger.log('[Anniversary] load 完成', { count: anniversaries.length });
      this.setData({
        anniversaries,
        startDate,
        startDateStr: `${startDate.getFullYear()}.${String(startDate.getMonth()+1).padStart(2,'0')}.${String(startDate.getDate()).padStart(2,'0')}`,
        daysTogether: days,
        yearCount,
        daysToNext,
        loading: false,
      });
    } catch (e) {
      logger.error('[Anniversary] load', e);
      this.setData({ loading: false });
    }
  },

  // ========== 编辑纪念日弹窗 ==========
  showEdit() {
    this.setData({
      showEditModal: true,
      editDateValue: this.data.startDate ? this.data.startDate.toISOString().split('T')[0] : '',
    });
  },

  onEditDateChange(e) {
    this.setData({ editDateValue: e.detail.value });
  },

  cancelEdit() {
    this.setData({ showEditModal: false });
  },

  async confirmEdit() {
    const newDate = this.data.editDateValue;
    if (!newDate) return;
    try {
      await supabase.from('couple').update({ start_date: newDate }).eq('id', app.globalData.couple.id).fetch();
      // 同步更新 globalData
      app.globalData.couple.start_date = newDate;
      wx.showToast({ title: '纪念日已更新', icon: 'success' });
      this.setData({ showEditModal: false });
      this.load();
    } catch (e) {
      wx.showToast({ title: '更新失败', icon: 'none' });
    }
  },

  // ========== 添加自定义纪念日弹窗 ==========
  showAdd() {
    this.setData({
      showAddModal: true,
      addTitleValue: '',
      addDateValue: new Date().toISOString().split('T')[0],
    });
  },

  onAddTitleInput(e) {
    this.setData({ addTitleValue: e.detail.value });
  },

  onAddDateChange(e) {
    this.setData({ addDateValue: e.detail.value });
  },

  cancelAdd() {
    this.setData({ showAddModal: false });
  },

  async confirmAdd() {
    const title = this.data.addTitleValue.trim();
    const date = this.data.addDateValue;
    if (!title) { wx.showToast({ title: '请输入名称', icon: 'none' }); return; }
    try {
      await supabase.from('anniversary').insert({
        title,
        date,
        couple_id: app.globalData.couple.id,
      }).fetch();
      wx.showToast({ title: '已添加', icon: 'success' });
      this.setData({ showAddModal: false });
      this.load();
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },

  // ========== 删除 ==========
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
});
