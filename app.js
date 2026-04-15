/* ============================================================
   Hinse — Granja Avícola v2.0
   app.js — Lógica principal
   ============================================================ */
'use strict';

// ─── STORAGE ─────────────────────────────────────────────────
const DB = {
  get(key)      { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
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

// ─── UTILS ───────────────────────────────────────────────────
const uid     = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtDate = d => { if (!d) return '—'; const [y, m, dia] = d.split('-'); return `${dia}/${m}/${y}`; };
const today   = () => new Date().toISOString().split('T')[0];

function semanasDesde(fechaISO, semanaBase = 0) {
  if (!fechaISO) return semanaBase;
  const diff = Date.now() - new Date(fechaISO).getTime();
  return Math.floor(diff / (7 * 24 * 3600 * 1000)) + (parseInt(semanaBase) || 0);
}

function showToast(msg, ms = 2400) {
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
  setupPDF();
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
  document.getElementById('notaFoto').addEventListener('change', function () {
    const preview = document.getElementById('notaFotoPreview');
    if (this.files[0]) {
      const reader = new FileReader();
      reader.onload = ev => { preview.innerHTML = `<img src="${ev.target.result}">`; };
      reader.readAsDataURL(this.files[0]);
    }
  });
}

// ─── NAV ─────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.getElementById('navMasBtn').addEventListener('click', () => {
    document.getElementById('masMenu').classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    const menu = document.getElementById('masMenu');
    const btn  = document.getElementById('navMasBtn');
    if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== btn)
      menu.classList.add('hidden');
  });
}

window.navigateTo = function(view) {
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
};

