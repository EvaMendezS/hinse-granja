/* ============================================================
   Hinse — Control Avícola
   app.js — Lógica principal (CORREGIDO)
   ============================================================ */

'use strict';

// ─── STORAGE ─────────────────────────────────────────────────
const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },

  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  getObj(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch { return def; }
  },
};

const KEYS = {
  lotes: 'hinse_lotes',
  postura: 'hinse_postura',
  alimentacion: 'hinse_alimentacion',
  vacunacion: 'hinse_vacunacion',
  medicacion: 'hinse_medicacion',
  mortandad: 'hinse_mortandad',
};

// ─── UTILIDADES ───────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const fmtDate = d => {
  if (!d) return '—';
  const [y, m, dia] = d.split('-');
  return `${dia}/${m}/${y}`;
};

const today = () => new Date().toISOString().split('T')[0];

function showToast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), ms);
}

// ─── SPLASH ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');

    if (splash) splash.style.opacity = '0';

    setTimeout(() => {
      if (splash) splash.classList.add('hidden');
      if (app) app.classList.remove('hidden');
      init();
    }, 500);
  }, 2000);
});

// ─── INIT ─────────────────────────────────────────────────────
function init() {
  try {
    setupNav();
    setupBackup();
    populateDashDate();
    renderDashboard();
  } catch (e) {
    console.error('INIT ERROR:', e);
  }
}

// ─── NAV ──────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      navigateTo(view);

      document.querySelectorAll('.nav-btn')
        .forEach(b => b.classList.remove('active'));

      btn.classList.add('active');
    });
  });
}

function navigateTo(view) {
  document.querySelectorAll('.view')
    .forEach(v => v.classList.remove('active'));

  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.add('active');

  if (view === 'dashboard') renderDashboard();
}

// ─── DASHBOARD ────────────────────────────────────────────────
function populateDashDate() {
  const el = document.getElementById('dashDate');
  if (!el) return;

  el.textContent = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

function renderDashboard() {
  renderKPIs();
  renderAlertas();
  renderActividad();
}

// ─── KPIs ─────────────────────────────────────────────────────
function renderKPIs() {
  const lotes = DB.get(KEYS.lotes);
  const mortandades = DB.get(KEYS.mortandad);

  const ponedoras = lotes
    .filter(l => l.etapa === 'produccion')
    .reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);

  const recrias = lotes
    .filter(l => l.etapa === 'recria')
    .reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);

  const totalAves = ponedoras + recrias;

  const totalBajas = mortandades
    .reduce((s, m) => s + (parseInt(m.cantidad) || 0), 0);

  const grid = document.getElementById('kpiGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-value">${totalAves}</div>
      <div class="kpi-label">Total Aves</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-value">${ponedoras}</div>
      <div class="kpi-label">Ponedoras</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-value">${totalBajas}</div>
      <div class="kpi-label">Mortandad Total</div>
    </div>
  `;
}

// ─── ALERTAS ─────────────────────────────────────────────────
function renderAlertas() {
  const el = document.getElementById('alertasList');
  if (!el) return;
  el.innerHTML = '';
}

// ─── ACTIVIDAD ────────────────────────────────────────────────
function renderActividad() {
  const el = document.getElementById('actividadList');
  if (!el) return;
  el.innerHTML = '';
}

// ─── BACKUP ───────────────────────────────────────────────────
function setupBackup() {
  const btn = document.getElementById('btnBackup');
  const file = document.getElementById('fileRestore');

  if (btn) {
    btn.addEventListener('click', () => {
      const data = {};

      Object.values(KEYS).forEach(k => {
        data[k] = DB.get(k);
      });

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = `hinse-backup-${today()}.json`;
      a.click();

      URL.revokeObjectURL(url);
      showToast('💾 Backup descargado');
    });
  }

  if (file) {
    file.addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;

      const reader = new FileReader();

      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);

          Object.values(KEYS).forEach(k => {
            if (data[k]) DB.set(k, data[k]);
          });

          showToast('📂 Restaurado');
          location.reload();

        } catch {
          showToast('❌ Backup inválido');
        }
      };

      reader.readAsText(f);
    });
  }
}

// ─── SERVICE WORKER ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}