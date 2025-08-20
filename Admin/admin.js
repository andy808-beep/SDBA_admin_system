// -------------------------------
// Tiny Hash Router for #overview and #exports
// -------------------------------
const VIEWS = {
  '#overview': document.getElementById('view-overview'),
  '#exports':  document.getElementById('view-exports')
};

function parseHash(){
  const raw = location.hash || '#overview';
  const [path, query=''] = raw.split('?');
  const params = new URLSearchParams(query);
  return { path, params };
}

function route(){
  const { path } = parseHash();
  const target = VIEWS[path] ? path : '#overview';

  // Toggle visible view
  Object.entries(VIEWS).forEach(([key, el])=>{
    el.classList.toggle('active', key === target);
  });

  // Update active state in sidebar
  setActiveNav(target);
}

function setActiveNav(hashPath){
  document.querySelectorAll('#sidebarNav a').forEach(a=>{
    const isActive = a.getAttribute('data-route') === hashPath;
    a.classList.toggle('is-active', isActive);
    a.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

// Init
window.addEventListener('hashchange', route);

// Stub: logout hook
function wireLogout(){
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', ()=> alert('Hook logout() to Supabase later'));
}

// -------------------------------
// Supabase (frontend anon key; RLS must enforce admin-only read)
// -------------------------------
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// TODO: move URL/KEY to a shared supabase_config.js if you have one
const SUPABASE_URL  = "https://khqarcvszewerjckmtpg.supabase.co";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// -------------------------------
// CSV Export (UTF-8 BOM for Excel, paginated fetch)
// -------------------------------
const PAGE_SIZE = 1000;

async function fetchAllRows(table){
  let from = 0;
  const rows = [];
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await sb.from(table).select('*').range(from, to);
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
  if (!rows.length) return '\ufeffid\n'; // BOM + minimal header for empty tables
  const headers = buildHeaders(rows);
  const lines = [headers.join(',')];
  for (const r of rows){
    const row = headers.map(h => escapeCSV(r[h]));
    lines.push(row.join(','));
  }
  // Prepend UTF-8 BOM so Excel opens Chinese correctly
  return '\ufeff' + lines.join('\r\n');
}

function downloadCSV(csvText, filename){
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 4000);
}

function stamp(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
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
  // Updated table names per your schema
  await exportTable('mens_open_team_list',             'MensOpen',        buttons.mens);
  await exportTable('ladies_open_team_list',           'LadiesOpen',      buttons.ladies);
  await exportTable('mixed_open_team_list',            'MixedOpen',       buttons.mixedO);
  await exportTable('mixed_corporate_team_list',       'MixedCorporate',  buttons.mixedC);
}

// -------------------------------
// Wire up UI (buttons expect IDs from your HTML cards)
// -------------------------------
window.addEventListener('DOMContentLoaded', ()=>{
  route();
  wireLogout();

  // Single-export buttons (support either btnMenOpen or btnMensOpen just in case)
  const btnMens  = document.getElementById('btnMenOpen') || document.getElementById('btnMensOpen');
  const btnLady  = document.getElementById('btnLadiesOpen');
  const btnMixO  = document.getElementById('btnMixedOpen');
  const btnMixC  = document.getElementById('btnMixedCorporate');
  const btnAll   = document.getElementById('btnExportAll');

  if(btnMens) btnMens.onclick   = () => exportTable('mens_open_team_list',       'MensOpen',       btnMens);
  if(btnLady) btnLady.onclick   = () => exportTable('ladies_open_team_list',     'LadiesOpen',     btnLady);
  if(btnMixO) btnMixO.onclick   = () => exportTable('mixed_open_team_list',      'MixedOpen',      btnMixO);
  if(btnMixC) btnMixC.onclick   = () => exportTable('mixed_corporate_team_list', 'MixedCorporate', btnMixC);
  if(btnAll)  btnAll.onclick    = () => exportAllSequential();
});