// src/components/services/localModel.js
// IA que corre DENTRO del teléfono (llama.cpp vía llama.rn). Sin internet ni API keys.
// El modelo (.gguf) se descarga una sola vez y queda guardado en el teléfono.
import * as FileSystem from 'expo-file-system';
import { initLlama } from 'llama.rn';

// Modelo por defecto: Qwen2.5 1.5B Instruct (≈1.1 GB, buen español).
// Si tu teléfono es modesto o quieres algo más liviano (≈0.5 GB), cambia la URL por:
// https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf
export const MODEL_URL =
  'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf';
export const MODEL_SIZE_TEXT = '≈ 1.1 GB';

const MODEL_PATH = FileSystem.documentDirectory + 'modelo.gguf';
const TMP_PATH = FileSystem.documentDirectory + 'modelo.gguf.part';
const MIN_BYTES = 100 * 1024 * 1024; // un modelo completo pesa más que esto

let context = null;
let loading = null;
let download = null;

export const isModelReady = async () => {
  try {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    return !!(info.exists && info.size > MIN_BYTES);
  } catch (e) {
    return false;
  }
};

/** Descarga el modelo. onProgress recibe un número de 0 a 1. */
export const downloadModel = async (onProgress) => {
  await FileSystem.deleteAsync(TMP_PATH, { idempotent: true });
  download = FileSystem.createDownloadResumable(MODEL_URL, TMP_PATH, {}, (p) => {
    if (onProgress && p.totalBytesExpectedToWrite > 0) {
      onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    }
  });
  try {
    const res = await download.downloadAsync();
    if (!res || res.status !== 200) {
      throw new Error('La descarga falló (código ' + (res ? res.status : 'desconocido') + ').');
    }
    await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
    await FileSystem.moveAsync({ from: TMP_PATH, to: MODEL_PATH });
  } finally {
    download = null;
  }
};

export const cancelDownload = async () => {
  try { if (download) await download.pauseAsync(); } catch (e) {}
  download = null;
  await FileSystem.deleteAsync(TMP_PATH, { idempotent: true });
};

export const deleteModel = async () => {
  try { if (context) await context.release(); } catch (e) {}
  context = null;
  await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
};

// Carga el modelo en memoria (tarda unos segundos la primera vez)
const getContext = async () => {
  if (context) return context;
  if (!loading) {
    loading = initLlama({
      model: MODEL_PATH,
      n_ctx: 2048,
      n_gpu_layers: 0,
      use_mlock: false,
    })
      .then((c) => {
        context = c;
        return c;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
};

/** @param {Array<{role:string, content:string}>} messages  @returns {Promise<string>} */
export const generate = async (messages) => {
  const c = await getContext();
  const res = await c.completion({
    messages,
    n_predict: 400,
    temperature: 0.7,
    stop: ['<|im_end|>', '<|endoftext|>'],
  });
  return (res.text || '').trim();
};
