/* =================================================================
   MODALES
================================================================= */
function abrirModal(id)  { document.getElementById(id).classList.add('show'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('show'); }

/* ── Alarm-array name editor ── */
var _alarmNamesElId = null;
function abrirEditorNombres(elId) {
  var el = ELEMENTOS.find(function(e) { return e.id === elId; });
  if (!el) return;
  _alarmNamesElId = elId;
  var ta = document.getElementById('alarm-names-ta');
  ta.value = el.props.names || '';
  actualizarConteoNombres();
  ta.oninput = actualizarConteoNombres;
  abrirModal('modal-alarm-names');
}
function actualizarConteoNombres() {
  var ta = document.getElementById('alarm-names-ta');
  var n = (ta.value || '').split('\n').filter(function(s){ return s.trim(); }).length;
  var cnt = document.getElementById('alarm-names-count');
  if (cnt) cnt.textContent = n + ' nombre' + (n !== 1 ? 's' : '') + ' configurado' + (n !== 1 ? 's' : '');
}
function guardarNombresAlarmas() {
  if (!_alarmNamesElId) return;
  var el = ELEMENTOS.find(function(e) { return e.id === _alarmNamesElId; });
  if (!el) return;
  el.props.names = document.getElementById('alarm-names-ta').value;
  rerenderizar(_alarmNamesElId);
  construirPropiedades(el);
  guardarHistorial(); MODIFICADO = true;
  cerrarModal('modal-alarm-names');
  mostrarToast('Nombres guardados');
}


/* ── Alarm-list (TIA Portal style) name+var editor ── */
var _alarmListElId = null;
function abrirEditorAlarmasList(elId) {
  var el = ELEMENTOS.find(function(e) { return e.id === elId; });
  if (!el) return;
  _alarmListElId = elId;
  var taN = document.getElementById('allist-names-ta');
  var taV = document.getElementById('allist-vars-ta');
  taN.value = el.props.alNames || '';
  taV.value = el.props.alVars  || '';
  actualizarConteoAlarmasList();
  taN.oninput = actualizarConteoAlarmasList;
  taV.oninput = actualizarConteoAlarmasList;
  abrirModal('modal-allist-editor');
}
function actualizarConteoAlarmasList() {
  var taN = document.getElementById('allist-names-ta');
  var n = (taN.value || '').split('\n').filter(function(s){ return s.trim(); }).length;
  var cnt = document.getElementById('allist-count');
  if (cnt) cnt.textContent = n + ' alarma' + (n !== 1 ? 's' : '') + ' configurada' + (n !== 1 ? 's' : '');
}
function guardarAlarmasList() {
  if (!_alarmListElId) return;
  var el = ELEMENTOS.find(function(e) { return e.id === _alarmListElId; });
  if (!el) return;
  el.props.alNames = document.getElementById('allist-names-ta').value;
  el.props.alVars  = document.getElementById('allist-vars-ta').value;
  rerenderizar(_alarmListElId);
  construirPropiedades(el);
  guardarHistorial(); MODIFICADO = true;
  cerrarModal('modal-allist-editor');
  mostrarToast('Alarmas guardadas');
}
document.querySelectorAll('.mov').forEach(function(m) {
  m.addEventListener('click', function(e) { if (e.target === m) m.classList.remove('show'); });
});

/* ── Editor de nombres para alarm-word ─────────────────────── */
var _awEditId = null;
var _awEditWordIdx = 0;

function abrirEditorWordAlarmas(elId, wordIdx) {
  _awEditId = elId;
  _awEditWordIdx = wordIdx;
  var el = ELEMENTOS.find(function(e){ return e.id === elId; });
  if (!el) return;
  var key = 'wnames' + wordIdx;
  var names = (el.props[key] || '').split('\n');
  while (names.length < 16) names.push('');
  names = names.slice(0, 16);
  
  var ta = document.getElementById('alarm-names-ta');
  var title = document.getElementById('alarm-names-title');
  if (ta) ta.value = names.join('\n');
  if (title) title.textContent = 'NOMBRES — WORD ' + wordIdx + ' (bits 0-15)';
  
  // Guardar con la key correcta al cerrar
  var saveBtn = document.getElementById('alarm-names-save-btn');
  if (saveBtn) saveBtn.onclick = function() { guardarWordAlarmas(); };
  
  abrirModal('modal-alarm-names');
  if (ta) { ta.focus(); actualizarConteoNombres(); }
}

function guardarWordAlarmas() {
  var el = ELEMENTOS.find(function(e){ return e.id === _awEditId; });
  if (!el) return;
  var ta = document.getElementById('alarm-names-ta');
  if (!ta) return;
  var key = 'wnames' + _awEditWordIdx;
  el.props[key] = ta.value;
  rerenderizarTodos();
  cerrarModal('modal-alarm-names');
  mostrarToast('Nombres guardados — Word ' + _awEditWordIdx);
  MODIFICADO = true;
}
/* ── Importar CSV de TIA Portal para alarm-word ─────────────── */
/* TIA Portal exporta alarmas en CSV con columnas:
   Número | Texto del mensaje | Tag de disparo | Número de bit
   El usuario exporta desde: TIA Portal → Alarmas → Exportar → CSV/Excel */

function awImportarCSV(elId) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.txt,.xlsx';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      awParsearCSV(elId, ev.target.result, file.name);
    };
    reader.readAsText(file, 'UTF-8');
  };
  input.click();
}

