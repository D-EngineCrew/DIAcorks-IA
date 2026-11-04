// src/components/services/aiService.js
// Chat de texto con la IA que corre dentro del teléfono (sin API key).
import { getMemoryNotes } from './storage';
import { isModelReady, generate, stopGeneration } from './localModel';

const SYSTEM_PROMPT =
  'Eres DIAcorks IA, un asistente en español que ayuda con preguntas generales, código y archivos. Responde de forma clara y directa.';

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
 * @returns {Promise<{ text: string, isError?: boolean }>}
 */
export const fetchAIResponse = async (prompt, fileData = null, history = [], onToken = null) => {
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
      userText = `Archivo "${fileData.name}":\n\`\`\`\n${cut}\n\`\`\`\n\n${prompt}`;
    }

    const notes = await getMemoryNotes();
    const system = notes
      ? `${SYSTEM_PROMPT}\n\nLo que debes recordar siempre sobre el usuario:\n${notes}`
      : SYSTEM_PROMPT;

    const recent = history.slice(-MAX_HISTORY);
    while (recent.length && recent[0].role !== 'user') recent.shift();

    const text = await generate([
      { role: 'system', content: system },
      ...recent,
      { role: 'user', content: userText },
    ], onToken);
    return { text: text || '(La IA no devolvió texto)' };
  } catch (error) {
    console.log(error);
    return { text: 'No se pudo ejecutar el modelo: ' + String((error && error.message) || error), isError: true };
  }
};
