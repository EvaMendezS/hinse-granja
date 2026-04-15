/* ============================================================
   Hinse — Granja Avícola v3.0
   ============================================================ */
'use strict';

// ─── STORAGE ─────────────────────────────────────────────────
const DB = {
  get(key)      { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
};
const KEYS = {
  lotes:'hinse_lotes', postura:'hinse_postura', alimentacion:'hinse_alimentacion',
  vacunacion:'hinse_vacunacion', medicacion:'hinse_medicacion', mortandad:'hinse_mortandad',
  enfermedades:'hinse_enfermedades', notas:'hinse_notas',
};

// ─── UTILS ───────────────────────────────────────────────────
const uid     = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmtDate = d => { if(!d) return '—'; const [y,m,dia]=d.split('-'); return `${dia}/${m}/${y}`; };
const today   = () => new Date().toISOString().split('T')[0];
const MAPLE20 = 20; const MAPLE30 = 30;

function semanasDesde(fechaISO, base=0) {
  if(!fechaISO) return parseInt(base)||0;
  return Math.floor((Date.now()-new Date(fechaISO).getTime())/(7*24*3600*1000))+(parseInt(base)||0);
}
function showToast(msg,ms=2400){
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.remove('hidden');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add('hidden'),ms);
}

// ─── SPLASH ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    document.getElementById('splash').style.opacity='0';
    setTimeout(()=>{
      document.getElementById('splash').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      init();
    },500);
  },2000);
});

// ─── INIT ─────────────────────────────────────────────────────
function init(){
  setupNav();
  setupBackup();
  setupPDF();
  populateDashDate();
  renderDashboard();
  renderLote(); renderPostura(); renderAlimentacion();
  renderVacunacion(); renderMedicacion(); renderMortandad();
  renderEnfermedades(); renderNotas();
  document.querySelectorAll('input[type="date"]').forEach(i=>{ if(!i.value) i.value=today(); });

  // Postura: listeners para cálculo automático por maple
  ['posturaMaple20','posturaMaple30','posturaHuevosSueltos','posturaLote'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('input', calcPosturaTotal);
    if(el) el.addEventListener('change', calcPosturaTotal);
  });

  // Foto enfermedad preview
  document.getElementById('enfermedadFoto').addEventListener('change',function(){
    const p=document.getElementById('enfermedadFotoPreview');
    if(this.files[0]){const r=new FileReader();r.onload=ev=>{p.innerHTML=`<img src="${ev.target.result}">`;};r.readAsDataURL(this.files[0]);}
  });
  // Foto nota preview
  document.getElementById('notaFoto').addEventListener('change',function(){
    const p=document.getElementById('notaFotoPreview');
    if(this.files[0]){const r=new FileReader();r.onload=ev=>{p.innerHTML=`<img src="${ev.target.result}">`;};r.readAsDataURL(this.files[0]);}
  });
}

// ─── POSTURA: CÁLCULO POR MAPLE ──────────────────────────────
function calcPosturaTotal(){
  const m20  = parseInt(document.getElementById('posturaMaple20').value)||0;
  const m30  = parseInt(document.getElementById('posturaMaple30').value)||0;
  const suel = parseInt(document.getElementById('posturaHuevosSueltos').value)||0;
  const total= m20*MAPLE20 + m30*MAPLE30 + suel;
  document.getElementById('posturaHuevosTotal').value = total;

  // % automático
  const loteId=document.getElementById('posturaLote').value;
  const lote=DB.get(KEYS.lotes).find(l=>l.id===loteId);
  const aves=lote?(parseInt(lote.cantidadActual)||0):0;
  document.getElementById('posturaPorc').value = aves>0&&total>0
    ? `${((total/aves)*100).toFixed(1)}%`
    : aves===0?'— (sin lote)':'0.0%';
}

// ─── NAV ─────────────────────────────────────────────────────
let _masOpen=false;
function setupNav(){
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      navigateTo(btn.dataset.view);
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      cerrarMasMenu();
    });
  });
  document.getElementById('navMasBtn').addEventListener('click',e=>{
    e.stopPropagation();
    _masOpen=!_masOpen;
    document.getElementById('masMenu').classList.toggle('hidden',!_masOpen);
    document.getElementById('navMasBtn').classList.toggle('active',_masOpen);
  });
  document.addEventListener('click',()=>{
    if(_masOpen) cerrarMasMenu();
  });
  document.getElementById('masMenu').addEventListener('click',e=>e.stopPropagation());
}
function cerrarMasMenu(){
  _masOpen=false;
  document.getElementById('masMenu').classList.add('hidden');
  document.getElementById('navMasBtn').classList.remove('active');
}
window.closeMenu=cerrarMasMenu;

window.navigateTo=function(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const t=document.getElementById(`view-${view}`);
  if(t) t.classList.add('active');
  if(view==='dashboard')    renderDashboard();
  if(view==='postura')      fillLoteSelect('posturaLote');
  if(view==='alimentacion') fillLoteSelect('alimentacionLote');
  if(view==='vacunacion')   fillLoteSelect('vacunacionLote');
  if(view==='medicacion')   fillLoteSelect('medicacionLote');
  if(view==='mortandad')    fillLoteSelect('mortandadLote');
  if(view==='enfermedades') fillLoteSelect('enfermedadLote');
  if(view==='notas')        fillLoteSelect('notaLote');
  if(view==='historial')    renderHistorialSelector();
  cerrarMasMenu();
};

// ─── MODALES ─────────────────────────────────────────────────
window.openModal=function(id){
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow='hidden';
  if(id==='modalPostura')      { fillLoteSelect('posturaLote'); calcPosturaTotal(); }
  if(id==='modalAlimentacion') fillLoteSelect('alimentacionLote');
  if(id==='modalVacunacion')   fillLoteSelect('vacunacionLote');
  if(id==='modalMedicacion')   fillLoteSelect('medicacionLote');
  if(id==='modalMortandad')    fillLoteSelect('mortandadLote');
  if(id==='modalEnfermedad')   fillLoteSelect('enfermedadLote');
  if(id==='modalNota')         fillLoteSelect('notaLote');
};
window.closeModal=function(id){
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow='';
  clearModalForm(id);
};
document.querySelectorAll('.modal-overlay').forEach(o=>{
  o.addEventListener('click',e=>{ if(e.target===o) closeModal(o.id); });
});
function clearModalForm(mid){
  document.querySelectorAll(`#${mid} input:not([type=hidden]):not([type=file]),#${mid} select,#${mid} textarea`)
    .forEach(el=>{ el.tagName==='SELECT'?(el.selectedIndex=0):(el.value=''); });
  document.querySelectorAll(`#${mid} input[type=hidden]`).forEach(el=>el.value='');
  document.querySelectorAll(`#${mid} input[type=date]`).forEach(el=>el.value=today());
  document.querySelectorAll(`#${mid} .foto-preview`).forEach(p=>p.innerHTML='');
}
function fillLoteSelect(selectId){
  const sel=document.getElementById(selectId); if(!sel) return;
  const lotes=DB.get(KEYS.lotes);
  sel.innerHTML=lotes.length
    ?lotes.map(l=>`<option value="${l.id}">${l.nombre} — ${l.galpon||'Sin galpón'} (${l.cantidadActual||0} aves)</option>`).join('')
    :'<option value="">— Sin lotes registrados —</option>';
}

// ─── DASHBOARD ────────────────────────────────────────────────
function populateDashDate(){
  document.getElementById('dashDate').textContent=
    new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
}
function renderDashboard(){ renderKPIs(); renderGalponCards(); renderAlertas(); renderActividad(); }