window.closeMenu = function () {
  document.getElementById('masMenu').classList.add('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
};

// ─── MODALES ─────────────────────────────────────────────────
window.openModal = function (id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (id === 'modalPostura')      fillLoteSelect('posturaLote');
  if (id === 'modalAlimentacion') fillLoteSelect('alimentacionLote');
  if (id === 'modalVacunacion')   fillLoteSelect('vacunacionLote');
  if (id === 'modalMedicacion')   fillLoteSelect('medicacionLote');
  if (id === 'modalMortandad')    fillLoteSelect('mortandadLote');
  if (id === 'modalEnfermedad')   fillLoteSelect('enfermedadLote');
  if (id === 'modalNota')         fillLoteSelect('notaLote');
};
window.closeModal = function (id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
  clearModalForm(id);
};
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); });
});
function clearModalForm(mid) {
  document.querySelectorAll(`#${mid} input:not([type=hidden]):not([type=file]),#${mid} select,#${mid} textarea`).forEach(el => {
    el.tagName === 'SELECT' ? (el.selectedIndex = 0) : (el.value = '');
  });
  document.querySelectorAll(`#${mid} input[type=hidden]`).forEach(el => el.value = '');
  document.querySelectorAll(`#${mid} input[type=date]`).forEach(el => el.value = today());
  const prev = document.querySelector(`#${mid} .foto-preview`);
  if (prev) prev.innerHTML = '';
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
  document.getElementById('dashDate').textContent =
    new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function renderDashboard() { renderKPIs(); renderAlertas(); renderActividad(); }

function renderKPIs() {
  const lotes      = DB.get(KEYS.lotes);
  const mortandades= DB.get(KEYS.mortandad);
  const vacunas    = DB.get(KEYS.vacunacion);
  const medicacion = DB.get(KEYS.medicacion);
  const ponedoras  = lotes.filter(l => l.etapa === 'produccion').reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);
  const recrías    = lotes.filter(l => l.etapa === 'recria').reduce((s, l) => s + (parseInt(l.cantidadActual) || 0), 0);
  const totalBajas = mortandades.reduce((s, m) => s + (parseInt(m.cantidad) || 0), 0);
  const totalAves  = ponedoras + recrías;
  const ultimos7   = Array.from({length:7}, (_,i) => { const d = new Date(); d.setDate(d.getDate()-i); return d.toISOString().split('T')[0]; });
  const vacRec = vacunas.filter(v => ultimos7.includes(v.fecha)).length;
  const medRec = medicacion.filter(m => ultimos7.includes(m.fecha)).length;

  // Postura promedio 7d
  const posturas7 = DB.get(KEYS.postura).filter(p => ultimos7.includes(p.fecha));
  const hoyHuevos = posturas7.filter(p => p.fecha === today()).reduce((s,p) => s+(parseInt(p.huevos)||0), 0);
  const pct7 = ponedoras > 0 && posturas7.length
    ? ((posturas7.reduce((s,p)=>s+(parseInt(p.huevos)||0),0) / (ponedoras * 7)) * 100).toFixed(1)
    : null;

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card" style="--kpi-color:var(--accent);animation-delay:0s">
      <div class="kpi-icon">🐔</div><div class="kpi-value">${totalAves.toLocaleString('es')}</div>
      <div class="kpi-label">Total Aves</div><div class="kpi-delta">${lotes.length} lote(s) · ${recrías.toLocaleString('es')} en recría</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--gold);animation-delay:.07s">
      <div class="kpi-icon">🥚</div><div class="kpi-value">${hoyHuevos.toLocaleString('es')}</div>
      <div class="kpi-label">Huevos Hoy</div>
      <div class="kpi-delta">${pct7 ? `Promedio 7d: ${pct7}%` : 'Sin datos de postura'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--red);animation-delay:.14s">
      <div class="kpi-icon">💀</div><div class="kpi-value">${totalBajas.toLocaleString('es')}</div>
      <div class="kpi-label">Mortandad Total</div>
      <div class="kpi-delta">${totalAves > 0 ? ((totalBajas/(totalAves+totalBajas))*100).toFixed(1)+'% del lote' : '—'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--blue);animation-delay:.21s">
      <div class="kpi-icon">💉</div><div class="kpi-value">${vacRec + medRec}</div>
      <div class="kpi-label">Sanidad (7d)</div>
      <div class="kpi-delta">${vacRec} vacuna(s) · ${medRec} med.</div>
    </div>`;
}

function renderAlertas() {
  const lotes   = DB.get(KEYS.lotes);
  const vacunas = DB.get(KEYS.vacunacion);
  const alertas = [];
  const hoy     = new Date(); hoy.setHours(0,0,0,0);

  vacunas.forEach(v => {
    if (!v.proximaFecha) return;
    const prox = new Date(v.proximaFecha); prox.setHours(0,0,0,0);
    const diff = Math.ceil((prox - hoy) / 864e5);
    if (diff >= 0 && diff <= 7) alertas.push({ icon:'💉', title:`Vacuna próxima: ${v.vacuna}`, text:` — En ${diff} día(s) · ${getLoteNombre(v.loteId)}` });
    if (diff < 0 && diff > -3)  alertas.push({ icon:'🔴', title:`Vacuna vencida: ${v.vacuna}`,  text:` — Hace ${Math.abs(diff)} día(s)` });
  });

  lotes.filter(l => l.etapa === 'recria').forEach(l => {
    const sem = semanasDesde(l.fecha, l.semanaIngreso);
    if (sem >= 17 && sem < 20) alertas.push({ icon:'🔔', title:`Lote próximo a postura: ${l.nombre}`, text:` — Semana ${sem} de vida. ¡Registrá la ruptura!` });
  });

  DB.get(KEYS.mortandad).filter(m => m.fecha === today()).forEach(m => {
    if (parseInt(m.cantidad) >= 5) alertas.push({ icon:'🚨', title:`Alta mortandad: ${m.cantidad} aves hoy`, text:` — ${getLoteNombre(m.loteId)}` });
  });

  DB.get(KEYS.enfermedades).filter(e => e.estado === 'activa').forEach(e => {
    alertas.push({ icon:'🦠', title:`Enfermedad activa: ${e.nombre}`, text:` — ${getLoteNombre(e.loteId)}` });
  });

  document.getElementById('alertasList').innerHTML = alertas.length
    ? alertas.map(a => `<div class="alerta-item"><span class="alerta-icon">${a.icon}</span><span class="alerta-text"><strong>${a.title}</strong>${a.text}</span></div>`).join('')
    : '<p style="color:var(--text3);font-size:.85rem;padding:8px 0">✅ Sin alertas pendientes</p>';
}

function renderActividad() {
  const items = [];
  const push  = (key, icon, label) => DB.get(key).slice(-5).reverse().forEach(r => items.push({ icon, text: label(r), ts: r.createdAt || r.fecha || '' }));
  push(KEYS.postura,      '🥚', r => `Postura: ${r.huevos} huevos — ${getLoteNombre(r.loteId)}`);
  push(KEYS.lotes,        '🐣', r => `Ingreso: ${r.nombre} (${r.cantidadActual} aves)`);
  push(KEYS.vacunacion,   '💉', r => `Vacuna: ${r.vacuna} — ${getLoteNombre(r.loteId)}`);
  push(KEYS.mortandad,    '💀', r => `Mortandad: ${r.cantidad} ave(s) — ${getLoteNombre(r.loteId)}`);
  push(KEYS.alimentacion, '🌾', r => `Alimento: ${r.kg}kg — ${getLoteNombre(r.loteId)}`);
  push(KEYS.enfermedades, '🦠', r => `Enfermedad: ${r.nombre} — ${getLoteNombre(r.loteId)}`);
  push(KEYS.notas,        '📷', r => `Nota de campo — ${getLoteNombre(r.loteId)}`);
  items.sort((a,b) => b.ts > a.ts ? 1 : -1);
  document.getElementById('actividadList').innerHTML = items.length
    ? items.slice(0,10).map(it => `<div class="actividad-item"><span style="font-size:1rem">${it.icon}</span><span class="actividad-text">${it.text}</span><span class="actividad-time">${fmtDate(it.ts)}</span></div>`).join('')
    : '<p style="color:var(--text3);font-size:.85rem;padding:8px 0">Aún no hay actividad registrada.</p>';
}

// ─── LOTES ────────────────────────────────────────────────────
window.saveLote = function () {
  const id       = document.getElementById('loteId').value;
  const cantidad = parseInt(document.getElementById('loteCantidad').value) || 0;
  const r = {
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
  if (!r.nombre || !r.cantidadInicial) return showToast('⚠️ Completá nombre y cantidad');
  const lotes = DB.get(KEYS.lotes);
  if (id) {
    const idx = lotes.findIndex(l => l.id === id);
    if (idx > -1) { r.cantidadActual = lotes[idx].cantidadActual; lotes[idx] = r; }
  } else { lotes.push(r); }
  DB.set(KEYS.lotes, lotes);
  closeModal('modalLote');
  renderLote(); renderDashboard();
  showToast('✅ Lote guardado');
};

function renderLote() {
  const lotes = DB.get(KEYS.lotes);
  const el    = document.getElementById('loteList');
  if (!lotes.length) { el.innerHTML = emptyState('🐣', 'Sin lotes registrados'); return; }
  el.innerHTML = lotes.slice().reverse().map(l => {
    const sem = semanasDesde(l.fecha, l.semanaIngreso);
    const esRecria = l.etapa === 'recria';
    return `
    <div class="data-card">
      <div class="data-card-header">
        <span class="data-card-title">${l.nombre}</span>
        <span class="badge ${esRecria ? 'badge-gold' : 'badge-green'}">${esRecria ? 'Recría' : 'Producción'}</span>
      </div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Galpón</span><span class="val">${l.galpon||'—'}</span></div>
        <div class="data-field"><span class="lbl">Ingreso</span><span class="val">${fmtDate(l.fecha)}</span></div>
        <div class="data-field"><span class="lbl">Aves actuales</span><span class="val">${(parseInt(l.cantidadActual)||0).toLocaleString('es')}</span></div>
        <div class="data-field"><span class="lbl">Semana actual</span><span class="val" style="color:var(--accent)">${sem} sem.</span></div>
        <div class="data-field"><span class="lbl">Raza</span><span class="val">${l.raza||'—'}</span></div>
        <div class="data-field"><span class="lbl">Inicio</span><span class="val">${(parseInt(l.cantidadInicial)||0).toLocaleString('es')}</span></div>
        ${l.fechaRuptura ? `<div class="data-field" style="grid-column:span 2"><span class="lbl">🥚 Ruptura de postura</span><span class="val" style="color:var(--gold)">${fmtDate(l.fechaRuptura)} · Sem. ${l.semanaRuptura||'—'}</span></div>` : ''}
      </div>
      ${l.notas ? `<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${l.notas}</p>` : ''}
      <div class="data-card-actions">
        <button class="btn-edit" onclick="editLote('${l.id}')">✏️ Editar</button>
        ${esRecria ? `<button class="btn-ruptura-card" onclick="abrirRuptura('${l.id}')">🥚 Ruptura</button>` : ''}
        <button class="btn-edit" onclick="verHistorial('${l.id}')" style="color:var(--blue)">📋 Historial</button>
        <button class="btn-delete" onclick="deleteLote('${l.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

