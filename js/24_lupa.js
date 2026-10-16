/* =================================================================
   LUPA — Modo inspección PLC sin activar movimiento/selección
================================================================= */

/* ── Activar / desactivar modo lupa ─────────────────────────── */
function toggleLupa() {
  MODO_LUPA = !MODO_LUPA;
  var btn   = document.getElementById('btn-lupa');
  var stage = document.getElementById('cstage');
  var wrap  = document.getElementById('cwrap');

  if (btn)   btn.classList.toggle('activo', MODO_LUPA);
  if (stage) stage.classList.toggle('lupa-activa', MODO_LUPA);
  if (wrap)  wrap.style.cursor = MODO_LUPA ? 'zoom-in' : '';

  cerrarPopupLupa();
  mostrarToast(MODO_LUPA ? '🔍 Lupa ON — haz clic en cualquier elemento' : '🔍 Lupa OFF');
}

/* ── Extraer todas las variables PLC de un elemento ─────────── */
function extraerVarsPlc(el) {
  var p    = el.props || {};
  var vars = [];

  function add(label, key) {
    var v = p[key];
    if (v && String(v).trim()) vars.push({ label: label, valor: String(v).trim() });
  }

  /* Variables genéricas */
  add('Variable PLC',           'var1');
  add('Variable LED',           'varLed');
  add('Var. arranque (RUN)',     'varRun');
  add('Var. fallo (FAULT)',      'varFault');
  add('Var. abierto (OPEN)',     'varOpen');
  add('Var. cerrado (CLOSED)',   'varClosed');
  add('Var. subir',             'varUp');
  add('Var. bajar',             'varDown');
  add('Var. izquierda',         'varLeft');
  add('Var. derecha',           'varRight');
  add('Var. SET',               'varSet');
  add('Var. RESET',             'varReset');
  add('Var. alarma',            'varAlarm');
  add('Var. ACK',               'varAck');
  add('Var. array PLC',         'arrayVar');
  add('Var. setpoint',          'varSP');
  add('Var. proceso (PV)',       'varPV');
  add('Var. salida (OUT)',       'varOut');
  add('Var. posición X',        'varX');
  add('Var. posición Y',        'varY');
  add('Var. visibilidad',       'visVar');
  add('Var. animación',         'animVar');

  /* Alarmas de lista (hasta 8) */
  for (var ai = 1; ai <= 8; ai++) {
    add('Alarma ' + ai, 'avar' + ai);
  }
  /* Variables de tabla de datos (hasta 6) */
  for (var di = 1; di <= 6; di++) {
    add('Dato ' + di, 'dvar' + di);
  }
  /* Info-Card filas (hasta 6) */
  for (var ici = 1; ici <= 6; ici++) {
    var rk = (p['rkey'+ici]||'').trim(), rv = (p['rval'+ici]||'').trim();
    if (rk || rv) vars.push({ label: rk || ('Fila '+ici), valor: rv || '—' });
  }

  /* Polling */
  if (p.pollMs)     vars.push({ label: 'Polling',        valor: p.pollMs + ' ms',    esInfo: true });
  if (p.animPollMs) vars.push({ label: 'Poll animación', valor: p.animPollMs + ' ms', esInfo: true });
  if (p.visPollMs)  vars.push({ label: 'Poll visib.',    valor: p.visPollMs + ' ms',  esInfo: true });
  if (p.animTrigger)vars.push({ label: 'Activa con',     valor: p.animTrigger,         esInfo: true });
  if (p.triggerVal) vars.push({ label: 'Activa con',     valor: p.triggerVal,          esInfo: true });

  return vars;
}

