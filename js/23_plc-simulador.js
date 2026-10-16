/* =================================================================
   SIMULADOR PLC — panel flotante para falsear estados en diseñador
================================================================= */

var PLC_SIM_ACTIVO  = false;
var PLC_SIM_TIMERS  = {};

/* Tipos que muestran animación plc-activo (glow/blink) */
var _SIM_TIPOS_ANIM = [
  'auto-wheel','auto-tyre','auto-robot-arm','auto-spot-weld','auto-paint-gun',
  'auto-press-machine','auto-vin-scanner','auto-agv','auto-exhaust','auto-brake-disc',
  'auto-engine','auto-gearbox','auto-suspension','auto-abs-module',
  'motor-symbol','pump-symbol','valve-symbol',
  'fab-robot-industrial','fab-cnc-machine','fab-lathe','fab-drill-press',
  'fab-hydraulic-press','fab-welding-station','fab-paint-booth','fab-oven-industrial',
  'fab-cooling-tower','fab-boiler','fab-compressor-ind','fab-generator',
  'fab-switchboard','fab-plc-cabinet','fab-hmi-panel','fab-agv-station','fab-laser-cutter',
  'fab-3d-printer','fab-extruder','fab-winding-machine','fab-palletizer',
  'fab-scara-robot','fab-delta-robot','fab-cobot','fab-vision-system',
  'fab-injection-mold','fab-packaging','fab-quality-station',
  'deco-conveyor','deco-worker','deco-person-walk','deco-forklift','deco-truck',
  'deco-dump-truck','deco-crane','deco-elevator','deco-excavator','deco-bulldozer',
  'deco-wheelbarrow','deco-cement-mixer','deco-compressor','deco-welding',
  'deco-electric-hazard','deco-road-barrier','deco-cone','deco-fire-ext',
  'deco-safety-exit','deco-first-aid','deco-sign-hard','deco-helmet','deco-wire-spool',
  'status-led','btn-led','level-tank','progress-bar','alarm-banner','pid-faceplate',
  'sensor-prox','sensor-balancin','sensor-foto','sensor-encoder','sensor-flow',
  'sensor-pressure','sensor-temp','sensor-ultra','sensor-rfid','sensor-vfd'
];

/* Tipos que tienen variable PLC y deben aparecer aunque no sean "animables" */
var _SIM_TIPOS_PLC = [
  'btn-simple','btn-toggle','btn-emergency','btn-selector','btn-dpad',
  'btn-jog','btn-confirm','btn-set-reset','btn-multistate',
  'display','spinbox','slider-h','slider-v','setpoint-input',
  'alarm-list','alarm-ack','alarm-array','alarm-ticker','alarm-count',
  'trend-chart','data-table','bar-chart','xy-chart','recipe-table',
  'gauge','bargraph-v','numeric-7seg','multibit-led',
  'nav-button','img-plc','clock-widget','plc-info','datetime-display',
  'motor-symbol','pump-symbol','valve-symbol','level-tank','pid-faceplate',
  'sensor-prox','sensor-balancin','sensor-foto','sensor-encoder','sensor-flow',
  'sensor-pressure','sensor-temp','sensor-ultra','sensor-rfid','sensor-vfd'
];

/* ── Abrir / cerrar panel ─────────────────────────────────── */
function toggleSimulador() {
  PLC_SIM_ACTIVO = !PLC_SIM_ACTIVO;
  var panel = document.getElementById('plc-sim-panel');
  var btnTb = document.getElementById('btn-plc-sim');
  if (!panel) return;
  panel.classList.toggle('oculto', !PLC_SIM_ACTIVO);
  if (btnTb) btnTb.classList.toggle('activo', PLC_SIM_ACTIVO);
  if (PLC_SIM_ACTIVO) actualizarPanelSim();
}

function cerrarSimulador() {
  PLC_SIM_ACTIVO = false;
  var panel = document.getElementById('plc-sim-panel');
  var btnTb = document.getElementById('btn-plc-sim');
  if (panel) panel.classList.add('oculto');
  if (btnTb) btnTb.classList.remove('activo');
}