function awParsearCSV(elId, contenido, nombreArchivo) {
  var el = ELEMENTOS.find(function(e){ return e.id === elId; });
  if (!el) return;
  
  var wordVars = (el.props.words || '').split('\n')
    .map(function(s){ return s.trim(); }).filter(function(s){ return s; });
  
  if (wordVars.length === 0) {
    alert('Primero define las variables WORD en el panel de propiedades.');
    return;
  }
  
  /* Parsear CSV — detectar separador automáticamente */
  var sep = contenido.indexOf(';') > contenido.indexOf(',') ? ';' : ',';
  var lineas = contenido.split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l; });
  
  /* Intentar detectar qué columnas son texto y bit */
  /* Formatos comunes de TIA Portal export:
     1) Número;Texto;Tag;Bit
     2) ID;AlarmText;Trigger;TriggerBit  
     3) simple: solo texto, una alarma por línea (16 por word) */
  
  var resultado = {}; /* wordIdx → [16 textos] */
  for (var i=0; i<wordVars.length; i++) {
    resultado[i] = new Array(16).fill('');
  }
  
  /* Detectar si tiene cabecera */
  var primeraCelda = lineas[0] ? lineas[0].split(sep)[0].toLowerCase() : '';
  var tieneHeader = primeraCelda === 'número' || primeraCelda === 'id' || 
                   primeraCelda === 'number' || primeraCelda === 'no' ||
                   isNaN(primeraCelda);
  var dataLines = tieneHeader ? lineas.slice(1) : lineas;
  
  var detectado = 'simple';
  var cols = lineas[tieneHeader?1:0] ? lineas[tieneHeader?1:0].split(sep) : [];
  
  /* Intentar detectar formato con columna de bit */
  /* Si tiene 3+ columnas y la última columna de la cabecera contiene "bit" */
  if (tieneHeader && lineas[0]) {
    var hdr = lineas[0].toLowerCase();
    if (hdr.indexOf('bit') !== -1 || hdr.indexOf('número de bit') !== -1) {
      detectado = 'tia-export';
    }
  }
  
  var imported = 0;
  var errores = [];
  
  if (detectado === 'tia-export') {
    /* Formato TIA Portal: Número;Texto;Tag;Bit */
    /* Detectar índice de columnas */
    var hdrCols = lineas[0].split(sep).map(function(c){ return c.toLowerCase().trim(); });
    var idxTexto = -1, idxTag = -1, idxBit = -1;
    hdrCols.forEach(function(c, i) {
      if (c.indexOf('texto') !== -1 || c.indexOf('text') !== -1 || c.indexOf('message') !== -1) idxTexto = i;
      if ((c.indexOf('tag') !== -1 || c.indexOf('variable') !== -1) && c.indexOf('bit') === -1) idxTag = i;
      if (c.indexOf('bit') !== -1 && (c.indexOf('número') !== -1 || c.indexOf('number') !== -1 || c === 'bit')) idxBit = i;
    });
    
    /* Fallback: asumir columnas 1=texto, 2=tag, 3=bit si no se detectaron */
    if (idxTexto === -1) idxTexto = 1;
    if (idxBit === -1) idxBit = 3;
    
    dataLines.forEach(function(linea, li) {
      if (!linea.trim()) return;
      var celdas = linea.split(sep).map(function(c){ return c.replace(/^["\s]+|["\s]+$/g,''); });
      var texto = celdas[idxTexto] || '';
      var tagRaw = celdas[idxTag] || '';
      var bitNum = parseInt(celdas[idxBit]);
      
      if (!texto || isNaN(bitNum) || bitNum < 0 || bitNum > 15) return;
      
      /* Buscar qué Word corresponde al tag */
      var wordIdx = -1;
      for (var wi=0; wi<wordVars.length; wi++) {
        /* Comparar tag normalizado */
        var wv = wordVars[wi].toLowerCase().replace(/[^a-z0-9_.]/g,'');
        var tv = tagRaw.toLowerCase().replace(/[^a-z0-9_.]/g,'');
        if (wv === tv || wv.indexOf(tv) !== -1 || tv.indexOf(wv) !== -1) {
          wordIdx = wi;
          break;
        }
      }
      
      if (wordIdx === -1) {
        /* Si no se encontró tag, asignar secuencialmente */
        wordIdx = Math.floor(imported / 16);
        if (wordIdx >= wordVars.length) return;
      }
      
      resultado[wordIdx][bitNum] = texto;
      imported++;
    });
    
  } else {
    /* Formato simple: una línea = un texto, en orden secuencial (bit 0, 1, 2...) */
    /* Si hay múltiples words, los textos se distribuyen en bloques de 16 */
    dataLines.forEach(function(linea, li) {
      var texto = linea.split(sep)[0].replace(/^["\s]+|["\s]+$/g,'');
      if (!texto) return;
      var wi = Math.floor(li / 16);
      var bi = li % 16;
      if (wi < wordVars.length) {
        resultado[wi][bi] = texto;
        imported++;
      }
    });
  }
  
  /* Guardar resultados */
  for (var wi=0; wi<wordVars.length; wi++) {
    el.props['wnames'+wi] = resultado[wi].join('\n');
  }
  
  rerenderizarTodos();
  mostrarToast('Importados ' + imported + ' textos de ' + nombreArchivo);
  MODIFICADO = true;
  
  /* Refrescar el panel de propiedades */
  if (SELECCION.length === 1 && SELECCION[0].id === elId) {
    renderizarPropiedades(SELECCION[0]);
  }
}

