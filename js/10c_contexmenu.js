/* =================================================================
   MENÚ CONTEXTUAL — click derecho en cualquier punto del canvas
================================================================= */

(function () {

  /* ── DOM del menú ── */
  var menu = document.createElement('div');
  menu.id = 'ctx-menu';
  menu.style.cssText = [
    'position:fixed',
    'z-index:99999',
    'min-width:200px',
    'background:var(--panel2)',
    'border:1px solid rgba(230,232,236,.16)',
    'border-radius:6px',
    'box-shadow:0 8px 32px rgba(0,0,0,.6)',
    'padding:5px 0',
    'font-family:DM Sans,sans-serif',
    'font-size:12px',
    'display:none',
    'user-select:none'
  ].join(';');
  document.body.appendChild(menu);

  /* ── CSS ── */
  var style = document.createElement('style');
  style.textContent =
    '.ctx-item{display:flex;align-items:center;gap:9px;padding:7px 16px 7px 12px;cursor:pointer;color:var(--light);transition:background .1s}' +
    '.ctx-item:hover:not(.ctx-dis){background:var(--panel3);color:var(--text)}' +
    '.ctx-item.ctx-dis{opacity:.3;pointer-events:none;cursor:default}' +
    '.ctx-ico{width:16px;text-align:center;font-size:13px;flex-shrink:0;opacity:.8}' +
    '.ctx-lbl{flex:1}' +
    '.ctx-atajo{font-family:DM Mono,monospace;font-size:9px;color:var(--mid);letter-spacing:.5px;white-space:nowrap}' +
    '.ctx-sep{height:1px;background:var(--panel3);margin:4px 0}' +
    '.ctx-group{padding:4px 12px 2px;font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:var(--mid);text-transform:uppercase}';
  document.head.appendChild(style);

  /* ── Helpers ── */
  function item(ico, label, atajo, id, dis) {
    return '<div class="ctx-item' + (dis ? ' ctx-dis' : '') + '" data-action="' + id + '">' +
      '<span class="ctx-ico">' + ico + '</span>' +
      '<span class="ctx-lbl">' + label + '</span>' +
      (atajo ? '<span class="ctx-atajo">' + atajo + '</span>' : '') +
      '</div>';
  }
  function sep()   { return '<div class="ctx-sep"></div>'; }
  function group(t){ return '<div class="ctx-group">' + t + '</div>'; }

  /* ── Construir contenido ── */
  function buildMenu() {
    var n      = SELECCION.length;
    var single = n === 1;
    var any    = n >= 1;
    var hasCb  = !!CLIPBOARD;

    menu.innerHTML =
      group('Portapapeles') +
      item('⎘', 'Copiar',   'Ctrl+C', 'copy',  !any) +
      item('⧉', 'Duplicar', 'Ctrl+D', 'dup',   !single) +
      item('⎗', 'Pegar',    'Ctrl+V', 'paste', !hasCb) +
      sep() +
      group('Capas') +
      item('▲▲', 'Traer al frente', 'Ctrl+Shift+↑', 'front', !any) +
      item('▲',  'Subir una capa',  'Ctrl+↑',        'up',   !any) +
      item('▼',  'Bajar una capa',  'Ctrl+↓',        'down', !any) +
      item('▼▼', 'Enviar al fondo', 'Ctrl+Shift+↓', 'back', !any) +
      sep() +
      item('✕', 'Eliminar', 'Del', 'del', !any);
  }

  /* ── Mostrar ── */
  function show(x, y) {
    buildMenu();
    menu.style.display = 'block';
    var mw = menu.offsetWidth  || 210;
    var mh = menu.offsetHeight || 280;
    menu.style.left = Math.min(x + 2, window.innerWidth  - mw - 8) + 'px';
    menu.style.top  = Math.min(y + 2, window.innerHeight - mh - 8) + 'px';
  }
  function hide() { menu.style.display = 'none'; }

  /* ── Acciones ── */
  var ACTIONS = {
    copy:  function() { copiarElementos(); },
    dup:   function() { if (SELECCION.length === 1) duplicarElemento(SELECCION[0]); },
    paste: function() { pegarElementos(); },
    front: function() { traerAlFrente(); },
    up:    function() { subirCapa(); },
    down:  function() { bajarCapa(); },
    back:  function() { enviarAlFondo(); },
    del:   function() { eliminarSeleccion(); },
  };

  menu.addEventListener('mousedown', function(e) { e.stopPropagation(); });
  menu.addEventListener('click', function(e) {
    var it = e.target.closest('.ctx-item');
    if (!it) return;
    hide();
    if (ACTIONS[it.dataset.action]) ACTIONS[it.dataset.action]();
  });

  /* ── Enganche: todo el área del canvas (cwrap) ── */
  document.getElementById('cwrap').addEventListener('contextmenu', function(e) {
    e.preventDefault();
    /* Si hizo click sobre un elemento → seleccionarlo si no lo está */
    var elDiv = e.target.closest('.hel');
    if (elDiv && !SELECCION.includes(elDiv.id)) {
      establecerSeleccion([elDiv.id]);
    }
    /* Si hizo click en zona vacía → deseleccionar todo */
    if (!elDiv) {
      establecerSeleccion([]);
    }
    show(e.clientX, e.clientY);
  });

  /* Cerrar con click fuera, Escape o scroll */
  document.addEventListener('mousedown', function(e) { if (!menu.contains(e.target)) hide(); });
  document.addEventListener('keydown',   function(e) { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', hide, true);

})();

/* ── Copiar / Pegar ─────────────────────────────────────────── */
function copiarElementos() {
  if (!SELECCION.length) return;
  CLIPBOARD = SELECCION.map(function(id) {
    return JSON.parse(JSON.stringify(ELEMENTOS.find(function(e) { return e.id === id; })));
  }).filter(Boolean);
  mostrarToast('Copiado (' + CLIPBOARD.length + ')');
}

function pegarElementos() {
  if (!CLIPBOARD || !CLIPBOARD.length) return;
  establecerSeleccion([]);
  var nuevosIds = [];
  CLIPBOARD.forEach(function(src) {
    var copia = JSON.parse(JSON.stringify(src));
    copia.id  = 'el' + (++CONTADOR_ID);
    copia.x  += 24;
    copia.y  += 24;
    agregarElemento(copia);
    nuevosIds.push(copia.id);
  });
  establecerSeleccion(nuevosIds);
  /* Actualizar portapapeles para poder pegar en cadena */
  CLIPBOARD = nuevosIds.map(function(id) {
    return JSON.parse(JSON.stringify(ELEMENTOS.find(function(e) { return e.id === id; })));
  });
  mostrarToast('Pegado (' + nuevosIds.length + ')');
}
