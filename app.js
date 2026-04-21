/* ============================================================
   Hinse — Granja Avícola v3.2
   app.js — 100% addEventListener, sin onclick en HTML
   ============================================================ */
'use strict';

// ─── STORAGE ─────────────────────────────────────────────────
const DB = {
  get(k)    { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};
const KEYS = {
  lotes:'hinse_lotes', postura:'hinse_postura', alimentacion:'hinse_alimentacion',
  vacunacion:'hinse_vacunacion', medicacion:'hinse_medicacion', mortandad:'hinse_mortandad',
  enfermedades:'hinse_enfermedades', notas:'hinse_notas', formulas:'hinse_formulas',
};

// ─── UTILS ───────────────────────────────────────────────────
const uid     = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmtDate = d => { if(!d) return '—'; const [y,m,dia]=d.split('-'); return `${dia}/${m}/${y}`; };
const today   = () => new Date().toISOString().split('T')[0];
const $       = id => document.getElementById(id);
const val     = id => { const el=$(id); return el ? el.value : ''; };
const setVal  = (id,v) => { const el=$(id); if(el) el.value = v ?? ''; };

function semanasDesde(f, base=0) {
  if(!f) return parseInt(base)||0;
  return Math.floor((Date.now()-new Date(f).getTime())/(7*24*3600*1000))+(parseInt(base)||0);
}
function showToast(msg, ms=2400) {
  const el=$('toast'); if(!el) return;
  el.textContent=msg; el.classList.remove('hidden');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add('hidden'),ms);
}
function emptyState(icon,msg) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
}
function getLoteNombre(id) {
  return DB.get(KEYS.lotes).find(x=>x.id===id)?.nombre || '(lote eliminado)';
}
function fillLoteSelect(selectId) {
  const sel=$(selectId); if(!sel) return;
  const lotes=DB.get(KEYS.lotes);
  sel.innerHTML = lotes.length
    ? lotes.map(l=>`<option value="${l.id}">${l.nombre} — ${l.galpon||'Sin galpón'} (${l.cantidadActual||0})</option>`).join('')
    : '<option value="">— Sin lotes registrados —</option>';
}

// ─── MODAL ENGINE ─────────────────────────────────────────────
function openModal(id) {
  const m=$(id); if(!m) return;
  m.classList.remove('hidden');
  document.body.style.overflow='hidden';
  m.querySelectorAll('input[type=date]').forEach(el=>{ if(!el.value) el.value=today(); });
  ['posturaLote','alimentacionLote','vacunacionLote','medicacionLote',
   'mortandadLote','enfermedadLote','notaLote'].forEach(sid=>{
    if(m.querySelector('#'+sid)) fillLoteSelect(sid);
  });
  if(id==='modalPostura') calcPosturaTotal();
}
function closeModal(id) {
  const m=$(id); if(!m) return;
  m.classList.add('hidden');
  document.body.style.overflow='';
  m.querySelectorAll('input:not([type=hidden]):not([type=file]),select,textarea').forEach(el=>{
    el.tagName==='SELECT' ? (el.selectedIndex=0) : (el.value='');
  });
  m.querySelectorAll('input[type=hidden]').forEach(el=>el.value='');
  m.querySelectorAll('input[type=date]').forEach(el=>el.value=today());
  m.querySelectorAll('.foto-preview').forEach(p=>p.innerHTML='');
}

// ─── SPLASH → INIT ───────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    $('splash').style.opacity='0';
    setTimeout(() => {
      $('splash').classList.add('hidden');
      $('app').classList.remove('hidden');
      init();
    }, 500);
  }, 2000);
});

function init() {
  wireNav();
  wireModals();
  wireButtons();
  wirePosturaCalc();
  wireFotoPreviews();
  wireBackup();
  // PDF buttons wired directamente en wireButtons
  populateDashDate();
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderLote(); renderPostura(); renderAlimentacion();
  renderVacunacion(); renderMedicacion(); renderMortandad();
  renderEnfermedades(); renderNotas(); renderFormulas();
}

// ─── NAV ─────────────────────────────────────────────────────
let _masOpen = false;
function wireNav() {
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      cerrarMas();
    });
  });

  const masBtn=$('navMasBtn');
  if(masBtn) masBtn.addEventListener('click', e => {
    e.stopPropagation();
    _masOpen=!_masOpen;
    $('masMenu').classList.toggle('hidden',!_masOpen);
    masBtn.classList.toggle('active',_masOpen);
  });

  document.querySelectorAll('#masMenu .mas-btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.nav);
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      cerrarMas();
    });
  });

  document.addEventListener('click', () => { if(_masOpen) cerrarMas(); });
  const masMenu=$('masMenu');
  if(masMenu) masMenu.addEventListener('click', e=>e.stopPropagation());
}

function cerrarMas() {
  _masOpen=false;
  const m=$('masMenu'); if(m) m.classList.add('hidden');
  const b=$('navMasBtn'); if(b) b.classList.remove('active');
}

function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const t=$('view-'+view);
  if(t) t.classList.add('active');
  if(view==='dashboard') renderDashboard();
  if(view==='historial') renderHistorialSelector();
  if(view==='galpones')  renderGalpones();
}

// ─── WIRE MODALS ─────────────────────────────────────────────
function wireModals() {
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click',()=>closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay=>{
    overlay.addEventListener('click',e=>{ if(e.target===overlay) closeModal(overlay.id); });
  });
}

// ─── WIRE BUTTONS ─────────────────────────────────────────────
function wireButtons() {
  // Abrir modales
  const opens = {
    btnNuevoLote:       ()=>openModal('modalLote'),
    btnNuevaMortandad:  ()=>{ fillLoteSelect('mortandadLote'); openModal('modalMortandad'); },
    btnNuevaEnfermedad: ()=>{ fillLoteSelect('enfermedadLote'); openModal('modalEnfermedad'); },
    btnNuevaVacuna:     ()=>{ fillLoteSelect('vacunacionLote'); openModal('modalVacunacion'); },
    btnNuevaPostura:    ()=>{ fillLoteSelect('posturaLote'); openModal('modalPostura'); },
    btnNuevaMedicacion: ()=>{ fillLoteSelect('medicacionLote'); openModal('modalMedicacion'); },
    btnNuevoAlimento:   ()=>{ fillLoteSelect('alimentacionLote'); openModal('modalAlimentacion'); },
    btnNuevaNota:       ()=>{ fillLoteSelect('notaLote'); openModal('modalNota'); },
    btnNuevaFormula:    ()=>openModal('modalFormula'),
  };
  Object.entries(opens).forEach(([id,fn])=>{ const el=$(id); if(el) el.addEventListener('click',fn); });

  // Guardar registros
  const saves = {
    btnSaveLote:         saveLote,
    btnSaveRuptura:      saveRuptura,
    btnSavePostura:      savePostura,
    btnSaveAlimentacion: saveAlimentacion,
    btnSaveVacunacion:   saveVacunacion,
    btnSaveMedicacion:   saveMedicacion,
    btnSaveMortandad:    saveMortandad,
    btnSaveEnfermedad:   saveEnfermedad,
    btnSaveNota:         saveNota,
    btnSaveFormula:      saveFormula,
  };
  Object.entries(saves).forEach(([id,fn])=>{ const el=$(id); if(el) el.addEventListener('click',fn); });

  // Exports y PDF — todos aquí para garantizar que están wired
  const btnExportEnf=$('btnExportEnf');
  if(btnExportEnf) btnExportEnf.addEventListener('click',()=>exportarCSV(KEYS.enfermedades,'enfermedades'));

  const btnExcel=$('btnExcel');
  if(btnExcel) btnExcel.addEventListener('click',exportarExcel);

  const btnBackupJSON=$('btnBackup');
  if(btnBackupJSON) btnBackupJSON.addEventListener('click',hacerBackupJSON);

  const btnRestore=$('btnRestore');
  if(btnRestore) btnRestore.addEventListener('click',()=>$('fileRestore').click());

  const fileRestore=$('fileRestore');
  if(fileRestore) fileRestore.addEventListener('change',restaurarBackup);

  // PDF dashboard principal
  const btnPDF=$('btnPDF');
  if(btnPDF) btnPDF.addEventListener('click',generarPDF);

  // PDF overlay — imprimir y cerrar
  const btnPrint=$('btnImprimirPDF');
  if(btnPrint) btnPrint.addEventListener('click',()=>window.print());

  const btnCerrar=$('btnCerrarPDF');
  if(btnCerrar) btnCerrar.addEventListener('click',cerrarPDF);
}

// ─── POSTURA CALC ─────────────────────────────────────────────
function wirePosturaCalc() {
  ['posturaMaple20','posturaMaple30','posturaHuevosSueltos','posturaLote'].forEach(id=>{
    const el=$(id);
    if(el) { el.addEventListener('input',calcPosturaTotal); el.addEventListener('change',calcPosturaTotal); }
  });
}
function calcPosturaTotal() {
  const m20  = parseInt(val('posturaMaple20'))||0;
  const m30  = parseInt(val('posturaMaple30'))||0;
  const suel = parseInt(val('posturaHuevosSueltos'))||0;
  const total= m20*20 + m30*30 + suel;
  setVal('posturaHuevosTotal',total);
  const s20=$('sub20'); if(s20) s20.textContent=`= ${m20*20} huevos`;
  const s30=$('sub30'); if(s30) s30.textContent=`= ${m30*30} huevos`;
  const lote=DB.get(KEYS.lotes).find(l=>l.id===val('posturaLote'));
  const aves=lote?(parseInt(lote.cantidadActual)||0):0;
  setVal('posturaPorc', aves>0&&total>0 ? `${((total/aves)*100).toFixed(1)}%` : aves===0?'— (sin lote)':'0.0%');
}

// ─── FOTO PREVIEWS ────────────────────────────────────────────
function wireFotoPreviews() {
  [['enfermedadFoto','enfermedadFotoPreview'],['notaFoto','notaFotoPreview']].forEach(([inp,prev])=>{
    const el=$(inp);
    if(el) el.addEventListener('change',function(){
      const p=$(prev); if(!p) return;
      if(this.files[0]){ const r=new FileReader(); r.onload=ev=>{p.innerHTML=`<img src="${ev.target.result}">`;};r.readAsDataURL(this.files[0]); }
    });
  });
}

// ─── DASHBOARD ────────────────────────────────────────────────
function populateDashDate() {
  const el=$('dashDate'); if(!el) return;
  el.textContent=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
}
function renderDashboard() { renderKPIs(); renderAlertas(); renderActividad(); }

