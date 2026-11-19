// Leonida Trophy Guide — offline tracker for GTA 6's 55 PS5 trophies.
// Progress is saved in localStorage, exportable as JSON and importable back.
// No network use: the only fetch is the local trophies.json file.
const KEY = 'leonida-trophy-guide-v1';
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = [...doc.trophies].sort((a, b) => a.id - b.id);
const byId = new Map(trophies.map((t) => [t.id, t]));
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const SHOT_SEED = [2, 3, 4, 5, 8, 9, 10, 11, 16, 20, 21, 35, 46];

let earned = new Set();
try {
  const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
  const ids = Array.isArray(raw) ? raw : raw.earned ?? [];
  for (const v of ids) {
    if (typeof v === 'number' && byId.has(v)) earned.add(v);
    else if (typeof v === 'string') { const t = trophies.find((x) => x.name === v); if (t) earned.add(t.id); }
  }
} catch { earned = new Set(); }

let selectedId = null;
let activeTab = 'tracker';

function save() { localStorage.setItem(KEY, JSON.stringify({ version: 1, earned: [...earned].sort((a, b) => a - b) })); }
function isStory(t) { return t.kind === 'story'; }
function displayName(t) {
  if ($('spoiler').checked && isStory(t) && !earned.has(t.id)) return 'Hidden story trophy — earn it to reveal';
  return t.name;
}
function displayDesc(t) {
  if ($('spoiler').checked && isStory(t) && !earned.has(t.id)) return 'Its name and description stay hidden until earned.';
  return t.description;
}
function gradeLabel(g) { return g[0].toUpperCase() + g.slice(1); }

function visibleTrophies() {
  const q = $('search').value.trim().toLowerCase();
  const kind = $('kind').value, grade = $('grade').value, sort = $('sort').value;
  let list = trophies.filter((t) => {
    if (kind === 'missable') { if (!t.missable) return false; }
    else if (kind !== 'all' && t.kind !== kind) return false;
    if (kind === 'online') return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if ($('earnedOnly').checked && !earned.has(t.id)) return false;
    if ($('hideEarned').checked && earned.has(t.id)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.guide || '').toLowerCase().includes(q))) return false;
    return true;
  });
  if (sort === 'grade') list.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else list.sort((a, b) => a.id - b.id);
  return list;
}

function renderGuide() {
  const pane = $('guidePane');
  const t = selectedId == null ? null : byId.get(selectedId);
  if (!t) { pane.hidden = true; return; }
  pane.hidden = false;
  $('guideName').textContent = t.name;
  $('guideBadges').innerHTML = '';
  const badge = document.createElement('span');
  badge.className = 'badge ' + t.grade; badge.textContent = gradeLabel(t.grade);
  $('guideBadges').append(badge);
  if (t.count) { const c = document.createElement('span'); c.className = 'tag'; c.textContent = 'Target: ' + t.count; $('guideBadges').append(c); }
  $('guideDesc').textContent = t.description;
  $('guideText').textContent = t.guide || '';
  const warn = $('guideWarn');
  if (t.missable) { warn.hidden = false; warn.textContent = '⚠ MISSABLE — do the first meditation in Chapter 1, the first time it is offered at Jason\u2019s house.'; }
  else warn.hidden = true;
  const src = $('guideSources');
  src.replaceChildren();
  (t.sources || []).forEach((s, i) => {
    if (i) src.append(document.createTextNode(' · '));
    const a = document.createElement('a'); a.href = s.url; a.textContent = s.name; a.target = '_blank'; a.rel = 'noopener'; src.append(a);
  });
}

function render() {
  $('onlineNote').textContent = 'There are no online trophies in GTA 6 — every trophy here is earned offline, in single-player. Spoiler-free is ' + ($('spoiler').checked ? 'on: story trophies stay hidden until you earn them.' : 'off: story trophy names and descriptions are shown.');
  const total = trophies.length;
  const n = earned.size;
  $('progressText').textContent = `${n} of ${total} earned`;
  $('progressFill').style.width = `${Math.round((n / total) * 100)}%`;
  const byGrade = {};
  for (const t of trophies) if (earned.has(t.id)) byGrade[t.grade] = (byGrade[t.grade] || 0) + 1;
  $('gradeCounts').textContent = ['platinum', 'gold', 'silver', 'bronze'].map((g) => `${gradeLabel(g)} ${byGrade[g] || 0}/${trophies.filter((t) => t.grade === g).length}`).join(' · ');
  const list = visibleTrophies();
  $('listCount').textContent = `Showing ${list.length} of ${total} trophies · ${n} earned (${Math.round((n / total) * 100)}% to platinum)`;
  $('emptyNote').hidden = list.length !== 0;
  const rows = $('rows');
  rows.replaceChildren();
  for (const t of list) {
    const li = document.createElement('li');
    if (earned.has(t.id)) li.className = 'earned';
    const box = document.createElement('input');
    box.type = 'checkbox'; box.checked = earned.has(t.id); box.setAttribute('aria-label', 'Earned: ' + t.name);
    box.addEventListener('change', () => { if (box.checked) earned.add(t.id); else earned.delete(t.id); save(); render(); });
    const body = document.createElement('div'); body.className = 'trophy-body';
    const name = document.createElement('div'); name.className = 'trophy-name'; name.textContent = displayName(t); body.append(name);
    const desc = document.createElement('div'); desc.className = 'trophy-desc'; desc.textContent = displayDesc(t); body.append(desc);
    const meta = document.createElement('div');
    const badge = document.createElement('span'); badge.className = 'badge ' + t.grade; badge.textContent = gradeLabel(t.grade); meta.append(badge);
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = t.kind; meta.append(tag);
    if (t.count) { const c = document.createElement('span'); c.className = 'tag'; c.textContent = '×' + t.count; meta.append(c); }
    if (t.missable) { const f = document.createElement('span'); f.className = 'flag'; f.textContent = '⚠ MISSABLE'; meta.append(f); }
    body.append(meta);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'guide-btn'; btn.textContent = 'Guide';
    btn.addEventListener('click', () => { selectedId = t.id; renderGuide(); $('guidePane').scrollIntoView({ block: 'nearest' }); });
    li.append(box, body, btn);
    rows.append(li);
  }
  renderGuide();
  renderStats();
  renderRoadmap();
}

