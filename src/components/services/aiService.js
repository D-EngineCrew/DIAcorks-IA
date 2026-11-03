
// src/components/services/aiService.js
// DIAcorks - OpenRouter AI Service
// Conexión mediante Fetch API, sin SDK adicional.

import { fileToContentBlocks } from './utils/fileHandler';
import { getClaudeKey } from './storage';

// ==========================================
// CONFIGURACIÓN DE OPENROUTER
// ==========================================

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Modelo predeterminado.
// Puedes cambiarlo por cualquier modelo disponible en OpenRouter.
const MODEL = 'openai/gpt-4o-mini';

const MAX_TOKENS = 2048;

const SYSTEM_PROMPT = `
Eres DIAcorks IA, un asistente inteligente y programador.

Tu función es ayudar con:

- Programación y desarrollo de software.
- Creación de mods y ports de videojuegos.
- Desarrollo de aplicaciones Android y APK.
- Desarrollo web (HTML, CSS, JavaScript).
- Código Lua, Haxe, HScript y otros lenguajes.
- Análisis y modificación de archivos.
- Depuración y solución de errores.
- Explicaciones técnicas y asistencia general.

Responde principalmente en español.
Proporciona código completo cuando el usuario lo solicite.
Explica los cambios realizados de forma clara.
No inventes resultados de ejecución.
Mantén un tono profesional, directo y amigable.

Tu nombre es DIAcorks.
`;

// ==========================================
// API KEY
// ==========================================

// Por compatibilidad, reutilizamos el almacenamiento anterior.
// Puedes cambiar getClaudeKey por getOpenRouterKey cuando
// actualices también tu archivo storage.js.

const getKey = async () => {
  return await getOpenRouterKey();
};

export const hasOpenRouterKey = async () => {
  return !!(await getKey());
};

// Compatibilidad con componentes que todavía utilizan
// el nombre anterior.
export const hasClaudeKey = hasOpenRouterKey;

// ==========================================
// CONVERSIÓN DE ARCHIVOS
// ==========================================

const convertContentBlocks = (blocks = []) => {
  return blocks.map((block) => {
    if (block.type === 'text') {
      return {
        type: 'text',
        text: block.text || '',
      };
    }

    if (block.type === 'image') {
      return {
        type: 'image_url',
        image_url: {
          url: block.source?.data
            ? `data:${block.source.media_type};base64,${block.source.data}`
            : block.source?.url || '',
        },
      };
    }

    return null;
  }).filter(Boolean);
};

// ==========================================
// RESPUESTA DE DIAcorks
// ==========================================

/**
 * @param {string} prompt
 * @param {object|null} fileData
 * @param {Array} history
 * @returns {Promise<{text: string, isError?: boolean}>}
 */

export const fetchAIResponse = async (
  prompt,
  fileData = null,
  history = []
) => {

  const apiKey = await getKey();

  if (!apiKey) {
    return {
      text: 'Falta tu API Key de OpenRouter. Configúrala en Menú → Configuración.',
      isError: true,
    };
  }

  try {

    const fileBlocks = convertContentBlocks(
      fileToContentBlocks(fileData)
    );

    const userContent = [
      ...fileBlocks,
      {
        type: 'text',
        text: prompt,
      },
    ];

    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },

      ...history
        .filter((message) =>
          ['user', 'assistant'].includes(message.role)
        )
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),

      {
        role: 'user',
        content: userContent,
      },
    ];

    const response = await fetch(API_URL, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-OpenRouter-Title': 'DIAcorks',
      },

      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages,
      }),
    });

    const data = await response.json();

    // ======================================
    // MANEJO DE ERRORES
    // ======================================

    if (!response.ok) {

      console.error('Error de OpenRouter:', data);

      if (response.status === 401) {
        return {
          text: 'API Key inválida. Revisa tu clave de OpenRouter.',
          isError: true,
        };
      }

      if (response.status === 402) {
        return {
          text: 'No hay saldo o créditos suficientes para esta solicitud.',
          isError: true,
        };
      }

      if (response.status === 403) {
        return {
          text: 'Solicitud rechazada. Comprueba los permisos de tu API Key o el modelo seleccionado.',
          isError: true,
        };
      }

      if (response.status === 404) {
        return {
          text: 'El modelo seleccionado no está disponible.',
          isError: true,
        };
      }

      if (response.status === 429) {
        return {
          text: 'Demasiadas solicitudes. Espera un momento e inténtalo nuevamente.',
          isError: true,
        };
      }

      return {
        text: `Error de OpenRouter: ${
          data?.error?.message || response.status
        }`,
        isError: true,
      };
    }

    // ======================================
    // EXTRAER RESPUESTA
    // ======================================

    const text =
      data?.choices?.[0]?.message?.content;

    if (typeof text === 'string' && text.trim()) {
      return { text: text.trim() };
    }

    if (Array.isArray(text)) {
      const result = text
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n');

      if (result.trim()) {
        return { text: result.trim() };
      }
    }

    return {
      text: '(DIAcorks no recibió una respuesta de texto.)',
      isError: true,
    };

  } catch (error) {

    console.error('Error de DIAcorks:', error);

    return {
      text: 'Error de conexión con OpenRouter. Revisa tu conexión a internet e inténtalo nuevamente.',
      isError: true,
    };
  }
};
