const test = require('node:test');
const assert = require('node:assert/strict');
const { validDate, getApod, cache } = require('../server');

test('validDate는 실제 ISO 날짜만 허용한다', () => {
  assert.equal(validDate('2026-08-12'), true);
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('12-08-2026'), false);
});

test('getApod는 NASA 요청을 구성하고 결과를 캐시한다', async () => {
  cache.clear();
  let calls = 0;
  const fakeFetch = async (url) => {
    calls++;
    assert.equal(url.searchParams.get('api_key'), 'user-key_123');
    assert.equal(url.searchParams.get('date'), '2024-01-01');
    assert.equal(url.searchParams.get('thumbs'), 'true');
    return { ok: true, json: async () => ({ date: '2024-01-01', title: 'Earth' }) };
  };
  const first = await getApod('2024-01-01', fakeFetch, 'user-key_123');
  const second = await getApod('2024-01-01', fakeFetch, 'user-key_123');
  assert.equal(first.title, 'Earth');
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});
