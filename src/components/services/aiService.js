// src/components/services/aiService.js
// Chat de texto con la API de Claude (usa fetch, no necesita SDK)
import { fileToContentBlocks } from './utils/fileHandler';
import { getClaudeKey } from './storage';

// ⚠️ Pega aquí tu API key de Claude (sk-ant-...). Si la dejas así, la app usa la que guardes en Menú → Configuración.
// Ojo: quien vea tu repo o abra el APK podría usar esta clave. Mantén el repo privado.
const CLAUDE_API_KEY = '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';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5-5'; // más barato y rápido: 'claude-haiku-5-5'
const MAX_TOKENS = 2048;

const SYSTEM_PROMPT =
  'Eres DIAcorks IA, un asistente en español que ayuda con preguntas generales, código y archivos. Responde de forma clara y directa.';

const getKey = async () => {
  if (CLAUDE_API_KEY && CLAUDE_API_KEY !== 'TU_API_KEY_DE_CLAUDE') return CLAUDE_API_KEY;
  return getClaudeKey();
};

export const hasClaudeKey = async () => !!(await getKey());

/**
 * @param {string} prompt  Texto del usuario
 * @param {object|null} fileData  Resultado de pickAndReadFile() (opcional)
 * @param {Array} history  [{ role: 'user'|'assistant', content: '...' }] (opcional)
 * @returns {Promise<{ text: string, isError?: boolean }>}
 */
export const fetchAIResponse = async (prompt, fileData = null, history = []) => {
  const apiKey = await getKey();
  if (!apiKey) {
    return { text: 'Falta tu API key de Claude. Ábrela en Menú → Configuración.', isError: true };
  }

  try {
    const content = [...fileToContentBlocks(fileData), { type: 'text', text: prompt }];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [...history, { role: 'user', content }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('Error de Claude:', data);
      if (response.status === 401) return { text: 'API key inválida. Revisa tu clave en Menú → Configuración.', isError: true };
      if (response.status === 429) return { text: 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.', isError: true };
      return { text: `Error de la API: ${data?.error?.message || response.status}`, isError: true };
    }

    const text = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    return { text: text || '(Claude no devolvió texto)' };
  } catch (error) {
    console.log(error);
    return { text: 'Error de conexión. Revisa tu internet.', isError: true };
  }
};
