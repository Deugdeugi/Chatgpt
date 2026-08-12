const $ = (selector) => document.querySelector(selector);
const datePicker = $('#date-picker');
const status = $('#status');
const card = $('#apod-card');
const savedView = $('#saved-view');
let current;
let saved = JSON.parse(localStorage.getItem('orbit-saved') || '[]');
let apiKey = sessionStorage.getItem('nasa-api-key') || '';

const today = new Date().toISOString().slice(0, 10);
datePicker.max = today;
datePicker.value = today;

function formatDate(date) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${date}T00:00:00`));
}
function updateSaved() {
  $('#saved-count').textContent = saved.length;
  localStorage.setItem('orbit-saved', JSON.stringify(saved));
  if (current) {
    const active = saved.some((item) => item.date === current.date);
    $('#save-button').classList.toggle('saved', active);
    $('#save-button').textContent = active ? '♥' : '♡';
  }
}
async function loadApod(date = '') {
  status.classList.remove('hidden');
  status.innerHTML = '<div class="loader"></div><p>별빛을 불러오는 중...</p>';
  card.classList.add('hidden');
  try {
    const response = await fetch(`/api/apod${date ? `?date=${date}` : ''}`, {
      headers: apiKey ? { 'X-NASA-API-Key': apiKey } : {},
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    current = data;
    datePicker.value = data.date;
    $('#apod-title').textContent = data.title;
    $('#apod-description').textContent = data.explanation;
    $('#media-date').textContent = formatDate(data.date);
    $('#copyright').textContent = data.copyright ? `© ${data.copyright}` : 'PUBLIC DOMAIN · NASA';
    const image = $('#apod-image');
    const video = $('#apod-video');
    if (data.media_type === 'video') {
      image.classList.add('hidden'); video.classList.remove('hidden'); video.src = data.url;
    } else {
      video.classList.add('hidden'); video.src = ''; image.classList.remove('hidden');
      image.src = data.url; image.alt = data.title;
    }
    $('#original-link').href = data.hdurl || data.url;
    status.classList.add('hidden'); card.classList.remove('hidden');
    updateSaved();
  } catch (error) {
    status.innerHTML = `<p>✦<br><br>${error.message}<br><small>API 키를 확인한 뒤 다시 시도해 주세요.</small></p>`;
  }
}
function shiftDate(days) {
  const date = new Date(`${datePicker.value}T12:00:00`);
  date.setDate(date.getDate() + days);
  const value = date.toISOString().slice(0, 10);
  if (value >= datePicker.min && value <= today) loadApod(value);
}
function renderSaved() {
  const grid = $('#saved-grid');
  grid.innerHTML = saved.map((item) => `<article class="saved-item" data-date="${item.date}"><img src="${item.thumbnail_url || item.url}" alt=""><p>${formatDate(item.date)}</p><h3>${item.title}</h3></article>`).join('');
  $('#empty-saved').classList.toggle('hidden', saved.length > 0);
  grid.querySelectorAll('.saved-item').forEach((item) => item.addEventListener('click', () => {
    showView('discover'); loadApod(item.dataset.date);
  }));
}
function showView(view) {
  const discover = view === 'discover';
  $('.intro').classList.toggle('hidden', !discover);
  card.classList.toggle('hidden', !discover || !current);
  status.classList.add('hidden');
  savedView.classList.toggle('hidden', discover);
  document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  if (!discover) renderSaved();
}

datePicker.addEventListener('change', () => loadApod(datePicker.value));
$('#prev-day').addEventListener('click', () => shiftDate(-1));
$('#next-day').addEventListener('click', () => shiftDate(1));
$('#random-day').addEventListener('click', () => {
  const start = new Date('1995-06-16T00:00:00Z').valueOf();
  const random = new Date(start + Math.random() * (Date.now() - start)).toISOString().slice(0, 10);
  loadApod(random);
});
$('#save-button').addEventListener('click', () => {
  const index = saved.findIndex((item) => item.date === current.date);
  if (index >= 0) saved.splice(index, 1); else saved.unshift(current);
  updateSaved();
});
$('#expand-button').addEventListener('click', () => window.open(current.hdurl || current.url, '_blank', 'noopener'));
document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));

const keyDialog = $('#api-key-dialog');
const keyInput = $('#api-key-input');
function updateKeyStatus() {
  $('.key-status').classList.toggle('connected', Boolean(apiKey));
  $('#api-key-button').lastChild.textContent = apiKey ? ' API 키 연결됨' : ' API 키 설정';
}
function openKeyDialog() {
  keyInput.value = apiKey;
  $('#key-message').textContent = '';
  keyDialog.showModal();
  keyInput.focus();
}
$('#api-key-button').addEventListener('click', openKeyDialog);
$('#close-key-dialog').addEventListener('click', () => keyDialog.close());
keyDialog.addEventListener('click', (event) => { if (event.target === keyDialog) keyDialog.close(); });
$('#toggle-key').addEventListener('click', () => {
  const showing = keyInput.type === 'text';
  keyInput.type = showing ? 'password' : 'text';
  $('#toggle-key').textContent = showing ? '보기' : '숨기기';
});
$('#api-key-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const value = keyInput.value.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    $('#key-message').textContent = '올바른 API 키를 입력해 주세요.';
    return;
  }
  apiKey = value;
  sessionStorage.setItem('nasa-api-key', apiKey);
  updateKeyStatus();
  keyDialog.close();
  loadApod(datePicker.value);
});
$('#use-demo-key').addEventListener('click', () => {
  apiKey = '';
  sessionStorage.removeItem('nasa-api-key');
  updateKeyStatus();
  keyDialog.close();
  loadApod(datePicker.value);
});

updateSaved();
updateKeyStatus();
loadApod();
