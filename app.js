/* ============================================================
   Hinse — Control Avícola
   app.js — Lógica principal
   ============================================================ */

'use strict';

// ─── STORAGE ─────────────────────────────────────────────────
const DB = {
  get(key)         { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set(key, val)    { localStorage.setItem(key, JSON.stringify(val)); },
  getObj(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; },
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

// ─── DASHBOARD (sin gráfico) ─────────────────────────────────
function renderDashboard() {
  renderKPIs();
  renderAlertas();
  renderActividad();
}

// ─── BACKUP A EXCEL (CSV) ────────────────────────────────────
function setupBackup() {
  document.getElementById('btnBackup').addEventListener('click', () => {

    let rows = [];
    rows.push([
      "Tipo","Fecha","Lote","Cantidad","Detalle"
    ]);

    const pushData = (key, tipo) => {
      DB.get(key).forEach(r => {
        rows.push([
          tipo,
          r.fecha || '',
          r.loteId || '',
          r.cantidad || r.huevos || r.kg || '',
          JSON.stringify(r)
        ]);
      });
    };

    pushData(KEYS.lotes, "Lote");
    pushData(KEYS.postura, "Postura");
    pushData(KEYS.alimentacion, "Alimentacion");
    pushData(KEYS.vacunacion, "Vacunacion");
    pushData(KEYS.medicacion, "Medicacion");
    pushData(KEYS.mortandad, "Mortandad");

    const csv = rows.map(r => r.map(x => `"${x}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');

    a.href = url;
    a.download = `hinse-backup-${today()}.csv`;
    a.click();

    URL.revokeObjectURL(url);

    showToast('📊 Backup descargado (Excel)');
  });

  // restore se mantiene igual
  document.getElementById('btnRestore').addEventListener('click', () => {
    document.getElementById('fileRestore').click();
  });
}