function renderKPIs() {
  const el=$('kpiGrid'); if(!el) return;
  const lotes=DB.get(KEYS.lotes), mort=DB.get(KEYS.mortandad);
  const vac=DB.get(KEYS.vacunacion), med=DB.get(KEYS.medicacion), post=DB.get(KEYS.postura);
  const ponedoras=lotes.filter(l=>l.etapa==='produccion').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const recrías=lotes.filter(l=>l.etapa==='recria').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const totalBajas=mort.reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const u7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];});
  const hoyHuevos=post.filter(p=>p.fecha===today()).reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const post7=post.filter(p=>u7.includes(p.fecha));
  const pct7=ponedoras>0&&post7.length?((post7.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(ponedoras*7))*100).toFixed(1):null;
  const medAct=med.filter(m=>{ const fin=new Date(m.fecha); fin.setDate(fin.getDate()+(parseInt(m.dias)||0)); return new Date()<=fin; }).length;

  el.innerHTML=`
    <div class="kpi-card" style="--kpi-color:var(--accent);animation-delay:0s">
      <div class="kpi-icon">🐔</div><div class="kpi-value">${(ponedoras+recrías).toLocaleString('es')}</div>
      <div class="kpi-label">Total Aves</div>
      <div class="kpi-delta">🥚 ${ponedoras.toLocaleString('es')} pond. · 🐣 ${recrías.toLocaleString('es')} recría</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--gold);animation-delay:.07s">
      <div class="kpi-icon">🥚</div><div class="kpi-value">${hoyHuevos.toLocaleString('es')}</div>
      <div class="kpi-label">Huevos Hoy</div>
      <div class="kpi-delta">${pct7?`📈 Prom 7d: ${pct7}%`:'Sin postura hoy'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--red);animation-delay:.14s">
      <div class="kpi-icon">💀</div><div class="kpi-value">${totalBajas.toLocaleString('es')}</div>
      <div class="kpi-label">Mortandad Total</div>
      <div class="kpi-delta">${(ponedoras+recrías)>0?((totalBajas/((ponedoras+recrías)+totalBajas))*100).toFixed(2)+'% acum.':'—'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--blue);animation-delay:.21s">
      <div class="kpi-icon">💊</div><div class="kpi-value">${medAct}</div>
      <div class="kpi-label">Tratamientos Activos</div>
      <div class="kpi-delta">${vac.filter(v=>u7.includes(v.fecha)).length} vacuna(s) esta semana</div>
    </div>`;
}

function renderAlertas() {
  const el=$('alertasList'); if(!el) return;
  const lotes=DB.get(KEYS.lotes), vac=DB.get(KEYS.vacunacion);
  const alertas=[];
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  vac.forEach(v=>{
    if(!v.proximaFecha) return;
    const prox=new Date(v.proximaFecha); prox.setHours(0,0,0,0);
    const diff=Math.ceil((prox-hoy)/864e5);
    if(diff>=0&&diff<=7)  alertas.push({icon:'💉',title:`Vacuna próxima: ${v.vacuna}`,text:` — En ${diff} día(s) · ${getLoteNombre(v.loteId)}`});
    if(diff<0&&diff>-3)   alertas.push({icon:'🔴',title:`Vacuna vencida: ${v.vacuna}`,text:` — Hace ${Math.abs(diff)} día(s)`});
  });
  lotes.filter(l=>l.etapa==='recria').forEach(l=>{
    const sem=semanasDesde(l.fecha,l.semanaIngreso);
    if(sem>=17&&sem<20) alertas.push({icon:'🔔',title:`Próximo a postura: ${l.nombre}`,text:` — Sem. ${sem} · ¡Registrá la ruptura!`});
  });
  DB.get(KEYS.mortandad).filter(m=>m.fecha===today()).forEach(m=>{
    if(parseInt(m.cantidad)>=5) alertas.push({icon:'🚨',title:`Alta mortandad: ${m.cantidad} aves hoy`,text:` — ${getLoteNombre(m.loteId)}`});
  });
  DB.get(KEYS.enfermedades).filter(e=>e.estado==='activa').forEach(e=>{
    alertas.push({icon:'🦠',title:`Enfermedad activa: ${e.nombre}`,text:` — ${getLoteNombre(e.loteId)}`});
  });
  el.innerHTML=alertas.length
    ?alertas.map(a=>`<div class="alerta-item"><span class="alerta-icon">${a.icon}</span><span class="alerta-text"><strong>${a.title}</strong>${a.text}</span></div>`).join('')
    :'<p style="color:var(--text3);font-size:.85rem;padding:8px 0">✅ Sin alertas pendientes</p>';
}

function renderActividad() {
  const el=$('actividadList'); if(!el) return;
  const items=[];
  const push=(key,icon,lbl)=>DB.get(key).slice(-5).reverse().forEach(r=>items.push({icon,text:lbl(r),ts:r.createdAt||r.fecha||''}));
  push(KEYS.postura,      '🥚', r=>`Postura: ${r.huevos} huevos — ${getLoteNombre(r.loteId)}`);
  push(KEYS.lotes,        '🐣', r=>`Ingreso: ${r.nombre} (${r.cantidadActual} aves)`);
  push(KEYS.vacunacion,   '💉', r=>`Vacuna: ${r.vacuna} — ${getLoteNombre(r.loteId)}`);
  push(KEYS.mortandad,    '💀', r=>`Mortandad: ${r.cantidad} ave(s) — ${getLoteNombre(r.loteId)}`);
  push(KEYS.alimentacion, '🌾', r=>`Alimento: ${r.kg}kg — ${getLoteNombre(r.loteId)}`);
  push(KEYS.enfermedades, '🦠', r=>`Enfermedad: ${r.nombre} — ${getLoteNombre(r.loteId)}`);
  push(KEYS.notas,        '📷', r=>`Nota de campo — ${getLoteNombre(r.loteId)}`);
  items.sort((a,b)=>b.ts>a.ts?1:-1);
  el.innerHTML=items.length
    ?items.slice(0,10).map(it=>`<div class="actividad-item"><span style="font-size:1rem">${it.icon}</span><span class="actividad-text">${it.text}</span><span class="actividad-time">${fmtDate(it.ts)}</span></div>`).join('')
    :'<p style="color:var(--text3);font-size:.85rem;padding:8px 0">Aún no hay actividad registrada.</p>';
}