function renderKPIs(){
  const lotes=DB.get(KEYS.lotes);
  const mort=DB.get(KEYS.mortandad);
  const vac=DB.get(KEYS.vacunacion);
  const med=DB.get(KEYS.medicacion);
  const posturas=DB.get(KEYS.postura);
  const ponedoras=lotes.filter(l=>l.etapa==='produccion').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const recrías=lotes.filter(l=>l.etapa==='recria').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const totalBajas=mort.reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const u7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];});
  const hoyHuevos=posturas.filter(p=>p.fecha===today()).reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const post7=posturas.filter(p=>u7.includes(p.fecha));
  const pct7=ponedoras>0&&post7.length?((post7.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(ponedoras*7))*100).toFixed(1):null;
  const medAct=med.filter(m=>{const d=new Date(m.fecha);const fin=new Date(m.fecha);fin.setDate(fin.getDate()+(parseInt(m.dias)||0));return new Date()<=fin;}).length;

  document.getElementById('kpiGrid').innerHTML=`
    <div class="kpi-card" style="--kpi-color:var(--accent);animation-delay:0s">
      <div class="kpi-icon">🐔</div>
      <div class="kpi-value">${(ponedoras+recrías).toLocaleString('es')}</div>
      <div class="kpi-label">Total Aves</div>
      <div class="kpi-delta">🥚 ${ponedoras.toLocaleString('es')} ponedoras · 🐣 ${recrías.toLocaleString('es')} recría</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--gold);animation-delay:.07s">
      <div class="kpi-icon">🥚</div>
      <div class="kpi-value">${hoyHuevos.toLocaleString('es')}</div>
      <div class="kpi-label">Huevos Hoy</div>
      <div class="kpi-delta">${pct7?`📈 Prom. 7d: ${pct7}%`:'Sin registros hoy'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--red);animation-delay:.14s">
      <div class="kpi-icon">💀</div>
      <div class="kpi-value">${totalBajas.toLocaleString('es')}</div>
      <div class="kpi-label">Mortandad Total</div>
      <div class="kpi-delta">${(ponedoras+recrías)>0?((totalBajas/((ponedoras+recrías)+totalBajas))*100).toFixed(2)+'% acum.':'—'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:var(--blue);animation-delay:.21s">
      <div class="kpi-icon">💊</div>
      <div class="kpi-value">${medAct}</div>
      <div class="kpi-label">Tratamientos Activos</div>
      <div class="kpi-delta">${vac.filter(v=>u7.includes(v.fecha)).length} vacuna(s) esta semana</div>
    </div>`;
}

function renderGalponCards(){
  const lotes=DB.get(KEYS.lotes);
  const posturas=DB.get(KEYS.postura);
  const med=DB.get(KEYS.medicacion);

  // Agrupar por galpón
  const galpones={};
  lotes.forEach(l=>{
    const g=l.galpon||'Sin galpón';
    if(!galpones[g]) galpones[g]={nombre:g,ponedoras:0,recrías:0,lotes:[],huevosHoy:0,pct:null,medActivos:0};
    const aves=parseInt(l.cantidadActual)||0;
    if(l.etapa==='produccion') galpones[g].ponedoras+=aves;
    else galpones[g].recrías+=aves;
    galpones[g].lotes.push(l);
  });

  // Calcular huevos hoy y % postura por galpón
  const hoyStr=today();
  Object.values(galpones).forEach(g=>{
    const loteIds=g.lotes.map(l=>l.id);
    const hoyPost=posturas.filter(p=>p.fecha===hoyStr&&loteIds.includes(p.loteId));
    g.huevosHoy=hoyPost.reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
    g.pct=g.ponedoras>0&&g.huevosHoy>0?((g.huevosHoy/g.ponedoras)*100).toFixed(1):null;
    // Medicaciones activas en este galpón
    g.medActivos=med.filter(m=>{
      if(!loteIds.includes(m.loteId)) return false;
      const fin=new Date(m.fecha); fin.setDate(fin.getDate()+(parseInt(m.dias)||0));
      return new Date()<=fin;
    }).length;
  });

  const el=document.getElementById('galponCards');
  if(!el) return;
  const list=Object.values(galpones);
  if(!list.length){ el.innerHTML='<p style="color:var(--text3);font-size:.85rem;padding:8px 0">Sin galpones registrados</p>'; return; }

  el.innerHTML=list.map(g=>{
    const pN=g.pct?parseFloat(g.pct):0;
    const barCol=pN>=80?'var(--accent)':pN>=60?'var(--gold)':'var(--red)';
    return `
    <div class="galpon-card">
      <div class="galpon-header">
        <span class="galpon-nombre">🏚️ ${g.nombre}</span>
        <span class="galpon-total">${(g.ponedoras+g.recrías).toLocaleString('es')} aves</span>
      </div>
      <div class="galpon-stats">
        <div class="galpon-stat"><span class="galpon-stat-val" style="color:var(--accent)">${g.ponedoras.toLocaleString('es')}</span><span class="galpon-stat-lbl">🥚 Ponedoras</span></div>
        <div class="galpon-stat"><span class="galpon-stat-val" style="color:var(--gold)">${g.recrías.toLocaleString('es')}</span><span class="galpon-stat-lbl">🐣 Recría</span></div>
        <div class="galpon-stat"><span class="galpon-stat-val" style="color:var(--gold)">${g.huevosHoy.toLocaleString('es')}</span><span class="galpon-stat-lbl">🥚 Hoy</span></div>
        <div class="galpon-stat"><span class="galpon-stat-val" style="color:${barCol}">${g.pct?g.pct+'%':'—'}</span><span class="galpon-stat-lbl">% Postura</span></div>
      </div>
      ${g.pct?`<div class="postura-bar-wrap" style="margin-top:8px"><div class="postura-bar-fill" style="width:${Math.min(pN,100)}%;background:${barCol}"></div></div>`:''}
      ${g.medActivos?`<div class="galpon-med">💊 ${g.medActivos} tratamiento(s) activo(s)</div>`:''}
    </div>`;
  }).join('');
}

function renderAlertas(){
  const lotes=DB.get(KEYS.lotes);
  const vacunas=DB.get(KEYS.vacunacion);
  const alertas=[];
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  vacunas.forEach(v=>{
    if(!v.proximaFecha)return;
    const prox=new Date(v.proximaFecha); prox.setHours(0,0,0,0);
    const diff=Math.ceil((prox-hoy)/864e5);
    if(diff>=0&&diff<=7) alertas.push({icon:'💉',title:`Vacuna próxima: ${v.vacuna}`,text:` — En ${diff} día(s) · ${getLoteNombre(v.loteId)}`});
    if(diff<0&&diff>-3)  alertas.push({icon:'🔴',title:`Vacuna vencida: ${v.vacuna}`,text:` — Hace ${Math.abs(diff)} día(s)`});
  });
  lotes.filter(l=>l.etapa==='recria').forEach(l=>{
    const sem=semanasDesde(l.fecha,l.semanaIngreso);
    if(sem>=17&&sem<20) alertas.push({icon:'🔔',title:`Lote próximo a postura: ${l.nombre}`,text:` — Sem. ${sem} · ¡Registrá la ruptura!`});
  });
  DB.get(KEYS.mortandad).filter(m=>m.fecha===today()).forEach(m=>{
    if(parseInt(m.cantidad)>=5) alertas.push({icon:'🚨',title:`Alta mortandad: ${m.cantidad} aves hoy`,text:` — ${getLoteNombre(m.loteId)}`});
  });
  DB.get(KEYS.enfermedades).filter(e=>e.estado==='activa').forEach(e=>{
    alertas.push({icon:'🦠',title:`Enfermedad activa: ${e.nombre}`,text:` — ${getLoteNombre(e.loteId)}`});
  });
  document.getElementById('alertasList').innerHTML=alertas.length
    ?alertas.map(a=>`<div class="alerta-item"><span class="alerta-icon">${a.icon}</span><span class="alerta-text"><strong>${a.title}</strong>${a.text}</span></div>`).join('')
    :'<p style="color:var(--text3);font-size:.85rem;padding:8px 0">✅ Sin alertas pendientes</p>';
}

function renderActividad(){
  const items=[];
  const push=(key,icon,label)=>DB.get(key).slice(-5).reverse().forEach(r=>items.push({icon,text:label(r),ts:r.createdAt||r.fecha||''}));
  push(KEYS.postura,'🥚',r=>`Postura: ${r.huevos} huevos — ${getLoteNombre(r.loteId)}`);
  push(KEYS.lotes,'🐣',r=>`Ingreso: ${r.nombre} (${r.cantidadActual} aves)`);
  push(KEYS.vacunacion,'💉',r=>`Vacuna: ${r.vacuna} — ${getLoteNombre(r.loteId)}`);
  push(KEYS.mortandad,'💀',r=>`Mortandad: ${r.cantidad} ave(s) — ${getLoteNombre(r.loteId)}`);
  push(KEYS.alimentacion,'🌾',r=>`Alimento: ${r.kg}kg — ${getLoteNombre(r.loteId)}`);
  push(KEYS.enfermedades,'🦠',r=>`Enfermedad: ${r.nombre} — ${getLoteNombre(r.loteId)}`);
  push(KEYS.notas,'📷',r=>`Nota de campo — ${getLoteNombre(r.loteId)}`);
  items.sort((a,b)=>b.ts>a.ts?1:-1);
  document.getElementById('actividadList').innerHTML=items.length
    ?items.slice(0,10).map(it=>`<div class="actividad-item"><span style="font-size:1rem">${it.icon}</span><span class="actividad-text">${it.text}</span><span class="actividad-time">${fmtDate(it.ts)}</span></div>`).join('')
    :'<p style="color:var(--text3);font-size:.85rem;padding:8px 0">Aún no hay actividad registrada.</p>';
}

