/* =================================================================
   PANEL DE PROPIEDADES — Arquitectura definitiva
   
   REGLA: Solo los elementos que ESCRIBEN en el PLC tienen
   sección "CONEXIÓN PLC". El resto configura su variable
   directamente en PROPIEDADES (lectura) o COMPORTAMIENTO.

   · BOTONES / CONTROLES  → PROPIEDADES + COMPORTAMIENTO + CONEXIÓN PLC
   · DISPLAY / LED / IMG  → PROPIEDADES (con variable de lectura incluida)
   · ALARMAS              → PROPIEDADES (con variable de lectura incluida)
   · DATOS / MEDICIÓN     → PROPIEDADES (con variable de lectura incluida)
   · P&ID / SENSORES      → PROPIEDADES + COMPORTAMIENTO
   · DECORACIÓN / AUTO / FAB / DECO → PROPIEDADES + COMPORTAMIENTO
   · NAVEGACIÓN / SISTEMA / INFO-CARD → PROPIEDADES + COMPORTAMIENTO
================================================================= */

/* ── Listas de tipos ──────────────────────────────────────── */
var _T_BOTONES   = ['btn-simple','btn-led','btn-toggle','btn-emergency',
                    'btn-selector','btn-dpad','btn-jog','btn-confirm',
                    'btn-set-reset','btn-multistate'];
var _T_CONTROLES = ['spinbox','slider-h','slider-v','setpoint-input'];
var _T_SENSORES  = ['sensor-prox','sensor-balancin','sensor-foto','sensor-encoder',
                    'sensor-flow','sensor-pressure','sensor-temp','sensor-ultra',
                    'sensor-rfid','sensor-vfd'];
var _T_PID       = ['motor-symbol','pump-symbol','valve-symbol','level-tank','pid-faceplate'];
var _T_ANIM      = [
  'auto-wheel','auto-tyre','auto-robot-arm','auto-spot-weld','auto-paint-gun',
  'auto-press-machine','auto-vin-scanner','auto-agv','auto-exhaust','auto-brake-disc',
  'motor-symbol','pump-symbol',
  'fab-robot-industrial','fab-cnc-machine','fab-lathe','fab-drill-press',
  'fab-hydraulic-press','fab-welding-station','fab-paint-booth','fab-oven-industrial',
  'fab-cooling-tower','fab-boiler','fab-compressor-ind','fab-generator',
  'fab-switchboard','fab-plc-cabinet','fab-agv-station','fab-laser-cutter',
  'fab-3d-printer','fab-extruder','fab-winding-machine','fab-palletizer',
  'fab-scara-robot','fab-delta-robot','fab-cobot','fab-vision-system',
  'fab-injection-mold','deco-conveyor',
  /* deco- con luz parpadeante */
  'deco-worker','deco-person-walk','deco-forklift','deco-truck','deco-dump-truck',
  'deco-crane','deco-elevator','deco-excavator','deco-bulldozer','deco-wheelbarrow',
  'deco-cement-mixer','deco-compressor','deco-welding','deco-electric-hazard',
  'deco-road-barrier','deco-cone','deco-fire-ext','deco-safety-exit','deco-first-aid',
  'deco-sign-hard','deco-helmet','deco-wire-spool',
  /* sensores */
  'sensor-prox','sensor-balancin','sensor-foto','sensor-encoder','sensor-flow',
  'sensor-pressure','sensor-temp','sensor-ultra','sensor-rfid','sensor-vfd'
];

function _en(tipo, lista) { return lista.indexOf(tipo) !== -1; }

/* ── Helpers de UI ─────────────────────────────────────────── */
function _colorSwatches(id, sel) {
  return '<div class="color-row">' +
    COLORES_LED.map(function(c) {
      return '<div class="cswatch' + (sel===c.color?' sel':'') +
        '" style="background:' + c.color + ';' + (c.color==='#ffffff'?'border:1px solid #ccc;':'') +
        '" title="' + c.label + '" data-id="' + id + '" data-color="' + c.color +
        '" onclick="cambiarColorLed(this)"></div>';
    }).join('') + '</div>';
}
function _colorRow(id, sel) {
  return '<div class="prow"><div class="plbl">COLOR</div>' + _colorSwatches(id, sel) + '</div>';
}
/* ── Color picker completo (paleta nativa) ─────────────────── */
function _colorPicker(id, key, val, label) {
  var isTransparent = (val === 'transparent' || val === '' || !val);
  var safeVal = (isTransparent) ? '#ffffff' : (val || '#1a1a18');
  var displayVal = (isTransparent) ? 'transparent' : safeVal;
  var lbl = label || 'COLOR';
  var uid = 'cp_' + id.replace(/[^a-z0-9]/gi,'_') + '_' + key;
  var prevStyle = isTransparent
    ? 'background:repeating-linear-gradient(45deg,#ccc,#ccc 3px,#fff 3px,#fff 6px);'
    : 'background:' + safeVal + ';';
  return '<div class="prow">' +
    '<div class="plbl">' + lbl + '</div>' +
    '<div class="color-picker-row">' +
      '<input type="color" id="' + uid + '" class="color-native" value="' + safeVal + '"' +
        ' data-id="' + id + '" data-key="' + key + '"' +
        ' oninput="_cpUpdate(this)" onchange="_cpUpdate(this)">' +
      '<input type="text" class="pinp color-hex-inp" value="' + displayVal + '"' +
        ' data-id="' + id + '" data-key="' + key + '" data-uid="' + uid + '"' +
        ' maxlength="11" placeholder="#hex / transparent"' +
        ' oninput="_cpHexUpdate(this)" onchange="_cpHexUpdate(this)">' +
      '<div class="color-swatch-preview" style="' + prevStyle + '" id="prev_' + uid + '"></div>' +
    '</div>' +
  '</div>';
}
function _cpUpdate(inp) {
  var id=inp.dataset.id, key=inp.dataset.key, color=inp.value;
  var hexInp = document.querySelector('.color-hex-inp[data-uid="' + inp.id + '"]');
  var prev   = document.getElementById('prev_' + inp.id);
  if (hexInp) hexInp.value = color;
  if (prev)   prev.style.background = color;
  var el=ELEMENTOS.find(function(e){return e.id===id;});
  if(!el) return;
  el.props[key]=color; rerenderizar(id);
}
function _cpHexUpdate(inp) {
  var val=inp.value.trim();
  var isHex=/^#[0-9a-fA-F]{6}$/.test(val);
  var isTransp=(val==='transparent');
  if(!isHex && !isTransp) return;
  var uid=inp.dataset.uid;
  var native=document.getElementById(uid);
  var prev  =document.getElementById('prev_'+uid);
  if(native && isHex) native.value=val;
  if(prev) {
    if(isTransp) prev.style.background='repeating-linear-gradient(45deg,#ccc,#ccc 3px,#fff 3px,#fff 6px)';
    else         prev.style.background=val;
  }
  var id=inp.dataset.id, key=inp.dataset.key;
  var el=ELEMENTOS.find(function(e){return e.id===id;});
  if(!el) return;
  el.props[key]=val; rerenderizar(id);
}
function _checkbox(id, key, checked, label) {
  return '<div class="prow" style="align-items:center">' +
    '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:11px;color:var(--light)">' +
      '<input type="checkbox" ' + (checked?'checked':'') +
        ' onchange="actualizarPropBool(\'' + id + '\',\'' + key + '\',this.checked)"' +
        ' style="width:13px;height:13px;accent-color:var(--accent);cursor:pointer">' +
      label + '</label></div>';
}
function _varPlc(id, key, val, lbl, ph) {
  lbl = lbl || 'VARIABLE PLC';
  ph  = ph  || '"DB1".Variable';
  return campoTexto(id, lbl, key, val || '', ph);
}
function _polling(id, val, ms) {
  var base = campoNumero(id, 'POLLING CADA (ms)', 'pollMs', val || ms || 500);
  /* si hay más de 1 PLC configurado, añadir selector de conexión */
  var el = ELEMENTOS.find(function(e){ return e.id === id; });
  var plcIdx = el && el.props ? (el.props.plcIdx || 0) : 0;
  return base + _plcSelector(id, plcIdx);
}
function _triggerVal(id, val) {
  return campoTexto(id, 'VALOR QUE ACTIVA', 'triggerVal', val || 'true', 'true / 1 / OK');
}
/* selector de PLC — solo se muestra si hay más de 1 PLC configurado */
function _plcSelector(id, val) {
  if (typeof PLCS === 'undefined' || PLCS.length <= 1) return '';
  var cur = val || 0;
  var opts = PLCS.map(function(p, i) {
    var label = escHtml(p.label || ('PLC-' + (i+1)));
    var ip    = p.ip ? (' · ' + p.ip) : ' · sin IP';
    return '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' +
      label + ip + '</option>';
  }).join('');
  return '<div class="prow">' +
    '<div class="plbl">CONEXIÓN PLC</div>' +
    '<select class="pinp" onchange="actualizarPropNum(\'' + id + '\',\'plcIdx\',+this.value)">' +
    opts + '</select></div>';
}