// ─── LOTES ────────────────────────────────────────────────────
function saveLote() {
  const id=val('loteId');
  const cantidad=parseInt(val('loteCantidad'))||0;
  const r={id:id||uid(),fecha:val('loteFecha'),nombre:val('loteNombre').trim(),galpon:val('loteGalpon').trim(),cantidadInicial:cantidad,cantidadActual:cantidad,raza:val('loteRaza').trim(),semanaIngreso:parseInt(val('loteSemana'))||0,procedencia:val('loteProcedencia').trim(),etapa:val('loteEtapa'),notas:val('loteNotas').trim(),createdAt:today()};
  if(!r.nombre||!r.cantidadInicial) return showToast('⚠️ Completá nombre y cantidad');
  const lotes=DB.get(KEYS.lotes);
  if(id){const idx=lotes.findIndex(l=>l.id===id);if(idx>-1){r.cantidadActual=lotes[idx].cantidadActual;lotes[idx]=r;}}else lotes.push(r);
  DB.set(KEYS.lotes,lotes); closeModal('modalLote'); renderLote(); renderDashboard();
  showToast('✅ Lote guardado');
}
function renderLote() {
  const el=$('loteList'); if(!el) return;
  const lotes=DB.get(KEYS.lotes);
  if(!lotes.length){el.innerHTML=emptyState('🐣','Sin lotes registrados');return;}
  el.innerHTML=lotes.slice().reverse().map(l=>{
    const sem=semanasDesde(l.fecha,l.semanaIngreso);
    const esR=l.etapa==='recria';
    return `<div class="data-card">
      <div class="data-card-header"><span class="data-card-title">${l.nombre}</span><span class="badge ${esR?'badge-gold':'badge-green'}">${esR?'Recría':'Producción'}</span></div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Galpón</span><span class="val">${l.galpon||'—'}</span></div>
        <div class="data-field"><span class="lbl">Ingreso</span><span class="val">${fmtDate(l.fecha)}</span></div>
        <div class="data-field"><span class="lbl">Aves actuales</span><span class="val">${(parseInt(l.cantidadActual)||0).toLocaleString('es')}</span></div>
        <div class="data-field"><span class="lbl">Semana actual</span><span class="val" style="color:var(--accent)">${sem} sem.</span></div>
        <div class="data-field"><span class="lbl">Raza</span><span class="val">${l.raza||'—'}</span></div>
        <div class="data-field"><span class="lbl">Inicial</span><span class="val">${(parseInt(l.cantidadInicial)||0).toLocaleString('es')}</span></div>
        ${l.fechaRuptura?`<div class="data-field" style="grid-column:span 2"><span class="lbl">🥚 Ruptura</span><span class="val" style="color:var(--gold)">${fmtDate(l.fechaRuptura)} · Sem. ${l.semanaRuptura||'—'}</span></div>`:''}
      </div>
      ${l.notas?`<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${l.notas}</p>`:''}
      <div class="data-card-actions">
        <button class="btn-edit" data-edit-lote="${l.id}">✏️ Editar</button>
        ${esR?`<button class="btn-ruptura-card" data-ruptura="${l.id}">🥚 Ruptura</button>`:''}
        <button class="btn-edit" data-historial="${l.id}" style="color:var(--blue)">📋 Historial</button>
        <button class="btn-delete" data-del-lote="${l.id}">🗑️</button>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('[data-edit-lote]').forEach(b=>b.addEventListener('click',()=>editLote(b.dataset.editLote)));
  el.querySelectorAll('[data-ruptura]').forEach(b=>b.addEventListener('click',()=>abrirRuptura(b.dataset.ruptura)));
  el.querySelectorAll('[data-historial]').forEach(b=>b.addEventListener('click',()=>verHistorial(b.dataset.historial)));
  el.querySelectorAll('[data-del-lote]').forEach(b=>b.addEventListener('click',()=>deleteLote(b.dataset.delLote)));
}
function editLote(id) {
  const l=DB.get(KEYS.lotes).find(x=>x.id===id); if(!l) return;
  setVal('loteId',l.id); setVal('loteFecha',l.fecha); setVal('loteNombre',l.nombre);
  setVal('loteGalpon',l.galpon||''); setVal('loteCantidad',l.cantidadActual);
  setVal('loteRaza',l.raza||''); setVal('loteSemana',l.semanaIngreso||'');
  setVal('loteProcedencia',l.procedencia||''); setVal('loteEtapa',l.etapa); setVal('loteNotas',l.notas||'');
  openModal('modalLote');
}
function deleteLote(id) {
  if(!confirm('¿Eliminar este lote?')) return;
  DB.set(KEYS.lotes,DB.get(KEYS.lotes).filter(l=>l.id!==id));
  renderLote(); renderDashboard(); showToast('🗑️ Lote eliminado');
}
function verHistorial(id) {
  navigateTo('historial');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  setTimeout(()=>{ const sel=$('historialLoteSelect'); if(sel){sel.value=id;renderHistorial(id);} },80);
}

// ─── RUPTURA ─────────────────────────────────────────────────
function abrirRuptura(loteId) {
  const lote=DB.get(KEYS.lotes).find(l=>l.id===loteId); if(!lote) return;
  setVal('rupturaLoteId',loteId); setVal('rupturaFecha',today());
  const sem=semanasDesde(lote.fecha,lote.semanaIngreso); setVal('rupturaSemana',sem);
  $('rupturaInfo').innerHTML=`<div class="ruptura-card-info"><span class="ruptura-card-icon">🐣</span><div><strong>${lote.nombre}</strong><span>${lote.galpon||'Sin galpón'} · ${(parseInt(lote.cantidadActual)||0).toLocaleString('es')} aves · Sem. ${sem}</span></div></div>`;
  openModal('modalRuptura');
}
function saveRuptura() {
  const loteId=val('rupturaLoteId'), fecha=val('rupturaFecha');
  const semana=val('rupturaSemana'), pct=val('rupturaPctInicial'), notas=val('rupturaNotas').trim();
  if(!fecha) return showToast('⚠️ Ingresá la fecha');
  const lotes=DB.get(KEYS.lotes); const idx=lotes.findIndex(l=>l.id===loteId);
  if(idx>-1){Object.assign(lotes[idx],{etapa:'produccion',fechaRuptura:fecha,semanaRuptura:semana,pctRuptura:pct,notasRuptura:notas});DB.set(KEYS.lotes,lotes);}
  if(pct){
    const aves=parseInt(lotes[idx]?.cantidadActual)||0;
    const huevos=aves>0?Math.round(aves*(parseFloat(pct)/100)):0;
    const lista=DB.get(KEYS.postura);
    lista.push({id:uid(),fecha,loteId,huevos,maple20:0,maple30:0,sueltos:huevos,rotos:0,notas:`Ruptura de postura (${pct}%)${notas?'. '+notas:''}`,createdAt:today()});
    DB.set(KEYS.postura,lista);
  }
  closeModal('modalRuptura'); renderLote(); renderPostura(); renderDashboard();
  showToast('✅ Ruptura registrada — Lote en Producción');
}

// ─── POSTURA ─────────────────────────────────────────────────
function savePostura() {
  const id=val('posturaId');
  const m20=parseInt(val('posturaMaple20'))||0;
  const m30=parseInt(val('posturaMaple30'))||0;
  const suel=parseInt(val('posturaHuevosSueltos'))||0;
  const total=m20*20+m30*30+suel;
  const r={id:id||uid(),fecha:val('posturaFecha'),loteId:val('posturaLote'),huevos:total,maple20:m20,maple30:m30,sueltos:suel,rotos:parseInt(val('posturaRotos'))||0,notas:val('posturaNotas').trim(),createdAt:today()};
  if(!r.loteId) return showToast('⚠️ Seleccioná un lote');
  const list=DB.get(KEYS.postura);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.postura,list); closeModal('modalPostura'); renderPostura(); renderDashboard();
  showToast('✅ Postura registrada');
}
function renderPostura() {
  const el=$('posturaList'); if(!el) return;
  const mes=val('filtroPosturaMes')||'';
  let list=DB.get(KEYS.postura);
  if(mes) list=list.filter(p=>p.fecha&&p.fecha.startsWith(mes));
  list=list.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=emptyState('🥚','Sin registros de postura');return;}
  el.innerHTML=list.map(p=>{
    const lote=DB.get(KEYS.lotes).find(l=>l.id===p.loteId);
    const aves=lote?(parseInt(lote.cantidadActual)||0):0;
    const pct=aves>0?((p.huevos/aves)*100).toFixed(1):null;
    const pN=pct?parseFloat(pct):0;
    const col=pN>=80?'var(--accent)':pN>=60?'var(--gold)':'var(--red)';
    const desglose=p.maple20||p.maple30
      ?`<div class="data-field" style="grid-column:span 2"><span class="lbl">Desglose</span><span class="val">${p.maple20?p.maple20+'×20 ':''}${p.maple30?p.maple30+'×30 ':''}${p.sueltos?p.sueltos+' sueltos':''}</span></div>`:'' ;
    return `<div class="data-card">
      <div class="data-card-header"><span class="data-card-title">${getLoteNombre(p.loteId)}</span><span class="data-card-date">${fmtDate(p.fecha)}</span></div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Total huevos</span><span class="val" style="color:var(--gold)">${p.huevos.toLocaleString('es')}</span></div>
        <div class="data-field"><span class="lbl">Rotos</span><span class="val">${p.rotos}</span></div>
        <div class="data-field"><span class="lbl">% Postura</span><span class="val" style="color:${col}">${pct?pct+'%':'—'}</span></div>
        <div class="data-field"><span class="lbl">Netos</span><span class="val">${(p.huevos-p.rotos).toLocaleString('es')}</span></div>
        ${desglose}
      </div>
      ${pct?`<div class="postura-bar-wrap"><div class="postura-bar-fill" style="width:${Math.min(pN,100)}%;background:${col}"></div></div>`:''}
      ${p.notas?`<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${p.notas}</p>`:''}
      <div class="data-card-actions">
        <button class="btn-edit" data-edit-pos="${p.id}">✏️</button>
        <button class="btn-delete" data-del-pos="${p.id}">🗑️</button>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('[data-edit-pos]').forEach(b=>b.addEventListener('click',()=>editPostura(b.dataset.editPos)));
  el.querySelectorAll('[data-del-pos]').forEach(b=>b.addEventListener('click',()=>deleteRecord(KEYS.postura,b.dataset.delPos,renderPostura)));
}
function editPostura(id) {
  const p=DB.get(KEYS.postura).find(x=>x.id===id); if(!p) return;
  fillLoteSelect('posturaLote');
  setVal('posturaId',p.id); setVal('posturaFecha',p.fecha); setVal('posturaLote',p.loteId);
  setVal('posturaMaple20',p.maple20||0); setVal('posturaMaple30',p.maple30||0);
  setVal('posturaHuevosSueltos',p.sueltos||0); setVal('posturaRotos',p.rotos||0); setVal('posturaNotas',p.notas||'');
  openModal('modalPostura'); calcPosturaTotal();
}

// ─── ALIMENTACIÓN ─────────────────────────────────────────────
function saveAlimentacion() {
  const id=val('alimentacionId');
  const r={id:id||uid(),fecha:val('alimentacionFecha'),loteId:val('alimentacionLote'),tipo:val('alimentacionTipo').trim(),kg:parseFloat(val('alimentacionKg'))||0,grAve:parseFloat(val('alimentacionGrAve'))||0,proveedor:val('alimentacionProveedor').trim(),costo:parseFloat(val('alimentacionCosto'))||0,notas:val('alimentacionNotas').trim(),createdAt:today()};
  if(!r.loteId) return showToast('⚠️ Seleccioná un lote');
  const list=DB.get(KEYS.alimentacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.alimentacion,list); closeModal('modalAlimentacion'); renderAlimentacion();
  showToast('✅ Alimento registrado');
}
function renderAlimentacion() {
  const el=$('alimentacionList'); if(!el) return;
  const list=DB.get(KEYS.alimentacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=emptyState('🌾','Sin registros de alimento');return;}
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title">${r.tipo||'Alimento'}</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
      <div class="data-field"><span class="lbl">Cantidad</span><span class="val">${r.kg} kg</span></div>
      <div class="data-field"><span class="lbl">g/ave/día</span><span class="val">${r.grAve||'—'}</span></div>
      <div class="data-field"><span class="lbl">Costo</span><span class="val">${r.costo?'$'+r.costo.toLocaleString('es'):'—'}</span></div>
      <div class="data-field"><span class="lbl">Proveedor</span><span class="val">${r.proveedor||'—'}</span></div>
    </div>
    <div class="data-card-actions">
      <button class="btn-edit" data-edit-alim="${r.id}">✏️</button>
      <button class="btn-delete" data-del-alim="${r.id}">🗑️</button>
    </div></div>`).join('');
  el.querySelectorAll('[data-edit-alim]').forEach(b=>b.addEventListener('click',()=>editAlimentacion(b.dataset.editAlim)));
  el.querySelectorAll('[data-del-alim]').forEach(b=>b.addEventListener('click',()=>deleteRecord(KEYS.alimentacion,b.dataset.delAlim,renderAlimentacion)));
}
function editAlimentacion(id) {
  const r=DB.get(KEYS.alimentacion).find(x=>x.id===id); if(!r) return;
  fillLoteSelect('alimentacionLote');
  const map={alimentacionId:r.id,alimentacionFecha:r.fecha,alimentacionLote:r.loteId,alimentacionTipo:r.tipo,alimentacionKg:r.kg,alimentacionGrAve:r.grAve,alimentacionProveedor:r.proveedor,alimentacionCosto:r.costo,alimentacionNotas:r.notas};
  Object.entries(map).forEach(([k,v])=>{const el=$(k);if(el)el.value=v??'';});
  openModal('modalAlimentacion');
}

// ─── VACUNACIÓN ───────────────────────────────────────────────
function saveVacunacion() {
  const id=val('vacunacionId');
  const r={id:id||uid(),fecha:val('vacunacionFecha'),loteId:val('vacunacionLote'),vacuna:val('vacunaNombre').trim(),via:val('vacunaVia'),dosis:val('vacunaDosis').trim(),aplicador:val('vacunaAplicador').trim(),proximaFecha:val('vacunaProxima'),notas:val('vacunaNotas').trim(),createdAt:today()};
  if(!r.loteId||!r.vacuna) return showToast('⚠️ Completá lote y vacuna');
  const list=DB.get(KEYS.vacunacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.vacunacion,list); closeModal('modalVacunacion'); renderVacunacion(); renderDashboard();
  showToast('✅ Vacunación registrada');
}
function renderVacunacion() {
  const el=$('vacunacionList'); if(!el) return;
  const list=DB.get(KEYS.vacunacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=emptyState('💉','Sin registros');return;}
  const vias={agua:'Agua',ocular:'Ocular',nasal:'Nasal',inyectable:'Inyectable',spray:'Spray',ala:'Punción alar'};
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
      <button class="btn-edit" data-edit-vac="${r.id}">✏️</button>
      <button class="btn-delete" data-del-vac="${r.id}">🗑️</button>
    </div></div>`).join('');
  el.querySelectorAll('[data-edit-vac]').forEach(b=>b.addEventListener('click',()=>editVacunacion(b.dataset.editVac)));
  el.querySelectorAll('[data-del-vac]').forEach(b=>b.addEventListener('click',()=>deleteRecord(KEYS.vacunacion,b.dataset.delVac,renderVacunacion)));
}
function editVacunacion(id) {
  const r=DB.get(KEYS.vacunacion).find(x=>x.id===id); if(!r) return;
  fillLoteSelect('vacunacionLote');
  const map={vacunacionId:r.id,vacunacionFecha:r.fecha,vacunacionLote:r.loteId,vacunaNombre:r.vacuna,vacunaVia:r.via,vacunaDosis:r.dosis,vacunaAplicador:r.aplicador,vacunaProxima:r.proximaFecha||'',vacunaNotas:r.notas};
  Object.entries(map).forEach(([k,v])=>{const el=$(k);if(el)el.value=v??'';});
  openModal('modalVacunacion');
}

// ─── MEDICACIÓN ───────────────────────────────────────────────
function saveMedicacion() {
  const id=val('medicacionId');
  const r={id:id||uid(),fecha:val('medicacionFecha'),loteId:val('medicacionLote'),nombre:val('medicamentoNombre').trim(),motivo:val('medicamentoMotivo').trim(),dosis:val('medicamentoDosis').trim(),dias:val('medicamentoDias'),vet:val('medicamentoVet').trim(),notas:val('medicamentoNotas').trim(),createdAt:today()};
  if(!r.loteId||!r.nombre) return showToast('⚠️ Completá lote y medicamento');
  const list=DB.get(KEYS.medicacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.medicacion,list); closeModal('modalMedicacion'); renderMedicacion(); renderDashboard();
  showToast('✅ Medicación registrada');
}
function renderMedicacion() {
  const el=$('medicacionList'); if(!el) return;
  const list=DB.get(KEYS.medicacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=emptyState('💊','Sin registros');return;}
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
      <button class="btn-edit" data-edit-med="${r.id}">✏️</button>
      <button class="btn-delete" data-del-med="${r.id}">🗑️</button>
    </div></div>`).join('');
  el.querySelectorAll('[data-edit-med]').forEach(b=>b.addEventListener('click',()=>editMedicacion(b.dataset.editMed)));
  el.querySelectorAll('[data-del-med]').forEach(b=>b.addEventListener('click',()=>deleteRecord(KEYS.medicacion,b.dataset.delMed,renderMedicacion)));
}
function editMedicacion(id) {
  const r=DB.get(KEYS.medicacion).find(x=>x.id===id); if(!r) return;
  fillLoteSelect('medicacionLote');
  const map={medicacionId:r.id,medicacionFecha:r.fecha,medicacionLote:r.loteId,medicamentoNombre:r.nombre,medicamentoMotivo:r.motivo,medicamentoDosis:r.dosis,medicamentoDias:r.dias,medicamentoVet:r.vet,medicamentoNotas:r.notas};
  Object.entries(map).forEach(([k,v])=>{const el=$(k);if(el)el.value=v??'';});
  openModal('modalMedicacion');
}

// ─── MORTANDAD ────────────────────────────────────────────────
function saveMortandad() {
  const id=val('mortandadId');
  const r={id:id||uid(),fecha:val('mortandadFecha'),loteId:val('mortandadLote'),cantidad:parseInt(val('mortandadCantidad'))||0,causa:val('mortandadCausa'),desc:val('mortandadDesc').trim(),necropsia:val('mortandadNecropsia'),createdAt:today()};
  if(!r.loteId) return showToast('⚠️ Seleccioná un lote');
  if(!r.cantidad) return showToast('⚠️ Ingresá cantidad');
  if(!id){const lotes=DB.get(KEYS.lotes);const idx=lotes.findIndex(l=>l.id===r.loteId);if(idx>-1){lotes[idx].cantidadActual=Math.max(0,(parseInt(lotes[idx].cantidadActual)||0)-r.cantidad);DB.set(KEYS.lotes,lotes);}}
  const list=DB.get(KEYS.mortandad);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.mortandad,list); closeModal('modalMortandad'); renderMortandad(); renderDashboard();
  showToast('✅ Mortandad registrada');
}
function renderMortandad() {
  const el=$('mortandadList'); if(!el) return;
  const list=DB.get(KEYS.mortandad).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=emptyState('📋','Sin registros');return;}
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title" style="color:var(--red)">🪦 ${r.cantidad} ave(s)</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Lote</span><span class="val">${getLoteNombre(r.loteId)}</span></div>
      <div class="data-field"><span class="lbl">Causa</span><span class="val">${causas[r.causa]||r.causa}</span></div>
      <div class="data-field"><span class="lbl">Necropsia</span><span class="val">${r.necropsia==='si'?'✅ Sí':r.necropsia==='pendiente'?'⏳ Pend.':'❌ No'}</span></div>
    </div>
    ${r.desc?`<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${r.desc}</p>`:''}
    <div class="data-card-actions">
      <button class="btn-edit" data-edit-mort="${r.id}">✏️</button>
      <button class="btn-delete" data-del-mort="${r.id}">🗑️</button>
    </div></div>`).join('');
  el.querySelectorAll('[data-edit-mort]').forEach(b=>b.addEventListener('click',()=>editMortandad(b.dataset.editMort)));
  el.querySelectorAll('[data-del-mort]').forEach(b=>b.addEventListener('click',()=>deleteRecord(KEYS.mortandad,b.dataset.delMort,renderMortandad)));
}
function editMortandad(id) {
  const r=DB.get(KEYS.mortandad).find(x=>x.id===id); if(!r) return;
  fillLoteSelect('mortandadLote');
  const map={mortandadId:r.id,mortandadFecha:r.fecha,mortandadLote:r.loteId,mortandadCantidad:r.cantidad,mortandadCausa:r.causa,mortandadDesc:r.desc,mortandadNecropsia:r.necropsia};
  Object.entries(map).forEach(([k,v])=>{const el=$(k);if(el)el.value=v??'';});
  openModal('modalMortandad');
}

