/* ============================================================
   Hinse — Control Avícola
   app.js — Lógica principal
   Almacenamiento: localStorage (sin servidor, 100% offline)
   ============================================================ */

'use strict';

// ─── STORAGE ─────────────────────────────────────────────────
const DB = {
  get(key)        { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set(key, val)   { localStorage.setItem(key, JSON.stringify(val)); },
  getObj(key, def){ try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } },
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
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmtDate = d => {
  if (!d) return '—';
  const [y,m,dia] = d.split('-');
  return `${dia}/${m}/${y}`;
};
const today = () => new Date().toISOString().split('T')[0];
const timeAgo = isoDate => {
  const diff = Date.now() - new Date(isoDate).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (h < 1)  return 'hace un momento';
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
};

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

  // Auto-fill today's date in all date inputs
  document.querySelectorAll('input[type="date"]').forEach(i => { if (!i.value) i.value = today(); });

  // Cálculo automático % postura
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
  if (view === 'dashboard') renderDashboard();
  if (view === 'postura') fillLoteSelect('posturaLote');
  if (view === 'alimentacion') fillLoteSelect('alimentacionLote');
  if (view === 'vacunacion') fillLoteSelect('vacunacionLote');
  if (view === 'medicacion') fillLoteSelect('medicacionLote');
  if (view === 'mortandad') fillLoteSelect('mortandadLote');
}

// ─── MODALES ─────────────────────────────────────────────────
window.openModal = function(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('hidden');
  document.querySelector('body').style.overflow = 'hidden';
  // Fill selects
  if (id === 'modalPostura')      fillLoteSelect('posturaLote');
  if (id === 'modalAlimentacion') fillLoteSelect('alimentacionLote');
  if (id === 'modalVacunacion')   fillLoteSelect('vacunacionLote');
  if (id === 'modalMedicacion')   fillLoteSelect('medicacionLote');
  if (id === 'modalMortandad')    fillLoteSelect('mortandadLote');
};

window.closeModal = function(id) {
  document.getElementById(id).classList.add('hidden');
  document.querySelector('body').style.overflow = '';
  clearModalForm(id);
};

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); });
});

function clearModalForm(modalId) {
  document.querySelectorAll(`#${modalId} input:not([type=hidden]), #${modalId} select, #${modalId} textarea`).forEach(el => {
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  document.querySelectorAll(`#${modalId} input[type=hidden]`).forEach(el => el.value = '');
  // Reset date fields to today
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
  const d = new Date();
  el.textContent = d.toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' });
}

function renderDashboard() {
  renderKPIs();
  renderCharts();
  renderAlertas();
  renderActividad();
}

function renderKPIs() {
  const lotes       = DB.get(KEYS.lotes);
  const mortandades = DB.get(KEYS.mortandad);

  const totalAves  = lotes.reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);
  const totalBajas = mortandades.reduce((s, m) => s + (parseInt(m.cantidad) || 0), 0);

  // Muertes hoy
  const todayStr   = today();
  const muertesHoy = mortandades
    .filter(m => m.fecha === todayStr)
    .reduce((s, m) => s + (parseInt(m.cantidad) || 0), 0);

  // Muertes últimos 7 días
  const ultimos7 = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    ultimos7.push(d.toISOString().split('T')[0]);
  }
  const muertes7d = mortandades
    .filter(m => ultimos7.includes(m.fecha))
    .reduce((s, m) => s + (parseInt(m.cantidad) || 0), 0);

  const kpis = [
    {
      icon: '🐔',
      label: 'Total Aves',
      value: totalAves.toLocaleString('es'),
      color: 'var(--accent)',
      delta: lotes.length ? `${lotes.length} lote(s)` : '',
    },
    {
      icon: '💀',
      label: 'Mortandad Total',
      value: totalBajas.toLocaleString('es'),
      color: 'var(--red)',
      delta: totalAves > 0 ? `${((totalBajas / totalAves) * 100).toFixed(1)}% del lote` : '',
    },
    {
      icon: '📅',
      label: 'Muertes Hoy',
      value: muertesHoy.toLocaleString('es'),
      color: muertesHoy > 0 ? 'var(--red)' : 'var(--text3)',
      delta: muertesHoy > 0 ? '⚠️ Registrar causa' : '✅ Sin bajas hoy',
    },
    {
      icon: '📉',
      label: 'Bajas (7 días)',
      value: muertes7d.toLocaleString('es'),
      color: muertes7d > 0 ? '#c05050' : 'var(--text3)',
      delta: totalAves > 0 ? `${((muertes7d / totalAves) * 100).toFixed(2)}% del lote` : '',
    },
  ];

  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = kpis.map((k, i) => `
    <div class="kpi-card" style="--kpi-color:${k.color}; animation-delay:${i * 0.07}s">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      ${k.delta ? `<div class="kpi-delta">${k.delta}</div>` : ''}
    </div>
  `).join('');
}

