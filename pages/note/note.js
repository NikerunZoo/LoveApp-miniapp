// 纸条列表 — 收件箱/发件箱/收藏
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

Page({
  data: { tab: 0, received: [], sent: [], starred: [], loading: true },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.load();
  },

  async load() {
    const userId = app.globalData.currentUser?.id;
    if (!userId) { this.setData({ loading: false }); return; }
    this.setData({ loading: true });
    try {
      logger.start('[Note] load', { userId });
      const [r, s] = await Promise.all([
        supabase.from('note').select('*').eq('to_user_id', userId).order('created_at', false).limit(50).fetch(),
        supabase.from('note').select('*').eq('from_user_id', userId).order('created_at', false).limit(50).fetch(),
      ]);
      const received = r || [], sent = s || [];
      const starred = [...received.filter(n => n.is_starred), ...sent.filter(n => n.is_starred)];
      logger.log('[Note] load 完成', { received: received.length, sent: sent.length });
      this.setData({ received, sent, starred, loading: false });
    } catch (e) { logger.error('[Note] load', e); this.setData({ loading: false }); }
  },

  switchTab(e) { this.setData({ tab: parseInt(e.currentTarget.dataset.tab) }); },

  async markRead(e) {
    const note = e.currentTarget.dataset.note;
    if (note.is_read) return;
    try { logger.start('[Note] markRead', { noteId: note.id }); await supabase.from('note').update({ is_read: true }).eq('id', note.id).fetch(); this.load(); } catch (e) { logger.error('[Note] markRead', e); }
  },

  async toggleStar(e) {
    const note = e.currentTarget.dataset.note;
    try { logger.start('[Note] toggleStar', { noteId: note.id }); await supabase.from('note').update({ is_starred: !note.is_starred }).eq('id', note.id).fetch(); this.load(); } catch (e) { logger.error('[Note] toggleStar', e); }
  },

  goCompose() { wx.navigateTo({ url: '/pages/note-compose/note-compose' }); },

  getList() { return this.data.tab === 0 ? this.data.received : this.data.tab === 1 ? this.data.sent : this.data.starred; },
});
