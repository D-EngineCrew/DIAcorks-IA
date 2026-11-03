// src/components/services/utils/fileHandler.js
// Manejo de archivos para DIAcorks (Expo SDK 50)
// Requiere: expo-file-system (ya lo tienes) y expo-document-picker
//   npx expo install expo-document-picker

import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

// Límite de tamaño (la API de Claude acepta ~32 MB por petición; base64 pesa ~33% más)
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

// Extensiones que se leen como texto plano (código, datos, etc.)
const TEXT_EXTENSIONS = [
  'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'kt', 'c', 'cpp',
  'h', 'cs', 'lua', 'hx', 'xml', 'html', 'css', 'csv', 'yml', 'yaml', 'log',
  'ini', 'sh', 'sql', 'gradle', 'properties',
];

// Tipos que se envían a Claude en base64 (imágenes y PDF)
const MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

const getExtension = (name = '') => {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

/**
 * Abre el selector de archivos del teléfono.
 * @returns {Promise<{uri, name, size, mimeType} | null>} null si cancela
 */
export const pickFile = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    size: asset.size,
    mimeType: asset.mimeType,
  };
};

/**
 * Lee un archivo y lo devuelve listo para usar con la IA.
 * - Archivos de texto/código -> { type: 'text', name, content }
 * - Imágenes y PDF           -> { type: 'inline', name, mimeType, data (base64) }
 */
export const readFile = async (file) => {
  const { uri, name } = file;
  const ext = getExtension(name);

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error('El archivo no existe o no se pudo acceder a él.');
  }
  if (info.size && info.size > MAX_FILE_SIZE) {
    throw new Error('El archivo es demasiado grande (máximo 15 MB).');
  }

  // Texto / código
  if (TEXT_EXTENSIONS.includes(ext)) {
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return { type: 'text', name, content };
  }

  // Imágenes y PDF
  const mimeType = MIME_TYPES[ext] || file.mimeType;
  if (mimeType && Object.values(MIME_TYPES).includes(mimeType)) {
    const data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { type: 'inline', name, mimeType, data };
  }

  throw new Error(`Formato no soportado: .${ext || 'desconocido'}`);
};

/**
 * Convierte el archivo leído en bloques de contenido para la API de Claude.
 * Uso: content: [...fileToContentBlocks(archivo), { type: 'text', text: prompt }]
 */
export const fileToContentBlocks = (fileData) => {
  if (!fileData) return [];

  if (fileData.type === 'text') {
    return [
      {
        type: 'text',
        text: `Archivo "${fileData.name}":\n\`\`\`\n${fileData.content}\n\`\`\``,
      },
    ];
  }

  const isPdf = fileData.mimeType === 'application/pdf';
  return [
    {
      type: isPdf ? 'document' : 'image',
      source: {
        type: 'base64',
        media_type: fileData.mimeType,
        data: fileData.data,
      },
    },
  ];
};

/**
 * Guarda texto (por ejemplo código generado por la IA) en el almacenamiento de la app.
 * @returns {Promise<string>} URI del archivo guardado
 */
export const saveTextFile = async (fileName, content) => {
  const uri = FileSystem.documentDirectory + fileName;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return uri;
};

/**
 * Atajo: abre el selector, lee el archivo y devuelve los datos listos.
 * @returns {Promise<object | null>}
 */
export const pickAndReadFile = async () => {
  const file = await pickFile();
  if (!file) return null;
  return readFile(file);
};
