// 写纸条
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

Page({
  data: { content: '', sending: false, phrases: ['想你了🥺','晚安🌙','mua💋','在干嘛🧐','爱你❤️'] },

  onContentInput(e) { this.setData({ content: e.detail.value }); },

  insertPhrase(e) {
    const phrase = e.currentTarget.dataset.phrase;
    this.setData({ content: this.data.content ? `${this.data.content}\n${phrase}` : phrase });
  },

  async send() {
    const content = this.data.content.trim();
    const user = app.globalData.currentUser;
    const couple = app.globalData.couple;
    if (!content) return wx.showToast({ title: '写点什么吧', icon: 'none' });
    if (!user || !couple) return wx.showToast({ title: '请先配对', icon: 'none' });

    const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;
    if (!partnerId) return wx.showToast({ title: '对方还未加入', icon: 'none' });

    this.setData({ sending: true });
    try {
      logger.start('[NoteCompose] send', { toUserId: partnerId });
      await supabase.from('note').insert({
        from_user_id: user.id, from_user_name: user.user_metadata?.nickname || '我',
        to_user_id: partnerId, content, is_read: false, is_starred: false,
      }).fetch();
      logger.log('[NoteCompose] send 成功');
      wx.showToast({ title: '已发送', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (e) {
      logger.error('[NoteCompose] send', e);
      wx.showToast({ title: '发送失败', icon: 'none' });
      this.setData({ sending: false });
    }
  },
});
