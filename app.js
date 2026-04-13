/* ============================================================
   Hinse — Control Avícola
   app.js — Lógica principal
   Almacenamiento: localStorage (sin servidor, 100% offline)
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

  document.querySelectorAll('input[type="date"]').forEach(i => { if (!i.value) i.value = today(); });
  document.getElementById('posturaHuevos').addEventListener('input', calcPosturaPct);
  document.getElementById('posturaLote').addEventListener('change', calcPosturaPct);
}

// ─── NAVEGACIÓN ───────────────────────────────────────────────
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

  if (view === 'dashboard')    renderDashboard();
  if (view === 'postura')      fillLoteSelect('posturaLote');
  if (view === 'alimentacion') fillLoteSelect('alimentacionLote');
  if (view === 'vacunacion')   fillLoteSelect('vacunacionLote');
  if (view === 'medicacion')   fillLoteSelect('medicacionLote');
  if (view === 'mortandad')    fillLoteSelect('mortandadLote');
}

// ─── MODALES ─────────────────────────────────────────────────
window.openModal = function(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (id === 'modalPostura')      fillLoteSelect('posturaLote');
  if (id === 'modalAlimentacion') fillLoteSelect('alimentacionLote');
  if (id === 'modalVacunacion')   fillLoteSelect('vacunacionLote');
  if (id === 'modalMedicacion')   fillLoteSelect('medicacionLote');
  if (id === 'modalMortandad')    fillLoteSelect('mortandadLote');
};

window.closeModal = function(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
  clearModalForm(id);
};

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); });
});

function clearModalForm(modalId) {
  document.querySelectorAll(`#${modalId} input:not([type=hidden]), #${modalId} select, #${modalId} textarea`).forEach(el => {
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  document.querySelectorAll(`#${modalId} input[type=hidden]`).forEach(el => el.value = '');
  document.querySelectorAll(`#${modalId} input[type=date]`).forEach(el => el.value = today());
}

function fillLoteSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const lotes = DB.get(KEYS.lotes);
  sel.innerHTML = lotes.length
    ? lotes.map(l => `<option value="${l.id}">${l.nombre} (${l.cantidadActual} aves)</option>`).join('')
    : '<option value="">— Sin lotes registrados —</option>';
}

// ─── DASHBOARD ────────────────────────────────────────────────
function populateDashDate() {
  const el = document.getElementById('dashDate');
  const d  = new Date();
  el.textContent = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function renderDashboard() {
  renderKPIs();
  renderAlertas();
  renderActividad();
}

// ─── KPIs ─────────────────────────────────────────────────────
function renderKPIs() {
  const lotes      = DB.get(KEYS.lotes);
  const mortandades = DB.get(KEYS.mortandad);
  const vacunas    = DB.get(KEYS.vacunacion);
  const medicacion = DB.get(KEYS.medicacion);

  const ponedoras = lotes.filter(l => l.etapa === 'produccion').reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);
  const recrías   = lotes.filter(l => l.etapa === 'recria').reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);
  const totalAves = ponedoras + recrías;
  const totalBajas = mortandades.reduce((s, m) => s + (parseInt(m.cantidad) || 0), 0);

  const ultimos7 = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    ultimos7.push(d.toISOString().split('T')[0]);
  }

  const vacReciente = vacunas.filter(v => ultimos7.includes(v.fecha)).length;
  const medReciente = medicacion.filter(m => ultimos7.includes(m.fecha)).length;

  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon">🐔</div>
      <div class="kpi-value">${totalAves.toLocaleString('es')}</div>
      <div class="kpi-label">Total Aves</div>
      <div class="kpi-delta">${lotes.length} lote(s)</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon">🥚</div>
      <div class="kpi-value">${ponedoras.toLocaleString('es')}</div>
      <div class="kpi-label">Ponedoras</div>
      <div class="kpi-delta">${recrías.toLocaleString('es')} en recría</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon">💀</div>
      <div class="kpi-value">${totalBajas.toLocaleString('es')}</div>
      <div class="kpi-label">Mortandad Total</div>
      <div class="kpi-delta">${totalAves > 0 ? ((totalBajas / (totalAves + totalBajas)) * 100).toFixed(1) + '%' : '—'}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon">💉</div>
      <div class="kpi-value">${vacReciente + medReciente}</div>
      <div class="kpi-label">Sanidad (7d)</div>
      <div class="kpi-delta">${vacReciente} vacuna(s) · ${medReciente} med.</div>
    </div>
  `;
}

// ─── ALERTAS ─────────────────────────────────────────────────
function renderAlertas() {
  const vacunas = DB.get(KEYS.vacunacion);
  const alertas = [];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  vacunas.forEach(v => {
    if (!v.proximaFecha) return;
    const prox = new Date(v.proximaFecha); prox.setHours(0, 0, 0, 0);
    const diff = Math.ceil((prox - hoy) / 864e5);

    if (diff >= 0 && diff <= 7)
      alertas.push({ icon: '💉', title: `Vacuna próxima: ${v.vacuna}`, text: ` — En ${diff} día(s)` });

    if (diff < 0 && diff > -3)
      alertas.push({ icon: '🔴', title: `Vacuna vencida: ${v.vacuna}`, text: ` — Hace ${Math.abs(diff)} día(s)` });
  });

  const el = document.getElementById('alertasList');
  el.innerHTML = alertas.length
    ? alertas.map(a => `
        <div class="alerta-item">
          <span>${a.icon}</span>
          <strong>${a.title}</strong> ${a.text}
        </div>`).join('')
    : '✅ Sin alertas';
}

// ─── ACTIVIDAD ────────────────────────────────────────────────
function renderActividad() {
  const items = [];
  const push = (key, icon, label) =>
    DB.get(key).slice(-5).reverse().forEach(r =>
      items.push({ icon, text: label(r), ts: r.createdAt || r.fecha || '' })
    );

  push(KEYS.postura,      '🥚', r => `Postura: ${r.huevos}`);
  push(KEYS.lotes,        '🐣', r => `Ingreso: ${r.nombre}`);
  push(KEYS.vacunacion,   '💉', r => `Vacuna: ${r.vacuna}`);
  push(KEYS.mortandad,    '💀', r => `Mortandad: ${r.cantidad}`);
  push(KEYS.alimentacion, '🌾', r => `Alimento: ${r.kg}kg`);

  items.sort((a, b) => (b.ts > a.ts ? 1 : -1));

  const el = document.getElementById('actividadList');
  el.innerHTML = items.slice(0, 8).map(it => `
    <div>
      ${it.icon} ${it.text} - ${fmtDate(it.ts)}
    </div>
  `).join('');
}

// ─── RESTO SIN CAMBIOS (lotes, postura, etc.) ─────────────────
// (todo lo demás queda igual como lo tenías)