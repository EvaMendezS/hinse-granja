/* ============================================================
   Hinse — Control Avícola  v2.0
   app.js — Lógica principal
   Almacenamiento: localStorage (sin servidor, 100% offline)
   ============================================================ */

'use strict';

// ─── STORAGE ─────────────────────────────────────────────────
const DB = {
  get(key)         { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set(key, val)    { localStorage.setItem(key, JSON.stringify(val)); },
};

const KEYS = {
  lotes:        'hinse_lotes',
  postura:      'hinse_postura',
  alimentacion: 'hinse_alimentacion',
  vacunacion:   'hinse_vacunacion',
  medicacion:   'hinse_medicacion',
  mortandad:    'hinse_mortandad',
  enfermedades: 'hinse_enfermedades',
  notas:        'hinse_notas',
};

// ─── UTILIDADES ───────────────────────────────────────────────
const uid     = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtDate = d => { if (!d) return '—'; const [y, m, dia] = d.split('-'); return `${dia}/${m}/${y}`; };
const today   = () => new Date().toISOString().split('T')[0];

function semanasDesde(fechaISO) {
  if (!fechaISO) return null;
  const diff = Date.now() - new Date(fechaISO).getTime();
  return Math.floor(diff / (7 * 24 * 3600 * 1000));
}

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
  renderEnfermedades();
  renderNotas();

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
  if (view === 'enfermedades') fillLoteSelect('enfermedadLote');
  if (view === 'notas')        fillLoteSelect('notaLote');
  if (view === 'historial')    renderHistorialSelector();
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
  if (id === 'modalEnfermedad')   fillLoteSelect('enfermedadLote');
  if (id === 'modalNota')         fillLoteSelect('notaLote');
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
  document.querySelectorAll(`#${modalId} input:not([type=hidden]):not([type=file]), #${modalId} select, #${modalId} textarea`).forEach(el => {
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  document.querySelectorAll(`#${modalId} input[type=hidden]`).forEach(el => el.value = '');
  document.querySelectorAll(`#${modalId} input[type=date]`).forEach(el => el.value = today());
  // Limpiar preview de foto si existe
  const preview = document.querySelector(`#${modalId} .foto-preview`);
  if (preview) preview.innerHTML = '';
}

function fillLoteSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const lotes = DB.get(KEYS.lotes);
  sel.innerHTML = lotes.length
    ? lotes.map(l => `<option value="${l.id}">${l.nombre} — ${l.galpon || 'Sin galpón'} (${l.cantidadActual} aves)</option>`).join('')
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

function renderKPIs() {
  const lotes       = DB.get(KEYS.lotes);
  const mortandades = DB.get(KEYS.mortandad);
  const vacunas     = DB.get(KEYS.vacunacion);
  const medicacion  = DB.get(KEYS.medicacion);

  const ponedoras  = lotes.filter(l => l.etapa === 'produccion').reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);
  const recrías    = lotes.filter(l => l.etapa === 'recria').reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);
  const totalAves  = ponedoras + recrías;
  const totalBajas = mortandades.reduce((s, m) => s + (parseInt(m.cantidad) || 0), 0);

  const ultimos7 = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    ultimos7.push(d.toISOString().split('T')[0]);
  }
  const vacReciente = vacunas.filter(v => ultimos7.includes(v.fecha)).length;
  const medReciente = medicacion.filter(m => ultimos7.includes(m.fecha)).length;

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card" style="--kpi-color:var(--accent); animation-delay:0s">
      <div class="kpi-icon">🐔</div>
      <div class="kpi-value">${totalAves.toLocaleString('es')}</div>
      <div class="kpi-label">Total Aves</div>
      <div class="kpi-delta">${lotes.length} lote(s)</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--gold); animation-delay:0.07s">
      <div class="kpi-icon">🥚</div>
      <div class="kpi-value">${ponedoras.toLocaleString('es')}</div>
      <div class="kpi-label">Ponedoras</div>
      <div class="kpi-delta">${recrías.toLocaleString('es')} en recría</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--red); animation-delay:0.14s">
      <div class="kpi-icon">💀</div>
      <div class="kpi-value">${totalBajas.toLocaleString('es')}</div>
      <div class="kpi-label">Mortandad Total</div>
      <div class="kpi-delta">${totalAves > 0 ? ((totalBajas / (totalAves + totalBajas)) * 100).toFixed(1) + '% del lote' : '—'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--blue); animation-delay:0.21s">
      <div class="kpi-icon">💉</div>
      <div class="kpi-value">${vacReciente + medReciente}</div>
      <div class="kpi-label">Sanidad (7d)</div>
      <div class="kpi-delta">${vacReciente} vacuna(s) · ${medReciente} med.</div>
    </div>
  `;
}

function renderAlertas() {
  const lotes   = DB.get(KEYS.lotes);
  const vacunas = DB.get(KEYS.vacunacion);
  const alertas = [];
  const hoy     = new Date(); hoy.setHours(0, 0, 0, 0);

  // Vacunas próximas
  vacunas.forEach(v => {
    if (!v.proximaFecha) return;
    const prox = new Date(v.proximaFecha); prox.setHours(0, 0, 0, 0);
    const diff = Math.ceil((prox - hoy) / 864e5);
    if (diff >= 0 && diff <= 7)
      alertas.push({ icon: '💉', title: `Vacuna próxima: ${v.vacuna}`, text: ` — En ${diff} día(s) · ${getLoteNombre(v.loteId)}` });
    if (diff < 0 && diff > -3)
      alertas.push({ icon: '🔴', title: `Vacuna vencida: ${v.vacuna}`, text: ` — Hace ${Math.abs(diff)} día(s)` });
  });

  // Lotes recría próximos a semana 18
  lotes.filter(l => l.etapa === 'recria').forEach(l => {
    const semanas = semanasDesde(l.fecha) + (parseInt(l.semanaIngreso) || 0);
    if (semanas >= 17 && semanas < 20) {
      alertas.push({ icon: '🔔', title: `Lote próximo a producción: ${l.nombre}`, text: ` — Semana ${semanas} de vida` });
    }
  });

  // Mortandad alta hoy
  DB.get(KEYS.mortandad).filter(m => m.fecha === today()).forEach(m => {
    if (parseInt(m.cantidad) >= 5)
      alertas.push({ icon: '🚨', title: `Alta mortandad: ${m.cantidad} aves hoy`, text: ` — ${getLoteNombre(m.loteId)}` });
  });

  // Enfermedades activas
  DB.get(KEYS.enfermedades).filter(e => e.estado === 'activa').forEach(e => {
    alertas.push({ icon: '🦠', title: `Enfermedad activa: ${e.nombre}`, text: ` — ${getLoteNombre(e.loteId)}` });
  });

  const el = document.getElementById('alertasList');
  el.innerHTML = alertas.length
    ? alertas.map(a => `
        <div class="alerta-item">
          <span class="alerta-icon">${a.icon}</span>
          <span class="alerta-text"><strong>${a.title}</strong>${a.text}</span>
        </div>`).join('')
    : '<p style="color:var(--text3);font-size:.85rem;padding:8px 0">✅ Sin alertas pendientes</p>';
}

function renderActividad() {
  const items = [];
  const push  = (key, icon, label) =>
    DB.get(key).slice(-5).reverse().forEach(r =>
      items.push({ icon, text: label(r), ts: r.createdAt || r.fecha || '' })
    );
  push(KEYS.postura,      '🥚', r => `Postura: ${r.huevos} huevos — ${getLoteNombre(r.loteId)}`);
  push(KEYS.lotes,        '🐣', r => `Ingreso: ${r.nombre} (${r.cantidadActual} aves)`);
  push(KEYS.vacunacion,   '💉', r => `Vacuna: ${r.vacuna} — ${getLoteNombre(r.loteId)}`);
  push(KEYS.mortandad,    '💀', r => `Mortandad: ${r.cantidad} ave(s) — ${getLoteNombre(r.loteId)}`);
  push(KEYS.alimentacion, '🌾', r => `Alimento: ${r.kg}kg — ${getLoteNombre(r.loteId)}`);
  push(KEYS.enfermedades, '🦠', r => `Enfermedad: ${r.nombre} — ${getLoteNombre(r.loteId)}`);
  push(KEYS.notas,        '📷', r => `Nota de campo — ${getLoteNombre(r.loteId)}`);

  items.sort((a, b) => (b.ts > a.ts ? 1 : -1));
  const el = document.getElementById('actividadList');
  el.innerHTML = items.length
    ? items.slice(0, 10).map(it => `
        <div class="actividad-item">
          <span style="font-size:1rem">${it.icon}</span>
          <span class="actividad-text">${it.text}</span>
          <span class="actividad-time">${fmtDate(it.ts)}</span>
        </div>`).join('')
    : '<p style="color:var(--text3);font-size:.85rem;padding:8px 0">Aún no hay actividad registrada.</p>';
}

// ─── LOTES ────────────────────────────────────────────────────
window.saveLote = function() {
  const id       = document.getElementById('loteId').value;
  const cantidad = parseInt(document.getElementById('loteCantidad').value) || 0;
  const registro = {
    id:              id || uid(),
    fecha:           document.getElementById('loteFecha').value,
    nombre:          document.getElementById('loteNombre').value.trim(),
    galpon:          document.getElementById('loteGalpon').value.trim(),
    cantidadInicial: cantidad,
    cantidadActual:  cantidad,
    raza:            document.getElementById('loteRaza').value.trim(),
    semanaIngreso:   parseInt(document.getElementById('loteSemana').value) || 0,
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
  const el    = document.getElementById('loteList');
  if (!lotes.length) { el.innerHTML = emptyState('🐣', 'Sin lotes registrados'); return; }

  el.innerHTML = lotes.slice().reverse().map(l => {
    const semActual = semanasDesde(l.fecha) + (l.semanaIngreso || 0);
    return `
    <div class="data-card">
      <div class="data-card-header">
        <span class="data-card-title">${l.nombre}</span>
        <span class="badge ${l.etapa === 'produccion' ? 'badge-green' : 'badge-gold'}">${l.etapa === 'produccion' ? 'Producción' : 'Recría'}</span>
      </div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Galpón</span><span class="val">${l.galpon || '—'}</span></div>
        <div class="data-field"><span class="lbl">Ingreso</span><span class="val">${fmtDate(l.fecha)}</span></div>
        <div class="data-field"><span class="lbl">Aves actuales</span><span class="val">${(parseInt(l.cantidadActual) || 0).toLocaleString('es')}</span></div>
        <div class="data-field"><span class="lbl">Semana actual</span><span class="val" style="color:var(--accent)">${semActual} sem.</span></div>
        <div class="data-field"><span class="lbl">Raza</span><span class="val">${l.raza || '—'}</span></div>
        <div class="data-field"><span class="lbl">Procedencia</span><span class="val">${l.procedencia || '—'}</span></div>
        <div class="data-field"><span class="lbl">Ingreso inicial</span><span class="val">${(parseInt(l.cantidadInicial) || 0).toLocaleString('es')}</span></div>
      </div>
      ${l.notas ? `<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${l.notas}</p>` : ''}
      <div class="data-card-actions">
        <button class="btn-edit" onclick="editLote('${l.id}')">✏️ Editar</button>
        <button class="btn-edit" onclick="verHistorial('${l.id}')" style="color:var(--blue)">📋 Historial</button>
        <button class="btn-delete" onclick="deleteLote('${l.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