// ─── ENFERMEDADES ─────────────────────────────────────────────
function saveEnfermedad() {
  const id=val('enfermedadId');
  const archivo=$('enfermedadFoto').files[0];
  const guardar=fotoB64=>{
    const r={id:id||uid(),fecha:val('enfermedadFecha'),loteId:val('enfermedadLote'),nombre:val('enfermedadNombre').trim(),sintomas:val('enfermedadSintomas').trim(),afectadas:parseInt(val('enfermedadAfectadas'))||0,vet:val('enfermedadVet').trim(),tratamiento:val('enfermedadTratamiento').trim(),estado:val('enfermedadEstado'),fechaCierre:val('enfermedadCierre'),notas:val('enfermedadNotas').trim(),foto:fotoB64||(id?(DB.get(KEYS.enfermedades).find(x=>x.id===id)||{}).foto:null),createdAt:today()};
    if(!r.loteId||!r.nombre) return showToast('⚠️ Completá lote y nombre');
    const list=DB.get(KEYS.enfermedades);
    if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
    DB.set(KEYS.enfermedades,list); closeModal('modalEnfermedad'); renderEnfermedades(); renderDashboard();
    showToast('✅ Enfermedad registrada');
  };
  if(archivo){const rd=new FileReader();rd.onload=ev=>guardar(ev.target.result);rd.readAsDataURL(archivo);}
  else guardar(null);
}
function renderEnfermedades() {
  const el=$('enfermedadList'); if(!el) return;
  const list=DB.get(KEYS.enfermedades).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=emptyState('🦠','Sin registros');return;}
  el.innerHTML=list.map(r=>{
    const badge=r.estado==='activa'?'<span class="badge badge-red">Activa</span>':r.estado==='controlada'?'<span class="badge badge-gold">Controlada</span>':'<span class="badge badge-green">Resuelta</span>';
    return `<div class="data-card">
      <div class="data-card-header"><span class="data-card-title">🦠 ${r.nombre}</span>${badge}</div>
      ${r.foto?`<img src="${r.foto}" style="width:100%;border-radius:8px;margin:8px 0;max-height:180px;object-fit:cover">`:''}
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
        <button class="btn-edit" data-edit-enf="${r.id}">✏️ Editar</button>
        <button class="btn-delete" data-del-enf="${r.id}">🗑️</button>
      </div></div>`;
  }).join('');
  el.querySelectorAll('[data-edit-enf]').forEach(b=>b.addEventListener('click',()=>editEnfermedad(b.dataset.editEnf)));
  el.querySelectorAll('[data-del-enf]').forEach(b=>b.addEventListener('click',()=>deleteRecord(KEYS.enfermedades,b.dataset.delEnf,renderEnfermedades)));
}
function editEnfermedad(id) {
  const r=DB.get(KEYS.enfermedades).find(x=>x.id===id); if(!r) return;
  fillLoteSelect('enfermedadLote');
  const map={enfermedadId:r.id,enfermedadFecha:r.fecha,enfermedadLote:r.loteId,enfermedadNombre:r.nombre,enfermedadSintomas:r.sintomas,enfermedadAfectadas:r.afectadas,enfermedadVet:r.vet,enfermedadTratamiento:r.tratamiento,enfermedadEstado:r.estado,enfermedadCierre:r.fechaCierre||'',enfermedadNotas:r.notas};
  Object.entries(map).forEach(([k,v])=>{const el=$(k);if(el)el.value=v??'';});
  if(r.foto) $('enfermedadFotoPreview').innerHTML=`<img src="${r.foto}">`;
  openModal('modalEnfermedad');
}

