/* =================================================================
   ROTAR ELEMENTO
   · Drag desde el handle .rrot (esquina superior izquierda)
   · Calcula ángulo respecto al centro del elemento
   · Shift = snap a múltiplos de 15°
   · El campo ROTACIÓN del panel se actualiza en tiempo real
================================================================= */
function iniciarRotacion(e, id) {
  e.preventDefault();
  e.stopPropagation();

  var el = ELEMENTOS.find(function(x) { return x.id === id; });
  if (!el) return;

  if (!SELECCION.includes(id)) establecerSeleccion([id]);

  var div = document.getElementById(id);
  if (!div) return;

  /* Centro del elemento en coordenadas de página */
  var rect = div.getBoundingClientRect();
  var cx = rect.left + rect.width  / 2;
  var cy = rect.top  + rect.height / 2;

  /* Ángulo inicial acumulado (para delta incremental) */
  var rotBase = (el.props && el.props.rotation) ? Number(el.props.rotation) : 0;
  /* Ángulo del ratón al inicio respecto al centro */
  var angInicio = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;

  function alMover(ev) {
    var angActual = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
    var delta = angActual - angInicio;
    var rot   = rotBase + delta;

    /* Snap a 15° con Shift */
    if (ev.shiftKey) rot = Math.round(rot / 15) * 15;

    /* Normalizar a [0, 360) */
    rot = ((rot % 360) + 360) % 360;

    el.props = el.props || {};
    el.props.rotation = rot;

    /* Aplicar visualmente sin re-renderizar todo */
    div.style.transform       = 'rotate(' + rot + 'deg)';
    div.style.transformOrigin = 'center center';

    /* Actualizar campo en panel si está visible */
    var inp = document.getElementById('pi-rot');
    if (inp) inp.value = Math.round(rot);
  }

  function alSoltar() {
    document.removeEventListener('mousemove', alMover);
    document.removeEventListener('mouseup',   alSoltar);
    guardarHistorial();
    MODIFICADO = true;
    /* Actualizar panel completo para reflejar valor exacto */
    if (SELECCION.length === 1) {
      var elFin = ELEMENTOS.find(function(x) { return x.id === SELECCION[0]; });
      if (elFin) construirPropiedades(elFin);
    }
  }

  document.addEventListener('mousemove', alMover);
  document.addEventListener('mouseup',   alSoltar);
}

/* ── Aplicar rotación directamente (desde panel de propiedades) ── */
function aplicarRotacion(id, grados) {
  var el = ELEMENTOS.find(function(x) { return x.id === id; });
  if (!el) return;
  el.props = el.props || {};
  var rot = ((Number(grados) % 360) + 360) % 360;
  el.props.rotation = rot;
  var div = document.getElementById(id);
  if (div) {
    div.style.transform       = rot ? 'rotate(' + rot + 'deg)' : '';
    div.style.transformOrigin = 'center center';
  }
  guardarHistorial();
  MODIFICADO = true;
}

/* ── Resetear rotación ── */
function resetRotacion(id) {
  aplicarRotacion(id, 0);
  var inp = document.getElementById('pi-rot');
  if (inp) inp.value = 0;
}