window.editLote = function (id) {
  const l = DB.get(KEYS.lotes).find(x => x.id === id);
  if (!l) return;
  document.getElementById('loteId').value         = l.id;
  document.getElementById('loteFecha').value       = l.fecha;
  document.getElementById('loteNombre').value      = l.nombre;
  document.getElementById('loteGalpon').value      = l.galpon || '';
  document.getElementById('loteCantidad').value    = l.cantidadActual;
  document.getElementById('loteRaza').value        = l.raza || '';
  document.getElementById('loteSemana').value      = l.semanaIngreso || '';
  document.getElementById('loteProcedencia').value = l.procedencia || '';
  document.getElementById('loteEtapa').value       = l.etapa;
  document.getElementById('loteNotas').value       = l.notas || '';
  openModal('modalLote');
};

window.deleteLote = function (id) {
  if (!confirm('¿Eliminar este lote?')) return;
  DB.set(KEYS.lotes, DB.get(KEYS.lotes).filter(l => l.id !== id));
  renderLote(); renderDashboard();
  showToast('🗑️ Lote eliminado');
};

window.verHistorial = function (id) {
  navigateTo('historial');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  setTimeout(() => {
    const sel = document.getElementById('historialLoteSelect');
    if (sel) { sel.value = id; renderHistorial(id); }
  }, 100);
};

// ─── RUPTURA DE POSTURA ──────────────────────────────────────
window.abrirRuptura = function (loteId) {
  const lote = DB.get(KEYS.lotes).find(l => l.id === loteId);
  if (!lote) return;
  document.getElementById('rupturaLoteId').value = loteId;
  document.getElementById('rupturaFecha').value  = today();
  const sem = semanasDesde(lote.fecha, lote.semanaIngreso);
  document.getElementById('rupturaSemana').value = sem;
  document.getElementById('rupturaInfo').innerHTML = `
    <div class="ruptura-card-info">
      <span class="ruptura-card-icon">🐣</span>
      <div>
        <strong>${lote.nombre}</strong>
        <span>${lote.galpon || 'Sin galpón'} · ${(parseInt(lote.cantidadActual)||0).toLocaleString('es')} aves · Semana ${sem}</span>
      </div>
    </div>`;
  openModal('modalRuptura');
};

window.saveRuptura = function () {
  const loteId = document.getElementById('rupturaLoteId').value;
  const fecha  = document.getElementById('rupturaFecha').value;
  const semana = document.getElementById('rupturaSemana').value;
  const pct    = document.getElementById('rupturaPctInicial').value;
  const notas  = document.getElementById('rupturaNotas').value.trim();
  if (!fecha) return showToast('⚠️ Ingresá la fecha de ruptura');

  // Actualizar el lote: cambiar etapa a producción y guardar datos de ruptura
  const lotes = DB.get(KEYS.lotes);
  const idx   = lotes.findIndex(l => l.id === loteId);
  if (idx > -1) {
    lotes[idx].etapa         = 'produccion';
    lotes[idx].fechaRuptura  = fecha;
    lotes[idx].semanaRuptura = semana;
    lotes[idx].pctRuptura    = pct;
    lotes[idx].notasRuptura  = notas;
    DB.set(KEYS.lotes, lotes);
  }

  // Registrar el evento en postura como primer registro
  if (pct) {
    const aves   = parseInt(lotes[idx]?.cantidadActual) || 0;
    const huevos = aves > 0 ? Math.round(aves * (parseFloat(pct) / 100)) : 0;
    const lista  = DB.get(KEYS.postura);
    lista.push({ id: uid(), fecha, loteId, huevos, rotos: 0, notas: `Primer registro — Ruptura de postura (${pct}%)${notas ? '. ' + notas : ''}`, createdAt: today() });
    DB.set(KEYS.postura, lista);
  }

  closeModal('modalRuptura');
  renderLote();
  renderPostura();
  renderDashboard();
  showToast(`✅ Ruptura registrada — Lote pasado a Producción`);
};

// ─── POSTURA ─────────────────────────────────────────────────
function calcPosturaPct() {
  const loteId = document.getElementById('posturaLote').value;
  const huevos = parseInt(document.getElementById('posturaHuevos').value) || 0;
  const lote   = DB.get(KEYS.lotes).find(l => l.id === loteId);
  const aves   = lote ? (parseInt(lote.cantidadActual) || 0) : 0;
  document.getElementById('posturaPorc').value = aves > 0 ? `${((huevos/aves)*100).toFixed(1)}%` : '— (sin lote)';
}

window.savePostura = function () {
  const id = document.getElementById('posturaId').value;
  const r  = { id: id||uid(), fecha: document.getElementById('posturaFecha').value, loteId: document.getElementById('posturaLote').value, huevos: parseInt(document.getElementById('posturaHuevos').value)||0, rotos: parseInt(document.getElementById('posturaRotos').value)||0, notas: document.getElementById('posturaNotas').value.trim(), createdAt: today() };
  if (!r.loteId) return showToast('⚠️ Seleccioná un lote');
  const list = DB.get(KEYS.postura);
  if (id) { const i = list.findIndex(x=>x.id===id); if(i>-1) list[i]=r; } else list.push(r);
  DB.set(KEYS.postura, list);
  closeModal('modalPostura'); renderPostura();
  showToast('✅ Postura registrada');
};

window.renderPostura = function () {
  const mes  = (document.getElementById('filtroPosturaMes')||{}).value || '';
  let list   = DB.get(KEYS.postura);
  if (mes) list = list.filter(p => p.fecha && p.fecha.startsWith(mes));
  list = list.slice().sort((a,b) => b.fecha.localeCompare(a.fecha));
  const el = document.getElementById('posturaList');
  if (!list.length) { el.innerHTML = emptyState('🥚','Sin registros de postura'); return; }
  el.innerHTML = list.map(p => {
    const lote = DB.get(KEYS.lotes).find(l=>l.id===p.loteId);
    const aves = lote ? (parseInt(lote.cantidadActual)||0) : 0;
    const pct  = aves > 0 ? ((p.huevos/aves)*100).toFixed(1) : null;
    const pN   = pct ? parseFloat(pct) : 0;
    const col  = pN>=80?'var(--accent)':pN>=60?'var(--gold)':'var(--red)';
    return `<div class="data-card">
      <div class="data-card-header"><span class="data-card-title">${getLoteNombre(p.loteId)}</span><span class="data-card-date">${fmtDate(p.fecha)}</span></div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Huevos</span><span class="val" style="color:var(--gold)">${p.huevos.toLocaleString('es')}</span></div>
        <div class="data-field"><span class="lbl">Rotos</span><span class="val">${p.rotos}</span></div>
        <div class="data-field"><span class="lbl">% Postura</span><span class="val" style="color:${col}">${pct?pct+'%':'—'}</span></div>
        <div class="data-field"><span class="lbl">Netos</span><span class="val">${(p.huevos-p.rotos).toLocaleString('es')}</span></div>
      </div>
      ${pct?`<div class="postura-bar-wrap"><div class="postura-bar-fill" style="width:${Math.min(pN,100)}%;background:${col}"></div></div>`:''}
      ${p.notas?`<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${p.notas}</p>`:''}
      <div class="data-card-actions">
        <button class="btn-edit" onclick="editPostura('${p.id}')">✏️</button>
        <button class="btn-delete" onclick="deleteRecord('${KEYS.postura}','${p.id}',renderPostura)">🗑️</button>
      </div>
    </div>`;
  }).join('');
};

