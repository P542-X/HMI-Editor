/* =================================================================
   MULTI-PLC  —  gestor de conexiones (hasta 8 PLCs simultáneos)
   · PLCS[]  es el array maestro (01_estado-global.js)
   · PLC     sigue siendo alias a PLCS[0] (retrocompatibilidad total)
   · El modal tiene una tab por PLC + botón para añadir/eliminar
================================================================= */

var _MPLC_TAB_ACTIVA = 0;

var _MPLC_COLORES = [
  '#1565c0','#2e7d32','#c62828','#f57c00',
  '#6a1b9a','#00838f','#37474f','#ad1457'
];

function _mplcColor(idx) {
  return _MPLC_COLORES[idx % _MPLC_COLORES.length];
}

function _mplcEnsureFields(p) {
  p.label = p.label || ('PLC-' + (PLCS.indexOf(p) + 1));
  p.ip    = p.ip    || '';
  p.user  = p.user  || 'Admin';
  p.pass  = p.pass  || '';
  if (p.anon === undefined) p.anon = true;
  if (!p.color) p.color = _mplcColor(PLCS.indexOf(p));
  return p;
}

/* ─── sync alias PLC → PLCS[0] ──────────────────────────────── */
function _mplcSyncAlias() {
  if (PLCS[0] && PLC !== PLCS[0]) {
    PLCS[0].ip      = PLC.ip      || PLCS[0].ip;
    PLCS[0].user    = PLC.user    || PLCS[0].user;
    PLCS[0].pass    = PLC.pass    || PLCS[0].pass;
    PLCS[0].project = PLC.project || PLCS[0].project;
    PLC = PLCS[0];
  }
}

/* ─── pildora barra superior ──────────────────────────────────── */
function _mplcActualizarPildora() {
  var dot = document.getElementById('pdot');
  var txt = document.getElementById('ptxt');
  if (!dot || !txt) return;
  var activos = PLCS.filter(function(p) { return p.ip; });
  if (!activos.length) {
    dot.className   = 'pdot';
    txt.textContent = 'SIN CONFIGURAR';
    return;
  }
  dot.className = 'pdot ok';
  txt.textContent = activos.length === 1 ? activos[0].ip : activos.length + ' PLCs conectados';
}

/* ─── abrir modal ─────────────────────────────────────────────── */
function abrirModalPlc() {
  _mplcSyncAlias();
  _mplcRenderizarModal();
  abrirModal('modal-plc');
}

