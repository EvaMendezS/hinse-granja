/* ============================================================
   Hinse — Granja Avícola v3.3
   Event delegation en todas las listas — sin acumulación de
   listeners, sin bugs de memoria, menú Más estable.
   ============================================================ */
'use strict';

// ─── STORAGE ─────────────────────────────────────────────────
const DB = {
  get(k)    { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};
const KEYS = {
  lotes:'hinse_lotes',        postura:'hinse_postura',
  alimentacion:'hinse_alim',  vacunacion:'hinse_vac',
  medicacion:'hinse_med',     mortandad:'hinse_mort',
  enfermedades:'hinse_enf',   notas:'hinse_notas',
  formulas:'hinse_formulas',
};

// ─── UTILS ───────────────────────────────────────────────────
const uid     = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmtDate = d => { if(!d) return '—'; const [y,m,dia]=d.split('-'); return `${dia}/${m}/${y}`; };
const today   = () => new Date().toISOString().split('T')[0];
const $       = id => document.getElementById(id);
const val     = id => ($( id) ? $(id).value : '');
const setVal  = (id, v) => { const e=$(id); if(e) e.value = (v ?? ''); };

function semanas(f, base=0) {
  if(!f) return parseInt(base)||0;
  return Math.floor((Date.now()-new Date(f).getTime())/(7*864e5)) + (parseInt(base)||0);
}
function toast(msg, ms=2600) {
  const el=$('toast'); if(!el) return;
  el.textContent=msg; el.classList.remove('hidden');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add('hidden'),ms);
}
function empty(icon,msg){ return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`; }
function loteNombre(id){ return DB.get(KEYS.lotes).find(x=>x.id===id)?.nombre||'(eliminado)'; }
function fillSelect(sid){
  const el=$(sid); if(!el) return;
  const lotes=DB.get(KEYS.lotes);
  el.innerHTML = lotes.length
    ? lotes.map(l=>`<option value="${l.id}">${l.nombre} — ${l.galpon||'Sin galpón'} (${l.cantidadActual||0})</option>`).join('')
    : '<option value="">— Sin lotes —</option>';
}

// ─── MODALES ─────────────────────────────────────────────────
function abrirModal(id) {
  const m=$(id); if(!m) return;
  m.classList.remove('hidden');
  document.body.style.overflow='hidden';
  m.querySelectorAll('input[type=date]').forEach(e=>{ if(!e.value) e.value=today(); });
  ['posturaLote','alimentacionLote','vacunacionLote','medicacionLote',
   'mortandadLote','enfermedadLote','notaLote'].forEach(s=>{ if(m.querySelector('#'+s)) fillSelect(s); });
  if(id==='modalPostura') calcMaple();
}
function cerrarModal(id) {
  const m=$(id); if(!m) return;
  m.classList.add('hidden');
  document.body.style.overflow='';
  m.querySelectorAll('input:not([type=hidden]):not([type=file]),select,textarea').forEach(e=>{
    e.tagName==='SELECT' ? (e.selectedIndex=0) : (e.value='');
  });
  m.querySelectorAll('input[type=hidden]').forEach(e=>e.value='');
  m.querySelectorAll('input[type=date]').forEach(e=>e.value=today());
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
  // Setear fecha de hoy en todos los inputs de fecha
  document.querySelectorAll('input[type=date]').forEach(e=>{ if(!e.value) e.value=today(); });

  wireNav();
  wireMas();
  wireModalClose();
  wireStaticButtons();
  wirePostura();
  wireFotos();
  wireBackupButtons();

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
  renderFormulas();

  // Gráfico postura — controles
  const gPeriodo = $('graficoPeriodo');
  const gLote    = $('graficoLote');
  if(gPeriodo) gPeriodo.addEventListener('change', actualizarGrafico);
  if(gLote)    gLote.addEventListener('change', actualizarGrafico);
}

// ─── NAV PRINCIPAL ───────────────────────────────────────────
function wireNav() {
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      irA(btn.dataset.view);
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ─── MENÚ MÁS — completamente reescrito sin estado global ────
function wireMas() {
  const masBtn=$('navMasBtn');
  const masMenu=$('masMenu');
  if(!masBtn||!masMenu) return;

  // Toggle al tocar el botón Más
  masBtn.addEventListener('click', e=>{
    e.stopPropagation();
    const abierto = !masMenu.classList.contains('hidden');
    masMenu.classList.toggle('hidden', abierto);
    masBtn.classList.toggle('active', !abierto);
  });

  // Cada ítem del menú navega y cierra
  masMenu.querySelectorAll('.mas-btn[data-nav]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      irA(btn.dataset.nav);
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      masMenu.classList.add('hidden');
      masBtn.classList.remove('active');
    });
  });

  // Cerrar al tocar fuera — solo si el click NO es en el topbar ni en botones importantes
  document.addEventListener('click', (e)=>{
    if(!masMenu.classList.contains('hidden')){
      // No cerrar si el click fue dentro del masMenu o en el masBtn
      if(!masMenu.contains(e.target) && e.target !== masBtn && !masBtn.contains(e.target)){
        masMenu.classList.add('hidden');
        masBtn.classList.remove('active');
      }
    }
  });

  // Evitar que clicks dentro del menú lo cierren
  masMenu.addEventListener('click', e=>e.stopPropagation());
}

function irA(view) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const t=$('view-'+view); if(t) t.classList.add('active');
  if(view==='dashboard') renderDashboard();
  if(view==='historial')    renderHistorialSelector();
  if(view==='postura')      { setTimeout(()=>actualizarGrafico(),50); }
  if(view==='galpones')  renderGalpones();
}

// ─── CERRAR MODALES ──────────────────────────────────────────
function wireModalClose() {
  // Botones data-close
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click', ()=>cerrarModal(btn.dataset.close));
  });
  // Click en overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay=>{
    overlay.addEventListener('click', e=>{ if(e.target===overlay) cerrarModal(overlay.id); });
  });
}

// ─── BOTONES ESTÁTICOS (abrir modal + guardar + exportar) ────
function wireStaticButtons() {
  const map = {
    // Abrir modales
    btnNuevoLote:        ()=>abrirModal('modalLote'),
    btnNuevaMortandad:   ()=>{ fillSelect('mortandadLote');   abrirModal('modalMortandad');   },
    btnNuevaEnfermedad:  ()=>{ fillSelect('enfermedadLote');  abrirModal('modalEnfermedad');  },
    btnNuevaVacuna:      ()=>{ fillSelect('vacunacionLote');  abrirModal('modalVacunacion');  },
    btnNuevaPostura:     ()=>{ fillSelect('posturaLote');     abrirModal('modalPostura');     },
    btnNuevaMedicacion:  ()=>{ fillSelect('medicacionLote');  abrirModal('modalMedicacion');  },
    btnNuevoAlimento:    ()=>{ fillSelect('alimentacionLote');abrirModal('modalAlimentacion');},
    btnNuevaNota:        ()=>{ fillSelect('notaLote');        abrirModal('modalNota');        },
    btnNuevaFormula:     ()=>abrirModal('modalFormula'),
    // Guardar
    btnSaveLote:         guardarLote,
    btnSaveRuptura:      guardarRuptura,
    btnSavePostura:      guardarPostura,
    btnSaveAlimentacion: guardarAlimentacion,
    btnSaveVacunacion:   guardarVacunacion,
    btnSaveMedicacion:   guardarMedicacion,
    btnSaveMortandad:    guardarMortandad,
    btnSaveEnfermedad:   guardarEnfermedad,
    btnSaveNota:         guardarNota,
    btnSaveFormula:      guardarFormula,
    // PDF y exports
    btnPDF:              (e)=>{ e.stopPropagation(); generarPDFDash(); },
    btnExcel:            (e)=>{ e.stopPropagation(); exportarExcel(); },
    btnImprimirPDF:      (e)=>{ e.stopPropagation(); window.print(); },
    btnCerrarPDF:        (e)=>{ e.stopPropagation(); cerrarPDF(); },
    btnExportEnf:        ()=>exportCSV(KEYS.enfermedades,'enfermedades'),
  };
  Object.entries(map).forEach(([id,fn])=>{
    const el=$(id); if(el) el.addEventListener('click', fn);
  });
}

// ─── POSTURA CÁLCULO POR MAPLE ───────────────────────────────
function wirePostura() {
  ['posturaMaple20','posturaMaple30','posturaHuevosSueltos','posturaLote'].forEach(id=>{
    const el=$(id); if(!el) return;
    el.addEventListener('input',  calcMaple);
    el.addEventListener('change', calcMaple);
  });
}
function calcMaple() {
  const m20  = parseInt(val('posturaMaple20'))||0;
  const m30  = parseInt(val('posturaMaple30'))||0;
  const suel = parseInt(val('posturaHuevosSueltos'))||0;
  const total = m20*20 + m30*30 + suel;
  setVal('posturaHuevosTotal', total);
  const s20=$('sub20'); if(s20) s20.textContent=`= ${m20*20} huevos`;
  const s30=$('sub30'); if(s30) s30.textContent=`= ${m30*30} huevos`;
  const lote=DB.get(KEYS.lotes).find(l=>l.id===val('posturaLote'));
  const aves=lote?(parseInt(lote.cantidadActual)||0):0;
  setVal('posturaPorc', aves>0&&total>0 ? `${((total/aves)*100).toFixed(1)}%` : aves===0?'— (sin lote)':'0.0%');
}

// ─── FOTOS ───────────────────────────────────────────────────
function wireFotos() {
  [['enfermedadFoto','enfermedadFotoPreview'],['notaFoto','notaFotoPreview']].forEach(([i,p])=>{
    const el=$(i); if(!el) return;
    el.addEventListener('change', function(){
      const prev=$(p); if(!prev) return;
      if(this.files[0]){ const r=new FileReader(); r.onload=ev=>{prev.innerHTML=`<img src="${ev.target.result}">`;}; r.readAsDataURL(this.files[0]); }
    });
  });
}

// ─── DASHBOARD ───────────────────────────────────────────────
function populateDashDate() {
  const el=$('dashDate'); if(!el) return;
  el.textContent=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
}
function renderDashboard(){ renderKPIs(); renderAlertas(); renderActividad(); }

function renderKPIs() {
  const el=$('kpiGrid'); if(!el) return;
  const lotes=DB.get(KEYS.lotes), mort=DB.get(KEYS.mortandad);
  const vac=DB.get(KEYS.vacunacion), med=DB.get(KEYS.medicacion), post=DB.get(KEYS.postura);
  const pon=lotes.filter(l=>l.etapa==='produccion').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const rec=lotes.filter(l=>l.etapa==='recria').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const bajas=mort.reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const u7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];});
  const hoyH=post.filter(p=>p.fecha===today()).reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const p7=post.filter(p=>u7.includes(p.fecha));
  const pct7=pon>0&&p7.length?((p7.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(pon*7))*100).toFixed(1):null;
  const medAct=med.filter(m=>{ const f=new Date(m.fecha); f.setDate(f.getDate()+(parseInt(m.dias)||0)); return new Date()<=f; }).length;

  el.innerHTML=`
    <div class="kpi-card" style="--kpi-color:var(--accent)">
      <div class="kpi-icon">🐔</div><div class="kpi-value">${(pon+rec).toLocaleString('es')}</div>
      <div class="kpi-label">Total Aves</div>
      <div class="kpi-delta">🥚 ${pon.toLocaleString('es')} pond. · 🐣 ${rec.toLocaleString('es')} recría</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--gold)">
      <div class="kpi-icon">🥚</div><div class="kpi-value">${hoyH.toLocaleString('es')}</div>
      <div class="kpi-label">Huevos Hoy</div>
      <div class="kpi-delta">${pct7?`📈 Prom 7d: ${pct7}%`:'Sin postura hoy'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--red)">
      <div class="kpi-icon">💀</div><div class="kpi-value">${bajas.toLocaleString('es')}</div>
      <div class="kpi-label">Mortandad Total</div>
      <div class="kpi-delta">${(pon+rec)>0?((bajas/((pon+rec)+bajas))*100).toFixed(2)+'% acum.':'—'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--blue)">
      <div class="kpi-icon">💊</div><div class="kpi-value">${medAct}</div>
      <div class="kpi-label">Tratamientos Activos</div>
      <div class="kpi-delta">${vac.filter(v=>u7.includes(v.fecha)).length} vacuna(s) esta semana</div>
    </div>`;
}

function renderAlertas() {
  const el=$('alertasList'); if(!el) return;
  const alertas=[];
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  DB.get(KEYS.vacunacion).forEach(v=>{
    if(!v.proximaFecha) return;
    const p=new Date(v.proximaFecha); p.setHours(0,0,0,0);
    const d=Math.ceil((p-hoy)/864e5);
    if(d>=0&&d<=7)  alertas.push({i:'💉',t:`Vacuna próxima: ${v.vacuna}`,s:` En ${d}d · ${loteNombre(v.loteId)}`});
    if(d<0&&d>-3)   alertas.push({i:'🔴',t:`Vacuna vencida: ${v.vacuna}`,s:` Hace ${Math.abs(d)}d`});
  });
  DB.get(KEYS.lotes).filter(l=>l.etapa==='recria').forEach(l=>{
    const s=semanas(l.fecha,l.semanaIngreso);
    if(s>=17&&s<20) alertas.push({i:'🔔',t:`Próximo a postura: ${l.nombre}`,s:` Sem. ${s} · ¡Registrá la ruptura!`});
  });
  DB.get(KEYS.mortandad).filter(m=>m.fecha===today()&&parseInt(m.cantidad)>=5).forEach(m=>{
    alertas.push({i:'🚨',t:`Alta mortandad: ${m.cantidad} aves hoy`,s:` ${loteNombre(m.loteId)}`});
  });
  DB.get(KEYS.enfermedades).filter(e=>e.estado==='activa').forEach(e=>{
    alertas.push({i:'🦠',t:`Enfermedad activa: ${e.nombre}`,s:` ${loteNombre(e.loteId)}`});
  });
  el.innerHTML = alertas.length
    ? alertas.map(a=>`<div class="alerta-item"><span class="alerta-icon">${a.i}</span><span class="alerta-text"><strong>${a.t}</strong>${a.s}</span></div>`).join('')
    : '<p style="color:var(--text3);font-size:.85rem;padding:8px 0">✅ Sin alertas pendientes</p>';
}

function renderActividad() {
  const el=$('actividadList'); if(!el) return;
  const items=[];
  const push=(k,i,fn)=>DB.get(k).slice(-5).reverse().forEach(r=>items.push({i,t:fn(r),ts:r.createdAt||r.fecha||''}));
  push(KEYS.postura,     '🥚', r=>`Postura: ${r.huevos} huevos — ${loteNombre(r.loteId)}`);
  push(KEYS.lotes,       '🐣', r=>`Ingreso: ${r.nombre} (${r.cantidadActual} aves)`);
  push(KEYS.vacunacion,  '💉', r=>`Vacuna: ${r.vacuna} — ${loteNombre(r.loteId)}`);
  push(KEYS.mortandad,   '💀', r=>`Mortandad: ${r.cantidad} ave(s) — ${loteNombre(r.loteId)}`);
  push(KEYS.alimentacion,'🌾', r=>`Alimento: ${r.kg}kg — ${loteNombre(r.loteId)}`);
  push(KEYS.enfermedades,'🦠', r=>`Enfermedad: ${r.nombre} — ${loteNombre(r.loteId)}`);
  push(KEYS.notas,       '📷', r=>`Nota de campo — ${loteNombre(r.loteId)}`);
  items.sort((a,b)=>b.ts>a.ts?1:-1);
  el.innerHTML = items.length
    ? items.slice(0,10).map(it=>`<div class="actividad-item"><span style="font-size:1rem">${it.i}</span><span class="actividad-text">${it.t}</span><span class="actividad-time">${fmtDate(it.ts)}</span></div>`).join('')
    : '<p style="color:var(--text3);font-size:.85rem;padding:8px 0">Aún no hay actividad registrada.</p>';
}

// ─── EVENT DELEGATION helper ─────────────────────────────────
// Registra un solo listener por contenedor. El handler recibe el elemento clickeado.
function delegar(containerId, attr, handler) {
  const container=$(containerId);
  if(!container) return;
  container.addEventListener('click', e=>{
    const btn=e.target.closest(`[${attr}]`);
    if(btn && container.contains(btn)) handler(btn.getAttribute(attr), btn, e);
  });
}

// ─── LOTES ────────────────────────────────────────────────────
delegar('loteList','data-action', (action,btn)=>{
  const id=btn.dataset.id;
  if(action==='editarLote')    editarLote(id);
  if(action==='rupturaLote')   abrirRuptura(id);
  if(action==='historialLote') verHistorial(id);
  if(action==='borrarLote')    borrarLote(id);
});

function guardarLote() {
  const id=val('loteId');
  const cantidad=parseInt(val('loteCantidad'))||0;
  const r={id:id||uid(),fecha:val('loteFecha'),nombre:val('loteNombre').trim(),galpon:val('loteGalpon').trim(),cantidadInicial:cantidad,cantidadActual:cantidad,raza:val('loteRaza').trim(),semanaIngreso:parseInt(val('loteSemana'))||0,procedencia:val('loteProcedencia').trim(),etapa:val('loteEtapa'),notas:val('loteNotas').trim(),createdAt:today()};
  if(!r.nombre||!r.cantidadInicial) return toast('⚠️ Completá nombre y cantidad');
  const lotes=DB.get(KEYS.lotes);
  if(id){const i=lotes.findIndex(l=>l.id===id);if(i>-1){r.cantidadActual=lotes[i].cantidadActual;lotes[i]=r;}}else lotes.push(r);
  DB.set(KEYS.lotes,lotes); cerrarModal('modalLote'); renderLote(); renderDashboard();
  toast('✅ Lote guardado');
}
function renderLote() {
  const el=$('loteList'); if(!el) return;
  const lotes=DB.get(KEYS.lotes);
  if(!lotes.length){el.innerHTML=empty('🐣','Sin lotes registrados');return;}
  el.innerHTML=lotes.slice().reverse().map(l=>{
    const s=semanas(l.fecha,l.semanaIngreso), esR=l.etapa==='recria';
    return `<div class="data-card">
      <div class="data-card-header"><span class="data-card-title">${l.nombre}</span><span class="badge ${esR?'badge-gold':'badge-green'}">${esR?'Recría':'Producción'}</span></div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Galpón</span><span class="val">${l.galpon||'—'}</span></div>
        <div class="data-field"><span class="lbl">Ingreso</span><span class="val">${fmtDate(l.fecha)}</span></div>
        <div class="data-field"><span class="lbl">Aves actuales</span><span class="val">${(parseInt(l.cantidadActual)||0).toLocaleString('es')}</span></div>
        <div class="data-field"><span class="lbl">Semana actual</span><span class="val" style="color:var(--accent)">${s} sem.</span></div>
        <div class="data-field"><span class="lbl">Raza</span><span class="val">${l.raza||'—'}</span></div>
        <div class="data-field"><span class="lbl">Inicial</span><span class="val">${(parseInt(l.cantidadInicial)||0).toLocaleString('es')}</span></div>
        ${l.fechaRuptura?`<div class="data-field" style="grid-column:span 2"><span class="lbl">🥚 Ruptura</span><span class="val" style="color:var(--gold)">${fmtDate(l.fechaRuptura)} · Sem. ${l.semanaRuptura||'—'}</span></div>`:''}
      </div>
      ${l.notas?`<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${l.notas}</p>`:''}
      <div class="data-card-actions">
        <button class="btn-edit"  data-action="editarLote"    data-id="${l.id}">✏️ Editar</button>
        ${esR?`<button class="btn-ruptura-card" data-action="rupturaLote" data-id="${l.id}">🥚 Ruptura</button>`:''}
        <button class="btn-edit"  data-action="historialLote" data-id="${l.id}" style="color:var(--blue)">📋 Historial</button>
        <button class="btn-delete" data-action="borrarLote"   data-id="${l.id}">🗑️</button>
      </div>
    </div>`;
  }).join('');
}
function editarLote(id){
  const l=DB.get(KEYS.lotes).find(x=>x.id===id); if(!l) return;
  setVal('loteId',l.id);setVal('loteFecha',l.fecha);setVal('loteNombre',l.nombre);setVal('loteGalpon',l.galpon||'');
  setVal('loteCantidad',l.cantidadActual);setVal('loteRaza',l.raza||'');setVal('loteSemana',l.semanaIngreso||'');
  setVal('loteProcedencia',l.procedencia||'');setVal('loteEtapa',l.etapa);setVal('loteNotas',l.notas||'');
  abrirModal('modalLote');
}
function borrarLote(id){
  if(!confirm('¿Eliminar este lote?')) return;
  DB.set(KEYS.lotes,DB.get(KEYS.lotes).filter(l=>l.id!==id));
  renderLote();renderDashboard();toast('🗑️ Lote eliminado');
}
function verHistorial(id){
  irA('historial');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  setTimeout(()=>{ const s=$('historialLoteSelect'); if(s){s.value=id;renderHistorial(id);} },80);
}

// ─── RUPTURA ─────────────────────────────────────────────────
function abrirRuptura(loteId){
  const l=DB.get(KEYS.lotes).find(x=>x.id===loteId); if(!l) return;
  setVal('rupturaLoteId',loteId); setVal('rupturaFecha',today());
  const s=semanas(l.fecha,l.semanaIngreso); setVal('rupturaSemana',s);
  $('rupturaInfo').innerHTML=`<div class="ruptura-card-info"><span class="ruptura-card-icon">🐣</span><div><strong>${l.nombre}</strong><span>${l.galpon||'Sin galpón'} · ${(parseInt(l.cantidadActual)||0).toLocaleString('es')} aves · Sem. ${s}</span></div></div>`;
  abrirModal('modalRuptura');
}
function guardarRuptura(){
  const loteId=val('rupturaLoteId'), fecha=val('rupturaFecha');
  const semana=val('rupturaSemana'), pct=val('rupturaPctInicial'), notas=val('rupturaNotas').trim();
  if(!fecha) return toast('⚠️ Ingresá la fecha');
  const lotes=DB.get(KEYS.lotes); const i=lotes.findIndex(l=>l.id===loteId);
  if(i>-1){Object.assign(lotes[i],{etapa:'produccion',fechaRuptura:fecha,semanaRuptura:semana,pctRuptura:pct,notasRuptura:notas});DB.set(KEYS.lotes,lotes);}
  if(pct){
    const aves=parseInt(lotes[i]?.cantidadActual)||0;
    const huevos=aves>0?Math.round(aves*(parseFloat(pct)/100)):0;
    const lista=DB.get(KEYS.postura);
    lista.push({id:uid(),fecha,loteId,huevos,maple20:0,maple30:0,sueltos:huevos,rotos:0,notas:`Ruptura (${pct}%)${notas?'. '+notas:''}`,createdAt:today()});
    DB.set(KEYS.postura,lista);
  }
  cerrarModal('modalRuptura');renderLote();renderPostura();renderDashboard();
  toast('✅ Ruptura registrada — Lote en Producción');
}


// ─── GRÁFICO DE POSTURA ───────────────────────────────────────
let _chartPostura = null;

function actualizarGrafico() {
  const periodo = val('graficoPeriodo') || 'mes';
  const loteId  = val('graficoLote')    || 'todos';
  renderGraficoPostura(periodo, loteId);
}

function initGraficoLotes() {
  const sel = $('graficoLote'); if(!sel) return;
  const lotes = DB.get(KEYS.lotes).filter(l=>l.etapa==='produccion');
  sel.innerHTML = '<option value="todos">Todos los lotes</option>' +
    lotes.map(l=>`<option value="${l.id}">${l.nombre}</option>`).join('');
}

function renderGraficoPostura(periodo='mes', loteId='todos') {
  initGraficoLotes();

  const lotes   = DB.get(KEYS.lotes);
  const posturas = DB.get(KEYS.postura);

  // ── Filtrar estrictamente por lote seleccionado ──────────────
  const posts = loteId === 'todos'
    ? posturas
    : posturas.filter(p => p.loteId === loteId);

  // Aves del lote para calcular % (solo cuando hay un lote seleccionado)
  const loteSel   = lotes.find(l => l.id === loteId);
  const avesLote  = loteSel ? (parseInt(loteSel.cantidadActual)||0) : 0;
  const mostrarPct = loteId !== 'todos' && avesLote > 0;

  // ── Construir eje de tiempo ──────────────────────────────────
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  let labels = [], fechasPorPunto = [];   // fechasPorPunto: array de arrays de strings YYYY-MM-DD

  if (periodo === 'semana') {
    // Últimos 7 días — 1 punto por día
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy); d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      labels.push(d.toLocaleDateString('es-AR', {weekday:'short', day:'numeric'}));
      fechasPorPunto.push([str]);
    }
  } else if (periodo === 'mes') {
    // Día por día del mes calendario actual
    const anio = hoy.getFullYear();
    const mes  = hoy.getMonth();
    const diasEnMes = new Date(anio, mes+1, 0).getDate();
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const d   = new Date(anio, mes, dia);
      const str = d.toISOString().split('T')[0];
      labels.push(`${dia}`);
      fechasPorPunto.push([str]);
    }
  } else {
    // Trimestral — 1 punto por semana (13 semanas ≈ 3 meses)
    for (let i = 12; i >= 0; i--) {
      const desde = new Date(hoy); desde.setDate(desde.getDate() - i*7 - 6);
      const hasta = new Date(hoy); hasta.setDate(hasta.getDate() - i*7);
      const dias = [];
      for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate()+1))
        dias.push(d.toISOString().split('T')[0]);
      const label = `${desde.getDate()}/${desde.getMonth()+1}`;
      labels.push(label);
      fechasPorPunto.push(dias);
    }
  }

  // ── Calcular maples por punto ────────────────────────────────
  // Total huevos → maples: maple30 + maple20 + sueltos (sueltos no son maple entero)
  // Mostramos maples30 + maples20 como unidades de maple, y sueltos aparte
  const dataM30 = fechasPorPunto.map(dias =>
    posts.filter(p => dias.includes(p.fecha)).reduce((s,p) => s+(parseInt(p.maple30)||0), 0)
  );
  const dataM20 = fechasPorPunto.map(dias =>
    posts.filter(p => dias.includes(p.fecha)).reduce((s,p) => s+(parseInt(p.maple20)||0), 0)
  );
  const dataTotalMaples = fechasPorPunto.map((_,i) => dataM30[i] + dataM20[i]);
  const dataTotalHuevos = fechasPorPunto.map(dias =>
    posts.filter(p => dias.includes(p.fecha)).reduce((s,p) => s+(parseInt(p.huevos)||0), 0)
  );

  // % postura (solo con lote seleccionado)
  const dataPct = mostrarPct
    ? dataTotalHuevos.map(h => avesLote > 0 ? parseFloat(((h/avesLote)*100).toFixed(1)) : 0)
    : null;

  // ── KPIs ────────────────────────────────────────────────────
  const totalM30 = dataM30.reduce((s,x)=>s+x,0);
  const totalM20 = dataM20.reduce((s,x)=>s+x,0);
  const totalMaples = totalM30 + totalM20;
  const totalHuevos = dataTotalHuevos.reduce((s,x)=>s+x,0);
  const diasConDatos = dataTotalMaples.filter(x=>x>0).length;
  const promMaples = diasConDatos ? (totalMaples/diasConDatos).toFixed(1) : 0;
  const maxMaples  = Math.max(...dataTotalMaples, 0);
  const pctProm    = dataPct
    ? (dataPct.filter(x=>x>0).reduce((s,x)=>s+x,0) / (dataPct.filter(x=>x>0).length||1)).toFixed(1)
    : null;

  const kpiEl = $('graficoKPIs');
  if (kpiEl) kpiEl.innerHTML = `
    <div class="chart-kpi">
      <span class="chart-kpi-val" style="color:var(--gold)">${totalM30}</span>
      <span class="chart-kpi-lbl">Maples ×30</span>
    </div>
    <div class="chart-kpi">
      <span class="chart-kpi-val" style="color:var(--accent)">${totalM20}</span>
      <span class="chart-kpi-lbl">Maples ×20</span>
    </div>
    <div class="chart-kpi">
      <span class="chart-kpi-val" style="color:var(--accent2)">${totalHuevos.toLocaleString('es')}</span>
      <span class="chart-kpi-lbl">Total huevos</span>
    </div>
    <div class="chart-kpi">
      <span class="chart-kpi-val" style="color:var(--text2)">${promMaples}</span>
      <span class="chart-kpi-lbl">Prom. maples/día</span>
    </div>
    ${pctProm ? `<div class="chart-kpi"><span class="chart-kpi-val" style="color:var(--blue)">${pctProm}%</span><span class="chart-kpi-lbl">% Postura prom.</span></div>` : ''}
  `;

  // ── Destruir y recrear canvas ────────────────────────────────
  if (_chartPostura) { _chartPostura.destroy(); _chartPostura = null; }
  const oldC = $('canvasPostura');
  if (oldC) {
    const nc = document.createElement('canvas');
    nc.id = 'canvasPostura';
    oldC.parentNode.replaceChild(nc, oldC);
  }
  const ctxEl = $('canvasPostura'); if (!ctxEl) return;
  const ctx2d = ctxEl.getContext('2d');

  // Gradientes
  const gradM30 = ctx2d.createLinearGradient(0,0,0,260);
  gradM30.addColorStop(0,'rgba(212,160,67,0.45)');
  gradM30.addColorStop(1,'rgba(212,160,67,0.03)');

  const gradM20 = ctx2d.createLinearGradient(0,0,0,260);
  gradM20.addColorStop(0,'rgba(200,133,58,0.35)');
  gradM20.addColorStop(1,'rgba(200,133,58,0.03)');

  const datasets = [
    {
      label: 'Maples ×30',
      data: dataM30,
      borderColor: '#d4a043',
      backgroundColor: gradM30,
      borderWidth: 2.5,
      pointBackgroundColor: '#d4a043',
      pointBorderColor: '#1c1410',
      pointBorderWidth: 1.5,
      pointRadius: periodo==='mes'?3:5,
      pointHoverRadius: 7,
      fill: true,
      tension: 0.38,
      yAxisID: 'y',
    },
    {
      label: 'Maples ×20',
      data: dataM20,
      borderColor: '#c8853a',
      backgroundColor: gradM20,
      borderWidth: 2,
      pointBackgroundColor: '#c8853a',
      pointBorderColor: '#1c1410',
      pointBorderWidth: 1.5,
      pointRadius: periodo==='mes'?3:5,
      pointHoverRadius: 7,
      fill: true,
      tension: 0.38,
      yAxisID: 'y',
    }
  ];

  if (dataPct) {
    const gradPct = ctx2d.createLinearGradient(0,0,0,260);
    gradPct.addColorStop(0,'rgba(122,154,181,0.25)');
    gradPct.addColorStop(1,'rgba(122,154,181,0.02)');
    datasets.push({
      label: '% Postura',
      data: dataPct,
      borderColor: '#7a9ab5',
      backgroundColor: gradPct,
      borderWidth: 2,
      pointBackgroundColor: '#7a9ab5',
      pointBorderColor: '#1c1410',
      pointBorderWidth: 1.5,
      pointRadius: periodo==='mes'?2:4,
      pointHoverRadius: 6,
      fill: false,
      tension: 0.38,
      yAxisID: 'y2',
      borderDash: [4,3],
    });
  }

  // Reducir labels en mensual para no saturar el eje X
  const tickCallback = periodo === 'mes'
    ? (val, idx) => (idx % 5 === 0 || idx === labels.length-1) ? labels[idx] : ''
    : undefined;

  _chartPostura = new Chart(ctxEl, {
    type: 'line',
    data: { labels, datasets },
    options: {
      animation: { duration: 500, easing: 'easeInOutCubic' },
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: { color:'#c8a880', font:{size:11}, boxWidth:10, padding:10, usePointStyle:true }
        },
        tooltip: {
          backgroundColor: 'rgba(28,20,16,0.96)',
          titleColor: '#e8b87a',
          bodyColor: '#c8a880',
          borderColor: '#4a3020',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            title: items => {
              const i = items[0].dataIndex;
              return periodo === 'mes'
                ? `Día ${labels[i]} del mes`
                : periodo === 'semana'
                  ? labels[i]
                  : `Semana del ${labels[i]}`;
            },
            label: item => {
              if (item.dataset.label === '% Postura') return ` % Postura: ${item.parsed.y}%`;
              if (item.dataset.label === 'Maples ×30') return ` Maples ×30: ${item.parsed.y}`;
              if (item.dataset.label === 'Maples ×20') return ` Maples ×20: ${item.parsed.y}`;
              return ` ${item.dataset.label}: ${item.parsed.y}`;
            },
            afterBody: items => {
              const i = items[0].dataIndex;
              const h = dataTotalHuevos[i];
              return h > 0 ? [`  Total huevos: ${h.toLocaleString('es')}`] : [];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color:'rgba(255,255,255,0.04)', drawBorder:false },
          ticks: {
            color:'#8a6848',
            font:{size:10},
            maxRotation: 0,
            autoSkip: false,
            callback: tickCallback || function(val, idx){ return labels[idx]; }
          }
        },
        y: {
          position: 'left',
          beginAtZero: true,
          grid: { color:'rgba(255,255,255,0.06)', drawBorder:false },
          ticks: { color:'#8a6848', font:{size:10}, stepSize:1, callback: v => Number.isInteger(v)?v:'' },
          title: { display:true, text:'Maples', color:'#d4a043', font:{size:10} }
        },
        ...(dataPct ? {
          y2: {
            position: 'right',
            beginAtZero: true,
            max: 110,
            grid: { drawOnChartArea:false },
            ticks: { color:'#7a9ab5', font:{size:10}, callback: v=>v+'%' },
            title: { display:true, text:'% Postura', color:'#7a9ab5', font:{size:10} }
          }
        } : {})
      }
    }
  });
}

// ─── POSTURA ─────────────────────────────────────────────────
delegar('posturaList','data-action',(action,btn)=>{
  if(action==='editarPostura') editarPostura(btn.dataset.id);
  if(action==='borrarPostura') borrarReg(KEYS.postura,btn.dataset.id,renderPostura);
});

function guardarPostura(){
  const id=val('posturaId');
  const m20=parseInt(val('posturaMaple20'))||0, m30=parseInt(val('posturaMaple30'))||0;
  const suel=parseInt(val('posturaHuevosSueltos'))||0;
  const total=m20*20+m30*30+suel;
  const r={id:id||uid(),fecha:val('posturaFecha'),loteId:val('posturaLote'),huevos:total,maple20:m20,maple30:m30,sueltos:suel,rotos:parseInt(val('posturaRotos'))||0,notas:val('posturaNotas').trim(),createdAt:today()};
  if(!r.loteId) return toast('⚠️ Seleccioná un lote');
  const list=DB.get(KEYS.postura);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.postura,list);cerrarModal('modalPostura');renderPostura();renderDashboard();
  toast('✅ Postura registrada');
}
function renderPostura(){
  const el=$('posturaList'); if(!el) return;
  const mes=val('filtroPosturaMes')||'';
  let list=DB.get(KEYS.postura);
  if(mes) list=list.filter(p=>p.fecha&&p.fecha.startsWith(mes));
  list=list.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=empty('🥚','Sin registros de postura');return;}
  el.innerHTML=list.map(p=>{
    const lote=DB.get(KEYS.lotes).find(l=>l.id===p.loteId);
    const aves=lote?(parseInt(lote.cantidadActual)||0):0;
    const pct=aves>0?((p.huevos/aves)*100).toFixed(1):null;
    const pN=pct?parseFloat(pct):0;
    const col=pN>=80?'var(--accent)':pN>=60?'var(--gold)':'var(--red)';
    const desglose=p.maple20||p.maple30?`<div class="data-field" style="grid-column:span 2"><span class="lbl">Desglose</span><span class="val">${p.maple20?p.maple20+'×20 ':''}${p.maple30?p.maple30+'×30 ':''}${p.sueltos?p.sueltos+' sueltos':''}</span></div>`:'';
    return `<div class="data-card">
      <div class="data-card-header"><span class="data-card-title">${loteNombre(p.loteId)}</span><span class="data-card-date">${fmtDate(p.fecha)}</span></div>
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
        <button class="btn-edit"   data-action="editarPostura" data-id="${p.id}">✏️</button>
        <button class="btn-delete" data-action="borrarPostura" data-id="${p.id}">🗑️</button>
      </div>
    </div>`;
  }).join('');
}
function editarPostura(id){
  const p=DB.get(KEYS.postura).find(x=>x.id===id); if(!p) return;
  fillSelect('posturaLote');
  setVal('posturaId',p.id);setVal('posturaFecha',p.fecha);setVal('posturaLote',p.loteId);
  setVal('posturaMaple20',p.maple20||0);setVal('posturaMaple30',p.maple30||0);
  setVal('posturaHuevosSueltos',p.sueltos||0);setVal('posturaRotos',p.rotos||0);setVal('posturaNotas',p.notas||'');
  abrirModal('modalPostura');calcMaple();
}

// ─── ALIMENTACIÓN ─────────────────────────────────────────────
delegar('alimentacionList','data-action',(action,btn)=>{
  if(action==='editarAlim') editarAlim(btn.dataset.id);
  if(action==='borrarAlim') borrarReg(KEYS.alimentacion,btn.dataset.id,renderAlimentacion);
});
function guardarAlimentacion(){
  const id=val('alimentacionId');
  const r={id:id||uid(),fecha:val('alimentacionFecha'),loteId:val('alimentacionLote'),tipo:val('alimentacionTipo').trim(),kg:parseFloat(val('alimentacionKg'))||0,grAve:parseFloat(val('alimentacionGrAve'))||0,proveedor:val('alimentacionProveedor').trim(),costo:parseFloat(val('alimentacionCosto'))||0,notas:val('alimentacionNotas').trim(),createdAt:today()};
  if(!r.loteId) return toast('⚠️ Seleccioná un lote');
  const list=DB.get(KEYS.alimentacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.alimentacion,list);cerrarModal('modalAlimentacion');renderAlimentacion();toast('✅ Alimento registrado');
}
function renderAlimentacion(){
  const el=$('alimentacionList'); if(!el) return;
  const list=DB.get(KEYS.alimentacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=empty('🌾','Sin registros de alimento');return;}
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title">${r.tipo||'Alimento'}</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Lote</span><span class="val">${loteNombre(r.loteId)}</span></div>
      <div class="data-field"><span class="lbl">Cantidad</span><span class="val">${r.kg} kg</span></div>
      <div class="data-field"><span class="lbl">g/ave/día</span><span class="val">${r.grAve||'—'}</span></div>
      <div class="data-field"><span class="lbl">Costo</span><span class="val">${r.costo?'$'+r.costo.toLocaleString('es'):'—'}</span></div>
      <div class="data-field"><span class="lbl">Proveedor</span><span class="val">${r.proveedor||'—'}</span></div>
    </div>
    <div class="data-card-actions">
      <button class="btn-edit"   data-action="editarAlim" data-id="${r.id}">✏️</button>
      <button class="btn-delete" data-action="borrarAlim" data-id="${r.id}">🗑️</button>
    </div></div>`).join('');
}
function editarAlim(id){
  const r=DB.get(KEYS.alimentacion).find(x=>x.id===id); if(!r) return;
  fillSelect('alimentacionLote');
  setVal('alimentacionId',r.id);setVal('alimentacionFecha',r.fecha);setVal('alimentacionLote',r.loteId);
  setVal('alimentacionTipo',r.tipo);setVal('alimentacionKg',r.kg);setVal('alimentacionGrAve',r.grAve);
  setVal('alimentacionProveedor',r.proveedor);setVal('alimentacionCosto',r.costo);setVal('alimentacionNotas',r.notas);
  abrirModal('modalAlimentacion');
}

