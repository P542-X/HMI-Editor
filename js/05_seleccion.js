/* =================================================================
   SELECCIÓN
================================================================= */
function establecerSeleccion(ids) {
  SELECCION = ids || [];
  document.querySelectorAll('.hel').forEach(function(d) {
    d.classList.toggle('sel',  SELECCION.length === 1 && SELECCION.includes(d.id));
    d.classList.toggle('msel', SELECCION.length > 1  && SELECCION.includes(d.id));
  });
  document.getElementById('align-bar').style.display = SELECCION.length > 1 ? 'flex' : 'none';
  if (SELECCION.length === 1) {
    var el = ELEMENTOS.find(function(e) { return e.id === SELECCION[0]; });
    if (el) construirPropiedades(el);
    document.getElementById('si-sel').textContent = SELECCION[0];
  } else {
    document.getElementById('rp-vacio').style.display = 'flex';
    document.getElementById('rp-props').innerHTML = '';
    document.getElementById('si-sel').textContent = SELECCION.length > 1 ? SELECCION.length + ' el.' : '-';
    document.getElementById('si-pos').textContent  = '';
    document.getElementById('si-size').textContent = '';
  }
}

function alternarSeleccion(id) {
  if (SELECCION.includes(id)) establecerSeleccion(SELECCION.filter(function(i) { return i !== id; }));
  else establecerSeleccion(SELECCION.concat([id]));
}

function seleccionarTodo() {
  establecerSeleccion(ELEMENTOS.map(function(e) { return e.id; }));
}