function renderStats() {
  const byGrade = {}, byKind = {};
  for (const t of trophies) if (earned.has(t.id)) { byGrade[t.grade] = (byGrade[t.grade] || 0) + 1; byKind[t.kind] = (byKind[t.kind] || 0) + 1; }
  const challenges = earned.has(32) ? '50+ of 80 done (One Last Thing earned; 100% needs 70 of 80)' : 'under 50 of 80 (earn One Last Thing at 50)';
  const vehicles = earned.has(35) ? '100+ vehicles discovered (Whip It Good earned; 100% needs 200 of 277 scanned)' : 'under 100 vehicles discovered';
  const areas = earned.has(42) ? '52 of 52 areas explored' : 'under 52 areas explored';
  $('stats').innerHTML = '';
  const h = document.createElement('h2'); h.textContent = 'Stats'; $('stats').append(h);
  const p1 = document.createElement('p'); p1.textContent = 'Earned by grade: ' + ['platinum', 'gold', 'silver', 'bronze'].map((g) => `${gradeLabel(g)} ${byGrade[g] || 0}`).join(' · '); $('stats').append(p1);
  const p2 = document.createElement('p'); p2.textContent = 'Earned by kind: ' + ['story', 'missable', 'collectibles', 'activities'].map((k) => `${k} ${byKind[k] || 0}`).join(' · ') + ' · online 0 (there are no online trophies)'; $('stats').append(p2);
  const p3 = document.createElement('p'); p3.textContent = 'Challenges: ' + challenges; $('stats').append(p3);
  const p4 = document.createElement('p'); p4.textContent = 'Vehicles: ' + vehicles; $('stats').append(p4);
  const p5 = document.createElement('p'); p5.textContent = 'Areas: ' + areas; $('stats').append(p5);
}

const STAGES = {
  1: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 22, 23, 24, 26, 27, 28],
  2: [14, 15, 16, 17, 18, 19, 20, 21, 29, 30, 31, 32, 35, 42, 52, 53, 54, 55],
  3: [1, 25, 33, 34, 36, 37, 38, 39, 40, 41, 43, 44, 45, 46, 47, 48, 49, 50, 51],
};
function renderRoadmap() {
  for (const [stage, ids] of Object.entries(STAGES)) {
    const el = document.querySelector(`[data-stage="${stage}"]`);
    if (!el) continue;
    const got = ids.filter((id) => earned.has(id)).length;
    el.textContent = `${got}/${ids.length} earned in this stage — ` + ids.map((id) => byId.get(id).name).join(', ');
  }
}

function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('tab-tracker').hidden = tab !== 'tracker';
  $('tab-roadmap').hidden = tab !== 'roadmap';
  $('tab-missables').hidden = tab !== 'missables';
}
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
for (const id of ['search', 'kind', 'grade', 'sort', 'spoiler', 'earnedOnly', 'hideEarned']) $(id).addEventListener('input', render);
$('guideClose').addEventListener('click', () => { selectedId = null; renderGuide(); });
$('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, game: 'Grand Theft Auto VI', earned: [...earned].sort((x, y) => x - y) }, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-trophy-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const ids = Array.isArray(raw) ? raw : raw.earned ?? [];
    const next = new Set();
    for (const v of ids) { if (typeof v === 'number' && byId.has(v)) next.add(v); else if (typeof v === 'string') { const t = trophies.find((x) => x.name === v); if (t) next.add(t.id); } }
    earned = next; save(); render();
  } catch { alert('That file is not a valid Leonida trophy progress export.'); }
  e.target.value = '';
});
$('reset').addEventListener('click', () => { if (confirm('Clear all earned trophies?')) { earned = new Set(); selectedId = null; save(); render(); } });

// Staged screenshots: ?shot=cover|roadmap|spoiler|filters builds real app state.
function applyShot() {
  const shot = params.get('shot');
  if (!shot) return;
  earned = new Set(SHOT_SEED); save();
  if (shot === 'cover') { $('spoiler').checked = false; selectedId = 28; setTab('tracker'); }
  else if (shot === 'roadmap') { setTab('roadmap'); }
  else if (shot === 'spoiler') { $('spoiler').checked = true; setTab('tracker'); }
  else if (shot === 'filters') { $('kind').value = 'collectibles'; $('spoiler').checked = false; setTab('tracker'); }
}
if (params.get('tab')) setTab(params.get('tab'));
if (params.get('select')) selectedId = Number(params.get('select'));
if (params.get('spoiler')) $('spoiler').checked = params.get('spoiler') !== 'off';
if (params.get('kind')) $('kind').value = params.get('kind');
applyShot();
render();
window.__shotReady = true;