// ─── VACUNACIÓN ───────────────────────────────────────────────
delegar('vacunacionList','data-action',(action,btn)=>{
  if(action==='editarVac') editarVac(btn.dataset.id);
  if(action==='borrarVac') borrarReg(KEYS.vacunacion,btn.dataset.id,renderVacunacion);
});
function guardarVacunacion(){
  const id=val('vacunacionId');
  const r={id:id||uid(),fecha:val('vacunacionFecha'),loteId:val('vacunacionLote'),vacuna:val('vacunaNombre').trim(),via:val('vacunaVia'),dosis:val('vacunaDosis').trim(),aplicador:val('vacunaAplicador').trim(),proximaFecha:val('vacunaProxima'),notas:val('vacunaNotas').trim(),createdAt:today()};
  if(!r.loteId||!r.vacuna) return toast('⚠️ Completá lote y vacuna');
  const list=DB.get(KEYS.vacunacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.vacunacion,list);cerrarModal('modalVacunacion');renderVacunacion();renderDashboard();toast('✅ Vacunación registrada');
}
function renderVacunacion(){
  const el=$('vacunacionList'); if(!el) return;
  const list=DB.get(KEYS.vacunacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=empty('💉','Sin registros');return;}
  const vias={agua:'Agua',ocular:'Ocular',nasal:'Nasal',inyectable:'Inyectable',spray:'Spray',ala:'Punción alar'};
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title">${r.vacuna}</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Lote</span><span class="val">${loteNombre(r.loteId)}</span></div>
      <div class="data-field"><span class="lbl">Vía</span><span class="val">${vias[r.via]||r.via}</span></div>
      <div class="data-field"><span class="lbl">Dosis</span><span class="val">${r.dosis||'—'}</span></div>
      <div class="data-field"><span class="lbl">Aplicador</span><span class="val">${r.aplicador||'—'}</span></div>
      <div class="data-field"><span class="lbl">Próxima</span><span class="val" style="color:var(--gold)">${r.proximaFecha?fmtDate(r.proximaFecha):'—'}</span></div>
    </div>
    <div class="data-card-actions">
      <button class="btn-edit"   data-action="editarVac" data-id="${r.id}">✏️</button>
      <button class="btn-delete" data-action="borrarVac" data-id="${r.id}">🗑️</button>
    </div></div>`).join('');
}
function editarVac(id){
  const r=DB.get(KEYS.vacunacion).find(x=>x.id===id); if(!r) return;
  fillSelect('vacunacionLote');
  setVal('vacunacionId',r.id);setVal('vacunacionFecha',r.fecha);setVal('vacunacionLote',r.loteId);
  setVal('vacunaNombre',r.vacuna);setVal('vacunaVia',r.via);setVal('vacunaDosis',r.dosis);
  setVal('vacunaAplicador',r.aplicador);setVal('vacunaProxima',r.proximaFecha||'');setVal('vacunaNotas',r.notas);
  abrirModal('modalVacunacion');
}

// ─── MEDICACIÓN ───────────────────────────────────────────────
delegar('medicacionList','data-action',(action,btn)=>{
  if(action==='editarMed') editarMed(btn.dataset.id);
  if(action==='borrarMed') borrarReg(KEYS.medicacion,btn.dataset.id,renderMedicacion);
});
function guardarMedicacion(){
  const id=val('medicacionId');
  const r={id:id||uid(),fecha:val('medicacionFecha'),loteId:val('medicacionLote'),nombre:val('medicamentoNombre').trim(),motivo:val('medicamentoMotivo').trim(),dosis:val('medicamentoDosis').trim(),dias:val('medicamentoDias'),vet:val('medicamentoVet').trim(),notas:val('medicamentoNotas').trim(),createdAt:today()};
  if(!r.loteId||!r.nombre) return toast('⚠️ Completá lote y medicamento');
  const list=DB.get(KEYS.medicacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.medicacion,list);cerrarModal('modalMedicacion');renderMedicacion();renderDashboard();toast('✅ Medicación registrada');
}
function renderMedicacion(){
  const el=$('medicacionList'); if(!el) return;
  const list=DB.get(KEYS.medicacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=empty('💊','Sin registros');return;}
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title">${r.nombre}</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Lote</span><span class="val">${loteNombre(r.loteId)}</span></div>
      <div class="data-field"><span class="lbl">Motivo</span><span class="val">${r.motivo||'—'}</span></div>
      <div class="data-field"><span class="lbl">Dosis</span><span class="val">${r.dosis||'—'}</span></div>
      <div class="data-field"><span class="lbl">Días</span><span class="val">${r.dias||'—'}</span></div>
      <div class="data-field"><span class="lbl">Veterinario</span><span class="val">${r.vet||'—'}</span></div>
    </div>
    <div class="data-card-actions">
      <button class="btn-edit"   data-action="editarMed" data-id="${r.id}">✏️</button>
      <button class="btn-delete" data-action="borrarMed" data-id="${r.id}">🗑️</button>
    </div></div>`).join('');
}
function editarMed(id){
  const r=DB.get(KEYS.medicacion).find(x=>x.id===id); if(!r) return;
  fillSelect('medicacionLote');
  setVal('medicacionId',r.id);setVal('medicacionFecha',r.fecha);setVal('medicacionLote',r.loteId);
  setVal('medicamentoNombre',r.nombre);setVal('medicamentoMotivo',r.motivo);setVal('medicamentoDosis',r.dosis);
  setVal('medicamentoDias',r.dias);setVal('medicamentoVet',r.vet);setVal('medicamentoNotas',r.notas);
  abrirModal('modalMedicacion');
}

