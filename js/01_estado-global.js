
/* =================================================================
   ESTADO GLOBAL
================================================================= */
var ELEMENTOS    = [];
var POPUPS       = {};
var SELECCION    = [];
var CONTADOR_ID  = 0;
var MODIFICADO   = false;
var CLIPBOARD    = null;   /* portapapeles interno — copia de elemento(s) */
var FONDO_CANVAS = '#f0f0ec';
var HISTORIAL    = [];
var HIST_IDX     = -1;
/* ── Multi-PLC ──────────────────────────────────────────────────────
   PLCS[]  → array de conexiones (máx. 8)
   PLC     → alias a PLCS[0] para compatibilidad con código existente
   Cada elemento del canvas puede tener props.plcIdx (0-based, default 0)
   Los colores de badge se usan en el modal y en la tabla exportada
─────────────────────────────────────────────────────────────────── */
var PLCS = [
  { label: 'PLC-1', ip: '', user: 'Admin', pass: '', color: '#1565c0', anon: true }
];
/* Alias backward-compat: todo el código antiguo que usa PLC.ip / PLC.user
   sigue funcionando porque apunta al primer elemento */
var PLC = PLCS[0];
PLC.project = 'Mi HMI';   /* campo global único, no por PLC */
var TIPO_ARRASTRE = null;
var ID_IMG_ACTIVO = null;
var PLC_SIM_ESTADOS = {};   /* estado del simulador PLC — activo desde el inicio */
var MODO_LUPA       = false;  /* modo inspección lupa — activo/inactivo */

/* ── Grid / Snap ── */
var SNAP_ACTIVO = true;   /* true = snap al grid, false = libre */
var SNAP_PX     = 8;      /* tamaño del grid: 8, 4 o 1 */

/* ── Resoluciones MTP ── */
var RESOLUCIONES = {
  '800x480':    { w: 800,  h: 480,  label: '800 × 480 px — MTP700'   },
  '1280x800':   { w: 1280, h: 800,  label: '1280 × 800 px — MTP1000' },
  '1280x800b':  { w: 1280, h: 800,  label: '1280 × 800 px — MTP1200' },
  '1366x768':   { w: 1366, h: 768,  label: '1366 × 768 px — MTP1500' },
  '1920x1080':  { w: 1920, h: 1080, label: '1920 × 1080 px — MTP1900' },
  '1920x1080b': { w: 1920, h: 1080, label: '1920 × 1080 px — MTP2200' }
};
var RESOLUCION = '800x480';

function cambiarResolucion(key) {
  RESOLUCION = key;
  actualizarMarcoResolucion();
}

function actualizarMarcoResolucion() {
  var r = RESOLUCIONES[RESOLUCION];
  var frame = document.getElementById('res-frame');
  var lbl   = document.getElementById('res-label');
  if (!frame || !r) return;
  frame.style.width  = r.w + 'px';
  frame.style.height = r.h + 'px';
  lbl.textContent = r.label;
  /* ajustar el cstage al menos al tamaño del marco */
  var stage = document.getElementById('cstage');
  if (stage) {
    stage.style.minWidth  = r.w + 'px';
    stage.style.minHeight = r.h + 'px';
  }
}

