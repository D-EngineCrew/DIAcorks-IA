// src/components/ChatInterface.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet, StatusBar, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../theme';
import MessageBubble from './MessageBubble';
import Menu, { MODES } from './Menu';
import SettingsModal from './SettingsModal';
import ModelPicker from './ModelPicker';
import HtmlPreview from './HtmlPreview';
import ProfileModal from './ProfileModal';
import GithubModal from './GithubModal';
import { fetchAIResponse, hasAIKey, stopAIResponse } from './services/aiService';
import { getSelectedModelId, setSelectedModelId, generateTitle } from './services/localModel';
import { getActiveProfile, getActiveId } from './services/profileStore';
import { getGithubUser } from './services/githubService';
import { buildPreviewHtml } from './services/codeParser';
import { saveTextFile, saveZip } from './services/fileTools';
import { generateImage, speak, isImageRequest } from './services/geminiService';
import { pickAndReadFile } from './services/utils/fileHandler';
import { loadStore, saveStore, deleteLocalFile } from './services/chatStore';

const SUGGESTIONS = [
  'Dibuja un dragón de cristal',
  'Explícame qué hace este código',
  'Escríbeme un poema corto',
];

let counter = 0;
const uid = () => `${Date.now()}_${counter++}`;

const makeTitle = (messages) => {
  const first = messages.find((m) => m.role === 'user' && m.text);
  const t = (first ? first.text : 'Chat nuevo').replace(/\s+/g, ' ').trim();
  return t.length > 34 ? t.slice(0, 34) + '…' : t;
};

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
  const [modelId, setModelId] = useState('diacorks');
  const [generating, setGenerating] = useState(false);
  const [internetOn, setInternetOn] = useState(false);
  const [preview, setPreview] = useState(null); // { html, title, file }
  const [profile, setProfile] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [githubUser, setGithubUser] = useState(null);
  const [githubOpen, setGithubOpen] = useState(false);
  const [githubUpload, setGithubUpload] = useState(null); // archivo a subir, o null = explorar
  const [speakingId, setSpeakingId] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentId, setCurrentId] = useState(uid());
  const [ready, setReady] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    getSelectedModelId().then((id) => {
      setModelId(id);
      hasAIKey().then(setHasKey);
    });
  }, []);

  // Cambiar de modelo ya descargado
  const selectModel = async (id) => {
    await setSelectedModelId(id);
    setModelId(id);
    hasAIKey().then(setHasKey);
  };

  // Modelo sin descargar: se selecciona y te lleva a Configuración para descargarlo
  const needDownload = async (id) => {
    await selectModel(id);
    setSettingsOpen(true);
  };

  // Carga los chats del perfil activo (y abre el último)
  const loadForProfile = async () => {
    const id = await getActiveId();
    const store = await loadStore(id);
    const last = store.chats.find((c) => c.id === store.currentId) || store.chats[0];
    setChats(store.chats);
    setMessages(last ? last.messages : []);
    setCurrentId(last ? last.id : uid());
    setProfile(await getActiveProfile());
    setProfileId(id);
    setReady(true);
  };

  // Al abrir la app
  useEffect(() => {
    loadForProfile();
    getGithubUser().then(setGithubUser);
  }, []);

  // Cambió el perfil (o se cerró sesión): cada perfil tiene sus chats
  const onProfileChanged = () => {
    if (loading) return;
    setReady(false);
    setFile(null);
    loadForProfile();
  };

  // Cada vez que cambian los mensajes, actualiza el chat actual en el historial
  useEffect(() => {
    if (!ready || messages.length === 0) return;
    setChats((prev) => {
      const existing = prev.find((c) => c.id === currentId);
      if (existing && existing.messages === messages) return prev; // sin cambios (chat recién abierto)
      const chat = {
        id: currentId,
        title: existing && existing.autoTitle ? existing.title : makeTitle(messages),
        autoTitle: !!(existing && existing.autoTitle),
        updatedAt: Date.now(),
        messages,
      };
      return [chat, ...prev.filter((c) => c.id !== currentId)];
    });
  }, [messages, ready]);

  // Guarda en el teléfono (con una pequeña espera para no escribir a cada letra)
  useEffect(() => {
    if (!ready || !profileId) return undefined;
    const t = setTimeout(() => saveStore({ chats, currentId }, profileId), 400);
    return () => clearTimeout(t);
  }, [chats, currentId, ready, profileId]);

  // Sugiere un nombre según de qué va la conversación (se afina al hablar más)
  const refreshTitle = async (chatId, convo) => {
    try {
      const userMsgs = convo.filter((m) => m.role === 'user').length;
      if (![1, 3, 6, 12].includes(userMsgs)) return;
      const title = await generateTitle(convo);
      if (!title || title.length < 3) return;
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title, autoTitle: true } : c)));
    } catch (e) {
      console.log('No se pudo sugerir título:', e);
    }
  };

  const newChat = () => {
    if (loading) return;
    setMessages([]);
    setFile(null);
    setCurrentId(uid());
  };

  const openChat = (id) => {
    if (loading) return;
    const chat = chats.find((c) => c.id === id);
    if (!chat) return;
    setCurrentId(id);
    setMessages(chat.messages);
    setFile(null);
  };

  const deleteChat = (id) => {
    const chat = chats.find((c) => c.id === id);
    if (chat) chat.messages.forEach((m) => m.type === 'image' && deleteLocalFile(m.uri));
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (id === currentId) {
      setMessages([]);
      setCurrentId(uid());
    }
  };

  const addMessage = (m) => setMessages((prev) => [...prev, { id: uid(), ...m }]);

  const attachFile = async () => {
    try {
      const f = await pickAndReadFile();
      if (f) setFile(f);
    } catch (e) {
      addMessage({ role: 'bot', type: 'text', text: e.message || 'No se pudo leer el archivo.', isError: true });
    }
  };

  // textOverride/fileOverride: para "arreglar" un archivo sin tocar lo que escribiste en la caja
  const send = async (textOverride, fileOverride) => {
    const isOverride = typeof textOverride === 'string';
    const text = (isOverride ? textOverride : input).trim();
    const attached = fileOverride !== undefined ? fileOverride : file;
    if ((!text && !attached) || loading) return;

    const prompt = text || 'Analiza este archivo.';
    const history = buildHistory(messages);
    const chatId = currentId;

    addMessage({ role: 'user', type: 'text', text: prompt, fileName: attached?.name });
    if (!isOverride) {
      setInput('');
      setFile(null);
    }
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
        setGenerating(true);
        const botId = uid();
        setMessages((prev) => [...prev, { id: botId, role: 'bot', type: 'text', text: '', streaming: true }]);
        let lastUpdate = 0;
        const res = await fetchAIResponse(
          prompt,
          attached,
          history,
          (partial) => {
            const now = Date.now();
            if (now - lastUpdate > 100) {
              lastUpdate = now;
              setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, text: partial } : m)));
            }
          },
          {
            internet: internetOn,
            // Mientras busca en internet, el mensaje muestra el estado ("🌐 Buscando…")
            onStatus: (status) =>
              setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, text: status } : m))),
          }
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId ? { ...m, text: res.text, isError: !!res.isError, streaming: false } : m
          )
        );
        setGenerating(false);
        if (!res.isError) {
          refreshTitle(chatId, [...history, { role: 'user', content: prompt }, { role: 'assistant', content: res.text }]);
        }
        if (mode === 'voice' && !res.isError) {
          setLoadingText('Generando voz…');
          const v = await speak(res.text);
          if (v.error) addMessage({ role: 'bot', type: 'text', text: v.error, isError: true });
        }
      }
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const stop = () => stopAIResponse();

  // Archivos creados por la IA: guardar uno, guardar todo en ZIP, o ver la página
  const saveFile = async (file) => {
    try {
      const name = await saveTextFile(file.name, file.content);
      Alert.alert('Guardado', `Se guardó "${name}".`);
    } catch (e) {
      Alert.alert('No se pudo guardar', String((e && e.message) || e));
    }
  };

  const zipFiles = async (files) => {
    try {
      const name = await saveZip(files, 'proyecto-diacorks.zip');
      Alert.alert('Guardado', `Se guardó "${name}" con ${files.length} archivos.`);
    } catch (e) {
      Alert.alert('No se pudo crear el ZIP', String((e && e.message) || e));
    }
  };

  // "Pedir a la IA que lo arregle": envía el archivo con la lista de problemas
  const fixFile = (f, issues) =>
    send(
      `Corrige los errores de "${f.name}". Problemas detectados:\n` +
        issues.map((i) => `- ${i.line ? `Línea ${i.line}: ` : ''}${i.message}`).join('\n') +
        '\nDevuélvelo completo y corregido.',
      { type: 'text', name: f.name, content: f.content }
    );

  const openGithubUpload = (f) => {
    setGithubUpload(f);
    setGithubOpen(true);
  };

  const showPreview = (files, file) => {
    setPreview({ html: buildPreviewHtml(files, file), title: file.name, file });
  };

  // Mantener pulsado un mensaje: copiar o (si es tuyo) editar y reenviar
  const copyText = async (msg) => {
    try { await Clipboard.setStringAsync(msg.text || ''); } catch (e) {}
  };

  const editMessage = (msg) => {
    if (loading) return;
    const idx = messages.findIndex((m) => m.id === msg.id);
    if (idx < 0) return;
    setInput(msg.text || '');
    setMessages(messages.slice(0, idx));
    if (idx === 0) setChats((prev) => prev.filter((c) => c.id !== currentId));
  };

  const onMessageLongPress = (msg) => {
    if (msg.type !== 'text') return;
    const buttons = [{ text: 'Copiar', onPress: () => copyText(msg) }];
    if (msg.role === 'user') buttons.push({ text: 'Editar y reenviar', onPress: () => editMessage(msg) });
    buttons.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Mensaje', undefined, buttons);
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
        <ModelPicker
          selectedId={modelId}
          onSelect={selectModel}
          onNeedDownload={needDownload}
          disabled={loading}
        />
      </View>

      {!hasKey ? (
        <TouchableOpacity style={styles.banner} onPress={() => setSettingsOpen(true)}>
          <Text style={styles.bannerText}>Falta descargar el modelo seleccionado. Toca aquí para descargarlo.</Text>
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
              <MessageBubble
                msg={item}
                onSpeak={onSpeak}
                speaking={speakingId === item.id}
                streaming={loading && !!item.streaming}
                onLongPress={onMessageLongPress}
                onCopy={copyText}
                onSaveFile={saveFile}
                onPreview={showPreview}
                onZip={zipFiles}
                onFix={fixFile}
                onUpload={openGithubUpload}
                canUpload={!!githubUser}
              />
            )}
            contentContainerStyle={{ paddingVertical: 10 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {loading && !generating ? (
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
          <TouchableOpacity
            onPress={() => setInternetOn((v) => !v)}
            style={[styles.iconBtn, internetOn && styles.iconBtnOn]}
          >
            <Text style={styles.iconBtnText}>🌐</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colors.textDim}
            multiline
          />
          {generating ? (
            <TouchableOpacity onPress={stop} style={[styles.sendBtn, { backgroundColor: colors.danger }]}>
              <Text style={styles.sendText}>■ Detener</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => send()} style={[styles.sendBtn, loading && { opacity: 0.5 }]} disabled={loading}>
              <Text style={styles.sendText}>Enviar</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <Menu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        mode={mode}
        onChangeMode={setMode}
        onNewChat={newChat}
        onOpenSettings={() => setSettingsOpen(true)}
        chats={chats}
        currentId={currentId}
        onOpenChat={openChat}
        onDeleteChat={deleteChat}
        profile={profile}
        onOpenProfile={() => setProfileOpen(true)}
        githubUser={githubUser}
        onOpenGithub={() => { setGithubUpload(null); setGithubOpen(true); }}
      />
      <HtmlPreview
        visible={!!preview}
        html={preview ? preview.html : ''}
        title={preview ? preview.title : ''}
        onClose={() => setPreview(null)}
        onSave={() => preview && saveFile({ name: preview.file.name, content: preview.file.content })}
      />
      <ProfileModal visible={profileOpen} onClose={() => setProfileOpen(false)} onChanged={onProfileChanged} />
      <GithubModal
        visible={githubOpen}
        onClose={() => { setGithubOpen(false); setGithubUpload(null); }}
        upload={githubUpload}
        onConnectionChanged={setGithubUser}
        onPickFile={(f) => setFile(f)}
      />
      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onKeyChanged={() => hasAIKey().then(setHasKey)}
        selectedId={modelId}
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
  iconBtnOn: { backgroundColor: colors.surfaceHigh, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent },
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
