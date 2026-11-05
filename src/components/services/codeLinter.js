// src/components/services/codeLinter.js
// Revisión rápida de sintaxis (sin internet ni IA): paréntesis, comillas, JSON, HTML y Python básico.
// No reemplaza a un compilador: detecta los errores más comunes y dice en qué línea están.
// (Sin dependencias de React Native: es solo lógica.)

const BRACE_LANGS = ['js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript', 'java', 'c', 'cpp', 'c++', 'cs', 'csharp', 'go', 'rust', 'rs', 'kt', 'kotlin', 'swift', 'php'];
const MAX_ISSUES = 8;

const kindOf = (langOrName) => {
  const s = String(langOrName || '').toLowerCase();
  const ext = s.includes('.') ? s.split('.').pop() : s;
  if (ext === 'json') return 'json';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'py' || ext === 'python') return 'python';
  if (BRACE_LANGS.includes(ext)) return 'brace';
  return null;
};

// Recorre el código buscando paréntesis/llaves/corchetes y comillas sin cerrar.
const scan = (code, { lineComment = true, blockComment = true, hash = false, triple = false, backtick = true, startLine = 1 }) => {
  const issues = [];
  const stack = [];
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const n = code.length;
  let line = startLine;
  let i = 0;

  while (i < n) {
    const c = code[i];
    const d = code[i + 1];

    if (c === '\n') { line++; i++; continue; }
    if (lineComment && c === '/' && d === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (hash && c === '#') { while (i < n && code[i] !== '\n') i++; continue; }
    if (blockComment && c === '/' && d === '*') {
      const start = line;
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) { if (code[i] === '\n') line++; i++; }
      if (i >= n) { issues.push({ line: start, message: 'Comentario "/*" sin cerrar' }); break; }
      i += 2;
      continue;
    }
    if (triple && (code.startsWith('"""', i) || code.startsWith("'''", i))) {
      const q = code.substr(i, 3);
      const start = line;
      i += 3;
      while (i < n && !code.startsWith(q, i)) { if (code[i] === '\n') line++; if (code[i] === '\\') i++; i++; }
      if (i >= n) { issues.push({ line: start, message: `Texto ${q} sin cerrar` }); break; }
      i += 3;
      continue;
    }
    if (c === '"' || c === "'" || (backtick && c === '`')) {
      const start = line;
      let closed = false;
      i++;
      while (i < n) {
        const ch = code[i];
        if (ch === '\\') { i += 2; continue; }
        if (ch === c) { closed = true; i++; break; }
        if (ch === '\n') {
          if (c === '`') { line++; i++; continue; }
          break;
        }
        i++;
      }
      if (!closed) issues.push({ line: start, message: `Comilla ${c} sin cerrar` });
      continue;
    }
    if (c === '(' || c === '[' || c === '{') stack.push({ c, line });
    else if (c === ')' || c === ']' || c === '}') {
      const top = stack.pop();
      if (!top) issues.push({ line, message: `Sobra "${c}": no hay nada que cerrar` });
      else if (top.c !== pairs[c]) issues.push({ line, message: `"${c}" no coincide con "${top.c}" abierto en la línea ${top.line}` });
    }
    i++;
  }
  stack.forEach((s) => issues.push({ line: s.line, message: `Falta cerrar "${s.c}"` }));
  return issues;
};

const lintJson = (code) => {
  try {
    JSON.parse(code);
    return [];
  } catch (e) {
    const msg = String((e && e.message) || e);
    const pos = msg.match(/position (\d+)/);
    const line = pos ? code.slice(0, Number(pos[1])).split('\n').length : undefined;
    const found = scan(code, { lineComment: false, blockComment: false, backtick: false });
    return [{ line, message: 'JSON inválido: ' + msg }, ...found];
  }
};

