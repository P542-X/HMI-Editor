/* =================================================================
   TABLA DE CONEXIONES PLC  — con paginación
================================================================= */

var TABLA_PLC_MODO   = 'ver';
var TABLA_PLC_PAGINA = 1;
var TABLA_PLC_POR_PAG = 12;   /* filas por página */

/* ── Claves de variable PLC ─────────────────────────────────── */
var _TPLC_VAR_KEYS = [
  {key:'var1',    label:'Variable PLC'}, {key:'varLed',  label:'LED'    },
  {key:'varRun',  label:'RUN'         }, {key:'varFault',label:'FAULT'  },
  {key:'varOpen', label:'OPEN'        }, {key:'varClosed',label:'CLOSED'},
  {key:'varUp',   label:'ARRIBA'      }, {key:'varDown', label:'ABAJO'  },
  {key:'varLeft', label:'IZQ'         }, {key:'varRight',label:'DER'    },
  {key:'varSet',  label:'SET'         }, {key:'varReset',label:'RESET'  },
  {key:'varAlarm',label:'ALARMA'      }, {key:'varAck',  label:'ACK'    },
  {key:'arrayVar',label:'ARRAY'       }, {key:'varPV',   label:'PV'     },
  {key:'varSP',   label:'SP'          }, {key:'varOut',  label:'OUT'    },
  {key:'varX',    label:'POS X'       }, {key:'varY',    label:'POS Y'  },
  {key:'visVar',  label:'VISIB.'      }, {key:'animVar', label:'ANIM.'  },
];
(function(){
  for(var ai=1;ai<=8;ai++) _TPLC_VAR_KEYS.push({key:'avar'+ai,label:'ALARM '+ai});
  for(var di=1;di<=6;di++) _TPLC_VAR_KEYS.push({key:'dvar'+di,label:'DATO '+di});
})();

function _tplcExtraerVars(el) {
  var p=el.props||{}, vars=[];
  _TPLC_VAR_KEYS.forEach(function(vk){
    var v=p[vk.key];
    if(v&&String(v).trim()) vars.push({label:vk.label,valor:String(v).trim()});
  });
  if(p.pollMs)      vars.push({label:'Poll',       valor:p.pollMs+'ms',    info:true});
  if(p.animPollMs)  vars.push({label:'Poll anim.', valor:p.animPollMs+'ms',info:true});
  if(p.animTrigger) vars.push({label:'Activa con', valor:p.animTrigger,    info:true});
  if(p.triggerVal)  vars.push({label:'Activa con', valor:p.triggerVal,     info:true});
  return vars;
}

/* ── Abrir modal ────────────────────────────────────────────── */
function abrirTablaPLC() {
  TABLA_PLC_MODO='ver'; TABLA_PLC_PAGINA=1;
  _tplcActualizarModoBtns();
  construirTablaPLC();
  abrirModal('modal-tabla-plc');
}

function _tplcActualizarModoBtns() {
  var bv=document.getElementById('tplc-btn-ver'),bc=document.getElementById('tplc-btn-conf');
  if(bv){bv.classList.toggle('activo',TABLA_PLC_MODO==='ver');}
  if(bc){bc.classList.toggle('activo',TABLA_PLC_MODO==='configurar');}
}

function tplcSetModo(modo) {
  TABLA_PLC_MODO=modo; TABLA_PLC_PAGINA=1;
  _tplcActualizarModoBtns();
  var confBtns=document.getElementById('tplc-conf-btns'),desc=document.getElementById('tplc-desc');
  if(confBtns) confBtns.style.display=modo==='configurar'?'flex':'none';
  if(desc) desc.textContent=modo==='configurar'
    ?'☑ Marca los elementos que quieres que aparezcan en la tabla exportada'
    :'Variables PLC de los elementos incluidos — clic en el valor para copiar';
  construirTablaPLC();
}

/* ── Obtener filas filtradas ────────────────────────────────── */
function _tplcGetFilas() {
  var filtro=(document.getElementById('tplc-filtro')||{}).value||'';
  var resultado=[];
  var fuente=TABLA_PLC_MODO==='configurar' ? ELEMENTOS : ELEMENTOS.filter(function(el){
    return !(el.props&&el.props._tablaVisible===false);
  });
  fuente.forEach(function(el){
    var p=el.props||{};
    var vars=_tplcExtraerVars(el).filter(function(v){return !v.info;});
    var txt=(el.id+' '+el.tipo+' '+vars.map(function(v){return v.valor;}).join(' ')).toLowerCase();
    if(filtro&&txt.indexOf(filtro.toLowerCase())===-1) return;
    resultado.push(el);
  });
  return resultado;
}

