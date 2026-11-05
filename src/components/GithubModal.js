// src/components/GithubModal.js
// Conector de GitHub: conectar con un token, explorar tus repos y traer un archivo al chat,
// o subir un archivo creado por la IA (modo "subir").
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Linking, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius } from '../theme';
import {
  getGithubUser, connectGithub, disconnectGithub, listRepos, listContents, readRepoFile, putRepoFile,
} from './services/githubService';

export default function GithubModal({ visible, onClose, onConnectionChanged, onPickFile, upload }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [repos, setRepos] = useState([]);
  const [repo, setRepo] = useState(null); // "usuario/repositorio"
  const [path, setPath] = useState('');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadPath, setUploadPath] = useState('');
  const [commitMsg, setCommitMsg] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setMessage('');
    try {
      return await fn();
    } catch (e) {
      setMessage(String((e && e.message) || e));
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const loadRepos = () =>
    run(async () => {
      const list = await listRepos();
      setRepos(list.map((r) => r.full_name));
    });

  useEffect(() => {
    if (!visible) return;
    setToken('');
    setMessage('');
    setRepo(null);
    setPath('');
    setItems([]);
    if (upload) {
      setUploadPath(upload.name);
      setCommitMsg(`Agregar ${upload.name} desde DIAcorks`);
    }
    getGithubUser().then((u) => {
      setUser(u);
      if (u) loadRepos();
    });
  }, [visible]);

  const connect = () =>
    run(async () => {
      const u = await connectGithub(token);
      setUser(u);
      setToken('');
      onConnectionChanged && onConnectionChanged(u);
      const list = await listRepos();
      setRepos(list.map((r) => r.full_name));
    });

  const disconnect = async () => {
    await disconnectGithub();
    setUser(null);
    setRepos([]);
    setRepo(null);
    onConnectionChanged && onConnectionChanged(null);
  };

  const openFolder = (r, p) =>
    run(async () => {
      const list = await listContents(r, p);
      setRepo(r);
      setPath(p);
      setItems(list);
    });

  const goUp = () => {
    if (!path) { setRepo(null); setItems([]); return; }
    openFolder(repo, path.split('/').slice(0, -1).join('/'));
  };

  const pickItem = (it) => {
    if (it.type === 'dir') return openFolder(repo, it.path);
    return run(async () => {
      const f = await readRepoFile(repo, it.path);
      onPickFile && onPickFile(f);
      onClose();
    });
  };

  const doUpload = () =>
    run(async () => {
      if (!repo) throw new Error('Elige un repositorio.');
      if (!uploadPath.trim()) throw new Error('Escribe la ruta del archivo.');
      const url = await putRepoFile(repo, uploadPath.trim().replace(/^\/+/, ''), upload.content, commitMsg);
      setMessage('✓ Subido: ' + url);
    });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{upload ? 'Subir a GitHub' : 'GitHub'}</Text>

            {!user ? (
              <>
                <Text style={styles.hint}>
                  Conecta tu cuenta con un token personal. Créalo en github.com/settings/tokens con permiso "repo"
                  (o, en tokens de acceso limitado, "Contents: lectura y escritura" solo en los repos que quieras).
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://github.com/settings/tokens')}>
                  <Text style={styles.link}>Abrir github.com/settings/tokens</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={token}
                  onChangeText={setToken}
                  placeholder="ghp_... o github_pat_..."
                  placeholderTextColor={colors.textDim}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.primary} onPress={connect} disabled={busy}>
                  <Text style={styles.primaryText}>Conectar</Text>
                </TouchableOpacity>
                <Text style={styles.hint}>El token se guarda solo en este teléfono.</Text>
              </>
            ) : (
              <>
                <View style={styles.userRow}>
                  <Text style={styles.userText}>✓ Conectado como @{user.login}</Text>
                  <TouchableOpacity onPress={disconnect}>
                    <Text style={styles.danger}>Desconectar</Text>
                  </TouchableOpacity>
                </View>

                {upload ? (
                  <>
                    <Text style={styles.label}>Archivo: {upload.name}</Text>
                    <Text style={styles.label}>Repositorio</Text>
                    {repos.map((r) => (
                      <TouchableOpacity key={r} style={[styles.row, repo === r && styles.rowActive]} onPress={() => setRepo(r)}>
                        <Text style={styles.rowText}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                    <Text style={styles.label}>Ruta en el repo</Text>
                    <TextInput style={styles.input} value={uploadPath} onChangeText={setUploadPath}
                      autoCapitalize="none" autoCorrect={false} placeholderTextColor={colors.textDim} />
                    <Text style={styles.label}>Mensaje del commit</Text>
                    <TextInput style={styles.input} value={commitMsg} onChangeText={setCommitMsg}
                      placeholderTextColor={colors.textDim} />
                    <TouchableOpacity style={styles.primary} onPress={doUpload} disabled={busy}>
                      <Text style={styles.primaryText}>Subir</Text>
                    </TouchableOpacity>
                  </>
                ) : !repo ? (
                  <>
                    <Text style={styles.label}>Elige un repositorio para traer un archivo al chat</Text>
                    {repos.map((r) => (
                      <TouchableOpacity key={r} style={styles.row} onPress={() => openFolder(r, '')}>
                        <Text style={styles.rowText}>📁 {r}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <>
                    <TouchableOpacity onPress={goUp}>
                      <Text style={styles.link}>← {repo}/{path}</Text>
                    </TouchableOpacity>
                    {items.map((it) => (
                      <TouchableOpacity key={it.path} style={styles.row} onPress={() => pickItem(it)}>
                        <Text style={styles.rowText}>{it.type === 'dir' ? '📁' : '📄'} {it.name}</Text>
                      </TouchableOpacity>
                    ))}
                    {items.length === 0 && !busy ? <Text style={styles.hint}>Carpeta vacía.</Text> : null}
                  </>
                )}
              </>
            )}

            {busy ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} /> : null}
            {message ? <Text style={[styles.message, message.startsWith('✓') ? null : { color: colors.danger }]}>{message}</Text> : null}

            <TouchableOpacity style={styles.secondary} onPress={onClose}>
              <Text style={styles.secondaryText}>Cerrar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  card: {
    backgroundColor: colors.surface, padding: 20, maxHeight: '90%',
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  hint: { color: colors.textDim, fontSize: 12.5, marginTop: 6, lineHeight: 17 },
  link: { color: colors.accent, fontSize: 14, marginTop: 8, marginBottom: 4 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 14 },
  input: {
    backgroundColor: colors.bg, color: colors.text, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginTop: 8,
  },
  primary: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  primaryText: { color: colors.onAccent, fontWeight: 'bold', fontSize: 15 },
  secondary: { paddingVertical: 14, alignItems: 'center' },
  secondaryText: { color: colors.textDim, fontSize: 15 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userText: { color: colors.accent, fontSize: 14.5 },
  danger: { color: colors.danger, fontSize: 14 },
  row: {
    padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    marginTop: 8, backgroundColor: colors.bg,
  },
  rowActive: { borderColor: colors.accent },
  rowText: { color: colors.text, fontSize: 14.5 },
  message: { color: colors.accent, fontSize: 13.5, marginTop: 12 },
});
