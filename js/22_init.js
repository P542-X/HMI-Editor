/* =================================================================
   AVISO AL SALIR
================================================================= */
window.addEventListener('beforeunload', function(e) {
  if (MODIFICADO && ELEMENTOS.length > 0) { e.preventDefault(); e.returnValue = ''; }
});

/* =================================================================
   INICIALIZACIÓN
================================================================= */
guardarHistorial();
actualizarMarcoResolucion();
/* Aplicar fondo inicial en cwrap y pintar la cuadrícula */
(function() {
  var cwrap = document.getElementById('cwrap');
  if (cwrap) cwrap.style.background = FONDO_CANVAS;
  actualizarCuadricula();
})();

