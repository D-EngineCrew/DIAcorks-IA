// src/components/services/codeParser.js
// Separa el texto de la IA en partes (texto / bloques de código) y detecta archivos.

const LANG_EXT = {
  html: 'html', css: 'css', javascript: 'js', js: 'js', jsx: 'jsx', typescript: 'ts', ts: 'ts', tsx: 'tsx',
  python: 'py', py: 'py', json: 'json', java: 'java', kotlin: 'kt', c: 'c', cpp: 'cpp', csharp: 'cs',
  lua: 'lua', haxe: 'hx', xml: 'xml', yaml: 'yml', yml: 'yml', bash: 'sh', sh: 'sh', sql: 'sql',
  markdown: 'md', md: 'md', text: 'txt', txt: 'txt',
};

const looksLikeFileName = (s) => /^[\w.\-\/]+\.[A-Za-z0-9]{1,8}$/.test(s || '');

export const isHtmlFile = (file) => !!file && /\.html?$/i.test(file.name || '');

/**
 * @param {string} text
 * @param {boolean} closeOpen  si true, un bloque sin cerrar también cuenta como archivo
 * @returns {{ parts: Array, files: Array<{name, content, lang}> }}
 */
export const parseMessage = (text, closeOpen = true) => {
  const parts = [];
  const files = [];
  const src = String(text || '');
  const re = /```([^\n`]*)\n?/g;
  let last = 0;
  let m;
  let counter = 0;

  while ((m = re.exec(src)) !== null) {
    if (m.index > last) {
      const t = src.slice(last, m.index).replace(/^\n+|\n+$/g, '');
      if (t) parts.push({ type: 'text', text: t });
    }
    const info = m[1].trim().split(/\s+/).filter(Boolean);
    const lang = (info[0] || '').toLowerCase();
    let name = info.find((x, i) => i > 0 && looksLikeFileName(x)) || (looksLikeFileName(info[0]) ? info[0] : '');
    const bodyStart = re.lastIndex;
    const end = src.indexOf('```', bodyStart);
    const open = end === -1;
    const code = (open ? src.slice(bodyStart) : src.slice(bodyStart, end)).replace(/\n$/, '');
    last = open ? src.length : end + 3;
    re.lastIndex = last;

    const part = { type: 'code', lang: lang && !looksLikeFileName(lang) ? lang : '', code, open };
    if (name || (!open || closeOpen)) {
      if (!name) {
        counter += 1;
        const ext = LANG_EXT[lang] || '';
        name = ext ? `archivo${counter}.${ext}` : '';
      }
      if (name && (!open || closeOpen)) {
        files.push({ name, content: code, lang });
        part.fileIndex = files.length - 1;
      }
    }
    parts.push(part);
  }
  if (last < src.length) {
    const t = src.slice(last).replace(/^\n+|\n+$/g, '');
    if (t) parts.push({ type: 'text', text: t });
  }
  return { parts, files };
};

// Arma una página HTML autocontenida: inserta CSS/JS de otros archivos del mismo mensaje.
export const buildPreviewHtml = (files, file) => {
  let html = String((file && file.content) || '');
  const find = (ref) => {
    const base = String(ref).split('/').pop().toLowerCase();
    return (files || []).find((f) => f.name.split('/').pop().toLowerCase() === base);
  };
  html = html.replace(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (tag, href) => {
    const f = find(href);
    return f ? `<style>\n${f.content}\n</style>` : tag;
  });
  html = html.replace(/<script[^>]*src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/gi, (tag, srcRef) => {
    const f = find(srcRef);
    return f ? `<script>\n${f.content}\n</script>` : tag;
  });
  if (!/<meta[^>]*viewport/i.test(html)) {
    html = '<meta name="viewport" content="width=device-width, initial-scale=1">\n' + html;
  }
  return html;
};