/* ─── renderizar modal ────────────────────────────────────────── */
function _mplcRenderizarModal() {
  var tabs = document.getElementById('mplc-tabs');
  var body = document.getElementById('mplc-body');
  if (!tabs || !body) return;

  /* tabs */
  tabs.innerHTML = '';
  PLCS.forEach(function(p, i) {
    _mplcEnsureFields(p);
    var btn = document.createElement('button');
    btn.className = 'mplc-tab' + (i === _MPLC_TAB_ACTIVA ? ' activa' : '');
    btn.style.setProperty('--tab-color', p.color);
    btn.innerHTML =
      '<span class="mplc-tab-dot" style="background:' + p.color + ';box-shadow:0 0 0 2px ' + p.color + '44"></span>' +
      escHtml(p.label);
    btn.onclick = (function(idx){ return function(){ _mplcSeleccionarTab(idx); }; })(i);
    tabs.appendChild(btn);
  });

  if (PLCS.length < 8) {
    var addBtn = document.createElement('button');
    addBtn.className = 'mplc-tab mplc-tab-add';
    addBtn.title = 'Añadir PLC';
    addBtn.textContent = '＋';
    addBtn.onclick = _mplcAnadirPlc;
    tabs.appendChild(addBtn);
  }

  /* formulario */
  var p   = PLCS[_MPLC_TAB_ACTIVA];
  var idx = _MPLC_TAB_ACTIVA;

  var elimBtn = PLCS.length > 1
    ? '<button class="mplc-eliminar" onclick="_mplcEliminarPlc(' + idx + ')" title="Eliminar PLC">🗑 Eliminar</button>'
    : '';

  var colorDots = _MPLC_COLORES.map(function(c) {
    return '<span class="mplc-color-dot' + (p.color === c ? ' sel' : '') + '" ' +
      'style="background:' + c + ';box-shadow:' + (p.color === c ? '0 0 0 2px var(--white),0 0 0 4px ' + c : 'none') + '"' +
      ' onclick="_mplcCambiarColor(\'' + c + '\')"></span>';
  }).join('');

  body.innerHTML =
    '<div class="mplc-form">' +
      '<div class="mplc-row-header">' +
        '<input class="mplc-label-inp" id="mplc-label" value="' + escHtml(p.label) +
          '" placeholder="Nombre" maxlength="20" oninput="_mplcActualizarLabel(this.value)">' +
        '<div class="mplc-colors">' + colorDots + '</div>' +
        elimBtn +
      '</div>' +
      '<div class="mrow"><div class="mlbl">IP DEL PLC</div>' +
        '<input class="minp" id="mplc-ip" value="' + escHtml(p.ip) +
        '" placeholder="192.168.1.' + (idx + 1) + '"></div>' +
      /* ── Selector de modo de autenticación ── */
      '<div class="mrow">' +
        '<div class="mlbl">ACCESO</div>' +
        '<div class="mplc-auth-selector">' +
          '<label class="mplc-auth-opt' + (p.anon ? ' sel' : '') + '" id="mplc-opt-anon" onclick="_mplcSeleccionarModo(true)">' +
            '<span class="mplc-auth-radio">' + (p.anon ? '◉' : '○') + '</span>' +
            '<div class="mplc-auth-info">' +
              '<span class="mplc-auth-titulo">Anónimo</span>' +
              '<span class="mplc-auth-sub">Sin usuario ni contraseña<br><code style=\"font-size:9px;color:var(--mid)\">user: Anonymous  ·  pass: (vacío)</code></span>' +
            '</div>' +
          '</label>' +
          '<label class="mplc-auth-opt' + (!p.anon ? ' sel' : '') + '" id="mplc-opt-cred" onclick="_mplcSeleccionarModo(false)">' +
            '<span class="mplc-auth-radio">' + (!p.anon ? '◉' : '○') + '</span>' +
            '<div class="mplc-auth-info">' +
              '<span class="mplc-auth-titulo">Usuario y contraseña</span>' +
              '<span class="mplc-auth-sub">Login con credenciales TIA Portal</span>' +
            '</div>' +
          '</label>' +
        '</div>' +
      '</div>' +
      /* ── Campos usuario/contraseña (visibles solo en modo credenciales) ── */
      '<div id="mplc-auth-fields" style="' + (p.anon ? 'display:none' : '') + '">' +
        '<div class="mrow"><div class="mlbl">USUARIO</div>' +
          '<input class="minp" id="mplc-user" value="' + escHtml(p.user) + '" placeholder="Admin" autocomplete="username"></div>' +
        '<div class="mrow"><div class="mlbl">CONTRASEÑA</div>' +
          '<input class="minp" id="mplc-pass" type="password" value="' + escHtml(p.pass) + '" autocomplete="current-password"></div>' +
      '</div>' +
      (idx === 0
        ? '<div class="mrow"><div class="mlbl">NOMBRE PROYECTO</div>' +
          '<input class="minp" id="mplc-proj" value="' + escHtml(PLC.project || '') + '"></div>'
        : '') +
      '<div class="mplc-preview">' +
        '<div class="mplc-badge" style="--bc:' + p.color + '">' +
          '<span class="mplc-badge-dot" style="background:' + p.color + '"></span>' +
          '<b>' + escHtml(p.label) + '</b>' +
          '<span class="mplc-badge-ip">' + (p.ip || 'sin IP') + '</span>' +
          '<span class="mplc-badge-idx">PLC #' + (idx + 1) + '</span>' +
        '</div>' +
        '<span class="mplc-hint">Asigna este PLC a elementos desde el panel de propiedades</span>' +
      '</div>' +
    '</div>';
}

/* ─── seleccionar tab ─────────────────────────────────────────── */
function _mplcSeleccionarTab(idx) {
  _mplcLeerFormulario();
  _MPLC_TAB_ACTIVA = idx;
  _mplcRenderizarModal();
}