window.editPostura = function (id) {
  const p = DB.get(KEYS.postura).find(x=>x.id===id); if(!p) return;
  fillLoteSelect('posturaLote');
  document.getElementById('posturaId').value    = p.id;
  document.getElementById('posturaFecha').value = p.fecha;
  document.getElementById('posturaLote').value  = p.loteId;
  document.getElementById('posturaHuevos').value= p.huevos;
  document.getElementById('posturaRotos').value = p.rotos;
  document.getElementById('posturaNotas').value = p.notas;
  openModal('modalPostura');
};

// ─── ALIMENTACIÓN ─────────────────────────────────────────────
window.saveAlimentacion = function () {
  const id = document.getElementById('alimentacionId').value;
  const r  = { id:id||uid(), fecha:document.getElementById('alimentacionFecha').value, loteId:document.getElementById('alimentacionLote').value, tipo:document.getElementById('alimentacionTipo').value.trim(), kg:parseFloat(document.getElementById('alimentacionKg').value)||0, grAve:parseFloat(document.getElementById('alimentacionGrAve').value)||0, proveedor:document.getElementById('alimentacionProveedor').value.trim(), costo:parseFloat(document.getElementById('alimentacionCosto').value)||0, notas:document.getElementById('alimentacionNotas').value.trim(), createdAt:today() };
  if (!r.loteId) return showToast('⚠️ Seleccioná un lote');
  const list = DB.get(KEYS.alimentacion);
  if (id) { const i=list.findIndex(x=>x.id===id); if(i>-1) list[i]=r; } else list.push(r);
  DB.set(KEYS.alimentacion, list); closeModal('modalAlimentacion'); renderAlimentacion();
  showToast('✅ Alimentación registrada');
};

function renderAlimentacion() {
  const list = DB.get(KEYS.alimentacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el   = document.getElementById('alimentacionList');
  if (!list.length) { el.innerHTML = emptyState('🌾','Sin registros de alimentación'); return; }
  el.innerHTML = list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title">${r.tipo||'Alimento'}</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
      <div class="data-field"><span class="lbl">Cantidad</span><span class="val">${r.kg} kg</span></div>
      <div class="data-field"><span class="lbl">g/ave/día</span><span class="val">${r.grAve||'—'}</span></div>
      <div class="data-field"><span class="lbl">Costo</span><span class="val">${r.costo?'$'+r.costo.toLocaleString('es'):'—'}</span></div>
      <div class="data-field"><span class="lbl">Proveedor</span><span class="val">${r.proveedor||'—'}</span></div>
    </div>
    <div class="data-card-actions">
      <button class="btn-edit" onclick="editAlimentacion('${r.id}')">✏️</button>
      <button class="btn-delete" onclick="deleteRecord('${KEYS.alimentacion}','${r.id}',renderAlimentacion)">🗑️</button>
    </div></div>`).join('');
}
window.editAlimentacion = function(id) {
  const r=DB.get(KEYS.alimentacion).find(x=>x.id===id); if(!r) return;
  fillLoteSelect('alimentacionLote');
  ['alimentacionId','alimentacionFecha','alimentacionLote','alimentacionTipo','alimentacionKg','alimentacionGrAve','alimentacionProveedor','alimentacionCosto','alimentacionNotas'].forEach(fid=>{
    const map={alimentacionId:r.id,alimentacionFecha:r.fecha,alimentacionLote:r.loteId,alimentacionTipo:r.tipo,alimentacionKg:r.kg,alimentacionGrAve:r.grAve,alimentacionProveedor:r.proveedor,alimentacionCosto:r.costo,alimentacionNotas:r.notas};
    document.getElementById(fid).value=map[fid]??'';
  });
  openModal('modalAlimentacion');
};

// ─── VACUNACIÓN ───────────────────────────────────────────────
window.saveVacunacion = function () {
  const id=document.getElementById('vacunacionId').value;
  const r={id:id||uid(),fecha:document.getElementById('vacunacionFecha').value,loteId:document.getElementById('vacunacionLote').value,vacuna:document.getElementById('vacunaNombre').value.trim(),via:document.getElementById('vacunaVia').value,dosis:document.getElementById('vacunaDosis').value.trim(),aplicador:document.getElementById('vacunaAplicador').value.trim(),proximaFecha:document.getElementById('vacunaProxima').value,notas:document.getElementById('vacunaNotas').value.trim(),createdAt:today()};
  if(!r.loteId||!r.vacuna) return showToast('⚠️ Completá lote y vacuna');
  const list=DB.get(KEYS.vacunacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.vacunacion,list);closeModal('modalVacunacion');renderVacunacion();renderDashboard();
  showToast('✅ Vacunación registrada');
};
function renderVacunacion() {
  const list=DB.get(KEYS.vacunacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('vacunacionList');
  if(!list.length){el.innerHTML=emptyState('💉','Sin registros de vacunación');return;}
  const vias={agua:'Agua de bebida',ocular:'Ocular',nasal:'Nasal',inyectable:'Inyectable',spray:'Spray',ala:'Punción alar'};
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title">${r.vacuna}</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
      <div class="data-field"><span class="lbl">Vía</span><span class="val">${vias[r.via]||r.via}</span></div>
      <div class="data-field"><span class="lbl">Dosis</span><span class="val">${r.dosis||'—'}</span></div>
      <div class="data-field"><span class="lbl">Aplicador</span><span class="val">${r.aplicador||'—'}</span></div>
      <div class="data-field"><span class="lbl">Próxima</span><span class="val" style="color:var(--gold)">${r.proximaFecha?fmtDate(r.proximaFecha):'—'}</span></div>
    </div>
    <div class="data-card-actions">
      <button class="btn-edit" onclick="editVacunacion('${r.id}')">✏️</button>
      <button class="btn-delete" onclick="deleteRecord('${KEYS.vacunacion}','${r.id}',renderVacunacion)">🗑️</button>
    </div></div>`).join('');
}
window.editVacunacion=function(id){
  const r=DB.get(KEYS.vacunacion).find(x=>x.id===id);if(!r)return;
  fillLoteSelect('vacunacionLote');
  document.getElementById('vacunacionId').value=r.id;document.getElementById('vacunacionFecha').value=r.fecha;document.getElementById('vacunacionLote').value=r.loteId;document.getElementById('vacunaNombre').value=r.vacuna;document.getElementById('vacunaVia').value=r.via;document.getElementById('vacunaDosis').value=r.dosis;document.getElementById('vacunaAplicador').value=r.aplicador;document.getElementById('vacunaProxima').value=r.proximaFecha||'';document.getElementById('vacunaNotas').value=r.notas;
  openModal('modalVacunacion');
};