let chartMortandad = null;
let chartLote      = null;

// Destruye el chart y resetea el canvas completamente para evitar loops de animación
function destroyChart(chartRef, canvasId) {
  if (chartRef) {
    chartRef.destroy();
    chartRef = null;
  }
  const old = document.getElementById(canvasId);
  if (old) {
    const nuevo = document.createElement('canvas');
    nuevo.id = canvasId;
    nuevo.height = 160;
    old.parentNode.replaceChild(nuevo, old);
  }
  return null;
}

function renderCharts() {
  renderChartMortandad();
  renderChartLote();
}

// ─── CHART: Mortandad últimos 7 días (reemplaza al de postura) ─
function renderChartMortandad() {
  chartMortandad = destroyChart(chartMortandad, 'chartMortandad');

  const mortandades = DB.get(KEYS.mortandad);
  const labels = [];
  const datos  = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const str = d.toISOString().split('T')[0];
    labels.push(d.toLocaleDateString('es-AR', { weekday: 'short' }));
    const total = mortandades
      .filter(m => m.fecha === str)
      .reduce((s, m) => s + (parseInt(m.cantidad) || 0), 0);
    datos.push(total);
  }

  const ctx = document.getElementById('chartMortandad').getContext('2d');
  chartMortandad = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: datos,
        backgroundColor: 'rgba(192,80,80,0.25)',
        borderColor: '#c05050',
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8a6848', font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: '#8a6848', font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,.04)' }, beginAtZero: true }
      },
      responsive: true,
      maintainAspectRatio: false,
    }
  });
}

function renderChartLote() {
  chartLote = destroyChart(chartLote, 'chartLote');

  const lotes = DB.get(KEYS.lotes);
  if (!lotes.length) return;

  const labels = lotes.map(l => l.nombre.length > 12 ? l.nombre.slice(0, 12) + '…' : l.nombre);
  const datos  = lotes.map(l => parseInt(l.cantidadActual) || 0);
  const colors = ['#c8853a', '#d4a043', '#a86828', '#7a9ab5', '#c05050', '#8a6848'];

  const ctx = document.getElementById('chartLote').getContext('2d');
  chartLote = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: datos, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      animation: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#c8a880', font: { size: 11 }, padding: 8 } }
      },
      responsive: true,
      maintainAspectRatio: false,
    }
  });
}

function renderAlertas() {
  const lotes   = DB.get(KEYS.lotes);
  const vacunas = DB.get(KEYS.vacunacion);
  const alertas = [];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  // Vacunas próximas (< 7 días)
  vacunas.forEach(v => {
    if (!v.proximaFecha) return;
    const prox = new Date(v.proximaFecha); prox.setHours(0, 0, 0, 0);
    const diff = Math.ceil((prox - hoy) / 864e5);
    if (diff >= 0 && diff <= 7) {
      alertas.push({ icon: '💉', title: `Vacuna próxima: ${v.vacuna}`, text: `En ${diff} día(s) — Lote: ${getLoteNombre(v.loteId)}` });
    }
    if (diff < 0 && diff > -3) {
      alertas.push({ icon: '🔴', title: `Vacuna vencida: ${v.vacuna}`, text: `Hace ${Math.abs(diff)} día(s) — Revisar!` });
    }
  });

  // Mortandad elevada hoy (más de 5 aves en cualquier lote)
  const hoyStr = today();
  const mortHoy = DB.get(KEYS.mortandad).filter(m => m.fecha === hoyStr);
  mortHoy.forEach(m => {
    if (parseInt(m.cantidad) >= 5) {
      alertas.push({ icon: '🚨', title: `Alta mortandad hoy: ${m.cantidad} aves`, text: `Lote: ${getLoteNombre(m.loteId)} — Verificar causa` });
    }
  });

  const el = document.getElementById('alertasList');
  if (!alertas.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.85rem;padding:8px 0">✅ Sin alertas pendientes</p>';
    return;
  }
  el.innerHTML = alertas.map(a => `
    <div class="alerta-item">
      <span class="alerta-icon">${a.icon}</span>
      <span class="alerta-text"><strong>${a.title}</strong>${a.text}</span>
    </div>
  `).join('');
}