window.editLote = function(id) {
  const l = DB.get(KEYS.lotes).find(x => x.id === id);
  if (!l) return;
  document.getElementById('loteId').value         = l.id;
  document.getElementById('loteFecha').value       = l.fecha;
  document.getElementById('loteNombre').value      = l.nombre;
  document.getElementById('loteGalpon').value      = l.galpon || '';
  document.getElementById('loteCantidad').value    = l.cantidadActual;
  document.getElementById('loteRaza').value        = l.raza;
  document.getElementById('loteSemana').value      = l.semanaIngreso || '';
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
  document.getElementById('posturaPorc').value = aves > 0
    ? `${((huevos / aves) * 100).toFixed(1)}%`
    : '— (sin lote)';
}

window.savePostura = function() {
  const id = document.getElementById('posturaId').value;
  const r  = {
    id:        id || uid(),
    fecha:     document.getElementById('posturaFecha').value,
    loteId:    document.getElementById('posturaLote').value,
    huevos:    parseInt(document.getElementById('posturaHuevos').value) || 0,
    rotos:     parseInt(document.getElementById('posturaRotos').value) || 0,
    notas:     document.getElementById('posturaNotas').value.trim(),
    createdAt: today(),
  };
  if (!r.loteId) return showToast('⚠️ Seleccioná un lote');
  const list = DB.get(KEYS.postura);
  if (id) { const i = list.findIndex(x => x.id === id); if (i > -1) list[i] = r; } else list.push(r);
  DB.set(KEYS.postura, list);
  closeModal('modalPostura');
  renderPostura();
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
          <div class="data-field"><span class="lbl">Rotos</span><span class="val">${p.rotos}</span></div>
          <div class="data-field"><span class="lbl">% Postura</span><span class="val" style="color:${barColor}">${pct ? pct + '%' : '—'}</span></div>
          <div class="data-field"><span class="lbl">Netos</span><span class="val">${(p.huevos - p.rotos).toLocaleString('es')}</span></div>
        </div>
        ${pct ? `<div class="postura-bar-wrap"><div class="postura-bar-fill" style="width:${Math.min(pctNum, 100)}%;background:${barColor}"></div></div>` : ''}
        ${p.notas ? `<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${p.notas}</p>` : ''}
        <div class="data-card-actions">
          <button class="btn-edit" onclick="editPostura('${p.id}')">✏️</button>
          <button class="btn-delete" onclick="deleteRecord('${KEYS.postura}','${p.id}',renderPostura)">🗑️</button>
        </div>
      </div>`;
  }).join('');
};

window.editPostura = function(id) {
  const p = DB.get(KEYS.postura).find(x => x.id === id);
  if (!p) return;
  fillLoteSelect('posturaLote');
  document.getElementById('posturaId').value     = p.id;
  document.getElementById('posturaFecha').value  = p.fecha;
  document.getElementById('posturaLote').value   = p.loteId;
  document.getElementById('posturaHuevos').value = p.huevos;
  document.getElementById('posturaRotos').value  = p.rotos;
  document.getElementById('posturaNotas').value  = p.notas;
  openModal('modalPostura');
};

// ─── ALIMENTACIÓN ─────────────────────────────────────────────
window.saveAlimentacion = function() {
  const id = document.getElementById('alimentacionId').value;
  const r  = {
    id:        id || uid(),
    fecha:     document.getElementById('alimentacionFecha').value,
    loteId:    document.getElementById('alimentacionLote').value,
    tipo:      document.getElementById('alimentacionTipo').value.trim(),
    kg:        parseFloat(document.getElementById('alimentacionKg').value) || 0,
    grAve:     parseFloat(document.getElementById('alimentacionGrAve').value) || 0,
    proveedor: document.getElementById('alimentacionProveedor').value.trim(),
    costo:     parseFloat(document.getElementById('alimentacionCosto').value) || 0,
    notas:     document.getElementById('alimentacionNotas').value.trim(),
    createdAt: today(),
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
  const el   = document.getElementById('alimentacionList');
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
        <button class="btn-edit" onclick="editAlimentacion('${r.id}')">✏️</button>
        <button class="btn-delete" onclick="deleteRecord('${KEYS.alimentacion}','${r.id}',renderAlimentacion)">🗑️</button>
      </div>
    </div>`).join('');
}