var TAMANIOS = {
  'btn-simple':    [150, 48],
  'btn-led':       [164, 52],
  'btn-toggle':    [154, 48],
  'btn-emergency': [190, 56],
  'btn-selector':  [190, 42],
  'btn-dpad':      [136, 136],
  'display':       [220, 64],
  'status-led':    [56,  56],
  'img-plc':       [120, 80],
  'label':         [160, 36],
  'tooltip-node':  [140, 60],
  /* ── Alarmas ── */
  'alarm-banner':  [280, 56],
  'alarm-list':    [300, 192],
  'alarm-ack':     [180, 48],
  'alarm-array':   [520, 340],
  'popup-btn':     [160, 52],
  'alarm-plc':     [520, 380],
  'alarm-word':    [520, 380],
  /* ── Datos ── */
  'progress-bar':  [240, 64],
  'trend-chart':   [300, 160],
  'data-table':    [300, 192],
  /* ── Navegación ── */
  'nav-button':    [160, 48],
  'nav-menu':      [168, 280],
  // ── CONTROLES AVANZADOS
  'btn-jog':       [180, 52],
  'btn-confirm':   [200, 56],
  'btn-set-reset': [200, 48],
  'spinbox':       [200, 72],
  'slider-h':      [260, 72],
  'slider-v':      [72,  200],
  'btn-multistate':[200, 48],
  // ── P&ID
  'motor-symbol':  [80,  100],
  'valve-symbol':  [80,  80],
  'pump-symbol':   [80,  100],
  'level-tank':    [100, 200],
  'pid-faceplate': [240, 120],
  // ── MEDICIÓN
  'gauge':         [160, 160],
  'bargraph-v':    [80,  200],
  'numeric-7seg':  [200, 64],
  'multibit-led':  [240, 80],
  'setpoint-input':[220, 72],
  'xy-chart':      [300, 200],
  // ── DATOS AVANZADOS
  'bar-chart':     [280, 160],
  'recipe-table':  [300, 200],
  'datetime-display':[200, 72],
  // ── ALARMAS AVANZADAS
  'alarm-ticker':  [320, 48],
  'alarm-count':   [200, 64],
  // ── DECORACIÓN
  'frame-box':     [300, 200],
  'separator-h':   [300, 24],
  'title-banner':  [300, 48],
  'text-block':    [260, 80],
  // ── SISTEMA
  'clock-widget':  [180, 64],
  'plc-info':      [240, 120],
  'image-static':  [160, 80],
  // ── CONSTRUCCIÓN (todos los elementos)
  'deco-worker':        [80,  120],
  'deco-person-walk':   [70,  110],
  'deco-forklift':      [150, 100],
  'deco-truck':         [180, 90],
  'deco-excavator':     [160, 110],
  'deco-crane':         [120, 200],
  'deco-elevator':      [80,  160],
  'deco-conveyor':      [200, 80],
  'deco-rack':          [130, 160],
  'deco-pallet':        [120, 100],
  'deco-barrel':        [70,  100],
  'deco-brickwall':     [200, 80],
  'deco-cone':          [60,  80],
  'deco-sign-hard':     [70,  80],
  // ── CONSTRUCCIÓN EXTRA
  'deco-helmet':        [80,  80],
  'deco-fire-ext':      [60,  100],
  'deco-safety-exit':   [80,  60],
  'deco-first-aid':     [70,  70],
  'deco-electric-hazard':[70, 70],
  'deco-road-barrier':  [120, 70],
  'deco-scaffold':      [150, 180],
  'deco-wheelbarrow':   [100, 80],
  'deco-cement-mixer':  [120, 110],
  'deco-bulldozer':     [170, 110],
  'deco-dump-truck':    [180, 100],
  'deco-ladder':        [60,  160],
  'deco-toolbox':       [80,  70],
  'deco-wire-spool':    [80,  80],
  'deco-welding':       [90,  100],
  'deco-compressor':    [120, 90],
  // ── AUTOMOCIÓN / ABS
  'auto-car-side':      [180, 90],
  'auto-car-top':       [140, 240],
  'auto-wheel':         [100, 100],
  'auto-engine':        [160, 120],
  'auto-abs-module':    [140, 100],
  'auto-brake-disc':    [100, 100],
  'auto-caliper':       [110, 80],
  'auto-suspension':    [100, 140],
  'auto-gearbox':       [140, 120],
  'auto-battery-ev':    [160, 90],
  'auto-robot-arm':     [130, 160],
  'auto-spot-weld':     [120, 120],
  'auto-paint-gun':     [90,  110],
  'auto-car-body':      [200, 110],
  'auto-press-machine': [130, 160],
  'auto-vin-scanner':   [120, 90],
  'auto-tyre':          [100, 100],
  'auto-exhaust':       [160, 70],
  'auto-dashboard':     [200, 120],
  'auto-agv':           [150, 110],
  // ── FÁBRICA / MANUFACTURA
  'fab-robot-industrial':[140, 160],
  'fab-cnc-machine':    [160, 140],
  'fab-lathe':          [180, 120],
  'fab-drill-press':    [100, 160],
  'fab-hydraulic-press':[120, 160],
  'fab-welding-station':[140, 130],
  'fab-paint-booth':    [160, 120],
  'fab-oven-industrial':[150, 130],
  'fab-cooling-tower':  [110, 160],
  'fab-boiler':         [100, 160],
  'fab-compressor-ind': [130, 130],
  'fab-generator':      [160, 100],
  'fab-transformer':    [100, 130],
  'fab-switchboard':    [130, 160],
  'fab-plc-cabinet':    [100, 160],
  'fab-hmi-panel':      [120, 100],
  'fab-safety-fence':   [200, 100],
  'fab-agv-station':    [160, 120],
  'fab-quality-station':[140, 120],
  'fab-packaging':      [150, 130],
  'fab-palletizer':     [130, 160],
  'fab-scara-robot':    [120, 140],
  'fab-delta-robot':    [120, 130],
  'fab-cobot':          [110, 150],
  'fab-vision-system':  [130, 110],
  'fab-laser-cutter':   [180, 130],
  'fab-3d-printer':     [120, 140],
  'fab-injection-mold': [170, 130],
  'fab-extruder':       [180, 100],
  'fab-winding-machine':[150, 120],
  /* ── Sensores ── */
  'sensor-prox':     [80,  100],
  'sensor-balancin': [90,  100],
  'sensor-foto':     [120, 80],
  'sensor-encoder':  [90,  100],
  'sensor-flow':     [100, 90],
  'sensor-pressure': [90,  100],
  'sensor-temp':     [60,  110],
  'sensor-ultra':    [100, 90],
  'sensor-rfid':     [90,  100],
  'sensor-vfd':      [130, 120],
  /* ── Info-Card ── */
  'info-card':       [200, 120],
  /* ── Formas vectoriales ── */
  'shape-rect':      [200, 120],
  'shape-circle':    [120, 120],
  'shape-line':      [200, 4],
  'shape-curve':     [200, 100],
  'shape-triangle':  [120, 100],
  /* ── Tuberías ── */
  'pipe-h':          [200, 48],
  'pipe-v':          [48,  200],
  'pipe-elbow':      [80,  80],
  'pipe-tee':        [80,  80],
  'pipe-cross':      [80,  80],
  /* ── Motor / Bomba decorativos ── */
  'deco-motor-el':   [100, 120],
  'deco-pump-cent':  [100, 120],
  /* ── Piloto señalización ── */
  'signal-lamp':     [72,  180],
  /* ── P&ID Proceso ── */
  'valve-motorized': [80, 100],
  'valve-butterfly': [80, 80],
  'valve-safety':    [80, 90],
  'fan-symbol':      [100, 100],
  'agitator-symbol': [80, 120],
  'conveyor-pid':    [240, 80],
  'dosing-pump':     [90, 110],
  'heat-exchanger':  [120, 100],
  'filter-symbol':   [80, 90],
  'compressor-symbol':[90, 110],
  'silo':            [90, 160],
  'tank-horizontal': [200, 100],
  'tank-conical':    [100, 160],
  'reactor-vessel':  [110, 160],
  'separator-vessel':[120, 100],
  /* ── Motores / Accionamientos ── */
  'motor-starter':   [160, 80],
  'vfd-faceplate':   [200, 140],
  'servo-axis':      [200, 80],
  'motor-runtime':   [180, 80],
  'brake-display':   [140, 72],
  /* ── Instrumentación ── */
  'thermometer-display': [80, 160],
  'pressure-gauge-pid':  [120, 120],
  'flow-totalizer':      [180, 80],
  'level-indicator':     [80, 160],
  'energy-meter':        [200, 120],
  'ph-meter':            [160, 80],
  'rpm-display':         [180, 80],
  'temperature-4zone':   [260, 80],
  /* ── Control / Regulación ── */
  'pid-controller':     [220, 140],
  'sequence-stepper':   [260, 72],
  'timer-display':      [200, 72],
  'counter-display':    [180, 72],
  'interlock-display':  [200, 120],
  'manual-auto-switch': [160, 56],
  /* ── Eléctrico / Potencia ── */
  'circuit-breaker':    [80, 120],
  'contactor-display':  [80, 100],
  'power-meter':        [200, 120],
  'ups-display':        [200, 100],
  'generator-display':  [200, 120],
  /* ── Calidad / Producción ── */
  'batch-display':      [220, 100],
  'production-counter': [200, 80],
  'cycle-time':         [200, 80],
  'quality-gauge':      [200, 120],
  /* ── Seguridad ── */
  'safety-door':        [100, 120],
  'estop-circuit':      [160, 80],
  'two-hand-control':   [160, 80],
  /* ── Utilities ── */
  'pump-station':       [200, 120],
  'compressed-air':     [180, 80],
  /* ── TIA Portal ── */
  'analog-output':      [180, 72],
  'trend-comparison':   [300, 160],
  'string-display':     [240, 56],
  'plc-clock-sync':     [200, 64],
};

