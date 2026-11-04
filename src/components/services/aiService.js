// src/components/services/aiService.js
// Chat de texto con Claude a través de OpenRouter (llaves que empiezan con sk-or-...)
import { getClaudeKey, getMemoryNotes } from './storage';

// ⚠️ Opcional: pega aquí tu API key de OpenRouter (sk-or-v1-...). Si la dejas así, la app usa la que guardes en Menú → Configuración.
// Ojo: quien vea tu repo o abra el APK podría usar esta clave. Mantén el repo privado.
const CLAUDE_API_KEY = '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';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-5'; // otros modelos: openrouter.ai/models
const MAX_TOKENS = 2048;

const SYSTEM_PROMPT =
  'Eres DIAcorks IA, un asistente en español que ayuda con preguntas generales, código y archivos. Responde de forma clara y directa.';

const getKey = async () => {
  if (CLAUDE_API_KEY && CLAUDE_API_KEY !== 'TU_API_KEY_DE_CLAUDE') return CLAUDE_API_KEY;
  return getClaudeKey();
};

export const hasClaudeKey = async () => !!(await getKey());

// Convierte el archivo adjunto al formato de OpenRouter (compatible con OpenAI)
const fileToParts = (fileData) => {
  if (!fileData) return [];

  if (fileData.type === 'text') {
    return [
      {
        type: 'text',
        text: `Archivo "${fileData.name}":\n\`\`\`\n${fileData.content}\n\`\`\``,
      },
    ];
  }

  const dataUrl = `data:${fileData.mimeType};base64,${fileData.data}`;
  if (fileData.mimeType === 'application/pdf') {
    return [{ type: 'file', file: { filename: fileData.name, file_data: dataUrl } }];
  }
  return [{ type: 'image_url', image_url: { url: dataUrl } }];
};

/**
 * @param {string} prompt  Texto del usuario
 * @param {object|null} fileData  Resultado de pickAndReadFile() (opcional)
 * @param {Array} history  [{ role: 'user'|'assistant', content: '...' }] (opcional)
 * @returns {Promise<{ text: string, isError?: boolean }>}
 */
export const fetchAIResponse = async (prompt, fileData = null, history = []) => {
  const apiKey = await getKey();
  if (!apiKey) {
    return { text: 'Falta tu API key. Ábrela en Menú → Configuración.', isError: true };
  }

  try {
    const content = [...fileToParts(fileData), { type: 'text', text: prompt }];

    // Lo que el usuario pidió que la IA recuerde siempre
    const notes = await getMemoryNotes();
    const system = notes
      ? `${SYSTEM_PROMPT}\n\nLo que debes recordar siempre sobre el usuario:\n${notes}`
      : SYSTEM_PROMPT;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'DIAcorks IA',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: system },
          ...history,
          { role: 'user', content },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('Error de OpenRouter:', data);
      if (response.status === 401) return { text: 'API key inválida. Revisa tu clave en Menú → Configuración.', isError: true };
      if (response.status === 402) return { text: 'Tu cuenta de OpenRouter no tiene créditos suficientes.', isError: true };
      if (response.status === 429) return { text: 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.', isError: true };
      return { text: `Error de la API: ${data?.error?.message || response.status}`, isError: true };
    }

    const message = data?.choices?.[0]?.message?.content;
    const text = Array.isArray(message)
      ? message.map((p) => p.text || '').join('\n')
      : message;
    return { text: text || '(La IA no devolvió texto)' };
  } catch (error) {
    console.log(error);
    return { text: 'Error de conexión. Revisa tu internet.', isError: true };
  }
};
