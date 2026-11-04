// src/components/SettingsModal.js
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius } from '../theme';
import {
  getClaudeKey, saveClaudeKey, deleteClaudeKey, getMemoryNotes, saveMemoryNotes,
} from './services/storage';

export default function SettingsModal({ visible, onClose, onKeyChanged }) {
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [notesMessage, setNotesMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setKey('');
      setMessage('');
      setNotesMessage('');
      getClaudeKey().then((k) => setHasKey(!!k));
      getMemoryNotes().then(setNotes);
    }
  }, [visible]);

  const save = async () => {
    const clean = key.trim();
    if (!clean.startsWith('sk-')) {
      setMessage('La clave debe empezar con "sk-". Cópiala completa desde tu cuenta.');
      return;
    }
    try {
      await saveClaudeKey(clean);
      const back = await getClaudeKey();
      if (back !== clean) {
        setMessage('No se pudo verificar la clave guardada. Inténtalo otra vez.');
        return;
      }
      setHasKey(true);
      setKey('');
      setMessage('Clave guardada en este teléfono.');
      onKeyChanged && onKeyChanged(true);
    } catch (e) {
      setMessage('Error al guardar: ' + (e.message || e));
    }
  };

  const remove = async () => {
    await deleteClaudeKey();
    setHasKey(false);
    setMessage('Clave borrada.');
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

            <Text style={styles.label}>API key (OpenRouter o Claude)</Text>
            <Text style={styles.status}>{hasKey ? '✓ Ya hay una clave guardada' : 'Todavía no hay clave guardada'}</Text>
            <TextInput
              style={styles.input}
              value={key}
              onChangeText={setKey}
              placeholder="sk-or-v1-..."
              placeholderTextColor={colors.textDim}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>La clave se guarda solo en este teléfono. No se sube a GitHub.</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <TouchableOpacity style={styles.primary} onPress={save}>
              <Text style={styles.primaryText}>Guardar clave</Text>
            </TouchableOpacity>
            {hasKey ? (
              <TouchableOpacity style={styles.secondary} onPress={remove}>
                <Text style={styles.dangerText}>Borrar clave</Text>
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
