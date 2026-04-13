/* ============================================================
   Hinse — Control Avícola
   app.js — Lógica principal
   Almacenamiento: localStorage (sin servidor, 100% offline)
   ============================================================ */

'use strict';

// ─── STORAGE ─────────────────────────────────────────────────
const DB = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  getObj(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } },
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
const fmtDate = d => { if (!d) return '—'; const [y, m, dia] = d.split('-'); return `${dia}/${m}/${y}`; };
const today = () => new Date().toISOString().split('T')[0];

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

  document.getElementById('posturaHuevos').addEventListener('input', calcPosturaPct);
  document.getElementById('posturaLote').addEventListener('change', calcPosturaPct);
}

// ─── NAV ─────────────────────────────────────────────────────
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
  if (view === 'postura') fillLoteSelect('posturaLote');
  if (view === 'alimentacion') fillLoteSelect('alimentacionLote');
  if (view === 'vacunacion') fillLoteSelect('vacunacionLote');
  if (view === 'medicacion') fillLoteSelect('medicacionLote');
  if (view === 'mortandad') fillLoteSelect('mortandadLote');
}

// ─── MODALES ────────────────────────────────────────────────
window.openModal = function(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
  clearModalForm(id);
};

function clearModalForm(modalId) {
  document.querySelectorAll(`#${modalId} input, #${modalId} select, #${modalId} textarea`)
    .forEach(el => {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
}

// ─── LOTE ───────────────────────────────────────────────────
window.saveLote = function() {
  const id = document.getElementById('loteId').value;

  const registro = {
    id: id || uid(),
    fecha: document.getElementById('loteFecha').value,
    nombre: document.getElementById('loteNombre').value.trim(),
    cantidadInicial: parseInt(document.getElementById('loteCantidad').value) || 0,
    cantidadActual: parseInt(document.getElementById('loteCantidad').value) || 0,
    raza: document.getElementById('loteRaza').value.trim(),
    semana: document.getElementById('loteSemana').value,
    procedencia: document.getElementById('loteProcedencia').value.trim(),
    etapa: document.getElementById('loteEtapa').value,
    notas: document.getElementById('loteNotas').value.trim(),
    createdAt: today(),
  };

  if (!registro.nombre || !registro.cantidadInicial)
    return showToast('⚠️ Completá datos');

  const lotes = DB.get(KEYS.lotes);

  if (id) {
    const i = lotes.findIndex(l => l.id === id);
    if (i > -1) lotes[i] = registro;
  } else {
    lotes.push(registro);
  }

  DB.set(KEYS.lotes, lotes);

  closeModal('modalLote');
  renderLote();
  renderDashboard();
  showToast('✅ Lote guardado');
};

// ─── POSTURA ───────────────────────────────────────────────
window.savePostura = function() {
  const r = {
    id: document.getElementById('posturaId').value || uid(),
    fecha: document.getElementById('posturaFecha').value,
    loteId: document.getElementById('posturaLote').value,
    huevos: parseInt(document.getElementById('posturaHuevos').value) || 0,
    rotos: parseInt(document.getElementById('posturaRotos').value) || 0,
    notas: document.getElementById('posturaNotas').value.trim(),
    createdAt: today(),
  };

  const list = DB.get(KEYS.postura);
  const i = list.findIndex(x => x.id === r.id);

  if (i > -1) list[i] = r;
  else list.push(r);

  DB.set(KEYS.postura, list);

  closeModal('modalPostura');
  renderPostura();
  showToast('✅ Postura guardada');
};

// ─── ALIMENTACIÓN ───────────────────────────────────────────
window.saveAlimentacion = function() {
  const r = {
    id: document.getElementById('alimentacionId').value || uid(),
    fecha: document.getElementById('alimentacionFecha').value,
    loteId: document.getElementById('alimentacionLote').value,
    tipo: document.getElementById('alimentacionTipo').value.trim(),
    kg: parseFloat(document.getElementById('alimentacionKg').value) || 0,
    grAve: parseFloat(document.getElementById('alimentacionGrAve').value) || 0,
    proveedor: document.getElementById('alimentacionProveedor').value.trim(),
    costo: parseFloat(document.getElementById('alimentacionCosto').value) || 0,
    notas: document.getElementById('alimentacionNotas').value.trim(),
    createdAt: today(),
  };

  const list = DB.get(KEYS.alimentacion);
  const i = list.findIndex(x => x.id === r.id);

  if (i > -1) list[i] = r;
  else list.push(r);

  DB.set(KEYS.alimentacion, list);

  closeModal('modalAlimentacion');
  renderAlimentacion();
  showToast('✅ Alimentación guardada');
};

// ─── VACUNACIÓN ─────────────────────────────────────────────
window.saveVacunacion = function() {
  const r = {
    id: document.getElementById('vacunacionId').value || uid(),
    fecha: document.getElementById('vacunacionFecha').value,
    loteId: document.getElementById('vacunacionLote').value,
    vacuna: document.getElementById('vacunaNombre').value.trim(),
    via: document.getElementById('vacunaVia').value,
    dosis: document.getElementById('vacunaDosis').value.trim(),
    aplicador: document.getElementById('vacunaAplicador').value.trim(),
    proximaFecha: document.getElementById('vacunaProxima').value,
    notas: document.getElementById('vacunaNotas').value.trim(),
    createdAt: today(),
  };

  const list = DB.get(KEYS.vacunacion);
  const i = list.findIndex(x => x.id === r.id);

  if (i > -1) list[i] = r;
  else list.push(r);

  DB.set(KEYS.vacunacion, list);

  closeModal('modalVacunacion');
  renderVacunacion();
  renderDashboard();
  showToast('✅ Vacunación guardada');
};

// ─── MEDICACIÓN ─────────────────────────────────────────────
window.saveMedicacion = function() {
  const r = {
    id: document.getElementById('medicacionId').value || uid(),
    fecha: document.getElementById('medicacionFecha').value,
    loteId: document.getElementById('medicacionLote').value,
    nombre: document.getElementById('medicamentoNombre').value.trim(),
    motivo: document.getElementById('medicamentoMotivo').value.trim(),
    dosis: document.getElementById('medicamentoDosis').value.trim(),
    dias: document.getElementById('medicamentoDias').value,
    vet: document.getElementById('medicamentoVet').value.trim(),
    notas: document.getElementById('medicamentoNotas').value.trim(),
    createdAt: today(),
  };

  const list = DB.get(KEYS.medicacion);
  const i = list.findIndex(x => x.id === r.id);

  if (i > -1) list[i] = r;
  else list.push(r);

  DB.set(KEYS.medicacion, list);

  closeModal('modalMedicacion');
  renderMedicacion();
  showToast('✅ Medicación guardada');
};

// ─── MORTANDAD ──────────────────────────────────────────────
window.saveMortandad = function() {
  const r = {
    id: document.getElementById('mortandadId').value || uid(),
    fecha: document.getElementById('mortandadFecha').value,
    loteId: document.getElementById('mortandadLote').value,
    cantidad: parseInt(document.getElementById('mortandadCantidad').value) || 0,
    causa: document.getElementById('mortandadCausa').value,
    desc: document.getElementById('mortandadDesc').value.trim(),
    necropsia: document.getElementById('mortandadNecropsia').value,
    createdAt: today(),
  };

  if (!r.loteId || !r.cantidad)
    return showToast('⚠️ Datos incompletos');

  const lotes = DB.get(KEYS.lotes);
  const iL = lotes.findIndex(l => l.id === r.loteId);

  if (iL > -1) {
    lotes[iL].cantidadActual =
      Math.max(0, (parseInt(lotes[iL].cantidadActual) || 0) - r.cantidad);

    DB.set(KEYS.lotes, lotes);
  }

  const list = DB.get(KEYS.mortandad);
  list.push(r);
  DB.set(KEYS.mortandad, list);

  closeModal('modalMortandad');
  renderMortandad();
  renderDashboard();
  showToast('✅ Mortandad guardada');
};

// ─── RENDER DASHBOARD (SIN GRÁFICO) ─────────────────────────
function renderDashboard() {
  renderKPIs();
  renderAlertas();
  renderActividad();
}

// ─── KPIs ────────────────────────────────────────────────────
function renderKPIs() {
  const lotes = DB.get(KEYS.lotes);
  const mort = DB.get(KEYS.mortandad);

  const totalAves = lotes.reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);
  const bajas = mort.reduce((s, m) => s + (parseInt(m.cantidad) || 0), 0);

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card">🐔 ${totalAves} Aves</div>
    <div class="kpi-card">💀 ${bajas} Bajas</div>
  `;
}

// ─── HELPERS ────────────────────────────────────────────────
function getLoteNombre(id) {
  const l = DB.get(KEYS.lotes).find(x => x.id === id);
  return l ? l.nombre : '(lote eliminado)';
}

// ─── SERVICE WORKER ─────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}