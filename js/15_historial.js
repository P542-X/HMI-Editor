/* =================================================================
   GUARDAR HISTORIAL
================================================================= */
function guardarHistorial() {
  HISTORIAL = HISTORIAL.slice(0, HIST_IDX + 1);
  HISTORIAL.push(JSON.parse(JSON.stringify(ELEMENTOS)));
  HIST_IDX = HISTORIAL.length - 1;
  if (HISTORIAL.length > 80) { HISTORIAL.shift(); HIST_IDX--; }
}

function hacerDeshacer() {
  if (HIST_IDX <= 0) return;
  HIST_IDX--;
  ELEMENTOS = JSON.parse(JSON.stringify(HISTORIAL[HIST_IDX]));
  document.getElementById('cstage').innerHTML = '<div id="selbox"></div>';
  rerenderizarTodos(); establecerSeleccion([]); actualizarContador();
  if (typeof refrescarPanelSim === 'function') refrescarPanelSim();
  mostrarToast('Deshacer');
}

function hacerRehacer() {
  if (HIST_IDX >= HISTORIAL.length - 1) return;
  HIST_IDX++;
  ELEMENTOS = JSON.parse(JSON.stringify(HISTORIAL[HIST_IDX]));
  document.getElementById('cstage').innerHTML = '<div id="selbox"></div>';
  rerenderizarTodos(); establecerSeleccion([]); actualizarContador();
  if (typeof refrescarPanelSim === 'function') refrescarPanelSim();
  mostrarToast('Rehacer');
}

