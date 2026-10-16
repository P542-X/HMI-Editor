/* =================================================================
   ARRASTRE
================================================================= */
document.querySelectorAll('.comp-card[data-tipo]').forEach(function(card) {
  card.addEventListener('dragstart', function(e) {
    TIPO_ARRASTRE = card.dataset.tipo;
    e.dataTransfer.setData('text/plain', TIPO_ARRASTRE);
  });
});

function permitirSoltar(e) { e.preventDefault(); }

function soltarElemento(e) {
  e.preventDefault();
  /* Recuperar tipo desde dataTransfer si el global se perdió */
  if (!TIPO_ARRASTRE) {
    TIPO_ARRASTRE = e.dataTransfer.getData('text/plain') || null;
  }
  if (!TIPO_ARRASTRE) return;
  var rect = document.getElementById('cwrap').getBoundingClientRect();
  var x = ajustarRed(e.clientX - rect.left);
  var y = ajustarRed(e.clientY - rect.top);
  var sz = TAMANIOS[TIPO_ARRASTRE] || [150, 48];
  var props = JSON.parse(JSON.stringify(PROPS_DEFAULT[TIPO_ARRASTRE] || {}));
  agregarElemento({ id: 'el' + (++CONTADOR_ID), tipo: TIPO_ARRASTRE, x: x, y: y, w: sz[0], h: sz[1], props: props });
  TIPO_ARRASTRE = null;
}

function ajustarRed(v) {
  if (!SNAP_ACTIVO || SNAP_PX <= 1) return Math.max(0, Math.round(v));
  return Math.max(0, Math.round(v / SNAP_PX) * SNAP_PX);
}

function agregarElemento(el) {
  ELEMENTOS.push(el);
  renderizarElemento(el);
  establecerSeleccion([el.id]);
  guardarHistorial();
  actualizarContador();
  MODIFICADO = true;
  if (typeof refrescarPanelSim === 'function') refrescarPanelSim();
}

