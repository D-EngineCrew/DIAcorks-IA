// src/components/services/storage.js
// Guarda en el teléfono: el token de Hugging Face, el modelo y las notas de memoria de la IA
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const HF_KEY = 'diacorks_hf_api_key';
const KEY_FILE = FileSystem.documentDirectory + 'hf_key.txt';
const MODEL_FILE = FileSystem.documentDirectory + 'hf_model.txt';
const URL_FILE = FileSystem.documentDirectory + 'hf_url.txt';
const NOTES_FILE = FileSystem.documentDirectory + 'memoria.txt';

// ---- Token de Hugging Face (hf_...) ----
export const saveHfKey = async (key) => {
  const clean = key.trim();
  let saved = false;

  try {
    await SecureStore.setItemAsync(HF_KEY, clean);
    saved = true;
  } catch (e) {
    console.log('SecureStore falló:', e);
  }

  try {
    await FileSystem.writeAsStringAsync(KEY_FILE, clean);
    saved = true;
  } catch (e) {
    console.log('Archivo de clave falló:', e);
  }

  if (!saved) throw new Error('No se pudo guardar la clave en el teléfono.');
};

export const getHfKey = async () => {
  try {
    const k = await SecureStore.getItemAsync(HF_KEY);
    if (k) return k;
  } catch (e) {}

  try {
    const info = await FileSystem.getInfoAsync(KEY_FILE);
    if (info.exists) {
      const k = (await FileSystem.readAsStringAsync(KEY_FILE)).trim();
      if (k) return k;
    }
  } catch (e) {}

  return null;
};

export const deleteHfKey = async () => {
  try { await SecureStore.deleteItemAsync(HF_KEY); } catch (e) {}
  try { await FileSystem.deleteAsync(KEY_FILE, { idempotent: true }); } catch (e) {}
};

// ---- Modelo y endpoint de Hugging Face (opcionales) ----
const readText = async (file) => {
  try {
    const info = await FileSystem.getInfoAsync(file);
    if (info.exists) return (await FileSystem.readAsStringAsync(file)).trim();
  } catch (e) {}
  return '';
};

export const saveHfModel = async (model) => {
  await FileSystem.writeAsStringAsync(MODEL_FILE, (model || '').trim());
};
export const getHfModel = () => readText(MODEL_FILE);

export const saveHfUrl = async (url) => {
  await FileSystem.writeAsStringAsync(URL_FILE, (url || '').trim());
};
export const getHfUrl = () => readText(URL_FILE);

// Memoria: lo que la IA debe recordar siempre sobre ti (nombre, gustos, cómo quieres que hable...)
export const saveMemoryNotes = async (text) => {
  await FileSystem.writeAsStringAsync(NOTES_FILE, (text || '').trim());
};

export const getMemoryNotes = async () => {
  try {
    const info = await FileSystem.getInfoAsync(NOTES_FILE);
    if (info.exists) return (await FileSystem.readAsStringAsync(NOTES_FILE)).trim();
  } catch (e) {}
  return '';
};
