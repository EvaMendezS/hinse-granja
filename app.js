'use strict';

/* ================= STORAGE ================= */

const DB = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },

  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

const KEYS = {
  lotes: 'hinse_lotes',
  postura: 'hinse_postura',
  alimentacion: 'hinse_alimentacion',
  vacunacion: 'hinse_vacunacion',
  medicacion: 'hinse_medicacion',
  mortandad: 'hinse_mortandad'
};

/* ================= UTILS ================= */

const today = () => new Date().toISOString().split('T')[0];

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ================= INIT ================= */

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('splash')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
    init();
  }, 1200);
});

function init() {
  setupNav();
  setupBackup();
  renderDashboard();
}

/* ================= NAV ================= */

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;

      document.querySelectorAll('.view')
        .forEach(v => v.classList.remove('active'));

      document.getElementById(`view-${view}`)?.classList.add('active');
    });
  });
}

/* ================= DASHBOARD ================= */

function renderDashboard() {
  renderKPIs();
  renderAlertas();
}

function renderKPIs() {
  const lotes = DB.get(KEYS.lotes);
  const mort = DB.get(KEYS.mortandad);

  const totalAves = lotes.reduce((a, b) => a + (Number(b.cantidadActual) || 0), 0);
  const bajas = mort.reduce((a, b) => a + (Number(b.cantidad) || 0), 0);

  const el = document.getElementById('kpiGrid');
  if (!el) return;

  el.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-value">${totalAves}</div>
      <div class="kpi-label">Total aves</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-value">${bajas}</div>
      <div class="kpi-label">Mortandad</div>
    </div>
  `;
}

function renderAlertas() {
  const el = document.getElementById('alertasList');
  if (el) el.innerHTML = '';
}

/* ================= BACKUP ================= */

function setupBackup() {
  document.getElementById('btnBackup')?.addEventListener('click', () => {
    const data = {};

    Object.values(KEYS).forEach(k => {
      data[k] = DB.get(k);
    });

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-hinse-${today()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  });
}