window.editAlimentacion = function(id) {
  const r = DB.get(KEYS.alimentacion).find(x => x.id === id);
  if (!r) return;
  fillLoteSelect('alimentacionLote');
  document.getElementById('alimentacionId').value        = r.id;
  document.getElementById('alimentacionFecha').value     = r.fecha;
  document.getElementById('alimentacionLote').value      = r.loteId;
  document.getElementById('alimentacionTipo').value      = r.tipo;
  document.getElementById('alimentacionKg').value        = r.kg;
  document.getElementById('alimentacionGrAve').value     = r.grAve;
  document.getElementById('alimentacionProveedor').value = r.proveedor;
  document.getElementById('alimentacionCosto').value     = r.costo;
  document.getElementById('alimentacionNotas').value     = r.notas;
  openModal('modalAlimentacion');
};

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
  const el   = document.getElementById('vacunacionList');
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
        <button class="btn-edit" onclick="editVacunacion('${r.id}')">✏️</button>
        <button class="btn-delete" onclick="deleteRecord('${KEYS.vacunacion}','${r.id}',renderVacunacion)">🗑️</button>
      </div>
    </div>`).join('');
}

window.editVacunacion = function(id) {
  const r = DB.get(KEYS.vacunacion).find(x => x.id === id);
  if (!r) return;
  fillLoteSelect('vacunacionLote');
  document.getElementById('vacunacionId').value    = r.id;
  document.getElementById('vacunacionFecha').value = r.fecha;
  document.getElementById('vacunacionLote').value  = r.loteId;
  document.getElementById('vacunaNombre').value    = r.vacuna;
  document.getElementById('vacunaVia').value       = r.via;
  document.getElementById('vacunaDosis').value     = r.dosis;
  document.getElementById('vacunaAplicador').value = r.aplicador;
  document.getElementById('vacunaProxima').value   = r.proximaFecha || '';
  document.getElementById('vacunaNotas').value     = r.notas;
  openModal('modalVacunacion');
};

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
  const el   = document.getElementById('medicacionList');
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
        <button class="btn-edit" onclick="editMedicacion('${r.id}')">✏️</button>
        <button class="btn-delete" onclick="deleteRecord('${KEYS.medicacion}','${r.id}',renderMedicacion)">🗑️</button>
      </div>
    </div>`).join('');
}

