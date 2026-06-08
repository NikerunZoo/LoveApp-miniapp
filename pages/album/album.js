// 回忆墙 — 相册
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

Page({
  data: { photos: [], loading: true },

  onShow() { this.load(); },

  async load() {
    const coupleId = app.globalData.couple?.id;
    if (!coupleId) { this.setData({ loading: false }); return; }
    try {
      logger.start('[Album] load', { coupleId });
      const res = await supabase.from('photo').select('*').eq('couple_id', coupleId).order('created_at', false).fetch();
      logger.log('[Album] load 完成', { count: (res || []).length });
      this.setData({ photos: res || [], loading: false });
    } catch (e) { logger.error('[Album] load', e); this.setData({ loading: false }); }
  },

  chooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: (res) => {
      const filePath = res.tempFilePaths[0];
      this.uploadImage(filePath);
    }});
  },

  async uploadImage(filePath) {
    wx.showLoading({ title: '上传中...' });
    const user = app.globalData.currentUser;
    const couple = app.globalData.couple;
    if (!user || !couple) return;

    try {
      logger.start('[Album] upload');
      // 小程序的 photo 表存 URL（微信云存储或直接用 temp path）
      // 暂时用 Supabase Storage 的 REST API 上传
      const fileName = `${couple.id}/${Date.now()}_${user.id}.jpg`;
      const uploadUrl = `https://xcawlsthoenofziaobgl.supabase.co/storage/v1/object/photo/${fileName}`;

      await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: uploadUrl,
          filePath,
          name: 'file',
          header: { 'apikey': supabase.apikey },
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(res);
            else reject(new Error('Upload failed'));
          },
          fail: reject,
        });
      });

      const publicUrl = `https://xcawlsthoenofziaobgl.supabase.co/storage/v1/object/public/photo/${fileName}`;

      await supabase.from('photo').insert({ url: publicUrl, user_id: user.id, couple_id: couple.id }).fetch();

      wx.hideLoading();
      logger.log('[Album] upload 成功');
      wx.showToast({ title: '上传成功', icon: 'success' });
      this.load();
    } catch (e) {
      logger.error('[Album] upload', e);
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  async deletePhoto(e) {
    const photo = e.currentTarget.dataset.photo;
    const user = app.globalData.currentUser;
    if (photo.user_id !== user.id) return wx.showToast({ title: '只能删除自己的照片', icon: 'none' });
    const res = await new Promise(r => wx.showModal({ title: '确定删除？', success: r }));
    if (!res.confirm) return;
    try {
      logger.start('[Album] delete', { id: photo.id });
      await supabase.from('photo').delete().eq('id', photo.id).fetch();
      wx.showToast({ icon: 'success', title: '已删除' });
      this.load();
    } catch (e) { logger.error('[Album] delete', e); wx.showToast({ icon: 'none', title: '删除失败' }); }
  },

  preview(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },
});
