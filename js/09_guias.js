/* =================================================================
   GUÍAS DE ALINEACIÓN
================================================================= */
function mostrarGuias() {
  ocultarGuias();
  if (SELECCION.length !== 1) return;
  var el = ELEMENTOS.find(function(e) { return e.id === SELECCION[0]; });
  if (!el) return;
  var stage = document.getElementById('cstage');
  ELEMENTOS.forEach(function(o) {
    if (o.id === el.id) return;
    if (Math.abs((el.y + el.h/2) - (o.y + o.h/2)) < 4) {
      var g = document.createElement('div'); g.className = 'guide guide-h'; g.style.top = (el.y + el.h/2) + 'px'; stage.appendChild(g);
    }
    if (Math.abs((el.x + el.w/2) - (o.x + o.w/2)) < 4) {
      var g2 = document.createElement('div'); g2.className = 'guide guide-v'; g2.style.left = (el.x + el.w/2) + 'px'; stage.appendChild(g2);
    }
  });
}
function ocultarGuias() { document.querySelectorAll('.guide').forEach(function(g) { g.remove(); }); }

