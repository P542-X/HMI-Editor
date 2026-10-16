/* =================================================================
   EDITOR DE POPUP
   Sistema para diseñar y gestionar popups vinculados a botones
================================================================= */

var _peElId      = null;   /* ID del botón popup en edición */
var _peEls       = [];     /* Elementos del popup actual    */
var _peSel       = null;   /* Elemento seleccionado         */
var _peDrag      = null;   /* Tipo arrastrado hacia popup   */
var _peMoveState = null;   /* Estado de movimiento          */

/* ─── Tipos disponibles en el popup (subconjunto) ─────────── */
/* ─── Tipos disponibles en el popup (todos los del editor principal) ─── */
var _PE_TIPOS = [
  /* ── BOTONES ── */
  { tipo:'btn-simple',         icon:'▶',    name:'Botón Simple',    cat:'Botones' },
  { tipo:'btn-led',            icon:'◉',    name:'Botón + LED',     cat:'Botones' },
  { tipo:'btn-toggle',         icon:'⇌',    name:'Toggle ON/OFF',   cat:'Botones' },
  { tipo:'btn-emergency',      icon:'⚠',    name:'Emergency Stop',  cat:'Botones' },
  { tipo:'btn-set-reset',      icon:'S/R',  name:'SET / RESET',     cat:'Botones' },
  { tipo:'btn-confirm',        icon:'✔✔',   name:'Confirmación',    cat:'Botones' },
  { tipo:'btn-multistate',     icon:'1→2',  name:'Multi-Estado',    cat:'Botones' },
  { tipo:'btn-jog',            icon:'JOG',  name:'Botón JOG',       cat:'Botones' },
  { tipo:'btn-selector',       icon:'⊞',    name:'Selector',        cat:'Botones' },
  { tipo:'spinbox',            icon:'±N',   name:'SpinBox',         cat:'Botones' },
  { tipo:'slider-h',           icon:'━●',   name:'Slider H',        cat:'Botones' },
  { tipo:'slider-v',           icon:'┃',    name:'Slider V',        cat:'Botones' },
  /* ── VISUALIZACIÓN ── */
  { tipo:'display',            icon:'VAR',  name:'Display',         cat:'Visual' },
  { tipo:'status-led',         icon:'●',    name:'LED Estado',      cat:'Visual' },
  { tipo:'signal-lamp',        icon:'🚦',   name:'Piloto 3 col.',   cat:'Visual' },
  { tipo:'multibit-led',       icon:'⠿',    name:'Word Bits',       cat:'Visual' },
  { tipo:'gauge',              icon:'◑',    name:'Gauge',           cat:'Visual' },
  { tipo:'bargraph-v',         icon:'▐',    name:'Barra Vertical',  cat:'Visual' },
  { tipo:'numeric-7seg',       icon:'8.8',  name:'Display 7-Seg',   cat:'Visual' },
  { tipo:'indicator-text',     icon:'◫',    name:'Indicador',       cat:'Visual' },
  { tipo:'numeric-display',    icon:'0.0',  name:'Numérico',        cat:'Visual' },
  { tipo:'setpoint-input',     icon:'SP',   name:'Setpoint SP/PV',  cat:'Visual' },
  { tipo:'trend-chart',        icon:'↗',    name:'Tendencia',       cat:'Visual' },
  { tipo:'xy-chart',           icon:'XY',   name:'Gráfica XY',      cat:'Visual' },
  { tipo:'bar-chart',          icon:'▋',    name:'Gráf. Barras',    cat:'Visual' },
  { tipo:'rpm-display',        icon:'RPM',  name:'Display RPM',     cat:'Visual' },
  { tipo:'string-display',     icon:'TXT',  name:'String PLC',      cat:'Visual' },
  { tipo:'thermometer-display',icon:'🌡',   name:'Termómetro',      cat:'Visual' },
  { tipo:'datetime-display',   icon:'⏰',   name:'Fecha/Hora',      cat:'Visual' },
  { tipo:'pressure-gauge-pid', icon:'◑',    name:'Manómetro P&ID',  cat:'Visual' },
  { tipo:'signal-tower',       icon:'🚨',   name:'Torre Señal.',    cat:'Visual' },
  { tipo:'plc-clock-sync',     icon:'⏱',    name:'Reloj PLC',       cat:'Visual' },
  /* ── DATOS ── */
  { tipo:'progress-bar',       icon:'▬',    name:'Barra Progreso',  cat:'Datos' },
  { tipo:'data-table',         icon:'☰',    name:'Tabla Variables', cat:'Datos' },
  { tipo:'recipe-table',       icon:'☰',    name:'Tabla Receta',    cat:'Datos' },
  { tipo:'energy-meter',       icon:'kWh',  name:'Medidor Energía', cat:'Datos' },
  { tipo:'flow-totalizer',     icon:'≋',    name:'Caudalímetro',    cat:'Datos' },
  { tipo:'level-indicator',    icon:'▐',    name:'Indicador Nivel', cat:'Datos' },
  { tipo:'ph-meter',           icon:'pH',   name:'Medidor pH',      cat:'Datos' },
  { tipo:'temperature-4zone',  icon:'T4Z',  name:'Temp 4 Zonas',    cat:'Datos' },
  { tipo:'analog-output',      icon:'4-20', name:'Salida Analógica',cat:'Datos' },
  /* ── ALARMAS ── */
  { tipo:'alarm-banner',       icon:'⚠',    name:'Banner Alarma',   cat:'Alarmas' },
  { tipo:'alarm-list',         icon:'☰⚑',   name:'Lista Alarmas',   cat:'Alarmas' },
  { tipo:'alarm-plc',          icon:'PLC',  name:'Alarmas PLC',     cat:'Alarmas' },
  { tipo:'alarm-array',        icon:'64',   name:'Array Alarmas',   cat:'Alarmas' },
  { tipo:'alarm-word',         icon:'W16',  name:'Word Alarmas',    cat:'Alarmas' },
  { tipo:'alarm-ticker',       icon:'▶⚑',   name:'Ticker Alarmas',  cat:'Alarmas' },
  { tipo:'alarm-count',        icon:'3',    name:'Contador',        cat:'Alarmas' },
  /* ── PROCESO P&ID ── */
  { tipo:'motor-symbol',       icon:'M',    name:'Motor P&ID',      cat:'P&ID' },
  { tipo:'pump-symbol',        icon:'⊙',    name:'Bomba P&ID',      cat:'P&ID' },
  { tipo:'valve-symbol',       icon:'⋈',    name:'Válvula P&ID',    cat:'P&ID' },
  { tipo:'level-tank',         icon:'▭',    name:'Depósito',        cat:'P&ID' },
  { tipo:'pipe-h',             icon:'━',    name:'Tubería H',       cat:'P&ID' },
  { tipo:'pipe-v',             icon:'┃',    name:'Tubería V',       cat:'P&ID' },
  { tipo:'pid-faceplate',      icon:'PID',  name:'Faceplate PID',   cat:'P&ID' },
  { tipo:'trend-comparison',   icon:'↗↗',   name:'Trend Doble',     cat:'Visual' },
  { tipo:'btn-dpad',           icon:'✛',    name:'D-Pad 4 dir.',    cat:'Botones' },
  { tipo:'frame-box',          icon:'▭',    name:'Marco/Recuadro',  cat:'Deco' },
  { tipo:'separator-h',        icon:'─',    name:'Separador H',     cat:'Deco' },
  { tipo:'nav-button',         icon:'⎋',    name:'Botón navegac.',  cat:'Deco' },
  /* ── FORMAS ── */
  { tipo:'shape-rect',         icon:'▭',    name:'Rectángulo',      cat:'Formas' },
  { tipo:'shape-circle',       icon:'○',    name:'Círculo/Elipse',  cat:'Formas' },
  { tipo:'shape-triangle',     icon:'△',    name:'Triángulo',       cat:'Formas' },
  { tipo:'shape-line',         icon:'╱',    name:'Línea',           cat:'Formas' },
  { tipo:'shape-curve',        icon:'⌒',    name:'Curva Bézier',    cat:'Formas' },
  /* ── DECORACIONES ── */
  { tipo:'deco-barrel',        icon:'🛢',    name:'Barril',          cat:'Deco' },
  { tipo:'deco-brickwall',     icon:'🧱',   name:'Pared ladrillo',  cat:'Deco' },
  { tipo:'deco-bulldozer',     icon:'🚧',   name:'Bulldozer',       cat:'Deco' },
  { tipo:'deco-cement-mixer',  icon:'🔄',   name:'Hormigonera',     cat:'Deco' },
  { tipo:'deco-compressor',    icon:'💨',   name:'Compresor',       cat:'Deco' },
  { tipo:'deco-cone',          icon:'🔶',   name:'Cono',            cat:'Deco' },
  { tipo:'deco-conveyor',      icon:'⬅',   name:'Cinta transport.', cat:'Deco' },
  { tipo:'deco-crane',         icon:'🏗',   name:'Grúa',            cat:'Deco' },
  { tipo:'deco-dump-truck',    icon:'🚛',   name:'Volquete',        cat:'Deco' },
  { tipo:'deco-electric-hazard',icon:'⚡',  name:'Peligro eléctric.',cat:'Deco' },
  { tipo:'deco-elevator',      icon:'🛗',   name:'Elevador',        cat:'Deco' },
  { tipo:'deco-excavator',     icon:'🚜',   name:'Excavadora',      cat:'Deco' },
  { tipo:'deco-fire-ext',      icon:'🧯',   name:'Extintor',        cat:'Deco' },
  { tipo:'deco-first-aid',     icon:'🩺',   name:'Primeros auxilios',cat:'Deco' },
  { tipo:'deco-forklift',      icon:'🔼',   name:'Carretilla',      cat:'Deco' },
  { tipo:'deco-helmet',        icon:'⛑',   name:'Casco seguridad', cat:'Deco' },
  { tipo:'deco-ladder',        icon:'🪜',   name:'Escalera',        cat:'Deco' },
  { tipo:'deco-motor-el',      icon:'⚙',   name:'Motor eléctrico', cat:'Deco' },
  { tipo:'deco-pallet',        icon:'📦',   name:'Palet',           cat:'Deco' },
  { tipo:'deco-person-walk',   icon:'🚶',   name:'Persona',         cat:'Deco' },
  { tipo:'deco-pump-cent',     icon:'⊙',   name:'Bomba centrif.',  cat:'Deco' },
  { tipo:'deco-rack',          icon:'🗄',   name:'Rack',            cat:'Deco' },
  { tipo:'deco-road-barrier',  icon:'🚧',   name:'Barrera vial',    cat:'Deco' },
  { tipo:'deco-safety-exit',   icon:'🚪',   name:'Salida emerg.',   cat:'Deco' },
  { tipo:'deco-scaffold',      icon:'🏗',   name:'Andamio',         cat:'Deco' },
  { tipo:'deco-sign-hard',     icon:'⚠',   name:'Señal seguridad', cat:'Deco' },
  { tipo:'deco-toolbox',       icon:'🧰',   name:'Caja herramienta',cat:'Deco' },
  { tipo:'deco-truck',         icon:'🚚',   name:'Camión',          cat:'Deco' },
  { tipo:'deco-welding',       icon:'🔥',   name:'Soldadura',       cat:'Deco' },
  { tipo:'deco-wheelbarrow',   icon:'🪣',   name:'Carretilla mano', cat:'Deco' },
  { tipo:'deco-wire-spool',    icon:'🔌',   name:'Bobina cable',    cat:'Deco' },
  { tipo:'deco-worker',        icon:'👷',   name:'Operario',        cat:'Deco' },
  /* ── FORMAS ── */
  /* ── DECORACIÓN ── */
  { tipo:'label',              icon:'LBL',  name:'Etiqueta',        cat:'Deco' },
  { tipo:'text-block',         icon:'¶',    name:'Texto libre',     cat:'Deco' },
  { tipo:'title-banner',       icon:'TIT',  name:'Banner título',   cat:'Deco' },
  { tipo:'separator',          icon:'—',    name:'Separador',       cat:'Deco' },
  { tipo:'tooltip-node',       icon:'⬡',    name:'Nodo tooltip',    cat:'Deco' },
  { tipo:'image-upload',       icon:'🖼',   name:'Imagen',          cat:'Deco' },
  /* ── FORMAS ── */
];