window.editMedicacion = function(id) {
  const r = DB.get(KEYS.medicacion).find(x => x.id === id);
  if (!r) return;
  fillLoteSelect('medicacionLote');
  document.getElementById('medicacionId').value      = r.id;
  document.getElementById('medicacionFecha').value   = r.fecha;
  document.getElementById('medicacionLote').value    = r.loteId;
  document.getElementById('medicamentoNombre').value = r.nombre;
  document.getElementById('medicamentoMotivo').value = r.motivo;
  document.getElementById('medicamentoDosis').value  = r.dosis;
  document.getElementById('medicamentoDias').value   = r.dias;
  document.getElementById('medicamentoVet').value    = r.vet;
  document.getElementById('medicamentoNotas').value  = r.notas;
  openModal('modalMedicacion');
};

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
  if (!r.loteId)   return showToast('⚠️ Seleccioná un lote');
  if (!r.cantidad)  return showToast('⚠️ Ingresá cantidad de bajas');

  // Solo descontar si es nuevo registro
  if (!id) {
    const lotes   = DB.get(KEYS.lotes);
    const loteIdx = lotes.findIndex(l => l.id === r.loteId);
    if (loteIdx > -1) {
      lotes[loteIdx].cantidadActual = Math.max(0, (parseInt(lotes[loteIdx].cantidadActual) || 0) - r.cantidad);
      DB.set(KEYS.lotes, lotes);
    }
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
  const el   = document.getElementById('mortandadList');
  if (!list.length) { el.innerHTML = emptyState('📋', 'Sin registros de mortandad'); return; }
  const causas = { enfermedad: 'Enfermedad', estres_calor: 'Estrés calor', estres_frio: 'Estrés frío', accidente: 'Accidente', depredador: 'Depredador', desconocida: 'Desconocida', otra: 'Otra' };
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
        <button class="btn-edit" onclick="editMortandad('${r.id}')">✏️</button>
        <button class="btn-delete" onclick="deleteRecord('${KEYS.mortandad}','${r.id}',renderMortandad)">🗑️</button>
      </div>
    </div>`).join('');
}

window.editMortandad = function(id) {
  const r = DB.get(KEYS.mortandad).find(x => x.id === id);
  if (!r) return;
  fillLoteSelect('mortandadLote');
  document.getElementById('mortandadId').value       = r.id;
  document.getElementById('mortandadFecha').value    = r.fecha;
  document.getElementById('mortandadLote').value     = r.loteId;
  document.getElementById('mortandadCantidad').value = r.cantidad;
  document.getElementById('mortandadCausa').value    = r.causa;
  document.getElementById('mortandadDesc').value     = r.desc;
  document.getElementById('mortandadNecropsia').value = r.necropsia;
  openModal('modalMortandad');
};

// ─── ENFERMEDADES ─────────────────────────────────────────────
window.saveEnfermedad = function() {
  const id = document.getElementById('enfermedadId').value;
  const r  = {
    id:          id || uid(),
    fecha:       document.getElementById('enfermedadFecha').value,
    loteId:      document.getElementById('enfermedadLote').value,
    nombre:      document.getElementById('enfermedadNombre').value.trim(),
    sintomas:    document.getElementById('enfermedadSintomas').value.trim(),
    afectadas:   parseInt(document.getElementById('enfermedadAfectadas').value) || 0,
    vet:         document.getElementById('enfermedadVet').value.trim(),
    tratamiento: document.getElementById('enfermedadTratamiento').value.trim(),
    estado:      document.getElementById('enfermedadEstado').value,
    fechaCierre: document.getElementById('enfermedadCierre').value,
    notas:       document.getElementById('enfermedadNotas').value.trim(),
    createdAt:   today(),
  };
  if (!r.loteId || !r.nombre) return showToast('⚠️ Completá lote y nombre de enfermedad');
  const list = DB.get(KEYS.enfermedades);
  if (id) { const i = list.findIndex(x => x.id === id); if (i > -1) list[i] = r; } else list.push(r);
  DB.set(KEYS.enfermedades, list);
  closeModal('modalEnfermedad');
  renderEnfermedades();
  renderDashboard();
  showToast('✅ Enfermedad registrada');
};

function renderEnfermedades() {
  const list = DB.get(KEYS.enfermedades).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const el   = document.getElementById('enfermedadList');
  if (!list.length) { el.innerHTML = emptyState('🦠', 'Sin registros de enfermedades'); return; }
  el.innerHTML = list.map(r => {
    const estadoBadge = r.estado === 'activa'
      ? '<span class="badge badge-red">Activa</span>'
      : r.estado === 'controlada'
        ? '<span class="badge badge-gold">Controlada</span>'
        : '<span class="badge badge-green">Resuelta</span>';
    return `
    <div class="data-card">
      <div class="data-card-header">
        <span class="data-card-title">🦠 ${r.nombre}</span>
        ${estadoBadge}
      </div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
        <div class="data-field"><span class="lbl">Fecha inicio</span><span class="val">${fmtDate(r.fecha)}</span></div>
        <div class="data-field"><span class="lbl">Aves afectadas</span><span class="val">${r.afectadas || '—'}</span></div>
        <div class="data-field"><span class="lbl">Veterinario</span><span class="val">${r.vet || '—'}</span></div>
        <div class="data-field"><span class="lbl">Tratamiento</span><span class="val">${r.tratamiento || '—'}</span></div>
        <div class="data-field"><span class="lbl">Cierre</span><span class="val">${r.fechaCierre ? fmtDate(r.fechaCierre) : '—'}</span></div>
      </div>
      ${r.sintomas ? `<p style="color:var(--text3);font-size:.82rem;margin-top:8px"><strong style="color:var(--text2)">Síntomas:</strong> ${r.sintomas}</p>` : ''}
      ${r.notas ? `<p style="color:var(--text3);font-size:.82rem;margin-top:4px">${r.notas}</p>` : ''}
      <div class="data-card-actions">
        <button class="btn-edit" onclick="editEnfermedad('${r.id}')">✏️ Editar</button>
        <button class="btn-delete" onclick="deleteRecord('${KEYS.enfermedades}','${r.id}',renderEnfermedades)">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

window.editEnfermedad = function(id) {
  const r = DB.get(KEYS.enfermedades).find(x => x.id === id);
  if (!r) return;
  fillLoteSelect('enfermedadLote');
  document.getElementById('enfermedadId').value          = r.id;
  document.getElementById('enfermedadFecha').value       = r.fecha;
  document.getElementById('enfermedadLote').value        = r.loteId;
  document.getElementById('enfermedadNombre').value      = r.nombre;
  document.getElementById('enfermedadSintomas').value    = r.sintomas;
  document.getElementById('enfermedadAfectadas').value   = r.afectadas;
  document.getElementById('enfermedadVet').value         = r.vet;
  document.getElementById('enfermedadTratamiento').value = r.tratamiento;
  document.getElementById('enfermedadEstado').value      = r.estado;
  document.getElementById('enfermedadCierre').value      = r.fechaCierre || '';
  document.getElementById('enfermedadNotas').value       = r.notas;
  openModal('modalEnfermedad');
};

// ─── NOTAS DE CAMPO ───────────────────────────────────────────
window.saveNota = function() {
  const id      = document.getElementById('notaId').value;
  const input   = document.getElementById('notaFoto');
  const archivo = input.files[0];

  const guardar = (fotoBase64) => {
    const r = {
      id:        id || uid(),
      fecha:     document.getElementById('notaFecha').value,
      loteId:    document.getElementById('notaLote').value,
      texto:     document.getElementById('notaTexto').value.trim(),
      foto:      fotoBase64 || (id ? (DB.get(KEYS.notas).find(x => x.id === id) || {}).foto : null),
      createdAt: today(),
    };
    if (!r.loteId) return showToast('⚠️ Seleccioná un lote');
    const list = DB.get(KEYS.notas);
    if (id) { const i = list.findIndex(x => x.id === id); if (i > -1) list[i] = r; } else list.push(r);
    DB.set(KEYS.notas, list);
    closeModal('modalNota');
    renderNotas();
    showToast('✅ Nota guardada');
  };

  if (archivo) {
    const reader = new FileReader();
    reader.onload = ev => guardar(ev.target.result);
    reader.readAsDataURL(archivo);
  } else {
    guardar(null);
  }
};

// Preview de foto
document.getElementById('notaFoto').addEventListener('change', function() {
  const preview = document.getElementById('notaFotoPreview');
  if (this.files[0]) {
    const reader = new FileReader();
    reader.onload = ev => { preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;border-radius:8px;margin-top:8px">`; };
    reader.readAsDataURL(this.files[0]);
  }
});

function renderNotas() {
  const list = DB.get(KEYS.notas).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const el   = document.getElementById('notasList');
  if (!list.length) { el.innerHTML = emptyState('📷', 'Sin notas de campo'); return; }
  el.innerHTML = list.map(r => `
    <div class="data-card">
      <div class="data-card-header">
        <span class="data-card-title">📷 ${getLoteNombre(r.loteId)}</span>
        <span class="data-card-date">${fmtDate(r.fecha)}</span>
      </div>
      ${r.foto ? `<img src="${r.foto}" style="width:100%;border-radius:8px;margin:8px 0;max-height:200px;object-fit:cover">` : ''}
      ${r.texto ? `<p style="color:var(--text2);font-size:.88rem;margin-top:4px">${r.texto}</p>` : ''}
      <div class="data-card-actions">
        <button class="btn-delete" onclick="deleteRecord('${KEYS.notas}','${r.id}',renderNotas)">🗑️</button>
      </div>
    </div>`).join('');
}

// ─── HISTORIAL POR LOTE ───────────────────────────────────────
function renderHistorialSelector() {
  const lotes = DB.get(KEYS.lotes);
  const sel   = document.getElementById('historialLoteSelect');
  sel.innerHTML = lotes.length
    ? lotes.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('')
    : '<option value="">— Sin lotes —</option>';
  if (lotes.length) renderHistorial(lotes[0].id);
}

window.onHistorialChange = function() {
  const id = document.getElementById('historialLoteSelect').value;
  if (id) renderHistorial(id);
};

function renderHistorial(loteId) {
  const lote = DB.get(KEYS.lotes).find(l => l.id === loteId);
  if (!lote) return;

  const semActual = semanasDesde(lote.fecha) + (lote.semanaIngreso || 0);

  // Resumen del lote
  document.getElementById('historialResumen').innerHTML = `
    <div class="data-card" style="margin-bottom:14px">
      <div class="data-card-header">
        <span class="data-card-title">${lote.nombre}</span>
        <span class="badge ${lote.etapa === 'produccion' ? 'badge-green' : 'badge-gold'}">${lote.etapa === 'produccion' ? 'Producción' : 'Recría'}</span>
      </div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Galpón</span><span class="val">${lote.galpon || '—'}</span></div>
        <div class="data-field"><span class="lbl">Ingreso</span><span class="val">${fmtDate(lote.fecha)}</span></div>
        <div class="data-field"><span class="lbl">Semana actual</span><span class="val" style="color:var(--accent)">${semActual} sem.</span></div>
        <div class="data-field"><span class="lbl">Aves actuales</span><span class="val">${(parseInt(lote.cantidadActual) || 0).toLocaleString('es')}</span></div>
        <div class="data-field"><span class="lbl">Ingreso inicial</span><span class="val">${(parseInt(lote.cantidadInicial) || 0).toLocaleString('es')}</span></div>
        <div class="data-field"><span class="lbl">Raza</span><span class="val">${lote.raza || '—'}</span></div>
      </div>
    </div>`;

  // Todos los eventos del lote
  const eventos = [];
  const add = (key, icon, label) =>
    DB.get(key).filter(r => r.loteId === loteId).forEach(r =>
      eventos.push({ icon, text: label(r), fecha: r.fecha || r.createdAt || '' })
    );

  add(KEYS.mortandad,    '💀', r => `Mortandad: ${r.cantidad} ave(s) — ${r.causa || ''}`);
  add(KEYS.vacunacion,   '💉', r => `Vacuna: ${r.vacuna} (${r.via || ''})`);
  add(KEYS.medicacion,   '💊', r => `Medicación: ${r.nombre} — ${r.motivo || ''}`);
  add(KEYS.alimentacion, '🌾', r => `Alimento: ${r.kg}kg ${r.tipo || ''}`);
  add(KEYS.postura,      '🥚', r => `Postura: ${r.huevos} huevos`);
  add(KEYS.enfermedades, '🦠', r => `Enfermedad: ${r.nombre} [${r.estado}]`);
  add(KEYS.notas,        '📷', r => `Nota de campo: ${r.texto || '(sin texto)'}`);

  eventos.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));

  const el = document.getElementById('historialEventos');
  el.innerHTML = eventos.length
    ? eventos.map(ev => `
        <div class="actividad-item">
          <span style="font-size:1rem">${ev.icon}</span>
          <span class="actividad-text">${ev.text}</span>
          <span class="actividad-time">${fmtDate(ev.fecha)}</span>
        </div>`).join('')
    : '<p style="color:var(--text3);font-size:.85rem;padding:16px 0">Sin eventos registrados para este lote.</p>';
}

