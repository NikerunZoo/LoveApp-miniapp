// 写日记
const supabase = require('../../utils/supabase.js');
const app = getApp();
const MOODS = ['😊','🥰','😍','😐','😔','😤','🎉','😴'];

Page({
  data: { content: '', mood: '😊', moods: MOODS, sending: false },

  pickMood(e) { this.setData({ mood: e.currentTarget.dataset.mood }); },

  async save() {
    const content = this.data.content.trim();
    const user = app.globalData.currentUser;
    const couple = app.globalData.couple;
    if (!content) return wx.showToast({ title: '写点什么吧', icon: 'none' });
    if (!couple) return wx.showToast({ title: '请先配对', icon: 'none' });

    this.setData({ sending: true });
    try {
      await supabase.from('diary').insert({
        user_id: user.id, couple_id: couple.id, content, mood_emoji: this.data.mood,
      }).fetch();
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      this.setData({ sending: false });
    }
  },
});
