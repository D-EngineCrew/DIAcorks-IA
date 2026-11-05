// src/components/services/profileStore.js
// Perfiles guardados en el teléfono (nombre, correo y foto). No es un login real: no usa contraseña ni servidor.
// Cada perfil tiene sus propios chats y su propia memoria. Sin perfil = modo "Invitado" (los datos de antes).
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

const DIR = FileSystem.documentDirectory;
const FILE = DIR + 'perfiles.json';
export const GUEST_ID = 'default';

let cache = null;

const load = async () => {
  if (cache) return cache;
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (info.exists) {
      const d = JSON.parse(await FileSystem.readAsStringAsync(FILE));
      cache = {
        profiles: Array.isArray(d.profiles) ? d.profiles : [],
        activeId: d.activeId || null,
      };
      return cache;
    }
  } catch (e) {
    console.log('No se pudieron leer los perfiles:', e);
  }
  cache = { profiles: [], activeId: null };
  return cache;
};

const save = async () => {
  try {
    await FileSystem.writeAsStringAsync(FILE, JSON.stringify(cache));
  } catch (e) {
    console.log('No se pudieron guardar los perfiles:', e);
  }
};

export const loadProfiles = async () => {
  const d = await load();
  return { profiles: [...d.profiles], activeId: d.activeId };
};

/** Id para nombrar archivos: el del perfil activo o "default" (invitado). */
export const getActiveId = async () => {
  const d = await load();
  return d.activeId && d.profiles.some((p) => p.id === d.activeId) ? d.activeId : GUEST_ID;
};

export const getActiveProfile = async () => {
  const d = await load();
  return d.profiles.find((p) => p.id === d.activeId) || null;
};

export const createProfile = async ({ name, email }) => {
  const d = await load();
  const profile = {
    id: 'p' + Date.now().toString(36),
    name: String(name || '').trim(),
    email: String(email || '').trim(),
    photoUri: null,
  };
  d.profiles.push(profile);
  d.activeId = profile.id;
  await save();
  return profile;
};

export const updateProfile = async (id, fields) => {
  const d = await load();
  const p = d.profiles.find((x) => x.id === id);
  if (!p) return;
  Object.assign(p, fields);
  await save();
};

/** id = perfil al que cambiar; null = cerrar sesión (modo invitado). */
export const switchProfile = async (id) => {
  const d = await load();
  d.activeId = id && d.profiles.some((p) => p.id === id) ? id : null;
  await save();
};

export const deleteProfile = async (id) => {
  const d = await load();
  const p = d.profiles.find((x) => x.id === id);
  d.profiles = d.profiles.filter((x) => x.id !== id);
  if (d.activeId === id) d.activeId = null;
  await save();
  try { await FileSystem.deleteAsync(DIR + `chats_${id}.json`, { idempotent: true }); } catch (e) {}
  try { await FileSystem.deleteAsync(DIR + `memoria_${id}.txt`, { idempotent: true }); } catch (e) {}
  try { if (p && p.photoUri) await FileSystem.deleteAsync(p.photoUri, { idempotent: true }); } catch (e) {}
};

/** Abre la galería/archivos para elegir una foto y la guarda en la app. Devuelve la ruta o null. */
export const pickPhoto = async () => {
  const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets || !result.assets.length) return null;
  const asset = result.assets[0];
  const ext = (String(asset.name || '').split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const dest = DIR + `foto_${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: asset.uri, to: dest });
  return dest;
};
