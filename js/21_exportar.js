/* =================================================================
   ACCIONES DE EXPORTACIÓN
================================================================= */
function abrirExportar() {
  document.getElementById('exp-ta').value = generarHTML();
  abrirModal('modal-export');
}

function copiarExport() {
  document.getElementById('exp-ta').select();
  document.execCommand('copy');
  mostrarToast('Copiado al portapapeles!');
}

function descargarExport() {
  var contenido = document.getElementById('exp-ta').value;
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: 'text/html' }));
  a.download = (PLC.project || 'hmi').replace(/\s+/g,'_') + '.html';
  a.click();
  mostrarToast('Descargando...');
}