// ─── MEDICACIÓN ───────────────────────────────────────────────
window.saveMedicacion=function(){
  const id=document.getElementById('medicacionId').value;
  const r={id:id||uid(),fecha:document.getElementById('medicacionFecha').value,loteId:document.getElementById('medicacionLote').value,nombre:document.getElementById('medicamentoNombre').value.trim(),motivo:document.getElementById('medicamentoMotivo').value.trim(),dosis:document.getElementById('medicamentoDosis').value.trim(),dias:document.getElementById('medicamentoDias').value,vet:document.getElementById('medicamentoVet').value.trim(),notas:document.getElementById('medicamentoNotas').value.trim(),createdAt:today()};
  if(!r.loteId||!r.nombre)return showToast('⚠️ Completá lote y medicamento');
  const list=DB.get(KEYS.medicacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.medicacion,list);closeModal('modalMedicacion');renderMedicacion();
  showToast('✅ Medicación registrada');
};
function renderMedicacion(){
  const list=DB.get(KEYS.medicacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('medicacionList');
  if(!list.length){el.innerHTML=emptyState('💊','Sin registros de medicación');return;}
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title">${r.nombre}</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
      <div class="data-field"><span class="lbl">Motivo</span><span class="val">${r.motivo||'—'}</span></div>
      <div class="data-field"><span class="lbl">Dosis</span><span class="val">${r.dosis||'—'}</span></div>
      <div class="data-field"><span class="lbl">Días</span><span class="val">${r.dias||'—'}</span></div>
      <div class="data-field"><span class="lbl">Veterinario</span><span class="val">${r.vet||'—'}</span></div>
    </div>
    <div class="data-card-actions">
      <button class="btn-edit" onclick="editMedicacion('${r.id}')">✏️</button>
      <button class="btn-delete" onclick="deleteRecord('${KEYS.medicacion}','${r.id}',renderMedicacion)">🗑️</button>
    </div></div>`).join('');
}
window.editMedicacion=function(id){
  const r=DB.get(KEYS.medicacion).find(x=>x.id===id);if(!r)return;
  fillLoteSelect('medicacionLote');
  document.getElementById('medicacionId').value=r.id;document.getElementById('medicacionFecha').value=r.fecha;document.getElementById('medicacionLote').value=r.loteId;document.getElementById('medicamentoNombre').value=r.nombre;document.getElementById('medicamentoMotivo').value=r.motivo;document.getElementById('medicamentoDosis').value=r.dosis;document.getElementById('medicamentoDias').value=r.dias;document.getElementById('medicamentoVet').value=r.vet;document.getElementById('medicamentoNotas').value=r.notas;
  openModal('modalMedicacion');
};

// ─── MORTANDAD ────────────────────────────────────────────────
window.saveMortandad=function(){
  const id=document.getElementById('mortandadId').value;
  const r={id:id||uid(),fecha:document.getElementById('mortandadFecha').value,loteId:document.getElementById('mortandadLote').value,cantidad:parseInt(document.getElementById('mortandadCantidad').value)||0,causa:document.getElementById('mortandadCausa').value,desc:document.getElementById('mortandadDesc').value.trim(),necropsia:document.getElementById('mortandadNecropsia').value,createdAt:today()};
  if(!r.loteId)return showToast('⚠️ Seleccioná un lote');
  if(!r.cantidad)return showToast('⚠️ Ingresá cantidad de bajas');
  if(!id){
    const lotes=DB.get(KEYS.lotes);const idx=lotes.findIndex(l=>l.id===r.loteId);
    if(idx>-1){lotes[idx].cantidadActual=Math.max(0,(parseInt(lotes[idx].cantidadActual)||0)-r.cantidad);DB.set(KEYS.lotes,lotes);}
  }
  const list=DB.get(KEYS.mortandad);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.mortandad,list);closeModal('modalMortandad');renderMortandad();renderDashboard();
  showToast('✅ Mortandad registrada');
};
function renderMortandad(){
  const list=DB.get(KEYS.mortandad).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('mortandadList');
  if(!list.length){el.innerHTML=emptyState('📋','Sin registros de mortandad');return;}
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title" style="color:var(--red)">🪦 ${r.cantidad} ave(s)</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
      <div class="data-field"><span class="lbl">Causa</span><span class="val">${causas[r.causa]||r.causa}</span></div>
      <div class="data-field"><span class="lbl">Necropsia</span><span class="val">${r.necropsia==='si'?'✅ Sí':r.necropsia==='pendiente'?'⏳ Pendiente':'❌ No'}</span></div>
    </div>
    ${r.desc?`<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${r.desc}</p>`:''}
    <div class="data-card-actions">
      <button class="btn-edit" onclick="editMortandad('${r.id}')">✏️</button>
      <button class="btn-delete" onclick="deleteRecord('${KEYS.mortandad}','${r.id}',renderMortandad)">🗑️</button>
    </div></div>`).join('');
}
window.editMortandad=function(id){
  const r=DB.get(KEYS.mortandad).find(x=>x.id===id);if(!r)return;
  fillLoteSelect('mortandadLote');
  document.getElementById('mortandadId').value=r.id;document.getElementById('mortandadFecha').value=r.fecha;document.getElementById('mortandadLote').value=r.loteId;document.getElementById('mortandadCantidad').value=r.cantidad;document.getElementById('mortandadCausa').value=r.causa;document.getElementById('mortandadDesc').value=r.desc;document.getElementById('mortandadNecropsia').value=r.necropsia;
  openModal('modalMortandad');
};