/* ─── Abrir editor ─────────────────────────────────────────── */
function abrirEditorPopup(elId) {
  _peInitCtxMenu();
  _peElId = elId;
  var btnEl = ELEMENTOS.find(function(e){ return e.id === elId; });
  if (!btnEl) return;
  var p = btnEl.props;

  /* Cargar o inicializar el popup */
  if (!POPUPS[elId]) {
    POPUPS[elId] = { w: p.popupW||700, h: p.popupH||480, title: p.popupTitle||'Detalle', bg: p.popupBg||'#ffffff', els: [] };
  }
  var popup = POPUPS[elId];
  /* Sincronizar con props del botón */
  popup.w     = p.popupW     || popup.w;
  popup.h     = p.popupH     || popup.h;
  popup.title = p.popupTitle || popup.title;
  popup.bg    = p.popupBg    || popup.bg;

  _peEls = JSON.parse(JSON.stringify(popup.els));
  _peSel = null;

  /* Configurar canvas */
  var canvas = document.getElementById('popup-canvas');
  var titlebar = document.getElementById('popup-canvas-titlebar');
  var titletext = document.getElementById('popup-canvas-titletext');
  canvas.style.width      = popup.w + 'px';
  canvas.style.height     = (popup.h + 36) + 'px'; /* +36 para titlebar */
  canvas.style.background = popup.bg;
  titletext.textContent   = popup.title;
  document.getElementById('popup-canvas-size-lbl').textContent = popup.w + ' × ' + popup.h + ' px';
  document.getElementById('popup-editor-title').textContent    = 'POPUP: ' + popup.title.toUpperCase();

  /* Posicionar titlebar */
  titlebar.style.display = 'flex';

  /* Renderizar librería */
  _peRenderLib();

  /* Renderizar elementos */
  _peRenderAll();

  /* Mostrar modal */
  document.getElementById('modal-popup-editor').style.display = 'block';

  /* ── Selección por caja en el canvas del popup ── */
  _peInitBoxSelect();
}

function cerrarPopupEditor() {
  document.getElementById('modal-popup-editor').style.display = 'none';
  _peSel  = null;
  _peElId = null;
}

function popupEditorGuardar() {
  if (!_peElId) return;
  if (!POPUPS[_peElId]) POPUPS[_peElId] = {};
  POPUPS[_peElId].els = JSON.parse(JSON.stringify(_peEls));
  /* Sincronizar título/tamaño desde el botón */
  var btnEl = ELEMENTOS.find(function(e){ return e.id === _peElId; });
  if (btnEl) {
    POPUPS[_peElId].w     = btnEl.props.popupW     || POPUPS[_peElId].w;
    POPUPS[_peElId].h     = btnEl.props.popupH     || POPUPS[_peElId].h;
    POPUPS[_peElId].title = btnEl.props.popupTitle || POPUPS[_peElId].title;
    POPUPS[_peElId].bg    = btnEl.props.popupBg    || POPUPS[_peElId].bg;
  }
  MODIFICADO = true;
  /* Refrescar preview del botón en el canvas principal */
  if (btnEl) { renderizarElemento(btnEl); }
  /* Refrescar propiedades si el botón está seleccionado */
  if (SELECCION.length === 1 && SELECCION[0] === _peElId) {
    renderizarPropiedades(btnEl);
  }
  mostrarToast('Popup guardado (' + _peEls.length + ' elementos)');
  cerrarPopupEditor();
}

/* ─── Librería del popup ───────────────────────────────────── */
function _peRenderLib() {
  var lib = document.getElementById('popup-lib');
  var cats = {};
  _PE_TIPOS.forEach(function(t) {
    if (!cats[t.cat]) cats[t.cat] = [];
    cats[t.cat].push(t);
  });
  var html = '';
  Object.keys(cats).forEach(function(cat) {
    html += '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:var(--mid);padding:8px 2px 4px">' + cat.toUpperCase() + '</div>';
    cats[cat].forEach(function(t) {
      html += '<div draggable="true" data-petipo="' + t.tipo + '" ' +
        'style="display:flex;align-items:center;gap:8px;padding:6px 8px;margin-bottom:3px;' +
        'border:1px solid var(--border);border-radius:3px;cursor:grab;background:var(--bg);' +
        'font-family:DM Mono,monospace;font-size:10px;color:var(--text);" ' +
        'ondragstart="window._peDragType=this.dataset.petipo">' +
        '<span style="font-size:11px;flex-shrink:0">' + t.icon + '</span>' +
        '<span style="font-size:9px">' + t.name + '</span>' +
        '</div>';
    });
  });
  lib.innerHTML = html;
}

/* ─── Drop en canvas del popup ─────────────────────────────── */
function popupEditorDrop(e) {
  e.preventDefault();
  var tipo = window._peDragType;
  window._peDragType = null;
  if (!tipo) return;
  var canvas = document.getElementById('popup-canvas');
  var rect   = canvas.getBoundingClientRect();
  var sz     = TAMANIOS[tipo] || [160, 48];
  var props  = JSON.parse(JSON.stringify(PROPS_DEFAULT[tipo] || {}));
  var popup  = POPUPS[_peElId] || {};
  var x = Math.max(0, Math.round(e.clientX - rect.left - sz[0]/2));
  var y = Math.max(36, Math.round(e.clientY - rect.top  - sz[1]/2)); /* +36 por titlebar */
  y = Math.min(y, (popup.h || 480)); /* no salir del popup */
  var newEl = { id: 'pel_' + Date.now(), tipo: tipo, x: x, y: y, w: sz[0], h: sz[1], props: props };
  _peEls.push(newEl);
  _peRenderAll();
  _peSeleccionar(newEl.id);
}

