/* ============================================================
   Hinse — Control Avícola
   app.js — Lógica principal
   ============================================================ */

'use strict';

// ─── STORAGE ─────────────────────────────────────────────────
const DB = {
  get(key)         { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set(key, val)    { localStorage.setItem(key, JSON.stringify(val)); },
  getObj(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } },
};

const KEYS = {
  lotes:        'hinse_lotes',
  postura:      'hinse_postura',
  alimentacion: 'hinse_alimentacion',
  vacunacion:   'hinse_vacunacion',
  medicacion:   'hinse_medicacion',
  mortandad:    'hinse_mortandad',
};

// ─── UTILIDADES ───────────────────────────────────────────────
const uid     = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtDate = d => { if (!d) return '—'; const [y, m, dia] = d.split('-'); return `${dia}/${m}/${y}`; };
const today   = () => new Date().toISOString().split('T')[0];

function showToast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), ms);
}

// ─── INIT ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('splash').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('splash').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      init();
    }, 500);
  }, 2000);
});

function init() {
  setupNav();
  setupBackup();
  populateDashDate();
  renderDashboard();
}

// ─── DASHBOARD (SIN GRÁFICO) ─────────────────────────────────
function renderDashboard() {
  renderKPIs();
  renderAlertas();
  renderActividad();
}

// ─── KPIs ─────────────────────────────────────────────────────
function renderKPIs() {
  const lotes = DB.get(KEYS.lotes);
  const mortandades = DB.get(KEYS.mortandad);

  const totalAves = lotes.reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);
  const totalBajas = mortandades.reduce((s, m) => s + (parseInt(m.cantidad) || 0), 0);

  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-value">${totalAves}</div>
      <div class="kpi-label">Total Aves</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${totalBajas}</div>
      <div class="kpi-label">Mortandad</div>
    </div>
  `;
}

// ─── ALERTAS ─────────────────────────────────────────────────
function renderAlertas() {
  const el = document.getElementById('alertasList');
  el.innerHTML = '<p style="color:var(--text3)">Sin alertas</p>';
}

// ─── ACTIVIDAD ───────────────────────────────────────────────
function renderActividad() {
  const el = document.getElementById('actividadList');
  el.innerHTML = '<p style="color:var(--text3)">Sin actividad</p>';
}

// ─── BACKUP SIMPLE ───────────────────────────────────────────
function setupBackup() {
  document.getElementById('btnBackup').addEventListener('click', () => {
    const data = {};
    Object.values(KEYS).forEach(k => data[k] = DB.get(k));

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup.json';
    a.click();

    URL.revokeObjectURL(url);
    showToast('Backup descargado');
  });
}

// ─── NAV ─────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-' + btn.dataset.view).classList.add('active');
    });
  });
}

// ─── FECHA ───────────────────────────────────────────────────
function populateDashDate() {
  const el = document.getElementById('dashDate');
  el.textContent = new Date().toLocaleDateString();
}