// ─── ENFERMEDADES ─────────────────────────────────────────────
window.saveEnfermedad=function(){
  const id=document.getElementById('enfermedadId').value;
  const r={id:id||uid(),fecha:document.getElementById('enfermedadFecha').value,loteId:document.getElementById('enfermedadLote').value,nombre:document.getElementById('enfermedadNombre').value.trim(),sintomas:document.getElementById('enfermedadSintomas').value.trim(),afectadas:parseInt(document.getElementById('enfermedadAfectadas').value)||0,vet:document.getElementById('enfermedadVet').value.trim(),tratamiento:document.getElementById('enfermedadTratamiento').value.trim(),estado:document.getElementById('enfermedadEstado').value,fechaCierre:document.getElementById('enfermedadCierre').value,notas:document.getElementById('enfermedadNotas').value.trim(),createdAt:today()};
  if(!r.loteId||!r.nombre)return showToast('⚠️ Completá lote y nombre');
  const list=DB.get(KEYS.enfermedades);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.enfermedades,list);closeModal('modalEnfermedad');renderEnfermedades();renderDashboard();
  showToast('✅ Enfermedad registrada');
};
function renderEnfermedades(){
  const list=DB.get(KEYS.enfermedades).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('enfermedadList');
  if(!list.length){el.innerHTML=emptyState('🦠','Sin registros de enfermedades');return;}
  el.innerHTML=list.map(r=>{
    const badge=r.estado==='activa'?'<span class="badge badge-red">Activa</span>':r.estado==='controlada'?'<span class="badge badge-gold">Controlada</span>':'<span class="badge badge-green">Resuelta</span>';
    return `<div class="data-card">
      <div class="data-card-header"><span class="data-card-title">🦠 ${r.nombre}</span>${badge}</div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
        <div class="data-field"><span class="lbl">Fecha</span><span class="val">${fmtDate(r.fecha)}</span></div>
        <div class="data-field"><span class="lbl">Aves afect.</span><span class="val">${r.afectadas||'—'}</span></div>
        <div class="data-field"><span class="lbl">Veterinario</span><span class="val">${r.vet||'—'}</span></div>
        <div class="data-field"><span class="lbl">Tratamiento</span><span class="val">${r.tratamiento||'—'}</span></div>
        <div class="data-field"><span class="lbl">Cierre</span><span class="val">${r.fechaCierre?fmtDate(r.fechaCierre):'—'}</span></div>
      </div>
      ${r.sintomas?`<p style="color:var(--text3);font-size:.82rem;margin-top:8px"><strong style="color:var(--text2)">Síntomas:</strong> ${r.sintomas}</p>`:''}
      <div class="data-card-actions">
        <button class="btn-edit" onclick="editEnfermedad('${r.id}')">✏️ Editar</button>
        <button class="btn-delete" onclick="deleteRecord('${KEYS.enfermedades}','${r.id}',renderEnfermedades)">🗑️</button>
      </div></div>`;
  }).join('');
}
window.editEnfermedad=function(id){
  const r=DB.get(KEYS.enfermedades).find(x=>x.id===id);if(!r)return;
  fillLoteSelect('enfermedadLote');
  document.getElementById('enfermedadId').value=r.id;document.getElementById('enfermedadFecha').value=r.fecha;document.getElementById('enfermedadLote').value=r.loteId;document.getElementById('enfermedadNombre').value=r.nombre;document.getElementById('enfermedadSintomas').value=r.sintomas;document.getElementById('enfermedadAfectadas').value=r.afectadas;document.getElementById('enfermedadVet').value=r.vet;document.getElementById('enfermedadTratamiento').value=r.tratamiento;document.getElementById('enfermedadEstado').value=r.estado;document.getElementById('enfermedadCierre').value=r.fechaCierre||'';document.getElementById('enfermedadNotas').value=r.notas;
  openModal('modalEnfermedad');
};

// ─── NOTAS DE CAMPO ───────────────────────────────────────────
window.saveNota=function(){
  const id=document.getElementById('notaId').value;
  const archivo=document.getElementById('notaFoto').files[0];
  const guardar=fotoB64=>{
    const r={id:id||uid(),fecha:document.getElementById('notaFecha').value,loteId:document.getElementById('notaLote').value,texto:document.getElementById('notaTexto').value.trim(),foto:fotoB64||(id?(DB.get(KEYS.notas).find(x=>x.id===id)||{}).foto:null),createdAt:today()};
    if(!r.loteId)return showToast('⚠️ Seleccioná un lote');
    const list=DB.get(KEYS.notas);
    if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
    DB.set(KEYS.notas,list);closeModal('modalNota');renderNotas();
    showToast('✅ Nota guardada');
  };
  if(archivo){const rd=new FileReader();rd.onload=ev=>guardar(ev.target.result);rd.readAsDataURL(archivo);}
  else guardar(null);
};
function renderNotas(){
  const list=DB.get(KEYS.notas).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('notasList');
  if(!list.length){el.innerHTML=emptyState('📷','Sin notas de campo');return;}
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title">📷 ${getLoteNombre(r.loteId)}</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    ${r.foto?`<img src="${r.foto}" style="width:100%;border-radius:8px;margin:8px 0;max-height:200px;object-fit:cover">`:''}
    ${r.texto?`<p style="color:var(--text2);font-size:.88rem;margin-top:4px">${r.texto}</p>`:''}
    <div class="data-card-actions"><button class="btn-delete" onclick="deleteRecord('${KEYS.notas}','${r.id}',renderNotas)">🗑️</button></div>
  </div>`).join('');
}

// ─── HISTORIAL POR LOTE ───────────────────────────────────────
function renderHistorialSelector(){
  const lotes=DB.get(KEYS.lotes);
  const sel=document.getElementById('historialLoteSelect');
  sel.innerHTML=lotes.length?lotes.map(l=>`<option value="${l.id}">${l.nombre}</option>`):'<option value="">—</option>';
  if(lotes.length)renderHistorial(lotes[0].id);
}
window.onHistorialChange=function(){const id=document.getElementById('historialLoteSelect').value;if(id)renderHistorial(id);};
function renderHistorial(loteId){
  const lote=DB.get(KEYS.lotes).find(l=>l.id===loteId);if(!lote)return;
  const sem=semanasDesde(lote.fecha,lote.semanaIngreso);
  document.getElementById('historialResumen').innerHTML=`<div class="data-card" style="margin-bottom:14px">
    <div class="data-card-header"><span class="data-card-title">${lote.nombre}</span><span class="badge ${lote.etapa==='produccion'?'badge-green':'badge-gold'}">${lote.etapa==='produccion'?'Producción':'Recría'}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Galpón</span><span class="val">${lote.galpon||'—'}</span></div>
      <div class="data-field"><span class="lbl">Ingreso</span><span class="val">${fmtDate(lote.fecha)}</span></div>
      <div class="data-field"><span class="lbl">Semana actual</span><span class="val" style="color:var(--accent)">${sem} sem.</span></div>
      <div class="data-field"><span class="lbl">Aves actuales</span><span class="val">${(parseInt(lote.cantidadActual)||0).toLocaleString('es')}</span></div>
      ${lote.fechaRuptura?`<div class="data-field" style="grid-column:span 2"><span class="lbl">🥚 Ruptura postura</span><span class="val" style="color:var(--gold)">${fmtDate(lote.fechaRuptura)} · Sem. ${lote.semanaRuptura}</span></div>`:''}
    </div></div>`;
  const eventos=[];
  const add=(key,icon,label)=>DB.get(key).filter(r=>r.loteId===loteId).forEach(r=>eventos.push({icon,text:label(r),fecha:r.fecha||r.createdAt||''}));
  add(KEYS.mortandad,'💀',r=>`Mortandad: ${r.cantidad} ave(s) — ${r.causa||''}`);
  add(KEYS.vacunacion,'💉',r=>`Vacuna: ${r.vacuna} (${r.via||''})`);
  add(KEYS.medicacion,'💊',r=>`Medicación: ${r.nombre} — ${r.motivo||''}`);
  add(KEYS.alimentacion,'🌾',r=>`Alimento: ${r.kg}kg ${r.tipo||''}`);
  add(KEYS.postura,'🥚',r=>`Postura: ${r.huevos} huevos`);
  add(KEYS.enfermedades,'🦠',r=>`Enfermedad: ${r.nombre} [${r.estado}]`);
  add(KEYS.notas,'📷',r=>`Nota: ${r.texto||'(sin texto)'}`);
  eventos.sort((a,b)=>b.fecha>a.fecha?1:-1);
  document.getElementById('historialEventos').innerHTML=eventos.length
    ?eventos.map(ev=>`<div class="actividad-item"><span style="font-size:1rem">${ev.icon}</span><span class="actividad-text">${ev.text}</span><span class="actividad-time">${fmtDate(ev.fecha)}</span></div>`).join('')
    :'<p style="color:var(--text3);font-size:.85rem;padding:16px 0">Sin eventos para este lote.</p>';
}

// ─── EXPORTAR CSV ─────────────────────────────────────────────
window.exportarCSV=function(key,nombre){
  const list=DB.get(key);if(!list.length)return showToast('⚠️ Sin datos');
  const lotes=DB.get(KEYS.lotes);
  const getLote=id=>{const l=lotes.find(x=>x.id===id);return l?l.nombre:'';};
  const rows=list.map(r=>({...r,loteNombre:getLote(r.loteId||'')}));
  const cols=Object.keys(rows[0]);
  const csv=[cols.join(','),...rows.map(r=>cols.map(c=>`"${String(r[c]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`hinse-${nombre}-${today()}.csv`;a.click();URL.revokeObjectURL(url);
  showToast(`📊 CSV exportado`);
};

