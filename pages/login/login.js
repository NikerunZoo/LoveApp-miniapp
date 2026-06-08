// 登录/注册页 — 邮箱 + 密码
const supabase = require('../../utils/supabase.js');
const logger = require('../../utils/logger.js');
const app = getApp();

Page({
  data: {
    isRegister: false,
    email: '',
    password: '',
    nickname: '',
    loading: false,
  },

  toggleMode() { this.setData({ isRegister: !this.data.isRegister }); },

  onNicknameInput(e) { this.setData({ nickname: e.detail.value }); },
  onEmailInput(e) { this.setData({ email: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },

  async handleSubmit() {
    const { isRegister, email, password, nickname } = this.data;
    if (!email.includes('@')) { wx.showToast({ title: '请输入正确的邮箱', icon: 'none' }); return; }
    if (password.length < 6) { wx.showToast({ title: '密码至少6位', icon: 'none' }); return; }
    if (isRegister && !nickname.trim()) { wx.showToast({ title: '请输入昵称', icon: 'none' }); return; }

    this.setData({ loading: true });
    try {
      logger.start(`[Login] ${isRegister ? '注册' : '登录'}`, { email });

      if (isRegister) {
        // 注册
        const res = await supabase.signUp(email, password);
        logger.log('[Login] 注册成功', { userId: res.user?.id });
        // 更新 profiles 昵称
        await supabase.from('profiles').update({ nickname }).eq('id', res.user.id).fetch();
        // 注册完需要重新登录获取 token
        const loginRes = await supabase.signIn(email, password);
        updateGlobalState(app, loginRes);
      } else {
        const res = await supabase.signIn(email, password);
        updateGlobalState(app, res);
        // 加载配对信息
        await loadCouple(app);
      }

      wx.redirectTo({ url: app.globalData.isPaired ? '/pages/home/home' : '/pages/pair/pair' });
    } catch (e) {
      logger.error(`[Login] ${isRegister ? '注册' : '登录'}失败`, e);
      wx.showToast({ title: e.message || '操作失败', icon: 'none' });
    }
    this.setData({ loading: false });
  },
});

async function updateGlobalState(app, authRes) {
  app.globalData.isLoggedIn = true;
  app.globalData.currentUser = authRes.user;
}

async function loadCouple(app) {
  try {
    const userId = app.globalData.currentUser?.id;
    if (!userId) return;
    logger.start('[Login] loadCouple', { userId });

    // 查询用户的 profile（去掉 .single()，用数组取第一个）
    const profiles = await supabase.from('profiles').select('couple_id,nickname,mood_emoji').eq('id', userId).fetch();
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    logger.log('[Login] loadCouple profile', { profile });

    if (profile && profile.couple_id) {
      const couples = await supabase.from('couple').select('*').eq('id', profile.couple_id).fetch();
      const couple = Array.isArray(couples) ? couples[0] : couples;
      if (couple) {
        app.globalData.couple = couple;
        app.globalData.isPaired = true;
        logger.log('[Login] loadCouple 配对已恢复', { coupleId: couple.id });
      }
    } else {
      logger.log('[Login] loadCouple 无配对关系');
    }
  } catch (e) { logger.error('[Login] loadCouple', e); }
}