function renderActividad() {
  const items = [];
  const addItems = (key, icon, label) => {
    DB.get(key).slice(-5).reverse().forEach(r => {
      items.push({ icon, text: label(r), ts: r.createdAt || r.fecha || '' });
    });
  };
  addItems(KEYS.postura,      '🥚', r => `Postura: ${r.huevos} huevos — ${getLoteNombre(r.loteId)}`);
  addItems(KEYS.lotes,        '🐣', r => `Ingreso lote: ${r.nombre} (${r.cantidadActual} aves)`);
  addItems(KEYS.vacunacion,   '💉', r => `Vacuna: ${r.vacuna} — ${getLoteNombre(r.loteId)}`);
  addItems(KEYS.mortandad,    '💀', r => `Mortandad: ${r.cantidad} ave(s) — ${getLoteNombre(r.loteId)}`);
  addItems(KEYS.alimentacion, '🌾', r => `Alimento: ${r.kg}kg — ${getLoteNombre(r.loteId)}`);

  items.sort((a, b) => (b.ts > a.ts ? 1 : -1));
  const el = document.getElementById('actividadList');
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.85rem;padding:8px 0">Aún no hay actividad registrada.</p>';
    return;
  }
  el.innerHTML = items.slice(0, 8).map(it => `
    <div class="actividad-item">
      <span style="font-size:1rem">${it.icon}</span>
      <span class="actividad-text">${it.text}</span>
      <span class="actividad-time">${fmtDate(it.ts)}</span>
    </div>
  `).join('');
}

// ─── LOTES ────────────────────────────────────────────────────
window.saveLote = function() {
  const id       = document.getElementById('loteId').value;
  const cantidad = parseInt(document.getElementById('loteCantidad').value) || 0;
  const registro = {
    id:              id || uid(),
    fecha:           document.getElementById('loteFecha').value,
    nombre:          document.getElementById('loteNombre').value.trim(),
    cantidadInicial: cantidad,
    cantidadActual:  cantidad,
    raza:            document.getElementById('loteRaza').value.trim(),
    semana:          document.getElementById('loteSemana').value,
    procedencia:     document.getElementById('loteProcedencia').value.trim(),
    etapa:           document.getElementById('loteEtapa').value,
    notas:           document.getElementById('loteNotas').value.trim(),
    createdAt:       today(),
  };
  if (!registro.nombre || !registro.cantidadInicial) return showToast('⚠️ Completá nombre y cantidad');

  const lotes = DB.get(KEYS.lotes);
  if (id) {
    const idx = lotes.findIndex(l => l.id === id);
    if (idx > -1) { registro.cantidadActual = lotes[idx].cantidadActual; lotes[idx] = registro; }
  } else {
    lotes.push(registro);
  }
  DB.set(KEYS.lotes, lotes);
  closeModal('modalLote');
  renderLote();
  renderDashboard();
  showToast('✅ Lote guardado');
};

function renderLote() {
  const lotes = DB.get(KEYS.lotes);
  const el = document.getElementById('loteList');
  if (!lotes.length) { el.innerHTML = emptyState('🐣', 'Sin lotes registrados'); return; }

  el.innerHTML = lotes.slice().reverse().map(l => `
    <div class="data-card">
      <div class="data-card-header">
        <span class="data-card-title">${l.nombre}</span>
        <span class="badge ${l.etapa === 'produccion' ? 'badge-green' : 'badge-gold'}">${l.etapa === 'produccion' ? 'Producción' : 'Recría'}</span>
      </div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Ingreso</span><span class="val">${fmtDate(l.fecha)}</span></div>
        <div class="data-field"><span class="lbl">Aves actuales</span><span class="val">${(parseInt(l.cantidadActual) || 0).toLocaleString('es')}</span></div>
        <div class="data-field"><span class="lbl">Raza</span><span class="val">${l.raza || '—'}</span></div>
        <div class="data-field"><span class="lbl">Semana de vida</span><span class="val">${l.semana || '—'}</span></div>
        <div class="data-field"><span class="lbl">Procedencia</span><span class="val">${l.procedencia || '—'}</span></div>
        <div class="data-field"><span class="lbl">Ingreso inicial</span><span class="val">${(parseInt(l.cantidadInicial) || 0).toLocaleString('es')}</span></div>
      </div>
      ${l.notas ? `<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${l.notas}</p>` : ''}
      <div class="data-card-actions">
        <button class="btn-edit" onclick="editLote('${l.id}')">✏️ Editar</button>
        <button class="btn-delete" onclick="deleteLote('${l.id}')">🗑️ Eliminar</button>
      </div>
    </div>
  `).join('');
}