// ─── DELETE GENÉRICO ─────────────────────────────────────────
window.deleteRecord=function(key,id,rerenderFn){
  if(!confirm('¿Eliminar este registro?'))return;
  DB.set(key,DB.get(key).filter(x=>x.id!==id));
  rerenderFn();
  if([KEYS.mortandad,KEYS.lotes,KEYS.vacunacion,KEYS.medicacion,KEYS.enfermedades].includes(key))renderDashboard();
  showToast('🗑️ Registro eliminado');
};

// ─── HELPERS ─────────────────────────────────────────────────
function getLoteNombre(id){const l=DB.get(KEYS.lotes).find(x=>x.id===id);return l?l.nombre:'(lote eliminado)';}
function emptyState(icon,msg){return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;}

// ─── BACKUP / RESTORE ─────────────────────────────────────────
function setupBackup(){
  document.getElementById('btnBackup').addEventListener('click',()=>{
    const data={};Object.values(KEYS).forEach(k=>{data[k]=DB.get(k);});data._version=2;data._exportDate=new Date().toISOString();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`hinse-backup-${today()}.json`;a.click();URL.revokeObjectURL(url);
    showToast('💾 Backup descargado');
  });
  document.getElementById('btnRestore').addEventListener('click',()=>document.getElementById('fileRestore').click());
  document.getElementById('fileRestore').addEventListener('change',e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{try{const data=JSON.parse(ev.target.result);if(!confirm(`¿Restaurar backup? Esto reemplazará los datos actuales.`))return;Object.values(KEYS).forEach(k=>{if(data[k])DB.set(k,data[k]);});showToast('📂 Restaurado');setTimeout(()=>location.reload(),800);}catch{showToast('❌ Archivo inválido');}};
    reader.readAsText(file);e.target.value='';
  });
}

// ─── PDF DASHBOARD ────────────────────────────────────────────
function setupPDF(){
  document.getElementById('btnPDF').addEventListener('click', generarPDF);
}