/* ── Editor de texto libre para alarm-word ─────────────────── */
/* Permite editar todos los textos de todas las Words juntos,
   formato: 16 líneas por Word, separadas por ---WORD N--- */

function awImportarTextoLibre(elId) {
  _awEditId = elId;
  var el = ELEMENTOS.find(function(e){ return e.id === elId; });
  if (!el) return;
  
  var wordVars = (el.props.words || '').split('\n')
    .map(function(s){ return s.trim(); }).filter(function(s){ return s; });
  
  if (wordVars.length === 0) {
    alert('Primero define las variables WORD en el panel de propiedades.');
    return;
  }
  
  /* Construir el contenido del textarea con separadores */
  var contenido = wordVars.map(function(wv, wi) {
    var names = (el.props['wnames'+wi] || '').split('\n');
    while (names.length < 16) names.push('');
    names = names.slice(0,16);
    return '=== WORD ' + wi + ': ' + wv + ' ===\n' +
      names.map(function(n,bi){ return 'Bit ' + bi + ': ' + (n||''); }).join('\n');
  }).join('\n\n');
  
  var ta = document.getElementById('alarm-names-ta');
  var title = document.getElementById('alarm-names-title');
  if (ta) ta.value = contenido;
  if (title) title.textContent = 'TEXTOS DE ALARMAS — ' + wordVars.length + ' Word(s) × 16 bits';
  
  /* Instrucción de uso */
  var hint = document.getElementById('alarm-names-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'alarm-names-hint';
    hint.style.cssText = 'font-family:DM Mono,monospace;font-size:9px;color:var(--mid);padding:6px 0 2px;';
    if (ta && ta.parentNode) ta.parentNode.insertBefore(hint, ta);
  }
  hint.textContent = 'Formato: "Bit N: Texto" por línea. Deja vacío para no mostrar ese bit.';
  
  var saveBtn = document.getElementById('alarm-names-save-btn');
  if (saveBtn) saveBtn.onclick = function() { awGuardarTextoLibre(elId); };
  
  abrirModal('modal-alarm-names');
}

function awGuardarTextoLibre(elId) {
  var el = ELEMENTOS.find(function(e){ return e.id === elId; });
  if (!el) return;
  var ta = document.getElementById('alarm-names-ta');
  if (!ta) return;
  
  var wordVars = (el.props.words || '').split('\n')
    .map(function(s){ return s.trim(); }).filter(function(s){ return s; });
  
  /* Parsear el contenido libre */
  var resultado = {};
  for (var i=0; i<wordVars.length; i++) resultado[i] = new Array(16).fill('');
  
  var currentWord = 0;
  ta.value.split('\n').forEach(function(linea) {
    linea = linea.trim();
    /* Detectar separador de word */
    var wordMatch = linea.match(/===\s*WORD\s*(\d+)/i);
    if (wordMatch) { currentWord = parseInt(wordMatch[1]); return; }
    /* Detectar línea de bit */
    var bitMatch = linea.match(/^Bit\s*(\d+)\s*:\s*(.*)/i);
    if (bitMatch) {
      var bitNum = parseInt(bitMatch[1]);
      var texto = bitMatch[2].trim();
      if (bitNum >= 0 && bitNum < 16 && currentWord < wordVars.length) {
        resultado[currentWord][bitNum] = texto;
      }
    }
  });
  
  for (var wi=0; wi<wordVars.length; wi++) {
    el.props['wnames'+wi] = resultado[wi].join('\n');
  }
  
  var hint = document.getElementById('alarm-names-hint');
  if (hint) hint.remove();
  
  rerenderizarTodos();
  cerrarModal('modal-alarm-names');
  mostrarToast('Textos guardados');
  MODIFICADO = true;
  if (SELECCION.length === 1 && SELECCION[0].id === elId) renderizarPropiedades(SELECCION[0]);
}

