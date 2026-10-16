/* =================================================================
   DEMO PÚBLICA (paulocarrasco.dev)
   · Carga una pantalla de ejemplo para que el canvas no arranque vacío
   · Muestra un aviso de bienvenida (es / en) explicando qué se puede probar
================================================================= */

/* ── Pantalla de ejemplo: estación de bombeo 800×480 ── */
var DEMO_VAR = function(n) { return '"DB_Planta".' + n; };

var DEMO_PANTALLA = [
  /* tipo, x, y, ancho, alto, props propias (se mezclan con PROPS_DEFAULT) */
  ['title-banner', 8, 8, 568, 48, { text: 'ESTACIÓN DE BOMBEO · E1', subtext: 'Planta de demostración · Turno mañana', icon: '⚙', badge: 'DEMO' }],
  ['nav-button', 584, 8, 208, 48, { text: 'TENDENCIAS', icon: '→', target: 'tendencias.html' }],
  ['frame-box', 8, 64, 488, 272, { title: 'PROCESO' }],
  ['level-tank', 24, 92, 96, 228, { label: 'DEPÓSITO', var1: DEMO_VAR('Nivel') }],
  ['pipe-h', 120, 234, 64, 48, { showFlow: true }],
  ['pump-symbol', 184, 208, 80, 100, { label: 'P1', varRun: DEMO_VAR('P1_Marcha'), varFault: DEMO_VAR('P1_Fallo') }],
  ['pipe-h', 264, 234, 56, 48, { showFlow: true }],
  ['valve-symbol', 320, 218, 80, 80, { label: 'V1', varOpen: DEMO_VAR('V1_Abierta'), varClosed: DEMO_VAR('V1_Cerrada') }],
  ['pipe-h', 400, 234, 88, 48, { showFlow: true }],
  ['display', 144, 92, 176, 64, { label: 'CAUDAL m³/h', var1: DEMO_VAR('Caudal'), previewVal: '42.6' }],
  ['manual-auto-switch', 336, 92, 144, 56, { varMode: DEMO_VAR('Modo_Auto') }],
  ['gauge', 504, 64, 144, 144, { label: 'PRESIÓN', var1: DEMO_VAR('Presion') }],
  ['display', 656, 64, 136, 68, { label: 'TEMP. °C', var1: DEMO_VAR('Temp'), previewVal: '38.5' }],
  ['display', 656, 140, 136, 68, { label: 'HORAS P1', var1: DEMO_VAR('P1_Horas'), previewVal: '1284' }],
  ['trend-chart', 504, 216, 288, 120, { label: 'TEMPERATURA', var1: DEMO_VAR('Temp') }],
  ['btn-simple', 8, 344, 156, 52, { text: 'ARRANCAR', icon: '▶', variant: 'start', var1: DEMO_VAR('Marcha') }],
  ['btn-simple', 172, 344, 156, 52, { text: 'PARAR', icon: '■', var1: DEMO_VAR('Paro') }],
  ['btn-emergency', 336, 344, 160, 52, { text: 'EMERGENCIA', subtext: 'Seta NC', var1: DEMO_VAR('PE') }],
  ['alarm-banner', 504, 344, 288, 52, { text: 'PRESIÓN ALTA', subtext: 'Revisar válvula V1', var1: DEMO_VAR('Alarma') }],
  ['alarm-list', 8, 404, 488, 68, { title: 'ALARMAS', alNames: 'Fallo bomba P1\nPresión alta\nNivel bajo',
    alVars: [DEMO_VAR('P1_Fallo'), DEMO_VAR('Alarma'), DEMO_VAR('Nivel_Bajo')].join('\n') }],
  ['display', 504, 404, 288, 68, { label: 'VOLUMEN BOMBEADO m³', var1: DEMO_VAR('Volumen'), previewVal: '12480' }]
];

function cargarPantallaDemo() {
  var elementos = DEMO_PANTALLA.map(function(d, i) {
    var props = JSON.parse(JSON.stringify(PROPS_DEFAULT[d[0]] || {}));
    for (var k in d[5]) props[k] = d[5][k];
    return { id: 'el' + (i + 1), tipo: d[0], x: d[1], y: d[2], w: d[3], h: d[4], props: props };
  });
  aplicarProyecto({ elementos: elementos, contadorId: elementos.length, resolucion: '800x480' });
  /* El historial empieza en la pantalla de ejemplo: deshacer no la vacía */
  HISTORIAL = []; HIST_IDX = -1; guardarHistorial();
}

