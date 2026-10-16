/* =================================================================
   SELECCIÓN POR CAJA
================================================================= */
document.getElementById('cstage').addEventListener('mousedown', function(e) {
  if (e.target !== this && e.target.id !== 'selbox') return;
  establecerSeleccion([]);
  var cstage = document.getElementById('cstage');
  var cinner = document.getElementById('cinner');

  /* Coordenadas en espacio del canvas (absolutas, incluyendo scroll).
     getBoundingClientRect() devuelve coords en viewport (ya afectadas
     por el scroll del propio cinner). Para obtener la posición real
     dentro del canvas descontamos el origen del contenedor visible y
     sumamos el scroll interno del mismo. */
  /* Recalcular el rect en cada llamada para que el scroll y cualquier
     reflow del layout no desfasen las coordenadas */
  function clientToCanvas(clientX, clientY) {
    var r = cinner.getBoundingClientRect();
    return {
      x: clientX - r.left + cinner.scrollLeft,
      y: clientY - r.top  + cinner.scrollTop
    };
  }

  /* sx/sy = coordenadas en espacio canvas (para filtrar elementos) */
  var start = clientToCanvas(e.clientX, e.clientY);
  var sx = start.x, sy = start.y;

  var box = document.getElementById('selbox');
  box.style.display = 'block';
  /* selbox vive dentro de cstage — posicionarlo en coords de canvas */
  box.style.left   = sx + 'px';
  box.style.top    = sy + 'px';
  box.style.width  = '0';
  box.style.height = '0';

  function alMover(ev) {
    var cur = clientToCanvas(ev.clientX, ev.clientY);
    var cx = cur.x, cy = cur.y;
    /* coordenadas canvas para filtrar */
    var x1 = Math.min(sx, cx), y1 = Math.min(sy, cy);
    var x2 = Math.max(sx, cx), y2 = Math.max(sy, cy);
    /* selbox en coords canvas (cstage tiene mismo sistema de coords que los elementos) */
    box.style.left   = x1 + 'px';
    box.style.top    = y1 + 'px';
    box.style.width  = (x2 - x1) + 'px';
    box.style.height = (y2 - y1) + 'px';
    SELECCION = ELEMENTOS
      .filter(function(el) { return el.x+el.w>x1 && el.x<x2 && el.y+el.h>y1 && el.y<y2; })
      .map(function(el) { return el.id; });
    document.querySelectorAll('.hel').forEach(function(d) {
      d.classList.toggle('msel', SELECCION.includes(d.id));
    });
    document.getElementById('align-bar').style.display = SELECCION.length > 1 ? 'flex' : 'none';
  }
  function alSoltar() {
    box.style.display = 'none';
    if (SELECCION.length > 0) establecerSeleccion(SELECCION);
    document.removeEventListener('mousemove', alMover);
    document.removeEventListener('mouseup', alSoltar);
  }
  document.addEventListener('mousemove', alMover);
  document.addEventListener('mouseup', alSoltar);
});