// ─── MORTANDAD ────────────────────────────────────────────────
delegar('mortandadList','data-action',(action,btn)=>{
  if(action==='editarMort') editarMort(btn.dataset.id);
  if(action==='borrarMort') borrarReg(KEYS.mortandad,btn.dataset.id,renderMortandad);
});
function guardarMortandad(){
  const id=val('mortandadId');
  const r={id:id||uid(),fecha:val('mortandadFecha'),loteId:val('mortandadLote'),cantidad:parseInt(val('mortandadCantidad'))||0,causa:val('mortandadCausa'),desc:val('mortandadDesc').trim(),necropsia:val('mortandadNecropsia'),createdAt:today()};
  if(!r.loteId) return toast('⚠️ Seleccioná un lote');
  if(!r.cantidad) return toast('⚠️ Ingresá cantidad');
  if(!id){const lotes=DB.get(KEYS.lotes);const i=lotes.findIndex(l=>l.id===r.loteId);if(i>-1){lotes[i].cantidadActual=Math.max(0,(parseInt(lotes[i].cantidadActual)||0)-r.cantidad);DB.set(KEYS.lotes,lotes);}}
  const list=DB.get(KEYS.mortandad);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.mortandad,list);cerrarModal('modalMortandad');renderMortandad();renderDashboard();toast('✅ Mortandad registrada');
}
function renderMortandad(){
  const el=$('mortandadList'); if(!el) return;
  const list=DB.get(KEYS.mortandad).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=empty('📋','Sin registros');return;}
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title" style="color:var(--red)">🪦 ${r.cantidad} ave(s)</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Lote</span><span class="val">${loteNombre(r.loteId)}</span></div>
      <div class="data-field"><span class="lbl">Causa</span><span class="val">${causas[r.causa]||r.causa}</span></div>
      <div class="data-field"><span class="lbl">Necropsia</span><span class="val">${r.necropsia==='si'?'✅ Sí':r.necropsia==='pendiente'?'⏳ Pend.':'❌ No'}</span></div>
    </div>
    ${r.desc?`<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${r.desc}</p>`:''}
    <div class="data-card-actions">
      <button class="btn-edit"   data-action="editarMort" data-id="${r.id}">✏️</button>
      <button class="btn-delete" data-action="borrarMort" data-id="${r.id}">🗑️</button>
    </div></div>`).join('');
}
function editarMort(id){
  const r=DB.get(KEYS.mortandad).find(x=>x.id===id); if(!r) return;
  fillSelect('mortandadLote');
  setVal('mortandadId',r.id);setVal('mortandadFecha',r.fecha);setVal('mortandadLote',r.loteId);
  setVal('mortandadCantidad',r.cantidad);setVal('mortandadCausa',r.causa);
  setVal('mortandadDesc',r.desc);setVal('mortandadNecropsia',r.necropsia);
  abrirModal('modalMortandad');
}

// ─── ENFERMEDADES ─────────────────────────────────────────────
delegar('enfermedadList','data-action',(action,btn)=>{
  if(action==='editarEnf') editarEnf(btn.dataset.id);
  if(action==='borrarEnf') borrarReg(KEYS.enfermedades,btn.dataset.id,renderEnfermedades);
});
function guardarEnfermedad(){
  const id=val('enfermedadId');
  const archivo=$('enfermedadFoto').files[0];
  const guardar=foto=>{
    const r={id:id||uid(),fecha:val('enfermedadFecha'),loteId:val('enfermedadLote'),nombre:val('enfermedadNombre').trim(),sintomas:val('enfermedadSintomas').trim(),afectadas:parseInt(val('enfermedadAfectadas'))||0,vet:val('enfermedadVet').trim(),tratamiento:val('enfermedadTratamiento').trim(),estado:val('enfermedadEstado'),fechaCierre:val('enfermedadCierre'),notas:val('enfermedadNotas').trim(),foto:foto||(id?(DB.get(KEYS.enfermedades).find(x=>x.id===id)||{}).foto:null),createdAt:today()};
    if(!r.loteId||!r.nombre) return toast('⚠️ Completá lote y nombre');
    const list=DB.get(KEYS.enfermedades);
    if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
    DB.set(KEYS.enfermedades,list);cerrarModal('modalEnfermedad');renderEnfermedades();renderDashboard();toast('✅ Enfermedad registrada');
  };
  if(archivo){const rd=new FileReader();rd.onload=ev=>guardar(ev.target.result);rd.readAsDataURL(archivo);}
  else guardar(null);
}
function renderEnfermedades(){
  const el=$('enfermedadList'); if(!el) return;
  const list=DB.get(KEYS.enfermedades).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=empty('🦠','Sin registros');return;}
  el.innerHTML=list.map(r=>{
    const badge=r.estado==='activa'?'<span class="badge badge-red">Activa</span>':r.estado==='controlada'?'<span class="badge badge-gold">Controlada</span>':'<span class="badge badge-green">Resuelta</span>';
    return `<div class="data-card">
      <div class="data-card-header"><span class="data-card-title">🦠 ${r.nombre}</span>${badge}</div>
      ${r.foto?`<img src="${r.foto}" style="width:100%;border-radius:8px;margin:8px 0;max-height:180px;object-fit:cover">`:''}
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Lote</span><span class="val">${loteNombre(r.loteId)}</span></div>
        <div class="data-field"><span class="lbl">Fecha</span><span class="val">${fmtDate(r.fecha)}</span></div>
        <div class="data-field"><span class="lbl">Aves afect.</span><span class="val">${r.afectadas||'—'}</span></div>
        <div class="data-field"><span class="lbl">Veterinario</span><span class="val">${r.vet||'—'}</span></div>
        <div class="data-field"><span class="lbl">Tratamiento</span><span class="val">${r.tratamiento||'—'}</span></div>
        <div class="data-field"><span class="lbl">Cierre</span><span class="val">${r.fechaCierre?fmtDate(r.fechaCierre):'—'}</span></div>
      </div>
      ${r.sintomas?`<p style="color:var(--text3);font-size:.82rem;margin-top:8px"><strong style="color:var(--text2)">Síntomas:</strong> ${r.sintomas}</p>`:''}
      <div class="data-card-actions">
        <button class="btn-edit"   data-action="editarEnf" data-id="${r.id}">✏️ Editar</button>
        <button class="btn-delete" data-action="borrarEnf" data-id="${r.id}">🗑️</button>
      </div></div>`;
  }).join('');
}
function editarEnf(id){
  const r=DB.get(KEYS.enfermedades).find(x=>x.id===id); if(!r) return;
  fillSelect('enfermedadLote');
  setVal('enfermedadId',r.id);setVal('enfermedadFecha',r.fecha);setVal('enfermedadLote',r.loteId);
  setVal('enfermedadNombre',r.nombre);setVal('enfermedadSintomas',r.sintomas);setVal('enfermedadAfectadas',r.afectadas);
  setVal('enfermedadVet',r.vet);setVal('enfermedadTratamiento',r.tratamiento);setVal('enfermedadEstado',r.estado);
  setVal('enfermedadCierre',r.fechaCierre||'');setVal('enfermedadNotas',r.notas);
  if(r.foto) $('enfermedadFotoPreview').innerHTML=`<img src="${r.foto}">`;
  abrirModal('modalEnfermedad');
}

// ─── NOTAS ────────────────────────────────────────────────────
delegar('notasList','data-action',(action,btn)=>{
  if(action==='borrarNota') borrarReg(KEYS.notas,btn.dataset.id,renderNotas);
});
function guardarNota(){
  const id=val('notaId'), archivo=$('notaFoto').files[0];
  const guardar=foto=>{
    const r={id:id||uid(),fecha:val('notaFecha'),loteId:val('notaLote'),texto:val('notaTexto').trim(),foto:foto||(id?(DB.get(KEYS.notas).find(x=>x.id===id)||{}).foto:null),createdAt:today()};
    if(!r.loteId) return toast('⚠️ Seleccioná un lote');
    const list=DB.get(KEYS.notas);
    if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
    DB.set(KEYS.notas,list);cerrarModal('modalNota');renderNotas();toast('✅ Nota guardada');
  };
  if(archivo){const rd=new FileReader();rd.onload=ev=>guardar(ev.target.result);rd.readAsDataURL(archivo);}
  else guardar(null);
}
function renderNotas(){
  const el=$('notasList'); if(!el) return;
  const list=DB.get(KEYS.notas).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(!list.length){el.innerHTML=empty('📷','Sin notas de campo');return;}
  el.innerHTML=list.map(r=>`<div class="data-card">
    <div class="data-card-header"><span class="data-card-title">📷 ${loteNombre(r.loteId)}</span><span class="data-card-date">${fmtDate(r.fecha)}</span></div>
    ${r.foto?`<img src="${r.foto}" style="width:100%;border-radius:8px;margin:8px 0;max-height:200px;object-fit:cover">`:''}
    ${r.texto?`<p style="color:var(--text2);font-size:.88rem;margin-top:4px">${r.texto}</p>`:''}
    <div class="data-card-actions"><button class="btn-delete" data-action="borrarNota" data-id="${r.id}">🗑️</button></div>
  </div>`).join('');
}

// ─── FÓRMULAS ─────────────────────────────────────────────────
const ETAPAS={recria_inicial:'Recría inicial (1–8 sem.)',recria_media:'Recría media (8–14 sem.)',recria_final:'Recría final (14–18 sem.)',produccion_inicio:'Producción inicio (18–30 sem.)',produccion_pico:'Producción pico (30–50 sem.)',produccion_baja:'Producción baja (50+ sem.)',otra:'Otra'};
delegar('formulasList','data-action',(action,btn)=>{
  if(action==='editarFormula') editarFormula(btn.dataset.id);
  if(action==='borrarFormula') borrarReg(KEYS.formulas,btn.dataset.id,renderFormulas);
});
function guardarFormula(){
  const id=val('formulaId');
  const r={id:id||uid(),nombre:val('formulaNombre').trim(),etapa:val('formulaEtapa'),grAve:parseFloat(val('formulaGrAve'))||0,ingredientes:val('formulaIngredientes').trim(),proteina:val('formulaProteina'),energia:val('formulaEnergia'),calcio:val('formulaCalcio'),proveedor:val('formulaProveedor').trim(),notas:val('formulaNotas').trim(),createdAt:today()};
  if(!r.nombre) return toast('⚠️ Ingresá el nombre');
  const list=DB.get(KEYS.formulas);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.formulas,list);cerrarModal('modalFormula');renderFormulas();toast('✅ Fórmula guardada');
}
function renderFormulas(){
  const el=$('formulasList'); if(!el) return;
  const list=DB.get(KEYS.formulas).slice().sort((a,b)=>a.etapa.localeCompare(b.etapa));
  if(!list.length){el.innerHTML=`<div class="formulas-empty"><div class="empty-icon">🌾</div><p>Sin fórmulas guardadas.</p><p style="font-size:.82rem;margin-top:6px;color:var(--text3)">Guardá las recetas de balanceado por etapa para que los encargados tengan la guía a mano.</p></div>`;return;}
  el.innerHTML=list.map(r=>`<div class="data-card formula-card">
    <div class="data-card-header"><span class="data-card-title">🌾 ${r.nombre}</span><span class="badge badge-gold">${ETAPAS[r.etapa]||r.etapa}</span></div>
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
      <button class="btn-edit"   data-action="editarFormula" data-id="${r.id}">✏️ Editar</button>
      <button class="btn-delete" data-action="borrarFormula" data-id="${r.id}">🗑️</button>
    </div></div>`).join('');
}
function editarFormula(id){
  const r=DB.get(KEYS.formulas).find(x=>x.id===id); if(!r) return;
  setVal('formulaId',r.id);setVal('formulaNombre',r.nombre);setVal('formulaEtapa',r.etapa);
  setVal('formulaGrAve',r.grAve);setVal('formulaIngredientes',r.ingredientes);
  setVal('formulaProteina',r.proteina);setVal('formulaEnergia',r.energia);
  setVal('formulaCalcio',r.calcio);setVal('formulaProveedor',r.proveedor);setVal('formulaNotas',r.notas);
  abrirModal('modalFormula');
}

// ─── HISTORIAL ────────────────────────────────────────────────
function renderHistorialSelector(){
  const lotes=DB.get(KEYS.lotes);
  const sel=$('historialLoteSelect'); if(!sel) return;
  sel.innerHTML=lotes.length?lotes.map(l=>`<option value="${l.id}">${l.nombre} — ${l.galpon||'Sin galpón'}</option>`).join(''):'<option>—</option>';
  if(lotes.length) renderHistorial(lotes[0].id);
}
window.onHistorialChange=()=>{ const id=val('historialLoteSelect'); if(id) renderHistorial(id); };

function renderHistorial(loteId){
  const lote=DB.get(KEYS.lotes).find(l=>l.id===loteId); if(!lote) return;
  const s=semanas(lote.fecha,lote.semanaIngreso);
  const posturas=DB.get(KEYS.postura).filter(p=>p.loteId===loteId);
  const totalH=posturas.reduce((sum,p)=>sum+(parseInt(p.huevos)||0),0);
  const totalM=DB.get(KEYS.mortandad).filter(m=>m.loteId===loteId).reduce((sum,m)=>sum+(parseInt(m.cantidad)||0),0);
  const res=$('historialResumen'); if(!res) return;

  res.innerHTML=`<div class="data-card" style="margin-bottom:14px">
    <div class="data-card-header">
      <span class="data-card-title">${lote.nombre}</span>
      <span class="badge ${lote.etapa==='produccion'?'badge-green':'badge-gold'}">${lote.etapa==='produccion'?'Producción':'Recría'}</span>
    </div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Galpón</span><span class="val">${lote.galpon||'—'}</span></div>
      <div class="data-field"><span class="lbl">Ingreso</span><span class="val">${fmtDate(lote.fecha)}</span></div>
      <div class="data-field"><span class="lbl">Semana actual</span><span class="val" style="color:var(--accent)">${s} sem.</span></div>
      <div class="data-field"><span class="lbl">Aves actuales</span><span class="val">${(parseInt(lote.cantidadActual)||0).toLocaleString('es')}</span></div>
      <div class="data-field"><span class="lbl">Total huevos</span><span class="val" style="color:var(--gold)">${totalH.toLocaleString('es')}</span></div>
      <div class="data-field"><span class="lbl">Mortandad</span><span class="val" style="color:var(--red)">${totalM} aves</span></div>
      ${lote.fechaRuptura?`<div class="data-field" style="grid-column:span 2"><span class="lbl">🥚 Ruptura</span><span class="val" style="color:var(--gold)">${fmtDate(lote.fechaRuptura)} · Sem. ${lote.semanaRuptura}</span></div>`:''}
    </div>
    <div class="data-card-actions">
      <button class="btn-pdf-lote" data-action="pdfLote" data-id="${loteId}">📄 Descargar PDF del Lote</button>
    </div>
  </div>`;

  // Delegation para el botón PDF dentro del resumen
  res.querySelector('[data-action="pdfLote"]').addEventListener('click', ()=>generarPDFLote(loteId));

  const eventos=[];
  const add=(k,icon,fn)=>DB.get(k).filter(r=>r.loteId===loteId).forEach(r=>eventos.push({icon,text:fn(r),fecha:r.fecha||r.createdAt||''}));
  add(KEYS.lotes,       '🐣', r=>`INGRESO: ${r.cantidadInicial} pollitas · ${r.raza||'Sin raza'}`);
  add(KEYS.postura,     '🥚', r=>`Postura: ${r.huevos} huevos${r.maple20||r.maple30?` (${r.maple20||0}×20 + ${r.maple30||0}×30)`:''}`);
  add(KEYS.mortandad,   '💀', r=>`Mortandad: ${r.cantidad} ave(s) — ${r.causa||''}`);
  add(KEYS.vacunacion,  '💉', r=>`Vacuna: ${r.vacuna} · ${r.via||''} · ${r.dosis||''}`);
  add(KEYS.medicacion,  '💊', r=>`Medicación: ${r.nombre} — ${r.motivo||''} (${r.dias||'?'} días)`);
  add(KEYS.alimentacion,'🌾', r=>`Alimento: ${r.kg}kg ${r.tipo||''}`);
  add(KEYS.enfermedades,'🦠', r=>`Enfermedad: ${r.nombre} [${r.estado}]`);
  add(KEYS.notas,       '📷', r=>`Nota: ${r.texto||'(sin texto)'}`);
  eventos.sort((a,b)=>a.fecha<b.fecha?-1:1); // cronológico ascendente

  const evEl=$('historialEventos'); if(!evEl) return;
  evEl.innerHTML=eventos.length
    ?eventos.map(ev=>`<div class="actividad-item"><span style="font-size:1rem">${ev.icon}</span><span class="actividad-text">${ev.text}</span><span class="actividad-time">${fmtDate(ev.fecha)}</span></div>`).join('')
    :'<p style="color:var(--text3);font-size:.85rem;padding:16px 0">Sin eventos para este lote.</p>';
}

// ─── GALPONES ─────────────────────────────────────────────────
function buildGalpones(){
  const lotes=DB.get(KEYS.lotes), post=DB.get(KEYS.postura), med=DB.get(KEYS.medicacion);
  const gmap={};
  lotes.forEach(l=>{
    const g=l.galpon||'Sin galpón';
    if(!gmap[g]) gmap[g]={nombre:g,ponedoras:0,recrias:0,lotes:[],huevosHoy:0,pct:null,pct7:null,medActivos:0};
    const a=parseInt(l.cantidadActual)||0;
    l.etapa==='produccion'?gmap[g].ponedoras+=a:gmap[g].recrias+=a;
    gmap[g].lotes.push(l);
  });
  const hoy=today();
  const u7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];});
  Object.values(gmap).forEach(g=>{
    const ids=g.lotes.map(l=>l.id);
    const hp=post.filter(p=>p.fecha===hoy&&ids.includes(p.loteId));
    g.huevosHoy=hp.reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
    g.pct=g.ponedoras>0&&g.huevosHoy>0?((g.huevosHoy/g.ponedoras)*100).toFixed(1):null;
    const p7=post.filter(p=>u7.includes(p.fecha)&&ids.includes(p.loteId));
    g.pct7=g.ponedoras>0&&p7.length?((p7.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(g.ponedoras*7))*100).toFixed(1):null;
    g.medActivos=med.filter(m=>{if(!ids.includes(m.loteId))return false;const f=new Date(m.fecha);f.setDate(f.getDate()+(parseInt(m.dias)||0));return new Date()<=f;}).length;
  });
  return Object.values(gmap);
}

delegar('galponCards','data-action',(action,btn)=>{
  if(action==='pdfGalpon') generarPDFGalpon(btn.dataset.nombre);
});

function renderGalpones(){
  const el=$('galponCards'); if(!el) return;
  const list=buildGalpones();
  if(!list.length){el.innerHTML=empty('🏚️','Sin galpones. Registrá lotes con galpón asignado.');return;}
  el.innerHTML=list.map(g=>{
    const pN=g.pct?parseFloat(g.pct):0;
    const bc=pN>=80?'var(--accent)':pN>=60?'var(--gold)':'var(--red)';
    return `<div class="galpon-card-full">
      <div class="galpon-card-header">
        <div class="galpon-card-title">
          <span class="galpon-icon-big">🏚️</span>
          <div><div class="galpon-nombre-big">${g.nombre}</div><div class="galpon-sub">${g.lotes.length} lote(s) · ${(g.ponedoras+g.recrias).toLocaleString('es')} aves</div></div>
        </div>
        <button class="btn-pdf-galpon" data-action="pdfGalpon" data-nombre="${g.nombre}">📄 PDF</button>
      </div>
      <div class="galpon-stats-full">
        <div class="galpon-stat-big"><span class="gsb-val" style="color:var(--accent)">${g.ponedoras.toLocaleString('es')}</span><span class="gsb-lbl">🥚 Ponedoras</span></div>
        <div class="galpon-stat-big"><span class="gsb-val" style="color:var(--gold)">${g.recrias.toLocaleString('es')}</span><span class="gsb-lbl">🐣 Recría</span></div>
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
          <span style="color:var(--text3);font-size:.82rem">${(parseInt(l.cantidadActual)||0).toLocaleString('es')} aves · Sem. ${semanas(l.fecha,l.semanaIngreso)}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

