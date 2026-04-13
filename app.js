/* ============================================================
   Hinse — Control Avícola
   app.js — versión limpia dashboard simplificado
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

// ─── SPLASH ───────────────────────────────────────────────────
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

// ─── INIT ─────────────────────────────────────────────────────
function init() {
  setupNav();
  setupBackup();
  populateDashDate();

  renderDashboard();

  renderLote();
  renderPostura();
  renderAlimentacion();
  renderVacunacion();
  renderMedicacion();
  renderMortandad();

  document.querySelectorAll('input[type="date"]').forEach(i => {
    if (!i.value) i.value = today();
  });
}

// ─── NAV ──────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      navigateTo(view);

      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.add('active');

  if (view === 'dashboard') renderDashboard();
}

// ─── DASHBOARD ────────────────────────────────────────────────
function renderDashboard() {
  renderKPIs();
  renderAlertas();
  renderActividad();
}

// ─── KPIs SIMPLES ─────────────────────────────────────────────
function renderKPIs() {
  const lotes = DB.get(KEYS.lotes);
  const mortandades = DB.get(KEYS.mortandad);
  const vacunas = DB.get(KEYS.vacunacion);

  const totalAves = lotes.reduce((s, l) =>
    s + (parseInt(l.cantidadActual) || 0), 0
  );

  const totalBajas = mortandades.reduce((s, m) =>
    s + (parseInt(m.cantidad) || 0), 0
  );

  const totalVacunas = vacunas.length;

  const grid = document.getElementById('kpiGrid');

  grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-value">${totalAves}</div>
      <div class="kpi-label">Cantidad total</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-value">${totalBajas}</div>
      <div class="kpi-label">Mortandad</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-value">${totalVacunas}</div>
      <div class="kpi-label">Vacunación</div>
    </div>
  `;
}

// ─── ALERTAS (SIN CAMBIOS FUNCIONALES) ───────────────────────
function renderAlertas() {
  const el = document.getElementById('alertasList');
  el.innerHTML = '<p style="color:#999">Sin alertas</p>';
}

// ─── ACTIVIDAD (SIN CAMBIOS LÓGICA) ──────────────────────────
function renderActividad() {
  const items = [];

  const push = (key, icon, label) =>
    DB.get(key).slice(-5).reverse().forEach(r =>
      items.push({ icon, text: label(r), ts: r.createdAt || r.fecha || '' })
    );

  push(KEYS.postura, '🥚', r => `Postura: ${r.huevos} huevos`);
  push(KEYS.lotes, '🐣', r => `Ingreso: ${r.nombre}`);
  push(KEYS.vacunacion, '💉', r => `Vacuna: ${r.vacuna}`);
  push(KEYS.mortandad, '💀', r => `Mortandad: ${r.cantidad} aves`);
  push(KEYS.alimentacion, '🌾', r => `Alimento: ${r.kg} kg`);

  items.sort((a, b) => (b.ts > a.ts ? 1 : -1));

  const el = document.getElementById('actividadList');

  el.innerHTML = items.length
    ? items.slice(0, 8).map(it => `
        <div class="actividad-item">
          <span>${it.icon}</span>
          <span>${it.text}</span>
        </div>
      `).join('')
    : '<p style="color:#999">Sin actividad</p>';
}

// ─── PLACEHOLDERS (NO MODIFICADOS) ───────────────────────────
function renderLote() {}
function renderPostura() {}
function renderAlimentacion() {}
function renderVacunacion() {}
function renderMedicacion() {}
function renderMortandad() {}

// ─── BACKUP (SI LO TENÍAS, SE MANTIENE) ──────────────────────
function setupBackup() {
  const btn = document.getElementById('btnBackup');
  if (btn) {
    btn.onclick = () => {
      const data = {};
      Object.values(KEYS).forEach(k => data[k] = DB.get(k));
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'hinse-backup.json';
      a.click();

      URL.revokeObjectURL(url);
    };
  }
}

// ─── HELPERS ──────────────────────────────────────────────────
function populateDashDate() {
  const el = document.getElementById('dashDate');
  if (el) el.textContent = new Date().toLocaleDateString('es-AR');
}