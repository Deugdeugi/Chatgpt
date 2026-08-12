const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const NASA_ENDPOINT = 'https://api.nasa.gov/planetary/apod';
const TRANSLATE_ENDPOINT = 'https://api.mymemory.translated.net/get';
const cache = new Map();
const translationCache = new Map();

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

async function getApod(date, fetchImpl = fetch, apiKey = process.env.NASA_API_KEY || 'DEMO_KEY', signal) {
  const key = date || 'today';
  if (cache.has(key)) return cache.get(key);
  const url = new URL(NASA_ENDPOINT);
  url.searchParams.set('api_key', apiKey);
  if (date) url.searchParams.set('date', date);
  url.searchParams.set('thumbs', 'true');

  const response = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal });
  const body = await response.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error('NASA API가 일시적으로 올바르지 않은 응답을 보냈습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (!response.ok) throw new Error(data.msg || data.error?.message || 'NASA 데이터를 불러오지 못했습니다.');
  cache.set(key, data);
  return data;
}

async function translateToKorean(text, fetchImpl = fetch, signal) {
  if (translationCache.has(text)) return translationCache.get(text);
  const chunks = text.match(/.{1,450}(?:\s|$)/gs) || [text];
  const translatedChunks = [];
  for (const chunk of chunks) {
    const url = new URL(TRANSLATE_ENDPOINT);
    url.searchParams.set('q', chunk.trim());
    url.searchParams.set('langpair', 'en|ko');
    const response = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal });
    const body = await response.text();
    let data;
    try { data = JSON.parse(body); } catch { throw new Error('번역 서비스가 올바르지 않은 응답을 보냈습니다.'); }
    const translatedChunk = data.responseData?.translatedText;
    if (!response.ok || !translatedChunk) throw new Error(data.responseDetails || '설명을 번역하지 못했습니다.');
    translatedChunks.push(translatedChunk);
  }
  const translatedText = translatedChunks.join(' ');
  translationCache.set(text, translatedText);
  return translatedText;
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 12_000) throw new Error('요청 내용이 너무 깁니다.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('올바른 JSON 요청을 보내 주세요.'); }
}

async function serveStatic(pathname, res) {
  const routes = { '/': 'index.html', '/styles.css': 'styles.css', '/app.js': 'app.js' };
  const file = routes[pathname];
  if (!file) return false;
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  const content = await fs.readFile(path.join(PUBLIC_DIR, file));
  res.writeHead(200, { 'Content-Type': `${types[path.extname(file)]}; charset=utf-8` });
  res.end(content);
  return true;
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (url.pathname === '/api/apod') {
        const controller = new AbortController();
        res.once('close', () => {
          if (!res.writableEnded) controller.abort();
        });
        const date = url.searchParams.get('date');
        const apiKey = req.headers['x-nasa-api-key'] || process.env.NASA_API_KEY || 'DEMO_KEY';
        if (typeof apiKey !== 'string' || apiKey.length > 128 || !/^[A-Za-z0-9_-]+$/.test(apiKey)) {
          return json(res, 400, { error: '올바른 NASA API 키를 입력해 주세요.' });
        }
        if (date && (!validDate(date) || date < '1995-06-16' || date > new Date().toISOString().slice(0, 10))) {
          return json(res, 400, { error: '1995년 6월 16일부터 오늘 사이의 날짜를 선택해 주세요.' });
        }
        try {
          return json(res, 200, await getApod(date, fetch, apiKey, controller.signal));
        } catch (error) {
          if (controller.signal.aborted) return;
          return json(res, 502, { error: error.message });
        }
      }
      if (url.pathname === '/api/translate' && req.method === 'POST') {
        const controller = new AbortController();
        res.once('close', () => { if (!res.writableEnded) controller.abort(); });
        try {
          const { text } = await readJson(req);
          if (typeof text !== 'string' || !text.trim() || text.length > 8_000) return json(res, 400, { error: '번역할 설명을 확인해 주세요.' });
          return json(res, 200, { translatedText: await translateToKorean(text, fetch, controller.signal) });
        } catch (error) {
          if (controller.signal.aborted) return;
          return json(res, 502, { error: error.message });
        }
      }
      if (await serveStatic(url.pathname, res)) return;
      json(res, 404, { error: '페이지를 찾을 수 없습니다.' });
    } catch (error) {
      json(res, 500, { error: '서버 오류가 발생했습니다.' });
    }
  });
}

if (require.main === module) createServer().listen(PORT, () => console.log(`Orbit Daily: http://localhost:${PORT}`));
module.exports = { createServer, getApod, translateToKorean, validDate, cache, translationCache };
