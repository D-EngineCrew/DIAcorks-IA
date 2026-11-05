// src/components/services/localModel.js
// IA que corre DENTRO del teléfono (llama.cpp vía llama.rn). Sin internet ni API keys.
// Cada modelo (.gguf) se descarga una sola vez y queda guardado en el teléfono.
import * as FileSystem from 'expo-file-system';
import { initLlama } from 'llama.rn';

// Catálogo. El "name" es lo que ve el usuario; puedes cambiar nombres, textos y URLs libremente.
// Para cambiar un modelo, pon la URL directa (".../resolve/main/archivo.gguf") de cualquier GGUF cuantizado Q4_K_M.
export const MODELS = [
  {
    id: 'diacorks', name: 'DIAcorks', desc: 'Equilibrado y recomendado', sizeText: '≈ 1.1 GB',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
  },
  {
    id: 'base', name: 'Base', desc: 'Liviano y estable', sizeText: '≈ 0.8 GB',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'premium', name: 'Premium', desc: 'Más inteligente', sizeText: '≈ 2.0 GB',
    url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
  },
  {
    id: 'pro', name: 'Pro', desc: 'Especializado en código', sizeText: '≈ 2.0 GB',
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/main/qwen2.5-coder-3b-instruct-q4_k_m.gguf',
  },
  {
    id: 'fast', name: 'Fast', desc: 'Muy rápido, respuestas simples', sizeText: '≈ 0.5 GB',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  },
  {
    id: 'ultra', name: 'Ultra', desc: 'Máxima calidad (teléfono potente)', sizeText: '≈ 2.0 GB',
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  },
];

const DIR = FileSystem.documentDirectory;
const SELECTED_FILE = DIR + 'modelo_actual.txt';
const OLD_PATH = DIR + 'modelo.gguf'; // versión anterior (un solo modelo)
const MIN_BYTES = 100 * 1024 * 1024; // un modelo completo pesa más que esto

const pathOf = (id) => DIR + `modelo_${id}.gguf`;
const tmpOf = (id) => DIR + `modelo_${id}.gguf.part`;
const findModel = (id) => MODELS.find((m) => m.id === id);

let context = null;
let contextId = null;
let loading = null;
let download = null;
let migrated = false;

// Si había un modelo de la versión anterior, pasa a ser "DIAcorks" (era el de 1.5B)
const migrateOld = async () => {
  if (migrated) return;
  migrated = true;
  try {
    const old = await FileSystem.getInfoAsync(OLD_PATH);
    const neu = await FileSystem.getInfoAsync(pathOf('diacorks'));
    if (old.exists && !neu.exists) await FileSystem.moveAsync({ from: OLD_PATH, to: pathOf('diacorks') });
  } catch (e) {}
};

export const getSelectedModelId = async () => {
  try {
    const info = await FileSystem.getInfoAsync(SELECTED_FILE);
    if (info.exists) {
      const id = (await FileSystem.readAsStringAsync(SELECTED_FILE)).trim();
      if (findModel(id)) return id;
    }
  } catch (e) {}
  return MODELS[0].id;
};

export const setSelectedModelId = async (id) => {
  if (!findModel(id)) return;
  await FileSystem.writeAsStringAsync(SELECTED_FILE, id);
};

/** ¿Está descargado este modelo? (sin id = el modelo seleccionado) */
export const isModelReady = async (id) => {
  await migrateOld();
  try {
    const mid = id || (await getSelectedModelId());
    const info = await FileSystem.getInfoAsync(pathOf(mid));
    return !!(info.exists && info.size > MIN_BYTES);
  } catch (e) {
    return false;
  }
};

/** @returns {Promise<Object<string, boolean>>} ej. { diacorks: true, fast: false, ... } */
export const getDownloadedMap = async () => {
  const map = {};
  for (const m of MODELS) map[m.id] = await isModelReady(m.id);
  return map;
};

