// Supabase 客户端 — 小程序版本
// 使用 wx.request 直接调用 Supabase REST API（绕过 supabase-js 在小程序的兼容问题）

const SUPABASE_URL = 'https://xcawlsthoenofziaobgl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYXdsc3Rob2Vub2Z6aWFvYmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4ODE1MjIsImV4cCI6MjA5NjQ1NzUyMn0.7hbUgeJaFQjxzene-CeIexnUmxr1-8aJdvN8WLBcEmo';

module.exports = {
  apikey: SUPABASE_ANON_KEY,

  // 通用请求方法
  request(method, path, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...extraHeaders,
      };

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
    this._op = 'select';  // select | insert | update | delete
    this._data = null;
  }

  select(cols = '*') { this._select = cols; return this; }
  eq(col, val) { this._filters.push(`${col}=eq.${encodeURIComponent(val)}`); return this; }
  order(col, asc = true) { this._order = `order=${col}.${asc ? 'asc' : 'desc'}`; return this; }
  limit(n) { this._limit = n; return this; }
  single() { this._single = true; return this; }

  // 以下三个只记录操作，不发请求（由 fetch 统一执行）
  insert(data) { this._op = 'insert'; this._data = data; return this; }
  update(data) { this._op = 'update'; this._data = data; return this; }
  delete() { this._op = 'delete'; return this; }

  _buildPath() {
    let path = `/rest/v1/${this.table}`;
    // select 需要 ?select=...
    if (this._op === 'select') {
      path += `?select=${this._select}`;
      this._filters.forEach(f => path += `&${f}`);
    } else {
      // update / delete 需要 WHERE
      if (this._filters.length > 0) {
        path += '?';
        this._filters.forEach(f => path += `${f}&`);
      }
    }
    if (this._order) path += `&${this._order}`;
    if (this._limit > 0) path += `&limit=${this._limit}`;
    return path;
  }

  async fetch() {
    const path = this._buildPath();
    const headers = {};
    switch (this._op) {
      case 'insert':
        return await this.client.request('POST', `/rest/v1/${this.table}`, this._data, { 'Prefer': 'return=representation' });
      case 'update':
        if (this._filters.length === 0) throw new Error('UPDATE requires a WHERE clause');
        return await this.client.request('PATCH', path, this._data, headers);
      case 'delete':
        if (this._filters.length === 0) throw new Error('DELETE requires a WHERE clause');
        return await this.client.request('DELETE', path, headers);
      default: // select
        return await this.client.request('GET', path, null, headers);
    }
  }
}