window.editLote = function(id) {
  const l = DB.get(KEYS.lotes).find(x => x.id === id);
  if (!l) return;
  document.getElementById('loteId').value         = l.id;
  document.getElementById('loteFecha').value       = l.fecha;
  document.getElementById('loteNombre').value      = l.nombre;
  document.getElementById('loteCantidad').value    = l.cantidadActual;
  document.getElementById('loteRaza').value        = l.raza;
  document.getElementById('loteSemana').value      = l.semana;
  document.getElementById('loteProcedencia').value = l.procedencia;
  document.getElementById('loteEtapa').value       = l.etapa;
  document.getElementById('loteNotas').value       = l.notas;
  openModal('modalLote');
};

window.deleteLote = function(id) {
  if (!confirm('¿Eliminar este lote?')) return;
  DB.set(KEYS.lotes, DB.get(KEYS.lotes).filter(l => l.id !== id));
  renderLote(); renderDashboard();
  showToast('🗑️ Lote eliminado');
};

// ─── POSTURA ─────────────────────────────────────────────────
function calcPosturaPct() {
  const loteId = document.getElementById('posturaLote').value;
  const huevos = parseInt(document.getElementById('posturaHuevos').value) || 0;
  const lote   = DB.get(KEYS.lotes).find(l => l.id === loteId);
  const aves   = lote ? (parseInt(lote.cantidadActual) || 0) : 0;
  const pct    = aves > 0 ? ((huevos / aves) * 100).toFixed(1) : '—';
  document.getElementById('posturaPorc').value = aves > 0 ? `${pct}%` : '— (registrá un lote primero)';
}

window.savePostura = function() {
  const id = document.getElementById('posturaId').value;
  const registro = {
    id:        id || uid(),
    fecha:     document.getElementById('posturaFecha').value,
    loteId:    document.getElementById('posturaLote').value,
    huevos:    parseInt(document.getElementById('posturaHuevos').value) || 0,
    rotos:     parseInt(document.getElementById('posturaRotos').value)  || 0,
    notas:     document.getElementById('posturaNotas').value.trim(),
    createdAt: today(),
  };
  if (!registro.loteId) return showToast('⚠️ Seleccioná un lote');

  const list = DB.get(KEYS.postura);
  if (id) { const i = list.findIndex(x => x.id === id); if (i > -1) list[i] = registro; }
  else list.push(registro);
  DB.set(KEYS.postura, list);
  closeModal('modalPostura');
  renderPostura();
  renderDashboard();
  showToast('✅ Postura registrada');
};