// ─── BORRAR GENÉRICO ─────────────────────────────────────────
function borrarReg(key,id,rerenderFn){
  if(!confirm('¿Eliminar este registro?')) return;
  DB.set(key, DB.get(key).filter(x=>x.id!==id));
  rerenderFn();
  if([KEYS.mortandad,KEYS.lotes,KEYS.vacunacion,KEYS.medicacion,KEYS.enfermedades].includes(key)) renderDashboard();
  toast('🗑️ Eliminado');
}

// ─── BACKUP JSON ─────────────────────────────────────────────
function wireBackupButtons(){
  const btnBk=$('btnBackup');
  if(btnBk) btnBk.addEventListener('click',(e)=>{ e.stopPropagation();
    const data={};Object.values(KEYS).forEach(k=>{data[k]=DB.get(k);});
    data._v=3;data._fecha=new Date().toISOString();
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download=`hinse-backup-${today()}.json`;a.click();
    toast('💾 Backup descargado');
  });
  const btnRest=$('btnRestore');
  const fileRest=$('fileRestore');
  if(btnRest) btnRest.addEventListener('click',()=>fileRest.click());
  if(fileRest) fileRest.addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const rd=new FileReader();
    rd.onload=ev=>{
      try{const d=JSON.parse(ev.target.result);if(!confirm('¿Restaurar backup?'))return;Object.values(KEYS).forEach(k=>{if(d[k])DB.set(k,d[k]);});toast('📂 Restaurado');setTimeout(()=>location.reload(),800);}
      catch{toast('❌ Archivo inválido');}
    };
    rd.readAsText(f);e.target.value='';
  });
}

