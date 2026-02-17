/**
 * Pequeño stub para evitar errores de bundler cuando no está instalado jspdf.
 * Genera un archivo de texto plano con el contenido acumulado.
 */
class JsPDFStub {
  constructor() {
    this.lines = [];
  }

  setFontSize() { return this; }
  setFont() { return this; }

  text(content = '', x = 0, y = 0) {
    const value = Array.isArray(content) ? content.join(' ') : String(content ?? '');
    this.lines.push(`[${x},${y}] ${value}`);
    return this;
  }

  splitTextToSize(text = '', _width = 0) {
    if (text === null || text === undefined) return [''];
    return String(text).split('\n');
  }

  save(filename = 'documento.pdf') {
    const blob = new Blob([this.lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.pdf$/i, '') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
}

export default JsPDFStub;
