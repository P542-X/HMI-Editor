/* =================================================================
   ELIMINAR
================================================================= */
function eliminarPorId(id) {
  ELEMENTOS = ELEMENTOS.filter(function(e) { return e.id !== id; });
  var d = document.getElementById(id); if (d) d.remove();
  delete PLC_SIM_ESTADOS[id];
  establecerSeleccion(SELECCION.filter(function(i) { return i !== id; }));
  guardarHistorial(); actualizarContador(); MODIFICADO = true;
  if (typeof refrescarPanelSim === 'function') refrescarPanelSim();
}

function eliminarSeleccion() {
  /* Eliminar en batch: suprimir refrescarPanelSim individual y llamar una sola vez al final */
  var ids = SELECCION.slice();
  ids.forEach(function(id) {
    ELEMENTOS = ELEMENTOS.filter(function(e) { return e.id !== id; });
    var d = document.getElementById(id); if (d) d.remove();
    delete PLC_SIM_ESTADOS[id];
  });
  establecerSeleccion([]);
  guardarHistorial(); actualizarContador(); MODIFICADO = true;
  if (typeof refrescarPanelSim === 'function') refrescarPanelSim();
}