// ─── EXCEL ────────────────────────────────────────────────────
function exportCSV(key,nombre){
  const list=DB.get(key);if(!list.length)return toast('⚠️ Sin datos');
  const lotes=DB.get(KEYS.lotes);
  const rows=list.map(r=>({...r,loteNombre:lotes.find(x=>x.id===r.loteId)?.nombre||''}));
  const cols=Object.keys(rows[0]);
  const csv=[cols.join(','),...rows.map(r=>cols.map(c=>`"${String(r[c]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download=`hinse-${nombre}-${today()}.csv`;a.click();toast('📊 CSV exportado');
}
function exportarExcel(){
  const lotes=DB.get(KEYS.lotes);
  const getLote=id=>lotes.find(x=>x.id===id)?.nombre||'';
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const hS='background:#a86828;color:#fff;font-weight:bold;padding:6px 10px;border:1px solid #c8853a;';
  const rS=i=>i%2===0?'background:#fdf4e8;':'background:#fff8f0;';
  const cS='padding:5px 10px;border:1px solid #e8d0a8;';
  const tbl=(title,headers,rows)=>{
    const h=headers.map(x=>`<th style="${hS}">${esc(x)}</th>`).join('');
    const b=rows.map((row,i)=>`<tr style="${rS(i)}">${row.map(c=>`<td style="${cS}">${esc(c)}</td>`).join('')}</tr>`).join('');
    return `<h2 style="font-family:Georgia,serif;color:#6b3e1e;border-bottom:3px solid #c8853a;padding-bottom:6px;margin:24px 0 10px">${title}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:30px"><thead><tr>${h}</tr></thead><tbody>${b||`<tr><td colspan="${headers.length}" style="${cS}color:#aaa;font-style:italic">Sin datos</td></tr>`}</tbody></table>`;
  };
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;margin:30px;background:#fffdf8;}.cover{background:linear-gradient(135deg,#6b3e1e,#a86828,#d4a043);color:#fff;padding:30px;border-radius:12px;margin-bottom:30px;text-align:center;}.cover h1{font-size:2rem;margin:0;}.cover p{margin:8px 0 0;opacity:.85;}</style></head><body>
  <div class="cover"><h1>🐔 HINSE — GRANJA AVÍCOLA</h1><p>Backup · ${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div>
  ${tbl('🐣 LOTES',['Nombre','Galpón','Etapa','Ingreso','Inicial','Actual','Semana','Raza','Procedencia','Ruptura'],lotes.slice().reverse().map(l=>[l.nombre,l.galpon||'',l.etapa==='produccion'?'Producción':'Recría',fmtDate(l.fecha),l.cantidadInicial,l.cantidadActual,semanas(l.fecha,l.semanaIngreso)+' sem.',l.raza||'',l.procedencia||'',l.fechaRuptura?fmtDate(l.fechaRuptura):'']))}
  ${tbl('🥚 POSTURA',['Fecha','Lote','Total','Rotos','Netos','Maple×20','Maple×30','Sueltos','Notas'],DB.get(KEYS.postura).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(p=>[fmtDate(p.fecha),getLote(p.loteId),p.huevos,p.rotos,(p.huevos-p.rotos),p.maple20||0,p.maple30||0,p.sueltos||0,p.notas||'']))}
  ${tbl('💀 MORTANDAD',['Fecha','Lote','Cantidad','Causa','Necropsia','Descripción'],DB.get(KEYS.mortandad).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>[fmtDate(m.fecha),getLote(m.loteId),m.cantidad,causas[m.causa]||m.causa,m.necropsia,m.desc||'']))}
  ${tbl('💉 VACUNACIÓN',['Fecha','Lote','Vacuna','Vía','Dosis','Aplicador','Próxima'],DB.get(KEYS.vacunacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(v=>[fmtDate(v.fecha),getLote(v.loteId),v.vacuna,v.via,v.dosis||'',v.aplicador||'',v.proximaFecha?fmtDate(v.proximaFecha):'']))}
  ${tbl('💊 MEDICACIÓN',['Fecha','Lote','Medicamento','Motivo','Dosis','Días','Veterinario'],DB.get(KEYS.medicacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>[fmtDate(m.fecha),getLote(m.loteId),m.nombre,m.motivo||'',m.dosis||'',m.dias||'',m.vet||'']))}
  ${tbl('🌾 ALIMENTACIÓN',['Fecha','Lote','Tipo','Kg','g/ave/día','Proveedor','Costo'],DB.get(KEYS.alimentacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>[fmtDate(r.fecha),getLote(r.loteId),r.tipo||'',r.kg,r.grAve||'',r.proveedor||'',r.costo?'$'+r.costo:'']))}
  ${tbl('🦠 ENFERMEDADES',['Fecha','Lote','Nombre','Estado','Aves','Vet.','Tratamiento','Cierre'],DB.get(KEYS.enfermedades).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(e=>[fmtDate(e.fecha),getLote(e.loteId),e.nombre,e.estado,e.afectadas||'',e.vet||'',e.tratamiento||'',e.fechaCierre?fmtDate(e.fechaCierre):'']))}
  ${tbl('🌾 FÓRMULAS',['Nombre','Etapa','g/ave/día','Proteína%','kcal/kg','Calcio%','Proveedor'],DB.get(KEYS.formulas).map(f=>[f.nombre,ETAPAS[f.etapa]||f.etapa,f.grAve||'',f.proteina||'',f.energia||'',f.calcio||'',f.proveedor||'']))}
  </body></html>`;
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'}));
  a.download=`hinse-backup-${today()}.xls`;a.click();toast('📊 Excel descargado');
}

// ─── PDF HELPERS ─────────────────────────────────────────────
function pdfHeader(titulo,sub){
  const f=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const h=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  return `<div class="pdf-header"><div class="pdf-logo-area"><div class="pdf-logo-icon">🐔</div><div><div class="pdf-logo-name">HINSE</div><div class="pdf-logo-sub">GRANJA AVÍCOLA</div></div></div><div class="pdf-header-right"><div class="pdf-report-title">${titulo}</div><div class="pdf-report-date">${sub||f}</div><div class="pdf-report-time">${h} hs</div></div></div>`;
}
function pdfFooter(){
  const f=new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});
  const h=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  return `<div class="pdf-footer"><span>Granja Hinse · Sistema de Control Avícola</span><span>Generado: ${f} ${h} hs</span><span>Confidencial — Uso interno</span></div>`;
}
function mostrarPDF(html){
  $('pdfContent').innerHTML=html;
  $('pdfOverlay').classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function cerrarPDF(){
  $('pdfOverlay').classList.add('hidden');
  document.body.style.overflow='';
}

// ─── PDF DASHBOARD ────────────────────────────────────────────
function generarPDFDash(){
  const lotes=DB.get(KEYS.lotes), mort=DB.get(KEYS.mortandad);
  const vac=DB.get(KEYS.vacunacion), med=DB.get(KEYS.medicacion);
  const post=DB.get(KEYS.postura), enf=DB.get(KEYS.enfermedades);
  const pon=lotes.filter(l=>l.etapa==='produccion').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const rec=lotes.filter(l=>l.etapa==='recria').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const bajas=mort.reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const u7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];});
  const hoyH=post.filter(p=>p.fecha===today()).reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const p7=post.filter(p=>u7.includes(p.fecha));
  const pct7=pon>0&&p7.length?((p7.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(pon*7))*100).toFixed(1):null;
  const enferAct=enf.filter(e=>e.estado==='activa');
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const vacProx=vac.filter(v=>{if(!v.proximaFecha)return false;const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);const df=Math.ceil((d-hoy)/864e5);return df>=0&&df<=14;}).map(v=>{const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);return{...v,dias:Math.ceil((d-hoy)/864e5)};});
  const medAct=med.filter(m=>{const f=new Date(m.fecha);f.setDate(f.getDate()+(parseInt(m.dias)||0));return new Date()<=f;});
  const ultPost=lotes.filter(l=>l.etapa==='produccion').map(l=>{const ps=post.filter(p=>p.loteId===l.id).sort((a,b)=>b.fecha.localeCompare(a.fecha));const last=ps[0];const a=parseInt(l.cantidadActual)||0;const pct=last&&a>0?((parseInt(last.huevos)/a)*100).toFixed(1):null;return{lote:l,last,pct};});

  mostrarPDF(`<div class="pdf-page">
    ${pdfHeader('INFORME DE PRODUCCIÓN')}
    <div class="pdf-kpi-strip">
      <div class="pdf-kpi" style="border-color:#c8853a"><div class="pdf-kpi-icon">🐔</div><div class="pdf-kpi-val">${(pon+rec).toLocaleString('es')}</div><div class="pdf-kpi-lbl">Total Aves</div></div>
      <div class="pdf-kpi" style="border-color:#d4a043"><div class="pdf-kpi-icon">🥚</div><div class="pdf-kpi-val">${hoyH.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Huevos Hoy</div></div>
      <div class="pdf-kpi" style="border-color:#7a9ab5"><div class="pdf-kpi-icon">📈</div><div class="pdf-kpi-val">${pct7?pct7+'%':'—'}</div><div class="pdf-kpi-lbl">% Postura 7d</div></div>
      <div class="pdf-kpi" style="border-color:#c05050"><div class="pdf-kpi-icon">💀</div><div class="pdf-kpi-val">${bajas.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Mortandad</div></div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#c8853a,#a86828)"><span>🐣 LOTES</span><span>${lotes.length}</span></div>
        ${lotes.length?lotes.map(l=>{const s=semanas(l.fecha,l.semanaIngreso);return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${l.nombre}</span><span class="pdf-badge ${l.etapa==='produccion'?'pdf-badge-green':'pdf-badge-gold'}">${l.etapa==='produccion'?'Producción':'Recría'}</span></div><div class="pdf-row-detail">${l.galpon||'Sin galpón'} · ${(parseInt(l.cantidadActual)||0).toLocaleString('es')} aves · Sem. ${s}</div></div>`;}).join(''):'<div class="pdf-empty">Sin lotes</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#d4a043,#a86828)"><span>🥚 POSTURA POR LOTE</span></div>
        ${ultPost.length?ultPost.map(({lote,last,pct})=>{const pN=pct?parseFloat(pct):0;const bc=pN>=80?'#c8853a':pN>=60?'#d4a043':'#c05050';return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${lote.nombre}</span><span style="font-weight:700;color:${bc}">${pct?pct+'%':'—'}</span></div>${last?`<div class="pdf-row-detail">${fmtDate(last.fecha)} · ${last.huevos} huevos</div>`:'<div class="pdf-row-detail" style="color:#c05050">Sin registros</div>'}${pct?`<div class="pdf-mini-bar"><div style="width:${Math.min(pN,100)}%;background:${bc}"></div></div>`:''}</div>`;}).join(''):'<div class="pdf-empty">Sin lotes en producción</div>'}
      </div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a9ab5,#4a6a8a)"><span>💉 VACUNAS PRÓXIMAS</span><span>${vacProx.length}</span></div>
        ${vacProx.length?vacProx.map(v=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${v.vacuna}</span><span class="pdf-badge ${v.dias<=3?'pdf-badge-red':'pdf-badge-blue'}">En ${v.dias}d</span></div><div class="pdf-row-detail">${loteNombre(v.loteId)}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin vacunas próximas</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#6a8a6a,#4a6a4a)"><span>💊 TRATAMIENTOS ACTIVOS</span><span>${medAct.length}</span></div>
        ${medAct.length?medAct.map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${m.nombre}</span><span class="pdf-badge pdf-badge-blue">${m.dias||'?'}d</span></div><div class="pdf-row-detail">${loteNombre(m.loteId)}${m.motivo?' · '+m.motivo:''}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin tratamientos</div>'}
      </div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#8a5a3a,#6b3e1e)"><span>🦠 ENFERMEDADES ACTIVAS</span><span>${enferAct.length}</span></div>
        ${enferAct.length?enferAct.map(e=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${e.nombre}</span><span class="pdf-badge pdf-badge-red">Activa</span></div><div class="pdf-row-detail">${loteNombre(e.loteId)}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin enfermedades activas</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a3a3a,#5a2a2a)"><span>💀 MORTANDAD RECIENTE</span></div>
        ${mort.length?mort.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,4).map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:#c05050">🪦 ${m.cantidad} ave(s)</span><span style="color:#8a6848;font-size:.82rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${loteNombre(m.loteId)} · ${m.causa||'—'}</div></div>`).join(''):'<div class="pdf-empty">Sin registros</div>'}
      </div>
    </div>
    ${pdfFooter()}
  </div>`);
}

// ─── PDF LOTE ─────────────────────────────────────────────────
function generarPDFLote(loteId){
  const lote=DB.get(KEYS.lotes).find(l=>l.id===loteId); if(!lote) return;
  const s=semanas(lote.fecha,lote.semanaIngreso);
  const post=DB.get(KEYS.postura).filter(p=>p.loteId===loteId).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const mort=DB.get(KEYS.mortandad).filter(m=>m.loteId===loteId).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const vac=DB.get(KEYS.vacunacion).filter(v=>v.loteId===loteId).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const med=DB.get(KEYS.medicacion).filter(m=>m.loteId===loteId).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const alim=DB.get(KEYS.alimentacion).filter(a=>a.loteId===loteId).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const enf=DB.get(KEYS.enfermedades).filter(e=>e.loteId===loteId).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const notas=DB.get(KEYS.notas).filter(n=>n.loteId===loteId&&n.foto).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const aves=parseInt(lote.cantidadActual)||0;
  const totalH=post.reduce((sum,p)=>sum+(parseInt(p.huevos)||0),0);
  const totalM=mort.reduce((sum,m)=>sum+(parseInt(m.cantidad)||0),0);
  const totalKg=alim.reduce((sum,a)=>sum+(parseFloat(a.kg)||0),0);
  const pctProm=post.length&&aves>0?((post.reduce((sum,p)=>sum+(parseInt(p.huevos)||0),0)/(aves*post.length))*100).toFixed(1):null;
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};
  const viaMap={agua:'Agua de bebida',ocular:'Ocular',nasal:'Nasal',inyectable:'Inyectable',spray:'Spray',ala:'Punción alar'};

  mostrarPDF(`<div class="pdf-page">
    ${pdfHeader('HISTORIAL COMPLETO DE LOTE', lote.nombre+' · '+(lote.galpon||'Sin galpón'))}

    <div class="pdf-lote-banner">
      <div class="pdf-lote-banner-left">
        <div class="pdf-lote-nombre">${lote.nombre}</div>
        <div class="pdf-lote-detalle">${lote.galpon||'Sin galpón'} · Semana ${s} · ${lote.raza||'Raza no especificada'}</div>
        <div class="pdf-lote-detalle" style="margin-top:3px">Ingreso: ${fmtDate(lote.fecha)} · Aves iniciales: ${(parseInt(lote.cantidadInicial)||0).toLocaleString('es')} · Actuales: ${aves.toLocaleString('es')}</div>
        ${lote.fechaRuptura?`<div class="pdf-lote-ruptura">🥚 Ruptura de postura: ${fmtDate(lote.fechaRuptura)} — Sem. ${lote.semanaRuptura}</div>`:''}
        ${lote.procedencia?`<div class="pdf-lote-detalle" style="margin-top:3px">Procedencia: ${lote.procedencia}</div>`:''}
      </div>
      <div class="pdf-lote-badge-etapa ${lote.etapa==='produccion'?'prod':'recria'}">${lote.etapa==='produccion'?'PRODUCCIÓN':'RECRÍA'}</div>
    </div>

    <div class="pdf-kpi-strip" style="grid-template-columns:repeat(5,1fr)">
      <div class="pdf-kpi" style="border-color:#c8853a"><div class="pdf-kpi-icon">🐔</div><div class="pdf-kpi-val">${aves.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Aves actuales</div></div>
      <div class="pdf-kpi" style="border-color:#d4a043"><div class="pdf-kpi-icon">🥚</div><div class="pdf-kpi-val">${totalH.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Total huevos</div></div>
      <div class="pdf-kpi" style="border-color:#7a9ab5"><div class="pdf-kpi-icon">📈</div><div class="pdf-kpi-val">${pctProm?pctProm+'%':'—'}</div><div class="pdf-kpi-lbl">% Postura prom.</div></div>
      <div class="pdf-kpi" style="border-color:#c05050"><div class="pdf-kpi-icon">💀</div><div class="pdf-kpi-val">${totalM.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Mortandad total</div></div>
      <div class="pdf-kpi" style="border-color:#8a5a3a"><div class="pdf-kpi-icon">🌾</div><div class="pdf-kpi-val">${totalKg.toLocaleString('es')} kg</div><div class="pdf-kpi-lbl">Alimento total</div></div>
    </div>

    <!-- POSTURA + MORTANDAD -->
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#d4a043,#a86828)"><span>🥚 POSTURA COMPLETA</span><span>${post.length} registros</span></div>
        ${post.length?post.slice().reverse().slice(0,20).map(p=>{const pN=aves>0?((parseInt(p.huevos)/aves)*100):0;const bc=pN>=80?'#c8853a':pN>=60?'#d4a043':'#c05050';return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:${bc}">${p.huevos} huevos (${pN.toFixed(1)}%)</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(p.fecha)}</span></div>${p.maple20||p.maple30?`<div class="pdf-row-detail">${p.maple20||0}×20 + ${p.maple30||0}×30${p.sueltos?' + '+p.sueltos+' sueltos':''}</div>`:''}${pN>0?`<div class="pdf-mini-bar"><div style="width:${Math.min(pN,100)}%;background:${bc}"></div></div>`:''}</div>`;}).join('')+(post.length>20?`<div class="pdf-empty">... y ${post.length-20} registros más</div>`:''): '<div class="pdf-empty">Sin registros de postura</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a3a3a,#5a2a2a)"><span>💀 MORTANDAD</span><span>${totalM} aves · ${mort.length} eventos</span></div>
        ${mort.length?mort.slice().reverse().map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:#c05050">🪦 ${m.cantidad} ave(s)</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${causas[m.causa]||m.causa}${m.necropsia==='si'?' · ✅ Necropsia':m.necropsia==='pendiente'?' · ⏳ Necropsia pend.':''}</div>${m.desc?`<div class="pdf-row-detail" style="font-style:italic">${m.desc}</div>`:''}</div>`).join(''):'<div class="pdf-empty">Sin registros de mortandad</div>'}
      </div>
    </div>

    <!-- VACUNACIÓN -->
    <div class="pdf-section pdf-section-full">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a9ab5,#4a6a8a)"><span>💉 VACUNACIÓN COMPLETA</span><span>${vac.length} aplicaciones</span></div>
      ${vac.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0">
        ${vac.map(v=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${v.vacuna}</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(v.fecha)}</span></div><div class="pdf-row-detail">${viaMap[v.via]||v.via||'—'} · ${v.dosis||'—'}${v.aplicador?' · '+v.aplicador:''}${v.proximaFecha?' · Próx: '+fmtDate(v.proximaFecha):''}</div></div>`).join('')}
      </div>`:'<div class="pdf-empty">Sin registros de vacunación</div>'}
    </div>

    <!-- MEDICACIÓN -->
    <div class="pdf-section pdf-section-full">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#6a8a6a,#4a6a4a)"><span>💊 MEDICACIÓN COMPLETA</span><span>${med.length} tratamientos</span></div>
      ${med.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0">
        ${med.map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${m.nombre}</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${m.motivo||'—'} · ${m.dosis||'—'} · ${m.dias||'?'} días${m.vet?' · '+m.vet:''}</div></div>`).join('')}
      </div>`:'<div class="pdf-empty">Sin registros de medicación</div>'}
    </div>

    <!-- ENFERMEDADES -->
    ${enf.length?`<div class="pdf-section pdf-section-full">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#8a5a3a,#6b3e1e)"><span>🦠 ENFERMEDADES</span><span>${enf.length} registros</span></div>
      ${enf.map(e=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">🦠 ${e.nombre}</span><span class="pdf-badge ${e.estado==='activa'?'pdf-badge-red':e.estado==='controlada'?'pdf-badge-gold':'pdf-badge-green'}">${e.estado}</span></div><div class="pdf-row-detail">${fmtDate(e.fecha)} · Aves: ${e.afectadas||'—'}${e.vet?' · Vet: '+e.vet:''}${e.fechaCierre?' · Cierre: '+fmtDate(e.fechaCierre):''}</div>${e.tratamiento?`<div class="pdf-row-detail" style="color:#6b3e1e">Trat: ${e.tratamiento}</div>`:''}${e.sintomas?`<div class="pdf-row-detail" style="font-style:italic">Sínt: ${e.sintomas}</div>`:''}</div>`).join('')}
    </div>`:''}

    <!-- ALIMENTACIÓN -->
    ${alim.length?`<div class="pdf-section pdf-section-full">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#6b5a2a,#4a3a18)"><span>🌾 ALIMENTACIÓN · Total: ${totalKg.toLocaleString('es')} kg</span></div>
      ${alim.slice().reverse().slice(0,15).map(a=>`<div class="pdf-row" style="display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:8px;align-items:center"><span style="color:#8a6848;font-size:.78rem">${fmtDate(a.fecha)}</span><span style="font-weight:600">${a.tipo||'Alimento'}</span><span>${a.kg} kg</span><span style="color:#a86828">${a.costo?'$'+a.costo:''}</span></div>`).join('')}
    </div>`:''}

    <!-- FOTOS -->
    ${notas.length?`<div class="pdf-section pdf-section-full">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#5a4a3a,#3a2a1a)"><span>📷 FOTOS DE CAMPO</span><span>${notas.length}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding:14px">
        ${notas.map(n=>`<div><img src="${n.foto}" style="width:100%;border-radius:8px;max-height:140px;object-fit:cover"><p style="font-size:.75rem;color:#8a6848;margin-top:4px">${fmtDate(n.fecha)}${n.texto?' — '+n.texto.slice(0,50):''}</p></div>`).join('')}
      </div>
    </div>`:''}

    ${pdfFooter()}
  </div>`);
}

// ─── PDF GALPÓN ───────────────────────────────────────────────
function generarPDFGalpon(nombreGalpon){
  const list=buildGalpones();
  const g=list.find(x=>x.nombre===nombreGalpon);
  if(!g){toast('⚠️ Galpón no encontrado');return;}
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
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const vacProx=vac.filter(v=>{if(!v.proximaFecha)return false;const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);const df=Math.ceil((d-hoy)/864e5);return df>=0&&df<=14;}).map(v=>{const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);return{...v,dias:Math.ceil((d-hoy)/864e5)};});
  const medAct=med.filter(m=>{const f=new Date(m.fecha);f.setDate(f.getDate()+(parseInt(m.dias)||0));return new Date()<=f;});
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};

  mostrarPDF(`<div class="pdf-page">
    ${pdfHeader('ESTADO DE GALPÓN', g.nombre)}
    <div class="pdf-lote-banner" style="background:linear-gradient(135deg,#fff8f0,#fdf0d8);border-color:#c8853a">
      <div class="pdf-lote-banner-left">
        <div class="pdf-lote-nombre">🏚️ ${g.nombre}</div>
        <div class="pdf-lote-detalle">${g.lotes.length} lote(s) · ${(g.ponedoras+g.recrias).toLocaleString('es')} aves totales</div>
        <div class="pdf-lote-detalle" style="margin-top:3px">🥚 ${g.ponedoras.toLocaleString('es')} ponedoras · 🐣 ${g.recrias.toLocaleString('es')} en recría</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:2rem;font-weight:700;color:${bc}">${g.pct?g.pct+'%':'—'}</div>
        <div style="font-size:.75rem;color:#8a6848;text-transform:uppercase;letter-spacing:.06em">% Postura hoy</div>
        ${g.pct7?`<div style="font-size:.85rem;color:#a86828;margin-top:3px">Prom 7d: ${g.pct7}%</div>`:''}
      </div>
    </div>
    <div class="pdf-kpi-strip" style="grid-template-columns:repeat(5,1fr)">
      <div class="pdf-kpi" style="border-color:#c8853a"><div class="pdf-kpi-icon">🐔</div><div class="pdf-kpi-val">${(g.ponedoras+g.recrias).toLocaleString('es')}</div><div class="pdf-kpi-lbl">Total Aves</div></div>
      <div class="pdf-kpi" style="border-color:#d4a043"><div class="pdf-kpi-icon">🥚</div><div class="pdf-kpi-val">${g.huevosHoy.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Huevos Hoy</div></div>
      <div class="pdf-kpi" style="border-color:${bc}"><div class="pdf-kpi-icon">📈</div><div class="pdf-kpi-val">${g.pct7?g.pct7+'%':'—'}</div><div class="pdf-kpi-lbl">% Postura 7d</div></div>
      <div class="pdf-kpi" style="border-color:#c05050"><div class="pdf-kpi-icon">💀</div><div class="pdf-kpi-val">${totalM.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Mortandad</div></div>
      <div class="pdf-kpi" style="border-color:#7a9ab5"><div class="pdf-kpi-icon">💊</div><div class="pdf-kpi-val">${medAct.length}</div><div class="pdf-kpi-lbl">Trat. Activos</div></div>
    </div>
    <div class="pdf-section pdf-section-full" style="margin-bottom:14px">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#c8853a,#a86828)"><span>🐣 LOTES EN ESTE GALPÓN</span><span>${g.lotes.length}</span></div>
      ${g.lotes.map(l=>{const s2=semanas(l.fecha,l.semanaIngreso);const ps=post.filter(p=>p.loteId===l.id);const lastP=ps[0];const aves2=parseInt(l.cantidadActual)||0;const pctL=lastP&&aves2>0?((parseInt(lastP.huevos)/aves2)*100).toFixed(1):null;const bcL=pctL?parseFloat(pctL)>=80?'#c8853a':parseFloat(pctL)>=60?'#d4a043':'#c05050':'#8a6848';return`<div class="pdf-row" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;align-items:center"><div><span style="font-weight:700">${l.nombre}</span><span class="pdf-badge ${l.etapa==='produccion'?'pdf-badge-green':'pdf-badge-gold'}" style="margin-left:6px">${l.etapa==='produccion'?'Producción':'Recría'}</span></div><span style="color:#8a6848;font-size:.82rem">Sem. ${s2}</span><span style="font-weight:600">${aves2.toLocaleString('es')} aves</span><span style="font-weight:700;color:${bcL}">${pctL?pctL+'%':'—'}</span><span style="color:#8a6848;font-size:.78rem">${lastP?fmtDate(lastP.fecha):'Sin postura'}</span></div>`;}).join('')}
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#d4a043,#a86828)"><span>🥚 POSTURA RECIENTE</span><span>${totalH.toLocaleString('es')} total</span></div>
        ${post.length?post.slice(0,12).map(p=>{const lNom=loteNombre(p.loteId);const lo=DB.get(KEYS.lotes).find(l=>l.id===p.loteId);const av=lo?(parseInt(lo.cantidadActual)||0):0;const pN2=av>0?((p.huevos/av)*100):0;const bc2=pN2>=80?'#c8853a':pN2>=60?'#d4a043':'#c05050';return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:${bc2}">${p.huevos} huevos (${pN2.toFixed(1)}%)</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(p.fecha)}</span></div><div class="pdf-row-detail">${lNom}</div>${pN2>0?`<div class="pdf-mini-bar"><div style="width:${Math.min(pN2,100)}%;background:${bc2}"></div></div>`:''}</div>`;}).join('')+(post.length>12?`<div class="pdf-empty">... y ${post.length-12} más</div>`:''): '<div class="pdf-empty">Sin registros</div>'}
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="pdf-section">
          <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a9ab5,#4a6a8a)"><span>💉 VACUNAS PRÓXIMAS</span><span>${vacProx.length}</span></div>
          ${vacProx.length?vacProx.map(v=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${v.vacuna}</span><span class="pdf-badge ${v.dias<=3?'pdf-badge-red':'pdf-badge-blue'}">En ${v.dias}d</span></div><div class="pdf-row-detail">${loteNombre(v.loteId)}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin vacunas próximas</div>'}
        </div>
        <div class="pdf-section">
          <div class="pdf-section-header" style="background:linear-gradient(135deg,#6a8a6a,#4a6a4a)"><span>💊 TRATAMIENTOS ACTIVOS</span><span>${medAct.length}</span></div>
          ${medAct.length?medAct.map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${m.nombre}</span><span class="pdf-badge pdf-badge-blue">${m.dias||'?'}d</span></div><div class="pdf-row-detail">${loteNombre(m.loteId)}${m.motivo?' · '+m.motivo:''}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin tratamientos</div>'}
        </div>
        ${enf.length?`<div class="pdf-section"><div class="pdf-section-header" style="background:linear-gradient(135deg,#8a5a3a,#6b3e1e)"><span>🦠 ENFERMEDADES ACTIVAS</span><span>${enf.length}</span></div>${enf.map(e=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${e.nombre}</span><span class="pdf-badge pdf-badge-red">Activa</span></div><div class="pdf-row-detail">${loteNombre(e.loteId)}</div></div>`).join('')}</div>`:''}
        ${mort.length?`<div class="pdf-section"><div class="pdf-section-header" style="background:linear-gradient(135deg,#7a3a3a,#5a2a2a)"><span>💀 MORTANDAD RECIENTE</span><span>${totalM} aves</span></div>${mort.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,5).map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:#c05050">🪦 ${m.cantidad}</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${loteNombre(m.loteId)} · ${causas[m.causa]||m.causa}</div></div>`).join('')}</div>`:''}
      </div>
    </div>
    ${pdfFooter()}
  </div>`);
}

// ─── SW ───────────────────────────────────────────────────────
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}