/* ════════════════════════════════════════════════════════════
   CONSTRUCTOR PRINCIPAL
════════════════════════════════════════════════════════════ */
function construirPropiedades(el) {
  document.getElementById('rp-vacio').style.display = 'none';
  var p  = el.props || {};
  var rp = document.getElementById('rp-props');
  var h  = '';

  /* VISTA PREVIA */
  h += '<div class="psec"><div class="psec-title">VISTA PREVIA</div>' +
    '<div class="pprev" style="height:' + Math.min(72,el.h+16) + 'px" id="pprev">' +
      '<div style="width:' + Math.min(el.w,200) + 'px;height:' + Math.min(el.h,64) + 'px">' +
        htmlInterior(el) + '</div></div></div>';

  /* LAYOUT */
  h += '<div class="psec"><div class="psec-title">LAYOUT</div>' +
    '<div class="p2col">' +
      '<div class="prow"><div class="plbl">X</div><input class="pinp" type="number" id="pi-x" value="' + el.x + '" data-id="' + el.id + '" data-eje="x" onchange="actualizarPos(this)"></div>' +
      '<div class="prow"><div class="plbl">Y</div><input class="pinp" type="number" id="pi-y" value="' + el.y + '" data-id="' + el.id + '" data-eje="y" onchange="actualizarPos(this)"></div>' +
    '</div><div class="p2col">' +
      '<div class="prow"><div class="plbl">ANCHO</div><input class="pinp" type="number" id="pi-w" value="' + el.w + '" data-id="' + el.id + '" data-eje="w" onchange="actualizarTam(this)"></div>' +
      '<div class="prow"><div class="plbl">ALTO</div><input class="pinp" type="number" id="pi-h" value="' + el.h + '" data-id="' + el.id + '" data-eje="h" onchange="actualizarTam(this)"></div>' +
    '</div>' +
    '<div class="p2col">' +
      '<div class="prow"><div class="plbl">ROTACIÓN (°)</div><input class="pinp" type="number" id="pi-rot" min="0" max="359" value="' + Math.round((el.props && el.props.rotation) || 0) + '" data-id="' + el.id + '" onchange="aplicarRotacion(this.dataset.id, this.value)"></div>' +
      '<div class="prow"><div class="plbl">&nbsp;</div><button class="tb-btn" style="width:100%;font-size:9px;padding:4px 0" onclick="resetRotacion(\'' + el.id + '\')">↺ RESET</button></div>' +
    '</div>' +
  '</div>';

  /* ════════════════════════════════════════════════════════
     PROPIEDADES (específicas por tipo)
  ════════════════════════════════════════════════════════ */
  h += '<div class="psec"><div class="psec-title">PROPIEDADES</div>';

  /* ── BOTONES ── */
  if (_en(el.tipo, _T_BOTONES)) {
    if (el.tipo === 'btn-dpad') {
      h += '<div class="prow" style="font-size:9px;color:var(--mid)">DPad — configura las variables en CONEXIÓN PLC.</div>';
    } else if (el.tipo === 'btn-set-reset') {
      h += campoTexto(el.id, 'TEXTO SET',   'textSet',   p.textSet   || 'SET');
      h += campoTexto(el.id, 'TEXTO RESET', 'textReset', p.textReset || 'RESET');
    } else if (el.tipo === 'btn-multistate') {
      h += campoTexto(el.id, 'ETIQUETA',       'text',   p.text   || 'MODO');
      h += campoTexto(el.id, 'ESTADOS (coma)', 'states', p.states || 'STOP,AUTO,MANUAL');
      h += campoTexto(el.id, 'COLORES (coma)', 'colors', p.colors || '#c62828,#2e7d32,#1565c0');
      h += campoNumero(el.id,'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 11);
    } else {
      if (el.tipo !== 'btn-selector') {
        h += campoTexto(el.id, 'TEXTO',    'text',    p.text    || '');
        h += campoTexto(el.id, 'SUBTEXTO', 'subtext', p.subtext || '', 'opcional');
        if (el.tipo !== 'btn-emergency')
          h += campoTexto(el.id, 'ICONO', 'icon', p.icon || '', 'símbolo unicode');
      }
      h += campoNumero(el.id, 'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 12);
      if (el.tipo === 'btn-simple')
        h += '<div class="prow"><div class="plbl">VARIANTE</div>' +
          '<select class="psel" data-id="' + el.id + '" data-key="variant" onchange="actualizarProp(this)">' +
            '<option value=""'      + (!p.variant            ? ' selected':'') + '>NORMAL</option>' +
            '<option value="start"' + (p.variant==='start'   ? ' selected':'') + '>START (negro)</option>' +
          '</select></div>';
      if (el.tipo === 'btn-selector') {
        h += campoTexto(el.id, 'OPCIÓN 1', 'opt1', p.opt1 || '');
        h += campoTexto(el.id, 'OPCIÓN 2', 'opt2', p.opt2 || '');
        h += campoTexto(el.id, 'OPCIÓN 3 (opcional)', 'opt3', p.opt3 || '', 'dejar vacío');
      }
    }

  /* ── CONTROLES (spinbox, slider, setpoint) ── */
  } else if (_en(el.tipo, _T_CONTROLES)) {
    h += campoTexto(el.id, 'ETIQUETA', 'label', p.label || '');
    h += campoTexto(el.id, 'UNIDAD',   'unit',  p.unit  || '', 'rpm / bar / °C');
    h += campoNumero(el.id,'MÍNIMO',   'min',   p.min !== undefined ? p.min : 0);
    h += campoNumero(el.id,'MÁXIMO',   'max',   p.max !== undefined ? p.max : 100);
    if (el.tipo === 'spinbox')
      h += campoNumero(el.id,'PASO', 'step', p.step || 1);
    if (el.tipo === 'slider-h' || el.tipo === 'slider-v')
      h += _colorRow(el.id, p.color || '#1565c0');
    h += campoNumero(el.id,'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 12);
    /* Variable de lectura/escritura integrada en propiedades */
    h += _varPlc(el.id, 'var1', p.var1, 'VARIABLE PLC', '"DB1".Setpoint');
    h += _polling(el.id, p.pollMs, 500);

  /* ── DISPLAY / LED / IMAGEN PLC / LABEL ── */
  } else if (el.tipo === 'display') {
    h += campoTexto(el.id,  'ETIQUETA',   'label',      p.label      || '');
    h += campoTexto(el.id,  'VALOR DEMO', 'previewVal', p.previewVal || '', 'ej: 4028753001');
    h += campoNumero(el.id, 'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 13);
    h += _varPlc(el.id, 'var1', p.var1, 'VARIABLE PLC', '"DB1".Barcode');
    h += _polling(el.id, p.pollMs, 1000);

  } else if (el.tipo === 'status-led') {
    h += '<div class="prow"><div class="plbl">COLOR ON</div>' + _colorSwatches(el.id, p.color || '#2e7d32') + '</div>';
    h += _varPlc(el.id, 'var1', p.var1);
    h += _triggerVal(el.id, p.triggerVal);
    h += _polling(el.id, p.pollMs, 1000);

  } else if (el.tipo === 'img-plc') {
    if (p.imgData)
      h += '<div class="prow"><div class="plbl">IMAGEN ACTUAL</div><img class="img-thumb" src="' + p.imgData + '" alt="preview"></div>';
    h += '<div class="prow"><div class="img-upload-area" data-id="' + el.id + '" onclick="pedirImagen(this.dataset.id)">' + (p.imgData?'Cambiar imagen':'Cargar imagen') + '</div></div>';
    h += campoTexto(el.id, 'NOMBRE', 'imgName', p.imgName || '', 'logo.png');
    h += _varPlc(el.id, 'var1', p.var1);
    h += _triggerVal(el.id, p.triggerVal);
    h += _polling(el.id, p.pollMs, 1000);

  } else if (el.tipo === 'label') {
    h += campoTexto(el.id,  'TEXTO', 'text', p.text || '');
    h += campoNumero(el.id, 'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 11);
    h += _colorPicker(el.id, 'fontColor',   p.fontColor   || '#1a1a16',      'COLOR TEXTO');
    h += _colorPicker(el.id, 'bgColor',     p.bgColor     || 'transparent',  'FONDO');
    h += _colorPicker(el.id, 'borderColor', p.borderColor || 'transparent',  'COLOR BORDE');

  } else if (el.tipo === 'tooltip-node') {
    h += campoTexto(el.id, 'TEXTO', 'text', p.text || 'NODE');
    h += campoNumero(el.id, 'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 11);
    h += '<div class="prow"><div class="plbl">FORMA</div>' +
      '<select class="psel" data-id="' + el.id + '" data-key="shape" onchange="actualizarProp(this)">' +
        '<option value="none"'          + ((p.shape||'none')==='none'          ?' selected':'') + '>—  Solo texto</option>' +
        '<option value="rect"'          + (p.shape==='rect'                    ?' selected':'') + '>▭  Rectángulo</option>' +
        '<option value="rounded"'       + (p.shape==='rounded'                 ?' selected':'') + '>▢  Redondeado</option>' +
        '<option value="circle"'        + (p.shape==='circle'                  ?' selected':'') + '>○  Círculo / Elipse</option>' +
        '<option value="diamond"'       + (p.shape==='diamond'                 ?' selected':'') + '>◇  Rombo</option>' +
        '<option value="hexagon"'       + (p.shape==='hexagon'                 ?' selected':'') + '>⬡  Hexágono</option>' +
        '<option value="parallelogram"' + (p.shape==='parallelogram'           ?' selected':'') + '>▱  Paralelogramo</option>' +
      '</select></div>';
    h += _colorPicker(el.id, 'fillColor',   (p.fillColor   !== undefined && p.fillColor   !== '') ? p.fillColor   : '#e3f0ff', 'COLOR RELLENO');
    h += _colorPicker(el.id, 'strokeColor', (p.strokeColor !== undefined && p.strokeColor !== '') ? p.strokeColor : '#1565c0', 'COLOR BORDE');
    h += _colorPicker(el.id, 'fontColor',   p.fontColor   || '#1a1a18', 'COLOR TEXTO');
    h += '<div class="psec-sub">CONEXIONES VINCULADAS</div>';
    h += campoTexto(el.id, 'CONEXIÓN 1', 'conn1', p.conn1 || '', 'ej: "DB1".Motor_Run');
    h += campoTexto(el.id, 'CONEXIÓN 2', 'conn2', p.conn2 || '', 'ej: "DB1".Valve_Open');
    h += campoTexto(el.id, 'CONEXIÓN 3', 'conn3', p.conn3 || '', 'ej: "DB1".Sensor1');
    h += campoTexto(el.id, 'CONEXIÓN 4', 'conn4', p.conn4 || '', 'ej: "DB1".Alarma');
    h += '<div class="psec-sub">NOTAS</div>';
    h += '<div class="prow"><div class="plbl">DESCRIPCIÓN</div>' +
      '<textarea class="pinp" rows="3" style="resize:vertical;font-size:10px;line-height:1.5" data-id="' + el.id + '" data-key="notes" onchange="actualizarProp(this)">' + escHtml(p.notes||'') + '</textarea></div>';
    h += '<div class="psec-sub">DATOS PLC EN VIVO</div>';
    h += _varPlc(el.id, 'var1', p.var1, 'VARIABLE PLC', '"DB1".Estado');
    h += campoNumero(el.id, 'POLLING (ms)', 'pollMs', p.pollMs || 500);
    h += _checkbox(el.id, 'showValue', p.showValue || false, 'MOSTRAR VALOR EN EL NODO');
    h += _colorPicker(el.id, 'valueColor', p.valueColor || '#00e5b0', 'COLOR VALOR');
    h += campoTexto(el.id, 'UNIDAD', 'unit', p.unit || '', 'rpm / °C / bar...');
    h += '<div class="psec-sub">COLOR AL ACTIVARSE</div>';
    h += _checkbox(el.id, 'useActiveColor', p.useActiveColor || false, 'CAMBIAR COLOR CON EL VALOR');
    h += _colorPicker(el.id, 'activeFill',   p.activeFill   || '#2e7d32', 'RELLENO ACTIVO (valor ≠ 0/false)');
    h += _colorPicker(el.id, 'activeStroke', p.activeStroke || '#00c853', 'BORDE ACTIVO');
    h += _colorPicker(el.id, 'activeFont',   p.activeFont   || '#ffffff', 'TEXTO ACTIVO');
    h += _polling(el.id, p.pollMs, 500);

  /* ── ALARMAS ── */
  } else if (el.tipo === 'alarm-banner') {
    h += campoTexto(el.id, 'TEXTO ALARMA', 'text',    p.text    || '');
    h += campoTexto(el.id, 'DETALLE',      'subtext', p.subtext || '', 'subtexto opcional');
    h += '<div class="prow"><div class="plbl">COLOR</div>' + _colorSwatches(el.id, p.color || '#c62828') + '</div>';
    h += _checkbox(el.id, 'hideWhenInactive', p.hideWhenInactive, 'OCULTAR CUANDO INACTIVA');
    h += _varPlc(el.id, 'var1', p.var1);
    h += _triggerVal(el.id, p.triggerVal);
    h += _polling(el.id, p.pollMs, 500);

  } else if (el.tipo === 'alarm-list') {
    h += campoTexto(el.id, 'TÍTULO', 'title', p.title || 'ALARMAS ACTIVAS');
    h += campoNumero(el.id, 'ALARMAS POR PÁGINA', 'pageSize', p.pageSize || 15);
    var alCount = Math.max(
      (p.alNames||'').split('\n').filter(function(s){return s.trim();}).length,
      (p.alVars ||'').split('\n').filter(function(s){return s.trim();}).length
    );
    h += '<div class="prow"><button style="width:100%;padding:7px;background:var(--accent);color:var(--on-accent);border:none;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;cursor:pointer" onclick="abrirEditorAlarmasList(\'' + el.id + '\')">✒  EDITAR ALARMAS (' + alCount + ' configuradas)</button></div>';
    h += _checkbox(el.id,'showAckCol',p.showAckCol,'COLUMNA ACK');
    h += _checkbox(el.id,'showDateCol',p.showDateCol!==false,'COLUMNA FECHA/HORA');
    h += _checkbox(el.id,'hideRowsWhenInactive',p.hideRowsWhenInactive!==false,'OCULTAR FILAS INACTIVAS');
    h += _polling(el.id, p.pollMs, 500);

  } else if (el.tipo === 'alarm-ack') {
    h += campoTexto(el.id,  'TEXTO BOTÓN', 'text', p.text || 'RECONOCER');
    h += campoNumero(el.id, 'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 12);
    h += _varPlc(el.id, 'varAlarm', p.varAlarm, 'VAR. ALARMA (lectura)');
    h += _varPlc(el.id, 'varAck',   p.varAck,   'VAR. ACK (escritura)');
    h += _polling(el.id, p.pollMs, 500);

  } else if (el.tipo === 'popup-btn') {
    h += '<div class="psec-sub">BOTÓN</div>';
    h += campoTexto(el.id, 'ETIQUETA', 'label', p.label || 'VER DETALLE');
    h += campoTexto(el.id, 'ICONO', 'icon', p.icon || '⬡', '⬡ ⚙ ℹ ▶ ↗ ⊕');
    h += campoNumero(el.id, 'TAMAÑO FUENTE', 'fontSize', p.fontSize || 12);
    h += _colorPicker(el.id, 'color',     p.color     || '#1565c0', 'COLOR FONDO');
    h += _colorPicker(el.id, 'textColor', p.textColor || '#ffffff', 'COLOR TEXTO');
    h += '<div class="psec-sub">POPUP</div>';
    h += campoTexto(el.id, 'TÍTULO', 'popupTitle', p.popupTitle || 'Detalle');
    h += campoNumero(el.id, 'ANCHO (px)', 'popupW', p.popupW || 700);
    h += campoNumero(el.id, 'ALTO (px)',  'popupH', p.popupH || 480);
    h += _colorPicker(el.id, 'popupBg', p.popupBg || '#ffffff', 'FONDO POPUP');
    var popupInfo = POPUPS[el.id] || {};
    var popupElCount = (popupInfo.els || []).length;
    h += '<div class="prow"><button style="width:100%;padding:8px;background:#1565c0;color:#fff;border:none;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;cursor:pointer" onclick="abrirEditorPopup(\'' + el.id + '\')">✏ DISEÑAR POPUP (' + popupElCount + ' elem.)</button></div>';
    h += '<div class="prow" style="font-size:9px;color:var(--mid)">' +
      'El popup puede contener cualquier elemento del editor: tablas, gráficos, etiquetas, botones...</div>';

  } else if (el.tipo === 'alarm-plc') {
    h += campoTexto(el.id, 'TÍTULO', 'title', p.title || 'ALARMAS PLC');
    h += '<div class="psec-sub">CONFIGURACIÓN</div>';
    h += '<div class="prow"><div class="plbl">IDIOMA</div>' +
      '<select class="psel" data-id="' + el.id + '" data-key="language" onchange="actualizarProp(this)">' +
        '<option value="es-ES"' + ((p.language||'es-ES')==='es-ES'?' selected':'') + '>Español</option>' +
        '<option value="en-US"' + ((p.language||'es-ES')==='en-US'?' selected':'') + '>English</option>' +
        '<option value="de-DE"' + ((p.language||'es-ES')==='de-DE'?' selected':'') + '>Deutsch</option>' +
        '<option value="fr-FR"' + ((p.language||'es-ES')==='fr-FR'?' selected':'') + '>Français</option>' +
      '</select></div>';
    h += _checkbox(el.id, 'showHistory', p.showHistory || false, 'HISTORIAL DE EVENTOS');
    h += campoNumero(el.id, 'MÁX. HISTORIAL', 'maxHistory', p.maxHistory || 200);
    h += '<div class="psec-sub">INFO</div>';
    h += '<div class="prow" style="font-size:9px;color:var(--mid);line-height:1.6">' +
      'Lee alarmas activas directamente del PLC via <b>Alarms.Browse</b>.<br>' +
      'Requiere bloques <b>Program_Alarm (FB700)</b> en TIA Portal.<br>' +
      'Sin configuración adicional en el HMI.</div>';
    h += _polling(el.id, p.pollMs, 2000);

  } else if (el.tipo === 'alarm-word') {
    h += campoTexto(el.id, 'TÍTULO', 'title', p.title || 'ALARMAS WORD');
    h += '<div class="psec-sub">VARIABLES WORD PLC (una por línea)</div>';
    h += '<div class="prow"><div class="plbl">WORDs / INTs</div>' +
      '<textarea class="pinp" rows="4" style="resize:vertical;font-size:10px;line-height:1.6" data-id="' + el.id + '" data-key="words" onchange="actualizarProp(this)">' +
      escHtml(p.words || '') + '</textarea></div>';
    h += '<div class="psec-sub" style="margin-top:8px">TEXTOS DE ALARMAS</div>';
    h += '<div class="prow" style="gap:6px">' +
      '<button style="flex:1;padding:6px 4px;background:#1565c0;color:#fff;border:none;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;cursor:pointer" ' +
      'onclick="awImportarCSV(\'' + el.id + '\')">⬆ IMPORTAR CSV TIA</button>' +
      '<button style="flex:1;padding:6px 4px;background:#2e7d32;color:#fff;border:none;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;cursor:pointer" ' +
      'onclick="awImportarTextoLibre(\'' + el.id + '\')">✎ EDITAR TEXTOS</button>' +
    '</div>';
    /* Preview del número de textos configurados */
    var wListPrev = (p.words || '').split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s; });
    var totalTexts = 0;
    for (var wi2=0; wi2<wListPrev.length; wi2++) {
      var names2 = (p['wnames'+wi2] || '').split('\n').filter(function(s){ return s.trim(); });
      totalTexts += names2.length;
    }
    h += '<div class="prow" style="font-size:9px;color:var(--mid);text-align:center">' +
      totalTexts + ' textos configurados para ' + wListPrev.length + ' word' + (wListPrev.length!==1?'s':'') + ' × 16 bits</div>';
    var wList = (p.words || '').split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s; });
    if (wList.length === 0) {
      h += '<div class="prow" style="font-size:10px;color:var(--mid)">Define variables WORD arriba primero</div>';
    } else {
      for (var wi = 0; wi < wList.length; wi++) {
        var wKey = 'wnames' + wi;
        var wCount = (p[wKey] || '').split('\n').filter(function(s){ return s.trim(); }).length;
        h += '<div class="prow"><div class="plbl" style="font-size:9px;overflow:hidden;text-overflow:ellipsis;max-width:90px" title="' + escHtml(wList[wi]) + '">' + escHtml(wList[wi].length > 14 ? wList[wi].slice(-14) : wList[wi]) + '</div>' +
          '<button style="flex:1;padding:4px 8px;background:var(--accent);color:var(--on-accent);border:none;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;cursor:pointer" ' +
          'onclick="abrirEditorWordAlarmas(\'' + el.id + '\',' + wi + ')">✎ TEXTOS (' + wCount + '/16)</button></div>';
      }
    }
    h += '<div class="psec-sub">OPCIONES</div>';
    h += _checkbox(el.id, 'showHistory', p.showHistory || false, 'HISTORIAL DE EVENTOS');
    h += campoNumero(el.id, 'MÁX. HISTORIAL', 'maxHistory', p.maxHistory || 200);
    h += _polling(el.id, p.pollMs, 1000);

  } else if (el.tipo === 'alarm-array') {
    h += campoTexto(el.id,  'TÍTULO', 'title', p.title || 'ALARMAS');
    h += campoNumero(el.id, 'NÚMERO DE BITS', 'arraySize', p.arraySize || 64);
    h += '<div class="prow"><button style="width:100%;padding:7px;background:var(--accent);color:var(--on-accent);border:none;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;cursor:pointer" onclick="abrirEditorNombres(\'' + el.id + '\')">✎  EDITAR NOMBRES (' + ((p.names||'').split('\n').filter(function(s){return s.trim();}).length) + ' configuradas)</button></div>';
    h += _checkbox(el.id,'showHistory',p.showHistory,'MOSTRAR PESTAÑA HISTORIAL');
    h += _varPlc(el.id, 'arrayVar', p.arrayVar, 'VARIABLE ARRAY', '"DB_Alarmas".Bits');
    h += _polling(el.id, p.pollMs, 1000);
    h += campoNumero(el.id, 'MÁX. HISTORIAL', 'maxHistory', p.maxHistory || 200);

  } else if (el.tipo === 'alarm-ticker') {
    for (var ati=1;ati<=3;ati++) {
      h += '<div class="psec-sub">ALARMA ' + ati + '</div>';
      h += _varPlc(el.id, 'avar'+ati, p['avar'+ati], 'VARIABLE', '"DB1".Alarm'+ati);
      h += campoTexto(el.id, 'MENSAJE', 'amsg'+ati, p['amsg'+ati]||'', 'Texto cuando activa');
    }
    h += _polling(el.id, p.pollMs, 1000);

  } else if (el.tipo === 'alarm-count') {
    h += campoNumero(el.id, 'UMBRAL ALARMA', 'threshold', p.threshold || 1);
    h += _varPlc(el.id, 'var1', p.var1, 'VARIABLE CONTADOR');
    h += _polling(el.id, p.pollMs, 1000);

  /* ── DATOS ── */
  } else if (el.tipo === 'progress-bar') {
    h += campoTexto(el.id,  'ETIQUETA', 'label', p.label || '');
    h += campoTexto(el.id,  'UNIDAD',   'unit',  p.unit  || '', 'bar / % / rpm');
    h += campoNumero(el.id, 'MÍNIMO',   'min',   p.min !== undefined ? p.min : 0);
    h += campoNumero(el.id, 'MÁXIMO',   'max',   p.max !== undefined ? p.max : 100);
    h += _colorRow(el.id, p.color || '#1565c0');
    h += _varPlc(el.id, 'var1', p.var1); h += _polling(el.id, p.pollMs, 500);

  } else if (el.tipo === 'trend-chart') {
    h += campoTexto(el.id,  'ETIQUETA',         'label',  p.label  || '');
    h += campoTexto(el.id,  'UNIDAD',           'unit',   p.unit   || '', '°C / bar / rpm');
    h += campoNumero(el.id, 'MÍNIMO',           'min',    p.min !== undefined ? p.min : 0);
    h += campoNumero(el.id, 'MÁXIMO',           'max',    p.max !== undefined ? p.max : 100);
    h += campoNumero(el.id, 'PUNTOS HISTÓRICO', 'points', p.points || 30);
    h += _colorRow(el.id, p.color || '#c62828');
    h += _varPlc(el.id, 'var1', p.var1); h += _polling(el.id, p.pollMs, 1000);

  } else if (el.tipo === 'data-table') {
    h += campoTexto(el.id,  'TÍTULO', 'title', p.title || 'VARIABLES');
    h += campoNumero(el.id, 'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 11);
    for (var dti=1;dti<=6;dti++) {
      h += campoTexto(el.id,'ETIQUETA FILA '+dti, 'dlabel'+dti, p['dlabel'+dti]||'', 'Nombre '+dti);
      h += _varPlc(el.id,'dvar'+dti, p['dvar'+dti], 'VARIABLE FILA '+dti, '"DB1".Var'+dti);
    }
    h += _polling(el.id, p.pollMs, 1000);

  } else if (el.tipo === 'bar-chart') {
    h += campoTexto(el.id,  'TÍTULO', 'title', p.title || 'BARRAS');
    h += campoTexto(el.id,  'UNIDAD', 'unit',  p.unit  || '');
    h += campoNumero(el.id, 'MÁXIMO', 'max',   p.max !== undefined ? p.max : 100);
    for (var bci=1;bci<=4;bci++) {
      h += campoTexto(el.id,'BARRA '+bci+' — ETIQUETA','blabel'+bci, p['blabel'+bci]||'','Motor '+bci);
    }
    h += _varPlc(el.id, 'var1', p.var1); h += _polling(el.id, p.pollMs, 1000);

  } else if (el.tipo === 'recipe-table') {
    h += campoTexto(el.id, 'TÍTULO', 'title', p.title || 'RECETA');
    for (var rti=1;rti<=6;rti++) {
      h += campoTexto(el.id,'PARÁMETRO '+rti,'rlabel'+rti,p['rlabel'+rti]||'','Temperatura');
      h += campoTexto(el.id,'UNIDAD '+rti,   'runit' +rti,p['runit' +rti]||'','°C');
    }
    h += _varPlc(el.id, 'var1', p.var1); h += _polling(el.id, p.pollMs, 1000);

  } else if (el.tipo === 'xy-chart') {
    h += campoTexto(el.id,  'ETIQUETA',        'label',  p.label  || 'XY');
    h += campoNumero(el.id, 'PUNTOS HISTORIAL','points', p.points || 50);
    h += _varPlc(el.id, 'varX', p.varX, 'VARIABLE X', '"DB1".PosX');
    h += _varPlc(el.id, 'varY', p.varY, 'VARIABLE Y', '"DB1".PosY');
    h += _polling(el.id, p.pollMs, 200);

  } else if (el.tipo === 'datetime-display') {
    h += campoNumero(el.id, 'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 20);
    h += '<div class="prow"><div class="plbl">FUENTE</div>' +
      '<select class="psel" data-id="' + el.id + '" data-key="source" onchange="actualizarProp(this)">' +
        '<option value="system"' + (p.source!=='plc'?' selected':'') + '>SISTEMA (local)</option>' +
        '<option value="plc"'    + (p.source==='plc'?' selected':'') + '>PLC (variable)</option>' +
      '</select></div>';

  /* ── P&ID ── */
  } else if (el.tipo === 'motor-symbol' || el.tipo === 'pump-symbol') {
    h += campoTexto(el.id, 'ETIQUETA', 'label', p.label || 'M1');
    h += _varPlc(el.id, 'varRun',   p.varRun,   'VAR. ARRANQUE (RUN)',   '"DB1".Motor_Run');
    h += _varPlc(el.id, 'varFault', p.varFault, 'VAR. FALLO (FAULT)',    '"DB1".Motor_Fault');
    h += _polling(el.id, p.pollMs, 500);

  } else if (el.tipo === 'valve-symbol') {
    h += campoTexto(el.id, 'ETIQUETA', 'label', p.label || 'V1');
    h += _varPlc(el.id, 'varOpen',   p.varOpen,   'VAR. ABIERTO (OPEN)',   '"DB1".Valve_Open');
    h += _varPlc(el.id, 'varClosed', p.varClosed, 'VAR. CERRADO (CLOSED)', '"DB1".Valve_Closed');
    h += _polling(el.id, p.pollMs, 500);

  } else if (el.tipo === 'level-tank') {
    h += campoTexto(el.id,  'ETIQUETA', 'label', p.label || 'TANQUE');
    h += campoTexto(el.id,  'UNIDAD',   'unit',  p.unit  || '%');
    h += campoNumero(el.id, 'MÍNIMO',   'min',   p.min !== undefined ? p.min : 0);
    h += campoNumero(el.id, 'MÁXIMO',   'max',   p.max !== undefined ? p.max : 100);
    h += _colorRow(el.id, p.color || '#1565c0');
    h += _varPlc(el.id, 'var1', p.var1); h += _polling(el.id, p.pollMs, 500);

  } else if (el.tipo === 'pid-faceplate') {
    h += campoTexto(el.id, 'NOMBRE TAG', 'title',  p.title  || 'TC-101');
    h += campoTexto(el.id, 'UNIDAD PV',  'unitPV', p.unitPV || '°C');
    h += _varPlc(el.id, 'varPV',  p.varPV,  'VARIABLE PV',  '"DB1".PV');
    h += _varPlc(el.id, 'varSP',  p.varSP,  'VARIABLE SP',  '"DB1".SP');
    h += _varPlc(el.id, 'varOut', p.varOut, 'VARIABLE OUT', '"DB1".Out');
    h += _polling(el.id, p.pollMs, 500);

  /* ── MEDICIÓN ── */
  } else if (el.tipo === 'gauge' || el.tipo === 'bargraph-v') {
    h += campoTexto(el.id,  'ETIQUETA', 'label', p.label || '');
    h += campoTexto(el.id,  'UNIDAD',   'unit',  p.unit  || '');
    h += campoNumero(el.id, 'MÍNIMO',   'min',   p.min !== undefined ? p.min : 0);
    h += campoNumero(el.id, 'MÁXIMO',   'max',   p.max !== undefined ? p.max : 100);
    h += _colorRow(el.id, p.color || '#f57c00');
    h += _varPlc(el.id, 'var1', p.var1); h += _polling(el.id, p.pollMs, 500);

  } else if (el.tipo === 'numeric-7seg') {
    h += campoTexto(el.id,  'ETIQUETA',  'label',    p.label    || '');
    h += campoNumero(el.id, 'DECIMALES', 'decimals', p.decimals || 0);
    h += _varPlc(el.id, 'var1', p.var1); h += _polling(el.id, p.pollMs, 500);

  } else if (el.tipo === 'multibit-led') {
    h += campoTexto(el.id,  'ETIQUETA',       'label', p.label || 'WORD');
    h += campoNumero(el.id, 'NÚMERO DE BITS', 'bits',  p.bits  || 8);
    h += _varPlc(el.id, 'var1', p.var1); h += _polling(el.id, p.pollMs, 500);

  /* ── SENSORES ── */
  } else if (_en(el.tipo, _T_SENSORES)) {
    h += campoTexto(el.id, 'ETIQUETA', 'label', p.label || '');
    h += _colorRow(el.id, p.color || '#f9a825');
    if (_en(el.tipo, ['sensor-prox','sensor-balancin','sensor-foto','sensor-pressure','sensor-ultra','sensor-rfid'])) {
      h += _varPlc(el.id, 'var1', p.var1, 'VARIABLE ACTIVO', '"DB1".Sensor');
      h += _triggerVal(el.id, p.triggerVal);
      h += _polling(el.id, p.pollMs, 500);
    } else if (_en(el.tipo, ['sensor-encoder','sensor-flow','sensor-temp'])) {
      h += _varPlc(el.id, 'varPV', p.varPV||p.var1, 'VARIABLE VALOR', '"DB1".Encoder');
      h += _polling(el.id, p.pollMs, 200);
    } else if (el.tipo === 'sensor-vfd') {
      h += _varPlc(el.id, 'varRun', p.varRun, 'VARIABLE RUN', '"DB1".VFD_Run');
      h += _varPlc(el.id, 'varPV',  p.varPV,  'VARIABLE Hz (PV)', '"DB1".VFD_Hz');
      h += _polling(el.id, p.pollMs, 500);
    }

  /* ── NAVEGACIÓN ── */
  } else if (el.tipo === 'nav-button') {
    h += campoTexto(el.id,  'TEXTO',         'text',   p.text   || '');
    h += campoTexto(el.id,  'ICONO',         'icon',   p.icon   || '\u2192', 'unicode');
    h += campoTexto(el.id,  'DESTINO (URL)', 'target', p.target || '', 'pantalla2.html');
    h += '<div class="prow"><div class="plbl">VARIANTE</div>' +
      '<select class="psel" data-id="' + el.id + '" data-key="variant" onchange="actualizarProp(this)">' +
        '<option value="normal"'  + ((p.variant||'normal')==='normal'  ?' selected':'') + '>Normal</option>' +
        '<option value="dark"'    + (p.variant==='dark'                ?' selected':'') + '>Dark</option>' +
        '<option value="outline"' + (p.variant==='outline'             ?' selected':'') + '>Outline</option>' +
      '</select></div>';
    h += campoNumero(el.id,'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 12);

  } else if (el.tipo === 'nav-menu') {
    h += campoTexto(el.id, 'TÍTULO MENÚ', 'title', p.title || 'NAVEGACIÓN');
    for (var nmi=1;nmi<=5;nmi++) {
      h += campoTexto(el.id,'ÍTEM '+nmi+' — NOMBRE', 'nlabel' +nmi, p['nlabel' +nmi]||'','nombre pantalla');
      h += campoTexto(el.id,'ÍTEM '+nmi+' — URL',    'ntarget'+nmi, p['ntarget'+nmi]||'','pantalla.html');
      h += campoTexto(el.id,'ÍTEM '+nmi+' — ICONO',  'nicon'  +nmi, p['nicon'  +nmi]||'','unicode');
    }
    h += campoNumero(el.id,'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 11);

  /* ── DECORACIÓN pura (deco, auto, fab + frame, etc.) ── */

  /* ── P&ID PROCESO ── */
  } else if (el.tipo === 'valve-motorized') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'V1');
    h += _colorPicker(el.id, 'color', p.color||'#546e7a', 'COLOR');
    h += campoTexto(el.id,'VAR. ABIERTA','varOpen',p.varOpen||'','"DB1".V_Open');
    h += campoTexto(el.id,'VAR. CERRADA','varClosed',p.varClosed||'','"DB1".V_Closed');
    h += campoTexto(el.id,'VAR. % APERTURA','varPct',p.varPct||'','"DB1".V_Pct');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'valve-butterfly') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'VB1');
    h += _colorPicker(el.id, 'color', p.color||'#546e7a', 'COLOR');
    h += campoTexto(el.id,'VAR. ABIERTA','varOpen',p.varOpen||'','"DB1".V_Open');
    h += campoTexto(el.id,'VAR. % APERTURA','varPct',p.varPct||'','"DB1".V_Pct');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'valve-safety') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'PSV1');
    h += _colorPicker(el.id, 'color', p.color||'#c62828', 'COLOR');
    h += campoTexto(el.id,'VAR. ABIERTA','varOpen',p.varOpen||'','"DB1".PSV_Open');
    h += campoTexto(el.id,'VAR. ALARMA','varAlarm',p.varAlarm||'','"DB1".PSV_Alarm');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'fan-symbol') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'FA1');
    h += _colorPicker(el.id, 'color', p.color||'#546e7a', 'COLOR');
    h += campoTexto(el.id,'VAR. MARCHA','varRun',p.varRun||'','"DB1".Fan_Run');
    h += campoTexto(el.id,'VAR. FALLO','varFault',p.varFault||'','"DB1".Fan_Fault');
    h += campoTexto(el.id,'VAR. Hz','varHz',p.varHz||'','"DB1".Fan_Hz');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'agitator-symbol') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'AG1');
    h += _colorPicker(el.id, 'color', p.color||'#546e7a', 'COLOR');
    h += campoTexto(el.id,'VAR. MARCHA','varRun',p.varRun||'','"DB1".Ag_Run');
    h += campoTexto(el.id,'VAR. RPM','varRpm',p.varRpm||'','"DB1".Ag_Rpm');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'conveyor-pid') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'CV1');
    h += _colorPicker(el.id, 'color', p.color||'#37474f', 'COLOR');
    h += campoTexto(el.id,'VAR. MARCHA','varRun',p.varRun||'','"DB1".CV_Run');
    h += campoTexto(el.id,'VAR. VELOCIDAD','varSpeed',p.varSpeed||'','"DB1".CV_Speed');
    h += campoTexto(el.id,'VAR. FALLO','varFault',p.varFault||'','"DB1".CV_Fault');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'dosing-pump') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'DP1');
    h += _colorPicker(el.id, 'color', p.color||'#1565c0', 'COLOR');
    h += campoTexto(el.id,'VAR. MARCHA','varRun',p.varRun||'','"DB1".DP_Run');
    h += campoTexto(el.id,'VAR. CAUDAL','varFlow',p.varFlow||'','"DB1".DP_Flow');
    h += campoTexto(el.id,'VAR. FALLO','varFault',p.varFault||'','"DB1".DP_Fault');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'heat-exchanger') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'HE1');
    h += _colorPicker(el.id, 'color', p.color||'#c62828', 'COLOR');
    h += campoTexto(el.id,'VAR. ACTIVO','varActive',p.varActive||'','"DB1".HE_Active');
    h += campoTexto(el.id,'VAR. TEMP ENT.','varTin',p.varTin||'','"DB1".HE_Tin');
    h += campoTexto(el.id,'VAR. TEMP SAL.','varTout',p.varTout||'','"DB1".HE_Tout');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  } else if (el.tipo === 'filter-symbol') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'F1');
    h += _colorPicker(el.id, 'color', p.color||'#546e7a', 'COLOR');
    h += campoTexto(el.id,'VAR. ΔP','varDP',p.varDP||'','"DB1".F_DP');
    h += campoTexto(el.id,'VAR. COLMATADO','varDirty',p.varDirty||'','"DB1".F_Dirty');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  } else if (el.tipo === 'compressor-symbol') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'C1');
    h += _colorPicker(el.id, 'color', p.color||'#37474f', 'COLOR');
    h += campoTexto(el.id,'VAR. MARCHA','varRun',p.varRun||'','"DB1".C_Run');
    h += campoTexto(el.id,'VAR. FALLO','varFault',p.varFault||'','"DB1".C_Fault');
    h += campoTexto(el.id,'VAR. RPM','varRpm',p.varRpm||'','"DB1".C_Rpm');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'silo') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'SL1');
    h += _colorPicker(el.id, 'color', p.color||'#78909c', 'COLOR');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'%','% / t');
    h += campoTexto(el.id,'VAR. NIVEL','varLevel',p.varLevel||'','"DB1".Silo_Level');
    h += campoTexto(el.id,'VAR. ALTO','varHigh',p.varHigh||'','"DB1".Silo_High');
    h += campoTexto(el.id,'VAR. BAJO','varLow',p.varLow||'','"DB1".Silo_Low');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  } else if (el.tipo === 'tank-horizontal') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'TH1');
    h += _colorPicker(el.id, 'color', p.color||'#1565c0', 'COLOR');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'%','%');
    h += campoTexto(el.id,'VAR. NIVEL','varLevel',p.varLevel||'','"DB1".Tank_Level');
    h += campoTexto(el.id,'VAR. ALTO','varHigh',p.varHigh||'','"DB1".Tank_High');
    h += campoTexto(el.id,'VAR. BAJO','varLow',p.varLow||'','"DB1".Tank_Low');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'tank-conical') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'TC1');
    h += _colorPicker(el.id, 'color', p.color||'#1565c0', 'COLOR');
    h += campoTexto(el.id,'VAR. NIVEL','varLevel',p.varLevel||'','"DB1".Tank_Level');
    h += campoTexto(el.id,'VAR. PESO','varWeight',p.varWeight||'','"DB1".Tank_Weight');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'reactor-vessel') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'R1');
    h += _colorPicker(el.id, 'color', p.color||'#37474f', 'COLOR');
    h += campoTexto(el.id,'VAR. TEMPERATURA','varTemp',p.varTemp||'','"DB1".R_Temp');
    h += campoTexto(el.id,'VAR. NIVEL','varLevel',p.varLevel||'','"DB1".R_Level');
    h += campoTexto(el.id,'VAR. AGITADOR','varAgit',p.varAgit||'','"DB1".R_Agit');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'separator-vessel') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'S1');
    h += _colorPicker(el.id, 'color', p.color||'#546e7a', 'COLOR');
    h += campoTexto(el.id,'VAR. NIVEL','varLevel',p.varLevel||'','"DB1".Sep_Level');
    h += campoTexto(el.id,'VAR. ACTIVO','varActive',p.varActive||'','"DB1".Sep_Active');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  /* ── MOTORES ── */
  } else if (el.tipo === 'motor-starter') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'M1');
    h += campoTexto(el.id,'VAR. MARCHA','varRun',p.varRun||'','"DB1".M_Run');
    h += campoTexto(el.id,'VAR. FALLO','varFault',p.varFault||'','"DB1".M_Fault');
    h += campoTexto(el.id,'VAR. LISTO','varReady',p.varReady||'','"DB1".M_Ready');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'vfd-faceplate') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'VFD1');
    h += campoTexto(el.id,'VAR. Hz','varHz',p.varHz||'','"DB1".VFD_Hz');
    h += campoTexto(el.id,'VAR. RPM','varRpm',p.varRpm||'','"DB1".VFD_Rpm');
    h += campoTexto(el.id,'VAR. CORRIENTE','varI',p.varI||'','"DB1".VFD_I');
    h += campoTexto(el.id,'VAR. MARCHA','varRun',p.varRun||'','"DB1".VFD_Run');
    h += campoTexto(el.id,'VAR. FALLO','varFault',p.varFault||'','"DB1".VFD_Fault');
    h += campoNumero(el.id,'Hz MÁXIMOS','maxHz',p.maxHz||60);
    h += campoNumero(el.id,'RPM MÁXIMOS','maxRpm',p.maxRpm||1500);
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'servo-axis') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'AX1');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'mm','mm / °');
    h += campoNumero(el.id,'MÍNIMO','min',p.min||0);
    h += campoNumero(el.id,'MÁXIMO','max',p.max||500);
    h += campoTexto(el.id,'VAR. POSICIÓN','varPos',p.varPos||'','"DB1".Ax_Pos');
    h += campoTexto(el.id,'VAR. TARGET','varTarget',p.varTarget||'','"DB1".Ax_Target');
    h += campoTexto(el.id,'VAR. ENABLE','varEnable',p.varEnable||'','"DB1".Ax_Enable');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||200);
  } else if (el.tipo === 'motor-runtime') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'M1');
    h += campoTexto(el.id,'VAR. HORAS','varHours',p.varHours||'','"DB1".M_Hours');
    h += campoTexto(el.id,'VAR. MARCHA','varRun',p.varRun||'','"DB1".M_Run');
    h += campoNumero(el.id,'AVISO MTO (h)','warningH',p.warningH||8000);
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||5000);
  } else if (el.tipo === 'brake-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'BR1');
    h += campoTexto(el.id,'VAR. FRENO ACTIVO','varBrake',p.varBrake||'','"DB1".Br_Active');
    h += campoTexto(el.id,'VAR. FALLO','varFault',p.varFault||'','"DB1".Br_Fault');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  /* ── INSTRUMENTACIÓN ── */
  } else if (el.tipo === 'thermometer-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'TT1');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'°C','°C / °F');
    h += campoNumero(el.id,'MÍNIMO','min',p.min||0);
    h += campoNumero(el.id,'MÁXIMO','max',p.max||200);
    h += _colorPicker(el.id, 'color', p.color||'#c62828', 'COLOR');
    h += campoTexto(el.id,'VAR. TEMPERATURA','varTemp',p.varTemp||'','"DB1".Temp');
    h += campoTexto(el.id,'VAR. ALARMA','varAlarm',p.varAlarm||'','"DB1".Temp_Alarm');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  } else if (el.tipo === 'pressure-gauge-pid') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'PT1');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'bar','bar / psi');
    h += campoNumero(el.id,'MÍNIMO','min',p.min||0);
    h += campoNumero(el.id,'MÁXIMO','max',p.max||10);
    h += _colorPicker(el.id, 'color', p.color||'#1565c0', 'COLOR');
    h += campoTexto(el.id,'VAR. PRESIÓN','varPres',p.varPres||'','"DB1".Pres');
    h += campoTexto(el.id,'VAR. ALARMA','varAlarm',p.varAlarm||'','"DB1".Pres_Alarm');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'flow-totalizer') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'FT1');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'m³/h','m³/h / l/min');
    h += _colorPicker(el.id, 'color', p.color||'#00838f', 'COLOR');
    h += campoTexto(el.id,'VAR. CAUDAL','varFlow',p.varFlow||'','"DB1".Flow');
    h += campoTexto(el.id,'VAR. TOTAL ACUM.','varTotal',p.varTotal||'','"DB1".Total');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'level-indicator') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'LT1');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'%','% / mm');
    h += campoNumero(el.id,'MÍNIMO','min',p.min||0);
    h += campoNumero(el.id,'MÁXIMO','max',p.max||100);
    h += _colorPicker(el.id, 'color', p.color||'#1565c0', 'COLOR');
    h += campoTexto(el.id,'VAR. NIVEL','varLevel',p.varLevel||'','"DB1".Level');
    h += campoTexto(el.id,'VAR. ALTO ALTO','varHigh',p.varHigh||'','"DB1".Level_HH');
    h += campoTexto(el.id,'VAR. BAJO BAJO','varLow',p.varLow||'','"DB1".Level_LL');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'energy-meter') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'EM1');
    h += campoTexto(el.id,'VAR. kW','varKw',p.varKw||'','"DB1".EM_Kw');
    h += campoTexto(el.id,'VAR. kWh','varKwh',p.varKwh||'','"DB1".EM_Kwh');
    h += campoTexto(el.id,'VAR. PF','varPf',p.varPf||'','"DB1".EM_Pf');
    h += campoTexto(el.id,'VAR. V','varV',p.varV||'','"DB1".EM_V');
    h += campoTexto(el.id,'VAR. A','varA',p.varA||'','"DB1".EM_A');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||2000);
  } else if (el.tipo === 'ph-meter') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'AT1');
    h += campoTexto(el.id,'VAR. pH','varPH',p.varPH||'','"DB1".PH');
    h += campoTexto(el.id,'VAR. ALARMA','varAlarm',p.varAlarm||'','"DB1".PH_Alarm');
    h += campoNumero(el.id,'SETPOINT','setpoint',p.setpoint||7);
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  } else if (el.tipo === 'rpm-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'ST1');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'rpm','rpm');
    h += campoNumero(el.id,'RPM MÁXIMOS','maxRpm',p.maxRpm||3000);
    h += campoTexto(el.id,'VAR. RPM','varRpm',p.varRpm||'','"DB1".RPM');
    h += campoTexto(el.id,'VAR. REFERENCIA','varRef',p.varRef||'','"DB1".RPM_Ref');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'temperature-4zone') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'TEMP ZONES');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'°C','°C');
    h += campoNumero(el.id,'SETPOINT REF.','sp',p.sp||200);
    h += campoTexto(el.id,'VAR. ZONA 1','varT1',p.varT1||'','"DB1".T1');
    h += campoTexto(el.id,'VAR. ZONA 2','varT2',p.varT2||'','"DB1".T2');
    h += campoTexto(el.id,'VAR. ZONA 3','varT3',p.varT3||'','"DB1".T3');
    h += campoTexto(el.id,'VAR. ZONA 4','varT4',p.varT4||'','"DB1".T4');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  /* ── CONTROL ── */
  } else if (el.tipo === 'pid-controller') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'PIC-101');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'%','% / °C');
    h += campoTexto(el.id,'VAR. SP','varSP',p.varSP||'','"DB1".PIC_SP');
    h += campoTexto(el.id,'VAR. PV','varPV',p.varPV||'','"DB1".PIC_PV');
    h += campoTexto(el.id,'VAR. MV','varMV',p.varMV||'','"DB1".PIC_MV');
    h += campoTexto(el.id,'VAR. MODO AUTO','varMode',p.varMode||'','"DB1".PIC_Auto');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'sequence-stepper') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'SEQ1');
    h += campoTexto(el.id,'NOMBRES PASOS (coma)','names',p.names||'INIT,RUN,STOP','INIT,FILL,HEAT...');
    h += campoNumero(el.id,'NÚMERO DE PASOS','varTotal',p.varTotal||8);
    h += campoTexto(el.id,'VAR. PASO ACTUAL','varStep',p.varStep||'','"DB1".Seq_Step');
    h += campoTexto(el.id,'VAR. ACTIVO','varActive',p.varActive||'','"DB1".Seq_Run');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'timer-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'T1');
    h += _colorPicker(el.id, 'color', p.color||'#1565c0', 'COLOR');
    h += campoTexto(el.id,'VAR. ACTIVO','varActive',p.varActive||'','"DB1".T_Run');
    h += campoTexto(el.id,'VAR. TIEMPO ACTUAL','varElapsed',p.varElapsed||'','"DB1".T_ET');
    h += campoTexto(el.id,'VAR. PRESET','varPreset',p.varPreset||'','"DB1".T_PT');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'counter-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'C1');
    h += _colorPicker(el.id, 'color', p.color||'#2e7d32', 'COLOR');
    h += campoTexto(el.id,'VAR. VALOR ACTUAL','varCount',p.varCount||'','"DB1".C_CV');
    h += campoTexto(el.id,'VAR. PRESET','varPreset',p.varPreset||'','"DB1".C_PV');
    h += campoTexto(el.id,'VAR. RESET','varReset',p.varReset||'','"DB1".C_Reset');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'interlock-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'INTERLOCKS');
    h += campoNumero(el.id,'NÚMERO (1-8)','numIL',p.numIL||4);
    var ni = Math.min(parseInt(p.numIL)||4, 8);
    for (var ii=1;ii<=ni;ii++) {
      h += campoTexto(el.id,'NOMBRE IL'+ii,'iln'+ii,p['iln'+ii]||('IL'+ii),'descripción');
      h += campoTexto(el.id,'VAR IL'+ii,'il'+ii,p['il'+ii]||'','"DB1".IL'+ii);
    }
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'manual-auto-switch') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'MODO');
    h += campoTexto(el.id,'TEXTO AUTO','textAuto',p.textAuto||'AUTO','AUTO');
    h += campoTexto(el.id,'TEXTO MANUAL','textMan',p.textMan||'MANUAL','MANUAL');
    h += campoTexto(el.id,'VAR. MODO (true=AUTO)','varMode',p.varMode||'','"DB1".Mode_Auto');
    h += campoTexto(el.id,'VAR. SALIDA MANUAL','varMV',p.varMV||'','"DB1".Mode_MV');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  /* ── ELÉCTRICO ── */
  } else if (el.tipo === 'circuit-breaker') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'Q1');
    h += campoTexto(el.id,'VAR. CERRADO','varState',p.varState||'','"DB1".Q_Closed');
    h += campoTexto(el.id,'VAR. DISPARADO','varTrip',p.varTrip||'','"DB1".Q_Trip');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'contactor-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'KM1');
    h += campoTexto(el.id,'VAR. CERRADO','varClosed',p.varClosed||'','"DB1".KM_Closed');
    h += campoTexto(el.id,'VAR. FALLO','varFault',p.varFault||'','"DB1".KM_Fault');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'power-meter') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'PM1');
    h += campoTexto(el.id,'VAR. kW','varKw',p.varKw||'','"DB1".PM_Kw');
    h += campoTexto(el.id,'VAR. kVAr','varKvar',p.varKvar||'','"DB1".PM_Kvar');
    h += campoTexto(el.id,'VAR. PF','varPf',p.varPf||'','"DB1".PM_Pf');
    h += campoTexto(el.id,'VAR. V','varV',p.varV||'','"DB1".PM_V');
    h += campoTexto(el.id,'VAR. A','varA',p.varA||'','"DB1".PM_A');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||2000);
  } else if (el.tipo === 'ups-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'UPS1');
    h += campoTexto(el.id,'VAR. BATERÍA %','varBat',p.varBat||'','"DB1".UPS_Bat');
    h += campoTexto(el.id,'VAR. ESTADO','varState',p.varState||'','"DB1".UPS_State');
    h += campoTexto(el.id,'VAR. CARGA %','varLoad',p.varLoad||'','"DB1".UPS_Load');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||5000);
  } else if (el.tipo === 'generator-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'GEN1');
    h += campoTexto(el.id,'VAR. Hz','varHz',p.varHz||'','"DB1".Gen_Hz');
    h += campoTexto(el.id,'VAR. V','varV',p.varV||'','"DB1".Gen_V');
    h += campoTexto(el.id,'VAR. kW','varKw',p.varKw||'','"DB1".Gen_Kw');
    h += campoTexto(el.id,'VAR. MARCHA','varRun',p.varRun||'','"DB1".Gen_Run');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  /* ── PRODUCCIÓN ── */
  } else if (el.tipo === 'batch-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'BATCH');
    h += campoTexto(el.id,'NOMBRES PASOS (coma)','stepNames',p.stepNames||'PREPARE,REACT,COOL,END','PASO1,PASO2...');
    h += campoTexto(el.id,'VAR. BATCH ID','varBatch',p.varBatch||'','"DB1".Batch_ID');
    h += campoTexto(el.id,'VAR. PASO','varStep',p.varStep||'','"DB1".Batch_Step');
    h += campoTexto(el.id,'VAR. % PROGRESO','varPct',p.varPct||'','"DB1".Batch_Pct');
    h += campoTexto(el.id,'VAR. ACTIVO','varActive',p.varActive||'','"DB1".Batch_Run');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  } else if (el.tipo === 'production-counter') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'PROD');
    h += campoTexto(el.id,'VAR. BUENAS','varGood',p.varGood||'','"DB1".Prod_Good');
    h += campoTexto(el.id,'VAR. MALAS','varBad',p.varBad||'','"DB1".Prod_Bad');
    h += campoTexto(el.id,'VAR. TARGET','varTarget',p.varTarget||'','"DB1".Prod_Target');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  } else if (el.tipo === 'cycle-time') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'CICLO');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'s','s / ms');
    h += campoTexto(el.id,'VAR. ACTUAL','varActual',p.varActual||'','"DB1".Cycle_Actual');
    h += campoTexto(el.id,'VAR. REFERENCIA','varRef',p.varRef||'','"DB1".Cycle_Ref');
    h += campoTexto(el.id,'VAR. MÍNIMO','varMin',p.varMin||'','"DB1".Cycle_Min');
    h += campoTexto(el.id,'VAR. MÁXIMO','varMax',p.varMax||'','"DB1".Cycle_Max');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'quality-gauge') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'OEE');
    h += campoTexto(el.id,'VAR. OEE %','varOEE',p.varOEE||'','"DB1".OEE');
    h += campoTexto(el.id,'VAR. DISPONIB.','varAvail',p.varAvail||'','"DB1".OEE_Avail');
    h += campoTexto(el.id,'VAR. RENDIM.','varPerf',p.varPerf||'','"DB1".OEE_Perf');
    h += campoTexto(el.id,'VAR. CALIDAD','varQual',p.varQual||'','"DB1".OEE_Qual');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||5000);
  /* ── SEGURIDAD ── */
  } else if (el.tipo === 'safety-door') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'SD1');
    h += campoTexto(el.id,'VAR. ABIERTA','varOpen',p.varOpen||'','"DB1".SD_Open');
    h += campoTexto(el.id,'VAR. BLOQUEADA','varLocked',p.varLocked||'','"DB1".SD_Lock');
    h += campoTexto(el.id,'VAR. BYPASS','varBypassed',p.varBypassed||'','"DB1".SD_Bypass');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||200);
  } else if (el.tipo === 'estop-circuit') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'ES1');
    h += campoTexto(el.id,'VAR. OK','varOK',p.varOK||'','"DB1".ES_OK');
    h += campoTexto(el.id,'VAR. FALLO','varFault',p.varFault||'','"DB1".ES_Fault');
    h += campoTexto(el.id,'VAR. RESET','varReset',p.varReset||'','"DB1".ES_Reset');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||200);
  } else if (el.tipo === 'two-hand-control') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'2H1');
    h += campoTexto(el.id,'VAR. MANO 1','varH1',p.varH1||'','"DB1".THC_H1');
    h += campoTexto(el.id,'VAR. MANO 2','varH2',p.varH2||'','"DB1".THC_H2');
    h += campoTexto(el.id,'VAR. OK','varOK',p.varOK||'','"DB1".THC_OK');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||200);
  /* ── UTILITIES ── */
  } else if (el.tipo === 'pump-station') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'PS1');
    h += campoTexto(el.id,'VAR. BOMBA 1','varP1Run',p.varP1Run||'','"DB1".PS_P1');
    h += campoTexto(el.id,'VAR. BOMBA 2','varP2Run',p.varP2Run||'','"DB1".PS_P2');
    h += campoTexto(el.id,'VAR. NIVEL','varLevel',p.varLevel||'','"DB1".PS_Level');
    h += campoTexto(el.id,'VAR. FALLO','varFault',p.varFault||'','"DB1".PS_Fault');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'compressed-air') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'AIR');
    h += campoTexto(el.id,'VAR. PRESIÓN','varPres',p.varPres||'','"DB1".Air_Pres');
    h += campoTexto(el.id,'VAR. CAUDAL','varFlow',p.varFlow||'','"DB1".Air_Flow');
    h += campoTexto(el.id,'VAR. ALARMA','varAlarm',p.varAlarm||'','"DB1".Air_Alarm');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  /* ── TIA PORTAL ── */
  } else if (el.tipo === 'analog-output') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'AO1');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'mA','mA / V');
    h += campoNumero(el.id,'MÍNIMO','min',p.min||4);
    h += campoNumero(el.id,'MÁXIMO','max',p.max||20);
    h += campoTexto(el.id,'VAR. SALIDA','varOut',p.varOut||'','"DB1".AO_Out');
    h += campoTexto(el.id,'VAR. MODO MANUAL','varMode',p.varMode||'','"DB1".AO_Manual');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||500);
  } else if (el.tipo === 'trend-comparison') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'TREND');
    h += campoTexto(el.id,'ETIQUETA A','labelA',p.labelA||'PV','PV / SP');
    h += campoTexto(el.id,'ETIQUETA B','labelB',p.labelB||'SP','PV / SP');
    h += _colorPicker(el.id,'colorA',p.colorA||'#c62828','COLOR A');
    h += _colorPicker(el.id,'colorB',p.colorB||'#1565c0','COLOR B');
    h += campoNumero(el.id,'MÍNIMO','min',p.min||0);
    h += campoNumero(el.id,'MÁXIMO','max',p.max||100);
    h += campoNumero(el.id,'PUNTOS','points',p.points||60);
    h += campoTexto(el.id,'VAR. A','varA',p.varA||'','"DB1".Trend_A');
    h += campoTexto(el.id,'VAR. B','varB',p.varB||'','"DB1".Trend_B');
    h += campoTexto(el.id,'UNIDAD','unit',p.unit||'%','%');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  } else if (el.tipo === 'string-display') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'MSG','etiqueta');
    h += campoTexto(el.id,'VAR. STRING PLC','varString',p.varString||'','"DB1".Message');
    h += campoNumero(el.id,'LONGITUD MAX','maxLen',p.maxLen||40);
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||1000);
  } else if (el.tipo === 'plc-clock-sync') {
    h += campoTexto(el.id,'ETIQUETA','label',p.label||'PLC TIME','etiqueta');
    h += campoTexto(el.id,'VAR. HORA PLC','varTime',p.varTime||'','"DB1".PLC_Time');
    h += campoTexto(el.id,'VAR. FECHA PLC','varDate',p.varDate||'','"DB1".PLC_Date');
    h += campoNumero(el.id,'POLLING (ms)','pollMs',p.pollMs||5000);
  } else if (el.tipo === 'frame-box') {
  } else if (el.tipo === 'pipe-h' || el.tipo === 'pipe-v') {
    h += _colorPicker(el.id, 'color', p.color      || '#546e7a', 'COLOR TUBERÍA');
    h += _colorPicker(el.id,'fluidColor',p.fluidColor||'#29b6f6','COLOR FLUIDO');
    h += campoTexto(el.id, 'ETIQUETA',      'label',      p.label      || '', 'opcional');
  } else if (el.tipo === 'pipe-elbow') {
    h += _colorPicker(el.id, 'color', p.color      || '#546e7a', 'COLOR TUBERÍA');
    h += _colorPicker(el.id,'fluidColor',p.fluidColor||'#29b6f6','COLOR FLUIDO');
    h += '<div class="prow"><div class="plbl">DIRECCIÓN</div>' +
      '<select class="psel" data-id="'+el.id+'" data-key="direction" onchange="actualizarProp(this)">' +
        '<option value="tr"'+(( p.direction||'tr')==='tr'?' selected':'')+'>↗ Arriba-Derecha</option>' +
        '<option value="tl"'+(p.direction==='tl'?' selected':'')+'>↖ Arriba-Izquierda</option>' +
        '<option value="br"'+(p.direction==='br'?' selected':'')+'>↘ Abajo-Derecha</option>' +
        '<option value="bl"'+(p.direction==='bl'?' selected':'')+'>↙ Abajo-Izquierda</option>' +
      '</select></div>';
  } else if (el.tipo === 'pipe-tee' || el.tipo === 'pipe-cross') {
    h += _colorPicker(el.id, 'color', p.color      || '#546e7a', 'COLOR TUBERÍA');
    h += _colorPicker(el.id,'fluidColor',p.fluidColor||'#29b6f6','COLOR FLUIDO');
  } else if (el.tipo === 'deco-motor-el' || el.tipo === 'deco-pump-cent') {
    h += campoTexto(el.id, 'ETIQUETA', 'label', p.label || (el.tipo==='deco-motor-el'?'M1':'P1'));
    h += _colorPicker(el.id, 'color', p.color || '#37474f', 'COLOR');
  } else if (el.tipo === 'signal-lamp') {
    h += campoTexto(el.id, 'ETIQUETA',       'label',  p.label  || 'SL1');
    h += campoNumero(el.id,'POLLING (ms)',   'pollMs', p.pollMs || 500);
    h += _checkbox(el.id, 'useBlue', p.useBlue||false, 'Incluir 4º color (Azul)');
    h += '<div class="psec-sub">LUZ ROJA</div>';
    h += campoTexto(el.id, 'VARIABLE PLC', 'varR', p.varR || '"DB1".Lamp_Red',    '"DB1".Var');
    h += campoTexto(el.id, 'VALOR ACTIVA', 'trigR', p.trigR || 'true',            'true / 1');
    h += '<div class="psec-sub">LUZ AMARILLA</div>';
    h += campoTexto(el.id, 'VARIABLE PLC', 'varY', p.varY || '"DB1".Lamp_Yellow', '"DB1".Var');
    h += campoTexto(el.id, 'VALOR ACTIVA', 'trigY', p.trigY || 'true',            'true / 1');
    h += '<div class="psec-sub">LUZ VERDE</div>';
    h += campoTexto(el.id, 'VARIABLE PLC', 'varG', p.varG || '"DB1".Lamp_Green',  '"DB1".Var');
    h += campoTexto(el.id, 'VALOR ACTIVA', 'trigG', p.trigG || 'true',            'true / 1');
    if (p.useBlue) {
      h += '<div class="psec-sub">LUZ AZUL</div>';
      h += campoTexto(el.id, 'VARIABLE PLC', 'varB', p.varB || '"DB1".Lamp_Blue', '"DB1".Var');
      h += campoTexto(el.id, 'VALOR ACTIVA', 'trigB', p.trigB || 'true',          'true / 1');
    }
  } else if (el.tipo === 'shape-rect') {
    h += _colorPicker(el.id, 'fill', p.fill        || '#1565c0', 'COLOR RELLENO');
    h += campoNumero(el.id,'OPACIDAD RELLENO (0-1)', 'fillOpacity', p.fillOpacity !== undefined ? p.fillOpacity : 0.15);
    h += _colorPicker(el.id, 'stroke', p.stroke      || '#1565c0', 'COLOR BORDE');
    h += campoNumero(el.id,'GROSOR BORDE (px)',  'strokeWidth', p.strokeWidth !== undefined ? p.strokeWidth : 2);
    h += campoNumero(el.id,'RADIO ESQUINAS (px)', 'radius',     p.radius      !== undefined ? p.radius : 0);
  } else if (el.tipo === 'shape-circle') {
    h += _colorPicker(el.id, 'fill', p.fill        || '#2e7d32', 'COLOR RELLENO');
    h += campoNumero(el.id,'OPACIDAD RELLENO (0-1)', 'fillOpacity', p.fillOpacity !== undefined ? p.fillOpacity : 0.15);
    h += _colorPicker(el.id, 'stroke', p.stroke      || '#2e7d32', 'COLOR BORDE');
    h += campoNumero(el.id,'GROSOR BORDE (px)',  'strokeWidth', p.strokeWidth !== undefined ? p.strokeWidth : 2);
  } else if (el.tipo === 'shape-line') {
    h += _colorPicker(el.id, 'stroke', p.stroke      || '#1a1a18', 'COLOR');
    h += campoNumero(el.id,'GROSOR (px)',    'strokeWidth', p.strokeWidth !== undefined ? p.strokeWidth : 2);
    h += campoNumero(el.id,'ÁNGULO (0-180°)', 'angle',      p.angle       !== undefined ? p.angle : 0);
    h += '<div class="prow"><div class="plbl">REMATE</div>' +
      '<select class="psel" data-id="' + el.id + '" data-key="cap" onchange="actualizarProp(this)">' +
        '<option value="round"'  + ((p.cap||'round') === 'round'  ? ' selected' : '') + '>Redondeado</option>' +
        '<option value="square"' + (p.cap === 'square'            ? ' selected' : '') + '>Cuadrado</option>' +
        '<option value="butt"'   + (p.cap === 'butt'              ? ' selected' : '') + '>Plano</option>' +
      '</select></div>';
  } else if (el.tipo === 'shape-curve') {
    h += _colorPicker(el.id, 'stroke', p.stroke      || '#c62828', 'COLOR');
    h += campoNumero(el.id,'GROSOR (px)',    'strokeWidth', p.strokeWidth !== undefined ? p.strokeWidth : 2);
    h += campoNumero(el.id,'CURVATURA (-100 a 100)', 'curvature', p.curvature !== undefined ? p.curvature : 50);
    h += '<div class="prow"><div class="plbl">REMATE</div>' +
      '<select class="psel" data-id="' + el.id + '" data-key="cap" onchange="actualizarProp(this)">' +
        '<option value="round"'  + ((p.cap||'round') === 'round'  ? ' selected' : '') + '>Redondeado</option>' +
        '<option value="square"' + (p.cap === 'square'            ? ' selected' : '') + '>Cuadrado</option>' +
        '<option value="butt"'   + (p.cap === 'butt'              ? ' selected' : '') + '>Plano</option>' +
      '</select></div>';
  } else if (el.tipo === 'shape-triangle') {
    h += _colorPicker(el.id, 'fill', p.fill        || '#f57c00', 'COLOR RELLENO');
    h += campoNumero(el.id,'OPACIDAD RELLENO (0-1)', 'fillOpacity', p.fillOpacity !== undefined ? p.fillOpacity : 0.15);
    h += _colorPicker(el.id, 'stroke', p.stroke      || '#f57c00', 'COLOR BORDE');
    h += campoNumero(el.id,'GROSOR BORDE (px)',  'strokeWidth', p.strokeWidth !== undefined ? p.strokeWidth : 2);
    h += '<div class="prow"><div class="plbl">DIRECCIÓN</div>' +
      '<select class="psel" data-id="' + el.id + '" data-key="direction" onchange="actualizarProp(this)">' +
        '<option value="up"'    + ((p.direction||'up') === 'up'    ? ' selected' : '') + '>▲ Arriba</option>' +
        '<option value="down"'  + (p.direction === 'down'          ? ' selected' : '') + '>▼ Abajo</option>' +
        '<option value="left"'  + (p.direction === 'left'          ? ' selected' : '') + '>◀ Izquierda</option>' +
        '<option value="right"' + (p.direction === 'right'         ? ' selected' : '') + '>▶ Derecha</option>' +
      '</select></div>';
  } else if (el.tipo === 'frame-box') {
    h += campoTexto(el.id, 'TÍTULO MARCO', 'title', p.title || 'ZONA');
    h += _colorPicker(el.id, 'color', p.color || '#1a1a18', 'COLOR');
  } else if (el.tipo === 'separator-h') {
    h += campoTexto(el.id, 'ETIQUETA', 'label', p.label || '', 'opcional');
    h += _colorPicker(el.id, 'color', p.color || '#1a1a18', 'COLOR');
  } else if (el.tipo === 'title-banner') {
    h += campoTexto(el.id,  'TÍTULO',    'text',    p.text    || '');
    h += campoTexto(el.id,  'SUBTÍTULO', 'subtext', p.subtext || '', 'Línea 1 · Turno Mañana');
    h += campoTexto(el.id,  'ICONO',     'icon',    p.icon    || '\u2699', 'unicode');
    h += campoTexto(el.id,  'BADGE',     'badge',   p.badge   || '', 'v2.0');
    h += campoNumero(el.id, 'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 12);
    h += _colorPicker(el.id, 'color', p.color || '#1a1a18', 'COLOR FONDO');
    h += _colorPicker(el.id, 'fontColor', p.fontColor || '#ffffff', 'COLOR TEXTO');
  } else if (el.tipo === 'text-block') {
    h += '<div class="prow"><div class="plbl">TEXTO (multilinea)</div>' +
      '<textarea class="pinp" rows="4" style="resize:vertical;font-size:10px;line-height:1.5" data-id="' + el.id + '" data-key="text" onchange="actualizarProp(this)">' + escHtml(p.text||'') + '</textarea></div>';
    h += campoNumero(el.id, 'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 12);
    h += _colorPicker(el.id, 'fontColor', p.fontColor || '#1a1a18', 'COLOR TEXTO');
  } else if (el.tipo === 'image-static') {
    if (p.imgData)
      h += '<div class="prow"><div class="plbl">IMAGEN ACTUAL</div><img class="img-thumb" src="' + p.imgData + '" alt="preview"></div>';
    h += '<div class="prow"><div class="img-upload-area" data-id="' + el.id + '" onclick="pedirImagen(this.dataset.id)">' + (p.imgData?'Cambiar imagen':'Cargar imagen') + '</div></div>';
    h += '<div class="prow"><div class="plbl">AJUSTE</div>' +
      '<select class="psel" data-id="' + el.id + '" data-key="fit" onchange="actualizarProp(this)">' +
        '<option value="contain"' + ((p.fit||'contain')==='contain'?' selected':'') + '>Contener</option>' +
        '<option value="cover"'   + (p.fit==='cover'               ?' selected':'') + '>Cubrir</option>' +
        '<option value="fill"'    + (p.fit==='fill'                ?' selected':'') + '>Estirar</option>' +
      '</select></div>';

  /* ── SISTEMA ── */
  } else if (el.tipo === 'clock-widget') {
    h += campoNumero(el.id, 'TAMAÑO FUENTE (px)', 'fontSize', p.fontSize || 22);
  } else if (el.tipo === 'plc-info') {
    h += campoTexto(el.id, 'IP PLC',     'ip',    p.ip    || '', '192.168.1.1');
    h += campoTexto(el.id, 'MODELO CPU', 'model', p.model || 'S7-1214C');

  /* ── INFO-CARD ── */
  } else if (el.tipo === 'info-card') {
    h += campoTexto(el.id, 'TÍTULO',         'title', p.title || 'INFO CARD');
    h += campoTexto(el.id, 'ICONO',          'icon',  p.icon  || '\u24d8', 'ℹ / ⚙ / ★');
    h += campoTexto(el.id, 'BADGE / BLOQUE', 'badge', p.badge || '', 'DB1 / v2.0');
    var icCols = ['blue','green','orange','red','purple'];
    for (var ici=1;ici<=6;ici++) {
      h += '<div class="psec-sub">FILA ' + ici + '</div>';
      h += campoTexto(el.id,'CLAVE',          'rkey'+ici, p['rkey'+ici]||'', 'Etiqueta');
      h += campoTexto(el.id,'VALOR / VAR PLC','rval'+ici, p['rval'+ici]||'', '"DB1".Variable');
      h += '<div class="prow"><div class="plbl">COLOR</div>' +
        '<select class="psel" data-id="' + el.id + '" data-key="rcol'+ici+'" onchange="actualizarProp(this)">' +
          icCols.map(function(co){return '<option value="'+co+'"'+((p['rcol'+ici]||'blue')===co?' selected':'')+'>'+co.charAt(0).toUpperCase()+co.slice(1)+'</option>';}).join('') +
        '</select></div>';
    }
    h += '<div class="prow"><div class="plbl">NOTAS</div>' +
      '<textarea class="pinp" rows="3" style="resize:vertical;font-size:10px;line-height:1.5" data-id="' + el.id + '" data-key="notes" onchange="actualizarProp(this)">' + escHtml(p.notes||'') + '</textarea></div>';

  } else {
    /* Elemento decorativo puro (deco-*, auto-*, fab-*) — sin campos de propiedades adicionales */
    h += '<div class="prow" style="font-size:9px;color:var(--mid);line-height:1.6">Elemento decorativo — configura su visibilidad y animación en la sección COMPORTAMIENTO.</div>';
  }

  h += '</div>'; /* cierre psec PROPIEDADES */

  /* ════════════════════════════════════════════════════════
     COMPORTAMIENTO — visibilidad + animación para:
     · Todos los elementos decorativos / sensores / PID / nav / sistema
     · Los botones y controles también lo tienen (para ocultar según PLC)
  ════════════════════════════════════════════════════════ */
  var vm = p.visMode || 'always';
  var esDeco = (el.tipo.indexOf('deco-')===0 || el.tipo.indexOf('auto-')===0 ||
                el.tipo.indexOf('fab-')===0);
  var tieneMov = _en(el.tipo, _T_ANIM);

  if (esDeco || _en(el.tipo, _T_SENSORES) || _en(el.tipo, _T_PID) ||
      el.tipo==='nav-button' || el.tipo==='nav-menu' ||
      el.tipo==='clock-widget' || el.tipo==='plc-info' ||
      el.tipo==='info-card' || el.tipo==='image-static' ||
      el.tipo==='frame-box' || el.tipo==='separator-h' ||
      el.tipo==='title-banner' || el.tipo==='text-block' || el.tipo==='tooltip-node' ||
      el.tipo==='shape-rect' || el.tipo==='shape-circle' ||
      el.tipo==='shape-line' || el.tipo==='shape-curve' ||
      el.tipo==='shape-triangle' ||
      el.tipo==='pipe-h' || el.tipo==='pipe-v' || el.tipo==='pipe-elbow' ||
      el.tipo==='pipe-tee' || el.tipo==='pipe-cross' ||
      el.tipo==='deco-motor-el' || el.tipo==='deco-pump-cent' ||
      el.tipo==='valve-motorized' ||
      el.tipo==='valve-butterfly' ||
      el.tipo==='valve-safety' ||
      el.tipo==='fan-symbol' ||
      el.tipo==='agitator-symbol' ||
      el.tipo==='conveyor-pid' ||
      el.tipo==='dosing-pump' ||
      el.tipo==='heat-exchanger' ||
      el.tipo==='filter-symbol' ||
      el.tipo==='compressor-symbol' ||
      el.tipo==='silo' ||
      el.tipo==='tank-horizontal' ||
      el.tipo==='tank-conical' ||
      el.tipo==='reactor-vessel' ||
      el.tipo==='separator-vessel' ||
      el.tipo==='motor-starter' ||
      el.tipo==='vfd-faceplate' ||
      el.tipo==='servo-axis' ||
      el.tipo==='motor-runtime' ||
      el.tipo==='brake-display' ||
      el.tipo==='thermometer-display' ||
      el.tipo==='pressure-gauge-pid' ||
      el.tipo==='flow-totalizer' ||
      el.tipo==='level-indicator' ||
      el.tipo==='energy-meter' ||
      el.tipo==='ph-meter' ||
      el.tipo==='rpm-display' ||
      el.tipo==='temperature-4zone' ||
      el.tipo==='pid-controller' ||
      el.tipo==='sequence-stepper' ||
      el.tipo==='timer-display' ||
      el.tipo==='counter-display' ||
      el.tipo==='interlock-display' ||
      el.tipo==='manual-auto-switch' ||
      el.tipo==='circuit-breaker' ||
      el.tipo==='contactor-display' ||
      el.tipo==='power-meter' ||
      el.tipo==='ups-display' ||
      el.tipo==='generator-display' ||
      el.tipo==='batch-display' ||
      el.tipo==='production-counter' ||
      el.tipo==='cycle-time' ||
      el.tipo==='quality-gauge' ||
      el.tipo==='safety-door' ||
      el.tipo==='estop-circuit' ||
      el.tipo==='two-hand-control' ||
      el.tipo==='pump-station' ||
      el.tipo==='compressed-air' ||
      el.tipo==='analog-output' ||
      el.tipo==='trend-comparison' ||
      el.tipo==='string-display' ||
      el.tipo==='plc-clock-sync' ||
      el.tipo==='signal-lamp' ||
      el.tipo==='label') {
    /* Sección COMPORTAMIENTO (sin sección PLC) */
    h += '<div class="psec"><div class="psec-title">COMPORTAMIENTO</div>';
    h += '<div class="prow"><div class="plbl">VISIBILIDAD</div>' +
      '<select class="psel" data-id="' + el.id + '" data-key="visMode" onchange="actualizarProp(this)">' +
        '<option value="always"' + (vm==='always'?' selected':'') + '>SIEMPRE VISIBLE</option>' +
        '<option value="on"'     + (vm==='on'    ?' selected':'') + '>VISIBLE CUANDO ACTIVO</option>' +
        '<option value="off"'    + (vm==='off'   ?' selected':'') + '>VISIBLE CUANDO INACTIVO</option>' +
      '</select></div>';
    if (vm !== 'always') {
      h += _varPlc(el.id, 'visVar',     p.visVar,     'VARIABLE PLC',     '"DB1".Marca');
      h += _triggerVal(el.id, p.visTrigger || 'true');
      h += campoNumero(el.id,'POLLING CADA (ms)','visPollMs', p.visPollMs || 1000);
    }
    if (tieneMov) {
      h += '<div class="prow" style="margin-top:6px"><div class="plbl" style="color:var(--mid);font-size:8px;letter-spacing:1.5px">ANIMACIÓN</div></div>';
      if (_en(el.tipo, _T_SENSORES)) {
        h += '<div class="prow" style="font-size:9px;color:var(--mid);line-height:1.4">⚡ La animación usa la variable configurada en PROPIEDADES.</div>';
      } else {
        h += '<div class="prow" style="font-size:9px;color:var(--mid);line-height:1.4">Variable que activa el movimiento (puede ser la misma que visibilidad).</div>';
        h += _varPlc(el.id, 'animVar',     p.animVar     || p.visVar || '', 'VARIABLE ANIMAR', '"DB1".Motor_On');
        h += campoTexto(el.id,'VALOR QUE ANIMA','animTrigger', p.animTrigger||'true','true / 1 / OK');
        h += campoNumero(el.id,'POLLING ANIM (ms)','animPollMs', p.animPollMs || 1000);
      }
      h += '<div class="prow"><button style="width:100%;padding:6px;margin-top:2px;background:transparent;border:1px solid var(--border);border-radius:2px;color:var(--mid);font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;cursor:pointer;transition:all .15s" onmouseover="this.style.background=\'rgba(0,200,83,.1)\';this.style.color=\'#00c853\'" onmouseout="this.style.background=\'transparent\';this.style.color=\'var(--mid)\'" onclick="simularAnimacion(\'' + el.id + '\')">▶  PREVISUALIZAR</button></div>';
    }
    h += '</div>';

  } else {
    /* Sección VISIBILIDAD para elementos interactivos (botones, alarmas, datos…) */
    h += '<div class="psec"><div class="psec-title">VISIBILIDAD</div>';
    h += '<div class="prow"><div class="plbl">MODO</div>' +
      '<select class="psel" data-id="' + el.id + '" data-key="visMode" onchange="actualizarProp(this)">' +
        '<option value="always"' + (vm==='always'?' selected':'') + '>SIEMPRE VISIBLE</option>' +
        '<option value="on"'     + (vm==='on'    ?' selected':'') + '>VISIBLE CUANDO ACTIVO</option>' +
        '<option value="off"'    + (vm==='off'   ?' selected':'') + '>VISIBLE CUANDO INACTIVO</option>' +
      '</select></div>';
    if (vm !== 'always') {
      h += _varPlc(el.id,'visVar',    p.visVar,    'VARIABLE PLC',     '"DB1".VisFlag');
      h += _triggerVal(el.id, p.visTrigger || 'true');
      h += campoNumero(el.id,'POLLING CADA (ms)','visPollMs', p.visPollMs || 1000);
    }
    h += '</div>';
  }

  /* ════════════════════════════════════════════════════════
     CONEXIÓN PLC — SOLO para botones y controles que
     ESCRIBEN en el PLC. Nada más tiene esta sección.
  ════════════════════════════════════════════════════════ */
  if (_en(el.tipo, _T_BOTONES) || _en(el.tipo, _T_CONTROLES)) {
    h += '<div class="psec"><div class="psec-title">CONEXIÓN PLC</div>';
    if (el.tipo === 'btn-dpad') {
      h += _varPlc(el.id,'varUp',    p.varUp,    'VAR. ARRIBA',   '"DB1".Up');
      h += _varPlc(el.id,'varDown',  p.varDown,  'VAR. ABAJO',    '"DB1".Down');
      h += _varPlc(el.id,'varLeft',  p.varLeft,  'VAR. IZQ',      '"DB1".Left');
      h += _varPlc(el.id,'varRight', p.varRight, 'VAR. DER',      '"DB1".Right');
      h += '<div class="prow"><div class="plbl">MODO</div>' +
        '<select class="psel" data-id="' + el.id + '" data-key="dpadMode" onchange="actualizarProp(this)">' +
          '<option value="pulse"' + ((p.dpadMode||'pulse')==='pulse'?' selected':'') + '>PULSO MOMENTÁNEO</option>' +
          '<option value="hold"'  + (p.dpadMode==='hold'            ?' selected':'') + '>MANTENER PULSADO</option>' +
        '</select></div>';
      if ((p.dpadMode||'pulse')==='pulse')
        h += campoNumero(el.id,'DURACIÓN PULSO (ms)','pulseMs', p.pulseMs || 800);
    } else if (_en(el.tipo, _T_CONTROLES)) {
      /* Controles solo muestran nota — la variable ya está en propiedades */
      h += '<div class="prow" style="font-size:9px;color:var(--mid);line-height:1.4">La variable PLC está configurada en la sección PROPIEDADES.</div>';
    } else {
      h += _varPlc(el.id,'var1', p.var1);
      if (el.tipo === 'btn-led')
        h += _varPlc(el.id,'varLed', p.varLed, 'VARIABLE LED', '"DB1".Motor_State');
      if (el.tipo === 'btn-selector') {
        h += campoTexto(el.id,'VALOR OPT 1','val1', p.val1||'','true/false/0/1/texto');
        h += campoTexto(el.id,'VALOR OPT 2','val2', p.val2||'');
        if (p.opt3) h += campoTexto(el.id,'VALOR OPT 3','val3', p.val3||'');
      }
      if (el.tipo==='btn-simple' || el.tipo==='btn-led') {
        h += '<div class="prow"><div class="plbl">TIPO ACCIÓN</div>' +
          '<select class="psel" data-id="' + el.id + '" data-key="action" onchange="actualizarProp(this)">' +
            '<option value="pulse"'       + ((p.action||'pulse')==='pulse'  ?' selected':'') + '>PULSO MOMENTÁNEO</option>' +
            '<option value="write-true"'  + (p.action==='write-true'        ?' selected':'') + '>ESCRIBIR TRUE</option>' +
            '<option value="write-false"' + (p.action==='write-false'       ?' selected':'') + '>ESCRIBIR FALSE</option>' +
            '<option value="toggle"'      + (p.action==='toggle'            ?' selected':'') + '>TOGGLE</option>' +
          '</select></div>';
        if ((p.action||'pulse')==='pulse')
          h += campoNumero(el.id,'DURACIÓN PULSO (ms)','pulseMs', p.pulseMs || 800);
      }
      if (el.tipo==='btn-toggle' || el.tipo==='btn-emergency')
        h += '<div class="prow"><div class="plbl">TIPO CONTACTO</div>' +
          '<select class="psel" data-id="' + el.id + '" data-key="contact" onchange="actualizarProp(this)">' +
            '<option value="NA"' + (p.contact==='NA'?' selected':'') + '>NA — Normalmente Abierto</option>' +
            '<option value="NC"' + (p.contact==='NC'?' selected':'') + '>NC — Normalmente Cerrado</option>' +
          '</select></div>';
    }
    h += '</div>';
  }

  /* DUPLICAR / ELIMINAR */
  h += '<div class="psec"><div class="pbtn-row">' +
    '<div class="pbtn" data-id="' + el.id + '" onclick="duplicarElemento(this.dataset.id)">DUPLICAR</div>' +
    '<div class="pbtn del" data-id="' + el.id + '" onclick="eliminarPorId(this.dataset.id)">ELIMINAR</div>' +
    '</div></div>';

  rp.innerHTML = h;
  document.getElementById('si-pos').textContent  = 'X:' + el.x + ' Y:' + el.y;
  document.getElementById('si-size').textContent = 'W:' + el.w + ' H:' + el.h;
}

/* ── Campos ─────────────────────────────────────────────────── */
function campoTexto(id, lbl, key, val, placeholder) {
  return '<div class="prow"><div class="plbl">' + lbl + '</div>' +
    '<input class="pinp" value="' + escHtml(val||'') + '"' +
    (placeholder?' placeholder="'+escHtml(placeholder)+'"':'') +
    ' data-id="'+id+'" data-key="'+key+'" onchange="actualizarProp(this)"></div>';
}
function campoNumero(id, lbl, key, val) {
  return '<div class="prow"><div class="plbl">' + lbl + '</div>' +
    '<input class="pinp" type="number" value="' + (val!==undefined?val:0) + '"' +
    ' data-id="'+id+'" data-key="'+key+'" onchange="actualizarPropNum(this)"></div>';
}

/* ── Actualizar ─────────────────────────────────────────────── */
function actualizarProp(input) {
  var id=input.dataset.id, key=input.dataset.key, val=input.value;
  var el=ELEMENTOS.find(function(e){return e.id===id;});
  if (!el) return;
  el.props[key]=val;
  rerenderizar(id);
  if (['action','dpadMode','opt3','variant','visMode','source','direction','cap','useBlue'].indexOf(key)!==-1) {
    construirPropiedades(el);
  } else {
    var prev=document.getElementById('pprev');
    if (prev) {
      prev.style.height=Math.min(72,el.h+16)+'px';
      prev.innerHTML='<div style="width:'+Math.min(el.w,200)+'px;height:'+Math.min(el.h,64)+'px">'+htmlInterior(el)+'</div>';
    }
  }
  guardarHistorial(); MODIFICADO=true;
  if (typeof refrescarPanelSim==='function') refrescarPanelSim();
}
function actualizarPropBool(id,key,val) {
  var el=ELEMENTOS.find(function(e){return e.id===id;});
  if (!el) return;
  el.props[key]=val; rerenderizar(id);
  /* Keys que requieren reconstruir el panel completo */
  if (['useBlue','hideWhenInactive','hideRowsWhenInactive','showHistory','showDateCol','showAckCol'].indexOf(key)!==-1) {
    construirPropiedades(el);
  }
  guardarHistorial(); MODIFICADO=true;
}
function actualizarPropNum(input){input.value=+input.value;actualizarProp(input);}

function actualizarPos(input) {
  var id=input.dataset.id,eje=input.dataset.eje;
  var el=ELEMENTOS.find(function(e){return e.id===id;});
  if (!el) return;
  el[eje]=Math.max(0,+input.value);
  var d=document.getElementById(id);
  if (d) d.style[eje==='x'?'left':'top']=el[eje]+'px';
  actualizarPosPanel(el);
}
function actualizarTam(input) {
  var id=input.dataset.id,eje=input.dataset.eje;
  var el=ELEMENTOS.find(function(e){return e.id===id;});
  if (!el) return;
  el[eje]=Math.max(32,+input.value);
  var d=document.getElementById(id);
  if (d) d.style[eje==='w'?'width':'height']=el[eje]+'px';
  actualizarTamPanel(el);
}
function actualizarPosPanel(el) {
  var ix=document.getElementById('pi-x'),iy=document.getElementById('pi-y');
  if(ix)ix.value=el.x; if(iy)iy.value=el.y;
  document.getElementById('si-pos').textContent='X:'+el.x+' Y:'+el.y;
}
function actualizarTamPanel(el) {
  var iw=document.getElementById('pi-w'),ih=document.getElementById('pi-h');
  if(iw)iw.value=el.w; if(ih)ih.value=el.h;
  document.getElementById('si-size').textContent='W:'+el.w+' H:'+el.h;
}
function cambiarColorLed(swatch) {
  var id=swatch.dataset.id,color=swatch.dataset.color;
  var el=ELEMENTOS.find(function(e){return e.id===id;});
  if (!el) return;
  el.props.color=color; rerenderizar(id);
  document.querySelectorAll('.cswatch[data-id="'+id+'"]').forEach(function(s){
    s.classList.toggle('sel',s.dataset.color===color);
  });
  guardarHistorial(); MODIFICADO=true;
}
function pedirImagen(id) {
  ID_IMG_ACTIVO=id;
  setTimeout(function(){var inp=document.getElementById('inp-imagen-panel');inp.value='';inp.click();},0);
}
function imagenDesdePanelCargada(event) {
  var file=event.target.files[0];
  if (!file||!ID_IMG_ACTIVO) return;
  /* Capturar id ANTES de cualquier async para evitar race condition */
  var idCapturado = ID_IMG_ACTIVO;
  ID_IMG_ACTIVO = null;
  event.target.value = '';
  var reader=new FileReader();
  reader.onload=function(ev){
    var el=ELEMENTOS.find(function(e){return e.id===idCapturado;});
    if (!el) return;
    el.props.imgData=ev.target.result; el.props.imgName=file.name;
    rerenderizar(idCapturado); construirPropiedades(el);
    guardarHistorial(); MODIFICADO=true;
    mostrarToast('Imagen cargada: '+file.name);
  };
  reader.readAsDataURL(file);
}
function duplicarElemento(id) {
  var el=ELEMENTOS.find(function(e){return e.id===id;});
  if (!el) return;
  var copia=JSON.parse(JSON.stringify(el));
  copia.id='el'+(++CONTADOR_ID); copia.x+=24; copia.y+=24;
  agregarElemento(copia); mostrarToast('Duplicado');
}
