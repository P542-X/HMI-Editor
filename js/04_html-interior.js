/* =================================================================
   HTML INTERIOR
================================================================= */
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function htmlInterior(el) {
  var p = el.props;
  var fs = (p.fontSize || 12) + 'px';
  var ico = escHtml(p.icon || '\u25b6');
  var subHtml = p.subtext
    ? '<div class="hbtn-sub">' + escHtml(p.subtext) + '</div>'
    : '';

  if (el.tipo === 'btn-simple') {
    var cls = p.variant === 'start' ? 'hbtn hbtn-start' : 'hbtn hbtn-normal';
    return '<div class="' + cls + '" style="font-size:' + fs + '">' +
      '<div class="hbtn-ico">' + ico + '</div>' +
      '<div class="hbtn-lbl"><div class="hbtn-main">' + escHtml(p.text) + '</div>' + subHtml + '</div>' +
      '<div class="hled-dot"></div>' +
      '</div>';
  }
  if (el.tipo === 'btn-led') {
    return '<div class="hbtn hbtn-led" style="font-size:' + fs + '">' +
      '<div class="hbtn-ico">' + ico + '</div>' +
      '<div class="hbtn-lbl"><div class="hbtn-main">' + escHtml(p.text) + '</div>' + subHtml + '</div>' +
      '<div class="hled"></div>' +
      '</div>';
  }
  if (el.tipo === 'btn-toggle') {
    return '<div class="hbtn hbtn-toggle" style="font-size:' + fs + '">' +
      '<div class="hbtn-ico">' + escHtml(p.icon || '\u21cc') + '</div>' +
      '<div class="hbtn-lbl"><div class="hbtn-main">' + escHtml(p.text) + '</div>' + subHtml + '</div>' +
      '<div class="hled-dot"></div>' +
      '</div>';
  }
  if (el.tipo === 'btn-emergency') {
    return '<div class="hbtn hbtn-emerg" style="font-size:' + fs + '">' +
      '<div class="hbtn-ico">\u26a0</div>' +
      '<div class="hbtn-lbl"><div class="hbtn-main">' + escHtml(p.text) + '</div>' + subHtml + '</div>' +
      '</div>';
  }
  if (el.tipo === 'btn-selector') {
    var opts = [p.opt1, p.opt2, p.opt3].filter(Boolean);
    return '<div class="hbtn-sel" style="font-size:' + fs + '">' +
      opts.map(function(o, i) {
        return '<div class="sopt' + (i === 0 ? ' sact' : '') + '">' + escHtml(o) + '</div>';
      }).join('') +
      '</div>';
  }
  if (el.tipo === 'btn-dpad') {
    var dpFs = Math.max(10, Math.round(el.h / 6)) + 'px';
    return '<div class="hdpad">' +
      '<div></div><div class="dpb" style="font-size:' + dpFs + '">\u25b2</div><div></div>' +
      '<div class="dpb" style="font-size:' + dpFs + '">\u25c4</div><div class="dpb dpc">\u25cf</div><div class="dpb" style="font-size:' + dpFs + '">\u25ba</div>' +
      '<div></div><div class="dpb" style="font-size:' + dpFs + '">\u25bc</div><div></div>' +
      '</div>';
  }
  if (el.tipo === 'display') {
    var etiqueta = escHtml(p.label || p.var1 || '-');
    return '<div class="hdisplay">' +
      '<div class="hdisplay-top"><div class="hdisplay-dot"></div>' +
      '<div class="hdisplay-tag">' + etiqueta + '</div>' +
      '<div class="hdisplay-ms">' + (p.pollMs || 1000) + 'ms</div></div>' +
      '<div class="hdisplay-body"><div class="hdisplay-val" style="font-size:' + fs + '">' + escHtml(p.previewVal || '-') + '</div></div>' +
      '</div>';
  }
  if (el.tipo === 'status-led') {
    var diam = Math.min(el.w, el.h) - 8;
    var col = p.color || '#2e7d32';
    return '<div class="hstatus-wrap">' +
      '<div class="hstatus off" style="width:' + diam + 'px;height:' + diam + 'px;--led-color:' + col + '"></div>' +
      '</div>';
  }
  if (el.tipo === 'img-plc') {
    var tieneImg = p.imgData && p.imgData.length > 0;
    var imgHtml = tieneImg
      ? '<img class="himg-el" src="' + p.imgData + '" alt="img">'
      : '<div class="himg-placeholder">\ud83d\uddbc<br>SIN IMAGEN</div>';
    return '<div class="himg-wrap">' + imgHtml + '<div class="himg-upload-lbl">Cargar imagen</div></div>';
  }
  if (el.tipo === 'label') {
    var lblColor  = p.fontColor || '#1a1a16';
    var lblBorder = p.borderColor || 'transparent';
    var lblBg     = p.bgColor || 'transparent';
    return '<div class="hlabel" style="font-size:' + fs + ';color:' + lblColor + ';background:' + lblBg + ';border-color:' + lblBorder + '">' + escHtml(p.text || '') + '</div>';
  }

  if (el.tipo === 'tooltip-node') {
    var tnShape  = p.shape    || 'rect';
    var tnFill   = (p.fillColor   !== undefined && p.fillColor   !== '') ? p.fillColor   : '#e3f0ff';
    var tnStroke = (p.strokeColor !== undefined && p.strokeColor !== '') ? p.strokeColor : '#1565c0';
    /* si fill y stroke son ambos transparentes, ocultar el SVG por completo */
    var tnHideSvg = (tnShape === 'none') || (tnFill === 'transparent' && tnStroke === 'transparent');
    var tnFont   = p.fontColor   || '#1a1a18';
    var tnFs     = (p.fontSize || 11) + 'px';
    var tnText   = escHtml(p.text || 'NODE');
    var tnConns  = [p.conn1,p.conn2,p.conn3,p.conn4].filter(function(c){return c && c.trim();});
    var tnNotes  = p.notes ? escHtml(p.notes) : '';
    /* build tooltip HTML */
    var ttLines = '';
    if (tnConns.length) {
      ttLines += '<div class="tn-tt-section">⬡ CONEXIONES</div>';
      tnConns.forEach(function(c){ ttLines += '<div class="tn-tt-conn">' + escHtml(c) + '</div>'; });
    }
    if (tnNotes) ttLines += '<div class="tn-tt-notes">' + tnNotes + '</div>';
    if (!ttLines) ttLines = '<div class="tn-tt-empty">Sin conexiones configuradas</div>';
    /* SVG shape */
    var shapeHTML = '';
    if (tnShape === 'circle') {
      shapeHTML = '<svg class="tn-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
        '<ellipse cx="50" cy="50" rx="48" ry="48" fill="' + tnFill + '" stroke="' + tnStroke + '" stroke-width="2"/>' +
        '</svg>';
    } else if (tnShape === 'diamond') {
      shapeHTML = '<svg class="tn-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
        '<polygon points="50,2 98,50 50,98 2,50" fill="' + tnFill + '" stroke="' + tnStroke + '" stroke-width="2"/>' +
        '</svg>';
    } else if (tnShape === 'hexagon') {
      shapeHTML = '<svg class="tn-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
        '<polygon points="50,2 93,25 93,75 50,98 7,75 7,25" fill="' + tnFill + '" stroke="' + tnStroke + '" stroke-width="2"/>' +
        '</svg>';
    } else if (tnShape === 'rounded') {
      shapeHTML = '<svg class="tn-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
        '<rect x="2" y="2" width="96" height="96" rx="20" ry="20" fill="' + tnFill + '" stroke="' + tnStroke + '" stroke-width="2"/>' +
        '</svg>';
    } else if (tnShape === 'parallelogram') {
      shapeHTML = '<svg class="tn-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
        '<polygon points="18,2 98,2 82,98 2,98" fill="' + tnFill + '" stroke="' + tnStroke + '" stroke-width="2"/>' +
        '</svg>';
    } else {
      shapeHTML = '<svg class="tn-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
        '<rect x="2" y="2" width="96" height="96" fill="' + tnFill + '" stroke="' + tnStroke + '" stroke-width="2"/>' +
        '</svg>';
    }
    var tnShowVal = p.showValue && p.var1 && p.var1.trim();
    var tnValCol  = p.valueColor || '#00e5b0';
    var tnUnit    = p.unit ? escHtml(p.unit) : '';
    var tnValHtml = tnShowVal
      ? '<div class="tn-live-val" style="color:' + tnValCol + ';font-size:' + (Math.max(8,(p.fontSize||11)-1)) + 'px" id="tnv_' + el.id + '">—' + (tnUnit?' <span style="opacity:.6;font-size:9px">' + tnUnit + '</span>':'') + '</div>'
      : '';
    return '<div class="tn-wrap">' +
      (tnHideSvg ? '' : shapeHTML) +
      '<div class="tn-inner">' +
        '<div class="tn-label" style="color:' + tnFont + ';font-size:' + tnFs + '">' + tnText + '</div>' +
        tnValHtml +
      '</div>' +
      '<div class="tn-tooltip">' + ttLines + '</div>' +
    '</div>';
  }

  /* ══════════════ ALARMAS ══════════════ */
  if (el.tipo === 'alarm-banner') {
    var col = p.color || '#c62828';
    return '<div class="halarm-banner" style="font-size:' + fs + ';border-color:' + col + '">' +
      '<div class="halarm-banner-stripe"></div>' +
      '<div class="halarm-dot" style="background:' + col + '"></div>' +
      '<div class="halarm-ico" style="color:' + col + '">\u26a0</div>' +
      '<div class="halarm-lbl">' +
        '<div class="halarm-main" style="color:' + col + '">' + escHtml(p.text || '') + '</div>' +
        (p.subtext ? '<div class="halarm-sub">' + escHtml(p.subtext) + '</div>' : '') +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'alarm-list') {
    var alNamesArr = (p.alNames||'').split('\n').map(function(s){return s.trim();}).filter(Boolean);
    var alVarsArr  = (p.alVars ||'').split('\n').map(function(s){return s.trim();}).filter(Boolean);
    var total = Math.max(alNamesArr.length, alVarsArr.length);
    var pgSize = parseInt(p.pageSize) || 15;
    var showDate = p.showDateCol !== false;
    var showAck  = p.showAckCol;
    var previewRows = '';
    var sampleOn = [0, 2];
    for (var pi = 0; pi < Math.min(total, pgSize, 6); pi++) {
      var nm = alNamesArr[pi] || alVarsArr[pi] || ('Alarma ' + (pi+1));
      var on = sampleOn.indexOf(pi) !== -1;
      previewRows +=
        '<div style="display:flex;align-items:center;gap:0;border-bottom:1px solid #f0f0ec;font-size:9px;' + (on?'background:#fff8f8;':'') + '">' +
        '<div style="width:28px;text-align:center;color:#b0b0a8;font-family:DM Mono,monospace;flex-shrink:0;padding:4px 0">' + (pi+1) + '</div>' +
        '<div style="width:6px;height:6px;border-radius:50%;background:' + (on?'#c62828':'#d0d0c8') + ';flex-shrink:0;margin:0 4px"></div>' +
        '<div style="flex:1;font-family:DM Mono,monospace;color:' + (on?'#1a1a16':'#9a9a90') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px 4px">' + escHtml(nm) + '</div>' +
        (showDate ? '<div style="font-family:DM Mono,monospace;font-size:8px;color:' + (on?'#c62828':'#b0b0a8') + ';padding:4px 6px;flex-shrink:0">' + (on?'12:34':'--:--') + '</div>' : '') +
        (showAck  ? '<div style="font-family:DM Mono,monospace;font-size:8px;padding:2px 5px;background:' + (on?'#fff3cd':'#f5f5f3') + ';color:' + (on?'#e65100':'#b0b0a8') + ';border-radius:2px;margin-right:6px;flex-shrink:0">' + (on?'PEND':'OK') + '</div>' : '') +
        '</div>';
    }
    if (total > pgSize) {
      previewRows += '<div style="text-align:center;padding:3px;font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">...+ ' + (total-pgSize) + ' en pág. siguientes</div>';
    }
    var pages = total > 0 ? Math.ceil(total / pgSize) : 1;
    var colHdr =
      '<div style="display:flex;align-items:center;gap:0;border-bottom:2px solid #e8e8e0;background:#fff5f5;font-size:8px;font-family:DM Mono,monospace;letter-spacing:1px;color:#9a9a90;flex-shrink:0">' +
      '<div style="width:28px;text-align:center;flex-shrink:0">#</div>' +
      '<div style="width:14px;flex-shrink:0"></div>' +
      '<div style="flex:1;padding:4px">NOMBRE / DESCRIPCIÓN</div>' +
      (showDate ? '<div style="padding:4px 6px;flex-shrink:0">HORA</div>' : '') +
      (showAck  ? '<div style="padding:4px 6px;flex-shrink:0">ACK</div>' : '') +
      '</div>';
    var pager = pages > 1 ?
      '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:4px;border-top:1px solid #e8e8e0;background:#fafaf8;flex-shrink:0">' +
      '<span style="font-size:13px;color:#9a9a90;cursor:pointer">◀</span>' +
      '<span style="font-family:DM Mono,monospace;font-size:9px;color:#1a1a16">PÁG 1 / ' + pages + '</span>' +
      '<span style="font-size:13px;color:#c62828;cursor:pointer">▶</span>' +
      '</div>' : '';
    return '<div class="halarm-list">' +
      '<div class="halarm-list-hdr">' +
        '<span class="halarm-list-title">' + escHtml(p.title || 'ALARMAS') + '</span>' +
        '<span class="halarm-list-cnt">' + total + ' alarma' + (total!==1?'s':'') + '</span>' +
      '</div>' +
      colHdr +
      '<div class="halarm-list-body">' + previewRows + '</div>' +
      pager +
    '</div>';
  }
  if (el.tipo === 'alarm-ack') {
    return '<div class="halarm-ack pending" style="font-size:' + fs + '">' +
      '<div class="halarm-ack-ico">\u2713</div>' +
      '<div class="halarm-ack-lbl">' + escHtml(p.text || 'RECONOCER') + '</div>' +
      '<div class="halarm-ack-badge">PENDIENTE</div>' +
    '</div>';
  }

  /* ══════════════ ALARM-ARRAY PREVIEW ══════════════ */
  if (el.tipo === 'alarm-array') {
    var namesArr = (p.names || '').split('\n').map(function(s){return s.trim();}).filter(Boolean);
    var size = parseInt(p.arraySize) || 8;
    var previewRows = '';
    var sampleActive = [0, 2, 5];
    for (var pi = 0; pi < Math.min(size, 5); pi++) {
      var isOn = sampleActive.indexOf(pi) !== -1;
      var nm = namesArr[pi] || ('Alarma ' + (pi+1));
      previewRows += '<div style="display:flex;align-items:center;gap:7px;padding:4px 10px;' +
        (isOn ? 'background:#fff5f5;' : '') + 'border-bottom:1px solid #f5f5f1;">' +
        '<div style="width:5px;height:5px;border-radius:50%;flex-shrink:0;background:' + (isOn ? '#c62828' : '#d0d0c8') + ';' + (isOn ? 'box-shadow:0 0 4px #c6282888;' : '') + '"></div>' +
        '<div style="flex:1;font-family:DM Mono,monospace;font-size:9px;color:' + (isOn ? '#1a1a16' : '#b0b0a8') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(nm) + '</div>' +
        (isOn ? '<div style="font-family:DM Mono,monospace;font-size:8px;color:#c62828">ACTIVA</div>' : '') +
        '</div>';
    }
    if (size > 5) {
      previewRows += '<div style="text-align:center;padding:4px;font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">+ ' + (size - 5) + ' más</div>';
    }
    return '<div style="width:100%;height:100%;background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;">' +
      '<div style="padding:5px 10px;border-bottom:1px solid #e8e8e0;display:flex;align-items:center;gap:7px;background:#fff5f5;flex-shrink:0;">' +
        '<div style="width:6px;height:6px;border-radius:50%;background:#c62828;box-shadow:0 0 4px #c6282888;flex-shrink:0"></div>' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#c62828;font-weight:600;flex:1">' + escHtml(p.title || 'ALARMAS') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;background:#f0f0ec;border-radius:8px;padding:1px 7px">' + size + ' bits</span>' +
      '</div>' +
      '<div style="display:flex;border-bottom:1px solid #e8e8e0;flex-shrink:0;">' +
        '<div style="flex:1;text-align:center;padding:4px;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#c62828;border-bottom:2px solid #c62828;">ACTIVAS</div>' +
        '<div style="flex:1;text-align:center;padding:4px;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;">HISTORIAL</div>' +
      '</div>' +
      '<div style="flex:1;overflow:hidden">' + previewRows + '</div>' +
    '</div>';
  }


  /* ── popup-btn preview ── */
  if (el.tipo === 'popup-btn') {
    var col  = p.color     || '#1565c0';
    var txtc = p.textColor || '#ffffff';
    var fs   = (p.fontSize || 12) + 'px';
    var lbl  = p.label     || 'VER DETALLE';
    var ico  = p.icon      || '⬡';
    /* Contar elementos del popup */
    var popup = POPUPS[el.id] || {};
    var cnt   = (popup.els || []).length;
    return '<div style="width:100%;height:100%;background:' + col + ';border-radius:3px;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;position:relative;">' +
      '<span style="font-family:DM Mono,monospace;font-size:' + fs + ';font-weight:600;color:' + txtc + ';letter-spacing:1px">' + escHtml(ico) + '  ' + escHtml(lbl) + '</span>' +
      '<div style="position:absolute;top:4px;right:6px;background:rgba(255,255,255,.25);border-radius:8px;padding:1px 6px;font-family:DM Mono,monospace;font-size:8px;color:' + txtc + '">' + (cnt > 0 ? cnt + ' elem' : '↗ popup') + '</div>' +
    '</div>';
  }

  /* ── alarm-plc preview ── */
  if (el.tipo === 'alarm-plc') {
    var apTitle = p.title || 'ALARMAS PLC';
    var sampleAlarms = [
      { txt: 'Fallo motor línea 1', ts: '14:23:07', ack: false },
      { txt: 'Presión baja bomba A', ts: '14:21:55', ack: true  },
      { txt: 'Temperatura crítica', ts: '14:19:30', ack: false  }
    ];
    var apRows = sampleAlarms.map(function(a) {
      return '<div style="display:flex;align-items:flex-start;gap:7px;padding:5px 10px;background:' + (a.ack?'':'#f3f4ff;') + 'border-bottom:1px solid #e8eaf6;">' +
        '<div style="width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-top:3px;background:' + (a.ack?'#9a9a90':'#1a237e') + ';' + (a.ack?'':'box-shadow:0 0 4px #3f51b566;') + '"></div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:' + (a.ack?'#9a9a90':'#1a1a16') + ';font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(a.txt) + '</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;margin-top:1px">[userprogram] ' + a.ts + '</div>' +
        '</div>' +
        (a.ack ? '<div style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">ACK</div>' : '') +
      '</div>';
    }).join('');
    return '<div style="width:100%;height:100%;background:#fff;border:1px solid #c5cae9;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;">' +
      '<div style="padding:5px 10px;border-bottom:1px solid #e8eaf6;display:flex;align-items:center;gap:7px;background:#f3f4ff;flex-shrink:0;">' +
        '<div style="width:6px;height:6px;border-radius:50%;background:#c62828;box-shadow:0 0 4px #c6282888;flex-shrink:0"></div>' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#1a237e;font-weight:600;flex:1">' + escHtml(apTitle) + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;background:#f0f0ec;border-radius:8px;padding:1px 7px">2 ACTIVAS</span>' +
      '</div>' +
      '<div style="display:flex;border-bottom:1px solid #e8eaf6;flex-shrink:0;">' +
        '<div style="flex:1;text-align:center;padding:4px;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#1a237e;border-bottom:2px solid #1a237e;font-weight:600">ACTIVAS</div>' +
        (p.showHistory ? '<div style="flex:1;text-align:center;padding:4px;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;">HISTORIAL</div>' : '') +
      '</div>' +
      '<div style="flex:1;overflow:hidden">' + apRows + '</div>' +
    '</div>';
  }

  /* ── alarm-word preview ── */
  if (el.tipo === 'alarm-word') {
    var awTitle = p.title || 'ALARMAS WORD';
    var wordVars = (p.words || '"DB_Alarmas".Word1').split('\n').map(function(s){return s.trim();}).filter(Boolean);
    var sampleBits = [
      { wi: 0, bi: 0, txt: wordVars[0] ? 'Alarma Word0.Bit0' : 'Alarma 1', on: true  },
      { wi: 0, bi: 3, txt: wordVars[0] ? 'Alarma Word0.Bit3' : 'Alarma 4', on: true  },
      { wi: 0, bi: 7, txt: wordVars[0] ? 'Alarma Word0.Bit7' : 'Alarma 8', on: false }
    ];
    /* Usar nombres configurados si existen */
    var awRows = sampleBits.map(function(s) {
      var names = (p['wnames'+s.wi] || '').split('\n');
      var txt = (names[s.bi] && names[s.bi].trim()) || ('W' + s.wi + '.B' + s.bi);
      return '<div style="display:flex;align-items:center;gap:7px;padding:4px 10px;' + (s.on?'background:#fdf5ff;':'') + 'border-bottom:1px solid #f3e5f5;">' +
        '<div style="width:5px;height:5px;border-radius:50%;flex-shrink:0;background:' + (s.on?'#7b1fa2':'#d0d0c8') + ';' + (s.on?'box-shadow:0 0 4px #7b1fa288;':'') + '"></div>' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;min-width:28px">W'+s.wi+'.'+s.bi+'</div>' +
        '<div style="flex:1;font-family:DM Mono,monospace;font-size:9px;color:' + (s.on?'#1a1a16':'#b0b0a8') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(txt) + '</div>' +
        (s.on ? '<div style="font-family:DM Mono,monospace;font-size:8px;color:#7b1fa2">ACTIVA</div>' : '') +
      '</div>';
    }).join('');
    var totalWords = wordVars.length;
    return '<div style="width:100%;height:100%;background:#fff;border:1px solid #ce93d8;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;">' +
      '<div style="padding:5px 10px;border-bottom:1px solid #f3e5f5;display:flex;align-items:center;gap:7px;background:#fdf5ff;flex-shrink:0;">' +
        '<div style="width:6px;height:6px;border-radius:50%;background:#7b1fa2;box-shadow:0 0 4px #7b1fa288;flex-shrink:0"></div>' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#7b1fa2;font-weight:600;flex:1">' + escHtml(awTitle) + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;background:#f0f0ec;border-radius:8px;padding:1px 7px">' + totalWords + ' word' + (totalWords!==1?'s':'') + ' × 16</span>' +
      '</div>' +
      '<div style="display:flex;border-bottom:1px solid #f3e5f5;flex-shrink:0;">' +
        '<div style="flex:1;text-align:center;padding:4px;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#7b1fa2;border-bottom:2px solid #7b1fa2;font-weight:600">ACTIVAS</div>' +
        '<div style="flex:1;text-align:center;padding:4px;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;">BUSCAR</div>' +
      '</div>' +
      '<div style="flex:1;overflow:hidden">' + awRows + '</div>' +
    '</div>';
  }

  /* ══════════════ DATOS ══════════════ */
  if (el.tipo === 'progress-bar') {
    var col = p.color || '#1565c0';
    var pct = 62; /* preview */
    return '<div class="hprogress">' +
      '<div class="hprogress-top">' +
        '<span class="hprogress-lbl">' + escHtml(p.label || '') + '</span>' +
        '<span class="hprogress-val">—</span>' +
      '</div>' +
      '<div class="hprogress-body">' +
        '<div class="hprogress-track">' +
          '<div class="hprogress-fill" style="width:' + pct + '%;background:' + col + '"></div>' +
        '</div>' +
        '<div class="hprogress-scale">' +
          '<span>' + escHtml(String(p.min || 0)) + '</span>' +
          '<span>' + escHtml(p.unit || '') + '</span>' +
          '<span>' + escHtml(String(p.max || 100)) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'trend-chart') {
    var col = p.color || '#c62828';
    /* Fake SVG polyline for preview */
    var pts = [0,30,20,55,40,25,60,70,80,40,100,60,120,35,140,65,160,45,180,55,200,30];
    var ptsStr = pts.map(function(v,i){ return (i%2===0 ? v : (80 - v*0.6)); }).join(' ');
    // rebuild as proper x,y pairs
    var coords = [];
    for (var ti = 0; ti < pts.length; ti += 2) coords.push(pts[ti] + ',' + (50 - pts[ti+1]*0.3));
    return '<div class="htrend">' +
      '<div class="htrend-top">' +
        '<span class="htrend-lbl">' + escHtml(p.label || '') + '</span>' +
        '<span class="htrend-val">—</span>' +
      '</div>' +
      '<div class="htrend-body">' +
        '<svg class="htrend-svg" viewBox="0 0 200 80" preserveAspectRatio="none">' +
          '<line class="htrend-grid" x1="0" y1="26" x2="200" y2="26"/>' +
          '<line class="htrend-grid" x1="0" y1="53" x2="200" y2="53"/>' +
          '<polyline class="htrend-line" style="stroke:' + col + '" points="0,55 20,42 40,60 60,30 80,50 100,35 120,55 140,28 160,45 180,38 200,50"/>' +
          '<polygon class="htrend-area" style="fill:' + col + '" points="0,55 20,42 40,60 60,30 80,50 100,35 120,55 140,28 160,45 180,38 200,50 200,80 0,80"/>' +
        '</svg>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'data-table') {
    var rows = '';
    for (var di = 1; di <= 6; di++) {
      var lb = p['dlabel' + di], vr = p['dvar' + di];
      if (!lb && !vr) continue;
      rows += '<div class="hdt-row"><span class="hdt-lbl">' + escHtml(lb || vr || '') + '</span><span class="hdt-val">—</span></div>';
    }
    return '<div class="hdtable">' +
      '<div class="hdtable-hdr">' +
        '<div class="hdtable-dot on" style="background:#2e7d32"></div>' +
        '<span class="hdtable-title">' + escHtml(p.title || 'VARIABLES') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">' + (p.pollMs || 1000) + 'ms</span>' +
      '</div>' +
      '<div class="hdtable-body">' + rows + '</div>' +
    '</div>';
  }

  /* ══════════════ NAVEGACIÓN ══════════════ */
  if (el.tipo === 'nav-button') {
    var cls = 'hnavbtn hnavbtn-' + (p.variant || 'normal');
    return '<div class="' + cls + '" style="font-size:' + fs + '">' +
      '<div class="hnavbtn-ico">' + escHtml(p.icon || '\u2192') + '</div>' +
      '<div class="hnavbtn-lbl">' + escHtml(p.text || '') + '</div>' +
      '<div class="hnavbtn-arrow">\u25ba</div>' +
    '</div>';
  }
  if (el.tipo === 'nav-menu') {
    var items = '';
    for (var ni = 1; ni <= 5; ni++) {
      var lb = p['nlabel' + ni], ico = p['nicon' + ni];
      if (!lb) continue;
      items += '<div class="hnav-item' + (ni === 1 ? ' active' : '') + '">' +
        '<div class="hnav-item-ico">' + escHtml(ico || '\u25b6') + '</div>' +
        '<div class="hnav-item-lbl" style="font-size:' + fs + 'px">' + escHtml(lb) + '</div>' +
        '<div class="hnav-item-arr">\u25ba</div>' +
      '</div>';
    }
    return '<div class="hnavmenu">' +
      '<div class="hnavmenu-hdr"><div class="hnavmenu-title">' + escHtml(p.title || 'NAVEGACIÓN') + '</div></div>' +
      '<div class="hnavmenu-body">' + items + '</div>' +
    '</div>';
  }


  /* ══════════════ CONTROLES AVANZADOS ══════════════ */
  if (el.tipo === 'btn-jog') {
    return '<div class="hbtn hbtn-jog" style="font-size:' + fs + '">' +
      '<div class="hbtn-ico">' + escHtml(p.icon || '↻') + '</div>' +
      '<div class="hbtn-lbl"><div class="hbtn-main">' + escHtml(p.text || 'JOG') + '</div>' +
        (p.subtext ? '<div class="hbtn-sub">' + escHtml(p.subtext) + '</div>' : '') +
      '</div>' +
      '<div class="hbtn-jog-badge">HOLD</div>' +
    '</div>';
  }
  if (el.tipo === 'btn-confirm') {
    return '<div class="hbtn hbtn-confirm" style="font-size:' + fs + '">' +
      '<div class="hbtn-ico">' + escHtml(p.icon || '⚠') + '</div>' +
      '<div class="hbtn-lbl"><div class="hbtn-main">' + escHtml(p.text || 'CONFIRMAR') + '</div>' +
        (p.subtext ? '<div class="hbtn-sub">' + escHtml(p.subtext) + '</div>' : '') +
      '</div>' +
      '<div class="confirm-step">⊕⊕</div>' +
    '</div>';
  }
  if (el.tipo === 'btn-set-reset') {
    return '<div class="hsetres">' +
      '<button class="hsetres-set">' + escHtml(p.textSet || 'SET') + '</button>' +
      '<button class="hsetres-reset">' + escHtml(p.textReset || 'RESET') + '</button>' +
    '</div>';
  }
  if (el.tipo === 'spinbox') {
    return '<div class="hspinbox">' +
      '<div class="hspinbox-top">' +
        '<div class="hspinbox-tag">' + escHtml(p.label || '') + '</div>' +
        '<div class="hspinbox-unit">' + escHtml(p.unit || '') + '</div>' +
      '</div>' +
      '<div class="hspinbox-body">' +
        '<button class="hspinbox-btn">−</button>' +
        '<div class="hspinbox-val" style="font-size:' + fs + '">' + escHtml(String(p.min || 0)) + '</div>' +
        '<button class="hspinbox-btn">+</button>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'slider-h') {
    var col = p.color || '#1565c0';
    return '<div class="hslider">' +
      '<div class="hslider-top">' +
        '<div class="hslider-tag">' + escHtml(p.label || '') + '</div>' +
        '<div class="hslider-val">— ' + escHtml(p.unit || '') + '</div>' +
      '</div>' +
      '<div class="hslider-body">' +
        '<span class="hslider-min">' + escHtml(String(p.min !== undefined ? p.min : 0)) + '</span>' +
        '<div class="hslider-track">' +
          '<div class="hslider-fill" style="width:50%;background:' + col + '"></div>' +
          '<div class="hslider-thumb" style="left:50%;background:' + col + '"></div>' +
        '</div>' +
        '<span class="hslider-max">' + escHtml(String(p.max !== undefined ? p.max : 100)) + '</span>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'slider-v') {
    var col = p.color || '#f57c00';
    return '<div class="hslider-v">' +
      '<div class="hslider-v-tag">' + escHtml(p.label || '') + '</div>' +
      '<div class="hslider-v-body">' +
        '<span class="hslider-v-lbl">' + escHtml(String(p.max !== undefined ? p.max : 100)) + '</span>' +
        '<div class="hslider-v-track">' +
          '<div class="hslider-v-fill" style="height:50%;background:' + col + '"></div>' +
          '<div class="hslider-v-thumb" style="bottom:50%;background:' + col + '"></div>' +
        '</div>' +
        '<span class="hslider-v-lbl">' + escHtml(String(p.min !== undefined ? p.min : 0)) + '</span>' +
        '<span class="hslider-v-val">—</span>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'btn-multistate') {
    var states = (p.states || 'STOP,AUTO,MANUAL').split(',');
    var colors = (p.colors || '#c62828,#2e7d32,#1565c0').split(',');
    var col0 = colors[0] || '#1a1a18';
    return '<div class="hbtn-multi" style="background:' + col0 + ';border:1px solid ' + col0 + '">' +
      '<div class="hbtn-lbl"><div class="hbtn-main" style="color:#fff;font-size:' + fs + '">' + escHtml(p.text || '') + '</div></div>' +
      '<div class="hbtn-multi-state-badge" style="background:rgba(255,255,255,.15);color:#fff">' + escHtml(states[0] || 'STOP') + '</div>' +
      '<div class="hbtn-multi-cycle" style="color:rgba(255,255,255,.4)">▶</div>' +
    '</div>';
  }

  /* ══════════════ P&ID ══════════════ */
  if (el.tipo === 'motor-symbol') {
    var diam = Math.min(el.w - 16, el.h - 36);
    return '<div class="hmotor">' +
      '<div class="hmotor-circle" style="width:' + diam + 'px;height:' + diam + 'px">' +
        '<div class="hmotor-m">M</div>' +
        '<div class="hmotor-dot" style="background:#9a9a90"></div>' +
      '</div>' +
      '<div class="hmotor-lbl">' + escHtml(p.label || 'M1') + '</div>' +
    '</div>';
  }
  if (el.tipo === 'valve-symbol') {
    var sz = Math.min(el.w, el.h) - 20;
    return '<div class="hvalve">' +
      '<div class="hvalve-body">' +
        '<svg width="' + sz + '" height="' + (sz*0.7) + '" viewBox="0 0 60 42">' +
          '<polygon points="0,0 30,20 0,40" fill="#1a1a16" stroke="#1a1a16" stroke-width="1"/>' +
          '<polygon points="60,0 30,20 60,40" fill="none" stroke="#1a1a16" stroke-width="2"/>' +
          '<line x1="30" y1="0" x2="30" y2="20" stroke="#1a1a16" stroke-width="2"/>' +
          '<circle cx="30" cy="20" r="4" fill="#9a9a90"/>' +
        '</svg>' +
      '</div>' +
      '<div class="hvalve-lbl">' + escHtml(p.label || 'V1') + '</div>' +
    '</div>';
  }
  if (el.tipo === 'pump-symbol') {
    var diam = Math.min(el.w - 16, el.h - 36);
    return '<div class="hpump">' +
      '<div class="hpump-body">' +
        '<svg width="' + diam + '" height="' + diam + '" viewBox="0 0 60 60">' +
          '<circle cx="30" cy="30" r="28" fill="none" stroke="#1a1a16" stroke-width="2"/>' +
          '<polygon points="20,15 45,30 20,45" fill="#1a1a16"/>' +
          '<circle cx="30" cy="30" r="4" fill="#9a9a90"/>' +
        '</svg>' +
      '</div>' +
      '<div class="hmotor-lbl">' + escHtml(p.label || 'P1') + '</div>' +
    '</div>';
  }
  if (el.tipo === 'level-tank') {
    var col = p.color || '#1565c0';
    return '<div class="hlevel">' +
      '<div class="hlevel-top">' +
        '<div class="hlevel-tag">' + escHtml(p.label || 'TANQUE') + '</div>' +
        '<div class="hlevel-pct">— ' + escHtml(p.unit || '%') + '</div>' +
      '</div>' +
      '<div class="hlevel-body">' +
        '<div class="hlevel-scale">' +
          '<span class="hlevel-tick">' + escHtml(String(p.max !== undefined ? p.max : 100)) + '</span>' +
          '<span class="hlevel-tick">75</span>' +
          '<span class="hlevel-tick">50</span>' +
          '<span class="hlevel-tick">25</span>' +
          '<span class="hlevel-tick">' + escHtml(String(p.min !== undefined ? p.min : 0)) + '</span>' +
        '</div>' +
        '<div class="hlevel-tank">' +
          '<div class="hlevel-fill" style="height:62%;background:' + col + ';opacity:.7"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'pid-faceplate') {
    return '<div class="hpid">' +
      '<div class="hpid-hdr">' +
        '<div class="hpid-title">' + escHtml(p.title || 'PID-101') + '</div>' +
        '<div class="hpid-mode">AUTO</div>' +
      '</div>' +
      '<div class="hpid-body">' +
        '<div class="hpid-row">' +
          '<div class="hpid-row-lbl">PV</div>' +
          '<div class="hpid-track"><div class="hpid-fill" style="width:68%;background:#1565c0"></div></div>' +
          '<div class="hpid-row-val" style="color:#1565c0">—</div>' +
        '</div>' +
        '<div class="hpid-row">' +
          '<div class="hpid-row-lbl">SP</div>' +
          '<div class="hpid-track"><div class="hpid-fill" style="width:70%;background:#2e7d32"></div></div>' +
          '<div class="hpid-row-val" style="color:#2e7d32">—</div>' +
        '</div>' +
        '<div class="hpid-row">' +
          '<div class="hpid-row-lbl">OUT</div>' +
          '<div class="hpid-track"><div class="hpid-fill" style="width:45%;background:#f57c00"></div></div>' +
          '<div class="hpid-row-val" style="color:#f57c00">—</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════ MEDICIÓN ══════════════ */
  if (el.tipo === 'gauge') {
    var col = p.color || '#f57c00';
    var pct = 0.62;
    var angle = -135 + pct * 270;
    var rad = angle * Math.PI / 180;
    var cx = 60, cy = 60, r = 46;
    var x = cx + r * Math.cos(rad); var y = cy + r * Math.sin(rad);
    var startAngle = -135 * Math.PI / 180;
    var endAngle = (angle) * Math.PI / 180;
    var lx1 = cx + r * Math.cos(startAngle); var ly1 = cy + r * Math.sin(startAngle);
    var lx2 = cx + r * Math.cos(endAngle);   var ly2 = cy + r * Math.sin(endAngle);
    var largeArc = pct > 0.5 ? 1 : 0;
    return '<div class="hgauge">' +
      '<svg class="hgauge-svg" viewBox="0 0 120 80">' +
        '<path d="M ' + lx1.toFixed(1) + ' ' + ly1.toFixed(1) + ' A ' + r + ' ' + r + ' 0 1 1 ' + (cx+r*Math.cos(45*Math.PI/180)).toFixed(1) + ' ' + (cy+r*Math.sin(45*Math.PI/180)).toFixed(1) + '" fill="none" stroke="#e8e8e0" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M ' + lx1.toFixed(1) + ' ' + ly1.toFixed(1) + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + lx2.toFixed(1) + ' ' + ly2.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="6" stroke-linecap="round"/>' +
        '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#1a1a16" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#1a1a16"/>' +
        '<text x="' + cx + '" y="78" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" fill="#9a9a90">' + escHtml(p.label || '') + '</text>' +
        '<text x="' + (cx - 42) + '" y="75" font-family="DM Mono,monospace" font-size="7" fill="#b0b0a8">' + escHtml(String(p.min !== undefined ? p.min : 0)) + '</text>' +
        '<text x="' + (cx + 28) + '" y="75" font-family="DM Mono,monospace" font-size="7" fill="#b0b0a8">' + escHtml(String(p.max !== undefined ? p.max : 100)) + '</text>' +
      '</svg>' +
      '<div class="hgauge-val">— <span style="font-size:9px;color:#9a9a90">' + escHtml(p.unit || '') + '</span></div>' +
    '</div>';
  }
  if (el.tipo === 'bargraph-v') {
    var col = p.color || '#1565c0';
    return '<div class="hbargraph">' +
      '<div class="hbargraph-scale">' +
        '<span class="hbargraph-tick">' + escHtml(String(p.max !== undefined ? p.max : 100)) + '</span>' +
        '<span class="hbargraph-tick">75</span>' +
        '<span class="hbargraph-tick">50</span>' +
        '<span class="hbargraph-tick">25</span>' +
        '<span class="hbargraph-tick">' + escHtml(String(p.min !== undefined ? p.min : 0)) + '</span>' +
      '</div>' +
      '<div class="hbargraph-body">' +
        '<div class="hbargraph-tag">' + escHtml(p.label || '') + '</div>' +
        '<div class="hbargraph-track">' +
          '<div class="hbargraph-fill" style="height:58%;background:' + col + '"></div>' +
        '</div>' +
        '<div class="hbargraph-val">— ' + escHtml(p.unit || '') + '</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'numeric-7seg') {
    var segFs = Math.min(el.h - 28, 40);
    return '<div class="h7seg">' +
      '<div class="h7seg-top"><div class="h7seg-tag">' + escHtml(p.label || '') + '</div></div>' +
      '<div class="h7seg-body"><div class="h7seg-val" style="font-size:' + segFs + 'px">—</div></div>' +
    '</div>';
  }
  if (el.tipo === 'multibit-led') {
    var nbits = Math.min(parseInt(p.bits) || 8, 16);
    var bitsHtml = '';
    for (var bi = 0; bi < nbits; bi++) {
      bitsHtml += '<div class="hmultibit-bit">' +
        '<div class="hmultibit-dot"></div>' +
        '<div class="hmultibit-idx">' + bi + '</div>' +
      '</div>';
    }
    return '<div class="hmultibit">' +
      '<div class="hmultibit-top"><div class="hmultibit-tag">' + escHtml(p.label || 'WORD') + '</div></div>' +
      '<div class="hmultibit-body">' + bitsHtml + '</div>' +
    '</div>';
  }
  if (el.tipo === 'setpoint-input') {
    return '<div class="hspv">' +
      '<div class="hspv-top"><div class="hspv-tag">' + escHtml(p.label || '') + '</div><div style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">' + escHtml(p.unit || '') + '</div></div>' +
      '<div class="hspv-body">' +
        '<div class="hspv-half hspv-pv">' +
          '<div class="hspv-half-lbl">PV</div>' +
          '<div class="hspv-half-val">—</div>' +
        '</div>' +
        '<div class="hspv-half hspv-sp">' +
          '<div class="hspv-half-lbl">SP</div>' +
          '<div class="hspv-half-val">—</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'xy-chart') {
    var colX = p.colorX || '#1565c0'; var colY = p.colorY || '#c62828';
    var pts = '10,70 30,50 50,40 70,55 90,30 110,45 130,20 150,35 170,25 190,40';
    return '<div class="hxychart">' +
      '<div class="hxychart-top">' +
        '<div class="hxychart-lbl">' + escHtml(p.label || 'XY') + '</div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
          '<span style="font-family:DM Mono,monospace;font-size:8px;color:' + colX + '">X</span>' +
          '<span style="font-family:DM Mono,monospace;font-size:8px;color:' + colY + '">Y</span>' +
        '</div>' +
      '</div>' +
      '<div class="hxychart-body">' +
        '<svg class="hxychart-svg" viewBox="0 0 200 80" preserveAspectRatio="none">' +
          '<line x1="0" y1="26" x2="200" y2="26" stroke="#e8e8e0" stroke-width="0.5"/>' +
          '<line x1="0" y1="53" x2="200" y2="53" stroke="#e8e8e0" stroke-width="0.5"/>' +
          '<polyline fill="none" stroke="' + colX + '" stroke-width="1.5" points="' + pts + '"/>' +
          '<polyline fill="none" stroke="' + colY + '" stroke-width="1.5" stroke-dasharray="4,2" points="10,60 30,45 50,55 70,30 90,50 110,35 130,45 150,25 170,40 190,30"/>' +
        '</svg>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════ DATOS AVANZADOS ══════════════ */
  if (el.tipo === 'bar-chart') {
    var bars = [];
    for (var bi2 = 1; bi2 <= 4; bi2++) {
      var lb = p['blabel'+bi2]; var col = p['bcolor'+bi2] || '#1565c0';
      if (!lb) continue;
      var h = [75, 45, 60, 30][bi2-1];
      bars += '<div class="hbarchart-col">' +
        '<div class="hbarchart-bar" style="height:' + h + '%;background:' + col + '"></div>' +
        '<div class="hbarchart-name">' + escHtml(lb) + '</div>' +
      '</div>';
    }
    return '<div class="hbarchart">' +
      '<div class="hbarchart-top"><div class="hbarchart-lbl">' + escHtml(p.title || 'BARRAS') + '</div>' +
        '<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">' + escHtml(p.unit || '') + '</span>' +
      '</div>' +
      '<div class="hbarchart-body">' + bars + '</div>' +
    '</div>';
  }
  if (el.tipo === 'recipe-table') {
    var rows = '';
    for (var ri = 1; ri <= 6; ri++) {
      var lb = p['rlabel'+ri]; if (!lb) continue;
      rows += '<div class="hrecipe-row">' +
        '<div class="hrecipe-row-lbl">' + escHtml(lb) + '</div>' +
        '<div class="hrecipe-row-val">—</div>' +
        '<div class="hrecipe-row-unit">' + escHtml(p['runit'+ri] || '') + '</div>' +
      '</div>';
    }
    return '<div class="hrecipe">' +
      '<div class="hrecipe-hdr"><div class="hrecipe-title">' + escHtml(p.title || 'RECETA') + '</div><div class="hrecipe-num">#01</div></div>' +
      '<div class="hrecipe-body">' + rows + '</div>' +
    '</div>';
  }
  if (el.tipo === 'datetime-display') {
    var dtFs = (p.fontSize || 20) + 'px';
    return '<div class="hdatetime">' +
      '<div class="hdatetime-time" style="font-size:' + dtFs + '">--:--:--</div>' +
      '<div class="hdatetime-date">-- / -- / ----</div>' +
      '<div class="hdatetime-tz">SISTEMA LOCAL</div>' +
    '</div>';
  }

  /* ══════════════ ALARMAS AVANZADAS ══════════════ */
  if (el.tipo === 'alarm-ticker') {
    var msgs = [p.amsg1, p.amsg2, p.amsg3].filter(Boolean).join('  ⚑  ');
    return '<div class="halarm-ticker">' +
      '<div class="halarm-ticker-icon">⚑</div>' +
      '<div class="halarm-ticker-wrap"><div class="halarm-ticker-txt">' + escHtml(msgs || '⚑ FALLO MOTOR 1  ⚑  PRESIÓN ALTA  ⚑  TEMPERATURA CRÍTICA') + '</div></div>' +
    '</div>';
  }
  if (el.tipo === 'alarm-count') {
    return '<div class="halarm-count">' +
      '<div class="halarm-count-bubble">3</div>' +
      '<div class="halarm-count-lbl">ALARMAS<br>ACTIVAS</div>' +
    '</div>';
  }

  /* ══════════════ DECORACIÓN ══════════════ */
  if (el.tipo === 'frame-box') {
    var col = p.color || '#1a1a18';
    var fbg = p.bg || 'var(--bg,#f0f0ec)';
    return '<div class="hframe" style="border-color:' + col + '">' +
      '<div class="hframe-title" style="color:' + col + ';background:' + fbg + '">' + escHtml(p.title || 'ZONA') + '</div>' +
    '</div>';
  }
  if (el.tipo === 'separator-h') {
    var col = p.color || '#1a1a18';
    return '<div class="hsep-h">' +
      '<div class="hsep-h-line" style="background:' + col + '"></div>' +
      (p.label ? '<span style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:' + col + '">' + escHtml(p.label) + '</span><div class="hsep-h-line" style="background:' + col + '"></div>' : '') +
    '</div>';
  }
  if (el.tipo === 'title-banner') {
    var col = p.color || '#1a1a18';
    var fontCol = p.fontColor || '#ffffff';
    return '<div class="htitlebanner" style="background:' + col + ';color:' + fontCol + '">' +
      (p.icon ? '<div class="htitlebanner-ico" style="color:' + fontCol + '">' + escHtml(p.icon) + '</div>' : '') +
      '<div class="htitlebanner-main">' +
        '<div class="htitlebanner-txt" style="font-size:' + fs + ';color:' + fontCol + '">' + escHtml(p.text || '') + '</div>' +
        (p.subtext ? '<div class="htitlebanner-sub" style="color:' + fontCol + ';opacity:0.75">' + escHtml(p.subtext) + '</div>' : '') +
      '</div>' +
      (p.badge ? '<div class="htitlebanner-badge" style="color:' + fontCol + ';border-color:' + fontCol + ';opacity:0.7">' + escHtml(p.badge) + '</div>' : '') +
    '</div>';
  }
  if (el.tipo === 'text-block') {
    var tbFs = (p.fontSize || 12) + 'px';
    var tbCol = p.fontColor || '#1a1a18';
    var lines = (p.text || '').split('\n').map(function(l){ return '<p>' + escHtml(l) + '</p>'; }).join('');
    return '<div class="htextblock" style="font-size:' + tbFs + ';color:' + tbCol + '">' + lines + '</div>';
  }

  /* ══════════════ SISTEMA ══════════════ */
  if (el.tipo === 'clock-widget') {
    var clkFs = (p.fontSize || 22) + 'px';
    return '<div class="hclock">' +
      '<div class="hclock-hms" style="font-size:' + clkFs + '">--<span class="hclock-dot">:</span>--<span class="hclock-dot">:</span>--</div>' +
      '<div class="hclock-date">-- / -- / ----</div>' +
    '</div>';
  }
  if (el.tipo === 'plc-info') {
    return '<div class="hplcinfo">' +
      '<div class="hplcinfo-hdr"><div class="hplcinfo-title">CPU INFO</div><div class="hplcinfo-state">RUN</div></div>' +
      '<div class="hplcinfo-body">' +
        '<div class="hplcinfo-row"><div class="hplcinfo-row-k">IP</div><div class="hplcinfo-row-v">' + escHtml(p.ip || '—') + '</div></div>' +
        '<div class="hplcinfo-row"><div class="hplcinfo-row-k">MODEL</div><div class="hplcinfo-row-v">' + escHtml(p.model || 'S7-1214C') + '</div></div>' +
        '<div class="hplcinfo-row"><div class="hplcinfo-row-k">STATE</div><div class="hplcinfo-row-v">ONLINE</div></div>' +
        '<div class="hplcinfo-row"><div class="hplcinfo-row-k">CYCLE</div><div class="hplcinfo-row-v">— ms</div></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'image-static') {
    var tieneImg = p.imgData && p.imgData.length > 0;
    return '<div class="himg-static">' +
      (tieneImg
        ? '<img src="' + p.imgData + '" style="max-width:100%;max-height:100%;object-fit:' + (p.fit || 'contain') + '">'
        : '<div class="himg-static-ph">🖼<br>SIN IMAGEN</div>') +
      '<div class="himg-upload-lbl">Cargar imagen</div>' +
    '</div>';
  }



  /* ══════════════ CONSTRUCCIÓN / DECORACIÓN ══════════════ */

  if (el.tipo === 'deco-worker') {
    var c = p.color || '#f57c00', sk = p.skin || '#f5c28a';
    return '<svg viewBox="0 0 50 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<ellipse cx="25" cy="10" rx="8" ry="8" fill="'+sk+'" stroke="#5a3a18" stroke-width="1.5"/>' +
      '<path d="M17 7 Q25 0 33 7" fill="#f9a825" stroke="#c07800" stroke-width="1.2"/>' +
      '<rect x="15" y="18" width="20" height="28" rx="2" fill="'+c+'" stroke="#b35000" stroke-width="1.2"/>' +
      '<rect x="7" y="19" width="8" height="22" rx="2" fill="'+c+'" stroke="#b35000" stroke-width="1"/>' +
      '<rect x="35" y="19" width="8" height="22" rx="2" fill="'+c+'" stroke="#b35000" stroke-width="1"/>' +
      '<rect x="17" y="46" width="7" height="32" rx="2" fill="#3a3a36" stroke="#1a1a14" stroke-width="1"/>' +
      '<rect x="26" y="46" width="7" height="32" rx="2" fill="#3a3a36" stroke="#1a1a14" stroke-width="1"/>' +
      '<rect x="16" y="76" width="9" height="8" rx="1" fill="#2a2a26"/>' +
      '<rect x="25" y="76" width="9" height="8" rx="1" fill="#2a2a26"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-forklift') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 140 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="28" width="58" height="44" rx="3" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<rect x="45" y="14" width="16" height="34" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>' +
      '<rect x="50" y="18" width="8" height="20" rx="1" fill="rgba(255,255,255,.45)"/>' +
      '<rect x="6" y="32" width="34" height="22" rx="1" fill="rgba(0,0,0,.12)"/>' +
      '<line x1="62" y1="12" x2="62" y2="72" stroke="#8a6000" stroke-width="3"/>' +
      '<line x1="70" y1="12" x2="70" y2="72" stroke="#8a6000" stroke-width="3"/>' +
      '<rect x="72" y="14" width="62" height="7" rx="2" fill="#5a4000" stroke="#3a2800" stroke-width="1.2"/>' +
      '<rect x="72" y="24" width="62" height="7" rx="2" fill="#5a4000" stroke="#3a2800" stroke-width="1.2"/>' +
      '<circle cx="18" cy="74" r="10" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="18" cy="74" r="5" fill="#5a5a56"/>' +
      '<circle cx="50" cy="74" r="10" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="50" cy="74" r="5" fill="#5a5a56"/>' +
      '<circle cx="6" cy="68" r="5" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<rect x="0" y="62" width="10" height="14" rx="2" fill="'+c+'"/>' +
      '<circle cx="5" cy="34" r="4" fill="#f44336"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-truck') {
    var c = p.color || '#1565c0', cargo = p.cargo || '#e0e0d8';
    return '<svg viewBox="0 0 180 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="20" width="110" height="52" rx="2" fill="'+cargo+'" stroke="#9a9a90" stroke-width="1.5"/>' +
      '<rect x="112" y="28" width="64" height="44" rx="4" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<rect x="116" y="33" width="30" height="22" rx="2" fill="rgba(255,255,255,.5)"/>' +
      '<rect x="150" y="33" width="22" height="22" rx="2" fill="rgba(255,255,255,.35)"/>' +
      '<rect x="112" y="55" width="64" height="6" fill="rgba(0,0,0,.15)"/>' +
      '<line x1="2" y1="72" x2="176" y2="72" stroke="#8a8a80" stroke-width="2"/>' +
      '<circle cx="30"  cy="74" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="30"  cy="74" r="4.5" fill="#5a5a56"/>' +
      '<circle cx="80"  cy="74" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="80"  cy="74" r="4.5" fill="#5a5a56"/>' +
      '<circle cx="134" cy="74" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="134" cy="74" r="4.5" fill="#5a5a56"/>' +
      '<circle cx="162" cy="74" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="162" cy="74" r="4.5" fill="#5a5a56"/>' +
      '<rect x="168" y="56" width="8" height="12" rx="2" fill="#f44336"/>' +
      '<rect x="168" y="40" width="8" height="8" rx="1" fill="#fffde0"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-crane') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 100 180" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="40" y="80" width="14" height="94" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<line x1="44" y1="90" x2="50" y2="140" stroke="#8a6000" stroke-width="1" stroke-dasharray="4,4"/>' +
      '<line x1="50" y1="90" x2="44" y2="140" stroke="#8a6000" stroke-width="1" stroke-dasharray="4,4"/>' +
      '<polygon points="10,82 90,82 84,60 16,60" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<rect x="65" y="58" width="20" height="28" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>' +
      '<rect x="68" y="61" width="14" height="16" rx="1" fill="rgba(255,255,255,.4)"/>' +
      '<line x1="90" y1="60" x2="98" y2="16" stroke="#8a6000" stroke-width="2"/>' +
      '<line x1="10" y1="60" x2="2" y2="30" stroke="#8a6000" stroke-width="2"/>' +
      '<line x1="2" y1="30" x2="98" y2="16" stroke="#8a6000" stroke-width="2"/>' +
      '<line x1="85" y1="16" x2="85" y2="44" stroke="#5a4000" stroke-width="1.5"/>' +
      '<rect x="80" y="44" width="10" height="8" rx="1" fill="#3a3a36"/>' +
      '<line x1="6" y1="26" x2="6" y2="2" stroke="#5a4000" stroke-width="1.5"/>' +
      '<rect x="2" y="2" width="8" height="6" rx="1" fill="#3a3a36"/>' +
      '<rect x="28" y="170" width="44" height="8" rx="2" fill="#8a6000"/>' +
      '<rect x="34" y="162" width="32" height="10" rx="2" fill="'+c+'"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-brickwall') {
    var cA = p.colorA || '#c8855a', cB = p.colorB || '#dba880', mort = p.mortar || '#e8e0d4';
    var rows = '', bw = 36, bh = 14, gap = 3, cols = 4;
    for (var r = 0; r < 5; r++) {
      var off = (r % 2 === 0) ? 0 : bw/2+gap/2;
      for (var col2 = -1; col2 < cols+1; col2++) {
        var x2 = off + col2*(bw+gap), y2 = r*(bh+gap)+gap;
        if (x2+bw < 0 || x2 > 180) continue;
        rows += '<rect x="'+x2+'" y="'+y2+'" width="'+bw+'" height="'+bh+'" rx="1" fill="'+(r%2===col2%2?cA:cB)+'" stroke="'+mort+'" stroke-width="'+gap+'"/>';
      }
    }
    return '<svg viewBox="0 0 180 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect width="180" height="100" fill="'+mort+'"/>' + rows + '</svg>';
  }

  if (el.tipo === 'deco-elevator') {
    var c = p.color || '#546e7a', door = p.door || '#b0bec5';
    return '<svg viewBox="0 0 70 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="2" width="62" height="156" rx="4" fill="#e8e8e2" stroke="'+c+'" stroke-width="3"/>' +
      '<rect x="10" y="20" width="50" height="100" rx="2" fill="'+door+'" stroke="'+c+'" stroke-width="2"/>' +
      '<rect x="10" y="20" width="24" height="100" rx="2" fill="'+door+'" stroke="'+c+'" stroke-width="1.5"/>' +
      '<rect x="35" y="20" width="25" height="100" rx="2" fill="'+door+'" stroke="'+c+'" stroke-width="1.5"/>' +
      '<line x1="34" y1="20" x2="34" y2="120" stroke="'+c+'" stroke-width="2"/>' +
      '<circle cx="28" cy="70" r="3" fill="'+c+'"/>' +
      '<circle cx="42" cy="70" r="3" fill="'+c+'"/>' +
      '<rect x="10" y="124" width="50" height="28" rx="2" fill="'+c+'"/>' +
      '<circle cx="22" cy="138" r="4" fill="#f9a825"/>' +
      '<circle cx="35" cy="138" r="4" fill="#e0e0d8"/>' +
      '<circle cx="48" cy="138" r="4" fill="#e0e0d8"/>' +
      '<line x1="35" y1="2" x2="35" y2="18" stroke="'+c+'" stroke-width="3"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-pallet') {
    var cb = p.colorBox || '#a0785a', cp = p.colorPallet || '#c8a060';
    return '<svg viewBox="0 0 110 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="5" y="58" width="100" height="10" rx="2" fill="'+cp+'" stroke="#8a6830" stroke-width="1.5"/>' +
      '<rect x="8" y="48" width="14" height="12" rx="1" fill="'+cp+'" stroke="#8a6830" stroke-width="1"/>' +
      '<rect x="48" y="48" width="14" height="12" rx="1" fill="'+cp+'" stroke="#8a6830" stroke-width="1"/>' +
      '<rect x="88" y="48" width="14" height="12" rx="1" fill="'+cp+'" stroke="#8a6830" stroke-width="1"/>' +
      '<rect x="5" y="66" width="100" height="8" rx="2" fill="'+cp+'" stroke="#8a6830" stroke-width="1.5"/>' +
      '<rect x="8"  y="22" width="44" height="28" rx="2" fill="'+cb+'" stroke="#6a4830" stroke-width="1.5"/>' +
      '<rect x="58" y="22" width="44" height="28" rx="2" fill="'+cb+'" stroke="#6a4830" stroke-width="1.5"/>' +
      '<rect x="8"  y="8"  width="44" height="16" rx="2" fill="'+cb+'" stroke="#6a4830" stroke-width="1.5"/>' +
      '<rect x="58" y="8"  width="44" height="16" rx="2" fill="'+cb+'" stroke="#6a4830" stroke-width="1.5"/>' +
      '<line x1="8" y1="22" x2="52" y2="22" stroke="#6a4830" stroke-width="1"/>' +
      '<line x1="58" y1="22" x2="102" y2="22" stroke="#6a4830" stroke-width="1"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-cone') {
    var cA = p.colorA || '#f44336';
    return '<svg viewBox="0 0 50 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<polygon points="25,4 45,60 5,60" fill="'+cA+'" stroke="#b71c1c" stroke-width="1.5"/>' +
      '<rect x="5" y="28" width="40" height="8" fill="#fff" opacity=".85"/>' +
      '<rect x="5" y="44" width="40" height="8" fill="#fff" opacity=".85"/>' +
      '<ellipse cx="25" cy="60" rx="22" ry="6" fill="'+cA+'" stroke="#b71c1c" stroke-width="1.5"/>' +
      '<rect x="3" y="64" width="44" height="8" rx="3" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-rack') {
    var c = p.color || '#1565c0', sh = p.shelf || '#e0e0d8';
    return '<svg viewBox="0 0 140 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4"   y="2" width="8" height="116" rx="2" fill="'+c+'"/>' +
      '<rect x="128" y="2" width="8" height="116" rx="2" fill="'+c+'"/>' +
      '<rect x="4" y="12"  width="132" height="8" rx="1" fill="'+c+'"/>' +
      '<rect x="4" y="54"  width="132" height="8" rx="1" fill="'+c+'"/>' +
      '<rect x="4" y="96"  width="132" height="8" rx="1" fill="'+c+'"/>' +
      '<rect x="4" y="108" width="132" height="8" rx="1" fill="'+c+'"/>' +
      '<rect x="14" y="20" width="28" height="34" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>' +
      '<rect x="48" y="20" width="44" height="34" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>' +
      '<rect x="98" y="28" width="30" height="26" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>' +
      '<rect x="14" y="62" width="50" height="34" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>' +
      '<rect x="70" y="62" width="28" height="34" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>' +
      '<rect x="100" y="62" width="28" height="34" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-barrel') {
    var c = p.color || '#2e7d32';
    return '<svg viewBox="0 0 55 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<ellipse cx="27.5" cy="12" rx="24" ry="7" fill="'+c+'" stroke="#1a4a1a" stroke-width="2"/>' +
      '<rect x="3.5" y="12" width="48" height="56" fill="'+c+'" stroke="'+c+'"/>' +
      '<ellipse cx="27.5" cy="68" rx="24" ry="7" fill="#1a4a1a" stroke="#0a2a0a" stroke-width="2"/>' +
      '<line x1="3.5" y1="28" x2="51.5" y2="28" stroke="#1a4a1a" stroke-width="3"/>' +
      '<line x1="3.5" y1="52" x2="51.5" y2="52" stroke="#1a4a1a" stroke-width="3"/>' +
      '<rect x="14" y="36" width="28" height="14" rx="2" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.5)" stroke-width="1"/>' +
      '<text x="27.5" y="46" font-family="monospace" font-size="6" fill="#fff" text-anchor="middle" font-weight="bold">200L</text>' +
    '</svg>';
  }

  if (el.tipo === 'deco-conveyor') {
    var c = p.color || '#546e7a', belt = p.belt || '#3a3a36';
    return '<svg viewBox="0 0 180 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="16" y="18" width="148" height="24" rx="4" fill="'+belt+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="20" y="22" width="140" height="16" rx="2" fill="#5a5a56"/>' +
      '<line x1="20" y1="22" x2="160" y2="22" stroke="#7a7a76" stroke-width="1" stroke-dasharray="10,8"/>' +
      '<line x1="20" y1="38" x2="160" y2="38" stroke="#7a7a76" stroke-width="1" stroke-dasharray="10,8"/>' +
      '<circle cx="16"  cy="30" r="12" fill="'+c+'" stroke="#2e4a5a" stroke-width="2"/>' +
      '<circle cx="16"  cy="30" r="5" fill="#2e4a5a"/>' +
      '<circle cx="164" cy="30" r="12" fill="'+c+'" stroke="#2e4a5a" stroke-width="2"/>' +
      '<circle cx="164" cy="30" r="5" fill="#2e4a5a"/>' +
      '<rect x="24"  y="42" width="8" height="22" rx="2" fill="'+c+'" stroke="#2e4a5a" stroke-width="1.5"/>' +
      '<rect x="74"  y="42" width="8" height="22" rx="2" fill="'+c+'" stroke="#2e4a5a" stroke-width="1.5"/>' +
      '<rect x="124" y="42" width="8" height="22" rx="2" fill="'+c+'" stroke="#2e4a5a" stroke-width="1.5"/>' +
      '<rect x="148" y="42" width="8" height="22" rx="2" fill="'+c+'" stroke="#2e4a5a" stroke-width="1.5"/>' +
      '<rect x="18"  y="62" width="144" height="6" rx="2" fill="'+c+'" stroke="#2e4a5a" stroke-width="1.5"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-excavator') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 160 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="70" width="140" height="18" rx="4" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="6" y="74" width="14" height="10" rx="2" fill="#5a5a56"/>' +
      '<rect x="140" y="74" width="14" height="10" rx="2" fill="#5a5a56"/>' +
      '<circle cx="24"  cy="88" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="24"  cy="88" r="4" fill="#5a5a56"/>' +
      '<circle cx="60"  cy="88" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="60"  cy="88" r="4" fill="#5a5a56"/>' +
      '<circle cx="100" cy="88" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="100" cy="88" r="4" fill="#5a5a56"/>' +
      '<circle cx="136" cy="88" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="136" cy="88" r="4" fill="#5a5a56"/>' +
      '<rect x="20" y="40" width="80" height="34" rx="4" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<rect x="24" y="44" width="38" height="24" rx="2" fill="rgba(255,255,255,.4)"/>' +
      '<rect x="24" y="44" width="38" height="14" rx="2" fill="rgba(255,255,255,.55)"/>' +
      '<line x1="100" y1="52" x2="132" y2="32" stroke="'+c+'" stroke-width="7" stroke-linecap="round"/>' +
      '<line x1="132" y1="32" x2="148" y2="52" stroke="'+c+'" stroke-width="6" stroke-linecap="round"/>' +
      '<line x1="100" y1="52" x2="108" y2="58" stroke="#c07800" stroke-width="3"/>' +
      '<polygon points="146,50 158,50 155,66 142,66" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-person-walk') {
    var c = p.color || '#1565c0', sk = p.skin || '#f5c28a';
    return '<svg viewBox="0 0 45 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<ellipse cx="22" cy="10" rx="8" ry="9" fill="'+sk+'" stroke="#8a5a2a" stroke-width="1.5"/>' +
      '<rect x="12" y="19" width="20" height="28" rx="3" fill="'+c+'" stroke="#0a3a80" stroke-width="1.5"/>' +
      '<line x1="12" y1="25" x2="5"  y2="42" stroke="'+sk+'" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="32" y1="25" x2="40" y2="40" stroke="'+sk+'" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="18" y1="47" x2="14" y2="74" stroke="#2a2a26" stroke-width="6" stroke-linecap="round"/>' +
      '<line x1="26" y1="47" x2="32" y2="72" stroke="#2a2a26" stroke-width="6" stroke-linecap="round"/>' +
      '<line x1="14" y1="74" x2="6"  y2="90" stroke="#2a2a26" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="32" y1="72" x2="38" y2="88" stroke="#2a2a26" stroke-width="5" stroke-linecap="round"/>' +
      '<rect x="4"  y="88" width="14" height="7" rx="2" fill="#1a1a16"/>' +
      '<rect x="32" y="86" width="12" height="7" rx="2" fill="#1a1a16"/>' +
    '</svg>';
  }

  if (el.tipo === 'deco-sign-hard') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="76" height="76" rx="6" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<ellipse cx="40" cy="25" rx="14" ry="13" fill="#f0f0e8" stroke="#9a8030" stroke-width="1.5"/>' +
      '<path d="M26 22 Q40 10 54 22" fill="'+c+'" stroke="#c07800" stroke-width="2.5"/>' +
      '<ellipse cx="40" cy="24" rx="7" ry="7" fill="#f5c28a" stroke="#9a7050" stroke-width="1"/>' +
      '<rect x="30" y="38" width="20" height="22" rx="2" fill="#f0f0e8" stroke="#9a8030" stroke-width="1.5"/>' +
      '<rect x="25" y="40" width="8"  height="16" rx="2" fill="#f0f0e8" stroke="#9a8030" stroke-width="1"/>' +
      '<rect x="47" y="40" width="8"  height="16" rx="2" fill="#f0f0e8" stroke="#9a8030" stroke-width="1"/>' +
      '<rect x="32" y="60" width="7" height="14" rx="2" fill="#f0f0e8" stroke="#9a8030" stroke-width="1"/>' +
      '<rect x="41" y="60" width="7" height="14" rx="2" fill="#f0f0e8" stroke="#9a8030" stroke-width="1"/>' +
      '<text x="40" y="76" font-family="monospace" font-size="5" fill="#c07800" text-anchor="middle" font-weight="bold">EPI OBLIGATORIO</text>' +
    '</svg>';
  }


  /* ══════════════ CONSTRUCCIÓN EXTRA ══════════════ */
  if (el.tipo === 'deco-helmet') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<ellipse cx="40" cy="38" rx="34" ry="28" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<path d="M6 52 Q6 62 14 62 L66 62 Q74 62 74 52" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<rect x="6" y="52" width="68" height="12" rx="4" fill="#e0d090" stroke="#c09820" stroke-width="1.5"/>' +
      '<path d="M12 42 Q40 18 68 42" fill="rgba(255,255,255,0.22)" stroke="none"/>' +
      '<text x="40" y="44" font-family="monospace" font-size="7" fill="#7a5800" text-anchor="middle" font-weight="bold">EPI</text>' +
    '</svg>';
  }
  if (el.tipo === 'deco-fire-ext') {
    return '<svg viewBox="0 0 60 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="20" y="30" width="22" height="54" rx="4" fill="#c62828" stroke="#8a1010" stroke-width="2"/>' +
      '<ellipse cx="31" cy="30" rx="11" ry="6" fill="#c62828" stroke="#8a1010" stroke-width="2"/>' +
      '<ellipse cx="31" cy="84" rx="11" ry="5" fill="#8a1010" stroke="#6a0808" stroke-width="1.5"/>' +
      '<rect x="27" y="10" width="8" height="20" rx="3" fill="#9a9a90" stroke="#5a5a50" stroke-width="1.5"/>' +
      '<rect x="22" y="8" width="18" height="6" rx="2" fill="#5a5a50" stroke="#3a3a30" stroke-width="1"/>' +
      '<path d="M35 12 Q46 5 50 13 Q42 9 38 17" fill="#9a9a90" stroke="#5a5a50" stroke-width="1"/>' +
      '<rect x="22" y="46" width="18" height="8" rx="1" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>' +
      '<text x="31" y="52" font-family="monospace" font-size="4" fill="white" text-anchor="middle">FUEGO</text>' +
      '<rect x="8" y="70" width="12" height="8" rx="2" fill="#9a9a90" stroke="#5a5a50" stroke-width="1"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-safety-exit') {
    return '<svg viewBox="0 0 80 60" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="1" y="1" width="78" height="58" rx="4" fill="#2e7d32" stroke="#1a5a1a" stroke-width="2"/>' +
      '<ellipse cx="22" cy="14" rx="6" ry="6" fill="white"/>' +
      '<rect x="16" y="20" width="12" height="16" rx="2" fill="white"/>' +
      '<line x1="16" y1="24" x2="9" y2="30" stroke="white" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="28" y1="24" x2="35" y2="30" stroke="white" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="18" y="36" width="6" height="12" rx="1" fill="white"/>' +
      '<rect x="26" y="36" width="6" height="12" rx="1" fill="white"/>' +
      '<line x1="40" y1="20" x2="68" y2="20" stroke="white" stroke-width="2.5"/>' +
      '<polygon points="68,13 78,27 68,27" fill="white"/>' +
      '<rect x="40" y="34" width="28" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/>' +
      '<line x1="54" y1="34" x2="54" y2="52" stroke="white" stroke-width="2"/>' +
      '<text x="40" y="57" font-family="monospace" font-size="4" fill="rgba(255,255,255,0.8)" text-anchor="middle">SALIDA EMERGENCIA</text>' +
    '</svg>';
  }
  if (el.tipo === 'deco-first-aid') {
    return '<svg viewBox="0 0 70 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="66" height="66" rx="8" fill="white" stroke="#c62828" stroke-width="3"/>' +
      '<rect x="28" y="10" width="14" height="50" rx="3" fill="#c62828"/>' +
      '<rect x="10" y="28" width="50" height="14" rx="3" fill="#c62828"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-electric-hazard') {
    return '<svg viewBox="0 0 70 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<polygon points="35,3 67,62 3,62" fill="#f9a825" stroke="#c07800" stroke-width="2.5"/>' +
      '<polygon points="38,18 28,40 36,40 30,58 44,30 36,30" fill="#1a1a14" stroke="none"/>' +
      '<text x="35" y="68" font-family="monospace" font-size="5" fill="#c07800" text-anchor="middle">ALTA TENSIÓN</text>' +
    '</svg>';
  }
  if (el.tipo === 'deco-road-barrier') {
    var c = p.color || '#f44336';
    return '<svg viewBox="0 0 120 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="22" width="116" height="28" rx="4" fill="#f0f0e8" stroke="#b0b0a0" stroke-width="2"/>' +
      '<rect x="2"  y="22" width="28" height="28" rx="2" fill="'+c+'"/>' +
      '<rect x="32" y="22" width="28" height="28" rx="2" fill="white"/>' +
      '<rect x="62" y="22" width="28" height="28" rx="2" fill="'+c+'"/>' +
      '<rect x="92" y="22" width="26" height="28" rx="2" fill="white"/>' +
      '<rect x="10" y="2"  width="8" height="22" rx="2" fill="#9a9a90" stroke="#6a6a60" stroke-width="1.5"/>' +
      '<rect x="102" y="2" width="8" height="22" rx="2" fill="#9a9a90" stroke="#6a6a60" stroke-width="1.5"/>' +
      '<rect x="2" y="50" width="116" height="8" rx="2" fill="#3a3a36"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-scaffold') {
    var c = p.color || '#9a9a90';
    return '<svg viewBox="0 0 150 180" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4"   y="2"  width="8" height="170" rx="2" fill="'+c+'" stroke="#6a6a60" stroke-width="1"/>' +
      '<rect x="70"  y="2"  width="8" height="170" rx="2" fill="'+c+'" stroke="#6a6a60" stroke-width="1"/>' +
      '<rect x="138" y="2"  width="8" height="170" rx="2" fill="'+c+'" stroke="#6a6a60" stroke-width="1"/>' +
      '<rect x="4" y="30"  width="142" height="6" rx="1" fill="'+c+'" stroke="#6a6a60" stroke-width="1"/>' +
      '<rect x="4" y="80"  width="142" height="6" rx="1" fill="'+c+'" stroke="#6a6a60" stroke-width="1"/>' +
      '<rect x="4" y="130" width="142" height="6" rx="1" fill="'+c+'" stroke="#6a6a60" stroke-width="1"/>' +
      '<rect x="4" y="165" width="142" height="6" rx="1" fill="'+c+'" stroke="#6a6a60" stroke-width="1"/>' +
      '<rect x="8" y="36"  width="62" height="44" rx="0" fill="#e8d8a0" stroke="#c0a040" stroke-width="1"/>' +
      '<rect x="78" y="36" width="62" height="44" rx="0" fill="#e8d8a0" stroke="#c0a040" stroke-width="1"/>' +
      '<rect x="8" y="86"  width="62" height="44" rx="0" fill="#e8d8a0" stroke="#c0a040" stroke-width="1"/>' +
      '<rect x="78" y="86" width="62" height="44" rx="0" fill="#e8d8a0" stroke="#c0a040" stroke-width="1"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-wheelbarrow') {
    var c = p.color || '#5a8a3a';
    return '<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<path d="M10 60 Q30 20 80 25 L80 52 Q30 50 10 60Z" fill="'+c+'" stroke="#3a6020" stroke-width="2"/>' +
      '<line x1="10" y1="60" x2="2"  y2="72" stroke="#5a4030" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="80" y1="52" x2="96" y2="70" stroke="#5a4030" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="80" y1="25" x2="96" y2="10" stroke="#5a4030" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="20" cy="66" r="12" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="20" cy="66" r="5"  fill="#5a5a56"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-cement-mixer') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 120 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="55" width="76" height="36" rx="4" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<rect x="14" y="59" width="30" height="24" rx="1" fill="rgba(0,0,0,.12)"/>' +
      '<circle cx="26" cy="91" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="26" cy="91" r="4"  fill="#5a5a56"/>' +
      '<circle cx="68" cy="91" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="68" cy="91" r="4"  fill="#5a5a56"/>' +
      '<ellipse cx="90" cy="36" rx="26" ry="32" fill="#9a9a90" stroke="#6a6a60" stroke-width="2" transform="rotate(-20,90,36)"/>' +
      '<ellipse cx="90" cy="36" rx="16" ry="22" fill="#7a7a70" stroke="#5a5a50" stroke-width="1" transform="rotate(-20,90,36)"/>' +
      '<line x1="86" y1="68" x2="86" y2="55" stroke="#6a6a60" stroke-width="4" stroke-linecap="round"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-bulldozer') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 170 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="18" width="162" height="22" rx="3" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="18"  cy="40" r="12" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="18"  cy="40" r="5" fill="#5a5a56"/>' +
      '<circle cx="56"  cy="40" r="12" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="56"  cy="40" r="5" fill="#5a5a56"/>' +
      '<circle cx="114" cy="40" r="12" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="114" cy="40" r="5" fill="#5a5a56"/>' +
      '<circle cx="152" cy="40" r="12" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="152" cy="40" r="5" fill="#5a5a56"/>' +
      '<rect x="25" y="2" width="90" height="40" rx="4" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<rect x="28" y="6" width="40" height="26" rx="2" fill="rgba(255,255,255,.4)"/>' +
      '<rect x="2" y="52" width="18" height="40" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>' +
      '<rect x="2" y="88" width="100" height="12" rx="2" fill="#5a4030" stroke="#3a2810" stroke-width="1.5"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-dump-truck') {
    var c = p.color || '#f9a825', bed = p.bed || '#ffcc40';
    return '<svg viewBox="0 0 180 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="100" y="30" width="76" height="44" rx="4" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<rect x="104" y="35" width="32" height="24" rx="2" fill="rgba(255,255,255,.45)"/>' +
      '<polygon points="4,72 100,72 100,20 4,40" fill="'+bed+'" stroke="#c07800" stroke-width="2"/>' +
      '<circle cx="28"  cy="78" r="12" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="28"  cy="78" r="5" fill="#5a5a56"/>' +
      '<circle cx="76"  cy="78" r="12" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="76"  cy="78" r="5" fill="#5a5a56"/>' +
      '<circle cx="128" cy="78" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="128" cy="78" r="4" fill="#5a5a56"/>' +
      '<circle cx="158" cy="78" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="158" cy="78" r="4" fill="#5a5a56"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-ladder') {
    var c = p.color || '#9a9a90';
    return '<svg viewBox="0 0 60 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="8"  y="4" width="8" height="152" rx="3" fill="'+c+'" stroke="#6a6a60" stroke-width="1.5"/>' +
      '<rect x="44" y="4" width="8" height="152" rx="3" fill="'+c+'" stroke="#6a6a60" stroke-width="1.5"/>' +
      '<rect x="8" y="20"  width="44" height="6" rx="2" fill="#7a7a70" stroke="#5a5a50" stroke-width="1"/>' +
      '<rect x="8" y="44"  width="44" height="6" rx="2" fill="#7a7a70" stroke="#5a5a50" stroke-width="1"/>' +
      '<rect x="8" y="68"  width="44" height="6" rx="2" fill="#7a7a70" stroke="#5a5a50" stroke-width="1"/>' +
      '<rect x="8" y="92"  width="44" height="6" rx="2" fill="#7a7a70" stroke="#5a5a50" stroke-width="1"/>' +
      '<rect x="8" y="116" width="44" height="6" rx="2" fill="#7a7a70" stroke="#5a5a50" stroke-width="1"/>' +
      '<rect x="8" y="140" width="44" height="6" rx="2" fill="#7a7a70" stroke="#5a5a50" stroke-width="1"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-toolbox') {
    var c = p.color || '#c62828', lid = p.lid || '#e53935';
    return '<svg viewBox="0 0 80 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="30" width="72" height="36" rx="4" fill="'+c+'" stroke="#8a1010" stroke-width="2"/>' +
      '<rect x="4" y="28" width="72" height="18" rx="4" fill="'+lid+'" stroke="#8a1010" stroke-width="2"/>' +
      '<rect x="4" y="43" width="72" height="4" fill="#8a1010"/>' +
      '<rect x="28" y="16" width="24" height="14" rx="3" fill="#9a9a90" stroke="#6a6a60" stroke-width="2"/>' +
      '<circle cx="40" cy="50" r="5" fill="#f9a825" stroke="#c07800" stroke-width="1.5"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-wire-spool') {
    var c = p.color || '#f9a825', wire = p.wire || '#c62828';
    return '<svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<ellipse cx="40" cy="12" rx="36" ry="8" fill="#9a9a90" stroke="#6a6a60" stroke-width="2"/>' +
      '<rect x="4" y="12" width="72" height="56" fill="'+wire+'" stroke="'+wire+'"/>' +
      '<circle cx="40" cy="40" r="28" fill="'+wire+'" stroke="#8a0808" stroke-width="1"/>' +
      '<circle cx="40" cy="40" r="20" fill="#b01010"/>' +
      '<circle cx="40" cy="40" r="12" fill="#9a0808"/>' +
      '<circle cx="40" cy="40" r="6"  fill="'+c+'"/>' +
      '<ellipse cx="40" cy="12" rx="36" ry="8" fill="#9a9a90" stroke="#6a6a60" stroke-width="2"/>' +
      '<ellipse cx="40" cy="68" rx="36" ry="8" fill="#6a6a60" stroke="#4a4a40" stroke-width="2"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-welding') {
    var c = p.color || '#3a3a36';
    return '<svg viewBox="0 0 90 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="30" width="50" height="60" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="26" cy="58" r="8" fill="#1565c0" stroke="#0a3a80" stroke-width="1.5"/>' +
      '<circle cx="44" cy="58" r="8" fill="#1565c0" stroke="#0a3a80" stroke-width="1.5"/>' +
      '<rect x="20" y="70" width="30" height="14" rx="2" fill="#5a5a50" stroke="#3a3a2a" stroke-width="1"/>' +
      '<line x1="60" y1="50" x2="80" y2="30" stroke="#9a9a90" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="80" y1="30" x2="85" y2="60" stroke="#9a9a90" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="85" y1="60" x2="88" y2="72" stroke="#7a7a70" stroke-width="2"/>' +
      '<polygon points="85,72 90,80 82,78" fill="#f9a825" opacity="0.9"/>' +
      '<circle cx="86" cy="74" r="3" fill="#fffde0" opacity="0.8"/>' +
    '</svg>';
  }
  if (el.tipo === 'deco-compressor') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 120 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<ellipse cx="50" cy="45" rx="44" ry="36" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<ellipse cx="50" cy="45" rx="36" ry="28" fill="#1a4a90" stroke="#0a3a80" stroke-width="1"/>' +
      '<rect x="94" y="38" width="22" height="14" rx="3" fill="#9a9a90" stroke="#6a6a60" stroke-width="1.5"/>' +
      '<rect x="116" y="34" width="4" height="22" rx="2" fill="#7a7a70" stroke="#5a5a50" stroke-width="1"/>' +
      '<rect x="10" y="78" width="80" height="8" rx="3" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<text x="50" y="50" font-family="monospace" font-size="8" fill="white" text-anchor="middle" font-weight="bold">AIR</text>' +
    '</svg>';
  }

  /* ══════════════ AUTOMOCIÓN / ABS ══════════════ */
  if (el.tipo === 'auto-car-side') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 180 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<path d="M10 62 L10 44 Q20 28 60 22 L110 20 Q140 20 160 40 L170 44 L170 62 Z" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<path d="M25 44 Q30 30 58 26 L100 24 L108 44 Z" fill="rgba(180,220,255,0.6)" stroke="rgba(100,160,220,0.8)" stroke-width="1.5"/>' +
      '<path d="M112 44 L118 24 Q136 22 152 40 L158 44 Z" fill="rgba(180,220,255,0.6)" stroke="rgba(100,160,220,0.8)" stroke-width="1.5"/>' +
      '<line x1="110" y1="22" x2="112" y2="44" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="40"  cy="68" r="14" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="40"  cy="68" r="6"  fill="#5a5a56"/>' +
      '<circle cx="140" cy="68" r="14" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="140" cy="68" r="6"  fill="#5a5a56"/>' +
      '<rect x="158" y="52" width="12" height="8" rx="2" fill="#fffde0" stroke="#c0c000" stroke-width="1"/>' +
      '<rect x="2"   y="54" width="10" height="8" rx="2" fill="#f44336" stroke="#8a0808" stroke-width="1"/>' +
      '<line x1="12" y1="62" x2="168" y2="62" stroke="#0a3a80" stroke-width="2"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-car-top') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 140 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="20" y="20" width="100" height="200" rx="30" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<rect x="34" y="70"  width="30" height="50" rx="4" fill="rgba(180,220,255,0.6)" stroke="rgba(100,160,220,0.8)" stroke-width="1.5"/>' +
      '<rect x="76" y="70"  width="30" height="50" rx="4" fill="rgba(180,220,255,0.6)" stroke="rgba(100,160,220,0.8)" stroke-width="1.5"/>' +
      '<rect x="34" y="130" width="30" height="44" rx="4" fill="rgba(180,220,255,0.45)" stroke="rgba(100,160,220,0.7)" stroke-width="1.5"/>' +
      '<rect x="76" y="130" width="30" height="44" rx="4" fill="rgba(180,220,255,0.45)" stroke="rgba(100,160,220,0.7)" stroke-width="1.5"/>' +
      '<rect x="28" y="20"  width="84" height="22" rx="12" fill="#fffde0" stroke="#c0c000" stroke-width="1.5"/>' +
      '<rect x="28" y="198" width="84" height="22" rx="12" fill="#f44336" stroke="#8a0808" stroke-width="1.5"/>' +
      '<line x1="70" y1="20" x2="70" y2="220" stroke="#0a3a80" stroke-width="1" stroke-dasharray="4,4"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-wheel') {
    var c = p.color || '#3a3a36';
    return '<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<circle cx="50" cy="50" r="46" fill="'+c+'" stroke="#1a1a14" stroke-width="3"/>' +
      '<circle cx="50" cy="50" r="36" fill="#5a5a56" stroke="#3a3a36" stroke-width="2"/>' +
      '<circle cx="50" cy="50" r="20" fill="#9a9a90" stroke="#6a6a60" stroke-width="2"/>' +
      '<circle cx="50" cy="50" r="10" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<line x1="50" y1="30" x2="50" y2="16" stroke="#7a7a70" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="50" y1="84" x2="50" y2="70" stroke="#7a7a70" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="16" y1="50" x2="30" y2="50" stroke="#7a7a70" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="70" y1="50" x2="84" y2="50" stroke="#7a7a70" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="26" y1="26" x2="36" y2="36" stroke="#7a7a70" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="74" y1="74" x2="64" y2="64" stroke="#7a7a70" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="74" y1="26" x2="64" y2="36" stroke="#7a7a70" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="26" y1="74" x2="36" y2="64" stroke="#7a7a70" stroke-width="4" stroke-linecap="round"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-engine') {
    var c = p.color || '#3a3a36';
    return '<svg viewBox="0 0 160 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="20" y="30" width="120" height="70" rx="6" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="30" y="14" width="20" height="20" rx="3" fill="#5a5a56" stroke="#3a3a36" stroke-width="1.5"/>' +
      '<rect x="70" y="14" width="20" height="20" rx="3" fill="#5a5a56" stroke="#3a3a36" stroke-width="1.5"/>' +
      '<rect x="110" y="14" width="20" height="20" rx="3" fill="#5a5a56" stroke="#3a3a36" stroke-width="1.5"/>' +
      '<rect x="24" y="34" width="112" height="24" rx="3" fill="#2a2a26" stroke="#1a1a14" stroke-width="1"/>' +
      '<circle cx="40"  cy="46" r="8" fill="#6a6a60" stroke="#4a4a40" stroke-width="1.5"/>' +
      '<circle cx="70"  cy="46" r="8" fill="#6a6a60" stroke="#4a4a40" stroke-width="1.5"/>' +
      '<circle cx="100" cy="46" r="8" fill="#6a6a60" stroke="#4a4a40" stroke-width="1.5"/>' +
      '<circle cx="130" cy="46" r="8" fill="#6a6a60" stroke="#4a4a40" stroke-width="1.5"/>' +
      '<rect x="24" y="62" width="112" height="34" rx="3" fill="#1a1a14" stroke="#0a0a08" stroke-width="1"/>' +
      '<rect x="4"  y="48" width="18" height="30" rx="3" fill="#4a4a40" stroke="#2a2a26" stroke-width="1.5"/>' +
      '<rect x="138" y="48" width="18" height="30" rx="3" fill="#4a4a40" stroke="#2a2a26" stroke-width="1.5"/>' +
      '<text x="80" y="84" font-family="monospace" font-size="7" fill="#f0f0e8" text-anchor="middle" font-weight="bold">ENGINE</text>' +
    '</svg>';
  }
  if (el.tipo === 'auto-abs-module') {
    var c = p.color || '#263238';
    return '<svg viewBox="0 0 140 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="8" width="132" height="80" rx="6" fill="'+c+'" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="10" y="14" width="120" height="34" rx="3" fill="#1a2630" stroke="#0a1620" stroke-width="1"/>' +
      '<text x="70" y="26" font-family="monospace" font-size="10" fill="#00e5ff" text-anchor="middle" font-weight="bold" letter-spacing="3">ABS</text>' +
      '<text x="70" y="40" font-family="monospace" font-size="6" fill="#607d8b" text-anchor="middle">ANTI-LOCK BRAKING</text>' +
      '<rect x="10" y="52" width="26" height="16" rx="2" fill="#f9a825" stroke="#c07800" stroke-width="1.5"/>' +
      '<text x="23" y="63" font-family="monospace" font-size="6" fill="#1a1a14" text-anchor="middle" font-weight="bold">PUMP</text>' +
      '<rect x="40" y="52" width="26" height="16" rx="2" fill="#2e7d32" stroke="#1a5a1a" stroke-width="1.5"/>' +
      '<text x="53" y="63" font-family="monospace" font-size="6" fill="white" text-anchor="middle" font-weight="bold">ECU</text>' +
      '<rect x="70" y="52" width="26" height="16" rx="2" fill="#1565c0" stroke="#0a3a80" stroke-width="1.5"/>' +
      '<text x="83" y="63" font-family="monospace" font-size="6" fill="white" text-anchor="middle" font-weight="bold">SENS</text>' +
      '<rect x="100" y="52" width="26" height="16" rx="2" fill="#c62828" stroke="#8a1010" stroke-width="1.5"/>' +
      '<text x="113" y="63" font-family="monospace" font-size="6" fill="white" text-anchor="middle" font-weight="bold">VALV</text>' +
      '<rect x="10" y="72" width="120" height="10" rx="2" fill="#0a1620"/>' +
      '<circle cx="20"  cy="77" r="3" fill="#00e5ff"/>' +
      '<circle cx="34"  cy="77" r="3" fill="#2e7d32"/>' +
      '<circle cx="48"  cy="77" r="3" fill="#f9a825"/>' +
      '<circle cx="62"  cy="77" r="3" fill="#2e7d32"/>' +
      '<circle cx="76"  cy="77" r="3" fill="#c62828"/>' +
      '<circle cx="90"  cy="77" r="3" fill="#2e7d32"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-brake-disc') {
    var c = p.color || '#5a5a56';
    return '<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<circle cx="50" cy="50" r="46" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="50" cy="50" r="40" fill="'+c+'" stroke="#3a3a36" stroke-width="2"/>' +
      '<circle cx="50" cy="50" r="28" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<circle cx="50" cy="50" r="14" fill="'+c+'" stroke="#3a3a36" stroke-width="1.5"/>' +
      '<circle cx="50" cy="50" r="6"  fill="#1a1a14"/>' +
      '<line x1="50" y1="22" x2="50" y2="28" stroke="#6a6a60" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="78" y1="50" x2="72" y2="50" stroke="#6a6a60" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="50" y1="78" x2="50" y2="72" stroke="#6a6a60" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="22" y1="50" x2="28" y2="50" stroke="#6a6a60" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="60" y="16" width="18" height="30" rx="4" fill="#c62828" stroke="#8a1010" stroke-width="1.5" opacity="0.9"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-caliper') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 110 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="14" width="80" height="52" rx="6" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<rect x="10" y="20" width="68" height="18" rx="3" fill="#c07800" stroke="#8a5800" stroke-width="1"/>' +
      '<rect x="10" y="42" width="68" height="18" rx="3" fill="#c07800" stroke="#8a5800" stroke-width="1"/>' +
      '<rect x="84" y="18" width="22" height="18" rx="3" fill="#8a6000" stroke="#6a4000" stroke-width="1.5"/>' +
      '<rect x="84" y="44" width="22" height="18" rx="3" fill="#8a6000" stroke="#6a4000" stroke-width="1.5"/>' +
      '<circle cx="26" cy="29" r="7" fill="#8a5800" stroke="#6a3800" stroke-width="1.5"/>' +
      '<circle cx="26" cy="51" r="7" fill="#8a5800" stroke="#6a3800" stroke-width="1.5"/>' +
      '<circle cx="60" cy="29" r="7" fill="#8a5800" stroke="#6a3800" stroke-width="1.5"/>' +
      '<circle cx="60" cy="51" r="7" fill="#8a5800" stroke="#6a3800" stroke-width="1.5"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-suspension') {
    var c = p.color || '#5a5a56';
    return '<svg viewBox="0 0 100 140" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<line x1="50" y1="4" x2="50" y2="30" stroke="'+c+'" stroke-width="8" stroke-linecap="round"/>' +
      '<rect x="28" y="30" width="44" height="18" rx="4" fill="#9a9a90" stroke="#6a6a60" stroke-width="2"/>' +
      '<path d="M44 48 Q38 56 44 64 Q50 72 44 80 Q38 88 44 96" fill="none" stroke="'+c+'" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M50 48 Q56 56 50 64 Q44 72 50 80 Q56 88 50 96" fill="none" stroke="'+c+'" stroke-width="5" stroke-linecap="round"/>' +
      '<rect x="30" y="96" width="40" height="16" rx="4" fill="#9a9a90" stroke="#6a6a60" stroke-width="2"/>' +
      '<line x1="50" y1="112" x2="50" y2="136" stroke="'+c+'" stroke-width="8" stroke-linecap="round"/>' +
      '<circle cx="50" cy="136" r="8" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-gearbox') {
    var c = p.color || '#3a3a36';
    return '<svg viewBox="0 0 140 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="20" width="120" height="80" rx="8" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<ellipse cx="40" cy="60" rx="24" ry="24" fill="#5a5a56" stroke="#3a3a36" stroke-width="2"/>' +
      '<ellipse cx="40" cy="60" rx="14" ry="14" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<ellipse cx="100" cy="60" rx="18" ry="18" fill="#5a5a56" stroke="#3a3a36" stroke-width="2"/>' +
      '<ellipse cx="100" cy="60" rx="10" ry="10" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<rect x="60" y="55" width="26" height="10" rx="2" fill="#4a4a40" stroke="#2a2a26" stroke-width="1"/>' +
      '<rect x="4"  y="46" width="10" height="28" rx="3" fill="#4a4a40" stroke="#2a2a26" stroke-width="1.5"/>' +
      '<rect x="126" y="46" width="10" height="28" rx="3" fill="#4a4a40" stroke="#2a2a26" stroke-width="1.5"/>' +
      '<text x="40"  y="64" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">IN</text>' +
      '<text x="100" y="64" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">OUT</text>' +
    '</svg>';
  }
  if (el.tipo === 'auto-battery-ev') {
    var c = p.color || '#2e7d32';
    return '<svg viewBox="0 0 160 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="14" width="148" height="64" rx="6" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="152" y="30" width="6" height="30" rx="2" fill="#607d8b" stroke="#37474f" stroke-width="1"/>' +
      '<rect x="8" y="18" width="140" height="56" rx="4" fill="#37474f" stroke="#263238" stroke-width="1"/>' +
      '<rect x="12" y="22" width="28" height="48" rx="3" fill="'+c+'" stroke="#1a5a1a" stroke-width="1"/>' +
      '<rect x="44" y="22" width="28" height="48" rx="3" fill="'+c+'" stroke="#1a5a1a" stroke-width="1"/>' +
      '<rect x="76" y="22" width="28" height="48" rx="3" fill="'+c+'" stroke="#1a5a1a" stroke-width="1"/>' +
      '<rect x="108" y="22" width="28" height="48" rx="3" fill="'+c+'" stroke="#1a5a1a" stroke-width="1"/>' +
      '<line x1="40"  y1="22" x2="40"  y2="70" stroke="#1a2630" stroke-width="2"/>' +
      '<line x1="72"  y1="22" x2="72"  y2="70" stroke="#1a2630" stroke-width="2"/>' +
      '<line x1="104" y1="22" x2="104" y2="70" stroke="#1a2630" stroke-width="2"/>' +
      '<text x="80" y="48" font-family="monospace" font-size="7" fill="#00e676" text-anchor="middle" font-weight="bold">EV BATTERY</text>' +
      '<text x="80" y="60" font-family="monospace" font-size="5" fill="#607d8b" text-anchor="middle">400V · 75kWh</text>' +
    '</svg>';
  }
  if (el.tipo === 'auto-robot-arm') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 130 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="40" y="120" width="50" height="36" rx="4" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="65" cy="120" r="16" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<circle cx="65" cy="120" r="8"  fill="#c07800"/>' +
      '<rect x="58" y="54" width="14" height="66" rx="4" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<circle cx="65" cy="54" r="12" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<circle cx="65" cy="54" r="6"  fill="#c07800"/>' +
      '<rect x="65" y="24" width="38" height="12" rx="4" fill="'+c+'" stroke="#c07800" stroke-width="2" transform="rotate(-30,65,54)"/>' +
      '<circle cx="98" cy="38" r="10" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<circle cx="98" cy="38" r="5"  fill="#c07800"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-spot-weld') {
    var c = p.color || '#3a3a36';
    return '<svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="30" y="100" width="60" height="16" rx="4" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="52" y="60" width="16" height="44" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="30" y="50" width="60" height="16" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="30" y="14" width="22" height="40" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="68" y="14" width="22" height="40" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<ellipse cx="41"  cy="14" rx="10" ry="7" fill="#5a5a56" stroke="#3a3a36" stroke-width="2"/>' +
      '<ellipse cx="79"  cy="14" rx="10" ry="7" fill="#5a5a56" stroke="#3a3a36" stroke-width="2"/>' +
      '<ellipse cx="60"  cy="60" rx="4"  ry="4" fill="#f9a825" opacity="0.9"/>' +
      '<circle cx="60" cy="60" r="8" fill="none" stroke="#f9a825" stroke-width="2" opacity="0.4"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-paint-gun') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 90 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="20" y="40" width="50" height="24" rx="4" fill="#5a5a56" stroke="#3a3a36" stroke-width="2"/>' +
      '<rect x="70" y="44" width="16" height="12" rx="2" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<rect x="30" y="64" width="30" height="22" rx="3" fill="#4a4a40" stroke="#2a2a26" stroke-width="1.5"/>' +
      '<rect x="36" y="86" width="18" height="20" rx="2" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<line x1="20" y1="50" x2="4" y2="50" stroke="#9a9a90" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="90" cy="44" rx="5" ry="4" fill="'+c+'" opacity="0.5"/>' +
      '<ellipse cx="95" cy="40" rx="7" ry="5" fill="'+c+'" opacity="0.3"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-car-body') {
    var c = p.color || '#c62828';
    return '<svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="50" width="192" height="50" rx="6" fill="'+c+'" stroke="#8a0808" stroke-width="2"/>' +
      '<path d="M10 50 L10 28 Q40 8 80 6 L130 6 Q168 8 190 28 L190 50 Z" fill="'+c+'" stroke="#8a0808" stroke-width="2"/>' +
      '<path d="M20 50 Q24 28 50 20 L80 16 L100 20 L100 50 Z" fill="rgba(180,220,255,0.35)" stroke="rgba(100,160,220,0.5)" stroke-width="1.5"/>' +
      '<path d="M104 20 L130 16 L158 20 Q172 28 180 50 L104 50 Z" fill="rgba(180,220,255,0.35)" stroke="rgba(100,160,220,0.5)" stroke-width="1.5"/>' +
      '<rect x="14" y="72" width="30" height="18" rx="3" fill="rgba(0,0,0,0.2)"/>' +
      '<rect x="156" y="72" width="30" height="18" rx="3" fill="rgba(0,0,0,0.2)"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-press-machine') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 130 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="2"  width="110" height="50" rx="4" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<rect x="20" y="6"  width="90"  height="18" rx="2" fill="rgba(255,255,255,.2)"/>' +
      '<rect x="50" y="52" width="30" height="50" rx="2" fill="#5a5a56" stroke="#3a3a36" stroke-width="1.5"/>' +
      '<rect x="20" y="102" width="90" height="18" rx="3" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<rect x="4"  y="120" width="122" height="36" rx="4" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="35" y="126" width="60" height="8" rx="2" fill="#c62828" stroke="#8a1010" stroke-width="1"/>' +
      '<circle cx="24" cy="32" r="8" fill="#f9a825" stroke="#c07800" stroke-width="1.5"/>' +
      '<circle cx="106" cy="32" r="8" fill="#f9a825" stroke="#c07800" stroke-width="1.5"/>' +
      '<text x="65" y="36" font-family="monospace" font-size="7" fill="white" text-anchor="middle">PRENSA</text>' +
    '</svg>';
  }
  if (el.tipo === 'auto-vin-scanner') {
    var c = p.color || '#263238';
    return '<svg viewBox="0 0 120 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="116" height="72" rx="6" fill="'+c+'" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="8" y="8" width="104" height="54" rx="3" fill="#f0f0e8" stroke="#d0d0c8" stroke-width="1"/>' +
      '<line x1="12" y1="14" x2="12" y2="56" stroke="#1a1a14" stroke-width="2"/>' +
      '<line x1="17" y1="14" x2="17" y2="56" stroke="#1a1a14" stroke-width="4"/>' +
      '<line x1="24" y1="14" x2="24" y2="56" stroke="#1a1a14" stroke-width="2"/>' +
      '<line x1="29" y1="14" x2="29" y2="56" stroke="#1a1a14" stroke-width="3"/>' +
      '<line x1="34" y1="14" x2="34" y2="56" stroke="#1a1a14" stroke-width="1"/>' +
      '<line x1="39" y1="14" x2="39" y2="56" stroke="#1a1a14" stroke-width="4"/>' +
      '<line x1="46" y1="14" x2="46" y2="56" stroke="#1a1a14" stroke-width="2"/>' +
      '<line x1="52" y1="14" x2="52" y2="56" stroke="#1a1a14" stroke-width="3"/>' +
      '<line x1="57" y1="14" x2="57" y2="56" stroke="#1a1a14" stroke-width="1"/>' +
      '<line x1="64" y1="14" x2="64" y2="56" stroke="#1a1a14" stroke-width="4"/>' +
      '<line x1="70" y1="14" x2="70" y2="56" stroke="#1a1a14" stroke-width="2"/>' +
      '<line x1="76" y1="14" x2="76" y2="56" stroke="#1a1a14" stroke-width="1"/>' +
      '<line x1="83" y1="14" x2="83" y2="56" stroke="#1a1a14" stroke-width="3"/>' +
      '<line x1="90" y1="14" x2="90" y2="56" stroke="#1a1a14" stroke-width="2"/>' +
      '<line x1="96" y1="14" x2="96" y2="56" stroke="#1a1a14" stroke-width="4"/>' +
      '<line x1="104" y1="14" x2="104" y2="56" stroke="#1a1a14" stroke-width="2"/>' +
      '<line x1="8" y1="35" x2="112" y2="35" stroke="#c62828" stroke-width="1.5" opacity="0.7"/>' +
      '<rect x="2" y="74" width="116" height="14" rx="4" fill="#37474f"/>' +
      '<text x="60" y="84" font-family="monospace" font-size="5" fill="#00e5ff" text-anchor="middle">VIN SCANNER · WBA123456789</text>' +
    '</svg>';
  }
  if (el.tipo === 'auto-tyre') {
    return '<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<circle cx="50" cy="50" r="46" fill="#1a1a14" stroke="#0a0a08" stroke-width="3"/>' +
      '<circle cx="50" cy="50" r="38" fill="#2a2a26" stroke="#1a1a14" stroke-width="1"/>' +
      '<rect x="8"  y="46" width="16" height="8" rx="2" fill="#0a0a08"/>' +
      '<rect x="76" y="46" width="16" height="8" rx="2" fill="#0a0a08"/>' +
      '<rect x="46" y="8"  width="8" height="16" rx="2" fill="#0a0a08"/>' +
      '<rect x="46" y="76" width="8" height="16" rx="2" fill="#0a0a08"/>' +
      '<circle cx="50" cy="50" r="18" fill="#9a9a90" stroke="#6a6a60" stroke-width="2"/>' +
      '<circle cx="50" cy="50" r="8"  fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-exhaust') {
    var c = p.color || '#5a5a56';
    return '<svg viewBox="0 0 160 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="28" width="100" height="14" rx="4" fill="'+c+'" stroke="#3a3a36" stroke-width="2"/>' +
      '<rect x="104" y="24" width="28" height="22" rx="5" fill="#7a7a70" stroke="#5a5a50" stroke-width="2"/>' +
      '<ellipse cx="132" cy="35" rx="4"  ry="11" fill="'+c+'" stroke="#3a3a36" stroke-width="2"/>' +
      '<ellipse cx="136" cy="35" rx="14" ry="12" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<ellipse cx="136" cy="35" rx="10" ry="8"  fill="#1a1a14"/>' +
      '<path d="M140 22 Q148 12 152 8" fill="none" stroke="#9a9a90" stroke-width="2" stroke-dasharray="3,3" opacity="0.6"/>' +
      '<path d="M143 20 Q154 8 158 4" fill="none" stroke="#9a9a90" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.4"/>' +
      '<rect x="4" y="24" width="16" height="22" rx="3" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
    '</svg>';
  }
  if (el.tipo === 'auto-dashboard') {
    return '<svg viewBox="0 0 200 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="196" height="116" rx="8" fill="#1a1a14" stroke="#0a0a08" stroke-width="2"/>' +
      '<rect x="8" y="8" width="90" height="64" rx="4" fill="#1a2630" stroke="#37474f" stroke-width="1"/>' +
      '<circle cx="53" cy="40" r="26" fill="#0a1620" stroke="#37474f" stroke-width="1.5"/>' +
      '<path d="M53 40 L53 24" stroke="white" stroke-width="2" stroke-linecap="round" transform="rotate(20,53,40)"/>' +
      '<circle cx="53" cy="40" r="4" fill="#c62828"/>' +
      '<text x="53" y="58" font-family="monospace" font-size="5" fill="#607d8b" text-anchor="middle">120 km/h</text>' +
      '<rect x="102" y="8" width="90" height="64" rx="4" fill="#1a2630" stroke="#37474f" stroke-width="1"/>' +
      '<circle cx="147" cy="40" r="26" fill="#0a1620" stroke="#37474f" stroke-width="1.5"/>' +
      '<path d="M147 40 L147 24" stroke="#f9a825" stroke-width="2" stroke-linecap="round" transform="rotate(-10,147,40)"/>' +
      '<circle cx="147" cy="40" r="4" fill="#c62828"/>' +
      '<text x="147" y="58" font-family="monospace" font-size="5" fill="#607d8b" text-anchor="middle">3200 rpm</text>' +
      '<circle cx="24"  cy="90" r="8" fill="#2e7d32"/>' +
      '<circle cx="44"  cy="90" r="8" fill="#c62828"/>' +
      '<circle cx="64"  cy="90" r="8" fill="#f9a825"/>' +
      '<circle cx="84"  cy="90" r="8" fill="#1565c0"/>' +
      '<rect x="140" y="80" width="52" height="22" rx="3" fill="#0a1620"/>' +
      '<text x="166" y="94" font-family="monospace" font-size="8" fill="#00e676" text-anchor="middle">READY</text>' +
    '</svg>';
  }
  if (el.tipo === 'auto-agv') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 150 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="20" width="130" height="60" rx="8" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<rect x="18" y="28" width="50" height="36" rx="4" fill="rgba(0,0,0,0.2)"/>' +
      '<rect x="80" y="28" width="52" height="16" rx="2" fill="#0a3a80"/>' +
      '<circle cx="96"  cy="36" r="5" fill="#00e676"/>' +
      '<circle cx="110" cy="36" r="5" fill="#f9a825"/>' +
      '<rect x="80" y="48" width="52" height="12" rx="2" fill="#0a3a80"/>' +
      '<text x="106" y="57" font-family="monospace" font-size="5" fill="#00e5ff" text-anchor="middle">AGV AUTO</text>' +
      '<circle cx="28"  cy="88" r="12" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="28"  cy="88" r="5" fill="#5a5a56"/>' +
      '<circle cx="72"  cy="88" r="12" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="72"  cy="88" r="5" fill="#5a5a56"/>' +
      '<circle cx="122" cy="88" r="12" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/><circle cx="122" cy="88" r="5" fill="#5a5a56"/>' +
      '<rect x="4"  y="68" width="8" height="12" rx="2" fill="#fffde0"/>' +
      '<rect x="138" y="68" width="8" height="12" rx="2" fill="#f44336"/>' +
    '</svg>';
  }

  /* ══════════════ FÁBRICA / MANUFACTURA ══════════════ */
  if (el.tipo === 'fab-robot-industrial') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 140 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="40" y="130" width="60" height="26" rx="4" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="52" y="112" width="36" height="20" rx="3" fill="#5a5a56" stroke="#3a3a36" stroke-width="1.5"/>' +
      '<rect x="56" y="70" width="28" height="44" rx="4" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<circle cx="70" cy="70" r="16" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<circle cx="70" cy="70" r="8"  fill="#c07800"/>' +
      '<rect x="70" y="32" width="44" height="12" rx="4" fill="'+c+'" stroke="#c07800" stroke-width="2" transform="rotate(-35,70,70)"/>' +
      '<circle cx="100" cy="44" r="12" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<circle cx="100" cy="44" r="6"  fill="#c07800"/>' +
      '<rect x="100" y="26" width="34" height="10" rx="3" fill="'+c+'" stroke="#c07800" stroke-width="1.5" transform="rotate(15,100,44)"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-cnc-machine') {
    var c = p.color || '#546e7a';
    return '<svg viewBox="0 0 160 140" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4"  y="4"  width="152" height="132" rx="6" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="12" y="12" width="136" height="70" rx="4" fill="#263238" stroke="#37474f" stroke-width="1"/>' +
      '<rect x="16" y="16" width="128" height="62" rx="2" fill="#1a2630"/>' +
      '<rect x="44" y="30" width="72" height="34" rx="2" fill="#0a1620" stroke="#37474f" stroke-width="1"/>' +
      '<circle cx="80" cy="50" r="10" fill="#5a5a56" stroke="#3a3a36" stroke-width="1.5"/>' +
      '<line x1="80" y1="60" x2="80" y2="80" stroke="#6a6a60" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="74" y="80" width="12" height="4" rx="1" fill="#9a9a90"/>' +
      '<rect x="12" y="88" width="136" height="42" rx="4" fill="#37474f" stroke="#263238" stroke-width="1"/>' +
      '<circle cx="30"  cy="110" r="7" fill="#2e7d32" stroke="#1a5a1a" stroke-width="1.5"/>' +
      '<circle cx="50"  cy="110" r="7" fill="#c62828" stroke="#8a1010" stroke-width="1.5"/>' +
      '<rect x="68" y="102" width="74" height="16" rx="2" fill="#263238"/>' +
      '<text x="105" y="113" font-family="monospace" font-size="6" fill="#00e5ff" text-anchor="middle">CNC G-CODE</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-lathe') {
    var c = p.color || '#546e7a';
    return '<svg viewBox="0 0 180 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="60" width="176" height="50" rx="4" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="10" y="68" width="160" height="24" rx="2" fill="#263238" stroke="#37474f" stroke-width="1"/>' +
      '<circle cx="28" cy="80" r="14" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="28" cy="80" r="8"  fill="#5a5a56"/>' +
      '<rect x="40" y="72" width="90" height="16" rx="2" fill="#4a4a40" stroke="#2a2a26" stroke-width="1"/>' +
      '<circle cx="148" cy="80" r="10" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="148" cy="80" r="5"  fill="#5a5a56"/>' +
      '<rect x="20" y="14" width="40" height="48" rx="4" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="130" y="34" width="44" height="28" rx="3" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="135" y="38" width="34" height="12" rx="2" fill="#263238"/>' +
      '<text x="152" y="47" font-family="monospace" font-size="5" fill="#00e5ff" text-anchor="middle">TORNO</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-drill-press') {
    var c = p.color || '#546e7a';
    return '<svg viewBox="0 0 100 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="30" y="150" width="40" height="8" rx="3" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<rect x="4"  y="130" width="92" height="22" rx="4" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="44" y="60" width="12" height="72" rx="3" fill="#5a5a56" stroke="#3a3a36" stroke-width="1.5"/>' +
      '<rect x="20" y="40" width="60" height="24" rx="4" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<circle cx="50" cy="52" r="12" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="20" y="10" width="60" height="32" rx="4" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="26" y="14" width="48" height="20" rx="2" fill="#263238"/>' +
      '<circle cx="32" cy="24" r="6" fill="#2e7d32" stroke="#1a5a1a" stroke-width="1"/>' +
      '<circle cx="68" cy="24" r="6" fill="#c62828" stroke="#8a1010" stroke-width="1"/>' +
      '<polygon points="44,148 56,148 50,158" fill="#5a5a56" stroke="#3a3a36" stroke-width="1"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-hydraulic-press') {
    var c = p.color || '#3a3a36';
    return '<svg viewBox="0 0 120 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="8"  y="2"  width="104" height="40" rx="4" fill="#546e7a" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="14" y="7"  width="92"  height="28" rx="2" fill="#37474f"/>' +
      '<rect x="52" y="42" width="16" height="50" rx="3" fill="#9a9a90" stroke="#6a6a60" stroke-width="1.5"/>' +
      '<rect x="8"  y="92" width="104" height="30" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="4"  y="122" width="112" height="34" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="32" y="96" width="56" height="20" rx="2" fill="#263238" stroke="#1a2630" stroke-width="1"/>' +
      '<circle cx="30" cy="18" r="7" fill="#f9a825" stroke="#c07800" stroke-width="1.5"/>' +
      '<circle cx="90" cy="18" r="7" fill="#c62828" stroke="#8a1010" stroke-width="1.5"/>' +
      '<text x="60" y="22" font-family="monospace" font-size="6" fill="#00e5ff" text-anchor="middle">250 TON</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-welding-station') {
    var c = p.color || '#3a3a36';
    return '<svg viewBox="0 0 140 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="70" width="132" height="56" rx="4" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="10" y="76" width="120" height="40" rx="2" fill="#1a2630"/>' +
      '<circle cx="30"  cy="96" r="10" fill="#546e7a" stroke="#37474f" stroke-width="1.5"/>' +
      '<circle cx="70"  cy="96" r="10" fill="#546e7a" stroke="#37474f" stroke-width="1.5"/>' +
      '<circle cx="110" cy="96" r="10" fill="#f9a825" stroke="#c07800" stroke-width="1.5"/>' +
      '<rect x="20" y="20" width="100" height="52" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="70" cy="40" r="12" fill="#f9a825" stroke="#c07800" stroke-width="2" opacity="0.85"/>' +
      '<circle cx="70" cy="40" r="5"  fill="white" opacity="0.9"/>' +
      '<text x="70" y="64" font-family="monospace" font-size="6" fill="#9a9a90" text-anchor="middle">MIG/TIG</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-paint-booth') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 160 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="156" height="116" rx="6" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<rect x="10" y="10" width="140" height="92" rx="4" fill="rgba(200,230,255,0.15)" stroke="rgba(180,220,255,0.4)" stroke-width="1.5"/>' +
      '<line x1="10" y1="30" x2="150" y2="30" stroke="rgba(180,220,255,0.5)" stroke-width="1"/>' +
      '<line x1="10" y1="60" x2="150" y2="60" stroke="rgba(180,220,255,0.5)" stroke-width="1"/>' +
      '<line x1="10" y1="90" x2="150" y2="90" stroke="rgba(180,220,255,0.5)" stroke-width="1"/>' +
      '<circle cx="24" cy="56" r="8" fill="rgba(180,220,255,0.3)" stroke="rgba(180,220,255,0.7)" stroke-width="1"/>' +
      '<circle cx="136" cy="56" r="8" fill="rgba(180,220,255,0.3)" stroke="rgba(180,220,255,0.7)" stroke-width="1"/>' +
      '<text x="80" y="52" font-family="monospace" font-size="7" fill="rgba(180,220,255,0.9)" text-anchor="middle">CABINA</text>' +
      '<text x="80" y="64" font-family="monospace" font-size="6" fill="rgba(180,220,255,0.7)" text-anchor="middle">PINTURA</text>' +
      '<rect x="4" y="102" width="152" height="12" rx="3" fill="rgba(0,0,0,0.3)"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-oven-industrial') {
    var c = p.color || '#c62828';
    return '<svg viewBox="0 0 150 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="14" width="142" height="110" rx="6" fill="#546e7a" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="12" y="22" width="126" height="60" rx="4" fill="#1a1a14" stroke="#37474f" stroke-width="1.5"/>' +
      '<rect x="20" y="30" width="60" height="22" rx="3" fill="'+c+'" opacity="0.4"/>' +
      '<rect x="86" y="30" width="44" height="22" rx="3" fill="'+c+'" opacity="0.3"/>' +
      '<rect x="20" y="56" width="110" height="16" rx="2" fill="'+c+'" opacity="0.25"/>' +
      '<rect x="12" y="86" width="50" height="32" rx="3" fill="#37474f" stroke="#263238" stroke-width="1.5"/>' +
      '<circle cx="37" cy="102" r="12" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<circle cx="37" cy="102" r="7"  fill="#546e7a"/>' +
      '<rect x="68" y="86" width="70" height="32" rx="3" fill="#37474f" stroke="#263238" stroke-width="1"/>' +
      '<text x="103" y="100" font-family="monospace" font-size="6" fill="#f9a825" text-anchor="middle">200°C MAX</text>' +
      '<text x="103" y="110" font-family="monospace" font-size="5" fill="#607d8b" text-anchor="middle">HORNO IND.</text>' +
      '<rect x="2" y="4" width="146" height="12" rx="4" fill="#263238" stroke="#1a2630" stroke-width="1.5"/>' +
      '<text x="75" y="12" font-family="monospace" font-size="6" fill="#f9a825" text-anchor="middle">▲ CALOR ▲</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-cooling-tower') {
    var c = p.color || '#546e7a';
    return '<svg viewBox="0 0 110 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<path d="M20 160 L16 80 L4 80 L20 4 L90 4 L106 80 L94 80 L90 160 Z" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="22" y="78" width="66" height="8" rx="2" fill="#263238" stroke="#1a2630" stroke-width="1"/>' +
      '<circle cx="55" cy="40" r="24" fill="#263238" stroke="#1a2630" stroke-width="2" opacity="0.7"/>' +
      '<line x1="55" y1="20" x2="55" y2="60" stroke="#607d8b" stroke-width="3"/>' +
      '<line x1="35" y1="40" x2="75" y2="40" stroke="#607d8b" stroke-width="3"/>' +
      '<line x1="41" y1="26" x2="69" y2="54" stroke="#607d8b" stroke-width="2"/>' +
      '<line x1="69" y1="26" x2="41" y2="54" stroke="#607d8b" stroke-width="2"/>' +
      '<circle cx="55" cy="40" r="6" fill="#546e7a"/>' +
      '<path d="M18 100 Q55 82 92 100" fill="none" stroke="#263238" stroke-width="2"/>' +
      '<path d="M18 125 Q55 108 92 125" fill="none" stroke="#263238" stroke-width="2"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-boiler') {
    var c = p.color || '#c62828';
    return '<svg viewBox="0 0 100 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<ellipse cx="50" cy="20" rx="38" ry="16" fill="'+c+'" stroke="#8a1010" stroke-width="2"/>' +
      '<rect x="12" y="20" width="76" height="100" fill="'+c+'" stroke="'+c+'"/>' +
      '<ellipse cx="50" cy="120" rx="38" ry="16" fill="#8a1010" stroke="#6a0808" stroke-width="2"/>' +
      '<line x1="12" y1="50"  x2="88" y2="50"  stroke="#8a1010" stroke-width="3"/>' +
      '<line x1="12" y1="80"  x2="88" y2="80"  stroke="#8a1010" stroke-width="3"/>' +
      '<line x1="12" y1="110" x2="88" y2="110" stroke="#8a1010" stroke-width="3"/>' +
      '<rect x="40" y="2" width="20" height="20" rx="3" fill="#9a9a90" stroke="#6a6a60" stroke-width="1.5"/>' +
      '<rect x="10" y="60" width="18" height="26" rx="3" fill="#9a9a90" stroke="#6a6a60" stroke-width="1.5"/>' +
      '<circle cx="19" cy="78" r="5" fill="#f9a825"/>' +
      '<rect x="36" y="128" width="28" height="28" rx="3" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<ellipse cx="50" cy="20" rx="38" ry="16" fill="'+c+'" stroke="#8a1010" stroke-width="2"/>' +
      '<text x="50" y="98" font-family="monospace" font-size="7" fill="white" text-anchor="middle" font-weight="bold">BOILER</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-compressor-ind') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 130 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="60" width="122" height="64" rx="6" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="8" y="64" width="114" height="30" rx="4" fill="#2a2a26"/>' +
      '<circle cx="36"  cy="79" r="12" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="70"  cy="79" r="12" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="104" cy="79" r="12" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<rect x="8" y="98" width="114" height="22" rx="3" fill="#263238"/>' +
      '<rect x="16" y="102" width="50" height="12" rx="2" fill="#0a1620"/>' +
      '<text x="41" y="111" font-family="monospace" font-size="6" fill="#00e5ff" text-anchor="middle">12 BAR</text>' +
      '<rect x="20" y="10" width="90" height="52" rx="4" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<rect x="26" y="16" width="78" height="28" rx="2" fill="#0a3a80"/>' +
      '<text x="65" y="34" font-family="monospace" font-size="7" fill="#00e5ff" text-anchor="middle" font-weight="bold">COMPRESOR</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-generator') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 160 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="20" width="152" height="64" rx="6" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<rect x="10" y="26" width="80" height="52" rx="4" fill="#c07800" stroke="#8a5800" stroke-width="1.5"/>' +
      '<circle cx="50" cy="52" r="22" fill="#8a5800" stroke="#6a3800" stroke-width="2"/>' +
      '<circle cx="50" cy="52" r="14" fill="#c07800"/>' +
      '<circle cx="50" cy="52" r="6"  fill="'+c+'"/>' +
      '<rect x="95" y="26" width="55" height="52" rx="3" fill="#c07800"/>' +
      '<rect x="100" y="30" width="45" height="18" rx="2" fill="#6a3800"/>' +
      '<text x="122" y="42" font-family="monospace" font-size="6" fill="'+c+'" text-anchor="middle" font-weight="bold">GEN</text>' +
      '<text x="122" y="52" font-family="monospace" font-size="5" fill="'+c+'" text-anchor="middle">400V 50Hz</text>' +
      '<circle cx="108" cy="62" r="7" fill="#2e7d32" stroke="#1a5a1a" stroke-width="1.5"/>' +
      '<circle cx="126" cy="62" r="7" fill="#1565c0" stroke="#0a3a80" stroke-width="1.5"/>' +
      '<circle cx="144" cy="62" r="7" fill="#c62828" stroke="#8a1010" stroke-width="1.5"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-transformer') {
    var c = p.color || '#263238';
    return '<svg viewBox="0 0 100 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="8" y="24" width="84" height="96" rx="6" fill="'+c+'" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="16" y="32" width="28" height="78" rx="3" fill="#37474f" stroke="#263238" stroke-width="1.5"/>' +
      '<rect x="56" y="32" width="28" height="78" rx="3" fill="#37474f" stroke="#263238" stroke-width="1.5"/>' +
      '<rect x="30" y="56" width="40" height="30" rx="2" fill="#1565c0" stroke="#0a3a80" stroke-width="2"/>' +
      '<text x="50" y="74" font-family="monospace" font-size="6" fill="#00e5ff" text-anchor="middle" font-weight="bold">TRAFO</text>' +
      '<line x1="30" y1="14" x2="30" y2="32" stroke="#9a9a90" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="50" y1="10" x2="50" y2="32" stroke="#9a9a90" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="70" y1="14" x2="70" y2="32" stroke="#9a9a90" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="30" y1="110" x2="30" y2="126" stroke="#9a9a90" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="50" y1="114" x2="50" y2="126" stroke="#9a9a90" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="70" y1="110" x2="70" y2="126" stroke="#9a9a90" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-switchboard') {
    var c = p.color || '#263238';
    return '<svg viewBox="0 0 130 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="126" height="156" rx="6" fill="'+c+'" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="8" y="8" width="114" height="140" rx="4" fill="#37474f" stroke="#263238" stroke-width="1.5"/>' +
      '<rect x="14" y="14" width="102" height="22" rx="3" fill="#1a2630"/>' +
      '<text x="65" y="28" font-family="monospace" font-size="7" fill="#00e5ff" text-anchor="middle" font-weight="bold">CUADRO ELECT.</text>' +
      '<rect x="14" y="40" width="22" height="30" rx="2" fill="#1a2630"/>' +
      '<rect x="40" y="40" width="22" height="30" rx="2" fill="#1a2630"/>' +
      '<rect x="66" y="40" width="22" height="30" rx="2" fill="#1a2630"/>' +
      '<rect x="92" y="40" width="22" height="30" rx="2" fill="#1a2630"/>' +
      '<rect x="17" y="46" width="6" height="16" rx="2" fill="#c62828" stroke="#8a1010" stroke-width="1"/>' +
      '<rect x="27" y="46" width="6" height="16" rx="2" fill="#2e7d32" stroke="#1a5a1a" stroke-width="1"/>' +
      '<rect x="43" y="46" width="6" height="16" rx="2" fill="#c62828" stroke="#8a1010" stroke-width="1"/>' +
      '<rect x="53" y="46" width="6" height="16" rx="2" fill="#c62828" stroke="#8a1010" stroke-width="1"/>' +
      '<rect x="69" y="46" width="6" height="16" rx="2" fill="#2e7d32" stroke="#1a5a1a" stroke-width="1"/>' +
      '<rect x="79" y="46" width="6" height="16" rx="2" fill="#2e7d32" stroke="#1a5a1a" stroke-width="1"/>' +
      '<rect x="95" y="46" width="6" height="16" rx="2" fill="#f9a825" stroke="#c07800" stroke-width="1"/>' +
      '<rect x="105" y="46" width="6" height="16" rx="2" fill="#2e7d32" stroke="#1a5a1a" stroke-width="1"/>' +
      '<rect x="14" y="76" width="102" height="24" rx="2" fill="#1a2630"/>' +
      '<circle cx="28"  cy="88" r="5" fill="#2e7d32"/>' +
      '<circle cx="44"  cy="88" r="5" fill="#2e7d32"/>' +
      '<circle cx="60"  cy="88" r="5" fill="#f9a825"/>' +
      '<circle cx="76"  cy="88" r="5" fill="#2e7d32"/>' +
      '<circle cx="92"  cy="88" r="5" fill="#c62828"/>' +
      '<circle cx="108" cy="88" r="5" fill="#2e7d32"/>' +
      '<rect x="14" y="106" width="102" height="34" rx="2" fill="#1a2630"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-plc-cabinet') {
    var c = p.color || '#263238';
    return '<svg viewBox="0 0 100 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="96" height="156" rx="6" fill="'+c+'" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="8" y="10" width="84" height="30" rx="3" fill="#1565c0" stroke="#0a3a80" stroke-width="1.5"/>' +
      '<rect x="12" y="14" width="76" height="18" rx="2" fill="#0a3a80"/>' +
      '<text x="50" y="26" font-family="monospace" font-size="7" fill="#00e5ff" text-anchor="middle" font-weight="bold">PLC S7-1500</text>' +
      '<rect x="8"  y="46" width="84" height="22" rx="2" fill="#37474f"/>' +
      '<rect x="12" y="50" width="76" height="14" rx="1" fill="#1a2630"/>' +
      '<circle cx="22" cy="57" r="4" fill="#00e676"/>' +
      '<circle cx="34" cy="57" r="4" fill="#00e676"/>' +
      '<circle cx="46" cy="57" r="4" fill="#f9a825"/>' +
      '<circle cx="58" cy="57" r="4" fill="#00e676"/>' +
      '<circle cx="70" cy="57" r="4" fill="#c62828"/>' +
      '<circle cx="82" cy="57" r="4" fill="#00e676"/>' +
      '<rect x="8"  y="72" width="84" height="22" rx="2" fill="#37474f"/>' +
      '<rect x="12" y="76" width="76" height="14" rx="1" fill="#1a2630"/>' +
      '<text x="50" y="86" font-family="monospace" font-size="5" fill="#607d8b" text-anchor="middle">I/O MODULE</text>' +
      '<rect x="8"  y="98" width="84" height="22" rx="2" fill="#37474f"/>' +
      '<rect x="12" y="102" width="76" height="14" rx="1" fill="#1a2630"/>' +
      '<text x="50" y="112" font-family="monospace" font-size="5" fill="#607d8b" text-anchor="middle">PROFINET</text>' +
      '<rect x="8" y="126" width="84" height="26" rx="3" fill="#1a2630"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-hmi-panel') {
    return '<svg viewBox="0 0 120 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="116" height="96" rx="6" fill="#1a1a14" stroke="#0a0a08" stroke-width="2"/>' +
      '<rect x="8" y="8" width="104" height="68" rx="4" fill="#1565c0" stroke="#0a3a80" stroke-width="1.5"/>' +
      '<rect x="12" y="12" width="96" height="60" rx="2" fill="#0a1620"/>' +
      '<rect x="16" y="16" width="88" height="16" rx="2" fill="#1a2630"/>' +
      '<text x="60" y="27" font-family="monospace" font-size="7" fill="#00e5ff" text-anchor="middle" font-weight="bold">HMI TP700</text>' +
      '<rect x="16" y="36" width="40" height="30" rx="2" fill="#263238"/>' +
      '<rect x="62" y="36" width="42" height="30" rx="2" fill="#263238"/>' +
      '<text x="36" y="52" font-family="monospace" font-size="5" fill="#00e676" text-anchor="middle">RUNNING</text>' +
      '<text x="83" y="52" font-family="monospace" font-size="5" fill="#f9a825" text-anchor="middle">85°C</text>' +
      '<rect x="8" y="80" width="104" height="14" rx="3" fill="#0a0a08"/>' +
      '<circle cx="20"  cy="87" r="5" fill="#2e7d32"/>' +
      '<circle cx="36"  cy="87" r="5" fill="#c62828"/>' +
      '<circle cx="52"  cy="87" r="5" fill="#f9a825"/>' +
      '<circle cx="68"  cy="87" r="5" fill="#1565c0"/>' +
      '<rect x="82" y="82" width="24" height="10" rx="2" fill="#1565c0"/>' +
      '<text x="94" y="89" font-family="monospace" font-size="5" fill="white" text-anchor="middle">ACK</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-safety-fence') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 200 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2"   y="8"  width="8" height="84" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>' +
      '<rect x="48"  y="8"  width="8" height="84" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>' +
      '<rect x="100" y="8"  width="8" height="84" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>' +
      '<rect x="148" y="8"  width="8" height="84" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>' +
      '<rect x="190" y="8"  width="8" height="84" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>' +
      '<rect x="2" y="12" width="196" height="6" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>' +
      '<rect x="2" y="84" width="196" height="6" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>' +
      '<line x1="10" y1="18" x2="48" y2="84" stroke="'+c+'" stroke-width="2" stroke-dasharray="4,4"/>' +
      '<line x1="48" y1="18" x2="10" y2="84" stroke="'+c+'" stroke-width="2" stroke-dasharray="4,4"/>' +
      '<line x1="56" y1="18" x2="100" y2="84" stroke="'+c+'" stroke-width="2" stroke-dasharray="4,4"/>' +
      '<line x1="100" y1="18" x2="56" y2="84" stroke="'+c+'" stroke-width="2" stroke-dasharray="4,4"/>' +
      '<line x1="108" y1="18" x2="148" y2="84" stroke="'+c+'" stroke-width="2" stroke-dasharray="4,4"/>' +
      '<line x1="148" y1="18" x2="108" y2="84" stroke="'+c+'" stroke-width="2" stroke-dasharray="4,4"/>' +
      '<line x1="156" y1="18" x2="190" y2="84" stroke="'+c+'" stroke-width="2" stroke-dasharray="4,4"/>' +
      '<line x1="190" y1="18" x2="156" y2="84" stroke="'+c+'" stroke-width="2" stroke-dasharray="4,4"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-agv-station') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 160 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="156" height="116" rx="6" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="10" y="10" width="140" height="70" rx="4" fill="#1a2630"/>' +
      '<line x1="10" y1="80" x2="150" y2="80" stroke="#f9a825" stroke-width="4" stroke-dasharray="12,8"/>' +
      '<circle cx="50" cy="46" r="22" fill="#37474f" stroke="#546e7a" stroke-width="2"/>' +
      '<circle cx="50" cy="46" r="14" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="50" cy="46" r="6"  fill="#0a3a80"/>' +
      '<line x1="50" y1="26" x2="50" y2="22" stroke="#00e5ff" stroke-width="2"/>' +
      '<line x1="50" y1="70" x2="50" y2="74" stroke="#00e5ff" stroke-width="2"/>' +
      '<line x1="26" y1="46" x2="22" y2="46" stroke="#00e5ff" stroke-width="2"/>' +
      '<line x1="74" y1="46" x2="78" y2="46" stroke="#00e5ff" stroke-width="2"/>' +
      '<rect x="86" y="16" width="58" height="56" rx="4" fill="#37474f"/>' +
      '<text x="115" y="38" font-family="monospace" font-size="7" fill="#00e5ff" text-anchor="middle" font-weight="bold">ESTACIÓN</text>' +
      '<text x="115" y="50" font-family="monospace" font-size="6" fill="#607d8b" text-anchor="middle">AGV-03</text>' +
      '<circle cx="100" cy="62" r="5" fill="#2e7d32"/>' +
      '<circle cx="115" cy="62" r="5" fill="#f9a825"/>' +
      '<circle cx="130" cy="62" r="5" fill="#c62828" opacity="0.4"/>' +
      '<rect x="10" y="86" width="140" height="24" rx="3" fill="#1a2630"/>' +
      '<text x="80" y="100" font-family="monospace" font-size="5" fill="#607d8b" text-anchor="middle">X=14.2 Y=8.7 · CARGA: 0kg</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-quality-station') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 140 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="136" height="116" rx="6" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="10" y="10" width="120" height="68" rx="4" fill="#1a2630"/>' +
      '<circle cx="70" cy="44" r="30" fill="#37474f" stroke="#546e7a" stroke-width="2"/>' +
      '<circle cx="70" cy="44" r="22" fill="#263238" stroke="#546e7a" stroke-width="1"/>' +
      '<circle cx="70" cy="44" r="14" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="70" cy="44" r="4"  fill="#0a3a80"/>' +
      '<polygon points="70,20 74,28 66,28" fill="#f9a825"/>' +
      '<rect x="10" y="82" width="120" height="28" rx="3" fill="#1a2630"/>' +
      '<circle cx="30"  cy="96" r="8" fill="#2e7d32"/>' +
      '<text x="30"  y="100" font-family="monospace" font-size="5" fill="white" text-anchor="middle">OK</text>' +
      '<circle cx="70"  cy="96" r="8" fill="#f9a825" opacity="0.4"/>' +
      '<circle cx="110" cy="96" r="8" fill="#c62828" opacity="0.3"/>' +
      '<text x="70" y="100" font-family="monospace" font-size="5" fill="white" text-anchor="middle">WAIT</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-packaging') {
    var c = p.color || '#a0785a';
    return '<svg viewBox="0 0 150 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="30" y="4"  width="90" height="70" rx="4" fill="'+c+'" stroke="#6a4830" stroke-width="2"/>' +
      '<polygon points="30,4 75,24 120,4" fill="#8a6040" stroke="#6a4830" stroke-width="1.5"/>' +
      '<polygon points="30,4 30,74 75,94 75,24" fill="#c8a060" stroke="#8a6830" stroke-width="1.5"/>' +
      '<polygon points="120,4 120,74 75,94 75,24" fill="#b09050" stroke="#8a6830" stroke-width="1.5"/>' +
      '<polygon points="30,74 75,94 120,74" fill="#9a7840" stroke="#6a4830" stroke-width="1.5"/>' +
      '<rect x="50" y="40" width="50" height="14" rx="2" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>' +
      '<text x="75" y="50" font-family="monospace" font-size="5" fill="white" text-anchor="middle">FRAGILE</text>' +
      '<rect x="4" y="96" width="142" height="10" rx="2" fill="#5a5a56"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-palletizer') {
    var c = p.color || '#f9a825';
    return '<svg viewBox="0 0 130 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="40" y="126" width="50" height="30" rx="4" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="56" y="104" width="18" height="24" rx="2" fill="#5a5a56"/>' +
      '<circle cx="65" cy="104" r="14" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<circle cx="65" cy="104" r="7"  fill="#c07800"/>' +
      '<rect x="65" y="64" width="42" height="12" rx="4" fill="'+c+'" stroke="#c07800" stroke-width="2" transform="rotate(-20,65,104)"/>' +
      '<circle cx="98" cy="76" r="10" fill="'+c+'" stroke="#c07800" stroke-width="2"/>' +
      '<circle cx="98" cy="76" r="5"  fill="#c07800"/>' +
      '<rect x="2" y="100" width="44" height="18" rx="2" fill="#a0785a" stroke="#6a4830" stroke-width="1.5"/>' +
      '<rect x="2" y="82"  width="44" height="18" rx="2" fill="#a0785a" stroke="#6a4830" stroke-width="1.5"/>' +
      '<rect x="2" y="116" width="44" height="8"  rx="2" fill="#c8a060" stroke="#8a6830" stroke-width="1.5"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-scara-robot') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 120 140" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="30" y="100" width="60" height="36" rx="4" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="46" y="88"  width="28" height="14" rx="3" fill="#37474f"/>' +
      '<circle cx="60" cy="88" r="14" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="60" cy="88" r="6"  fill="#0a3a80"/>' +
      '<rect x="60" y="58" width="44" height="12" rx="4" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="104" cy="64" r="10" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="104" cy="64" r="5"  fill="#0a3a80"/>' +
      '<rect x="84" y="44" width="32" height="10" rx="3" fill="'+c+'" stroke="#0a3a80" stroke-width="1.5" transform="rotate(-30,104,64)"/>' +
      '<rect x="57" y="82" width="6" height="22" rx="2" fill="#9a9a90"/>' +
      '<text x="60" y="120" font-family="monospace" font-size="6" fill="#00e5ff" text-anchor="middle">SCARA</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-delta-robot') {
    var c = p.color || '#546e7a';
    return '<svg viewBox="0 0 120 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="2" width="112" height="20" rx="4" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<circle cx="20"  cy="12" r="8" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<circle cx="60"  cy="12" r="8" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<circle cx="100" cy="12" r="8" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<line x1="20"  y1="20" x2="50" y2="80" stroke="'+c+'" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="60"  y1="20" x2="60" y2="80" stroke="'+c+'" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="100" y1="20" x2="70" y2="80" stroke="'+c+'" stroke-width="5" stroke-linecap="round"/>' +
      '<ellipse cx="60" cy="82" rx="22" ry="8" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<circle cx="60" cy="82" r="6" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="54" y="90" width="12" height="24" rx="3" fill="#9a9a90" stroke="#6a6a60" stroke-width="1.5"/>' +
      '<rect x="50" y="114" width="20" height="8" rx="2" fill="'+c+'" stroke="#37474f" stroke-width="1"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-cobot') {
    var c = p.color || '#2e7d32';
    return '<svg viewBox="0 0 110 150" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="30" y="112" width="50" height="34" rx="4" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="44" y="96"  width="22" height="18" rx="3" fill="#37474f"/>' +
      '<circle cx="55" cy="96" r="12" fill="'+c+'" stroke="#1a5a1a" stroke-width="2"/>' +
      '<circle cx="55" cy="96" r="6"  fill="#1a5a1a"/>' +
      '<rect x="55" y="60" width="36" height="10" rx="4" fill="'+c+'" stroke="#1a5a1a" stroke-width="2"/>' +
      '<circle cx="91" cy="65" r="10" fill="'+c+'" stroke="#1a5a1a" stroke-width="2"/>' +
      '<circle cx="91" cy="65" r="5"  fill="#1a5a1a"/>' +
      '<rect x="81" y="42" width="26" height="10" rx="3" fill="'+c+'" stroke="#1a5a1a" stroke-width="1.5" transform="rotate(-25,91,65)"/>' +
      '<rect x="30" y="6"  width="18" height="22" rx="3" fill="#263238"/>' +
      '<text x="39" y="20" font-family="monospace" font-size="5" fill="#00e676" text-anchor="middle">CO-OP</text>' +
      '<text x="55" y="132" font-family="monospace" font-size="6" fill="#00e676" text-anchor="middle">COBOT</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-vision-system') {
    return '<svg viewBox="0 0 130 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="126" height="80" rx="6" fill="#1a1a14" stroke="#0a0a08" stroke-width="2"/>' +
      '<circle cx="65" cy="42" r="30" fill="#1565c0" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="65" cy="42" r="22" fill="#0a3a80"/>' +
      '<circle cx="65" cy="42" r="14" fill="#1565c0"/>' +
      '<circle cx="65" cy="42" r="8"  fill="#0a3a80"/>' +
      '<circle cx="65" cy="42" r="4"  fill="#263238"/>' +
      '<circle cx="72" cy="34" r="3"  fill="rgba(255,255,255,0.4)"/>' +
      '<rect x="14" y="8" width="22" height="18" rx="3" fill="#263238"/>' +
      '<text x="25" y="20" font-family="monospace" font-size="5" fill="#00e5ff" text-anchor="middle">5MP</text>' +
      '<rect x="44" y="66" width="42" height="10" rx="2" fill="#1a2630"/>' +
      '<text x="65" y="73" font-family="monospace" font-size="5" fill="#00e5ff" text-anchor="middle">VISIÓN ARTIF.</text>' +
      '<rect x="2" y="84" width="126" height="22" rx="4" fill="#263238"/>' +
      '<rect x="8" y="88" width="116" height="14" rx="2" fill="#1a2630"/>' +
      '<text x="65" y="98" font-family="monospace" font-size="6" fill="#2e7d32" text-anchor="middle">✓ OK — COINC. 98.7%</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-laser-cutter') {
    return '<svg viewBox="0 0 180 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="2" width="176" height="126" rx="6" fill="#1a1a14" stroke="#0a0a08" stroke-width="2"/>' +
      '<rect x="10" y="10" width="160" height="60" rx="4" fill="#1a2630"/>' +
      '<rect x="16" y="16" width="148" height="48" rx="2" fill="#0a0a08"/>' +
      '<rect x="74" y="8" width="32" height="4" rx="2" fill="#c62828" opacity="0.8"/>' +
      '<circle cx="90" cy="10" r="3" fill="#ff1744"/>' +
      '<line x1="90" y1="13" x2="90" y2="60" stroke="#ff1744" stroke-width="1.5" opacity="0.7"/>' +
      '<circle cx="90" cy="60" r="4" fill="#ff1744" opacity="0.6"/>' +
      '<rect x="10" y="74" width="160" height="48" rx="4" fill="#1a2630"/>' +
      '<rect x="16" y="80" width="60" height="36" rx="2" fill="#263238"/>' +
      '<text x="46" y="98" font-family="monospace" font-size="7" fill="#ff1744" text-anchor="middle" font-weight="bold">LÁSER CO₂</text>' +
      '<text x="46" y="110" font-family="monospace" font-size="5" fill="#607d8b" text-anchor="middle">1000W</text>' +
      '<rect x="84" y="80" width="80" height="36" rx="2" fill="#263238"/>' +
      '<circle cx="108" cy="98" r="7" fill="#2e7d32" stroke="#1a5a1a" stroke-width="1.5"/>' +
      '<circle cx="128" cy="98" r="7" fill="#c62828" stroke="#8a1010" stroke-width="1.5"/>' +
      '<circle cx="148" cy="98" r="7" fill="#f9a825" stroke="#c07800" stroke-width="1.5"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-3d-printer') {
    var c = p.color || '#546e7a';
    return '<svg viewBox="0 0 120 140" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4"  y="4"  width="112" height="132" rx="6" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="10" y="10" width="100" height="80" rx="4" fill="#1a2630"/>' +
      '<rect x="16" y="16" width="88" height="68" rx="2" fill="#0a1620"/>' +
      '<rect x="20" y="100" width="80" height="26" rx="3" fill="#263238"/>' +
      '<line x1="60" y1="18" x2="60" y2="68" stroke="#9a9a90" stroke-width="2"/>' +
      '<line x1="24" y1="50" x2="96" y2="50" stroke="#9a9a90" stroke-width="2"/>' +
      '<circle cx="60" cy="50" r="5" fill="#f9a825" stroke="#c07800" stroke-width="1.5"/>' +
      '<line x1="60" y1="55" x2="60" y2="75" stroke="#c62828" stroke-width="2"/>' +
      '<rect x="40" y="72" width="40" height="6" rx="2" fill="#5a4030"/>' +
      '<rect x="26" y="104" width="30" height="14" rx="2" fill="#1a2630"/>' +
      '<text x="41" y="114" font-family="monospace" font-size="5" fill="#00e5ff" text-anchor="middle">200°C</text>' +
      '<rect x="64" y="104" width="30" height="14" rx="2" fill="#1a2630"/>' +
      '<text x="79" y="114" font-family="monospace" font-size="5" fill="#f9a825" text-anchor="middle">60°C BED</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-injection-mold') {
    var c = p.color || '#3a3a36';
    return '<svg viewBox="0 0 170 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="20" width="80" height="90" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="8" y="26" width="68" height="78" rx="2" fill="#2a2a26"/>' +
      '<rect x="14" y="36" width="56" height="50" rx="2" fill="#1565c0" stroke="#0a3a80" stroke-width="1.5"/>' +
      '<rect x="20" y="42" width="44" height="38" rx="1" fill="#0a3a80"/>' +
      '<rect x="26" y="50" width="32" height="22" rx="2" fill="#1565c0" stroke="#0a3a80" stroke-width="1"/>' +
      '<rect x="88" y="20" width="80" height="90" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="94" y="26" width="68" height="78" rx="2" fill="#2a2a26"/>' +
      '<rect x="98" y="36" width="56" height="50" rx="2" fill="#c62828" stroke="#8a1010" stroke-width="1.5"/>' +
      '<rect x="104" y="42" width="44" height="38" rx="1" fill="#8a1010"/>' +
      '<rect x="112" y="50" width="32" height="22" rx="2" fill="#c62828" stroke="#8a1010" stroke-width="1"/>' +
      '<rect x="80" y="14" width="10" height="102" rx="3" fill="#9a9a90" stroke="#6a6a60" stroke-width="1.5"/>' +
      '<circle cx="85" cy="35" r="5" fill="#5a5a56"/>' +
      '<circle cx="85" cy="65" r="5" fill="#5a5a56"/>' +
      '<circle cx="85" cy="95" r="5" fill="#5a5a56"/>' +
    '</svg>';
  }
  if (el.tipo === 'fab-extruder') {
    var c = p.color || '#546e7a';
    return '<svg viewBox="0 0 180 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<circle cx="34" cy="50" r="30" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<circle cx="34" cy="50" r="22" fill="#263238" stroke="#37474f" stroke-width="1.5"/>' +
      '<circle cx="34" cy="50" r="10" fill="'+c+'" stroke="#37474f" stroke-width="1.5"/>' +
      '<circle cx="34" cy="50" r="4"  fill="#263238"/>' +
      '<rect x="64" y="28" width="90" height="44" rx="4" fill="'+c+'" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="70" y="34" width="78" height="32" rx="2" fill="#263238"/>' +
      '<line x1="80"  y1="34" x2="80"  y2="66" stroke="#546e7a" stroke-width="2"/>' +
      '<line x1="96"  y1="34" x2="96"  y2="66" stroke="#546e7a" stroke-width="2"/>' +
      '<line x1="112" y1="34" x2="112" y2="66" stroke="#546e7a" stroke-width="2"/>' +
      '<line x1="128" y1="34" x2="128" y2="66" stroke="#546e7a" stroke-width="2"/>' +
      '<rect x="154" y="34" width="22" height="32" rx="3" fill="#9a9a90" stroke="#6a6a60" stroke-width="2"/>' +
      '<line x1="176" y1="46" x2="180" y2="46" stroke="#6a6a60" stroke-width="3" stroke-linecap="round"/>' +
      '<text x="112" y="56" font-family="monospace" font-size="7" fill="#00e5ff" text-anchor="middle">EXTRUSOR</text>' +
    '</svg>';
  }
  if (el.tipo === 'fab-winding-machine') {
    var c = p.color || '#1565c0';
    return '<svg viewBox="0 0 150 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="4" y="30" width="142" height="80" rx="4" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<circle cx="40"  cy="70" r="36" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="40"  cy="70" r="28" fill="#0a3a80"/>' +
      '<circle cx="40"  cy="70" r="20" fill="'+c+'"/>' +
      '<circle cx="40"  cy="70" r="12" fill="#0a3a80"/>' +
      '<circle cx="40"  cy="70" r="5"  fill="'+c+'"/>' +
      '<circle cx="110" cy="70" r="24" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>' +
      '<circle cx="110" cy="70" r="18" fill="#0a3a80"/>' +
      '<circle cx="110" cy="70" r="10" fill="'+c+'"/>' +
      '<circle cx="110" cy="70" r="5"  fill="#0a3a80"/>' +
      '<rect x="76" y="58" width="4" height="24" rx="2" fill="#9a9a90"/>' +
      '<rect x="4" y="10" width="60" height="22" rx="3" fill="#37474f"/>' +
      '<text x="34" y="23" font-family="monospace" font-size="6" fill="#00e5ff" text-anchor="middle">BOBINADORA</text>' +
    '</svg>';
  }

  /* ── SENSOR PROXIMIDAD (inductivo/capacitivo) ── */
  if (el.tipo === 'sensor-prox') {
    var sc = p.color || '#f9a825';
    var lbl = p.label || 'S1';
    return '<svg viewBox="0 0 80 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="20" y="10" width="40" height="60" rx="6" fill="#263238" stroke="#1a2630" stroke-width="2" class="sensor-body"/>' +
      '<rect x="26" y="16" width="28" height="12" rx="2" fill="#1a2630"/>' +
      '<text x="40" y="26" font-family="monospace" font-size="5.5" fill="#00e5ff" text-anchor="middle" letter-spacing="1">PROX</text>' +
      '<circle cx="40" cy="52" r="10" fill="'+sc+'" opacity=".9"/>' +
      '<circle cx="40" cy="52" r="8"  fill="#0d1c24"/>' +
      '<circle cx="40" cy="52" r="4"  fill="'+sc+'"/>' +
      '<circle cx="40" cy="52" r="8"  fill="none" stroke="'+sc+'" stroke-width="1.5" opacity=".6" class="sensor-prox-ping"/>' +
      '<rect x="36" y="70" width="8" height="18" rx="2" fill="#1a2630"/>' +
      '<text x="40" y="96" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">'+escHtml(lbl)+'</text>' +
    '</svg>';
  }

  /* ── SENSOR BALANCÍN / FINAL DE CARRERA ── */
  if (el.tipo === 'sensor-balancin') {
    var sc2 = p.color || '#00c853';
    var lbl2 = p.label || 'LS1';
    return '<svg viewBox="0 0 90 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="30" width="42" height="42" rx="4" fill="#263238" stroke="#1a2630" stroke-width="2" class="balancin-body"/>' +
      '<rect x="16" y="36" width="30" height="10" rx="2" fill="#1a2630"/>' +
      '<text x="31" y="44" font-family="monospace" font-size="5" fill="#00e5ff" text-anchor="middle" letter-spacing=".5">LIMIT SW</text>' +
      '<circle cx="52" cy="62" r="5" fill="#3a3a32" stroke="#5a5a52" stroke-width="1.5"/>' +
      '<line x1="52" y1="62" x2="72" y2="40" stroke="'+sc2+'" stroke-width="3" stroke-linecap="round" class="balancin-arm"/>' +
      '<circle cx="72" cy="38" r="7" fill="'+sc2+'" opacity=".9" class="balancin-arm"/>' +
      '<circle cx="72" cy="38" r="4" fill="#fff" opacity=".5" class="balancin-arm"/>' +
      '<rect x="26" y="72" width="10" height="16" rx="2" fill="#1a2630"/>' +
      '<text x="31" y="96" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">'+escHtml(lbl2)+'</text>' +
    '</svg>';
  }

  /* ── SENSOR FOTOELÉCTRICO ── */
  if (el.tipo === 'sensor-foto') {
    var sc3 = p.color || '#00e5ff';
    var lbl3 = p.label || 'PH1';
    return '<svg viewBox="0 0 120 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="2" y="15" width="38" height="50" rx="5" fill="#263238" stroke="#1a2630" stroke-width="2" class="sensor-body"/>' +
      '<rect x="8" y="21" width="26" height="10" rx="2" fill="#1a2630"/>' +
      '<text x="21" y="29" font-family="monospace" font-size="5" fill="#00e5ff" text-anchor="middle">TX</text>' +
      '<circle cx="21" cy="50" r="10" fill="#f9a825" opacity=".85"/>' +
      '<circle cx="21" cy="50" r="6"  fill="#ffca28"/>' +
      '<circle cx="21" cy="50" r="3"  fill="#fff" opacity=".8"/>' +
      '<line x1="40" y1="50" x2="80" y2="50" stroke="'+sc3+'" stroke-width="2.5" stroke-dasharray="6,4" opacity=".7" class="foto-beam"/>' +
      '<line x1="40" y1="44" x2="80" y2="44" stroke="'+sc3+'" stroke-width="1.5" stroke-dasharray="4,6" opacity=".4" class="foto-beam"/>' +
      '<line x1="40" y1="56" x2="80" y2="56" stroke="'+sc3+'" stroke-width="1.5" stroke-dasharray="4,6" opacity=".4" class="foto-beam"/>' +
      '<rect x="80" y="15" width="38" height="50" rx="5" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="86" y="21" width="26" height="10" rx="2" fill="#1a2630"/>' +
      '<text x="93" y="29" font-family="monospace" font-size="5" fill="#00e5ff" text-anchor="middle">RX</text>' +
      '<circle cx="99" cy="50" r="10" fill="#263238" stroke="#2e2e28" stroke-width="2" class="foto-rx"/>' +
      '<circle cx="99" cy="50" r="5"  fill="#1a2630"/>' +
      '<text x="21" y="78" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">'+escHtml(lbl3)+'</text>' +
    '</svg>';
  }

  /* ── ENCODER ROTATIVO ── */
  if (el.tipo === 'sensor-encoder') {
    var sc4 = p.color || '#29b6f6';
    var lbl4 = p.label || 'ENC1';
    return '<svg viewBox="0 0 90 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="5" width="70" height="70" rx="8" fill="#263238" stroke="#1a2630" stroke-width="2" class="encoder-body"/>' +
      '<circle cx="45" cy="40" r="28" fill="#1a2630" stroke="#2e2e28" stroke-width="1.5"/>' +
      '<g class="encoder-disk" style="transform-origin:45px 40px">' +
        '<circle cx="45" cy="40" r="22" fill="none" stroke="'+sc4+'" stroke-width="2" stroke-dasharray="8,5"/>' +
        '<line x1="45" y1="18" x2="45" y2="26" stroke="'+sc4+'" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="45" y1="54" x2="45" y2="62" stroke="'+sc4+'" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="23" y1="40" x2="31" y2="40" stroke="'+sc4+'" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="59" y1="40" x2="67" y2="40" stroke="'+sc4+'" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="29" y1="26" x2="35" y2="32" stroke="'+sc4+'" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
        '<line x1="55" y1="48" x2="61" y2="54" stroke="'+sc4+'" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
      '</g>' +
      '<circle cx="45" cy="40" r="7" fill="#263238" stroke="'+sc4+'" stroke-width="2"/>' +
      '<circle cx="45" cy="40" r="3" fill="'+sc4+'"/>' +
      '<text x="45" y="90" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">'+escHtml(lbl4)+' · ENCODER</text>' +
    '</svg>';
  }

  /* ── CAUDALÍMETRO ── */
  if (el.tipo === 'sensor-flow') {
    var sc5 = p.color || '#00acc1';
    var lbl5 = p.label || 'FT1';
    return '<svg viewBox="0 0 100 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="5" y="20" width="90" height="50" rx="25" fill="#263238" stroke="#1a2630" stroke-width="2" class="flow-body"/>' +
      '<circle cx="50" cy="45" r="20" fill="#1a2630" stroke="#2e2e28" stroke-width="1.5"/>' +
      '<g class="flow-rotor" style="transform-origin:50px 45px">' +
        '<ellipse cx="50" cy="45" rx="3" ry="16" fill="'+sc5+'" opacity=".9"/>' +
        '<ellipse cx="50" cy="45" rx="16" ry="3" fill="'+sc5+'" opacity=".9" transform="rotate(60 50 45)"/>' +
        '<ellipse cx="50" cy="45" rx="16" ry="3" fill="'+sc5+'" opacity=".9" transform="rotate(120 50 45)"/>' +
      '</g>' +
      '<circle cx="50" cy="45" r="4" fill="#263238" stroke="'+sc5+'" stroke-width="1.5"/>' +
      '<rect x="38" y="5" width="24" height="14" rx="3" fill="#1a2630" stroke="#2e2e28" stroke-width="1"/>' +
      '<text x="50" y="14" font-family="monospace" font-size="5.5" fill="#00e5ff" text-anchor="middle" letter-spacing=".5">FLOW</text>' +
      '<text x="50" y="82" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">'+escHtml(lbl5)+'</text>' +
    '</svg>';
  }

  /* ── PRESOSTATO ── */
  if (el.tipo === 'sensor-pressure') {
    var sc6 = p.color || '#ef5350';
    var lbl6 = p.label || 'PS1';
    return '<svg viewBox="0 0 90 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<circle cx="45" cy="42" r="36" fill="#263238" stroke="#1a2630" stroke-width="2.5" class="pres-body"/>' +
      '<circle cx="45" cy="42" r="28" fill="#1a2630" stroke="#2e2e28" stroke-width="1"/>' +
      '<path d="M17 58 A28 28 0 1 1 73 58" fill="none" stroke="#2e2e28" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M17 58 A28 28 0 1 1 73 58" fill="none" stroke="'+sc6+'" stroke-width="4" stroke-linecap="round" stroke-dasharray="66,88" opacity=".6"/>' +
      '<text x="45" y="36" font-family="monospace" font-size="6" fill="#5a5a52" text-anchor="middle">bar</text>' +
      '<line x1="45" y1="42" x2="45" y2="18" stroke="'+sc6+'" stroke-width="2.5" stroke-linecap="round" class="pres-needle" style="transform-origin:45px 42px;transform:rotate(30deg)"/>' +
      '<circle cx="45" cy="42" r="4" fill="'+sc6+'"/>' +
      '<rect x="39" y="78" width="12" height="14" rx="2" fill="#1a2630"/>' +
      '<text x="45" y="98" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">'+escHtml(lbl6)+'</text>' +
    '</svg>';
  }

  /* ── TERMOPAR / PT100 ── */
  if (el.tipo === 'sensor-temp') {
    var sc7 = p.color || '#f9a825';
    var lbl7 = p.label || 'TT1';
    return '<svg viewBox="0 0 60 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="20" y="5" width="20" height="55" rx="3" fill="#263238" stroke="#1a2630" stroke-width="2" class="sensor-body"/>' +
      '<rect x="24" y="9" width="12" height="20" rx="2" fill="#1a2630"/>' +
      '<text x="30" y="20" font-family="monospace" font-size="4.5" fill="#00e5ff" text-anchor="middle">PT100</text>' +
      '<rect x="26" y="60" width="8" height="35" rx="4" fill="#4a4a42" stroke="#2e2e28" stroke-width="1.5"/>' +
      '<rect x="26" y="78" width="8" height="17" rx="4" fill="'+sc7+'" class="temp-tip"/>' +
      '<circle cx="30" cy="92" r="6" fill="'+sc7+'" class="temp-tip"/>' +
      '<text x="30" y="108" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">'+escHtml(lbl7)+'</text>' +
    '</svg>';
  }

  /* ── ULTRASONIDOS ── */
  if (el.tipo === 'sensor-ultra') {
    var sc8 = p.color || '#9c27b0';
    var lbl8 = p.label || 'US1';
    return '<svg viewBox="0 0 100 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="30" y="5" width="40" height="50" rx="5" fill="#263238" stroke="#1a2630" stroke-width="2" class="sensor-body"/>' +
      '<rect x="36" y="11" width="28" height="12" rx="2" fill="#1a2630"/>' +
      '<text x="50" y="20" font-family="monospace" font-size="5" fill="#00e5ff" text-anchor="middle" letter-spacing=".5">ULTRASONIC</text>' +
      '<rect x="38" y="28" width="24" height="18" rx="8" fill="#1a2630" stroke="'+sc8+'" stroke-width="1.5"/>' +
      '<path d="M20 65 Q50 72 80 65" fill="none" stroke="'+sc8+'" stroke-width="2" opacity=".7" class="ultra-w1" style="transform-origin:50px 65px"/>' +
      '<path d="M12 72 Q50 82 88 72" fill="none" stroke="'+sc8+'" stroke-width="1.5" opacity=".5" class="ultra-w2" style="transform-origin:50px 72px"/>' +
      '<path d="M5 80 Q50 93 95 80"  fill="none" stroke="'+sc8+'" stroke-width="1" opacity=".3" class="ultra-w3" style="transform-origin:50px 80px"/>' +
      '<text x="50" y="88" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">'+escHtml(lbl8)+'</text>' +
    '</svg>';
  }

  /* ── RFID / NFC ── */
  if (el.tipo === 'sensor-rfid') {
    var sc9 = p.color || '#00e5ff';
    var lbl9 = p.label || 'RF1';
    return '<svg viewBox="0 0 90 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="10" width="70" height="70" rx="8" fill="#263238" stroke="#1a2630" stroke-width="2" class="sensor-body"/>' +
      '<rect x="16" y="16" width="58" height="58" rx="5" fill="#1a2630"/>' +
      '<circle cx="45" cy="45" r="12" fill="none" stroke="'+sc9+'" stroke-width="2.5" class="rfid-ring1"/>' +
      '<circle cx="45" cy="45" r="12" fill="none" stroke="'+sc9+'" stroke-width="2" opacity=".5" class="rfid-ring2"/>' +
      '<circle cx="45" cy="45" r="12" fill="none" stroke="'+sc9+'" stroke-width="1.5" opacity=".3" class="rfid-ring3"/>' +
      '<rect x="38" y="38" width="14" height="14" rx="2" fill="'+sc9+'" opacity=".8"/>' +
      '<rect x="41" y="41" width="8" height="8" rx="1" fill="#1a2630"/>' +
      '<text x="45" y="92" font-family="monospace" font-size="7" fill="#9a9a90" text-anchor="middle">'+escHtml(lbl9)+' · RFID</text>' +
    '</svg>';
  }

  /* ── VARIADOR DE FRECUENCIA ── */
  if (el.tipo === 'sensor-vfd') {
    var scv = p.color || '#1565c0';
    var lblv = p.label || 'VFD1';
    return '<svg viewBox="0 0 130 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="5" y="5" width="120" height="110" rx="6" fill="#263238" stroke="#1a2630" stroke-width="2"/>' +
      '<rect x="12" y="12" width="106" height="35" rx="3" fill="#1a2630" stroke="#2e2e28" stroke-width="1"/>' +
      '<text x="65" y="26" font-family="monospace" font-size="7" fill="#00e5ff" text-anchor="middle" letter-spacing="1.5">VARIADOR</text>' +
      '<text x="65" y="38" font-family="monospace" font-size="7" fill="#5a5a52" text-anchor="middle">'+escHtml(lblv)+'</text>' +
      '<rect x="14" y="54" width="14" height="36" rx="2" fill="#1a2630"/>' +
      '<rect x="14" y="66" width="14" height="24" rx="2" fill="'+scv+'" class="vfd-bar1"/>' +
      '<rect x="34" y="54" width="14" height="36" rx="2" fill="#1a2630"/>' +
      '<rect x="34" y="62" width="14" height="28" rx="2" fill="'+scv+'" class="vfd-bar2"/>' +
      '<rect x="54" y="54" width="14" height="36" rx="2" fill="#1a2630"/>' +
      '<rect x="54" y="58" width="14" height="32" rx="2" fill="'+scv+'" class="vfd-bar3"/>' +
      '<rect x="74" y="54" width="14" height="36" rx="2" fill="#1a2630"/>' +
      '<rect x="74" y="64" width="14" height="26" rx="2" fill="'+scv+'" class="vfd-bar4"/>' +
      '<rect x="94" y="54" width="14" height="36" rx="2" fill="#1a2630"/>' +
      '<rect x="94" y="60" width="14" height="30" rx="2" fill="'+scv+'" class="vfd-bar5"/>' +
      '<text x="20" y="103" font-family="monospace" font-size="5.5" fill="#3a3a32" text-anchor="middle">Hz</text>' +
      '<rect x="110" y="52" width="10" height="40" rx="2" fill="#1a2630"/>' +
      '<rect x="111" y="57" width="8" height="30" rx="1" fill="#2e7d32" opacity=".8"/>' +
    '</svg>';
  }

  /* ── INFO-CARD (tarjeta de datos PLC clicable) ── */
  if (el.tipo === 'info-card') {
    var ic = p;
    var titleTxt = ic.title || 'INFO CARD';
    var iconTxt  = ic.icon  || '\u24d8';
    var badge    = ic.badge || '';
    /* Recoger hasta 6 filas de datos configuradas */
    var rows = [];
    for (var ri = 1; ri <= 6; ri++) {
      var rk = ic['rkey'+ri] || '', rv = ic['rval'+ri] || '';
      if (rk || rv) rows.push({ key: rk, val: rv, color: ic['rcol'+ri] || 'blue' });
    }
    /* Preview: mostrar max 3 filas */
    var preview = rows.slice(0, 3).map(function(r) {
      return '<div class="hinfo-card-row">' +
        '<div class="hinfo-card-dot"></div>' +
        '<div class="hinfo-card-key">' + escHtml(r.key || '—') + '</div>' +
        '<div class="hinfo-card-val">' + escHtml(r.val || '—') + '</div>' +
      '</div>';
    }).join('');
    var more = rows.length > 3 ? '<div class="hinfo-card-more">+ ' + (rows.length - 3) + ' más...</div>' : '';
    var badgeHtml = badge ? '<div class="hinfo-card-badge">' + escHtml(badge) + '</div>' : '';
    return '<div class="hinfo-card" onclick="abrirInfoCardPopup(\'' + el.id + '\')">' +
      '<div class="hinfo-card-hdr">' +
        '<div class="hinfo-card-ico">' + escHtml(iconTxt) + '</div>' +
        '<div class="hinfo-card-title">' + escHtml(titleTxt) + '</div>' +
        badgeHtml +
      '</div>' +
      '<div class="hinfo-card-body">' + preview + more + '</div>' +
      '<div class="hinfo-card-click-hint">▶ VER</div>' +
    '</div>';
  }


  /* ══════════════ TUBERÍAS ══════════════ */
  if (el.tipo === 'pipe-h') {
    var c = p.color || '#546e7a', fc = p.fluidColor || '#29b6f6';
    return '<svg viewBox="0 0 200 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="0" y="10" width="200" height="28" rx="4" fill="'+c+'"/>' +
      '<rect x="0" y="14" width="200" height="6" rx="2" fill="rgba(255,255,255,.22)"/>' +
      '<rect x="2" y="16" width="196" height="16" rx="3" fill="'+fc+'" opacity=".35"/>' +
      '<rect x="0" y="10" width="200" height="28" rx="4" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>' +
      (p.label ? '<text x="100" y="44" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" fill="#546e7a" letter-spacing="1">'+escHtml(p.label)+'</text>' : '') +
    '</svg>';
  }
  if (el.tipo === 'pipe-v') {
    var c = p.color || '#546e7a', fc = p.fluidColor || '#29b6f6';
    return '<svg viewBox="0 0 48 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="0" width="28" height="200" rx="4" fill="'+c+'"/>' +
      '<rect x="14" y="0" width="6" height="200" rx="2" fill="rgba(255,255,255,.22)"/>' +
      '<rect x="16" y="2" width="16" height="196" rx="3" fill="'+fc+'" opacity=".35"/>' +
      '<rect x="10" y="0" width="28" height="200" rx="4" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>' +
      (p.label ? '<text x="44" y="104" text-anchor="start" font-family="DM Mono,monospace" font-size="9" fill="#546e7a" letter-spacing="1">'+escHtml(p.label)+'</text>' : '') +
    '</svg>';
  }
  if (el.tipo === 'pipe-elbow') {
    var c = p.color || '#546e7a', fc = p.fluidColor || '#29b6f6';
    var dir = p.direction || 'tr'; // tr=top-right, tl, br, bl
    var px = dir==='tr'||dir==='br' ? 'M10,40 Q40,40 40,10' : 'M70,40 Q40,40 40,10';
    var flipX = (dir==='tl'||dir==='bl') ? 'scale(-1,1) translate(-80,0)' : '';
    var flipY = (dir==='br'||dir==='bl') ? 'scale(1,-1) translate(0,-80)' : '';
    var tf = [flipX,flipY].filter(Boolean).join(' ') || 'none';
    return '<svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<g transform="'+tf+'">' +
      '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="'+c+'" stroke-width="28" stroke-linecap="square"/>' +
      '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="8" stroke-linecap="square"/>' +
      '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="'+fc+'" stroke-width="14" stroke-linecap="square" opacity=".35"/>' +
      '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="28" stroke-linecap="square"/>' +
      '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="'+c+'" stroke-width="26" stroke-linecap="square"/>' +
      '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="7" stroke-linecap="square"/>' +
      '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="'+fc+'" stroke-width="12" stroke-linecap="square" opacity=".32"/>' +
      '</g>' +
    '</svg>';
  }
  if (el.tipo === 'pipe-tee') {
    var c = p.color || '#546e7a', fc = p.fluidColor || '#29b6f6';
    return '<svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="0"  y="27" width="80" height="26" rx="4" fill="'+c+'"/>' +
      '<rect x="27" y="27" width="26" height="53" rx="4" fill="'+c+'"/>' +
      '<rect x="0"  y="31" width="80" height="7" rx="2" fill="rgba(255,255,255,.2)"/>' +
      '<rect x="31" y="34" width="7" height="46" rx="2" fill="rgba(255,255,255,.2)"/>' +
      '<rect x="2"  y="33" width="76" height="14" rx="2" fill="'+fc+'" opacity=".32"/>' +
      '<rect x="33" y="35" width="14" height="45" rx="2" fill="'+fc+'" opacity=".32"/>' +
      '<rect x="0"  y="27" width="80" height="26" rx="4" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>' +
      '<rect x="27" y="27" width="26" height="53" rx="4" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>' +
    '</svg>';
  }
  if (el.tipo === 'pipe-cross') {
    var c = p.color || '#546e7a', fc = p.fluidColor || '#29b6f6';
    return '<svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="0"  y="27" width="80" height="26" rx="4" fill="'+c+'"/>' +
      '<rect x="27" y="0"  width="26" height="80" rx="4" fill="'+c+'"/>' +
      '<rect x="0"  y="31" width="80" height="7" rx="2" fill="rgba(255,255,255,.2)"/>' +
      '<rect x="31" y="0"  width="7" height="80" rx="2" fill="rgba(255,255,255,.2)"/>' +
      '<rect x="2"  y="33" width="76" height="14" rx="2" fill="'+fc+'" opacity=".32"/>' +
      '<rect x="33" y="2"  width="14" height="76" rx="2" fill="'+fc+'" opacity=".32"/>' +
      '<rect x="0"  y="27" width="80" height="26" rx="4" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>' +
      '<rect x="27" y="0"  width="26" height="80" rx="4" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>' +
    '</svg>';
  }

  /* ══════════════ MOTOR / BOMBA DECORATIVOS ══════════════ */
  if (el.tipo === 'deco-motor-el') {
    var c = p.color || '#37474f';
    return '<svg viewBox="0 0 100 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      /* base */ '<rect x="15" y="90" width="70" height="12" rx="3" fill="#263238" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<rect x="25" y="100" width="50" height="8" rx="2" fill="#1a2328"/>' +
      /* cuerpo */ '<rect x="10" y="36" width="80" height="56" rx="6" fill="'+c+'" stroke="#263238" stroke-width="2"/>' +
      /* aletas */ '<rect x="10" y="42" width="80" height="6" rx="1" fill="rgba(255,255,255,.1)"/>' +
      '<rect x="10" y="52" width="80" height="6" rx="1" fill="rgba(255,255,255,.1)"/>' +
      '<rect x="10" y="62" width="80" height="6" rx="1" fill="rgba(255,255,255,.1)"/>' +
      '<rect x="10" y="72" width="80" height="6" rx="1" fill="rgba(255,255,255,.1)"/>' +
      '<rect x="10" y="82" width="80" height="6" rx="1" fill="rgba(255,255,255,.1)"/>' +
      /* tapa lateral */ '<rect x="76" y="40" width="18" height="48" rx="4" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<circle cx="85" cy="64" r="10" fill="#37474f" stroke="#263238" stroke-width="1.5"/>' +
      '<circle cx="85" cy="64" r="5" fill="#263238"/>' +
      /* eje */ '<rect x="93" y="62" width="7" height="4" rx="2" fill="#90a4ae"/>' +
      /* caja terminales */ '<rect x="28" y="20" width="44" height="20" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<circle cx="40" cy="30" r="3" fill="#c62828"/>' +
      '<circle cx="50" cy="30" r="3" fill="#f9a825"/>' +
      '<circle cx="60" cy="30" r="3" fill="#2e7d32"/>' +
      /* etiqueta */ '<text x="50" y="14" text-anchor="middle" font-family="DM Mono,monospace" font-size="10" font-weight="700" fill="#546e7a" letter-spacing="1">'+escHtml(p.label||'M1')+'</text>' +
    '</svg>';
  }
  if (el.tipo === 'deco-pump-cent') {
    var c = p.color || '#37474f';
    return '<svg viewBox="0 0 100 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      /* base */ '<rect x="15" y="92" width="70" height="10" rx="3" fill="#263238" stroke="#1a1a14" stroke-width="1.5"/>' +
      '<rect x="25" y="100" width="50" height="6" rx="2" fill="#1a2328"/>' +
      /* cuerpo voluta */ '<path d="M50,85 Q10,85 10,50 Q10,14 50,14 Q82,14 88,42 L78,42 Q74,22 50,22 Q18,22 18,50 Q18,78 50,78 Z" fill="'+c+'" stroke="#263238" stroke-width="2"/>' +
      /* boca descarga */ '<rect x="76" y="36" width="24" height="16" rx="3" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
      /* boca aspiración */ '<rect x="22" y="84" width="16" height="10" rx="3" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
      /* tapa */ '<circle cx="50" cy="50" r="20" fill="#455a64" stroke="#263238" stroke-width="2"/>' +
      '<circle cx="50" cy="50" r="12" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
      /* rodete */ '<circle cx="50" cy="50" r="5" fill="#90a4ae"/>' +
      '<line x1="50" y1="38" x2="50" y2="45" stroke="#90a4ae" stroke-width="2.5"/>' +
      '<line x1="50" y1="55" x2="50" y2="62" stroke="#90a4ae" stroke-width="2.5"/>' +
      '<line x1="38" y1="50" x2="45" y2="50" stroke="#90a4ae" stroke-width="2.5"/>' +
      '<line x1="55" y1="50" x2="62" y2="50" stroke="#90a4ae" stroke-width="2.5"/>' +
      /* etiqueta */ '<text x="50" y="10" text-anchor="middle" font-family="DM Mono,monospace" font-size="10" font-weight="700" fill="#546e7a" letter-spacing="1">'+escHtml(p.label||'P1')+'</text>' +
    '</svg>';
  }

  /* ══════════════ PILOTO DE SEÑALIZACIÓN ══════════════ */
  if (el.tipo === 'signal-lamp') {
    var useBlue = p.useBlue || false;
    var lamps = useBlue
      ? [ {id:'R', col:'#c62828', off:'#4a1010', label:'R'},
          {id:'Y', col:'#f9a825', off:'#4a3000', label:'Y'},
          {id:'G', col:'#2e7d32', off:'#0a2e0a', label:'G'},
          {id:'B', col:'#1565c0', off:'#0a1840', label:'B'} ]
      : [ {id:'R', col:'#c62828', off:'#4a1010', label:'R'},
          {id:'Y', col:'#f9a825', off:'#4a3000', label:'Y'},
          {id:'G', col:'#2e7d32', off:'#0a2e0a', label:'G'} ];
    var h_lamp = useBlue ? 160 : 120;
    var yStart = 18, step = useBlue ? 36 : 36;
    var svgH = yStart + lamps.length * step + 16;
    var rows = lamps.map(function(l, i) {
      var y = yStart + i * step;
      return '' +
        '<rect x="8" y="'+(y-1)+'" width="56" height="32" rx="16" fill="#2a2a26" stroke="#1a1a14" stroke-width="1.5"/>' +
        '<rect x="10" y="'+(y+1)+'" width="52" height="28" rx="14" fill="'+l.off+'"/>' +
        '<ellipse cx="36" cy="'+(y+15)+'" rx="20" ry="12" fill="'+l.off+'" stroke="'+l.off+'" stroke-width="1"/>' +
        '<ellipse cx="30" cy="'+(y+10)+'" rx="7" ry="4" fill="rgba(255,255,255,.12)"/>';
    }).join('');
    var pole = '<rect x="33" y="'+(yStart + lamps.length*step)+'" width="6" height="14" rx="3" fill="#3a3a36"/>' +
               '<rect x="20" y="'+(yStart + lamps.length*step + 10)+'" width="32" height="6" rx="3" fill="#2a2a26"/>';
    return '<svg viewBox="0 0 72 '+svgH+'" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<text x="36" y="12" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90" letter-spacing="1">'+escHtml(p.label||'SL1')+'</text>' +
      rows + pole +
    '</svg>';
  }


  /* ══════════════ VÁLVULA MOTORIZADA ══════════════ */
  if (el.tipo === 'valve-motorized') {
    var c = p.color||'#546e7a';
    return '<svg viewBox="0 0 80 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="28" y="0" width="24" height="18" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<rect x="34" y="8" width="12" height="24" rx="2" fill="#546e7a" stroke="#263238" stroke-width="1"/>' +
      '<polygon points="0,36 30,52 0,68" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
      '<polygon points="80,36 50,52 80,68" fill="none" stroke="'+c+'" stroke-width="2"/>' +
      '<line x1="40" y1="32" x2="40" y2="52" stroke="'+c+'" stroke-width="2"/>' +
      '<circle cx="40" cy="52" r="5" fill="#90a4ae"/>' +
      '<text x="40" y="86" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" font-weight="700" fill="'+c+'">' + escHtml(p.label||'V1') + '</text>' +
      '<text x="40" y="96" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">—%</text>' +
    '</svg>';
  }
  if (el.tipo === 'valve-butterfly') {
    var c = p.color||'#546e7a';
    return '<svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<circle cx="40" cy="40" r="30" fill="none" stroke="'+c+'" stroke-width="3"/>' +
      '<ellipse cx="40" cy="40" rx="12" ry="28" fill="'+c+'" opacity=".5" stroke="'+c+'" stroke-width="1.5"/>' +
      '<line x1="40" y1="10" x2="40" y2="70" stroke="'+c+'" stroke-width="2.5"/>' +
      '<rect x="34" y="0" width="12" height="12" rx="2" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<text x="40" y="78" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c+'">' + escHtml(p.label||'VB1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'valve-safety') {
    var c = p.color||'#c62828';
    return '<svg viewBox="0 0 80 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<polygon points="0,30 30,46 0,62" fill="'+c+'" stroke="#8b0000" stroke-width="1.5"/>' +
      '<polygon points="80,30 50,46 80,62" fill="none" stroke="'+c+'" stroke-width="2"/>' +
      '<line x1="40" y1="26" x2="40" y2="46" stroke="'+c+'" stroke-width="2"/>' +
      '<circle cx="40" cy="46" r="5" fill="#9a9a90"/>' +
      '<rect x="30" y="0" width="20" height="26" rx="2" fill="'+c+'" stroke="#8b0000" stroke-width="1.5"/>' +
      '<rect x="36" y="4" width="8" height="14" rx="1" fill="#ffcdd2"/>' +
      '<text x="40" y="76" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" font-weight="700" fill="'+c+'">' + escHtml(p.label||'PSV1') + '</text>' +
      '<text x="40" y="86" text-anchor="middle" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">SAFETY</text>' +
    '</svg>';
  }
  if (el.tipo === 'fan-symbol') {
    var c = p.color||'#546e7a';
    return '<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<circle cx="50" cy="50" r="44" fill="none" stroke="'+c+'" stroke-width="2.5"/>' +
      '<ellipse cx="50" cy="22" rx="10" ry="20" fill="'+c+'" opacity=".7" stroke="'+c+'" stroke-width="1" transform="rotate(0 50 50)"/>' +
      '<ellipse cx="50" cy="22" rx="10" ry="20" fill="'+c+'" opacity=".7" stroke="'+c+'" stroke-width="1" transform="rotate(120 50 50)"/>' +
      '<ellipse cx="50" cy="22" rx="10" ry="20" fill="'+c+'" opacity=".7" stroke="'+c+'" stroke-width="1" transform="rotate(240 50 50)"/>' +
      '<circle cx="50" cy="50" r="7" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<text x="50" y="96" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" fill="'+c+'">' + escHtml(p.label||'FA1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'agitator-symbol') {
    var c = p.color||'#546e7a';
    return '<svg viewBox="0 0 80 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="36" y="0" width="8" height="60" rx="2" fill="'+c+'" stroke="#263238" stroke-width="1"/>' +
      '<rect x="20" y="0" width="40" height="8" rx="2" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<line x1="40" y1="60" x2="10" y2="90" stroke="'+c+'" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="40" y1="60" x2="70" y2="90" stroke="'+c+'" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="40" y1="70" x2="12" y2="95" stroke="'+c+'" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="40" y1="70" x2="68" y2="95" stroke="'+c+'" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="40" cy="60" r="5" fill="#90a4ae" stroke="#263238" stroke-width="1"/>' +
      '<text x="40" y="114" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" fill="'+c+'">' + escHtml(p.label||'AG1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'conveyor-pid') {
    var c = p.color||'#37474f', fc = '#29b6f6';
    return '<svg viewBox="0 0 240 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="20" y="22" width="200" height="26" rx="4" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<rect x="24" y="26" width="192" height="6" rx="2" fill="rgba(255,255,255,.15)"/>' +
      '<rect x="24" y="30" width="192" height="14" rx="2" fill="'+fc+'" opacity=".25"/>' +
      '<line x1="24" y1="34" x2="216" y2="34" stroke="#546e7a" stroke-width="1" stroke-dasharray="12,8"/>' +
      '<circle cx="20" cy="35" r="13" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="20" cy="35" r="5" fill="#1a1a14"/>' +
      '<circle cx="220" cy="35" r="13" fill="'+c+'" stroke="#1a1a14" stroke-width="2"/>' +
      '<circle cx="220" cy="35" r="5" fill="#1a1a14"/>' +
      '<rect x="30" y="48" width="8" height="22" rx="2" fill="'+c+'" stroke="#1a1a14" stroke-width="1"/>' +
      '<rect x="80" y="48" width="8" height="22" rx="2" fill="'+c+'" stroke="#1a1a14" stroke-width="1"/>' +
      '<rect x="130" y="48" width="8" height="22" rx="2" fill="'+c+'" stroke="#1a1a14" stroke-width="1"/>' +
      '<rect x="180" y="48" width="8" height="22" rx="2" fill="'+c+'" stroke="#1a1a14" stroke-width="1"/>' +
      '<rect x="22" y="68" width="196" height="8" rx="2" fill="'+c+'" stroke="#1a1a14" stroke-width="1"/>' +
      '<text x="120" y="14" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" font-weight="700" fill="'+c+'">' + escHtml(p.label||'CV1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'dosing-pump') {
    var c = p.color||'#1565c0';
    return '<svg viewBox="0 0 90 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="15" y="85" width="60" height="10" rx="2" fill="#263238" stroke="#1a1a14" stroke-width="1"/>' +
      '<rect x="10" y="40" width="70" height="46" rx="5" fill="'+c+'" stroke="#0d47a1" stroke-width="2"/>' +
      '<ellipse cx="45" cy="63" rx="22" ry="20" fill="#1a237e" stroke="#0d47a1" stroke-width="1.5"/>' +
      '<ellipse cx="45" cy="63" rx="12" ry="11" fill="'+c+'" stroke="#1a237e" stroke-width="1"/>' +
      '<circle cx="45" cy="63" r="4" fill="#90caf9"/>' +
      '<rect x="38" y="0" width="14" height="42" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<rect x="30" y="0" width="30" height="10" rx="2" fill="#37474f" stroke="#263238" stroke-width="1"/>' +
      '<rect x="80" y="55" width="10" height="20" rx="2" fill="'+c+'" stroke="#0d47a1" stroke-width="1.5"/>' +
      '<text x="45" y="104" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" font-weight="700" fill="'+c+'">' + escHtml(p.label||'DP1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'heat-exchanger') {
    var c = p.color||'#c62828';
    return '<svg viewBox="0 0 120 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="20" width="100" height="60" rx="5" fill="#37474f" stroke="#263238" stroke-width="2"/>' +
      '<rect x="18" y="28" width="84" height="44" rx="3" fill="#263238"/>' +
      '<line x1="18" y1="38" x2="102" y2="38" stroke="'+c+'" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="18" y1="48" x2="102" y2="48" stroke="#29b6f6" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="18" y1="58" x2="102" y2="58" stroke="'+c+'" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="18" y1="68" x2="102" y2="68" stroke="#29b6f6" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="0" y="28" width="18" height="12" rx="2" fill="'+c+'" stroke="#8b0000" stroke-width="1.5"/>' +
      '<rect x="102" y="48" width="18" height="12" rx="2" fill="'+c+'" stroke="#8b0000" stroke-width="1.5"/>' +
      '<rect x="0" y="60" width="18" height="12" rx="2" fill="#29b6f6" stroke="#0277bd" stroke-width="1.5"/>' +
      '<rect x="102" y="28" width="18" height="12" rx="2" fill="#29b6f6" stroke="#0277bd" stroke-width="1.5"/>' +
      '<text x="60" y="96" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">' + escHtml(p.label||'HE1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'filter-symbol') {
    var c = p.color||'#546e7a';
    return '<svg viewBox="0 0 80 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="10" width="60" height="64" rx="5" fill="'+c+'" stroke="#263238" stroke-width="2"/>' +
      '<rect x="18" y="18" width="44" height="48" rx="3" fill="#263238"/>' +
      '<line x1="18" y1="28" x2="62" y2="28" stroke="#546e7a" stroke-width="2"/>' +
      '<line x1="22" y1="36" x2="58" y2="36" stroke="#546e7a" stroke-width="2"/>' +
      '<line x1="26" y1="44" x2="54" y2="44" stroke="#546e7a" stroke-width="2"/>' +
      '<line x1="30" y1="52" x2="50" y2="52" stroke="#546e7a" stroke-width="2"/>' +
      '<line x1="34" y1="60" x2="46" y2="60" stroke="#546e7a" stroke-width="2"/>' +
      '<rect x="32" y="0" width="16" height="12" rx="2" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
      '<rect x="32" y="74" width="16" height="12" rx="2" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
      '<text x="40" y="88" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">' + escHtml(p.label||'F1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'compressor-symbol') {
    var c = p.color||'#37474f';
    return '<svg viewBox="0 0 90 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="5" y="90" width="80" height="10" rx="2" fill="#263238"/>' +
      '<rect x="15" y="40" width="60" height="52" rx="5" fill="'+c+'" stroke="#263238" stroke-width="2"/>' +
      '<circle cx="45" cy="64" r="20" fill="#455a64" stroke="#263238" stroke-width="2"/>' +
      '<circle cx="45" cy="64" r="10" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
      '<circle cx="45" cy="64" r="4" fill="#90a4ae"/>' +
      '<rect x="30" y="0" width="30" height="42" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<rect x="36" y="6" width="18" height="28" rx="2" fill="#37474f"/>' +
      '<rect x="75" y="56" width="15" height="16" rx="2" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
      '<text x="45" y="107" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" fill="'+c+'">' + escHtml(p.label||'C1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'silo') {
    var pct = 60, c = p.color||'#78909c', fc = '#90a4ae';
    var h = Math.round((100 - pct) / 100 * 80);
    return '<svg viewBox="0 0 90 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="15" y="20" width="60" height="90" rx="0" fill="'+c+'" stroke="#455a64" stroke-width="2"/>' +
      '<polygon points="15,110 45,150 75,110" fill="'+c+'" stroke="#455a64" stroke-width="2"/>' +
      '<rect x="16" y="'+h+'" width="58" height="'+(110-h)+'" fill="'+fc+'" opacity=".5"/>' +
      '<line x1="16" y1="'+h+'" x2="74" y2="'+h+'" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="4,3"/>' +
      '<rect x="38" y="148" width="14" height="10" rx="2" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<rect x="12" y="0" width="66" height="22" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<text x="45" y="14" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" font-weight="700" fill="#cfd8dc">' + escHtml(p.label||'SL1') + '</text>' +
      '<text x="45" y="72" text-anchor="middle" font-family="DM Mono,monospace" font-size="11" font-weight="700" fill="#cfd8dc">' + pct + '%</text>' +
    '</svg>';
  }
  if (el.tipo === 'tank-horizontal') {
    var pct = 60, c = p.color||'#1565c0', fc = '#29b6f6';
    var fw = Math.round(pct / 100 * 164);
    return '<svg viewBox="0 0 200 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="18" y="15" width="164" height="60" rx="0" fill="'+c+'" stroke="#0d47a1" stroke-width="2"/>' +
      '<ellipse cx="18" cy="45" rx="14" ry="30" fill="'+c+'" stroke="#0d47a1" stroke-width="2"/>' +
      '<ellipse cx="182" cy="45" rx="14" ry="30" fill="'+c+'" stroke="#0d47a1" stroke-width="2"/>' +
      '<rect x="18" y="16" width="'+fw+'" height="58" fill="'+fc+'" opacity=".4"/>' +
      '<line x1="'+(18+fw)+'" y1="15" x2="'+(18+fw)+'" y2="75" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="4,3"/>' +
      '<text x="100" y="52" text-anchor="middle" font-family="DM Mono,monospace" font-size="12" font-weight="700" fill="#e3f2fd">' + pct + '%</text>' +
      '<text x="100" y="90" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" fill="'+c+'">' + escHtml(p.label||'TH1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'tank-conical') {
    var pct = 60, c = p.color||'#1565c0', fc = '#29b6f6';
    var fillY = Math.round(20 + (100-pct)/100*90);
    return '<svg viewBox="0 0 100 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="15" y="20" width="70" height="90" rx="0" fill="'+c+'" stroke="#0d47a1" stroke-width="2"/>' +
      '<polygon points="15,110 50,150 85,110" fill="'+c+'" stroke="#0d47a1" stroke-width="2"/>' +
      '<rect x="16" y="'+fillY+'" width="68" height="'+(110-fillY)+'" fill="'+fc+'" opacity=".45"/>' +
      '<line x1="15" y1="'+fillY+'" x2="85" y2="'+fillY+'" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="4,3"/>' +
      '<rect x="43" y="148" width="14" height="10" rx="2" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<rect x="12" y="0" width="76" height="22" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<text x="50" y="14" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" font-weight="700" fill="#cfd8dc">' + escHtml(p.label||'TC1') + '</text>' +
      '<text x="50" y="72" text-anchor="middle" font-family="DM Mono,monospace" font-size="11" font-weight="700" fill="#e3f2fd">' + pct + '%</text>' +
    '</svg>';
  }
  if (el.tipo === 'reactor-vessel') {
    var c = p.color||'#37474f';
    return '<svg viewBox="0 0 110 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="10" y="20" width="90" height="100" rx="5" fill="'+c+'" stroke="#263238" stroke-width="2"/>' +
      '<ellipse cx="55" cy="120" rx="45" ry="15" fill="'+c+'" stroke="#263238" stroke-width="2"/>' +
      '<rect x="11" y="60" width="88" height="60" fill="#29b6f6" opacity=".25"/>' +
      '<line x1="11" y1="60" x2="99" y2="60" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="4,3"/>' +
      '<line x1="55" y1="20" x2="55" y2="75" stroke="#90a4ae" stroke-width="3"/>' +
      '<line x1="55" y1="75" x2="30" y2="100" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="55" y1="75" x2="80" y2="100" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="55" cy="75" r="4" fill="#b0bec5"/>' +
      '<rect x="45" y="0" width="20" height="22" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
      '<rect x="5" y="40" width="10" height="20" rx="2" fill="#c62828" stroke="#8b0000" stroke-width="1.5"/>' +
      '<rect x="95" y="40" width="10" height="20" rx="2" fill="#29b6f6" stroke="#0277bd" stroke-width="1.5"/>' +
      '<text x="55" y="150" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" fill="#9a9a90">' + escHtml(p.label||'R1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'separator-vessel') {
    var c = p.color||'#546e7a';
    return '<svg viewBox="0 0 120 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="12" y="18" width="96" height="56" rx="28" fill="'+c+'" stroke="#455a64" stroke-width="2"/>' +
      '<rect x="20" y="26" width="80" height="22" fill="#29b6f6" opacity=".35"/>' +
      '<rect x="20" y="48" width="80" height="18" fill="#78909c" opacity=".5"/>' +
      '<line x1="20" y1="48" x2="100" y2="48" stroke="#90a4ae" stroke-width="1.5" stroke-dasharray="4,3"/>' +
      '<rect x="0" y="30" width="14" height="12" rx="2" fill="'+c+'" stroke="#455a64" stroke-width="1.5"/>' +
      '<rect x="106" y="30" width="14" height="12" rx="2" fill="#29b6f6" stroke="#0277bd" stroke-width="1.5"/>' +
      '<rect x="106" y="50" width="14" height="12" rx="2" fill="#78909c" stroke="#546e7a" stroke-width="1.5"/>' +
      '<text x="60" y="92" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c+'">' + escHtml(p.label||'S1') + '</text>' +
    '</svg>';
  }

  /* ══════════════ MOTOR ARRANCADOR ══════════════ */
  if (el.tipo === 'motor-starter') {
    return '<div style="width:100%;height:100%;background:#1a1a18;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0f0f0d;padding:4px 8px;display:flex;align-items:center;gap:6px;border-bottom:1px solid #2a2a26;flex-shrink:0">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#9a9a90;flex:1">' + escHtml(p.label||'M1') + '</div>' +
        '<div style="width:8px;height:8px;border-radius:50%;background:#9a9a90"></div>' +
      '</div>' +
      '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:6px;align-items:center">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:14px;height:14px;border-radius:50%;background:#2e7d32;border:2px solid #1b5e20"></div><div style="font-size:7px;color:#9a9a90;font-family:DM Mono,monospace">RUN</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:14px;height:14px;border-radius:50%;background:#9a9a90;border:2px solid #616161"></div><div style="font-size:7px;color:#9a9a90;font-family:DM Mono,monospace">FLT</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:14px;height:14px;border-radius:50%;background:#f9a825;border:2px solid #f57f17"></div><div style="font-size:7px;color:#9a9a90;font-family:DM Mono,monospace">RDY</div></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'vfd-faceplate') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #1565c0;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0a1520;padding:4px 8px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1565c0;flex-shrink:0">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#29b6f6">' + escHtml(p.label||'VFD1') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">STOP</span>' +
      '</div>' +
      '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:6px">' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">Hz</span><span style="font-family:DM Mono,monospace;font-size:16px;color:#29b6f6;font-weight:700">0.0</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">rpm</span><span style="font-family:DM Mono,monospace;font-size:16px;color:#f0f0e8;font-weight:700">0</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">A</span><span style="font-family:DM Mono,monospace;font-size:14px;color:#f0f0e8">0.0</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">%Ref</span><span style="font-family:DM Mono,monospace;font-size:14px;color:#f9a825">0</span></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'servo-axis') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;padding:6px 8px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#f9a825">' + escHtml(p.label||'AX1') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">DIS</span>' +
      '</div>' +
      '<div style="position:relative;height:10px;background:#1a1a18;border-radius:2px;border:1px solid #2a2a26;margin-bottom:4px">' +
        '<div style="position:absolute;left:0;top:0;height:100%;width:40%;background:#f9a825;border-radius:2px;opacity:.4"></div>' +
        '<div style="position:absolute;left:40%;top:-3px;width:2px;height:16px;background:#f9a825;border-radius:1px"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between">' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">POS</span><span style="font-family:DM Mono,monospace;font-size:13px;color:#f9a825;font-weight:700">—</span></div>' +
        '<div style="display:flex;flex-direction:column;text-align:right"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">TGT</span><span style="font-family:DM Mono,monospace;font-size:13px;color:#f0f0e8">—</span></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'motor-runtime') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;padding:6px 8px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#9a9a90">' + escHtml(p.label||'M1') + ' · HORAS</span>' +
        '<div style="width:8px;height:8px;border-radius:50%;background:#9a9a90"></div>' +
      '</div>' +
      '<div style="font-family:DM Mono,monospace;font-size:22px;font-weight:700;color:#f0f0e8;letter-spacing:2px">0 h</div>' +
      '<div style="position:relative;height:6px;background:#1a1a18;border-radius:3px;margin-top:6px;border:1px solid #2a2a26">' +
        '<div style="position:absolute;left:0;top:0;height:100%;width:0%;background:#f9a825;border-radius:3px"></div>' +
      '</div>' +
      '<div style="font-family:DM Mono,monospace;font-size:8px;color:#546e7a;margin-top:3px">MANTENIMIENTO: ' + (p.warningH||8000) + 'h</div>' +
    '</div>';
  }
  if (el.tipo === 'brake-display') {
    return '<div style="width:100%;height:100%;background:#1a1a18;border-radius:3px;border:2px solid #546e7a;display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;">' +
      '<svg width="28" height="28" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="30" cy="30" r="28" fill="none" stroke="#546e7a" stroke-width="3"/>' +
        '<circle cx="30" cy="30" r="16" fill="none" stroke="#546e7a" stroke-width="3"/>' +
        '<path d="M14,30 A16,16 0 0,1 46,30" fill="#546e7a" opacity=".4"/>' +
      '</svg>' +
      '<div style="flex:1">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#9a9a90">' + escHtml(p.label||'BR1') + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:13px;font-weight:700;color:#f9a825;margin-top:2px">RELEASED</div>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════ INSTRUMENTACIÓN ══════════════ */
  if (el.tipo === 'thermometer-display') {
    var pct = 45, c = p.color||'#c62828';
    var fillH = Math.round(pct / 100 * 90);
    return '<svg viewBox="0 0 80 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="32" y="10" width="16" height="100" rx="8" fill="#263238" stroke="#37474f" stroke-width="1.5"/>' +
      '<circle cx="40" cy="118" r="18" fill="'+c+'" stroke="#8b0000" stroke-width="2"/>' +
      '<rect x="35" y="'+(110-fillH)+'" width="10" height="'+(fillH+10)+'" rx="3" fill="'+c+'"/>' +
      '<line x1="50" y1="20" x2="56" y2="20" stroke="#37474f" stroke-width="1.5"/>' +
      '<line x1="50" y1="35" x2="58" y2="35" stroke="#37474f" stroke-width="1.5"/>' +
      '<line x1="50" y1="50" x2="56" y2="50" stroke="#37474f" stroke-width="1.5"/>' +
      '<line x1="50" y1="65" x2="58" y2="65" stroke="#37474f" stroke-width="1.5"/>' +
      '<line x1="50" y1="80" x2="56" y2="80" stroke="#37474f" stroke-width="1.5"/>' +
      '<line x1="50" y1="95" x2="58" y2="95" stroke="#37474f" stroke-width="1.5"/>' +
      '<line x1="50" y1="110" x2="56" y2="110" stroke="#37474f" stroke-width="1.5"/>' +
      '<text x="62" y="23" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">' + (p.max||200) + '</text>' +
      '<text x="62" y="98" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">' + (p.min||0) + '</text>' +
      '<text x="40" y="122" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" font-weight="700" fill="#fff">—</text>' +
      '<text x="40" y="148" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c+'">' + escHtml(p.label||'TT1') + ' ' + escHtml(p.unit||'°C') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'pressure-gauge-pid') {
    var c = p.color||'#1565c0';
    return '<svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<circle cx="60" cy="60" r="54" fill="#0f0f0d" stroke="#2a2a26" stroke-width="3"/>' +
      '<circle cx="60" cy="60" r="46" fill="none" stroke="#1a1a18" stroke-width="1"/>' +
      '<path d="M14,74 A46,46 0 0,1 106,74" fill="none" stroke="#2a2a26" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M14,74 A46,46 0 0,1 60,14" fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round"/>' +
      '<line x1="60" y1="60" x2="14" y2="74" stroke="#f0f0e8" stroke-width="2.5" stroke-linecap="round" style="transform-origin:60px 60px"/>' +
      '<circle cx="60" cy="60" r="5" fill="#2a2a26" stroke="#546e7a" stroke-width="2"/>' +
      '<text x="60" y="82" text-anchor="middle" font-family="DM Mono,monospace" font-size="11" font-weight="700" fill="#f0f0e8">—</text>' +
      '<text x="60" y="94" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c+'">' + escHtml(p.unit||'bar') + '</text>' +
      '<text x="60" y="112" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">' + escHtml(p.label||'PT1') + '</text>' +
      '<text x="20" y="88" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">' + (p.min||0) + '</text>' +
      '<text x="90" y="88" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">' + (p.max||10) + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'flow-totalizer') {
    var c = p.color||'#00838f';
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid '+c+';display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#001a1e;padding:4px 8px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid '+c+';flex-shrink:0">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:'+c+'">' + escHtml(p.label||'FT1') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">' + escHtml(p.unit||'m³/h') + '</span>' +
      '</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:6px 8px">' +
        '<div style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">CAUDAL</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:18px;font-weight:700;color:'+c+'">—</div>' +
        '<div style="height:1px;background:#1a1a18;margin:4px 0"></div>' +
        '<div style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">TOTAL ACUM.</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:13px;color:#f0f0e8">—</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'level-indicator') {
    var pct = 65, c = p.color||'#1565c0';
    var fillH = Math.round(pct / 100 * 110);
    return '<svg viewBox="0 0 80 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="20" y="10" width="40" height="120" rx="4" fill="#1a1a18" stroke="#2a2a26" stroke-width="2"/>' +
      '<rect x="21" y="'+(130-fillH)+'" width="38" height="'+fillH+'" rx="2" fill="'+c+'" opacity=".6"/>' +
      '<line x1="21" y1="'+(130-fillH)+'" x2="59" y2="'+(130-fillH)+'" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="3,2"/>' +
      '<line x1="60" y1="20" x2="66" y2="20" stroke="#c62828" stroke-width="2"/>' +
      '<line x1="60" y1="40" x2="64" y2="40" stroke="#2a2a26" stroke-width="1"/>' +
      '<line x1="60" y1="60" x2="64" y2="60" stroke="#2a2a26" stroke-width="1"/>' +
      '<line x1="60" y1="80" x2="66" y2="80" stroke="#2a2a26" stroke-width="1.5"/>' +
      '<line x1="60" y1="100" x2="64" y2="100" stroke="#2a2a26" stroke-width="1"/>' +
      '<line x1="60" y1="120" x2="64" y2="120" stroke="#2a2a26" stroke-width="1"/>' +
      '<line x1="60" y1="128" x2="66" y2="128" stroke="#2e7d32" stroke-width="2"/>' +
      '<text x="40" y="148" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c+'">' + escHtml(p.label||'LT1') + '</text>' +
      '<text x="40" y="80" text-anchor="middle" font-family="DM Mono,monospace" font-size="11" font-weight="700" fill="#e3f2fd">'+pct+'%</text>' +
    '</svg>';
  }
  if (el.tipo === 'energy-meter') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #f9a825;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#1a1000;padding:4px 8px;border-bottom:1px solid #f9a825;flex-shrink:0;display:flex;align-items:center;justify-content:space-between">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#f9a825">' + escHtml(p.label||'EM1') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">ENERGY</span>' +
      '</div>' +
      '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;padding:5px">' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">kW</span><span style="font-family:DM Mono,monospace;font-size:13px;color:#f9a825;font-weight:700">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">V</span><span style="font-family:DM Mono,monospace;font-size:13px;color:#f0f0e8">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">A</span><span style="font-family:DM Mono,monospace;font-size:13px;color:#f0f0e8">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">kWh</span><span style="font-family:DM Mono,monospace;font-size:11px;color:#9a9a90">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">PF</span><span style="font-family:DM Mono,monospace;font-size:11px;color:#9a9a90">—</span></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'ph-meter') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:10px">' +
      '<div style="display:flex;flex-direction:column;flex:1">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#9a9a90">' + escHtml(p.label||'AT1') + ' · pH</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:28px;font-weight:700;color:#f0f0e8;line-height:1">—</div>' +
        '<div style="height:4px;border-radius:2px;background:linear-gradient(to right,#c62828,#f9a825,#2e7d32,#1565c0,#6a1b9a);margin-top:4px;position:relative">' +
          '<div style="position:absolute;left:50%;top:-3px;width:2px;height:10px;background:#fff;border-radius:1px"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-family:DM Mono,monospace;font-size:7px;color:#546e7a;margin-top:1px"><span>0</span><span>7</span><span>14</span></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'rpm-display') {
    var c = '#29b6f6';
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #1a1a18;display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:8px">' +
      '<div style="display:flex;flex-direction:column;flex:1">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#9a9a90">' + escHtml(p.label||'ST1') + ' · ' + escHtml(p.unit||'rpm') + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:26px;font-weight:700;color:'+c+';line-height:1">—</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:4px">' +
          '<span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">REF</span>' +
          '<span style="font-family:DM Mono,monospace;font-size:11px;color:#9a9a90">—</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'temperature-4zone') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #1a1a18;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #1a1a18;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">' + escHtml(p.label||'TEMP ZONES') + '</div>' +
      '<div style="flex:1;display:flex;align-items:center;justify-content:space-around;padding:0 6px">' +
        ['Z1','Z2','Z3','Z4'].map(function(z,i){ return '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">'+z+'</div><div style="font-family:DM Mono,monospace;font-size:13px;font-weight:700;color:#ef5350">—</div><div style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">'+(p.unit||'°C')+'</div></div>'; }).join('') +
      '</div>' +
    '</div>';
  }

  /* ══════════════ CONTROL / REGULACIÓN ══════════════ */
  if (el.tipo === 'pid-controller') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0a0a08;padding:4px 8px;border-bottom:1px solid #2a2a26;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#f9a825">' + escHtml(p.label||'PIC-101') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:8px;background:#1565c0;color:#fff;padding:1px 6px;border-radius:2px">AUTO</span>' +
      '</div>' +
      '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4px;padding:6px">' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">SP</span><span style="font-family:DM Mono,monospace;font-size:16px;color:#2e7d32;font-weight:700">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">PV</span><span style="font-family:DM Mono,monospace;font-size:16px;color:#1565c0;font-weight:700">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">MV %</span><span style="font-family:DM Mono,monospace;font-size:16px;color:#f9a825;font-weight:700">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">ERR</span><span style="font-family:DM Mono,monospace;font-size:14px;color:#9a9a90">—</span></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'sequence-stepper') {
    var names = (p.names||'INIT,RUN,STOP').split(',');
    var cells = names.slice(0,8).map(function(n,i){ return '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:28px;height:28px;border-radius:50%;background:'+(i===0?'#1565c0':'#1a1a18')+';border:2px solid '+(i===0?'#1565c0':'#2a2a26')+';display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:8px;color:'+(i===0?'#fff':'#546e7a')+';font-weight:700">'+(i+1)+'</div><div style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace;text-align:center;max-width:30px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(n.trim())+'</div></div>'; }).join('<div style="height:2px;background:#2a2a26;flex:1;margin:14px -2px 0"></div>');
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">' + escHtml(p.label||'SEQ1') + '</div>' +
      '<div style="flex:1;display:flex;align-items:center;padding:4px 8px;gap:2px;overflow:hidden">' + cells + '</div>' +
    '</div>';
  }
  if (el.tipo === 'timer-display') {
    var c = p.color||'#1565c0';
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid '+c+';display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:10px">' +
      '<svg width="36" height="36" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="30" cy="30" r="26" fill="none" stroke="#2a2a26" stroke-width="4"/>' +
        '<path d="M30,4 A26,26 0 0,1 56,30" fill="none" stroke="'+c+'" stroke-width="4" stroke-linecap="round"/>' +
        '<line x1="30" y1="10" x2="30" y2="30" stroke="#f0f0e8" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line x1="30" y1="30" x2="42" y2="38" stroke="#f0f0e8" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="30" cy="30" r="3" fill="'+c+'"/>' +
      '</svg>' +
      '<div style="flex:1">' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90">' + escHtml(p.label||'T1') + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:20px;font-weight:700;color:'+c+';letter-spacing:2px">00:00</div>' +
        '<div style="height:4px;background:#1a1a18;border-radius:2px;margin-top:4px"><div style="width:0%;height:100%;background:'+c+';border-radius:2px"></div></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'counter-display') {
    var c = p.color||'#2e7d32';
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid '+c+';display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:10px">' +
      '<div style="flex:1">' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90">' + escHtml(p.label||'C1') + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:24px;font-weight:700;color:'+c+';letter-spacing:2px">0</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">' +
        '<div style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">PRE: —</div>' +
        '<div style="width:36px;height:20px;background:#1a1a18;border:1px solid #2a2a26;border-radius:2px;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:8px;color:#546e7a">RST</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'interlock-display') {
    var num = Math.min(parseInt(p.numIL)||4, 8);
    var rows = '';
    for (var ii=1;ii<=num;ii++) {
      rows += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;border-bottom:1px solid #1a1a18">' +
        '<div style="width:8px;height:8px;border-radius:50%;background:#9a9a90;flex-shrink:0"></div>' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;flex:1">' + escHtml(p['iln'+ii]||('IL'+ii)) + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:7px;color:#546e7a">—</div>' +
      '</div>';
    }
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">' + escHtml(p.label||'INTERLOCKS') + '</div>' +
      '<div style="flex:1;padding:4px 8px;overflow:hidden">' + rows + '</div>' +
    '</div>';
  }
  if (el.tipo === 'manual-auto-switch') {
    return '<div style="width:100%;height:100%;background:#1a1a18;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0f0f0d;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">' + escHtml(p.label||'MODO') + '</div>' +
      '<div style="flex:1;display:flex;">' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;background:#1565c0;cursor:pointer"><span style="font-family:DM Mono,monospace;font-size:10px;font-weight:700;color:#fff;letter-spacing:2px">AUTO</span></div>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer"><span style="font-family:DM Mono,monospace;font-size:10px;color:#546e7a;letter-spacing:1px">MAN</span></div>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════ ELÉCTRICO / POTENCIA ══════════════ */
  if (el.tipo === 'circuit-breaker') {
    return '<svg viewBox="0 0 80 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="22" y="30" width="36" height="60" rx="4" fill="#263238" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="26" y="34" width="28" height="52" rx="2" fill="#1a1a18"/>' +
      '<rect x="34" y="52" width="12" height="20" rx="2" fill="#f0f0e8"/>' +
      '<rect x="37" y="60" width="6" height="10" rx="1" fill="#546e7a"/>' +
      '<line x1="40" y1="0" x2="40" y2="30" stroke="#f9a825" stroke-width="3"/>' +
      '<line x1="40" y1="90" x2="40" y2="120" stroke="#f9a825" stroke-width="3"/>' +
      '<circle cx="40" cy="30" r="4" fill="#263238" stroke="#f9a825" stroke-width="2"/>' +
      '<circle cx="40" cy="90" r="4" fill="#263238" stroke="#f9a825" stroke-width="2"/>' +
      '<text x="40" y="114" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">' + escHtml(p.label||'Q1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'contactor-display') {
    return '<svg viewBox="0 0 80 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="15" y="20" width="50" height="60" rx="4" fill="#263238" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="20" y="25" width="40" height="50" rx="2" fill="#1a1a18"/>' +
      '<rect x="30" y="35" width="20" height="16" rx="2" fill="#546e7a"/>' +
      '<rect x="34" y="39" width="12" height="8" rx="1" fill="#1a1a18"/>' +
      '<line x1="25" y1="10" x2="25" y2="25" stroke="#f9a825" stroke-width="2.5"/>' +
      '<line x1="40" y1="10" x2="40" y2="25" stroke="#f9a825" stroke-width="2.5"/>' +
      '<line x1="55" y1="10" x2="55" y2="25" stroke="#f9a825" stroke-width="2.5"/>' +
      '<line x1="25" y1="75" x2="25" y2="90" stroke="#f9a825" stroke-width="2.5"/>' +
      '<line x1="40" y1="75" x2="40" y2="90" stroke="#f9a825" stroke-width="2.5"/>' +
      '<line x1="55" y1="75" x2="55" y2="90" stroke="#f9a825" stroke-width="2.5"/>' +
      '<circle cx="40" cy="60" r="7" fill="#9a9a90" stroke="#546e7a" stroke-width="1.5"/>' +
      '<text x="40" y="98" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">' + escHtml(p.label||'KM1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'power-meter') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #f57c00;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#1a0a00;padding:4px 8px;border-bottom:1px solid #f57c00;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#f57c00">' + escHtml(p.label||'PM1') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">POWER METER</span>' +
      '</div>' +
      '<div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:3px;padding:5px">' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">kW</span><span style="font-family:DM Mono,monospace;font-size:14px;color:#f57c00;font-weight:700">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">V</span><span style="font-family:DM Mono,monospace;font-size:14px;color:#f0f0e8">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">A</span><span style="font-family:DM Mono,monospace;font-size:14px;color:#f0f0e8">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">kVAr</span><span style="font-family:DM Mono,monospace;font-size:12px;color:#9a9a90">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">PF</span><span style="font-family:DM Mono,monospace;font-size:12px;color:#9a9a90">—</span></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'ups-display') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #2e7d32;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#001400;padding:4px 8px;border-bottom:1px solid #2e7d32;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#2e7d32">' + escHtml(p.label||'UPS1') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:7px;background:#2e7d32;color:#fff;padding:1px 5px;border-radius:2px">ONLINE</span>' +
      '</div>' +
      '<div style="flex:1;display:flex;align-items:center;padding:6px 10px;gap:12px">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:3px">' +
          '<svg width="24" height="40" viewBox="0 0 24 40" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="32" rx="3" fill="none" stroke="#2e7d32" stroke-width="2"/><rect x="8" y="1" width="8" height="4" rx="1" fill="#2e7d32"/><rect x="5" y="22" width="14" height="13" rx="2" fill="#2e7d32" opacity=".6"/><text x="12" y="20" text-anchor="middle" font-family="DM Mono,monospace" font-size="6" fill="#2e7d32">85%</text></svg>' +
        '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:4px">' +
          '<div><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">BATERÍA</span><div style="height:5px;background:#1a1a18;border-radius:2px;margin-top:2px"><div style="width:85%;height:100%;background:#2e7d32;border-radius:2px"></div></div></div>' +
          '<div style="display:flex;justify-content:space-between"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">CARGA</span><span style="font-family:DM Mono,monospace;font-size:9px;color:#f0f0e8">—%</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'generator-display') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #546e7a;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0a0a08;padding:4px 8px;border-bottom:1px solid #546e7a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#90a4ae">' + escHtml(p.label||'GEN1') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">STOP</span>' +
      '</div>' +
      '<div style="flex:1;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:1fr 1fr;gap:4px;padding:6px">' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">Hz</span><span style="font-family:DM Mono,monospace;font-size:16px;color:#90a4ae;font-weight:700">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">V</span><span style="font-family:DM Mono,monospace;font-size:16px;color:#f0f0e8;font-weight:700">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">kW</span><span style="font-family:DM Mono,monospace;font-size:14px;color:#f9a825">—</span></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">ESTADO</span><span style="font-family:DM Mono,monospace;font-size:10px;color:#9a9a90">STOP</span></div>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════ PRODUCCIÓN / CALIDAD ══════════════ */
  if (el.tipo === 'batch-display') {
    var steps = (p.stepNames||'PREP,REACT,COOL,END').split(',');
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #6a1b9a;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0e0014;padding:4px 8px;border-bottom:1px solid #6a1b9a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#ce93d8">' + escHtml(p.label||'BATCH') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">IDLE</span>' +
      '</div>' +
      '<div style="flex:1;padding:5px 8px;display:flex;flex-direction:column;gap:4px">' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;min-width:28px">STEP</span>' +
          '<span style="font-family:DM Mono,monospace;font-size:11px;color:#ce93d8">' + escHtml(steps[0]||'—') + '</span>' +
        '</div>' +
        '<div style="height:5px;background:#1a1a18;border-radius:2px"><div style="width:0%;height:100%;background:#6a1b9a;border-radius:2px"></div></div>' +
        '<div style="display:flex;justify-content:space-between"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">BATCH ID</span><span style="font-family:DM Mono,monospace;font-size:9px;color:#f0f0e8">—</span></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'production-counter') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">' + escHtml(p.label||'PRODUCCIÓN') + '</div>' +
      '<div style="flex:1;display:flex;align-items:center;padding:4px 8px;gap:10px">' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">BUENAS</span><span style="font-family:DM Mono,monospace;font-size:18px;font-weight:700;color:#2e7d32">—</span></div>' +
        '<div style="width:1px;height:30px;background:#2a2a26"></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">MALAS</span><span style="font-family:DM Mono,monospace;font-size:18px;font-weight:700;color:#c62828">—</span></div>' +
        '<div style="width:1px;height:30px;background:#2a2a26"></div>' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">TARGET</span><span style="font-family:DM Mono,monospace;font-size:14px;color:#f9a825">—</span></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'cycle-time') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">' + escHtml(p.label||'CICLO') + ' · ' + escHtml(p.unit||'s') + '</div>' +
      '<div style="flex:1;display:flex;align-items:center;padding:4px 8px;gap:8px">' +
        '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">ACTUAL</span><span style="font-family:DM Mono,monospace;font-size:20px;font-weight:700;color:#f0f0e8">—</span></div>' +
        '<div style="display:flex;flex-direction:column;gap:3px">' +
          '<div style="display:flex;gap:4px"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace;width:18px">REF</span><span style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">—</span></div>' +
          '<div style="display:flex;gap:4px"><span style="font-size:6px;color:#2e7d32;font-family:DM Mono,monospace;width:18px">MIN</span><span style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">—</span></div>' +
          '<div style="display:flex;gap:4px"><span style="font-size:6px;color:#c62828;font-family:DM Mono,monospace;width:18px">MAX</span><span style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">—</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'quality-gauge') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0a0a08;padding:4px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#9a9a90;flex-shrink:0">' + escHtml(p.label||'OEE') + '</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:4px 8px;gap:3px">' +
        '<div style="font-family:DM Mono,monospace;font-size:26px;font-weight:700;color:#f9a825;text-align:center;line-height:1">—%</div>' +
        ['DISP','REND','CALID'].map(function(lbl,i){ var cols=['#1565c0','#2e7d32','#c62828']; return '<div style="display:flex;align-items:center;gap:5px"><span style="font-size:6px;color:'+cols[i]+';font-family:DM Mono,monospace;width:30px">'+lbl+'</span><div style="flex:1;height:4px;background:#1a1a18;border-radius:2px"><div style="width:0%;height:100%;background:'+cols[i]+';border-radius:2px"></div></div><span style="font-size:7px;color:#9a9a90;font-family:DM Mono,monospace;min-width:24px;text-align:right">—%</span></div>'; }).join('') +
      '</div>' +
    '</div>';
  }

  /* ══════════════ SEGURIDAD ══════════════ */
  if (el.tipo === 'safety-door') {
    return '<svg viewBox="0 0 100 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' +
      '<rect x="8" y="10" width="84" height="100" rx="4" fill="#263238" stroke="#37474f" stroke-width="2"/>' +
      '<rect x="14" y="16" width="34" height="88" rx="2" fill="#1a1a18" stroke="#37474f" stroke-width="1.5"/>' +
      '<rect x="52" y="16" width="34" height="88" rx="2" fill="#1a1a18" stroke="#37474f" stroke-width="1.5"/>' +
      '<rect x="20" y="22" width="22" height="76" rx="1" fill="#263238"/>' +
      '<rect x="58" y="22" width="22" height="76" rx="1" fill="#263238"/>' +
      '<circle cx="50" cy="60" r="7" fill="#f9a825" stroke="#c07800" stroke-width="1.5"/>' +
      '<circle cx="50" cy="60" r="3" fill="#c07800"/>' +
      '<text x="50" y="114" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">' + escHtml(p.label||'SD1') + '</text>' +
    '</svg>';
  }
  if (el.tipo === 'estop-circuit') {
    return '<div style="width:100%;height:100%;background:#1a0000;border-radius:3px;border:2px solid #c62828;display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;">' +
      '<svg width="32" height="32" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="30" cy="30" r="28" fill="#c62828" stroke="#8b0000" stroke-width="3"/>' +
        '<rect x="14" y="26" width="32" height="8" rx="2" fill="#fff"/>' +
      '</svg>' +
      '<div style="flex:1">' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90">' + escHtml(p.label||'ES1') + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:14px;font-weight:700;color:#2e7d32;margin-top:2px">OK</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'two-hand-control') {
    return '<div style="width:100%;height:100%;background:#1a1a18;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0f0f0d;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">' + escHtml(p.label||'2H1') + ' · 2-HAND</div>' +
      '<div style="flex:1;display:flex;align-items:center;justify-content:space-around;padding:0 12px">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:26px;height:26px;border-radius:50%;background:#546e7a;border:2px solid #37474f;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">H1</div><div style="width:2px;height:8px;background:#37474f"></div><div style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">—</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:28px;height:28px;border-radius:50%;background:#9a9a90;border:2px solid #546e7a;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:9px;color:#fff;font-weight:700">OK</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:26px;height:26px;border-radius:50%;background:#546e7a;border:2px solid #37474f;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">H2</div><div style="width:2px;height:8px;background:#37474f"></div><div style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">—</div></div>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════ UTILITIES ══════════════ */
  if (el.tipo === 'pump-station') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #1565c0;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#000a18;padding:4px 8px;border-bottom:1px solid #1565c0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#29b6f6">' + escHtml(p.label||'PS1') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">PUMP STATION</span>' +
      '</div>' +
      '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:6px">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;border:1px solid #1a1a18;border-radius:2px;padding:4px"><div style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">BOMBA 1</div><div style="width:14px;height:14px;border-radius:50%;background:#9a9a90;border:2px solid #546e7a"></div><div style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">—</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;border:1px solid #1a1a18;border-radius:2px;padding:4px"><div style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">BOMBA 2</div><div style="width:14px;height:14px;border-radius:50%;background:#9a9a90;border:2px solid #546e7a"></div><div style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">—</div></div>' +
        '<div style="grid-column:1/-1;display:flex;flex-direction:column;gap:2px"><div style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">NIVEL</div><div style="height:5px;background:#1a1a18;border-radius:2px"><div style="width:60%;height:100%;background:#1565c0;border-radius:2px"></div></div></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'compressed-air') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #00838f;display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:10px">' +
      '<svg width="32" height="32" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="30" cy="30" r="26" fill="none" stroke="#00838f" stroke-width="3"/>' +
        '<path d="M20,40 Q30,10 40,40" fill="none" stroke="#00838f" stroke-width="2"/>' +
        '<path d="M15,38 Q30,5 45,38" fill="none" stroke="#00838f" stroke-width="1.5" opacity=".5"/>' +
        '<circle cx="30" cy="30" r="3" fill="#00838f"/>' +
      '</svg>' +
      '<div style="flex:1;display:flex;flex-direction:column;gap:3px">' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90">' + escHtml(p.label||'AIR') + ' · AIRE COMPRIMIDO</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:18px;font-weight:700;color:#00838f">— bar</div>' +
        '<div style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">CAUDAL: — m³/h</div>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════ TIA PORTAL ESPECÍFICOS ══════════════ */
  if (el.tipo === 'analog-output') {
    var c = '#29b6f6';
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid '+c+';display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:8px">' +
      '<div style="display:flex;flex-direction:column;flex:1">' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90">' + escHtml(p.label||'AO1') + ' · SA</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:20px;font-weight:700;color:'+c+';line-height:1">— ' + escHtml(p.unit||'mA') + '</div>' +
        '<div style="height:4px;background:#1a1a18;border-radius:2px;margin-top:5px"><div style="width:50%;height:100%;background:'+c+';border-radius:2px"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-family:DM Mono,monospace;font-size:6px;color:#546e7a;margin-top:1px"><span>' + (p.min||4) + '</span><span>' + (p.max||20) + '</span></div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'trend-comparison') {
    var cA = p.colorA||'#c62828', cB = p.colorB||'#1565c0';
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #1a1a18;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
      '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #1a1a18;display:flex;align-items:center;gap:8px;flex-shrink:0">' +
        '<span style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex:1">' + escHtml(p.label||'TREND') + '</span>' +
        '<span style="display:flex;align-items:center;gap:3px;font-family:DM Mono,monospace;font-size:7px;color:'+cA+'"><div style="width:10px;height:2px;background:'+cA+'"></div>' + escHtml(p.labelA||'PV') + '</span>' +
        '<span style="display:flex;align-items:center;gap:3px;font-family:DM Mono,monospace;font-size:7px;color:'+cB+'"><div style="width:10px;height:2px;background:'+cB+'"></div>' + escHtml(p.labelB||'SP') + '</span>' +
      '</div>' +
      '<div style="flex:1;position:relative;padding:4px">' +
        '<svg width="100%" height="100%" viewBox="0 0 300 130" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
          '<line x1="0" y1="65" x2="300" y2="65" stroke="#1a1a18" stroke-width="1"/>' +
          '<path d="M0,80 C30,70 60,50 90,55 S150,40 180,45 S240,60 300,50" fill="none" stroke="'+cA+'" stroke-width="2"/>' +
          '<path d="M0,65 C30,65 60,65 90,65 S150,65 180,65 S240,65 300,65" fill="none" stroke="'+cB+'" stroke-width="1.5" stroke-dasharray="5,3"/>' +
        '</svg>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'string-display') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #1a1a18;display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:8px">' +
      '<div style="display:flex;flex-direction:column;flex:1;overflow:hidden">' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#546e7a">' + escHtml(p.label||'MSG') + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:12px;color:#f0f0e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">— mensaje del PLC —</div>' +
      '</div>' +
    '</div>';
  }
  if (el.tipo === 'plc-clock-sync') {
    return '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;border:1px solid #1a1a18;display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:10px">' +
      '<svg width="28" height="28" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="26" fill="none" stroke="#1565c0" stroke-width="3"/><line x1="30" y1="8" x2="30" y2="30" stroke="#f0f0e8" stroke-width="2.5" stroke-linecap="round"/><line x1="30" y1="30" x2="44" y2="38" stroke="#1565c0" stroke-width="2" stroke-linecap="round"/><circle cx="30" cy="30" r="3" fill="#1565c0"/></svg>' +
      '<div style="flex:1">' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#546e7a">' + escHtml(p.label||'PLC TIME') + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:14px;font-weight:700;color:#f0f0e8;letter-spacing:2px">--:--:--</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;color:#546e7a">-- / -- / ----</div>' +
      '</div>' +
    '</div>';
  }


  /* ══════════════ FORMAS VECTORIALES ══════════════ */
  if (el.tipo === 'shape-rect') {
    var fill   = p.fill || '#1565c0';
    var fo     = p.fillOpacity !== undefined ? p.fillOpacity : 0.15;
    var stroke = p.stroke || '#1565c0';
    var sw     = p.strokeWidth !== undefined ? p.strokeWidth : 2;
    var rx     = p.radius !== undefined ? p.radius : 0;
    return '<svg class="hshape" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">' +
      '<rect x="' + (sw/2) + '" y="' + (sw/2) + '" width="calc(100% - ' + sw + 'px)" height="calc(100% - ' + sw + 'px)" rx="' + rx + '" ry="' + rx + '"' +
      ' fill="' + fill + '" fill-opacity="' + fo + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
    '</svg>';
  }
  if (el.tipo === 'shape-circle') {
    var fill   = p.fill || '#2e7d32';
    var fo     = p.fillOpacity !== undefined ? p.fillOpacity : 0.15;
    var stroke = p.stroke || '#2e7d32';
    var sw     = p.strokeWidth !== undefined ? p.strokeWidth : 2;
    return '<svg class="hshape" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">' +
      '<ellipse cx="50" cy="50" rx="' + (50 - sw/2) + '" ry="' + (50 - sw/2) + '"' +
      ' fill="' + fill + '" fill-opacity="' + fo + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
    '</svg>';
  }
  if (el.tipo === 'shape-line') {
    var stroke = p.stroke || '#1a1a18';
    var sw     = p.strokeWidth !== undefined ? p.strokeWidth : 2;
    var angle  = p.angle !== undefined ? p.angle : 0;
    var cap    = p.cap || 'round';
    // angle 0 = horizontal, 45 = diagonal, etc.
    var rad = angle * Math.PI / 180;
    var cx = 50, cy = 50;
    var len = 46;
    var x1 = Math.round(cx - Math.cos(rad) * len);
    var y1 = Math.round(cy - Math.sin(rad) * len);
    var x2 = Math.round(cx + Math.cos(rad) * len);
    var y2 = Math.round(cy + Math.sin(rad) * len);
    return '<svg class="hshape" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">' +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' +
      ' stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="' + cap + '"/>' +
    '</svg>';
  }
  if (el.tipo === 'shape-curve') {
    var stroke    = p.stroke || '#c62828';
    var sw        = p.strokeWidth !== undefined ? p.strokeWidth : 2;
    var curvature = p.curvature !== undefined ? p.curvature : 50;
    var cap       = p.cap || 'round';
    // Curvatura: 0 = recta, positivo = curva hacia arriba, negativo = hacia abajo
    var cy = 50 - curvature;
    return '<svg class="hshape" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">' +
      '<path d="M4,50 Q50,' + cy + ' 96,50"' +
      ' fill="none" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="' + cap + '"/>' +
    '</svg>';
  }
  if (el.tipo === 'shape-triangle') {
    var fill   = p.fill || '#f57c00';
    var fo     = p.fillOpacity !== undefined ? p.fillOpacity : 0.15;
    var stroke = p.stroke || '#f57c00';
    var sw     = p.strokeWidth !== undefined ? p.strokeWidth : 2;
    var dir    = p.direction || 'up';
    var pts;
    if (dir === 'up')    pts = '50,4 96,96 4,96';
    if (dir === 'down')  pts = '4,4 96,4 50,96';
    if (dir === 'left')  pts = '96,4 96,96 4,50';
    if (dir === 'right') pts = '4,4 96,50 4,96';
    return '<svg class="hshape" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">' +
      '<polygon points="' + pts + '"' +
      ' fill="' + fill + '" fill-opacity="' + fo + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
    '</svg>';
  }

  /* ── indicator-text preview ── */
  if (el.tipo === 'indicator-text') {
    var textOn  = p.textOn  || 'ACTIVO';
    var textOff = p.textOff || 'PARADO';
    var colOn   = p.colorOn  || '#00c853';
    var colOff  = p.colorOff || '#9a9a90';
    var fs = (p.fontSize || 11) + 'px';
    return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;' +
      'font-family:DM Mono,monospace;font-size:' + fs + ';font-weight:700;letter-spacing:1px;' +
      'border-radius:3px;border:1px solid ' + colOn + ';background:rgba(0,200,83,.08);color:' + colOn + ';">' +
      escHtml(textOn) + '</div>';
  }

  /* ── numeric-display preview ── */
  if (el.tipo === 'numeric-display') {
    var fs = (p.fontSize || 24) + 'px';
    var col = p.color || '#00e5b0';
    var bg  = p.bg    || '#1a1a16';
    return '<div style="width:100%;height:100%;background:' + bg + ';border-radius:3px;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:4px;box-sizing:border-box;">' +
      (p.label ? '<div style="font-family:DM Mono,monospace;font-size:9px;color:rgba(255,255,255,.4);letter-spacing:1px">' + escHtml(p.label) + '</div>' : '') +
      '<div style="font-family:DM Mono,monospace;font-size:' + fs + ';color:' + col + ';font-weight:700;line-height:1">—</div>' +
      (p.unit ? '<div style="font-family:DM Mono,monospace;font-size:9px;color:rgba(0,229,176,.5)">' + escHtml(p.unit) + '</div>' : '') +
      '</div>';
  }

  /* ── signal-tower preview ── */
  if (el.tipo === 'signal-tower') {
    return '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:3px;background:#1a1a14;border-radius:3px;padding:4px;box-sizing:border-box;">' +
      '<div style="width:14px;height:14px;border-radius:50%;background:#ef5350;box-shadow:0 0 5px #ef535088"></div>' +
      '<div style="width:14px;height:14px;border-radius:50%;background:#ffca28;box-shadow:0 0 5px #ffca2888"></div>' +
      '<div style="width:14px;height:14px;border-radius:50%;background:#66bb6a;box-shadow:0 0 5px #66bb6a88"></div>' +
      '</div>';
  }

  /* ── separator preview ── */
  if (el.tipo === 'separator') {
    var isV = el.h > el.w;
    var lbl = p.label || '';
    if (isV) {
      return '<div style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;">' +
        '<div style="width:1px;height:100%;background:var(--border,#3a3a30);opacity:.6"></div>' +
        '</div>';
    }
    return '<div style="width:100%;height:100%;display:flex;align-items:center;gap:8px;">' +
      (lbl ? '<span style="font-family:DM Mono,monospace;font-size:8px;color:#6a6a5a;letter-spacing:2px;white-space:nowrap;flex-shrink:0">' + escHtml(lbl) + '</span>' : '') +
      '<div style="flex:1;height:1px;background:#3a3a30;opacity:.6"></div>' +
      '</div>';
  }

  /* ── image-upload preview ── */
  if (el.tipo === 'image-upload') {
    if (p.src) {
      return '<img src="' + p.src + '" style="width:100%;height:100%;object-fit:' + (p.fit || 'contain') + ';display:block;">';
    }
    return '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'border:1px dashed #6a6a5a;border-radius:3px;background:#1e1e1a;gap:6px;">' +
      '<span style="font-size:20px;opacity:.4">🖼</span>' +
      '<span style="font-family:DM Mono,monospace;font-size:8px;color:#6a6a5a">IMAGEN</span>' +
      '</div>';
  }


  return '';
}

function rerenderizar(id) {
  var el = ELEMENTOS.find(function(e) { return e.id === id; });
  if (!el) return;
  renderizarElemento(el);
  var d = document.getElementById(id);
  if (!d) return;
  if (SELECCION.length === 1 && SELECCION.includes(id)) d.classList.add('sel');
  if (SELECCION.length > 1  && SELECCION.includes(id)) d.classList.add('msel');
}

function rerenderizarTodos() {
  ELEMENTOS.forEach(function(el) { renderizarElemento(el); });
}