// ─── LOTES ────────────────────────────────────────────────────
window.saveLote=function(){
  const id=document.getElementById('loteId').value;
  const cantidad=parseInt(document.getElementById('loteCantidad').value)||0;
  const r={id:id||uid(),fecha:document.getElementById('loteFecha').value,nombre:document.getElementById('loteNombre').value.trim(),galpon:document.getElementById('loteGalpon').value.trim(),cantidadInicial:cantidad,cantidadActual:cantidad,raza:document.getElementById('loteRaza').value.trim(),semanaIngreso:parseInt(document.getElementById('loteSemana').value)||0,procedencia:document.getElementById('loteProcedencia').value.trim(),etapa:document.getElementById('loteEtapa').value,notas:document.getElementById('loteNotas').value.trim(),createdAt:today()};
  if(!r.nombre||!r.cantidadInicial)return showToast('⚠️ Completá nombre y cantidad');
  const lotes=DB.get(KEYS.lotes);
  if(id){const idx=lotes.findIndex(l=>l.id===id);if(idx>-1){r.cantidadActual=lotes[idx].cantidadActual;lotes[idx]=r;}}else lotes.push(r);
  DB.set(KEYS.lotes,lotes); closeModal('modalLote'); renderLote(); renderDashboard();
  showToast('✅ Lote guardado');
};
function renderLote(){
  const lotes=DB.get(KEYS.lotes);
  const el=document.getElementById('loteList');
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
        <div class="data-field"><span class="lbl">Inicio</span><span class="val">${(parseInt(l.cantidadInicial)||0).toLocaleString('es')}</span></div>
        ${l.fechaRuptura?`<div class="data-field" style="grid-column:span 2"><span class="lbl">🥚 Ruptura postura</span><span class="val" style="color:var(--gold)">${fmtDate(l.fechaRuptura)} · Sem. ${l.semanaRuptura||'—'}</span></div>`:''}
      </div>
      ${l.notas?`<p style="color:var(--text3);font-size:.82rem;margin-top:8px">${l.notas}</p>`:''}
      <div class="data-card-actions">
        <button class="btn-edit" onclick="editLote('${l.id}')">✏️ Editar</button>
        ${esR?`<button class="btn-ruptura-card" onclick="abrirRuptura('${l.id}')">🥚 Ruptura</button>`:''}
        <button class="btn-edit" onclick="verHistorial('${l.id}')" style="color:var(--blue)">📋 Historial</button>
        <button class="btn-delete" onclick="deleteLote('${l.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}
window.editLote=function(id){
  const l=DB.get(KEYS.lotes).find(x=>x.id===id);if(!l)return;
  document.getElementById('loteId').value=l.id;
  document.getElementById('loteFecha').value=l.fecha;
  document.getElementById('loteNombre').value=l.nombre;
  document.getElementById('loteGalpon').value=l.galpon||'';
  document.getElementById('loteCantidad').value=l.cantidadActual;
  document.getElementById('loteRaza').value=l.raza||'';
  document.getElementById('loteSemana').value=l.semanaIngreso||'';
  document.getElementById('loteProcedencia').value=l.procedencia||'';
  document.getElementById('loteEtapa').value=l.etapa;
  document.getElementById('loteNotas').value=l.notas||'';
  openModal('modalLote');
};
window.deleteLote=function(id){
  if(!confirm('¿Eliminar este lote?'))return;
  DB.set(KEYS.lotes,DB.get(KEYS.lotes).filter(l=>l.id!==id));
  renderLote();renderDashboard();showToast('🗑️ Lote eliminado');
};
window.verHistorial=function(id){
  navigateTo('historial');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  setTimeout(()=>{const sel=document.getElementById('historialLoteSelect');if(sel){sel.value=id;renderHistorial(id);}},100);
};

// ─── RUPTURA ─────────────────────────────────────────────────
window.abrirRuptura=function(loteId){
  const lote=DB.get(KEYS.lotes).find(l=>l.id===loteId);if(!lote)return;
  document.getElementById('rupturaLoteId').value=loteId;
  document.getElementById('rupturaFecha').value=today();
  const sem=semanasDesde(lote.fecha,lote.semanaIngreso);
  document.getElementById('rupturaSemana').value=sem;
  document.getElementById('rupturaInfo').innerHTML=`<div class="ruptura-card-info"><span class="ruptura-card-icon">🐣</span><div><strong>${lote.nombre}</strong><span>${lote.galpon||'Sin galpón'} · ${(parseInt(lote.cantidadActual)||0).toLocaleString('es')} aves · Semana ${sem}</span></div></div>`;
  openModal('modalRuptura');
};
window.saveRuptura=function(){
  const loteId=document.getElementById('rupturaLoteId').value;
  const fecha=document.getElementById('rupturaFecha').value;
  const semana=document.getElementById('rupturaSemana').value;
  const pct=document.getElementById('rupturaPctInicial').value;
  const notas=document.getElementById('rupturaNotas').value.trim();
  if(!fecha)return showToast('⚠️ Ingresá la fecha');
  const lotes=DB.get(KEYS.lotes);
  const idx=lotes.findIndex(l=>l.id===loteId);
  if(idx>-1){lotes[idx].etapa='produccion';lotes[idx].fechaRuptura=fecha;lotes[idx].semanaRuptura=semana;lotes[idx].pctRuptura=pct;lotes[idx].notasRuptura=notas;DB.set(KEYS.lotes,lotes);}
  if(pct){
    const aves=parseInt(lotes[idx]?.cantidadActual)||0;
    const huevos=aves>0?Math.round(aves*(parseFloat(pct)/100)):0;
    const lista=DB.get(KEYS.postura);
    lista.push({id:uid(),fecha,loteId,huevos,rotos:0,notas:`Ruptura de postura (${pct}%)${notas?'. '+notas:''}`,createdAt:today()});
    DB.set(KEYS.postura,lista);
  }
  closeModal('modalRuptura');renderLote();renderPostura();renderDashboard();
  showToast('✅ Ruptura registrada — Lote en Producción');
};

// ─── POSTURA ─────────────────────────────────────────────────
window.savePostura=function(){
  const id=document.getElementById('posturaId').value;
  const total=parseInt(document.getElementById('posturaHuevosTotal').value)||0;
  const m20=parseInt(document.getElementById('posturaMaple20').value)||0;
  const m30=parseInt(document.getElementById('posturaMaple30').value)||0;
  const suel=parseInt(document.getElementById('posturaHuevosSueltos').value)||0;
  const r={id:id||uid(),fecha:document.getElementById('posturaFecha').value,loteId:document.getElementById('posturaLote').value,huevos:total,maple20:m20,maple30:m30,sueltos:suel,rotos:parseInt(document.getElementById('posturaRotos').value)||0,notas:document.getElementById('posturaNotas').value.trim(),createdAt:today()};
  if(!r.loteId)return showToast('⚠️ Seleccioná un lote');
  if(!r.huevos&&r.huevos!==0)return showToast('⚠️ Ingresá los huevos');
  const list=DB.get(KEYS.postura);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.postura,list);closeModal('modalPostura');renderPostura();renderDashboard();
  showToast('✅ Postura registrada');
};
window.renderPostura=function(){
  const mes=(document.getElementById('filtroPosturaMes')||{}).value||'';
  let list=DB.get(KEYS.postura);
  if(mes) list=list.filter(p=>p.fecha&&p.fecha.startsWith(mes));
  list=list.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('posturaList');
  if(!list.length){el.innerHTML=emptyState('🥚','Sin registros de postura');return;}
  el.innerHTML=list.map(p=>{
    const lote=DB.get(KEYS.lotes).find(l=>l.id===p.loteId);
    const aves=lote?(parseInt(lote.cantidadActual)||0):0;
    const pct=aves>0?((p.huevos/aves)*100).toFixed(1):null;
    const pN=pct?parseFloat(pct):0;
    const col=pN>=80?'var(--accent)':pN>=60?'var(--gold)':'var(--red)';
    const mapleInfo=p.maple20||p.maple30?`<div class="data-field" style="grid-column:span 2"><span class="lbl">Desglose</span><span class="val">${p.maple20?p.maple20+' maple×20':''}${p.maple20&&p.maple30?' · ':''}${p.maple30?p.maple30+' maple×30':''}${p.sueltos?' · '+p.sueltos+' sueltos':''}</span></div>`:'';
    return `<div class="data-card">
      <div class="data-card-header"><span class="data-card-title">${getLoteNombre(p.loteId)}</span><span class="data-card-date">${fmtDate(p.fecha)}</span></div>
      <div class="data-card-body">
        <div class="data-field"><span class="lbl">Huevos total</span><span class="val" style="color:var(--gold)">${p.huevos.toLocaleString('es')}</span></div>
        <div class="data-field"><span class="lbl">Rotos</span><span class="val">${p.rotos}</span></div>
        <div class="data-field"><span class="lbl">% Postura</span><span class="val" style="color:${col}">${pct?pct+'%':'—'}</span></div>
        <div class="data-field"><span class="lbl">Netos</span><span class="val">${(p.huevos-p.rotos).toLocaleString('es')}</span></div>
        ${mapleInfo}
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
window.editPostura=function(id){
  const p=DB.get(KEYS.postura).find(x=>x.id===id);if(!p)return;
  fillLoteSelect('posturaLote');
  document.getElementById('posturaId').value=p.id;
  document.getElementById('posturaFecha').value=p.fecha;
  document.getElementById('posturaLote').value=p.loteId;
  document.getElementById('posturaMaple20').value=p.maple20||0;
  document.getElementById('posturaMaple30').value=p.maple30||0;
  document.getElementById('posturaHuevosSueltos').value=p.sueltos||0;
  document.getElementById('posturaRotos').value=p.rotos||0;
  document.getElementById('posturaNotas').value=p.notas||'';
  calcPosturaTotal();
  openModal('modalPostura');
};

// ─── ALIMENTACIÓN ─────────────────────────────────────────────
window.saveAlimentacion=function(){
  const id=document.getElementById('alimentacionId').value;
  const r={id:id||uid(),fecha:document.getElementById('alimentacionFecha').value,loteId:document.getElementById('alimentacionLote').value,tipo:document.getElementById('alimentacionTipo').value.trim(),kg:parseFloat(document.getElementById('alimentacionKg').value)||0,grAve:parseFloat(document.getElementById('alimentacionGrAve').value)||0,proveedor:document.getElementById('alimentacionProveedor').value.trim(),costo:parseFloat(document.getElementById('alimentacionCosto').value)||0,notas:document.getElementById('alimentacionNotas').value.trim(),createdAt:today()};
  if(!r.loteId)return showToast('⚠️ Seleccioná un lote');
  const list=DB.get(KEYS.alimentacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.alimentacion,list);closeModal('modalAlimentacion');renderAlimentacion();showToast('✅ Alimentación registrada');
};
function renderAlimentacion(){
  const list=DB.get(KEYS.alimentacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('alimentacionList');
  if(!list.length){el.innerHTML=emptyState('🌾','Sin registros');return;}
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
      <button class="btn-edit" onclick="editAlimentacion('${r.id}')">✏️</button>
      <button class="btn-delete" onclick="deleteRecord('${KEYS.alimentacion}','${r.id}',renderAlimentacion)">🗑️</button>
    </div></div>`).join('');
}
window.editAlimentacion=function(id){
  const r=DB.get(KEYS.alimentacion).find(x=>x.id===id);if(!r)return;
  fillLoteSelect('alimentacionLote');
  const map={alimentacionId:r.id,alimentacionFecha:r.fecha,alimentacionLote:r.loteId,alimentacionTipo:r.tipo,alimentacionKg:r.kg,alimentacionGrAve:r.grAve,alimentacionProveedor:r.proveedor,alimentacionCosto:r.costo,alimentacionNotas:r.notas};
  Object.entries(map).forEach(([k,v])=>{ const el=document.getElementById(k);if(el)el.value=v??''; });
  openModal('modalAlimentacion');
};

// ─── VACUNACIÓN ───────────────────────────────────────────────
window.saveVacunacion=function(){
  const id=document.getElementById('vacunacionId').value;
  const r={id:id||uid(),fecha:document.getElementById('vacunacionFecha').value,loteId:document.getElementById('vacunacionLote').value,vacuna:document.getElementById('vacunaNombre').value.trim(),via:document.getElementById('vacunaVia').value,dosis:document.getElementById('vacunaDosis').value.trim(),aplicador:document.getElementById('vacunaAplicador').value.trim(),proximaFecha:document.getElementById('vacunaProxima').value,notas:document.getElementById('vacunaNotas').value.trim(),createdAt:today()};
  if(!r.loteId||!r.vacuna)return showToast('⚠️ Completá lote y vacuna');
  const list=DB.get(KEYS.vacunacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.vacunacion,list);closeModal('modalVacunacion');renderVacunacion();renderDashboard();showToast('✅ Vacunación registrada');
};
function renderVacunacion(){
  const list=DB.get(KEYS.vacunacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('vacunacionList');
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
      <button class="btn-edit" onclick="editVacunacion('${r.id}')">✏️</button>
      <button class="btn-delete" onclick="deleteRecord('${KEYS.vacunacion}','${r.id}',renderVacunacion)">🗑️</button>
    </div></div>`).join('');
}
window.editVacunacion=function(id){
  const r=DB.get(KEYS.vacunacion).find(x=>x.id===id);if(!r)return;
  fillLoteSelect('vacunacionLote');
  const map={vacunacionId:r.id,vacunacionFecha:r.fecha,vacunacionLote:r.loteId,vacunaNombre:r.vacuna,vacunaVia:r.via,vacunaDosis:r.dosis,vacunaAplicador:r.aplicador,vacunaProxima:r.proximaFecha||'',vacunaNotas:r.notas};
  Object.entries(map).forEach(([k,v])=>{const el=document.getElementById(k);if(el)el.value=v??'';});
  openModal('modalVacunacion');
};

// ─── MEDICACIÓN ───────────────────────────────────────────────
window.saveMedicacion=function(){
  const id=document.getElementById('medicacionId').value;
  const r={id:id||uid(),fecha:document.getElementById('medicacionFecha').value,loteId:document.getElementById('medicacionLote').value,nombre:document.getElementById('medicamentoNombre').value.trim(),motivo:document.getElementById('medicamentoMotivo').value.trim(),dosis:document.getElementById('medicamentoDosis').value.trim(),dias:document.getElementById('medicamentoDias').value,vet:document.getElementById('medicamentoVet').value.trim(),notas:document.getElementById('medicamentoNotas').value.trim(),createdAt:today()};
  if(!r.loteId||!r.nombre)return showToast('⚠️ Completá lote y medicamento');
  const list=DB.get(KEYS.medicacion);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.medicacion,list);closeModal('modalMedicacion');renderMedicacion();renderDashboard();showToast('✅ Medicación registrada');
};
function renderMedicacion(){
  const list=DB.get(KEYS.medicacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('medicacionList');
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
      <button class="btn-edit" onclick="editMedicacion('${r.id}')">✏️</button>
      <button class="btn-delete" onclick="deleteRecord('${KEYS.medicacion}','${r.id}',renderMedicacion)">🗑️</button>
    </div></div>`).join('');
}
window.editMedicacion=function(id){
  const r=DB.get(KEYS.medicacion).find(x=>x.id===id);if(!r)return;
  fillLoteSelect('medicacionLote');
  const map={medicacionId:r.id,medicacionFecha:r.fecha,medicacionLote:r.loteId,medicamentoNombre:r.nombre,medicamentoMotivo:r.motivo,medicamentoDosis:r.dosis,medicamentoDias:r.dias,medicamentoVet:r.vet,medicamentoNotas:r.notas};
  Object.entries(map).forEach(([k,v])=>{const el=document.getElementById(k);if(el)el.value=v??'';});
  openModal('modalMedicacion');
};

// ─── MORTANDAD ────────────────────────────────────────────────
window.saveMortandad=function(){
  const id=document.getElementById('mortandadId').value;
  const r={id:id||uid(),fecha:document.getElementById('mortandadFecha').value,loteId:document.getElementById('mortandadLote').value,cantidad:parseInt(document.getElementById('mortandadCantidad').value)||0,causa:document.getElementById('mortandadCausa').value,desc:document.getElementById('mortandadDesc').value.trim(),necropsia:document.getElementById('mortandadNecropsia').value,createdAt:today()};
  if(!r.loteId)return showToast('⚠️ Seleccioná un lote');
  if(!r.cantidad)return showToast('⚠️ Ingresá cantidad');
  if(!id){const lotes=DB.get(KEYS.lotes);const idx=lotes.findIndex(l=>l.id===r.loteId);if(idx>-1){lotes[idx].cantidadActual=Math.max(0,(parseInt(lotes[idx].cantidadActual)||0)-r.cantidad);DB.set(KEYS.lotes,lotes);}}
  const list=DB.get(KEYS.mortandad);
  if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
  DB.set(KEYS.mortandad,list);closeModal('modalMortandad');renderMortandad();renderDashboard();showToast('✅ Mortandad registrada');
};
function renderMortandad(){
  const list=DB.get(KEYS.mortandad).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('mortandadList');
  if(!list.length){el.innerHTML=emptyState('📋','Sin registros');return;}
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
  const map={mortandadId:r.id,mortandadFecha:r.fecha,mortandadLote:r.loteId,mortandadCantidad:r.cantidad,mortandadCausa:r.causa,mortandadDesc:r.desc,mortandadNecropsia:r.necropsia};
  Object.entries(map).forEach(([k,v])=>{const el=document.getElementById(k);if(el)el.value=v??'';});
  openModal('modalMortandad');
};

// ─── ENFERMEDADES (con foto) ──────────────────────────────────
window.saveEnfermedad=function(){
  const id=document.getElementById('enfermedadId').value;
  const archivo=document.getElementById('enfermedadFoto').files[0];
  const guardar=fotoB64=>{
    const r={id:id||uid(),fecha:document.getElementById('enfermedadFecha').value,loteId:document.getElementById('enfermedadLote').value,nombre:document.getElementById('enfermedadNombre').value.trim(),sintomas:document.getElementById('enfermedadSintomas').value.trim(),afectadas:parseInt(document.getElementById('enfermedadAfectadas').value)||0,vet:document.getElementById('enfermedadVet').value.trim(),tratamiento:document.getElementById('enfermedadTratamiento').value.trim(),estado:document.getElementById('enfermedadEstado').value,fechaCierre:document.getElementById('enfermedadCierre').value,notas:document.getElementById('enfermedadNotas').value.trim(),foto:fotoB64||(id?(DB.get(KEYS.enfermedades).find(x=>x.id===id)||{}).foto:null),createdAt:today()};
    if(!r.loteId||!r.nombre)return showToast('⚠️ Completá lote y nombre');
    const list=DB.get(KEYS.enfermedades);
    if(id){const i=list.findIndex(x=>x.id===id);if(i>-1)list[i]=r;}else list.push(r);
    DB.set(KEYS.enfermedades,list);closeModal('modalEnfermedad');renderEnfermedades();renderDashboard();showToast('✅ Enfermedad registrada');
  };
  if(archivo){const rd=new FileReader();rd.onload=ev=>guardar(ev.target.result);rd.readAsDataURL(archivo);}
  else guardar(null);
};
function renderEnfermedades(){
  const list=DB.get(KEYS.enfermedades).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const el=document.getElementById('enfermedadList');
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
        <button class="btn-edit" onclick="editEnfermedad('${r.id}')">✏️ Editar</button>
        <button class="btn-delete" onclick="deleteRecord('${KEYS.enfermedades}','${r.id}',renderEnfermedades)">🗑️</button>
      </div></div>`;
  }).join('');
}
window.editEnfermedad=function(id){
  const r=DB.get(KEYS.enfermedades).find(x=>x.id===id);if(!r)return;
  fillLoteSelect('enfermedadLote');
  const map={enfermedadId:r.id,enfermedadFecha:r.fecha,enfermedadLote:r.loteId,enfermedadNombre:r.nombre,enfermedadSintomas:r.sintomas,enfermedadAfectadas:r.afectadas,enfermedadVet:r.vet,enfermedadTratamiento:r.tratamiento,enfermedadEstado:r.estado,enfermedadCierre:r.fechaCierre||'',enfermedadNotas:r.notas};
  Object.entries(map).forEach(([k,v])=>{const el=document.getElementById(k);if(el)el.value=v??'';});
  if(r.foto) document.getElementById('enfermedadFotoPreview').innerHTML=`<img src="${r.foto}">`;
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
    DB.set(KEYS.notas,list);closeModal('modalNota');renderNotas();showToast('✅ Nota guardada');
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
  sel.innerHTML=lotes.length?lotes.map(l=>`<option value="${l.id}">${l.nombre} — ${l.galpon||'Sin galpón'}</option>`).join(''):'<option value="">—</option>';
  if(lotes.length) renderHistorial(lotes[0].id);
}
window.onHistorialChange=function(){const id=document.getElementById('historialLoteSelect').value;if(id)renderHistorial(id);};
function renderHistorial(loteId){
  const lote=DB.get(KEYS.lotes).find(l=>l.id===loteId);if(!lote)return;
  const sem=semanasDesde(lote.fecha,lote.semanaIngreso);
  const posturas=DB.get(KEYS.postura).filter(p=>p.loteId===loteId);
  const totalHuevos=posturas.reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const totalMort=DB.get(KEYS.mortandad).filter(m=>m.loteId===loteId).reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);

  document.getElementById('historialResumen').innerHTML=`<div class="data-card" style="margin-bottom:14px">
    <div class="data-card-header"><span class="data-card-title">${lote.nombre}</span><span class="badge ${lote.etapa==='produccion'?'badge-green':'badge-gold'}">${lote.etapa==='produccion'?'Producción':'Recría'}</span></div>
    <div class="data-card-body">
      <div class="data-field"><span class="lbl">Galpón</span><span class="val">${lote.galpon||'—'}</span></div>
      <div class="data-field"><span class="lbl">Ingreso</span><span class="val">${fmtDate(lote.fecha)}</span></div>
      <div class="data-field"><span class="lbl">Semana actual</span><span class="val" style="color:var(--accent)">${sem} sem.</span></div>
      <div class="data-field"><span class="lbl">Aves actuales</span><span class="val">${(parseInt(lote.cantidadActual)||0).toLocaleString('es')}</span></div>
      <div class="data-field"><span class="lbl">Total huevos</span><span class="val" style="color:var(--gold)">${totalHuevos.toLocaleString('es')}</span></div>
      <div class="data-field"><span class="lbl">Mortandad</span><span class="val" style="color:var(--red)">${totalMort.toLocaleString('es')} aves</span></div>
      ${lote.fechaRuptura?`<div class="data-field" style="grid-column:span 2"><span class="lbl">🥚 Ruptura postura</span><span class="val" style="color:var(--gold)">${fmtDate(lote.fechaRuptura)} · Sem. ${lote.semanaRuptura}</span></div>`:''}
    </div>
    <div class="data-card-actions">
      <button class="btn-pdf-lote" onclick="generarPDFLote('${loteId}')">📄 PDF de este Lote</button>
    </div>
  </div>`;

  const eventos=[];
  const add=(key,icon,label)=>DB.get(key).filter(r=>r.loteId===loteId).forEach(r=>eventos.push({icon,text:label(r),fecha:r.fecha||r.createdAt||''}));
  add(KEYS.postura,'🥚',r=>`Postura: ${r.huevos} huevos${r.maple20||r.maple30?` (${r.maple20||0}×20 + ${r.maple30||0}×30)`:''}${r.sueltos?' + '+r.sueltos+' sueltos':''}`);
  add(KEYS.mortandad,'💀',r=>`Mortandad: ${r.cantidad} ave(s) — ${r.causa||''}`);
  add(KEYS.vacunacion,'💉',r=>`Vacuna: ${r.vacuna} (${r.via||''})`);
  add(KEYS.medicacion,'💊',r=>`Medicación: ${r.nombre} — ${r.motivo||''}`);
  add(KEYS.alimentacion,'🌾',r=>`Alimento: ${r.kg}kg ${r.tipo||''}`);
  add(KEYS.enfermedades,'🦠',r=>`Enfermedad: ${r.nombre} [${r.estado}]`);
  add(KEYS.notas,'📷',r=>`Nota: ${r.texto||'(sin texto)'}`);
  eventos.sort((a,b)=>b.fecha>a.fecha?1:-1);
  document.getElementById('historialEventos').innerHTML=eventos.length
    ?eventos.map(ev=>`<div class="actividad-item"><span style="font-size:1rem">${ev.icon}</span><span class="actividad-text">${ev.text}</span><span class="actividad-time">${fmtDate(ev.fecha)}</span></div>`).join('')
    :'<p style="color:var(--text3);font-size:.85rem;padding:16px 0">Sin eventos para este lote.</p>';
}

// ─── CSV ─────────────────────────────────────────────────────
window.exportarCSV=function(key,nombre){
  const list=DB.get(key);if(!list.length)return showToast('⚠️ Sin datos');
  const lotes=DB.get(KEYS.lotes);
  const rows=list.map(r=>({...r,loteNombre:lotes.find(x=>x.id===r.loteId)?.nombre||''}));
  const cols=Object.keys(rows[0]);
  const csv=[cols.join(','),...rows.map(r=>cols.map(c=>`"${String(r[c]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`hinse-${nombre}-${today()}.csv`;a.click();
  showToast('📊 CSV exportado');
};

// ─── EXCEL BACKUP ─────────────────────────────────────────────
window.exportarExcel=function(){
  const lotes=DB.get(KEYS.lotes);
  const getLote=id=>lotes.find(x=>x.id===id)?.nombre||'';

  // Construir un HTML de tabla con múltiples hojas simuladas (Excel abre HTML con tablas)
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const hdrStyle='background:#a86828;color:#fff;font-weight:bold;padding:6px 10px;border:1px solid #c8853a;';
  const rowStyle=(i)=>i%2===0?'background:#fdf4e8;':'background:#fff8f0;';
  const cellStyle='padding:5px 10px;border:1px solid #e8d0a8;';

  const makeTable=(title,headers,rows)=>{
    const head=headers.map(h=>`<th style="${hdrStyle}">${esc(h)}</th>`).join('');
    const body=rows.map((row,i)=>`<tr style="${rowStyle(i)}">${row.map(c=>`<td style="${cellStyle}">${esc(c)}</td>`).join('')}</tr>`).join('');
    return `<h2 style="font-family:Georgia,serif;color:#6b3e1e;border-bottom:3px solid #c8853a;padding-bottom:6px;margin:24px 0 10px">${title}</h2>
    <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px;margin-bottom:30px">${head?`<thead><tr>${head}</tr></thead>`:''}
    <tbody>${body||`<tr><td colspan="${headers.length}" style="${cellStyle}color:#aaa;font-style:italic;">Sin datos</td></tr>`}</tbody></table>`;
  };

  // Postura
  const postRows=DB.get(KEYS.postura).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(p=>{
    const lote=lotes.find(l=>l.id===p.loteId);const aves=parseInt(lote?.cantidadActual)||0;
    const pct=aves>0?((p.huevos/aves)*100).toFixed(1)+'%':'—';
    const m20=(p.maple20||0);const m30=(p.maple30||0);const su=(p.sueltos||0);
    return[fmtDate(p.fecha),getLote(p.loteId),p.huevos,p.rotos,(p.huevos-p.rotos),pct,m20?m20+'×20':'',m30?m30+'×30':'',su?su+' sueltos':'',p.notas||''];
  });

  // Lotes
  const loteRows=lotes.slice().reverse().map(l=>[l.nombre,l.galpon||'',l.etapa==='produccion'?'Producción':'Recría',fmtDate(l.fecha),l.cantidadInicial,l.cantidadActual,semanasDesde(l.fecha,l.semanaIngreso)+' sem.',l.raza||'',l.procedencia||'',l.fechaRuptura?fmtDate(l.fechaRuptura):'',l.notas||'']);

  // Mortandad
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};
  const mortRows=DB.get(KEYS.mortandad).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>[fmtDate(m.fecha),getLote(m.loteId),m.cantidad,causas[m.causa]||m.causa,m.necropsia==='si'?'Sí':m.necropsia==='pendiente'?'Pendiente':'No',m.desc||'']);

  // Vacunación
  const vias={agua:'Agua de bebida',ocular:'Ocular',nasal:'Nasal',inyectable:'Inyectable',spray:'Spray',ala:'Punción alar'};
  const vacRows=DB.get(KEYS.vacunacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(v=>[fmtDate(v.fecha),getLote(v.loteId),v.vacuna,vias[v.via]||v.via,v.dosis||'',v.aplicador||'',v.proximaFecha?fmtDate(v.proximaFecha):'—',v.notas||'']);

  // Medicación
  const medRows=DB.get(KEYS.medicacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>[fmtDate(m.fecha),getLote(m.loteId),m.nombre,m.motivo||'',m.dosis||'',m.dias||'',m.vet||'',m.notas||'']);

  // Alimentación
  const alimRows=DB.get(KEYS.alimentacion).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>[fmtDate(r.fecha),getLote(r.loteId),r.tipo||'',r.kg,r.grAve||'',r.proveedor||'',r.costo?'$'+r.costo:'',r.notas||'']);

  // Enfermedades
  const enfRows=DB.get(KEYS.enfermedades).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(e=>[fmtDate(e.fecha),getLote(e.loteId),e.nombre,e.estado,e.afectadas||'',e.vet||'',e.tratamiento||'',e.fechaCierre?fmtDate(e.fechaCierre):'',e.sintomas||'']);

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Arial,sans-serif;margin:30px;color:#2a1a0a;background:#fffdf8;}
  .cover{background:linear-gradient(135deg,#6b3e1e,#a86828,#d4a043);color:#fff;padding:30px;border-radius:12px;margin-bottom:30px;text-align:center;}
  .cover h1{font-size:2.2rem;margin:0;letter-spacing:.1em;}
  .cover p{margin:8px 0 0;opacity:.85;font-size:1rem;}
  </style></head><body>
  <div class="cover">
    <h1>🐔 HINSE — GRANJA AVÍCOLA</h1>
    <p>Backup completo de datos · Generado el ${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
  </div>
  ${makeTable('🐣 LOTES',['Nombre','Galpón','Etapa','Fecha ingreso','Inicial','Actual','Semana','Raza','Procedencia','Ruptura postura','Notas'],loteRows)}
  ${makeTable('🥚 POSTURA',['Fecha','Lote','Huevos total','Rotos','Netos','% Postura','Maple 20','Maple 30','Sueltos','Notas'],postRows)}
  ${makeTable('💀 MORTANDAD',['Fecha','Lote','Cantidad','Causa','Necropsia','Descripción'],mortRows)}
  ${makeTable('💉 VACUNACIÓN',['Fecha','Lote','Vacuna','Vía','Dosis','Aplicador','Próxima','Notas'],vacRows)}
  ${makeTable('💊 MEDICACIÓN',['Fecha','Lote','Medicamento','Motivo','Dosis','Días','Veterinario','Notas'],medRows)}
  ${makeTable('🌾 ALIMENTACIÓN',['Fecha','Lote','Tipo','Kg','g/ave/día','Proveedor','Costo','Notas'],alimRows)}
  ${makeTable('🦠 ENFERMEDADES',['Fecha','Lote','Nombre','Estado','Aves afect.','Veterinario','Tratamiento','Cierre','Síntomas'],enfRows)}
  </body></html>`;

  const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`hinse-backup-${today()}.xls`;a.click();
  showToast('📊 Excel descargado');
};

// ─── DELETE ───────────────────────────────────────────────────
window.deleteRecord=function(key,id,rerenderFn){
  if(!confirm('¿Eliminar este registro?'))return;
  DB.set(key,DB.get(key).filter(x=>x.id!==id));
  rerenderFn();
  if([KEYS.mortandad,KEYS.lotes,KEYS.vacunacion,KEYS.medicacion,KEYS.enfermedades].includes(key)) renderDashboard();
  showToast('🗑️ Registro eliminado');
};

// ─── HELPERS ─────────────────────────────────────────────────
function getLoteNombre(id){return DB.get(KEYS.lotes).find(x=>x.id===id)?.nombre||'(lote eliminado)';}
function emptyState(icon,msg){return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;}

// ─── BACKUP JSON / RESTORE ────────────────────────────────────
function setupBackup(){
  document.getElementById('btnBackup').addEventListener('click',()=>{
    const data={};Object.values(KEYS).forEach(k=>{data[k]=DB.get(k);});
    data._version=3;data._exportDate=new Date().toISOString();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`hinse-backup-${today()}.json`;a.click();
    showToast('💾 Backup JSON descargado');
  });
  document.getElementById('btnRestore').addEventListener('click',()=>document.getElementById('fileRestore').click());
  document.getElementById('fileRestore').addEventListener('change',e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(!confirm('¿Restaurar backup? Esto reemplazará los datos actuales.'))return;
        Object.values(KEYS).forEach(k=>{if(data[k])DB.set(k,data[k]);});
        showToast('📂 Restaurado');setTimeout(()=>location.reload(),800);
      }catch{showToast('❌ Archivo inválido');}
    };
    reader.readAsText(file);e.target.value='';
  });
}

// ─── PDF DASHBOARD ────────────────────────────────────────────
function setupPDF(){ document.getElementById('btnPDF').addEventListener('click',generarPDF); }

function pdfHeader(titulo,subtitulo){
  const fecha=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const hora=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  return `<div class="pdf-header">
    <div class="pdf-logo-area"><div class="pdf-logo-icon">🐔</div><div><div class="pdf-logo-name">HINSE</div><div class="pdf-logo-sub">GRANJA AVÍCOLA</div></div></div>
    <div class="pdf-header-right"><div class="pdf-report-title">${titulo}</div><div class="pdf-report-date">${subtitulo||fecha}</div><div class="pdf-report-time">${hora} hs</div></div>
  </div>`;
}
function pdfFooter(){
  const fecha=new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});
  const hora=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  return `<div class="pdf-footer"><span>Granja Hinse · Sistema de Control Avícola</span><span>Generado: ${fecha} ${hora} hs</span><span>Confidencial — Uso interno</span></div>`;
}

function generarPDF(){
  const lotes=DB.get(KEYS.lotes);
  const mortandades=DB.get(KEYS.mortandad);
  const vacunas=DB.get(KEYS.vacunacion);
  const medicacion=DB.get(KEYS.medicacion);
  const posturas=DB.get(KEYS.postura);
  const enfermedades=DB.get(KEYS.enfermedades);
  const ponedoras=lotes.filter(l=>l.etapa==='produccion').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const recrías=lotes.filter(l=>l.etapa==='recria').reduce((s,l)=>s+(parseInt(l.cantidadActual)||0),0);
  const totalBajas=mortandades.reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const u7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split('T')[0];});
  const post7=posturas.filter(p=>u7.includes(p.fecha));
  const hoyHuevos=posturas.filter(p=>p.fecha===today()).reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const pct7=ponedoras>0&&post7.length?((post7.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(ponedoras*7))*100).toFixed(1):null;
  const enferActivas=enfermedades.filter(e=>e.estado==='activa');
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const vacProximas=vacunas.filter(v=>{if(!v.proximaFecha)return false;const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);return Math.ceil((d-hoy)/864e5)>=0&&Math.ceil((d-hoy)/864e5)<=14;}).map(v=>{const d=new Date(v.proximaFecha);d.setHours(0,0,0,0);return{...v,dias:Math.ceil((d-hoy)/864e5)};});
  const ultimasPosturas=lotes.filter(l=>l.etapa==='produccion').map(l=>{const ps=posturas.filter(p=>p.loteId===l.id).sort((a,b)=>b.fecha.localeCompare(a.fecha));const last=ps[0];const aves=parseInt(l.cantidadActual)||0;const pct=last&&aves>0?((parseInt(last.huevos)/aves)*100).toFixed(1):null;return{lote:l,last,pct};});
  const medActivas=medicacion.filter(m=>{const fin=new Date(m.fecha);fin.setDate(fin.getDate()+(parseInt(m.dias)||0));return new Date()<=fin;});

  document.getElementById('pdfContent').innerHTML=`<div class="pdf-page">
    ${pdfHeader('INFORME DE PRODUCCIÓN')}
    <div class="pdf-kpi-strip">
      <div class="pdf-kpi" style="border-color:#c8853a"><div class="pdf-kpi-icon">🐔</div><div class="pdf-kpi-val">${(ponedoras+recrías).toLocaleString('es')}</div><div class="pdf-kpi-lbl">Total Aves</div></div>
      <div class="pdf-kpi" style="border-color:#d4a043"><div class="pdf-kpi-icon">🥚</div><div class="pdf-kpi-val">${hoyHuevos.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Huevos Hoy</div></div>
      <div class="pdf-kpi" style="border-color:#7a9ab5"><div class="pdf-kpi-icon">📈</div><div class="pdf-kpi-val">${pct7?pct7+'%':'—'}</div><div class="pdf-kpi-lbl">% Postura 7d</div></div>
      <div class="pdf-kpi" style="border-color:#c05050"><div class="pdf-kpi-icon">💀</div><div class="pdf-kpi-val">${totalBajas.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Mortandad</div></div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#c8853a,#a86828)"><span>🐣 LOTES ACTIVOS</span><span>${lotes.length}</span></div>
        ${lotes.length?lotes.map(l=>{const sem=semanasDesde(l.fecha,l.semanaIngreso);return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${l.nombre}</span><span class="pdf-badge ${l.etapa==='produccion'?'pdf-badge-green':'pdf-badge-gold'}">${l.etapa==='produccion'?'Producción':'Recría'}</span></div><div class="pdf-row-detail">${l.galpon||'Sin galpón'} · ${(parseInt(l.cantidadActual)||0).toLocaleString('es')} aves · Sem. ${sem}</div></div>`;}).join(''):'<div class="pdf-empty">Sin lotes</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#d4a043,#a86828)"><span>🥚 POSTURA POR LOTE</span></div>
        ${ultimasPosturas.length?ultimasPosturas.map(({lote,last,pct})=>{const pN=pct?parseFloat(pct):0;const bc=pN>=80?'#c8853a':pN>=60?'#d4a043':'#c05050';return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${lote.nombre}</span><span style="font-weight:700;color:${bc}">${pct?pct+'%':'—'}</span></div>${last?`<div class="pdf-row-detail">${fmtDate(last.fecha)} · ${last.huevos} huevos</div>`:'<div class="pdf-row-detail" style="color:#c05050">Sin registros</div>'}${pct?`<div class="pdf-mini-bar"><div style="width:${Math.min(pN,100)}%;background:${bc}"></div></div>`:''}</div>`;}).join(''):'<div class="pdf-empty">Sin lotes en producción</div>'}
      </div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a9ab5,#4a6a8a)"><span>💉 VACUNAS PRÓXIMAS</span><span>${vacProximas.length}</span></div>
        ${vacProximas.length?vacProximas.map(v=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${v.vacuna}</span><span class="pdf-badge ${v.dias<=3?'pdf-badge-red':'pdf-badge-blue'}">En ${v.dias}d</span></div><div class="pdf-row-detail">${getLoteNombre(v.loteId)}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin vacunas próximas</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#6a8a6a,#4a6a4a)"><span>💊 TRATAMIENTOS ACTIVOS</span><span>${medActivas.length}</span></div>
        ${medActivas.length?medActivas.map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${m.nombre}</span><span class="pdf-badge pdf-badge-blue">${m.dias||'?'}d</span></div><div class="pdf-row-detail">${getLoteNombre(m.loteId)}${m.motivo?' · '+m.motivo:''}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin tratamientos activos</div>'}
      </div>
    </div>
    <div class="pdf-cols">
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#8a5a3a,#6b3e1e)"><span>🦠 ENFERMEDADES ACTIVAS</span><span>${enferActivas.length}</span></div>
        ${enferActivas.length?enferActivas.map(e=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${e.nombre}</span><span class="pdf-badge pdf-badge-red">Activa</span></div><div class="pdf-row-detail">${getLoteNombre(e.loteId)}${e.vet?' · Vet: '+e.vet:''}</div></div>`).join(''):'<div class="pdf-empty">✅ Sin enfermedades activas</div>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a3a3a,#5a2a2a)"><span>💀 MORTANDAD RECIENTE</span></div>
        ${mortandades.length?mortandades.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,4).map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:#c05050">🪦 ${m.cantidad} ave(s)</span><span style="color:#8a6848;font-size:.82rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${getLoteNombre(m.loteId)} · ${m.causa||'—'}</div></div>`).join(''):'<div class="pdf-empty">Sin registros</div>'}
      </div>
    </div>
    ${pdfFooter()}
  </div>`;
  document.getElementById('pdfOverlay').classList.remove('hidden');
  document.body.style.overflow='hidden';
}

// ─── PDF HISTORIAL DE LOTE ────────────────────────────────────
window.generarPDFLote=function(loteId){
  const lote=DB.get(KEYS.lotes).find(l=>l.id===loteId);if(!lote)return;
  const sem=semanasDesde(lote.fecha,lote.semanaIngreso);
  const posturas=DB.get(KEYS.postura).filter(p=>p.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const mortandades=DB.get(KEYS.mortandad).filter(m=>m.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const vacunas=DB.get(KEYS.vacunacion).filter(v=>v.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const medicacion=DB.get(KEYS.medicacion).filter(m=>m.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const alimentos=DB.get(KEYS.alimentacion).filter(a=>a.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const enfermedades=DB.get(KEYS.enfermedades).filter(e=>e.loteId===loteId);
  const notas=DB.get(KEYS.notas).filter(n=>n.loteId===loteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const totalHuevos=posturas.reduce((s,p)=>s+(parseInt(p.huevos)||0),0);
  const totalMort=mortandades.reduce((s,m)=>s+(parseInt(m.cantidad)||0),0);
  const totalKgAlim=alimentos.reduce((s,a)=>s+(parseFloat(a.kg)||0),0);
  const aves=parseInt(lote.cantidadActual)||0;
  const pctProm=posturas.length&&aves>0?((posturas.reduce((s,p)=>s+(parseInt(p.huevos)||0),0)/(aves*posturas.length))*100).toFixed(1):null;
  const totalCostoAlim=alimentos.reduce((s,a)=>s+(parseFloat(a.costo)||0),0);
  const causas={enfermedad:'Enfermedad',estres_calor:'Estrés calor',estres_frio:'Estrés frío',accidente:'Accidente',depredador:'Depredador',desconocida:'Desconocida',otra:'Otra'};

  const notasFoto=notas.filter(n=>n.foto);

  document.getElementById('pdfContent').innerHTML=`<div class="pdf-page">
    ${pdfHeader('HISTORIAL DE LOTE',lote.nombre+' · '+lote.galpon)}

    <!-- RESUMEN DEL LOTE -->
    <div class="pdf-lote-banner">
      <div class="pdf-lote-banner-left">
        <div class="pdf-lote-nombre">${lote.nombre}</div>
        <div class="pdf-lote-detalle">${lote.galpon||'Sin galpón'} · Semana ${sem} · ${lote.raza||'Raza no especificada'}</div>
        ${lote.fechaRuptura?`<div class="pdf-lote-ruptura">🥚 Ruptura de postura: ${fmtDate(lote.fechaRuptura)} — Sem. ${lote.semanaRuptura}</div>`:''}
      </div>
      <div class="pdf-lote-badge-etapa ${lote.etapa==='produccion'?'prod':'recria'}">${lote.etapa==='produccion'?'PRODUCCIÓN':'RECRÍA'}</div>
    </div>

    <!-- KPIs DEL LOTE -->
    <div class="pdf-kpi-strip" style="grid-template-columns:repeat(5,1fr)">
      <div class="pdf-kpi" style="border-color:#c8853a"><div class="pdf-kpi-icon">🐔</div><div class="pdf-kpi-val">${aves.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Aves actuales</div></div>
      <div class="pdf-kpi" style="border-color:#d4a043"><div class="pdf-kpi-icon">🥚</div><div class="pdf-kpi-val">${totalHuevos.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Total huevos</div></div>
      <div class="pdf-kpi" style="border-color:#7a9ab5"><div class="pdf-kpi-icon">📈</div><div class="pdf-kpi-val">${pctProm?pctProm+'%':'—'}</div><div class="pdf-kpi-lbl">% Postura prom.</div></div>
      <div class="pdf-kpi" style="border-color:#c05050"><div class="pdf-kpi-icon">💀</div><div class="pdf-kpi-val">${totalMort.toLocaleString('es')}</div><div class="pdf-kpi-lbl">Mortandad total</div></div>
      <div class="pdf-kpi" style="border-color:#8a5a3a"><div class="pdf-kpi-icon">🌾</div><div class="pdf-kpi-val">${totalKgAlim.toLocaleString('es')} kg</div><div class="pdf-kpi-lbl">Alimento total</div></div>
    </div>

    <div class="pdf-cols">
      <!-- POSTURA -->
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#d4a043,#a86828)"><span>🥚 REGISTROS DE POSTURA</span><span>${posturas.length}</span></div>
        ${posturas.length?posturas.slice(0,15).map(p=>{const pN=aves>0?((parseInt(p.huevos)/aves)*100):0;const bc=pN>=80?'#c8853a':pN>=60?'#d4a043':'#c05050';return`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:${bc}">${p.huevos} huevos (${pN.toFixed(1)}%)</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(p.fecha)}</span></div>${p.maple20||p.maple30?`<div class="pdf-row-detail">${p.maple20||0}×20 + ${p.maple30||0}×30${p.sueltos?' + '+p.sueltos+' sueltos':''}</div>`:''}${pN>0?`<div class="pdf-mini-bar"><div style="width:${Math.min(pN,100)}%;background:${bc}"></div></div>`:''}</div>`;}).join('')+''+( posturas.length>15?`<div class="pdf-empty">... y ${posturas.length-15} registros más</div>`:''):'<div class="pdf-empty">Sin registros de postura</div>'}
      </div>
      <!-- MORTANDAD -->
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a3a3a,#5a2a2a)"><span>💀 MORTANDAD</span><span>${totalMort} aves</span></div>
        ${mortandades.length?mortandades.map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name" style="color:#c05050">🪦 ${m.cantidad} ave(s)</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${causas[m.causa]||m.causa}${m.necropsia==='si'?' · ✅ Necropsia':''}</div></div>`).join(''):'<div class="pdf-empty">Sin registros de mortandad</div>'}
      </div>
    </div>

    <div class="pdf-cols">
      <!-- VACUNACIÓN -->
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#7a9ab5,#4a6a8a)"><span>💉 VACUNACIÓN</span><span>${vacunas.length}</span></div>
        ${vacunas.length?vacunas.map(v=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${v.vacuna}</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(v.fecha)}</span></div><div class="pdf-row-detail">${v.via||''} · ${v.dosis||'—'}${v.proximaFecha?' · Próx: '+fmtDate(v.proximaFecha):''}</div></div>`).join(''):'<div class="pdf-empty">Sin vacunas registradas</div>'}
      </div>
      <!-- MEDICACIÓN -->
      <div class="pdf-section">
        <div class="pdf-section-header" style="background:linear-gradient(135deg,#6a8a6a,#4a6a4a)"><span>💊 MEDICACIÓN</span><span>${medicacion.length}</span></div>
        ${medicacion.length?medicacion.map(m=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">${m.nombre}</span><span style="color:#8a6848;font-size:.78rem">${fmtDate(m.fecha)}</span></div><div class="pdf-row-detail">${m.motivo||'—'} · ${m.dias||'?'} días${m.vet?' · '+m.vet:''}</div></div>`).join(''):'<div class="pdf-empty">Sin medicaciones registradas</div>'}
      </div>
    </div>

    <!-- ENFERMEDADES -->
    ${enfermedades.length?`<div class="pdf-section pdf-section-full">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#8a5a3a,#6b3e1e)"><span>🦠 ENFERMEDADES</span><span>${enfermedades.length}</span></div>
      ${enfermedades.map(e=>`<div class="pdf-row"><div class="pdf-row-main"><span class="pdf-row-name">🦠 ${e.nombre}</span><span class="pdf-badge ${e.estado==='activa'?'pdf-badge-red':e.estado==='controlada'?'pdf-badge-gold':'pdf-badge-green'}">${e.estado}</span></div><div class="pdf-row-detail">${e.vet||''} · Aves: ${e.afectadas||'—'} · ${e.fechaCierre?'Cierre: '+fmtDate(e.fechaCierre):'Sin fecha cierre'}</div>${e.tratamiento?`<div class="pdf-row-detail" style="color:#6b3e1e">Trat: ${e.tratamiento}</div>`:''}</div>`).join('')}
    </div>`:''}

    <!-- ALIMENTACIÓN -->
    ${alimentos.length?`<div class="pdf-section pdf-section-full">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#6b5a2a,#4a3a18)"><span>🌾 ALIMENTACIÓN · Total: ${totalKgAlim.toLocaleString('es')} kg</span>${totalCostoAlim>0?`<span>$${totalCostoAlim.toLocaleString('es')}</span>`:'<span></span>'}</div>
      ${alimentos.slice(0,10).map(a=>`<div class="pdf-row" style="display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:8px;align-items:center"><span style="color:#8a6848;font-size:.78rem">${fmtDate(a.fecha)}</span><span style="font-weight:600">${a.tipo||'Alimento'}</span><span>${a.kg} kg</span><span style="color:#a86828">${a.costo?'$'+a.costo:''}</span></div>`).join('')}
    </div>`:''}

    <!-- FOTOS DE NOTAS -->
    ${notasFoto.length?`<div class="pdf-section pdf-section-full">
      <div class="pdf-section-header" style="background:linear-gradient(135deg,#5a4a3a,#3a2a1a)"><span>📷 NOTAS DE CAMPO CON FOTO</span><span>${notasFoto.length}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding:14px">
        ${notasFoto.map(n=>`<div><img src="${n.foto}" style="width:100%;border-radius:8px;max-height:140px;object-fit:cover"><p style="font-size:.75rem;color:#8a6848;margin-top:4px">${fmtDate(n.fecha)}${n.texto?' — '+n.texto.slice(0,50):''}</p></div>`).join('')}
      </div>
    </div>`:''}

    ${pdfFooter()}
  </div>`;

  document.getElementById('pdfOverlay').classList.remove('hidden');
  document.body.style.overflow='hidden';
};

window.imprimirPDF=function(){ window.print(); };
window.cerrarPDF=function(){
  document.getElementById('pdfOverlay').classList.add('hidden');
  document.body.style.overflow='';
};

// ─── SW ───────────────────────────────────────────────────────
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}