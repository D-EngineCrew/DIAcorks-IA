// src/components/SettingsModal.js
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius } from '../theme';
import { getMemoryNotes, saveMemoryNotes } from './services/storage';
import {
  isModelReady, downloadModel, cancelDownload, deleteModel, MODEL_SIZE_TEXT,
} from './services/localModel';

export default function SettingsModal({ visible, onClose, onKeyChanged }) {
  const [ready, setReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [notesMessage, setNotesMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setMessage('');
      setNotesMessage('');
      isModelReady().then(setReady);
      getMemoryNotes().then(setNotes);
    }
  }, [visible]);

  const download = async () => {
    setDownloading(true);
    setProgress(0);
    setMessage('Descargando el modelo… no cierres la app.');
    try {
      await downloadModel(setProgress);
      setReady(true);
      setMessage('Modelo listo. Ya puedes chatear sin internet.');
      onKeyChanged && onKeyChanged(true);
    } catch (e) {
      setMessage('Error al descargar: ' + (e.message || e));
    } finally {
      setDownloading(false);
    }
  };

  const cancel = async () => {
    await cancelDownload();
    setDownloading(false);
    setMessage('Descarga cancelada.');
  };

  const remove = async () => {
    await deleteModel();
    setReady(false);
    setMessage('Modelo borrado.');
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

            <Text style={styles.label}>IA en tu teléfono</Text>
            <Text style={styles.status}>
              {ready ? '✓ Modelo descargado' : `Todavía no hay modelo (${MODEL_SIZE_TEXT}, descárgalo con Wi‑Fi)`}
            </Text>
            {downloading ? (
              <Text style={styles.hint}>Progreso: {Math.round(progress * 100)}%</Text>
            ) : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}

            {!ready && !downloading ? (
              <TouchableOpacity style={styles.primary} onPress={download}>
                <Text style={styles.primaryText}>Descargar modelo</Text>
              </TouchableOpacity>
            ) : null}
            {downloading ? (
              <TouchableOpacity style={styles.secondary} onPress={cancel}>
                <Text style={styles.dangerText}>Cancelar descarga</Text>
              </TouchableOpacity>
            ) : null}
            {ready ? (
              <TouchableOpacity style={styles.secondary} onPress={remove}>
                <Text style={styles.dangerText}>Borrar modelo</Text>
              </TouchableOpacity>
            ) : null}

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
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
});
