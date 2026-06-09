// 我的 — 个人中心
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

Page({
  data: {
    nickname: '',
    avatarLetter: '💕',
    userIdShort: '',
    isPaired: false,
    partnerName: 'TA',
    unreadCount: 0,

    // 调试模式（连续点头像3次）
    showDebug: false,
    _debugTapCount: 0,

    // 修改昵称弹窗
    showEditModal: false,
    editNicknameValue: '',

    // 切换 UUID 弹窗
    showSwitchModal: false,
    switchUuidValue: '',
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.load();
  },

  load() {
    const user = app.globalData.currentUser;
    const couple = app.globalData.couple;
    const nickname = user?.nickname || '未设置';
    this.setData({
      nickname,
      avatarLetter: nickname[0] || '💕',
      userIdShort: (user?.id || '').slice(0, 8),
      isPaired: !!(couple && couple.start_date),
      partnerName: couple?.partnerName || 'TA',
    });

    // 纸条未读数
    if (user) {
      supabase.from('note').select('id,is_read').eq('to_user_id', user.id).eq('is_read', 'false').fetch()
        .then(notes => this.setData({ unreadCount: notes?.length || 0 }))
        .catch(() => {});
    }
  },

  // 切换调试模式：连续点头像3次
  toggleDebug() {
    this.data._debugTapCount++;
    if (this.data._debugTapCount >= 3) {
      this.data._debugTapCount = 0;
      this.setData({ showDebug: !this.data.showDebug });
      wx.showToast({ title: this.data.showDebug ? '调试模式已开启' : '调试模式已关闭', icon: 'none' });
    }
    clearTimeout(this._debugTimer);
    this._debugTimer = setTimeout(() => { this.data._debugTapCount = 0; }, 1500);
  },

  // ========== 修改昵称 ==========
  editNickname() {
    this.setData({ showEditModal: true, editNicknameValue: this.data.nickname });
  },
  onEditNickInput(e) { this.setData({ editNicknameValue: e.detail.value }); },
  cancelEditNickname() { this.setData({ showEditModal: false }); },
  async confirmEditNickname() {
    const newName = this.data.editNicknameValue.trim();
    if (!newName) { wx.showToast({ title: '昵称不能为空', icon: 'none' }); return; }
    const userId = app.globalData.currentUser?.id;
    if (!userId) return;
    try {
      await supabase.from('profiles').update({ nickname: newName }).eq('id', userId).fetch();
      app.globalData.currentUser.nickname = newName;
      this.setData({ showEditModal: false });
      this.load();
      wx.showToast({ title: '昵称已更新', icon: 'success' });
    } catch (e) { wx.showToast({ title: '更新失败', icon: 'none' }); }
  },

  // ========== 调试：复制 UUID ==========
  copyUuid() {
    const userId = wx.getStorageSync('love_user_id');
    wx.setClipboardData({ data: userId });
    wx.showToast({ title: 'UUID 已复制', icon: 'success' });
  },

  // ========== 调试：切换 UUID ==========
  showSwitch() { this.setData({ showSwitchModal: true, switchUuidValue: '' }); },
  onSwitchUuidInput(e) { this.setData({ switchUuidValue: e.detail.value }); },
  cancelSwitchUuid() { this.setData({ showSwitchModal: false }); },
  confirmSwitchUuid() {
    const newId = this.data.switchUuidValue.trim();
    if (!newId || !newId.match(/^[0-9a-f-]{36}$/)) {
      wx.showToast({ title: 'UUID 格式无效', icon: 'none' }); return;
    }
    wx.setStorageSync('love_user_id', newId);
    app.globalData = { currentUser: null, couple: null, isLoggedIn: false, isPaired: false };
    wx.reLaunch({ url: '/pages/index/index' });
  },

  // ========== 调试：创建新账号 ==========
  createNewAccount() {
    wx.showModal({
      title: '创建新账号',
      content: '将清空当前账号，生成新 UUID。建议先复制保存当前 UUID。',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('love_user_id');
          app.globalData = { currentUser: null, couple: null, isLoggedIn: false, isPaired: false };
          wx.reLaunch({ url: '/pages/index/index' });
        }
      },
    });
  },

  // ========== 导航 ==========
  goAlbum() { wx.navigateTo({ url: '/pages/album/album' }); },
  goAnniversary() { wx.navigateTo({ url: '/pages/anniversary/anniversary' }); },
  goNote() { wx.switchTab({ url: '/pages/note/note' }); },
  goDiary() { wx.switchTab({ url: '/pages/diary/diary' }); },

  logout() {
    wx.showModal({ title: '切换账号', content: '确定要重新设置吗？', success: (res) => {
      if (res.confirm) {
        wx.removeStorageSync('love_user_id');
        app.globalData = { currentUser: null, couple: null, isLoggedIn: false, isPaired: false };
        wx.reLaunch({ url: '/pages/index/index' });
      }
    }});
  },

  noop() {},
});