/* ── Determinar si un elemento debe aparecer en el SIM ───── */
function _simEsVisible(el) {
  var p = el.props || {};
  /* Tiene visibilidad condicional configurada */
  if ((p.visMode === 'on' || p.visMode === 'off') && p.visVar && p.visVar.trim()) return true;
  /* Tiene variable PLC explícita */
  if (p.animVar || p.var1 || p.varLed || p.varRun || p.varFault ||
      p.varOpen || p.varClosed || p.varAlarm || p.varAck || p.arrayVar ||
      p.varUp || p.varDown || p.varLeft || p.varRight ||
      p.visVar || p.varPV || p.varSP) return true;
  /* Alarmas de lista */
  for (var ai = 1; ai <= 8; ai++) { if (p['avar' + ai]) return true; }
  /* Tipos de animación física */
  if (_SIM_TIPOS_ANIM.indexOf(el.tipo) !== -1) return true;
  /* Tipos con lógica PLC por naturaleza */
  if (_SIM_TIPOS_PLC.indexOf(el.tipo) !== -1) return true;
  return false;
}

/* ── Construir fila HTML para un elemento ───────────── */
function _simHtmlFila(el) {
  var activo  = !!PLC_SIM_ESTADOS[el.id];
  var p       = el.props || {};
  var varName = p.animVar || p.var1 || p.varLed || p.varRun || p.varAlarm || '—';
  var label   = etiquetaTipoSim(el.tipo);
  var checked = activo ? 'checked' : '';
  return '<div class="plc-sim-row" id="simrow-' + el.id + '">' +
    '<div class="plc-sim-row-info">' +
      '<div class="plc-sim-row-tipo">' + label + ' · ' + el.id + '</div>' +
      '<div class="plc-sim-row-var">' + escHtml(varName) + '</div>' +
    '</div>' +
    '<label class="plc-sim-toggle">' +
      '<input type="checkbox" ' + checked +
        ' onchange="cambiarEstadoSim(\'' + el.id + '\', this.checked)">' +
      '<div class="plc-sim-toggle-track"></div>' +
    '</label>' +
  '</div>';
}

/* ── Construir / sincronizar filas del panel ─────────── */
function actualizarPanelSim() {
  var body  = document.getElementById('plc-sim-body');
  var empty = document.getElementById('plc-sim-empty');
  if (!body) return;

  var elems = ELEMENTOS.filter(_simEsVisible);

  /* Eliminar duplicados por id */
  var seen = {};
  elems = elems.filter(function(el) {
    if (seen[el.id]) return false;
    seen[el.id] = true;
    return true;
  });

  /* IDs que deben estar en el panel */
  var idsDeseados = elems.map(function(e) { return e.id; });

  /* Eliminar filas de elementos que ya no existen en el canvas */
  body.querySelectorAll('.plc-sim-row').forEach(function(row) {
    var elId = row.id.replace('simrow-', '');
    if (idsDeseados.indexOf(elId) === -1) row.remove();
  });

  /* Añadir filas nuevas / actualizar variable de las existentes */
  elems.forEach(function(el) {
    var existente = document.getElementById('simrow-' + el.id);
    if (!existente) {
      /* Fila nueva: insertar al final del body */
      var tmp = document.createElement('div');
      tmp.innerHTML = _simHtmlFila(el);
      body.appendChild(tmp.firstChild);
    } else {
      /* Fila existente: actualizar solo el nombre de variable (puede cambiar en props) */
      var p = el.props || {};
      var varName = p.animVar || p.var1 || p.varLed || p.varRun || p.varAlarm || '—';
      var varDiv = existente.querySelector('.plc-sim-row-var');
      if (varDiv) varDiv.textContent = varName;
    }
  });

  /* Mostrar/ocultar mensaje de panel vacío */
  if (empty) empty.style.display = elems.length === 0 ? '' : 'none';
}

