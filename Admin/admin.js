// admin.js — single consolidated module (matches your latest changes)

// -------------------------------
// Router (#overview, #applications, #exports)
// -------------------------------
// Router (#overview, #applications, #exports)
// ↓ change to include #practice
const VIEWS = {
  '#overview'    : document.getElementById('view-overview'),
  '#applications': document.getElementById('view-applications'),
  '#practice'    : document.getElementById('view-practice'),   // ← ADDED
  '#exports'     : document.getElementById('view-exports')
};

function parseHash(){
  const raw = location.hash || '#overview';
  const [path, query=''] = raw.split('?');
  const params = new URLSearchParams(query);
  return { path, params };
}

function route(){
  const { path, params } = parseHash();
  const target = VIEWS[path] ? path : '#overview';
  Object.entries(VIEWS).forEach(([key, el])=>{
    el.classList.toggle('active', key === target);
  });
  setActiveNav(target);

  if (target === '#applications') {
    mountApplications(params);
  } else {
    unmountApplications();
  }

  if (target === '#practice') {
    mountPractice(params);
  }
}

function setActiveNav(hashPath){
  document.querySelectorAll('#sidebarNav a').forEach(a=>{
    const isActive = a.getAttribute('data-route') === hashPath;
    a.classList.toggle('is-active', isActive);
    a.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

window.addEventListener('hashchange', route);

// -------------------------------
// Header: bell dropdown
// -------------------------------
const bellBtn = document.getElementById('bellBtn');
const bellDropdown = document.getElementById('bellDropdown');
const bellCount = document.getElementById('bellCount');
const notifList = document.getElementById('notifList');
const navBadgeApps = document.getElementById('navBadgeApps');

bellBtn?.addEventListener('click', ()=>{
  const open = bellDropdown.classList.toggle('show');
  bellBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', (e)=>{
  if (!bellDropdown.contains(e.target) && !bellBtn.contains(e.target)) {
    bellDropdown.classList.remove('show');
    bellBtn.setAttribute('aria-expanded', 'false');
  }
});

// -------------------------------
// Applications view (no fake data)
// -------------------------------
let DATA = [];                 // ← populate from Supabase
let filteredRows = [];
let currentQueue = 'all';
let currentCat = '';
let currentStatus = '';
let searchTerm = '';
let selectedIndex = -1;
let appsWired = false;

const appTbody = document.getElementById('appTbody');
const emptyState = document.getElementById('emptyState');
const searchBox = document.getElementById('searchBox');
const filterCategory = document.getElementById('filterCategory');
const filterStatus = document.getElementById('filterStatus');
const queuePills = document.getElementById('queuePills');

const newBanner = document.getElementById('newBanner');
const newBannerText = document.getElementById('newBannerText');
const btnLoadNew = document.getElementById('btnLoadNew');

async function mountApplications(params){
  // Deep-link params
  if (params) {
    currentQueue = params.get('queue') || 'all';
    currentCat   = params.get('category') || '';
    currentStatus= params.get('status') || '';
    searchTerm   = (params.get('q') || '').toLowerCase();
  }

  // Activate current pill
  queuePills.querySelectorAll('.pillx').forEach(btn=>{
    btn.classList.toggle('is-active', btn.dataset.queue === currentQueue || (currentQueue==='all' && btn.dataset.queue==='all'));
  });

  // Wire controls once
  if (!appsWired){
    queuePills.addEventListener('click', onPillClick);
    searchBox.addEventListener('input', onSearch);
    filterCategory.addEventListener('change', ()=>{ currentCat = filterCategory.value; refreshApps(); });
    filterStatus.addEventListener('change', ()=>{ currentStatus = filterStatus.value; refreshApps(); });
    appsWired = true;
  }

  await loadApplications();   // TODO: fetch from Supabase and set DATA
  subscribeRealtime();        // TODO: subscribe to metatable changes
}

function unmountApplications(){
  // keep wired; no-op for now
}

// TODO: fetch from Supabase metatable and set DATA; then call refreshApps()
async function loadApplications(){
  DATA = []; // replace with real fetched rows
  refreshApps();
}

// TODO: subscribe to Supabase Realtime on metatable; on events, patch DATA and call refreshApps()
function subscribeRealtime(){
  // no-op for now
}

function onPillClick(e){
  const b = e.target.closest('.pillx');
  if (!b) return;
  currentQueue = b.dataset.queue;
  queuePills.querySelectorAll('.pillx').forEach(x => x.classList.remove('is-active'));
  b.classList.add('is-active');
  refreshApps();
}

function onSearch(){
  searchTerm = (searchBox.value || '').toLowerCase();
  refreshApps();
}

function passesQueue(row){
  switch(currentQueue){
    case 'waiver_received':   return row.waiver_status  === 'received';
    case 'logo_received':     return row.logo_status    === 'received';
    case 'shorts_received':   return row.shorts_status  === 'received';
    case 'payment_received':  return row.payment_status === 'received';

    case 'needs_revision': {
      return (
        row.waiver_status  === 'need_revision' ||
        row.logo_status    === 'need_revision' ||
        row.shorts_status  === 'need_revision' ||
        row.payment_status === 'need_revision'
      );
    }

    case 'ready_to_approve': {
      return (
        row.waiver_status  === 'approved' &&
        row.logo_status    === 'approved' &&
        row.shorts_status  === 'approved' &&
        row.payment_status === 'approved'
      );
    }

    case 'all':
    default:
      return true;
  }
}

function passesFilters(row){
  if (currentCat && row.category !== currentCat) return false;
  if (currentStatus && row.app_status !== currentStatus) return false;
  if (searchTerm){
    const blob = `${row.team_code} ${row.team_name} ${row.org_name} ${row.manager}`.toLowerCase();
    if (!blob.includes(searchTerm)) return false;
  }
  return true;
}

function refreshApps(){
  // Build filtered list
  filteredRows = DATA.filter(r => passesQueue(r) && passesFilters(r))
                     .sort((a,b) => (String(b.submitted_at).localeCompare(String(a.submitted_at))));

  // Counts for pills and header badges
  const counts = {
    waiver: DATA.filter(r => r.waiver_status  === 'received').length,
    logo:   DATA.filter(r => r.logo_status    === 'received').length,
    shorts: DATA.filter(r => r.shorts_status  === 'received').length,
    pay:    DATA.filter(r => r.payment_status === 'received').length,
    revs:   DATA.filter(r =>
              r.waiver_status  === 'need_revision' ||
              r.logo_status    === 'need_revision' ||
              r.shorts_status  === 'need_revision' ||
              r.payment_status === 'need_revision'
            ).length,
    ready:  DATA.filter(r =>
              r.waiver_status  === 'approved' &&
              r.logo_status    === 'approved' &&
              r.shorts_status  === 'approved' &&
              r.payment_status === 'approved'
            ).length
  };

  // Update UI
  byId('pillWaiver').textContent   = counts.waiver;
  byId('pillLogo').textContent     = counts.logo;
  byId('pillShorts').textContent   = counts.shorts;
  byId('pillPayment').textContent  = counts.pay;
  // If you add a “Needs revision” pill, bind counts.revs to it
  byId('pillReady').textContent    = counts.ready;
  navBadgeApps.textContent         = counts.waiver;
  bellCount.textContent            = counts.waiver + counts.logo + counts.shorts + counts.pay;

  renderBellDropdown(counts);

  // Render table
  appTbody.innerHTML = '';
  if (filteredRows.length === 0){
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    filteredRows.forEach((r, idx)=>{
      const tr = document.createElement('tr');
      tr.dataset.idx = idx;
      tr.innerHTML = `
        <td>${fmtTime(r.submitted_at)}</td>
        <td>${catShort(r.category)}</td>
        <td><strong>${r.team_code}</strong></td>
        <td>${r.team_name}</td>
        <td>${r.org_name}</td>
        <td>${r.manager}</td>
        <td>
          <div class="chips">
            ${chip('Waiver', r.waiver_status)}
            ${chip('Shorts', r.shorts_status)}
            ${chip('Logo',   r.logo_status)}
            ${chip('$',      r.payment_status)}
          </div>
        </td>
        <td>${titleCase(r.app_status)}</td>
      `;
      tr.addEventListener('click', ()=> openDrawer(idx));
      appTbody.appendChild(tr);
    });
  }

  // Hide the "new items" banner until you wire realtime
  newBanner.classList.add('hidden');
  btnLoadNew.onclick = null;
}

function renderBellDropdown(counts){
  notifList.innerHTML = '';
  if (counts.waiver) notifList.appendChild(notifItem('New waivers', `${counts.waiver} awaiting review`, '#applications?queue=waiver_received'));
  if (counts.logo)   notifList.appendChild(notifItem('New logos', `${counts.logo} awaiting review`, '#applications?queue=logo_received'));
  // ✅ align with your new queue names:
  if (counts.shorts) notifList.appendChild(notifItem('Shorts received', `${counts.shorts} teams`, '#applications?queue=shorts_received'));
  if (counts.pay)    notifList.appendChild(notifItem('Payments received', `${counts.pay} teams`, '#applications?queue=payment_received'));
  if (!notifList.children.length){
    const div = document.createElement('div');
    div.className = 'dropdown-item';
    div.innerHTML = `<span class="meta">No new notifications</span>`;
    notifList.appendChild(div);
  }
}
function notifItem(title, meta, href){
  const div = document.createElement('div');
  div.className = 'dropdown-item';
  div.innerHTML = `<span class="badge">${title}</span><span class="meta">${meta}</span>`;
  div.addEventListener('click', ()=>{
    location.hash = href;
    bellDropdown.classList.remove('show');
  });
  return div;
}

// Drawer (UI only)
const drawer = document.getElementById('drawer');
const btnCloseDrawer = document.getElementById('btnCloseDrawer');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');

btnCloseDrawer?.addEventListener('click', ()=> drawer.classList.add('hidden'));
btnPrev?.addEventListener('click', ()=> stepDrawer(-1));
btnNext?.addEventListener('click', ()=> stepDrawer(+1));

function openDrawer(idx){
  if (idx < 0 || idx >= filteredRows.length) return;
  selectedIndex = idx;
  const row = filteredRows[idx];
  byId('drawerTitle').textContent = `${row.team_code} • ${row.team_name}`;
  byId('drawerSub').textContent   = `${catLabel(row.category)} • ${titleCase(row.app_status)}`;

  setChip('chipWaiver',  row.waiver_status);
  setChip('chipShorts',  row.shorts_status);
  setChip('chipLogo',    row.logo_status);
  setChip('chipPayment', row.payment_status);

  const ready =
    row.waiver_status  === 'approved' &&
    row.logo_status    === 'approved' &&
    row.shorts_status  === 'approved' &&
    row.payment_status === 'approved';

  const banner = byId('drawerBanner');
  banner.textContent = ready ? 'Ready to approve' : 'Missing requirements';
  banner.style.background = ready ? '#ecfdf5' : '#fff7ed';
  banner.style.color      = ready ? '#065f46' : '#9a3412';

  drawer.classList.remove('hidden');
}
function stepDrawer(delta){
  if (filteredRows.length === 0) return;
  selectedIndex = (selectedIndex + delta + filteredRows.length) % filteredRows.length;
  openDrawer(selectedIndex);
}

// Helpers (UI)
function chip(label, status){
  const val = status || 'missing';
  return `<span class="chip ${chipClass(val)}" title="${label}">${label}: ${titleCase(val)}</span>`;
}

function chipClass(status){
  switch(status){
    case 'approved':       return 'chip-approved';  // green
    case 'received':       return 'chip-received';  // blue
    case 'need_revision':  return 'chip-needrev';   // amber
    case 'missing':
    default:               return 'chip-missing';   // gray
  }
}

function setChip(id, status){
  const val = status || 'missing';
  const el = document.getElementById(id);
  el.textContent = titleCase(val);
  el.className = 'chip ' + chipClass(val);
}

function fmtTime(iso){
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function titleCase(s){ return (s||'').replace(/_/g,' ').replace(/\w\S*/g, w => w[0].toUpperCase()+w.slice(1)); }
function catShort(c){
  // your single-letter codes
  return { men_open:'M', ladies_open:'L', mixed_open:'X', mixed_corporate:'C' }[c] || c || '';
}
function catLabel(c){
  return { men_open:'Men Open', ladies_open:'Ladies Open', mixed_open:'Mixed Open', mixed_corporate:'Mixed Corporate' }[c] || c || '';
}
function byId(id){ return document.getElementById(id); }

// -------------------------------
// Logout stub
// -------------------------------
function wireLogout(){
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', ()=> alert('Hook logout() to Supabase later'));
}

// -------------------------------
// Exports (kept intact)
// -------------------------------
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
const SUPABASE_URL  = "https://khqarcvszewerjckmtpg.supabase.co";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const PAGE_SIZE = 1000;
async function fetchAllRows(table){
  let from = 0; const rows = [];
  while (true){
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await sb.from(table).select('*').order('created_at', { ascending:true }).range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}
function preferredOrder(){
  return [
    'id','created_at','category','team_code','team_name',
    'org_name','org_address',
    'manager1_name','manager1_email','manager1_phone',
    'manager2_name','manager2_email','manager2_phone',
    'manager3_name','manager3_email','manager3_phone',
    'marquee_count','steersman_option','junk_boat','speed_boat',
    'status','admin_note','updated_at','updated_by','user_id'
  ];
}
function buildHeaders(rows){
  if (!rows.length) return [];
  const seen = new Set();
  rows.forEach(r => Object.keys(r || {}).forEach(k => seen.add(k)));
  const pref = preferredOrder().filter(k => seen.has(k));
  const extras = Array.from(seen).filter(k => !pref.includes(k)).sort();
  return [...pref, ...extras];
}
function escapeCSV(value){
  if (value === null || value === undefined) return '';
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (s.includes('"')) s = s.replace(/"/g, '""');
  if (s.search(/("|,|\n|\r)/) !== -1) s = `"${s}"`;
  return s;
}
function toCSV(rows){
  if (!rows.length) return '\ufeffid\n';
  const headers = buildHeaders(rows);
  const lines = [headers.join(',')];
  for (const r of rows){
    const row = headers.map(h => escapeCSV(r[h]));
    lines.push(row.join(','));
  }
  return '\ufeff' + lines.join('\r\n');
}
function downloadCSV(csvText, filename){
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 4000);
}
function stamp(){
  const d = new Date(); const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
async function exportTable(tableName, label, btn){
  try{
    if (btn){ btn.disabled = true; btn.textContent = 'Preparing…'; }
    const rows = await fetchAllRows(tableName);
    const csv  = toCSV(rows);
    downloadCSV(csv, `SDBA_${label}_${stamp()}.csv`);
    if (btn){ btn.textContent = 'Export CSV'; }
  }catch(err){
    console.error(err);
    alert(`Export failed for ${label}:\n${err.message || err}`);
    if (btn){ btn.textContent = 'Export CSV'; }
  }finally{
    if (btn){ btn.disabled = false; }
  }
}
async function exportAllSequential(){
  const buttons = {
    mens:   document.getElementById('btnMenOpen') || document.getElementById('btnMensOpen'),
    ladies: document.getElementById('btnLadiesOpen'),
    mixedO: document.getElementById('btnMixedOpen'),
    mixedC: document.getElementById('btnMixedCorporate')
  };
  await exportTable('men_open_team_list',             'MenOpen',        buttons.mens);
  await exportTable('ladies_open_team_list',          'LadiesOpen',     buttons.ladies);
  await exportTable('mixed_open_team_list',           'MixedOpen',      buttons.mixedO);
  await exportTable('mixed_corporate_team_list',      'MixedCorporate', buttons.mixedC);
}

// -------------------------------
// Practice Calendar (weekly, read-only)
// -------------------------------
const CAL_HOUR_START = 7;
const CAL_HOUR_END   = 21;
const CAL_SLOT_MIN   = 30;   // minutes per row
const CAL_ROW_H      = 20;   // px per row

let calWeekStart;            // Monday 00:00
let calTimer;                // interval id
let CAL_BOOKINGS = [];       // TODO: load from Supabase later

// Element refs (unique names)
const elCalHeader  = document.getElementById('calHeader');
const elCalTimes   = document.getElementById('calTimes');
const elCalGrid    = document.getElementById('calGrid');
const elCalRange   = document.getElementById('calRange');
const elCalNowLine = document.getElementById('calNowLine');

const calBtnPrev   = document.getElementById('calBtnPrev');
const calBtnToday  = document.getElementById('calBtnToday');
const calBtnNext   = document.getElementById('calBtnNext');

function mountPractice(params){
  const base = params?.get('date') ? new Date(params.get('date')) : new Date();
  calWeekStart = calStartOfWeek(base);

  calBuildFrame();
  calRenderBase();

  // controls
  calBtnPrev.onclick  = ()=> calShiftWeek(-1);
  calBtnToday.onclick = ()=> { calWeekStart = calStartOfWeek(new Date()); calRenderBase(); calLoadBookingsForWeek().then(calRenderEvents); calUpdateNowLine(); };
  calBtnNext.onclick  = ()=> calShiftWeek(+1);

  // initial data (none yet)
  calLoadBookingsForWeek().then(calRenderEvents);

  // now-line
  clearInterval(calTimer);
  calTimer = setInterval(calUpdateNowLine, 60 * 1000);
  calUpdateNowLine();
}

function calBuildFrame(){
  // header days
  elCalHeader.innerHTML = '';
  elCalHeader.appendChild(document.createElement('div')); // spacer for time col
  for (let i=0;i<7;i++){
    const d = calAddDays(calWeekStart, i);
    const div = document.createElement('div');
    div.textContent = `${calWeekdayShort(d)} ${d.getMonth()+1}/${d.getDate()}`;
    elCalHeader.appendChild(div);
  }
  // times
  elCalTimes.innerHTML = '';
  for (let hr = CAL_HOUR_START; hr <= CAL_HOUR_END; hr++){
    const tick = document.createElement('div');
    tick.className = 'tick';
    tick.textContent = `${String(hr).padStart(2,'0')}:00`;
    elCalTimes.appendChild(tick);
  }
  // grid rows & cols
  const rows = ((CAL_HOUR_END - CAL_HOUR_START) * 60) / CAL_SLOT_MIN;
  elCalGrid.style.gridTemplateRows = `repeat(${rows}, ${CAL_ROW_H}px)`;
  elCalGrid.innerHTML = '';
  for (let i=0;i<7;i++){
    const col = document.createElement('div');
    col.className = 'day-col';
    col.dataset.dayIndex = i;
    elCalGrid.appendChild(col);
  }
}

function calRenderBase(){
  const start = calAddDays(calWeekStart, 0);
  const end   = calAddDays(calWeekStart, 6);
  elCalRange.textContent = `${calMonthName(start)} ${start.getDate()} – ${calMonthName(end)} ${end.getDate()}, ${end.getFullYear()}`;
  calClearEvents();
}

function calClearEvents(){ document.querySelectorAll('.cal-event').forEach(n => n.remove()); }

// TODO: Replace with Supabase query on your practice_bookings
async function calLoadBookingsForWeek(){
  // Expected row: { id, title, team_code, category, location, start: ISO, end: ISO }
  CAL_BOOKINGS = [];
  return CAL_BOOKINGS;
}

function calRenderEvents(){
  calClearEvents();
  const weekEnd = calAddDays(calWeekStart, 7); // exclusive
  const items = CAL_BOOKINGS.filter(e => new Date(e.end) > calWeekStart && new Date(e.start) < weekEnd);

  for (const ev of items){
    const { colIndex, topPx, heightPx } = calPlaceEvent(ev);
    const col = elCalGrid.children[colIndex];
    if (!col) continue;

    const node = document.createElement('div');
    node.className = `cal-event cat-${ev.category || ''}`;
    node.style.top = `${topPx}px`;
    node.style.height = `${heightPx}px`;
    node.innerHTML = `
      <div class="title">${ev.title || ev.team_code || 'Booking'}</div>
      <div class="meta">${calTimeHM(new Date(ev.start))}–${calTimeHM(new Date(ev.end))}${ev.location ? ' • ' + ev.location : ''}</div>
    `;
    col.appendChild(node);
  }
}

function calPlaceEvent(ev){
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  const dayIdx = Math.floor((calStartOfDay(s) - calWeekStart) / (24*3600*1000));
  const colIndex = Math.max(0, Math.min(6, dayIdx));
  const minsFrom = (s.getHours()*60 + s.getMinutes()) - (CAL_HOUR_START*60);
  const minsDur  = Math.max(15, (e - s) / 60000);
  const rowFrom  = Math.max(0, Math.floor(minsFrom / CAL_SLOT_MIN));
  const topPx    = rowFrom * CAL_ROW_H + 2;
  const heightPx = Math.max(CAL_ROW_H, Math.ceil(minsDur / CAL_SLOT_MIN) * CAL_ROW_H - 4);
  return { colIndex, topPx, heightPx };
}

function calUpdateNowLine(){
  const now = new Date();
  const sameWeek = calStartOfWeek(now).getTime() === calWeekStart.getTime();
  elCalNowLine.hidden = !sameWeek;
  if (sameWeek){
    const mins = now.getHours()*60 + now.getMinutes();
    const rel = mins - CAL_HOUR_START*60;
    const px = (rel / CAL_SLOT_MIN) * CAL_ROW_H;
    elCalNowLine.style.top = `${Math.max(0, px)}px`;
  }
}

function calShiftWeek(delta){
  calWeekStart = calAddDays(calWeekStart, delta*7);
  calBuildFrame();
  calRenderBase();
  calLoadBookingsForWeek().then(calRenderEvents);
  calUpdateNowLine();
}

// date helpers (calendar-only)
function calStartOfWeek(d){ const x=new Date(d); x.setHours(0,0,0,0); const day=x.getDay(); const diff=(day===0?-6:1)-day; x.setDate(x.getDate()+diff); return x; }
function calStartOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function calAddDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function calMonthName(d){ return d.toLocaleString(undefined,{month:'short'}); }
function calWeekdayShort(d){ return d.toLocaleString(undefined,{weekday:'short'}); }
function calTimeHM(d){ return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

// -------------------------------
// Wire up
// -------------------------------
window.addEventListener('DOMContentLoaded', ()=>{
  route();
  wireLogout();

  // Export buttons
  const btnMens  = document.getElementById('btnMenOpen') || document.getElementById('btnMensOpen');
  const btnLady  = document.getElementById('btnLadiesOpen');
  const btnMixO  = document.getElementById('btnMixedOpen');
  const btnMixC  = document.getElementById('btnMixedCorporate');
  const btnAll   = document.getElementById('btnExportAll');

  if(btnMens) btnMens.onclick   = () => exportTable('men_open_team_list',        'MenOpen',        btnMens);
  if(btnLady) btnLady.onclick   = () => exportTable('ladies_open_team_list',     'LadiesOpen',     btnLady);
  if(btnMixO) btnMixO.onclick   = () => exportTable('mixed_open_team_list',      'MixedOpen',      btnMixO);
  if(btnMixC) btnMixC.onclick   = () => exportTable('mixed_corporate_team_list', 'MixedCorporate', btnMixC);
  if(btnAll)  btnAll.onclick    = () => exportAllSequential();
});
