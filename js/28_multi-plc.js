/* =================================================================
   28_multi-plc.js — v3
   Genera el bloque de conexión multi-PLC para el HTML exportado.
   Fixes v3:
   · Sin include_web_application_cookie (causa límite de sesiones web)
   · Sin credentials:"include" (evita gestión de cookies S7)
   · Cooldown 3s en _loopRecon (evita cascadas de reconexión)
   · Watchdog requiere 2 fallos seguidos antes de reconectar
================================================================= */

function _mplcGenerarConector(plcObj, connVar) {
  var ip   = plcObj.ip   || 'TU_IP_PLC';
  var user = plcObj.user || 'Admin';
  var pass = plcObj.pass || '';
  var lbl  = (plcObj.label || 'PLC').replace(/"/g, '');

  return [
    '/* ── Conector: ' + lbl + ' (' + ip + ') ── */',
    'var ' + connVar + ' = (function(){',
    '  var _url   = (window.location.hostname === "' + ip + '")',
    '             ? "/api/jsonrpc"',
    '             : "https://' + ip + '/api/jsonrpc";',
    '  var _user  = "' + user + '";',
    '  var _pass  = "' + pass + '";',
    '  var _lbl   = "' + lbl + '";',
    '  var token      = null;',
    '  var online     = false;',
    '  var reconAct   = false;',
    '  var lastReconTs= 0;',
    '  var wdFails    = 0;',
    '  var loginPend  = false;',
    '  var loginQueue = [];',
    '  var wQueue     = [];',
    '  var pollIds    = [];',
    '  var pollAct    = false;',
    '',
    '  function _rpc(body, cb, noRetry) {',
    '    var h = {"Content-Type":"application/json"};',
    '    if (token) h["X-Auth-Token"] = token;',
    '    var ctrl = new AbortController();',
    '    var tid  = setTimeout(function(){ ctrl.abort(); }, 3500);',
    '    fetch(_url, { method:"POST", headers:h,',
    '      signal:ctrl.signal, body:JSON.stringify(body) })',
    '    .then(function(r){ clearTimeout(tid); return r.text(); })',
    '    .then(function(txt){',
    '      if (!txt||!txt.trim()){ cb(null,{result:true}); return; }',
    '      try {',
    '        var d = JSON.parse(txt);',
    '        if (!noRetry && d.error &&',
    '           (d.error.code===-32099||d.error.code===-32601||d.error.message==="No Permission")){',
    '          token = null;',
    '          _doLogin(function(ok){ if(ok) _rpc(body,cb,true); else cb(new Error("auth"),null); });',
    '          return;',
    '        }',
    '        cb(null, d);',
    '      } catch(e){ cb(e,null); }',
    '    })',
    '    .catch(function(e){ clearTimeout(tid); cb(e,null); });',
    '  }',
    '',
    '  function _doLogin(cb) {',
    '    if (loginPend) { loginQueue.push(cb); return; }',
    '    loginPend = true;',
    '    var ctrl = new AbortController();',
    '    var tid  = setTimeout(function(){ ctrl.abort(); }, 5000);',
    '    fetch(_url, { method:"POST",',
    '      headers:{"Content-Type":"application/json"},',
    '      signal:ctrl.signal,',
    '      body:JSON.stringify({jsonrpc:"2.0",method:"Api.Login",id:1,',
    '        params:{user:_user,password:_pass}}) })',
    '    .then(function(r){ clearTimeout(tid); return r.text(); })',
    '    .then(function(txt){',
    '      var ok=false;',
    '      try {',
    '        var d = JSON.parse(txt);',
    '        if (d.result && d.result.token) {',
    '          token=d.result.token; online=true; _updateDot(true); ok=true;',
    '        } else {',
    '          token=null; online=true; _updateDot(true); ok=true; /* anon */'
    + ',\n',
    '        }',
    '      } catch(e){ online=false; _updateDot(false); }',
    '      loginPend=false;',
    '      var q=loginQueue.splice(0);',
    '      if(cb) cb(ok);',
    '      q.forEach(function(fn){ fn(ok); });',
    '    })',
    '    .catch(function(){',
    '      clearTimeout(tid); online=false; _updateDot(false);',
    '      loginPend=false;',
    '      var q=loginQueue.splice(0);',
    '      if(cb) cb(false);',
    '      q.forEach(function(fn){ fn(false); });',
    '    });',
    '  }',
    '',
    '  function _stopPolling() {',
    '    pollIds.forEach(function(id){ clearInterval(id); });',
    '    pollIds=[]; pollAct=false;',
    '  }',
    '',
    '  function _loopRecon() {',
    '    if (reconAct) return;',
    '    var _now = Date.now();',
    '    if (_now - lastReconTs < 3000) {',
    '      setTimeout(_loopRecon, 3000-(_now-lastReconTs)); return;',
    '    }',
    '    lastReconTs=_now;',
    '    reconAct=true; online=false; token=null; _stopPolling(); _updateDot(null);',
    '    var _int=0;',
    '    (function intentar(){',
    '      _int++;',
    '      _doLogin(function(ok){',
    '        if (ok) {',
    '          reconAct=false;',
    '          var q=wQueue.splice(0);',
    '          q.forEach(function(it){ pub.escribir(it.v,it.val); });',
    '          if(typeof pub.startPolling==="function") pub.startPolling();',
    '        } else {',
    '          var delay = Math.min(300*Math.pow(2,Math.min(_int-1,4)),4000);',
    '          delay = delay*(0.8+Math.random()*0.4);',
    '          setTimeout(intentar, delay);',
    '        }',
    '      });',
    '    })();',
    '  }',
    '',
    '  function _updateDot(ok) {',
    '    var dot=document.getElementById("plc-dot-' + connVar + '");',
    '    var lbl=document.getElementById("plc-txt-' + connVar + '");',
    '    if(dot) dot.className=ok===true?"plc-conn-dot ok":ok===false?"plc-conn-dot error":"plc-conn-dot retry";',
    '    var _who = token ? _user : "An\u00f3nimo";',
    '    if(lbl) lbl.textContent=ok===true?(_who+" \u00b7 "+_lbl):ok===false?"SIN CONEXION":"RECONECTANDO...";',
    '  }',
    '',
    '  var _wdInt = 7000 + Math.floor(Math.random()*6000);',
    '  setInterval(function(){',
    '    if(reconAct||loginPend) return;',
    '    if(reconAct||loginPend) return;',
    '    if(!online && !token){ _loopRecon(); return; }',
    '    var ctrl=new AbortController(); var tid=setTimeout(function(){ctrl.abort();},3000);',
    '    var _wdh={"Content-Type":"application/json"};',
    '    if(token) _wdh["X-Auth-Token"]=token;',
    '    fetch(_url,{method:"POST",',
    '      headers:_wdh,',
    '      signal:ctrl.signal,',
    '      body:JSON.stringify({jsonrpc:"2.0",method:"Api.GetPermissions",id:99,params:{}})})',
    '    .then(function(r){clearTimeout(tid);return r.text();})',
    '    .then(function(txt){',
    '      try{',
    '        var d=JSON.parse(txt);',
    '        if(!d.error){',
    '          wdFails=0;',
    '          if(!online){online=true;_updateDot(true);',
    '            if(typeof pub.startPolling==="function") pub.startPolling();}',
    '        } else {',
    '          wdFails++;',
    '          if(wdFails>=2){ wdFails=0; if(token) token=null; _loopRecon(); }',
    '        }',
    '      }catch(e){ wdFails++; if(wdFails>=2){ wdFails=0; _loopRecon(); } }',
    '    })',
    '    .catch(function(){',
    '      clearTimeout(tid);',
    '      wdFails++;',
    '      if(wdFails>=2){ wdFails=0; _loopRecon(); }',
    '    });',
    '  }, _wdInt);',
    '',
    '  var pub = {',
    '    label: _lbl,',
    '    leer: function(variable, cb) {',
    '      _rpc({jsonrpc:"2.0",method:"PlcProgram.Read",id:1,params:{var:variable,mode:"simple"}},',
    '        function(err,d){ if(!err&&d&&d.result!==undefined&&cb) cb(d.result); });',
    '    },',
    '    escribir: function(variable, valor, cb) {',
    '      if(!online){ wQueue.push({v:variable,val:valor}); return; }',
    '      _rpc({jsonrpc:"2.0",method:"PlcProgram.Write",id:1,params:{var:variable,value:valor}},',
    '        function(err,d){',
    '          var ok=!err&&d&&!d.error;',
    '          if(!ok) wQueue.push({v:variable,val:valor});',
    '          if(cb) cb(ok?null:(err||new Error((d&&d.error)?d.error.message:"write error")));',
    '        });',
    '    },',
    '    startPolling: null,',
    '    login: function(cb) {',
    '      var j = Math.floor(Math.random()*50);',
    '      setTimeout(function(){',
    '        _doLogin(function(ok){',
    '          if(ok){ if(cb) cb(); }',
    '          else  { setTimeout(function(){ pub.login(cb); }, 1000+Math.random()*500); }',
    '        });',
    '      }, j);',
    '    }',
    '  };',
    '  return pub;',
    '})();',
    ''
  ].join('\n');
}

function mplcGenerarBloqueConectores() {
  if (PLCS.length <= 1) return '';

  var bloques = [];
  PLCS.forEach(function(p, i) {
    if (!p.ip) return;
    bloques.push(_mplcGenerarConector(p, 'plcConn' + i));
  });

  bloques.push(
    '/* ── Wrappers globales enrutados por plcIdx ── */',
    'var _plcConns = [' + PLCS.map(function(p,i){ return p.ip ? 'plcConn'+i : 'null'; }).join(',') + '];',
    '',
    'function plcLeer(variable, cb, plcIdx) {',
    '  var c = _plcConns[plcIdx||0] || _plcConns[0];',
    '  if (c) c.leer(variable, cb);',
    '}',
    '',
    'function plcEscribir(variable, valor, cb, plcIdx) {',
    '  var c = _plcConns[plcIdx||0] || _plcConns[0];',
    '  if (c) c.escribir(variable, valor, cb);',
    '}',
    '',
    'function btnAccion(fn) {',
    '  if (window._btnCooldown) { toast("\u23f3 Espera un momento..."); return; }',
    '  window._btnCooldown = true;',
    '  setTimeout(function(){ window._btnCooldown = false; }, 1000);',
    '  fn();',
    '}',
    '',
    'function plcLogin(cb) { if (cb) cb(); }',
    '',
    PLCS.map(function(p,i){
      if (!p.ip) return '';
      return 'plcConn' + i + '.login(function(){\n' +
             '  plcConn' + i + '.startPolling = function(){\n' +
             '    if(typeof startPolling==="function") startPolling();\n' +
             '  };\n' +
             '  if(typeof startPolling==="function") startPolling();\n' +
             '});';
    }).filter(Boolean).join('\n'),
    ''
  );

  return bloques.join('\n');
}

function mplcGenerarStatusBar() {
  if (PLCS.length <= 1) return '';
  var activos = PLCS.filter(function(p){ return p.ip; });
  if (!activos.length) return '';

  var dots = activos.map(function(p) {
    var i = PLCS.indexOf(p);
    return '<div class="plc-conn-entry" title="' + escHtml(p.label) + '">' +
      '<div id="plc-dot-plcConn' + i + '" class="plc-conn-dot retry"></div>' +
      '<span id="plc-txt-plcConn' + i + '" class="plc-conn-lbl">CONECTANDO...</span>' +
    '</div>';
  }).join('<div class="plc-conn-sep"></div>');

  return '<div id="plc-status-multi">' + dots + '</div>\n';
}

function mplcGenerarCSS() {
  if (PLCS.length <= 1) return '';
  return [
    '#plc-status-multi{position:fixed;top:10px;right:14px;display:flex;align-items:center;gap:6px;',
    'padding:4px 10px;background:rgba(255,255,255,.92);border:1px solid #dcdcd6;',
    'border-radius:4px;font-family:"DM Mono",monospace;font-size:10px;',
    'letter-spacing:1px;color:#6a6a62;z-index:999;backdrop-filter:blur(4px);',
    'box-shadow:0 2px 8px rgba(0,0,0,.08);}',
    '.plc-conn-entry{display:flex;align-items:center;gap:5px;}',
    '.plc-conn-sep{width:1px;height:16px;background:#dcdcd6;flex-shrink:0;}',
    '.plc-conn-dot{width:6px;height:6px;border-radius:50%;background:#b0b0a8;transition:all .3s;flex-shrink:0;}',
    '.plc-conn-dot.ok{background:#2e7d32;box-shadow:0 0 6px rgba(46,125,50,.5);}',
    '.plc-conn-dot.error{background:#c62828;box-shadow:0 0 6px rgba(198,40,40,.5);animation:blink .5s step-end infinite;}',
    '.plc-conn-dot.retry{background:#f57c00;box-shadow:0 0 6px rgba(245,124,0,.5);}',
    '.plc-conn-lbl{white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;}'
  ].join('\n');
}
