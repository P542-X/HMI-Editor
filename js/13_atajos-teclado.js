/* =================================================================
   ATAJOS DE TECLADO
================================================================= */
document.addEventListener('keydown', function(e) {
  var tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && SELECCION.length) { eliminarSeleccion(); }
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); hacerDeshacer(); }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); hacerRehacer(); }
  if (e.ctrlKey && e.key === 'c' && SELECCION.length) { e.preventDefault(); copiarElementos(); }
  if (e.ctrlKey && e.key === 'v') { e.preventDefault(); pegarElementos(); }
  if (e.ctrlKey && e.key === 'd' && SELECCION.length === 1) { e.preventDefault(); duplicarElemento(SELECCION[0]); }
  if (e.ctrlKey && e.key === 'a') { e.preventDefault(); seleccionarTodo(); }
  /* [ / ] → rotar 15° (Shift = 1°) */
  if (SELECCION.length === 1 && (e.key === '[' || e.key === ']')) {
    e.preventDefault();
    var paso = e.shiftKey ? 1 : 15;
    var elR  = ELEMENTOS.find(function(x) { return x.id === SELECCION[0]; });
    if (elR) {
      var rotActual = ((elR.props && elR.props.rotation) ? Number(elR.props.rotation) : 0);
      var nuevaRot  = e.key === ']'
        ? (rotActual + paso) % 360
        : ((rotActual - paso) % 360 + 360) % 360;
      aplicarRotacion(elR.id, nuevaRot);
      var inp = document.getElementById('pi-rot');
      if (inp) inp.value = Math.round(nuevaRot);
    }
    return;
  }

  if (SELECCION.length && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    /* Ctrl+Shift+Up/Down → capas. Ctrl+Up/Down → capas de a una */
    if (e.ctrlKey && e.shiftKey && e.key === 'ArrowUp')   { e.preventDefault(); traerAlFrente(); return; }
    if (e.ctrlKey && e.shiftKey && e.key === 'ArrowDown')  { e.preventDefault(); enviarAlFondo(); return; }
    if (e.ctrlKey && !e.shiftKey && e.key === 'ArrowUp')   { e.preventDefault(); subirCapa(); return; }
    if (e.ctrlKey && !e.shiftKey && e.key === 'ArrowDown')  { e.preventDefault(); bajarCapa(); return; }
    e.preventDefault();
    var paso = e.shiftKey ? 24 : 8;
    SELECCION.forEach(function(id) {
      var el = ELEMENTOS.find(function(x) { return x.id === id; });
      if (!el) return;
      if (e.key==='ArrowUp')    el.y = Math.max(0, el.y - paso);
      if (e.key==='ArrowDown')  el.y += paso;
      if (e.key==='ArrowLeft')  el.x = Math.max(0, el.x - paso);
      if (e.key==='ArrowRight') el.x += paso;
      var d = document.getElementById(id);
      if (d) { d.style.left = el.x+'px'; d.style.top = el.y+'px'; }
    });
    if (SELECCION.length === 1) {
      var el = ELEMENTOS.find(function(x) { return x.id === SELECCION[0]; });
      if (el) actualizarPosPanel(el);
    }
    guardarHistorial(); MODIFICADO = true;
  }
});

