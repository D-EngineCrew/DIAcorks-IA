// src/components/services/chatStore.js
// Guarda todos los chats en el teléfono para que la IA "recuerde" las conversaciones
import * as FileSystem from 'expo-file-system';

const FILE = FileSystem.documentDirectory + 'chats.json';

export const loadStore = async () => {
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (!info.exists) return { chats: [], currentId: null };
    const data = JSON.parse(await FileSystem.readAsStringAsync(FILE));
    return {
      chats: Array.isArray(data.chats) ? data.chats : [],
      currentId: data.currentId || null,
    };
  } catch (e) {
    console.log('No se pudo leer el historial:', e);
    return { chats: [], currentId: null };
  }
};

export const saveStore = async (store) => {
  try {
    await FileSystem.writeAsStringAsync(FILE, JSON.stringify(store));
  } catch (e) {
    console.log('No se pudo guardar el historial:', e);
  }
};

// Borra un archivo local (por ejemplo las imágenes de un chat eliminado)
export const deleteLocalFile = async (uri) => {
  try {
    if (uri && uri.startsWith('file')) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (e) {}
};
