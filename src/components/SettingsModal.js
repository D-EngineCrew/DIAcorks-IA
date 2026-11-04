// src/components/SettingsModal.js
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius } from '../theme';
import { getMemoryNotes, saveMemoryNotes } from './services/storage';
import {
  MODELS, getDownloadedMap, downloadModel, cancelDownload, deleteModel,
} from './services/localModel';

export default function SettingsModal({ visible, onClose, onKeyChanged, selectedId }) {
  const [downloaded, setDownloaded] = useState({});
  const [downloadingId, setDownloadingId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [notesMessage, setNotesMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setMessage('');
      setNotesMessage('');
      getDownloadedMap().then(setDownloaded);
      getMemoryNotes().then(setNotes);
    }
  }, [visible]);

  const nameOf = (id) => (MODELS.find((m) => m.id === id) || {}).name || id;

  const download = async (id) => {
    if (downloadingId) return;
    setDownloadingId(id);
    setProgress(0);
    setMessage(`Descargando ${nameOf(id)}… no cierres la app.`);
    try {
      await downloadModel(id, setProgress);
      setDownloaded((d) => ({ ...d, [id]: true }));
      setMessage(`${nameOf(id)} listo. Ya puedes usarlo sin internet.`);
      onKeyChanged && onKeyChanged(true);
    } catch (e) {
      setMessage('Error al descargar: ' + (e.message || e));
    } finally {
      setDownloadingId(null);
    }
  };

  const cancel = async () => {
    const id = downloadingId;
    await cancelDownload(id);
    setDownloadingId(null);
    setMessage('Descarga cancelada.');
  };

  const remove = async (id) => {
    await deleteModel(id);
    setDownloaded((d) => ({ ...d, [id]: false }));
    setMessage(`${nameOf(id)} borrado.`);
    onKeyChanged && onKeyChanged(false);
  };

  const saveNotes = async () => {
    try {
      await saveMemoryNotes(notes);
      setNotesMessage('Memoria guardada. La IA la usará en todos tus chats.');
    } catch (e) {
      setNotesMessage('No se pudo guardar la memoria.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Configuración</Text>

            <Text style={styles.label}>Modelos de IA</Text>
            <Text style={styles.hint}>Se descargan una sola vez (usa Wi‑Fi) y funcionan sin internet.</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            {MODELS.map((m) => {
              const isDown = !!downloaded[m.id];
              const isBusy = downloadingId === m.id;
              return (
                <View key={m.id} style={[styles.modelRow, m.id === selectedId && styles.modelRowSel]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modelName}>{m.name}{m.id === selectedId ? '  · seleccionado' : ''}</Text>
                    <Text style={styles.hint}>
                      {m.desc} · {m.sizeText}
                      {isBusy ? ` · ${Math.round(progress * 100)}%` : isDown ? ' · ✓ descargado' : ''}
                    </Text>
                  </View>
                  {isBusy ? (
                    <TouchableOpacity onPress={cancel} style={styles.smallBtn}>
                      <Text style={styles.dangerText}>Cancelar</Text>
                    </TouchableOpacity>
                  ) : isDown ? (
                    <TouchableOpacity onPress={() => remove(m.id)} style={styles.smallBtn} disabled={!!downloadingId}>
                      <Text style={styles.dangerText}>Borrar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => download(m.id)}
                      style={[styles.smallBtn, styles.smallPrimary, downloadingId && { opacity: 0.4 }]}
                      disabled={!!downloadingId}
                    >
                      <Text style={styles.smallPrimaryText}>Descargar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <View style={styles.divider} />

            <Text style={styles.label}>Memoria de la IA</Text>
            <Text style={styles.hint}>
              Escribe lo que la IA debe recordar siempre de ti: tu nombre, tus gustos, cómo quieres que te hable.
            </Text>
            <TextInput
              style={[styles.input, styles.notes]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Ej: Me llamo Luis. Háblame en tono relajado y con ejemplos de código."
              placeholderTextColor={colors.textDim}
              multiline
            />
            {notesMessage ? <Text style={styles.message}>{notesMessage}</Text> : null}
            <TouchableOpacity style={styles.primary} onPress={saveNotes}>
              <Text style={styles.primaryText}>Guardar memoria</Text>
            </TouchableOpacity>

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
    backgroundColor: colors.surface, padding: 20, maxHeight: '88%',
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  status: { color: colors.textDim, fontSize: 13, marginTop: 2, marginBottom: 10 },
  input: {
    backgroundColor: colors.bg, color: colors.text, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginTop: 8,
  },
  notes: { minHeight: 110, textAlignVertical: 'top' },
  hint: { color: colors.textDim, fontSize: 12.5, marginTop: 6, lineHeight: 17 },
  message: { color: colors.accent, fontSize: 13.5, marginTop: 10 },
  primary: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  primaryText: { color: colors.onAccent, fontWeight: 'bold', fontSize: 15 },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: colors.textDim, fontSize: 15 },
  dangerText: { color: colors.danger, fontSize: 15 },
  modelRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, marginTop: 10, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  modelRowSel: { borderColor: colors.accent },
  modelName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, marginLeft: 8 },
  smallPrimary: { backgroundColor: colors.accent, borderRadius: radius.md },
  smallPrimaryText: { color: colors.onAccent, fontWeight: 'bold', fontSize: 13.5 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
});
