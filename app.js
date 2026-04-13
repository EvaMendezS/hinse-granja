'use strict';

/* ================= STORAGE ================= */

const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
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

const fmtDate = d => {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

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
  renderActividad();
}

/* ================= KPIs (RESTAURADO PRO) ================= */

function renderKPIs() {
  const lotes = DB.get(KEYS.lotes);
  const mort = DB.get(KEYS.mortandad);
  const med = DB.get(KEYS.medicacion);
  const vac = DB.get(KEYS.vacunacion);

  let totalAves = 0;
  let recria = 0;
  let produccion = 0;

  lotes.forEach(l => {
    const cant = Number(l.cantidadActual) || 0;
    totalAves += cant;

    if (l.etapa === 'recria') recria += cant;
    if (l.etapa === 'produccion') produccion += cant;
  });

  const bajas = mort.reduce((a, b) => a + (Number(b.cantidad) || 0), 0);

  const el = document.getElementById('kpiGrid');
  if (!el) return;

  el.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon">🐔</div>
      <div class="kpi-value">${totalAves}</div>
      <div class="kpi-label">Total Aves</div>
      <div class="kpi-delta">🐣 Recría: ${recria} | 🥚 Producción: ${produccion}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon">💀</div>
      <div class="kpi-value">${bajas}</div>
      <div class="kpi-label">Mortandad Total</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon">💉</div>
      <div class="kpi-value">${vac.slice(-1)[0]?.vacuna || '—'}</div>
      <div class="kpi-label">Última Vacuna</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon">💊</div>
      <div class="kpi-value">${med.slice(-1)[0]?.nombre || '—'}</div>
      <div class="kpi-label">Última Medicación</div>
    </div>
  `;
}

/* ================= ALERTAS ================= */

function renderAlertas() {
  const el = document.getElementById('alertasList');
  if (!el) return;

  const mort = DB.get(KEYS.mortandad);

  const ultimos = mort.slice(-5).reverse();

  el.innerHTML = ultimos.length
    ? ultimos.map(m => `
      <div class="alerta-item">
        <span>💀</span>
        <strong>${m.cantidad} bajas</strong>
        <span>${fmtDate(m.fecha)} - ${m.causa || ''}</span>
      </div>
    `).join('')
    : '<p>Sin alertas</p>';
}

/* ================= ACTIVIDAD ================= */

function renderActividad() {
  const el = document.getElementById('actividadList');
  if (!el) return;

  const vac = DB.get(KEYS.vacunacion).slice(-3).reverse();
  const med = DB.get(KEYS.medicacion).slice(-3).reverse();

  const items = [];

  vac.forEach(v => items.push(`💉 Vacuna: ${v.vacuna} - ${fmtDate(v.fecha)}`));
  med.forEach(m => items.push(`💊 Medicación: ${m.nombre} - ${fmtDate(m.fecha)}`));

  el.innerHTML = items.length
    ? items.map(i => `<div class="actividad-item">${i}</div>`).join('')
    : '<p>Sin actividad reciente</p>';
}

/* ================= BACKUP ================= */

function setupBackup() {
  document.getElementById('btnBackup')?.addEventListener('click', () => {
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
  });
}