/** Descarga un modelo. onProgress recibe un número de 0 a 1. */
export const downloadModel = async (id, onProgress) => {
  const model = findModel(id);
  if (!model) throw new Error('Modelo desconocido.');
  await FileSystem.deleteAsync(tmpOf(id), { idempotent: true });
  download = FileSystem.createDownloadResumable(model.url, tmpOf(id), {}, (p) => {
    if (onProgress && p.totalBytesExpectedToWrite > 0) {
      onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    }
  });
  try {
    const res = await download.downloadAsync();
    if (!res || res.status !== 200) {
      throw new Error('La descarga falló (código ' + (res ? res.status : 'desconocido') + ').');
    }
    await FileSystem.deleteAsync(pathOf(id), { idempotent: true });
    await FileSystem.moveAsync({ from: tmpOf(id), to: pathOf(id) });
  } finally {
    download = null;
  }
};

export const cancelDownload = async (id) => {
  try { if (download) await download.pauseAsync(); } catch (e) {}
  download = null;
  if (id) await FileSystem.deleteAsync(tmpOf(id), { idempotent: true });
};

export const deleteModel = async (id) => {
  if (contextId === id) {
    try { if (context) await context.release(); } catch (e) {}
    context = null;
    contextId = null;
  }
  await FileSystem.deleteAsync(pathOf(id), { idempotent: true });
};

// Carga el modelo en memoria (tarda unos segundos). Solo hay uno cargado a la vez.
const getContext = async (id) => {
  if (context && contextId === id) return context;
  if (context) {
    try { await context.release(); } catch (e) {}
    context = null;
    contextId = null;
  }
  if (!loading) {
    loading = initLlama({
      model: pathOf(id),
      n_ctx: 4096,
      n_batch: 256,
      n_gpu_layers: 0,
      use_mlock: false,
    })
      .then((c) => {
        context = c;
        contextId = id;
        return c;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
};

/**
 * @param {Array<{role:string, content:string}>} messages
 * @param {(partial: string) => void} [onToken]  se llama con el texto acumulado mientras escribe
 * @returns {Promise<string>}
 */
const generateRaw = async (messages, onToken) => {
  const id = await getSelectedModelId();
  const c = await getContext(id);
  let acc = '';
  const res = await c.completion(
    {
      messages,
      n_predict: 1000,
      temperature: 0.7,
      stop: ['<|im_end|>', '<|endoftext|>', '<|eot_id|>'],
    },
    (data) => {
      if (data && data.token) {
        acc += data.token;
        if (onToken) onToken(acc);
      }
    }
  );
  return ((res && res.text) || acc).trim();
};

// Solo una generación a la vez (respuesta o título): las demás esperan su turno
let queue = Promise.resolve();
const inQueue = (fn) => {
  const p = queue.then(fn, fn);
  queue = p.catch(() => {});
  return p;
};

export const generate = (messages, onToken) => inQueue(() => generateRaw(messages, onToken));

/**
 * Sugiere un título corto según la conversación.
 * @param {Array<{role:string, content:string}>} convo
 * @returns {Promise<string>} vacío si no pudo
 */
export const generateTitle = (convo) =>
  inQueue(async () => {
    const id = await getSelectedModelId();
    const c = await getContext(id);
    const text = convo
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'IA'}: ${String(m.content).slice(0, 300)}`)
      .join('\n');
    const res = await c.completion({
      messages: [
        { role: 'system', content: 'Eres un asistente que pone títulos cortos a conversaciones.' },
        {
          role: 'user',
          content: `Conversación:\n${text}\n\nEscribe SOLO un título de 3 a 6 palabras en español que resuma el tema. Sin comillas ni punto final.`,
        },
      ],
      n_predict: 20,
      temperature: 0.2,
      stop: ['<|im_end|>', '<|endoftext|>', '<|eot_id|>', '\n'],
    });
    return String((res && res.text) || '')
      .split('\n')[0]
      .replace(/^["'«“\s]+|["'»”.\s]+$/g, '')
      .slice(0, 40);
  });

/** Detiene la respuesta en curso (conserva lo que ya escribió). */
export const stopGeneration = async () => {
  try { if (context) await context.stopCompletion(); } catch (e) {}
};
