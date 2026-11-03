
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

// ==========================================
// DIAcorks - OPENROUTER STORAGE
// ==========================================

const OPENROUTER_KEY = 'diacorks_openrouter_api_key';

const KEY_FILE =
  FileSystem.documentDirectory + 'openrouter_key.txt';

// ==========================================
// GUARDAR API KEY
// ==========================================

export const saveOpenRouterKey = async (key) => {
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('La API Key de OpenRouter no puede estar vacía.');
  }

  const clean = key.trim();
  let saved = false;

  // Almacenamiento seguro
  try {
    await SecureStore.setItemAsync(OPENROUTER_KEY, clean);
    saved = true;
  } catch (e) {
    console.log('SecureStore falló:', e);
  }

  // Archivo privado como respaldo
  try {
    await FileSystem.writeAsStringAsync(KEY_FILE, clean);
    saved = true;
  } catch (e) {
    console.log('Archivo de clave falló:', e);
  }

  if (!saved) {
    throw new Error(
      'No se pudo guardar la API Key de OpenRouter en el teléfono.'
    );
  }
};

// ==========================================
// OBTENER API KEY
// ==========================================

export const getOpenRouterKey = async () => {
  // Primero intenta SecureStore
  try {
    const key = await SecureStore.getItemAsync(OPENROUTER_KEY);

    if (key) return key;
  } catch (e) {
    console.log('Error leyendo SecureStore:', e);
  }

  // Después intenta el archivo privado
  try {
    const info = await FileSystem.getInfoAsync(KEY_FILE);

    if (info.exists) {
      const key = (
        await FileSystem.readAsStringAsync(KEY_FILE)
      ).trim();

      if (key) return key;
    }
  } catch (e) {
    console.log('Error leyendo archivo de respaldo:', e);
  }

  return null;
};

// ==========================================
// ELIMINAR API KEY
// ==========================================

export const deleteOpenRouterKey = async () => {
  try {
    await SecureStore.deleteItemAsync(OPENROUTER_KEY);
  } catch (e) {
    console.log('Error eliminando SecureStore:', e);
  }

  try {
    await FileSystem.deleteAsync(KEY_FILE, {
      idempotent: true,
    });
  } catch (e) {
    console.log('Error eliminando archivo:', e);
  }
};

// ==========================================
// COMPATIBILIDAD CON CÓDIGO ANTERIOR
// ==========================================

// Permite que componentes antiguos que utilizan Claude
// sigan funcionando mientras actualizas el resto del proyecto.

export const saveClaudeKey = saveOpenRouterKey;
export const getClaudeKey = getOpenRouterKey;
export const deleteClaudeKey = deleteOpenRouterKey;