window.renderPostura = function() {
  const mesEl = document.getElementById('filtroPosturaMes');
  const mes   = mesEl ? mesEl.value : '';
  let list = DB.get(KEYS.postura);
  if (mes) list = list.filter(p => p.fecha && p.fecha.startsWith(mes));
  list = list.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));

  const el = document.getElementById('posturaList');
  if (!list.length) { el.innerHTML = emptyState('🥚', 'Sin registros de postura'); return; }

  el.innerHTML = list.map(p => {
    const lote   = DB.get(KEYS.lotes).find(l => l.id === p.loteId);
    const aves   = lote ? (parseInt(lote.cantidadActual) || 0) : 0;
    const pct    = aves > 0 ? ((p.huevos / aves) * 100).toFixed(1) : null;
    const pctNum = pct ? parseFloat(pct) : 0;
    const barColor = pctNum >= 80 ? 'var(--accent)' : pctNum >= 60 ? 'var(--gold)' : 'var(--red)';
    return `
      <div class="data-card">
        <div class="data-card-header">
          <span class="data-card-title">${getLoteNombre(p.loteId)}</span>
          <span class="data-card-date">${fmtDate(p.fecha)}</span>
        </div>
        <div class="data-card-body">
          <div class="data-field"><span class="lbl">Huevos</span><span class="val" style="color:var(--gold)">${p.huevos.toLocaleString('es')}</span></div>
          <div class="data-field"><span class="lbl">Rotos/Descarte</span><span class="val">${p.rotos}</span></div>
          <div class="data-field"><span class="lbl">% Postura</span><span class="val" style="color:${barColor}">${pct ? pct + '%' : '—'}</span></div>
          <div class="data-field"><span class="lbl">Huevos netos</span><span class="val">${(p.huevos - p.rotos).toLocaleString('es')}</span></div>
        </div>
        ${pct ? `<div class="postura-bar-wrap"><div class="postura-bar-fill" style="width:${Math.min(pctNum, 100)}%;background:${barColor}"></div></div>` : ''}
        ${p.notas ? `<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${p.notas}</p>` : ''}
        <div class="data-card-actions">
          <button class="btn-delete" onclick="deleteRecord('${KEYS.postura}','${p.id}',renderPostura)">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
};

// ─── ALIMENTACIÓN ─────────────────────────────────────────────
window.saveAlimentacion = function() {
  const id = document.getElementById('alimentacionId').value;
  const r  = {
    id:         id || uid(),
    fecha:      document.getElementById('alimentacionFecha').value,
    loteId:     document.getElementById('alimentacionLote').value,
    tipo:       document.getElementById('alimentacionTipo').value.trim(),
    kg:         parseFloat(document.getElementById('alimentacionKg').value) || 0,
    grAve:      parseFloat(document.getElementById('alimentacionGrAve').value) || 0,
    proveedor:  document.getElementById('alimentacionProveedor').value.trim(),
    costo:      parseFloat(document.getElementById('alimentacionCosto').value) || 0,
    notas:      document.getElementById('alimentacionNotas').value.trim(),
    createdAt:  today(),
  };
  if (!r.loteId) return showToast('⚠️ Seleccioná un lote');
  const list = DB.get(KEYS.alimentacion);
  if (id) { const i = list.findIndex(x => x.id === id); if (i > -1) list[i] = r; } else list.push(r);
  DB.set(KEYS.alimentacion, list);
  closeModal('modalAlimentacion');
  renderAlimentacion();
  showToast('✅ Alimentación registrada');
};

function renderAlimentacion() {
  const list = DB.get(KEYS.alimentacion).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const el = document.getElementById('alimentacionList');
  if (!list.length) { el.innerHTML = emptyState('🌾', 'Sin registros de alimentación'); return; }
  el.innerHTML = list.map(r => `
    <div class="data-card">
      <div class="data-card-header">
        <span class="data-card-title">${r.tipo || 'Alimento'}</span>
        <span class="data-card-date">${fmtDate(r.fecha)}</span>
      </div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
        <div class="data-field"><span class="lbl">Cantidad</span><span class="val">${r.kg} kg</span></div>
        <div class="data-field"><span class="lbl">g/ave/día</span><span class="val">${r.grAve || '—'}</span></div>
        <div class="data-field"><span class="lbl">Costo</span><span class="val">${r.costo ? '$' + r.costo.toLocaleString('es') : '—'}</span></div>
        <div class="data-field"><span class="lbl">Proveedor</span><span class="val">${r.proveedor || '—'}</span></div>
      </div>
      <div class="data-card-actions">
        <button class="btn-delete" onclick="deleteRecord('${KEYS.alimentacion}','${r.id}',renderAlimentacion)">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ─── VACUNACIÓN ───────────────────────────────────────────────
window.saveVacunacion = function() {
  const id = document.getElementById('vacunacionId').value;
  const r  = {
    id:           id || uid(),
    fecha:        document.getElementById('vacunacionFecha').value,
    loteId:       document.getElementById('vacunacionLote').value,
    vacuna:       document.getElementById('vacunaNombre').value.trim(),
    via:          document.getElementById('vacunaVia').value,
    dosis:        document.getElementById('vacunaDosis').value.trim(),
    aplicador:    document.getElementById('vacunaAplicador').value.trim(),
    proximaFecha: document.getElementById('vacunaProxima').value,
    notas:        document.getElementById('vacunaNotas').value.trim(),
    createdAt:    today(),
  };
  if (!r.loteId || !r.vacuna) return showToast('⚠️ Completá lote y vacuna');
  const list = DB.get(KEYS.vacunacion);
  if (id) { const i = list.findIndex(x => x.id === id); if (i > -1) list[i] = r; } else list.push(r);
  DB.set(KEYS.vacunacion, list);
  closeModal('modalVacunacion');
  renderVacunacion();
  renderDashboard();
  showToast('✅ Vacunación registrada');
};

function renderVacunacion() {
  const list = DB.get(KEYS.vacunacion).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const el = document.getElementById('vacunacionList');
  if (!list.length) { el.innerHTML = emptyState('💉', 'Sin registros de vacunación'); return; }
  const vias = { agua: 'Agua de bebida', ocular: 'Ocular', nasal: 'Nasal', inyectable: 'Inyectable', spray: 'Spray', ala: 'Punción alar' };
  el.innerHTML = list.map(r => `
    <div class="data-card">
      <div class="data-card-header">
        <span class="data-card-title">${r.vacuna}</span>
        <span class="data-card-date">${fmtDate(r.fecha)}</span>
      </div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
        <div class="data-field"><span class="lbl">Vía</span><span class="val">${vias[r.via] || r.via}</span></div>
        <div class="data-field"><span class="lbl">Dosis</span><span class="val">${r.dosis || '—'}</span></div>
        <div class="data-field"><span class="lbl">Aplicador</span><span class="val">${r.aplicador || '—'}</span></div>
        <div class="data-field"><span class="lbl">Próxima</span><span class="val" style="color:var(--gold)">${r.proximaFecha ? fmtDate(r.proximaFecha) : '—'}</span></div>
      </div>
      <div class="data-card-actions">
        <button class="btn-delete" onclick="deleteRecord('${KEYS.vacunacion}','${r.id}',renderVacunacion)">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ─── MEDICACIÓN ───────────────────────────────────────────────
window.saveMedicacion = function() {
  const id = document.getElementById('medicacionId').value;
  const r  = {
    id:        id || uid(),
    fecha:     document.getElementById('medicacionFecha').value,
    loteId:    document.getElementById('medicacionLote').value,
    nombre:    document.getElementById('medicamentoNombre').value.trim(),
    motivo:    document.getElementById('medicamentoMotivo').value.trim(),
    dosis:     document.getElementById('medicamentoDosis').value.trim(),
    dias:      document.getElementById('medicamentoDias').value,
    vet:       document.getElementById('medicamentoVet').value.trim(),
    notas:     document.getElementById('medicamentoNotas').value.trim(),
    createdAt: today(),
  };
  if (!r.loteId || !r.nombre) return showToast('⚠️ Completá lote y medicamento');
  const list = DB.get(KEYS.medicacion);
  if (id) { const i = list.findIndex(x => x.id === id); if (i > -1) list[i] = r; } else list.push(r);
  DB.set(KEYS.medicacion, list);
  closeModal('modalMedicacion');
  renderMedicacion();
  showToast('✅ Medicación registrada');
};

function renderMedicacion() {
  const list = DB.get(KEYS.medicacion).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const el = document.getElementById('medicacionList');
  if (!list.length) { el.innerHTML = emptyState('💊', 'Sin registros de medicación'); return; }
  el.innerHTML = list.map(r => `
    <div class="data-card">
      <div class="data-card-header">
        <span class="data-card-title">${r.nombre}</span>
        <span class="data-card-date">${fmtDate(r.fecha)}</span>
      </div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
        <div class="data-field"><span class="lbl">Motivo</span><span class="val">${r.motivo || '—'}</span></div>
        <div class="data-field"><span class="lbl">Dosis</span><span class="val">${r.dosis || '—'}</span></div>
        <div class="data-field"><span class="lbl">Días</span><span class="val">${r.dias || '—'}</span></div>
        <div class="data-field"><span class="lbl">Veterinario</span><span class="val">${r.vet || '—'}</span></div>
      </div>
      <div class="data-card-actions">
        <button class="btn-delete" onclick="deleteRecord('${KEYS.medicacion}','${r.id}',renderMedicacion)">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ─── MORTANDAD ────────────────────────────────────────────────
window.saveMortandad = function() {
  const id = document.getElementById('mortandadId').value;
  const r  = {
    id:        id || uid(),
    fecha:     document.getElementById('mortandadFecha').value,
    loteId:    document.getElementById('mortandadLote').value,
    cantidad:  parseInt(document.getElementById('mortandadCantidad').value) || 0,
    causa:     document.getElementById('mortandadCausa').value,
    desc:      document.getElementById('mortandadDesc').value.trim(),
    necropsia: document.getElementById('mortandadNecropsia').value,
    createdAt: today(),
  };
  if (!r.loteId) return showToast('⚠️ Seleccioná un lote');
  if (!r.cantidad) return showToast('⚠️ Ingresá cantidad de bajas');

  // Actualizar cantidad actual del lote
  const lotes = DB.get(KEYS.lotes);
  const loteIdx = lotes.findIndex(l => l.id === r.loteId);
  if (loteIdx > -1) {
    lotes[loteIdx].cantidadActual = Math.max(0, (parseInt(lotes[loteIdx].cantidadActual) || 0) - r.cantidad);
    DB.set(KEYS.lotes, lotes);
  }

  const list = DB.get(KEYS.mortandad);
  if (id) { const i = list.findIndex(x => x.id === id); if (i > -1) list[i] = r; } else list.push(r);
  DB.set(KEYS.mortandad, list);
  closeModal('modalMortandad');
  renderMortandad();
  renderDashboard();
  showToast('✅ Mortandad registrada');
};

function renderMortandad() {
  const list = DB.get(KEYS.mortandad).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const el = document.getElementById('mortandadList');
  if (!list.length) { el.innerHTML = emptyState('📋', 'Sin registros de mortandad'); return; }
  const causas = {
    enfermedad: 'Enfermedad', estres_calor: 'Estrés calor', estres_frio: 'Estrés frío',
    accidente: 'Accidente', depredador: 'Depredador', desconocida: 'Desconocida', otra: 'Otra'
  };
  el.innerHTML = list.map(r => `
    <div class="data-card">
      <div class="data-card-header">
        <span class="data-card-title" style="color:var(--red)">🪦 ${r.cantidad} ave(s)</span>
        <span class="data-card-date">${fmtDate(r.fecha)}</span>
      </div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
        <div class="data-field"><span class="lbl">Causa</span><span class="val">${causas[r.causa] || r.causa}</span></div>
        <div class="data-field"><span class="lbl">Necropsia</span><span class="val">${r.necropsia === 'si' ? '✅ Sí' : r.necropsia === 'pendiente' ? '⏳ Pendiente' : '❌ No'}</span></div>
      </div>
      ${r.desc ? `<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${r.desc}</p>` : ''}
      <div class="data-card-actions">
        <button class="btn-delete" onclick="deleteRecord('${KEYS.mortandad}','${r.id}',renderMortandad)">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ─── GENERIC DELETE ───────────────────────────────────────────
window.deleteRecord = function(key, id, rerenderFn) {
  if (!confirm('¿Eliminar este registro?')) return;
  DB.set(key, DB.get(key).filter(x => x.id !== id));
  rerenderFn();
  if (key === KEYS.mortandad || key === KEYS.lotes || key === KEYS.postura) renderDashboard();
  showToast('🗑️ Registro eliminado');
};

// ─── HELPERS ─────────────────────────────────────────────────
function getLoteNombre(id) {
  const l = DB.get(KEYS.lotes).find(x => x.id === id);
  return l ? l.nombre : '(lote eliminado)';
}

function emptyState(icon, msg) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
}

// ─── BACKUP / RESTORE ─────────────────────────────────────────
function setupBackup() {
  document.getElementById('btnBackup').addEventListener('click', () => {
    const data = {};
    Object.values(KEYS).forEach(k => { data[k] = DB.get(k); });
    data._version    = 1;
    data._exportDate = new Date().toISOString();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `hinse-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 Backup descargado');
  });

  document.getElementById('btnRestore').addEventListener('click', () => {
    document.getElementById('fileRestore').click();
  });

  document.getElementById('fileRestore').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!confirm(`¿Restaurar backup del ${data._exportDate ? new Date(data._exportDate).toLocaleDateString('es-AR') : 'archivo'}? Esto reemplazará los datos actuales.`)) return;
        Object.values(KEYS).forEach(k => { if (data[k]) DB.set(k, data[k]); });
        showToast('📂 Datos restaurados');
        setTimeout(() => location.reload(), 800);
      } catch {
        showToast('❌ Archivo inválido');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

// ─── SERVICE WORKER REGISTRATION ─────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
  });
}