var PROPS_DEFAULT = {
  'btn-simple':    { text: 'ARRANCAR', subtext: '', icon: '\u25b6', variant: '', var1: '"DB1".Marcha', action: 'pulse', pulseMs: 800, fontSize: 12 },
  'btn-led':       { text: 'MOTOR', subtext: '', icon: '\u25c9', var1: '"DB1".Marcha', varLed: '"DB1".Motor', action: 'pulse', pulseMs: 800, fontSize: 12 },
  'btn-toggle':    { text: 'ACTIVAR', subtext: '', icon: '\u21cc', var1: '"DB1".Var1', contact: 'NA', fontSize: 12 },
  'btn-emergency': { text: 'EMERGENCY STOP', subtext: 'Parada inmediata', var1: '"DB1".PE', contact: 'NC', fontSize: 11 },
  'btn-selector':  { opt1: 'AUTO', opt2: 'MANUAL', opt3: '', var1: '"DB1".Modo', val1: 'true', val2: 'false', val3: '', fontSize: 11 },
  'btn-dpad':      { varUp: '"DB1".Up', varDown: '"DB1".Down', varLeft: '"DB1".Left', varRight: '"DB1".Right', dpadMode: 'pulse', pulseMs: 800 },
  'display':       { label: 'CODIGO', var1: '"DB1".Barcode', pollMs: 1000, previewVal: '4028753001', fontSize: 13 },
  'status-led':    { var1: '"DB1".Estado', color: '#2e7d32', pollMs: 1000, triggerVal: 'true' },
  'img-plc':       { var1: '"DB1".MostrarImg', triggerVal: 'true', pollMs: 1000, imgData: '', imgName: '' },
  'label':         { text: 'ETIQUETA', fontSize: 11 },
  'tooltip-node':  { text: 'NODE', shape: 'none', fillColor: 'transparent', strokeColor: 'transparent', fontColor: '#1a1a18', fontSize: 11, conn1: '', conn2: '', conn3: '', conn4: '', notes: '', var1: '', pollMs: 500, showValue: false, valueColor: '#00e5b0', unit: '' },
  /* ── Alarmas ── */
  'alarm-banner':  { text: 'FALLO MOTOR', subtext: 'Revisar variador', var1: '"DB1".Alarma1', triggerVal: 'true', color: '#c62828', pollMs: 500, hideWhenInactive: false },
  'alarm-list':    { title: 'ALARMAS ACTIVAS',
                     alNames: 'Fallo Motor\nPresión alta\nTemperatura\nNivel bajo',
                     alVars:  '"DB1".Alarm1\n"DB1".Alarm2\n"DB1".Alarm3\n"DB1".Alarm4',
                     pageSize: 15, pollMs: 500, hideRowsWhenInactive: true,
                     showDateCol: true, showAckCol: false },
  'alarm-ack':     { text: 'RECONOCER', varAlarm: '"DB1".Alarma1', varAck: '"DB1".Ack1', pollMs: 500 },
  'alarm-array':   { title: 'ALARMAS', arrayVar: '"DB_Alarmas".Bits', arraySize: 64, pollMs: 1000, maxHistory: 200, names: '', showHistory: false },
  'popup-btn':     { label: 'VER DETALLE', icon: '⬡', color: '#1565c0', textColor: '#ffffff', fontSize: 12, popupW: 700, popupH: 480, popupTitle: 'Detalle', popupBg: '#ffffff' },
  'alarm-plc':     { title: 'ALARMAS PLC', pollMs: 2000, showHistory: false, maxHistory: 200, language: 'es-ES' },
  'alarm-word':    { title: 'ALARMAS WORD', words: '"DB_Alarmas".Word1', pollMs: 1000, maxHistory: 200, showHistory: false },
  /* ── Datos ── */
  'progress-bar':  { label: 'PRESIÓN', var1: '"DB1".Presion', min: 0, max: 100, unit: 'bar', color: '#1565c0', pollMs: 500, fontSize: 12 },
  'trend-chart':   { label: 'TEMPERATURA', var1: '"DB1".Temp', min: 0, max: 100, unit: '°C', color: '#c62828', points: 30, pollMs: 1000 },
  'data-table':    { title: 'VARIABLES',
                     dlabel1: 'Velocidad', dvar1: '"DB1".Vel',
                     dlabel2: 'Presión',   dvar2: '"DB1".Pres',
                     dlabel3: 'Temp.',     dvar3: '"DB1".Temp',
                     dlabel4: 'Caudal',    dvar4: '"DB1".Caud',
                     dlabel5: '', dvar5: '',
                     dlabel6: '', dvar6: '',
                     pollMs: 1000, fontSize: 11 },
  /* ── Navegación ── */
  'nav-button':    { text: 'PANTALLA 2', icon: '\u2192', target: 'pantalla2.html', variant: 'normal', fontSize: 12 },
  'nav-menu':      { title: 'NAVEGACIÓN',
                     nlabel1: 'Principal',  ntarget1: 'index.html',     nicon1: '\u2302',
                     nlabel2: 'Motores',    ntarget2: 'motores.html',   nicon2: '\u26a1',
                     nlabel3: 'Alarmas',    ntarget3: 'alarmas.html',   nicon3: '\u26a0',
                     nlabel4: 'Histórico',  ntarget4: 'historico.html', nicon4: '\u23f2',
                     nlabel5: '', ntarget5: '', nicon5: '',
                     fontSize: 11 },
  /* ── Controles avanzados ── */
  'btn-jog':        { text: 'JOG', subtext: 'Mantener pulsado', icon: '\u21bb', var1: '"DB1".Jog', fontSize: 12 },
  'btn-confirm':    { text: 'CONFIRMAR', subtext: 'Doble click para ejecutar', icon: '\u26a0', var1: '"DB1".Confirm', fontSize: 11 },
  'btn-set-reset':  { textSet: 'SET', textReset: 'RESET', var1: '"DB1".Var1' },
  'btn-multistate': { text: 'MODO', states: 'STOP,AUTO,MANUAL', colors: '#c62828,#2e7d32,#1565c0', var1: '"DB1".Modo', fontSize: 11 },
  'spinbox':        { label: 'VELOCIDAD', unit: 'rpm', min: 0, max: 1500, step: 10, var1: '"DB1".Velocidad', fontSize: 14 },
  'slider-h':       { label: 'CONSIGNA', unit: '%', min: 0, max: 100, color: '#1565c0', var1: '"DB1".Consigna' },
  'slider-v':       { label: 'NIVEL', unit: '%', min: 0, max: 100, color: '#1565c0', var1: '"DB1".Nivel' },
  /* ── P&ID ── */
  'motor-symbol':   { label: 'M1', varRun: '"DB1".Motor_Run', varFault: '"DB1".Motor_Fault' },
  'pump-symbol':    { label: 'P1', varRun: '"DB1".Pump_Run', varFault: '"DB1".Pump_Fault' },
  'valve-symbol':   { label: 'V1', varOpen: '"DB1".Valve_Open', varClosed: '"DB1".Valve_Closed' },
  'level-tank':     { label: 'TANQUE', unit: '%', min: 0, max: 100, color: '#1565c0', var1: '"DB1".Nivel' },
  'pid-faceplate':  { title: 'TC-101', unitPV: '\u00b0C', varPV: '"DB1".PV', varSP: '"DB1".SP', varOut: '"DB1".Out' },
  /* ── Medición ── */
  'gauge':          { label: 'PRESIÓN', unit: 'bar', min: 0, max: 10, color: '#f57c00', var1: '"DB1".Presion' },
  'bargraph-v':     { label: 'NIVEL', unit: '%', min: 0, max: 100, color: '#1565c0', var1: '"DB1".Nivel' },
  'numeric-7seg':   { label: 'CONTADOR', decimals: 0, var1: '"DB1".Counter' },
  'multibit-led':   { label: 'WORD', bits: 8, var1: '"DB1".StatusWord' },
  'setpoint-input': { label: 'SETPOINT', unit: '\u00b0C', min: 0, max: 200, var1: '"DB1".SP' },
  'xy-chart':       { label: 'XY', points: 50, varX: '"DB1".PosX', varY: '"DB1".PosY' },
  /* ── Datos avanzados ── */
  'bar-chart':      { title: 'BARRAS', unit: '%', max: 100,
                      blabel1: 'Motor 1', blabel2: 'Motor 2', blabel3: 'Motor 3', blabel4: 'Motor 4' },
  'recipe-table':   { title: 'RECETA',
                      rlabel1: 'Temperatura', runit1: '\u00b0C',
                      rlabel2: 'Presión',     runit2: 'bar',
                      rlabel3: 'Velocidad',   runit3: 'rpm',
                      rlabel4: '', runit4: '', rlabel5: '', runit5: '', rlabel6: '', runit6: '' },
  'datetime-display': { fontSize: 20, source: 'system' },
  /* ── Alarmas avanzadas ── */
  'alarm-ticker':   { amsg1: 'Fallo Motor 1', amsg2: 'Presión alta', amsg3: '' },
  'alarm-count':    { threshold: 1, var1: '"DB1".AlarmCount', pollMs: 1000 },
  /* ── Decoración ── */
  'frame-box':      { title: 'ZONA', color: '#1a1a18' },
  'separator-h':    { label: '', color: '#1a1a18' },
  'title-banner':   { text: 'TÍTULO PANTALLA', subtext: 'Línea 1 \u00b7 Turno Ma\u00f1ana', icon: '\u2699', badge: 'v1.0', fontSize: 12 },
  'text-block':     { text: 'Texto informativo\nLínea 2' },
  /* ── Sistema ── */
  'clock-widget':   { fontSize: 22 },
  'plc-info':       { ip: '192.168.1.1', model: 'S7-1214C' },
  'image-static':   { imgData: '', imgName: '', fit: 'contain' },
  /* ── Sensores ── */
  'sensor-prox':     { label: 'S1',   color: '#f9a825', var1: '"DB1".Sensor1', pollMs: 500, triggerVal: 'true' },
  'sensor-balancin': { label: 'LS1',  color: '#00c853', var1: '"DB1".FinCarrera1', pollMs: 500, triggerVal: 'true' },
  'sensor-foto':     { label: 'PH1',  color: '#00e5ff', var1: '"DB1".Foto1', pollMs: 500, triggerVal: 'true' },
  'sensor-encoder':  { label: 'ENC1', color: '#29b6f6', varPV: '"DB1".Encoder1', pollMs: 100 },
  'sensor-flow':     { label: 'FT1',  color: '#00acc1', var1: '"DB1".Caudal1', pollMs: 500 },
  'sensor-pressure': { label: 'PS1',  color: '#ef5350', var1: '"DB1".Presion1', pollMs: 500, triggerVal: 'true' },
  'sensor-temp':     { label: 'TT1',  color: '#f9a825', var1: '"DB1".Temp1', pollMs: 1000 },
  'sensor-ultra':    { label: 'US1',  color: '#9c27b0', var1: '"DB1".Distancia1', pollMs: 200 },
  'sensor-rfid':     { label: 'RF1',  color: '#00e5ff', var1: '"DB1".RFID_Tag', pollMs: 500 },
  'sensor-vfd':      { label: 'VFD1', color: '#1565c0', varPV: '"DB1".VFD_Hz', varRun: '"DB1".VFD_Run', pollMs: 500 },
  /* ── Info-Card ── */
  'info-card': {
    title: 'MOTOR M1', icon: '\u24d8', badge: 'DB1', notes: '',
    rkey1: 'Var. arranque', rval1: '"DB1".Motor_Run',  rcol1: 'green',
    rkey2: 'Var. fallo',   rval2: '"DB1".Motor_Fault', rcol2: 'red',
    rkey3: 'Velocidad',    rval3: '"DB1".VFD_Hz',      rcol3: 'blue',
    rkey4: 'Temperatura',  rval4: '"DB1".Temp_Motor',  rcol4: 'orange',
    rkey5: '', rval5: '', rcol5: 'blue',
    rkey6: '', rval6: '', rcol6: 'blue'
  },
  /* ── Formas vectoriales ── */
  'shape-rect':     { fill: '#1565c0', fillOpacity: 0.15, stroke: '#1565c0', strokeWidth: 2, radius: 0 },
  'shape-circle':   { fill: '#2e7d32', fillOpacity: 0.15, stroke: '#2e7d32', strokeWidth: 2 },
  'shape-line':     { stroke: '#1a1a18', strokeWidth: 2, angle: 0, cap: 'round' },
  'shape-curve':    { stroke: '#c62828', strokeWidth: 2, curvature: 50, cap: 'round' },
  'shape-triangle': { fill: '#f57c00', fillOpacity: 0.15, stroke: '#f57c00', strokeWidth: 2, direction: 'up' },
  /* ── Tuberías ── */
  'pipe-h':        { color: '#546e7a', fluidColor: '#29b6f6', showFlow: false, label: '' },
  'pipe-v':        { color: '#546e7a', fluidColor: '#29b6f6', showFlow: false, label: '' },
  'pipe-elbow':    { color: '#546e7a', fluidColor: '#29b6f6', direction: 'tr' },
  'pipe-tee':      { color: '#546e7a', fluidColor: '#29b6f6', direction: 'down' },
  'pipe-cross':    { color: '#546e7a', fluidColor: '#29b6f6' },
  /* ── Motor / Bomba decorativos ── */
  'deco-motor-el':  { color: '#37474f', label: 'M1' },
  'deco-pump-cent': { color: '#37474f', label: 'P1' },
  /* ── Piloto señalización ── */
  'signal-lamp': {
    label: 'SL1', pollMs: 500,
    varR: '"DB1".Lamp_Red',    trigR: 'true',
    varY: '"DB1".Lamp_Yellow', trigY: 'true',
    varG: '"DB1".Lamp_Green',  trigG: 'true',
    varB: '"DB1".Lamp_Blue',   trigB: 'true',
    useBlue: false
  },
  /* ── P&ID Proceso ── */
  'valve-motorized':   { label:'V1', pollMs:500, varOpen:'"DB1".V1_Open', varClosed:'"DB1".V1_Closed', varPct:'"DB1".V1_Pct', color:'#546e7a' },
  'valve-butterfly':   { label:'VB1', pollMs:500, varOpen:'"DB1".VB1_Open', varPct:'"DB1".VB1_Pct', color:'#546e7a' },
  'valve-safety':      { label:'PSV1', pollMs:500, varOpen:'"DB1".PSV1_Open', varAlarm:'"DB1".PSV1_Alarm', color:'#c62828' },
  'fan-symbol':        { label:'FA1', pollMs:500, varRun:'"DB1".Fan1_Run', varFault:'"DB1".Fan1_Fault', varHz:'"DB1".Fan1_Hz' },
  'agitator-symbol':   { label:'AG1', pollMs:500, varRun:'"DB1".Ag1_Run', varRpm:'"DB1".Ag1_Rpm' },
  'conveyor-pid':      { label:'CV1', pollMs:500, varRun:'"DB1".CV1_Run', varSpeed:'"DB1".CV1_Speed', varFault:'"DB1".CV1_Fault', color:'#37474f' },
  'dosing-pump':       { label:'DP1', pollMs:500, varRun:'"DB1".DP1_Run', varFlow:'"DB1".DP1_Flow', varFault:'"DB1".DP1_Fault', color:'#1565c0' },
  'heat-exchanger':    { label:'HE1', pollMs:1000, varActive:'"DB1".HE1_Active', varTin:'"DB1".HE1_Tin', varTout:'"DB1".HE1_Tout', color:'#c62828' },
  'filter-symbol':     { label:'F1', pollMs:1000, varDP:'"DB1".F1_DP', varDirty:'"DB1".F1_Dirty', color:'#546e7a' },
  'compressor-symbol': { label:'C1', pollMs:500, varRun:'"DB1".C1_Run', varFault:'"DB1".C1_Fault', varRpm:'"DB1".C1_Rpm', color:'#37474f' },
  'silo':              { label:'SL1', unit:'%', min:0, max:100, pollMs:1000, varLevel:'"DB1".Silo1_Level', varHigh:'"DB1".Silo1_High', varLow:'"DB1".Silo1_Low', color:'#78909c' },
  'tank-horizontal':   { label:'TH1', unit:'%', min:0, max:100, pollMs:500, varLevel:'"DB1".TH1_Level', varHigh:'"DB1".TH1_High', varLow:'"DB1".TH1_Low', color:'#1565c0' },
  'tank-conical':      { label:'TC1', unit:'%', min:0, max:100, pollMs:500, varLevel:'"DB1".TC1_Level', varWeight:'"DB1".TC1_Weight', color:'#1565c0' },
  'reactor-vessel':    { label:'R1', pollMs:500, varTemp:'"DB1".R1_Temp', varLevel:'"DB1".R1_Level', varAgit:'"DB1".R1_Agit', color:'#37474f' },
  'separator-vessel':  { label:'S1', pollMs:1000, varLevel:'"DB1".S1_Level', varActive:'"DB1".S1_Active', color:'#546e7a' },
  /* ── Motores / Accionamientos ── */
  'motor-starter':   { label:'M1', pollMs:500, varRun:'"DB1".M1_Run', varFault:'"DB1".M1_Fault', varReady:'"DB1".M1_Ready' },
  'vfd-faceplate':   { label:'VFD1', pollMs:500, varHz:'"DB1".VFD1_Hz', varRpm:'"DB1".VFD1_Rpm', varI:'"DB1".VFD1_I', varRun:'"DB1".VFD1_Run', varFault:'"DB1".VFD1_Fault', maxHz:60, maxRpm:1500 },
  'servo-axis':      { label:'AX1', unit:'mm', min:0, max:500, pollMs:200, varPos:'"DB1".Ax1_Pos', varTarget:'"DB1".Ax1_Target', varEnable:'"DB1".Ax1_Enable' },
  'motor-runtime':   { label:'M1', pollMs:5000, varHours:'"DB1".M1_Hours', varRun:'"DB1".M1_Run', warningH:8000 },
  'brake-display':   { label:'BR1', pollMs:500, varBrake:'"DB1".Br1_Active', varFault:'"DB1".Br1_Fault' },
  /* ── Instrumentación ── */
  'thermometer-display': { label:'TT1', unit:'°C', min:0, max:200, pollMs:1000, varTemp:'"DB1".Temp1', varAlarm:'"DB1".Temp1_Alarm', color:'#c62828' },
  'pressure-gauge-pid':  { label:'PT1', unit:'bar', min:0, max:10, pollMs:500, varPres:'"DB1".Pres1', varAlarm:'"DB1".Pres1_Alarm', color:'#1565c0' },
  'flow-totalizer':      { label:'FT1', unit:'m³/h', pollMs:500, varFlow:'"DB1".Flow1', varTotal:'"DB1".Total1', color:'#00838f' },
  'level-indicator':     { label:'LT1', unit:'%', min:0, max:100, pollMs:500, varLevel:'"DB1".Level1', varHigh:'"DB1".Level1_HH', varLow:'"DB1".Level1_LL', color:'#1565c0' },
  'energy-meter':        { label:'EM1', pollMs:2000, varKw:'"DB1".EM1_Kw', varKwh:'"DB1".EM1_Kwh', varPf:'"DB1".EM1_Pf', varV:'"DB1".EM1_V', varA:'"DB1".EM1_A' },
  'ph-meter':            { label:'AT1', pollMs:1000, varPH:'"DB1".PH1', varAlarm:'"DB1".PH1_Alarm', minPH:0, maxPH:14, setpoint:7.0 },
  'rpm-display':         { label:'ST1', unit:'rpm', pollMs:500, varRpm:'"DB1".RPM1', varRef:'"DB1".RPM1_Ref', maxRpm:3000 },
  'temperature-4zone':   { label:'TEMP ZONES', unit:'°C', pollMs:1000, varT1:'"DB1".T1', varT2:'"DB1".T2', varT3:'"DB1".T3', varT4:'"DB1".T4', sp:200 },
  /* ── Control ── */
  'pid-controller':     { label:'PIC-101', unit:'%', pollMs:500, varSP:'"DB1".PIC_SP', varPV:'"DB1".PIC_PV', varMV:'"DB1".PIC_MV', varMode:'"DB1".PIC_Auto' },
  'sequence-stepper':   { label:'SEQ1', pollMs:500, varStep:'"DB1".Seq1_Step', varTotal:8, varActive:'"DB1".Seq1_Run', names:'INIT,FILL,HEAT,MIX,COOL,DRAIN,CLEAN,END' },
  'timer-display':      { label:'T1', pollMs:500, varActive:'"DB1".T1_Run', varElapsed:'"DB1".T1_ET', varPreset:'"DB1".T1_PT', color:'#1565c0' },
  'counter-display':    { label:'C1', pollMs:500, varCount:'"DB1".C1_CV', varPreset:'"DB1".C1_PV', varReset:'"DB1".C1_Reset', color:'#2e7d32' },
  'interlock-display':  { label:'INTERLOCKS', pollMs:500, il1:'"DB1".IL1', iln1:'Puerta OK', il2:'"DB1".IL2', iln2:'Presión OK', il3:'"DB1".IL3', iln3:'Nivel OK', il4:'"DB1".IL4', iln4:'Temp OK', numIL:4 },
  'manual-auto-switch': { label:'MODO', pollMs:500, varMode:'"DB1".Mode_Auto', textAuto:'AUTO', textMan:'MANUAL' },
  /* ── Eléctrico ── */
  'circuit-breaker':    { label:'Q1', pollMs:500, varState:'"DB1".Q1_Closed', varTrip:'"DB1".Q1_Trip' },
  'contactor-display':  { label:'KM1', pollMs:500, varClosed:'"DB1".KM1_Closed', varFault:'"DB1".KM1_Fault' },
  'power-meter':        { label:'PM1', pollMs:2000, varKw:'"DB1".PM1_Kw', varKvar:'"DB1".PM1_Kvar', varPf:'"DB1".PM1_Pf', varV:'"DB1".PM1_V', varA:'"DB1".PM1_A' },
  'ups-display':        { label:'UPS1', pollMs:5000, varBat:'"DB1".UPS1_Bat', varState:'"DB1".UPS1_State', varLoad:'"DB1".UPS1_Load' },
  'generator-display':  { label:'GEN1', pollMs:1000, varHz:'"DB1".Gen1_Hz', varV:'"DB1".Gen1_V', varKw:'"DB1".Gen1_Kw', varRun:'"DB1".Gen1_Run' },
  /* ── Calidad / Producción ── */
  'batch-display':      { label:'BATCH', pollMs:1000, varBatch:'"DB1".Batch_ID', varStep:'"DB1".Batch_Step', varPct:'"DB1".Batch_Pct', varActive:'"DB1".Batch_Run', stepNames:'PREPARE,CHARGE,REACT,COOL,DISCHARGE' },
  'production-counter': { label:'PROD', pollMs:1000, varCount:'"DB1".Prod_Count', varTarget:'"DB1".Prod_Target', varGood:'"DB1".Prod_Good', varBad:'"DB1".Prod_Bad' },
  'cycle-time':         { label:'CICLO', unit:'s', pollMs:500, varActual:'"DB1".Cycle_Actual', varRef:'"DB1".Cycle_Ref', varMin:'"DB1".Cycle_Min', varMax:'"DB1".Cycle_Max' },
  'quality-gauge':      { label:'OEE', pollMs:5000, varOEE:'"DB1".OEE', varAvail:'"DB1".OEE_Avail', varPerf:'"DB1".OEE_Perf', varQual:'"DB1".OEE_Qual' },
  /* ── Seguridad ── */
  'safety-door':        { label:'SD1', pollMs:200, varOpen:'"DB1".SD1_Open', varLocked:'"DB1".SD1_Lock', varBypassed:'"DB1".SD1_Bypass' },
  'estop-circuit':      { label:'ES1', pollMs:200, varOK:'"DB1".ES1_OK', varFault:'"DB1".ES1_Fault', varReset:'"DB1".ES1_Reset' },
  'two-hand-control':   { label:'2H1', pollMs:200, varH1:'"DB1".THC1_H1', varH2:'"DB1".THC1_H2', varOK:'"DB1".THC1_OK' },
  /* ── Utilities ── */
  'pump-station':       { label:'PS1', pollMs:500, varP1Run:'"DB1".PS1_P1', varP2Run:'"DB1".PS1_P2', varLevel:'"DB1".PS1_Level', varFault:'"DB1".PS1_Fault' },
  'compressed-air':     { label:'AIR', pollMs:1000, varPres:'"DB1".Air_Pres', varFlow:'"DB1".Air_Flow', varAlarm:'"DB1".Air_Alarm' },
  /* ── TIA Portal específicos ── */
  'analog-output':      { label:'AO1', unit:'mA', min:4, max:20, pollMs:500, varOut:'"DB1".AO1_Out', varMode:'"DB1".AO1_Manual' },
  'trend-comparison':   { label:'TREND', unit:'', pollMs:1000, varA:'"DB1".Trend_A', varB:'"DB1".Trend_B', labelA:'PV', labelB:'SP', colorA:'#c62828', colorB:'#1565c0', min:0, max:100, points:60 },
  'string-display':     { label:'MSG', pollMs:1000, varString:'"DB1".Message', maxLen:40 },
  'plc-clock-sync':     { label:'PLC TIME', pollMs:5000, varTime:'"DB1".PLC_Time', varDate:'"DB1".PLC_Date' },
};

var COLORES_LED = [
  { color: '#2e7d32', label: 'Verde' },
  { color: '#c62828', label: 'Rojo' },
  { color: '#f9a825', label: 'Amarillo' },
  { color: '#1565c0', label: 'Azul' },
  { color: '#6a1b9a', label: 'Violeta' },
  { color: '#ff6f00', label: 'Naranja' },
  { color: '#00838f', label: 'Cian' },
  { color: '#ffffff', label: 'Blanco' }
];

