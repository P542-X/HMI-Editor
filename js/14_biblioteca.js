/* =================================================================
   BIBLIOTECA — TOGGLE Y BÚSQUEDA
================================================================= */
function toggleCat(id) {
  var cat = document.getElementById(id);
  if (!cat) return;
  cat.classList.toggle('open');
}

function filtrarBiblioteca(query) {
  var q = query.toLowerCase().trim();
  var cats = document.querySelectorAll('.lib-cat');
  cats.forEach(function(cat) {
    var cards = cat.querySelectorAll('.comp-card:not(.soon)');
    var hayVisible = false;
    cards.forEach(function(card) {
      var texto = card.textContent.toLowerCase();
      var visible = !q || texto.includes(q);
      card.style.display = visible ? '' : 'none';
      if (visible) hayVisible = true;
    });
    /* Si hay búsqueda activa: abrir categorías con resultados */
    if (q) {
      if (hayVisible) cat.classList.add('open');
      cat.style.display = hayVisible ? '' : 'none';
    } else {
      cat.style.display = '';
    }
  });
}

