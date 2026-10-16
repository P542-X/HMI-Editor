/* =================================================================
   GESTIÓN DE CAPAS — Traer al frente / Enviar al fondo
================================================================= */

function traerAlFrente() {
  if (SELECCION.length === 0) return;
  SELECCION.forEach(function(id) {
    var idx = ELEMENTOS.findIndex(function(e) { return e.id === id; });
    if (idx < 0 || idx === ELEMENTOS.length - 1) return;
    var el = ELEMENTOS.splice(idx, 1)[0];
    ELEMENTOS.push(el);
  });
  rerenderizarTodos();
  SELECCION.forEach(function(id) {
    var d = document.getElementById(id);
    if (d) d.classList.add(SELECCION.length === 1 ? 'sel' : 'msel');
  });
  guardarHistorial();
  MODIFICADO = true;
  mostrarToast('Traído al frente');
}

function enviarAlFondo() {
  if (SELECCION.length === 0) return;
  /* Invertir para mantener orden relativo al enviar varios al fondo */
  SELECCION.slice().reverse().forEach(function(id) {
    var idx = ELEMENTOS.findIndex(function(e) { return e.id === id; });
    if (idx <= 0) return;
    var el = ELEMENTOS.splice(idx, 1)[0];
    ELEMENTOS.unshift(el);
  });
  rerenderizarTodos();
  SELECCION.forEach(function(id) {
    var d = document.getElementById(id);
    if (d) d.classList.add(SELECCION.length === 1 ? 'sel' : 'msel');
  });
  guardarHistorial();
  MODIFICADO = true;
  mostrarToast('Enviado al fondo');
}

function subirCapa() {
  if (SELECCION.length === 0) return;
  /* Procesar de atrás hacia adelante para no perturbar índices */
  for (var i = ELEMENTOS.length - 2; i >= 0; i--) {
    if (SELECCION.includes(ELEMENTOS[i].id)) {
      var tmp = ELEMENTOS[i];
      ELEMENTOS[i] = ELEMENTOS[i + 1];
      ELEMENTOS[i + 1] = tmp;
    }
  }
  rerenderizarTodos();
  SELECCION.forEach(function(id) {
    var d = document.getElementById(id);
    if (d) d.classList.add(SELECCION.length === 1 ? 'sel' : 'msel');
  });
  guardarHistorial();
  MODIFICADO = true;
  mostrarToast('Subir capa');
}

function bajarCapa() {
  if (SELECCION.length === 0) return;
  /* Procesar de adelante hacia atrás */
  for (var i = 1; i < ELEMENTOS.length; i++) {
    if (SELECCION.includes(ELEMENTOS[i].id)) {
      var tmp = ELEMENTOS[i];
      ELEMENTOS[i] = ELEMENTOS[i - 1];
      ELEMENTOS[i - 1] = tmp;
      i++; /* saltar el elemento que acabamos de pasar */
    }
  }
  rerenderizarTodos();
  SELECCION.forEach(function(id) {
    var d = document.getElementById(id);
    if (d) d.classList.add(SELECCION.length === 1 ? 'sel' : 'msel');
  });
  guardarHistorial();
  MODIFICADO = true;
  mostrarToast('Bajar capa');
}
