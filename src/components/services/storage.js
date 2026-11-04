// src/components/services/storage.js
// Guarda en el teléfono: la API key y las notas de memoria de la IA
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const CLAUDE_KEY = 'diacorks_claude_api_key';
const KEY_FILE = FileSystem.documentDirectory + 'claude_key.txt';
const NOTES_FILE = FileSystem.documentDirectory + 'memoria.txt';

export const saveClaudeKey = async (key) => {
  const clean = key.trim();
  let saved = false;

  try {
    await SecureStore.setItemAsync(CLAUDE_KEY, clean);
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

export const getClaudeKey = async () => {
  try {
    const k = await SecureStore.getItemAsync(CLAUDE_KEY);
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

export const deleteClaudeKey = async () => {
  try { await SecureStore.deleteItemAsync(CLAUDE_KEY); } catch (e) {}
  try { await FileSystem.deleteAsync(KEY_FILE, { idempotent: true }); } catch (e) {}
};

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
