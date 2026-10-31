import { straightDistance, formatDistance, mapUrl } from './distance.js';

const $ = id => document.getElementById(id);
const places = { start: null, end: null };
let busy = false, revision = 0, lastSearch = 0;
const config = fetch('/config.json', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('설정을 불러올 수 없습니다. 새로고침해주세요.'); return r.json(); });
config.catch(() => {});
const memory = new Map();
function invalidate() { revision++; $('result').hidden = true; $('empty').hidden = false; update(); }
function update() {
  $('calculate').disabled = busy || !places.start || !places.end;
  document.querySelectorAll('form button, #swap').forEach(b => b.disabled = busy);
}
function status(message) { $('status').textContent = message; }
function cached(key) {
  try { const value = memory.get(key) || JSON.parse(localStorage.getItem(key)); return value && Date.now() - value.time < 86400000 ? value.data : null; } catch { return null; }
}
function save(key, data) {
  const value = { time: Date.now(), data }; memory.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing or full storage: use memory. */ }
}
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), referrerPolicy: 'strict-origin-when-cross-origin' });
  if (!response.ok) throw new Error(response.status === 429 ? '요청이 많습니다. 잠시 기다린 뒤 다시 시도해주세요.' : '지도 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  return response.json();
}
async function search(query) {
  const key = `sai:place:v1:${query.toLowerCase()}`;
  const hit = cached(key); if (hit) return hit;
  const execute = async () => {
    const existing = cached(key); if (existing) return existing;
    let previous = lastSearch;
    try { previous = Math.max(previous, Number(localStorage.getItem('sai:last-search')) || 0); } catch {}
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 1100 - (Date.now() - previous))));
    lastSearch = Date.now();
    try { localStorage.setItem('sai:last-search', String(lastSearch)); } catch {}
    const url = new URL((await config).nominatimUrl);
    url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', 'accept-language': 'ko', addressdetails: '1' });
    const data = await json(url);
    if (!Array.isArray(data)) throw new Error('검색 결과 형식이 올바르지 않습니다.');
    const results = data.filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon))).map(p => ({ name: p.name || p.display_name.split(',')[0], address: p.display_name, lat: Number(p.lat), lon: Number(p.lon) }));
    save(key, results); return results;
  };
  return navigator.locks ? navigator.locks.request('sai-nominatim', execute) : execute();
}
for (const kind of ['start', 'end']) {
  $(kind).addEventListener('input', () => { places[kind] = null; $(kind + '-results').replaceChildren(); $(kind + '-selected').textContent = '검색 후 장소를 선택해주세요.'; invalidate(); status('입력한 장소를 다시 검색하고 선택해주세요.'); });
  $(kind + '-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const query = $(kind).value.trim(); if (!query) { status('장소명 또는 주소를 입력해주세요.'); return; }
    const original = $(kind).value;
    busy = true; update(); status('장소를 검색하고 있습니다…'); $(kind + '-results').replaceChildren();
    try {
      const results = await search(query);
      if ($(kind).value !== original) { status('입력 내용이 변경되었습니다. 다시 검색해주세요.'); return; }
      for (const place of results) {
        const li = document.createElement('li'), button = document.createElement('button');
        button.type = 'button';
        const title = document.createElement('strong'), detail = document.createElement('span');
        title.textContent = place.name; detail.textContent = place.address; button.append(title, detail);
        button.addEventListener('click', () => {
          places[kind] = place; $(kind).value = place.name; $(kind + '-selected').textContent = `✓ ${place.address}`;
          $(kind + '-results').replaceChildren(); invalidate(); status(places.start && places.end ? '두 장소가 선택되었습니다. 거리를 계산해보세요.' : '다른 장소도 검색하고 선택해주세요.');
        }); li.append(button); $(kind + '-results').append(li);
      }
      status(results.length ? '검색 결과에서 원하는 장소를 선택해주세요.' : '검색 결과가 없습니다. 시·군·구 또는 상세 주소를 함께 입력해보세요.');
    } catch (error) { status(error.name === 'TimeoutError' ? '검색 시간이 초과되었습니다. 다시 시도해주세요.' : error.message); }
    finally { busy = false; update(); }
  });
}
$('swap').addEventListener('click', () => {
  [places.start, places.end] = [places.end, places.start];
  const text = $('start').value; $('start').value = $('end').value; $('end').value = text;
  for (const kind of ['start', 'end']) { $(kind + '-selected').textContent = places[kind] ? `✓ ${places[kind].address}` : '검색 후 장소를 선택해주세요.'; $(kind + '-results').replaceChildren(); }
  invalidate(); status('출발지와 도착지를 바꿨습니다.');
});
document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', () => { invalidate(); status('계산 기준이 변경되었습니다. 다시 계산해주세요.'); }));
$('calculate').addEventListener('click', async () => {
  if (busy || !places.start || !places.end) return;
  const a = { ...places.start }, b = { ...places.end }, current = revision;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  busy = true; update(); status('두 장소 사이의 거리를 계산하고 있습니다…');
  try {
    let distance, duration;
    if (mode === 'straight') distance = straightDistance(a, b);
    else {
      const key = `sai:route:v1:${a.lon},${a.lat};${b.lon},${b.lat}`;
      let data = cached(key);
      if (!data) { data = await json(`${(await config).routingUrl}${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&alternatives=false&steps=false`); if (data.code === 'Ok') save(key, data); }
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('자동차 경로를 찾지 못했습니다. 직선거리로 변경해 계산해보세요.');
      distance = data.routes[0].distance; duration = data.routes[0].duration;
      if (!Number.isFinite(distance) || distance < 0) throw new Error('유효한 거리 정보를 받지 못했습니다.');
    }
    if (revision !== current) return;
    $('distance').textContent = formatDistance(distance);
    $('result-type').textContent = mode === 'driving' ? 'DRIVING DISTANCE / 자동차 도로거리' : 'STRAIGHT-LINE DISTANCE / 직선거리';
    $('route-summary').textContent = `${a.name} → ${b.name}`;
    $('duration').textContent = Number.isFinite(duration) ? `예상 소요시간 약 ${Math.max(1, Math.round(duration / 60)).toLocaleString('ko-KR')}분 · 실시간 교통 미반영` : '두 장소의 좌표를 기준으로 계산한 구면 거리입니다.';
    $('map-link').href = mapUrl(a, b, mode);
    $('result-note').textContent = mode === 'driving' ? 'OpenStreetMap에서 자동차 경로를 확인합니다. 지도에서 다시 계산한 경로는 달라질 수 있습니다.' : 'OpenStreetMap에서 두 장소를 포함하는 지도 영역을 엽니다. 직선은 지도에 표시되지 않습니다.';
    $('empty').hidden = true; $('result').hidden = false; status('거리 계산이 완료되었습니다.');
  } catch (error) { if (revision === current) status(error.name === 'TimeoutError' ? '경로 조회 시간이 초과되었습니다. 다시 시도하거나 직선거리를 선택해주세요.' : error.message); }
  finally { busy = false; update(); }
});
