// src/components/ChatInterface.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet, StatusBar,
} from 'react-native';
import { colors, radius } from '../theme';
import MessageBubble from './MessageBubble';
import Menu, { MODES } from './Menu';
import SettingsModal from './SettingsModal';
import { fetchAIResponse, hasClaudeKey } from './services/aiService';
import { generateImage, speak, isImageRequest } from './services/geminiService';
import { pickAndReadFile } from './services/utils/fileHandler';

const SUGGESTIONS = [
  'Dibuja un dragón de cristal',
  'Explícame qué hace este código',
  'Escríbeme un poema corto',
];

let counter = 0;
const uid = () => `${Date.now()}_${counter++}`;

// Historial de texto para que Claude recuerde la conversación
const buildHistory = (messages) => {
  const h = messages
    .filter((m) => m.type === 'text' && !m.isError && m.text)
    .slice(-20)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
  while (h.length && h[0].role !== 'user') h.shift();
  return h;
};

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('auto');
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasKey, setHasKey] = useState(true);
  const [speakingId, setSpeakingId] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    hasClaudeKey().then(setHasKey);
  }, []);

  const addMessage = (m) => setMessages((prev) => [...prev, { id: uid(), ...m }]);

  const attachFile = async () => {
    try {
      const f = await pickAndReadFile();
      if (f) setFile(f);
    } catch (e) {
      addMessage({ role: 'bot', type: 'text', text: e.message || 'No se pudo leer el archivo.', isError: true });
    }
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !file) || loading) return;

    const prompt = text || 'Analiza este archivo.';
    const attached = file;
    const history = buildHistory(messages);

    addMessage({ role: 'user', type: 'text', text: prompt, fileName: attached?.name });
    setInput('');
    setFile(null);
    setLoading(true);

    try {
      const wantsImage = !attached && (mode === 'image' || (mode === 'auto' && isImageRequest(prompt)));

      if (wantsImage) {
        setLoadingText('Generando imagen…');
        const res = await generateImage(prompt);
        if (res.uri) addMessage({ role: 'bot', type: 'image', uri: res.uri });
        else addMessage({ role: 'bot', type: 'text', text: res.error, isError: true });
      } else {
        setLoadingText('Pensando…');
        const res = await fetchAIResponse(prompt, attached, history);
        addMessage({ role: 'bot', type: 'text', text: res.text, isError: !!res.isError });
        if (mode === 'voice' && !res.isError) {
          setLoadingText('Generando voz…');
          const v = await speak(res.text);
          if (v.error) addMessage({ role: 'bot', type: 'text', text: v.error, isError: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const onSpeak = async (msg) => {
    setSpeakingId(msg.id);
    const v = await speak(msg.text);
    setSpeakingId(null);
    if (v.error) addMessage({ role: 'bot', type: 'text', text: v.error, isError: true });
  };

  const modeTitle = MODES.find((m) => m.id === mode)?.title;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>DIAcorks IA</Text>
          <Text style={styles.subtitle}>Modo: {modeTitle}</Text>
        </View>
      </View>

      {!hasKey ? (
        <TouchableOpacity style={styles.banner} onPress={() => setSettingsOpen(true)}>
          <Text style={styles.bannerText}>Falta tu API key de Claude. Toca aquí para agregarla.</Text>
        </TouchableOpacity>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>¿Qué hacemos hoy?</Text>
            <Text style={styles.emptyText}>
              Pregunta lo que sea, adjunta un archivo o pide una imagen.
            </Text>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.chip} onPress={() => setInput(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble msg={item} onSpeak={onSpeak} speaking={speakingId === item.id} />
            )}
            contentContainerStyle={{ paddingVertical: 10 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        ) : null}

        {file ? (
          <View style={styles.fileChip}>
            <Text style={styles.fileChipText} numberOfLines={1}>📎 {file.name}</Text>
            <TouchableOpacity onPress={() => setFile(null)}>
              <Text style={styles.fileRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <TouchableOpacity onPress={attachFile} style={styles.iconBtn} disabled={loading}>
            <Text style={styles.iconBtnText}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colors.textDim}
            multiline
          />
          <TouchableOpacity onPress={send} style={[styles.sendBtn, loading && { opacity: 0.5 }]} disabled={loading}>
            <Text style={styles.sendText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Menu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        mode={mode}
        onChangeMode={setMode}
        onNewChat={() => { setMessages([]); setFile(null); }}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onKeyChanged={() => hasClaudeKey().then(setHasKey)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 40,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface,
  },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  menuIcon: { color: colors.accent, fontSize: 24 },
  title: { color: colors.accent, fontSize: 19, fontWeight: 'bold' },
  subtitle: { color: colors.textDim, fontSize: 12.5 },
  banner: { backgroundColor: colors.surfaceHigh, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.danger },
  bannerText: { color: colors.text, fontSize: 13.5, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  emptyText: { color: colors.textDim, fontSize: 15, lineHeight: 21, marginBottom: 20 },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12,
    paddingHorizontal: 14, marginBottom: 8, backgroundColor: colors.surface,
  },
  chipText: { color: colors.text, fontSize: 14.5 },
  loading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8 },
  loadingText: { color: colors.textDim, marginLeft: 10, fontSize: 14 },
  fileChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 12,
    marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  fileChipText: { color: colors.text, fontSize: 13.5, flex: 1 },
  fileRemove: { color: colors.textDim, fontSize: 16, paddingLeft: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, borderTopColor: colors.border },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 22 },
  input: {
    flex: 1, maxHeight: 120, backgroundColor: colors.surface, color: colors.text, borderRadius: radius.lg,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15.5, borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    marginLeft: 8, height: 44, justifyContent: 'center', backgroundColor: colors.accent,
    paddingHorizontal: 18, borderRadius: radius.lg,
  },
  sendText: { color: colors.onAccent, fontWeight: 'bold', fontSize: 15 },
});