// ─── NOTAS ────────────────────────────────────────────────────
function saveNota() {
  const id=val('notaId');
  const archivo=$('notaFoto').files[0];
  const guardar=fotoB64=>{
    const r={id:id||uid(),fecha:val('notaFecha'),loteId:val('notaLote'),texto:val('notaTexto').trim(),foto:fotoB64||(id?(DB.get(KEYS.notas).find(x=>x.id===id)||{}).foto:null),createdAt:today()};
    if(!r.loteId) return showToast('⚠️ Seleccioná un lote');
    const list=DB.get(KEYS.notas);
    if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
    DB.set(KEYS.notas,list); closeModal('modalNota'); renderNotas(); showToast('✅ Nota guardada');
  };
  if(archivo){const rd=new FileReader();rd.onload=ev=>guardar(ev.target.result);rd.readAsDataURL(archivo);}
  else guardar(null);
}
function renderNotas() {
  const el=$('notasList'); if(!el) return;
  const list=DB.get(KEYS.notas).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=emptyState('📷','Sin notas de campo');return;}
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title">📷 ${getLoteNombre(r.loteId)}</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    ${r.foto?`<img src="${r.foto}" style="width:100%;border-radius:8px;margin:8px 0;max-height:200px;object-fit:cover">`:''}
    ${r.texto?`<p style="color:var(--text2);font-size:.88rem;margin-top:4px">${r.texto}</p>`:''}
    <div class="data-card-actions"><button class="btn-delete" data-del-nota="${r.id}">🗑️</button></div>
  </div>`).join('');
  el.querySelectorAll('[data-del-nota]').forEach(b=>b.addEventListener('click',()=>deleteRecord(KEYS.notas,b.dataset.delNota,renderNotas)));
}

// ─── FÓRMULAS ─────────────────────────────────────────────────
const ETAPA_NOMBRES={recria_inicial:'Recría inicial (1–8 sem.)',recria_media:'Recría media (8–14 sem.)',recria_final:'Recría final (14–18 sem.)',produccion_inicio:'Producción inicio (18–30 sem.)',produccion_pico:'Producción pico (30–50 sem.)',produccion_baja:'Producción baja (50+ sem.)',otra:'Otra'};

function saveFormula() {
  const id=val('formulaId');
  const r={id:id||uid(),nombre:val('formulaNombre').trim(),etapa:val('formulaEtapa'),grAve:parseFloat(val('formulaGrAve'))||0,ingredientes:val('formulaIngredientes').trim(),proteina:val('formulaProteina'),energia:val('formulaEnergia'),calcio:val('formulaCalcio'),proveedor:val('formulaProveedor').trim(),notas:val('formulaNotas').trim(),createdAt:today()};
  if(!r.nombre) return showToast('⚠️ Ingresá el nombre');
  const list=DB.get(KEYS.formulas);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.formulas,list); closeModal('modalFormula'); renderFormulas(); showToast('✅ Fórmula guardada');
}
function renderFormulas() {
  const el=$('formulasList'); if(!el) return;
  const list=DB.get(KEYS.formulas).slice().sort((a,b)=>a.etapa.localeCompare(b.etapa));
  if(!list.length){
    el.innerHTML=`<div class="formulas-empty"><div class="empty-icon">🌾</div><p>Sin fórmulas guardadas.</p><p style="font-size:.82rem;margin-top:6px;color:var(--text3)">Guardá las recetas de balanceado por etapa para que los encargados tengan la guía a mano.</p></div>`;
    return;
  }
  el.innerHTML=list.map(r=>`<div class="data-card formula-card">
    <div class="data-card-header"><span class="data-card-title">🌾 ${r.nombre}</span><span class="badge badge-gold">${ETAPA_NOMBRES[r.etapa]||r.etapa}</span></div>
    <div class="formula-nutrientes">
      ${r.grAve?`<span class="formula-nutriente"><span class="fn-val">${r.grAve}g</span><span class="fn-lbl">g/ave/día</span></span>`:''}
      ${r.proteina?`<span class="formula-nutriente"><span class="fn-val">${r.proteina}%</span><span class="fn-lbl">Proteína</span></span>`:''}
      ${r.energia?`<span class="formula-nutriente"><span class="fn-val">${r.energia}</span><span class="fn-lbl">kcal/kg</span></span>`:''}
      ${r.calcio?`<span class="formula-nutriente"><span class="fn-val">${r.calcio}%</span><span class="fn-lbl">Calcio</span></span>`:''}
    </div>
    ${r.ingredientes?`<div class="formula-ingredientes"><pre>${r.ingredientes}</pre></div>`:''}
    ${r.proveedor?`<p style="color:var(--text3);font-size:.8rem;margin-top:6px">🏪 ${r.proveedor}</p>`:''}
    ${r.notas?`<p style="color:var(--text3);font-size:.82rem;margin-top:4px">${r.notas}</p>`:''}
    <div class="data-card-actions">
      <button class="btn-edit" data-edit-formula="${r.id}">✏️ Editar</button>
      <button class="btn-delete" data-del-formula="${r.id}">🗑️</button>
    </div></div>`).join('');
  el.querySelectorAll('[data-edit-formula]').forEach(b=>b.addEventListener('click',()=>editFormula(b.dataset.editFormula)));
  el.querySelectorAll('[data-del-formula]').forEach(b=>b.addEventListener('click',()=>deleteRecord(KEYS.formulas,b.dataset.delFormula,renderFormulas)));
}
function editFormula(id) {
  const r=DB.get(KEYS.formulas).find(x=>x.id===id); if(!r) return;
  const map={formulaId:r.id,formulaNombre:r.nombre,formulaEtapa:r.etapa,formulaGrAve:r.grAve,formulaIngredientes:r.ingredientes,formulaProteina:r.proteina,formulaEnergia:r.energia,formulaCalcio:r.calcio,formulaProveedor:r.proveedor,formulaNotas:r.notas};
  Object.entries(map).forEach(([k,v])=>{const el=$(k);if(el)el.value=v??'';});
  openModal('modalFormula');
}

// ─── HISTORIAL POR LOTE ───────────────────────────────────────
function renderHistorialSelector() {
  const lotes=DB.get(KEYS.lotes);
  const sel=$('historialLoteSelect'); if(!sel) return;
  sel.innerHTML=lotes.length?lotes.map(l=>`<option value="${l.id}">${l.nombre} — ${l.galpon||'Sin galpón'}</option>`).join(''):'<option>—</option>';
  if(lotes.length) renderHistorial(lotes[0].id);
}
window.onHistorialChange=function(){const id=val('historialLoteSelect');if(id)renderHistorial(id);};

function renderHistorial(loteId) {
  const lote=DB.get(KEYS.lotes).find(l=>l.id===loteId); if(!lote) return;
  const sem=semanasDesde(lote.fecha,lote.semanaIngreso);
  const posturas=DB.get(KEYS.postura).filter(p=>p.loteId===loteId);
  const totalH=posturas.reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const totalM=DB.get(KEYS.mortandad).filter(m=>m.loteId===loteId).reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const res=$('historialResumen'); if(!res) return;
  res.innerHTML=`<div class="data-card" style="margin-bottom:14px">
    <div class="data-card-header"><span class="data-card-title">${lote.nombre}</span><span class="badge ${lote.etapa==='produccion'?'badge-green':'badge-gold'}">${lote.etapa==='produccion'?'Producción':'Recría'}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Galpón</span><span class="val">${lote.galpon||'—'}</span></div>
      <div class="data-field"><span class="lbl">Ingreso</span><span class="val">${fmtDate(lote.fecha)}</span></div>
      <div class="data-field"><span class="lbl">Semana actual</span><span class="val" style="color:var(--accent)">${sem} sem.</span></div>
      <div class="data-field"><span class="lbl">Aves actuales</span><span class="val">${(parseInt(lote.cantidadActual)||0).toLocaleString('es')}</span></div>
      <div class="data-field"><span class="lbl">Total huevos</span><span class="val" style="color:var(--gold)">${totalH.toLocaleString('es')}</span></div>
      <div class="data-field"><span class="lbl">Mortandad</span><span class="val" style="color:var(--red)">${totalM} aves</span></div>
      ${lote.fechaRuptura?`<div class="data-field" style="grid-column:span 2"><span class="lbl">🥚 Ruptura</span><span class="val" style="color:var(--gold)">${fmtDate(lote.fechaRuptura)} · Sem. ${lote.semanaRuptura}</span></div>`:''}
    </div>
    <div class="data-card-actions">
      <button class="btn-pdf-lote" data-pdf-lote="${loteId}">📄 PDF de este Lote</button>
    </div>
  </div>`;
  res.querySelector('[data-pdf-lote]').addEventListener('click',()=>generarPDFLote(loteId));

  const eventos=[];
  const add=(key,icon,lbl)=>DB.get(key).filter(r=>r.loteId===loteId).forEach(r=>eventos.push({icon,text:lbl(r),fecha:r.fecha||r.createdAt||''}));
  add(KEYS.postura,      '🥚', r=>`Postura: ${r.huevos} huevos${r.maple20||r.maple30?` (${r.maple20||0}×20 + ${r.maple30||0}×30)`:''}`);
  add(KEYS.mortandad,    '💀', r=>`Mortandad: ${r.cantidad} ave(s) — ${r.causa||''}`);
  add(KEYS.vacunacion,   '💉', r=>`Vacuna: ${r.vacuna}`);
  add(KEYS.medicacion,   '💊', r=>`Medicación: ${r.nombre} — ${r.motivo||''}`);
  add(KEYS.alimentacion, '🌾', r=>`Alimento: ${r.kg}kg ${r.tipo||''}`);
  add(KEYS.enfermedades, '🦠', r=>`Enfermedad: ${r.nombre} [${r.estado}]`);
  add(KEYS.notas,        '📷', r=>`Nota: ${r.texto||'(sin texto)'}`);
  eventos.sort((a,b)=>b.fecha>a.fecha?1:-1);
  const evEl=$('historialEventos'); if(!evEl) return;
  evEl.innerHTML=eventos.length
    ?eventos.map(ev=>`<div class="actividad-item"><span style="font-size:1rem">${ev.icon}</span><span class="actividad-text">${ev.text}</span><span class="actividad-time">${fmtDate(ev.fecha)}</span></div>`).join('')
    :'<p style="color:var(--text3);font-size:.85rem;padding:16px 0">Sin eventos para este lote.</p>';
}

// ─── GALPONES VIEW ────────────────────────────────────────────
function buildGalponesData() {
  const lotes=DB.get(KEYS.lotes), post=DB.get(KEYS.postura), med=DB.get(KEYS.medicacion);
  const galpones={};
  lotes.forEach(l=>{
    const g=l.galpon||'Sin galpón';
    if(!galpones[g]) galpones[g]={nombre:g,ponedoras:0,recrías:0,lotes:[],huevosHoy:0,pct:null,pct7:null,medActivos:0};
    const a=parseInt(l.cantidadActual)||0;
    l.etapa==='produccion'?galpones[g].ponedoras+=a:galpones[g].recrías+=a;
    galpones[g].lotes.push(l);
  });
  const hoy=today();
  const u7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];});
  Object.values(galpones).forEach(g=>{
    const ids=g.lotes.map(l=>l.id);
    const hp=post.filter(p=>p.fecha===hoy&&ids.includes(p.loteId));
    g.huevosHoy=hp.reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
    g.pct=g.ponedoras>0&&g.huevosHoy>0?((g.huevosHoy/g.ponedoras)*100).toFixed(1):null;
    const post7=post.filter(p=>u7.includes(p.fecha)&&ids.includes(p.loteId));
    g.pct7=g.ponedoras>0&&post7.length?((post7.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(g.ponedoras*7))*100).toFixed(1):null;
    g.medActivos=med.filter(m=>{ if(!ids.includes(m.loteId)) return false; const fin=new Date(m.fecha);fin.setDate(fin.getDate()+(parseInt(m.dias)||0));return new Date()<=fin; }).length;
  });
  return Object.values(galpones);
}

function renderGalpones() {
  const el=$('galponCards'); if(!el) return;
  const list=buildGalponesData();
  if(!list.length){el.innerHTML=emptyState('🏚️','Sin galpones. Registrá lotes con galpón asignado.');return;}
  el.innerHTML=list.map(g=>{
    const pN=g.pct?parseFloat(g.pct):0;
    const bc=pN>=80?'var(--accent)':pN>=60?'var(--gold)':'var(--red)';
    return `<div class="galpon-card-full">
      <div class="galpon-card-header">
        <div class="galpon-card-title">
          <span class="galpon-icon-big">🏚️</span>
          <div>
            <div class="galpon-nombre-big">${g.nombre}</div>
            <div class="galpon-sub">${g.lotes.length} lote(s) · ${(g.ponedoras+g.recrías).toLocaleString('es')} aves</div>
          </div>
        </div>
        <button class="btn-pdf-galpon" data-pdf-galpon="${g.nombre}">📄 PDF</button>
      </div>
      <div class="galpon-stats-full">
        <div class="galpon-stat-big"><span class="gsb-val" style="color:var(--accent)">${g.ponedoras.toLocaleString('es')}</span><span class="gsb-lbl">🥚 Ponedoras</span></div>
        <div class="galpon-stat-big"><span class="gsb-val" style="color:var(--gold)">${g.recrías.toLocaleString('es')}</span><span class="gsb-lbl">🐣 Recría</span></div>
        <div class="galpon-stat-big"><span class="gsb-val" style="color:var(--gold)">${g.huevosHoy.toLocaleString('es')}</span><span class="gsb-lbl">Huevos hoy</span></div>
        <div class="galpon-stat-big"><span class="gsb-val" style="color:${bc}">${g.pct?g.pct+'%':'—'}</span><span class="gsb-lbl">% Postura hoy</span></div>
        <div class="galpon-stat-big"><span class="gsb-val" style="color:${bc}">${g.pct7?g.pct7+'%':'—'}</span><span class="gsb-lbl">% Postura 7d</span></div>
        <div class="galpon-stat-big"><span class="gsb-val" style="color:var(--blue)">${g.medActivos}</span><span class="gsb-lbl">💊 Trat. activos</span></div>
      </div>
      ${g.pct?`<div class="postura-bar-wrap" style="margin-top:10px"><div class="postura-bar-fill" style="width:${Math.min(pN,100)}%;background:${bc}"></div></div>`:''}
      <div class="galpon-lotes-list">
        ${g.lotes.map(l=>`<div class="galpon-lote-row">
          <span class="badge ${l.etapa==='produccion'?'badge-green':'badge-gold'}">${l.etapa==='produccion'?'Prod.':'Recría'}</span>
          <span style="font-weight:600;font-size:.88rem">${l.nombre}</span>
          <span style="color:var(--text3);font-size:.82rem">${(parseInt(l.cantidadActual)||0).toLocaleString('es')} aves · Sem. ${semanasDesde(l.fecha,l.semanaIngreso)}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('[data-pdf-galpon]').forEach(btn=>{
    btn.addEventListener('click',()=>generarPDFGalpon(btn.dataset.pdfGalpon));
  });
}

// ─── EXPORTS CSV ─────────────────────────────────────────────
function exportarCSV(key,nombre) {
  const list=DB.get(key); if(!list.length) return showToast('⚠️ Sin datos');
  const lotes=DB.get(KEYS.lotes);
  const rows=list.map(r=>({...r,loteNombre:lotes.find(x=>x.id===r.loteId)?.nombre||''}));
  const cols=Object.keys(rows[0]);
  const csv=[cols.join(','),...rows.map(r=>cols.map(c=>`"${String(r[c]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download=`hinse-${nombre}-${today()}.csv`; a.click();
  showToast('📊 CSV exportado');
}

// ─── EXCEL BACKUP ─────────────────────────────────────────────
function exportarExcel() {
  const lotes=DB.get(KEYS.lotes);
  const getLote=id=>lotes.find(x=>x.id===id)?.nombre||'';
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const hS='background:#a86828;color:#fff;font-weight:bold;padding:6px 10px;border:1px solid #c8853a;';
  const rS=i=>i%2===0?'background:#fdf4e8;':'background:#fff8f0;';
  const cS='padding:5px 10px;border:1px solid #e8d0a8;';
  const makeTable=(title,headers,rows)=>{
    const head=headers.map(h=>`<th style="${hS}">${esc(h)}</th>`).join('');
    const body=rows.map((row,i)=>`<tr style="${rS(i)}">${row.map(c=>`<td style="${cS}">${esc(c)}</td>`).join('')}</tr>`).join('');
    return `<h2 style="font-family:Georgia,serif;color:#6b3e1e;border-bottom:3px solid #c8853a;padding-bottom:6px;margin:24px 0 10px">${title}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:30px"><thead><tr>${head}</tr></thead><tbody>${body||`<tr><td colspan="${headers.length}" style="${cS}color:#aaa;font-style:italic">Sin datos</td></tr>`}</tbody></table>`;
  };
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};
  const vias={agua:'Agua de bebida',ocular:'Ocular',nasal:'Nasal',inyectable:'Inyectable',spray:'Spray',ala:'Punción alar'};
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;margin:30px;color:#2a1a0a;background:#fffdf8;}
  .cover{background:linear-gradient(135deg,#6b3e1e,#a86828,#d4a043);color:#fff;padding:30px;border-radius:12px;margin-bottom:30px;text-align:center;}
  .cover h1{font-size:2rem;margin:0;}.cover p{margin:8px 0 0;opacity:.85;}</style></head><body>
  <div class="cover"><h1>🐔 HINSE — GRANJA AVÍCOLA</h1><p>Backup completo · ${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div>
  ${makeTable('🐣 LOTES',['Nombre','Galpón','Etapa','Ingreso','Inicial','Actual','Semana','Raza','Procedencia','Ruptura'],
    lotes.slice().reverse().map(l=>[l.nombre,l.galpon||'',l.etapa==='produccion'?'Producción':'Recría',fmtDate(l.fecha),l.cantidadInicial,l.cantidadActual,semanasDesde(l.fecha,l.semanaIngreso)+' sem.',l.raza||'',l.procedencia||'',l.fechaRuptura?fmtDate(l.fechaRuptura):'']))}
  ${makeTable('🥚 POSTURA',['Fecha','Lote','Total','Rotos','Netos','Maple×20','Maple×30','Sueltos','Notas'],
    DB.get(KEYS.postura).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(p=>[fmtDate(p.fecha),getLote(p.loteId),p.huevos,p.rotos,(p.huevos-p.rotos),p.maple20||0,p.maple30||0,p.sueltos||0,p.notas||'']))}
  ${makeTable('💀 MORTANDAD',['Fecha','Lote','Cantidad','Causa','Necropsia','Descripción'],
    DB.get(KEYS.mortandad).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>[fmtDate(m.fecha),getLote(m.loteId),m.cantidad,causas[m.causa]||m.causa,m.necropsia,m.desc||'']))}
  ${makeTable('💉 VACUNACIÓN',['Fecha','Lote','Vacuna','Vía','Dosis','Aplicador','Próxima'],
    DB.get(KEYS.vacunacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(v=>[fmtDate(v.fecha),getLote(v.loteId),v.vacuna,vias[v.via]||v.via,v.dosis||'',v.aplicador||'',v.proximaFecha?fmtDate(v.proximaFecha):'']))}
  ${makeTable('💊 MEDICACIÓN',['Fecha','Lote','Medicamento','Motivo','Dosis','Días','Veterinario'],
    DB.get(KEYS.medicacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>[fmtDate(m.fecha),getLote(m.loteId),m.nombre,m.motivo||'',m.dosis||'',m.dias||'',m.vet||'']))}
  ${makeTable('🌾 ALIMENTACIÓN',['Fecha','Lote','Tipo','Kg','g/ave/día','Proveedor','Costo'],
    DB.get(KEYS.alimentacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>[fmtDate(r.fecha),getLote(r.loteId),r.tipo||'',r.kg,r.grAve||'',r.proveedor||'',r.costo?'$'+r.costo:'']))}
  ${makeTable('🦠 ENFERMEDADES',['Fecha','Lote','Nombre','Estado','Aves','Veterinario','Tratamiento','Cierre'],
    DB.get(KEYS.enfermedades).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(e=>[fmtDate(e.fecha),getLote(e.loteId),e.nombre,e.estado,e.afectadas||'',e.vet||'',e.tratamiento||'',e.fechaCierre?fmtDate(e.fechaCierre):'']))}
  ${makeTable('🌾 FÓRMULAS',['Nombre','Etapa','g/ave/día','Proteína%','kcal/kg','Calcio%','Proveedor','Ingredientes'],
    DB.get(KEYS.formulas).map(f=>[f.nombre,ETAPA_NOMBRES[f.etapa]||f.etapa,f.grAve||'',f.proteina||'',f.energia||'',f.calcio||'',f.proveedor||'',f.ingredientes||'']))}
  </body></html>`;
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'}));
  a.download=`hinse-backup-${today()}.xls`; a.click();
  showToast('📊 Excel descargado');
}

// ─── DELETE ───────────────────────────────────────────────────
function deleteRecord(key,id,rerenderFn) {
  if(!confirm('¿Eliminar este registro?')) return;
  DB.set(key,DB.get(key).filter(x=>x.id!==id));
  rerenderFn();
  if([KEYS.mortandad,KEYS.lotes,KEYS.vacunacion,KEYS.medicacion,KEYS.enfermedades].includes(key)) renderDashboard();
  showToast('🗑️ Registro eliminado');
}

// ─── BACKUP JSON ─────────────────────────────────────────────
function hacerBackupJSON() {
  const data={};
  Object.values(KEYS).forEach(k=>{data[k]=DB.get(k);});
  data._version=3; data._exportDate=new Date().toISOString();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download=`hinse-backup-${today()}.json`; a.click();
  showToast('💾 Backup JSON descargado');
}
function restaurarBackup(e) {
  const file=e.target.files[0]; if(!file) return;
  const rd=new FileReader();
  rd.onload=ev=>{
    try {
      const data=JSON.parse(ev.target.result);
      if(!confirm('¿Restaurar backup? Reemplazará los datos actuales.')) return;
      Object.values(KEYS).forEach(k=>{if(data[k]) DB.set(k,data[k]);});
      showToast('📂 Restaurado'); setTimeout(()=>location.reload(),800);
    } catch { showToast('❌ Archivo inválido'); }
  };
  rd.readAsText(file); e.target.value='';
}

// ─── PDF HELPERS ─────────────────────────────────────────────
function pdfHeader(titulo,sub) {
  const fecha=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const hora=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  return `<div class="pdf-header">
    <div class="pdf-logo-area"><div class="pdf-logo-icon">🐔</div><div><div class="pdf-logo-name">HINSE</div><div class="pdf-logo-sub">GRANJA AVÍCOLA</div></div></div>
    <div class="pdf-header-right"><div class="pdf-report-title">${titulo}</div><div class="pdf-report-date">${sub||fecha}</div><div class="pdf-report-time">${hora} hs</div></div>
  </div>`;
}
function pdfFooter() {
  const f=new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});
  const h=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  return `<div class="pdf-footer"><span>Granja Hinse · Sistema de Control Avícola</span><span>Generado: ${f} ${h} hs</span><span>Confidencial — Uso interno</span></div>`;
}
function openPDF(html) {
  $('pdfContent').innerHTML=html;
  $('pdfOverlay').classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function cerrarPDF() {
  $('pdfOverlay').classList.add('hidden');
  document.body.style.overflow='';
}

// ─── PDF DASHBOARD ────────────────────────────────────────────
function generarPDF() {
  const lotes=DB.get(KEYS.lotes), mort=DB.get(KEYS.mortandad);
  const vac=DB.get(KEYS.vacunacion), med=DB.get(KEYS.medicacion);
  const post=DB.get(KEYS.postura), enf=DB.get(KEYS.enfermedades);
  const ponedoras=lotes.filter(l=>l.etapa==='produccion').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const recrías=lotes.filter(l=>l.etapa==='recria').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const totalBajas=mort.reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const u7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];});
  const hoyH=post.filter(p=>p.fecha===today()).reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const post7=post.filter(p=>u7.includes(p.fecha));
  const pct7=ponedoras>0&&post7.length?((post7.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(ponedoras*7))*100).toFixed(1):null;
  const enferAct=enf.filter(e=>e.estado==='activa');
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  const vacProx=vac.filter(v=>{if(!v.proximaFecha)return false;const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);const df=Math.ceil((d-hoy)/864e5);return df>=0&&df<=14;}).map(v=>{const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);return{...v,dias:Math.ceil((d-hoy)/864e5)};});
  const medAct=med.filter(m=>{const fin=new Date(m.fecha);fin.setDate(fin.getDate()+(parseInt(m.dias)||0));return new Date()<=fin;});
  const ultPost=lotes.filter(l=>l.etapa==='produccion').map(l=>{
    const ps=post.filter(p=>p.loteId===l.id).sort((a,b)=>b.fecha.localeCompare(a.fecha));
    const last=ps[0]; const a=parseInt(l.cantidadActual)||0;
    const pct=last&&a>0?((parseInt(last.huevos)/a)*100).toFixed(1):null;
    return {lote:l,last,pct};
  });

  openPDF(`<div class="pdf-page">
    ${pdfHeader('INFORME DE PRODUCCIÓN')}
    <div class="pdf-kpi-strip">
      <div class="pdf-kpi" style="border-color:#c8853a"><div class="pdf-kpi-icon">🐔</div><div class="pdf-kpi-val">${(ponedoras+recrías).toLocaleString('es')}</div><div class="pdf-kpi-lbl">Total Aves</div></div>
      <div class="pdf-kpi" style="border-color:#d4a043"><div class="pdf-kpi-icon">🥚</div><div class="pdf-kpi-val">${hoyH.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Huevos Hoy</div></div>
      <div class="pdf-kpi" style="border-color:#7a9ab5"><div class="pdf-kpi-icon">📈</div><div class="pdf-kpi-val">${pct7?pct7+'%':'—'}</div><div class="pdf-kpi-lbl">% Postura 7d</div></div>
      <div class="pdf-kpi" style="border-color:#c05050"><div class="pdf-kpi-icon">💀</div><div class="pdf-kpi-val">${totalBajas.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Mortandad</div></div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#c8853a,#a86828)"><span>🐣 LOTES</span><span>${lotes.length}</span></div>
        ${lotes.length?lotes.map(l=>{const sem=semanasDesde(l.fecha,l.semanaIngreso);return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${l.nombre}</span><span class="pdf-badge ${l.etapa==='produccion'?'pdf-badge-green':'pdf-badge-gold'}">${l.etapa==='produccion'?'Producción':'Recría'}</span></div><div class="pdf-row-detail">${l.galpon||'Sin galpón'} · ${(parseInt(l.cantidadActual)||0).toLocaleString('es')} aves · Sem. ${sem}</div></div>`;}).join(''):'<div class="pdf-empty">Sin lotes</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#d4a043,#a86828)"><span>🥚 POSTURA POR LOTE</span></div>
        ${ultPost.length?ultPost.map(({lote,last,pct})=>{const pN=pct?parseFloat(pct):0;const bc=pN>=80?'#c8853a':pN>=60?'#d4a043':'#c05050';return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${lote.nombre}</span><span style="font-weight:700;color:${bc}">${pct?pct+'%':'—'}</span></div>${last?`<div class="pdf-row-detail">${fmtDate(last.fecha)} · ${last.huevos} huevos</div>`:'<div class="pdf-row-detail" style="color:#c05050">Sin registros</div>'}${pct?`<div class="pdf-mini-bar"><div style="width:${Math.min(pN,100)}%;background:${bc}"></div></div>`:''}</div>`;}).join(''):'<div class="pdf-empty">Sin lotes en producción</div>'}
      </div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a9ab5,#4a6a8a)"><span>💉 VACUNAS PRÓXIMAS</span><span>${vacProx.length}</span></div>
        ${vacProx.length?vacProx.map(v=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${v.vacuna}</span><span class="pdf-badge ${v.dias<=3?'pdf-badge-red':'pdf-badge-blue'}">En ${v.dias}d</span></div><div class="pdf-row-detail">${getLoteNombre(v.loteId)}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin vacunas próximas</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#6a8a6a,#4a6a4a)"><span>💊 TRATAMIENTOS ACTIVOS</span><span>${medAct.length}</span></div>
        ${medAct.length?medAct.map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${m.nombre}</span><span class="pdf-badge pdf-badge-blue">${m.dias||'?'}d</span></div><div class="pdf-row-detail">${getLoteNombre(m.loteId)}${m.motivo?' · '+m.motivo:''}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin tratamientos</div>'}
      </div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#8a5a3a,#6b3e1e)"><span>🦠 ENFERMEDADES ACTIVAS</span><span>${enferAct.length}</span></div>
        ${enferAct.length?enferAct.map(e=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${e.nombre}</span><span class="pdf-badge pdf-badge-red">Activa</span></div><div class="pdf-row-detail">${getLoteNombre(e.loteId)}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin enfermedades activas</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a3a3a,#5a2a2a)"><span>💀 MORTANDAD RECIENTE</span></div>
        ${mort.length?mort.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,4).map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:#c05050">🪦 ${m.cantidad} ave(s)</span><span style="color:#8a6848;font-size:.82rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${getLoteNombre(m.loteId)} · ${m.causa||'—'}</div></div>`).join(''):'<div class="pdf-empty">Sin registros</div>'}
      </div>
    </div>
    ${pdfFooter()}
  </div>`);
}

// ─── PDF GALPÓN ───────────────────────────────────────────────
function generarPDFGalpon(nombreGalpon) {
  const list=buildGalponesData();
  const g=list.find(x=>x.nombre===nombreGalpon);
  if(!g) return showToast('⚠️ Galpón no encontrado');
  const pN=g.pct?parseFloat(g.pct):0;
  const bc=pN>=80?'#c8853a':pN>=60?'#d4a043':'#c05050';
  const ids=g.lotes.map(l=>l.id);
  const post=DB.get(KEYS.postura).filter(p=>ids.includes(p.loteId)).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const mort=DB.get(KEYS.mortandad).filter(m=>ids.includes(m.loteId));
  const vac=DB.get(KEYS.vacunacion).filter(v=>ids.includes(v.loteId));
  const med=DB.get(KEYS.medicacion).filter(m=>ids.includes(m.loteId));
  const enf=DB.get(KEYS.enfermedades).filter(e=>ids.includes(e.loteId)&&e.estado==='activa');
  const totalH=post.reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const totalM=mort.reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  const vacProx=vac.filter(v=>{if(!v.proximaFecha)return false;const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);const df=Math.ceil((d-hoy)/864e5);return df>=0&&df<=14;}).map(v=>{const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);return{...v,dias:Math.ceil((d-hoy)/864e5)};});
  const medAct=med.filter(m=>{const fin=new Date(m.fecha);fin.setDate(fin.getDate()+(parseInt(m.dias)||0));return new Date()<=fin;});
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};

  openPDF(`<div class="pdf-page">
    ${pdfHeader('ESTADO DE GALPÓN', g.nombre)}
    <div class="pdf-lote-banner" style="background:linear-gradient(135deg,#fff8f0,#fdf0d8);border-color:#c8853a">
      <div class="pdf-lote-banner-left">
        <div class="pdf-lote-nombre">🏚️ ${g.nombre}</div>
        <div class="pdf-lote-detalle">${g.lotes.length} lote(s) · ${(g.ponedoras+g.recrías).toLocaleString('es')} aves totales</div>
        <div class="pdf-lote-detalle" style="margin-top:3px">🥚 ${g.ponedoras.toLocaleString('es')} ponedoras · 🐣 ${g.recrías.toLocaleString('es')} en recría</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:2rem;font-weight:700;color:${bc}">${g.pct?g.pct+'%':'—'}</div>
        <div style="font-size:.75rem;color:#8a6848;text-transform:uppercase;letter-spacing:.06em">% Postura hoy</div>
        ${g.pct7?`<div style="font-size:.85rem;color:#a86828;margin-top:3px">Prom 7d: ${g.pct7}%</div>`:''}
      </div>
    </div>
    <div class="pdf-kpi-strip" style="grid-template-columns:repeat(5,1fr)">
      <div class="pdf-kpi" style="border-color:#c8853a"><div class="pdf-kpi-icon">🐔</div><div class="pdf-kpi-val">${(g.ponedoras+g.recrías).toLocaleString('es')}</div><div class="pdf-kpi-lbl">Total Aves</div></div>
      <div class="pdf-kpi" style="border-color:#d4a043"><div class="pdf-kpi-icon">🥚</div><div class="pdf-kpi-val">${g.huevosHoy.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Huevos Hoy</div></div>
      <div class="pdf-kpi" style="border-color:${bc}"><div class="pdf-kpi-icon">📈</div><div class="pdf-kpi-val">${g.pct7?g.pct7+'%':'—'}</div><div class="pdf-kpi-lbl">% Postura 7d</div></div>
      <div class="pdf-kpi" style="border-color:#c05050"><div class="pdf-kpi-icon">💀</div><div class="pdf-kpi-val">${totalM.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Mortandad</div></div>
      <div class="pdf-kpi" style="border-color:#7a9ab5"><div class="pdf-kpi-icon">💊</div><div class="pdf-kpi-val">${medAct.length}</div><div class="pdf-kpi-lbl">Trat. Activos</div></div>
    </div>
    <div class="pdf-section pdf-section-full" style="margin-bottom:14px">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#c8853a,#a86828)"><span>🐣 LOTES EN ESTE GALPÓN</span><span>${g.lotes.length}</span></div>
      ${g.lotes.map(l=>{
        const sem=semanasDesde(l.fecha,l.semanaIngreso);
        const ps=post.filter(p=>p.loteId===l.id); const lastP=ps[0];
        const aves=parseInt(l.cantidadActual)||0;
        const pctL=lastP&&aves>0?((parseInt(lastP.huevos)/aves)*100).toFixed(1):null;
        const bcL=pctL?parseFloat(pctL)>=80?'#c8853a':parseFloat(pctL)>=60?'#d4a043':'#c05050':'#8a6848';
        return`<div class="pdf-row" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;align-items:center">
          <div><span style="font-weight:700">${l.nombre}</span><span class="pdf-badge ${l.etapa==='produccion'?'pdf-badge-green':'pdf-badge-gold'}" style="margin-left:6px">${l.etapa==='produccion'?'Producción':'Recría'}</span></div>
          <span style="color:#8a6848;font-size:.82rem">Sem. ${sem}</span>
          <span style="font-weight:600">${aves.toLocaleString('es')} aves</span>
          <span style="font-weight:700;color:${bcL}">${pctL?pctL+'%':'—'}</span>
          <span style="color:#8a6848;font-size:.78rem">${lastP?fmtDate(lastP.fecha):'Sin postura'}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#d4a043,#a86828)"><span>🥚 POSTURA RECIENTE</span><span>${totalH.toLocaleString('es')} total</span></div>
        ${post.length?post.slice(0,12).map(p=>{
          const lNom=getLoteNombre(p.loteId);
          const lote=DB.get(KEYS.lotes).find(l=>l.id===p.loteId);
          const aves=lote?(parseInt(lote.cantidadActual)||0):0;
          const pN2=aves>0?((p.huevos/aves)*100):0;
          const bc2=pN2>=80?'#c8853a':pN2>=60?'#d4a043':'#c05050';
          return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:${bc2}">${p.huevos} huevos (${pN2.toFixed(1)}%)</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(p.fecha)}</span></div><div class="pdf-row-detail">${lNom}</div>${pN2>0?`<div class="pdf-mini-bar"><div style="width:${Math.min(pN2,100)}%;background:${bc2}"></div></div>`:''}</div>`;
        }).join('')+(post.length>12?`<div class="pdf-empty">... y ${post.length-12} más</div>`:''):'<div class="pdf-empty">Sin registros de postura</div>'}
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="pdf-section">
          <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a9ab5,#4a6a8a)"><span>💉 VACUNAS PRÓXIMAS</span><span>${vacProx.length}</span></div>
          ${vacProx.length?vacProx.map(v=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${v.vacuna}</span><span class="pdf-badge ${v.dias<=3?'pdf-badge-red':'pdf-badge-blue'}">En ${v.dias}d</span></div><div class="pdf-row-detail">${getLoteNombre(v.loteId)}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin vacunas próximas</div>'}
        </div>
        <div class="pdf-section">
          <div class="pdf-section-header" style="background:linear-gradient(135deg,#6a8a6a,#4a6a4a)"><span>💊 TRATAMIENTOS ACTIVOS</span><span>${medAct.length}</span></div>
          ${medAct.length?medAct.map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${m.nombre}</span><span class="pdf-badge pdf-badge-blue">${m.dias||'?'}d</span></div><div class="pdf-row-detail">${getLoteNombre(m.loteId)}${m.motivo?' · '+m.motivo:''}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin tratamientos</div>'}
        </div>
        ${enf.length?`<div class="pdf-section"><div class="pdf-section-header" style="background:linear-gradient(135deg,#8a5a3a,#6b3e1e)"><span>🦠 ENFERMEDADES ACTIVAS</span><span>${enf.length}</span></div>${enf.map(e=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${e.nombre}</span><span class="pdf-badge pdf-badge-red">Activa</span></div><div class="pdf-row-detail">${getLoteNombre(e.loteId)}</div></div>`).join('')}</div>`:''}
        ${mort.length?`<div class="pdf-section"><div class="pdf-section-header" style="background:linear-gradient(135deg,#7a3a3a,#5a2a2a)"><span>💀 MORTANDAD</span><span>${totalM} aves</span></div>${mort.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,5).map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:#c05050">🪦 ${m.cantidad}</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${getLoteNombre(m.loteId)} · ${causas[m.causa]||m.causa}</div></div>`).join('')}</div>`:''}
      </div>
    </div>
    ${pdfFooter()}
  </div>`);
}

// ─── PDF LOTE ─────────────────────────────────────────────────
function generarPDFLote(loteId) {
  const lote=DB.get(KEYS.lotes).find(l=>l.id===loteId); if(!lote) return;
  const sem=semanasDesde(lote.fecha,lote.semanaIngreso);
  const posturas=DB.get(KEYS.postura).filter(p=>p.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const mort=DB.get(KEYS.mortandad).filter(m=>m.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const vac=DB.get(KEYS.vacunacion).filter(v=>v.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const med=DB.get(KEYS.medicacion).filter(m=>m.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const alim=DB.get(KEYS.alimentacion).filter(a=>a.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const enf=DB.get(KEYS.enfermedades).filter(e=>e.loteId===loteId);
  const notas=DB.get(KEYS.notas).filter(n=>n.loteId===loteId&&n.foto).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const totalH=posturas.reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const totalM=mort.reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const totalKg=alim.reduce((s,a)=>s+(parseFloat(a.kg)||0),0);
  const totalCosto=alim.reduce((s,a)=>s+(parseFloat(a.costo)||0),0);
  const aves=parseInt(lote.cantidadActual)||0;
  const pctProm=posturas.length&&aves>0?((posturas.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(aves*posturas.length))*100).toFixed(1):null;
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};

  openPDF(`<div class="pdf-page">
    ${pdfHeader('HISTORIAL DE LOTE', lote.nombre+' · '+(lote.galpon||'Sin galpón'))}
    <div class="pdf-lote-banner">
      <div class="pdf-lote-banner-left">
        <div class="pdf-lote-nombre">${lote.nombre}</div>
        <div class="pdf-lote-detalle">${lote.galpon||'Sin galpón'} · Semana ${sem} · ${lote.raza||'Raza no especificada'}</div>
        ${lote.fechaRuptura?`<div class="pdf-lote-ruptura">🥚 Ruptura: ${fmtDate(lote.fechaRuptura)} — Sem. ${lote.semanaRuptura}</div>`:''}
      </div>
      <div class="pdf-lote-badge-etapa ${lote.etapa==='produccion'?'prod':'recria'}">${lote.etapa==='produccion'?'PRODUCCIÓN':'RECRÍA'}</div>
    </div>
    <div class="pdf-kpi-strip" style="grid-template-columns:repeat(5,1fr)">
      <div class="pdf-kpi" style="border-color:#c8853a"><div class="pdf-kpi-icon">🐔</div><div class="pdf-kpi-val">${aves.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Aves actuales</div></div>
      <div class="pdf-kpi" style="border-color:#d4a043"><div class="pdf-kpi-icon">🥚</div><div class="pdf-kpi-val">${totalH.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Total huevos</div></div>
      <div class="pdf-kpi" style="border-color:#7a9ab5"><div class="pdf-kpi-icon">📈</div><div class="pdf-kpi-val">${pctProm?pctProm+'%':'—'}</div><div class="pdf-kpi-lbl">% Postura prom.</div></div>
      <div class="pdf-kpi" style="border-color:#c05050"><div class="pdf-kpi-icon">💀</div><div class="pdf-kpi-val">${totalM.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Mortandad</div></div>
      <div class="pdf-kpi" style="border-color:#8a5a3a"><div class="pdf-kpi-icon">🌾</div><div class="pdf-kpi-val">${totalKg.toLocaleString('es')} kg</div><div class="pdf-kpi-lbl">Alimento total</div></div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#d4a043,#a86828)"><span>🥚 POSTURA</span><span>${posturas.length} registros</span></div>
        ${posturas.length?posturas.slice(0,15).map(p=>{const pN=aves>0?((parseInt(p.huevos)/aves)*100):0;const bc=pN>=80?'#c8853a':pN>=60?'#d4a043':'#c05050';return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:${bc}">${p.huevos} huevos (${pN.toFixed(1)}%)</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(p.fecha)}</span></div>${p.maple20||p.maple30?`<div class="pdf-row-detail">${p.maple20||0}×20 + ${p.maple30||0}×30${p.sueltos?' + '+p.sueltos+' sueltos':''}</div>`:''}${pN>0?`<div class="pdf-mini-bar"><div style="width:${Math.min(pN,100)}%;background:${bc}"></div></div>`:''}</div>`;}).join('')+(posturas.length>15?`<div class="pdf-empty">... y ${posturas.length-15} más</div>`:''):'<div class="pdf-empty">Sin registros</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a3a3a,#5a2a2a)"><span>💀 MORTANDAD</span><span>${totalM} aves</span></div>
        ${mort.length?mort.map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:#c05050">🪦 ${m.cantidad} ave(s)</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${causas[m.causa]||m.causa}${m.necropsia==='si'?' · ✅ Necropsia':''}</div></div>`).join(''):'<div class="pdf-empty">Sin registros</div>'}
      </div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a9ab5,#4a6a8a)"><span>💉 VACUNACIÓN</span><span>${vac.length}</span></div>
        ${vac.length?vac.map(v=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${v.vacuna}</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(v.fecha)}</span></div><div class="pdf-row-detail">${v.via||''} · ${v.dosis||'—'}</div></div>`).join(''):'<div class="pdf-empty">Sin vacunas</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#6a8a6a,#4a6a4a)"><span>💊 MEDICACIÓN</span><span>${med.length}</span></div>
        ${med.length?med.map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${m.nombre}</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${m.motivo||'—'} · ${m.dias||'?'} días</div></div>`).join(''):'<div class="pdf-empty">Sin medicaciones</div>'}
      </div>
    </div>
    ${enf.length?`<div class="pdf-section pdf-section-full"><div class="pdf-section-header" style="background:linear-gradient(135deg,#8a5a3a,#6b3e1e)"><span>🦠 ENFERMEDADES</span><span>${enf.length}</span></div>${enf.map(e=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">🦠 ${e.nombre}</span><span class="pdf-badge ${e.estado==='activa'?'pdf-badge-red':e.estado==='controlada'?'pdf-badge-gold':'pdf-badge-green'}">${e.estado}</span></div><div class="pdf-row-detail">${e.vet||''} · Aves: ${e.afectadas||'—'}${e.tratamiento?' · Trat: '+e.tratamiento:''}</div></div>`).join('')}</div>`:''}
    ${alim.length?`<div class="pdf-section pdf-section-full"><div class="pdf-section-header" style="background:linear-gradient(135deg,#6b5a2a,#4a3a18)"><span>🌾 ALIMENTACIÓN · Total: ${totalKg.toLocaleString('es')} kg</span>${totalCosto>0?`<span>$${totalCosto.toLocaleString('es')}</span>`:'<span></span>'}</div>${alim.slice(0,10).map(a=>`<div class="pdf-row" style="display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:8px;align-items:center"><span style="color:#8a6848;font-size:.78rem">${fmtDate(a.fecha)}</span><span style="font-weight:600">${a.tipo||'Alimento'}</span><span>${a.kg} kg</span><span style="color:#a86828">${a.costo?'$'+a.costo:''}</span></div>`).join('')}</div>`:''}
    ${notas.length?`<div class="pdf-section pdf-section-full"><div class="pdf-section-header" style="background:linear-gradient(135deg,#5a4a3a,#3a2a1a)"><span>📷 FOTOS DE CAMPO</span><span>${notas.length}</span></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding:14px">${notas.map(n=>`<div><img src="${n.foto}" style="width:100%;border-radius:8px;max-height:140px;object-fit:cover"><p style="font-size:.75rem;color:#8a6848;margin-top:4px">${fmtDate(n.fecha)}${n.texto?' — '+n.texto.slice(0,50):''}</p></div>`).join('')}</div></div>`:''}
    ${pdfFooter()}
  </div>`);
}

// ─── SW ───────────────────────────────────────────────────────
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}