// ─── EXPORTAR CSV ─────────────────────────────────────────────
window.exportarCSV = function(key, nombre) {
  const list = DB.get(key);
  if (!list.length) return showToast('⚠️ Sin datos para exportar');

  const lotes = DB.get(KEYS.lotes);
  const getLote = id => { const l = lotes.find(x => x.id === id); return l ? l.nombre : ''; };

  // Enriquecer con nombre de lote y aplanar
  const rows = list.map(r => ({ ...r, loteNombre: getLote(r.loteId || r.id) }));
  const cols = Object.keys(rows[0]);
  const csv  = [cols.join(','), ...rows.map(r =>
    cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')
  )].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `hinse-${nombre}-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`📊 CSV de ${nombre} descargado`);
};

// ─── DELETE GENÉRICO ─────────────────────────────────────────
window.deleteRecord = function(key, id, rerenderFn) {
  if (!confirm('¿Eliminar este registro?')) return;
  DB.set(key, DB.get(key).filter(x => x.id !== id));
  rerenderFn();
  if ([KEYS.mortandad, KEYS.lotes, KEYS.vacunacion, KEYS.medicacion, KEYS.enfermedades].includes(key))
    renderDashboard();
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
    data._version    = 2;
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
      } catch { showToast('❌ Archivo inválido'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

// ─── SERVICE WORKER ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
  });
}

// ─── MENÚ MÁS ─────────────────────────────────────────────────
document.getElementById('navMasBtn').addEventListener('click', () => {
  const menu = document.getElementById('masMenu');
  menu.classList.toggle('hidden');
});

window.closeMenu = function() {
  document.getElementById('masMenu').classList.add('hidden');
  // Desactivar todos los nav-btn del nav principal
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
};

// Cerrar menú al tocar fuera
document.addEventListener('click', e => {
  const menu = document.getElementById('masMenu');
  const btn  = document.getElementById('navMasBtn');
  if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== btn) {
    menu.classList.add('hidden');
  }
});