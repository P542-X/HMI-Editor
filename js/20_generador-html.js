/* =================================================================
   EXPORTAR HTML — GENERADOR CORREGIDO v5
   FIXES v5:
   ① Watchdog silencioso cada 20s (sin efectos secundarios en UI)
   ② Sin conflicto entre pulsos y renovación de token
   ③ Reconexión rápida (800ms) solo cuando hay fallo real (2 consecutivos)
   ④ rpc() no dispara _loopReconexion en errores de operación
   ⑤ startPolling con flag anti-duplicado
================================================================= */

function claveJs(v) {
  return (v || '').replace(/[^a-zA-Z0-9]/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'v';
}

function valorJs(s) {
  if (s === 'true')  return true;
  if (s === 'false') return false;
  var n = Number(s);
  if (!isNaN(n) && s !== '') return n;
  return s;
}

/* ══════════════════════════════════════════════════════════════
   NÚCLEO PLC v5 — CONEXIÓN PERMANENTE SIN CAÍDAS
   
   ARQUITECTURA:
   • plcLogin()          → login inicial (reintenta cada 1s hasta lograrlo)
   • startPolling()      → arranca loops de lectura (solo tras login OK)
   • Watchdog 20s        → renueva token silenciosamente sin tocar plcOnline
                           ni UI, SOLO actualiza plcToken
   • _loopReconexion()   → solo se activa si el watchdog falla 2 veces
                           consecutivas → reintenta cada 800ms
   • rpc()               → NO dispara reconexión en errores de operación
                           (evita conflictos con pulsos simultáneos)
══════════════════════════════════════════════════════════════ */
function generarNucleoPLC(ip, user, pass, anon, listaVarsStr, varsToggle, jsEls, proyecto) {
  return [
    '/* ════════════════════════════════════════',
    '   ' + proyecto + ' — HMI Editor v5 · paulocarrasco.dev',
    '   Conexion estable · Watchdog 20s silencioso',
    '════════════════════════════════════════ */',
    '',
    '/* S7-1500: el API JSON-RPC solo funciona sobre HTTPS */',
    'var PLC_URL  = "https://' + ip + '/api/jsonrpc";',
    'var PLC_USER = "' + user + '";',
    'var PLC_PASS = "' + pass + '";',
    '',
    '/* Mapa de variables */',
    'var vars = {',
    listaVarsStr,
    '};',
    '',
    varsToggle,
    '',
    '/* ════════════════════════════════════════',
    '   CONEXIÓN INDUSTRIAL v2 — Sin recarga nunca',
    '   · Watchdog cada 5 s — renueva token sin tocar UI si sigue online',
    '   · Mutex de login — evita logins paralelos que se invalidan entre sí',
    '   · SIN Logout propio al reconectar — no mata sesiones de otros clientes',
    '   · Jitter aleatorio en arranque — evita tormenta de logins simultáneos',
    '   · Reconexión backoff exponencial con cap a 4 s',
    '   · Cola serializada de requests — max 1 fetch activo al S7',
    '   · Batch de lecturas — deduplica polls del mismo tick',
    '   · Watchdog pasivo — no compite con el polling activo',
    '════════════════════════════════════════ */',
    '',
    '/* ── Estado interno — privado por pestaña/cliente ── */',
    'var plcToken       = null;',
    'var plcOnline      = false;',
    'var _reconActivo   = false;',
    'var _lastReconTs   = 0;',
    'var _loginPending  = false;',
    'var _loginQueue    = [];',
    'var _writeQueue    = [];',
    'var _pollIntervals = [];',
    'var _rpcQueue      = [];',
    'var _rpcBusy       = false;',
    'var _lastRpcOk     = Date.now();',
    'var _batchPending  = {};',
    'var _batchTimer    = null;',
    '',
    '/* ── UI ── */',
    'var _toastTimer = null;',
    'function toast(msg) {',
    '  var el = document.getElementById("plc-log");',
    '  if (!el) return;',
    '  el.textContent = msg;',
    '  el.classList.add("show");',
    '  if (_toastTimer) clearTimeout(_toastTimer);',
    '  _toastTimer = setTimeout(function(){ el.classList.remove("show"); }, 2500);',
    '}',
    '',
    'function setPlcStatus(estado, txt) {',
    '  var dot = document.getElementById("plc-dot");',
    '  var lbl = document.getElementById("plc-txt");',
    '  if (dot) dot.className = estado;',
    '  if (lbl) lbl.textContent = txt;',
    '}',
    '',
    '/* ── Cola serializada ── */',
    'function _rpcFlush() {',
    '  if (_rpcBusy || !_rpcQueue.length) return;',
    '  var item = _rpcQueue.shift();',
    '  _rpcBusy = true;',
    '  var headers = {"Content-Type":"application/json"};',
    '  if (plcToken) headers["X-Auth-Token"] = plcToken;',
    '  var ctrl = new AbortController();',
    '  var tid  = setTimeout(function(){ ctrl.abort(); }, 4000);',
    '  fetch(PLC_URL, { method:"POST", headers:headers,',
    '    signal:ctrl.signal, body:JSON.stringify(item.body) })',
    '  .then(function(r){ clearTimeout(tid); return r.text(); })',
    '  .then(function(txt){',
    '    _rpcBusy = false; _lastRpcOk = Date.now();',
    '    if (!txt||!txt.trim()){ item.cb(null,{result:true}); _rpcFlush(); return; }',
    '    try {',
    '      var d = JSON.parse(txt);',
    '      if (!PLC_ANON && !item.noRetry && d.error &&',
    '         (d.error.code===-32099||d.error.code===-32601||d.error.message==="No Permission")){',
    '        plcToken = null;',
    '        /* jitter 0-2s: evita login-storm con múltiples clientes */',
    '        setTimeout(function(){',
    '          _doLogin(function(ok){',
    '            if (ok) { item.noRetry=true; _rpcQueue.unshift(item); }',
    '            else    { item.cb(new Error("auth"),null); }',
    '            _rpcFlush();',
    '          });',
    '        }, Math.floor(Math.random()*2000));',
    '      }',
    '      if (d.error) {',
    '        console.error("[HMI] PLC error:", JSON.stringify(item.body.params||{}),',
    '          "→", d.error.message || d.error.code || JSON.stringify(d.error));',
    '      }',
    '      item.cb(null, d);',
    '    } catch(e){ item.cb(e,null); }',
    '    _rpcFlush();',
    '  })',
    '  .catch(function(e){ clearTimeout(tid); _rpcBusy=false; item.cb(e,null); _rpcFlush(); });',
    '}',
    'function rpc(body, cb, _noRetry, _priority) {',
    '  var item = { body:body, cb:cb, noRetry:!!_noRetry };',
    '  if (_priority) _rpcQueue.unshift(item); else _rpcQueue.push(item);',
    '  _rpcFlush();',
    '}',
    '',
    '/* ── _doLogin: login puro SIN logout previo + mutex anti-paralelo ──',
    '   RAZÓN: Api.Logout en el S7 invalida la cookie de TODOS los clientes',
    '   con la misma sesión. Dos clientes reconectando a la vez se matan',
    '   mutuamente si cada uno hace Logout antes de Login.',
    '   El mutex serializa los logins: el segundo espera al primero y reutiliza',
    '   su token en vez de abrir una segunda sesión innecesaria. */',
    /* _doLogin y plcLogin: se generan segun modo anonimo o con credenciales */
    (anon ? [
    '/* Modo ANÓNIMO SIN TOKEN: no hace Api.Login.',
    '   El S7-1500 acepta PlcProgram.Read/Write sin token cuando',
    '   el usuario Anonymous tiene permisos en TIA Portal.',
    '   Ventaja: múltiples clientes coexisten sin invalidarse mutuamente.*/',
    'function _doLogin(cb) {',
    '  if (_loginPending) { _loginQueue.push(cb); return; }',
    '  _loginPending = true;',
    '  /* Verificar conectividad con PlcProgram.Browse (no requiere token) */',
    '  var ctrl = new AbortController();',
    '  var tid  = setTimeout(function(){ ctrl.abort(); }, 5000);',
    '  fetch(PLC_URL, {',
    '    method:"POST",',
    '    headers:{"Content-Type":"application/json"},',
    '    signal:ctrl.signal,',
    '    body:JSON.stringify({jsonrpc:"2.0",method:"Api.GetQuantityStructures",id:1,params:{}})',
    '  })',
    '  .then(function(r){ clearTimeout(tid); return r.text(); })',
    '  .then(function(txt){',
    '    var ok = false;',
    '    try {',
    '      JSON.parse(txt); /* si parsea = PLC responde */',
    '      plcOnline = true;',
    '      plcToken  = null; /* sin token — anónimo puro */',
    '      setPlcStatus("ok", "An\u00f3nimo \u00b7 " + window.location.hostname);',
    '      ok = true;',
    '    } catch(e) { plcOnline = false; setPlcStatus("error","SIN CONEXION"); }',
    '    _loginPending = false;',
    '    var q = _loginQueue.splice(0);',
    '    if (cb) cb(ok);',
    '    q.forEach(function(fn){ fn(ok); });',
    '  })',
    '  .catch(function(err){',
    '    clearTimeout(tid);',
    '    plcOnline = false;',
    '    var msg = "SIN CONEXION";',
    '    if (err && err.name === "AbortError") msg = "TIMEOUT";',
    '    else if (err && err.message && err.message.indexOf("fetch") !== -1) msg = "CERT - Acepta HTTPS";',
    '    console.error("[HMI] Conexion error:", err && err.message || err);',
    '    setPlcStatus("error", msg);',
    '    _loginPending = false;',
    '    var q = _loginQueue.splice(0);',
    '    if (cb) cb(false);',
    '    q.forEach(function(fn){ fn(false); });',
    '  });',
    '}',
    '',
    'function plcLogin(cb) {',
    '  var jitter = Math.floor(Math.random() * 50);',
    '  setTimeout(function(){',
    '    _doLogin(function(ok){',
    '      if (ok) { if(cb) cb(); }',
    '      else    { setTimeout(function(){ plcLogin(cb); }, 1000 + Math.random()*500); }',
    '    });',
    '  }, jitter);',
    '}'].join('\n') : [
    '/* Modo CON CREDENCIALES: login estandar, requiere token */',
    'function _doLogin(cb) {',
    '  if (_loginPending) {',
    '    _loginQueue.push(cb);',
    '    return;',
    '  }',
    '  _loginPending = true;',
    '  var ctrl = new AbortController();',
    '  var tid  = setTimeout(function(){ ctrl.abort(); }, 5000);',
    '  fetch(PLC_URL, {',
    '    method:"POST",',
    '    headers:{"Content-Type":"application/json"},',
    '    signal:ctrl.signal,',
    '    body:JSON.stringify({jsonrpc:"2.0",method:"Api.Login",id:1,',
    '      params:{user:PLC_USER,password:PLC_PASS}})',
    '  })',
    '  .then(function(r){ clearTimeout(tid); return r.text(); })',
    '  .then(function(txt){',
    '    var ok = false;',
    '    try {',
    '      var d = JSON.parse(txt);',
    '      if (d.result && d.result.token) {',
    '        plcToken  = d.result.token;',
    '        plcOnline = true;',
    '        setPlcStatus("ok", PLC_USER + " \u00b7 " + window.location.hostname);',
    '        ok = true;',
    '      } else {',
    '        plcOnline = false;',
    '        setPlcStatus("retry","REINTENTANDO...");',
    '      }',
    '    } catch(e){ plcOnline=false; setPlcStatus("error","SIN CONEXION"); }',
    '    _loginPending = false;',
    '    var q = _loginQueue.splice(0);',
    '    if (cb) cb(ok);',
    '    q.forEach(function(fn){ fn(ok); });',
    '  })',
    '  .catch(function(){',
    '    clearTimeout(tid);',
    '    plcOnline = false;',
    '    setPlcStatus("error","SIN CONEXION");',
    '    _loginPending = false;',
    '    var q = _loginQueue.splice(0);',
    '    if (cb) cb(false);',
    '    q.forEach(function(fn){ fn(false); });',
    '  });',
    '}',
    '',
    '/* Login inicial con jitter aleatorio */',
    'function plcLogin(cb) {',
    '  var jitter = Math.floor(Math.random() * 50);  /* conexion rapida */',
    '  setTimeout(function(){',
    '    _doLogin(function(ok){',
    '      if (ok) { if(cb) cb(); }',
    '      else    { setTimeout(function(){ plcLogin(cb); }, 1000 + Math.random()*500); }',
    '    });',
    '  }, jitter);',
    '}'
    ].join('\n')),
    '',
    '/* Detener polling limpiamente */',
    'function _stopPolling() {',
    '  _pollIntervals.forEach(function(id){ clearInterval(id); });',
    '  _pollIntervals = [];',
    '  _pollActivo = false;',
    '}',
    '',
    '/* Reconexion backoff exponencial */',
    'function _loopReconexion() {',
    '  if (_reconActivo) return;',
    '  var _ahora = Date.now();',
    '  if (_ahora - _lastReconTs < 3000) {',
    '    setTimeout(_loopReconexion, 3000 - (_ahora - _lastReconTs));',
    '    return;',
    '  }',
    '  _lastReconTs = _ahora;',
    '  _reconActivo = true;',
    '  plcOnline    = false;',
    '  plcToken     = null;',
    '  _stopPolling();',
    '  setPlcStatus("retry","RECONECTANDO...");',
    '  /* jitter 0-3s para evitar login-storms con múltiples clientes */',
    '  var _reconJitter = Math.floor(Math.random() * 3000);',
    '  var _intentos = 0;',
    '  setTimeout(function(){',
    '  (function intentar() {',
    '    _doLogin(function(ok) {',
    '      if (ok) {',
    '        _reconActivo = false;',
    '        var q = _writeQueue.splice(0);',
    '        q.forEach(function(item){ plcEscribir(item.v, item.val); });',
    '        if (typeof startPolling === "function") startPolling();',
    '      } else {',
    '        var delay = Math.min(300 * Math.pow(2, Math.min(_intentos-1, 4)), 4000);',
    '        delay = delay * (0.8 + Math.random() * 0.4);',
    '        setTimeout(intentar, delay);',
    '      }',
    '    });',
    '  })();',
    '  }, _reconJitter);',
    '}',
    '/* API publica */',
    'function plcEscribir(variable, valor, cb) {',
    '  if (!plcOnline) {',
    '    _writeQueue.push({v:variable, val:valor});',
    '    return;',
    '  }',
    '  rpc({jsonrpc:"2.0",method:"PlcProgram.Write",id:1,params:{var:variable,value:valor}},',
    '    function(err,d){',
    '      var ok = !err && d && !d.error;',
    '      if (!ok) {',
    '        var errMsg = err ? err.message : ((d&&d.error)?(d.error.message||d.error.code||JSON.stringify(d.error)):"write error");',
    '        console.error("[HMI] plcEscribir error:", variable, "=", valor, "→", errMsg);',
    '        _writeQueue.push({v:variable,val:valor});',
    '      }',
    '      if(cb) cb(ok ? null : (err||new Error((d&&d.error)?d.error.message:"write error")));',
    '    });',
    '}',
    '',
    '/* Throttle de botones */',
    'var _btnCooldown = false;',
    'function btnAccion(fn) {',
    '  if (_btnCooldown) { toast("\u23f3 Espera un momento..."); return; }',
    '  _btnCooldown = true;',
    '  setTimeout(function(){ _btnCooldown = false; }, 1000);',
    '  fn();',
    '}',
    '',
    'function plcLeer(variable, cb) {',
    '  rpc({jsonrpc:"2.0",method:"PlcProgram.Read",id:1,params:{var:variable,mode:"simple"}},',
    '    function(err,d){',
    '      if (err) { console.error("[HMI] plcLeer red:", variable, err.message); return; }',
    '      if (d && d.error) {',
    '        console.error("[HMI] PLC rechazó:", variable, "→", d.error.message||d.error.code||JSON.stringify(d.error));',
    '        if (cb) cb(null); return;',
    '      }',
    '      if (d && d.result !== undefined && cb) cb(d.result);',
    '    });',
    '}',
    '',
    '/* ════════════════════════════════════════',
    '   WATCHDOG — cada 7-13 s con jitter individual',
    '════════════════════════════════════════ */',
    'var _wdInterval = 7000 + Math.floor(Math.random() * 6000);',
    'var _wdFails    = 0;',
    'var PLC_ANON    = ' + (anon ? 'true' : 'false') + ';',
    'setInterval(function(){',
    '  if (_reconActivo || _loginPending) return;',
    '  if (!PLC_ANON && !plcToken) { _loopReconexion(); return; }',
    '  var ctrl = new AbortController();',
    '  var tid  = setTimeout(function(){ ctrl.abort(); }, 3000);',
    '  var hdrs = {"Content-Type":"application/json"};',
    '  if (plcToken) hdrs["X-Auth-Token"] = plcToken;',
    '  fetch(PLC_URL, {',
    '    method:"POST",',
    '    headers:hdrs,',
    '    signal:ctrl.signal,',
    '    body:JSON.stringify({jsonrpc:"2.0",method:"Api.GetPermissions",id:99,params:{}})',
    '  })',
    '  .then(function(r){ clearTimeout(tid); return r.text(); })',
    '  .then(function(txt){',
    '    try {',
    '      var d = JSON.parse(txt);',
    '      if (!d.error) {',
    '        _wdFails = 0;',
    '        if (!plcOnline) {',
    '          plcOnline = true;',
    '          setPlcStatus("ok", (PLC_ANON ? "An\u00f3nimo" : PLC_USER) + " \u00b7 " + window.location.hostname);',
    '          if (typeof startPolling === "function") startPolling();',
    '        }',
    '      } else {',
    '        _wdFails++;',
    '        if (_wdFails >= 3) { _wdFails=0; if(!PLC_ANON) plcToken=null; _loopReconexion(); }',
    '      }',
    '    } catch(e){ _wdFails++; if(_wdFails>=2){ _wdFails=0; _loopReconexion(); } }',
    '  })',
    '  .catch(function(){',
    '    clearTimeout(tid);',
    '    _wdFails++;',
    '    if (_wdFails >= 2) { _wdFails=0; _loopReconexion(); }',
    '  });',
    '}, _wdInterval);',
    '',
    '/* ════════════════════════════════════════',
    '   LÓGICA DE COMPONENTES',
    '════════════════════════════════════════ */',
    '',
    jsEls,
    '',
    '/* ── ARRANQUE ── */',
    /* En modo multi-PLC, 28_multi-plc.js emite los conectores ANTES de este
       bloque y los conectores se autoinician con .login(). Solo en modo
       single-PLC (PLCS.length <= 1) usamos el plcLogin clásico. */
    (typeof PLCS !== 'undefined' && PLCS.filter(function(p){return p.ip;}).length > 1
      ? '/* Multi-PLC: los conectores plcConn0..N arrancan solos */'
      : 'plcLogin(function(){\n  if (typeof startPolling === "function") startPolling();\n});')
  ].join('\n');
}

/* ── Genera JS del botón simple/led ── */
function generarJsBoton(id, vk, p, toastLabel) {
  var ms  = p.pulseMs || 800;
  var act = p.action  || 'pulse';
  var js  = '';
  if (act === 'toggle') {
    js += 'var togB_' + id + ' = false;\n';
    js += 'function act_' + id + '() {\n';
    js += '  btnAccion(function(){\n';
    js += '    togB_' + id + ' = !togB_' + id + ';\n';
    js += '    plcEscribir(vars.' + vk + ', togB_' + id + ');\n';
    js += '    toast("' + toastLabel + ' → " + (togB_' + id + ' ? "ON" : "OFF"));\n';
    js += '  });\n';
    js += '}\n\n';
  } else {
    js += 'function act_' + id + '() {\n';
    js += '  btnAccion(function(){\n';
    if (act === 'pulse') {
      js += '    plcEscribir(vars.' + vk + ', true);\n';
      js += '    setTimeout(function(){ plcEscribir(vars.' + vk + ', false); }, ' + ms + ');\n';
      js += '    toast("' + toastLabel + ' → pulso enviado");\n';
    } else if (act === 'write-true') {
      js += '    plcEscribir(vars.' + vk + ', true);\n';
      js += '    toast("' + toastLabel + ' → TRUE");\n';
    } else if (act === 'write-false') {
      js += '    plcEscribir(vars.' + vk + ', false);\n';
      js += '    toast("' + toastLabel + ' → FALSE");\n';
    }
    js += '  });\n';
    js += '}\n\n';
  }
  return js;
}

function generarHTML() {
  var ip       = PLC.ip      || 'TU_IP_PLC';
  var anon     = PLC.anon    || false;
  /* En modo anónimo las credenciales siempre van vacías */
  var user     = anon ? 'Anonymous' : (PLC.user || 'Admin');
  var pass     = anon ? '' : (PLC.pass || '');
  var proyecto = PLC.project || 'Mi HMI';
  var resObj   = RESOLUCIONES[RESOLUCION] || RESOLUCIONES['800x480'];
  var RW       = resObj.w;
  var RH       = resObj.h;

  var mapaVars   = {};
  var htmlEls    = '';
  var htmlPopups  = '';  /* overlays de popup - se insertan fuera del canvas */
  var jsEls      = '';
  var jsPolling  = '';
  var varsToggle = '';
  var tooltipMapEntries = [];

  function registrarVar(v) {
    if (v && v.trim()) mapaVars[claveJs(v)] = v;
  }

  ELEMENTOS.forEach(function(el) {
    var p  = el.props;
    var zIdx = ELEMENTOS.indexOf(el);
    /* ── índice de PLC para este elemento (multi-PLC) ── */
    var _pi = (typeof PLCS !== 'undefined' && PLCS.length > 1)
      ? (',' + (p.plcIdx || 0))
      : '';   /* cadena vacía = modo single-PLC, sin cambio de API */
    var st = 'position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;width:' + el.w + 'px;height:' + el.h + 'px;z-index:' + (zIdx + 1) + ';';
    var _rot = (p.rotation) ? Number(p.rotation) : 0;
    if (_rot) st += 'transform:rotate(' + _rot + 'deg);transform-origin:center center;';
    var fs = (p.fontSize || 12) + 'px';
    var ico = escHtml(p.icon || '\u25b6');
    var lbl = (p.text || el.id).replace(/"/g,"'");

    var subExport = p.subtext
      ? '<div style="font-size:9px;font-weight:400;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9a9a90">' + escHtml(p.subtext) + '</div>'
      : '';

    /* ── Visibilidad condicional para elementos decorativos ── */
    var _tiposDeco = [
      'deco-worker','deco-person-walk','deco-forklift','deco-truck','deco-excavator',
      'deco-crane','deco-elevator','deco-conveyor','deco-rack','deco-pallet',
      'deco-barrel','deco-brickwall','deco-cone','deco-sign-hard','deco-helmet',
      'deco-fire-ext','deco-safety-exit','deco-first-aid','deco-electric-hazard',
      'deco-road-barrier','deco-scaffold','deco-wheelbarrow','deco-cement-mixer',
      'deco-bulldozer','deco-dump-truck','deco-ladder','deco-toolbox',
      'deco-wire-spool','deco-welding','deco-compressor',
      'auto-car-side','auto-car-top','auto-wheel','auto-engine','auto-abs-module',
      'auto-brake-disc','auto-caliper','auto-suspension','auto-gearbox','auto-battery-ev',
      'auto-robot-arm','auto-spot-weld','auto-paint-gun','auto-car-body',
      'auto-press-machine','auto-vin-scanner','auto-tyre','auto-exhaust',
      'auto-dashboard','auto-agv',
      'fab-robot-industrial','fab-cnc-machine','fab-lathe','fab-drill-press',
      'fab-hydraulic-press','fab-welding-station','fab-paint-booth','fab-oven-industrial',
      'fab-cooling-tower','fab-boiler','fab-compressor-ind','fab-generator',
      'fab-transformer','fab-switchboard','fab-plc-cabinet','fab-hmi-panel',
      'fab-safety-fence','fab-agv-station','fab-quality-station','fab-packaging',
      'fab-palletizer','fab-scara-robot','fab-delta-robot','fab-cobot',
      'fab-vision-system','fab-laser-cutter','fab-3d-printer','fab-injection-mold',
      'fab-extruder','fab-winding-machine'
    ];
    var _visMode = (p.visMode || 'always');
    /* Visibilidad disponible para TODOS los elementos */
    var _hasVis  = _visMode !== 'always' && p.visVar && p.visVar.trim();
    if (_hasVis) {
      registrarVar(p.visVar);
      var _visVk     = claveJs(p.visVar);
      var _visTrig   = String(p.visTrigger !== undefined && p.visTrigger !== '' ? p.visTrigger : 'true');
      var _visPollMs = p.visPollMs || 1000;
      var _visShow   = _visMode === 'on' ? 'true' : 'false';
      jsEls += 'function updVis_' + el.id + '(){\n' +
        '  plcLeer(vars.' + _visVk + ', function(v){\n' +
        '    var el=document.getElementById("' + el.id + '"); if(!el) return;\n' +
        '    var sv=String(v).toLowerCase();\n' +
        '    var trig=' + JSON.stringify(_visTrig.toLowerCase()) + ';\n' +
        '    var activo=(sv===trig||(trig==="true"&&sv==="1")||(trig==="false"&&sv==="0"));\n' +
        '    el.style.display=(activo===' + _visShow + ') ? "" : "none";\n' +
        '  });\n' +
        '}\n\n';
      jsPolling += '  updVis_' + el.id + '(); setInterval(updVis_' + el.id + ', ' + _visPollMs + ');\n';
    }

    /* ── animVar: variable PLC que activa/desactiva la clase plc-activo ── */
    var _TIPOS_ANIM = [
      'auto-wheel','auto-tyre','auto-robot-arm','auto-spot-weld','auto-paint-gun',
      'auto-press-machine','auto-vin-scanner','auto-agv','auto-exhaust','auto-brake-disc',
      'auto-engine','auto-gearbox','auto-suspension','auto-abs-module',
      'motor-symbol','pump-symbol','valve-symbol',
      'fab-robot-industrial','fab-cnc-machine','fab-lathe','fab-drill-press',
      'fab-hydraulic-press','fab-welding-station','fab-paint-booth','fab-oven-industrial',
      'fab-cooling-tower','fab-boiler','fab-compressor-ind','fab-generator',
      'fab-switchboard','fab-plc-cabinet','fab-hmi-panel','fab-agv-station','fab-laser-cutter',
      'fab-3d-printer','fab-extruder','fab-winding-machine','fab-palletizer',
      'fab-scara-robot','fab-delta-robot','fab-cobot','fab-vision-system',
      'fab-injection-mold','fab-packaging','fab-quality-station',
      'deco-conveyor','deco-worker','deco-person-walk','deco-forklift','deco-truck',
      'deco-dump-truck','deco-crane','deco-elevator','deco-excavator','deco-bulldozer',
      'deco-wheelbarrow','deco-cement-mixer','deco-compressor','deco-welding',
      'deco-electric-hazard','deco-road-barrier','deco-cone','deco-fire-ext',
      'deco-safety-exit','deco-first-aid','deco-sign-hard','deco-helmet','deco-wire-spool',
      'status-led','btn-led','level-tank','progress-bar','alarm-banner','pid-faceplate'
    ];
    /* Inyectar data-tipo y data-cat-anim en runtime para que el CSS plc-activo[data-tipo] funcione */
    var _TIPOS_CON_LUZ = [
      'deco-worker','deco-person-walk','deco-forklift','deco-truck','deco-dump-truck',
      'deco-crane','deco-elevator','deco-excavator','deco-bulldozer','deco-wheelbarrow',
      'deco-cement-mixer','deco-compressor','deco-welding','deco-electric-hazard',
      'deco-road-barrier','deco-cone','deco-fire-ext','deco-safety-exit','deco-first-aid',
      'deco-sign-hard','deco-helmet','deco-wire-spool'
    ];
    /* Atributos data-* necesarios para que los selectores CSS de animación funcionen.
       Ahora se inyectan via post-proceso sobre htmlEls, no aquí. */

    var _hasAnim = _TIPOS_ANIM.indexOf(el.tipo) !== -1 && p.animVar && p.animVar.trim();
    if (_hasAnim) {
      registrarVar(p.animVar);
      var _animVk     = claveJs(p.animVar);
      var _animTrig   = String(p.animTrigger !== undefined && p.animTrigger !== '' ? p.animTrigger : 'true');
      var _animPollMs = p.animPollMs || 1000;
      jsEls += 'function updAnim_' + el.id + '(){\n' +
        '  plcLeer(vars.' + _animVk + ', function(v){\n' +
        '    var elDiv=document.getElementById("' + el.id + '"); if(!elDiv) return;\n' +
        '    var sv=String(v).toLowerCase();\n' +
        '    var trig=' + JSON.stringify(_animTrig.toLowerCase()) + ';\n' +
        '    var activo=(sv===trig||(trig==="true"&&sv==="1")||(trig==="false"&&sv==="0"));\n' +
        '    if(activo){ elDiv.classList.add("plc-activo"); }\n' +
        '    else      { elDiv.classList.remove("plc-activo"); }\n' +
        '    /* status-led */\n' +
        '    if(' + JSON.stringify(el.tipo) + '==="status-led"){\n' +
        '      var led=elDiv.querySelector(".hstatus"); if(led) led.classList.toggle("off",!activo);\n' +
        '    }\n' +
        '    /* alarm-banner */\n' +
        '    if(' + JSON.stringify(el.tipo) + '==="alarm-banner"){\n' +
        '      var banner=elDiv.querySelector(".halarm-banner"); if(banner) banner.style.opacity=activo?"1":"0.3";\n' +
        '    }\n' +
        '    /* progress-bar */\n' +
        '    if(' + JSON.stringify(el.tipo) + '==="progress-bar"){\n' +
        '      var fill=elDiv.querySelector(".hprogress-fill"); if(fill) fill.style.width=activo?"70%":"0%";\n' +
        '      var val=elDiv.querySelector(".hprogress-val");   if(val)  val.textContent=activo?"70":"—";\n' +
        '    }\n' +
        '    /* valve-symbol */\n' +
        '    if(' + JSON.stringify(el.tipo) + '==="valve-symbol"){\n' +
        '      var vbody=elDiv.querySelector(".hvalve-body svg"); if(vbody) vbody.style.opacity=activo?"1":"0.4";\n' +
        '    }\n' +
        '    /* motor-symbol dot */\n' +
        '    if(' + JSON.stringify(el.tipo) + '==="motor-symbol"){\n' +
        '      var mdot=elDiv.querySelector(".hmotor-dot");\n' +
        '      if(mdot){ mdot.style.background=activo?"#00e676":""; mdot.style.boxShadow=activo?"0 0 8px #00c853":""; }\n' +
        '    }\n' +
        '  });\n' +
        '}\n\n';
      jsPolling += '  updAnim_' + el.id + '(); setInterval(updAnim_' + el.id + ', ' + _animPollMs + ');\n';
    }

    /* ── Recoger variables PLC de este elemento para el tooltip ── */
    (function() {
      var tipRows = [];
      var seen = {};
      function tipAdd(label, key) {
        var v = p[key];
        if (v && String(v).trim() && !seen[key]) {
          seen[key] = true;
          tipRows.push(label + ': ' + String(v).trim());
        }
      }
      tipAdd('Variable',   'var1');
      tipAdd('LED',        'varLed');
      tipAdd('RUN',        'varRun');
      tipAdd('FAULT',      'varFault');
      tipAdd('OPEN',       'varOpen');
      tipAdd('CLOSED',     'varClosed');
      tipAdd('ARRIBA',     'varUp');
      tipAdd('ABAJO',      'varDown');
      tipAdd('IZQ',        'varLeft');
      tipAdd('DER',        'varRight');
      tipAdd('SET',        'varSet');
      tipAdd('RESET',      'varReset');
      tipAdd('ALARMA',     'varAlarm');
      tipAdd('ACK',        'varAck');
      tipAdd('ARRAY',      'arrayVar');
      tipAdd('PV',         'varPV');
      tipAdd('SP',         'varSP');
      tipAdd('OUT',        'varOut');
      tipAdd('VISIB.',     'visVar');
      tipAdd('ANIM.',      'animVar');
      for (var _ai = 1; _ai <= 8; _ai++) tipAdd('ALARM ' + _ai, 'avar' + _ai);
      for (var _di = 1; _di <= 6; _di++) tipAdd('DATO ' + _di,  'dvar' + _di);
      if (p.pollMs)      tipRows.push('Poll: ' + p.pollMs + 'ms');
      if (p.animPollMs)  tipRows.push('Poll anim: ' + p.animPollMs + 'ms');
      if (tipRows.length) {
        tooltipMapEntries.push('"' + el.id + '":' + JSON.stringify(tipRows));
      }
    })();

    if (el.tipo === 'btn-simple') {
      registrarVar(p.var1);
      var vk     = claveJs(p.var1 || '');
      var esStart = p.variant === 'start';
      var bg   = esStart ? '#0f0f0d' : '#f5f5f3';
      var bc   = esStart ? '#0f0f0d' : '#d8d8d0';
      var tc   = esStart ? '#f0f0e8' : '#1a1a16';
      var icoC = esStart ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.07)';
      htmlEls +=
        '<button id="' + el.id + '" onclick="act_' + el.id + '()"' +
        ' style="' + st + 'background:' + bg + ';border:1px solid ' + bc + ';border-radius:3px;color:' + tc + ';' +
          'font-family:DM Sans,sans-serif;font-size:' + fs + ';font-weight:500;cursor:pointer;' +
          'display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;overflow:hidden;">' +
          '<div style="width:22px;height:22px;border-radius:2px;background:' + icoC + ';display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">' + ico + '</div>' +
          '<div style="flex:1;text-align:left;overflow:hidden"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(p.text || '') + '</div>' + subExport + '</div>' +
        '</button>\n';
      jsEls += generarJsBoton(el.id, vk, p, lbl);
    }

    else if (el.tipo === 'btn-led') {
      registrarVar(p.var1);
      registrarVar(p.varLed || p.var1);
      var vk    = claveJs(p.var1   || '');
      var ledVk = claveJs(p.varLed || p.var1 || '');
      htmlEls +=
        '<button id="' + el.id + '" onclick="act_' + el.id + '()"' +
        ' style="' + st + 'background:#f5f5f3;border:1px solid #d8d8d0;border-radius:3px;color:#1a1a16;' +
          'font-family:DM Sans,sans-serif;font-size:' + fs + ';font-weight:500;cursor:pointer;' +
          'display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;">' +
          '<div style="width:22px;height:22px;border-radius:2px;background:rgba(0,0,0,.07);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">' + ico + '</div>' +
          '<div style="flex:1;text-align:left;overflow:hidden"><div>' + escHtml(p.text || '') + '</div>' + subExport + '</div>' +
          '<div id="hled_' + el.id + '" style="width:7px;height:7px;border-radius:50%;background:#c8c8b8;flex-shrink:0;transition:all .3s"></div>' +
        '</button>\n';
      jsEls += generarJsBoton(el.id, vk, p, lbl);
      jsEls +=
        'function pollBtnLed_' + el.id + '() {\n' +
        '  plcLeer(vars.' + ledVk + ', function(v){\n' +
        '    var l = document.getElementById("hled_' + el.id + '");\n' +
        '    if (!l) return;\n' +
        '    l.style.background  = v ? "#2e7d32" : "#c8c8b8";\n' +
        '    l.style.boxShadow   = v ? "0 0 5px rgba(46,125,50,.5)" : "none";\n' +
        '  });\n}\n\n';
      jsPolling += '  pollBtnLed_' + el.id + '();\n';
      jsPolling += '  setInterval(pollBtnLed_' + el.id + ', 2000);\n';
    }

    else if (el.tipo === 'btn-toggle') {
      registrarVar(p.var1);
      var vk     = claveJs(p.var1 || '');
      var valOn  = p.contact === 'NC' ? 'false' : 'true';
      var valOff = p.contact === 'NC' ? 'true'  : 'false';
      varsToggle += 'var tog_' + el.id + ' = false;\n';
      htmlEls +=
        '<button id="' + el.id + '" onclick="act_' + el.id + '()"' +
        ' style="' + st + 'background:#f5f5f3;border:1px solid #d8d8d0;border-radius:3px;color:#1a1a16;' +
          'font-family:DM Sans,sans-serif;font-size:' + fs + ';font-weight:600;cursor:pointer;' +
          'display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;position:relative;">' +
          '<div style="width:22px;height:22px;border-radius:2px;background:rgba(0,0,0,.07);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">' + escHtml(p.icon || '\u21cc') + '</div>' +
          '<div style="flex:1;text-align:left;overflow:hidden"><div>' + escHtml(p.text || '') + '</div>' + subExport + '</div>' +
          '<div id="tled_' + el.id + '" style="width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,.12);position:absolute;top:7px;right:7px;transition:all .3s"></div>' +
        '</button>\n';
      jsEls +=
        'function act_' + el.id + '() {\n' +
        '  btnAccion(function(){\n' +
        '    tog_' + el.id + ' = !tog_' + el.id + ';\n' +
        '    var b = document.getElementById("' + el.id + '");\n' +
        '    var l = document.getElementById("tled_' + el.id + '");\n' +
        '    if (tog_' + el.id + ') {\n' +
        '      b.style.background = "#0f0f0d"; b.style.color = "#f0f0e8"; b.style.borderColor = "#0f0f0d";\n' +
        '      if (l) l.style.background = "#a8ff90";\n' +
        '      plcEscribir(vars.' + vk + ', ' + valOn + ');\n' +
        '      toast("' + lbl + ' \u2192 ON");\n' +
        '    } else {\n' +
        '      b.style.background = "#f5f5f3"; b.style.color = "#1a1a16"; b.style.borderColor = "#d8d8d0";\n' +
        '      if (l) l.style.background = "rgba(0,0,0,.12)";\n' +
        '      plcEscribir(vars.' + vk + ', ' + valOff + ');\n' +
        '      toast("' + lbl + ' \u2192 OFF");\n' +
        '    }\n' +
        '  });\n}\n\n';
    }

    else if (el.tipo === 'btn-emergency') {
      registrarVar(p.var1);
      var vk     = claveJs(p.var1 || '');
      var valOn  = p.contact === 'NC' ? 'false' : 'true';
      var valOff = p.contact === 'NC' ? 'true'  : 'false';
      varsToggle += 'var em_' + el.id + ' = false;\n';
      htmlEls +=
        '<button id="' + el.id + '" onclick="act_' + el.id + '()"' +
        ' style="' + st + 'background:#fff;border:2px solid #c62828;border-radius:3px;color:#c62828;' +
          'font-family:DM Sans,sans-serif;font-size:' + fs + ';font-weight:700;cursor:pointer;' +
          'display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;justify-content:center;">' +
          '<div style="width:22px;height:22px;border-radius:2px;background:rgba(198,40,40,.1);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">\u26a0</div>' +
          '<div style="text-align:left"><div>' + escHtml(p.text || '') + '</div>' + subExport + '</div>' +
        '</button>\n';
      jsEls +=
        'function act_' + el.id + '() {\n' +
        '  btnAccion(function(){\n' +
        '    em_' + el.id + ' = !em_' + el.id + ';\n' +
        '    var b = document.getElementById("' + el.id + '");\n' +
        '    if (em_' + el.id + ') {\n' +
        '      b.style.background = "#c62828"; b.style.color = "#fff"; b.style.borderColor = "#c62828";\n' +
        '      b.style.boxShadow  = "0 0 20px rgba(198,40,40,.4)";\n' +
        '      plcEscribir(vars.' + vk + ', ' + valOn + ');\n' +
        '      toast("\u26a0 EMERGENCY STOP \u2192 ACTIVO");\n' +
        '    } else {\n' +
        '      b.style.background = "#fff"; b.style.color = "#c62828"; b.style.borderColor = "#c62828";\n' +
        '      b.style.boxShadow  = "";\n' +
        '      plcEscribir(vars.' + vk + ', ' + valOff + ');\n' +
        '      toast("\u26a0 EMERGENCY STOP \u2192 liberado");\n' +
        '    }\n' +
        '  });\n}\n\n';
    }

    else if (el.tipo === 'btn-selector') {
      registrarVar(p.var1);
      var vk   = claveJs(p.var1 || '');
      var opts = [p.opt1, p.opt2, p.opt3].filter(Boolean);
      var vals = [p.val1, p.val2, p.val3].slice(0, opts.length);
      var botonesHtml = opts.map(function(o, i) {
        var bst = 'flex:1;height:100%;background:' + (i===0?'#0f0f0d':'#f5f5f3') + ';' +
          'color:' + (i===0?'#f0f0e8':'#1a1a16') + ';border:none;' +
          'border-right:1px solid #d8d8d0;font-family:DM Mono,monospace;font-size:' + fs + ';' +
          'letter-spacing:1px;cursor:pointer;font-weight:' + (i===0?'600':'400') + ';';
        if (i === opts.length - 1) bst += 'border-right:none;';
        return '<button id="' + el.id + '_' + (i+1) + '" onclick="act_' + el.id + '(' + (i+1) + ')" style="' + bst + '">' + escHtml(o) + '</button>';
      }).join('');
      htmlEls +=
        '<div id="' + el.id + '" style="' + st + 'display:flex;border-radius:3px;overflow:hidden;border:1px solid #d8d8d0;box-sizing:border-box;">' +
          botonesHtml +
        '</div>\n';
      jsEls +=
        'function act_' + el.id + '(opt) {\n' +
        '  btnAccion(function(){\n' +
        '    var ids = [' + opts.map(function(_,i){ return '"' + el.id + '_' + (i+1) + '"'; }).join(',') + '];\n' +
        '    ids.forEach(function(bid, i){\n' +
        '      var b = document.getElementById(bid); if (!b) return;\n' +
        '      b.style.background  = i+1===opt ? "#0f0f0d" : "#f5f5f3";\n' +
        '      b.style.color       = i+1===opt ? "#f0f0e8" : "#1a1a16";\n' +
        '      b.style.fontWeight  = i+1===opt ? "600" : "400";\n' +
        '    });\n' +
        '    var vm = {' + opts.map(function(_,i){ return (i+1)+':'+JSON.stringify(valorJs(vals[i]||'')); }).join(',') + '};\n' +
        '    plcEscribir(vars.' + vk + ', vm[opt]);\n' +
        '    toast("' + lbl + ' \u2192 " + (opts_' + el.id + '[opt-1] || opt));\n' +
        '  });\n' +
        '}\n' +
        'var opts_' + el.id + ' = [' + opts.map(function(o){ return JSON.stringify(o); }).join(',') + '];\n\n';
    }

    else if (el.tipo === 'btn-dpad') {
      registrarVar(p.varUp); registrarVar(p.varDown);
      registrarVar(p.varLeft); registrarVar(p.varRight);
      var ukU = claveJs(p.varUp   || ''), ukD = claveJs(p.varDown  || '');
      var ukL = claveJs(p.varLeft || ''), ukR = claveJs(p.varRight || '');
      var ms       = p.pulseMs || 800;
      var mantener = (p.dpadMode || 'pulse') === 'hold';
      var dpFs     = Math.max(12, Math.round(el.h / 6)) + 'px';
      var bst = 'background:#f0f0ec;border:1px solid #d8d8d0;border-radius:2px;' +
        'display:flex;align-items:center;justify-content:center;color:#1a1a16;font-size:' + dpFs + ';cursor:pointer;';

      function btnDpad(dir, flecha) {
        if (mantener) {
          return '<button style="' + bst + '"' +
            ' onmousedown="dpIniciar_' + el.id + '(\'' + dir + '\')"' +
            ' onmouseup="dpFin_' + el.id + '(\'' + dir + '\')"' +
            ' onmouseleave="dpFin_' + el.id + '(\'' + dir + '\')">' + flecha + '</button>';
        }
        return '<button style="' + bst + '" onclick="dp_' + el.id + '(\'' + dir + '\')">' + flecha + '</button>';
      }

      htmlEls +=
        '<div style="' + st + 'display:grid;grid-template-columns:repeat(3,1fr);' +
          'grid-template-rows:repeat(3,1fr);gap:2px;padding:2px;box-sizing:border-box;">' +
          '<div></div>' + btnDpad('UP','\u25b2') + '<div></div>' +
          btnDpad('LEFT','\u25c4') + '<div style="background:#e8e8e0;border-radius:2px;"></div>' + btnDpad('RIGHT','\u25ba') +
          '<div></div>' + btnDpad('DOWN','\u25bc') + '<div></div>' +
        '</div>\n';

      if (mantener) {
        jsEls +=
          'function dpIniciar_' + el.id + '(d) {\n' +
          '  if(d==="UP")    plcEscribir(vars.' + ukU + ',true);\n' +
          '  else if(d==="DOWN")  plcEscribir(vars.' + ukD + ',true);\n' +
          '  else if(d==="LEFT")  plcEscribir(vars.' + ukL + ',true);\n' +
          '  else             plcEscribir(vars.' + ukR + ',true);\n' +
          '  toast("D-Pad \u2192 " + d);\n}\n' +
          'function dpFin_' + el.id + '(d) {\n' +
          '  if(d==="UP")    plcEscribir(vars.' + ukU + ',false);\n' +
          '  else if(d==="DOWN")  plcEscribir(vars.' + ukD + ',false);\n' +
          '  else if(d==="LEFT")  plcEscribir(vars.' + ukL + ',false);\n' +
          '  else             plcEscribir(vars.' + ukR + ',false);\n}\n\n';
      } else {
        jsEls +=
          'function dp_' + el.id + '(d) {\n' +
          '  btnAccion(function(){\n' +
          '    var mapa = {UP:vars.' + ukU + ',DOWN:vars.' + ukD + ',LEFT:vars.' + ukL + ',RIGHT:vars.' + ukR + '};\n' +
          '    var v = mapa[d]; if (!v) return;\n' +
          '    plcEscribir(v, true, function(){ setTimeout(function(){ plcEscribir(v, false); }, ' + ms + '); });\n' +
          '    toast("D-Pad \u2192 " + d);\n' +
          '  });\n}\n\n';
      }
    }

    else if (el.tipo === 'display') {
      registrarVar(p.var1);
      var vk   = claveJs(p.var1 || '');
      var ms   = p.pollMs || 1000;
      var etiq = escHtml(p.label || p.var1 || '-');
      htmlEls +=
        '<div id="' + el.id + '" style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;' +
          'display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
          '<div style="padding:4px 10px;border-bottom:1px solid #e8e8e0;display:flex;align-items:center;gap:7px;background:#f9f9f7">' +
            '<div id="dled_' + el.id + '" style="width:6px;height:6px;border-radius:50%;background:#c8c8b8;flex-shrink:0;transition:all .3s"></div>' +
            '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + etiq + '</div>' +
            '<div style="font-size:9px;color:#9a9a90;font-family:DM Mono,monospace">' + ms + 'ms</div>' +
          '</div>' +
          '<div style="flex:1;display:flex;align-items:center;padding:4px 10px;overflow:hidden">' +
            '<div id="dval_' + el.id + '" style="font-family:DM Mono,monospace;font-size:' + fs + ';font-weight:500;color:#1a1a16;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%">-</div>' +
          '</div>' +
        '</div>\n';
      jsEls +=
        'function poll_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    var ev  = document.getElementById("dval_' + el.id + '");\n' +
        '    var led = document.getElementById("dled_' + el.id + '");\n' +
        '    if (ev)  ev.textContent = (v !== null && v !== undefined) ? String(v) : "-";\n' +
        '    if (led) {\n' +
        '      led.style.background = v !== null ? "#2e7d32" : "#c8c8b8";\n' +
        '      led.style.boxShadow  = v !== null ? "0 0 4px rgba(46,125,50,.5)" : "none";\n' +
        '    }\n  });\n}\n\n';
      jsPolling += '  poll_' + el.id + '();\n';
      jsPolling += '  setInterval(poll_' + el.id + ', ' + ms + ');\n';
    }

    else if (el.tipo === 'status-led') {
      registrarVar(p.var1);
      var vk      = claveJs(p.var1 || '');
      var ms      = p.pollMs || 1000;
      var col     = p.color  || '#2e7d32';
      var diam    = Math.min(el.w, el.h) - 8;
      var trigStr = JSON.stringify(valorJs(p.triggerVal || 'true'));
      htmlEls +=
        '<div id="' + el.id + '" style="' + st + 'display:flex;align-items:center;justify-content:center;box-sizing:border-box;">' +
          '<div id="circulo_' + el.id + '" style="width:' + diam + 'px;height:' + diam + 'px;border-radius:50%;' +
            'background:#d0d0c8;border:3px solid #b8b8b0;' +
            'box-shadow:inset 0 2px 4px rgba(0,0,0,.2),0 1px 2px rgba(0,0,0,.1);transition:all .3s;"></div>' +
        '</div>\n';
      jsEls +=
        'function pollLed_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    var c = document.getElementById("circulo_' + el.id + '"); if (!c) return;\n' +
        '    var sv = String(v).toLowerCase();\n' +
        '    var st = String(' + trigStr + ').toLowerCase();\n' +
        '    var activa = (sv === st || (st === "true" && (sv === "1")) || (st === "false" && (sv === "0")));\n' +
        '    if (activa) {\n' +
        '      c.style.background  = "' + col + '";\n' +
        '      c.style.borderColor = "' + col + '";\n' +
        '      c.style.boxShadow   = "inset 0 2px 4px rgba(0,0,0,.2),0 0 12px ' + col + '88";\n' +
        '    } else {\n' +
        '      c.style.background  = "#d0d0c8";\n' +
        '      c.style.borderColor = "#b8b8b0";\n' +
        '      c.style.boxShadow   = "inset 0 2px 4px rgba(0,0,0,.2),0 1px 2px rgba(0,0,0,.1)";\n' +
        '    }\n  });\n}\n\n';
      jsPolling += '  pollLed_' + el.id + '();\n';
      jsPolling += '  setInterval(pollLed_' + el.id + ', ' + ms + ');\n';
    }

    else if (el.tipo === 'img-plc') {
      registrarVar(p.var1);
      var vk      = claveJs(p.var1 || '');
      var ms      = p.pollMs   || 1000;
      var imgSrc  = p.imgData  || '';
      var trigStr = JSON.stringify(valorJs(p.triggerVal || 'true'));
      var imgTag  = '<img id="imgel_' + el.id + '" src="' + (imgSrc || '') + '" style="width:100%;height:100%;object-fit:contain;display:none;position:absolute;inset:0;" alt="">';
      htmlEls +=
        '<div id="' + el.id + '" style="' + st + 'position:relative;box-sizing:border-box;overflow:hidden;">' +
          imgTag +
        '</div>\n';
      jsEls +=
        'function pollImg_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    var img = document.getElementById("imgel_' + el.id + '"); if (!img) return;\n' +
        '    var sv = String(v).toLowerCase();\n' +
        '    var st = String(' + trigStr + ').toLowerCase();\n' +
        '    var mostrar = (sv === st || (st === "true" && sv === "1") || (st === "false" && sv === "0"));\n' +
        '    img.style.display = mostrar ? "block" : "none";\n' +
        '  });\n}\n\n';
      jsPolling += '  pollImg_' + el.id + '();\n';
      jsPolling += '  setInterval(pollImg_' + el.id + ', ' + ms + ');\n';
    }

    else if (el.tipo === 'label') {
      var lblColor  = p.fontColor   || '#1a1a16';
      var lblBg     = p.bgColor     || 'transparent';
      var lblBorder = (p.borderColor && p.borderColor !== 'transparent') ? '1px solid ' + p.borderColor : 'none';
      htmlEls +=
        '<div style="' + st + 'display:flex;align-items:center;justify-content:center;' +
          'font-family:DM Mono,monospace;font-size:' + fs + ';letter-spacing:2px;' +
          'color:' + lblColor + ';background:' + lblBg + ';border:' + lblBorder + ';' +
          'border-radius:3px;box-sizing:border-box;">' +
          escHtml(p.text || '') +
        '</div>\n';
    }

    /* ══════════════ ALARMAS ══════════════ */
    else if (el.tipo === 'alarm-banner') {
      registrarVar(p.var1);
      var vk = claveJs(p.var1 || '');
      var ms = p.pollMs || 500;
      var col = p.color || '#c62828';
      var trigStr = JSON.stringify(valorJs(p.triggerVal || 'true'));
      var hideWhen = p.hideWhenInactive ? 'true' : 'false';
      htmlEls +=
        '<div id="' + el.id + '" style="' + st + 'display:flex;align-items:center;gap:11px;' +
          'padding:0 14px;border-radius:3px;border:2px solid #d8d8d0;background:#f9f9f7;' +
          'font-family:DM Sans,sans-serif;font-size:' + fs + ';box-sizing:border-box;transition:all .3s;">' +
          '<div id="abdot_' + el.id + '" style="width:8px;height:8px;border-radius:50%;background:#d0d0c8;flex-shrink:0;transition:all .3s"></div>' +
          '<div style="font-size:18px;flex-shrink:0" id="abico_' + el.id + '">\u26a0</div>' +
          '<div style="flex:1;overflow:hidden">' +
            '<div id="ablbl_' + el.id + '" style="font-weight:700;letter-spacing:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9a9a92">' + escHtml(p.text || '') + '</div>' +
            (p.subtext ? '<div style="font-size:9px;color:#9a9a90;margin-top:1px">' + escHtml(p.subtext) + '</div>' : '') +
          '</div>' +
        '</div>\n';
      jsEls +=
        'function pollAlarmBanner_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    var w = document.getElementById("' + el.id + '"); if(!w) return;\n' +
        '    var dot = document.getElementById("abdot_' + el.id + '");\n' +
        '    var lbl = document.getElementById("ablbl_' + el.id + '");\n' +
        '    var _sv = String(v).toLowerCase();\n' +
        '    var _st = String(' + trigStr + ').toLowerCase();\n' +
        '    var activa = (_sv === _st || (_st === "true" && _sv === "1") || (_st === "false" && _sv === "0"));\n' +
        '    if (' + hideWhen + ') {\n' +
        '      w.style.display = activa ? "flex" : "none";\n' +
        '    } else {\n' +
        '      w.style.display = "flex";\n' +
        '      w.style.borderColor   = activa ? "' + col + '" : "#d8d8d0";\n' +
        '      w.style.background    = activa ? "' + col + '18" : "#f9f9f7";\n' +
        '      if (dot) { dot.style.background = activa ? "' + col + '" : "#d0d0c8"; dot.style.boxShadow = activa ? "0 0 6px ' + col + '88" : "none"; }\n' +
        '      if (lbl) lbl.style.color = activa ? "' + col + '" : "#9a9a92";\n' +
        '    }\n' +
        '  });\n}\n\n';
      jsPolling += '  pollAlarmBanner_' + el.id + '();\n';
      jsPolling += '  setInterval(pollAlarmBanner_' + el.id + ', ' + ms + ');\n';
    }

    else if (el.tipo === 'alarm-list') {
      /* ══════════ ALARM-LIST TIA PORTAL: unlimited alarms, pagination ══════════ */
      var alMs       = parseInt(p.pollMs)  || 500;
      var alPgSize   = parseInt(p.pageSize)|| 15;
      var alHide     = p.hideRowsWhenInactive !== false;
      var alShowDate = p.showDateCol !== false;
      var alShowAck  = p.showAckCol ? true : false;
      var alTitle    = p.title || 'ALARMAS ACTIVAS';

      /* Parse names and vars — one per line */
      var alNamesRaw = (p.alNames || '').split('\n').map(function(s){return s.trim();});
      var alVarsRaw  = (p.alVars  || '').split('\n').map(function(s){return s.trim();});
      var alTotal    = Math.max(alNamesRaw.length, alVarsRaw.length);
      /* Pad to same length */
      while (alNamesRaw.length < alTotal) alNamesRaw.push('');
      while (alVarsRaw.length  < alTotal) alVarsRaw.push('');

      /* Register all variables */
      for (var ali = 0; ali < alTotal; ali++) {
        if (alVarsRaw[ali]) registrarVar(alVarsRaw[ali]);
      }

      /* Build JS names + vars arrays literals */
      var alNamesJs = JSON.stringify(alNamesRaw);
      var alVarsJs  = JSON.stringify(alVarsRaw);

      /* ── HTML structure ── */
      var alColHdr =
        '<div style="display:flex;align-items:center;border-bottom:2px solid #e8e8e0;background:#fff5f5;' +
        'font-size:8px;font-family:DM Mono,monospace;letter-spacing:1px;color:#9a9a90;flex-shrink:0">' +
        '<div style="width:32px;text-align:center;padding:4px 0;flex-shrink:0">#</div>' +
        '<div style="width:10px;flex-shrink:0"></div>' +
        '<div style="flex:1;padding:4px 4px">NOMBRE / DESCRIPCIÓN</div>' +
        (alShowDate ? '<div style="padding:4px 8px;flex-shrink:0">HORA</div>' : '') +
        (alShowAck  ? '<div style="padding:4px 8px;flex-shrink:0">ACK</div>'  : '') +
        '</div>';

      htmlEls +=
        '<div id="' + el.id + '" style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;' +
          'display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;font-family:DM Sans,sans-serif;">\n' +
          /* Header */
          '<div style="padding:5px 10px;border-bottom:1px solid #e8e8e0;display:flex;align-items:center;gap:7px;background:#fff5f5;flex-shrink:0">' +
            '<div id="altdot_' + el.id + '" style="width:7px;height:7px;border-radius:50%;background:#d0d0c8;flex-shrink:0;transition:all .4s"></div>' +
            '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#c62828;font-weight:600;flex:1">' + escHtml(alTitle) + '</span>' +
            '<span id="altcnt_' + el.id + '" style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;background:#f0f0ec;border-radius:8px;padding:1px 8px">0 ACTIVAS</span>' +
          '</div>' +
          /* Column header */
          alColHdr +
          /* Rows container */
          '<div id="altbody_' + el.id + '" style="flex:1;overflow-y:auto;overflow-x:hidden;"></div>' +
          /* Pager */
          '<div id="altpager_' + el.id + '" style="display:none;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;' +
            'padding:4px 10px;border-top:1px solid #e8e8e0;background:#fafaf8;">' +
            '<button onclick="altPrev_' + el.id + '()" style="border:1px solid #d8d8d0;background:#fff;border-radius:2px;padding:3px 10px;' +
              'font-family:DM Mono,monospace;font-size:11px;cursor:pointer;color:#1a1a16">◀</button>' +
            '<span id="altpglbl_' + el.id + '" style="font-family:DM Mono,monospace;font-size:9px;color:#1a1a16;letter-spacing:1px">PÁG 1 / 1</span>' +
            '<button onclick="altNext_' + el.id + '()" style="border:1px solid #d8d8d0;background:#fff;border-radius:2px;padding:3px 10px;' +
              'font-family:DM Mono,monospace;font-size:11px;cursor:pointer;color:#c62828">▶</button>' +
          '</div>' +
        '</div>\n';

      /* ── JavaScript ── */
      jsEls +=
        '/* ═══ alarm-list-tia: ' + el.id + ' ═══ */\n' +
        'var _altNames_' + el.id + ' = ' + alNamesJs + ';\n' +
        'var _altVars_'  + el.id + ' = ' + alVarsJs  + ';\n' +
        'var _altTotal_' + el.id + ' = ' + alTotal   + ';\n' +
        'var _altPgSz_'  + el.id + ' = ' + alPgSize  + ';\n' +
        'var _altPage_'  + el.id + ' = 0;\n' +
        'var _altState_' + el.id + ' = new Array(' + alTotal + ').fill(false);\n' +
        'var _altTimes_' + el.id + ' = new Array(' + alTotal + ').fill("");\n' +
        'var _altAcked_' + el.id + ' = new Array(' + alTotal + ').fill(false);\n' +
        '\n' +

        'function altRender_' + el.id + '() {\n' +
        '  var total = _altTotal_' + el.id + ';\n' +
        '  var pgSz  = _altPgSz_'  + el.id + ';\n' +
        '  var page  = _altPage_'  + el.id + ';\n' +
        '  var hide  = ' + (alHide ? 'true' : 'false') + ';\n' +
        '  var showDate = ' + (alShowDate ? 'true' : 'false') + ';\n' +
        '  var showAck  = ' + (alShowAck  ? 'true' : 'false') + ';\n' +
        '  var state = _altState_' + el.id + ';\n' +
        '  var times = _altTimes_' + el.id + ';\n' +
        '  var acked = _altAcked_' + el.id + ';\n' +
        '  var names = _altNames_' + el.id + ';\n' +
        '  var vars  = _altVars_'  + el.id + ';\n' +
        '  var start = page * pgSz;\n' +
        '  var end   = Math.min(start + pgSz, total);\n' +
        '  var pages = total > 0 ? Math.ceil(total / pgSz) : 1;\n' +
        '  var frag = "";\n' +
        '  var shown = 0;\n' +
        '  for (var i = start; i < end; i++) {\n' +
        '    var on  = state[i];\n' +
        '    var nm  = names[i] || vars[i] || ("Alarma " + (i+1));\n' +
        '    var ts  = times[i] || "--:--";\n' +
        '    var ack = acked[i];\n' +
        '    if (hide && !on) continue;\n' +
        '    shown++;\n' +
        '    frag += "<div style=\\"display:flex;align-items:center;border-bottom:1px solid #f0f0ec;" + (on?"background:#fff8f8;":"") + "\\">" +\n' +
        '      "<div style=\\"width:32px;text-align:center;font-family:DM Mono,monospace;font-size:8px;color:#b0b0a8;flex-shrink:0;padding:5px 0\\">" + (i+1) + "</div>" +\n' +
        '      "<div style=\\"width:6px;height:6px;border-radius:50%;flex-shrink:0;margin:0 4px;background:" + (on?"#c62828":"#d0d0c8") + ";" + (on?"box-shadow:0 0 5px #c6282888;":"") + "transition:all .3s\\"></div>" +\n' +
        '      "<div style=\\"flex:1;font-family:DM Mono,monospace;font-size:10px;color:" + (on?"#1a1a16":"#9a9a90") + ";font-weight:" + (on?"500":"400") + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:5px 4px\\">" + nm + "</div>" +\n' +
        '      (showDate ? "<div style=\\"font-family:DM Mono,monospace;font-size:8px;color:" + (on?"#c62828":"#b0b0a8") + ";padding:5px 8px;flex-shrink:0\\">" + ts + "</div>" : "") +\n' +
        '      (showAck  ? "<div onclick=\\"altAck_' + el.id + '(" + i + ")\\" style=\\"font-family:DM Mono,monospace;font-size:8px;padding:2px 6px;margin-right:6px;border-radius:2px;cursor:" + (on&&!ack?"pointer":"default") + ";background:" + (on&&!ack?"#fff3cd":on&&ack?"#e8f5e9":"#f5f5f3") + ";color:" + (on&&!ack?"#e65100":on&&ack?"#2e7d32":"#b0b0a8") + ";flex-shrink:0\\">" + (on&&!ack?"PEND":on&&ack?"ACK":"OK") + "</div>" : "") +\n' +
        '    "</div>";\n' +
        '  }\n' +
        '  if (!shown) frag = "<div style=\\"text-align:center;padding:18px;font-family:DM Mono,monospace;font-size:10px;color:#b0b0a8\\">" + (hide?"SIN ALARMAS ACTIVAS EN ESTA P\\u00c1GINA":"SIN ALARMAS CONFIGURADAS") + "</div>";\n' +
        '  var body = document.getElementById("altbody_' + el.id + '"); if (body) body.innerHTML = frag;\n' +
        '  var lbl = document.getElementById("altpglbl_' + el.id + '"); if (lbl) lbl.textContent = "P\\u00c1G " + (page+1) + " / " + pages;\n' +
        '  var pager = document.getElementById("altpager_' + el.id + '"); if (pager) pager.style.display = (pages > 1) ? "flex" : "none";\n' +
        '  var n = state.filter(Boolean).length;\n' +
        '  var cnt = document.getElementById("altcnt_' + el.id + '"); if (cnt) cnt.textContent = n + " ACTIVA" + (n!==1?"S":"");\n' +
        '  var dot = document.getElementById("altdot_' + el.id + '"); if (dot) { dot.style.background = n?"#c62828":"#d0d0c8"; dot.style.boxShadow = n?"0 0 6px #c6282888":"none"; }\n' +
        '}\n\n' +

        'function altAck_' + el.id + '(i) {\n' +
        '  if (_altState_' + el.id + '[i]) { _altAcked_' + el.id + '[i] = true; altRender_' + el.id + '(); }\n' +
        '}\n\n' +

        'function altPrev_' + el.id + '() {\n' +
        '  if (_altPage_' + el.id + ' > 0) { _altPage_' + el.id + '--; altRender_' + el.id + '(); }\n' +
        '}\n\n' +

        'function altNext_' + el.id + '() {\n' +
        '  var pages = Math.ceil(_altTotal_' + el.id + ' / _altPgSz_' + el.id + ');\n' +
        '  if (_altPage_' + el.id + ' < pages - 1) { _altPage_' + el.id + '++; altRender_' + el.id + '(); }\n' +
        '}\n\n' +

        'function pollAlarmList_' + el.id + '() {\n' +
        '  var vs = _altVars_' + el.id + ';\n' +
        '  var pending = vs.length;\n' +
        '  if (pending === 0) return;\n' +
        '  function done() { pending--; if (pending === 0) altRender_' + el.id + '(); }\n' +
        '  for (var i = 0; i < vs.length; i++) {\n' +
        '    (function(idx) {\n' +
        '      if (!vs[idx]) { done(); return; }\n' +
        '      plcLeer(vs[idx], function(v) {\n' +
        '        var on = (v===true||v===1||String(v)==="true");\n' +
        '        var wasOn = _altState_' + el.id + '[idx];\n' +
        '        if (on && !wasOn) {\n' +
        '          var d = new Date();\n' +
        '          _altTimes_' + el.id + '[idx] = String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");\n' +
        '          _altAcked_' + el.id + '[idx] = false;\n' +
        '        }\n' +
        '        if (!on) { _altAcked_' + el.id + '[idx] = false; _altTimes_' + el.id + '[idx] = ""; }\n' +
        '        _altState_' + el.id + '[idx] = on;\n' +
        '        done();\n' +
        '      });\n' +
        '    })(i);\n' +
        '  }\n' +
        '}\n\n';

      jsPolling += '  pollAlarmList_' + el.id + '();\n';
      jsPolling += '  setInterval(pollAlarmList_' + el.id + ', ' + alMs + ');\n';
    }

    else if (el.tipo === 'alarm-ack') {
      registrarVar(p.varAlarm); registrarVar(p.varAck);
      var vkA = claveJs(p.varAlarm || ''), vkK = claveJs(p.varAck || '');
      registrarVar(p.varAlarm); registrarVar(p.varAck);
      var vkA = claveJs(p.varAlarm || ''), vkK = claveJs(p.varAck || '');
      var ms = p.pollMs || 500;
      var fsLocal = (p.fontSize || 12) + 'px';
      htmlEls +=
        '<button id="' + el.id + '" onclick="actAck_' + el.id + '()"' +
        ' style="' + st + 'background:#f5f5f3;border:1px solid #d8d8d0;border-radius:3px;color:#1a1a16;' +
          'font-family:DM Sans,sans-serif;font-size:' + fsLocal + ';font-weight:600;cursor:pointer;' +
          'display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;transition:all .2s;">' +
          '<div style="font-size:14px">\u2713</div>' +
          '<div style="flex:1;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">' + escHtml(p.text || 'RECONOCER') + '</div>' +
          '<div id="ackbadge_' + el.id + '" style="font-family:DM Mono,monospace;font-size:8px;padding:2px 7px;border-radius:8px;background:rgba(0,0,0,.08);color:#9a9a90;letter-spacing:1px">OK</div>' +
        '</button>\n';
      jsEls +=
        'function actAck_' + el.id + '() {\n' +
        '  plcEscribir(vars.' + vkK + ', true);\n' +
        '  setTimeout(function(){ plcEscribir(vars.' + vkK + ', false); }, 500);\n' +
        '  toast("ACK enviado");\n}\n\n' +
        'function pollAck_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vkA + ', function(v){\n' +
        '    var b = document.getElementById("' + el.id + '"); if(!b) return;\n' +
        '    var badge = document.getElementById("ackbadge_' + el.id + '");\n' +
        '    var pending = (v == true || v == 1 || String(v)==="true");\n' +
        '    b.style.background = pending ? "#fff8e1" : "#f5f5f3";\n' +
        '    b.style.borderColor = pending ? "#f9a825" : "#d8d8d0";\n' +
        '    b.style.color = pending ? "#e65100" : "#1a1a16";\n' +
        '    if (badge) { badge.textContent = pending ? "PENDIENTE" : "OK"; badge.style.background = pending ? "#fff3cd" : "rgba(0,0,0,.08)"; badge.style.color = pending ? "#e65100" : "#9a9a90"; }\n' +
        '  });\n}\n\n';
      jsPolling += '  pollAck_' + el.id + '();\n';
      jsPolling += '  setInterval(pollAck_' + el.id + ', ' + ms + ');\n';
    }


    /* ══════════════ ALARM-ARRAY ══════════════ */
    else if (el.tipo === 'alarm-plc') {
      /* Lee alarmas via Alarms.Browse — los textos vienen directamente del PLC.
         Requiere Program_Alarm (FB700) configurado en TIA Portal. */
      var apTitle    = p.title     || 'ALARMAS PLC';
      var apMs       = parseInt(p.pollMs)    || 2000;
      var apMaxHist  = parseInt(p.maxHistory)|| 200;
      var apShowHist = p.showHistory ? 'true' : 'false';
      var apLang     = p.language  || 'es-ES';

      htmlEls +=
        '<div id="' + el.id + '" style="' + st + 'background:#fff;border:1px solid #c5cae9;border-radius:3px;' +
          'display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;font-family:DM Sans,sans-serif;">\n' +
          '<div style="padding:5px 10px;border-bottom:1px solid #e8eaf6;display:flex;align-items:center;gap:8px;background:#f3f4ff;flex-shrink:0;">' +
            '<div id="aphdr_dot_' + el.id + '" style="width:7px;height:7px;border-radius:50%;background:#d0d0c8;flex-shrink:0;transition:all .4s"></div>' +
            '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#1a237e;font-weight:600;flex:1">' + escHtml(apTitle) + '</span>' +
            '<span id="apcnt_' + el.id + '" style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;background:#f0f0ec;border-radius:8px;padding:1px 8px">0 ACTIVAS</span>' +
          '</div>' +
          '<div style="display:flex;border-bottom:1px solid #e8eaf6;flex-shrink:0;background:#fafbff;">' +
            '<button id="aptab_act_' + el.id + '" onclick="apTab_' + el.id + '(\'act\')" ' +
              'style="flex:1;padding:5px 0;border:none;background:transparent;cursor:pointer;' +
              'font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#1a237e;' +
              'border-bottom:2px solid #1a237e;font-weight:600">ACTIVAS</button>' +
            (apShowHist === 'true'
              ? '<button id="aptab_hist_' + el.id + '" onclick="apTab_' + el.id + '(\'hist\')" ' +
                  'style="flex:1;padding:5px 0;border:none;background:transparent;cursor:pointer;' +
                  'font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;border-bottom:2px solid transparent">HISTORIAL</button>'
              : '') +
          '</div>' +
          '<div id="aplist_act_' + el.id + '" style="flex:1;overflow-y:auto;overflow-x:hidden;"></div>' +
          (apShowHist === 'true' ? '<div id="aplist_hist_' + el.id + '" style="flex:1;overflow-y:auto;overflow-x:hidden;display:none;"></div>' : '') +
        '</div>\n';

      jsEls +=
        '/* ═══ alarm-plc: ' + el.id + ' — Alarms.Browse directo ═══ */\n' +
        'var _apHist_'   + el.id + ' = [];\n' +
        'var _apMaxH_'   + el.id + ' = ' + apMaxHist + ';\n' +
        'var _apTab_'    + el.id + ' = "act";\n' +
        'var _apPrev_'   + el.id + ' = {};\n' +  /* mapa id→alarm para detectar cambios */
        'var _apLang_'   + el.id + ' = "' + apLang + '";\n\n' +

        /* Tab switcher */
        'function apTab_' + el.id + '(t) {\n' +
        '  _apTab_' + el.id + ' = t;\n' +
        '  var tabs = ["act"' + (apShowHist === 'true' ? ',"hist"' : '') + '];\n' +
        '  tabs.forEach(function(id) {\n' +
        '    var btn = document.getElementById("aptab_"+id+"_' + el.id + '");\n' +
        '    var lst = document.getElementById("aplist_"+id+"_' + el.id + '");\n' +
        '    var on = (id === t);\n' +
        '    if (btn) { btn.style.color = on?"#1a237e":"#9a9a90"; btn.style.borderBottom = on?"2px solid #1a237e":"2px solid transparent"; btn.style.fontWeight = on?"600":"400"; }\n' +
        '    if (lst) lst.style.display = on ? "block" : "none";\n' +
        '  });\n' +
        '}\n\n' +

        /* Render lista activas */
        'function apRenderActive_' + el.id + '(alarms) {\n' +
        '  var el = document.getElementById("aplist_act_' + el.id + '"); if(!el) return;\n' +
        '  var frag = "";\n' +
        '  if (!alarms.length) {\n' +
        '    frag = "<div style=\"text-align:center;padding:20px;font-family:DM Mono,monospace;font-size:10px;color:#b0b0a8\">SIN ALARMAS ACTIVAS</div>";\n' +
        '  } else {\n' +
        '    alarms.forEach(function(a) {\n' +
        '      var txt  = (a.alarm_text && a.alarm_text[0] && a.alarm_text[0].text) || a.alarm_text || ("Alarma " + a.id);\n' +
        '      var ts   = a.timestamp ? (new Date(a.timestamp)).toLocaleTimeString() : "--:--";\n' +
        '      var ack  = a.acknowledgement_state === "acknowledged";\n' +
        '      var cls  = a.alarm_class_name || "";\n' +
        '      frag += "<div style=\"display:flex;align-items:flex-start;gap:8px;padding:6px 10px;background:#f3f4ff;border-bottom:1px solid #e8eaf6;\">" +\n' +
        '        "<div style=\"width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:4px;background:" + (ack?"#9a9a90":"#1a237e") + ";box-shadow:" + (ack?"none":"0 0 5px #3f51b588") + "\"></div>" +\n' +
        '        "<div style=\"flex:1;min-width:0;\">" +\n' +
        '          "<div style=\"font-family:DM Mono,monospace;font-size:10px;color:#1a1a16;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + txt + "</div>" +\n' +
        '          "<div style=\"font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;margin-top:2px\">" + (cls?"["+cls+"] ":"") + ts + "</div>" +\n' +
        '        "</div>" +\n' +
        '        (ack?"<div style=\"font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;flex-shrink:0\">ACK</div>":"") +\n' +
        '      "</div>";\n' +
        '    });\n' +
        '  }\n' +
        '  el.innerHTML = frag;\n' +
        '  var cnt = document.getElementById("apcnt_' + el.id + '");\n' +
        '  if (cnt) cnt.textContent = alarms.length + " ACTIVA" + (alarms.length!==1?"S":"");\n' +
        '  var dot = document.getElementById("aphdr_dot_' + el.id + '");\n' +
        '  if (dot) { dot.style.background = alarms.length?"#c62828":"#d0d0c8"; dot.style.boxShadow = alarms.length?"0 0 6px #c6282888":"none"; }\n' +
        '}\n\n' +

        /* Render historial */
        'function apRenderHist_' + el.id + '() {\n' +
        '  var el = document.getElementById("aplist_hist_' + el.id + '"); if(!el) return;\n' +
        '  var frag = "";\n' +
        '  var hist = _apHist_' + el.id + ';\n' +
        '  for (var hi=hist.length-1; hi>=0; hi--) {\n' +
        '    var h = hist[hi];\n' +
        '    var ec = h.on ? "#1a237e" : "#2e7d32";\n' +
        '    var et = h.on ? "ACTIVADA" : "RESUELTA";\n' +
        '    frag += "<div style=\"display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid #f5f5f1;\">" +\n' +
        '      "<div style=\"width:5px;height:5px;border-radius:50%;flex-shrink:0;background:"+ec+"\"></div>" +\n' +
        '      "<div style=\"flex:1;font-family:DM Mono,monospace;font-size:9px;color:#1a1a16;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">" + h.txt + "</div>" +\n' +
        '      "<div style=\"font-family:DM Mono,monospace;font-size:8px;color:"+ec+";min-width:48px;text-align:right\">" + et + "</div>" +\n' +
        '      "<div style=\"font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;min-width:40px;text-align:right\">" + h.ts + "</div>" +\n' +
        '    "</div>";\n' +
        '  }\n' +
        '  if (!hist.length) frag = "<div style=\"text-align:center;padding:20px;font-family:DM Mono,monospace;font-size:10px;color:#b0b0a8\">SIN EVENTOS</div>";\n' +
        '  el.innerHTML = frag;\n' +
        '}\n\n' +

        /* Poll via Alarms.Browse */
        'function pollAlarmPlc_' + el.id + '() {\n' +
        '  /* Alarms.Browse devuelve las alarmas activas con su texto del PLC */\n' +
        '  var hdrs = {"Content-Type":"application/json"};\n' +
        '  if (typeof plcToken !== "undefined" && plcToken) hdrs["X-Auth-Token"] = plcToken;\n' +
        '  fetch(PLC_URL, {\n' +
        '    method:"POST",\n' +
        '    headers:hdrs,\n' +
        '    body:JSON.stringify({jsonrpc:"2.0",method:"Alarms.Browse",id:88,\n' +
        '      params:{language:_apLang_' + el.id + ',filter:{alarm_classes:["userprogram"],states:["active","active_unacknowledged","active_acknowledged"]}}})\n' +
        '  })\n' +
        '  .then(function(r){ return r.json(); })\n' +
        '  .then(function(d) {\n' +
        '    if (!d || d.error) {\n' +
        '      console.warn("[HMI] Alarms.Browse:", d && d.error && d.error.message || "error");\n' +
        '      return;\n' +
        '    }\n' +
        '    var alarms = (d.result && d.result.alarms) || [];\n' +
        '    var now = new Date();\n' +
        '    var ts = String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0")+":"+String(now.getSeconds()).padStart(2,"0");\n' +
        '    /* Detectar cambios para el historial */\n' +
        '    var currentIds = {};\n' +
        '    alarms.forEach(function(a) { currentIds[a.id] = a; });\n' +
        '    /* Nuevas alarmas (aparecen) */\n' +
        '    alarms.forEach(function(a) {\n' +
        '      if (!_apPrev_' + el.id + '[a.id]) {\n' +
        '        var txt = (a.alarm_text && a.alarm_text[0] && a.alarm_text[0].text) || ("Alarma " + a.id);\n' +
        '        _apHist_' + el.id + '.push({txt:txt, on:true, ts:ts});\n' +
        '        if (_apHist_' + el.id + '.length > _apMaxH_' + el.id + ') _apHist_' + el.id + '.shift();\n' +
        '      }\n' +
        '    });\n' +
        '    /* Alarmas resueltas (desaparecen) */\n' +
        '    Object.keys(_apPrev_' + el.id + ').forEach(function(id) {\n' +
        '      if (!currentIds[id]) {\n' +
        '        var pa = _apPrev_' + el.id + '[id];\n' +
        '        var txt = (pa.alarm_text && pa.alarm_text[0] && pa.alarm_text[0].text) || ("Alarma " + id);\n' +
        '        _apHist_' + el.id + '.push({txt:txt, on:false, ts:ts});\n' +
        '        if (_apHist_' + el.id + '.length > _apMaxH_' + el.id + ') _apHist_' + el.id + '.shift();\n' +
        '      }\n' +
        '    });\n' +
        '    _apPrev_' + el.id + ' = currentIds;\n' +
        '    apRenderActive_' + el.id + '(alarms);\n' +
        '    if (_apTab_' + el.id + ' === "hist") apRenderHist_' + el.id + '();\n' +
        '  })\n' +
        '  .catch(function(e){ console.warn("[HMI] Alarms.Browse error:", e && e.message); });\n' +
        '}\n\n';

      jsPolling += '  pollAlarmPlc_' + el.id + '();\n';
      jsPolling += '  setInterval(pollAlarmPlc_' + el.id + ', ' + apMs + ');\n';
    }

    else if (el.tipo === 'alarm-word') {
      /* Leer las variables WORD (una por línea), extraer 16 bits cada una,
         mostrar alarmas activas con los textos definidos en el editor.
         Lectura bit a bit con operaciones de máscara: (value >> bit) & 1 */
      var awTitle    = p.title    || 'ALARMAS WORD';
      var awMs       = parseInt(p.pollMs)    || 1000;
      var awMaxHist  = parseInt(p.maxHistory)|| 200;
      var awShowHist = p.showHistory ? 'true' : 'false';
      
      /* Parsear la lista de variables WORD */
      var awWordVars = (p.words || '').split('\n')
        .map(function(s){ return s.trim(); })
        .filter(function(s){ return s; });
      
      if (awWordVars.length === 0) awWordVars = ['"DB_Alarmas".Word1'];
      
      /* Registrar todas las variables */
      awWordVars.forEach(function(v){ registrarVar(v); });
      
      /* Construir el array de textos: [[16 textos word0], [16 textos word1], ...] */
      var awNamesMatrix = awWordVars.map(function(v, wi) {
        var key = 'wnames' + wi;
        var names = (p[key] || '').split('\n').map(function(s){ return s.trim(); });
        while (names.length < 16) names.push('');
        return names.slice(0, 16);
      });
      
      var awWordVarsJs   = JSON.stringify(awWordVars);
      var awNamesJs      = JSON.stringify(awNamesMatrix);
      var awTotalBits    = awWordVars.length * 16;
      
      /* HTML shell — mismo estilo que alarm-array */
      htmlEls +=
        '<div id="' + el.id + '" style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;' +
          'display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;font-family:DM Sans,sans-serif;">\n' +
          /* Header */
          '<div style="padding:5px 10px;border-bottom:1px solid #e8e8e0;display:flex;align-items:center;gap:8px;background:#fdf5ff;flex-shrink:0;">' +
            '<div id="awhdr_dot_' + el.id + '" style="width:7px;height:7px;border-radius:50%;background:#d0d0c8;flex-shrink:0;transition:all .4s"></div>' +
            '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#7b1fa2;font-weight:600;flex:1">' + escHtml(awTitle) + '</span>' +
            '<span id="awcnt_' + el.id + '" style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;background:#f0f0ec;border-radius:8px;padding:1px 8px">0 ACTIVAS</span>' +
          '</div>' +
          /* Tabs */
          '<div style="display:flex;border-bottom:1px solid #e8e8e0;flex-shrink:0;background:#fafaf8;">' +
            '<button id="awtab_act_' + el.id + '" onclick="awTab_' + el.id + '(\'act\')" ' +
              'style="flex:1;padding:5px 0;border:none;background:transparent;cursor:pointer;' +
              'font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#7b1fa2;' +
              'border-bottom:2px solid #7b1fa2;font-weight:600">ACTIVAS</button>' +
            '<button id="awtab_srch_' + el.id + '" onclick="awTab_' + el.id + '(\'srch\')" ' +
              'style="flex:1;padding:5px 0;border:none;background:transparent;cursor:pointer;' +
              'font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;border-bottom:2px solid transparent">BUSCAR</button>' +
            (awShowHist === 'true'
              ? '<button id="awtab_hist_' + el.id + '" onclick="awTab_' + el.id + '(\'hist\')" ' +
                  'style="flex:1;padding:5px 0;border:none;background:transparent;cursor:pointer;' +
                  'font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;border-bottom:2px solid transparent">HISTORIAL</button>'
              : '') +
          '</div>' +
          /* Search bar */
          '<div id="awsrch_bar_' + el.id + '" style="display:none;padding:5px 8px;border-bottom:1px solid #e8e8e0;flex-shrink:0;">' +
            '<input id="awsrch_inp_' + el.id + '" placeholder="Buscar alarma..." oninput="awSearch_' + el.id + '(this.value)" ' +
              'style="width:100%;border:1px solid #d8d8d0;border-radius:2px;padding:4px 8px;' +
              'font-family:DM Mono,monospace;font-size:10px;background:#f9f9f7;color:#1a1a16;outline:none;box-sizing:border-box">' +
          '</div>' +
          /* Lists */
          '<div id="awlist_act_' + el.id + '" style="flex:1;overflow-y:auto;overflow-x:hidden;"></div>' +
          '<div id="awlist_srch_' + el.id + '" style="flex:1;overflow-y:auto;overflow-x:hidden;display:none;"></div>' +
          (awShowHist === 'true' ? '<div id="awlist_hist_' + el.id + '" style="flex:1;overflow-y:auto;overflow-x:hidden;display:none;"></div>' : '') +
        '</div>\n';

      /* ── JavaScript ── */
      jsEls +=
        '/* ═══ alarm-word: ' + el.id + ' — ' + awWordVars.length + ' WORDs × 16 bits = ' + awTotalBits + ' alarmas ═══ */\n' +
        'var _awWordVars_' + el.id + ' = ' + awWordVarsJs + ';\n' +
        'var _awNames_'    + el.id + ' = ' + awNamesJs + ';\n' +
        'var _awPrevBits_' + el.id + ' = null;\n' +
        'var _awHist_'     + el.id + ' = [];\n' +
        'var _awMaxH_'     + el.id + ' = ' + awMaxHist + ';\n' +
        'var _awTab_'      + el.id + ' = "act";\n' +
        '/* Convierte el array de valores WORD en un array plano de bits */\n' +
        'function awDecodeBits_' + el.id + '(wordValues) {\n' +
        '  var bits = [];\n' +
        '  for (var wi=0; wi<wordValues.length; wi++) {\n' +
        '    var w = parseInt(wordValues[wi]) || 0;\n' +
        '    for (var b=0; b<16; b++) {\n' +
        '      bits.push((w >> b) & 1 ? true : false);\n' +
        '    }\n' +
        '  }\n' +
        '  return bits;\n' +
        '}\n' +
        '/* Nombre de la alarma por índice global */\n' +
        'function awName_' + el.id + '(idx) {\n' +
        '  var wi = Math.floor(idx / 16);\n' +
        '  var bi = idx % 16;\n' +
        '  var wordName = _awWordVars_' + el.id + '[wi] || ("Word " + wi);\n' +
        '  var text = (_awNames_' + el.id + '[wi] || [])[bi] || "";\n' +
        '  return text || ("W" + wi + ".B" + bi);\n' +
        '}\n\n' +

        /* Tab switcher */
        'function awTab_' + el.id + '(t) {\n' +
        '  _awTab_' + el.id + ' = t;\n' +
        '  var tabs = ["act","srch"' + (awShowHist === 'true' ? ',"hist"' : '') + '];\n' +
        '  tabs.forEach(function(id) {\n' +
        '    var btn = document.getElementById("awtab_"+id+"_' + el.id + '");\n' +
        '    var lst = document.getElementById("awlist_"+id+"_' + el.id + '");\n' +
        '    var on = (id === t);\n' +
        '    if (btn) { btn.style.color = on?"#7b1fa2":"#9a9a90"; btn.style.borderBottom = on?"2px solid #7b1fa2":"2px solid transparent"; btn.style.fontWeight = on?"600":"400"; }\n' +
        '    if (lst) lst.style.display = on ? "block" : "none";\n' +
        '  });\n' +
        '  var sb = document.getElementById("awsrch_bar_' + el.id + '");\n' +
        '  if (sb) sb.style.display = (t==="srch") ? "block" : "none";\n' +
        '  if (t==="srch") { var si = document.getElementById("awsrch_inp_' + el.id + '"); if(si){si.focus();awSearch_' + el.id + '(si.value||"");} }\n' +
        '  if (t==="hist") awRenderHist_' + el.id + '();\n' +
        '}\n\n' +

        /* Render activas */
        'function awRenderActive_' + el.id + '(bits) {\n' +
        '  var el = document.getElementById("awlist_act_' + el.id + '"); if(!el) return;\n' +
        '  var frag = ""; var n = 0;\n' +
        '  for (var i=0; i<bits.length; i++) {\n' +
        '    if (!bits[i]) continue;\n' +
        '    n++;\n' +
        '    var nm = awName_' + el.id + '(i);\n' +
        '    var ts = _awHist_' + el.id + '.filter(function(h){return h.idx===i&&h.on;});\n' +
        '    var tsStr = ts.length ? ts[ts.length-1].ts : "--:--";\n' +
        '    frag += "<div style=\"display:flex;align-items:center;gap:8px;padding:5px 10px;background:#fdf5ff;border-bottom:1px solid #f3e5f5;\">" +\n' +
        '      "<div style=\"width:6px;height:6px;border-radius:50%;flex-shrink:0;background:#7b1fa2;box-shadow:0 0 5px #7b1fa288\"></div>" +\n' +
        '      "<div style=\"flex:1;font-family:DM Mono,monospace;font-size:10px;color:#1a1a16;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">" + nm + "</div>" +\n' +
        '      "<div style=\"font-family:DM Mono,monospace;font-size:8px;color:#7b1fa2\">" + tsStr + "</div>" +\n' +
        '    "</div>";\n' +
        '  }\n' +
        '  if (!n) frag = "<div style=\"text-align:center;padding:20px;font-family:DM Mono,monospace;font-size:10px;color:#b0b0a8\">SIN ALARMAS ACTIVAS</div>";\n' +
        '  el.innerHTML = frag;\n' +
        '  var cnt = document.getElementById("awcnt_' + el.id + '");\n' +
        '  if (cnt) cnt.textContent = n + " ACTIVA" + (n!==1?"S":"");\n' +
        '  var dot = document.getElementById("awhdr_dot_' + el.id + '");\n' +
        '  if (dot) { dot.style.background = n?"#7b1fa2":"#d0d0c8"; dot.style.boxShadow = n?"0 0 6px #7b1fa288":"none"; }\n' +
        '}\n\n' +

        /* Search */
        'function awSearch_' + el.id + '(q) {\n' +
        '  var el = document.getElementById("awlist_srch_' + el.id + '"); if(!el) return;\n' +
        '  q = (q||"").toLowerCase().trim();\n' +
        '  var frag = ""; var shown = 0;\n' +
        '  var total = _awWordVars_' + el.id + '.length * 16;\n' +
        '  for (var i=0; i<total; i++) {\n' +
        '    var nm = awName_' + el.id + '(i);\n' +
        '    if (q && nm.toLowerCase().indexOf(q)===-1) continue;\n' +
        '    shown++;\n' +
        '    var on = _awPrevBits_' + el.id + ' && _awPrevBits_' + el.id + '[i];\n' +
        '    var wi = Math.floor(i/16); var bi = i%16;\n' +
        '    frag += "<div style=\"display:flex;align-items:center;gap:8px;padding:5px 10px;" + (on?"background:#fdf5ff;":"") + "border-bottom:1px solid #f5f5f1;\">" +\n' +
        '      "<div style=\"width:6px;height:6px;border-radius:50%;flex-shrink:0;background:" + (on?"#7b1fa2":"#d0d0c8") + ";" + (on?"box-shadow:0 0 5px #7b1fa288;":"") + "\"></div>" +\n' +
        '      "<div style=\"font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;min-width:36px\">W"+wi+"."+bi+"</div>"+\n' +
        '      "<div style=\"flex:1;font-family:DM Mono,monospace;font-size:10px;color:" + (on?"#1a1a16":"#9a9a90") + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">" + nm + "</div>" +\n' +
        '      "<div style=\"font-family:DM Mono,monospace;font-size:8px;color:" + (on?"#7b1fa2":"#b0b0a8") + "\">" + (on?"ACTIVA":"--") + "</div>" +\n' +
        '    "</div>";\n' +
        '  }\n' +
        '  if (!shown) frag = "<div style=\"text-align:center;padding:16px;font-family:DM Mono,monospace;font-size:10px;color:#b0b0a8\">Sin resultados</div>";\n' +
        '  el.innerHTML = frag;\n' +
        '}\n\n' +

        /* History */
        'function awRenderHist_' + el.id + '() {\n' +
        '  var el = document.getElementById("awlist_hist_' + el.id + '"); if(!el) return;\n' +
        '  var frag = "";\n' +
        '  var hist = _awHist_' + el.id + ';\n' +
        '  for (var hi=hist.length-1; hi>=0; hi--) {\n' +
        '    var h = hist[hi];\n' +
        '    var nm = awName_' + el.id + '(h.idx);\n' +
        '    var ec = h.on ? "#7b1fa2" : "#2e7d32";\n' +
        '    var et = h.on ? "ACTIVADA" : "RESUELTA";\n' +
        '    frag += "<div style=\"display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid #f5f5f1;\">" +\n' +
        '      "<div style=\"width:5px;height:5px;border-radius:50%;flex-shrink:0;background:"+ec+"\"></div>" +\n' +
        '      "<div style=\"flex:1;font-family:DM Mono,monospace;font-size:9px;color:#1a1a16;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">" + nm + "</div>" +\n' +
        '      "<div style=\"font-family:DM Mono,monospace;font-size:8px;color:"+ec+";min-width:48px;text-align:right\">" + et + "</div>" +\n' +
        '      "<div style=\"font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;min-width:40px;text-align:right\">" + h.ts + "</div>" +\n' +
        '    "</div>";\n' +
        '  }\n' +
        '  if (!hist.length) frag = "<div style=\"text-align:center;padding:20px;font-family:DM Mono,monospace;font-size:10px;color:#b0b0a8\">SIN EVENTOS</div>";\n' +
        '  el.innerHTML = frag;\n' +
        '}\n\n' +

        /* Poll: leer cada word y decodificar bits */
        'function pollAlarmWord_' + el.id + '() {\n' +
        '  var wordVars = _awWordVars_' + el.id + ';\n' +
        '  var values = new Array(wordVars.length).fill(null);\n' +
        '  var pending = wordVars.length;\n' +
        '  if (pending === 0) return;\n' +
        '  wordVars.forEach(function(v, wi) {\n' +
        '    (function(idx) {\n' +
        '      plcLeer(v, function(val) {\n' +
        '        values[idx] = (val !== null && val !== undefined) ? val : 0;\n' +
        '        pending--;\n' +
        '        if (pending <= 0) {\n' +
        '          var bits = awDecodeBits_' + el.id + '(values);\n' +
        '          var now = new Date();\n' +
        '          var ts = String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0")+":"+String(now.getSeconds()).padStart(2,"0");\n' +
        '          if (_awPrevBits_' + el.id + ') {\n' +
        '            for (var i=0; i<bits.length; i++) {\n' +
        '              if (bits[i] !== _awPrevBits_' + el.id + '[i]) {\n' +
        '                _awHist_' + el.id + '.push({idx:i, on:bits[i], ts:ts});\n' +
        '                if (_awHist_' + el.id + '.length > _awMaxH_' + el.id + ') _awHist_' + el.id + '.shift();\n' +
        '              }\n' +
        '            }\n' +
        '          }\n' +
        '          _awPrevBits_' + el.id + ' = bits;\n' +
        '          awRenderActive_' + el.id + '(bits);\n' +
        '          if (_awTab_' + el.id + ' === "hist") awRenderHist_' + el.id + '();\n' +
        '          if (_awTab_' + el.id + ' === "srch") { var si = document.getElementById("awsrch_inp_' + el.id + '"); awSearch_' + el.id + '(si?si.value:""); }\n' +
        '        }\n' +
        '      });\n' +
        '    })(wi);\n' +
        '  });\n' +
        '}\n\n';

      jsPolling += '  pollAlarmWord_' + el.id + '();\n';
      jsPolling += '  setInterval(pollAlarmWord_' + el.id + ', ' + awMs + ');\n';
    }

    else if (el.tipo === 'alarm-array') {
      var aaVar     = p.arrayVar  || '"DB_Alarmas".Bits';
      var aaSize    = parseInt(p.arraySize) || 64;
      var aaMs      = parseInt(p.pollMs)    || 1000;
      var aaMaxHist = parseInt(p.maxHistory)|| 200;
      var aaTitle   = p.title || 'ALARMAS';
      var aaShowHist= p.showHistory ? 'true' : 'false';
      var aaNames   = (p.names || '').split('\n').map(function(s){ return s.trim(); });
      /* Build names array JS literal */
      var aaNamesJs = JSON.stringify(aaNames);

      /* ── HTML shell ── */
      htmlEls +=
        '<div id="' + el.id + '" style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;' +
          'display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;font-family:DM Sans,sans-serif;">\n' +
          /* Header */
          '<div style="padding:5px 10px;border-bottom:1px solid #e8e8e0;display:flex;align-items:center;gap:8px;background:#fff5f5;flex-shrink:0;">' +
            '<div id="aahdr_dot_' + el.id + '" style="width:7px;height:7px;border-radius:50%;background:#d0d0c8;flex-shrink:0;transition:all .4s"></div>' +
            '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#c62828;font-weight:600;flex:1">' + escHtml(aaTitle) + '</span>' +
            '<span id="aacnt_' + el.id + '" style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;background:#f0f0ec;border-radius:8px;padding:1px 8px">0 ACTIVAS</span>' +
          '</div>' +
          /* Tabs */
          '<div style="display:flex;border-bottom:1px solid #e8e8e0;flex-shrink:0;background:#fafaf8;">' +
            '<button id="aatab_act_' + el.id + '" onclick="aaTab_' + el.id + '(\'act\')"' +
              ' style="flex:1;padding:5px 0;border:none;background:transparent;cursor:pointer;' +
              'font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#c62828;' +
              'border-bottom:2px solid #c62828;font-weight:600">ACTIVAS</button>' +
            (aaShowHist === 'true'
              ? '<button id="aatab_srch_' + el.id + '" onclick="aaTab_' + el.id + '(\'srch\')"' +
                  ' style="flex:1;padding:5px 0;border:none;background:transparent;cursor:pointer;' +
                  'font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;border-bottom:2px solid transparent">BUSCAR</button>' +
                '<button id="aatab_hist_' + el.id + '" onclick="aaTab_' + el.id + '(\'hist\')"' +
                  ' style="flex:1;padding:5px 0;border:none;background:transparent;cursor:pointer;' +
                  'font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;border-bottom:2px solid transparent">HISTORIAL</button>'
              : '<button id="aatab_srch_' + el.id + '" onclick="aaTab_' + el.id + '(\'srch\')"' +
                  ' style="flex:1;padding:5px 0;border:none;background:transparent;cursor:pointer;' +
                  'font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;border-bottom:2px solid transparent">BUSCAR</button>') +
          '</div>' +
          /* Search bar (hidden by default) */
          '<div id="aasrch_bar_' + el.id + '" style="display:none;padding:5px 8px;border-bottom:1px solid #e8e8e0;flex-shrink:0;">' +
            '<input id="aasrch_inp_' + el.id + '" placeholder="Buscar alarma..." oninput="aaSearch_' + el.id + '(this.value)"' +
              ' style="width:100%;border:1px solid #d8d8d0;border-radius:2px;padding:4px 8px;' +
              'font-family:DM Mono,monospace;font-size:10px;background:#f9f9f7;color:#1a1a16;outline:none;box-sizing:border-box">' +
          '</div>' +
          /* Active list */
          '<div id="aalist_act_' + el.id + '" style="flex:1;overflow-y:auto;overflow-x:hidden;"></div>' +
          /* Search results */
          '<div id="aalist_srch_' + el.id + '" style="flex:1;overflow-y:auto;overflow-x:hidden;display:none;"></div>' +
          /* History */
          (aaShowHist === 'true'
            ? '<div id="aalist_hist_' + el.id + '" style="flex:1;overflow-y:auto;overflow-x:hidden;display:none;"></div>'
            : '') +
        '</div>\n';

      /* ── JavaScript ── */
      jsEls +=
        '/* ═══ alarm-array: ' + el.id + ' ═══ */\n' +
        'var _aaPrev_'   + el.id + ' = null;\n' +
        'var _aaHist_'   + el.id + ' = [];\n' +
        'var _aaMaxH_'   + el.id + ' = ' + aaMaxHist + ';\n' +
        'var _aaNames_'  + el.id + ' = ' + aaNamesJs + ';\n' +
        'var _aaSize_'   + el.id + ' = ' + aaSize + ';\n' +
        'var _aaTab_'    + el.id + ' = "act";\n' +
        '\n' +

        /* tab switcher */
        'function aaTab_' + el.id + '(t) {\n' +
        '  _aaTab_' + el.id + ' = t;\n' +
        '  var tabs = ["act","srch"' + (aaShowHist === 'true' ? ',"hist"' : '') + '];\n' +
        '  tabs.forEach(function(id) {\n' +
        '    var btn = document.getElementById("aatab_"+id+"_' + el.id + '");\n' +
        '    var lst = document.getElementById("aalist_"+id+"_' + el.id + '");\n' +
        '    var active = (id === t);\n' +
        '    if (btn) { btn.style.color = active ? "#c62828" : "#9a9a90"; btn.style.borderBottom = active ? "2px solid #c62828" : "2px solid transparent"; btn.style.fontWeight = active ? "600" : "400"; }\n' +
        '    if (lst) lst.style.display = active ? "block" : "none";\n' +
        '  });\n' +
        '  var sb = document.getElementById("aasrch_bar_' + el.id + '");\n' +
        '  if (sb) sb.style.display = (t==="srch") ? "block" : "none";\n' +
        '  if (t==="srch") { var si = document.getElementById("aasrch_inp_' + el.id + '"); if(si){si.focus();aaSearch_' + el.id + '(si.value||"");} }\n' +
        '  if (t==="hist") aaRenderHist_' + el.id + '();\n' +
        '}\n\n' +

        /* render active list */
        'function aaRenderActive_' + el.id + '(bits) {\n' +
        '  var el = document.getElementById("aalist_act_' + el.id + '"); if(!el) return;\n' +
        '  var frag = "";\n' +
        '  var n = 0;\n' +
        '  for (var i=0; i<bits.length; i++) {\n' +
        '    if (!bits[i]) continue;\n' +
        '    n++;\n' +
        '    var nm = _aaNames_' + el.id + '[i] || ("Alarma " + (i+1));\n' +
        '    var ts = _aaHist_' + el.id + '.filter(function(h){return h.idx===i&&h.on;});\n' +
        '    var tsStr = ts.length ? ts[ts.length-1].ts : "--:--";\n' +
        '    frag += "<div style=\\"display:flex;align-items:center;gap:8px;padding:5px 10px;background:#fff8f8;border-bottom:1px solid #ffe8e8;\\">" +\n' +
        '      "<div style=\\"width:6px;height:6px;border-radius:50%;flex-shrink:0;background:#c62828;box-shadow:0 0 5px #c6282888\\"></div>" +\n' +
        '      "<div style=\\"flex:1;font-family:DM Mono,monospace;font-size:10px;color:#1a1a16;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\\">" + nm + "</div>" +\n' +
        '      "<div style=\\"font-family:DM Mono,monospace;font-size:8px;color:#c62828\\">" + tsStr + "</div>" +\n' +
        '    "</div>";\n' +
        '  }\n' +
        '  if (!n) frag = "<div style=\\"text-align:center;padding:20px;font-family:DM Mono,monospace;font-size:10px;color:#b0b0a8\\">SIN ALARMAS ACTIVAS</div>";\n' +
        '  el.innerHTML = frag;\n' +
        '  var cnt = document.getElementById("aacnt_' + el.id + '");\n' +
        '  if (cnt) cnt.textContent = n + " ACTIVA" + (n!==1?"S":"");\n' +
        '  var dot = document.getElementById("aahdr_dot_' + el.id + '");\n' +
        '  if (dot) { dot.style.background = n ? "#c62828" : "#d0d0c8"; dot.style.boxShadow = n ? "0 0 6px #c6282888" : "none"; }\n' +
        '}\n\n' +

        /* search */
        'function aaSearch_' + el.id + '(q) {\n' +
        '  var el = document.getElementById("aalist_srch_' + el.id + '"); if(!el) return;\n' +
        '  q = (q||"").toLowerCase().trim();\n' +
        '  var frag = "";\n' +
        '  var shown = 0;\n' +
        '  for (var i=0; i<_aaSize_' + el.id + '; i++) {\n' +
        '    var nm = _aaNames_' + el.id + '[i] || ("Alarma " + (i+1));\n' +
        '    if (q && nm.toLowerCase().indexOf(q) === -1) continue;\n' +
        '    shown++;\n' +
        '    var prevBits = _aaPrev_' + el.id + ';\n' +
        '    var on = prevBits && prevBits[i];\n' +
        '    frag += "<div style=\\"display:flex;align-items:center;gap:8px;padding:5px 10px;" + (on?"background:#fff8f8;":"") + "border-bottom:1px solid #f5f5f1;\\">" +\n' +
        '      "<div style=\\"width:6px;height:6px;border-radius:50%;flex-shrink:0;background:" + (on?"#c62828":"#d0d0c8") + ";" + (on?"box-shadow:0 0 5px #c6282888;":"") + "\\"></div>" +\n' +
        '      "<div style=\\"font-family:DM Mono,monospace;font-size:9px;color:#6a6a62;min-width:28px\\">["+(i)+"]</div>"+\n' +
        '      "<div style=\\"flex:1;font-family:DM Mono,monospace;font-size:10px;color:" + (on?"#1a1a16":"#9a9a90") + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap\\">" + nm + "</div>" +\n' +
        '      "<div style=\\"font-family:DM Mono,monospace;font-size:8px;color:" + (on?"#c62828":"#b0b0a8") + "\\">" + (on?"ACTIVA":"--") + "</div>" +\n' +
        '    "</div>";\n' +
        '  }\n' +
        '  if (!shown) frag = "<div style=\\"text-align:center;padding:16px;font-family:DM Mono,monospace;font-size:10px;color:#b0b0a8\\">Sin resultados</div>";\n' +
        '  el.innerHTML = frag;\n' +
        '}\n\n' +

        /* history render */
        'function aaRenderHist_' + el.id + '() {\n' +
        '  var el = document.getElementById("aalist_hist_' + el.id + '"); if(!el) return;\n' +
        '  var frag = "";\n' +
        '  var hist = _aaHist_' + el.id + ';\n' +
        '  for (var hi = hist.length-1; hi >= 0; hi--) {\n' +
        '    var h = hist[hi];\n' +
        '    var nm = _aaNames_' + el.id + '[h.idx] || ("Alarma "+(h.idx+1));\n' +
        '    var evtColor = h.on ? "#c62828" : "#2e7d32";\n' +
        '    var evtTxt   = h.on ? "ACTIVADA" : "RESUELTA";\n' +
        '    frag += "<div style=\\"display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid #f5f5f1;\\">" +\n' +
        '      "<div style=\\"width:5px;height:5px;border-radius:50%;flex-shrink:0;background:"+evtColor+"\\"></div>" +\n' +
        '      "<div style=\\"flex:1;font-family:DM Mono,monospace;font-size:9px;color:#1a1a16;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\\">" + nm + "</div>" +\n' +
        '      "<div style=\\"font-family:DM Mono,monospace;font-size:8px;color:"+evtColor+";min-width:48px;text-align:right\\">" + evtTxt + "</div>" +\n' +
        '      "<div style=\\"font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;min-width:40px;text-align:right\\">" + h.ts + "</div>" +\n' +
        '    "</div>";\n' +
        '  }\n' +
        '  if (!hist.length) frag = "<div style=\\"text-align:center;padding:20px;font-family:DM Mono,monospace;font-size:10px;color:#b0b0a8\\">SIN EVENTOS</div>";\n' +
        '  el.innerHTML = frag;\n' +
        '}\n\n' +

        /* poll: read whole array in one call */
        'function pollAlarmArray_' + el.id + '() {\n' +
        '  plcLeer("' + aaVar.replace(/"/g, '\\"') + '", function(arr) {\n' +
        '    if (!Array.isArray(arr)) return;\n' +
        '    var bits = arr.slice(0, _aaSize_' + el.id + ').map(function(v){ return (v===true||v===1||String(v)==="true"); });\n' +
        '    var now = new Date();\n' +
        '    var ts = String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0")+":"+String(now.getSeconds()).padStart(2,"0");\n' +
        '    if (_aaPrev_' + el.id + ') {\n' +
        '      for (var i=0; i<bits.length; i++) {\n' +
        '        if (bits[i] !== _aaPrev_' + el.id + '[i]) {\n' +
        '          _aaHist_' + el.id + '.push({idx:i, on:bits[i], ts:ts});\n' +
        '          if (_aaHist_' + el.id + '.length > _aaMaxH_' + el.id + ') _aaHist_' + el.id + '.shift();\n' +
        '        }\n' +
        '      }\n' +
        '    }\n' +
        '    _aaPrev_' + el.id + ' = bits;\n' +
        '    aaRenderActive_' + el.id + '(bits);\n' +
        '    if (_aaTab_' + el.id + ' === "hist") aaRenderHist_' + el.id + '();\n' +
        '    if (_aaTab_' + el.id + ' === "srch") {\n' +
        '      var si = document.getElementById("aasrch_inp_' + el.id + '");\n' +
        '      aaSearch_' + el.id + '(si ? si.value : "");\n' +
        '    }\n' +
        '  });\n' +
        '}\n\n';

      jsPolling += '  pollAlarmArray_' + el.id + '();\n';
      jsPolling += '  setInterval(pollAlarmArray_' + el.id + ', ' + aaMs + ');\n';
    }

    /* ══════════════ DATOS ══════════════ */
    else if (el.tipo === 'progress-bar') {
      registrarVar(p.var1);
      var vk = claveJs(p.var1 || '');
      var ms = p.pollMs || 500;
      var col = p.color || '#1565c0';
      var minV = parseFloat(p.min) || 0;
      var maxV = parseFloat(p.max) || 100;
      htmlEls +=
        '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;' +
          'display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
          '<div style="padding:4px 10px;border-bottom:1px solid #e8e8e0;display:flex;align-items:center;gap:7px;background:#f9f9f7;">' +
            '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62;flex:1">' + escHtml(p.label || '') + '</span>' +
            '<span id="pbval_' + el.id + '" style="font-family:DM Mono,monospace;font-size:10px;font-weight:500;color:#1a1a16">—</span>' +
            (p.unit ? '<span style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">' + escHtml(p.unit) + '</span>' : '') +
          '</div>' +
          '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:6px 10px;">' +
            '<div style="height:10px;background:#f0f0ec;border-radius:5px;overflow:hidden;border:1px solid #e0e0d8;">' +
              '<div id="pbfill_' + el.id + '" style="height:100%;border-radius:5px;background:' + col + ';width:0%;transition:width .4s;"></div>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;font-family:DM Mono,monospace;font-size:8px;color:#b0b0a8;margin-top:3px;">' +
              '<span>' + minV + '</span><span>' + maxV + '</span>' +
            '</div>' +
          '</div>' +
        '</div>\n';
      jsEls +=
        'function pollPB_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    var fill = document.getElementById("pbfill_' + el.id + '"); if(!fill) return;\n' +
        '    var lbl = document.getElementById("pbval_' + el.id + '");\n' +
        '    var n = parseFloat(v) || 0;\n' +
        '    var pct = Math.max(0, Math.min(100, (n - ' + minV + ') / (' + maxV + ' - ' + minV + ') * 100));\n' +
        '    fill.style.width = pct + "%";\n' +
        '    fill.style.background = pct > 85 ? "#c62828" : pct > 65 ? "#f9a825" : "' + col + '";\n' +
        '    if (lbl) lbl.textContent = n.toFixed(1);\n' +
        '  });\n}\n\n';
      jsPolling += '  pollPB_' + el.id + '();\n';
      jsPolling += '  setInterval(pollPB_' + el.id + ', ' + ms + ');\n';
    }

    else if (el.tipo === 'trend-chart') {
      registrarVar(p.var1);
      var vk = claveJs(p.var1 || '');
      var ms = p.pollMs || 1000;
      var col = p.color || '#c62828';
      var nPts = parseInt(p.points) || 30;
      var minV = parseFloat(p.min) || 0;
      var maxV = parseFloat(p.max) || 100;
      htmlEls +=
        '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;' +
          'display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
          '<div style="padding:4px 10px;border-bottom:1px solid #e8e8e0;display:flex;align-items:center;gap:7px;background:#f9f9f7;flex-shrink:0">' +
            '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62;flex:1">' + escHtml(p.label || '') + '</span>' +
            '<span id="trendval_' + el.id + '" style="font-family:DM Mono,monospace;font-size:10px;font-weight:500;color:#1a1a16">—</span>' +
            (p.unit ? '<span style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">' + escHtml(p.unit) + '</span>' : '') +
          '</div>' +
          '<div style="flex:1;position:relative;overflow:hidden;">' +
            '<canvas id="trendc_' + el.id + '" style="width:100%;height:100%;display:block;"></canvas>' +
          '</div>' +
        '</div>\n';
      jsEls +=
        'var trendData_' + el.id + ' = [];\n' +
        'var trendMax_' + el.id + '  = ' + nPts + ';\n' +
        'var trendMin_' + el.id + '  = ' + minV + ';\n' +
        'var trendRange_' + el.id + ' = ' + (maxV - minV) + ';\n' +
        'var trendCol_' + el.id + '  = "' + col + '";\n' +
        'function drawTrend_' + el.id + '() {\n' +
        '  var c = document.getElementById("trendc_' + el.id + '"); if(!c) return;\n' +
        '  var rect = c.parentElement.getBoundingClientRect();\n' +
        '  c.width = rect.width; c.height = rect.height;\n' +
        '  var ctx = c.getContext("2d"); if(!ctx) return;\n' +
        '  var w = c.width, h = c.height, d = trendData_' + el.id + ';\n' +
        '  ctx.clearRect(0,0,w,h);\n' +
        '  ctx.strokeStyle = "#f0f0ec"; ctx.lineWidth = 1;\n' +
        '  [0.25,0.5,0.75].forEach(function(r){ ctx.beginPath(); ctx.moveTo(0,h*r); ctx.lineTo(w,h*r); ctx.stroke(); });\n' +
        '  if (d.length < 2) return;\n' +
        '  var xStep = w / (trendMax_' + el.id + ' - 1);\n' +
        '  var pts = d.map(function(v,i){ return { x: i*xStep, y: h - ((v - trendMin_' + el.id + ') / trendRange_' + el.id + ') * h * 0.85 - h*0.07 }; });\n' +
        '  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);\n' +
        '  pts.slice(1).forEach(function(pt){ ctx.lineTo(pt.x, pt.y); });\n' +
        '  ctx.strokeStyle = trendCol_' + el.id + '; ctx.lineWidth = 1.5; ctx.stroke();\n' +
        '  ctx.lineTo(pts[pts.length-1].x, h); ctx.lineTo(pts[0].x, h); ctx.closePath();\n' +
        '  ctx.fillStyle = trendCol_' + el.id + '; ctx.globalAlpha = 0.1; ctx.fill(); ctx.globalAlpha = 1;\n' +
        '}\n' +
        'function pollTrend_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    if (v === null || v === undefined) return;\n' +
        '    var n = parseFloat(v) || 0;\n' +
        '    trendData_' + el.id + '.push(n);\n' +
        '    if (trendData_' + el.id + '.length > trendMax_' + el.id + ') trendData_' + el.id + '.shift();\n' +
        '    var lbl = document.getElementById("trendval_' + el.id + '");\n' +
        '    if (lbl) lbl.textContent = n.toFixed(1);\n' +
        '    drawTrend_' + el.id + '();\n' +
        '  });\n}\n\n';
      jsPolling += '  pollTrend_' + el.id + '();\n';
      jsPolling += '  setInterval(pollTrend_' + el.id + ', ' + ms + ');\n';
    }

    else if (el.tipo === 'data-table') {
      var ms = p.pollMs || 1000;
      var rowsHtml = '';
      var pollJs = 'function pollDTable_' + el.id + '() {\n';
      for (var di = 1; di <= 6; di++) {
        var lb = p['dlabel' + di], vr = p['dvar' + di];
        if (!lb && !vr) continue;
        registrarVar(vr);
        var vk = claveJs(vr || '');
        var bg = di % 2 === 0 ? 'background:#fafaf8;' : '';
        rowsHtml +=
          '<div style="display:flex;align-items:center;padding:0 10px;height:28px;border-bottom:1px solid #f5f5f1;' + bg + '">' +
            '<span style="font-family:DM Mono,monospace;font-size:9px;color:#6a6a62;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(lb || vr || '') + '</span>' +
            '<span id="dtv_' + el.id + '_' + di + '" style="font-family:DM Mono,monospace;font-size:' + fs + ';font-weight:500;color:#1a1a16;min-width:60px;text-align:right">—</span>' +
          '</div>';
        pollJs +=
          '  plcLeer(vars.' + vk + ', function(v){ var s = document.getElementById("dtv_' + el.id + '_' + di + '"); if(s) s.textContent = v !== null && v !== undefined ? String(v) : "—"; });\n';
      }
      pollJs += '}\n\n';
      htmlEls +=
        '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;' +
          'display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
          '<div style="padding:5px 10px;border-bottom:1px solid #e8e8e0;display:flex;align-items:center;gap:7px;background:#f9f9f7;">' +
            '<div style="width:6px;height:6px;border-radius:50%;background:#2e7d32;box-shadow:0 0 4px rgba(46,125,50,.5);flex-shrink:0"></div>' +
            '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#6a6a62;flex:1">' + escHtml(p.title || 'VARIABLES') + '</span>' +
            '<span style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">' + ms + 'ms</span>' +
          '</div>' +
          '<div style="flex:1;overflow:hidden">' + rowsHtml + '</div>' +
        '</div>\n';
      jsEls += pollJs;
      jsPolling += '  pollDTable_' + el.id + '();\n';
      jsPolling += '  setInterval(pollDTable_' + el.id + ', ' + ms + ');\n';
    }

    /* ══════════════ NAVEGACIÓN ══════════════ */
    else if (el.tipo === 'nav-button') {
      var variants = { normal: ['#f5f5f3','#d8d8d0','#1a1a16'], dark: ['#0f0f0d','#0f0f0d','#f0f0e8'], outline: ['transparent','#1a1a18','#1a1a16'] };
      var v = variants[p.variant || 'normal'] || variants.normal;
      htmlEls +=
        '<a href="' + escHtml(p.target || '#') + '"' +
        ' style="' + st + 'background:' + v[0] + ';border:1px solid ' + v[1] + ';border-radius:3px;color:' + v[2] + ';' +
          'font-family:DM Sans,sans-serif;font-size:' + fs + ';font-weight:500;text-decoration:none;' +
          'display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;">' +
          '<span style="font-size:14px">' + escHtml(p.icon || '\u2192') + '</span>' +
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(p.text || '') + '</span>' +
          '<span style="font-size:10px;opacity:.5">\u25ba</span>' +
        '</a>\n';
    }

    else if (el.tipo === 'nav-menu') {
      var itemsHtml = '';
      for (var ni = 1; ni <= 5; ni++) {
        var lb = p['nlabel' + ni], tg = p['ntarget' + ni], ico = p['nicon' + ni];
        if (!lb) continue;
        var isActive = ni === 1;
        itemsHtml +=
          '<a href="' + escHtml(tg || '#') + '"' +
          ' style="display:flex;align-items:center;gap:9px;padding:0 10px;height:40px;' +
            'border-bottom:1px solid #f0f0ec;text-decoration:none;' +
            'background:' + (isActive ? '#1a1a18' : 'transparent') + ';">' +
            '<span style="font-size:13px;width:18px;text-align:center;flex-shrink:0;color:' + (isActive ? '#f0f0e8' : '#9a9a92') + '">' + escHtml(ico || '\u25b6') + '</span>' +
            '<span style="font-size:' + fs + ';font-weight:500;color:' + (isActive ? '#f0f0e8' : '#1a1a16') + ';flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:DM Sans,sans-serif">' + escHtml(lb) + '</span>' +
            '<span style="font-size:8px;color:' + (isActive ? 'rgba(255,255,255,.3)' : '#b0b0a8') + '">\u25ba</span>' +
          '</a>';
      }
      htmlEls +=
        '<nav style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;' +
          'display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
          '<div style="padding:7px 10px;border-bottom:1px solid #e8e8e0;background:#1a1a18;">' +
            '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:3px;color:rgba(255,255,255,.5)">' + escHtml(p.title || 'NAVEGACIÓN') + '</div>' +
          '</div>' +
          '<div style="flex:1;overflow:hidden;background:#fafaf8;">' + itemsHtml + '</div>' +
        '</nav>\n';
    }
    else if (el.tipo === 'btn-jog') {
      registrarVar(p.var1);
      var vk = claveJs(p.var1 || '');
      htmlEls += '<button id="' + el.id + '" onmousedown="jogStart_' + el.id + '()" onmouseup="jogStop_' + el.id + '()" onmouseleave="jogStop_' + el.id + '()" ontouchstart="jogStart_' + el.id + '()" ontouchend="jogStop_' + el.id + '()"' +
        ' style="' + st + 'background:#1565c0;border:1px solid #0d47a1;border-radius:3px;color:#fff;font-family:DM Sans,sans-serif;font-size:' + fs + ';font-weight:700;cursor:pointer;display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;letter-spacing:1px;">' +
        escHtml(p.text || 'JOG') +
        '<span style="font-family:DM Mono,monospace;font-size:8px;background:rgba(255,255,255,.2);padding:2px 7px;border-radius:2px;margin-left:auto">HOLD</span>' +
        '</button>\n';
      jsEls += 'var _jog_' + el.id + ' = null;\n' +
        'function jogStart_' + el.id + '() {\n' +
        '  if (_jog_' + el.id + ') return;\n' +
        '  plcEscribir(vars.' + vk + ', true);\n' +
        '  toast("JOG → ON");\n' +
        '  _jog_' + el.id + ' = setInterval(function(){ plcEscribir(vars.' + vk + ', true); }, 200);\n' +
        '}\n' +
        'function jogStop_' + el.id + '() {\n' +
        '  if (!_jog_' + el.id + ') return;\n' +
        '  clearInterval(_jog_' + el.id + '); _jog_' + el.id + ' = null;\n' +
        '  plcEscribir(vars.' + vk + ', false);\n' +
        '  toast("JOG → OFF");\n' +
        '}\n\n';
    }

    else if (el.tipo === 'btn-confirm') {
      registrarVar(p.var1);
      var vk = claveJs(p.var1 || ''), ms = p.pulseMs || 300;
      htmlEls += '<button id="' + el.id + '" ondblclick="act_' + el.id + '()" onclick="confirmHint_' + el.id + '()"' +
        ' style="' + st + 'background:#e65100;border:2px solid #bf360c;border-radius:3px;color:#fff;font-family:DM Sans,sans-serif;font-size:' + fs + ';font-weight:700;cursor:pointer;display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;justify-content:center;">' +
        escHtml(p.text || 'CONFIRMAR') +
        '</button>\n';
      jsEls += 'function confirmHint_' + el.id + '() { toast("Doble click para confirmar"); }\n' +
        'function act_' + el.id + '() {\n' +
        '  btnAccion(function(){\n' +
        '    plcEscribir(vars.' + vk + ', true);\n' +
        '    setTimeout(function(){ plcEscribir(vars.' + vk + ', false); }, ' + ms + ');\n' +
        '    toast("\u2714 Acci\u00f3n confirmada");\n' +
        '  });\n}\n\n';
    }

    else if (el.tipo === 'btn-set-reset') {
      registrarVar(p.varSet); registrarVar(p.varReset);
      var vkS = claveJs(p.varSet || ''), vkR = claveJs(p.varReset || '');
      htmlEls += '<div id="' + el.id + '" style="' + st + 'display:flex;border-radius:3px;overflow:hidden;box-sizing:border-box;">' +
        '<button onclick="btnAccion(function(){plcEscribir(vars.' + vkS + ',true);toast(\'SET \u2192 TRUE\');})" style="flex:1;background:#1b5e20;border:none;color:#a5d6a7;font-family:DM Mono,monospace;font-size:' + fs + ';letter-spacing:2px;font-weight:700;cursor:pointer;">' + escHtml(p.textSet || 'SET') + '</button>' +
        '<button onclick="btnAccion(function(){plcEscribir(vars.' + vkR + ',true);toast(\'RESET \u2192 TRUE\');})" style="flex:1;background:#b71c1c;border:none;border-left:1px solid rgba(0,0,0,.2);color:#ffcdd2;font-family:DM Mono,monospace;font-size:' + fs + ';letter-spacing:2px;font-weight:700;cursor:pointer;">' + escHtml(p.textReset || 'RESET') + '</button>' +
        '</div>\n';
      jsEls += '/* SET/RESET ' + el.id + ' — sin funciones extra */\n\n';
    }

    else if (el.tipo === 'spinbox') {
      registrarVar(p.var1);
      var vk = claveJs(p.var1 || '');
      var step = parseFloat(p.step) || 1, mn = parseFloat(p.min) || 0, mx = parseFloat(p.max) || 100;
      htmlEls += '<div id="' + el.id + '" style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="padding:3px 8px;border-bottom:1px solid #e8e8e0;background:#f9f9f7;display:flex;align-items:center;gap:6px;">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62;flex:1">' + escHtml(p.label || '') + '</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">' + escHtml(p.unit || '') + '</div>' +
        '</div>' +
        '<div style="flex:1;display:flex;align-items:center;">' +
          '<button onclick="spinChange_' + el.id + '(-' + step + ')" style="width:36px;height:100%;background:#f0f0ec;border:none;font-size:18px;cursor:pointer;color:#1a1a16;">−</button>' +
          '<div id="spv_' + el.id + '" style="flex:1;text-align:center;font-family:DM Mono,monospace;font-size:' + fs + ';font-weight:600;color:#1a1a16">' + mn + '</div>' +
          '<button onclick="spinChange_' + el.id + '(+' + step + ')" style="width:36px;height:100%;background:#f0f0ec;border:none;font-size:18px;cursor:pointer;color:#1a1a16;">+</button>' +
        '</div>' +
        '</div>\n';
      jsEls += 'var _spv_' + el.id + ' = ' + mn + ';\n' +
        'function spinChange_' + el.id + '(delta) {\n' +
        '  btnAccion(function(){\n' +
        '    _spv_' + el.id + ' = Math.min(' + mx + ', Math.max(' + mn + ', _spv_' + el.id + ' + delta));\n' +
        '    var el = document.getElementById("spv_' + el.id + '"); if (el) el.textContent = _spv_' + el.id + ';\n' +
        '    plcEscribir(vars.' + vk + ', _spv_' + el.id + ');\n' +
        '    toast("' + escHtml(p.label||'SP') + ' \u2192 " + _spv_' + el.id + ' + " ' + escHtml(p.unit||'') + '");\n' +
        '  });\n}\n\n';
      jsPolling += '  (function(){ plcLeer(vars.' + vk + ', function(v){ if(v!==null&&v!==undefined){ _spv_' + el.id + '=parseFloat(v)||0; var e=document.getElementById("spv_' + el.id + '"); if(e) e.textContent=_spv_' + el.id + '; } }); })();\n';
      jsPolling += '  setInterval(function(){ plcLeer(vars.' + vk + ', function(v){ if(v!==null&&v!==undefined){ _spv_' + el.id + '=parseFloat(v)||0; var e=document.getElementById("spv_' + el.id + '"); if(e) e.textContent=_spv_' + el.id + '; } }); }, ' + (p.pollMs||1000) + ');\n';
    }

    else if (el.tipo === 'slider-h') {
      registrarVar(p.var1);
      var vk = claveJs(p.var1 || ''), col = p.color || '#1565c0';
      var mn = parseFloat(p.min)||0, mx = parseFloat(p.max)||100;
      htmlEls += '<div id="' + el.id + '" style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;" onmousedown="slhDown_' + el.id + '(event)">' +
        '<div style="padding:4px 10px;border-bottom:1px solid #e8e8e0;background:#f9f9f7;display:flex;align-items:center;gap:6px;flex-shrink:0">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62;flex:1">' + escHtml(p.label||'') + '</div>' +
          '<div id="slhv_' + el.id + '" style="font-family:DM Mono,monospace;font-size:10px;font-weight:600;color:#1a1a16">—</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90;padding-left:3px">' + escHtml(p.unit||'') + '</div>' +
        '</div>' +
        '<div id="slht_' + el.id + '" style="flex:1;display:flex;align-items:center;padding:0 14px;gap:8px;cursor:ew-resize;">' +
          '<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">' + mn + '</span>' +
          '<div style="flex:1;height:4px;background:#e0e0d8;border-radius:2px;position:relative">' +
            '<div id="slhf_' + el.id + '" style="height:100%;border-radius:2px;background:' + col + ';position:absolute;left:0;top:0;width:50%"></div>' +
            '<div id="slhth_' + el.id + '" style="width:14px;height:14px;border-radius:50%;background:' + col + ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none"></div>' +
          '</div>' +
          '<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">' + mx + '</span>' +
        '</div>' +
        '</div>\n';
      jsEls += 'var _slhv_' + el.id + ' = ' + mn + ';\n' +
        'function slhSet_' + el.id + '(pct) {\n' +
        '  pct = Math.max(0, Math.min(1, pct));\n' +
        '  _slhv_' + el.id + ' = Math.round((' + mn + ' + pct * ' + (mx-mn) + ') * 10) / 10;\n' +
        '  var f=document.getElementById("slhf_' + el.id + '"), th=document.getElementById("slhth_' + el.id + '"), v=document.getElementById("slhv_' + el.id + '");\n' +
        '  if(f)f.style.width=(pct*100)+"%"; if(th)th.style.left=(pct*100)+"%"; if(v)v.textContent=_slhv_' + el.id + ';\n' +
        '}\n' +
        'function slhDown_' + el.id + '(ev) {\n' +
        '  var track = document.getElementById("slht_' + el.id + '"); if(!track) return;\n' +
        '  function move(e) { var r=track.getBoundingClientRect(); var pct=(e.clientX-r.left-14)/(r.width-28); slhSet_' + el.id + '(pct); }\n' +
        '  function up(e) { move(e); plcEscribir(vars.' + vk + ', _slhv_' + el.id + '); toast("' + escHtml(p.label||'SP') + ' → "+_slhv_' + el.id + '); document.removeEventListener("mousemove",move); document.removeEventListener("mouseup",up); }\n' +
        '  document.addEventListener("mousemove",move); document.addEventListener("mouseup",up);\n' +
        '}\n\n';
      jsPolling += '  setInterval(function(){ plcLeer(vars.' + vk + ', function(v){ if(v!==null&&v!==undefined){ var pct=(parseFloat(v)-' + mn + ')/' + (mx-mn) + '; slhSet_' + el.id + '(pct); } }); }, ' + (p.pollMs||1000) + ');\n';
    }

    else if (el.tipo === 'btn-multistate') {
      registrarVar(p.var1);
      var vk = claveJs(p.var1 || '');
      var states = (p.states || 'STOP,AUTO,MANUAL').split(',');
      var colors = (p.colors || '#c62828,#2e7d32,#1565c0').split(',');
      var valsJs = JSON.stringify(states), colsJs = JSON.stringify(colors);
      htmlEls += '<button id="' + el.id + '" onclick="msNext_' + el.id + '()"' +
        ' style="' + st + 'background:' + (colors[0]||'#c62828') + ';border:1px solid ' + (colors[0]||'#c62828') + ';border-radius:3px;color:#fff;font-family:DM Sans,sans-serif;font-size:' + fs + ';font-weight:600;cursor:pointer;display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;">' +
        '<span id="msLbl_' + el.id + '">' + escHtml(p.text||'MODO') + '</span>' +
        '<span id="msState_' + el.id + '" style="font-family:DM Mono,monospace;font-size:8px;background:rgba(255,255,255,.2);padding:2px 7px;border-radius:2px;margin-left:auto">' + (states[0]||'STOP') + '</span>' +
        '</button>\n';
      jsEls += 'var _ms_' + el.id + ' = 0;\n' +
        'var _msStates_' + el.id + ' = ' + valsJs + ';\n' +
        'var _msCols_' + el.id + ' = ' + colsJs + ';\n' +
        'function msNext_' + el.id + '() {\n' +
        '  btnAccion(function(){\n' +
        '    _ms_' + el.id + ' = (_ms_' + el.id + ' + 1) % _msStates_' + el.id + '.length;\n' +
        '    var b=document.getElementById("' + el.id + '"),s=document.getElementById("msState_' + el.id + '");\n' +
        '    var c=_msCols_' + el.id + '[_ms_' + el.id + ']||"#1a1a18";\n' +
        '    if(b){b.style.background=c;b.style.borderColor=c;}\n' +
        '    if(s)s.textContent=_msStates_' + el.id + '[_ms_' + el.id + '];\n' +
        '    plcEscribir(vars.' + vk + ', _ms_' + el.id + ');\n' +
        '    toast("Modo \u2192 "+_msStates_' + el.id + '[_ms_' + el.id + ']);\n' +
        '  });\n}\n\n';
      jsPolling += '  setInterval(function(){ plcLeer(vars.' + vk + ', function(v){ if(v!==null&&v!==undefined){ var i=parseInt(v)||0; _ms_' + el.id + '=i; var b=document.getElementById("' + el.id + '"),s=document.getElementById("msState_' + el.id + '"); var c=_msCols_' + el.id + '[i]||"#1a1a18"; if(b){b.style.background=c;b.style.borderColor=c;} if(s&&_msStates_' + el.id + '[i])s.textContent=_msStates_' + el.id + '[i]; } }); }, ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'motor-symbol') {
      registrarVar(p.varRun); registrarVar(p.varFault);
      var vkR = claveJs(p.varRun||''), vkF = claveJs(p.varFault||'');
      var diam = Math.min(el.w-16, el.h-36);
      htmlEls += '<div id="' + el.id + '" style="' + st + 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-sizing:border-box;cursor:default;">' +
        '<div id="mcirc_' + el.id + '" style="width:' + diam + 'px;height:' + diam + 'px;border-radius:50%;border:3px solid #9a9a90;display:flex;align-items:center;justify-content:center;background:#f5f5f1;position:relative;transition:all .3s">' +
          '<span style="font-family:DM Sans,monospace;font-size:' + Math.round(diam*0.35) + 'px;font-weight:700;color:#1a1a16">M</span>' +
          '<div id="mdot_' + el.id + '" style="position:absolute;top:-2px;right:-2px;width:' + Math.round(diam*0.2) + 'px;height:' + Math.round(diam*0.2) + 'px;border-radius:50%;background:#9a9a90;border:2px solid #fff;transition:all .3s"></div>' +
        '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:#1a1a16">' + escHtml(p.label||'M1') + '</div>' +
        '</div>\n';
      jsEls +=
        'function pollMotor_' + el.id + '() {\n' +
        '  var dot=document.getElementById("mdot_' + el.id + '"), circ=document.getElementById("mcirc_' + el.id + '"); if(!dot)return;\n' +
        '  plcLeer(vars.' + vkF + ', function(f){\n' +
        '    if(f==true||f==="true"||f===1){ dot.style.background="#c62828"; circ.style.borderColor="#c62828"; return; }\n' +
        '    plcLeer(vars.' + vkR + ', function(r){\n' +
        '      if(r==true||r==="true"||r===1){ dot.style.background="#2e7d32"; dot.style.boxShadow="0 0 6px rgba(46,125,50,.6)"; circ.style.borderColor="#2e7d32"; }\n' +
        '      else { dot.style.background="#9a9a90"; dot.style.boxShadow="none"; circ.style.borderColor="#9a9a90"; }\n' +
        '    });\n  });\n}\n\n';
      jsPolling += '  pollMotor_' + el.id + '(); setInterval(pollMotor_' + el.id + ', ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'valve-symbol') {
      registrarVar(p.varOpen); registrarVar(p.varClosed);
      var vkO = claveJs(p.varOpen||''), vkC = claveJs(p.varClosed||'');
      var sz = Math.min(el.w, el.h) - 20;
      htmlEls += '<div id="' + el.id + '" style="' + st + 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-sizing:border-box;">' +
        '<svg id="vsvg_' + el.id + '" width="' + sz + '" height="' + Math.round(sz*0.7) + '" viewBox="0 0 60 42" style="overflow:visible">' +
          '<polygon id="vtri1_' + el.id + '" points="0,0 30,20 0,40" fill="#9a9a90"/>' +
          '<polygon id="vtri2_' + el.id + '" points="60,0 30,20 60,40" fill="none" stroke="#9a9a90" stroke-width="2"/>' +
          '<line x1="30" y1="0" x2="30" y2="20" stroke="#9a9a90" stroke-width="2"/>' +
          '<circle id="vdot_' + el.id + '" cx="30" cy="20" r="4" fill="#9a9a90"/>' +
        '</svg>' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:#1a1a16">' + escHtml(p.label||'V1') + '</div>' +
        '</div>\n';
      jsEls += 'function pollValve_' + el.id + '() {\n' +
        '  var dot=document.getElementById("vdot_' + el.id + '"),t1=document.getElementById("vtri1_' + el.id + '"),t2=document.getElementById("vtri2_' + el.id + '");\n' +
        '  plcLeer(vars.' + vkO + ', function(o){ plcLeer(vars.' + vkC + ', function(c){\n' +
        '    if(o==true||o==="true"||o===1){ if(dot)dot.style.fill="#2e7d32"; if(t1)t1.style.fill="#2e7d32"; }\n' +
        '    else if(c==true||c==="true"||c===1){ if(dot)dot.style.fill="#c62828"; if(t1)t1.style.fill="#c62828"; }\n' +
        '    else { if(dot)dot.style.fill="#f57c00"; if(t1)t1.style.fill="#f57c00"; }\n' +
        '  }); });\n}\n\n';
      jsPolling += '  pollValve_' + el.id + '(); setInterval(pollValve_' + el.id + ', ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'pump-symbol') {
      registrarVar(p.varRun); registrarVar(p.varFault);
      var vkR = claveJs(p.varRun||''), vkF = claveJs(p.varFault||'');
      var diam = Math.min(el.w-16, el.h-36);
      htmlEls += '<div style="' + st + 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-sizing:border-box;">' +
        '<svg id="psvg_' + el.id + '" width="' + diam + '" height="' + diam + '" viewBox="0 0 60 60">' +
          '<circle id="pcirc_' + el.id + '" cx="30" cy="30" r="28" fill="none" stroke="#9a9a90" stroke-width="2"/>' +
          '<polygon id="parr_' + el.id + '" points="20,15 45,30 20,45" fill="#9a9a90"/>' +
          '<circle cx="30" cy="30" r="4" fill="#fff" stroke="#9a9a90" stroke-width="1"/>' +
        '</svg>' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:#1a1a16">' + escHtml(p.label||'P1') + '</div>' +
        '</div>\n';
      jsEls += 'function pollPump_' + el.id + '() {\n' +
        '  var c=document.getElementById("pcirc_' + el.id + '"),a=document.getElementById("parr_' + el.id + '"); if(!c)return;\n' +
        '  plcLeer(vars.' + vkF + ', function(f){\n' +
        '    if(f==true||f==="true"||f===1){ c.style.stroke="#c62828"; a.style.fill="#c62828"; return; }\n' +
        '    plcLeer(vars.' + vkR + ', function(r){\n' +
        '      var col=r==true||r==="true"||r===1?"#2e7d32":"#9a9a90";\n' +
        '      c.style.stroke=col; a.style.fill=col;\n' +
        '    });\n  });\n}\n\n';
      jsPolling += '  pollPump_' + el.id + '(); setInterval(pollPump_' + el.id + ', ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'level-tank') {
      registrarVar(p.var1);
      var vk = claveJs(p.var1||''), col = p.color||'#1565c0';
      var mn = parseFloat(p.min)||0, mx = parseFloat(p.max)||100;
      var diam = el.h - 32;
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="padding:4px 8px;border-bottom:1px solid #e8e8e0;background:#f9f9f7;display:flex;align-items:center;gap:6px;flex-shrink:0">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62;flex:1">' + escHtml(p.label||'TANQUE') + '</div>' +
          '<div id="lvpct_' + el.id + '" style="font-family:DM Mono,monospace;font-size:9px;font-weight:600;color:#1a1a16">—%</div>' +
        '</div>' +
        '<div style="flex:1;display:flex;gap:4px;padding:4px 8px;">' +
          '<div style="display:flex;flex-direction:column;justify-content:space-between;width:24px">' +
            '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">' + mx + '</span>' +
            '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">50</span>' +
            '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">' + mn + '</span>' +
          '</div>' +
          '<div style="flex:1;border:2px solid #9a9a90;border-radius:3px;position:relative;overflow:hidden;background:#f5f5f1;">' +
            '<div id="lvfill_' + el.id + '" style="position:absolute;bottom:0;left:0;right:0;height:50%;background:' + col + ';opacity:.75;transition:height .6s ease;"></div>' +
          '</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollLevel_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    if(v===null||v===undefined) return;\n' +
        '    var pct=Math.max(0,Math.min(100,(parseFloat(v)-' + mn + ')/(' + mx + '-' + mn + ')*100));\n' +
        '    var f=document.getElementById("lvfill_' + el.id + '"),p=document.getElementById("lvpct_' + el.id + '");\n' +
        '    if(f)f.style.height=pct+"%"; if(p)p.textContent=pct.toFixed(1)+"' + escHtml(p.unit||'%') + '";\n' +
        '  });\n}\n\n';
      jsPolling += '  pollLevel_' + el.id + '(); setInterval(pollLevel_' + el.id + ', ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'pid-faceplate') {
      registrarVar(p.varPV); registrarVar(p.varSP); registrarVar(p.varOut);
      var vkPV=claveJs(p.varPV||''), vkSP=claveJs(p.varSP||''), vkOut=claveJs(p.varOut||'');
      var mx = 100;
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="padding:5px 10px;background:#0f0f0d;display:flex;align-items:center;gap:8px;flex-shrink:0">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:3px;color:rgba(255,255,255,.7);flex:1">' + escHtml(p.title||'PID-101') + '</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;padding:2px 7px;border-radius:2px;background:#1565c0;color:#fff">AUTO</div>' +
        '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;padding:6px 10px;gap:5px;justify-content:center;">' +
          ['PV:pv:#1565c0:'+vkPV,'SP:sp:#2e7d32:'+vkSP,'OUT:out:#f57c00:'+vkOut].map(function(row){
            var parts=row.split(':'); var lbl=parts[0],idSfx=parts[1],col=parts[2],vk2=parts[3];
            return '<div style="display:flex;align-items:center;gap:6px">' +
              '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:#9a9a90;width:28px">' + lbl + '</div>' +
              '<div style="flex:1;height:6px;background:#f0f0ec;border-radius:3px;overflow:hidden">' +
                '<div id="pid' + idSfx + '_' + el.id + '" style="height:100%;border-radius:3px;background:' + col + ';width:50%;transition:width .4s"></div>' +
              '</div>' +
              '<div id="pidv' + idSfx + '_' + el.id + '" style="font-family:DM Mono,monospace;font-size:10px;font-weight:600;color:' + col + ';width:34px;text-align:right">—</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollPID_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vkPV + ', function(v){ var b=document.getElementById("pidpv_' + el.id + '"),lbl=document.getElementById("pidvpv_' + el.id + '"); if(!b)return; var p=Math.max(0,Math.min(100,parseFloat(v)||0)); b.style.width=p+"%"; if(lbl)lbl.textContent=(v!==null?parseFloat(v).toFixed(1):"—"); });\n' +
        '  plcLeer(vars.' + vkSP + ', function(v){ var b=document.getElementById("pidsp_' + el.id + '"),lbl=document.getElementById("pidvsp_' + el.id + '"); if(!b)return; var p=Math.max(0,Math.min(100,parseFloat(v)||0)); b.style.width=p+"%"; if(lbl)lbl.textContent=(v!==null?parseFloat(v).toFixed(1):"—"); });\n' +
        '  plcLeer(vars.' + vkOut + ', function(v){ var b=document.getElementById("pidout_' + el.id + '"),lbl=document.getElementById("pidvout_' + el.id + '"); if(!b)return; var p=Math.max(0,Math.min(100,parseFloat(v)||0)); b.style.width=p+"%"; if(lbl)lbl.textContent=(v!==null?parseFloat(v).toFixed(1):"—"); });\n' +
        '}\n\n';
      jsPolling += '  pollPID_' + el.id + '(); setInterval(pollPID_' + el.id + ', ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'gauge') {
      registrarVar(p.var1);
      var vk = claveJs(p.var1||''), col = p.color||'#f57c00';
      var mn = parseFloat(p.min)||0, mx = parseFloat(p.max)||100;
      var cx=60,cy=60,r=46;
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box;padding:4px;">' +
        '<svg id="gsvg_' + el.id + '" style="flex:1;width:100%" viewBox="0 0 120 90">' +
          '<path d="M14,74 A46,46 0 1,1 106,74" fill="none" stroke="#e8e8e0" stroke-width="7" stroke-linecap="round"/>' +
          '<path id="garc_' + el.id + '" d="M14,74 A46,46 0 0,1 60,14" fill="none" stroke="' + col + '" stroke-width="7" stroke-linecap="round" style="transition:stroke-dasharray .5s"/>' +
          '<line id="gneedle_' + el.id + '" x1="60" y1="60" x2="14" y2="74" stroke="#1a1a16" stroke-width="2.5" stroke-linecap="round" style="transform-origin:60px 60px;transition:transform .5s"/>' +
          '<circle cx="60" cy="60" r="5" fill="#1a1a16"/>' +
          '<text id="gval_' + el.id + '" x="60" y="84" text-anchor="middle" font-family="DM Mono,monospace" font-size="10" font-weight="700" fill="#1a1a16">—</text>' +
          '<text x="60" y="94" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">' + escHtml(p.label||'') + ' ' + escHtml(p.unit||'') + '</text>' +
          '<text x="16" y="82" font-family="DM Mono,monospace" font-size="7" fill="#b0b0a8">' + mn + '</text>' +
          '<text x="' + (mx >= 100 ? '98' : '100') + '" y="82" font-family="DM Mono,monospace" font-size="7" fill="#b0b0a8">' + mx + '</text>' +
        '</svg>' +
        '</div>\n';
      jsEls += 'function pollGauge_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    if(v===null||v===undefined) return;\n' +
        '    var pct=Math.max(0,Math.min(1,(parseFloat(v)-' + mn + ')/(' + mx + '-' + mn + ')));\n' +
        '    var angleDeg=-135+pct*270;\n' +
        '    var n=document.getElementById("gneedle_' + el.id + '"),lbl=document.getElementById("gval_' + el.id + '");\n' +
        '    if(n)n.style.transform="rotate("+angleDeg+"deg)";\n' +
        '    if(lbl)lbl.textContent=parseFloat(v).toFixed(1);\n' +
        '  });\n}\n\n';
      jsPolling += '  pollGauge_' + el.id + '(); setInterval(pollGauge_' + el.id + ', ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'bargraph-v') {
      registrarVar(p.var1);
      var vk=claveJs(p.var1||''), col=p.color||'#1565c0';
      var mn=parseFloat(p.min)||0, mx=parseFloat(p.max)||100;
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;gap:3px;padding:4px;box-sizing:border-box;overflow:hidden;">' +
        '<div style="display:flex;flex-direction:column;justify-content:space-between;width:24px">' +
          '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90;text-align:right">' + mx + '</span>' +
          '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90;text-align:right">50</span>' +
          '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90;text-align:right">' + mn + '</span>' +
        '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;">' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#6a6a62;text-align:center">' + escHtml(p.label||'') + '</div>' +
          '<div style="flex:1;background:#f0f0ec;border-radius:2px;position:relative;border:1px solid #e0e0d8;overflow:hidden;">' +
            '<div id="bgfill_' + el.id + '" style="position:absolute;bottom:0;left:0;right:0;height:50%;background:' + col + ';transition:height .5s;border-radius:2px;"></div>' +
          '</div>' +
          '<div id="bgval_' + el.id + '" style="font-family:DM Mono,monospace;font-size:8px;font-weight:600;text-align:center;color:#1a1a16;padding-top:2px">—</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollBG_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    if(v===null||v===undefined) return;\n' +
        '    var pct=Math.max(0,Math.min(100,(parseFloat(v)-' + mn + ')/(' + mx + '-' + mn + ')*100));\n' +
        '    var f=document.getElementById("bgfill_' + el.id + '"),lbl=document.getElementById("bgval_' + el.id + '");\n' +
        '    if(f)f.style.height=pct+"%"; if(lbl)lbl.textContent=parseFloat(v).toFixed(1)+" ' + escHtml(p.unit||'') + '";\n' +
        '  });\n}\n\n';
      jsPolling += '  pollBG_' + el.id + '(); setInterval(pollBG_' + el.id + ', ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'numeric-7seg') {
      registrarVar(p.var1);
      var vk=claveJs(p.var1||''), decimals=parseInt(p.decimals)||0;
      var segFs = Math.min(el.h-28, 40);
      htmlEls += '<div style="' + st + 'background:#0a0a08;border:1px solid #1a1a16;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="padding:3px 8px;border-bottom:1px solid #1a1a16;display:flex;align-items:center;">' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#4a4a42">' + escHtml(p.label||'') + '</div>' +
        '</div>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:4px 8px">' +
          '<div id="seg7_' + el.id + '" style="font-family:DM Mono,monospace;font-size:' + segFs + 'px;font-weight:700;color:#00e676;letter-spacing:4px;text-shadow:0 0 10px rgba(0,230,118,.5)">—</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function poll7seg_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    var el=document.getElementById("seg7_' + el.id + '"); if(!el) return;\n' +
        '    el.textContent=(v!==null&&v!==undefined)?parseFloat(v).toFixed(' + decimals + '):"—";\n' +
        '  });\n}\n\n';
      jsPolling += '  poll7seg_' + el.id + '(); setInterval(poll7seg_' + el.id + ', ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'multibit-led') {
      registrarVar(p.var1);
      var vk=claveJs(p.var1||''), nbits=Math.min(parseInt(p.bits)||8,16);
      var bitsHtml='';
      for(var bi=0;bi<nbits;bi++){
        bitsHtml+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px">' +
          '<div id="mbit'+bi+'_' + el.id + '" style="width:10px;height:10px;border-radius:50%;background:#d0d0c8;border:1.5px solid #b8b8b0;transition:all .3s"></div>' +
          '<div style="font-family:DM Mono,monospace;font-size:7px;color:#b0b0a8">'+bi+'</div>' +
        '</div>';
      }
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="padding:4px 8px;border-bottom:1px solid #e8e8e0;background:#f9f9f7;">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62">' + escHtml(p.label||'WORD') + '</div>' +
        '</div>' +
        '<div style="flex:1;display:flex;flex-wrap:wrap;align-content:center;gap:4px;padding:6px 8px">' + bitsHtml + '</div>' +
        '</div>\n';
      jsEls += 'function pollMBit_' + el.id + '() {\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    if(v===null||v===undefined) return;\n' +
        '    var word=parseInt(v)||0;\n' +
        '    for(var i=0;i<' + nbits + ';i++){\n' +
        '      var d=document.getElementById("mbit"+i+"_' + el.id + '"); if(!d)continue;\n' +
        '      var on=(word>>i)&1;\n' +
        '      d.style.background=on?"#2e7d32":"#d0d0c8"; d.style.boxShadow=on?"0 0 5px rgba(46,125,50,.5)":"none";\n' +
        '    }\n  });\n}\n\n';
      jsPolling += '  pollMBit_' + el.id + '(); setInterval(pollMBit_' + el.id + ', ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'setpoint-input') {
      registrarVar(p.varPV); registrarVar(p.varSP);
      var vkPV=claveJs(p.varPV||''), vkSP=claveJs(p.varSP||'');
      var mn=parseFloat(p.min)||0, mx=parseFloat(p.max)||100;
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="padding:4px 10px;border-bottom:1px solid #e8e8e0;background:#f9f9f7;display:flex;align-items:center;gap:6px;flex-shrink:0">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62;flex:1">' + escHtml(p.label||'') + '</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">' + escHtml(p.unit||'') + '</div>' +
        '</div>' +
        '<div style="flex:1;display:flex">' +
          '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px">' +
            '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:#9a9a90;margin-bottom:2px">PV</div>' +
            '<div id="spvpv_' + el.id + '" style="font-family:DM Mono,monospace;font-size:14px;font-weight:700;color:#1565c0">—</div>' +
          '</div>' +
          '<div style="width:1px;background:#e8e8e0"></div>' +
          '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;cursor:pointer" ondblclick="editSP_' + el.id + '()">' +
            '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:#9a9a90;margin-bottom:2px">SP ✎</div>' +
            '<div id="spvsp_' + el.id + '" style="font-family:DM Mono,monospace;font-size:14px;font-weight:700;color:#2e7d32">—</div>' +
          '</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function editSP_' + el.id + '() {\n' +
        '  var cur=document.getElementById("spvsp_' + el.id + '"); if(!cur) return;\n' +
        '  var val=prompt("Nuevo setpoint ' + escHtml(p.label||'') + ' [' + mn + '-' + mx + '] ' + escHtml(p.unit||'') + '", cur.textContent);\n' +
        '  if(val===null) return;\n' +
        '  val=Math.max(' + mn + ',Math.min(' + mx + ',parseFloat(val)||0));\n' +
        '  plcEscribir(vars.' + vkSP + ', val, function(err){ if(!err){ toast("SP → "+val+" ' + escHtml(p.unit||'') + '"); } else { toast("Error al escribir SP"); } });\n' +
        '}\n\n';
      jsPolling += '  setInterval(function(){\n' +
        '    plcLeer(vars.' + vkPV + ', function(v){ var e=document.getElementById("spvpv_' + el.id + '"); if(e&&v!==null)e.textContent=parseFloat(v).toFixed(1); });\n' +
        '    plcLeer(vars.' + vkSP + ', function(v){ var e=document.getElementById("spvsp_' + el.id + '"); if(e&&v!==null)e.textContent=parseFloat(v).toFixed(1); });\n' +
        '  }, ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'xy-chart') {
      registrarVar(p.varX); registrarVar(p.varY);
      var vkX=claveJs(p.varX||''), vkY=claveJs(p.varY||'');
      var pts=parseInt(p.points)||50, colX=p.colorX||'#1565c0', colY=p.colorY||'#c62828';
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="padding:4px 10px;border-bottom:1px solid #e8e8e0;background:#f9f9f7;display:flex;align-items:center;gap:8px;flex-shrink:0">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62;flex:1">' + escHtml(p.label||'XY') + '</div>' +
          '<span style="font-family:DM Mono,monospace;font-size:8px;color:' + colX + '">X</span>' +
          '<span style="font-family:DM Mono,monospace;font-size:8px;color:' + colY + '">Y</span>' +
        '</div>' +
        '<div style="flex:1;padding:4px;">' +
          '<canvas id="xyc_' + el.id + '" style="width:100%;height:100%"></canvas>' +
        '</div>' +
        '</div>\n';
      jsEls += 'var _xyX_' + el.id + '=[], _xyY_' + el.id + '=[];\n' +
        'function drawXY_' + el.id + '(){\n' +
        '  var c=document.getElementById("xyc_' + el.id + '"); if(!c) return;\n' +
        '  var ctx=c.getContext("2d"); c.width=c.offsetWidth; c.height=c.offsetHeight;\n' +
        '  if(_xyX_' + el.id + '.length<2) return;\n' +
        '  var w=c.width,h=c.height;\n' +
        '  var maxX=Math.max(..._xyX_' + el.id + '),minX=Math.min(..._xyX_' + el.id + ');\n' +
        '  var maxY=Math.max(..._xyY_' + el.id + '),minY=Math.min(..._xyY_' + el.id + ');\n' +
        '  ctx.clearRect(0,0,w,h);\n' +
        '  ctx.strokeStyle="' + colX + '"; ctx.lineWidth=1.5; ctx.beginPath();\n' +
        '  _xyX_' + el.id + '.forEach(function(x,i){\n' +
        '    var px=(x-minX)/(maxX-minX||1)*(w-10)+5;\n' +
        '    var py=h-((_xyY_' + el.id + '[i]-minY)/(maxY-minY||1)*(h-10)+5);\n' +
        '    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);\n' +
        '  });\n  ctx.stroke();\n}\n' +
        'function pollXY_' + el.id + '(){\n' +
        '  plcLeer(vars.' + vkX + ', function(x){ plcLeer(vars.' + vkY + ', function(y){\n' +
        '    if(x===null||y===null) return;\n' +
        '    _xyX_' + el.id + '.push(parseFloat(x)); _xyY_' + el.id + '.push(parseFloat(y));\n' +
        '    if(_xyX_' + el.id + '.length>' + pts + '){ _xyX_' + el.id + '.shift(); _xyY_' + el.id + '.shift(); }\n' +
        '    drawXY_' + el.id + '();\n  }); });\n}\n\n';
      jsPolling += '  setInterval(pollXY_' + el.id + ', ' + (p.pollMs||1000) + ');\n';
    }

    else if (el.tipo === 'bar-chart') {
      var bars=[], bvars=[];
      for(var bi=1;bi<=4;bi++){
        if(p['blabel'+bi]){ registrarVar(p['bvar'+bi]); bars.push({lbl:p['blabel'+bi],vk:claveJs(p['bvar'+bi]||''),col:p['bcolor'+bi]||'#1565c0',id:'b'+bi+'_'+el.id}); }
      }
      var bIdsJson = JSON.stringify(bars.map(function(b){return b.id;}));
      var bVksJson = JSON.stringify(bars.map(function(b){return b.vk;}));
      var bColsJson = JSON.stringify(bars.map(function(b){return b.col;}));
      var mx2 = parseFloat(p.max)||100;
      var barsHtml = '<div style="flex:1;display:flex;align-items:flex-end;gap:3px;padding:6px 8px 4px">';
      bars.forEach(function(b){
        barsHtml += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">' +
          '<div id="' + b.id + '" style="width:100%;height:50%;background:' + b.col + ';border-radius:2px 2px 0 0;transition:height .5s;min-height:2px"></div>' +
          '<div style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%">' + escHtml(b.lbl) + '</div>' +
        '</div>';
      });
      barsHtml += '</div>';
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="padding:4px 10px;border-bottom:1px solid #e8e8e0;background:#f9f9f7;display:flex;align-items:center;gap:8px;flex-shrink:0">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62;flex:1">' + escHtml(p.title||'BARRAS') + '</div>' +
          '<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">' + escHtml(p.unit||'') + '</span>' +
        '</div>' +
        barsHtml +
        '</div>\n';
      jsEls += 'var _bIds_' + el.id + '=' + bIdsJson + ';\n' +
        'var _bVks_' + el.id + '=' + bVksJson + ';\n' +
        'var _bMax_' + el.id + '=' + mx2 + ';\n' +
        'function pollBChart_' + el.id + '(){\n' +
        '  _bVks_' + el.id + '.forEach(function(vk,i){\n' +
        '    if(!vk||!vars[vk]) return;\n' +
        '    plcLeer(vars[vk], function(v){\n' +
        '      if(v===null) return;\n' +
        '      var pct=Math.max(0,Math.min(100,parseFloat(v)/_bMax_' + el.id + '*100));\n' +
        '      var b=document.getElementById(_bIds_' + el.id + '[i]); if(b)b.style.height=pct+"%";\n' +
        '    });\n  });\n}\n\n';
      jsPolling += '  pollBChart_' + el.id + '(); setInterval(pollBChart_' + el.id + ', ' + (p.pollMs||1000) + ');\n';
    }

    else if (el.tipo === 'recipe-table') {
      var rcRows=[];
      for(var ri=1;ri<=6;ri++){
        if(p['rlabel'+ri]){ registrarVar(p['rvar'+ri]); rcRows.push({lbl:p['rlabel'+ri],vk:claveJs(p['rvar'+ri]||''),unit:p['runit'+ri]||'',id:'rc'+ri+'_'+el.id}); }
      }
      var rowsHtml='';
      rcRows.forEach(function(r){
        rowsHtml+='<div style="display:flex;align-items:center;border-bottom:1px solid #f0f0ec;padding:4px 10px">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:#6a6a62;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(r.lbl) + '</div>' +
          '<div id="' + r.id + '" style="font-family:DM Mono,monospace;font-size:10px;font-weight:600;color:#1a1a16;min-width:40px;text-align:right">—</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;min-width:20px;text-align:right;padding-left:3px">' + escHtml(r.unit) + '</div>' +
        '</div>';
      });
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="padding:5px 10px;background:#1a1a18;display:flex;align-items:center;gap:8px;flex-shrink:0">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:3px;color:rgba(255,255,255,.7);flex:1">' + escHtml(p.title||'RECETA') + '</div>' +
        '</div>' +
        '<div>' + rowsHtml + '</div>' +
        '</div>\n';
      var rcIdsJson=JSON.stringify(rcRows.map(function(r){return r.id;}));
      var rcVksJson=JSON.stringify(rcRows.map(function(r){return r.vk;}));
      jsEls += 'var _rcIds_' + el.id + '=' + rcIdsJson + ';\nvar _rcVks_' + el.id + '=' + rcVksJson + ';\n' +
        'function pollRecipe_' + el.id + '(){\n' +
        '  _rcVks_' + el.id + '.forEach(function(vk,i){\n' +
        '    if(!vk||!vars[vk]) return;\n' +
        '    plcLeer(vars[vk], function(v){\n' +
        '      var e=document.getElementById(_rcIds_' + el.id + '[i]); if(e&&v!==null)e.textContent=v;\n' +
        '    });\n  });\n}\n\n';
      jsPolling += '  pollRecipe_' + el.id + '(); setInterval(pollRecipe_' + el.id + ', ' + (p.pollMs||1000) + ');\n';
    }

    else if (el.tipo === 'datetime-display') {
      var dtFs = (p.fontSize||20)+'px';
      htmlEls += '<div style="' + st + 'background:#0f0f0d;border:1px solid #2a2a26;border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;box-sizing:border-box;">' +
        '<div id="dthms_' + el.id + '" style="font-family:DM Mono,monospace;font-size:' + dtFs + ';font-weight:700;color:#f0f0e8;letter-spacing:3px">--:--:--</div>' +
        '<div id="dtdate_' + el.id + '" style="font-family:DM Mono,monospace;font-size:9px;color:rgba(240,240,232,.4);letter-spacing:2px;margin-top:3px">-- / -- / ----</div>' +
        '</div>\n';
      jsEls += 'function tickDT_' + el.id + '(){\n' +
        '  var d=new Date(),h=d.getHours(),m=d.getMinutes(),s=d.getSeconds();\n' +
        '  var pad=function(n){return n<10?"0"+n:n;};\n' +
        '  var eH=document.getElementById("dthms_' + el.id + '"),eD=document.getElementById("dtdate_' + el.id + '");\n' +
        '  if(eH)eH.textContent=pad(h)+":"+pad(m)+":"+pad(s);\n' +
        '  if(eD)eD.textContent=pad(d.getDate())+" / "+pad(d.getMonth()+1)+" / "+d.getFullYear();\n' +
        '}\n\n';
      jsPolling += '  tickDT_' + el.id + '(); setInterval(tickDT_' + el.id + ', 1000);\n';
    }

    else if (el.tipo === 'alarm-ticker') {
      /* Recopilar los 3 pares variable→mensaje, resolviendo claves en generación */
      var tkrPairs = [];
      for (var _tai=1; _tai<=3; _tai++) {
        var _tavar = p['avar'+_tai] ? String(p['avar'+_tai]).trim() : '';
        var _tamsg = p['amsg'+_tai] ? String(p['amsg'+_tai]).trim() : '';
        if (_tavar) {
          registrarVar(_tavar);
          tkrPairs.push({ vk: claveJs(_tavar), msg: _tamsg || ('ALARMA '+_tai) });
        }
      }
      var tkrPairsJson = JSON.stringify(tkrPairs);
      var tkrPoll = p.pollMs || 1000;
      htmlEls += '<div id="' + el.id + '" style="' + st + 'background:#0a0a08;border:1px solid #c62828;border-radius:3px;display:flex;align-items:center;gap:8px;overflow:hidden;box-sizing:border-box;padding:0 10px;">' +
        '<div style="color:#c62828;font-size:13px;flex-shrink:0">⚑</div>' +
        '<div style="flex:1;overflow:hidden;">' +
          '<div id="tkr_' + el.id + '" style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:1px;color:rgba(255,82,82,.35);white-space:nowrap;display:inline-block">⚑ SIN ALARMAS ACTIVAS</div>' +
        '</div>' +
        '</div>\n';
      if (tkrPairs.length > 0) {
        jsEls +=
          'var _tkrPairs_' + el.id + '=' + tkrPairsJson + ';\n' +
          'function pollTicker_' + el.id + '(){\n' +
          '  var active=[];\n' +
          '  var pending=_tkrPairs_' + el.id + '.length;\n' +
          '  if(pending===0){ updateTicker_' + el.id + '([]); return; }\n' +
          '  _tkrPairs_' + el.id + '.forEach(function(pair){\n' +
          '    (function(p){ /* closure para capturar par correcto */\n' +
          '      plcLeer(vars[p.vk], function(val){\n' +
          '        if(val===true||val==="true"||val===1||val==="1") active.push(p.msg);\n' +
          '        pending--;\n' +
          '        if(pending<=0) updateTicker_' + el.id + '(active);\n' +
          '      });\n' +
          '    })(pair);\n' +
          '  });\n' +
          '}\n' +
          'function updateTicker_' + el.id + '(msgs){\n' +
          '  var e=document.getElementById("tkr_' + el.id + '"); if(!e) return;\n' +
          '  if(msgs.length){\n' +
          '    e.textContent=msgs.map(function(m){return "⚑ "+m;}).join("   ·   ");\n' +
          '    e.style.color="#ff5252";\n' +
          '    e.style.animation="ticker-scroll 14s linear infinite";\n' +
          '  } else {\n' +
          '    e.textContent="⚑ SIN ALARMAS ACTIVAS";\n' +
          '    e.style.color="rgba(255,82,82,.35)";\n' +
          '    e.style.animation="none";\n' +
          '  }\n' +
          '}\n\n';
        jsPolling += '  pollTicker_' + el.id + '(); setInterval(pollTicker_' + el.id + ', ' + tkrPoll + ');\n';
      }
    }

    else if (el.tipo === 'alarm-count') {
      registrarVar(p.var1);
      var vk=claveJs(p.var1||''), thr=parseInt(p.threshold)||1;
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;align-items:center;gap:10px;padding:0 12px;overflow:hidden;box-sizing:border-box;">' +
        '<div id="acbub_' + el.id + '" style="min-width:36px;height:36px;border-radius:4px;background:#2e7d32;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:18px;font-weight:700;color:#fff;flex-shrink:0;padding:0 8px;transition:background .3s">0</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#6a6a62">ALARMAS<br>ACTIVAS</div>' +
        '</div>\n';
      jsEls += 'function pollACount_' + el.id + '(){\n' +
        '  plcLeer(vars.' + vk + ', function(v){\n' +
        '    var b=document.getElementById("acbub_' + el.id + '"); if(!b)return;\n' +
        '    var n=parseInt(v)||0;\n' +
        '    b.textContent=n;\n' +
        '    b.style.background=n>=' + thr + '?"#c62828":"#2e7d32";\n' +
        '  });\n}\n\n';
      jsPolling += '  pollACount_' + el.id + '(); setInterval(pollACount_' + el.id + ', ' + (p.pollMs||500) + ');\n';
    }

    else if (el.tipo === 'frame-box') {
      var col = p.color || '#1a1a18';
      htmlEls += '<div style="' + st + 'border:2px solid ' + col + ';border-radius:4px;box-sizing:border-box;pointer-events:none;">' +
        '<div style="position:absolute;top:-10px;left:10px;background:' + (FONDO_CANVAS||'#f0f0ec') + ';padding:0 6px;font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:' + col + ';font-weight:600">' + escHtml(p.title||'ZONA') + '</div>' +
        '</div>\n';
      jsEls += '/* frame-box ' + el.id + ' — decoración, sin lógica */\n\n';
    }

    else if (el.tipo === 'separator-h') {
      var col = p.color || '#1a1a18';
      htmlEls += '<div style="' + st + 'display:flex;align-items:center;gap:8px;box-sizing:border-box;">' +
        '<div style="flex:1;height:1px;background:' + col + '"></div>' +
        (p.label ? '<span style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:' + col + '">' + escHtml(p.label) + '</span><div style="flex:1;height:1px;background:' + col + '"></div>' : '') +
        '</div>\n';
      jsEls += '/* separator-h ' + el.id + ' — decoración, sin lógica */\n\n';
    }

    else if (el.tipo === 'title-banner') {
      var col = p.color || '#1a1a18';
      htmlEls += '<div style="' + st + 'background:' + col + ';border-radius:3px;display:flex;align-items:center;padding:0 16px;gap:10px;overflow:hidden;box-sizing:border-box;">' +
        (p.icon ? '<span style="font-size:16px;flex-shrink:0">' + escHtml(p.icon) + '</span>' : '') +
        '<div style="flex:1;overflow:hidden;">' +
          '<div style="font-family:DM Sans,sans-serif;font-size:' + fs + ';font-weight:600;color:#f0f0e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(p.text||'') + '</div>' +
          (p.subtext ? '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:rgba(240,240,232,.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">' + escHtml(p.subtext) + '</div>' : '') +
        '</div>' +
        (p.badge ? '<div style="font-family:DM Mono,monospace;font-size:7px;letter-spacing:1px;padding:2px 8px;border-radius:2px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.5);flex-shrink:0">' + escHtml(p.badge) + '</div>' : '') +
        '</div>\n';
      jsEls += '/* title-banner ' + el.id + ' — decoración, sin lógica */\n\n';
    }

    else if (el.tipo === 'text-block') {
      var lines2 = (p.text||'').split('\n').map(function(l){ return '<p style="margin:0 0 4px">' + escHtml(l) + '</p>'; }).join('');
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #e8e8e0;border-radius:3px;padding:8px 10px;overflow:hidden;box-sizing:border-box;font-family:DM Sans,sans-serif;font-size:' + fs + ';color:#3a3a36;line-height:1.7">' + lines2 + '</div>\n';
      jsEls += '/* text-block ' + el.id + ' — estático, sin lógica */\n\n';
    }

    else if (el.tipo === 'shape-rect') {
      var fill   = p.fill || '#1565c0';
      var fo     = p.fillOpacity !== undefined ? p.fillOpacity : 0.15;
      var stroke = p.stroke || '#1565c0';
      var sw     = p.strokeWidth !== undefined ? p.strokeWidth : 2;
      var rx     = p.radius !== undefined ? p.radius : 0;
      htmlEls += '<svg style="' + st + 'overflow:visible;" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">' +
        '<rect x="' + (sw/2) + '" y="' + (sw/2) + '" width="' + (el.w - sw) + '" height="' + (el.h - sw) + '" rx="' + rx + '" ry="' + rx + '"' +
        ' fill="' + fill + '" fill-opacity="' + fo + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
        '</svg>\n';
      jsEls += '/* shape-rect ' + el.id + ' — decoración, sin lógica */\n\n';
    }

    else if (el.tipo === 'shape-circle') {
      var fill   = p.fill || '#2e7d32';
      var fo     = p.fillOpacity !== undefined ? p.fillOpacity : 0.15;
      var stroke = p.stroke || '#2e7d32';
      var sw     = p.strokeWidth !== undefined ? p.strokeWidth : 2;
      var cx2    = el.w / 2;
      var cy2    = el.h / 2;
      htmlEls += '<svg style="' + st + 'overflow:visible;" xmlns="http://www.w3.org/2000/svg">' +
        '<ellipse cx="' + cx2 + '" cy="' + cy2 + '" rx="' + (cx2 - sw/2) + '" ry="' + (cy2 - sw/2) + '"' +
        ' fill="' + fill + '" fill-opacity="' + fo + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
        '</svg>\n';
      jsEls += '/* shape-circle ' + el.id + ' — decoración, sin lógica */\n\n';
    }

    else if (el.tipo === 'shape-line') {
      var stroke = p.stroke || '#1a1a18';
      var sw     = p.strokeWidth !== undefined ? p.strokeWidth : 2;
      var angle  = p.angle !== undefined ? p.angle : 0;
      var cap    = p.cap || 'round';
      var rad    = angle * Math.PI / 180;
      var cx2 = el.w / 2; var cy2 = el.h / 2;
      var lenX = Math.abs(Math.cos(rad)) * (el.w / 2 - 2);
      var lenY = Math.abs(Math.sin(rad)) * (el.h / 2 - 2);
      var len  = Math.min(lenX || (el.w/2-2), lenY || (el.h/2-2));
      var x1   = Math.round(cx2 - Math.cos(rad) * (el.w/2 - 2));
      var y1   = Math.round(cy2 - Math.sin(rad) * (el.h/2 - 2));
      var x2   = Math.round(cx2 + Math.cos(rad) * (el.w/2 - 2));
      var y2   = Math.round(cy2 + Math.sin(rad) * (el.h/2 - 2));
      htmlEls += '<svg style="' + st + 'overflow:visible;" xmlns="http://www.w3.org/2000/svg">' +
        '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' +
        ' stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="' + cap + '"/>' +
        '</svg>\n';
      jsEls += '/* shape-line ' + el.id + ' — decoración, sin lógica */\n\n';
    }

    else if (el.tipo === 'shape-curve') {
      var stroke    = p.stroke || '#c62828';
      var sw        = p.strokeWidth !== undefined ? p.strokeWidth : 2;
      var curvature = p.curvature !== undefined ? p.curvature : 50;
      var cap       = p.cap || 'round';
      var qy        = (el.h / 2) - curvature * (el.h / 100);
      htmlEls += '<svg style="' + st + 'overflow:visible;" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M' + sw + ',' + (el.h/2) + ' Q' + (el.w/2) + ',' + qy + ' ' + (el.w-sw) + ',' + (el.h/2) + '"' +
        ' fill="none" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="' + cap + '"/>' +
        '</svg>\n';
      jsEls += '/* shape-curve ' + el.id + ' — decoración, sin lógica */\n\n';
    }

    else if (el.tipo === 'shape-triangle') {
      var fill   = p.fill || '#f57c00';
      var fo     = p.fillOpacity !== undefined ? p.fillOpacity : 0.15;
      var stroke = p.stroke || '#f57c00';
      var sw     = p.strokeWidth !== undefined ? p.strokeWidth : 2;
      var dir    = p.direction || 'up';
      var w2 = el.w; var h2 = el.h; var s = sw;
      var pts2;
      if (dir === 'up')    pts2 = (w2/2)+','+(s)      + ' '+(w2-s)+','+(h2-s) + ' '+s+','+(h2-s);
      if (dir === 'down')  pts2 = s+','+s             + ' '+(w2-s)+','+s      + ' '+(w2/2)+','+(h2-s);
      if (dir === 'left')  pts2 = (w2-s)+','+s        + ' '+(w2-s)+','+(h2-s) + ' '+s+','+(h2/2);
      if (dir === 'right') pts2 = s+','+s             + ' '+(w2-s)+','+(h2/2) + ' '+s+','+(h2-s);
      htmlEls += '<svg style="' + st + 'overflow:visible;" xmlns="http://www.w3.org/2000/svg">' +
        '<polygon points="' + pts2 + '"' +
        ' fill="' + fill + '" fill-opacity="' + fo + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
        '</svg>\n';
      jsEls += '/* shape-triangle ' + el.id + ' — decoración, sin lógica */\n\n';
    }

    else if (el.tipo === 'tooltip-node') {
      var tnShape  = p.shape    || 'rect';
      var tnFill   = (p.fillColor   !== undefined && p.fillColor   !== '') ? p.fillColor   : '#e3f0ff';
      var tnStroke = (p.strokeColor !== undefined && p.strokeColor !== '') ? p.strokeColor : '#1565c0';
      var tnHideSvg = (tnShape === 'none') || (tnFill === 'transparent' && tnStroke === 'transparent');
      var tnFont   = p.fontColor   || '#1a1a18';
      var tnFs     = (p.fontSize || 11) + 'px';
      var tnText   = escHtml(p.text || 'NODE');
      var tnConns  = [p.conn1,p.conn2,p.conn3,p.conn4].filter(function(c){return c && c.trim();});
      var tnNotes  = p.notes ? escHtml(p.notes) : '';
      /* tooltip HTML */
      var ttLines = '';
      if (tnConns.length) {
        ttLines += '<div style=\"font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:#6a6a5a;margin-bottom:5px;\">⬡ CONEXIONES</div>';
        tnConns.forEach(function(c){ ttLines += '<div style=\"font-family:DM Mono,monospace;font-size:10px;color:#00e5b0;padding:2px 0;\">' + escHtml(c) + '</div>'; });
      }
      if (tnNotes) ttLines += '<div style=\"font-family:DM Mono,monospace;font-size:9px;color:#b8b8a8;margin-top:6px;padding-top:6px;border-top:1px solid #3a3a30;white-space:pre-wrap;\">' + tnNotes + '</div>';
      if (!ttLines) ttLines = '<div style=\"font-family:DM Mono,monospace;font-size:9px;color:#5a5a4a;font-style:italic;\">Sin conexiones</div>';
      /* SVG shape path */
      var shapeSvg = '';
      var tnShapeId = 'tnshp_' + el.id;
      if (tnShape === 'circle') {
        shapeSvg = '<ellipse id=\"' + tnShapeId + '\" cx=\"50\" cy=\"50\" rx=\"48\" ry=\"48\" fill=\"' + tnFill + '\" stroke=\"' + tnStroke + '\" stroke-width=\"2\"/>';
      } else if (tnShape === 'diamond') {
        shapeSvg = '<polygon id=\"' + tnShapeId + '\" points=\"50,2 98,50 50,98 2,50\" fill=\"' + tnFill + '\" stroke=\"' + tnStroke + '\" stroke-width=\"2\"/>';
      } else if (tnShape === 'hexagon') {
        shapeSvg = '<polygon id=\"' + tnShapeId + '\" points=\"50,2 93,25 93,75 50,98 7,75 7,25\" fill=\"' + tnFill + '\" stroke=\"' + tnStroke + '\" stroke-width=\"2\"/>';
      } else if (tnShape === 'rounded') {
        shapeSvg = '<rect id=\"' + tnShapeId + '\" x=\"2\" y=\"2\" width=\"96\" height=\"96\" rx=\"20\" ry=\"20\" fill=\"' + tnFill + '\" stroke=\"' + tnStroke + '\" stroke-width=\"2\"/>';
      } else if (tnShape === 'parallelogram') {
        shapeSvg = '<polygon id=\"' + tnShapeId + '\" points=\"18,2 98,2 82,98 2,98\" fill=\"' + tnFill + '\" stroke=\"' + tnStroke + '\" stroke-width=\"2\"/>';
      } else {
        shapeSvg = '<rect id=\"' + tnShapeId + '\" x=\"2\" y=\"2\" width=\"96\" height=\"96\" fill=\"' + tnFill + '\" stroke=\"' + tnStroke + '\" stroke-width=\"2\"/>';
      }
      htmlEls +=
        '<div id="tnwrap_' + el.id + '" style="' + st + 'display:flex;align-items:center;justify-content:center;cursor:default;" ' +
          'onmouseenter="this.querySelector(\'.tn-tt-g\').style.display=\'block\';" ' +
          'onmouseleave="this.querySelector(\'.tn-tt-g\').style.display=\'none\';">' +
          (tnHideSvg ? '' : '<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" viewBox="0 0 100 100" preserveAspectRatio="none">' +
            shapeSvg +
          '</svg>') +
          '<div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none;">' +
            '<div data-tnlbl="1" style="font-family:DM Mono,monospace;font-weight:600;letter-spacing:1px;font-size:' + tnFs + ';color:' + tnFont + ';text-align:center;line-height:1.2;">' + tnText + '</div>' +
            (p.showValue && p.var1 && p.var1.trim() ? '<div id="tnv_' + el.id + '" style="font-family:DM Mono,monospace;font-size:' + Math.max(8,(p.fontSize||11)-1) + 'px;color:' + (p.valueColor||'#00e5b0') + ';font-weight:700;letter-spacing:.5px;">—</div>' : '') +
          '</div>' +
          '<div class="tn-tt-g" style="display:none;position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);' +
            'z-index:9999;background:#1a1a18;border:1px solid #3a3a30;border-radius:5px;padding:9px 11px;' +
            'min-width:180px;max-width:260px;box-shadow:0 6px 24px rgba(0,0,0,.45);pointer-events:none;white-space:nowrap;">' +
            ttLines +
            '<div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);' +
              'border:6px solid transparent;border-top-color:#1a1a18;"></div>' +
          '</div>' +
        '</div>\n';
      /* ── PLC polling para tooltip-node ── */
      var tnVar1 = p.var1 && p.var1.trim() ? p.var1 : '';
      var tnShowVal = p.showValue && tnVar1;
      if (tnVar1) {
        registrarVar(tnVar1);
        var tnVk = claveJs(tnVar1);
        var tnValCol = p.valueColor || '#00e5b0';
        var tnUnit   = p.unit ? escHtml(p.unit) : '';
        var tnUnitHtml = tnUnit ? ' <span style=\"opacity:.6;font-size:9px\">' + tnUnit + '</span>' : '';
        var tnPoll = p.pollMs || 500;
        /* Mostrar en tooltip siempre (valor en vivo dentro del tooltip) */
        var tnActiveFill   = p.useActiveColor ? (p.activeFill   || '#2e7d32') : '';
        var tnActiveStroke = p.useActiveColor ? (p.activeStroke || '#00c853') : '';
        var tnActiveFont   = p.useActiveColor ? (p.activeFont   || '#ffffff') : '';
        jsPolling +=
          'setInterval(function(){\n' +
          '  plcLeer(vars.' + tnVk + ', function(v){\n' +
          '    var raw = (v !== null && v !== undefined) ? String(v) : "\u2014";\n' +
          '    var tv = document.getElementById("tnvt_' + el.id + '");\n' +
          '    if(tv) tv.textContent = raw;\n' +
          (tnShowVal ?
          '    var nv = document.getElementById("tnv_' + el.id + '");\n' +
          '    if(nv) nv.innerHTML = raw + "' + tnUnitHtml.replace(/"/g, '\\\"') + '";\n' : '') +
          (p.useActiveColor ? (
          '    /* cambio de color según valor */\n' +
          '    var activo = (v===true||v==="true"||v===1||v==="1"||(v!==null&&v!==undefined&&v!==false&&v!=="false"&&v!==0&&v!=="0"));\n' +
          '    var shp  = document.getElementById("tnshp_' + el.id + '");\n' +
          '    var wrap = document.getElementById("tnwrap_' + el.id + '");\n' +
          '    var txt  = wrap ? wrap.querySelector("[data-tnlbl]") : null;\n' +
          '    if(shp){\n' +
          '      shp.setAttribute("fill",   activo ? "' + tnActiveFill   + '" : "' + tnFill   + '");\n' +
          '      shp.setAttribute("stroke", activo ? "' + tnActiveStroke + '" : "' + tnStroke + '");\n' +
          '    } else if(wrap) {\n' +
          '      /* sin forma SVG: cambiar fondo del wrapper */\n' +
          '      wrap.style.background = activo ? "' + tnActiveFill + '" : "";\n' +
          '      wrap.style.borderRadius = activo ? "3px" : "";\n' +
          '    }\n' +
          '    if(txt) txt.style.color = activo ? "' + tnActiveFont + '" : "' + tnFont + '";\n'
          ) : '') +
          '  });\n' +
          '}, ' + tnPoll + ');\n\n';
        /* Inyectar fila de valor en vivo dentro del tooltip via DOM patch */
        jsEls +=
          '(function(){\n' +
          '  var wrap = document.getElementById("tnwrap_' + el.id + '");\n' +
          '  if(!wrap) return;\n' +
          '  var tt = wrap.querySelector(".tn-tt-g");\n' +
          '  if(!tt) return;\n' +
          '  var liveRow = document.createElement("div");\n' +
          '  liveRow.style.cssText = "font-family:DM Mono,monospace;font-size:10px;color:' + tnValCol + ';margin-top:6px;padding-top:6px;border-top:1px solid #3a3a30;display:flex;align-items:baseline;gap:4px;";\n' +
          '  liveRow.innerHTML = \'<span style="font-size:8px;color:#6a6a5a;letter-spacing:2px;margin-right:4px;">\u2b1f VALOR</span><span id="tnvt_' + el.id + '">\u2014</span>\' + ' + JSON.stringify(tnUnitHtml) + ';\n' +
          '  tt.appendChild(liveRow);\n' +
          '})();\n\n';
      }
      jsEls += '/* tooltip-node ' + el.id + (tnVar1 ? ' — con polling PLC' : ' — anotación estática') + ' */\n\n';
    }

    /* ══════════════ POPUP BTN ══════════════ */
    else if (el.tipo === 'popup-btn') {
      var pbLabel   = escHtml(p.label   || 'VER DETALLE');
      var pbIcon    = escHtml(p.icon    || '⬡');
      var pbColor   = p.color     || '#1565c0';
      var pbTextC   = p.textColor || '#ffffff';
      var pbFs      = (p.fontSize || 12) + 'px';
      var pbPopupId = 'popup_' + el.id;
      var pbTitle   = escHtml(p.popupTitle || 'Detalle');
      var pbBg      = p.popupBg   || '#ffffff';

      var popupData = (typeof POPUPS !== 'undefined' && POPUPS[el.id]) ? POPUPS[el.id] : null;
      var pbW = (popupData && popupData.w) || p.popupW || 700;
      var pbH = (popupData && popupData.h) || p.popupH || 480;
      var pbEls = (popupData && popupData.els) ? popupData.els : [];

      /* ── Botón en el canvas ── */
      htmlEls +=
        '<button id="' + el.id + '" onclick="abrirPopup_' + el.id + '()" ' +
          'style="' + st + 'background:' + pbColor + ';color:' + pbTextC + ';' +
          'border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;' +
          'justify-content:center;gap:7px;font-family:DM Mono,monospace;' +
          'font-size:' + pbFs + ';font-weight:600;letter-spacing:.5px;' +
          'box-shadow:0 2px 8px rgba(0,0,0,.15);transition:opacity .15s;" ' +
          'onmouseenter="this.style.opacity=.85" onmouseleave="this.style.opacity=1">' +
          '<span style="font-size:' + (parseInt(pbFs)+2) + 'px">' + pbIcon + '</span>' +
          '<span>' + pbLabel + '</span>' +
        '</button>\n';

      /* ── Overlay del popup — se añade a htmlPopups (FUERA del canvas) ── */
      htmlPopups +=
        '<div id="' + pbPopupId + '" style="display:none;position:fixed;inset:0;' +
          'z-index:8000;background:rgba(0,0,0,.55);backdrop-filter:blur(3px);" ' +
          'onclick="if(event.target===this) cerrarPopup_' + el.id + '()">' +
          '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
            'width:' + pbW + 'px;max-width:96vw;' +
            'background:' + pbBg + ';border-radius:8px;' +
            'box-shadow:0 8px 40px rgba(0,0,0,.35);overflow:hidden;">' +
            '<div style="padding:10px 16px;border-bottom:1px solid #e8e8e0;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.04);flex-shrink:0;">' +
              '<span style="font-family:DM Mono,monospace;font-size:11px;color:#1a1a16;font-weight:600;flex:1">' + pbTitle + '</span>' +
              '<button onclick="cerrarPopup_' + el.id + '()" ' +
                'style="width:26px;height:26px;border-radius:50%;border:none;background:rgba(0,0,0,.08);' +
                'color:#6a6a62;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">' +
                '×</button>' +
            '</div>' +
            '<div style="position:relative;width:' + pbW + 'px;height:' + pbH + 'px;overflow:auto;">' +

      (function() {
        var innerHtml = '';
        pbEls.forEach(function(pel) {
          var pelSt = 'position:absolute;left:' + pel.x + 'px;top:' + (pel.y - 36) + 'px;' +
                      'width:' + pel.w + 'px;height:' + pel.h + 'px;box-sizing:border-box;overflow:' + (pel.tipo==='frame-box'?'visible':'hidden') + ';';
          var pelHtml = (function(pel, pelSt) {
            var pp = pel.props || {};
            var pfs = (pp.fontSize || 11) + 'px';
            var tipo = pel.tipo;
            var inner = '';

            /* ── helper: genera polling JS para un elemento del popup ── */
            function pelPoll(vk, v_expr, interval) {
              if (!vk) return;
              jsPolling += 'setInterval(function(){ plcLeer(vars.' + vk + ', function(v){' + v_expr + '}); },' + (interval||500) + ');\n';
            }

            /* ════════════ BOTONES ════════════ */
            if (tipo === 'btn-simple' || tipo === 'btn-led') {
              var bc = pp.color||'#1565c0', btc = pp.textColor||'#fff';
              var bvk = pp.var1 ? claveJs(pp.var1) : null;
              var fnId = 'act_pop_' + pel.id;
              if (bvk) {
                registrarVar(pp.var1);
                var ms = pp.pulseMs||800; var act = pp.action||'pulse';
                jsEls += 'function ' + fnId + '(){\n  btnAccion(function(){\n';
                if (act==='toggle') { jsEls += '    var cv=vars.'+bvk+'_val;plcEscribir(vars.'+bvk+',!cv);\n'; }
                else { jsEls += '    plcEscribir(vars.'+bvk+',true);setTimeout(function(){plcEscribir(vars.'+bvk+',false);},'+ms+');\n'; }
                jsEls += '  });\n}\n';
              }
              var ledHtml = '';
              if (tipo === 'btn-led' && bvk) {
                ledHtml = '<div id="led_'+pel.id+'" style="width:9px;height:9px;border-radius:50%;background:#d0d0c8;flex-shrink:0;transition:all .3s"></div>';
                jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var on=(v===true||v===1||v==="true");var d=document.getElementById("led_'+pel.id+'");if(d){d.style.background=on?"#00c853":"#d0d0c8";d.style.boxShadow=on?"0 0 6px #00c85388":"none";}});},500);\n';
              }
              inner = '<button onclick="'+(bvk?fnId+'()':'')+'" style="width:100%;height:100%;background:'+bc+';color:'+btc+';border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;font-family:DM Mono,monospace;font-size:'+pfs+';font-weight:600;">'+ledHtml+escHtml(pp.text||'BTN')+'</button>';
            }
            else if (tipo === 'btn-toggle') {
              var bvk = pp.var1 ? claveJs(pp.var1) : null;
              var bc = pp.color||'#1565c0', btc = pp.textColor||'#fff';
              if (bvk) {
                registrarVar(pp.var1);
                jsEls += 'var _tg_'+pel.id+'=false;\n';
                jsEls += 'function act_pop_'+pel.id+'(){btnAccion(function(){_tg_'+pel.id+'=!_tg_'+pel.id+';plcEscribir(vars.'+bvk+',_tg_'+pel.id+');var b=document.getElementById("btn_pop_'+pel.id+'");if(b){b.style.background=_tg_'+pel.id+'?"#2e7d32":"'+bc+'";}});}\n';
                jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){_tg_'+pel.id+'=(v===true||v===1);var b=document.getElementById("btn_pop_'+pel.id+'");if(b)b.style.background=_tg_'+pel.id+'?"#2e7d32":"'+bc+'";});},500);\n';
              }
              inner = '<button id="btn_pop_'+pel.id+'" onclick="'+(bvk?'act_pop_'+pel.id+'()':'')+'" style="width:100%;height:100%;background:'+bc+';color:'+btc+';border:none;border-radius:4px;cursor:pointer;font-family:DM Mono,monospace;font-size:'+pfs+';font-weight:600;">'+escHtml(pp.text||'ON/OFF')+'</button>';
            }
            else if (tipo === 'btn-emergency') {
              var bvk = pp.var1 ? claveJs(pp.var1) : null;
              if (bvk) { registrarVar(pp.var1); jsEls += 'function act_pop_'+pel.id+'(){btnAccion(function(){plcEscribir(vars.'+bvk+',true);});}\n'; }
              inner = '<button onclick="'+(bvk?'act_pop_'+pel.id+'()':'')+'" style="width:100%;height:100%;background:#c62828;color:#fff;border:4px solid #8b0000;border-radius:50%;cursor:pointer;font-family:DM Mono,monospace;font-size:'+pfs+';font-weight:700;">'+escHtml(pp.text||'⬤ STOP')+'</button>';
            }
            else if (tipo === 'btn-set-reset') {
              var v1 = pp.var1?claveJs(pp.var1):null, v2 = pp.var2?claveJs(pp.var2):null;
              if (v1) registrarVar(pp.var1); if (v2) registrarVar(pp.var2);
              jsEls += 'function act_set_'+pel.id+'(){btnAccion(function(){'+(v1?'plcEscribir(vars.'+v1+',true);':'')+'});}\n';
              jsEls += 'function act_rst_'+pel.id+'(){btnAccion(function(){'+(v2?'plcEscribir(vars.'+v2+',false);':'')+'});}\n';
              inner = '<div style="width:100%;height:100%;display:flex;gap:4px;">' +
                '<button onclick="act_set_'+pel.id+'()" style="flex:1;background:#2e7d32;color:#fff;border:none;border-radius:3px;cursor:pointer;font-family:DM Mono,monospace;font-size:'+pfs+';font-weight:600;">'+escHtml(pp.textSet||'SET')+'</button>' +
                '<button onclick="act_rst_'+pel.id+'()" style="flex:1;background:#c62828;color:#fff;border:none;border-radius:3px;cursor:pointer;font-family:DM Mono,monospace;font-size:'+pfs+';font-weight:600;">'+escHtml(pp.textReset||'RST')+'</button>' +
              '</div>';
            }
            else if (tipo === 'btn-confirm') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              if (bvk) { registrarVar(pp.var1); jsEls += 'var _cf_'+pel.id+'=0;function act_pop_'+pel.id+'(){var now=Date.now();if(now-_cf_'+pel.id+'<800){btnAccion(function(){plcEscribir(vars.'+bvk+',true);setTimeout(function(){plcEscribir(vars.'+bvk+',false);},800);});_cf_'+pel.id+'=0;}else{_cf_'+pel.id+'=now;}}\n'; }
              inner = '<button onclick="act_pop_'+pel.id+'()" style="width:100%;height:100%;background:#e65100;color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:DM Mono,monospace;font-size:'+pfs+';font-weight:600;">'+escHtml(pp.text||'CONFIRMAR')+'</button>';
            }
            else if (tipo === 'btn-multistate') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var stArr = (pp.states||'STOP,AUTO,MAN').split(',');
              var colArr= (pp.colors||'#c62828,#2e7d32,#1565c0').split(',');
              if (bvk) { registrarVar(pp.var1); jsEls += 'var _ms_'+pel.id+'=0;function act_pop_'+pel.id+'(){_ms_'+pel.id+'=(_ms_'+pel.id+'+1)%'+stArr.length+';btnAccion(function(){plcEscribir(vars.'+bvk+',_ms_'+pel.id+');var b=document.getElementById("msbtn_'+pel.id+'");var s='+JSON.stringify(stArr)+';var c='+JSON.stringify(colArr)+';if(b){b.textContent=s[_ms_'+pel.id+']||s[0];b.style.background=c[_ms_'+pel.id+']||c[0];}});}\n'; }
              inner = '<button id="msbtn_'+pel.id+'" onclick="'+(bvk?'act_pop_'+pel.id+'()':'')+'" style="width:100%;height:100%;background:'+(colArr[0]||'#1565c0')+';color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:DM Mono,monospace;font-size:'+pfs+';font-weight:600;">'+(stArr[0]||'MODO')+'</button>';
            }
            else if (tipo === 'btn-jog') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              if (bvk) { registrarVar(pp.var1); jsEls += 'function jog_dn_'+pel.id+'(){plcEscribir(vars.'+bvk+',true);}function jog_up_'+pel.id+'(){plcEscribir(vars.'+bvk+',false);}\n'; }
              inner = '<button onmousedown="jog_dn_'+pel.id+'()" onmouseup="jog_up_'+pel.id+'()" ontouchstart="jog_dn_'+pel.id+'()" ontouchend="jog_up_'+pel.id+'()" style="width:100%;height:100%;background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:DM Mono,monospace;font-size:'+pfs+';font-weight:600;">'+escHtml(pp.text||'JOG ▶')+'</button>';
            }
            else if (tipo === 'btn-selector') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var opts = [pp.opt1||'OPC 1', pp.opt2||'OPC 2', pp.opt3].filter(Boolean);
              if (bvk) { registrarVar(pp.var1); jsEls += 'function sel_pop_'+pel.id+'(v){plcEscribir(vars.'+bvk+',v);}\n'; }
              inner = '<div style="width:100%;height:100%;display:flex;gap:2px;">' +
                opts.map(function(o,i){ return '<button onclick="sel_pop_'+pel.id+'('+i+')" style="flex:1;background:#1565c0;color:#fff;border:none;border-radius:3px;cursor:pointer;font-family:DM Mono,monospace;font-size:'+(parseInt(pfs)-2)+'px;font-weight:600;">'+escHtml(o)+'</button>'; }).join('') +
              '</div>';
            }
            else if (tipo === 'spinbox') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var sv_min=parseFloat(pp.min)||0, sv_max=parseFloat(pp.max)||100, sv_step=parseFloat(pp.step)||1;
              if (bvk) { registrarVar(pp.var1); jsEls += 'var _spv_'+pel.id+'='+sv_min+';function sp_ch_'+pel.id+'(d){_spv_'+pel.id+'=Math.max('+sv_min+',Math.min('+sv_max+',_spv_'+pel.id+'+d));var e=document.getElementById("spv_'+pel.id+'");if(e)e.textContent=_spv_'+pel.id+'.toFixed('+((sv_step<1)?1:0)+');plcEscribir(vars.'+bvk+',_spv_'+pel.id+');}\n'; }
              inner = '<div style="width:100%;height:100%;background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:4px;box-sizing:border-box;">' +
                (pp.label?'<div style="font-family:DM Mono,monospace;font-size:8px;color:#6a6a62">'+escHtml(pp.label)+'</div>':'') +
                '<div style="display:flex;align-items:center;gap:6px;">' +
                  '<button onclick="sp_ch_'+pel.id+'(-'+sv_step+')" style="width:28px;height:28px;background:#1565c0;color:#fff;border:none;border-radius:3px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">−</button>' +
                  '<div id="spv_'+pel.id+'" style="font-family:DM Mono,monospace;font-size:14px;font-weight:700;min-width:40px;text-align:center">'+sv_min+'</div>' +
                  '<button onclick="sp_ch_'+pel.id+'('+sv_step+')" style="width:28px;height:28px;background:#1565c0;color:#fff;border:none;border-radius:3px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">+</button>' +
                '</div>' +
                (pp.unit?'<div style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">'+escHtml(pp.unit)+'</div>':'') +
              '</div>';
            }
            else if (tipo === 'slider-h' || tipo === 'slider-v') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var sl_min=parseFloat(pp.min)||0, sl_max=parseFloat(pp.max)||100;
              if (bvk) { registrarVar(pp.var1); jsEls += 'function sl_ch_'+pel.id+'(v){plcEscribir(vars.'+bvk+',parseFloat(v));}\n'; }
              var isV = tipo==='slider-v';
              inner = '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px;box-sizing:border-box;">' +
                (pp.label?'<div style="font-family:DM Mono,monospace;font-size:9px;color:#6a6a62">'+escHtml(pp.label)+'</div>':'') +
                '<input type="range" min="'+sl_min+'" max="'+sl_max+'" value="'+sl_min+'" '+(isV?'orient="vertical" style="writing-mode:vertical-lr;direction:rtl;height:80%;width:32px;"':'style="width:90%;"')+' oninput="sl_ch_'+pel.id+'(this.value)">' +
              '</div>';
            }
            /* ════════════ INDICADORES ════════════ */
            else if (tipo === 'status-led') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var col = pp.colorOn||'#00c853';
              if (bvk) {
                registrarVar(pp.var1);
                jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var on=(v===true||v===1||v==="true"||v==="1");var d=document.getElementById("led_'+pel.id+'");if(d){d.style.background=on?"'+col+'":"#d0d0c8";d.style.boxShadow=on?"0 0 8px '+col+'88":"none";}});},500);\n';
              }
              inner = '<div style="width:100%;height:100%;display:flex;align-items:center;gap:8px;padding:4px 8px;box-sizing:border-box;">' +
                '<div id="led_'+pel.id+'" style="width:16px;height:16px;border-radius:50%;background:#d0d0c8;flex-shrink:0;transition:all .3s"></div>' +
                '<span style="font-family:DM Mono,monospace;font-size:'+pfs+';color:#1a1a16;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(pp.label||'')+'</span>' +
              '</div>';
            }
            else if (tipo === 'indicator-text') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var ton=pp.textOn||'ACTIVO', toff=pp.textOff||'PARADO';
              var con=pp.colorOn||'#00c853', coff=pp.colorOff||'#9a9a90';
              if (bvk) {
                registrarVar(pp.var1);
                jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var on=(v===true||v===1||v==="true");var d=document.getElementById("indtext_'+pel.id+'");if(d){d.textContent=on?"'+ton.replace(/"/g,'\"')+'":"'+toff.replace(/"/g,'\"')+'";d.style.color=on?"'+con+'":"'+coff+'";d.style.borderColor=on?"'+con+'":"'+coff+'";d.style.background=on?"'+con+'22":"'+coff+'11";}});},500);\n';
              }
              inner = '<div id="indtext_'+pel.id+'" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:'+pfs+';font-weight:700;letter-spacing:1px;border-radius:3px;border:2px solid '+coff+';color:'+coff+';background:'+coff+'11;transition:all .3s;">'+escHtml(toff)+'</div>';
            }
            else if (tipo === 'signal-lamp') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var con=pp.colorOn||'#00c853', coff=pp.colorOff||'#9a9a90';
              if (bvk) {
                registrarVar(pp.var1);
                jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var on=(v===true||v===1||v==="true");var d=document.getElementById("slamp_'+pel.id+'");if(d){d.style.background=on?"'+con+'":"'+coff+'";d.style.boxShadow=on?"0 0 12px '+con+'88":"none";}});},500);\n';
              }
              inner = '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:#1a1a14;border-radius:4px;">' +
                '<div id="slamp_'+pel.id+'" style="width:60%;padding-bottom:60%;border-radius:50%;background:'+coff+';transition:all .4s;max-width:48px;max-height:48px;padding-bottom:0;height:48px;"></div>' +
                (pp.label?'<div style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">'+escHtml(pp.label)+'</div>':'') +
              '</div>';
            }
            else if (tipo === 'signal-tower') {
              var colors = ['#ef5350','#ffca28','#66bb6a'];
              var vars_ = [pp.var1,pp.var2,pp.var3];
              vars_.forEach(function(v,i){ if(v){ registrarVar(v); jsPolling += 'setInterval(function(){plcLeer(vars.'+claveJs(v)+',function(v){var on=(v===true||v===1||v==="true");var d=document.getElementById("stwr_'+pel.id+'_'+i+'");if(d){d.style.background=on?"'+colors[i]+'":"rgba(255,255,255,.1)";d.style.boxShadow=on?"0 0 8px '+colors[i]+'88":"none";}});},500);\n'; }});
              inner = '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:#1a1a14;border-radius:4px;padding:6px;box-sizing:border-box;">' +
                [0,1,2].map(function(i){ return '<div id="stwr_'+pel.id+'_'+i+'" style="width:80%;flex:1;border-radius:4px;background:rgba(255,255,255,.1);transition:all .4s;min-height:14px;"></div>'; }).join('') +
              '</div>';
            }
            else if (tipo === 'multibit-led') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              if (bvk) {
                registrarVar(pp.var1);
                jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(val){if(val===null||val===undefined)return;var w=parseInt(val)||0;for(var b=0;b<16;b++){var d=document.getElementById("mbl_'+pel.id+'_"+b);if(d){var on=(w>>b)&1;d.style.background=on?"#00c853":"rgba(255,255,255,.12)";d.style.boxShadow=on?"0 0 4px #00c85388":"none";}}});},500);\n';
              }
              var bits=[]; for(var b=0;b<16;b++) bits.push('<div id="mbl_'+pel.id+'_'+b+'" style="flex:1;height:10px;border-radius:2px;background:rgba(255,255,255,.12);transition:all .3s;" title="Bit '+b+'"></div>');
              inner = '<div style="width:100%;height:100%;background:#1a1a14;border-radius:3px;display:flex;flex-direction:column;gap:3px;padding:6px;box-sizing:border-box;">' +
                (pp.label?'<div style="font-family:DM Mono,monospace;font-size:8px;color:#6a6a62;letter-spacing:1px">'+escHtml(pp.label)+'</div>':'') +
                '<div style="display:flex;gap:2px;flex-wrap:wrap;">'+bits.join('')+'</div>' +
              '</div>';
            }
            /* ════════════ DATOS ════════════ */
            else if (tipo === 'display') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var d=document.getElementById("dsp_'+pel.id+'");if(d&&v!==null&&v!==undefined){var n=typeof v==="number"?v.toFixed('+(pp.decimals||1)+'):v;d.textContent=n;}});},500);\n'; }
              inner = '<div style="width:100%;height:100%;background:#0f0f0d;border:1px solid #2a2a28;border-radius:3px;display:flex;align-items:center;gap:6px;padding:0 10px;box-sizing:border-box;">' +
                (pp.label?'<span style="font-family:DM Mono,monospace;font-size:9px;color:#5a5a52;flex-shrink:0">'+escHtml(pp.label)+'</span>':'') +
                '<span id="dsp_'+pel.id+'" style="font-family:DM Mono,monospace;font-size:'+pfs+';color:#f0f0e8;font-weight:500;flex:1;text-align:right">—</span>' +
                (pp.unit?'<span style="font-family:DM Mono,monospace;font-size:9px;color:#5a5a52">'+escHtml(pp.unit)+'</span>':'') +
              '</div>';
            }
            else if (tipo === 'numeric-display') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var ndc = pp.color||'#00e5b0', ndbg = pp.bg||'#1a1a16';
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var d=document.getElementById("ndv_'+pel.id+'");if(d&&v!==null&&v!==undefined)d.textContent=typeof v==="number"?v.toFixed(1):v;});},500);\n'; }
              inner = '<div style="width:100%;height:100%;background:'+ndbg+';border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:4px;box-sizing:border-box;">' +
                (pp.label?'<div style="font-family:DM Mono,monospace;font-size:9px;color:rgba(255,255,255,.4);letter-spacing:1px">'+escHtml(pp.label)+'</div>':'') +
                '<div id="ndv_'+pel.id+'" style="font-family:DM Mono,monospace;font-size:'+(pp.fontSize||24)+'px;color:'+ndc+';font-weight:700;line-height:1">—</div>' +
                (pp.unit?'<div style="font-family:DM Mono,monospace;font-size:9px;color:'+ndc+'88">'+escHtml(pp.unit)+'</div>':'') +
              '</div>';
            }
            else if (tipo === 'progress-bar') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var pbmin=parseFloat(pp.min)||0, pbmax=parseFloat(pp.max)||100, pbc=pp.color||'#1565c0';
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){if(v===null||v===undefined)return;var pct=Math.max(0,Math.min(100,(parseFloat(v)-'+pbmin+')/('+pbmax+'-'+pbmin+')*100));var f=document.getElementById("pbf_'+pel.id+'");var t=document.getElementById("pbv_'+pel.id+'");if(f)f.style.width=pct+"%";if(t)t.textContent=typeof v==="number"?v.toFixed(1):v;});},500);\n'; }
              inner = '<div style="width:100%;height:100%;background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;padding:6px 10px;box-sizing:border-box;">' +
                '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
                  '<span style="font-family:DM Mono,monospace;font-size:9px;color:#6a6a62">'+escHtml(pp.label||'')+'</span>' +
                  '<span id="pbv_'+pel.id+'" style="font-family:DM Mono,monospace;font-size:10px;font-weight:500">—</span>' +
                  (pp.unit?'<span style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">'+escHtml(pp.unit)+'</span>':'') +
                '</div>' +
                '<div style="flex:1;background:#f0f0ec;border-radius:5px;overflow:hidden;border:1px solid #e0e0d8;min-height:8px;">' +
                  '<div id="pbf_'+pel.id+'" style="height:100%;background:'+pbc+';width:0%;transition:width .4s;border-radius:5px;"></div>' +
                '</div></div>';
            }
            else if (tipo === 'gauge') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var gmin=parseFloat(pp.min)||0, gmax=parseFloat(pp.max)||100, gc=pp.color||'#1565c0';
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){if(v===null||v===undefined)return;var pct=(parseFloat(v)-'+gmin+')/('+gmax+'-'+gmin+');var angle=-135+pct*270;var n=document.getElementById("gneedle_'+pel.id+'");var t=document.getElementById("gval_'+pel.id+'");if(n)n.style.transform="rotate("+angle+"deg)";if(t)t.textContent=typeof v==="number"?v.toFixed(1):v;});},500);\n'; }
              inner = '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;background:#fff;border-radius:3px;border:1px solid #d8d8d0;overflow:hidden;">' +
                '<svg viewBox="0 0 100 60" style="width:90%;max-height:65%;">' +
                  '<path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#f0f0ec" stroke-width="6" stroke-linecap="round"/>' +
                  '<path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="'+gc+'" stroke-width="6" stroke-linecap="round" stroke-dasharray="126" stroke-dashoffset="63" opacity=".3"/>' +
                  '<line id="gneedle_'+pel.id+'" x1="50" y1="55" x2="50" y2="20" stroke="'+gc+'" stroke-width="2.5" stroke-linecap="round" style="transform-origin:50px 55px;transform:rotate(-135deg);transition:transform .5s;"/>' +
                  '<circle cx="50" cy="55" r="4" fill="'+gc+'"/>' +
                '</svg>' +
                '<div id="gval_'+pel.id+'" style="font-family:DM Mono,monospace;font-size:12px;font-weight:700;color:'+gc+'">—</div>' +
                (pp.label?'<div style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">'+escHtml(pp.label)+'</div>':'') +
              '</div>';
            }
            else if (tipo === 'bargraph-v') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var bmin=parseFloat(pp.min)||0, bmax=parseFloat(pp.max)||100, bc2=pp.color||'#1565c0';
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){if(v===null||v===undefined)return;var pct=Math.max(0,Math.min(100,(parseFloat(v)-'+bmin+')/('+bmax+'-'+bmin+')*100));var f=document.getElementById("bgf_'+pel.id+'");var t=document.getElementById("bgv_'+pel.id+'");if(f)f.style.height=pct+"%";if(t)t.textContent=typeof v==="number"?v.toFixed(1):v;});},500);\n'; }
              inner = '<div style="width:100%;height:100%;background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;align-items:center;padding:6px;box-sizing:border-box;gap:4px;">' +
                '<span id="bgv_'+pel.id+'" style="font-family:DM Mono,monospace;font-size:10px;font-weight:600;color:'+bc2+'">—</span>' +
                '<div style="flex:1;width:50%;background:#f0f0ec;border-radius:4px;overflow:hidden;border:1px solid #e0e0d8;position:relative;display:flex;align-items:flex-end;">' +
                  '<div id="bgf_'+pel.id+'" style="width:100%;height:0%;background:'+bc2+';transition:height .4s;border-radius:4px;"></div>' +
                '</div>' +
                (pp.label?'<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">'+escHtml(pp.label)+'</span>':'') +
              '</div>';
            }
            else if (tipo === 'trend-chart') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var tmin=parseFloat(pp.min)||0, tmax=parseFloat(pp.max)||100, tc=pp.color||'#c62828', tpts=parseInt(pp.points)||30;
              if (bvk) { registrarVar(pp.var1); jsEls += 'var _td_'+pel.id+'=[];\n'; jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){if(v===null||v===undefined)return;_td_'+pel.id+'.push(parseFloat(v));if(_td_'+pel.id+'.length>'+tpts+')_td_'+pel.id+'.shift();var c=document.getElementById("tc_'+pel.id+'");if(!c)return;var w=c.width,h=c.height,ctx=c.getContext("2d");ctx.clearRect(0,0,w,h);if(_td_'+pel.id+'.length<2)return;ctx.beginPath();ctx.strokeStyle="'+tc+'";ctx.lineWidth=2;_td_'+pel.id+'.forEach(function(pt,i){var x=i/('+tpts+'-1)*w;var y=h-(pt-'+tmin+')/('+tmax+'-'+tmin+')*h;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.stroke();var lv=document.getElementById("tv_'+pel.id+'");if(lv)lv.textContent=_td_'+pel.id+'[_td_'+pel.id+'.length-1].toFixed(1);});},1000);\n'; }
              inner = '<div style="width:100%;height:100%;background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;">' +
                '<div style="padding:4px 8px;border-bottom:1px solid #e8e8e0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
                  '<span style="font-family:DM Mono,monospace;font-size:9px;color:#6a6a62">'+escHtml(pp.label||'')+'</span>' +
                  '<span id="tv_'+pel.id+'" style="font-family:DM Mono,monospace;font-size:10px;font-weight:600;color:'+tc+'">—</span>' +
                '</div>' +
                '<canvas id="tc_'+pel.id+'" style="flex:1;width:100%"></canvas>' +
              '</div>';
            }
            else if (tipo === 'string-display') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var d=document.getElementById("sd_'+pel.id+'");if(d&&v!==null&&v!==undefined)d.textContent=String(v);});},1000);\n'; }
              inner = '<div style="width:100%;height:100%;background:#0f0f0d;border:1px solid #2a2a28;border-radius:3px;display:flex;align-items:center;gap:6px;padding:0 10px;box-sizing:border-box;">' +
                (pp.label?'<span style="font-family:DM Mono,monospace;font-size:9px;color:#5a5a52;flex-shrink:0">'+escHtml(pp.label)+'</span>':'') +
                '<span id="sd_'+pel.id+'" style="font-family:DM Mono,monospace;font-size:'+pfs+';color:#f0f0e8;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">—</span>' +
              '</div>';
            }
            else if (tipo === 'data-table') {
              var rows = '';
              for (var dti=1; dti<=6; dti++) {
                var dlbl = pp['dlabel'+dti], dvar = pp['dvar'+dti];
                if (!dlbl && !dvar) continue;
                if (dvar) { registrarVar(dvar); var dvk=claveJs(dvar); jsPolling += 'setInterval(function(){plcLeer(vars.'+dvk+',function(v){var d=document.getElementById("dtv_'+pel.id+'_'+dti+'");if(d&&v!==null&&v!==undefined)d.textContent=typeof v==="number"?v.toFixed(1):String(v);});},1000);\n'; }
                rows += '<div style="display:flex;align-items:center;padding:4px 10px;border-bottom:1px solid #f0f0ec;">' +
                  '<span style="flex:1;font-family:DM Mono,monospace;font-size:9px;color:#6a6a62">'+escHtml(dlbl||dvar||'')+'</span>' +
                  '<span id="dtv_'+pel.id+'_'+dti+'" style="font-family:DM Mono,monospace;font-size:10px;font-weight:500;color:#1a1a16">—</span>' +
                '</div>';
              }
              inner = '<div style="width:100%;height:100%;background:#fff;border:1px solid #d8d8d0;border-radius:3px;overflow:hidden;">' +
                '<div style="padding:5px 10px;border-bottom:1px solid #e8e8e0;background:#f9f9f7;">' +
                  '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6a6a62">'+escHtml(pp.title||'DATOS')+'</span>' +
                '</div>' +
                '<div style="overflow-y:auto;height:calc(100% - 30px)">'+rows+'</div>' +
              '</div>';
            }
            /* ════════════ TOOLTIP-NODE completo ════════════ */
            else if (tipo === 'tooltip-node') {
              var tnShape  = pp.shape    || 'rect';
              var tnFill   = (pp.fillColor   !== undefined && pp.fillColor   !== '') ? pp.fillColor   : '#e3f0ff';
              var tnStroke = (pp.strokeColor !== undefined && pp.strokeColor !== '') ? pp.strokeColor : '#1565c0';
              var tnFont   = pp.fontColor   || '#1a1a16';
              var tnText   = escHtml(pp.text || 'NODE');
              var tnConns  = [pp.conn1,pp.conn2,pp.conn3,pp.conn4].filter(function(c){return c&&c.trim();});
              var tnNotes  = pp.notes ? escHtml(pp.notes) : '';
              var tnVar1   = pp.var1 && pp.var1.trim() ? pp.var1 : '';
              /* SVG shape */
              var shapeId  = 'tnshp_'+pel.id;
              var shapeSvg = '';
              if (tnShape==='circle')        shapeSvg='<ellipse id="'+shapeId+'" cx="50" cy="50" rx="48" ry="48" fill="'+tnFill+'" stroke="'+tnStroke+'" stroke-width="2"/>';
              else if (tnShape==='diamond')  shapeSvg='<polygon id="'+shapeId+'" points="50,2 98,50 50,98 2,50" fill="'+tnFill+'" stroke="'+tnStroke+'" stroke-width="2"/>';
              else if (tnShape==='hexagon')  shapeSvg='<polygon id="'+shapeId+'" points="50,2 93,25 93,75 50,98 7,75 7,25" fill="'+tnFill+'" stroke="'+tnStroke+'" stroke-width="2"/>';
              else if (tnShape==='rounded')  shapeSvg='<rect id="'+shapeId+'" x="2" y="2" width="96" height="96" rx="20" ry="20" fill="'+tnFill+'" stroke="'+tnStroke+'" stroke-width="2"/>';
              else                           shapeSvg='<rect id="'+shapeId+'" x="2" y="2" width="96" height="96" fill="'+tnFill+'" stroke="'+tnStroke+'" stroke-width="2"/>';
              /* Tooltip content */
              var ttLines = '';
              if (tnConns.length) { ttLines += '<div style=\"font-family:DM Mono,monospace;font-size:8px;letter-spacing:2px;color:#6a6a5a;margin-bottom:5px\">⬡ CONEXIONES</div>'; tnConns.forEach(function(c){ ttLines += '<div style=\"font-family:DM Mono,monospace;font-size:10px;color:#00e5b0;padding:2px 0\">'+escHtml(c)+'</div>'; }); }
              if (tnNotes) ttLines += '<div style=\"font-family:DM Mono,monospace;font-size:9px;color:#b8b8a8;margin-top:6px;padding-top:6px;border-top:1px solid #3a3a30;white-space:pre-wrap\">'+tnNotes+'</div>';
              if (!ttLines) ttLines = '<div style=\"font-family:DM Mono,monospace;font-size:9px;color:#5a5a4a;font-style:italic\">Sin conexiones</div>';
              /* PLC polling + color change */
              var valHtml = '';
              if (tnVar1) {
                registrarVar(tnVar1);
                var tnVk = claveJs(tnVar1);
                var tnValCol = pp.valueColor||'#00e5b0';
                var activeFill = pp.useActiveColor ? (pp.activeFill||'#2e7d32') : '';
                var activeStroke = pp.useActiveColor ? (pp.activeStroke||'#00c853') : '';
                var activeFont = pp.useActiveColor ? (pp.activeFont||'#ffffff') : '';
                jsPolling += 'setInterval(function(){plcLeer(vars.'+tnVk+',function(v){' +
                  'var raw=(v!==null&&v!==undefined)?String(v):"—";' +
                  'var tv=document.getElementById("tnvt_'+pel.id+'");if(tv)tv.textContent=raw;' +
                  (pp.showValue?'var nv=document.getElementById("tnv_'+pel.id+'");if(nv)nv.textContent=raw;':'') +
                  (pp.useActiveColor?'var activo=(v===true||v==="true"||v===1||Number(v)!==0&&v!==null&&v!==undefined);var shp=document.getElementById("'+shapeId+'");var fnt=document.querySelector("#tnwrap_'+pel.id+' [data-tntext]");if(shp){shp.setAttribute("fill",activo?"'+activeFill+'":"'+tnFill+'");shp.setAttribute("stroke",activo?"'+activeStroke+'":"'+tnStroke+'");}if(fnt)fnt.style.color=activo?"'+activeFont+'":"'+tnFont+'";':'') +
                '});},500);\n';
                valHtml = (pp.showValue?'<div id="tnv_'+pel.id+'" style="font-family:DM Mono,monospace;font-size:'+(Math.max(8,(pp.fontSize||11)-1))+'px;color:'+tnValCol+';font-weight:700;">—</div>':'');
              }
              inner = '<div id="tnwrap_'+pel.id+'" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;cursor:default;position:relative;" ' +
                'onmouseenter="this.querySelector(\'.tn-tt-g\').style.display=\'block\';" ' +
                'onmouseleave="this.querySelector(\'.tn-tt-g\').style.display=\'none\';">' +
                '<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" viewBox="0 0 100 100" preserveAspectRatio="none">'+shapeSvg+'</svg>' +
                '<div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none;">' +
                  '<div data-tntext style="font-family:DM Mono,monospace;font-weight:600;letter-spacing:1px;font-size:'+(pp.fontSize||11)+'px;color:'+tnFont+';text-align:center;line-height:1.2;">'+tnText+'</div>' +
                  valHtml +
                  (tnVar1?'<div style="font-family:DM Mono,monospace;font-size:8px;color:'+((pp.valueColor)||'#00e5b0')+'" id="tnvt_'+pel.id+'">—</div>':'') +
                '</div>' +
                '<div class="tn-tt-g" style="display:none;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);' +
                  'z-index:9999;background:#1a1a18;border:1px solid #3a3a30;border-radius:5px;padding:9px 11px;' +
                  'min-width:160px;max-width:240px;box-shadow:0 6px 24px rgba(0,0,0,.45);pointer-events:none;white-space:nowrap;">' +
                  ttLines +
                  '<div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:#1a1a18;"></div>' +
                '</div>' +
              '</div>';
            }
            /* ════════════ ALARMAS ════════════ */
            else if (tipo === 'alarm-plc') {
              inner = '<div style="width:100%;height:100%;background:#fff;border:1px solid #c5cae9;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;">' +
                '<div style="padding:5px 10px;border-bottom:1px solid #e8eaf6;background:#f3f4ff;display:flex;align-items:center;gap:7px;">' +
                  '<div id="aphdr_dot_'+pel.id+'" style="width:6px;height:6px;border-radius:50%;background:#d0d0c8"></div>' +
                  '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#1a237e;font-weight:600;flex:1">'+escHtml(pp.title||'ALARMAS PLC')+'</span>' +
                  '<span id="apcnt_'+pel.id+'" style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">0 ACTIVAS</span>' +
                '</div>' +
                '<div id="aplist_act_'+pel.id+'" style="flex:1;overflow-y:auto;"></div>' +
              '</div>';
              var aplang = pp.language||'es-ES';
              jsPolling += 'setInterval(function(){' +
                'var hdrs={"Content-Type":"application/json"};if(plcToken)hdrs["X-Auth-Token"]=plcToken;' +
                'fetch(PLC_URL,{method:"POST",headers:hdrs,body:JSON.stringify({jsonrpc:"2.0",method:"Alarms.Browse",id:88,' +
                'params:{language:"' + aplang + '",filter:{alarm_classes:["userprogram"],states:["active","active_unacknowledged"]}}})})' +
                '.then(function(r){return r.json()}).then(function(d){' +
                'var al=(d.result&&d.result.alarms)||[];var f="";' +
                'al.forEach(function(a){' +
                  'var t=(a.alarm_text&&a.alarm_text[0]&&a.alarm_text[0].text)||("A"+a.id);' +
                  'f+=\'<div style=\"padding:5px 10px;border-bottom:1px solid #e8eaf6;font-family:DM Mono,monospace;font-size:9px;color:#1a1a16;\">\'+t+\'</div>\';' +
                '});' +
                'var ael=document.getElementById("aplist_act_' + pel.id + '");' +
                'if(ael)ael.innerHTML=f||\'<div style=\"padding:12px;text-align:center;font-family:DM Mono,monospace;font-size:9px;color:#b0b0a8\">Sin alarmas</div>\';' +
                'var cnt=document.getElementById("apcnt_' + pel.id + '");' +
                'if(cnt)cnt.textContent=al.length+" ACTIVA"+(al.length!==1?"S":"");' +
                'var dot=document.getElementById("aphdr_dot_' + pel.id + '");' +
                'if(dot)dot.style.background=al.length?"#c62828":"#d0d0c8";' +
                '}).catch(function(){});},2000);\n';
            }
            else if (tipo === 'alarm-banner') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var abCol = pp.color||'#c62828';
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var on=(v===true||v===1||v==="true");var d=document.getElementById("aban_'+pel.id+'");if(d){d.style.opacity=on?"1":"0.25";d.style.animation=on?"hbanner-flash 1s ease-in-out infinite":"none";}});},500);\n'; }
              inner = '<div id="aban_'+pel.id+'" style="width:100%;height:100%;background:'+abCol+';border-radius:3px;display:flex;align-items:center;justify-content:center;gap:8px;opacity:0.25;transition:opacity .3s;font-family:DM Mono,monospace;font-weight:700;color:#fff;font-size:'+pfs+';">⚑ '+escHtml(pp.text||'ALARMA')+'</div>';
            }
            /* ════════════ DECORACIÓN ════════════ */
            else if (tipo === 'label') {
              inner = '<div style="width:100%;height:100%;display:flex;align-items:center;font-family:DM Mono,monospace;font-size:'+pfs+';color:'+(pp.color||'#1a1a16')+';font-weight:'+(pp.bold?'700':'400')+';padding:2px 4px;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escHtml(pp.text||'')+'</div>';
            }
            else if (tipo === 'text-block') {
              inner = '<div style="width:100%;height:100%;font-family:DM Mono,monospace;font-size:'+pfs+';color:'+(pp.color||'#1a1a16')+';padding:6px 8px;box-sizing:border-box;overflow:hidden;white-space:pre-wrap;line-height:1.5;">'+escHtml(pp.text||'')+'</div>';
            }
            else if (tipo === 'title-banner') {
              var bc3 = pp.color||'#1565c0';
              inner = '<div style="width:100%;height:100%;background:#fff;border:1px solid #d8d8d0;border-radius:3px;overflow:hidden;display:flex;flex-direction:column;">' +
                '<div style="background:'+bc3+';padding:5px 12px;flex-shrink:0;">' +
                  '<div style="font-family:DM Mono,monospace;font-size:'+pfs+';color:#fff;font-weight:700;letter-spacing:1px;">'+escHtml(pp.text||'TÍTULO')+'</div>' +
                '</div>' +
                (pp.subtext?'<div style="padding:4px 12px;font-family:DM Mono,monospace;font-size:9px;color:#6a6a62;">'+escHtml(pp.subtext)+'</div>':'') +
              '</div>';
            }
            else if (tipo === 'separator') {
              var isV = pel.h > pel.w;
              inner = '<div style="width:100%;height:100%;display:flex;'+(isV?'justify-content:center;':'align-items:center;gap:8px;')+'">' +
                (isV?'<div style="width:1px;height:100%;background:#3a3a30;opacity:.5;"></div>':
                  (pp.label?'<span style="font-family:DM Mono,monospace;font-size:8px;color:#6a6a5a;letter-spacing:2px;white-space:nowrap;flex-shrink:0;">'+escHtml(pp.label)+'</span>':'')+'<div style="flex:1;height:1px;background:#3a3a30;opacity:.5;"></div>') +
              '</div>';
            }
            else if (tipo === 'image-upload' || tipo === 'image-static') {
              var imgSrc = pp.src||pp.staticSrc||'';
              inner = imgSrc?'<img src="'+imgSrc+'" style="width:100%;height:100%;object-fit:'+(pp.fit||'contain')+';">':'<div style="width:100%;height:100%;background:#f5f5f3;border:1px dashed #c8c8c0;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:9px;color:#9a9a90;">🖼 IMAGEN</div>';
            }
            else if (tipo === 'tooltip-node') { /* handled above */ }
            /* ════════════ P&ID ════════════ */
            else if (tipo === 'motor-symbol') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var on=(v===true||v===1||v==="true");var c=document.getElementById("msym_'+pel.id+'");if(c){c.style.fill=on?"#00c853":"#d0d0c8";c.style.filter=on?"drop-shadow(0 0 4px #00c85388)":"none";}});},500);\n'; }
              inner = '<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">' +
                '<circle cx="50" cy="50" r="40" fill="none" stroke="#546e7a" stroke-width="4"/>' +
                '<circle id="msym_'+pel.id+'" cx="50" cy="50" r="28" fill="#d0d0c8" style="transition:all .3s"/>' +
                '<text x="50" y="56" text-anchor="middle" font-family="DM Mono,monospace" font-size="16" font-weight="700" fill="#1a1a16">'+escHtml(pp.label||'M')+'</text>' +
              '</svg>';
            }
            else if (tipo === 'pump-symbol') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var on=(v===true||v===1||v==="true");var c=document.getElementById("psym_'+pel.id+'");if(c){c.setAttribute("fill",on?"#1565c0":"#d0d0c8");}});},500);\n'; }
              inner = '<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">' +
                '<circle cx="50" cy="50" r="42" fill="none" stroke="#546e7a" stroke-width="4"/>' +
                '<polygon id="psym_'+pel.id+'" points="30,75 30,25 80,50" fill="#d0d0c8" style="transition:fill .3s"/>' +
                '<text x="50" y="92" text-anchor="middle" font-family="DM Mono,monospace" font-size="12" fill="#546e7a">'+escHtml(pp.label||'P')+'</text>' +
              '</svg>';
            }
            else if (tipo === 'valve-symbol') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){var on=(v===true||v===1||v==="true");var c=document.getElementById("vsym_'+pel.id+'");if(c)c.setAttribute("fill",on?"#2e7d32":"#c62828");});},500);\n'; }
              inner = '<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">' +
                '<polygon id="vsym_'+pel.id+'" points="10,20 50,50 10,80" fill="#c62828" style="transition:fill .3s"/>' +
                '<polygon points="90,20 50,50 90,80" fill="#546e7a"/>' +
                '<line x1="50" y1="10" x2="50" y2="50" stroke="#546e7a" stroke-width="4"/>' +
                '<rect x="40" y="5" width="20" height="10" fill="#546e7a" rx="2"/>' +
              '</svg>';
            }
            else if (tipo === 'level-tank') {
              var bvk = pp.var1?claveJs(pp.var1):null;
              var ltmax = parseFloat(pp.max)||100, ltc = pp.color||'#29b6f6';
              if (bvk) { registrarVar(pp.var1); jsPolling += 'setInterval(function(){plcLeer(vars.'+bvk+',function(v){if(v===null||v===undefined)return;var pct=Math.max(0,Math.min(100,parseFloat(v)/'+ltmax+'*100));var f=document.getElementById("ltfill_'+pel.id+'");var t=document.getElementById("ltval_'+pel.id+'");if(f)f.style.height=pct+"%";if(t)t.textContent=typeof v==="number"?v.toFixed(1):v;});},1000);\n'; }
              inner = '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px;box-sizing:border-box;">' +
                (pp.label?'<div style="font-family:DM Mono,monospace;font-size:9px;color:#6a6a62">'+escHtml(pp.label)+'</div>':'') +
                '<div style="flex:1;width:60%;background:#e3f2fd;border:2px solid #546e7a;border-radius:4px;overflow:hidden;position:relative;display:flex;align-items:flex-end;">' +
                  '<div id="ltfill_'+pel.id+'" style="width:100%;height:50%;background:'+ltc+';opacity:.75;transition:height .6s ease;"></div>' +
                  '<span id="ltval_'+pel.id+'" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:DM Mono,monospace;font-size:11px;font-weight:700;color:#1a1a16;">—</span>' +
                '</div>' +
              '</div>';
            }
            else if (tipo === 'pipe-h') {
              var pc=pp.color||'#546e7a', pfc=pp.fluidColor||'#29b6f6';
              inner = '<svg viewBox="0 0 200 48" style="width:100%;height:100%;display:block;" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><rect x="0" y="10" width="200" height="28" rx="4" fill="'+pc+'"/><rect x="0" y="14" width="200" height="6" rx="2" fill="rgba(255,255,255,.22)"/><rect x="2" y="16" width="196" height="16" rx="3" fill="'+pfc+'" opacity=".35"/><rect x="0" y="10" width="200" height="28" rx="4" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/></svg>';
            }
            else if (tipo === 'pipe-v') {
              var pc=pp.color||'#546e7a', pfc=pp.fluidColor||'#29b6f6';
              inner = '<svg viewBox="0 0 48 200" style="width:100%;height:100%;display:block;" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><rect x="10" y="0" width="28" height="200" rx="4" fill="'+pc+'"/><rect x="14" y="0" width="6" height="200" rx="2" fill="rgba(255,255,255,.22)"/><rect x="16" y="2" width="16" height="196" rx="3" fill="'+pfc+'" opacity=".35"/><rect x="10" y="0" width="28" height="200" rx="4" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/></svg>';
            }
            /* ════════════ SISTEMA ════════════ */
            else if (tipo === 'datetime-display') {
              jsEls += '(function(){function _dtup_'+pel.id+'(){var d=new Date();var s=d.toLocaleString();var e=document.getElementById("dtime_'+pel.id+'");if(e)e.textContent=s;}setInterval(_dtup_'+pel.id+',1000);_dtup_'+pel.id+'();})();\n';
              inner = '<div style="width:100%;height:100%;background:#0f0f0d;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:'+pfs+';color:'+(pp.color||'#f0f0e8')+';font-weight:500;" id="dtime_'+pel.id+'">—</div>';
            }
            /* ════════════ FORMAS SVG ════════════ */
            else if (tipo === 'shape-rect') {
              var sf=pp.fill||'#1565c0', sfo=pp.fillOpacity!==undefined?pp.fillOpacity:0.15;
              var ss=pp.stroke||'#1565c0', ssw=pp.strokeWidth!==undefined?pp.strokeWidth:2;
              var srx=pp.radius!==undefined?pp.radius:0;
              inner = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">' +
                '<rect x="'+ssw/2+'" y="'+ssw/2+'" width="99%" height="99%" rx="'+srx+'" ry="'+srx+'"' +
                ' fill="'+sf+'" fill-opacity="'+sfo+'" stroke="'+ss+'" stroke-width="'+ssw+'"/></svg>';
            }
            else if (tipo === 'shape-circle') {
              var sf=pp.fill||'#2e7d32', sfo=pp.fillOpacity!==undefined?pp.fillOpacity:0.15;
              var ss=pp.stroke||'#2e7d32', ssw=pp.strokeWidth!==undefined?pp.strokeWidth:2;
              inner = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">' +
                '<ellipse cx="50" cy="50" rx="'+(50-ssw/2)+'" ry="'+(50-ssw/2)+'"' +
                ' fill="'+sf+'" fill-opacity="'+sfo+'" stroke="'+ss+'" stroke-width="'+ssw+'"/></svg>';
            }
            else if (tipo === 'shape-triangle') {
              var sf=pp.fill||'#f57c00', sfo=pp.fillOpacity!==undefined?pp.fillOpacity:0.15;
              var ss=pp.stroke||'#f57c00', ssw=pp.strokeWidth!==undefined?pp.strokeWidth:2;
              var dir=pp.direction||'up';
              var pts=dir==='up'?'50,4 96,96 4,96':dir==='down'?'4,4 96,4 50,96':dir==='left'?'96,4 96,96 4,50':'4,4 96,50 4,96';
              inner = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">' +
                '<polygon points="'+pts+'" fill="'+sf+'" fill-opacity="'+sfo+'" stroke="'+ss+'" stroke-width="'+ssw+'" stroke-linejoin="round"/></svg>';
            }
            else if (tipo === 'shape-line') {
              var ss=pp.stroke||'#1a1a18', ssw=pp.strokeWidth!==undefined?pp.strokeWidth:2;
              var ang=(pp.angle!==undefined?pp.angle:0)*Math.PI/180;
              var x1=Math.round(50-Math.cos(ang)*46), y1=Math.round(50-Math.sin(ang)*46);
              var x2=Math.round(50+Math.cos(ang)*46), y2=Math.round(50+Math.sin(ang)*46);
              inner = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">' +
                '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"' +
                ' stroke="'+ss+'" stroke-width="'+ssw+'" stroke-linecap="'+(pp.cap||'round')+'"/></svg>';
            }
            else if (tipo === 'shape-curve') {
              var ss=pp.stroke||'#c62828', ssw=pp.strokeWidth!==undefined?pp.strokeWidth:2;
              var cv=pp.curvature!==undefined?pp.curvature:50;
              inner = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">' +
                '<path d="M4,50 Q50,'+(50-cv)+' 96,50" fill="none"' +
                ' stroke="'+ss+'" stroke-width="'+ssw+'" stroke-linecap="'+(pp.cap||'round')+'"/></svg>';
            }
            else if (tipo === 'frame-box') {
              var fc=pp.color||'#1a1a18';
              inner = '<div style="width:100%;height:100%;border:2px solid '+fc+';border-radius:3px;position:relative;">' +
                '<div style="position:absolute;top:-10px;left:10px;background:transparent;font-family:DM Mono,monospace;font-size:'+(pp.fontSize||10)+'px;font-weight:600;letter-spacing:1px;color:'+fc+';white-space:nowrap;padding:0 4px;">'+escHtml(pp.title||'ZONA')+'</div>' +
              '</div>';
            }
            else if (tipo === 'separator-h') {
              var sc=pp.color||'#3a3a30';
              inner = '<div style="width:100%;height:100%;display:flex;align-items:center;gap:8px;">' +
                (pp.label?'<span style="font-family:DM Mono,monospace;font-size:8px;color:'+sc+';letter-spacing:2px;white-space:nowrap;flex-shrink:0;">'+escHtml(pp.label)+'</span>':'') +
                '<div style="flex:1;height:1px;background:'+sc+';opacity:.6;"></div>' +
              '</div>';
            }
            /* ════════════ DEFAULT ════════════ */
            /* ════════════ FORMAS ════════════ */
            else if (tipo === 'shape-rect') {
              var sf=pp.fill||'rgba(21,101,192,0.15)', ss=pp.strokeColor||'#1565c0', sw=pp.strokeWidth||2, sr=pp.borderRadius||0;
              inner = '<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">' +
                '<rect x="'+sw/2+'" y="'+sw/2+'" width="'+(100-sw)+'" height="'+(100-sw)+'" rx="'+sr+'" fill="'+sf+'" stroke="'+ss+'" stroke-width="'+sw+'"/>' +
              '</svg>';
            }
            else if (tipo === 'shape-circle') {
              var sf=pp.fill||'rgba(21,101,192,0.15)', ss=pp.strokeColor||'#1565c0', sw=pp.strokeWidth||2;
              inner = '<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">' +
                '<ellipse cx="50" cy="50" rx="'+(50-sw/2)+'" ry="'+(50-sw/2)+'" fill="'+sf+'" stroke="'+ss+'" stroke-width="'+sw+'"/>' +
              '</svg>';
            }
            else if (tipo === 'shape-triangle') {
              var sf=pp.fill||'rgba(245,124,0,0.15)', ss=pp.strokeColor||'#f57c00', sw=pp.strokeWidth||2;
              inner = '<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">' +
                '<polygon points="50,'+sw+' '+(100-sw)+','+(100-sw)+' '+sw+','+(100-sw)+'" fill="'+sf+'" stroke="'+ss+'" stroke-width="'+sw+'" stroke-linejoin="round"/>' +
              '</svg>';
            }
            else if (tipo === 'shape-line') {
              var ss=pp.strokeColor||'#546e7a', sw=pp.strokeWidth||2;
              inner = '<svg viewBox="0 0 100 100" style="width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">' +
                '<line x1="0" y1="100" x2="100" y2="0" stroke="'+ss+'" stroke-width="'+sw+'" stroke-linecap="round"/>' +
              '</svg>';
            }
            else if (tipo === 'shape-curve') {
              var ss=pp.stroke||'#c62828', ssw=pp.strokeWidth!==undefined?pp.strokeWidth:2;
              var cv=pp.curvature!==undefined?pp.curvature:50;
              inner = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">' +
                '<path d="M4,50 Q50,'+(50-cv)+' 96,50" fill="none"' +
                ' stroke="'+ss+'" stroke-width="'+ssw+'" stroke-linecap="'+(pp.cap||'round')+'"/></svg>';
            }
            else if (tipo === 'frame-box') {
              var fc = pp.color||'#3a3a30', ffs = (pp.fontSize||10)+'px';
              var flbl = pp.title||pp.label||'';
              inner = '<div style="width:100%;height:100%;border:2px solid '+fc+';border-radius:4px;box-sizing:border-box;position:relative;overflow:visible;">' +
                (flbl ? '<span style="position:absolute;top:-10px;left:10px;background:#fff;padding:0 5px;font-family:DM Mono,monospace;font-size:'+ffs+';letter-spacing:2px;color:'+fc+';white-space:nowrap;font-weight:600;">'+escHtml(flbl)+'</span>' : '') +
              '</div>';
            }
            else if (tipo.startsWith('deco-')) {
              /* Decoraciones — renderizar el SVG del elemento desde htmlInterior */
              var decoEmojis = {"deco-barrel": "🛢", "deco-brickwall": "🧱", "deco-bulldozer": "🚧", "deco-cement-mixer": "🔄", "deco-compressor": "⚙", "deco-cone": "🔶", "deco-conveyor": "⬅", "deco-crane": "🏗", "deco-dump-truck": "🚛", "deco-electric-hazard": "⚡", "deco-elevator": "🛗", "deco-excavator": "🚜", "deco-fire-ext": "🧯", "deco-first-aid": "🩺", "deco-forklift": "🔼", "deco-helmet": "⛑", "deco-ladder": "🪜", "deco-motor-el": "⚙", "deco-pallet": "📦", "deco-person-walk": "🚶", "deco-pump-cent": "⊙", "deco-rack": "🗄", "deco-road-barrier": "🚧", "deco-safety-exit": "🚪", "deco-scaffold": "🏗", "deco-sign-hard": "⚠", "deco-toolbox": "🧰", "deco-truck": "🚚", "deco-welding": "🔥", "deco-wheelbarrow": "🪣", "deco-wire-spool": "🔌", "deco-worker": "👷"};
              var emoji = decoEmojis[tipo] || '🏭';
              inner = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:min(80%,32px);">' + emoji + '</div>';
            }

            else {
              inner = '<div style="width:100%;height:100%;background:#f5f5f3;border:1px dashed #c8c8c0;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:9px;color:#9a9a90;">' + tipo + '</div>';
            }
            return '<div style="' + pelSt + '">' + inner + '</div>';
          })(pel, pelSt);
          innerHtml += pelHtml;
        });
        return innerHtml;
      })() +

            '</div>' +
          '</div>' +
        '</div>\n';

      /* Scripts del popup */
      jsEls +=
        'function abrirPopup_' + el.id + '() {\n' +
        '  document.getElementById("' + pbPopupId + '").style.display = "block";\n' +
        '  document.body.style.overflow = "hidden";\n' +
        '}\n' +
        'function cerrarPopup_' + el.id + '() {\n' +
        '  document.getElementById("' + pbPopupId + '").style.display = "none";\n' +
        '  document.body.style.overflow = "";\n' +
        '}\n' +
        'document.addEventListener("keydown", function(e){\n' +
        '  if (e.key === "Escape") cerrarPopup_' + el.id + '();\n' +
        '});\n\n';
    }

    /* ══════════════ TUBERÍAS ══════════════ */
    else if (el.tipo === 'pipe-h') {
      var c = p.color||'#546e7a', fc = p.fluidColor||'#29b6f6';
      htmlEls += '<svg id="'+el.id+'" style="'+st+'display:block;overflow:visible;" viewBox="0 0 200 48" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">' +
        '<rect x="0" y="10" width="200" height="28" rx="4" fill="'+c+'"/>' +
        '<rect x="0" y="14" width="200" height="6" rx="2" fill="rgba(255,255,255,.22)"/>' +
        '<rect x="2" y="16" width="196" height="16" rx="3" fill="'+fc+'" opacity=".35"/>' +
        '<rect x="0" y="10" width="200" height="28" rx="4" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>' +
        (p.label?'<text x="100" y="44" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" fill="'+c+'" letter-spacing="1">'+escHtml(p.label)+'</text>':'') +
        '</svg>\n';
      jsEls += '/* pipe-h '+el.id+' — decoración estática */\n\n';
    }
    else if (el.tipo === 'pipe-v') {
      var c = p.color||'#546e7a', fc = p.fluidColor||'#29b6f6';
      htmlEls += '<svg id="'+el.id+'" style="'+st+'display:block;overflow:visible;" viewBox="0 0 48 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">' +
        '<rect x="10" y="0" width="28" height="200" rx="4" fill="'+c+'"/>' +
        '<rect x="14" y="0" width="6" height="200" rx="2" fill="rgba(255,255,255,.22)"/>' +
        '<rect x="16" y="2" width="16" height="196" rx="3" fill="'+fc+'" opacity=".35"/>' +
        '<rect x="10" y="0" width="28" height="200" rx="4" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>' +
        '</svg>\n';
      jsEls += '/* pipe-v '+el.id+' — decoración estática */\n\n';
    }
    else if (el.tipo === 'pipe-elbow') {
      var c = p.color||'#546e7a', fc = p.fluidColor||'#29b6f6';
      var dir = p.direction||'tr';
      var flipX = (dir==='tl'||dir==='bl') ? 'scale(-1,1) translate(-80,0)' : '';
      var flipY = (dir==='br'||dir==='bl') ? 'scale(1,-1) translate(0,-80)' : '';
      var tf = [flipX,flipY].filter(Boolean).join(' ')||'none';
      htmlEls += '<svg id="'+el.id+'" style="'+st+'display:block;overflow:visible;" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">' +
        '<g transform="'+tf+'">' +
        '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="28" stroke-linecap="square"/>' +
        '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="'+c+'" stroke-width="26" stroke-linecap="square"/>' +
        '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="7" stroke-linecap="square"/>' +
        '<path d="M0,34 L32,34 Q46,34 46,20 L46,0" fill="none" stroke="'+fc+'" stroke-width="12" stroke-linecap="square" opacity=".32"/>' +
        '</g></svg>\n';
      jsEls += '/* pipe-elbow '+el.id+' — decoración estática */\n\n';
    }
    else if (el.tipo === 'pipe-tee') {
      var c = p.color||'#546e7a', fc = p.fluidColor||'#29b6f6';
      htmlEls += '<svg id="'+el.id+'" style="'+st+'display:block;overflow:visible;" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="0" y="27" width="80" height="26" rx="4" fill="'+c+'"/>' +
        '<rect x="27" y="27" width="26" height="53" rx="4" fill="'+c+'"/>' +
        '<rect x="0" y="31" width="80" height="7" rx="2" fill="rgba(255,255,255,.2)"/>' +
        '<rect x="31" y="34" width="7" height="46" rx="2" fill="rgba(255,255,255,.2)"/>' +
        '<rect x="2" y="33" width="76" height="14" rx="2" fill="'+fc+'" opacity=".32"/>' +
        '<rect x="33" y="35" width="14" height="45" rx="2" fill="'+fc+'" opacity=".32"/>' +
        '</svg>\n';
      jsEls += '/* pipe-tee '+el.id+' — decoración estática */\n\n';
    }
    else if (el.tipo === 'pipe-cross') {
      var c = p.color||'#546e7a', fc = p.fluidColor||'#29b6f6';
      htmlEls += '<svg id="'+el.id+'" style="'+st+'display:block;overflow:visible;" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="0" y="27" width="80" height="26" rx="4" fill="'+c+'"/>' +
        '<rect x="27" y="0" width="26" height="80" rx="4" fill="'+c+'"/>' +
        '<rect x="0" y="31" width="80" height="7" rx="2" fill="rgba(255,255,255,.2)"/>' +
        '<rect x="31" y="0" width="7" height="80" rx="2" fill="rgba(255,255,255,.2)"/>' +
        '<rect x="2" y="33" width="76" height="14" rx="2" fill="'+fc+'" opacity=".32"/>' +
        '<rect x="33" y="2" width="14" height="76" rx="2" fill="'+fc+'" opacity=".32"/>' +
        '</svg>\n';
      jsEls += '/* pipe-cross '+el.id+' — decoración estática */\n\n';
    }

    /* ══════════════ MOTOR / BOMBA DECORATIVOS ══════════════ */
    else if (el.tipo === 'deco-motor-el') {
      var c = p.color||'#37474f';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 100 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="15" y="90" width="70" height="12" rx="3" fill="#263238" stroke="#1a1a14" stroke-width="1.5"/>' +
        '<rect x="25" y="100" width="50" height="8" rx="2" fill="#1a2328"/>' +
        '<rect x="10" y="36" width="80" height="56" rx="6" fill="'+c+'" stroke="#263238" stroke-width="2"/>' +
        '<rect x="10" y="42" width="80" height="6" rx="1" fill="rgba(255,255,255,.1)"/>' +
        '<rect x="10" y="52" width="80" height="6" rx="1" fill="rgba(255,255,255,.1)"/>' +
        '<rect x="10" y="62" width="80" height="6" rx="1" fill="rgba(255,255,255,.1)"/>' +
        '<rect x="10" y="72" width="80" height="6" rx="1" fill="rgba(255,255,255,.1)"/>' +
        '<rect x="10" y="82" width="80" height="6" rx="1" fill="rgba(255,255,255,.1)"/>' +
        '<rect x="76" y="40" width="18" height="48" rx="4" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
        '<circle cx="85" cy="64" r="10" fill="#37474f" stroke="#263238" stroke-width="1.5"/>' +
        '<circle cx="85" cy="64" r="5" fill="#263238"/>' +
        '<rect x="93" y="62" width="7" height="4" rx="2" fill="#90a4ae"/>' +
        '<rect x="28" y="20" width="44" height="20" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>' +
        '<circle cx="40" cy="30" r="3" fill="#c62828"/>' +
        '<circle cx="50" cy="30" r="3" fill="#f9a825"/>' +
        '<circle cx="60" cy="30" r="3" fill="#2e7d32"/>' +
        '<text x="50" y="14" text-anchor="middle" font-family="DM Mono,monospace" font-size="10" font-weight="700" fill="#546e7a" letter-spacing="1">'+escHtml(p.label||'M1')+'</text>' +
        '</svg></div>\n';
      jsEls += '/* deco-motor-el '+el.id+' — decoración estática */\n\n';
    }
    else if (el.tipo === 'deco-pump-cent') {
      var c = p.color||'#37474f';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 100 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="15" y="92" width="70" height="10" rx="3" fill="#263238" stroke="#1a1a14" stroke-width="1.5"/>' +
        '<rect x="25" y="100" width="50" height="6" rx="2" fill="#1a2328"/>' +
        '<path d="M50,85 Q10,85 10,50 Q10,14 50,14 Q82,14 88,42 L78,42 Q74,22 50,22 Q18,22 18,50 Q18,78 50,78 Z" fill="'+c+'" stroke="#263238" stroke-width="2"/>' +
        '<rect x="76" y="36" width="24" height="16" rx="3" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
        '<rect x="22" y="84" width="16" height="10" rx="3" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
        '<circle cx="50" cy="50" r="20" fill="#455a64" stroke="#263238" stroke-width="2"/>' +
        '<circle cx="50" cy="50" r="12" fill="'+c+'" stroke="#263238" stroke-width="1.5"/>' +
        '<circle cx="50" cy="50" r="5" fill="#90a4ae"/>' +
        '<line x1="50" y1="38" x2="50" y2="45" stroke="#90a4ae" stroke-width="2.5"/>' +
        '<line x1="50" y1="55" x2="50" y2="62" stroke="#90a4ae" stroke-width="2.5"/>' +
        '<line x1="38" y1="50" x2="45" y2="50" stroke="#90a4ae" stroke-width="2.5"/>' +
        '<line x1="55" y1="50" x2="62" y2="50" stroke="#90a4ae" stroke-width="2.5"/>' +
        '<text x="50" y="10" text-anchor="middle" font-family="DM Mono,monospace" font-size="10" font-weight="700" fill="#546e7a" letter-spacing="1">'+escHtml(p.label||'P1')+'</text>' +
        '</svg></div>\n';
      jsEls += '/* deco-pump-cent '+el.id+' — decoración estática */\n\n';
    }

    /* ══════════════ PILOTO DE SEÑALIZACIÓN ══════════════ */
    else if (el.tipo === 'signal-lamp') {
      var useBlue = p.useBlue || false;
      var ms = p.pollMs || 500;
      var lamps = [
        { id:'R', varK:'varR', trigK:'trigR', colOn:'#ef5350', colOff:'#4a1010', glow:'rgba(239,83,80,.7)' },
        { id:'Y', varK:'varY', trigK:'trigY', colOn:'#ffca28', colOff:'#4a3000', glow:'rgba(255,202,40,.7)' },
        { id:'G', varK:'varG', trigK:'trigG', colOn:'#66bb6a', colOff:'#0a2e0a', glow:'rgba(102,187,106,.7)' }
      ];
      if (useBlue) lamps.push({ id:'B', varK:'varB', trigK:'trigB', colOn:'#42a5f5', colOff:'#0a1840', glow:'rgba(66,165,245,.7)' });

      lamps.forEach(function(l) { registrarVar(p[l.varK]); });

      var svgH = 18 + lamps.length * 36 + 16;
      var lampsSvg = lamps.map(function(l, i) {
        var y = 18 + i * 36;
        return '<rect x="8" y="'+(y-1)+'" width="56" height="32" rx="16" fill="#2a2a26" stroke="#1a1a14" stroke-width="1.5"/>' +
          '<ellipse id="sl_'+el.id+'_'+l.id+'" cx="36" cy="'+(y+15)+'" rx="22" ry="13" fill="'+l.colOff+'"/>' +
          '<ellipse cx="30" cy="'+(y+10)+'" rx="7" ry="4" fill="rgba(255,255,255,.1)" pointer-events="none"/>';
      }).join('');
      var pole = '<rect x="33" y="'+(18+lamps.length*36)+'" width="6" height="14" rx="3" fill="#3a3a36"/>' +
                 '<rect x="20" y="'+(18+lamps.length*36+10)+'" width="32" height="6" rx="3" fill="#2a2a26"/>';

      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:visible;box-sizing:border-box;">' +
        '<svg viewBox="0 0 72 '+svgH+'" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<text x="36" y="12" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90" letter-spacing="1">'+escHtml(p.label||'SL1')+'</text>' +
        lampsSvg + pole +
        '</svg></div>\n';

      lamps.forEach(function(l) {
        var vk   = claveJs(p[l.varK] || '');
        var trig = JSON.stringify(valorJs(p[l.trigK] || 'true'));
        jsEls +=
          'function pollSL_'+el.id+'_'+l.id+'() {\n' +
          '  plcLeer(vars.'+vk+', function(v){\n' +
          '    var el = document.getElementById("sl_'+el.id+'_'+l.id+'"); if(!el) return;\n' +
          '    var sv = String(v).toLowerCase(), st = String('+trig+').toLowerCase();\n' +
          '    var on = (sv===st||(st==="true"&&sv==="1")||(st==="false"&&sv==="0"));\n' +
          '    el.setAttribute("fill", on ? "'+l.colOn+'" : "'+l.colOff+'");\n' +
          '    el.style.filter = on ? "drop-shadow(0 0 6px '+l.glow+')" : "none";\n' +
          '  });\n}\n\n';
        jsPolling += '  pollSL_'+el.id+'_'+l.id+'(); setInterval(pollSL_'+el.id+'_'+l.id+', '+ms+');\n';
      });
    }


    else if (el.tipo === 'circuit-breaker') {
      registrarVar(p.varState); registrarVar(p.varTrip);
      var vS=claveJs(p.varState||''), vT=claveJs(p.varTrip||''), ms=p.pollMs||500;
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 80 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="22" y="30" width="36" height="60" rx="4" fill="#263238" stroke="#37474f" stroke-width="2"/>' +
        '<rect x="26" y="34" width="28" height="52" rx="2" fill="#1a1a18"/>' +
        '<rect id="cb_handle_'+el.id+'" x="34" y="52" width="12" height="20" rx="2" fill="#f0f0e8"/>' +
        '<rect id="cb_knob_'+el.id+'" x="37" y="60" width="6" height="10" rx="1" fill="#546e7a"/>' +
        '<line x1="40" y1="0" x2="40" y2="30" stroke="#f9a825" stroke-width="3"/>' +
        '<line x1="40" y1="90" x2="40" y2="120" stroke="#f9a825" stroke-width="3"/>' +
        '<circle id="cb_top_'+el.id+'" cx="40" cy="30" r="4" fill="#263238" stroke="#f9a825" stroke-width="2"/>' +
        '<circle id="cb_bot_'+el.id+'" cx="40" cy="90" r="4" fill="#263238" stroke="#f9a825" stroke-width="2"/>' +
        '<text x="40" y="114" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">'+escHtml(p.label||'Q1')+'</text>' +
        '</svg></div>\n';
      jsEls += 'function pollCB_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vS+', function(v){ var closed=(v===true||v==="true"||v===1);\n' +
        '    var h=document.getElementById("cb_handle_'+el.id+'"); if(h)h.style.fill=closed?"#2e7d32":"#f0f0e8";\n' +
        '    var k=document.getElementById("cb_knob_'+el.id+'"); if(k)k.style.fill=closed?"#2e7d32":"#546e7a";\n' +
        '  });\n' +
        '  plcLeer(vars.'+vT+', function(v){ var trip=(v===true||v==="true"||v===1);\n' +
        '    var t=document.getElementById("cb_top_'+el.id+'"); if(t)t.style.stroke=trip?"#c62828":"#f9a825";\n' +
        '    var b=document.getElementById("cb_bot_'+el.id+'"); if(b)b.style.stroke=trip?"#c62828":"#f9a825";\n' +
        '  });\n' +
        '}\n\n';
      jsPolling += '  pollCB_'+el.id+'(); setInterval(pollCB_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'contactor-display') {
      registrarVar(p.varClosed); registrarVar(p.varFault);
      var vC=claveJs(p.varClosed||''), vF=claveJs(p.varFault||''), ms=p.pollMs||500;
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 80 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="15" y="20" width="50" height="60" rx="4" fill="#263238" stroke="#37474f" stroke-width="2"/>' +
        '<rect x="20" y="25" width="40" height="50" rx="2" fill="#1a1a18"/>' +
        '<rect id="km_coil_'+el.id+'" x="28" y="33" width="24" height="18" rx="2" fill="#546e7a"/>' +
        '<rect x="32" y="37" width="16" height="10" rx="1" fill="#1a1a18"/>' +
        '<line x1="25" y1="10" x2="25" y2="25" stroke="#f9a825" stroke-width="2.5"/>' +
        '<line x1="40" y1="10" x2="40" y2="25" stroke="#f9a825" stroke-width="2.5"/>' +
        '<line x1="55" y1="10" x2="55" y2="25" stroke="#f9a825" stroke-width="2.5"/>' +
        '<line x1="25" y1="75" x2="25" y2="90" stroke="#f9a825" stroke-width="2.5"/>' +
        '<line x1="40" y1="75" x2="40" y2="90" stroke="#f9a825" stroke-width="2.5"/>' +
        '<line x1="55" y1="75" x2="55" y2="90" stroke="#f9a825" stroke-width="2.5"/>' +
        '<circle id="km_state_'+el.id+'" cx="40" cy="62" r="7" fill="#9a9a90" stroke="#546e7a" stroke-width="1.5"/>' +
        '<text x="40" y="98" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">'+escHtml(p.label||'KM1')+'</text>' +
        '</svg></div>\n';
      jsEls += 'function pollKM_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vC+', function(v){ var c=(v===true||v==="true"||v===1);\n' +
        '    var coil=document.getElementById("km_coil_'+el.id+'"); if(coil)coil.style.fill=c?"#2e7d32":"#546e7a";\n' +
        '    var st=document.getElementById("km_state_'+el.id+'"); if(st)st.style.fill=c?"#2e7d32":"#9a9a90";\n' +
        '  });\n' +
        '}\n\n';
      jsPolling += '  pollKM_'+el.id+'(); setInterval(pollKM_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'power-meter') {
      registrarVar(p.varKw); registrarVar(p.varKvar); registrarVar(p.varPf); registrarVar(p.varV); registrarVar(p.varA);
      var vKw=claveJs(p.varKw||''), vKvar=claveJs(p.varKvar||''), vPf=claveJs(p.varPf||''), vV=claveJs(p.varV||''), vA=claveJs(p.varA||'');
      var ms=p.pollMs||2000;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #f57c00;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#1a0a00;padding:4px 8px;border-bottom:1px solid #f57c00;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
          '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#f57c00">'+escHtml(p.label||'PM1')+'</span>' +
          '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">POWER METER</span>' +
        '</div>' +
        '<div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:3px;padding:5px">' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">kW</span><span id="pm_kw_'+el.id+'" style="font-family:DM Mono,monospace;font-size:14px;color:#f57c00;font-weight:700">—</span></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">V</span><span id="pm_v_'+el.id+'" style="font-family:DM Mono,monospace;font-size:14px;color:#f0f0e8">—</span></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">A</span><span id="pm_a_'+el.id+'" style="font-family:DM Mono,monospace;font-size:14px;color:#f0f0e8">—</span></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">kVAr</span><span id="pm_kvar_'+el.id+'" style="font-family:DM Mono,monospace;font-size:12px;color:#9a9a90">—</span></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">PF</span><span id="pm_pf_'+el.id+'" style="font-family:DM Mono,monospace;font-size:12px;color:#9a9a90">—</span></div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollPM_'+el.id+'(){\n' +
        '  function s(id,v,dec){ var e=document.getElementById(id); if(e&&v!==null&&v!==undefined)e.textContent=parseFloat(v).toFixed(dec); }\n' +
        '  plcLeer(vars.'+vKw+', function(v){ s("pm_kw_'+el.id+'",v,1); });\n' +
        '  plcLeer(vars.'+vV+', function(v){ s("pm_v_'+el.id+'",v,0); });\n' +
        '  plcLeer(vars.'+vA+', function(v){ s("pm_a_'+el.id+'",v,1); });\n' +
        '  plcLeer(vars.'+vKvar+', function(v){ s("pm_kvar_'+el.id+'",v,1); });\n' +
        '  plcLeer(vars.'+vPf+', function(v){ s("pm_pf_'+el.id+'",v,3); });\n' +
        '}\n\n';
      jsPolling += '  pollPM_'+el.id+'(); setInterval(pollPM_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'production-counter') {
      registrarVar(p.varGood); registrarVar(p.varBad); registrarVar(p.varTarget);
      var vG=claveJs(p.varGood||''), vB=claveJs(p.varBad||''), vTgt=claveJs(p.varTarget||''), ms=p.pollMs||1000;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">'+escHtml(p.label||'PRODUCCIÓN')+'</div>' +
        '<div style="flex:1;display:flex;align-items:center;padding:4px 8px;gap:10px">' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">BUENAS</span><span id="pc_good_'+el.id+'" style="font-family:DM Mono,monospace;font-size:18px;font-weight:700;color:#2e7d32">—</span></div>' +
          '<div style="width:1px;height:30px;background:#2a2a26"></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">MALAS</span><span id="pc_bad_'+el.id+'" style="font-family:DM Mono,monospace;font-size:18px;font-weight:700;color:#c62828">—</span></div>' +
          '<div style="width:1px;height:30px;background:#2a2a26"></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">TARGET</span><span id="pc_tgt_'+el.id+'" style="font-family:DM Mono,monospace;font-size:14px;color:#f9a825">—</span></div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollPC_'+el.id+'(){\n' +
        '  function s(id,v){ var e=document.getElementById(id); if(e&&v!==null)e.textContent=parseInt(v); }\n' +
        '  plcLeer(vars.'+vG+', function(v){ s("pc_good_'+el.id+'",v); });\n' +
        '  plcLeer(vars.'+vB+', function(v){ s("pc_bad_'+el.id+'",v); });\n' +
        '  plcLeer(vars.'+vTgt+', function(v){ s("pc_tgt_'+el.id+'",v); });\n' +
        '}\n\n';
      jsPolling += '  pollPC_'+el.id+'(); setInterval(pollPC_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'cycle-time') {
      registrarVar(p.varActual); registrarVar(p.varRef); registrarVar(p.varMin); registrarVar(p.varMax);
      var vA=claveJs(p.varActual||''), vR=claveJs(p.varRef||''), vMn=claveJs(p.varMin||''), vMx=claveJs(p.varMax||'');
      var ms=p.pollMs||500;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">'+escHtml(p.label||'CICLO')+' · '+escHtml(p.unit||'s')+'</div>' +
        '<div style="flex:1;display:flex;align-items:center;padding:4px 8px;gap:8px">' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">ACTUAL</span><span id="ct_act_'+el.id+'" style="font-family:DM Mono,monospace;font-size:20px;font-weight:700;color:#f0f0e8">—</span></div>' +
          '<div style="display:flex;flex-direction:column;gap:3px">' +
            '<div style="display:flex;gap:4px"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace;width:18px">REF</span><span id="ct_ref_'+el.id+'" style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">—</span></div>' +
            '<div style="display:flex;gap:4px"><span style="font-size:6px;color:#2e7d32;font-family:DM Mono,monospace;width:18px">MIN</span><span id="ct_min_'+el.id+'" style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">—</span></div>' +
            '<div style="display:flex;gap:4px"><span style="font-size:6px;color:#c62828;font-family:DM Mono,monospace;width:18px">MAX</span><span id="ct_max_'+el.id+'" style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90">—</span></div>' +
          '</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollCT_'+el.id+'(){\n' +
        '  function s(id,v,dec){ var e=document.getElementById(id); if(e&&v!==null)e.textContent=parseFloat(v).toFixed(dec); }\n' +
        '  plcLeer(vars.'+vA+', function(v){ if(v===null) return; var act=parseFloat(v); var e=document.getElementById("ct_act_'+el.id+'"); if(e){e.textContent=act.toFixed(1); e.style.color=act>10?"#c62828":"#f0f0e8";} });\n' +
        '  plcLeer(vars.'+vR+', function(v){ s("ct_ref_'+el.id+'",v,1); });\n' +
        '  plcLeer(vars.'+vMn+', function(v){ s("ct_min_'+el.id+'",v,1); });\n' +
        '  plcLeer(vars.'+vMx+', function(v){ s("ct_max_'+el.id+'",v,1); });\n' +
        '}\n\n';
      jsPolling += '  pollCT_'+el.id+'(); setInterval(pollCT_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'quality-gauge') {
      registrarVar(p.varOEE); registrarVar(p.varAvail); registrarVar(p.varPerf); registrarVar(p.varQual);
      var vO=claveJs(p.varOEE||''), vAv=claveJs(p.varAvail||''), vPe=claveJs(p.varPerf||''), vQu=claveJs(p.varQual||'');
      var ms=p.pollMs||5000;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#0a0a08;padding:4px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#9a9a90;flex-shrink:0">'+escHtml(p.label||'OEE')+'</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:4px 8px;gap:3px">' +
          '<div id="qg_oee_'+el.id+'" style="font-family:DM Mono,monospace;font-size:26px;font-weight:700;color:#f9a825;text-align:center;line-height:1">—%</div>' +
          [['DISP','qg_av','#1565c0'],['REND','qg_pe','#2e7d32'],['CALID','qg_qu','#c62828']].map(function(r){
            return '<div style="display:flex;align-items:center;gap:5px">'+
              '<span style="font-size:6px;color:'+r[2]+';font-family:DM Mono,monospace;width:30px">'+r[0]+'</span>'+
              '<div style="flex:1;height:4px;background:#1a1a18;border-radius:2px"><div id="'+r[1]+'_bar_'+el.id+'" style="width:0%;height:100%;background:'+r[2]+';border-radius:2px;transition:width .5s"></div></div>'+
              '<span id="'+r[1]+'_val_'+el.id+'" style="font-size:7px;color:#9a9a90;font-family:DM Mono,monospace;min-width:24px;text-align:right">—%</span>'+
              '</div>';
          }).join('') +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollQG_'+el.id+'(){\n' +
        '  function setBar(bid,vid,v){ if(v===null) return; var pct=Math.max(0,Math.min(100,parseFloat(v))); var b=document.getElementById(bid); if(b)b.style.width=pct+"%"; var t=document.getElementById(vid); if(t)t.textContent=pct.toFixed(0)+"%"; }\n' +
        '  plcLeer(vars.'+vO+', function(v){ var e=document.getElementById("qg_oee_'+el.id+'"); if(e&&v!==null)e.textContent=parseFloat(v).toFixed(0)+"%"; });\n' +
        '  plcLeer(vars.'+vAv+', function(v){ setBar("qg_av_bar_'+el.id+'","qg_av_val_'+el.id+'",v); });\n' +
        '  plcLeer(vars.'+vPe+', function(v){ setBar("qg_pe_bar_'+el.id+'","qg_pe_val_'+el.id+'",v); });\n' +
        '  plcLeer(vars.'+vQu+', function(v){ setBar("qg_qu_bar_'+el.id+'","qg_qu_val_'+el.id+'",v); });\n' +
        '}\n\n';
      jsPolling += '  pollQG_'+el.id+'(); setInterval(pollQG_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'safety-door') {
      registrarVar(p.varOpen); registrarVar(p.varLocked); registrarVar(p.varBypassed);
      var vO=claveJs(p.varOpen||''), vL=claveJs(p.varLocked||''), vBy=claveJs(p.varBypassed||''), ms=p.pollMs||200;
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 100 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="8" y="10" width="84" height="100" rx="4" fill="#263238" stroke="#37474f" stroke-width="2"/>' +
        '<rect id="sd_left_'+el.id+'" x="14" y="16" width="34" height="88" rx="2" fill="#1a1a18" stroke="#37474f" stroke-width="1.5"/>' +
        '<rect id="sd_right_'+el.id+'" x="52" y="16" width="34" height="88" rx="2" fill="#1a1a18" stroke="#37474f" stroke-width="1.5"/>' +
        '<circle id="sd_lock_'+el.id+'" cx="50" cy="60" r="7" fill="#f9a825" stroke="#c07800" stroke-width="1.5"/>' +
        '<circle cx="50" cy="60" r="3" fill="#c07800"/>' +
        '<text id="sd_state_'+el.id+'" x="50" y="114" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">'+escHtml(p.label||'SD1')+' CLOSED</text>' +
        '</svg></div>\n';
      jsEls += 'function pollSD_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vO+', function(v){ var open=(v===true||v==="true"||v===1);\n' +
        '    var l=document.getElementById("sd_left_'+el.id+'"); if(l)l.style.transform=open?"translateX(-8px)":"translateX(0)";\n' +
        '    var r=document.getElementById("sd_right_'+el.id+'"); if(r)r.style.transform=open?"translateX(8px)":"translateX(0)";\n' +
        '    var s=document.getElementById("sd_state_'+el.id+'"); if(s)s.textContent="'+escHtml(p.label||'SD1')+' "+(open?"OPEN":"CLOSED");\n' +
        '    var lk=document.getElementById("sd_lock_'+el.id+'"); if(lk)lk.style.fill=open?"#c62828":"#f9a825";\n' +
        '  });\n' +
        '}\n\n';
      jsPolling += '  pollSD_'+el.id+'(); setInterval(pollSD_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'estop-circuit') {
      registrarVar(p.varOK); registrarVar(p.varFault);
      var vO=claveJs(p.varOK||''), vF=claveJs(p.varFault||''), ms=p.pollMs||200;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#1a0000;border-radius:3px;border:2px solid #c62828;display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;">' +
        '<svg width="32" height="32" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="30" cy="30" r="28" fill="#c62828" stroke="#8b0000" stroke-width="3"/>' +
          '<rect x="14" y="26" width="32" height="8" rx="2" fill="#fff"/>' +
        '</svg>' +
        '<div style="flex:1">' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90">'+escHtml(p.label||'ES1')+' · E-STOP</div>' +
          '<div id="es_state_'+el.id+'" style="font-family:DM Mono,monospace;font-size:14px;font-weight:700;color:#2e7d32;margin-top:2px">OK</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollES_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vO+', function(v){ var ok=(v===true||v==="true"||v===1);\n' +
        '    var s=document.getElementById("es_state_'+el.id+'"); if(s){s.textContent=ok?"OK":"FAULT"; s.style.color=ok?"#2e7d32":"#c62828";}\n' +
        '    var d=document.getElementById("'+el.id+'"); if(d)d.style.borderColor=ok?"#2e7d32":"#c62828";\n' +
        '  });\n' +
        '}\n\n';
      jsPolling += '  pollES_'+el.id+'(); setInterval(pollES_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'two-hand-control') {
      registrarVar(p.varH1); registrarVar(p.varH2); registrarVar(p.varOK);
      var vH1=claveJs(p.varH1||''), vH2=claveJs(p.varH2||''), vOK=claveJs(p.varOK||''), ms=p.pollMs||200;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#1a1a18;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#0f0f0d;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">'+escHtml(p.label||'2H1')+' · 2-HAND</div>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:space-around;padding:0 12px">' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div id="thc_h1_'+el.id+'" style="width:26px;height:26px;border-radius:50%;background:#546e7a;border:2px solid #37474f;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">H1</div></div>' +
          '<div id="thc_ok_'+el.id+'" style="width:28px;height:28px;border-radius:50%;background:#9a9a90;border:2px solid #546e7a;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:9px;color:#fff;font-weight:700">OK</div>' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div id="thc_h2_'+el.id+'" style="width:26px;height:26px;border-radius:50%;background:#546e7a;border:2px solid #37474f;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">H2</div></div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollTHC_'+el.id+'(){\n' +
        '  function setBtn(id,on){ var e=document.getElementById(id); if(e){e.style.background=on?"#2e7d32":"#546e7a"; e.style.color=on?"#fff":"#9a9a90";} }\n' +
        '  plcLeer(vars.'+vH1+', function(v){ setBtn("thc_h1_'+el.id+'",(v===true||v==="true"||v===1)); });\n' +
        '  plcLeer(vars.'+vH2+', function(v){ setBtn("thc_h2_'+el.id+'",(v===true||v==="true"||v===1)); });\n' +
        '  plcLeer(vars.'+vOK+', function(v){ var ok=(v===true||v==="true"||v===1); var e=document.getElementById("thc_ok_'+el.id+'"); if(e){e.style.background=ok?"#2e7d32":"#9a9a90"; e.style.borderColor=ok?"#2e7d32":"#546e7a";} });\n' +
        '}\n\n';
      jsPolling += '  pollTHC_'+el.id+'(); setInterval(pollTHC_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'pump-station') {
      registrarVar(p.varP1Run); registrarVar(p.varP2Run); registrarVar(p.varLevel); registrarVar(p.varFault);
      var vP1=claveJs(p.varP1Run||''), vP2=claveJs(p.varP2Run||''), vLv=claveJs(p.varLevel||''), vF=claveJs(p.varFault||'');
      var ms=p.pollMs||500;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #1565c0;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#000a18;padding:4px 8px;border-bottom:1px solid #1565c0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
          '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#29b6f6">'+escHtml(p.label||'PS1')+'</span>' +
          '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">PUMP STATION</span>' +
        '</div>' +
        '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:6px">' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;border:1px solid #1a1a18;border-radius:2px;padding:4px"><div style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">BOMBA 1</div><div id="ps_p1_'+el.id+'" style="width:14px;height:14px;border-radius:50%;background:#9a9a90;border:2px solid #546e7a"></div></div>' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;border:1px solid #1a1a18;border-radius:2px;padding:4px"><div style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">BOMBA 2</div><div id="ps_p2_'+el.id+'" style="width:14px;height:14px;border-radius:50%;background:#9a9a90;border:2px solid #546e7a"></div></div>' +
          '<div style="grid-column:1/-1;display:flex;flex-direction:column;gap:2px"><div style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">NIVEL</div><div style="height:5px;background:#1a1a18;border-radius:2px"><div id="ps_lv_'+el.id+'" style="width:60%;height:100%;background:#1565c0;border-radius:2px;transition:width .5s"></div></div></div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollPS_'+el.id+'(){\n' +
        '  function setLed(id,on){ var e=document.getElementById(id); if(e){e.style.background=on?"#2e7d32":"#9a9a90"; e.style.borderColor=on?"#2e7d32":"#546e7a";} }\n' +
        '  plcLeer(vars.'+vP1+', function(v){ setLed("ps_p1_'+el.id+'",(v===true||v==="true"||v===1)); });\n' +
        '  plcLeer(vars.'+vP2+', function(v){ setLed("ps_p2_'+el.id+'",(v===true||v==="true"||v===1)); });\n' +
        '  plcLeer(vars.'+vLv+', function(v){ var b=document.getElementById("ps_lv_'+el.id+'"); if(b&&v!==null)b.style.width=Math.max(0,Math.min(100,parseFloat(v)))+"%"; });\n' +
        '}\n\n';
      jsPolling += '  pollPS_'+el.id+'(); setInterval(pollPS_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'trend-comparison') {
      registrarVar(p.varA); registrarVar(p.varB);
      var vA=claveJs(p.varA||''), vB=claveJs(p.varB||''), ms=p.pollMs||1000;
      var pts=parseInt(p.points)||60, mn=parseFloat(p.min)||0, mx=parseFloat(p.max)||100;
      var cA=p.colorA||'#c62828', cB=p.colorB||'#1565c0';
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #1a1a18;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #1a1a18;display:flex;align-items:center;gap:8px;flex-shrink:0">' +
          '<span style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex:1">'+escHtml(p.label||'TREND')+'</span>' +
          '<span style="display:flex;align-items:center;gap:3px;font-family:DM Mono,monospace;font-size:7px;color:'+cA+'"><div style="width:10px;height:2px;background:'+cA+'"></div>'+escHtml(p.labelA||'PV')+'</span>' +
          '<span id="tc_va_'+el.id+'" style="font-family:DM Mono,monospace;font-size:8px;color:'+cA+'">—</span>' +
          '<span style="display:flex;align-items:center;gap:3px;font-family:DM Mono,monospace;font-size:7px;color:'+cB+'"><div style="width:10px;height:2px;background:'+cB+'"></div>'+escHtml(p.labelB||'SP')+'</span>' +
          '<span id="tc_vb_'+el.id+'" style="font-family:DM Mono,monospace;font-size:8px;color:'+cB+'">—</span>' +
        '</div>' +
        '<canvas id="tc_canvas_'+el.id+'" style="flex:1;width:100%"></canvas>' +
        '</div>\n';
      jsEls += 'var _tcA_'+el.id+'=[], _tcB_'+el.id+'=[];\n' +
        '(function(){ var c=document.getElementById("tc_canvas_'+el.id+'"); if(!c) return;\n' +
        '  function draw(){ var ctx=c.getContext("2d"); var w=c.offsetWidth; var h=c.offsetHeight;\n' +
        '    c.width=w; c.height=h;\n' +
        '    ctx.fillStyle="#0f0f0d"; ctx.fillRect(0,0,w,h);\n' +
        '    ctx.strokeStyle="#1a1a18"; ctx.lineWidth=1;\n' +
        '    for(var g=0;g<4;g++){ctx.beginPath();ctx.moveTo(0,g*h/4);ctx.lineTo(w,g*h/4);ctx.stroke();}\n' +
        '    function drawLine(data,color){ if(data.length<2) return; ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.beginPath();\n' +
        '      data.forEach(function(v,i){ var x=i/('+pts+'-1)*w; var y=h-(v-'+mn+')/('+mx+'-'+mn+')*h; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.stroke(); }\n' +
        '    drawLine(_tcA_'+el.id+',"'+cA+'"); drawLine(_tcB_'+el.id+',"'+cB+'");\n' +
        '  }\n' +
        '  function addPt(arr,v){ arr.push(parseFloat(v)); if(arr.length>'+pts+') arr.shift(); }\n' +
        '  function pollTC(){ plcLeer(vars.'+vA+', function(v){ if(v!==null){addPt(_tcA_'+el.id+',v); var e=document.getElementById("tc_va_'+el.id+'"); if(e)e.textContent=parseFloat(v).toFixed(1);} draw(); }); plcLeer(vars.'+vB+', function(v){ if(v!==null){addPt(_tcB_'+el.id+',v); var e=document.getElementById("tc_vb_'+el.id+'"); if(e)e.textContent=parseFloat(v).toFixed(1);} }); }\n' +
        '  setInterval(pollTC, '+ms+'); pollTC();\n' +
        '})();\n\n';
    }

    else if (el.tipo === 'string-display') {
      registrarVar(p.varString);
      var vS=claveJs(p.varString||''), ms=p.pollMs||1000, maxL=parseInt(p.maxLen)||40;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #1a1a18;display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:8px;">' +
        '<div style="display:flex;flex-direction:column;flex:1;overflow:hidden">' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#546e7a">'+escHtml(p.label||'MSG')+'</div>' +
          '<div id="str_val_'+el.id+'" style="font-family:DM Mono,monospace;font-size:12px;color:#f0f0e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">—</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollSTR_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vS+', function(v){ var e=document.getElementById("str_val_'+el.id+'"); if(e&&v!==null) e.textContent=String(v).substring(0,'+maxL+'); });\n' +
        '}\n\n';
      jsPolling += '  pollSTR_'+el.id+'(); setInterval(pollSTR_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'plc-clock-sync') {
      registrarVar(p.varTime); registrarVar(p.varDate);
      var vT=claveJs(p.varTime||''), vD=claveJs(p.varDate||''), ms=p.pollMs||5000;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #1a1a18;display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:10px;">' +
        '<svg width="28" height="28" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="26" fill="none" stroke="#1565c0" stroke-width="3"/><line x1="30" y1="8" x2="30" y2="30" stroke="#f0f0e8" stroke-width="2.5" stroke-linecap="round"/><line x1="30" y1="30" x2="44" y2="38" stroke="#1565c0" stroke-width="2" stroke-linecap="round"/><circle cx="30" cy="30" r="3" fill="#1565c0"/></svg>' +
        '<div style="flex:1">' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#546e7a">'+escHtml(p.label||'PLC TIME')+'</div>' +
          '<div id="pcs_time_'+el.id+'" style="font-family:DM Mono,monospace;font-size:14px;font-weight:700;color:#f0f0e8;letter-spacing:2px">--:--:--</div>' +
          '<div id="pcs_date_'+el.id+'" style="font-family:DM Mono,monospace;font-size:8px;color:#546e7a">-- / -- / ----</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollPCS_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vT+', function(v){ var e=document.getElementById("pcs_time_'+el.id+'"); if(e&&v!==null)e.textContent=String(v); });\n' +
        '  plcLeer(vars.'+vD+', function(v){ var e=document.getElementById("pcs_date_'+el.id+'"); if(e&&v!==null)e.textContent=String(v); });\n' +
        '}\n\n';
      jsPolling += '  pollPCS_'+el.id+'(); setInterval(pollPCS_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'analog-output') {
      registrarVar(p.varOut); registrarVar(p.varMode);
      var vO=claveJs(p.varOut||''), vM=claveJs(p.varMode||''), ms=p.pollMs||500;
      var mn=parseFloat(p.min)||4, mx=parseFloat(p.max)||20;
      var c2='#29b6f6';
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid '+c2+';display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:8px;">' +
        '<div style="display:flex;flex-direction:column;flex:1">' +
          '<div style="display:flex;align-items:center;justify-content:space-between">' +
            '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90">'+escHtml(p.label||'AO1')+' · SA</div>' +
            '<div id="ao_mode_'+el.id+'" style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">AUTO</div>' +
          '</div>' +
          '<div id="ao_val_'+el.id+'" style="font-family:DM Mono,monospace;font-size:20px;font-weight:700;color:'+c2+';line-height:1">— '+escHtml(p.unit||'mA')+'</div>' +
          '<div style="height:4px;background:#1a1a18;border-radius:2px;margin-top:5px"><div id="ao_bar_'+el.id+'" style="width:50%;height:100%;background:'+c2+';border-radius:2px;transition:width .5s"></div></div>' +
          '<div style="display:flex;justify-content:space-between;font-family:DM Mono,monospace;font-size:6px;color:#546e7a;margin-top:1px"><span>'+mn+'</span><span>'+mx+'</span></div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollAO_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vO+', function(v){ if(v===null) return; var val=parseFloat(v);\n' +
        '    var e=document.getElementById("ao_val_'+el.id+'"); if(e)e.textContent=val.toFixed(2)+" '+escHtml(p.unit||'mA')+'";\n' +
        '    var b=document.getElementById("ao_bar_'+el.id+'"); if(b)b.style.width=Math.max(0,Math.min(100,(val-'+mn+')/('+mx+'-'+mn+')*100))+"%";\n' +
        '  });\n' +
        '  plcLeer(vars.'+vM+', function(v){ var e=document.getElementById("ao_mode_'+el.id+'"); if(e){var man=(v===true||v==="true"||v===1); e.textContent=man?"MAN":"AUTO"; e.style.color=man?"#f9a825":"#9a9a90";} });\n' +
        '}\n\n';
      jsPolling += '  pollAO_'+el.id+'(); setInterval(pollAO_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'flow-totalizer') {
      registrarVar(p.varFlow); registrarVar(p.varTotal);
      var vF=claveJs(p.varFlow||''), vT=claveJs(p.varTotal||''), ms=p.pollMs||500, c2=p.color||'#00838f';
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid '+c2+';display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#001a1e;padding:4px 8px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid '+c2+';flex-shrink:0">' +
          '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:'+c2+'">'+escHtml(p.label||'FT1')+'</span>' +
          '<span style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">'+escHtml(p.unit||'m³/h')+'</span>' +
        '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:6px 8px">' +
          '<div style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">CAUDAL</div>' +
          '<div id="ft_flow_'+el.id+'" style="font-family:DM Mono,monospace;font-size:18px;font-weight:700;color:'+c2+'">—</div>' +
          '<div style="height:1px;background:#1a1a18;margin:4px 0"></div>' +
          '<div style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;letter-spacing:1px">TOTAL ACUM.</div>' +
          '<div id="ft_total_'+el.id+'" style="font-family:DM Mono,monospace;font-size:13px;color:#f0f0e8">—</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollFT_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vF+', function(v){ var e=document.getElementById("ft_flow_'+el.id+'"); if(e&&v!==null)e.textContent=parseFloat(v).toFixed(1)+" '+escHtml(p.unit||'m³/h')+'"; });\n' +
        '  plcLeer(vars.'+vT+', function(v){ var e=document.getElementById("ft_total_'+el.id+'"); if(e&&v!==null)e.textContent=parseFloat(v).toFixed(1); });\n' +
        '}\n\n';
      jsPolling += '  pollFT_'+el.id+'(); setInterval(pollFT_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'energy-meter') {
      registrarVar(p.varKw); registrarVar(p.varKwh); registrarVar(p.varPf); registrarVar(p.varV); registrarVar(p.varA);
      var vKw=claveJs(p.varKw||''), vKwh=claveJs(p.varKwh||''), vPf=claveJs(p.varPf||''), vV=claveJs(p.varV||''), vA=claveJs(p.varA||'');
      var ms=p.pollMs||2000;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #f9a825;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#1a1000;padding:4px 8px;border-bottom:1px solid #f9a825;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
          '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#f9a825">'+escHtml(p.label||'EM1')+'</span>' +
          '<span style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">ENERGY</span>' +
        '</div>' +
        '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:2px;padding:5px">' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">kW</span><span id="em_kw_'+el.id+'" style="font-family:DM Mono,monospace;font-size:13px;color:#f9a825;font-weight:700">—</span></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">V</span><span id="em_v_'+el.id+'" style="font-family:DM Mono,monospace;font-size:13px;color:#f0f0e8">—</span></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">A</span><span id="em_a_'+el.id+'" style="font-family:DM Mono,monospace;font-size:13px;color:#f0f0e8">—</span></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">kWh</span><span id="em_kwh_'+el.id+'" style="font-family:DM Mono,monospace;font-size:11px;color:#9a9a90">—</span></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">PF</span><span id="em_pf_'+el.id+'" style="font-family:DM Mono,monospace;font-size:11px;color:#9a9a90">—</span></div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollEM_'+el.id+'(){\n' +
        '  function s(id,v,dec){ var e=document.getElementById(id); if(e&&v!==null)e.textContent=parseFloat(v).toFixed(dec); }\n' +
        '  plcLeer(vars.'+vKw+', function(v){ s("em_kw_'+el.id+'",v,1); });\n' +
        '  plcLeer(vars.'+vKwh+', function(v){ s("em_kwh_'+el.id+'",v,1); });\n' +
        '  plcLeer(vars.'+vPf+', function(v){ s("em_pf_'+el.id+'",v,3); });\n' +
        '  plcLeer(vars.'+vV+', function(v){ s("em_v_'+el.id+'",v,0); });\n' +
        '  plcLeer(vars.'+vA+', function(v){ s("em_a_'+el.id+'",v,1); });\n' +
        '}\n\n';
      jsPolling += '  pollEM_'+el.id+'(); setInterval(pollEM_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'ph-meter') {
      registrarVar(p.varPH); registrarVar(p.varAlarm);
      var vP=claveJs(p.varPH||''), vA=claveJs(p.varAlarm||''), ms=p.pollMs||1000, sp=parseFloat(p.setpoint)||7;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:10px;">' +
        '<div style="display:flex;flex-direction:column;flex:1">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#9a9a90">'+escHtml(p.label||'AT1')+' · pH</div>' +
          '<div id="ph_val_'+el.id+'" style="font-family:DM Mono,monospace;font-size:28px;font-weight:700;color:#f0f0e8;line-height:1">—</div>' +
          '<div style="height:4px;border-radius:2px;background:linear-gradient(to right,#c62828,#f9a825,#2e7d32,#1565c0,#6a1b9a);margin-top:4px;position:relative">' +
            '<div id="ph_ptr_'+el.id+'" style="position:absolute;left:50%;top:-3px;width:2px;height:10px;background:#fff;border-radius:1px;transition:left .5s"></div>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-family:DM Mono,monospace;font-size:7px;color:#546e7a;margin-top:1px"><span>0</span><span>7</span><span>14</span></div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollPH_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vP+', function(v){ if(v===null) return; var ph=parseFloat(v);\n' +
        '    var e=document.getElementById("ph_val_'+el.id+'"); if(e){e.textContent=ph.toFixed(2); e.style.color=Math.abs(ph-'+sp+')>1.5?"#c62828":"#f0f0e8";}\n' +
        '    var ptr=document.getElementById("ph_ptr_'+el.id+'"); if(ptr)ptr.style.left=(ph/14*100)+"%";\n' +
        '  });\n' +
        '}\n\n';
      jsPolling += '  pollPH_'+el.id+'(); setInterval(pollPH_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'rpm-display') {
      registrarVar(p.varRpm); registrarVar(p.varRef);
      var vR=claveJs(p.varRpm||''), vRef=claveJs(p.varRef||''), ms=p.pollMs||500, mx=parseFloat(p.maxRpm)||3000;
      var c2='#29b6f6';
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #1a1a18;display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:8px;">' +
        '<div style="display:flex;flex-direction:column;flex:1">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#9a9a90">'+escHtml(p.label||'ST1')+' · '+escHtml(p.unit||'rpm')+'</div>' +
          '<div id="rp_val_'+el.id+'" style="font-family:DM Mono,monospace;font-size:26px;font-weight:700;color:'+c2+';line-height:1">—</div>' +
          '<div style="height:3px;background:#1a1a18;border-radius:2px;margin-top:4px"><div id="rp_bar_'+el.id+'" style="width:0%;height:100%;background:'+c2+';border-radius:2px;transition:width .5s"></div></div>' +
          '<div style="display:flex;align-items:center;gap:6px;margin-top:3px"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">REF</span><span id="rp_ref_'+el.id+'" style="font-family:DM Mono,monospace;font-size:11px;color:#9a9a90">—</span></div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollRPM_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vR+', function(v){ if(v===null) return; var r=parseFloat(v);\n' +
        '    var e=document.getElementById("rp_val_'+el.id+'"); if(e)e.textContent=Math.round(r);\n' +
        '    var b=document.getElementById("rp_bar_'+el.id+'"); if(b)b.style.width=Math.min(100,r/'+mx+'*100)+"%";\n' +
        '  });\n' +
        '  plcLeer(vars.'+vRef+', function(v){ var e=document.getElementById("rp_ref_'+el.id+'"); if(e&&v!==null)e.textContent=Math.round(parseFloat(v)); });\n' +
        '}\n\n';
      jsPolling += '  pollRPM_'+el.id+'(); setInterval(pollRPM_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'temperature-4zone') {
      registrarVar(p.varT1); registrarVar(p.varT2); registrarVar(p.varT3); registrarVar(p.varT4);
      var v1=claveJs(p.varT1||''), v2=claveJs(p.varT2||''), v3=claveJs(p.varT3||''), v4=claveJs(p.varT4||'');
      var ms=p.pollMs||1000, sp=parseFloat(p.sp)||200, unit=escHtml(p.unit||'°C');
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #1a1a18;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #1a1a18;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">'+escHtml(p.label||'TEMP ZONES')+'</div>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:space-around;padding:0 6px">' +
          [1,2,3,4].map(function(i){
            return '<div style="display:flex;flex-direction:column;align-items:center;gap:2px">'+
              '<div style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">Z'+i+'</div>'+
              '<div id="t4_z'+i+'_'+el.id+'" style="font-family:DM Mono,monospace;font-size:13px;font-weight:700;color:#ef5350">—</div>'+
              '<div style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">'+unit+'</div>'+
              '</div>';
          }).join('') +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollT4_'+el.id+'(){\n' +
        '  function setZ(id,v,sp){ var e=document.getElementById(id); if(e&&v!==null){e.textContent=parseFloat(v).toFixed(1); e.style.color=Math.abs(parseFloat(v)-sp)>10?"#c62828":"#2e7d32";} }\n' +
        '  plcLeer(vars.'+v1+', function(v){ setZ("t4_z1_'+el.id+'",v,'+sp+'); });\n' +
        '  plcLeer(vars.'+v2+', function(v){ setZ("t4_z2_'+el.id+'",v,'+sp+'); });\n' +
        '  plcLeer(vars.'+v3+', function(v){ setZ("t4_z3_'+el.id+'",v,'+sp+'); });\n' +
        '  plcLeer(vars.'+v4+', function(v){ setZ("t4_z4_'+el.id+'",v,'+sp+'); });\n' +
        '}\n\n';
      jsPolling += '  pollT4_'+el.id+'(); setInterval(pollT4_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'interlock-display') {
      var numIL=Math.min(parseInt(p.numIL)||4, 8), ms=p.pollMs||500;
      var vars_il = [];
      for(var ii=1;ii<=numIL;ii++) { registrarVar(p['il'+ii]); vars_il.push(claveJs(p['il'+ii]||'')); }
      var rows = '';
      for(var ii=1;ii<=numIL;ii++) {
        rows += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;border-bottom:1px solid #1a1a18">' +
          '<div id="il_dot_'+el.id+'_'+ii+'" style="width:8px;height:8px;border-radius:50%;background:#9a9a90;flex-shrink:0"></div>' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90;flex:1">'+escHtml(p['iln'+ii]||('IL'+ii))+'</div>' +
          '<div id="il_val_'+el.id+'_'+ii+'" style="font-family:DM Mono,monospace;font-size:7px;color:#546e7a">—</div>' +
          '</div>';
      }
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">'+escHtml(p.label||'INTERLOCKS')+'</div>' +
        '<div style="flex:1;padding:4px 8px;overflow:hidden">'+rows+'</div>' +
        '</div>\n';
      var ilPollCode = 'function pollIL_'+el.id+'(){\n';
      for(var ii=1;ii<=numIL;ii++){
        var vk=vars_il[ii-1];
        ilPollCode += '  (function(idx,vk){ plcLeer(vk, function(v){ var ok=(v===true||v==="true"||v===1||v!==null); var d=document.getElementById("il_dot_'+el.id+'_"+idx); var t=document.getElementById("il_val_'+el.id+'_"+idx); var on=(v===true||v==="true"||v===1); if(d){d.style.background=on?"#2e7d32":"#c62828";} if(t)t.textContent=on?"OK":"FAULT"; }); })('+ii+',vars.'+vk+');\n';
      }
      ilPollCode += '}\n\n';
      jsEls += ilPollCode;
      jsPolling += '  pollIL_'+el.id+'(); setInterval(pollIL_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'batch-display') {
      registrarVar(p.varBatch); registrarVar(p.varStep); registrarVar(p.varPct); registrarVar(p.varActive);
      var vBt=claveJs(p.varBatch||''), vSt=claveJs(p.varStep||''), vPct=claveJs(p.varPct||''), vAct=claveJs(p.varActive||'');
      var ms=p.pollMs||1000;
      var steps=(p.stepNames||'PREPARE,REACT,COOL,END').split(',');
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #6a1b9a;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#0e0014;padding:4px 8px;border-bottom:1px solid #6a1b9a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
          '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#ce93d8">'+escHtml(p.label||'BATCH')+'</span>' +
          '<span id="bt_state_'+el.id+'" style="font-family:DM Mono,monospace;font-size:8px;color:#9a9a90">IDLE</span>' +
        '</div>' +
        '<div style="flex:1;padding:5px 8px;display:flex;flex-direction:column;gap:4px">' +
          '<div style="display:flex;align-items:center;gap:6px">' +
            '<span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace;min-width:28px">STEP</span>' +
            '<span id="bt_step_'+el.id+'" style="font-family:DM Mono,monospace;font-size:11px;color:#ce93d8">—</span>' +
          '</div>' +
          '<div style="height:5px;background:#1a1a18;border-radius:2px"><div id="bt_bar_'+el.id+'" style="width:0%;height:100%;background:#6a1b9a;border-radius:2px;transition:width .5s"></div></div>' +
          '<div style="display:flex;justify-content:space-between"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">BATCH ID</span><span id="bt_id_'+el.id+'" style="font-family:DM Mono,monospace;font-size:9px;color:#f0f0e8">—</span></div>' +
        '</div>' +
        '</div>\n';
      var stepNamesJs = JSON.stringify(steps);
      jsEls += 'var _btSteps_'+el.id+'='+stepNamesJs+';\n' +
        'function pollBT_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vBt+', function(v){ var e=document.getElementById("bt_id_'+el.id+'"); if(e&&v!==null)e.textContent=String(v); });\n' +
        '  plcLeer(vars.'+vSt+', function(v){ if(v===null) return; var i=parseInt(v)-1; var e=document.getElementById("bt_step_'+el.id+'"); if(e)e.textContent=_btSteps_'+el.id+'[i]||("STEP "+parseInt(v)); });\n' +
        '  plcLeer(vars.'+vPct+', function(v){ var b=document.getElementById("bt_bar_'+el.id+'"); if(b&&v!==null)b.style.width=Math.max(0,Math.min(100,parseFloat(v)))+"%"; });\n' +
        '  plcLeer(vars.'+vAct+', function(v){ var s=document.getElementById("bt_state_'+el.id+'"); if(s){var r=(v===true||v==="true"||v===1); s.textContent=r?"RUNNING":"IDLE"; s.style.color=r?"#ce93d8":"#9a9a90";} });\n' +
        '}\n\n';
      jsPolling += '  pollBT_'+el.id+'(); setInterval(pollBT_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'ups-display') {
      registrarVar(p.varBat); registrarVar(p.varState); registrarVar(p.varLoad);
      var vBat=claveJs(p.varBat||''), vSt=claveJs(p.varState||''), vLd=claveJs(p.varLoad||''), ms=p.pollMs||5000;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #2e7d32;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#001400;padding:4px 8px;border-bottom:1px solid #2e7d32;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
          '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#2e7d32">'+escHtml(p.label||'UPS1')+'</span>' +
          '<span id="ups_state_'+el.id+'" style="font-family:DM Mono,monospace;font-size:7px;background:#2e7d32;color:#fff;padding:1px 5px;border-radius:2px">ONLINE</span>' +
        '</div>' +
        '<div style="flex:1;display:flex;align-items:center;padding:6px 10px;gap:12px">' +
          '<svg width="24" height="40" viewBox="0 0 24 40" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="32" rx="3" fill="none" stroke="#2e7d32" stroke-width="2"/><rect x="8" y="1" width="8" height="4" rx="1" fill="#2e7d32"/><rect id="ups_bat_fill_'+el.id+'" x="5" y="22" width="14" height="13" rx="2" fill="#2e7d32" opacity=".6"/><text id="ups_bat_txt_'+el.id+'" x="12" y="20" text-anchor="middle" font-family="DM Mono,monospace" font-size="6" fill="#2e7d32">—%</text></svg>' +
          '<div style="flex:1;display:flex;flex-direction:column;gap:4px">' +
            '<div><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">BATERÍA</span><div style="height:5px;background:#1a1a18;border-radius:2px;margin-top:2px"><div id="ups_bar_'+el.id+'" style="width:0%;height:100%;background:#2e7d32;border-radius:2px;transition:width .5s"></div></div></div>' +
            '<div style="display:flex;justify-content:space-between"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">CARGA</span><span id="ups_load_'+el.id+'" style="font-family:DM Mono,monospace;font-size:9px;color:#f0f0e8">—%</span></div>' +
          '</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollUPS_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vBat+', function(v){ if(v===null) return; var pct=Math.max(0,Math.min(100,parseFloat(v)));\n' +
        '    var b=document.getElementById("ups_bar_'+el.id+'"); if(b){b.style.width=pct+"%"; b.style.background=pct<20?"#c62828":pct<50?"#f9a825":"#2e7d32";}\n' +
        '    var t=document.getElementById("ups_bat_txt_'+el.id+'"); if(t)t.textContent=Math.round(pct)+"%";\n' +
        '    var f=document.getElementById("ups_bat_fill_'+el.id+'"); if(f)f.setAttribute("y",String(22+(13*(1-pct/100))));\n' +
        '    var fh=document.getElementById("ups_bat_fill_'+el.id+'"); if(fh)fh.setAttribute("height",String(13*pct/100));\n' +
        '  });\n' +
        '  plcLeer(vars.'+vLd+', function(v){ var e=document.getElementById("ups_load_'+el.id+'"); if(e&&v!==null)e.textContent=parseFloat(v).toFixed(0)+"%"; });\n' +
        '}\n\n';
      jsPolling += '  pollUPS_'+el.id+'(); setInterval(pollUPS_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'generator-display') {
      registrarVar(p.varHz); registrarVar(p.varV); registrarVar(p.varKw); registrarVar(p.varRun);
      var vHz=claveJs(p.varHz||''), vV=claveJs(p.varV||''), vKw=claveJs(p.varKw||''), vR=claveJs(p.varRun||'');
      var ms=p.pollMs||1000;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #546e7a;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="background:#0a0a08;padding:4px 8px;border-bottom:1px solid #546e7a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
          '<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#90a4ae">'+escHtml(p.label||'GEN1')+'</span>' +
          '<span id="gen_state_'+el.id+'" style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">STOP</span>' +
        '</div>' +
        '<div style="flex:1;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:1fr 1fr;gap:4px;padding:6px">' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">Hz</span><span id="gen_hz_'+el.id+'" style="font-family:DM Mono,monospace;font-size:16px;color:#90a4ae;font-weight:700">—</span></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">V</span><span id="gen_v_'+el.id+'" style="font-family:DM Mono,monospace;font-size:16px;color:#f0f0e8;font-weight:700">—</span></div>' +
          '<div style="display:flex;flex-direction:column"><span style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace">kW</span><span id="gen_kw_'+el.id+'" style="font-family:DM Mono,monospace;font-size:14px;color:#f9a825">—</span></div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollGEN_'+el.id+'(){\n' +
        '  function s(id,v,dec){ var e=document.getElementById(id); if(e&&v!==null)e.textContent=parseFloat(v).toFixed(dec); }\n' +
        '  s("gen_hz_'+el.id+'",null,1); plcLeer(vars.'+vHz+', function(v){ s("gen_hz_'+el.id+'",v,1); });\n' +
        '  plcLeer(vars.'+vV+', function(v){ s("gen_v_'+el.id+'",v,0); });\n' +
        '  plcLeer(vars.'+vKw+', function(v){ s("gen_kw_'+el.id+'",v,1); });\n' +
        '  plcLeer(vars.'+vR+', function(v){ var e=document.getElementById("gen_state_'+el.id+'"); if(e){var run=(v===true||v==="true"||v===1); e.textContent=run?"RUN":"STOP"; e.style.color=run?"#2e7d32":"#9a9a90";} });\n' +
        '}\n\n';
      jsPolling += '  pollGEN_'+el.id+'(); setInterval(pollGEN_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'compressed-air') {
      registrarVar(p.varPres); registrarVar(p.varFlow); registrarVar(p.varAlarm);
      var vP=claveJs(p.varPres||''), vF=claveJs(p.varFlow||''), vA=claveJs(p.varAlarm||''), ms=p.pollMs||1000, c2='#00838f';
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid '+c2+';display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:10px;">' +
        '<svg width="32" height="32" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="30" cy="30" r="26" fill="none" stroke="'+c2+'" stroke-width="3"/>' +
          '<path d="M20,40 Q30,10 40,40" fill="none" stroke="'+c2+'" stroke-width="2"/>' +
          '<path d="M15,38 Q30,5 45,38" fill="none" stroke="'+c2+'" stroke-width="1.5" opacity=".5"/>' +
          '<circle cx="30" cy="30" r="3" fill="'+c2+'"/>' +
        '</svg>' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:3px">' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90">'+escHtml(p.label||'AIR')+' · AIRE COMPRIMIDO</div>' +
          '<div id="air_pres_'+el.id+'" style="font-family:DM Mono,monospace;font-size:18px;font-weight:700;color:'+c2+'">— bar</div>' +
          '<div id="air_flow_'+el.id+'" style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">CAUDAL: — m³/h</div>' +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollAIR_'+el.id+'(){\n' +
        '  plcLeer(vars.'+vP+', function(v){ var e=document.getElementById("air_pres_'+el.id+'"); if(e&&v!==null)e.textContent=parseFloat(v).toFixed(2)+" bar"; });\n' +
        '  plcLeer(vars.'+vF+', function(v){ var e=document.getElementById("air_flow_'+el.id+'"); if(e&&v!==null)e.textContent="CAUDAL: "+parseFloat(v).toFixed(1)+" m³/h"; });\n' +
        '}\n\n';
      jsPolling += '  pollAIR_'+el.id+'(); setInterval(pollAIR_'+el.id+', '+ms+');\n';
    }





    /* ══════════════════════════════════════════════════════
       NUEVOS ELEMENTOS P&ID / PROCESO
    ══════════════════════════════════════════════════════ */

    else if (el.tipo === 'valve-motorized') {
      registrarVar(p.varOpen); registrarVar(p.varClosed); registrarVar(p.varPct);
      var vkO=claveJs(p.varOpen||''), vkC=claveJs(p.varClosed||''), vkP=claveJs(p.varPct||'');
      var c2=p.color||'#546e7a', ms=p.pollMs||500;
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 80 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="28" y="0" width="24" height="18" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<rect x="34" y="8" width="12" height="24" rx="2" fill="#546e7a" stroke="#263238" stroke-width="1"/>'
        +'<polygon id="vml_'+el.id+'" points="0,36 30,52 0,68" fill="'+c2+'" stroke="#263238" stroke-width="1.5"/>'
        +'<polygon points="80,36 50,52 80,68" fill="none" stroke="'+c2+'" stroke-width="2"/>'
        +'<line x1="40" y1="32" x2="40" y2="52" stroke="'+c2+'" stroke-width="2"/>'
        +'<circle cx="40" cy="52" r="5" fill="#90a4ae"/>'
        +'<text x="40" y="86" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" font-weight="700" fill="'+c2+'">'+escHtml(p.label||'V1')+'</text>'
        +'<text id="vpct_'+el.id+'" x="40" y="96" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">--%</text>'
        +'</svg></div>\n';
      jsEls += 'function pollVM_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vkP+', function(v){ var t=document.getElementById("vpct_'+el.id+'"); if(t&&v!==null)t.textContent=parseFloat(v).toFixed(0)+"%"; });\n'
        +'  plcLeer(vars.'+vkO+', function(v){ var l=document.getElementById("vml_'+el.id+'"); if(l)l.style.fill=(v===true||v==="true"||v===1)?"#2e7d32":"'+c2+'"; });\n'
        +'}\n\n';
      jsPolling += '  pollVM_'+el.id+'(); setInterval(pollVM_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'valve-butterfly') {
      registrarVar(p.varOpen); registrarVar(p.varPct);
      var vkO=claveJs(p.varOpen||''), vkP=claveJs(p.varPct||''), ms=p.pollMs||500, c2=p.color||'#546e7a';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<circle cx="40" cy="40" r="30" fill="none" stroke="'+c2+'" stroke-width="3"/>'
        +'<ellipse id="vbdisk_'+el.id+'" cx="40" cy="40" rx="12" ry="28" fill="'+c2+'" opacity=".5" stroke="'+c2+'" stroke-width="1.5"/>'
        +'<line x1="40" y1="10" x2="40" y2="70" stroke="'+c2+'" stroke-width="2.5"/>'
        +'<rect x="34" y="0" width="12" height="12" rx="2" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<text x="40" y="78" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c2+'">'+escHtml(p.label||'VB1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'function pollVB_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vkO+', function(v){ var d=document.getElementById("vbdisk_'+el.id+'"); if(d)d.style.fill=(v===true||v==="true"||v===1)?"#2e7d32":"'+c2+'"; });\n'
        +'}\n\n';
      jsPolling += '  pollVB_'+el.id+'(); setInterval(pollVB_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'valve-safety') {
      registrarVar(p.varOpen); registrarVar(p.varAlarm);
      var vkO=claveJs(p.varOpen||''), vkA=claveJs(p.varAlarm||''), ms=p.pollMs||500, c2=p.color||'#c62828';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 80 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<polygon id="vsbl_'+el.id+'" points="0,30 30,46 0,62" fill="'+c2+'" stroke="#8b0000" stroke-width="1.5"/>'
        +'<polygon points="80,30 50,46 80,62" fill="none" stroke="'+c2+'" stroke-width="2"/>'
        +'<rect x="30" y="0" width="20" height="30" rx="2" fill="'+c2+'" stroke="#8b0000" stroke-width="1.5"/>'
        +'<rect x="36" y="4" width="8" height="18" rx="1" fill="#ffcdd2"/>'
        +'<text x="40" y="78" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" font-weight="700" fill="'+c2+'">'+escHtml(p.label||'PSV1')+'</text>'
        +'<text x="40" y="88" text-anchor="middle" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">SAFETY</text>'
        +'</svg></div>\n';
      jsEls += 'function pollVSF_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vkO+', function(v){ var l=document.getElementById("vsbl_'+el.id+'"); if(l)l.style.fill=(v===true||v==="true"||v===1)?"#ef5350":"'+c2+'"; });\n'
        +'}\n\n';
      jsPolling += '  pollVSF_'+el.id+'(); setInterval(pollVSF_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'fan-symbol') {
      registrarVar(p.varRun); registrarVar(p.varFault); registrarVar(p.varHz);
      var vkR=claveJs(p.varRun||''), vkF=claveJs(p.varFault||''), vkH=claveJs(p.varHz||''), ms=p.pollMs||500, c2=p.color||'#546e7a';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<circle cx="50" cy="50" r="44" fill="none" stroke="'+c2+'" stroke-width="2.5"/>'
        +'<g id="fanblades_'+el.id+'" style="transform-origin:50px 50px;transition:transform .1s">'
        +'<ellipse cx="50" cy="22" rx="10" ry="20" fill="'+c2+'" opacity=".7" transform="rotate(0 50 50)"/>'
        +'<ellipse cx="50" cy="22" rx="10" ry="20" fill="'+c2+'" opacity=".7" transform="rotate(120 50 50)"/>'
        +'<ellipse cx="50" cy="22" rx="10" ry="20" fill="'+c2+'" opacity=".7" transform="rotate(240 50 50)"/>'
        +'</g>'
        +'<circle cx="50" cy="50" r="7" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<text id="fanstate_'+el.id+'" x="50" y="96" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">'+escHtml(p.label||'FA1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'var _fanAngle_'+el.id+'=0,_fanTimer_'+el.id+'=null;\n'
        +'function pollFAN_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vkR+', function(v){\n'
        +'    var run=(v===true||v==="true"||v===1);\n'
        +'    var g=document.getElementById("fanblades_'+el.id+'");\n'
        +'    if(run&&!_fanTimer_'+el.id+'){\n'
        +'      _fanTimer_'+el.id+'=setInterval(function(){_fanAngle_'+el.id+'=(_fanAngle_'+el.id+'+6)%360;if(g)g.style.transform="rotate("+_fanAngle_'+el.id+'+"deg)";},30);\n'
        +'    } else if(!run&&_fanTimer_'+el.id+'){clearInterval(_fanTimer_'+el.id+');_fanTimer_'+el.id+'=null;if(g)g.style.transform="";}\n'
        +'    var s=document.getElementById("fanstate_'+el.id+'");if(s)s.style.fill=run?"#2e7d32":"#9a9a90";\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollFAN_'+el.id+'(); setInterval(pollFAN_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'agitator-symbol') {
      registrarVar(p.varRun); registrarVar(p.varRpm);
      var vkR=claveJs(p.varRun||''), vkRpm=claveJs(p.varRpm||''), ms=p.pollMs||500, c2=p.color||'#546e7a';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 80 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="36" y="0" width="8" height="60" rx="2" fill="'+c2+'" stroke="#263238" stroke-width="1"/>'
        +'<rect x="20" y="0" width="40" height="8" rx="2" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<g id="agblades_'+el.id+'" style="transform-origin:40px 70px">'
        +'<line x1="40" y1="60" x2="10" y2="90" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>'
        +'<line x1="40" y1="60" x2="70" y2="90" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>'
        +'<line x1="40" y1="70" x2="12" y2="95" stroke="'+c2+'" stroke-width="3" stroke-linecap="round"/>'
        +'<line x1="40" y1="70" x2="68" y2="95" stroke="'+c2+'" stroke-width="3" stroke-linecap="round"/>'
        +'</g>'
        +'<circle cx="40" cy="60" r="5" fill="#90a4ae" stroke="#263238" stroke-width="1"/>'
        +'<text id="agstate_'+el.id+'" x="40" y="114" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c2+'">'+escHtml(p.label||'AG1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'var _agAngle_'+el.id+'=0,_agTimer_'+el.id+'=null;\n'
        +'function pollAG_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vkR+', function(v){\n'
        +'    var run=(v===true||v==="true"||v===1);\n'
        +'    var g=document.getElementById("agblades_'+el.id+'");\n'
        +'    if(run&&!_agTimer_'+el.id+'){\n'
        +'      _agTimer_'+el.id+'=setInterval(function(){_agAngle_'+el.id+'=(_agAngle_'+el.id+'+3)%360;if(g)g.style.transform="rotate("+_agAngle_'+el.id+'+"deg)";},40);\n'
        +'    } else if(!run&&_agTimer_'+el.id+'){clearInterval(_agTimer_'+el.id+');_agTimer_'+el.id+'=null;if(g)g.style.transform="";}\n'
        +'    var s=document.getElementById("agstate_'+el.id+'");if(s)s.style.fill=run?"#2e7d32":"'+c2+'";\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollAG_'+el.id+'(); setInterval(pollAG_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'conveyor-pid') {
      registrarVar(p.varRun); registrarVar(p.varSpeed); registrarVar(p.varFault);
      var vkR=claveJs(p.varRun||''), vkS=claveJs(p.varSpeed||''), vkF=claveJs(p.varFault||''), ms=p.pollMs||500, c2=p.color||'#37474f';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 240 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="20" y="22" width="200" height="26" rx="4" fill="'+c2+'" stroke="#1a1a14" stroke-width="2"/>'
        +'<rect x="24" y="26" width="192" height="6" rx="2" fill="rgba(255,255,255,.15)"/>'
        +'<rect x="24" y="30" width="192" height="14" rx="2" fill="#29b6f6" opacity=".25"/>'
        +'<line id="cvbelt_'+el.id+'" x1="24" y1="34" x2="216" y2="34" stroke="#546e7a" stroke-width="1" stroke-dasharray="12,8"/>'
        +'<circle cx="20" cy="35" r="13" fill="'+c2+'" stroke="#1a1a14" stroke-width="2"/>'
        +'<circle cx="20" cy="35" r="5" fill="#1a1a14"/>'
        +'<circle cx="220" cy="35" r="13" fill="'+c2+'" stroke="#1a1a14" stroke-width="2"/>'
        +'<circle cx="220" cy="35" r="5" fill="#1a1a14"/>'
        +'<rect x="30" y="48" width="8" height="22" rx="2" fill="'+c2+'" stroke="#1a1a14" stroke-width="1"/>'
        +'<rect x="80" y="48" width="8" height="22" rx="2" fill="'+c2+'" stroke="#1a1a14" stroke-width="1"/>'
        +'<rect x="130" y="48" width="8" height="22" rx="2" fill="'+c2+'" stroke="#1a1a14" stroke-width="1"/>'
        +'<rect x="180" y="48" width="8" height="22" rx="2" fill="'+c2+'" stroke="#1a1a14" stroke-width="1"/>'
        +'<rect x="22" y="68" width="196" height="8" rx="2" fill="'+c2+'" stroke="#1a1a14" stroke-width="1"/>'
        +'<text id="cvstate_'+el.id+'" x="120" y="14" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" font-weight="700" fill="#9a9a90">'+escHtml(p.label||'CV1')+' STOP</text>'
        +'</svg></div>\n';
      jsEls += 'var _cvOff_'+el.id+'=0,_cvTimer_'+el.id+'=null;\n'
        +'function pollCV_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vkR+', function(v){\n'
        +'    var run=(v===true||v==="true"||v===1);\n'
        +'    var belt=document.getElementById("cvbelt_'+el.id+'");\n'
        +'    var lbl=document.getElementById("cvstate_'+el.id+'");\n'
        +'    if(run&&!_cvTimer_'+el.id+'){\n'
        +'      _cvTimer_'+el.id+'=setInterval(function(){_cvOff_'+el.id+'=(_cvOff_'+el.id+'-2)%20;if(belt)belt.setAttribute("stroke-dashoffset",_cvOff_'+el.id+');},50);\n'
        +'    } else if(!run&&_cvTimer_'+el.id+'){clearInterval(_cvTimer_'+el.id+');_cvTimer_'+el.id+'=null;}\n'
        +'    if(lbl)lbl.style.fill=run?"#2e7d32":"#9a9a90";\n'
        +'    plcLeer(vars.'+vkS+', function(sp){if(lbl&&sp!==null)lbl.textContent="'+escHtml(p.label||'CV1')+' "+(run?parseFloat(sp).toFixed(0)+"m/min":"STOP");});\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollCV_'+el.id+'(); setInterval(pollCV_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'dosing-pump') {
      registrarVar(p.varRun); registrarVar(p.varFlow); registrarVar(p.varFault);
      var vkR=claveJs(p.varRun||''), vkF=claveJs(p.varFlow||''), vkFt=claveJs(p.varFault||''), ms=p.pollMs||500, c2=p.color||'#1565c0';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 90 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="15" y="85" width="60" height="10" rx="2" fill="#263238" stroke="#1a1a14" stroke-width="1"/>'
        +'<rect x="10" y="40" width="70" height="46" rx="5" fill="'+c2+'" stroke="#0d47a1" stroke-width="2"/>'
        +'<ellipse cx="45" cy="63" rx="22" ry="20" fill="#1a237e" stroke="#0d47a1" stroke-width="1.5"/>'
        +'<ellipse id="dp_disk_'+el.id+'" cx="45" cy="63" rx="12" ry="11" fill="'+c2+'" stroke="#1a237e" stroke-width="1"/>'
        +'<circle cx="45" cy="63" r="4" fill="#90caf9"/>'
        +'<rect x="38" y="0" width="14" height="42" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<rect x="80" y="55" width="10" height="20" rx="2" fill="'+c2+'" stroke="#0d47a1" stroke-width="1.5"/>'
        +'<text id="dp_state_'+el.id+'" x="45" y="104" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">'+escHtml(p.label||'DP1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'var _dpAngle_'+el.id+'=0,_dpTimer_'+el.id+'=null;\n'
        +'function pollDP_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vkR+', function(v){\n'
        +'    var run=(v===true||v==="true"||v===1);\n'
        +'    var d=document.getElementById("dp_disk_'+el.id+'");\n'
        +'    if(run&&!_dpTimer_'+el.id+'){\n'
        +'      _dpTimer_'+el.id+'=setInterval(function(){_dpAngle_'+el.id+'=(_dpAngle_'+el.id+'+8)%360;if(d)d.style.transform="rotate("+_dpAngle_'+el.id+'+"deg)";d.style.transformOrigin="45px 63px";},60);\n'
        +'    } else if(!run&&_dpTimer_'+el.id+'){clearInterval(_dpTimer_'+el.id+');_dpTimer_'+el.id+'=null;if(d)d.style.transform="";}\n'
        +'    var s=document.getElementById("dp_state_'+el.id+'");if(s)s.style.fill=run?"#2e7d32":"#9a9a90";\n'
        +'  });\n'
        +'  plcLeer(vars.'+vkF+', function(v){var s=document.getElementById("dp_state_'+el.id+'");if(s&&v!==null)s.textContent="'+escHtml(p.label||'DP1')+' "+parseFloat(v).toFixed(1)+"L/h";});\n'
        +'}\n\n';
      jsPolling += '  pollDP_'+el.id+'(); setInterval(pollDP_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'heat-exchanger') {
      registrarVar(p.varActive); registrarVar(p.varTin); registrarVar(p.varTout);
      var vA=claveJs(p.varActive||''), vTi=claveJs(p.varTin||''), vTo=claveJs(p.varTout||''), ms=p.pollMs||1000, c2=p.color||'#c62828';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 120 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="10" y="20" width="100" height="60" rx="5" fill="#37474f" stroke="#263238" stroke-width="2"/>'
        +'<rect x="18" y="28" width="84" height="44" rx="3" fill="#263238"/>'
        +'<line id="he_h1_'+el.id+'" x1="18" y1="38" x2="102" y2="38" stroke="'+c2+'" stroke-width="3" stroke-linecap="round"/>'
        +'<line x1="18" y1="48" x2="102" y2="48" stroke="#29b6f6" stroke-width="3" stroke-linecap="round"/>'
        +'<line id="he_h2_'+el.id+'" x1="18" y1="58" x2="102" y2="58" stroke="'+c2+'" stroke-width="3" stroke-linecap="round"/>'
        +'<line x1="18" y1="68" x2="102" y2="68" stroke="#29b6f6" stroke-width="3" stroke-linecap="round"/>'
        +'<rect x="0" y="28" width="18" height="12" rx="2" fill="'+c2+'" stroke="#8b0000" stroke-width="1.5"/>'
        +'<rect x="102" y="48" width="18" height="12" rx="2" fill="'+c2+'" stroke="#8b0000" stroke-width="1.5"/>'
        +'<rect x="0" y="60" width="18" height="12" rx="2" fill="#29b6f6" stroke="#0277bd" stroke-width="1.5"/>'
        +'<rect x="102" y="28" width="18" height="12" rx="2" fill="#29b6f6" stroke="#0277bd" stroke-width="1.5"/>'
        +'<text id="he_tin_'+el.id+'" x="9" y="22" text-anchor="middle" font-family="DM Mono,monospace" font-size="7" fill="'+c2+'">--°</text>'
        +'<text id="he_tout_'+el.id+'" x="111" y="22" text-anchor="middle" font-family="DM Mono,monospace" font-size="7" fill="'+c2+'">--°</text>'
        +'<text x="60" y="96" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">'+escHtml(p.label||'HE1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'function pollHE_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vTi+', function(v){var e=document.getElementById("he_tin_'+el.id+'");if(e&&v!==null)e.textContent=parseFloat(v).toFixed(1)+"°";});\n'
        +'  plcLeer(vars.'+vTo+', function(v){var e=document.getElementById("he_tout_'+el.id+'");if(e&&v!==null)e.textContent=parseFloat(v).toFixed(1)+"°";});\n'
        +'  plcLeer(vars.'+vA+', function(v){\n'
        +'    var on=(v===true||v==="true"||v===1);\n'
        +'    var h1=document.getElementById("he_h1_'+el.id+'"),h2=document.getElementById("he_h2_'+el.id+'");\n'
        +'    if(h1)h1.style.opacity=on?"1":"0.3"; if(h2)h2.style.opacity=on?"1":"0.3";\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollHE_'+el.id+'(); setInterval(pollHE_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'filter-symbol') {
      registrarVar(p.varDP); registrarVar(p.varDirty);
      var vDP=claveJs(p.varDP||''), vD=claveJs(p.varDirty||''), ms=p.pollMs||1000, c2=p.color||'#546e7a';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 80 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect id="filt_body_'+el.id+'" x="10" y="10" width="60" height="64" rx="5" fill="'+c2+'" stroke="#263238" stroke-width="2"/>'
        +'<rect x="18" y="18" width="44" height="48" rx="3" fill="#263238"/>'
        +'<line x1="18" y1="28" x2="62" y2="28" stroke="#546e7a" stroke-width="2"/>'
        +'<line x1="22" y1="36" x2="58" y2="36" stroke="#546e7a" stroke-width="2"/>'
        +'<line x1="26" y1="44" x2="54" y2="44" stroke="#546e7a" stroke-width="2"/>'
        +'<line x1="30" y1="52" x2="50" y2="52" stroke="#546e7a" stroke-width="2"/>'
        +'<line x1="34" y1="60" x2="46" y2="60" stroke="#546e7a" stroke-width="2"/>'
        +'<rect x="32" y="0" width="16" height="12" rx="2" fill="'+c2+'" stroke="#263238" stroke-width="1.5"/>'
        +'<rect x="32" y="74" width="16" height="12" rx="2" fill="'+c2+'" stroke="#263238" stroke-width="1.5"/>'
        +'<text id="filt_dp_'+el.id+'" x="40" y="88" text-anchor="middle" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">'+escHtml(p.label||'F1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'function pollFILT_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vD+', function(v){\n'
        +'    var dirty=(v===true||v==="true"||v===1);\n'
        +'    var b=document.getElementById("filt_body_'+el.id+'");if(b)b.style.fill=dirty?"#f57c00":"'+c2+'";\n'
        +'  });\n'
        +'  plcLeer(vars.'+vDP+', function(v){var e=document.getElementById("filt_dp_'+el.id+'");if(e&&v!==null)e.textContent="'+escHtml(p.label||'F1')+' DP:"+parseFloat(v).toFixed(2);});\n'
        +'}\n\n';
      jsPolling += '  pollFILT_'+el.id+'(); setInterval(pollFILT_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'compressor-symbol') {
      registrarVar(p.varRun); registrarVar(p.varFault); registrarVar(p.varRpm);
      var vkR=claveJs(p.varRun||''), vkF=claveJs(p.varFault||''), vkRpm=claveJs(p.varRpm||''), ms=p.pollMs||500, c2=p.color||'#37474f';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 90 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="5" y="90" width="80" height="10" rx="2" fill="#263238"/>'
        +'<rect x="15" y="40" width="60" height="52" rx="5" fill="'+c2+'" stroke="#263238" stroke-width="2"/>'
        +'<circle cx="45" cy="64" r="20" fill="#455a64" stroke="#263238" stroke-width="2"/>'
        +'<circle id="comp_disk_'+el.id+'" cx="45" cy="64" r="10" fill="'+c2+'" stroke="#263238" stroke-width="1.5"/>'
        +'<circle cx="45" cy="64" r="4" fill="#90a4ae"/>'
        +'<rect x="30" y="0" width="30" height="42" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<rect x="36" y="6" width="18" height="28" rx="2" fill="#37474f"/>'
        +'<rect id="comp_piston_'+el.id+'" x="38" y="18" width="14" height="8" rx="1" fill="#90a4ae"/>'
        +'<text id="comp_state_'+el.id+'" x="45" y="107" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">'+escHtml(p.label||'C1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'var _compAngle_'+el.id+'=0,_compTimer_'+el.id+'=null;\n'
        +'function pollCOMP_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vkR+', function(v){\n'
        +'    var run=(v===true||v==="true"||v===1);\n'
        +'    var d=document.getElementById("comp_disk_'+el.id+'");\n'
        +'    var pi=document.getElementById("comp_piston_'+el.id+'");\n'
        +'    if(run&&!_compTimer_'+el.id+'){\n'
        +'      _compTimer_'+el.id+'=setInterval(function(){\n'
        +'        _compAngle_'+el.id+'=(_compAngle_'+el.id+'+8)%360;\n'
        +'        if(d){d.style.transform="rotate("+_compAngle_'+el.id+'+"deg)";d.style.transformOrigin="45px 64px";}\n'
        +'        var py=18+Math.sin(_compAngle_'+el.id+'*Math.PI/180)*6;\n'
        +'        if(pi)pi.setAttribute("y",py.toFixed(0));\n'
        +'      },40);\n'
        +'    } else if(!run&&_compTimer_'+el.id+'){clearInterval(_compTimer_'+el.id+');_compTimer_'+el.id+'=null;}\n'
        +'    var s=document.getElementById("comp_state_'+el.id+'");if(s)s.style.fill=run?"#2e7d32":"#9a9a90";\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollCOMP_'+el.id+'(); setInterval(pollCOMP_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'silo') {
      registrarVar(p.varLevel); registrarVar(p.varHigh); registrarVar(p.varLow);
      var vL=claveJs(p.varLevel||''), vH=claveJs(p.varHigh||''), vLo=claveJs(p.varLow||''), ms=p.pollMs||1000, c2=p.color||'#78909c';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 90 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="15" y="20" width="60" height="90" fill="'+c2+'" stroke="#455a64" stroke-width="2"/>'
        +'<polygon points="15,110 45,150 75,110" fill="'+c2+'" stroke="#455a64" stroke-width="2"/>'
        +'<rect id="silo_fill_'+el.id+'" x="16" y="60" width="58" height="50" fill="#90a4ae" opacity=".5"/>'
        +'<line id="silo_line_'+el.id+'" x1="16" y1="60" x2="74" y2="60" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="4,3"/>'
        +'<rect x="38" y="148" width="14" height="10" rx="2" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<rect x="12" y="0" width="66" height="22" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<text x="45" y="14" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" font-weight="700" fill="#cfd8dc">'+escHtml(p.label||'SL1')+'</text>'
        +'<text id="silo_pct_'+el.id+'" x="45" y="72" text-anchor="middle" font-family="DM Mono,monospace" font-size="11" font-weight="700" fill="#cfd8dc">--%</text>'
        +'</svg></div>\n';
      jsEls += 'function pollSILO_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vL+', function(v){if(v===null) return; var pct=Math.max(0,Math.min(100,parseFloat(v)));\n'
        +'    var fillH=Math.round(pct/100*80); var fillY=110-fillH;\n'
        +'    var f=document.getElementById("silo_fill_'+el.id+'");if(f){f.setAttribute("y",fillY);f.setAttribute("height",fillH);}\n'
        +'    var l=document.getElementById("silo_line_'+el.id+'");if(l){l.setAttribute("y1",fillY);l.setAttribute("y2",fillY);}\n'
        +'    var t=document.getElementById("silo_pct_'+el.id+'");if(t){t.textContent=Math.round(pct)+"%";t.setAttribute("y",Math.max(30,fillY+14));}\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollSILO_'+el.id+'(); setInterval(pollSILO_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'tank-horizontal') {
      registrarVar(p.varLevel); registrarVar(p.varHigh); registrarVar(p.varLow);
      var vL=claveJs(p.varLevel||''), vH=claveJs(p.varHigh||''), vLo=claveJs(p.varLow||''), ms=p.pollMs||500, c2=p.color||'#1565c0';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 200 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="18" y="15" width="164" height="60" fill="'+c2+'" stroke="#0d47a1" stroke-width="2"/>'
        +'<ellipse cx="18" cy="45" rx="14" ry="30" fill="'+c2+'" stroke="#0d47a1" stroke-width="2"/>'
        +'<ellipse cx="182" cy="45" rx="14" ry="30" fill="'+c2+'" stroke="#0d47a1" stroke-width="2"/>'
        +'<clipPath id="thclip_'+el.id+'"><rect x="5" y="16" width="190" height="58"/></clipPath>'
        +'<rect id="th_fill_'+el.id+'" x="18" y="16" width="82" height="58" fill="#29b6f6" opacity=".45" clip-path="url(#thclip_'+el.id+')"/>'
        +'<line id="th_line_'+el.id+'" x1="100" y1="15" x2="100" y2="75" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="4,3"/>'
        +'<text id="th_pct_'+el.id+'" x="100" y="52" text-anchor="middle" font-family="DM Mono,monospace" font-size="12" font-weight="700" fill="#e3f2fd">--%</text>'
        +'<text x="100" y="90" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" fill="'+c2+'">'+escHtml(p.label||'TH1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'function pollTH_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vL+', function(v){if(v===null) return; var pct=Math.max(0,Math.min(100,parseFloat(v)));\n'
        +'    var fw=Math.round(pct/100*164);\n'
        +'    var f=document.getElementById("th_fill_'+el.id+'");if(f)f.setAttribute("width",fw);\n'
        +'    var l=document.getElementById("th_line_'+el.id+'");if(l){var lx=18+fw;l.setAttribute("x1",lx);l.setAttribute("x2",lx);}\n'
        +'    var t=document.getElementById("th_pct_'+el.id+'");if(t){t.textContent=Math.round(pct)+"%";t.setAttribute("x",Math.min(180,Math.max(30,18+fw-10)));}\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollTH_'+el.id+'(); setInterval(pollTH_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'tank-conical') {
      registrarVar(p.varLevel); registrarVar(p.varWeight);
      var vL=claveJs(p.varLevel||''), vW=claveJs(p.varWeight||''), ms=p.pollMs||500, c2=p.color||'#1565c0';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 100 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="15" y="20" width="70" height="90" fill="'+c2+'" stroke="#0d47a1" stroke-width="2"/>'
        +'<polygon points="15,110 50,150 85,110" fill="'+c2+'" stroke="#0d47a1" stroke-width="2"/>'
        +'<rect id="tc_fill_'+el.id+'" x="16" y="60" width="68" height="50" fill="#29b6f6" opacity=".45"/>'
        +'<line id="tc_line_'+el.id+'" x1="15" y1="60" x2="85" y2="60" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="4,3"/>'
        +'<rect x="43" y="148" width="14" height="10" rx="2" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<rect x="12" y="0" width="76" height="22" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<text x="50" y="14" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" font-weight="700" fill="#cfd8dc">'+escHtml(p.label||'TC1')+'</text>'
        +'<text id="tc_pct_'+el.id+'" x="50" y="72" text-anchor="middle" font-family="DM Mono,monospace" font-size="11" font-weight="700" fill="#e3f2fd">--%</text>'
        +'</svg></div>\n';
      jsEls += 'function pollTC_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vL+', function(v){if(v===null) return; var pct=Math.max(0,Math.min(100,parseFloat(v)));\n'
        +'    var fh=Math.round(pct/100*90); var fy=110-fh;\n'
        +'    var f=document.getElementById("tc_fill_'+el.id+'");if(f){f.setAttribute("y",fy);f.setAttribute("height",fh);}\n'
        +'    var l=document.getElementById("tc_line_'+el.id+'");if(l){l.setAttribute("y1",fy);l.setAttribute("y2",fy);}\n'
        +'    var t=document.getElementById("tc_pct_'+el.id+'");if(t){t.textContent=Math.round(pct)+"%";t.setAttribute("y",Math.max(35,fy+14));}\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollTC_'+el.id+'(); setInterval(pollTC_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'reactor-vessel') {
      registrarVar(p.varTemp); registrarVar(p.varLevel); registrarVar(p.varAgit);
      var vT=claveJs(p.varTemp||''), vL=claveJs(p.varLevel||''), vA=claveJs(p.varAgit||''), ms=p.pollMs||500, c2=p.color||'#37474f';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 110 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="10" y="20" width="90" height="100" rx="5" fill="'+c2+'" stroke="#263238" stroke-width="2"/>'
        +'<ellipse cx="55" cy="120" rx="45" ry="15" fill="'+c2+'" stroke="#263238" stroke-width="2"/>'
        +'<rect id="rvl_fill_'+el.id+'" x="11" y="70" width="88" height="50" fill="#29b6f6" opacity=".25"/>'
        +'<line id="rvl_line_'+el.id+'" x1="11" y1="70" x2="99" y2="70" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="4,3"/>'
        +'<g id="rvl_agit_'+el.id+'" style="transform-origin:55px 80px">'
        +'<line x1="55" y1="20" x2="55" y2="75" stroke="#90a4ae" stroke-width="3"/>'
        +'<line x1="55" y1="75" x2="30" y2="100" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>'
        +'<line x1="55" y1="75" x2="80" y2="100" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>'
        +'</g>'
        +'<circle cx="55" cy="75" r="4" fill="#b0bec5"/>'
        +'<rect x="45" y="0" width="20" height="22" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.5"/>'
        +'<rect x="5" y="40" width="10" height="20" rx="2" fill="#c62828" stroke="#8b0000" stroke-width="1.5"/>'
        +'<rect x="95" y="40" width="10" height="20" rx="2" fill="#29b6f6" stroke="#0277bd" stroke-width="1.5"/>'
        +'<text id="rvl_temp_'+el.id+'" x="55" y="150" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">'+escHtml(p.label||'R1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'var _rvAngle_'+el.id+'=0,_rvTimer_'+el.id+'=null;\n'
        +'function pollRV_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vL+', function(v){if(v===null) return; var pct=Math.max(0,Math.min(100,parseFloat(v)));\n'
        +'    var fh=Math.round(pct/100*80); var fy=120-fh;\n'
        +'    var f=document.getElementById("rvl_fill_'+el.id+'");if(f){f.setAttribute("y",fy);f.setAttribute("height",fh);}\n'
        +'    var l=document.getElementById("rvl_line_'+el.id+'");if(l){l.setAttribute("y1",fy);l.setAttribute("y2",fy);}\n'
        +'  });\n'
        +'  plcLeer(vars.'+vT+', function(v){var e=document.getElementById("rvl_temp_'+el.id+'");if(e&&v!==null)e.textContent="'+escHtml(p.label||'R1')+' T:"+parseFloat(v).toFixed(1)+"°C";});\n'
        +'  plcLeer(vars.'+vA+', function(v){\n'
        +'    var run=(v===true||v==="true"||v===1);\n'
        +'    var g=document.getElementById("rvl_agit_'+el.id+'");\n'
        +'    if(run&&!_rvTimer_'+el.id+'){\n'
        +'      _rvTimer_'+el.id+'=setInterval(function(){_rvAngle_'+el.id+'=(_rvAngle_'+el.id+'+4)%360;if(g)g.style.transform="rotate("+_rvAngle_'+el.id+'+"deg)";},50);\n'
        +'    } else if(!run&&_rvTimer_'+el.id+'){clearInterval(_rvTimer_'+el.id+');_rvTimer_'+el.id+'=null;if(g)g.style.transform="";}\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollRV_'+el.id+'(); setInterval(pollRV_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'separator-vessel') {
      registrarVar(p.varLevel); registrarVar(p.varActive);
      var vL=claveJs(p.varLevel||''), vA=claveJs(p.varActive||''), ms=p.pollMs||1000, c2=p.color||'#546e7a';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 120 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="12" y="18" width="96" height="56" rx="28" fill="'+c2+'" stroke="#455a64" stroke-width="2"/>'
        +'<rect id="sep_fill_'+el.id+'" x="20" y="46" width="80" height="20" fill="#78909c" opacity=".5"/>'
        +'<line id="sep_line_'+el.id+'" x1="20" y1="46" x2="100" y2="46" stroke="#90a4ae" stroke-width="1.5" stroke-dasharray="4,3"/>'
        +'<rect x="20" y="26" width="80" height="22" fill="#29b6f6" opacity=".3"/>'
        +'<rect x="0" y="30" width="14" height="12" rx="2" fill="'+c2+'" stroke="#455a64" stroke-width="1.5"/>'
        +'<rect x="106" y="30" width="14" height="12" rx="2" fill="#29b6f6" stroke="#0277bd" stroke-width="1.5"/>'
        +'<rect x="106" y="50" width="14" height="12" rx="2" fill="#78909c" stroke="#546e7a" stroke-width="1.5"/>'
        +'<text x="60" y="92" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c2+'">'+escHtml(p.label||'S1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'function pollSEPV_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vL+', function(v){if(v===null) return; var pct=Math.max(0,Math.min(100,parseFloat(v)));\n'
        +'    var fy=26+Math.round((1-pct/100)*20); var fh=66-fy;\n'
        +'    var f=document.getElementById("sep_fill_'+el.id+'");if(f){f.setAttribute("y",fy);f.setAttribute("height",fh);}\n'
        +'    var l=document.getElementById("sep_line_'+el.id+'");if(l){l.setAttribute("y1",fy);l.setAttribute("y2",fy);}\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollSEPV_'+el.id+'(); setInterval(pollSEPV_'+el.id+', '+ms+');\n';
    }

    /* ══ MOTORES / ACCIONAMIENTOS ══ */

    else if (el.tipo === 'motor-starter') {
      registrarVar(p.varRun); registrarVar(p.varFault); registrarVar(p.varReady);
      var vR=claveJs(p.varRun||''), vF=claveJs(p.varFault||''), vRdy=claveJs(p.varReady||''), ms=p.pollMs||500;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#1a1a18;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">'
        +'<div style="background:#0f0f0d;padding:4px 8px;display:flex;align-items:center;gap:6px;border-bottom:1px solid #2a2a26;flex-shrink:0">'
        +'<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#9a9a90;flex:1">'+escHtml(p.label||'M1')+'</div>'
        +'<div id="mst_status_'+el.id+'" style="width:8px;height:8px;border-radius:50%;background:#9a9a90"></div></div>'
        +'<div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:6px;align-items:center">'
        +'<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div id="mst_run_'+el.id+'" style="width:14px;height:14px;border-radius:50%;background:#9a9a90;border:2px solid #616161"></div><div style="font-size:7px;color:#9a9a90;font-family:DM Mono,monospace">RUN</div></div>'
        +'<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div id="mst_flt_'+el.id+'" style="width:14px;height:14px;border-radius:50%;background:#9a9a90;border:2px solid #616161"></div><div style="font-size:7px;color:#9a9a90;font-family:DM Mono,monospace">FLT</div></div>'
        +'<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div id="mst_rdy_'+el.id+'" style="width:14px;height:14px;border-radius:50%;background:#9a9a90;border:2px solid #616161"></div><div style="font-size:7px;color:#9a9a90;font-family:DM Mono,monospace">RDY</div></div>'
        +'</div></div>\n';
      jsEls += 'function pollMST_'+el.id+'(){\n'
        +'  function setLed(id,on,col){var e=document.getElementById(id);if(e){e.style.background=on?col:"#9a9a90";e.style.borderColor=on?col:"#616161";}}\n'
        +'  plcLeer(vars.'+vR+', function(v){var on=(v===true||v==="true"||v===1);setLed("mst_run_'+el.id+'",on,"#2e7d32");var s=document.getElementById("mst_status_'+el.id+'");if(s)s.style.background=on?"#2e7d32":"#9a9a90";});\n'
        +'  plcLeer(vars.'+vF+', function(v){setLed("mst_flt_'+el.id+'",(v===true||v==="true"||v===1),"#c62828");});\n'
        +'  plcLeer(vars.'+vRdy+', function(v){setLed("mst_rdy_'+el.id+'",(v===true||v==="true"||v===1),"#f9a825");});\n'
        +'}\n\n';
      jsPolling += '  pollMST_'+el.id+'(); setInterval(pollMST_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'vfd-faceplate') {
      registrarVar(p.varHz); registrarVar(p.varRpm); registrarVar(p.varI); registrarVar(p.varRun); registrarVar(p.varFault);
      var vHz=claveJs(p.varHz||''), vRpm=claveJs(p.varRpm||''), vI=claveJs(p.varI||''), vR=claveJs(p.varRun||''), vF=claveJs(p.varFault||'');
      var ms=p.pollMs||500, mxHz=parseFloat(p.maxHz)||60;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #1565c0;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">'
        +'<div style="background:#0a1520;padding:4px 8px;border-bottom:1px solid #1565c0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
        +'<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:2px;color:#29b6f6">'+escHtml(p.label||'VFD1')+'</span>'
        +'<span id="vfd_state_'+el.id+'" style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">STOP</span></div>'
        +'<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4px;padding:6px">'
        +'<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">Hz</span><span id="vfd_hz_'+el.id+'" style="font-family:DM Mono,monospace;font-size:16px;color:#29b6f6;font-weight:700">0.0</span></div>'
        +'<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">rpm</span><span id="vfd_rpm_'+el.id+'" style="font-family:DM Mono,monospace;font-size:16px;color:#f0f0e8;font-weight:700">0</span></div>'
        +'<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">A</span><span id="vfd_i_'+el.id+'" style="font-family:DM Mono,monospace;font-size:14px;color:#f0f0e8">0.0</span></div>'
        +'<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">%Ref</span><span id="vfd_ref_'+el.id+'" style="font-family:DM Mono,monospace;font-size:14px;color:#f9a825">0</span></div>'
        +'</div></div>\n';
      jsEls += 'function pollVFD_'+el.id+'(){\n'
        +'  function setEl(id,v,dec){var e=document.getElementById(id);if(e&&v!==null&&v!==undefined)e.textContent=parseFloat(v).toFixed(dec);}\n'
        +'  plcLeer(vars.'+vHz+', function(v){setEl("vfd_hz_'+el.id+'",v,1);if(v!==null){var pct=Math.round(parseFloat(v)/'+mxHz+'*100);setEl("vfd_ref_'+el.id+'",pct,0);}});\n'
        +'  plcLeer(vars.'+vRpm+', function(v){setEl("vfd_rpm_'+el.id+'",v,0);});\n'
        +'  plcLeer(vars.'+vI+', function(v){setEl("vfd_i_'+el.id+'",v,1);});\n'
        +'  plcLeer(vars.'+vR+', function(v){var s=document.getElementById("vfd_state_'+el.id+'");if(s){var run=(v===true||v==="true"||v===1);s.textContent=run?"RUN":"STOP";s.style.color=run?"#2e7d32":"#9a9a90";}});\n'
        +'}\n\n';
      jsPolling += '  pollVFD_'+el.id+'(); setInterval(pollVFD_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'servo-axis') {
      registrarVar(p.varPos); registrarVar(p.varTarget); registrarVar(p.varEnable);
      var vP=claveJs(p.varPos||''), vT=claveJs(p.varTarget||''), vE=claveJs(p.varEnable||'');
      var mn=parseFloat(p.min)||0, mx=parseFloat(p.max)||500, ms=p.pollMs||200, unit=escHtml(p.unit||'mm');
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;padding:6px 8px;">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
        +'<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#f9a825">'+escHtml(p.label||'AX1')+'</span>'
        +'<span id="ax_state_'+el.id+'" style="font-family:DM Mono,monospace;font-size:7px;color:#9a9a90">DIS</span></div>'
        +'<div style="position:relative;height:10px;background:#1a1a18;border-radius:2px;border:1px solid #2a2a26;margin-bottom:4px">'
        +'<div id="ax_fill_'+el.id+'" style="position:absolute;left:0;top:0;height:100%;width:0%;background:#f9a825;border-radius:2px;opacity:.4"></div>'
        +'<div id="ax_needle_'+el.id+'" style="position:absolute;left:0%;top:-3px;width:2px;height:16px;background:#f9a825;border-radius:1px"></div></div>'
        +'<div style="display:flex;justify-content:space-between">'
        +'<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">POS</span><span id="ax_pos_'+el.id+'" style="font-family:DM Mono,monospace;font-size:13px;color:#f9a825;font-weight:700">-</span></div>'
        +'<div style="display:flex;flex-direction:column;text-align:right"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">TGT</span><span id="ax_tgt_'+el.id+'" style="font-family:DM Mono,monospace;font-size:13px;color:#f0f0e8">-</span></div>'
        +'</div></div>\n';
      jsEls += 'function pollAX_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vP+', function(v){if(v===null) return; var pos=parseFloat(v);\n'
        +'    var pct=Math.max(0,Math.min(100,(pos-'+mn+')/('+mx+'-'+mn+')*100));\n'
        +'    var e=document.getElementById("ax_pos_'+el.id+'");if(e)e.textContent=pos.toFixed(1)+" '+unit+'";\n'
        +'    var f=document.getElementById("ax_fill_'+el.id+'");if(f)f.style.width=pct+"%";\n'
        +'    var n=document.getElementById("ax_needle_'+el.id+'");if(n)n.style.left=pct+"%";\n'
        +'  });\n'
        +'  plcLeer(vars.'+vT+', function(v){var e=document.getElementById("ax_tgt_'+el.id+'");if(e&&v!==null)e.textContent=parseFloat(v).toFixed(1)+" '+unit+'";});\n'
        +'  plcLeer(vars.'+vE+', function(v){var s=document.getElementById("ax_state_'+el.id+'");if(s){var en=(v===true||v==="true"||v===1);s.textContent=en?"ENA":"DIS";s.style.color=en?"#2e7d32":"#9a9a90";}});\n'
        +'}\n\n';
      jsPolling += '  pollAX_'+el.id+'(); setInterval(pollAX_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'motor-runtime') {
      registrarVar(p.varHours); registrarVar(p.varRun);
      var vH=claveJs(p.varHours||''), vR=claveJs(p.varRun||''), wh=parseFloat(p.warningH)||8000, ms=p.pollMs||5000;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;padding:6px 8px;">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
        +'<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#9a9a90">'+escHtml(p.label||'M1')+' HORAS</span>'
        +'<div id="mrt_led_'+el.id+'" style="width:8px;height:8px;border-radius:50%;background:#9a9a90"></div></div>'
        +'<div id="mrt_hrs_'+el.id+'" style="font-family:DM Mono,monospace;font-size:22px;font-weight:700;color:#f0f0e8">- h</div>'
        +'<div style="position:relative;height:6px;background:#1a1a18;border-radius:3px;margin-top:6px;border:1px solid #2a2a26">'
        +'<div id="mrt_bar_'+el.id+'" style="position:absolute;left:0;top:0;height:100%;width:0%;background:#f9a825;border-radius:3px"></div></div>'
        +'<div style="font-family:DM Mono,monospace;font-size:8px;color:#546e7a;margin-top:3px">MTO: '+wh+'h</div>'
        +'</div>\n';
      jsEls += 'function pollMRT_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vH+', function(v){if(v===null) return; var h=parseFloat(v);\n'
        +'    var e=document.getElementById("mrt_hrs_'+el.id+'");if(e)e.textContent=h.toFixed(0)+" h";\n'
        +'    var b=document.getElementById("mrt_bar_'+el.id+'");if(b){var pct=Math.min(100,h/'+wh+'*100);b.style.width=pct+"%";b.style.background=pct>80?"#c62828":pct>60?"#f9a825":"#2e7d32";}\n'
        +'  });\n'
        +'  plcLeer(vars.'+vR+', function(v){var l=document.getElementById("mrt_led_'+el.id+'");if(l)l.style.background=(v===true||v==="true"||v===1)?"#2e7d32":"#9a9a90";});\n'
        +'}\n\n';
      jsPolling += '  pollMRT_'+el.id+'(); setInterval(pollMRT_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'brake-display') {
      registrarVar(p.varBrake); registrarVar(p.varFault);
      var vB=claveJs(p.varBrake||''), vF=claveJs(p.varFault||''), ms=p.pollMs||500;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#1a1a18;border-radius:3px;border:2px solid #546e7a;display:flex;align-items:center;gap:10px;padding:0 12px;box-sizing:border-box;">'
        +'<svg width="28" height="28" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
        +'<circle cx="30" cy="30" r="28" fill="none" stroke="#546e7a" stroke-width="3"/>'
        +'<circle cx="30" cy="30" r="16" fill="none" stroke="#546e7a" stroke-width="3"/>'
        +'<path id="brk_arc_'+el.id+'" d="M14,30 A16,16 0 0,1 46,30" fill="#546e7a" opacity=".4"/>'
        +'</svg>'
        +'<div style="flex:1">'
        +'<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#9a9a90">'+escHtml(p.label||'BR1')+'</div>'
        +'<div id="brk_state_'+el.id+'" style="font-family:DM Mono,monospace;font-size:13px;font-weight:700;color:#f9a825;margin-top:2px">-</div>'
        +'</div></div>\n';
      jsEls += 'function pollBRK_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vB+', function(v){var on=(v===true||v==="true"||v===1);\n'
        +'    var s=document.getElementById("brk_state_'+el.id+'");if(s){s.textContent=on?"APPLIED":"RELEASED";s.style.color=on?"#c62828":"#2e7d32";}\n'
        +'    var a=document.getElementById("brk_arc_'+el.id+'");if(a)a.style.fill=on?"#c62828":"#546e7a";\n'
        +'    var bd=document.getElementById("'+el.id+'");if(bd)bd.style.borderColor=on?"#c62828":"#546e7a";\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollBRK_'+el.id+'(); setInterval(pollBRK_'+el.id+', '+ms+');\n';
    }



    else if (el.tipo === 'thermometer-display') {
      registrarVar(p.varTemp); registrarVar(p.varAlarm);
      var vT=claveJs(p.varTemp||''), vA=claveJs(p.varAlarm||''), mn=parseFloat(p.min)||0, mx=parseFloat(p.max)||200, ms=p.pollMs||1000, c2=p.color||'#c62828';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 80 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="32" y="10" width="16" height="100" rx="8" fill="#263238" stroke="#37474f" stroke-width="1.5"/>'
        +'<circle cx="40" cy="118" r="18" fill="'+c2+'" stroke="#8b0000" stroke-width="2"/>'
        +'<rect id="thf_'+el.id+'" x="35" y="60" width="10" height="50" rx="3" fill="'+c2+'"/>'
        +'<line x1="50" y1="20" x2="56" y2="20" stroke="#37474f" stroke-width="1.5"/>'
        +'<line x1="50" y1="45" x2="58" y2="45" stroke="#37474f" stroke-width="1.5"/>'
        +'<line x1="50" y1="70" x2="56" y2="70" stroke="#37474f" stroke-width="1.5"/>'
        +'<line x1="50" y1="95" x2="58" y2="95" stroke="#37474f" stroke-width="1.5"/>'
        +'<line x1="50" y1="110" x2="56" y2="110" stroke="#37474f" stroke-width="1.5"/>'
        +'<text x="62" y="23" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">'+mx+'</text>'
        +'<text x="62" y="98" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">'+mn+'</text>'
        +'<text id="thv_'+el.id+'" x="40" y="122" text-anchor="middle" font-family="DM Mono,monospace" font-size="9" font-weight="700" fill="#fff">--</text>'
        +'<text x="40" y="148" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c2+'">'+escHtml(p.label||'TT1')+' '+escHtml(p.unit||'°C')+'</text>'
        +'</svg></div>\n';
      jsEls += 'function pollTHD_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vT+', function(v){ if(v===null) return; var t=parseFloat(v);\n'
        +'    var pct=Math.max(0,Math.min(1,(t-'+mn+')/('+mx+'-'+mn+')));\n'
        +'    var fh=Math.round(pct*90); var fy=110-fh;\n'
        +'    var f=document.getElementById("thf_'+el.id+'"); if(f){f.setAttribute("y",fy);f.setAttribute("height",fh+10);}\n'
        +'    var tv=document.getElementById("thv_'+el.id+'"); if(tv)tv.textContent=t.toFixed(1);\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollTHD_'+el.id+'(); setInterval(pollTHD_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'pressure-gauge-pid') {
      registrarVar(p.varPres); registrarVar(p.varAlarm);
      var vP=claveJs(p.varPres||''), vA=claveJs(p.varAlarm||''), mn=parseFloat(p.min)||0, mx=parseFloat(p.max)||10, ms=p.pollMs||500, c2=p.color||'#1565c0';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<circle cx="60" cy="60" r="54" fill="#0f0f0d" stroke="#2a2a26" stroke-width="3"/>'
        +'<path d="M14,74 A46,46 0 0,1 106,74" fill="none" stroke="#2a2a26" stroke-width="6" stroke-linecap="round"/>'
        +'<path d="M14,74 A46,46 0 0,1 60,14" fill="none" stroke="'+c2+'" stroke-width="6" stroke-linecap="round"/>'
        +'<line id="pgn_'+el.id+'" x1="60" y1="60" x2="14" y2="74" stroke="#f0f0e8" stroke-width="2.5" stroke-linecap="round" style="transform-origin:60px 60px"/>'
        +'<circle cx="60" cy="60" r="5" fill="#2a2a26" stroke="#546e7a" stroke-width="2"/>'
        +'<text id="pgv_'+el.id+'" x="60" y="82" text-anchor="middle" font-family="DM Mono,monospace" font-size="11" font-weight="700" fill="#f0f0e8">--</text>'
        +'<text x="60" y="94" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c2+'">'+escHtml(p.unit||'bar')+'</text>'
        +'<text x="60" y="112" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="#9a9a90">'+escHtml(p.label||'PT1')+'</text>'
        +'<text x="20" y="88" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">'+mn+'</text>'
        +'<text x="90" y="88" font-family="DM Mono,monospace" font-size="7" fill="#9a9a90">'+mx+'</text>'
        +'</svg></div>\n';
      jsEls += 'function pollPGP_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vP+', function(v){ if(v===null) return; var pres=parseFloat(v);\n'
        +'    var pct=Math.max(0,Math.min(1,(pres-'+mn+')/('+mx+'-'+mn+')));\n'
        +'    var ang=-130+pct*260;\n'
        +'    var n=document.getElementById("pgn_'+el.id+'"); if(n)n.style.transform="rotate("+ang+"deg)";\n'
        +'    var t=document.getElementById("pgv_'+el.id+'"); if(t)t.textContent=pres.toFixed(2);\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollPGP_'+el.id+'(); setInterval(pollPGP_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'level-indicator') {
      registrarVar(p.varLevel); registrarVar(p.varHigh); registrarVar(p.varLow);
      var vL=claveJs(p.varLevel||''), vH=claveJs(p.varHigh||''), vLo=claveJs(p.varLow||''), mn=parseFloat(p.min)||0, mx=parseFloat(p.max)||100, ms=p.pollMs||500, c2=p.color||'#1565c0';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">'
        +'<svg viewBox="0 0 80 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        +'<rect x="20" y="10" width="40" height="120" rx="4" fill="#1a1a18" stroke="#2a2a26" stroke-width="2"/>'
        +'<rect id="lif_'+el.id+'" x="21" y="80" width="38" height="49" rx="2" fill="'+c2+'" opacity=".6"/>'
        +'<line id="lil_'+el.id+'" x1="21" y1="80" x2="59" y2="80" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="3,2"/>'
        +'<line x1="60" y1="20" x2="66" y2="20" stroke="#c62828" stroke-width="2"/>'
        +'<line x1="60" y1="80" x2="64" y2="80" stroke="#2a2a26" stroke-width="1"/>'
        +'<line x1="60" y1="128" x2="66" y2="128" stroke="#2e7d32" stroke-width="2"/>'
        +'<text id="liv_'+el.id+'" x="40" y="80" text-anchor="middle" font-family="DM Mono,monospace" font-size="11" font-weight="700" fill="#e3f2fd">--%</text>'
        +'<text x="40" y="148" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="'+c2+'">'+escHtml(p.label||'LT1')+'</text>'
        +'</svg></div>\n';
      jsEls += 'function pollLID_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vL+', function(v){ if(v===null) return;\n'
        +'    var pct=Math.max(0,Math.min(100,(parseFloat(v)-'+mn+')/('+mx+'-'+mn+')*100));\n'
        +'    var fh=Math.round(pct/100*110); var fy=130-fh;\n'
        +'    var f=document.getElementById("lif_'+el.id+'"); if(f){f.setAttribute("y",fy);f.setAttribute("height",fh);}\n'
        +'    var l=document.getElementById("lil_'+el.id+'"); if(l){l.setAttribute("y1",fy);l.setAttribute("y2",fy);}\n'
        +'    var t=document.getElementById("liv_'+el.id+'"); if(t){t.textContent=Math.round(pct)+"%";t.setAttribute("y",Math.max(25,fy+14));}\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollLID_'+el.id+'(); setInterval(pollLID_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'pid-controller') {
      registrarVar(p.varSP); registrarVar(p.varPV); registrarVar(p.varMV); registrarVar(p.varMode);
      var vSP=claveJs(p.varSP||''), vPV=claveJs(p.varPV||''), vMV=claveJs(p.varMV||''), vM=claveJs(p.varMode||''), ms=p.pollMs||500;
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">'
        +'<div style="background:#0a0a08;padding:4px 8px;border-bottom:1px solid #2a2a26;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
        +'<span style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#f9a825">'+escHtml(p.label||'PIC-101')+'</span>'
        +'<span id="pimd_'+el.id+'" style="font-family:DM Mono,monospace;font-size:8px;background:#1565c0;color:#fff;padding:1px 6px;border-radius:2px">AUTO</span>'
        +'</div>'
        +'<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4px;padding:6px">'
        +'<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">SP</span><span id="pisp_'+el.id+'" style="font-family:DM Mono,monospace;font-size:16px;color:#2e7d32;font-weight:700">--</span></div>'
        +'<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">PV</span><span id="pipv_'+el.id+'" style="font-family:DM Mono,monospace;font-size:16px;color:#1565c0;font-weight:700">--</span></div>'
        +'<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">MV%</span><span id="pimv_'+el.id+'" style="font-family:DM Mono,monospace;font-size:16px;color:#f9a825;font-weight:700">--</span></div>'
        +'<div style="display:flex;flex-direction:column"><span style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">ERR</span><span id="pier_'+el.id+'" style="font-family:DM Mono,monospace;font-size:14px;color:#9a9a90">--</span></div>'
        +'</div></div>\n';
      jsEls += 'function pollPIDC_'+el.id+'(){\n'
        +'  function sv(id,v,d){var e=document.getElementById(id);if(e&&v!==null)e.textContent=parseFloat(v).toFixed(d);}\n'
        +'  var sp=null,pv=null;\n'
        +'  plcLeer(vars.'+vSP+', function(v){sv("pisp_'+el.id+'",v,1);sp=v!==null?parseFloat(v):null;});\n'
        +'  plcLeer(vars.'+vPV+', function(v){sv("pipv_'+el.id+'",v,1);pv=v!==null?parseFloat(v):null;if(sp!==null&&pv!==null){var e=document.getElementById("pier_'+el.id+'");if(e)e.textContent=(sp-pv).toFixed(2);}});\n'
        +'  plcLeer(vars.'+vMV+', function(v){sv("pimv_'+el.id+'",v,1);});\n'
        +'  plcLeer(vars.'+vM+', function(v){var m=document.getElementById("pimd_'+el.id+'");if(m){var auto=(v===true||v==="true"||v===1);m.textContent=auto?"AUTO":"MAN";m.style.background=auto?"#1565c0":"#f9a825";m.style.color=auto?"#fff":"#1a1a18";}});\n'
        +'}\n\n';
      jsPolling += '  pollPIDC_'+el.id+'(); setInterval(pollPIDC_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'sequence-stepper') {
      registrarVar(p.varStep); registrarVar(p.varActive);
      var vS=claveJs(p.varStep||''), vA=claveJs(p.varActive||''), ms=p.pollMs||500;
      var stepNames=(p.names||'INIT,RUN,STOP').split(',');
      var totalSteps=Math.min(parseInt(p.varTotal)||8,8);
      var dots='';
      for(var si=0;si<stepNames.slice(0,totalSteps).length;si++){
        var n=stepNames[si].trim();
        if(si>0) dots+='<div style="height:2px;background:#2a2a26;flex:1;margin:14px -2px 0"></div>';
        dots+='<div style="display:flex;flex-direction:column;align-items:center;gap:2px">'
          +'<div id="sqd_'+el.id+'_'+si+'" style="width:26px;height:26px;border-radius:50%;background:#1a1a18;border:2px solid #2a2a26;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:8px;color:#546e7a;font-weight:700;transition:all .3s">'+(si+1)+'</div>'
          +'<div style="font-size:6px;color:#546e7a;font-family:DM Mono,monospace;text-align:center;max-width:30px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(n)+'</div>'
          +'</div>';
      }
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">'
        +'<div style="background:#0a0a08;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">'+escHtml(p.label||'SEQ1')+'</div>'
        +'<div style="flex:1;display:flex;align-items:center;padding:4px 8px;gap:2px;overflow:hidden">'+dots+'</div>'
        +'</div>\n';
      jsEls += 'function pollSEQS_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vS+', function(v){ if(v===null) return; var step=parseInt(v)-1;\n'
        +'    for(var i=0;i<'+totalSteps+';i++){\n'
        +'      var d=document.getElementById("sqd_'+el.id+'_"+i); if(!d) continue;\n'
        +'      d.style.background=i===step?"#1565c0":"#1a1a18";\n'
        +'      d.style.borderColor=i===step?"#1565c0":"#2a2a26";\n'
        +'      d.style.color=i===step?"#fff":"#546e7a";\n'
        +'    }\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollSEQS_'+el.id+'(); setInterval(pollSEQS_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'timer-display') {
      registrarVar(p.varActive); registrarVar(p.varElapsed); registrarVar(p.varPreset);
      var vA=claveJs(p.varActive||''), vE=claveJs(p.varElapsed||''), vPR=claveJs(p.varPreset||''), ms=p.pollMs||500, c2=p.color||'#1565c0';
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid '+c2+';display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:10px;">'
        +'<svg width="36" height="36" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">'
        +'<circle cx="30" cy="30" r="26" fill="none" stroke="#2a2a26" stroke-width="4"/>'
        +'<path id="tmarc_'+el.id+'" d="M30,4 A26,26 0 0,1 56,30" fill="none" stroke="'+c2+'" stroke-width="4" stroke-linecap="round"/>'
        +'<line id="tmhnd_'+el.id+'" x1="30" y1="10" x2="30" y2="30" stroke="#f0f0e8" stroke-width="2.5" stroke-linecap="round" style="transform-origin:30px 30px"/>'
        +'<circle cx="30" cy="30" r="3" fill="'+c2+'"/>'
        +'</svg>'
        +'<div style="flex:1">'
        +'<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90">'+escHtml(p.label||'T1')+'</div>'
        +'<div id="tmval_'+el.id+'" style="font-family:DM Mono,monospace;font-size:20px;font-weight:700;color:'+c2+';letter-spacing:2px">00:00</div>'
        +'<div style="height:4px;background:#1a1a18;border-radius:2px;margin-top:4px"><div id="tmbar_'+el.id+'" style="width:0%;height:100%;background:'+c2+';border-radius:2px;transition:width .5s"></div></div>'
        +'</div></div>\n';
      jsEls += 'function pollTMRD_'+el.id+'(){\n'
        +'  var _et=0,_pt=1;\n'
        +'  plcLeer(vars.'+vE+', function(v){ if(v===null) return; _et=parseFloat(v);\n'
        +'    var s=Math.round(_et); var m=document.getElementById("tmval_'+el.id+'");\n'
        +'    if(m)m.textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");\n'
        +'    var ang=(_et/_pt)*360; var h=document.getElementById("tmhnd_'+el.id+'"); if(h)h.style.transform="rotate("+ang+"deg)";\n'
        +'  });\n'
        +'  plcLeer(vars.'+vPR+', function(v){ if(v===null) return; _pt=Math.max(1,parseFloat(v));\n'
        +'    var b=document.getElementById("tmbar_'+el.id+'"); if(b)b.style.width=Math.min(100,_et/_pt*100)+"%";\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollTMRD_'+el.id+'(); setInterval(pollTMRD_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'counter-display') {
      registrarVar(p.varCount); registrarVar(p.varPreset);
      var vC=claveJs(p.varCount||''), vPR=claveJs(p.varPreset||''), ms=p.pollMs||500, c2=p.color||'#2e7d32';
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#0f0f0d;border-radius:3px;border:1px solid '+c2+';display:flex;align-items:center;overflow:hidden;box-sizing:border-box;padding:0 10px;gap:10px;">'
        +'<div style="flex:1">'
        +'<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90">'+escHtml(p.label||'C1')+'</div>'
        +'<div id="cntv_'+el.id+'" style="font-family:DM Mono,monospace;font-size:24px;font-weight:700;color:'+c2+';letter-spacing:2px">0</div>'
        +'</div>'
        +'<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">'
        +'<div id="cntp_'+el.id+'" style="font-size:7px;color:#546e7a;font-family:DM Mono,monospace">PRE: --</div>'
        +'</div></div>\n';
      jsEls += 'function pollCNTD_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vC+', function(v){ var e=document.getElementById("cntv_'+el.id+'"); if(e&&v!==null)e.textContent=parseInt(v); });\n'
        +'  plcLeer(vars.'+vPR+', function(v){ var e=document.getElementById("cntp_'+el.id+'"); if(e&&v!==null)e.textContent="PRE: "+parseInt(v); });\n'
        +'}\n\n';
      jsPolling += '  pollCNTD_'+el.id+'(); setInterval(pollCNTD_'+el.id+', '+ms+');\n';
    }

    else if (el.tipo === 'manual-auto-switch') {
      registrarVar(p.varMode); registrarVar(p.varMV);
      var vM=claveJs(p.varMode||''), vMV2=claveJs(p.varMV||''), ms=p.pollMs||500;
      var txtA=escHtml(p.textAuto||'AUTO'), txtM=escHtml(p.textMan||'MANUAL');
      htmlEls += '<div id="'+el.id+'" style="'+st+'background:#1a1a18;border-radius:3px;border:1px solid #2a2a26;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">'
        +'<div style="background:#0f0f0d;padding:3px 8px;border-bottom:1px solid #2a2a26;font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;flex-shrink:0">'+escHtml(p.label||'MODO')+'</div>'
        +'<div style="flex:1;display:flex;">'
        +'<div id="masauto_'+el.id+'" style="flex:1;display:flex;align-items:center;justify-content:center;background:#1565c0;cursor:pointer" onclick="btnAccion(function(){plcEscribir(vars.'+vM+',true);toast(\'MODO \u2192 '+txtA+'\');})">'
        +'<span style="font-family:DM Mono,monospace;font-size:10px;font-weight:700;color:#fff;letter-spacing:2px">'+txtA+'</span></div>'
        +'<div id="masman_'+el.id+'" style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer" onclick="btnAccion(function(){plcEscribir(vars.'+vM+',false);toast(\'MODO \u2192 '+txtM+'\');})">'
        +'<span style="font-family:DM Mono,monospace;font-size:10px;color:#546e7a;letter-spacing:1px">'+txtM+'</span></div>'
        +'</div></div>\n';
      jsEls += 'function pollMASD_'+el.id+'(){\n'
        +'  plcLeer(vars.'+vM+', function(v){ var auto=(v===true||v==="true"||v===1);\n'
        +'    var da=document.getElementById("masauto_'+el.id+'"), dm=document.getElementById("masman_'+el.id+'");\n'
        +'    if(da){da.style.background=auto?"#1565c0":"#1a1a18";da.querySelector("span").style.color=auto?"#fff":"#546e7a";}\n'
        +'    if(dm){dm.style.background=auto?"#1a1a18":"#263238";dm.querySelector("span").style.color=auto?"#546e7a":"#f0f0e8";}\n'
        +'  });\n'
        +'}\n\n';
      jsPolling += '  pollMASD_'+el.id+'(); setInterval(pollMASD_'+el.id+', '+ms+');\n';
    }


    else if (el.tipo === 'clock-widget') {
      var clkFs=(p.fontSize||22)+'px';
      htmlEls += '<div style="' + st + 'background:#0f0f0d;border:1px solid #2a2a26;border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;box-sizing:border-box;">' +
        '<div id="clkH_' + el.id + '" style="font-family:DM Mono,monospace;font-size:' + clkFs + ';font-weight:700;color:#f0f0e8;letter-spacing:4px">--:--:--</div>' +
        '<div id="clkD_' + el.id + '" style="font-family:DM Mono,monospace;font-size:8px;color:rgba(240,240,232,.4);letter-spacing:2px;margin-top:3px">-- / -- / ----</div>' +
        '</div>\n';
      jsEls += 'function tickClock_' + el.id + '(){\n' +
        '  var d=new Date(),pad=function(n){return n<10?"0"+n:n;};\n' +
        '  var eH=document.getElementById("clkH_' + el.id + '"),eD=document.getElementById("clkD_' + el.id + '");\n' +
        '  if(eH)eH.textContent=pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());\n' +
        '  if(eD)eD.textContent=pad(d.getDate())+" / "+pad(d.getMonth()+1)+" / "+d.getFullYear();\n' +
        '}\n\n';
      jsPolling += '  tickClock_' + el.id + '(); setInterval(tickClock_' + el.id + ', 1000);\n';
    }

    else if (el.tipo === 'plc-info') {
      htmlEls += '<div style="' + st + 'background:#fff;border:1px solid #d8d8d0;border-radius:3px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">' +
        '<div style="padding:5px 10px;background:#f9f9f7;border-bottom:1px solid #e8e8e0;display:flex;align-items:center;gap:6px;flex-shrink:0">' +
          '<div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:3px;color:#6a6a62;flex:1">CPU INFO</div>' +
          '<div id="plcst_' + el.id + '" style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;padding:2px 6px;border-radius:2px;background:#9a9a90;color:#fff">---</div>' +
        '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:6px 10px;gap:4px;">' +
          ['IP:' + (p.ip||'—'), 'MODEL:' + (p.model||'S7-1214C'), 'STATE:ONLINE', 'CYCLE:—'].map(function(row){
            var parts=row.split(':'); return '<div style="display:flex;align-items:center;gap:6px"><div style="font-family:DM Mono,monospace;font-size:8px;letter-spacing:1px;color:#9a9a90;width:44px">'+parts[0]+'</div><div style="font-family:DM Mono,monospace;font-size:9px;font-weight:600;color:#1a1a16">'+parts.slice(1).join(':')+'</div></div>';
          }).join('') +
        '</div>' +
        '</div>\n';
      jsEls += 'function pollPlcInfo_' + el.id + '(){\n' +
        '  var s=document.getElementById("plcst_' + el.id + '"); if(!s) return;\n' +
        '  if(plcOnline){ s.textContent="RUN"; s.style.background="#2e7d32"; }\n' +
        '  else { s.textContent="OFF"; s.style.background="#c62828"; }\n' +
        '}\n\n';
      jsPolling += '  pollPlcInfo_' + el.id + '(); setInterval(pollPlcInfo_' + el.id + ', ' + (p.pollMs||5000) + ');\n';
    }


    else if (el.tipo === 'deco-worker') {
      var c = p.color||'#f57c00', sk = p.skin||'#f5c28a';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 50 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<ellipse cx="25" cy="10" rx="8" ry="8" fill="'+sk+'" stroke="#5a3a18" stroke-width="1.5"/>'+
        '<path d="M17 7 Q25 0 33 7" fill="#f9a825" stroke="#c07800" stroke-width="1.2"/>'+
        '<rect x="15" y="18" width="20" height="28" rx="2" fill="'+c+'" stroke="#b35000" stroke-width="1.2"/>'+
        '<rect x="7" y="19" width="8" height="22" rx="2" fill="'+c+'" stroke="#b35000" stroke-width="1"/>'+
        '<rect x="35" y="19" width="8" height="22" rx="2" fill="'+c+'" stroke="#b35000" stroke-width="1"/>'+
        '<rect x="17" y="46" width="7" height="32" rx="2" fill="#3a3a36" stroke="#1a1a14" stroke-width="1"/>'+
        '<rect x="26" y="46" width="7" height="32" rx="2" fill="#3a3a36" stroke="#1a1a14" stroke-width="1"/>'+
        '<rect x="16" y="76" width="9" height="8" rx="1" fill="#2a2a26"/>'+
        '<rect x="25" y="76" width="9" height="8" rx="1" fill="#2a2a26"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-worker '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-forklift') {
      var c = p.color||'#f9a825';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 140 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="2" y="28" width="58" height="44" rx="3" fill="'+c+'" stroke="#c07800" stroke-width="2"/>'+
        '<rect x="45" y="14" width="16" height="34" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>'+
        '<rect x="50" y="18" width="8" height="20" rx="1" fill="rgba(255,255,255,.45)"/>'+
        '<rect x="6" y="32" width="34" height="22" rx="1" fill="rgba(0,0,0,.12)"/>'+
        '<line x1="62" y1="12" x2="62" y2="72" stroke="#8a6000" stroke-width="3"/>'+
        '<line x1="70" y1="12" x2="70" y2="72" stroke="#8a6000" stroke-width="3"/>'+
        '<rect x="72" y="14" width="62" height="7" rx="2" fill="#5a4000" stroke="#3a2800" stroke-width="1.2"/>'+
        '<rect x="72" y="24" width="62" height="7" rx="2" fill="#5a4000" stroke="#3a2800" stroke-width="1.2"/>'+
        '<circle cx="18" cy="74" r="10" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>'+
        '<circle cx="18" cy="74" r="5" fill="#5a5a56"/>'+
        '<circle cx="50" cy="74" r="10" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>'+
        '<circle cx="50" cy="74" r="5" fill="#5a5a56"/>'+
        '<circle cx="6" cy="68" r="5" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>'+
        '<rect x="0" y="62" width="10" height="14" rx="2" fill="'+c+'"/>'+
        '<circle cx="5" cy="34" r="4" fill="#f44336"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-forklift '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-truck') {
      var c = p.color||'#1565c0', cargo = p.cargo||'#e0e0d8';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 180 90" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="2" y="20" width="110" height="52" rx="2" fill="'+cargo+'" stroke="#9a9a90" stroke-width="1.5"/>'+
        '<rect x="112" y="28" width="64" height="44" rx="4" fill="'+c+'" stroke="#0a3a80" stroke-width="2"/>'+
        '<rect x="116" y="33" width="30" height="22" rx="2" fill="rgba(255,255,255,.5)"/>'+
        '<rect x="150" y="33" width="22" height="22" rx="2" fill="rgba(255,255,255,.35)"/>'+
        '<rect x="112" y="55" width="64" height="6" fill="rgba(0,0,0,.15)"/>'+
        '<line x1="2" y1="72" x2="176" y2="72" stroke="#8a8a80" stroke-width="2"/>'+
        '<circle cx="30" cy="74" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>'+
        '<circle cx="30" cy="74" r="4.5" fill="#5a5a56"/>'+
        '<circle cx="80" cy="74" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>'+
        '<circle cx="80" cy="74" r="4.5" fill="#5a5a56"/>'+
        '<circle cx="134" cy="74" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>'+
        '<circle cx="134" cy="74" r="4.5" fill="#5a5a56"/>'+
        '<circle cx="162" cy="74" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>'+
        '<circle cx="162" cy="74" r="4.5" fill="#5a5a56"/>'+
        '<rect x="168" y="56" width="8" height="12" rx="2" fill="#f44336"/>'+
        '<rect x="168" y="40" width="8" height="8" rx="1" fill="#fffde0"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-truck '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-crane') {
      var c = p.color||'#f9a825';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 100 180" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="40" y="80" width="14" height="94" fill="'+c+'" stroke="#c07800" stroke-width="2"/>'+
        '<line x1="44" y1="90" x2="50" y2="140" stroke="#8a6000" stroke-width="1" stroke-dasharray="4,4"/>'+
        '<line x1="50" y1="90" x2="44" y2="140" stroke="#8a6000" stroke-width="1" stroke-dasharray="4,4"/>'+
        '<polygon points="10,82 90,82 84,60 16,60" fill="'+c+'" stroke="#c07800" stroke-width="2"/>'+
        '<rect x="65" y="58" width="20" height="28" rx="2" fill="'+c+'" stroke="#c07800" stroke-width="1.5"/>'+
        '<rect x="68" y="61" width="14" height="16" rx="1" fill="rgba(255,255,255,.4)"/>'+
        '<line x1="90" y1="60" x2="98" y2="16" stroke="#8a6000" stroke-width="2"/>'+
        '<line x1="10" y1="60" x2="2" y2="30" stroke="#8a6000" stroke-width="2"/>'+
        '<line x1="2" y1="30" x2="98" y2="16" stroke="#8a6000" stroke-width="2"/>'+
        '<line x1="85" y1="16" x2="85" y2="44" stroke="#5a4000" stroke-width="1.5"/>'+
        '<rect x="80" y="44" width="10" height="8" rx="1" fill="#3a3a36"/>'+
        '<line x1="6" y1="26" x2="6" y2="2" stroke="#5a4000" stroke-width="1.5"/>'+
        '<rect x="2" y="2" width="8" height="6" rx="1" fill="#3a3a36"/>'+
        '<rect x="28" y="170" width="44" height="8" rx="2" fill="#8a6000"/>'+
        '<rect x="34" y="162" width="32" height="10" rx="2" fill="'+c+'"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-crane '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-brickwall') {
      var cA=p.colorA||'#c8855a', cB=p.colorB||'#dba880', mort=p.mortar||'#e8e0d4';
      var bwRows='', bwW=36, bwH=14, bwGap=3;
      for (var bwR=0;bwR<5;bwR++){
        var bwOff=(bwR%2===0)?0:bwW/2+bwGap/2;
        for(var bwC=-1;bwC<5;bwC++){
          var bwX=bwOff+bwC*(bwW+bwGap), bwY=bwR*(bwH+bwGap)+bwGap;
          if(bwX+bwW<0||bwX>180) continue;
          bwRows+='<rect x="'+bwX+'" y="'+bwY+'" width="'+bwW+'" height="'+bwH+'" rx="1" fill="'+(bwR%2===bwC%2?cA:cB)+'" stroke="'+mort+'" stroke-width="'+bwGap+'"/>';
        }
      }
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 180 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="180" height="100" fill="'+mort+'"/>'+bwRows+
        '</svg></div>\n';
      jsEls += '/* deco-brickwall '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-elevator') {
      var c=p.color||'#546e7a', door=p.door||'#b0bec5';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 70 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="2" width="62" height="156" rx="4" fill="#e8e8e2" stroke="'+c+'" stroke-width="3"/>'+
        '<rect x="10" y="20" width="50" height="100" rx="2" fill="'+door+'" stroke="'+c+'" stroke-width="2"/>'+
        '<rect x="10" y="20" width="24" height="100" rx="2" fill="'+door+'" stroke="'+c+'" stroke-width="1.5"/>'+
        '<rect x="35" y="20" width="25" height="100" rx="2" fill="'+door+'" stroke="'+c+'" stroke-width="1.5"/>'+
        '<line x1="34" y1="20" x2="34" y2="120" stroke="'+c+'" stroke-width="2"/>'+
        '<circle cx="28" cy="70" r="3" fill="'+c+'"/>'+
        '<circle cx="42" cy="70" r="3" fill="'+c+'"/>'+
        '<rect x="10" y="124" width="50" height="28" rx="2" fill="'+c+'"/>'+
        '<circle cx="22" cy="138" r="4" fill="#f9a825"/>'+
        '<circle cx="35" cy="138" r="4" fill="#e0e0d8"/>'+
        '<circle cx="48" cy="138" r="4" fill="#e0e0d8"/>'+
        '<line x1="35" y1="2" x2="35" y2="18" stroke="'+c+'" stroke-width="3"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-elevator '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-pallet') {
      var cb=p.colorBox||'#a0785a', cp=p.colorPallet||'#c8a060';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 110 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="5" y="58" width="100" height="10" rx="2" fill="'+cp+'" stroke="#8a6830" stroke-width="1.5"/>'+
        '<rect x="8" y="48" width="14" height="12" rx="1" fill="'+cp+'" stroke="#8a6830" stroke-width="1"/>'+
        '<rect x="48" y="48" width="14" height="12" rx="1" fill="'+cp+'" stroke="#8a6830" stroke-width="1"/>'+
        '<rect x="88" y="48" width="14" height="12" rx="1" fill="'+cp+'" stroke="#8a6830" stroke-width="1"/>'+
        '<rect x="5" y="66" width="100" height="8" rx="2" fill="'+cp+'" stroke="#8a6830" stroke-width="1.5"/>'+
        '<rect x="8" y="22" width="44" height="28" rx="2" fill="'+cb+'" stroke="#6a4830" stroke-width="1.5"/>'+
        '<rect x="58" y="22" width="44" height="28" rx="2" fill="'+cb+'" stroke="#6a4830" stroke-width="1.5"/>'+
        '<rect x="8" y="8" width="44" height="16" rx="2" fill="'+cb+'" stroke="#6a4830" stroke-width="1.5"/>'+
        '<rect x="58" y="8" width="44" height="16" rx="2" fill="'+cb+'" stroke="#6a4830" stroke-width="1.5"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-pallet '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-cone') {
      var cA=p.colorA||'#f44336';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 50 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<polygon points="25,4 45,60 5,60" fill="'+cA+'" stroke="#b71c1c" stroke-width="1.5"/>'+
        '<rect x="5" y="28" width="40" height="8" fill="#fff" opacity=".85"/>'+
        '<rect x="5" y="44" width="40" height="8" fill="#fff" opacity=".85"/>'+
        '<ellipse cx="25" cy="60" rx="22" ry="6" fill="'+cA+'" stroke="#b71c1c" stroke-width="1.5"/>'+
        '<rect x="3" y="64" width="44" height="8" rx="3" fill="#3a3a36" stroke="#1a1a14" stroke-width="1.5"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-cone '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-rack') {
      var c=p.color||'#1565c0', sh=p.shelf||'#e0e0d8';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 140 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="2" width="8" height="116" rx="2" fill="'+c+'"/>'+
        '<rect x="128" y="2" width="8" height="116" rx="2" fill="'+c+'"/>'+
        '<rect x="4" y="12" width="132" height="8" rx="1" fill="'+c+'"/>'+
        '<rect x="4" y="54" width="132" height="8" rx="1" fill="'+c+'"/>'+
        '<rect x="4" y="96" width="132" height="8" rx="1" fill="'+c+'"/>'+
        '<rect x="4" y="108" width="132" height="8" rx="1" fill="'+c+'"/>'+
        '<rect x="14" y="20" width="28" height="34" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>'+
        '<rect x="48" y="20" width="44" height="34" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>'+
        '<rect x="98" y="28" width="30" height="26" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>'+
        '<rect x="14" y="62" width="50" height="34" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>'+
        '<rect x="70" y="62" width="28" height="34" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>'+
        '<rect x="100" y="62" width="28" height="34" rx="2" fill="'+sh+'" stroke="#c0c0b8" stroke-width="1"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-rack '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-barrel') {
      var c=p.color||'#2e7d32';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 55 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<ellipse cx="27.5" cy="12" rx="24" ry="7" fill="'+c+'" stroke="#1a4a1a" stroke-width="2"/>'+
        '<rect x="3.5" y="12" width="48" height="56" fill="'+c+'" stroke="'+c+'"/>'+
        '<ellipse cx="27.5" cy="68" rx="24" ry="7" fill="#1a4a1a" stroke="#0a2a0a" stroke-width="2"/>'+
        '<line x1="3.5" y1="28" x2="51.5" y2="28" stroke="#1a4a1a" stroke-width="3"/>'+
        '<line x1="3.5" y1="52" x2="51.5" y2="52" stroke="#1a4a1a" stroke-width="3"/>'+
        '<rect x="14" y="36" width="28" height="14" rx="2" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.5)" stroke-width="1"/>'+
        '<text x="27.5" y="46" font-family="monospace" font-size="6" fill="#fff" text-anchor="middle" font-weight="bold">200L</text>'+
        '</svg></div>\n';
      jsEls += '/* deco-barrel '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-conveyor') {
      var c=p.color||'#546e7a', belt=p.belt||'#3a3a36';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 180 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="16" y="18" width="148" height="24" rx="4" fill="'+belt+'" stroke="#1a1a14" stroke-width="2"/>'+
        '<rect x="20" y="22" width="140" height="16" rx="2" fill="#5a5a56"/>'+
        '<line x1="20" y1="22" x2="160" y2="22" stroke="#7a7a76" stroke-width="1" stroke-dasharray="10,8"/>'+
        '<line x1="20" y1="38" x2="160" y2="38" stroke="#7a7a76" stroke-width="1" stroke-dasharray="10,8"/>'+
        '<circle cx="16" cy="30" r="12" fill="'+c+'" stroke="#2e4a5a" stroke-width="2"/>'+
        '<circle cx="16" cy="30" r="5" fill="#2e4a5a"/>'+
        '<circle cx="164" cy="30" r="12" fill="'+c+'" stroke="#2e4a5a" stroke-width="2"/>'+
        '<circle cx="164" cy="30" r="5" fill="#2e4a5a"/>'+
        '<rect x="24" y="42" width="8" height="22" rx="2" fill="'+c+'" stroke="#2e4a5a" stroke-width="1.5"/>'+
        '<rect x="74" y="42" width="8" height="22" rx="2" fill="'+c+'" stroke="#2e4a5a" stroke-width="1.5"/>'+
        '<rect x="124" y="42" width="8" height="22" rx="2" fill="'+c+'" stroke="#2e4a5a" stroke-width="1.5"/>'+
        '<rect x="148" y="42" width="8" height="22" rx="2" fill="'+c+'" stroke="#2e4a5a" stroke-width="1.5"/>'+
        '<rect x="18" y="62" width="144" height="6" rx="2" fill="'+c+'" stroke="#2e4a5a" stroke-width="1.5"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-conveyor '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-excavator') {
      var c=p.color||'#f9a825';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 160 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="10" y="70" width="140" height="18" rx="4" fill="#3a3a36" stroke="#1a1a14" stroke-width="2"/>'+
        '<rect x="6" y="74" width="14" height="10" rx="2" fill="#5a5a56"/>'+
        '<rect x="140" y="74" width="14" height="10" rx="2" fill="#5a5a56"/>'+
        '<circle cx="24" cy="88" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>'+
        '<circle cx="24" cy="88" r="4" fill="#5a5a56"/>'+
        '<circle cx="60" cy="88" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>'+
        '<circle cx="60" cy="88" r="4" fill="#5a5a56"/>'+
        '<circle cx="100" cy="88" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>'+
        '<circle cx="100" cy="88" r="4" fill="#5a5a56"/>'+
        '<circle cx="136" cy="88" r="10" fill="#2a2a26" stroke="#1a1a14" stroke-width="2"/>'+
        '<circle cx="136" cy="88" r="4" fill="#5a5a56"/>'+
        '<rect x="20" y="40" width="80" height="34" rx="4" fill="'+c+'" stroke="#c07800" stroke-width="2"/>'+
        '<rect x="24" y="44" width="38" height="24" rx="2" fill="rgba(255,255,255,.4)"/>'+
        '<rect x="24" y="44" width="38" height="14" rx="2" fill="rgba(255,255,255,.55)"/>'+
        '<line x1="100" y1="52" x2="132" y2="32" stroke="'+c+'" stroke-width="7" stroke-linecap="round"/>'+
        '<line x1="132" y1="32" x2="148" y2="52" stroke="'+c+'" stroke-width="6" stroke-linecap="round"/>'+
        '<polygon points="146,50 158,50 155,66 142,66" fill="'+c+'" stroke="#c07800" stroke-width="2"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-excavator '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-person-walk') {
      var c=p.color||'#1565c0', sk=p.skin||'#f5c28a';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 45 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<ellipse cx="22" cy="10" rx="8" ry="9" fill="'+sk+'" stroke="#8a5a2a" stroke-width="1.5"/>'+
        '<rect x="12" y="19" width="20" height="28" rx="3" fill="'+c+'" stroke="#0a3a80" stroke-width="1.5"/>'+
        '<line x1="12" y1="25" x2="5" y2="42" stroke="'+sk+'" stroke-width="5" stroke-linecap="round"/>'+
        '<line x1="32" y1="25" x2="40" y2="40" stroke="'+sk+'" stroke-width="5" stroke-linecap="round"/>'+
        '<line x1="18" y1="47" x2="14" y2="74" stroke="#2a2a26" stroke-width="6" stroke-linecap="round"/>'+
        '<line x1="26" y1="47" x2="32" y2="72" stroke="#2a2a26" stroke-width="6" stroke-linecap="round"/>'+
        '<line x1="14" y1="74" x2="6" y2="90" stroke="#2a2a26" stroke-width="5" stroke-linecap="round"/>'+
        '<line x1="32" y1="72" x2="38" y2="88" stroke="#2a2a26" stroke-width="5" stroke-linecap="round"/>'+
        '<rect x="4" y="88" width="14" height="7" rx="2" fill="#1a1a16"/>'+
        '<rect x="32" y="86" width="12" height="7" rx="2" fill="#1a1a16"/>'+
        '</svg></div>\n';
      jsEls += '/* deco-person-walk '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo === 'deco-sign-hard') {
      var c=p.color||'#f9a825';
      htmlEls += '<div id="'+el.id+'" style="'+st+'overflow:hidden;box-sizing:border-box;">' +
        '<svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="2" y="2" width="76" height="76" rx="6" fill="'+c+'" stroke="#c07800" stroke-width="2"/>'+
        '<ellipse cx="40" cy="25" rx="14" ry="13" fill="#f0f0e8" stroke="#9a8030" stroke-width="1.5"/>'+
        '<path d="M26 22 Q40 10 54 22" fill="'+c+'" stroke="#c07800" stroke-width="2.5"/>'+
        '<ellipse cx="40" cy="24" rx="7" ry="7" fill="#f5c28a" stroke="#9a7050" stroke-width="1"/>'+
        '<rect x="30" y="38" width="20" height="22" rx="2" fill="#f0f0e8" stroke="#9a8030" stroke-width="1.5"/>'+
        '<rect x="25" y="40" width="8" height="16" rx="2" fill="#f0f0e8" stroke="#9a8030" stroke-width="1"/>'+
        '<rect x="47" y="40" width="8" height="16" rx="2" fill="#f0f0e8" stroke="#9a8030" stroke-width="1"/>'+
        '<rect x="32" y="60" width="7" height="14" rx="2" fill="#f0f0e8" stroke="#9a8030" stroke-width="1"/>'+
        '<rect x="41" y="60" width="7" height="14" rx="2" fill="#f0f0e8" stroke="#9a8030" stroke-width="1"/>'+
        '<text x="40" y="76" font-family="monospace" font-size="5" fill="#c07800" text-anchor="middle" font-weight="bold">EPI OBLIGATORIO</text>'+
        '</svg></div>\n';
      jsEls += '/* deco-sign-hard '+el.id+' — decoración estática */\n\n';
    }

    else if (el.tipo.indexOf('auto-') === 0 || el.tipo.indexOf('fab-') === 0 ||
             ['deco-helmet','deco-fire-ext','deco-safety-exit','deco-first-aid',
              'deco-electric-hazard','deco-road-barrier','deco-scaffold','deco-wheelbarrow',
              'deco-cement-mixer','deco-bulldozer','deco-dump-truck','deco-ladder',
              'deco-toolbox','deco-wire-spool','deco-welding','deco-compressor'].indexOf(el.tipo) !== -1) {
      /* Elementos decorativos — renderizado igual al canvas */
      var innerSvg = htmlInterior(el);
      htmlEls += '<div id="' + el.id + '" style="' + st + 'overflow:hidden;box-sizing:border-box;">' +
        innerSvg + '</div>\n';
      jsEls += '/* ' + el.tipo + ' ' + el.id + ' — decoración estática */\n\n';
    }

    else if (el.tipo === 'image-static') {
      var imgSrc = p.imgData || '';
      var fit    = p.fit || 'contain';
      if (imgSrc) {
        htmlEls += '<div style="' + st + 'display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box;">' +
          '<img src="' + imgSrc + '" style="max-width:100%;max-height:100%;object-fit:' + fit + '">' +
          '</div>\n';
      } else {
        htmlEls += '<div style="' + st + 'display:flex;align-items:center;justify-content:center;border:1px dashed #c8c8c0;border-radius:3px;background:#f9f9f7;box-sizing:border-box;">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:#9a9a90;letter-spacing:1px;text-align:center;line-height:1.8">🖼<br>SIN IMAGEN</div>' +
          '</div>\n';
      }
      jsEls += '/* image-static ' + el.id + ' — estático, sin lógica PLC */\n\n';
    }


  });

  var listaVarsStr = Object.keys(mapaVars)
    .map(function(k) { return '  ' + k + ': \'' + mapaVars[k].replace(/'/g,"\\'") + '\''; })
    .join(',\n');

  /* ── Multi-PLC: inyectar plcIdx en plcLeer/plcEscribir del código generado ──
     Solo activo cuando hay más de 1 PLC configurado.
     Estrategia: dividir jsEls por bloques de función (function XXX_EL_ID),
     detectar a qué elemento pertenece cada bloque por su ID, y añadir
     el índice de PLC correspondiente como último argumento. */
  if (typeof PLCS !== 'undefined' && PLCS.length > 1) {
    var _idxMap = {};
    ELEMENTOS.forEach(function(el) {
      _idxMap[el.id] = el.props.plcIdx || 0;
    });
    /* Los bloques en jsEls contienen IDs de elemento en nombres de función:
       function upd_EL_ID, function act_EL_ID, setInterval(function(){ ...EL_ID... }, ms)
       Separamos por "/* --- " o por "function " seguido de identificador con el ID */
    jsEls = jsEls.replace(
      /plcLeer\(vars\.([^,]+),\s*function/g,
      function(match, varKey) {
        /* buscar qué elemento usa esta variable */
        var foundId = null;
        ELEMENTOS.forEach(function(el) {
          var p = el.props || {};
          var allVars = [p.var1,p.varLed,p.varRun,p.varFault,p.varOpen,p.varClosed,
                         p.varAlarm,p.varAck,p.arrayVar,p.varUp,p.varDown,p.varLeft,
                         p.varRight,p.visVar,p.varPV,p.varSP,p.animVar,p.varTime,
                         p.varDate,p.varLevel,p.varHigh,p.varLow,p.varHz,p.varRpm,
                         p.varI,p.varActive,p.varDP,p.varDirty,p.varTemp,p.varTin,p.varTout];
          allVars.forEach(function(v) {
            if (v && claveJs(v) === varKey) foundId = el.id;
          });
        });
        var idx = (foundId && _idxMap[foundId]) ? _idxMap[foundId] : 0;
        return idx > 0
          ? 'plcLeer(vars.' + varKey + ', function'   /* índice se añade al cierre */
          : match;
      }
    );
    /* Para plcEscribir es más directo: cada llamada tiene el elemento en contexto
       de una función cuyo nombre contiene el ID. Usamos una regex que captura
       el bloque de función y el ID para asociar el índice. */
    jsEls = jsEls.replace(
      /(function\s+(?:act|upd\w*|set|reset|jog|multistate|spinbox|slider|confirm|dpad|nav)\w*_(\w+)\s*\([^)]*\)\s*\{[\s\S]*?(?=\nfunction|\n\/\*|$))/g,
      function(block, _full, elId) {
        var idx = _idxMap[elId] || 0;
        if (!idx) return block;
        /* reemplazar plcEscribir(vars.X, Y) → plcEscribir(vars.X, Y, null, IDX)
           y plcEscribir(v, true/false) → plcEscribir(v, true/false, null, IDX) */
        return block
          .replace(/plcEscribir\(([^,]+),\s*([^,)]+)\)/g,
                   'plcEscribir($1, $2, null, ' + idx + ')')
          .replace(/plcEscribir\(([^,]+),\s*([^,)]+),\s*function/g,
                   'plcEscribir($1, $2, function');
      }
    );
  }

  /* startPolling con flag anti-duplicado y registro de intervalos */
  var jsPollFn = 'var _pollActivo = false;\n' +
    'function startPolling() {\n' +
    '  if (_pollActivo) return;\n' +
    '  _pollActivo = true;\n' +
    jsPolling.replace(/setInterval\(/g, '_pollIntervals.push(setInterval(').replace(/,\s*(\d+)\);/g, ', $1));') +
    '}';

  var tooltipMapJs = 'var _plcTipMap = {' + tooltipMapEntries.join(',') + '};\n';

  var cssExtra = [
    '#plc-status {',
    '  position: fixed; top: 10px; right: 14px;',
    '  display: flex; align-items: center; gap: 7px;',
    '  padding: 4px 10px;',
    '  background: rgba(255,255,255,0.92);',
    '  border: 1px solid #dcdcd6; border-radius: 4px;',
    '  font-family: "DM Mono", monospace;',
    '  font-size: 10px; letter-spacing: 1.5px; color: #6a6a62;',
    '  z-index: 999; backdrop-filter: blur(4px);',
    '  box-shadow: 0 2px 8px rgba(0,0,0,.08);',
    '}',
    '#hmi-status-sep { width:1px; height:16px; background:#dcdcd6; flex-shrink:0; }',
    '#plc-dot {',
    '  width: 6px; height: 6px; border-radius: 50%;',
    '  background: #b0b0a8; transition: all .3s; flex-shrink: 0;',
    '}',
    '#plc-dot.ok    { background: #2e7d32; box-shadow: 0 0 6px rgba(46,125,50,.5); }',
    '#plc-dot.error { background: #c62828; box-shadow: 0 0 6px rgba(198,40,40,.5); animation: blink .5s step-end infinite; }',
    '#plc-dot.retry { background: #f57c00; box-shadow: 0 0 6px rgba(245,124,0,.5); }',
    '@keyframes blink { 50%{opacity:.2} }',
    '#plc-log {',
    '  position: fixed; bottom: 14px; left: 50%;',
    '  transform: translateX(-50%);',
    '  font-family: "DM Mono", monospace;',
    '  font-size: 10px; letter-spacing: 1px;',
    '  color: #f0f0e8; background: #1a1a18;',
    '  padding: 6px 16px; border-radius: 3px;',
    '  opacity: 0; transition: opacity .25s;',
    '  pointer-events: none; white-space: nowrap; z-index: 9999;',
    '}',
    '#plc-log.show { opacity: 1; }',
    '/* ── PLC Tooltip ── */',
    '#plc-tip {',
    '  position: fixed; z-index: 10000; pointer-events: none;',
    '  background: #1a1a18; border: 1px solid #3a3a30;',
    '  border-radius: 5px; padding: 0;',
    '  box-shadow: 0 6px 24px rgba(0,0,0,.5);',
    '  opacity: 0; transform: translateY(4px);',
    '  transition: opacity .15s ease, transform .15s ease;',
    '  max-width: 360px; min-width: 180px;',
    '}',
    '#plc-tip.visible { opacity: 1; transform: translateY(0); }',
    '#plc-tip-header {',
    '  padding: 6px 10px 5px;',
    '  border-bottom: 1px solid #2e2e28;',
    '  font-family: "DM Mono", monospace; font-size: 9px;',
    '  letter-spacing: 1.5px; color: #f0f0e8;',
    '  font-weight: 500;',
    '}',
    '#plc-tip-body { padding: 5px 10px 8px; }',
    '.plc-tip-row {',
    '  display: flex; align-items: center; gap: 6px;',
    '  padding: 3px 0;',
    '}',
    '.plc-tip-dot {',
    '  width: 5px; height: 5px; border-radius: 50%;',
    '  background: #00c853; box-shadow: 0 0 4px rgba(0,200,83,.5);',
    '  flex-shrink: 0;',
    '}',
    '.plc-tip-lbl {',
    '  font-family: "DM Mono", monospace; font-size: 8px;',
    '  color: #5a5a52; letter-spacing: 1px; min-width: 52px; flex-shrink: 0;',
    '}',
    '.plc-tip-var {',
    '  font-family: "DM Mono", monospace; font-size: 9px;',
    '  color: #c8d8b0; letter-spacing: 0.5px; word-break: break-all;',
    '}'
  ].join('\n');

  /* ── Post-proceso: inyectar data-tipo y data-cat-anim directamente en el HTML ──
     Mucho más fiable que hacerlo via JS en runtime, porque el CSS ya funciona
     desde que el DOM existe, sin esperar al login del PLC.
  ── */
  var _ANIM_TIPOS_SET = {};
  var _LUZ_TIPOS_SET  = {};
  [
    'auto-wheel','auto-tyre','auto-robot-arm','auto-spot-weld','auto-paint-gun',
    'auto-press-machine','auto-vin-scanner','auto-agv','auto-exhaust','auto-brake-disc',
    'auto-engine','auto-gearbox','auto-suspension','auto-abs-module',
    'motor-symbol','pump-symbol','valve-symbol',
    'fab-robot-industrial','fab-cnc-machine','fab-lathe','fab-drill-press',
    'fab-hydraulic-press','fab-welding-station','fab-paint-booth','fab-oven-industrial',
    'fab-cooling-tower','fab-boiler','fab-compressor-ind','fab-generator',
    'fab-switchboard','fab-plc-cabinet','fab-hmi-panel','fab-agv-station','fab-laser-cutter',
    'fab-3d-printer','fab-extruder','fab-winding-machine','fab-palletizer',
    'fab-scara-robot','fab-delta-robot','fab-cobot','fab-vision-system',
    'fab-injection-mold','fab-packaging','fab-quality-station',
    'deco-conveyor','deco-worker','deco-person-walk','deco-forklift','deco-truck',
    'deco-dump-truck','deco-crane','deco-elevator','deco-excavator','deco-bulldozer',
    'deco-wheelbarrow','deco-cement-mixer','deco-compressor','deco-welding',
    'deco-electric-hazard','deco-road-barrier','deco-cone','deco-fire-ext',
    'deco-safety-exit','deco-first-aid','deco-sign-hard','deco-helmet','deco-wire-spool',
    'status-led','btn-led','level-tank','progress-bar','alarm-banner','pid-faceplate'
  ].forEach(function(t){ _ANIM_TIPOS_SET[t] = true; });
  [
    'deco-worker','deco-person-walk','deco-forklift','deco-truck','deco-dump-truck',
    'deco-crane','deco-elevator','deco-excavator','deco-bulldozer','deco-wheelbarrow',
    'deco-cement-mixer','deco-compressor','deco-welding','deco-electric-hazard',
    'deco-road-barrier','deco-cone','deco-fire-ext','deco-safety-exit','deco-first-aid',
    'deco-sign-hard','deco-helmet','deco-wire-spool'
  ].forEach(function(t){ _LUZ_TIPOS_SET[t] = true; });

  ELEMENTOS.forEach(function(el) {
    if (!_ANIM_TIPOS_SET[el.tipo]) return;
    var extra = ' data-tipo="' + el.tipo + '"';
    if (_LUZ_TIPOS_SET[el.tipo]) extra += ' data-cat-anim="luz"';
    /* Reemplazar id="EL_ID" → id="EL_ID" data-tipo="..." en el primer match */
    htmlEls = htmlEls.replace(
      new RegExp('(<[a-zA-Z]+\\s[^>]*\\bid="' + el.id + '")', ''),
      '$1' + extra
    );
  });

  var scriptFinal = generarNucleoPLC(ip, user, pass, anon, listaVarsStr, varsToggle, jsEls + '\n' + jsPollFn, proyecto);

  /* ── Multi-PLC: si hay más de 1 PLC configurado, reemplazar el
     bloque de conexión simple por los conectores individuales ── */
  var plcsActivos = (typeof PLCS !== 'undefined') ? PLCS.filter(function(p){ return p.ip; }) : [];
  if (plcsActivos.length > 1) {
    /* el nucleo generado tiene las funciones plcLeer/plcEscribir del
       PLC-0; las sobreescribimos con los wrappers multi-PLC */
    scriptFinal = mplcGenerarBloqueConectores() + '\n' + scriptFinal;
  }

  var tooltipHtml = '<div id="plc-tip"><div id="plc-tip-header">Conexión PLC</div><div id="plc-tip-body"></div></div>\n';



  var tablaCSS = [
    '/* ── Tabla PLC HMI exportada ── */',
    '#hmi-tabla-btn{background:none;border:1px solid rgba(255,255,255,.15);border-radius:3px;color:#9a9a92;cursor:pointer;padding:2px 7px;transition:all .15s;height:22px;display:flex;align-items:center;gap:4px;font-family:"DM Mono",monospace;font-size:9px;letter-spacing:.5px;white-space:nowrap;}',
    '#hmi-tabla-btn:hover{border-color:#00c853;color:#00c853;}',
    '#hmi-tabla-btn.activa{border-color:#00c853;color:#00c853;background:rgba(0,200,83,.08);}',
    '.hmi-sep{width:1px;height:16px;background:#dcdcd6;flex-shrink:0;}',
    '#hmi-disconnect-btn{background:none;border:1px solid rgba(255,255,255,.15);border-radius:3px;color:#9a9a92;cursor:pointer;padding:2px 8px;transition:all .15s;height:22px;display:flex;align-items:center;font-size:13px;line-height:1;}',
    '#hmi-disconnect-btn:hover{border-color:#c62828;color:#c62828;background:rgba(198,40,40,.08);}',
    '/* ── Modal desconectar ── */',
    '#hmi-disc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10100;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;pointer-events:none;}',
    '#hmi-disc-overlay.show{opacity:1;pointer-events:all;}',
    '#hmi-disc-box{background:#1e1e1c;border:1px solid #3a3a30;border-radius:6px;padding:28px 32px;min-width:300px;max-width:380px;box-shadow:0 12px 48px rgba(0,0,0,.7);transform:translateY(8px) scale(.97);transition:transform .2s;font-family:"DM Mono",monospace;}',
    '#hmi-disc-overlay.show #hmi-disc-box{transform:translateY(0) scale(1);}',
    '#hmi-disc-icon{font-size:32px;text-align:center;margin-bottom:12px;}',
    '#hmi-disc-title{font-size:11px;letter-spacing:2px;color:#f0f0e8;text-align:center;margin-bottom:6px;}',
    '#hmi-disc-sub{font-size:9px;letter-spacing:1px;color:#6a6a62;text-align:center;margin-bottom:22px;line-height:1.6;}',
    '#hmi-disc-user{display:inline-block;background:#2a2a28;border:1px solid #3a3a30;border-radius:3px;padding:3px 10px;font-size:10px;color:#9a9a92;margin:0 auto 22px;display:block;text-align:center;letter-spacing:1px;}',
    '#hmi-disc-btns{display:flex;gap:8px;justify-content:center;}',
    '.hmi-disc-btn{padding:8px 20px;border-radius:3px;font-family:"DM Mono",monospace;font-size:9px;letter-spacing:1.5px;cursor:pointer;border:1px solid #3a3a30;background:transparent;color:#9a9a92;transition:all .15s;}',
    '.hmi-disc-btn:hover{border-color:#6a6a62;color:#f0f0e8;}',
    '.hmi-disc-btn.peligro{border-color:#c62828;color:#ef5350;}',
    '.hmi-disc-btn.peligro:hover{background:rgba(198,40,40,.15);border-color:#ef5350;color:#fff;}',
    '#hmi-tabla-panel{position:fixed;top:48px;right:14px;width:600px;max-width:96vw;max-height:75vh;background:#1a1a18;border:1px solid #3a3a30;border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,.6);font-family:"DM Mono",monospace;font-size:10px;display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(-8px) scale(.97);transition:opacity .2s,transform .2s;pointer-events:none;z-index:9989;}',
    '#hmi-tabla-panel.visible{opacity:1;transform:translateY(0) scale(1);pointer-events:all;}',
    '#hmi-tabla-hdr{display:flex;align-items:center;gap:8px;padding:9px 12px;background:rgba(0,200,83,.07);border-bottom:1px solid #2e2e28;flex-shrink:0;font-size:9px;letter-spacing:1.5px;color:#c8c8b8;}',
    '#hmi-tabla-count{font-size:8px;color:#5a5a52;letter-spacing:1px;}',
    '#hmi-tabla-filtro{background:#111;border:1px solid #2e2e28;border-radius:3px;color:#c8c8b8;font-family:"DM Mono",monospace;font-size:9px;padding:3px 8px;outline:none;width:140px;}',
    '#hmi-tabla-filtro:focus{border-color:#00c853;}',
    '#hmi-tabla-hdr button{background:none;border:none;color:#5a5a52;cursor:pointer;font-size:14px;padding:2px 4px;border-radius:3px;}',
    '#hmi-tabla-hdr button:hover{color:#c8c8b8;}',
    '#hmi-tabla-body{overflow:auto;flex:1;}',
    '#hmi-tabla-body::-webkit-scrollbar{width:4px;}',
    '#hmi-tabla-body::-webkit-scrollbar-thumb{background:#2e2e28;border-radius:2px;}',
    '#hmi-tabla-tbl{width:100%;border-collapse:collapse;}',
    '.htbl-th{position:sticky;top:0;background:#141412;padding:5px 12px;font-size:7px;letter-spacing:2px;color:#5a5a52;font-weight:500;border-bottom:1px solid #2e2e28;text-align:left;white-space:nowrap;}',
    '.htbl-row{border-bottom:1px solid rgba(255,255,255,.03);transition:background .1s;}',
    '.htbl-row:hover{background:rgba(255,255,255,.04);}',
    '.htbl-td{padding:6px 12px;vertical-align:top;}',
    '.htbl-id{font-size:9px;color:#f0f0e8;letter-spacing:1px;font-weight:500;}',
    '.htbl-tipo{font-size:8px;color:#5a5a52;letter-spacing:.5px;margin-top:1px;}',
    '.htbl-vr{display:flex;align-items:center;gap:6px;padding:2px 0;}',
    '.htbl-lbl{font-size:7px;color:#5a5a52;letter-spacing:1px;min-width:52px;flex-shrink:0;}',
    '.htbl-val{font-size:9px;color:#c8d8b0;cursor:pointer;padding:1px 5px;border-radius:2px;transition:background .1s,color .1s;word-break:break-all;}',
    '.htbl-val:hover{background:rgba(0,200,83,.14);color:#00e676;}',
    '#hmi-tabla-pag{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-top:1px solid #2e2e28;flex-shrink:0;background:#111;}',
    '.htbl-pag-btn{background:transparent;border:1px solid #2e2e28;border-radius:2px;color:#5a5a52;font-family:"DM Mono",monospace;font-size:9px;padding:2px 7px;cursor:pointer;transition:all .12s;min-width:24px;}',
    '.htbl-pag-btn:hover:not([disabled]){border-color:#c8c8b8;color:#c8c8b8;}',
    '.htbl-pag-btn.htbl-pag-activo{border-color:#00c853;color:#00c853;background:rgba(0,200,83,.1);}',
    '.htbl-pag-btn[disabled]{opacity:.3;cursor:default;}',
  ].join('\n');

  var tooltipJs = '\n' +
    tooltipMapJs +
    '(function() {\n' +
    '  var tip = document.getElementById("plc-tip");\n' +
    '  var tipBody = document.getElementById("plc-tip-body");\n' +
    '  var tipHdr  = document.getElementById("plc-tip-header");\n' +
    '  var _tipTimer = null;\n' +
    '  function findHmiEl(target) {\n' +
    '    var node = target;\n' +
    '    while (node && node !== document.body) {\n' +
    '      if (node.id && _plcTipMap[node.id]) return node;\n' +
    '      node = node.parentElement;\n' +
    '    }\n' +
    '    return null;\n' +
    '  }\n' +
    '  function showTip(e, el) {\n' +
    '    if (_tipTimer) { clearTimeout(_tipTimer); _tipTimer = null; }\n' +
    '    var rows = _plcTipMap[el.id];\n' +
    '    if (tipHdr) tipHdr.textContent = el.id;\n' +
    '    tipBody.innerHTML = rows.map(function(v) {\n' +
    '      var parts = v.indexOf(": ") !== -1 ? [v.slice(0, v.indexOf(": ")), v.slice(v.indexOf(": ") + 2)] : ["", v];\n' +
    '      return "<div class=\\"plc-tip-row\\">" +\n' +
    '        "<div class=\\"plc-tip-dot\\"></div>" +\n' +
    '        "<div class=\\"plc-tip-lbl\\">" + parts[0] + "</div>" +\n' +
    '        "<div class=\\"plc-tip-var\\">" + parts[1] + "</div>" +\n' +
    '      "</div>";\n' +
    '    }).join("");\n' +
    '    tip.classList.add("visible");\n' +
    '    moveTip(e);\n' +
    '  }\n' +
    '  function moveTip(e) {\n' +
    '    var x = e.clientX + 14, y = e.clientY + 14;\n' +
    '    var tw = tip.offsetWidth, th = tip.offsetHeight;\n' +
    '    if (x + tw > window.innerWidth  - 8) x = e.clientX - tw - 10;\n' +
    '    if (y + th > window.innerHeight - 8) y = e.clientY - th - 10;\n' +
    '    tip.style.left = x + "px"; tip.style.top = y + "px";\n' +
    '  }\n' +
    '  function hideTip() {\n' +
    '    _tipTimer = setTimeout(function() { tip.classList.remove("visible"); }, 120);\n' +
    '  }\n' +
    '  document.addEventListener("mouseover", function(e) {\n' +
    '    var found = findHmiEl(e.target);\n' +
    '    if (found) { showTip(e, found); return; }\n' +
    '    hideTip();\n' +
    '  });\n' +
    '  document.addEventListener("mousemove", function(e) {\n' +
    '    if (tip.classList.contains("visible")) moveTip(e);\n' +
    '  });\n' +
    '  document.addEventListener("mouseout", function(e) {\n' +
    '    if (!e.relatedTarget || e.relatedTarget === document.body) hideTip();\n' +
    '  });\n' +
    '})();\n';

  /* ════════════════════════════════════════════════════════════
     TABLA PLC EXPORTADA — widget flotante con paginación
     ════════════════════════════════════════════════════════════ */
  var tablaEls = ELEMENTOS.filter(function(el) {
    return !(el.props && el.props._tablaVisible === false);
  });
  var _tKeys2 = [
    {key:'var1',label:'Variable PLC'},{key:'varLed',label:'LED'},
    {key:'varRun',label:'RUN'},{key:'varFault',label:'FAULT'},
    {key:'varOpen',label:'OPEN'},{key:'varClosed',label:'CLOSED'},
    {key:'varUp',label:'ARRIBA'},{key:'varDown',label:'ABAJO'},
    {key:'varLeft',label:'IZQ'},{key:'varRight',label:'DER'},
    {key:'varSet',label:'SET'},{key:'varReset',label:'RESET'},
    {key:'varAlarm',label:'ALARMA'},{key:'varAck',label:'ACK'},
    {key:'arrayVar',label:'ARRAY'},{key:'varPV',label:'PV'},
    {key:'varSP',label:'SP'},{key:'varOut',label:'OUT'},
    {key:'visVar',label:'VISIB.'},{key:'animVar',label:'ANIM.'}
  ];
  (function(){ for(var ai=1;ai<=8;ai++) _tKeys2.push({key:'avar'+ai,label:'ALARM '+ai}); for(var di=1;di<=6;di++) _tKeys2.push({key:'dvar'+di,label:'DATO '+di}); })();

  var tablaData = tablaEls.map(function(el) {
    var p = el.props || {};
    var vars = [];
    _tKeys2.forEach(function(vk){ var v=p[vk.key]; if(v&&String(v).trim()) vars.push({label:vk.label,valor:String(v).trim()}); });
    if(p.pollMs) vars.push({label:'Poll',valor:p.pollMs+'ms',info:true});
    return { id:el.id, tipo:el.tipo, vars:vars };
  });

  var tablaHtml =
    '<div id="hmi-tabla-panel">\n' +
    '  <div id="hmi-tabla-hdr">\n' +
    '    <span>\u{1F50C} CONEXIONES PLC</span>\n' +
    '    <span id="hmi-tabla-count"></span>\n' +
    '    <div style="flex:1"></div>\n' +
    '    <input id="hmi-tabla-filtro" type="text" placeholder="Buscar..." oninput="filtrarTablaHmi()">\n' +
    '    <button onclick="cerrarTablaHmi()">\u2715</button>\n' +
    '  </div>\n' +
    '  <div id="hmi-tabla-body">\n' +
    '    <table id="hmi-tabla-tbl">\n' +
    '      <thead><tr><th class="htbl-th">ELEMENTO</th><th class="htbl-th">TIPO</th><th class="htbl-th">VARIABLES PLC</th></tr></thead>\n' +
    '      <tbody id="hmi-tabla-tbody"></tbody>\n' +
    '    </table>\n' +
    '  </div>\n' +
    '  <div id="hmi-tabla-pag"></div>\n' +
    '</div>\n';

  var tablaJs = (function() {
    var POR_PAG = 10;
    var js = '';
    js += 'var _tablaData=' + JSON.stringify(tablaData) + ';\n';
    js += 'var _tablaActiva=false,_tablaFiltro="",_tablaPag=1,_POR_PAG=' + POR_PAG + ';\n';
    js += 'function toggleTablaHmi(){_tablaActiva=!_tablaActiva;var btn=document.getElementById("hmi-tabla-btn"),panel=document.getElementById("hmi-tabla-panel");if(btn)btn.classList.toggle("activa",_tablaActiva);if(panel)panel.classList.toggle("visible",_tablaActiva);if(_tablaActiva){_tablaPag=1;var fi=document.getElementById("hmi-tabla-filtro");if(fi)fi.value="";_tablaFiltro="";_renderTablaHmi();}}\n';
    js += 'function cerrarTablaHmi(){_tablaActiva=false;var btn=document.getElementById("hmi-tabla-btn"),panel=document.getElementById("hmi-tabla-panel");if(btn)btn.classList.remove("activa");if(panel)panel.classList.remove("visible");_destacarTodosTbl();}\n';
    js += 'function filtrarTablaHmi(){_tablaFiltro=document.getElementById("hmi-tabla-filtro").value.toLowerCase();_tablaPag=1;_renderTablaHmi();}\n';
    js += 'function _getFiltrados(){if(!_tablaFiltro)return _tablaData;return _tablaData.filter(function(d){var t=(d.id+" "+d.tipo+" "+(d.vars||[]).map(function(v){return v.valor;}).join(" ")).toLowerCase();return t.indexOf(_tablaFiltro)!==-1;});}\n';
    js += 'function _renderTablaHmi(){\n';
    js += '  var tbody=document.getElementById("hmi-tabla-tbody"),count=document.getElementById("hmi-tabla-count"),pag=document.getElementById("hmi-tabla-pag");\n';
    js += '  if(!tbody)return;\n';
    js += '  var todos=_getFiltrados(),totalPags=Math.max(1,Math.ceil(todos.length/_POR_PAG));\n';
    js += '  if(_tablaPag>totalPags)_tablaPag=totalPags;\n';
    js += '  var ini=(_tablaPag-1)*_POR_PAG,pagina=todos.slice(ini,ini+_POR_PAG);\n';
    js += '  if(count)count.textContent=todos.length+" elemento"+(todos.length!==1?"s":"");\n';
    js += '  tbody.innerHTML=pagina.map(function(d){\n';
    js += '    var pv=(d.vars||[]).filter(function(v){return !v.info;});\n';
    js += '    var vc=pv.length===0\n';
    js += '      ?"<td class=\\"htbl-td\\" style=\\"color:#5a5a52\\">—</td>"\n';
    js += '      :"<td class=\\"htbl-td\\">"+pv.map(function(v){return "<div class=\\"htbl-vr\\"><span class=\\"htbl-lbl\\">"+v.label+"</span><span class=\\"htbl-val\\" onclick=\\"_copiarTbl(this)\\">"+v.valor+"</span></div>";}).join("")+"</td>";\n';
    js += '    return "<tr class=\\"htbl-row\\" onmouseenter=\\"_resaltarTbl(\'"+d.id+"\')\\" onmouseleave=\\"_destacarTodosTbl()\\" onclick=\\"_irTbl(\'"+d.id+"\')\\" style=\\"cursor:pointer\\">"\n';
    js += '      +"<td class=\\"htbl-td\\"><div class=\\"htbl-id\\">"+d.id+"</div></td>"\n';
    js += '      +"<td class=\\"htbl-td\\"><div class=\\"htbl-tipo\\">"+d.tipo+"</div></td>"\n';
    js += '      +vc+"</tr>";\n';
    js += '  }).join("");\n';
    js += '  if(!pag)return;\n';
    js += '  if(totalPags<=1){pag.innerHTML="";return;}\n';
    js += '  var fin=Math.min(_tablaPag*_POR_PAG,todos.length);\n';
    js += '  var desde=Math.max(1,_tablaPag-2),hasta=Math.min(totalPags,desde+4);if(hasta-desde<4)desde=Math.max(1,hasta-4);\n';
    js += '  var nums="";for(var pp=desde;pp<=hasta;pp++)nums+="<button class=\\"htbl-pag-btn"+(pp===_tablaPag?" htbl-pag-activo":"")+"\\" onclick=\\"_tblPag("+pp+")\\">"+pp+"</button>";\n';
    js += '  pag.innerHTML="<span style=\\"font-size:8px;color:#5a5a52;letter-spacing:1px\\">"+(ini+1)+"–"+fin+" de "+todos.length+"</span>"\n';
    js += '    +"<div style=\\"display:flex;gap:3px\\">"\n';
    js += '    +"<button class=\\"htbl-pag-btn\\" onclick=\\"_tblPag(1)\\" "+(_tablaPag===1?"disabled":"")+">«</button>"\n';
    js += '    +"<button class=\\"htbl-pag-btn\\" onclick=\\"_tblPag("+(_tablaPag-1)+")\\" "+(_tablaPag===1?"disabled":"")+">‹</button>"\n';
    js += '    +nums\n';
    js += '    +"<button class=\\"htbl-pag-btn\\" onclick=\\"_tblPag("+(_tablaPag+1)+")\\" "+(_tablaPag===totalPags?"disabled":"")+">›</button>"\n';
    js += '    +"<button class=\\"htbl-pag-btn\\" onclick=\\"_tblPag("+totalPags+")\\" "+(_tablaPag===totalPags?"disabled":"")+">»</button>"\n';
    js += '    +"</div>";\n';
    js += '}\n';
    js += 'function _tblPag(p){_tablaPag=p;_renderTablaHmi();var b=document.getElementById("hmi-tabla-body");if(b)b.scrollTop=0;}\n';
    js += 'function _resaltarTbl(id){_tablaData.forEach(function(d){var e=document.getElementById(d.id);if(e){e.style.outline="";e.style.outlineOffset="";}});var el=document.getElementById(id);if(el){el.style.outline="2px solid #ffd54f";el.style.outlineOffset="3px";}}\n';
    js += 'function _destacarTodosTbl(){_tablaData.forEach(function(d){var e=document.getElementById(d.id);if(e){e.style.outline="";e.style.outlineOffset="";}});}\n';
    js += 'function _irTbl(id){cerrarTablaHmi();var el=document.getElementById(id);if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.style.outline="2px solid #ffd54f";el.style.outlineOffset="3px";setTimeout(function(){el.style.outline="";el.style.outlineOffset="";},1800);}}\n';
    js += 'function _copiarTbl(el){var t=el.textContent;if(navigator.clipboard)navigator.clipboard.writeText(t);el.style.background="rgba(0,200,83,.25)";el.style.color="#00e676";setTimeout(function(){el.style.background="";el.style.color="";},600);}\n';
    js += 'document.addEventListener("keydown",function(e){if(e.key==="Escape"&&_tablaActiva)cerrarTablaHmi();});\n';
    return js;
  })();



  var cssAnimaciones = [
    '/* ── Animaciones PLC ── */',
    '@keyframes plc-glow-verde  { 0%,100%{filter:drop-shadow(0 0 2px #00e676) drop-shadow(0 0 6px #00c853);opacity:1}  50%{filter:drop-shadow(0 0 8px #00e676) drop-shadow(0 0 18px #00c853);opacity:.85} }',
    '@keyframes plc-glow-ambar  { 0%,100%{filter:drop-shadow(0 0 2px #f9a825) drop-shadow(0 0 6px #c07800);opacity:1}  50%{filter:drop-shadow(0 0 8px #ffca28) drop-shadow(0 0 18px #f9a825);opacity:.85} }',
    '@keyframes plc-glow-azul   { 0%,100%{filter:drop-shadow(0 0 2px #29b6f6) drop-shadow(0 0 6px #0288d1);opacity:1}  50%{filter:drop-shadow(0 0 8px #81d4fa) drop-shadow(0 0 18px #29b6f6);opacity:.85} }',
    '@keyframes plc-glow-rojo   { 0%,100%{filter:drop-shadow(0 0 2px #ef5350) drop-shadow(0 0 6px #c62828);opacity:1}  50%{filter:drop-shadow(0 0 8px #ef9a9a) drop-shadow(0 0 18px #ef5350);opacity:.8} }',
    '@keyframes plc-glow-blanco { 0%,100%{filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 8px #f9a825);opacity:1} 50%{filter:drop-shadow(0 0 12px #fff) drop-shadow(0 0 24px #f9a825);opacity:.9} }',
    '@keyframes plc-glow-cyan   { 0%,100%{filter:drop-shadow(0 0 2px #00e5ff) drop-shadow(0 0 6px #00acc1);opacity:1}  50%{filter:drop-shadow(0 0 8px #80deea) drop-shadow(0 0 18px #00e5ff);opacity:.85} }',
    '@keyframes plc-blink-dot   { 0%,49%{opacity:1;transform:scale(1)} 50%,100%{opacity:.1;transform:scale(.7)} }',
    '@keyframes plc-pulse-dot   { 0%,100%{opacity:1;box-shadow:0 0 0 0 currentColor} 50%{opacity:.9;box-shadow:0 0 0 5px transparent} }',
    '@keyframes conveyor-move   { from{stroke-dashoffset:0} to{stroke-dashoffset:-20px} }',
    /* badge ON */
    '.plc-activo{position:relative;}',
    '.plc-activo::after{content:"▶ ON";position:absolute;top:-15px;left:0;font-family:"DM Mono",monospace;font-size:7px;letter-spacing:1px;color:#00c853;pointer-events:none;z-index:20;white-space:nowrap;}',
    /* luz indicadora */
    '.plc-activo[data-cat-anim]::before{content:"";position:absolute;width:10px;height:10px;border-radius:50%;top:4px;right:4px;z-index:30;pointer-events:none;animation:plc-pulse-dot 1s ease-in-out infinite;}',
    /* verde */
    '.plc-activo[data-tipo="auto-wheel"],.plc-activo[data-tipo="auto-tyre"],.plc-activo[data-tipo="auto-brake-disc"],.plc-activo[data-tipo="auto-robot-arm"],.plc-activo[data-tipo="auto-agv"],.plc-activo[data-tipo="auto-vin-scanner"],.plc-activo[data-tipo="auto-engine"],.plc-activo[data-tipo="auto-gearbox"],.plc-activo[data-tipo="auto-suspension"],.plc-activo[data-tipo="motor-symbol"],.plc-activo[data-tipo="pump-symbol"],.plc-activo[data-tipo="fab-robot-industrial"],.plc-activo[data-tipo="fab-scara-robot"],.plc-activo[data-tipo="fab-cobot"],.plc-activo[data-tipo="fab-delta-robot"],.plc-activo[data-tipo="fab-palletizer"],.plc-activo[data-tipo="fab-cnc-machine"],.plc-activo[data-tipo="fab-lathe"],.plc-activo[data-tipo="fab-drill-press"],.plc-activo[data-tipo="fab-hydraulic-press"],.plc-activo[data-tipo="fab-cooling-tower"],.plc-activo[data-tipo="fab-compressor-ind"],.plc-activo[data-tipo="fab-generator"],.plc-activo[data-tipo="fab-extruder"],.plc-activo[data-tipo="fab-winding-machine"],.plc-activo[data-tipo="fab-injection-mold"],.plc-activo[data-tipo="fab-3d-printer"],.plc-activo[data-tipo="fab-agv-station"],.plc-activo[data-tipo="fab-packaging"],.plc-activo[data-tipo="fab-quality-station"]{animation:plc-glow-verde 1.6s ease-in-out infinite;}',
    '.plc-activo[data-tipo="motor-symbol"] .hmotor-dot{background:#00e676!important;box-shadow:0 0 8px #00c853;}',
    /* soldadura / láser */
    '.plc-activo[data-tipo="auto-spot-weld"],.plc-activo[data-tipo="fab-welding-station"]{animation:plc-glow-blanco .5s ease-in-out infinite;}',
    '.plc-activo[data-tipo="fab-laser-cutter"]{animation:plc-glow-rojo .4s ease-in-out infinite;}',
    /* calor */
    '.plc-activo[data-tipo="fab-oven-industrial"],.plc-activo[data-tipo="fab-boiler"],.plc-activo[data-tipo="fab-paint-booth"],.plc-activo[data-tipo="auto-paint-gun"],.plc-activo[data-tipo="auto-exhaust"]{animation:plc-glow-ambar 2s ease-in-out infinite;}',
    /* visión */
    '.plc-activo[data-tipo="fab-vision-system"],.plc-activo[data-tipo="auto-vin-scanner"],.plc-activo[data-tipo="auto-abs-module"]{animation:plc-glow-cyan 1.2s ease-in-out infinite;}',
    /* PLC cabinets */
    '.plc-activo[data-tipo="fab-plc-cabinet"],.plc-activo[data-tipo="fab-switchboard"],.plc-activo[data-tipo="fab-hmi-panel"]{animation:plc-glow-verde .8s ease-in-out infinite;}',
    /* cinta */
    '.plc-activo[data-tipo="deco-conveyor"]{animation:plc-glow-verde 1.6s ease-in-out infinite;}',
    '.plc-activo[data-tipo="deco-conveyor"] svg line{stroke-dasharray:12 8;animation:conveyor-move .7s linear infinite;}',
    /* LED / alarma / barra */
    '.plc-activo[data-tipo="status-led"] .hstatus{animation:plc-glow-verde 1s ease-in-out infinite;}',
    '.plc-activo[data-tipo="alarm-banner"] .halarm-banner{animation:plc-glow-rojo .6s ease-in-out infinite;}',
    '.plc-activo[data-tipo="progress-bar"] .hprogress-fill{animation:plc-glow-azul 1.5s ease-in-out infinite;width:70%!important;}',
    /* operarios */
    '.plc-activo[data-tipo="deco-worker"],.plc-activo[data-tipo="deco-person-walk"]{animation:plc-glow-verde 2s ease-in-out infinite;}',
    '.plc-activo[data-tipo="deco-worker"]::before,.plc-activo[data-tipo="deco-person-walk"]::before{background:#00e676;box-shadow:0 0 0 2px #00224c,0 0 10px #00c853;animation:plc-blink-dot 1s ease-in-out infinite;}',
    /* vehículos */
    '.plc-activo[data-tipo="deco-forklift"],.plc-activo[data-tipo="deco-truck"],.plc-activo[data-tipo="deco-dump-truck"],.plc-activo[data-tipo="deco-excavator"],.plc-activo[data-tipo="deco-bulldozer"],.plc-activo[data-tipo="deco-wheelbarrow"]{animation:plc-glow-ambar 1.4s ease-in-out infinite;}',
    '.plc-activo[data-tipo="deco-forklift"]::before,.plc-activo[data-tipo="deco-truck"]::before,.plc-activo[data-tipo="deco-dump-truck"]::before,.plc-activo[data-tipo="deco-excavator"]::before,.plc-activo[data-tipo="deco-bulldozer"]::before,.plc-activo[data-tipo="deco-wheelbarrow"]::before{background:#ffca28;box-shadow:0 0 0 2px #3a2800,0 0 10px #f9a825;animation:plc-blink-dot .7s ease-in-out infinite;}',
    /* grúa / elevador */
    '.plc-activo[data-tipo="deco-crane"],.plc-activo[data-tipo="deco-elevator"]{animation:plc-glow-azul 1.8s ease-in-out infinite;}',
    '.plc-activo[data-tipo="deco-crane"]::before,.plc-activo[data-tipo="deco-elevator"]::before{background:#29b6f6;box-shadow:0 0 0 2px #00224c,0 0 10px #0288d1;animation:plc-blink-dot 1.2s ease-in-out infinite;}',
    /* mezcladora / compresor */
    '.plc-activo[data-tipo="deco-cement-mixer"],.plc-activo[data-tipo="deco-compressor"]{animation:plc-glow-verde 1.6s ease-in-out infinite;}',
    '.plc-activo[data-tipo="deco-cement-mixer"]::before,.plc-activo[data-tipo="deco-compressor"]::before{background:#00e676;box-shadow:0 0 0 2px #00224c,0 0 10px #00c853;animation:plc-blink-dot .9s ease-in-out infinite;}',
    /* soldadura deco */
    '.plc-activo[data-tipo="deco-welding"]{animation:plc-glow-blanco .5s ease-in-out infinite;}',
    '.plc-activo[data-tipo="deco-welding"]::before{background:#fff;box-shadow:0 0 0 2px #1a1a14,0 0 12px #f9a825,0 0 20px #fff;animation:plc-blink-dot .4s ease-in-out infinite;}',
    /* peligro / barrera */
    '.plc-activo[data-tipo="deco-electric-hazard"],.plc-activo[data-tipo="deco-road-barrier"],.plc-activo[data-tipo="deco-cone"]{animation:plc-glow-rojo .8s ease-in-out infinite;}',
    '.plc-activo[data-tipo="deco-electric-hazard"]::before,.plc-activo[data-tipo="deco-road-barrier"]::before,.plc-activo[data-tipo="deco-cone"]::before{background:#ef5350;box-shadow:0 0 0 2px #3a0000,0 0 10px #c62828;animation:plc-blink-dot .5s ease-in-out infinite;}',
    /* emergencia */
    '.plc-activo[data-tipo="deco-fire-ext"],.plc-activo[data-tipo="deco-safety-exit"],.plc-activo[data-tipo="deco-first-aid"]{animation:plc-glow-rojo 1s ease-in-out infinite;}',
    '.plc-activo[data-tipo="deco-fire-ext"]::before,.plc-activo[data-tipo="deco-safety-exit"]::before,.plc-activo[data-tipo="deco-first-aid"]::before{background:#ef5350;box-shadow:0 0 0 2px #3a0000,0 0 10px #c62828;animation:plc-blink-dot .6s ease-in-out infinite;}',
    /* EPI */
    '.plc-activo[data-tipo="deco-sign-hard"],.plc-activo[data-tipo="deco-helmet"]{animation:plc-glow-ambar 1.5s ease-in-out infinite;}',
    '.plc-activo[data-tipo="deco-sign-hard"]::before,.plc-activo[data-tipo="deco-helmet"]::before{background:#ffca28;box-shadow:0 0 0 2px #3a2800,0 0 10px #f9a825;animation:plc-blink-dot 1s ease-in-out infinite;}',
    /* cable */
    '.plc-activo[data-tipo="deco-wire-spool"]{animation:plc-glow-cyan 1.2s ease-in-out infinite;}',
    '.plc-activo[data-tipo="deco-wire-spool"]::before{background:#00e5ff;box-shadow:0 0 0 2px #00224c,0 0 10px #0097a7;animation:plc-blink-dot .8s ease-in-out infinite;}'
  ].join('\n') +
  /* ── Multi-PLC: CSS extra para barra de estado multi-conexión ── */
  (typeof mplcGenerarCSS === 'function' && typeof PLCS !== 'undefined' && PLCS.filter(function(p){return p.ip;}).length > 1
    ? '\n' + mplcGenerarCSS()
    : '');

  var _htmlFinalBruto = '<!DOCTYPE html>\n<html lang="es">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=' + RW + ', initial-scale=1.0">\n' +
    '<title>' + escHtml(proyecto) + '</title>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">\n' +
    '<style>\n* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
    'body { background: ' + FONDO_CANVAS + '; width: ' + RW + 'px; height: ' + RH + 'px; overflow: hidden; position: relative; }\n' +
    cssExtra + '\n' +
    cssAnimaciones + '\n' +
    tablaCSS + '\n' +
    '</style>\n</head>\n<body>\n\n' +
    '<div id="plc-status">\n' +
    '  <div id="plc-dot"></div>\n' +
    '  <span id="plc-txt">CONECTANDO...</span>\n' +
    '  <div id="hmi-status-sep"></div>\n' +
    '  <button id="hmi-disconnect-btn" onclick="hmiMostrarDesconectar()" title="Desconectar cliente">⏻</button>\n' +
    '  <div id="hmi-status-sep2" class="hmi-sep"></div>\n' +
    '  <button id="hmi-tabla-btn" onclick="toggleTablaHmi()" title="Tabla de conexiones PLC">🔌</button>\n' +
    '</div>\n' +
    (typeof mplcGenerarStatusBar === 'function' && typeof PLCS !== 'undefined' && PLCS.filter(function(p){return p.ip;}).length > 1 ? mplcGenerarStatusBar() : '') +
    '\n' +
    '<div id="plc-log"></div>\n\n' +
    '<!--\n' +
    '  HMI — ' + escHtml(proyecto) + '\n' +
    '  HMI Editor v5 · paulocarrasco.dev · Watchdog 20s silencioso\n' +
    '-->\n\n' +
    htmlEls +
    tooltipHtml +
    tablaHtml +
    htmlPopups +
    /* ── Modal desconectar ── */
    '<div id="hmi-disc-overlay">\n' +
    '  <div id="hmi-disc-box">\n' +
    '    <div id="hmi-disc-icon">⏻</div>\n' +
    '    <div id="hmi-disc-title">DESCONECTAR CLIENTE</div>\n' +
    '    <div id="hmi-disc-sub">Se cerrará la sesión de este dispositivo.<br>El resto de clientes no se verán afectados.</div>\n' +
    '    <div id="hmi-disc-user" id="hmi-disc-userinfo">—</div>\n' +
    '    <div id="hmi-disc-btns">\n' +
    '      <button class="hmi-disc-btn" onclick="hmiCerrarDesconectar()">CANCELAR</button>\n' +
    '      <button class="hmi-disc-btn peligro" onclick="hmiDesconectar()">DESCONECTAR</button>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</div>\n' +
    '\n<script>\n' + scriptFinal + tooltipJs + tablaJs +
    /* ── JS del botón desconectar ── */
    '\n' +
    'function hmiMostrarDesconectar() {\n' +
    '  var ov = document.getElementById("hmi-disc-overlay");\n' +
    '  var ui = document.getElementById("hmi-disc-userinfo");\n' +
    '  if (ui) ui.textContent = (typeof PLC_USER !== "undefined" ? PLC_USER : "Admin") +\n' +
    '    " · " + window.location.hostname;\n' +
    '  if (ov) { ov.style.display="flex"; requestAnimationFrame(function(){ ov.classList.add("show"); }); }\n' +
    '}\n' +
    'function hmiCerrarDesconectar() {\n' +
    '  var ov = document.getElementById("hmi-disc-overlay");\n' +
    '  if (!ov) return;\n' +
    '  ov.classList.remove("show");\n' +
    '  setTimeout(function(){ ov.style.display="none"; }, 200);\n' +
    '}\n' +
    '/* Cierra la sesión de ESTE cliente: para los polling, descarta el token\n' +
    '   y hace Api.Logout solo de su propio token (seguro para multi-cliente) */\n' +
    'function hmiDesconectar() {\n' +
    '  hmiCerrarDesconectar();\n' +
    '  /* 1. Parar todos los setIntervals de polling */' +
    '  if (typeof _stopPolling === "function") _stopPolling();\n' +
    '  /* Parar también el watchdog marcando reconActivo para que no reintente */\n' +
    '  if (typeof _reconActivo !== "undefined") window._reconActivo = true;\n' +
    '  if (typeof _loginPending !== "undefined") window._loginPending = false;\n' +
    '  /* 2. Poner UI en desconectado */\n' +
    '  if (typeof setPlcStatus === "function") setPlcStatus("error", "DESCONECTADO");\n' +
    '  if (typeof toast === "function") toast("Sesión cerrada");\n' +
    '  /* 3. Hacer Logout del token propio (solo de este cliente, sin afectar otros) */\n' +
    '  var myToken = (typeof plcToken !== "undefined") ? plcToken : null;\n' +
    '  if (typeof plcToken !== "undefined") plcToken = null;\n' +
    '  if (typeof plcOnline !== "undefined") plcOnline = false;\n' +
    '  var url = (typeof PLC_URL !== "undefined") ? PLC_URL : "/api/jsonrpc";\n' +
    '  if (myToken) {\n' +
    '    var ctrl = new AbortController();\n' +
    '    setTimeout(function(){ ctrl.abort(); }, 3000);\n' +
    '    fetch(url, {\n' +
    '      method:"POST",\n' +
    '      headers:{"Content-Type":"application/json","X-Auth-Token":myToken},\n' +
    '      signal:ctrl.signal,\n' +
    '      body:JSON.stringify({jsonrpc:"2.0",method:"Api.Logout",id:99,params:{}})\n' +
    '    }).catch(function(){}); /* ignorar errores — sesión ya desconectada localmente */\n' +
    '  }\n' +
    '  /* 4. Congelar el HMI visualmente */\n' +
    '  var btn = document.getElementById("hmi-disconnect-btn");\n' +
    '  if (btn) { btn.textContent = "○"; btn.style.color="#c62828"; btn.onclick=null; btn.title="Sin sesión"; }\n' +
    '  var dot = document.getElementById("plc-dot");\n' +
    '  if (dot) dot.className = "error";\n' +
    '}\n' +
    '/* Cerrar el modal con Escape */\n' +
    'document.addEventListener("keydown", function(e){\n' +
    '  if (e.key==="Escape") hmiCerrarDesconectar();\n' +
    '});\n' +
    '/* Cerrar al clicar fuera del box */\n' +
    'document.getElementById("hmi-disc-overlay").addEventListener("click", function(e){\n' +
    '  if (e.target === this) hmiCerrarDesconectar();\n' +
    '});\n' +
    '\n<\/script>\n</body>\n</html>';

  /* ══════════════════════════════════════════════════════
     POST-PROCESO: insertar fragmentos AWP cada 50 líneas
     Parte2 en línea 50, Parte3 en línea 100, etc.
     IMPORTANTE: no insertar fragmentos dentro de <script> ni <style>
  ══════════════════════════════════════════════════════ */
  var _awpLines    = _htmlFinalBruto.split('\n');
  var _awpResult   = [];
  var _awpParte    = 2;
  var _awpContador = 0;   /* solo cuenta líneas FUERA de script/style */
  var _awpEnScript = false;
  for (var _awpI = 0; _awpI < _awpLines.length; _awpI++) {
    var _awpLinea = _awpLines[_awpI];
    /* detectar entrada/salida de bloque script o style */
    if (/<script[\s>]/i.test(_awpLinea))  _awpEnScript = true;
    if (/<\/script>/i.test(_awpLinea))    _awpEnScript = false;
    if (/<style[\s>]/i.test(_awpLinea))   _awpEnScript = true;
    if (/<\/style>/i.test(_awpLinea))     _awpEnScript = false;
    /* solo insertar AWP fuera de script/style */
    if (!_awpEnScript) {
      _awpContador++;
      if (_awpContador > 1 && (_awpContador - 1) % 50 === 0) {
        _awpResult.push("<!-- AWP_Start_Fragment Name='Parte" + _awpParte + "' -->");
        _awpParte++;
      }
    }
    _awpResult.push(_awpLinea);
  }
  return _awpResult.join('\n');
}