function generarPDF() {
  const lotes      = DB.get(KEYS.lotes);
  const mortandades= DB.get(KEYS.mortandad);
  const vacunas    = DB.get(KEYS.vacunacion);
  const medicacion = DB.get(KEYS.medicacion);
  const posturas   = DB.get(KEYS.postura);
  const enfermedades=DB.get(KEYS.enfermedades);

  const ponedoras  = lotes.filter(l=>l.etapa==='produccion').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const recrías    = lotes.filter(l=>l.etapa==='recria').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const totalAves  = ponedoras+recrías;
  const totalBajas = mortandades.reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const ultimos7   = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];});
  const post7      = posturas.filter(p=>ultimos7.includes(p.fecha));
  const hoyHuevos  = post7.filter(p=>p.fecha===today()).reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const pct7       = ponedoras>0&&post7.length?((post7.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(ponedoras*7))*100).toFixed(1):null;
  const enferActivas=enfermedades.filter(e=>e.estado==='activa');
  const fechaInforme=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const horaInforme =new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});

  // Últimas posturas por lote
  const ultimasPosturas=lotes.filter(l=>l.etapa==='produccion').map(l=>{
    const ps=posturas.filter(p=>p.loteId===l.id).sort((a,b)=>b.fecha.localeCompare(a.fecha));
    const last=ps[0];const aves=parseInt(l.cantidadActual)||0;
    const pct=last&&aves>0?((parseInt(last.huevos)/aves)*100).toFixed(1):null;
    return{lote:l,last,pct};
  });

  // Vacunas próximas
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const vacProximas=vacunas.filter(v=>{if(!v.proximaFecha)return false;const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);const diff=Math.ceil((d-hoy)/864e5);return diff>=0&&diff<=14;}).map(v=>{const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);return{...v,dias:Math.ceil((d-hoy)/864e5)};});

  document.getElementById('pdfContent').innerHTML = `
  <div class="pdf-page">
    <!-- HEADER -->
    <div class="pdf-header">
      <div class="pdf-logo-area">
        <div class="pdf-logo-icon">🐔</div>
        <div>
          <div class="pdf-logo-name">HINSE</div>
          <div class="pdf-logo-sub">GRANJA AVÍCOLA</div>
        </div>
      </div>
      <div class="pdf-header-right">
        <div class="pdf-report-title">INFORME DE PRODUCCIÓN</div>
        <div class="pdf-report-date">${fechaInforme}</div>
        <div class="pdf-report-time">${horaInforme} hs</div>
      </div>
    </div>

    <!-- KPI STRIP -->
    <div class="pdf-kpi-strip">
      <div class="pdf-kpi" style="border-color:#c8853a">
        <div class="pdf-kpi-icon">🐔</div>
        <div class="pdf-kpi-val">${totalAves.toLocaleString('es')}</div>
        <div class="pdf-kpi-lbl">Total Aves</div>
      </div>
      <div class="pdf-kpi" style="border-color:#d4a043">
        <div class="pdf-kpi-icon">🥚</div>
        <div class="pdf-kpi-val">${hoyHuevos.toLocaleString('es')}</div>
        <div class="pdf-kpi-lbl">Huevos Hoy</div>
      </div>
      <div class="pdf-kpi" style="border-color:#7a9ab5">
        <div class="pdf-kpi-icon">📈</div>
        <div class="pdf-kpi-val">${pct7?pct7+'%':'—'}</div>
        <div class="pdf-kpi-lbl">% Postura 7d</div>
      </div>
      <div class="pdf-kpi" style="border-color:#c05050">
        <div class="pdf-kpi-icon">💀</div>
        <div class="pdf-kpi-val">${totalBajas.toLocaleString('es')}</div>
        <div class="pdf-kpi-lbl">Mortandad</div>
      </div>
    </div>

    <!-- DOS COLUMNAS -->
    <div class="pdf-cols">
      <!-- LOTES -->
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#c8853a,#a86828)">
          <span>🐣 LOTES ACTIVOS</span><span>${lotes.length}</span>
        </div>
        ${lotes.length?lotes.map(l=>{
          const sem=semanasDesde(l.fecha,l.semanaIngreso);
          return `<div class="pdf-row">
            <div class="pdf-row-main">
              <span class="pdf-row-name">${l.nombre}</span>
              <span class="pdf-badge ${l.etapa==='produccion'?'pdf-badge-green':'pdf-badge-gold'}">${l.etapa==='produccion'?'Producción':'Recría'}</span>
            </div>
            <div class="pdf-row-detail">${l.galpon||'Sin galpón'} · ${(parseInt(l.cantidadActual)||0).toLocaleString('es')} aves · Sem. ${sem}</div>
          </div>`;
        }).join(''):'<div class="pdf-empty">Sin lotes registrados</div>'}
      </div>

      <!-- POSTURA POR LOTE -->
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#d4a043,#a86828)">
          <span>🥚 POSTURA POR LOTE</span>
        </div>
        ${ultimasPosturas.length?ultimasPosturas.map(({lote,last,pct})=>{
          const pN=pct?parseFloat(pct):0;
          const barCol=pN>=80?'#c8853a':pN>=60?'#d4a043':'#c05050';
          return `<div class="pdf-row">
            <div class="pdf-row-main">
              <span class="pdf-row-name">${lote.nombre}</span>
              <span style="font-weight:700;color:${barCol}">${pct?pct+'%':'—'}</span>
            </div>
            ${last?`<div class="pdf-row-detail">${fmtDate(last.fecha)} · ${last.huevos} huevos</div>`:'<div class="pdf-row-detail" style="color:#c05050">Sin registros</div>'}
            ${pct?`<div class="pdf-mini-bar"><div style="width:${Math.min(pN,100)}%;background:${barCol}"></div></div>`:''}
          </div>`;
        }).join(''):'<div class="pdf-empty">Sin lotes en producción</div>'}
      </div>
    </div>

    <div class="pdf-cols">
      <!-- VACUNAS PRÓXIMAS -->
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a9ab5,#4a6a8a)">
          <span>💉 VACUNAS PRÓXIMAS</span><span>${vacProximas.length}</span>
        </div>
        ${vacProximas.length?vacProximas.map(v=>`<div class="pdf-row">
          <div class="pdf-row-main">
            <span class="pdf-row-name">${v.vacuna}</span>
            <span class="pdf-badge ${v.dias<=3?'pdf-badge-red':'pdf-badge-blue'}">En ${v.dias}d</span>
          </div>
          <div class="pdf-row-detail">${getLoteNombre(v.loteId)}</div>
        </div>`).join(''):'<div class="pdf-empty">✅ Sin vacunas próximas</div>'}
      </div>

      <!-- ENFERMEDADES ACTIVAS -->
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#8a5a3a,#6b3e1e)">
          <span>🦠 ENFERMEDADES ACTIVAS</span><span>${enferActivas.length}</span>
        </div>
        ${enferActivas.length?enferActivas.map(e=>`<div class="pdf-row">
          <div class="pdf-row-main">
            <span class="pdf-row-name">${e.nombre}</span>
            <span class="pdf-badge pdf-badge-red">Activa</span>
          </div>
          <div class="pdf-row-detail">${getLoteNombre(e.loteId)}${e.vet?' · Vet: '+e.vet:''}</div>
        </div>`).join(''):'<div class="pdf-empty">✅ Sin enfermedades activas</div>'}
      </div>
    </div>

    <!-- MORTANDAD RECIENTE -->
    <div class="pdf-section pdf-section-full">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a3a3a,#5a2a2a)">
        <span>💀 MORTANDAD — ÚLTIMAS BAJAS</span>
      </div>
      ${mortandades.length?mortandades.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,5).map(m=>`
        <div class="pdf-row" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;align-items:center">
          <span style="font-weight:600;color:#c05050">${m.cantidad} ave(s)</span>
          <span style="color:#8a6848">${fmtDate(m.fecha)}</span>
          <span>${getLoteNombre(m.loteId)}</span>
          <span style="color:#a08060">${m.causa||'—'}</span>
        </div>`).join(''):'<div class="pdf-empty">Sin registros de mortandad</div>'}
    </div>

    <!-- FOOTER -->
    <div class="pdf-footer">
      <span>Granja Hinse · Sistema de Control Avícola</span>
      <span>Generado el ${fechaInforme} a las ${horaInforme} hs</span>
      <span>Confidencial — Solo uso interno</span>
    </div>
  </div>`;

  document.getElementById('pdfOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

window.imprimirPDF = function () { window.print(); };
window.cerrarPDF   = function () {
  document.getElementById('pdfOverlay').classList.add('hidden');
  document.body.style.overflow = '';
};

// ─── SERVICE WORKER ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}