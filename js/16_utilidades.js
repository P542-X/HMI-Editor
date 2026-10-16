/* =================================================================
   UTILIDADES
================================================================= */
function actualizarContador() { document.getElementById('si-count').textContent = ELEMENTOS.length; }

function mostrarToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 1600);
}

function cambiarFondo(el) {
  document.querySelectorAll('.bg-opt').forEach(function(b) { b.classList.remove('sel'); });
  el.classList.add('sel');
  FONDO_CANVAS = el.dataset.bg;
  /* Aplicar fondo en cwrap (detrás de cgrid) para que coexista con la cuadrícula */
  var cwrap = document.getElementById('cwrap');
  if (cwrap) cwrap.style.background = FONDO_CANVAS;
  MODIFICADO = true;
}

function nuevoCanvas() {
  if (MODIFICADO && ELEMENTOS.length > 0 && !confirm('Cambios sin guardar. Continuar?')) return;
  ELEMENTOS = []; CONTADOR_ID = 0; MODIFICADO = false;
  document.getElementById('cstage').innerHTML = '<div id="selbox"></div>';
  establecerSeleccion([]); actualizarContador(); guardarHistorial();
  if (typeof refrescarPanelSim === 'function') refrescarPanelSim();
  mostrarToast('Canvas limpio');
}



/* ── Toggle menú resolución ── */
function toggleResMenu() {
  var m = document.getElementById('res-menu');
  m.style.display = m.style.display === 'none' ? 'block' : 'none';
}
document.addEventListener('click', function(e) {
  var btn = document.getElementById('res-tb-btn');
  var menu = document.getElementById('res-menu');
  if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.style.display = 'none';
  }
});


/* ── Snap / Grid ── */
function toggleSnap() {
  SNAP_ACTIVO = !SNAP_ACTIVO;
  var btn = document.getElementById('btn-snap');
  if (btn) {
    btn.classList.toggle('activo', SNAP_ACTIVO);
    btn.title = SNAP_ACTIVO ? 'Snap ON — click para desactivar (S)' : 'Snap OFF — click para activar (S)';
  }
  /* Si se desactiva snap, forzar grid visual a off */
  actualizarCuadricula();
  mostrarToast(SNAP_ACTIVO ? '⊞ Snap ON · Grid ' + SNAP_PX + 'px' : '⊟ Snap OFF · Movimiento libre');
}

function cambiarGrid(valor) {
  SNAP_PX = parseInt(valor) || 8;
  if (SNAP_PX <= 1) {
    SNAP_ACTIVO = false;
    var btn = document.getElementById('btn-snap');
    if (btn) btn.classList.remove('activo');
  } else {
    SNAP_ACTIVO = true;
    var btn = document.getElementById('btn-snap');
    if (btn) btn.classList.add('activo');
  }
  actualizarCuadricula();
  mostrarToast(SNAP_PX <= 1 ? '⊟ Movimiento libre (1px)' : '⊞ Grid ' + SNAP_PX + 'px');
}

function actualizarCuadricula() {
  var grid = document.getElementById('cgrid');
  if (!grid) return;
  if (!SNAP_ACTIVO || SNAP_PX <= 1) {
    grid.style.backgroundImage = 'none';
    grid.style.backgroundSize  = '';
    return;
  }
  var px = SNAP_PX;
  grid.style.backgroundImage =
    'radial-gradient(circle, rgba(0,0,0,0.22) ' + Math.max(1, px * 0.18) + 'px, transparent 0)';
  grid.style.backgroundSize = px + 'px ' + px + 'px';
}

/* Atajo de teclado S para toggle snap */
document.addEventListener('keydown', function(e) {
  if (e.key === 's' || e.key === 'S') {
    /* No activar si el foco está en un input / textarea */
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'SELECT')) return;
    toggleSnap();
  }
});
