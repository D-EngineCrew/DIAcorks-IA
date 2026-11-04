// src/components/services/geminiService.js
// Gemini por Firebase AI Logic: IMÁGENES y VOZ (Claude se encarga del texto)
import { initializeApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend, ResponseModality } from 'firebase/ai';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { encode, decode } from 'base-64';

// Datos de tu google-services.json
const firebaseConfig = {
  apiKey: 'AIzaSyDsmIxvDyG02U46a7K645xc64b3dnUBOXc',
  projectId: 'diacorks',
  storageBucket: 'diacorks.firebasestorage.app',
  messagingSenderId: '868221483912',
  appId: '1:868221483912:android:e07b6acd9dacc2a7fe183d',
};

// Los nombres de modelos cambian seguido: revisa cuáles tienes en la consola de Firebase
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE_NAME = 'Kore';

const errText = (e) => String((e && e.message) || e).replace(/\s+/g, ' ').slice(0, 280);

let imageModel = null;
let ttsModel = null;

// Se inicializa solo cuando se usa por primera vez, así un fallo de Firebase no tumba el chat
const getModels = () => {
  if (!imageModel) {
    const app = initializeApp(firebaseConfig);
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    imageModel = getGenerativeModel(ai, {
      model: IMAGE_MODEL,
      generationConfig: { responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE] },
    });
    ttsModel = getGenerativeModel(ai, {
      model: TTS_MODEL,
      generationConfig: {
        responseModalities: [ResponseModality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
      },
    });
  }
  return { imageModel, ttsModel };
};

/** @returns {Promise<{ uri: string } | { error: string }>} */
export const generateImage = async (prompt) => {
  try {
    const result = await getModels().imageModel.generateContent(prompt);
    const parts = result.response.inlineDataParts();
    if (!parts || parts.length === 0) {
      return { error: 'Gemini no devolvió ninguna imagen. Prueba con otra descripción.' };
    }
    const { mimeType, data } = parts[0].inlineData;
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
    const dir = FileSystem.documentDirectory + 'imagenes/';
    try {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    } catch (e) {}
    const path = `${dir}img_${Date.now()}.${ext}`;
    await FileSystem.writeAsStringAsync(path, data, { encoding: FileSystem.EncodingType.Base64 });
    return { uri: path };
  } catch (error) {
    console.log('Error generando imagen:', error);
    return { error: `No se pudo generar la imagen.\nDetalle: ${errText(error)}` };
  }
};

// PCM crudo (24 kHz, 1 canal, 16 bits) -> WAV, para poder reproducirlo
const pcmBase64ToWavBase64 = (pcmBase64, sampleRate = 24000) => {
  const pcm = decode(pcmBase64);
  const dataLen = pcm.length;
  const u32 = (n) => String.fromCharCode(n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255);
  const u16 = (n) => String.fromCharCode(n & 255, (n >> 8) & 255);
  const header =
    'RIFF' + u32(36 + dataLen) + 'WAVE' +
    'fmt ' + u32(16) + u16(1) + u16(1) + u32(sampleRate) + u32(sampleRate * 2) + u16(2) + u16(16) +
    'data' + u32(dataLen);
  return encode(header + pcm);
};

let currentSound = null;

/** Convierte texto en voz y lo reproduce. @returns {Promise<{ ok: true } | { error: string }>} */
export const speak = async (text) => {
  try {
    const result = await getModels().ttsModel.generateContent(text.slice(0, 1500));
    const parts = result.response.inlineDataParts();
    if (!parts || parts.length === 0) {
      return { error: 'Gemini no devolvió audio.' };
    }

    const wavBase64 = pcmBase64ToWavBase64(parts[0].inlineData.data);
    const path = FileSystem.cacheDirectory + `voz_${Date.now()}.wav`;
    await FileSystem.writeAsStringAsync(path, wavBase64, { encoding: FileSystem.EncodingType.Base64 });

    if (currentSound) {
      await currentSound.unloadAsync();
      currentSound = null;
    }
    const { sound } = await Audio.Sound.createAsync({ uri: path }, { shouldPlay: true });
    currentSound = sound;
    return { ok: true };
  } catch (error) {
    console.log('Error generando voz:', error);
    return { error: `No se pudo generar la voz.\nDetalle: ${errText(error)}` };
  }
};

export const isImageRequest = (text) =>
  /\b(dibuja|dibújame|genera (una )?imagen|crea (una )?imagen|imagen de)\b/i.test(text);