/* ── Construir tabla ────────────────────────────────────────── */
function construirTablaPLC() {
  var tbody=document.getElementById('tplc-body');
  var thead=document.getElementById('tplc-thead');
  var count=document.getElementById('tplc-count');
  if(!tbody) return;

  var todos=_tplcGetFilas();
  var totalPags=Math.max(1,Math.ceil(todos.length/TABLA_PLC_POR_PAG));
  if(TABLA_PLC_PAGINA>totalPags) TABLA_PLC_PAGINA=totalPags;
  var inicio=(TABLA_PLC_PAGINA-1)*TABLA_PLC_POR_PAG;
  var pagina=todos.slice(inicio,inicio+TABLA_PLC_POR_PAG);

  /* Contador */
  if(count){
    if(TABLA_PLC_MODO==='configurar'){
      var nInc=ELEMENTOS.filter(function(el){return el.props&&el.props._tablaVisible!==false;}).length;
      count.textContent=nInc+' incluidos de '+ELEMENTOS.length;
    } else {
      count.textContent=todos.length+' elemento'+(todos.length!==1?'s':'');
    }
  }

  /* Thead */
  if(thead){
    if(TABLA_PLC_MODO==='configurar'){
      thead.innerHTML='<tr style="position:sticky;top:0;z-index:2;background:var(--topbar)">'+
        '<th class="tplc-th" style="width:36px">INCL.</th>'+
        '<th class="tplc-th" style="text-align:left">ELEMENTO</th>'+
        '<th class="tplc-th" style="text-align:left">TIPO</th>'+
        '<th class="tplc-th" style="text-align:left">VARIABLES PLC</th>'+
      '</tr>';
    } else {
      thead.innerHTML='<tr style="position:sticky;top:0;z-index:2;background:var(--topbar)">'+
        '<th class="tplc-th" style="text-align:left">ELEMENTO</th>'+
        '<th class="tplc-th" style="text-align:left">TIPO</th>'+
        '<th class="tplc-th" style="text-align:left">VARIABLES PLC</th>'+
        '<th class="tplc-th" style="width:36px"></th>'+
      '</tr>';
    }
  }

  /* Filas */
  var filas='';
  pagina.forEach(function(el){
    var p=el.props||{};
    var vars=_tplcExtraerVars(el);
    var plcVars=vars.filter(function(v){return !v.info;});
    var infoVars=vars.filter(function(v){return v.info;});

    if(TABLA_PLC_MODO==='configurar'){
      var incluido=p._tablaVisible!==false;
      var resumen=plcVars.length
        ?plcVars.slice(0,3).map(function(v){return '<span class="tplc-pill">'+escHtml(v.valor)+'</span>';}).join('')
         +(plcVars.length>3?'<span class="tplc-pill tplc-pill-more">+' +(plcVars.length-3)+'</span>':'')
        :'<span style="color:var(--mid);font-size:8px">—</span>';
      filas+='<tr class="tplc-row'+(incluido?'':' tplc-row-off')+'" id="tplcrow-'+el.id+'">'+
        '<td class="tplc-td tplc-td-check"><input type="checkbox" class="tplc-cb" data-id="'+el.id+'" '+(incluido?'checked':'')+' onchange="tplcToggleIncluido(this)"></td>'+
        '<td class="tplc-td tplc-td-id" onclick="seleccionarDesdeTablaPLC(\''+el.id+'\')" title="Ir al elemento"><div class="tplc-id">'+escHtml(el.id)+'</div></td>'+
        '<td class="tplc-td"><div class="tplc-tipo">'+escHtml(el.tipo)+'</div></td>'+
        '<td class="tplc-td tplc-td-vars">'+resumen+'</td>'+
      '</tr>';
    } else {
      var varsCelda=plcVars.length===0
        ?'<span style="color:var(--mid);font-size:8px;letter-spacing:1px">— SIN VARIABLE —</span>'
        :plcVars.map(function(v){
            return '<div class="tplc-var-row"><span class="tplc-var-label">'+escHtml(v.label)+'</span>'+
              '<span class="tplc-var-val" onclick="copiarTablaPLC(this)" title="Clic para copiar">'+escHtml(v.valor)+'</span></div>';
          }).join('')+
          infoVars.map(function(v){
            return '<div class="tplc-var-row"><span class="tplc-var-label tplc-var-label-info">'+escHtml(v.label)+'</span>'+
              '<span class="tplc-var-val tplc-var-val-info">'+escHtml(v.valor)+'</span></div>';
          }).join('');
      filas+='<tr class="tplc-row" id="tplcrow-'+el.id+'">'+
        '<td class="tplc-td tplc-td-id"><div class="tplc-id">'+escHtml(el.id)+'</div><div class="tplc-tipo">'+escHtml(el.tipo)+'</div></td>'+
        '<td class="tplc-td"><div class="tplc-tipo" style="letter-spacing:.5px;font-size:9px">'+escHtml(el.tipo)+'</div></td>'+
        '<td class="tplc-td tplc-td-vars">'+varsCelda+'</td>'+
        '<td class="tplc-td tplc-td-acc"><button class="tplc-btn-sel" onclick="seleccionarDesdeTablaPLC(\''+el.id+'\')" title="Ir al elemento">⊙</button></td>'+
      '</tr>';
    }
  });

  if(filas===''){
    var cols=TABLA_PLC_MODO==='configurar'?4:4;
    filas='<tr><td colspan="'+cols+'" style="padding:28px;text-align:center;color:var(--mid);font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px">'+
      (TABLA_PLC_MODO==='ver'?'No hay elementos incluidos.<br><br>Usa el modo <b>CONFIGURAR</b> para añadir elementos.':'SIN ELEMENTOS QUE MOSTRAR')+
    '</td></tr>';
  }
  tbody.innerHTML=filas;

  /* Paginación */
  _tplcRenderPaginacion(totalPags,todos.length);
}