// Python: falta ":" en if/for/def..., mezcla de tabs y espacios, y paréntesis/comillas
const lintPython = (code) => {
  const issues = scan(code, { lineComment: false, blockComment: false, hash: true, triple: true, backtick: false });
  const lines = code.split('\n');
  const KW = /^(def|class|if|elif|else|for|while|try|except|finally|with)\b/;
  let depth = 0;
  let tabLine = 0;
  let spaceLine = 0;
  let tq = null; // dentro de un texto """ ... """ que sigue en la siguiente línea

  lines.forEach((raw, idx) => {
    const ln = idx + 1;
    const startedInTriple = !!tq;
    if (!startedInTriple) {
      if (/^\t/.test(raw)) tabLine = tabLine || ln;
      else if (/^ +\S/.test(raw)) spaceLine = spaceLine || ln;
    }

    const startDepth = depth;
    let quote = null;
    let colonAtZero = false;
    for (let i = 0; i < raw.length; i++) {
      if (tq) {
        const at = raw.indexOf(tq, i);
        if (at === -1) { i = raw.length; break; }
        i = at + 2;
        tq = null;
        continue;
      }
      const ch = raw[i];
      if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
      if (raw.startsWith('"""', i) || raw.startsWith("'''", i)) { tq = raw.substr(i, 3); i += 2; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '#') break;
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth = Math.max(0, depth - 1);
      else if (ch === ':' && depth === 0) colonAtZero = true;
    }
    const t = raw.trim();
    if (!startedInTriple && startDepth === 0 && depth === 0 && KW.test(t) && !colonAtZero && !t.endsWith('\\')) {
      issues.push({ line: ln, message: `Falta ":" al final de "${t.length > 40 ? t.slice(0, 40) + '…' : t}"` });
    }
  });

  if (tabLine && spaceLine) {
    issues.push({ line: Math.max(tabLine, spaceLine), message: `Mezcla tabuladores y espacios (líneas ${tabLine} y ${spaceLine}): Python lo rechaza` });
  }
  return issues;
};

const VOID = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
const OPTIONAL_CLOSE = ['p', 'li', 'td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'option', 'dt', 'dd', 'html', 'body', 'head'];

const lintHtml = (code) => {
  const issues = [];
  // Revisa también el JavaScript dentro de <script>
  const reScript = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let sm;
  while ((sm = reScript.exec(code)) !== null) {
    if (/\bsrc\s*=/.test(sm[0].slice(0, sm[0].indexOf('>')))) continue;
    const startLine = code.slice(0, sm.index + sm[0].indexOf('>') + 1).split('\n').length;
    issues.push(...scan(sm[1], { startLine }).map((x) => ({ ...x, message: 'En <script>: ' + x.message })));
  }

  // Oculta comentarios, scripts y estilos (conservando los saltos de línea)
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  const clean = code
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<script\b[\s\S]*?<\/script>/gi, blank)
    .replace(/<style\b[\s\S]*?<\/style>/gi, blank);

  const reTag = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  const stack = [];
  let m;
  while ((m = reTag.exec(clean)) !== null) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const line = clean.slice(0, m.index).split('\n').length;
    if (!closing) {
      if (VOID.includes(tag) || m[3].trim().endsWith('/')) continue;
      stack.push({ tag, line });
    } else {
      const at = stack.map((s) => s.tag).lastIndexOf(tag);
      if (at === -1) {
        if (!VOID.includes(tag)) issues.push({ line, message: `</${tag}> no tiene etiqueta de apertura` });
      } else {
        for (let k = stack.length - 1; k > at; k--) {
          const s = stack[k];
          if (!OPTIONAL_CLOSE.includes(s.tag)) issues.push({ line: s.line, message: `Etiqueta <${s.tag}> sin cerrar` });
        }
        stack.length = at;
      }
    }
  }
  stack.forEach((s) => { if (!OPTIONAL_CLOSE.includes(s.tag)) issues.push({ line: s.line, message: `Etiqueta <${s.tag}> sin cerrar` }); });
  return issues;
};

/**
 * @param {string} code
 * @param {string} langOrFileName  "javascript", "py", "index.html"...
 * @returns {Array<{ line?: number, message: string }>}  vacío = no se detectó nada
 */
export const lintCode = (code, langOrFileName) => {
  const text = String(code || '');
  if (!text.trim() || text.length > 200000) return [];
  const kind = kindOf(langOrFileName);
  let issues = [];
  try {
    if (kind === 'json') issues = lintJson(text);
    else if (kind === 'python') issues = lintPython(text);
    else if (kind === 'html') issues = lintHtml(text);
    else if (kind === 'css') issues = scan(text, { lineComment: false, backtick: false });
    else if (kind === 'brace') issues = scan(text, {});
  } catch (e) {
    return [];
  }
  const seen = new Set();
  return issues
    .filter((x) => { const k = `${x.line}|${x.message}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.line || 0) - (b.line || 0))
    .slice(0, MAX_ISSUES);
};

export const formatIssues = (issues) =>
  issues.map((i) => `- ${i.line ? `Línea ${i.line}: ` : ''}${i.message}`).join('\n');