function etiquetaTipoSim(tipo) {
  var map = {
    /* Botones y controles */
    'btn-simple':     'Botón',        'btn-led':           'Botón LED',
    'btn-toggle':     'Toggle',       'btn-emergency':     'Emergencia',
    'btn-selector':   'Selector',     'btn-dpad':          'DPad',
    'btn-jog':        'Jog',          'btn-confirm':       'Confirmar',
    'btn-set-reset':  'Set/Reset',    'btn-multistate':    'Multiestado',
    /* Datos */
    'display':        'Display',      'spinbox':           'Spinbox',
    'slider-h':       'Slider H',     'slider-v':          'Slider V',
    'setpoint-input': 'Setpoint',     'gauge':             'Gauge',
    'bargraph-v':     'Bargraph',     'numeric-7seg':      '7-Seg',
    'multibit-led':   'Multibit LED', 'xy-chart':          'XY Chart',
    'trend-chart':    'Trend',        'bar-chart':         'Bar Chart',
    'data-table':     'Tabla Datos',  'recipe-table':      'Receta',
    'datetime-display':'Fecha/Hora',
    /* Alarmas */
    'alarm-banner':   'Alarma',       'alarm-list':        'Lista Alarm.',
    'alarm-ack':      'ACK Alarm.',   'alarm-array':       'Array Alarm.',
    'alarm-ticker':   'Ticker',       'alarm-count':       'Contador Alarm.',
    /* Navegación */
    'nav-button':     'Nav. Botón',   'img-plc':           'Imagen PLC',
    /* Sistema */
    'clock-widget':   'Reloj',        'plc-info':          'Info PLC',
    /* Auto */
    'auto-wheel':     'Rueda',        'auto-tyre':         'Neumático',
    'auto-robot-arm': 'Brazo Robot',  'auto-spot-weld':    'Soldadura',
    'auto-paint-gun': 'Pistola Pin.', 'auto-press-machine':'Prensa',
    'auto-vin-scanner':'Scanner VIN', 'auto-agv':          'AGV Auto',
    'auto-exhaust':   'Escape',       'auto-brake-disc':   'Disco Freno',
    'auto-engine':    'Motor',        'auto-gearbox':      'Caja Cam.',
    'auto-suspension':'Suspensión',   'auto-abs-module':   'ABS',
    /* P&ID */
    'motor-symbol':   'Motor P&ID',   'pump-symbol':       'Bomba P&ID',
    'valve-symbol':   'Válvula',      'level-tank':        'Nivel Tanque',
    'status-led':     'LED Estado',   'progress-bar':      'Barra Prog.',
    'pid-faceplate':  'PID',
    /* Fab */
    'fab-robot-industrial':'Robot Ind.', 'fab-cnc-machine': 'CNC',
    'fab-lathe':      'Torno',          'fab-drill-press':  'Taladradora',
    'fab-hydraulic-press':'Prensa Hid.','fab-welding-station':'Soldadura',
    'fab-paint-booth':'Cabina Pin.',    'fab-oven-industrial':'Horno',
    'fab-cooling-tower':'Torre Enfr.',  'fab-boiler':       'Caldera',
    'fab-compressor-ind':'Compresor',   'fab-generator':    'Generador',
    'fab-switchboard':'Cuadro Elec.',   'fab-plc-cabinet':  'Cab. PLC',
    'fab-agv-station':'Estac. AGV',     'fab-laser-cutter': 'Corte Láser',
    'fab-3d-printer': 'Impres. 3D',     'fab-extruder':     'Extrusora',
    'fab-winding-machine':'Bobinadora', 'fab-palletizer':   'Paletizador',
    'fab-scara-robot':'Robot SCARA',    'fab-delta-robot':  'Robot Delta',
    'fab-cobot':      'Cobot',          'fab-vision-system':'Visión Art.',
    'fab-injection-mold':'Inyección',   'fab-packaging':    'Empaquetado',
    'fab-quality-station':'Calidad',
    /* Construcción */
    'deco-conveyor':  'Cinta Transp.', 'deco-worker':      'Operario',
    'deco-person-walk':'Persona',       'deco-forklift':    'Carretilla',
    'deco-truck':     'Camión',         'deco-dump-truck':  'Volquete',
    'deco-crane':     'Grúa',           'deco-elevator':    'Ascensor',
    'deco-excavator': 'Excavadora',     'deco-bulldozer':   'Bulldozer',
    'deco-wheelbarrow':'Carretillo',    'deco-cement-mixer':'Hormigonera',
    'deco-compressor':'Compresor',      'deco-welding':     'Soldadura',
    'deco-electric-hazard':'Alta Tensión','deco-road-barrier':'Barrera',
    'deco-cone':      'Cono',           'deco-fire-ext':    'Extintor',
    'deco-safety-exit':'Salida Emerg.', 'deco-first-aid':   'Primeros Aux.',
    'deco-sign-hard': 'Señal EPI',      'deco-helmet':      'Casco',
    'deco-wire-spool':'Carrete Cable',
    /* Sensores */
    'sensor-prox':    'Sensor Prox.',
    'sensor-balancin':'Final Carrera',
    'sensor-foto':    'Fotoeléctrico',
    'sensor-encoder': 'Encoder',
    'sensor-flow':    'Caudalímetro',
    'sensor-pressure':'Presostato',
    'sensor-temp':    'Termopar/PT100',
    'sensor-ultra':   'Ultrasonidos',
    'sensor-rfid':    'RFID/NFC',
    'sensor-vfd':     'Variador (VFD)'
  };
  return map[tipo] || tipo;
}

