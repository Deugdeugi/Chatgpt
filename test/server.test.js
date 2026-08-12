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
    return { ok: true, text: async () => JSON.stringify({ date: '2024-01-01', title: 'Earth' }) };
  };
  const first = await getApod('2024-01-01', fakeFetch, 'user-key_123');
  const second = await getApod('2024-01-01', fakeFetch, 'user-key_123');
  assert.equal(first.title, 'Earth');
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});

test('getApod는 NASA의 비 JSON 응답을 사용자 친화적인 오류로 변환한다', async () => {
  cache.clear();
  const fakeFetch = async () => ({
    ok: false,
    text: async () => 'upstream connect error',
  });

  await assert.rejects(
    getApod('2024-01-02', fakeFetch, 'user-key_123'),
    /NASA API가 일시적으로 올바르지 않은 응답을 보냈습니다/,
  );
});

test('getApod는 전달받은 취소 신호를 NASA 요청에 적용한다', async () => {
  cache.clear();
  const controller = new AbortController();
  const fakeFetch = async (url, options) => {
    assert.equal(options.signal, controller.signal);
    return { ok: true, text: async () => JSON.stringify({ date: '2024-01-03', title: 'Moon' }) };
  };

  await getApod('2024-01-03', fakeFetch, 'user-key_123', controller.signal);
});