/* ── Mostrar popup flotante de lupa ──────────────────────────── */
function mostrarPopupLupa(elData, divEl) {
  cerrarPopupLupa();

  var vars = extraerVarsPlc(elData);
  var rect = divEl.getBoundingClientRect();

  var popup = document.createElement('div');
  popup.id  = 'lupa-popup';

  /* Cabecera */
  var tipoLabel = elData.tipo || elData.id;
  var headerHtml =
    '<div class="lupa-hdr">' +
      '<div class="lupa-hdr-icon">🔍</div>' +
      '<div class="lupa-hdr-info">' +
        '<div class="lupa-hdr-id">' + elData.id + '</div>' +
        '<div class="lupa-hdr-tipo">' + tipoLabel + '</div>' +
      '</div>' +
      '<button class="lupa-close" onclick="cerrarPopupLupa()">✕</button>' +
    '</div>';

  /* Cuerpo: variables */
  var bodyHtml = '<div class="lupa-body">';
  if (vars.length === 0) {
    bodyHtml += '<div class="lupa-empty">Sin variables PLC configuradas</div>';
  } else {
    var plcVars = vars.filter(function(v) { return !v.esInfo; });
    var infoVars = vars.filter(function(v) { return v.esInfo; });

    if (plcVars.length) {
      bodyHtml += '<div class="lupa-section-title">VARIABLES PLC</div>';
      plcVars.forEach(function(v) {
        bodyHtml +=
          '<div class="lupa-row">' +
            '<div class="lupa-dot"></div>' +
            '<div class="lupa-label">' + v.label + '</div>' +
            '<div class="lupa-valor" title="Copiar" onclick="copiarLupa(this)">' + escHtml(v.valor) + '</div>' +
          '</div>';
      });
    }
    if (infoVars.length) {
      bodyHtml += '<div class="lupa-section-title lupa-section-sep">CONFIGURACIÓN</div>';
      infoVars.forEach(function(v) {
        bodyHtml +=
          '<div class="lupa-row">' +
            '<div class="lupa-dot lupa-dot-info"></div>' +
            '<div class="lupa-label">' + v.label + '</div>' +
            '<div class="lupa-valor lupa-valor-info">' + escHtml(v.valor) + '</div>' +
          '</div>';
      });
    }
  }
  bodyHtml += '</div>';

  /* Footer: posición y tamaño */
  var footerHtml =
    '<div class="lupa-footer">' +
      '<span>X:' + elData.x + ' Y:' + elData.y + '</span>' +
      '<span>·</span>' +
      '<span>' + elData.w + '×' + elData.h + 'px</span>' +
    '</div>';

  popup.innerHTML = headerHtml + bodyHtml + footerHtml;
  document.body.appendChild(popup);

  /* Posicionar cerca del elemento pero sin salirse de pantalla */
  var pw = 260, ph = popup.offsetHeight || 200;
  var vw = window.innerWidth, vh = window.innerHeight;

  var left = rect.right + 10;
  var top  = rect.top;

  if (left + pw > vw - 8)  left = rect.left - pw - 10;
  if (left < 8)            left = 8;
  if (top + ph > vh - 8)  top  = vh - ph - 8;
  if (top < 8)             top  = 8;

  popup.style.left = left + 'px';
  popup.style.top  = top  + 'px';

  /* Animar entrada */
  requestAnimationFrame(function() { popup.classList.add('visible'); });
}

function cerrarPopupLupa() {
  var old = document.getElementById('lupa-popup');
  if (old) old.remove();
}

function copiarLupa(el) {
  var txt = el.textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(txt).then(function() {
      mostrarToast('📋 Copiado: ' + txt);
    });
  }
  /* Flash visual */
  el.classList.add('copiado');
  setTimeout(function() { el.classList.remove('copiado'); }, 600);
}

/* ── Interceptar clicks en elementos del canvas ─────────────── */
document.addEventListener('mousedown', function(e) {
  if (!MODO_LUPA) return;

  /* Ignorar clicks en el propio popup */
  var popup = document.getElementById('lupa-popup');
  if (popup && popup.contains(e.target)) return;

  /* Buscar el .hel más cercano */
  var divEl = e.target.closest('.hel');
  if (!divEl) {
    cerrarPopupLupa();
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  var elData = ELEMENTOS.find(function(x) { return x.id === divEl.id; });
  if (!elData) return;

  mostrarPopupLupa(elData, divEl);
}, true); /* capture = true para interceptar antes que el mousedown de movimiento */

/* Cerrar popup con Escape */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && MODO_LUPA) {
    cerrarPopupLupa();
  }
  /* Atajo L para toggle lupa */
  if ((e.key === 'l' || e.key === 'L') && !MODO_LUPA ||
      (e.key === 'l' || e.key === 'L') &&  MODO_LUPA) {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'SELECT')) return;
    toggleLupa();
  }
});
