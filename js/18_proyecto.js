/* =================================================================
   GUARDAR / CARGAR PROYECTO
================================================================= */
function guardarProyecto() {
  var datos = JSON.stringify({ version: 6, elementos: ELEMENTOS, plcs: PLCS, plc: PLC, contadorId: CONTADOR_ID, fondo: FONDO_CANVAS, resolucion: RESOLUCION }, null, 2);
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([datos], { type: 'application/json' }));
  a.download = (PLC.project || 'hmi').replace(/\s+/g,'_') + '.json';
  a.click();
  MODIFICADO = false;
  mostrarToast('Guardado');
}

function cargarProyecto() { document.getElementById('inp-cargar').click(); }

function leerArchivo(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      aplicarProyecto(JSON.parse(ev.target.result));
      mostrarToast('Proyecto cargado');
    } catch(err) { alert('Error al cargar: ' + err); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* Carga en el editor un proyecto ya parseado (archivo .json o pantalla de demo) */
function aplicarProyecto(datos) {
  ELEMENTOS    = datos.elementos || datos.els || [];
  /* multi-PLC: cargar array si existe, si no migrar el campo plc legacy */
  if (datos.plcs && Array.isArray(datos.plcs) && datos.plcs.length) {
    PLCS = datos.plcs;
  } else if (datos.plc) {
    /* migración de proyecto antiguo (versión 5) → convertir a array */
    PLCS = [datos.plc];
    if (!PLCS[0].label) PLCS[0].label = 'PLC-1';
    if (!PLCS[0].color) PLCS[0].color = '#1565c0';
  }
  PLC = PLCS[0];
  CONTADOR_ID  = datos.contadorId || datos.idc || ELEMENTOS.length;
  FONDO_CANVAS = datos.fondo || datos.bg || '#f0f0ec';
  RESOLUCION   = datos.resolucion || '800x480';
  var selRes = document.getElementById('res-selector');
  if (selRes) selRes.value = RESOLUCION;
  actualizarMarcoResolucion();
  var cwrap = document.getElementById('cwrap');
  if (cwrap) cwrap.style.background = FONDO_CANVAS;
  document.getElementById('cstage').innerHTML = '<div id="selbox"></div>';
  rerenderizarTodos(); establecerSeleccion([]); actualizarContador();
  guardarHistorial(); MODIFICADO = false;
  if (typeof _mplcActualizarPildora === 'function') _mplcActualizarPildora();
  else {
    document.getElementById('pdot').className  = 'pdot' + (PLC.ip ? ' ok' : '');
    document.getElementById('ptxt').textContent = PLC.ip || 'SIN CONFIGURAR';
  }
  if (typeof refrescarPanelSim === 'function') refrescarPanelSim();
}

