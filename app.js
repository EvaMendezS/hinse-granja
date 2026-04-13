'use strict';

const DB = {
  get: k => JSON.parse(localStorage.getItem(k)) || [],
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};

const KEYS = {
  lotes: "lotes",
  vacunacion: "vacunacion",
  mortandad: "mortandad"
};

const uid = () => Date.now().toString(36);

function today() {
  return new Date().toISOString().split("T")[0];
}

/* =========================
   MODALES (FIX CRÍTICO)
========================= */

window.openModal = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
};

window.closeModal = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("hidden");
};

/* =========================
   INIT
========================= */

window.addEventListener("DOMContentLoaded", () => {
  renderAll();
});

/* =========================
   LOTES
========================= */

window.saveLote = function () {
  const lote = {
    id: uid(),
    fecha: document.getElementById("loteFecha").value,
    nombre: document.getElementById("loteNombre").value,
    cantidad: parseInt(document.getElementById("loteCantidad").value) || 0
  };

  if (!lote.nombre) return alert("Falta nombre");

  const data = DB.get(KEYS.lotes);
  data.push(lote);
  DB.set(KEYS.lotes, data);

  closeModal("modalLote");
  renderLotes();
};

function renderLotes() {
  const data = DB.get(KEYS.lotes);
  document.getElementById("loteList").innerHTML =
    data.map(l => `<p>${l.nombre} - ${l.cantidad}</p>`).join("");
}

/* =========================
   VACUNACION
========================= */

window.saveVacunacion = function () {
  const r = {
    id: uid(),
    fecha: document.getElementById("vacunacionFecha").value,
    lote: document.getElementById("vacunacionLote").value,
    vacuna: document.getElementById("vacunaNombre").value
  };

  const data = DB.get(KEYS.vacunacion);
  data.push(r);
  DB.set(KEYS.vacunacion, data);

  closeModal("modalVacunacion");
  renderVacunacion();
};

function renderVacunacion() {
  const data = DB.get(KEYS.vacunacion);
  document.getElementById("vacunacionList").innerHTML =
    data.map(v => `<p>${v.vacuna}</p>`).join("");
}

/* =========================
   MORTANDAD
========================= */

window.saveMortandad = function () {
  const r = {
    id: uid(),
    fecha: document.getElementById("mortandadFecha").value,
    lote: document.getElementById("mortandadLote").value,
    cantidad: parseInt(document.getElementById("mortandadCantidad").value) || 0
  };

  const data = DB.get(KEYS.mortandad);
  data.push(r);
  DB.set(KEYS.mortandad, data);

  closeModal("modalMortandad");
  renderMortandad();
};

function renderMortandad() {
  const data = DB.get(KEYS.mortandad);
  document.getElementById("mortandadList").innerHTML =
    data.map(m => `<p>💀 ${m.cantidad}</p>`).join("");
}

/* =========================
   DASHBOARD
========================= */

function renderAll() {
  renderLotes();
  renderVacunacion();
  renderMortandad();
}