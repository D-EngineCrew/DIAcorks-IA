// src/components/services/chatStore.js
// Guarda todos los chats en el teléfono para que la IA "recuerde" las conversaciones
import * as FileSystem from 'expo-file-system';
import { getActiveId, GUEST_ID } from './profileStore';

// Cada perfil guarda sus chats aparte. El modo invitado usa el archivo de siempre (chats.json).
const fileFor = (id) => FileSystem.documentDirectory + (id === GUEST_ID ? 'chats.json' : `chats_${id}.json`);

export const loadStore = async (profileId) => {
  try {
    const FILE = fileFor(profileId || (await getActiveId()));
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

export const saveStore = async (store, profileId) => {
  try {
    const FILE = fileFor(profileId || (await getActiveId()));
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