/* ── Paginación ─────────────────────────────────────────────── */
function _tplcRenderPaginacion(totalPags, total) {
  var nav=document.getElementById('tplc-pagination');
  if(!nav) return;
  if(totalPags<=1){nav.innerHTML='';return;}
  var inicio=(TABLA_PLC_PAGINA-1)*TABLA_PLC_POR_PAG+1;
  var fin=Math.min(TABLA_PLC_PAGINA*TABLA_PLC_POR_PAG,total);
  var html='<div class="tplc-pag-info">'+inicio+'–'+fin+' de '+total+'</div>';
  html+='<div class="tplc-pag-btns">';
  html+='<button class="tplc-pag-btn" onclick="tplcIrPag(1)" '+(TABLA_PLC_PAGINA===1?'disabled':'')+' title="Primera">«</button>';
  html+='<button class="tplc-pag-btn" onclick="tplcIrPag('+(TABLA_PLC_PAGINA-1)+')" '+(TABLA_PLC_PAGINA===1?'disabled':'')+' title="Anterior">‹</button>';
  /* Páginas numeradas — máx 5 visibles */
  var rango=[];
  var desde=Math.max(1,TABLA_PLC_PAGINA-2);
  var hasta=Math.min(totalPags,desde+4);
  if(hasta-desde<4) desde=Math.max(1,hasta-4);
  for(var p=desde;p<=hasta;p++) rango.push(p);
  rango.forEach(function(p){
    html+='<button class="tplc-pag-btn'+(p===TABLA_PLC_PAGINA?' activo':'')+'" onclick="tplcIrPag('+p+')">'+p+'</button>';
  });
  html+='<button class="tplc-pag-btn" onclick="tplcIrPag('+(TABLA_PLC_PAGINA+1)+')" '+(TABLA_PLC_PAGINA===totalPags?'disabled':'')+' title="Siguiente">›</button>';
  html+='<button class="tplc-pag-btn" onclick="tplcIrPag('+totalPags+')" '+(TABLA_PLC_PAGINA===totalPags?'disabled':'')+' title="Última">»</button>';
  html+='</div>';
  nav.innerHTML=html;
}

function tplcIrPag(p) {
  TABLA_PLC_PAGINA=p;
  construirTablaPLC();
  /* Scroll al top de la tabla */
  var body=document.getElementById('tplc-body');
  if(body) body.parentElement.scrollTop=0;
}

/* ── Acciones ───────────────────────────────────────────────── */
function tplcToggleIncluido(cb) {
  var el=ELEMENTOS.find(function(e){return e.id===cb.dataset.id;});
  if(!el) return;
  if(!el.props) el.props={};
  el.props._tablaVisible=cb.checked;
  var fila=document.getElementById('tplcrow-'+cb.dataset.id);
  if(fila) fila.classList.toggle('tplc-row-off',!cb.checked);
  MODIFICADO=true;
  var count=document.getElementById('tplc-count');
  if(count){
    var n=ELEMENTOS.filter(function(e){return e.props&&e.props._tablaVisible!==false;}).length;
    count.textContent=n+' incluidos de '+ELEMENTOS.length;
  }
}

function tplcSelTodo(val) {
  ELEMENTOS.forEach(function(el){if(!el.props)el.props={};el.props._tablaVisible=val;});
  MODIFICADO=true; TABLA_PLC_PAGINA=1; construirTablaPLC();
}

function seleccionarDesdeTablaPLC(id) {
  cerrarModal('modal-tabla-plc');
  establecerSeleccion([id]);
  var div=document.getElementById(id);
  if(div) div.scrollIntoView({behavior:'smooth',block:'center'});
}

function copiarTablaPLC(el) {
  var txt=el.textContent;
  if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){mostrarToast('📋 Copiado: '+txt);});
  el.classList.add('tplc-copiado');
  setTimeout(function(){el.classList.remove('tplc-copiado');},600);
}

function filtrarTablaPLC(){TABLA_PLC_PAGINA=1;construirTablaPLC();}

function exportarTablaPLCcsv(){
  var lines=['ID;TIPO;VARIABLE_ETIQUETA;VALOR_PLC'];
  ELEMENTOS.forEach(function(el){
    var p=el.props||{};
    if(p._tablaVisible===false) return;
    var vars=_tplcExtraerVars(el).filter(function(v){return !v.info;});
    if(vars.length===0){lines.push([el.id,el.tipo,'—','—'].join(';'));}
    else vars.forEach(function(v){lines.push([el.id,el.tipo,v.label,'"'+v.valor+'"'].join(';'));});
  });
  var blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='conexiones_plc.csv';a.click();URL.revokeObjectURL(url);
  mostrarToast('📥 CSV exportado');
}