/* ─── Renderizar todos los elementos en el popup canvas ──── */
/* ── Selección por caja en el canvas del popup ── */
function _peInitBoxSelect() {
  var canvasWrap = document.getElementById('popup-canvas-wrap');
  if (!canvasWrap || canvasWrap._peBoxInited) return;
  canvasWrap._peBoxInited = true;

  /* Crear el div de la caja de selección */
  var selbox = document.getElementById('pe-selbox');
  if (!selbox) {
    selbox = document.createElement('div');
    selbox.id = 'pe-selbox';
    selbox.style.cssText = 'position:absolute;border:1px solid #1565c0;background:rgba(21,101,192,.08);' +
      'pointer-events:none;display:none;z-index:1000;box-sizing:border-box;';
    canvasWrap.style.position = 'relative';
    canvasWrap.appendChild(selbox);
  }

  canvasWrap.addEventListener('mousedown', function(e) {
    /* Solo actuar si el click fue en el canvas vacío (no en un elemento) */
    var canvas = document.getElementById('popup-canvas');
    var target = e.target;
    /* Ignorar si es un elemento hijo del canvas (botón ×, handle, etc.) */
    if (target !== canvasWrap && target !== canvas) return;
    /* Ignorar si hay un elemento exactamente bajo el cursor */
    var underEl = _peEls.find(function(el) {
      return e.offsetX >= el.x && e.offsetX <= el.x + el.w &&
             e.offsetY >= el.y - 36 && e.offsetY <= el.y - 36 + el.h;
    });
    if (underEl) return;

    /* Deseleccionar al hacer click en vacío */
    _peSel = null;
    _peRenderAll();
    _peRenderProps();

    var rect  = canvasWrap.getBoundingClientRect();
    var sx    = e.clientX - rect.left;
    var sy    = e.clientY - rect.top;

    selbox.style.left    = sx + 'px';
    selbox.style.top     = sy + 'px';
    selbox.style.width   = '0';
    selbox.style.height  = '0';
    selbox.style.display = 'block';

    var isDragging = false;

    function onMove(ev) {
      var cx = ev.clientX - rect.left;
      var cy = ev.clientY - rect.top;
      var dx = Math.abs(cx - sx), dy = Math.abs(cy - sy);
      if (!isDragging && dx < 4 && dy < 4) return;
      isDragging = true;

      var x1 = Math.min(sx, cx), y1 = Math.min(sy, cy);
      var x2 = Math.max(sx, cx), y2 = Math.max(sy, cy);
      selbox.style.left   = x1 + 'px';
      selbox.style.top    = y1 + 'px';
      selbox.style.width  = (x2 - x1) + 'px';
      selbox.style.height = (y2 - y1) + 'px';

      /* Calcular qué elementos intersectan la caja */
      /* Los elementos tienen y relativo al canvas (sin titlebar de 36px) */
      var canvasY = 36; /* altura del titlebar */
      var selected = _peEls.filter(function(el) {
        var ex1 = el.x, ey1 = el.y - 36 + canvasY;
        var ex2 = el.x + el.w, ey2 = ey1 + el.h;
        return ex1 < x2 && ex2 > x1 && ey1 < y2 && ey2 > y1;
      });

      /* Resaltar visualmente los seleccionados */
      _peEls.forEach(function(el) {
        var div = document.getElementById('pe_' + el.id);
        if (!div) return;
        var inSel = selected.some(function(s){ return s.id === el.id; });
        div.style.outline = inSel ? '2px solid #1565c0' : (_peSel === el.id ? '2px solid #1565c0' : 'none');
        div.style.outlineOffset = inSel ? '1px' : '0';
      });
    }

    function onUp(ev) {
      selbox.style.display = 'none';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);

      if (!isDragging) return;

      /* Al soltar: si hay varios seleccionados, seleccionar el último */
      var rect2   = canvasWrap.getBoundingClientRect();
      var cx = ev.clientX - rect2.left;
      var cy = ev.clientY - rect2.top;
      var x1 = Math.min(sx, cx), y1 = Math.min(sy, cy);
      var x2 = Math.max(sx, cx), y2 = Math.max(sy, cy);
      var canvasY = 36;
      var selected = _peEls.filter(function(el) {
        var ex1 = el.x, ey1 = el.y - 36 + canvasY;
        var ex2 = el.x + el.w, ey2 = ey1 + el.h;
        return ex1 < x2 && ex2 > x1 && ey1 < y2 && ey2 > y1;
      });

      if (selected.length === 1) {
        _peSeleccionar(selected[0].id);
      } else if (selected.length > 1) {
        /* Múltiple selección: resaltar todos pero no abrir props */
        _peSel = selected[selected.length - 1].id;
        _peRenderAll();
        _peRenderProps();
        mostrarToast(selected.length + ' elementos seleccionados');
      } else {
        _peRenderAll();
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function _peRenderAll() {
  var canvas  = document.getElementById('popup-canvas');
  var titlebar = document.getElementById('popup-canvas-titlebar');
  /* Limpiar elementos anteriores (mantener titlebar) */
  Array.from(canvas.children).forEach(function(c) {
    if (c.id !== 'popup-canvas-titlebar') c.remove();
  });

  _peEls.forEach(function(el) {
    var div = document.createElement('div');
    div.id  = 'pe_' + el.id;
    var rot = (el.props && el.props.rotation) ? Number(el.props.rotation) : 0;
    div.style.cssText = 'position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;' +
      'width:' + el.w + 'px;height:' + el.h + 'px;box-sizing:border-box;overflow:' + (el.tipo==='frame-box'?'visible':'hidden') + ';' +
      (rot ? 'transform:rotate(' + rot + 'deg);transform-origin:center center;' : '');
    if (_peSel === el.id) {
      div.style.outline = '2px solid #1565c0';
      div.style.outlineOffset = '1px';
    }
    /* Renderizar interior usando htmlInterior del editor principal */
    try {
      div.innerHTML = htmlInterior(el);
    } catch(ex) {
      div.innerHTML = '<div style="width:100%;height:100%;background:#f0f0ec;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:9px;color:#6a6a62">' + el.tipo + '</div>';
    }
    /* Handles */
    var rh = document.createElement('div');
    rh.style.cssText = 'position:absolute;right:0;bottom:0;width:10px;height:10px;background:#1565c0;cursor:se-resize;z-index:10;opacity:0.7';
    rh.addEventListener('mousedown', function(e) { _peStartResize(e, el.id); });
    div.appendChild(rh);

    /* Delete btn — visible siempre, dentro del elemento */
    var del = document.createElement('div');
    del.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;background:rgba(198,40,40,.85);color:#fff;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;z-index:20;line-height:1;font-weight:700;opacity:0;transition:opacity .15s';
    del.textContent = '×';
    del.addEventListener('mousedown', function(e) { e.stopPropagation(); e.preventDefault(); });
    del.addEventListener('click', function(e) { e.stopPropagation(); e.preventDefault(); _peEliminar(el.id); });
    div.appendChild(del);

    /* Hover para mostrar delete */
    div.addEventListener('mouseenter', function(){ del.style.opacity='1'; });
    div.addEventListener('mouseleave', function(){ del.style.opacity='0'; });

    /* Selección y movimiento */
    div.addEventListener('mousedown', function(e) {
      if (e.target === rh) return;
      if (e.target === del) return;
      e.stopPropagation();
      _peSeleccionar(el.id);
      _peStartMove(e, el.id);
    });

    canvas.appendChild(div);
  });

  document.getElementById('popup-el-count').textContent = _peEls.length + ' elemento' + (_peEls.length !== 1 ? 's' : '');
}

/* ─── Selección ────────────────────────────────────────────── */
function _peSeleccionar(id) {
  _peSel = id;
  _peRenderAll();
  _peRenderProps();
}

/* ─── Eliminar elemento ────────────────────────────────────── */
function _peEliminar(id) {
  _peEls = _peEls.filter(function(e){ return e.id !== id; });
  if (_peSel === id) { _peSel = null; _peRenderProps(); }
  _peRenderAll();
}

/* ─── Mover elemento ───────────────────────────────────────── */
function _peStartMove(e, id) {
  _peSnapshot();
  var el     = _peEls.find(function(el){ return el.id === id; });
  if (!el) return;
  var startX = e.clientX, startY = e.clientY;
  var origX  = el.x, origY = el.y;
  function onMove(ev) {
    el.x = Math.max(0, origX + ev.clientX - startX);
    el.y = Math.max(36, origY + ev.clientY - startY);
    var div = document.getElementById('pe_' + id);
    if (div) { div.style.left = el.x + 'px'; div.style.top = el.y + 'px'; }
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
    _peRenderAll();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
}

/* ─── Redimensionar elemento ───────────────────────────────── */
function _peStartResize(e, id) {
  _peSnapshot();
  e.stopPropagation();
  var el     = _peEls.find(function(el){ return el.id === id; });
  if (!el) return;
  var startX = e.clientX, startY = e.clientY;
  var origW  = el.w, origH = el.h;
  function onMove(ev) {
    el.w = Math.max(40, origW + ev.clientX - startX);
    el.h = Math.max(20, origH + ev.clientY - startY);
    var div = document.getElementById('pe_' + id);
    if (div) { div.style.width = el.w + 'px'; div.style.height = el.h + 'px'; }
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
    _peRenderAll();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
  /* Limpiar si la ventana pierde el foco (ej: diálogo de archivo) */
  function onBlur() {
    onUp();
    window.removeEventListener('blur', onBlur);
  }
  window.addEventListener('blur', onBlur);
}

/* ─── Panel de propiedades del elemento seleccionado ──────── */
function _peRenderProps() {
  var body = document.getElementById('popup-props-body');
  if (!_peSel) {
    body.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--mid);padding:20px 8px;text-align:center">Selecciona un elemento del popup</div>';
    return;
  }
  var el = _peEls.find(function(e){ return e.id === _peSel; });
  if (!el) return;
  var p = el.props;
  var h = '<div style="padding:8px 4px;">';

  /* Posición y tamaño */
  h += '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:var(--mid);padding:4px 0 6px">POSICIÓN / TAMAÑO</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;">';
  ['x','y','w','h'].forEach(function(k) {
    h += '<div><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--mid);margin-bottom:2px">' + k.toUpperCase() + '</div>' +
      '<input type="number" value="' + el[k] + '" data-dim="' + k + '" style="width:100%;padding:4px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:DM Mono,monospace;font-size:10px;box-sizing:border-box" ' +
      'onchange="(function(v){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';}); if(e) { e[\'' + k + '\']=parseInt(v)||0; _peRenderAll(); } })(this.value)"></div>';
  });
  h += '</div>';

  /* Rotación */
  var curRot = (el.props && el.props.rotation) ? Number(el.props.rotation) : 0;
  h += '<div style="margin-bottom:8px;">' +
    '<div style="font-family:DM Mono,monospace;font-size:8px;color:var(--mid);margin-bottom:4px">ROTACIÓN</div>' +
    '<div style="display:flex;align-items:center;gap:6px;">' +
      '<input type="range" min="0" max="359" value="' + curRot + '" ' +
        'style="flex:1;accent-color:#1565c0;" ' +
        'oninput="(function(v){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props=e.props||{};e.props.rotation=parseInt(v);_peRenderAll();var inp=document.getElementById(\'perot_\'+\'' + el.id + '\');if(inp)inp.value=v;}})(this.value)">' +
      '<input type="number" id="perot_' + el.id + '" min="0" max="359" value="' + curRot + '" ' +
        'style="width:50px;padding:4px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:DM Mono,monospace;font-size:10px;text-align:center;" ' +
        'onchange="(function(v){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props=e.props||{};e.props.rotation=parseInt(v)||0;_peRenderAll();}})(this.value)">' +
      '<span style="font-family:DM Mono,monospace;font-size:9px;color:var(--mid)">°</span>' +
    '</div>' +
    '<div style="display:flex;gap:4px;margin-top:4px;">' +
      '<button onclick="(function(){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props=e.props||{};e.props.rotation=((e.props.rotation||0)-15+360)%360;_peRenderAll();_peRenderProps();}})()" ' +
        'style="flex:1;padding:3px;background:var(--surface);border:1px solid var(--border);border-radius:2px;color:var(--text);font-family:DM Mono,monospace;font-size:9px;cursor:pointer;">↺ −15°</button>' +
      '<button onclick="(function(){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props=e.props||{};e.props.rotation=0;_peRenderAll();_peRenderProps();}})()" ' +
        'style="flex:1;padding:3px;background:var(--surface);border:1px solid var(--border);border-radius:2px;color:var(--text);font-family:DM Mono,monospace;font-size:9px;cursor:pointer;">⊘ 0°</button>' +
      '<button onclick="(function(){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props=e.props||{};e.props.rotation=((e.props.rotation||0)+15)%360;_peRenderAll();_peRenderProps();}})()" ' +
        'style="flex:1;padding:3px;background:var(--surface);border:1px solid var(--border);border-radius:2px;color:var(--text);font-family:DM Mono,monospace;font-size:9px;cursor:pointer;">↻ +15°</button>' +
    '</div>' +
  '</div>';

  /* Propiedades del tipo específico */
  h += '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:var(--mid);padding:4px 0 6px">CONTENIDO</div>';

  /* Propiedades comunes según tipo */
  var simpleProps = {
    /* ── DECORACIÓN / TEXTO ── */
    'label':             [['text','Texto','Label'],['fontSize','Tamaño px','11'],['color','Color texto','#1a1a16']],
    'text-block':        [['text','Contenido','Descripción'],['fontSize','Tamaño px','11']],
    'title-banner':      [['text','Título','TÍTULO'],['subtext','Subtítulo',''],['color','Color barra','#1565c0']],
    'separator':         [['label','Texto (opcional)','']],
    'tooltip-node':      [['text','Texto nodo','NODE'],['fontSize','Tamaño px','11'],
                          ['shape','Forma (rect/rounded/circle/diamond/hexagon)','rect'],
                          ['fillColor','Color relleno','#e3f0ff'],['strokeColor','Color borde','#1565c0'],['fontColor','Color texto','#1a1a18'],
                          ['conn1','Conexión 1',''],['conn2','Conexión 2',''],['conn3','Conexión 3',''],['conn4','Conexión 4',''],
                          ['notes','Notas/descripción',''],
                          ['var1','Variable PLC',''],['pollMs','Polling ms','500'],
                          ['showValue','¿Mostrar valor? (true/false)','false'],['valueColor','Color valor','#00e5b0'],['unit','Unidad',''],
                          ['useActiveColor','¿Color activo? (true/false)','false'],
                          ['activeFill','Relleno cuando activo','#2e7d32'],['activeStroke','Borde cuando activo','#00c853'],['activeFont','Texto cuando activo','#ffffff']],
    'image-upload':      [['fit','Ajuste (contain/cover/fill/none)','contain']],
    'image-static':      [['fit','Ajuste (contain/cover/fill/none)','contain']],
    /* shapes */
    'shape-rect':        [['fill','Color relleno','rgba(21,101,192,0.15)'],['strokeColor','Color borde','#1565c0'],['strokeWidth','Grosor borde','2'],['borderRadius','Radio bordes px','0']],
    'shape-circle':      [['fill','Color relleno','rgba(21,101,192,0.15)'],['strokeColor','Color borde','#1565c0'],['strokeWidth','Grosor borde','2']],
    'shape-triangle':    [['fill','Color relleno','rgba(245,124,0,0.15)'],['strokeColor','Color borde','#f57c00'],['strokeWidth','Grosor borde','2']],
    'shape-line':        [['strokeColor','Color línea','#546e7a'],['strokeWidth','Grosor','2']],
    'shape-curve':       [['strokeColor','Color curva','#546e7a'],['strokeWidth','Grosor','2']],
    /* ── BOTONES ── */
    'btn-simple':        [['text','Texto','ACCIÓN'],['subtext','Subtexto',''],['icon','Icono','▶'],['fontSize','Tamaño px','12'],['var1','Variable PLC','']],
    'btn-led':           [['text','Texto','ACCIÓN'],['fontSize','Tamaño px','12'],['var1','Variable lectura',''],['var2','Variable escritura','']],
    'btn-toggle':        [['text','Texto','ON/OFF'],['fontSize','Tamaño px','12'],['var1','Variable PLC','']],
    'btn-emergency':     [['text','Texto','PARADA EMERG.'],['fontSize','Tamaño px','12'],['var1','Variable PLC','']],
    'btn-set-reset':     [['textSet','Texto SET','SET'],['textReset','Texto RESET','RESET'],['fontSize','Tamaño px','12'],['var1','Var SET',''],['var2','Var RESET','']],
    'btn-confirm':       [['text','Texto','CONFIRMAR'],['fontSize','Tamaño px','12'],['var1','Variable PLC','']],
    'btn-multistate':    [['text','Etiqueta','MODO'],['states','Estados (coma)','STOP,AUTO,MAN'],['colors','Colores (coma)','#c62828,#2e7d32,#1565c0'],['fontSize','Tamaño px','11'],['var1','Variable PLC','']],
    'btn-jog':           [['text','Texto','JOG ▶'],['fontSize','Tamaño px','12'],['var1','Variable PLC','']],
    'btn-selector':      [['opt1','Opción 1','OPCIÓN 1'],['opt2','Opción 2','OPCIÓN 2'],['opt3','Opción 3 (opcional)',''],['var1','Variable PLC','']],
    'btn-dpad':          [['var1','Var Arriba',''],['var2','Var Abajo',''],['var3','Var Izq',''],['var4','Var Der','']],
    'spinbox':           [['label','Etiqueta',''],['unit','Unidad',''],['min','Mínimo','0'],['max','Máximo','100'],['step','Paso','1'],['var1','Variable PLC','']],
    'slider-h':          [['label','Etiqueta',''],['min','Mínimo','0'],['max','Máximo','100'],['var1','Variable PLC','']],
    'slider-v':          [['label','Etiqueta',''],['min','Mínimo','0'],['max','Máximo','100'],['var1','Variable PLC','']],
    /* ── INDICADORES VISUALES ── */
    'status-led':        [['label','Etiqueta',''],['var1','Variable PLC','']],
    'indicator-text':    [['textOn','Texto ON','ACTIVO'],['textOff','Texto OFF','PARADO'],['colorOn','Color ON','#00c853'],['colorOff','Color OFF','#9a9a90'],['fontSize','Tamaño px','11'],['var1','Variable PLC','']],
    'signal-lamp':       [['label','Etiqueta',''],['var1','Variable PLC',''],['colorOn','Color activo','#00c853'],['colorOff','Color inactivo','#9a9a90']],
    'signal-tower':      [['var1','Var Rojo',''],['var2','Var Amarillo',''],['var3','Var Verde','']],
    'multibit-led':      [['label','Etiqueta',''],['var1','Variable WORD/INT PLC','']],
    /* ── DATOS ANALÓGICOS ── */
    'display':           [['label','Etiqueta',''],['unit','Unidad',''],['decimals','Decimales','1'],['var1','Variable PLC','']],
    'numeric-display':   [['label','Etiqueta',''],['unit','Unidad',''],['fontSize','Tamaño px','24'],['color','Color número','#00e5b0'],['var1','Variable PLC','']],
    'numeric-7seg':      [['label','Etiqueta',''],['unit','Unidad',''],['digits','Dígitos','5'],['var1','Variable PLC','']],
    'progress-bar':      [['label','Etiqueta',''],['unit','Unidad',''],['min','Mínimo','0'],['max','Máximo','100'],['var1','Variable PLC','']],
    'bargraph-v':        [['label','Etiqueta',''],['unit','Unidad',''],['min','Mínimo','0'],['max','Máximo','100'],['var1','Variable PLC','']],
    'gauge':             [['label','Etiqueta',''],['unit','Unidad',''],['min','Mínimo','0'],['max','Máximo','100'],['var1','Variable PLC','']],
    'trend-chart':       [['label','Etiqueta',''],['unit','Unidad',''],['min','Mínimo','0'],['max','Máximo','100'],['points','Puntos','30'],['var1','Variable PLC','']],
    'xy-chart':          [['label','Etiqueta',''],['points','Puntos','30'],['varX','Variable X PLC',''],['varY','Variable Y PLC','']],
    'trend-comparison':  [['label','Etiqueta PV',''],['label2','Etiqueta SP',''],['unit','Unidad',''],['min','Mínimo','0'],['max','Máximo','100'],['var1','Variable PV',''],['var2','Variable SP','']],
    'bar-chart':         [['title','Título','BARRAS'],['unit','Unidad',''],['max','Máximo','100'],['var1','Barra 1 - Variable',''],['label1','Barra 1 - Etiqueta',''],['var2','Barra 2 - Variable',''],['label2','Barra 2 - Etiqueta','']],
    'setpoint-input':    [['label','Etiqueta',''],['unit','Unidad',''],['min','Mínimo','0'],['max','Máximo','100'],['varPV','Variable PV',''],['var1','Variable SP','']],
    'string-display':    [['label','Etiqueta',''],['var1','Variable STRING PLC','']],
    'thermometer-display':[['label','Etiqueta',''],['unit','Unidad','°C'],['min','Mínimo','0'],['max','Máximo','100'],['var1','Variable PLC','']],
    'rpm-display':       [['label','Etiqueta','RPM'],['maxRpm','Máx RPM','3000'],['var1','Variable PLC','']],
    'ph-meter':          [['label','Etiqueta',''],['var1','Variable pH PLC','']],
    'energy-meter':      [['label','Etiqueta',''],['unit','Unidad kW','kW'],['varKw','Potencia kW',''],['varKwh','Energía kWh','']],
    'flow-totalizer':    [['label','Etiqueta',''],['unit','Unidad caudal','m³/h'],['var1','Caudal',''],['var2','Total acum.','']],
    'level-indicator':   [['label','Etiqueta',''],['unit','Unidad','%'],['max','Máximo','100'],['var1','Variable PLC','']],
    'analog-output':     [['label','Etiqueta',''],['unit','Unidad',''],['min','Mínimo','0'],['max','Máximo','100'],['var1','Variable PLC','']],
    'pressure-gauge-pid':[['label','Etiqueta',''],['unit','Unidad','bar'],['max','Máximo','10'],['var1','Presión PLC','']],
    'temperature-4zone': [['label','Etiqueta',''],['unit','Unidad','°C'],['tRef','Setpoint ref.','0'],['var1','Zona 1',''],['var2','Zona 2',''],['var3','Zona 3',''],['var4','Zona 4','']],
    'analog-output':     [['label','Etiqueta',''],['unit','Unidad',''],['min','Mínimo','0'],['max','Máximo','100'],['var1','Variable PLC','']],
    /* ── TABLAS Y RECETAS ── */
    'data-table':        [['title','Título','DATOS'],['dlabel1','Etiqueta 1',''],['dvar1','Variable 1',''],['dlabel2','Etiqueta 2',''],['dvar2','Variable 2',''],['dlabel3','Etiqueta 3',''],['dvar3','Variable 3','']],
    'recipe-table':      [['title','Título','RECETA']],
    /* ── ALARMAS (campos básicos; campos especiales más abajo) ── */
    'alarm-plc':         [['title','Título','ALARMAS PLC'],['language','Idioma','es-ES']],
    'alarm-banner':      [['text','Texto alarma','ALARMA'],['var1','Variable PLC','']],
    'alarm-list':        [['title','Título','ALARMAS'],['pageSize','Alarmas por pág.','15']],
    'alarm-array':       [['title','Título','ALARMAS'],['arrayVar','Variable array PLC',''],['arraySize','Número de bits','64']],
    'alarm-word':        [['title','Título','ALARMAS'],['words','Variables WORD (una/línea)','']],
    'alarm-ticker':      [['avar1','Variable 1',''],['amsg1','Mensaje 1',''],['avar2','Variable 2',''],['amsg2','Mensaje 2',''],['avar3','Variable 3',''],['amsg3','Mensaje 3','']],
    'alarm-count':       [['var1','Variable PLC',''],['threshold','Umbral','1']],
    /* ── P&ID ── */
    'motor-symbol':      [['label','Etiqueta','M'],['var1','Variable estado (bool)','']],
    'pump-symbol':       [['label','Etiqueta','P'],['var1','Variable estado (bool)','']],
    'valve-symbol':      [['label','Etiqueta','V'],['var1','Variable estado (bool)','']],
    'level-tank':        [['label','Etiqueta',''],['unit','Unidad','%'],['max','Máximo','100'],['var1','Variable nivel','']],
    'pid-faceplate':     [['label','Etiqueta',''],['varPV','Variable PV',''],['varSP','Variable SP',''],['varOP','Variable OP (salida)','']],
    'pipe-h':            [['label','Etiqueta (opcional)',''],['color','Color tubería','#546e7a']],
    'pipe-v':            [['label','Etiqueta (opcional)',''],['color','Color tubería','#546e7a']],
    /* ── SISTEMA ── */
    'datetime-display':  [['fontSize','Tamaño px','14'],['color','Color texto','#f0f0e8']],
    'plc-clock-sync':    [['label','Etiqueta',''],['varHora','Var hora PLC',''],['varFecha','Var fecha PLC','']],
    /* ── TOOLTIP ── */
    'tooltip-node':      [['text','Texto nodo','NODE'],['fontSize','Tamaño px','11'],
                          ['shape','Forma (rect/rounded/circle/diamond/hexagon)','rect'],
                          ['fillColor','Color relleno','#e3f0ff'],['strokeColor','Color borde','#1565c0'],['fontColor','Color texto','#1a1a18'],
                          ['conn1','Conexión 1',''],['conn2','Conexión 2',''],['conn3','Conexión 3',''],['conn4','Conexión 4',''],
                          ['notes','Notas/descripción',''],
                          ['var1','Variable PLC',''],['pollMs','Polling ms','500'],
                          ['showValue','¿Mostrar valor? (true/false)','false'],['valueColor','Color valor','#00e5b0'],['unit','Unidad',''],
                          ['useActiveColor','¿Color activo? (true/false)','false'],
                          ['activeFill','Relleno cuando activo','#2e7d32'],['activeStroke','Borde cuando activo','#00c853'],['activeFont','Texto cuando activo','#ffffff']],
    'frame-box':         [['title','Título/Etiqueta','ZONA'],['color','Color borde','#1a1a18'],['fontSize','Tamaño px','10'],['bg','Fondo del título (color)','#ffffff']],
    'nav-button':        [['text','Texto','IR A...'],['icon','Icono','→'],['fontSize','Tamaño px','11'],['target','Destino (URL o nombre .html)','pantalla2.html'],['variant','Variante (normal/pill/ghost)','normal']],
    'btn-dpad':          [['var1','Var Arriba',''],['var2','Var Abajo',''],['var3','Var Izquierda',''],['var4','Var Derecha','']],
    'trend-comparison':  [['label','Etiqueta PV','PV'],['label2','Etiqueta SP','SP'],['unit','Unidad',''],['min','Mínimo','0'],['max','Máximo','100'],['var1','Variable PV PLC',''],['var2','Variable SP PLC','']],
    /* ── FORMAS ── */
    'shape-rect':        [['fill','Color relleno','#1565c0'],['fillOpacity','Opacidad relleno (0-1)','0.15'],['stroke','Color borde','#1565c0'],['strokeWidth','Grosor borde','2'],['radius','Radio esquinas','0']],
    'shape-circle':      [['fill','Color relleno','#2e7d32'],['fillOpacity','Opacidad relleno (0-1)','0.15'],['stroke','Color borde','#2e7d32'],['strokeWidth','Grosor borde','2']],
    'shape-triangle':    [['fill','Color relleno','#f57c00'],['fillOpacity','Opacidad relleno (0-1)','0.15'],['stroke','Color borde','#f57c00'],['strokeWidth','Grosor borde','2'],['direction','Dirección (up/down/left/right)','up']],
    'shape-line':        [['stroke','Color línea','#1565c0'],['strokeWidth','Grosor px','2']],
    'shape-curve':       [['stroke','Color línea','#1565c0'],['strokeWidth','Grosor px','2']],
    /* Decos — sin configuración (son SVG estáticos) */
    'deco-barrel':     [],
    'deco-brickwall':     [],
    'deco-bulldozer':     [],
    'deco-cement-mixer':     [],
    'deco-compressor':     [],
    'deco-cone':     [],
    'deco-conveyor':     [],
    'deco-crane':     [],
    'deco-dump-truck':     [],
    'deco-electric-hazard':     [],
    'deco-elevator':     [],
    'deco-excavator':     [],
    'deco-fire-ext':     [],
    'deco-first-aid':     [],
    'deco-forklift':     [],
    'deco-helmet':     [],
    'deco-ladder':     [],
    'deco-motor-el':     [],
    'deco-pallet':     [],
    'deco-person-walk':     [],
    'deco-pump-cent':     [],
    'deco-rack':     [],
    'deco-road-barrier':     [],
    'deco-safety-exit':     [],
    'deco-scaffold':     [],
    'deco-sign-hard':     [],
    'deco-toolbox':     [],
    'deco-truck':     [],
    'deco-welding':     [],
    'deco-wheelbarrow':     [],
    'deco-wire-spool':     [],
    'deco-worker':     [],
  };

  var fields = simpleProps[el.tipo] || [];
  if (fields.length === 0) {
    h += '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--mid)">Tipo: ' + el.tipo + '</div>';
  }
  fields.forEach(function(f) {
    var key = f[0], lbl = f[1], def = f[2];
    var val = p[key] !== undefined ? p[key] : def;
    var isMultiline = (key === 'words' || key === 'names' || key === 'alNames' || key === 'alVars' || key === 'notes' || key === 'states');
    h += '<div style="margin-bottom:6px;">' +
      '<div style="font-family:DM Mono,monospace;font-size:8px;color:var(--mid);margin-bottom:2px">' + lbl.toUpperCase() + '</div>';
    var isBool = (def === 'true' || def === 'false' || val === true || val === false || val === 'true' || val === 'false');
    var isColor = (key.toLowerCase().indexOf('color') !== -1 || key.toLowerCase().indexOf('fill') !== -1 || key.toLowerCase().indexOf('stroke') !== -1 || key.toLowerCase().indexOf('bg') !== -1);
    if (isMultiline) {
      h += '<textarea style="width:100%;padding:4px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:DM Mono,monospace;font-size:9px;box-sizing:border-box;resize:vertical;min-height:50px" ' +
        'onchange="(function(v){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});' +
        ' if(e) { e.props[\'' + key + '\']=v; _peRenderAll(); } })(this.value)">' + escHtml(String(val)) + '</textarea>';
    } else if (isBool) {
      var isChecked = (val === true || val === 'true');
      h += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0;">' +
        '<input type="checkbox" ' + (isChecked ? 'checked' : '') + ' style="width:15px;height:15px;cursor:pointer;" ' +
        'onchange="(function(v){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});' +
        ' if(e) { e.props[\'' + key + '\']= v; _peRenderAll(); } })(this.checked)">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;color:var(--mid)">' + (isChecked ? 'ACTIVADO' : 'DESACTIVADO') + '</span>' +
        '</label>';
    } else if (isColor) {
      h += '<div style="display:flex;gap:6px;align-items:center;">' +
        '<input type="color" value="' + (String(val).match(/^#[0-9a-f]{3,6}$/i) ? String(val) : '#1565c0') + '" style="width:36px;height:28px;border:1px solid var(--border);border-radius:2px;cursor:pointer;padding:2px;" ' +
        'oninput="(function(v){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});' +
        ' if(e) { e.props[\'' + key + '\']=v; _peRenderAll(); } })(this.value)">' +
        '<input value="' + escHtml(String(val)) + '" style="flex:1;padding:4px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:DM Mono,monospace;font-size:10px;box-sizing:border-box" ' +
        'onchange="(function(v){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});' +
        ' if(e) { e.props[\'' + key + '\']=v; _peRenderAll(); } })(this.value)">' +
        '</div>';
    } else {
      h += '<input value="' + escHtml(String(val)) + '" style="width:100%;padding:4px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:DM Mono,monospace;font-size:10px;box-sizing:border-box" ' +
        'onchange="(function(v){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});' +
        ' if(e) { e.props[\'' + key + '\']=v; _peRenderAll(); } })(this.value)">';
    }
    h += '</div>';
  });

  /* ── Subida de imagen ── */
  if (el.tipo === 'image-upload' || el.tipo === 'image-static') {
    var imgSrc = p.src || p.staticSrc || '';
    h += '<div style="margin-top:8px;padding:8px;background:rgba(26,26,24,.06);border:1px solid var(--border);border-radius:3px;">';
    h += '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:var(--mid);margin-bottom:6px">IMAGEN</div>';
    if (imgSrc) {
      h += '<img src="' + escHtml(imgSrc) + '" style="width:100%;height:80px;object-fit:contain;background:#f0f0ec;border-radius:3px;margin-bottom:6px;">';
    } else {
      h += '<div style="width:100%;height:60px;background:#f0f0ec;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:9px;color:#9a9a90;margin-bottom:6px;">Sin imagen</div>';
    }
    h += '<input type="file" accept="image/*" id="pe-img-input-' + el.id + '" style="display:none" ' +
      'onchange="peCargarImagen(\'' + el.id + '\', this)">' +
      '<button onmousedown="event.stopPropagation()" onclick="event.stopPropagation();document.getElementById(\'pe-img-input-' + el.id + '\').click()" ' +
      'style="width:100%;padding:6px;background:#1565c0;color:#fff;border:none;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;cursor:pointer;">⬆ SUBIR IMAGEN</button>';
    if (imgSrc) {
      h += '<button onclick="(function(){var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props.src=\'\';e.props.staticSrc=\'\';_peRenderAll();_peRenderProps();}})()" ' +
        'style="width:100%;padding:4px;background:transparent;border:1px solid #c62828;color:#c62828;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;cursor:pointer;margin-top:4px;">✕ QUITAR IMAGEN</button>';
    }
    h += '<div style="margin-top:6px;"><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--mid);margin-bottom:2px">AJUSTE</div>' +
      '<select style="width:100%;padding:4px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:DM Mono,monospace;font-size:10px;" ' +
      'onchange="(function(v){var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props.fit=v;_peRenderAll();}})(this.value)">' +
      '<option value="contain"' + (p.fit==='contain'?' selected':'') + '>Contain (encajar)</option>' +
      '<option value="cover"' + (p.fit==='cover'?' selected':'') + '>Cover (cubrir)</option>' +
      '<option value="fill"' + (p.fit==='fill'?' selected':'') + '>Fill (estirar)</option>' +
      '</select></div>';
    h += '</div>';
  }

  /* ── Tooltip-node: colores y opciones visuales ── */
  if (el.tipo === 'tooltip-node') {
    h += '<div style="margin-top:8px;padding:8px;background:rgba(21,101,192,.06);border:1px solid rgba(21,101,192,.2);border-radius:3px;">';
    h += '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#1565c0;margin-bottom:8px">FORMA Y COLORES</div>';
    /* Selector de forma */
    var tnShape = p.shape || 'rect';
    h += '<div style="margin-bottom:8px;">' +
      '<div style="font-family:DM Mono,monospace;font-size:8px;color:var(--mid);margin-bottom:3px">FORMA</div>' +
      '<select style="width:100%;padding:4px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:DM Mono,monospace;font-size:10px;" ' +
        'onchange="(function(v){var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props.shape=v;_peRenderAll();_peRenderProps();}})(this.value)">' +
        '<option value="rect"'         + (tnShape==='rect'         ?' selected':'') + '>▭ Rectángulo</option>' +
        '<option value="rounded"'      + (tnShape==='rounded'      ?' selected':'') + '>▢ Redondeado</option>' +
        '<option value="circle"'       + (tnShape==='circle'       ?' selected':'') + '>○ Círculo/Elipse</option>' +
        '<option value="diamond"'      + (tnShape==='diamond'      ?' selected':'') + '>◇ Rombo</option>' +
        '<option value="hexagon"'      + (tnShape==='hexagon'      ?' selected':'') + '>⬡ Hexágono</option>' +
        '<option value="parallelogram"'+ (tnShape==='parallelogram'?' selected':'') + '>▱ Paralelogramo</option>' +
        '<option value="none"'         + (tnShape==='none'         ?' selected':'') + '>— Solo texto</option>' +
      '</select></div>';
    var tnColorFields = [
      ['fillColor','Relleno','#e3f0ff'],
      ['strokeColor','Borde','#1565c0'],
      ['fontColor','Texto','#1a1a16'],
      ['activeFill','Relleno activo','#2e7d32'],
      ['activeStroke','Borde activo','#00c853'],
      ['activeFont','Texto activo','#ffffff'],
      ['valueColor','Color valor','#00e5b0']
    ];
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;">';
    for (var tci=0; tci<tnColorFields.length; tci++) {
      var tcf = tnColorFields[tci];
      var tck = tcf[0], tcl = tcf[1], tcd = tcf[2];
      var tcv = (p[tck] !== undefined && p[tck] !== '') ? p[tck] : tcd;
      h += '<div>' +
        '<div style="font-family:DM Mono,monospace;font-size:7px;color:var(--mid);margin-bottom:2px">' + tcl + '</div>' +
        '<div style="display:flex;align-items:center;gap:3px;">' +
          '<input type="color" value="' + escHtml(tcv) + '" ' +
          'style="width:28px;height:22px;border:1px solid var(--border);border-radius:2px;padding:1px;cursor:pointer;flex-shrink:0;" ' +
          'oninput="(function(v){var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props[\'' + tck + '\']=v;_peRenderAll();}})(this.value)">' +
          '<span style="font-family:DM Mono,monospace;font-size:8px;color:var(--text);overflow:hidden;text-overflow:ellipsis;">' + escHtml(tcv) + '</span>' +
        '</div></div>';
    }
    h += '</div>';
    /* Checkboxes showValue y useActiveColor */
    var tnBools = [['showValue','Mostrar valor en nodo'],['useActiveColor','Cambiar color al activarse']];
    for (var tbi=0; tbi<tnBools.length; tbi++) {
      var tbk = tnBools[tbi][0], tbl2 = tnBools[tbi][1];
      var tbv = (p[tbk] === true || p[tbk] === 'true');
      h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;cursor:pointer;" ' +
        'onclick="(function(){var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props[\'' + tbk + '\']=!( e.props[\'' + tbk + '\']=== true||e.props[\'' + tbk + '\']===\'true\');_peRenderAll();_peRenderProps();}})()">' +
        '<div style="width:14px;height:14px;border:2px solid var(--border);border-radius:2px;background:' + (tbv?'#1565c0':'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
          (tbv?'<span style="color:#fff;font-size:9px;line-height:1">✓</span>':'') +
        '</div>' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;color:var(--text);user-select:none;">' + tbl2 + '</span>' +
      '</div>';
    }
    h += '</div>';
  }

  /* ── Poll ms para elementos PLC ── */
  if (['alarm-plc','alarm-banner','alarm-list','alarm-array','alarm-word','alarm-ticker',
       'alarm-count','progress-bar','trend-chart','display','status-led','gauge',
       'numeric-display','numeric-7seg','data-table','bargraph-v','signal-lamp',
       'setpoint-input','indicator-text','multibit-led'].indexOf(el.tipo) !== -1) {
    h += '<div style="margin-top:6px;">' +
      '<div style="font-family:DM Mono,monospace;font-size:8px;color:var(--mid);margin-bottom:2px">POLLING (ms)</div>' +
      '<input type="number" value="' + (p.pollMs||1000) + '" style="width:100%;padding:4px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:DM Mono,monospace;font-size:10px;box-sizing:border-box" ' +
      'onchange="(function(v){ var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props.pollMs=parseInt(v)||1000;_peRenderAll();} })(this.value)"></div>';
  }

  /* ── Subida de imagen para image-upload e image-static ── */
  if (el.tipo === 'image-upload' || el.tipo === 'image-static') {
    h += '<div style="margin-top:8px;">' +
      '<div style="font-family:DM Mono,monospace;font-size:8px;color:var(--mid);margin-bottom:4px">IMAGEN</div>';
    if (p.src || p.staticSrc) {
      h += '<div style="margin-bottom:6px;border-radius:3px;overflow:hidden;border:1px solid var(--border);max-height:80px;display:flex;align-items:center;justify-content:center;background:#f0f0ec;">' +
        '<img src="' + (p.src||p.staticSrc) + '" style="max-width:100%;max-height:80px;object-fit:contain;" onerror="this.style.display=\'none\'">' +
        '</div>';
    }
    h += '<label onmousedown="event.stopPropagation()" style="display:block;width:100%;padding:6px;background:#1565c0;color:#fff;border:none;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;cursor:pointer;text-align:center;box-sizing:border-box;">' +
      (p.src||p.staticSrc ? '↺ CAMBIAR IMAGEN' : '⬆ SUBIR IMAGEN') +
      '<input type="file" accept="image/*" style="display:none" onchange="(function(inp,elId,tipo){' +
        'var f=inp.files[0];if(!f)return;' +
        'var r=new FileReader();' +
        'r.onload=function(ev){' +
          'var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});' +
          'if(e){' +
            'if(e.tipo===\'image-upload\')e.props.src=ev.target.result;' +
            'else e.props.staticSrc=ev.target.result;' +
            '_peRenderAll();_peRenderProps();' +
          '}' +
        '};r.readAsDataURL(f);' +
      '})(this,\'' + el.id + '\',\'' + el.tipo + '\')">' +
      '</label>' +
      (p.src||p.staticSrc ? '<button onclick="(function(){var e=_peEls.find(function(x){return x.id===\'' + el.id + '\';});if(e){e.props.src=\'\';e.props.staticSrc=\'\';_peRenderAll();_peRenderProps();}})()" style="width:100%;margin-top:4px;padding:4px;background:transparent;border:1px solid #c62828;color:#c62828;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;cursor:pointer">✕ QUITAR IMAGEN</button>' : '') +
      '</div>';
  }

  h += '<div style="margin-top:12px">' +
    '<button onclick="_peEliminar(\'' + el.id + '\')" style="width:100%;padding:5px;background:transparent;border:1px solid #c62828;color:#c62828;border-radius:2px;font-family:DM Mono,monospace;font-size:9px;cursor:pointer">✕ ELIMINAR</button>' +
    '</div>';
  h += '</div>';
  body.innerHTML = h;
}

/* ─── Botón "+" para añadir elemento ───────────────────────── */
function popupEditorAddEl() {
  var grid = document.getElementById('popup-add-grid');
  grid.innerHTML = _PE_TIPOS.map(function(t) {
    return '<div onclick="popupEditorAddTipo(\'' + t.tipo + '\')" ' +
      'style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;' +
      'border:1px solid var(--border);border-radius:4px;cursor:pointer;background:var(--surface);' +
      'font-family:DM Mono,monospace;text-align:center" ' +
      'onmouseenter="this.style.borderColor=\'#1565c0\'" onmouseleave="this.style.borderColor=\'\'"> ' +
      '<span style="font-size:18px">' + t.icon + '</span>' +
      '<span style="font-size:9px;color:var(--text)">' + t.name + '</span>' +
      '<span style="font-size:8px;color:var(--mid)">' + t.cat + '</span>' +
      '</div>';
  }).join('');
  document.getElementById('modal-popup-add').style.display = 'block';
}

function popupEditorAddTipo(tipo) {
  document.getElementById('modal-popup-add').style.display = 'none';
  var sz    = TAMANIOS[tipo]  || [160, 48];
  var props = JSON.parse(JSON.stringify(PROPS_DEFAULT[tipo] || {}));
  var popup = POPUPS[_peElId] || {};
  var newEl = {
    id: 'pel_' + Date.now(), tipo: tipo,
    x: Math.round((popup.w||700)/2 - sz[0]/2),
    y: Math.round((popup.h||480)/2 - sz[1]/2 + 36),
    w: sz[0], h: sz[1], props: props
  };
  _peEls.push(newEl);
  _peRenderAll();
  _peSeleccionar(newEl.id);
}

/* ══════════════════════════════════════════════════════════════
   COPIAR / PEGAR / DUPLICAR / DESHACER / REHACER
══════════════════════════════════════════════════════════════ */

var _peClipboard  = null;   /* elemento copiado */
var _peHistory    = [];     /* pila deshacer    */
var _peHistFuture = [];     /* pila rehacer     */
var _PE_MAX_HIST  = 40;

function _peSnapshot() {
  /* Guarda el estado actual en la pila de deshacer */
  _peHistory.push(JSON.stringify(_peEls));
  if (_peHistory.length > _PE_MAX_HIST) _peHistory.shift();
  _peHistFuture = [];  /* al modificar se descarta el futuro */
}

function _peCopiar() {
  if (!_peSel) return;
  var el = _peEls.find(function(e){ return e.id === _peSel; });
  if (!el) return;
  _peClipboard = JSON.parse(JSON.stringify(el));
  mostrarToast('Elemento copiado');
}

function _pePegar() {
  if (!_peClipboard) return;
  _peSnapshot();
  var clone = JSON.parse(JSON.stringify(_peClipboard));
  clone.id  = 'pel_' + Date.now();
  clone.x  += 20;
  clone.y  += 20;
  _peEls.push(clone);
  _peRenderAll();
  _peSeleccionar(clone.id);
  _peSaveToPopups();
  mostrarToast('Pegado');
}

function _peDuplicar() {
  if (!_peSel) return;
  var el = _peEls.find(function(e){ return e.id === _peSel; });
  if (!el) return;
  _peSnapshot();
  var clone = JSON.parse(JSON.stringify(el));
  clone.id  = 'pel_' + Date.now();
  clone.x  += 24;
  clone.y  += 24;
  _peEls.push(clone);
  _peRenderAll();
  _peSeleccionar(clone.id);
  _peSaveToPopups();
  mostrarToast('Duplicado');
}

function _peDeshacer() {
  if (!_peHistory.length) return;
  _peHistFuture.push(JSON.stringify(_peEls));
  _peEls = JSON.parse(_peHistory.pop());
  _peSel = null;
  _peRenderAll();
  _peRenderProps();
  _peSaveToPopups();
  mostrarToast('Deshacer');
}

function _peRehacer() {
  if (!_peHistFuture.length) return;
  _peHistory.push(JSON.stringify(_peEls));
  _peEls = JSON.parse(_peHistFuture.pop());
  _peSel = null;
  _peRenderAll();
  _peRenderProps();
  _peSaveToPopups();
  mostrarToast('Rehacer');
}

/* ── Capas ── */
function _peAlFrente() {
  if (!_peSel) return;
  _peSnapshot();
  var idx = _peEls.findIndex(function(e){ return e.id === _peSel; });
  if (idx < _peEls.length - 1) {
    var el = _peEls.splice(idx, 1)[0];
    _peEls.push(el);
    _peRenderAll();
    _peSaveToPopups();
  }
}
function _peAlFondo() {
  if (!_peSel) return;
  _peSnapshot();
  var idx = _peEls.findIndex(function(e){ return e.id === _peSel; });
  if (idx > 0) {
    var el = _peEls.splice(idx, 1)[0];
    _peEls.unshift(el);
    _peRenderAll();
    _peSaveToPopups();
  }
}
function _peSubirCapa() {
  if (!_peSel) return;
  _peSnapshot();
  var idx = _peEls.findIndex(function(e){ return e.id === _peSel; });
  if (idx < _peEls.length - 1) {
    var t = _peEls[idx]; _peEls[idx] = _peEls[idx+1]; _peEls[idx+1] = t;
    _peRenderAll();
    _peSaveToPopups();
  }
}
function _peBajarCapa() {
  if (!_peSel) return;
  _peSnapshot();
  var idx = _peEls.findIndex(function(e){ return e.id === _peSel; });
  if (idx > 0) {
    var t = _peEls[idx]; _peEls[idx] = _peEls[idx-1]; _peEls[idx-1] = t;
    _peRenderAll();
    _peSaveToPopups();
  }
}

/* ── Guardar en POPUPS después de cambios ── */
function _peSaveToPopups() {
  if (!_peElId) return;
  if (!POPUPS[_peElId]) POPUPS[_peElId] = {};
  POPUPS[_peElId].els = JSON.parse(JSON.stringify(_peEls));
  MODIFICADO = true;
}

/* ══════════════════════════════════════════════════════════════
   MENÚ CONTEXTUAL DEL POPUP EDITOR
══════════════════════════════════════════════════════════════ */

(function() {
  var _peCtxMenu = null;

  function _peBuildCtxMenu() {
    if (_peCtxMenu) { _peCtxMenu.remove(); _peCtxMenu = null; }
    var m = document.createElement('div');
    m.id = 'pe-ctx-menu';
    m.style.cssText = 'position:fixed;z-index:999999;min-width:190px;background:var(--panel2);border:1px solid rgba(230,232,236,.16);border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,.6);padding:5px 0;font-family:DM Sans,sans-serif;font-size:12px;display:none;user-select:none;';

    var style = document.createElement('style');
    style.textContent =
      '#pe-ctx-menu .pci{display:flex;align-items:center;gap:9px;padding:7px 16px 7px 12px;cursor:pointer;color:var(--light);transition:background .1s}' +
      '#pe-ctx-menu .pci:hover:not(.pcd){background:var(--panel3);color:var(--text)}' +
      '#pe-ctx-menu .pci.pcd{opacity:.3;pointer-events:none}' +
      '#pe-ctx-menu .pci-ico{width:16px;text-align:center;font-size:13px;flex-shrink:0;opacity:.8}' +
      '#pe-ctx-menu .pci-lbl{flex:1}' +
      '#pe-ctx-menu .pci-k{font-family:DM Mono,monospace;font-size:9px;color:var(--mid);letter-spacing:.5px}' +
      '#pe-ctx-menu .pcs{height:1px;background:var(--panel3);margin:4px 0}' +
      '#pe-ctx-menu .pcg{padding:4px 12px 2px;font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:var(--mid)}';
    document.head.appendChild(style);

    function it(ico, lbl, key, action, disabled) {
      return '<div class="pci' + (disabled ? ' pcd' : '') + '" data-pa="' + action + '">' +
        '<span class="pci-ico">' + ico + '</span>' +
        '<span class="pci-lbl">' + lbl + '</span>' +
        (key ? '<span class="pci-k">' + key + '</span>' : '') +
        '</div>';
    }
    function sep() { return '<div class="pcs"></div>'; }
    function grp(t){ return '<div class="pcg">' + t + '</div>'; }

    function rebuild() {
      var hasSel = !!_peSel;
      var hasCb  = !!_peClipboard;
      var hasHist = _peHistory.length > 0;
      var hasFut  = _peHistFuture.length > 0;
      m.innerHTML =
        grp('HISTORIAL') +
        it('↩', 'Deshacer', 'Ctrl+Z', 'undo',  !hasHist) +
        it('↪', 'Rehacer',  'Ctrl+Y', 'redo',  !hasFut) +
        sep() +
        grp('PORTAPAPELES') +
        it('⎘', 'Copiar',    'Ctrl+C', 'copy',  !hasSel) +
        it('⧉', 'Duplicar',  'Ctrl+D', 'dup',   !hasSel) +
        it('⎗', 'Pegar',     'Ctrl+V', 'paste', !hasCb) +
        sep() +
        grp('CAPAS') +
        it('▲▲', 'Traer al frente', 'Ctrl+Shift+↑', 'front', !hasSel) +
        it('▲',  'Subir capa',      'Ctrl+↑',        'up',   !hasSel) +
        it('▼',  'Bajar capa',      'Ctrl+↓',        'down', !hasSel) +
        it('▼▼', 'Enviar al fondo', 'Ctrl+Shift+↓',  'back', !hasSel) +
        sep() +
        grp('ELEMENTO') +
        it('⬡', 'Seleccionar todo', 'Ctrl+A', 'selall', false) +
        it('✕', 'Eliminar', 'Del', 'del', !hasSel);
    }

    var ACTS = {
      undo:   function(){ _peDeshacer(); },
      redo:   function(){ _peRehacer(); },
      copy:   function(){ _peCopiar(); },
      dup:    function(){ _peDuplicar(); },
      paste:  function(){ _pePegar(); },
      front:  function(){ _peAlFrente(); },
      up:     function(){ _peSubirCapa(); },
      down:   function(){ _peBajarCapa(); },
      back:   function(){ _peAlFondo(); },
      del:    function(){ if(_peSel) { _peSnapshot(); _peEliminar(_peSel); } },
      selall: function(){ /* seleccionar último */ if(_peEls.length) _peSeleccionar(_peEls[_peEls.length-1].id); }
    };

    m.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    m.addEventListener('click', function(e) {
      var it = e.target.closest('.pci');
      if (!it) return;
      hide();
      if (ACTS[it.dataset.pa]) ACTS[it.dataset.pa]();
    });

    document.body.appendChild(m);
    _peCtxMenu = m;

    function show(x, y) {
      rebuild();
      m.style.display = 'block';
      var mw = m.offsetWidth  || 200;
      var mh = m.offsetHeight || 300;
      m.style.left = Math.min(x + 2, window.innerWidth  - mw - 8) + 'px';
      m.style.top  = Math.min(y + 2, window.innerHeight - mh - 8) + 'px';
    }
    function hide() { m.style.display = 'none'; }

    /* Escuchar contextmenu en el canvas del popup */
    document.addEventListener('contextmenu', function(e) {
      var canvas = document.getElementById('modal-popup-editor');
      if (!canvas || !canvas.contains(e.target)) return;
      e.preventDefault();
      show(e.clientX, e.clientY);
    });

    document.addEventListener('mousedown', function(e) {
      if (!_peCtxMenu) return;
      if (!_peCtxMenu.contains(e.target)) hide();
    });
    document.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') hide();
    });
  }

  /* Inicializar cuando se abra el popup editor */
  var _peCtxInit = false;
  var _origAbrirEditorPopup = typeof abrirEditorPopup === 'function' ? abrirEditorPopup : null;
  window._peInitCtxMenu = function() {
    if (_peCtxInit) return;
    _peCtxInit = true;
    _peBuildCtxMenu();
  };
})();

/* ══════════════════════════════════════════════════════════════
   ATAJOS DE TECLADO DEL POPUP EDITOR
══════════════════════════════════════════════════════════════ */

document.addEventListener('keydown', function(e) {
  /* Solo actuar si el popup editor está abierto */
  var overlay = document.getElementById('modal-popup-editor');
  if (!overlay || overlay.style.display === 'none') return;

  var tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  /* Delete / Backspace → eliminar seleccionado */
  if ((e.key === 'Delete' || e.key === 'Backspace') && _peSel) {
    e.preventDefault();
    _peSnapshot();
    _peEliminar(_peSel);
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'z': e.preventDefault(); _peDeshacer(); break;
      case 'y': e.preventDefault(); _peRehacer(); break;
      case 'c': e.preventDefault(); _peCopiar(); break;
      case 'v': e.preventDefault(); _pePegar(); break;
      case 'd': e.preventDefault(); _peDuplicar(); break;
      case 'a': e.preventDefault();
        /* Seleccionar el último elemento (el de mayor z) */
        if (_peEls.length) _peSeleccionar(_peEls[_peEls.length-1].id);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (e.shiftKey) _peAlFrente(); else _peSubirCapa();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (e.shiftKey) _peAlFondo(); else _peBajarCapa();
        break;
    }
    return;
  }

  /* [ / ] → rotar ±15° (Shift = ±1°) */
  if (_peSel && (e.key === '[' || e.key === ']')) {
    e.preventDefault();
    var paso = e.shiftKey ? 1 : 15;
    var elR = _peEls.find(function(x){ return x.id === _peSel; });
    if (elR) {
      elR.props = elR.props || {};
      var rotAct = Number(elR.props.rotation) || 0;
      elR.props.rotation = e.key === ']'
        ? (rotAct + paso) % 360
        : ((rotAct - paso + 360) % 360);
      _peRenderAll();
      _peRenderProps();
      _peSaveToPopups();
    }
    return;
  }

  /* Flechas → mover elemento de a 8px (Shift = 1px) */
  if (_peSel && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
    var paso = e.shiftKey ? 1 : 8;
    var el = _peEls.find(function(x){ return x.id === _peSel; });
    if (!el) return;
    if (e.key === 'ArrowUp')    el.y = Math.max(0, el.y - paso);
    if (e.key === 'ArrowDown')  el.y += paso;
    if (e.key === 'ArrowLeft')  el.x = Math.max(0, el.x - paso);
    if (e.key === 'ArrowRight') el.x += paso;
    /* Actualizar campos X/Y del panel de props */
    ['x','y'].forEach(function(k) {
      var inp = document.querySelector('#popup-props-body input[data-dim="'+k+'"]');
      if (inp) inp.value = el[k];
    });
    _peRenderAll();
    _peSaveToPopups();
  }
});

/* ─── Serialización para guardar/cargar proyecto ───────────── */
function popupsToJson() {
  return JSON.parse(JSON.stringify(POPUPS));
}

function popupsFromJson(data) {
  POPUPS = data || {};
}

/* ── Cargar imagen en elemento del popup ─────────────────── */
function peCargarImagen(elId, input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var el = _peEls.find(function(x){ return x.id === elId; });
    if (!el) return;
    el.props.src = e.target.result;
    el.props.staticSrc = e.target.result;
    _peRenderAll();
    _peRenderProps();
    mostrarToast('Imagen cargada (' + Math.round(file.size/1024) + ' KB)');
    MODIFICADO = true;
  };
  reader.readAsDataURL(file);
}