/* ── Cambiar estado de un elemento ──────────────────────────── */
function cambiarEstadoSim(id, activo) {
  PLC_SIM_ESTADOS[id] = activo;
  var div = document.getElementById(id);
  if (!div) return;
  if (activo) div.classList.add('plc-activo');
  else        div.classList.remove('plc-activo');
  aplicarEstadoVisual(id, activo);
}

function aplicarEstadoVisual(id, activo) {
  var el = ELEMENTOS.find(function(e) { return e.id === id; });
  if (!el) return;
  var div = document.getElementById(id);
  if (!div) return;

  /* ── Visibilidad condicional: aplica a TODOS los elementos ── */
  var vm = (el.props || {}).visMode || 'always';
  if (vm === 'on')  div.style.opacity = activo ? '1' : '0.08';
  if (vm === 'off') div.style.opacity = activo ? '0.08' : '1';
  if (vm === 'always') div.style.opacity = '';

  if (el.tipo === 'status-led') {
    var led = div.querySelector('.hstatus');
    if (led) led.classList.toggle('off', !activo);
  }
  if (el.tipo === 'alarm-banner') {
    var banner = div.querySelector('.halarm-banner');
    if (banner) banner.style.opacity = activo ? '1' : '0.3';
  }
  if (el.tipo === 'progress-bar') {
    var fill = div.querySelector('.hprogress-fill');
    if (fill) fill.style.width = activo ? '70%' : '0%';
    var val  = div.querySelector('.hprogress-val');
    if (val)  val.textContent = activo ? '70' : '—';
  }
  if (el.tipo === 'valve-symbol') {
    var vbody = div.querySelector('.hvalve-body svg');
    if (vbody) vbody.style.opacity = activo ? '1' : '0.4';
  }
  /* ── Sensores: ajuste visual cuando inactivos ── */
  var SENSORES = ['sensor-prox','sensor-balancin','sensor-foto','sensor-encoder',
                  'sensor-flow','sensor-pressure','sensor-temp','sensor-ultra',
                  'sensor-rfid','sensor-vfd'];
  if (SENSORES.indexOf(el.tipo) !== -1) {
    var svg = div.querySelector('svg');
    if (svg) svg.style.opacity = activo ? '1' : '0.45';
  }
}

/* ── Activar/desactivar todos ──────────────────────────────── */
function simTodoOn() {
  var body = document.getElementById('plc-sim-body');
  if (!body) return;
  body.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
    if (!cb.checked) {
      cb.checked = true;
      var row = cb.closest('.plc-sim-row');
      if (row) cambiarEstadoSim(row.id.replace('simrow-', ''), true);
    }
  });
}

function simTodoOff() {
  var body = document.getElementById('plc-sim-body');
  if (!body) return;
  body.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
    if (cb.checked) {
      cb.checked = false;
      var row = cb.closest('.plc-sim-row');
      if (row) cambiarEstadoSim(row.id.replace('simrow-', ''), false);
    }
  });
  PLC_SIM_ESTADOS = {};
}

/* ── Botón rápido desde panel propiedades ──────────────── */
function simularAnimacion(id) {
  var activo = !PLC_SIM_ESTADOS[id];
  PLC_SIM_ESTADOS[id] = activo;
  var div = document.getElementById(id);
  if (div) div.classList.toggle('plc-activo', activo);
  aplicarEstadoVisual(id, activo);
  if (PLC_SIM_ACTIVO) actualizarPanelSim();
  mostrarToast(activo ? '▶ Animación ACTIVA' : '◼ Animación PARADA');
}

/* ── Refrescar panel al añadir/eliminar/modificar elementos ── */
function refrescarPanelSim() {
  if (PLC_SIM_ACTIVO) actualizarPanelSim();
}
