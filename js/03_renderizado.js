/* =================================================================
   RENDERIZADO
================================================================= */
function renderizarElemento(el) {
  var viejo = document.getElementById(el.id);
  if (viejo) viejo.remove();

  var div = document.createElement('div');
  var estaSeleccionado = SELECCION.includes(el.id);
  var esMulti = SELECCION.length > 1 && estaSeleccionado;

  div.className = 'hel' +
    (SELECCION.length === 1 && estaSeleccionado ? ' sel' : '') +
    (esMulti ? ' msel' : '');
  div.id = el.id;
  div.dataset.tipo = el.tipo;
  /* Marca elementos deco/construccion para mostrar luz indicadora */
  var TIPOS_CON_LUZ = [
    /* deco construcción */
    'deco-worker','deco-person-walk','deco-forklift','deco-truck','deco-dump-truck',
    'deco-crane','deco-elevator','deco-excavator','deco-bulldozer','deco-wheelbarrow',
    'deco-cement-mixer','deco-compressor','deco-welding','deco-electric-hazard',
    'deco-road-barrier','deco-cone','deco-fire-ext','deco-safety-exit','deco-first-aid',
    'deco-sign-hard','deco-helmet','deco-wire-spool','deco-conveyor',
    /* auto */
    'auto-wheel','auto-tyre','auto-robot-arm','auto-spot-weld','auto-paint-gun',
    'auto-press-machine','auto-vin-scanner','auto-agv','auto-exhaust','auto-brake-disc',
    'auto-car-side','auto-car-top','auto-engine','auto-gearbox','auto-suspension',
    'auto-abs-module','auto-caliper','auto-battery-ev','auto-paint-gun','auto-car-body',
    'auto-dashboard','auto-robot-arm',
    /* fab */
    'fab-robot-industrial','fab-cnc-machine','fab-lathe','fab-drill-press',
    'fab-hydraulic-press','fab-welding-station','fab-paint-booth','fab-oven-industrial',
    'fab-cooling-tower','fab-boiler','fab-compressor-ind','fab-generator',
    'fab-transformer','fab-switchboard','fab-plc-cabinet','fab-hmi-panel',
    'fab-safety-fence','fab-agv-station','fab-quality-station','fab-packaging',
    'fab-palletizer','fab-scara-robot','fab-delta-robot','fab-cobot',
    'fab-vision-system','fab-laser-cutter','fab-3d-printer','fab-injection-mold',
    'fab-extruder','fab-winding-machine',
    /* P&ID */
    'motor-symbol','pump-symbol',
    /* sensores */
    'sensor-prox','sensor-balancin','sensor-foto','sensor-encoder','sensor-flow',
    'sensor-pressure','sensor-temp','sensor-ultra','sensor-rfid','sensor-vfd'
  ];
  if (TIPOS_CON_LUZ.indexOf(el.tipo) !== -1) div.dataset.catAnim = 'luz';
  var rot = (el.props && el.props.rotation) ? el.props.rotation : 0;
  div.style.cssText = 'left:' + el.x + 'px;top:' + el.y + 'px;width:' + el.w + 'px;height:' + el.h + 'px;' +
    (rot ? 'transform:rotate(' + rot + 'deg);transform-origin:center center;' : '');
  /* Restaurar estado animación PLC simulada si existe */
  if (PLC_SIM_ESTADOS[el.id]) { div.classList.add('plc-activo'); }
  /* Restaurar visibilidad condicional si está configurada */
  var _vm = (el.props || {}).visMode || 'always';
  if (_vm !== 'always') {
    var _activo = !!PLC_SIM_ESTADOS[el.id];
    if (_vm === 'on')  div.style.opacity = _activo ? '1' : '0.08';
    if (_vm === 'off') div.style.opacity = _activo ? '0.08' : '1';
  }

  div.innerHTML = htmlInterior(el) +
    '<div class="rh"></div>' +
    '<div class="rrot" data-id="' + el.id + '" title="Rotar">↻</div>' +
    '<div class="edel" data-id="' + el.id + '">x</div>';

  div.addEventListener('mousedown', function(ev) {
    if (ev.target.classList.contains('edel')) return;
    if (ev.target.classList.contains('rh')) { iniciarRedimension(ev, el.id); return; }
    if (ev.target.classList.contains('rrot')) { iniciarRotacion(ev, el.id); return; }
    if (ev.target.classList.contains('himg-upload-lbl')) return;
    if (ev.shiftKey) { alternarSeleccion(el.id); return; }
    if (!SELECCION.includes(el.id)) establecerSeleccion([el.id]);
    iniciarMovimiento(ev);
  });

  document.getElementById('cstage').appendChild(div);

  div.querySelector('.edel').addEventListener('click', function() {
    eliminarPorId(this.dataset.id);
  });

  var lbl = div.querySelector('.himg-upload-lbl');
  if (lbl) {
    lbl.addEventListener('click', function(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      ID_IMG_ACTIVO = el.id;
      setTimeout(function() {
        var inp = document.getElementById('inp-imagen-panel');
        inp.value = '';
        inp.click();
      }, 0);
    });
  }
}

