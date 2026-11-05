// src/components/services/aiService.js
// Chat de texto con la IA que corre dentro del teléfono (sin API key).
import { getMemoryNotes } from './storage';
import { isModelReady, generate, stopGeneration } from './localModel';
import { webSearch, wantsSearch, toQuery } from './webTools';
import { lintCode, formatIssues } from './codeLinter';
import { getActiveProfile } from './profileStore';

const SYSTEM_PROMPT =
  'Eres DIAcorks IA, un asistente en español que ayuda con preguntas generales, código y archivos. Responde de forma clara y directa.\n' +
  'Cuando el usuario pida una página web, app, script o cualquier código, escribe el código COMPLETO y funcional, sin dejar partes por rellenar. ' +
  'Pon cada archivo en su propio bloque de código y escribe el nombre del archivo junto al lenguaje, así: ```html index.html. ' +
  'Para páginas web simples usa UN solo archivo index.html con el CSS dentro de <style> y el JavaScript dentro de <script>. ' +
  'Si recibes "Información de internet", úsala para responder y menciona de qué fuente sale cada dato.\n' +
  'Si recibes un archivo, revísalo: explica en pocas líneas qué hace y cada error o problema que encuentres (usa también la lista "Análisis automático" si viene). ' +
  'Si hay errores, devuelve el archivo COMPLETO corregido en un bloque con su nombre, así: ```js nombre.js.';

const MAX_FILE_CHARS = 5000; // el modelo local tiene poca memoria de contexto
const MAX_HISTORY = 6;

// "Hay IA lista" = el modelo ya está descargado
export const hasAIKey = async () => isModelReady();
export const stopAIResponse = stopGeneration;
// Alias con el nombre antiguo, por si algún archivo todavía lo importa
export const hasClaudeKey = hasAIKey;

/**
 * @param {string} prompt  Texto del usuario
 * @param {object|null} fileData  Resultado de pickAndReadFile() (opcional)
 * @param {Array} history  [{ role: 'user'|'assistant', content: '...' }] (opcional)
 * @param {(partial: string) => void} [onToken]  texto acumulado mientras la IA escribe
 * @param {{ internet?: boolean, onStatus?: (s: string) => void }} [opts]
 * @returns {Promise<{ text: string, isError?: boolean }>}
 */
export const fetchAIResponse = async (prompt, fileData = null, history = [], onToken = null, opts = {}) => {
  if (!(await isModelReady())) {
    return { text: 'Falta descargar el modelo seleccionado. Ábrelo en Menú → Configuración.', isError: true };
  }

  if (fileData && fileData.type !== 'text') {
    return { text: 'La IA local solo puede leer archivos de texto o código (no imágenes ni PDF).', isError: true };
  }

  try {
    let userText = prompt;
    if (fileData) {
      const body = String(fileData.content || '');
      const cut = body.length > MAX_FILE_CHARS ? body.slice(0, MAX_FILE_CHARS) + '\n…(archivo recortado)' : body;
      // Revisión automática de sintaxis (sin IA): línea exacta de cada problema
      const issues = lintCode(body, fileData.name);
      const analysis = issues.length
        ? `Análisis automático de sintaxis:\n${formatIssues(issues)}`
        : 'Análisis automático de sintaxis: no se detectaron errores básicos.';
      userText = `Archivo "${fileData.name}":\n\`\`\`\n${cut}\n\`\`\`\n${analysis}\n\n${prompt}`;
    }

    // Internet: el teléfono busca y le pasa los resultados a la IA
    let sources = [];
    let searchNote = '';
    if (opts.internet || wantsSearch(prompt)) {
      const found = await webSearch(toQuery(prompt) || prompt, opts.onStatus);
      if (found.ok) {
        sources = found.sources;
        userText = `Información de internet:\n${found.context}\n\nCon esa información, responde: ${userText}`;
      } else {
        searchNote = `\n\n(No pude buscar en internet: ${found.error})`;
      }
      opts.onStatus && opts.onStatus('');
    }

    const profile = await getActiveProfile();
    const notes = await getMemoryNotes();
    let system = SYSTEM_PROMPT;
    if (profile && profile.name) system += `\n\nEl usuario se llama ${profile.name}.`;
    if (notes) system += `\n\nLo que debes recordar siempre sobre el usuario:\n${notes}`;

    const recent = history.slice(-MAX_HISTORY);
    while (recent.length && recent[0].role !== 'user') recent.shift();

    let text = await generate([
      { role: 'system', content: system },
      ...recent,
      { role: 'user', content: userText },
    ], onToken);
    text = text || '(La IA no devolvió texto)';

    if (sources.length) {
      text += '\n\nFuentes:\n' + sources.map((s, i) => `${i + 1}. ${s.title} - ${s.url}`).join('\n');
    }
    return { text: text + searchNote };
  } catch (error) {
    console.log(error);
    return { text: 'No se pudo ejecutar el modelo: ' + String((error && error.message) || error), isError: true };
  }
};
