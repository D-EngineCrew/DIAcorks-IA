// src/components/services/aiService.js
// Chat de texto con tu IA en Hugging Face (token que empieza con hf_...)
import { getHfKey, getHfModel, getHfUrl, getMemoryNotes } from './storage';

// Valores por defecto. Puedes cambiarlos desde Menú → Configuración (sin tocar el código).
// - Modelo: el ID de tu modelo en Hugging Face, ej. "DIAcorks/DIAcorks"
// - Endpoint: déjalo vacío para usar Inference Providers de Hugging Face.
//   Si creaste un Inference Endpoint propio, pega su URL (termina en /v1 o /v1/chat/completions).
const DEFAULT_URL = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';
const MAX_TOKENS = 2048;

const SYSTEM_PROMPT =
  'Eres DIAcorks IA, un asistente en español que ayuda con preguntas generales, código y archivos. Responde de forma clara y directa Tienes acceso a internet puedes crear zips y más.';

// Acepta ".../v1", ".../v1/" o la URL completa de chat/completions
const normalizeUrl = (url) => {
  const u = (url || '').trim().replace(/\/+$/, '');
  if (!u) return DEFAULT_URL;
  if (u.endsWith('/chat/completions')) return u;
  if (u.endsWith('/v1')) return u + '/chat/completions';
  return u + '/v1/chat/completions';
};

export const hasAIKey = async () => !!(await getHfKey());

// Convierte el archivo adjunto al formato compatible con OpenAI
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
  const apiKey = await getHfKey();
  if (!apiKey) {
    return { text: 'Falta tu token de Hugging Face. Ábrelo en Menú → Configuración.', isError: true };
  }

  try {
    const content = [...fileToParts(fileData), { type: 'text', text: prompt }];

    // Lo que el usuario pidió que la IA recuerde siempre
    const notes = await getMemoryNotes();
    const system = notes
      ? `${SYSTEM_PROMPT}\n\nLo que debes recordar siempre sobre el usuario:\n${notes}`
      : SYSTEM_PROMPT;

    const model = (await getHfModel()) || DEFAULT_MODEL;
    const url = normalizeUrl(await getHfUrl());

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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
      console.log('Error de Hugging Face:', data);
      if (response.status === 401) return { text: 'Token inválido. Revisa tu token de Hugging Face en Menú → Configuración.', isError: true };
      if (response.status === 402) return { text: 'Tu cuenta de Hugging Face no tiene créditos suficientes.', isError: true };
      if (response.status === 404) return { text: 'No se encontró el modelo o el endpoint. Revisa el nombre del modelo en Menú → Configuración.', isError: true };
      if (response.status === 503) return { text: 'Tu modelo se está iniciando o está dormido. Espera un minuto y vuelve a intentar.', isError: true };
      if (response.status === 429) return { text: 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.', isError: true };
      return { text: `Error de la API: ${(typeof data?.error === 'string' ? data.error : data?.error?.message) || response.status}`, isError: true };
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
