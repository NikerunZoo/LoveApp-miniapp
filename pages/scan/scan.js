// 扫码 — 扫二维码加入配对
Page({
  onLoad() {
    wx.scanCode({ onlyFromCamera: true, scanType: ['qrCode'], success: (res) => {
      const events = this.getOpenerEventChannel ? this.getOpenerEventChannel() : null;
      if (events) events.emit('scanResult', { code: res.result });
      // 直接跳转回上一页，把结果带回去
      const pages = getCurrentPages();
      const prev = pages[pages.length - 2];
      if (prev && prev.setData) {
        prev.setData({ joinCode: res.result || '' });
      }
      wx.navigateBack();
    }, fail: () => wx.navigateBack() });
  },

  // 扫码失败时手动输入
  manualInput() {
    wx.navigateBack();
  },
});
