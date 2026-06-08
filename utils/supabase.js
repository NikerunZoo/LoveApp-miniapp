// Supabase 客户端 — 小程序版本
// 使用 wx.request 直接调用 Supabase REST API（绕过 supabase-js 在小程序的兼容问题）

const SUPABASE_URL = 'https://xcawlsthoenofziaobgl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYXdsc3Rob2Vub2Z6aWFvYmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4ODE1MjIsImV4cCI6MjA5NjQ1NzUyMn0.7hbUgeJaFQjxzene-CeIexnUmxr1-8aJdvN8WLBcEmo';

let authToken = '';          // session access_token
let refreshTokenValue = '';  // refresh_token

// 持久化存储（小程序版）
function saveSession() { wx.setStorageSync('supabase_session', JSON.stringify({ authToken, refreshTokenValue })); }
function loadSession() {
  const s = wx.getStorageSync('supabase_session');
  if (s) { const p = JSON.parse(s); authToken = p.authToken || ''; refreshTokenValue = p.refreshTokenValue || ''; }
}

module.exports = {
  initSupabase() { loadSession(); },
  getAuthToken() { return authToken; },
  apikey: SUPABASE_ANON_KEY,

  // 通用请求方法
  request(method, path, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...extraHeaders,
      };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      wx.request({
        url: `${SUPABASE_URL}${path}`,
        method,
        header: headers,
        data: body || {},
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
          else reject(new Error(res.data?.message || `HTTP ${res.statusCode}`));
        },
        fail(err) { reject(new Error(err.errMsg || 'Network error')); },
      });
    });
  },

  // Auth 注册
  async signUp(email, password) {
    const result = await this.request('POST', '/auth/v1/signup', { email, password });
    if (result.access_token) { authToken = result.access_token; refreshTokenValue = result.refresh_token || ''; saveSession(); }
    return result;
  },

  // Auth 登录
  async signIn(email, password) {
    const result = await this.request('POST', '/auth/v1/token?grant_type=password', { email, password });
    if (result.access_token) { authToken = result.access_token; refreshTokenValue = result.refresh_token || ''; saveSession(); }
    return result;
  },

  // DB 查询
  from(table) { return new SupabaseQuery(table, this); },
};

class SupabaseQuery {
  constructor(table, client) {
    this.table = table;
    this.client = client;
    this._select = '*';
    this._filters = [];
    this._order = '';
    this._limit = 0;
    this._single = false;
    this._headers = {};
  }

  select(cols = '*') { this._select = cols; return this; }
  eq(col, val) { this._filters.push(`${col}=eq.${encodeURIComponent(val)}`); return this; }
  order(col, asc = true) { this._order = `order=${col}.${asc ? 'asc' : 'desc'}`; return this; }
  limit(n) { this._limit = n; return this; }
  single() { this._single = true; return this; }

  async fetch() {
    let path = `/rest/v1/${this.table}?select=${this._select}`;
    this._filters.forEach(f => path += `&${f}`);
    if (this._order) path += `&${this._order}`;
    if (this._limit > 0) path += `&limit=${this._limit}`;
    const result = await this.client.request('GET', path, null, { 'Prefer': this._single ? 'return=representation' : undefined });
    return result;
  }

  async insert(data) { return await this.client.request('POST', `/rest/v1/${this.table}`, data, { 'Prefer': 'return=representation' }); }
  async update(data) { let path = `/rest/v1/${this.table}?`; this._filters.forEach(f => path += `${f}&`); return await this.client.request('PATCH', path, data); }
  async delete() { let path = `/rest/v1/${this.table}?`; this._filters.forEach(f => path += `${f}&`); return await this.client.request('DELETE', path); }
}
