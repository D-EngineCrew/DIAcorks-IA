// src/components/services/fileTools.js
// Guardar archivos creados por la IA (uno solo o varios en ZIP).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';

const safeName = (n) => String(n || 'archivo.txt').replace(/[\\:*?"<>|]/g, '_').replace(/^\/+/, '');

const mimeOf = (name) => {
  const e = (name.split('.').pop() || '').toLowerCase();
  return { html: 'text/html', css: 'text/css', js: 'text/javascript', json: 'application/json', zip: 'application/zip' }[e] || 'text/plain';
};

const writeFlat = async (name, data, encoding) => {
  const flat = safeName(name).replace(/\//g, '_');
  // Android: pedir carpeta (Descargas, Documentos...) con el selector del sistema
  if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
    try {
      const SAF = FileSystem.StorageAccessFramework;
      const perm = await SAF.requestDirectoryPermissionsAsync();
      if (perm.granted) {
        const uri = await SAF.createFileAsync(perm.directoryUri, flat.replace(/\.[^.]+$/, ''), mimeOf(flat));
        await FileSystem.writeAsStringAsync(uri, data, { encoding });
        return flat;
      }
    } catch (e) { /* cae al guardado interno */ }
  }
  const uri = FileSystem.documentDirectory + flat;
  await FileSystem.writeAsStringAsync(uri, data, { encoding });
  return flat;
};

export const saveTextFile = (name, content) =>
  writeFlat(name, String(content || ''), FileSystem.EncodingType.UTF8);

export const saveZip = async (files, zipName = 'proyecto.zip') => {
  const zip = new JSZip();
  (files || []).forEach((f) => zip.file(safeName(f.name), String(f.content || '')));
  const b64 = await zip.generateAsync({ type: 'base64' });
  return writeFlat(zipName, b64, FileSystem.EncodingType.Base64);
};
