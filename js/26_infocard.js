/* =================================================================
   INFO-CARD — Popup de información PLC al hacer click
================================================================= */

function abrirInfoCardPopup(id) {
  /* En modo diseño: solo abrir si no hay drag activo y no está en modo lupa */
  if (typeof MODO_LUPA !== 'undefined' && MODO_LUPA) return;
  var el = ELEMENTOS.find(function(e) { return e.id === id; });
  if (!el) return;

  cerrarInfoCardPopup();

  var p    = el.props || {};
  var rows = [];
  for (var ri = 1; ri <= 6; ri++) {
    var rk = p['rkey' + ri] || '', rv = p['rval' + ri] || '';
    if (rk || rv) rows.push({ key: rk, val: rv, color: p['rcol' + ri] || 'blue' });
  }

  /* ── Construir HTML ── */
  var rowsHtml = '';
  if (rows.length === 0) {
    rowsHtml = '<div style="color:var(--mid);font-size:10px;padding:8px 0">Sin datos configurados.<br>Selecciona el elemento y edita sus propiedades.</div>';
  } else {
    /* Agrupar secciones: variables PLC primero */
    rowsHtml += '<div class="icp-section-title">VARIABLES / DATOS</div>';
    rows.forEach(function(r) {
      var dotCls = 'icp-dot ' + (r.color || 'blue');
      rowsHtml +=
        '<div class="icp-row">' +
          '<div class="' + dotCls + '"></div>' +
          '<div class="icp-key">' + escHtml(r.key || '—') + '</div>' +
          '<div class="icp-val" onclick="copiarInfoCard(this)" title="Click para copiar">' + escHtml(r.val || '—') + '</div>' +
        '</div>';
    });
  }

  /* Notas */
  var notesHtml = '';
  if (p.notes && p.notes.trim()) {
    notesHtml = '<div class="icp-section-title">NOTAS</div><div class="icp-notes">' + escHtml(p.notes) + '</div>';
  }

  var badgeHtml = p.badge ? ' · <span style="color:#1565c0">' + escHtml(p.badge) + '</span>' : '';

  var popup = document.createElement('div');
  popup.id = 'infocard-popup';
  popup.innerHTML =
    '<div class="icp-hdr">' +
      '<div class="icp-hdr-ico">' + escHtml(p.icon || '\u24d8') + '</div>' +
      '<div class="icp-hdr-info">' +
        '<div class="icp-hdr-title">' + escHtml(p.title || 'INFO CARD') + '</div>' +
        '<div class="icp-hdr-sub">' + escHtml(el.id) + badgeHtml + '</div>' +
      '</div>' +
      '<button class="icp-close" onclick="cerrarInfoCardPopup()">&#x2715;</button>' +
    '</div>' +
    '<div class="icp-body">' + rowsHtml + notesHtml + '</div>' +
    '<div class="icp-footer">' +
      '<span class="icp-footer-id">' + escHtml(el.id) + ' &middot; ' + escHtml(el.tipo) + '</span>' +
      '<span>' + el.w + '&times;' + el.h + 'px</span>' +
    '</div>';

  document.body.appendChild(popup);

  /* Posicionar */
  var div = document.getElementById(id);
  var rect = div ? div.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 };
  var pw = 320, ph = popup.offsetHeight || 260;
  var vw = window.innerWidth, vh = window.innerHeight;
  var left = rect.right + 12;
  var top  = rect.top;
  if (left + pw > vw - 8)  left = rect.left - pw - 12;
  if (left < 8)            left = 8;
  if (top + ph > vh - 8)  top  = vh - ph - 8;
  if (top < 8)             top  = 8;
  popup.style.left = left + 'px';
  popup.style.top  = top  + 'px';

  requestAnimationFrame(function() { popup.classList.add('visible'); });
}

function cerrarInfoCardPopup() {
  var old = document.getElementById('infocard-popup');
  if (old) old.remove();
}

function copiarInfoCard(el) {
  var txt = el.textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(txt).then(function() {
      mostrarToast('\u{1F4CB} Copiado: ' + txt);
    });
  }
  el.classList.add('copied');
  setTimeout(function() { el.classList.remove('copied'); }, 700);
}

/* Cerrar con click fuera o Escape */
document.addEventListener('mousedown', function(e) {
  var popup = document.getElementById('infocard-popup');
  if (popup && !popup.contains(e.target)) cerrarInfoCardPopup();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') cerrarInfoCardPopup();
});
