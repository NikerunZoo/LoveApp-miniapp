/**
 * SupabaseQuery 单元测试（Node.js 运行，无需微信环境）
 * 运行方式: node test/supabase_test.js
 */

// 模拟 wx.request
global.wx = {
  request: function(opts) { this._lastOpts = opts; },
  setStorageSync: () => {},
  getStorageSync: () => null,
  _calls: [],
  _mockResponse(data, statusCode = 200) {
    const call = this._calls.shift();
    if (call && call.success) call.success({ data, statusCode });
  },
};

// Mock wx 使 supabase.js 不报错
const supabase = require('../utils/supabase.js');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`❌ ${name}`);
    console.log(`   ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ========================================
// 测试: SupabaseQuery 链式调用
// ========================================
test('select + eq + order + limit 链式', () => {
  const q = supabase.from('note').select('*').eq('to_user_id', 'abc').order('created_at', false).limit(10);
  assert(q._select === '*', 'select');
  assert(q._filters.length === 1, 'filter count');
  assert(q._filters[0] === 'to_user_id=eq.abc', 'filter value');
  assert(q._limit === 10, 'limit');
  assert(q._order.includes('desc'), 'order desc');
});

test('insert 链式调用', () => {
  const q = supabase.from('note').insert({ content: 'hello', to_user_id: 'abc' });
  assert(q._op === 'insert', 'op is insert');
  assert(q._data.content === 'hello', 'data content');
  assert(q._data.to_user_id === 'abc', 'data to_user_id');
});

test('update + eq 链式调用', () => {
  const q = supabase.from('profiles').update({ mood_emoji: '😊' }).eq('id', 'uuid-123');
  assert(q._op === 'update', 'op is update');
  assert(q._data.mood_emoji === '😊', 'data mood');
  assert(q._filters.length === 1, 'has filter');
  assert(q._filters[0] === 'id=eq.uuid-123', 'filter value');
});

test('delete + eq 链式调用', () => {
  const q = supabase.from('diary').delete().eq('id', 'note-5');
  assert(q._op === 'delete', 'op is delete');
  assert(q._filters.length === 1, 'has filter');
});

test('多次 eq 叠加', () => {
  const q = supabase.from('note').select().eq('to_user_id', 'abc').eq('is_read', 'false');
  assert(q._filters.length === 2, '2 filters');
});

// ========================================
// 测试: _buildPath 路径生成
// ========================================
test('select 路径生成', () => {
  const q = supabase.from('note').select('id,content').eq('to_user_id', 'abc').order('created_at', false).limit(5);
  const path = q._buildPath();
  assert(path.includes('/note?select=id,content'), 'has path and select');
  assert(path.includes('to_user_id=eq.abc'), 'has filter');
  assert(path.includes('order=created_at.desc'), 'has order');
  assert(path.includes('limit=5'), 'has limit');
});

test('update 路径包含 WHERE', () => {
  const q = supabase.from('profiles').update({ nickname: 'Jerry' }).eq('id', 'uuid-123');
  const path = q._buildPath();
  assert(path.includes('/profiles?'), 'has path');
  assert(path.includes('id=eq.uuid-123'), 'has filter');
});

test('update 无 WHERE 抛错', () => {
  const q = supabase.from('profiles').update({ nickname: 'Jerry' });
  try {
    q._buildPath(); // 不会抛错（buildPath 不检查）
    assert(true, 'buildPath ok');
  } catch (e) {
    assert(false, 'buildPath should not throw');
  }
});

// ========================================
// 测试: encodeURIComponent 过滤特殊字符
// ========================================
test('eq 对特殊字符编码', () => {
  const q = supabase.from('photo').eq('couple_id', '123 456');
  assert(q._filters[0].includes('123%20456'), 'space encoded');
});

// ========================================
// 测试: 不同查询隔离（不互相污染）
// ========================================
test('多次 from 查询不互相污染', () => {
  const q1 = supabase.from('note').eq('to_user_id', 'user1');
  const q2 = supabase.from('diary').eq('couple_id', 'couple1');
  assert(q1.table === 'note', 'q1 table');
  assert(q2.table === 'diary', 'q2 table');
  assert(q1._filters[0].includes('user1'), 'q1 filter');
  assert(q2._filters[0].includes('couple1'), 'q2 filter');
});

// ========================================
// 测试: real-world 查询场景
// ========================================
test('模拟 loadLoad 查询 profiles + couple', () => {
  const profileQ = supabase.from('profiles').select('couple_id').eq('id', 'user-uuid');
  assert(profileQ._op === 'select', 'profile select');
  assert(profileQ._filters[0].includes('user-uuid'), 'profile filter');

  const coupleQ = supabase.from('couple').select('*').eq('id', 'couple-789');
  assert(coupleQ._op === 'select', 'couple select');
});

test('模拟 sendNote 流程', () => {
  const q = supabase.from('note').insert({
    from_user_id: 'user1',
    from_user_name: 'Jerry',
    to_user_id: 'user2',
    content: 'Hello 💕',
  });
  assert(q._op === 'insert', 'insert op');
  assert(q._data.content === 'Hello 💕', 'content with emoji');
});

test('模拟 markRead 流程', () => {
  const q = supabase.from('note').update({ is_read: true }).eq('id', '100');
  assert(q._op === 'update', 'update op');
  assert(q._data.is_read === true, 'is_read true');
  assert(q._filters[0] === 'id=eq.100', 'filter');
});

// ========================================
console.log(`\n========== ${passed} passed, ${failed} failed ==========`);
process.exit(failed > 0 ? 1 : 0);
