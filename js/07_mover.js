/* =================================================================
   MOVER
================================================================= */
function iniciarMovimiento(e) {
  e.preventDefault();
  var rect = document.getElementById('cwrap').getBoundingClientRect();
  var mx = e.clientX - rect.left, my = e.clientY - rect.top;
  var inicio = {};
  SELECCION.forEach(function(id) {
    var el = ELEMENTOS.find(function(x) { return x.id === id; });
    if (el) inicio[id] = { x: el.x, y: el.y };
  });
  function alMover(ev) {
    var dx = ev.clientX - rect.left - mx;
    var dy = ev.clientY - rect.top  - my;
    SELECCION.forEach(function(id) {
      var el = ELEMENTOS.find(function(x) { return x.id === id; });
      var st = inicio[id];
      if (!el || !st) return;
      el.x = Math.max(0, ajustarRed(st.x + dx));
      el.y = Math.max(0, ajustarRed(st.y + dy));
      var d = document.getElementById(id);
      if (d) { d.style.left = el.x + 'px'; d.style.top = el.y + 'px'; }
    });
    if (SELECCION.length === 1) {
      var el = ELEMENTOS.find(function(x) { return x.id === SELECCION[0]; });
      if (el) actualizarPosPanel(el);
    }
    mostrarGuias();
  }
  var canvas = document.getElementById('canvas');
  if (canvas) canvas.classList.add('canvas-dragging');
  function alSoltar() {
    ocultarGuias(); guardarHistorial(); MODIFICADO = true;
    if (canvas) canvas.classList.remove('canvas-dragging');
    document.removeEventListener('mousemove', alMover);
    document.removeEventListener('mouseup', alSoltar);
  }
  document.addEventListener('mousemove', alMover);
  document.addEventListener('mouseup', alSoltar);
}

