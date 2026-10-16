/* =================================================================
   ALINEAR Y DISTRIBUIR
================================================================= */
function alinearElementos(modo) {
  if (SELECCION.length < 2) return;
  var els = SELECCION.map(function(id) { return ELEMENTOS.find(function(e) { return e.id === id; }); }).filter(Boolean);
  var minX = Math.min.apply(null, els.map(function(e){return e.x;}));
  var maxX = Math.max.apply(null, els.map(function(e){return e.x+e.w;}));
  var minY = Math.min.apply(null, els.map(function(e){return e.y;}));
  var maxY = Math.max.apply(null, els.map(function(e){return e.y+e.h;}));
  els.forEach(function(el) {
    if      (modo==='izq')      el.x = minX;
    else if (modo==='der')      el.x = maxX - el.w;
    else if (modo==='centro-h') el.x = Math.round((minX+maxX)/2 - el.w/2);
    else if (modo==='arr')      el.y = minY;
    else if (modo==='abj')      el.y = maxY - el.h;
    else if (modo==='centro-v') el.y = Math.round((minY+maxY)/2 - el.h/2);
    var d = document.getElementById(el.id);
    if (d) { d.style.left = el.x+'px'; d.style.top = el.y+'px'; }
  });
  guardarHistorial(); MODIFICADO = true; mostrarToast('Alineado');
}

function distribuirElementos(eje) {
  if (SELECCION.length < 3) return;
  var els = SELECCION.map(function(id) { return ELEMENTOS.find(function(e) { return e.id === id; }); }).filter(Boolean);
  if (eje === 'h') {
    els.sort(function(a,b){return a.x-b.x;});
    var totalW = els.reduce(function(s,e){return s+e.w;},0);
    var gap = (els[els.length-1].x + els[els.length-1].w - els[0].x - totalW) / (els.length-1);
    var cx = els[0].x;
    els.forEach(function(el){ el.x=Math.round(cx); var d=document.getElementById(el.id);if(d)d.style.left=el.x+'px'; cx+=el.w+gap; });
  } else {
    els.sort(function(a,b){return a.y-b.y;});
    var totalH = els.reduce(function(s,e){return s+e.h;},0);
    var gapV = (els[els.length-1].y + els[els.length-1].h - els[0].y - totalH) / (els.length-1);
    var cy = els[0].y;
    els.forEach(function(el){ el.y=Math.round(cy); var d=document.getElementById(el.id);if(d)d.style.top=el.y+'px'; cy+=el.h+gapV; });
  }
  guardarHistorial(); MODIFICADO = true; mostrarToast('Distribuido');
}

