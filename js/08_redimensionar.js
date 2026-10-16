/* =================================================================
   REDIMENSIONAR
================================================================= */
function iniciarRedimension(e, id) {
  e.preventDefault(); e.stopPropagation();
  var el = ELEMENTOS.find(function(x) { return x.id === id; });
  if (!el) return;
  var sx = e.clientX, sy = e.clientY, sw = el.w, sh = el.h;
  function alMover(ev) {
    var rawW = sw + ev.clientX - sx;
    var rawH = sh + ev.clientY - sy;
    el.w = Math.max(8, ajustarRed(rawW));
    el.h = Math.max(8, ajustarRed(rawH));
    var d = document.getElementById(id);
    if (d) { d.style.width = el.w + 'px'; d.style.height = el.h + 'px'; }
    if (el.tipo === 'btn-dpad' && d) {
      var f = Math.max(10, Math.round(el.h / 6)) + 'px';
      d.querySelectorAll('.dpb').forEach(function(b) { b.style.fontSize = f; });
    }
    if (el.tipo === 'status-led' && d) {
      var led = d.querySelector('.hstatus');
      if (led) { var diam = Math.min(el.w, el.h) - 8; led.style.width = diam+'px'; led.style.height = diam+'px'; }
    }
    actualizarTamPanel(el);
  }
  function alSoltar() {
    guardarHistorial(); MODIFICADO = true;
    document.removeEventListener('mousemove', alMover);
    document.removeEventListener('mouseup', alSoltar);
  }
  document.addEventListener('mousemove', alMover);
  document.addEventListener('mouseup', alSoltar);
}