/* ─── seleccionar modo de autenticación ──────────────────────── */
function _mplcSeleccionarModo(isAnon) {
  PLCS[_MPLC_TAB_ACTIVA].anon = isAnon;
  var fields  = document.getElementById('mplc-auth-fields');
  var optAnon = document.getElementById('mplc-opt-anon');
  var optCred = document.getElementById('mplc-opt-cred');
  if (fields) fields.style.display = isAnon ? 'none' : '';
  if (optAnon) {
    optAnon.className = 'mplc-auth-opt' + (isAnon ? ' sel' : '');
    optAnon.querySelector('.mplc-auth-radio').textContent = isAnon ? '◉' : '○';
  }
  if (optCred) {
    optCred.className = 'mplc-auth-opt' + (!isAnon ? ' sel' : '');
    optCred.querySelector('.mplc-auth-radio').textContent = !isAnon ? '◉' : '○';
  }
}

/* ─── leer formulario → escribir objeto ──────────────────────── */
function _mplcLeerFormulario() {
  var p   = PLCS[_MPLC_TAB_ACTIVA];
  var ip  = document.getElementById('mplc-ip');
  var usr = document.getElementById('mplc-user');
  var pw  = document.getElementById('mplc-pass');
  var prj = document.getElementById('mplc-proj');
  var lbl = document.getElementById('mplc-label');
  /* leer el modo de autenticación desde el estado del objeto (ya actualizado por _mplcSeleccionarModo) */
  if (ip) p.ip = ip.value.trim();
  /* p.anon ya está actualizado en tiempo real por _mplcSeleccionarModo */
  if (!p.anon) {
    if (usr) p.user = usr.value.trim();
    if (pw)  p.pass = pw.value;
  } else {
    p.user = '';
    p.pass = '';
  }
  if (lbl && lbl.value.trim()) p.label = lbl.value.trim();
  if (prj && _MPLC_TAB_ACTIVA === 0) PLC.project = prj.value.trim();
}

/* ─── actualizar label en tiempo real ────────────────────────── */
function _mplcActualizarLabel(val) {
  if (!val.trim()) return;
  PLCS[_MPLC_TAB_ACTIVA].label = val;
  var badge = document.querySelector('.mplc-badge b');
  if (badge) badge.textContent = val;
  /* actualizar tab sin re-renderizar todo */
  var allTabs = document.querySelectorAll('.mplc-tab:not(.mplc-tab-add)');
  if (allTabs[_MPLC_TAB_ACTIVA]) {
    var dot = allTabs[_MPLC_TAB_ACTIVA].querySelector('.mplc-tab-dot');
    allTabs[_MPLC_TAB_ACTIVA].innerHTML = '';
    if (dot) allTabs[_MPLC_TAB_ACTIVA].appendChild(dot);
    allTabs[_MPLC_TAB_ACTIVA].appendChild(document.createTextNode(val));
  }
}

/* ─── cambiar color ───────────────────────────────────────────── */
function _mplcCambiarColor(color) {
  PLCS[_MPLC_TAB_ACTIVA].color = color;
  _mplcRenderizarModal();
}

/* ─── añadir PLC ──────────────────────────────────────────────── */
function _mplcAnadirPlc() {
  _mplcLeerFormulario();
  var idx = PLCS.length;
  PLCS.push({ label: 'PLC-' + (idx + 1), ip: '', user: 'Admin', pass: '', color: _mplcColor(idx), anon: true });
  _MPLC_TAB_ACTIVA = idx;
  _mplcRenderizarModal();
}

/* ─── eliminar PLC ────────────────────────────────────────────── */
function _mplcEliminarPlc(idx) {
  if (PLCS.length <= 1) return;
  if (!confirm('¿Eliminar ' + PLCS[idx].label + '?\nLos elementos asignados quedarán en PLC-1.')) return;
  ELEMENTOS.forEach(function(el) {
    var pi = el.props.plcIdx || 0;
    if (pi === idx) el.props.plcIdx = 0;
    else if (pi > idx) el.props.plcIdx = pi - 1;
  });
  PLCS.splice(idx, 1);
  PLC = PLCS[0];
  _MPLC_TAB_ACTIVA = Math.min(_MPLC_TAB_ACTIVA, PLCS.length - 1);
  _mplcRenderizarModal();
  MODIFICADO = true;
}

/* ─── guardar y cerrar ────────────────────────────────────────── */
function guardarPlc() {
  _mplcLeerFormulario();
  PLC = PLCS[0];
  _mplcActualizarPildora();
  cerrarModal('modal-plc');
  var con = PLCS.filter(function(p) { return p.ip; }).length;
  mostrarToast(con ? (con + ' PLC' + (con > 1 ? 's' : '') + ' configurado' + (con > 1 ? 's' : '')) : 'PLCs guardados');
  MODIFICADO = true;
}
