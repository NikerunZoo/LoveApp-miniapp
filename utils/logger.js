// 日志工具
const TAG = 'LoveApp';
module.exports = {
  log(msg, data) { console.log(`[${TAG}] ✅ ${msg}`, data || ''); },
  error(msg, err, data) { console.error(`[${TAG}] ❌ ${msg}`, err?.message || err, data || ''); },
  start(msg, data) { console.log(`[${TAG}] ▶️  ${msg}`, data ? JSON.stringify(data) : ''); },
};