/* ── Aviso de bienvenida ── */
var DEMO_TEXTOS = {
  es: {
    sub: 'Editor visual de pantallas HMI industriales',
    aviso: '<b>Sin PLC conectado.</b> Esta demo no tiene ningún autómata detrás: pulsa <b>⚡ SIM</b> para simular las señales y ver cómo reaccionan los elementos.',
    titulo: 'Qué puedes probar',
    items: [
      ['🧩', '<b>Más de 200 componentes</b>: botones, indicadores, alarmas, tendencias y símbolos P&amp;ID. Arrástralos desde la biblioteca.'],
      ['🛠', '<b>Edición completa</b>: mover, redimensionar, rotar, alinear, capas, copiar y deshacer.'],
      ['📤', '<b>Exportar HTML</b>: genera la pantalla final, lista para conectarse a un PLC Siemens S7‑1200/1500 por su Web API.'],
      ['💾', '<b>Guardar y cargar</b> el proyecto en JSON. Todo se queda en tu navegador.']
    ],
    nota: 'Hay una pantalla de ejemplo cargada; <b>☐ NUEVO</b> la borra.',
    movil: 'El editor está pensado para ordenador: en el móvil se ve, pero no se puede editar con comodidad.',
    volver: '← Portfolio',
    entrar: 'Abrir el editor →'
  },
  en: {
    sub: 'Visual editor for industrial HMI screens',
    aviso: '<b>No PLC connected.</b> There is no controller behind this demo: press <b>⚡ SIM</b> to simulate signals and see how the elements react.',
    titulo: 'What you can try',
    items: [
      ['🧩', '<b>Over 200 components</b>: buttons, indicators, alarms, trends and P&amp;ID symbols. Drag them from the library.'],
      ['🛠', '<b>Full editing</b>: move, resize, rotate, align, layers, copy and undo.'],
      ['📤', '<b>HTML export</b>: generates the final screen, ready to talk to a Siemens S7‑1200/1500 PLC through its Web API.'],
      ['💾', '<b>Save and load</b> projects as JSON. Everything stays in your browser.']
    ],
    nota: 'A sample screen is loaded; <b>☐ NUEVO</b> clears it. The editor interface is in Spanish.',
    movil: 'The editor is designed for desktop: on a phone you can look around, but editing is not comfortable.',
    volver: '← Portfolio',
    entrar: 'Open the editor →'
  }
};

function _demoIdioma() {
  var q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'es') return q;
  return /^es|^ca/i.test(navigator.language || '') ? 'es' : 'en';
}

function mostrarAvisoDemo(idioma) {
  var t = DEMO_TEXTOS[idioma];
  var ov = document.getElementById('demo-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'demo-overlay';
    document.body.appendChild(ov);
  }
  ov.innerHTML =
    '<div id="demo-box" role="dialog" aria-modal="true" aria-labelledby="demo-titulo">' +
      '<div id="demo-head">' +
        '<div id="demo-idiomas">' +
          '<button class="' + (idioma === 'es' ? 'sel' : '') + '" onclick="mostrarAvisoDemo(\'es\')">ES</button>' +
          '<button class="' + (idioma === 'en' ? 'sel' : '') + '" onclick="mostrarAvisoDemo(\'en\')">EN</button>' +
        '</div>' +
        '<div id="demo-badge">DEMO</div>' +
        '<h1 id="demo-titulo">HMI <em>Editor</em></h1>' +
        '<div id="demo-sub">' + t.sub + '</div>' +
      '</div>' +
      '<div id="demo-body">' +
        '<div id="demo-aviso">' + t.aviso + '</div>' +
        '<div id="demo-sec">' + t.titulo + '</div>' +
        t.items.map(function(it) {
          return '<div class="demo-item"><span class="demo-ico">' + it[0] + '</span><span>' + it[1] + '</span></div>';
        }).join('') +
        '<div id="demo-nota">' + t.nota + '</div>' +
        '<div id="demo-movil">' + t.movil + '</div>' +
      '</div>' +
      '<div id="demo-foot">' +
        '<a id="demo-volver" href="https://paulocarrasco.dev/' + (idioma === 'en' ? 'en/' : '') + '">' + t.volver + '</a>' +
        '<button id="demo-entrar" onclick="cerrarAvisoDemo()">' + t.entrar + '</button>' +
      '</div>' +
    '</div>';
  document.documentElement.lang = idioma;
  document.getElementById('demo-entrar').focus();
}

function cerrarAvisoDemo() {
  var ov = document.getElementById('demo-overlay');
  if (!ov) return;
  ov.classList.add('saliendo');
  setTimeout(function() { ov.remove(); }, 200);
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('demo-overlay')) cerrarAvisoDemo();
});

cargarPantallaDemo();
mostrarAvisoDemo(_demoIdioma());
