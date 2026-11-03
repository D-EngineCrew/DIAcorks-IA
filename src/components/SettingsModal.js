// src/components/SettingsModal.js
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, radius } from '../theme';
import { getClaudeKey, saveClaudeKey, deleteClaudeKey } from './services/storage';

export default function SettingsModal({ visible, onClose, onKeyChanged }) {
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setKey('');
      setMessage('');
      getClaudeKey().then((k) => setHasKey(!!k));
    }
  }, [visible]);

  const save = async () => {
    if (!key.trim().startsWith('sk-')) {
      setMessage('La clave debe empezar con "sk-". Cópiala completa desde tu cuenta de Anthropic.');
      return;
    }
    await saveClaudeKey(key);
    setHasKey(true);
    setKey('');
    setMessage('Clave guardada en este teléfono.');
    onKeyChanged && onKeyChanged(true);
  };

  const remove = async () => {
    await deleteClaudeKey();
    setHasKey(false);
    setMessage('Clave borrada.');
    onKeyChanged && onKeyChanged(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Configuración</Text>

          <Text style={styles.label}>API key de Claude</Text>
          <Text style={styles.status}>{hasKey ? '✓ Ya hay una clave guardada' : 'Todavía no hay clave guardada'}</Text>
          <TextInput
            style={styles.input}
            value={key}
            onChangeText={setKey}
            placeholder="sk-ant-..."
            placeholderTextColor={colors.textDim}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>La clave se guarda cifrada solo en este teléfono. No se sube a GitHub.</Text>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity style={styles.primary} onPress={save}>
            <Text style={styles.primaryText}>Guardar clave</Text>
          </TouchableOpacity>
          {hasKey ? (
            <TouchableOpacity style={styles.secondary} onPress={remove}>
              <Text style={styles.dangerText}>Borrar clave</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.secondary} onPress={onClose}>
            <Text style={styles.secondaryText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  card: {
    backgroundColor: colors.surface, padding: 20, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  status: { color: colors.textDim, fontSize: 13, marginTop: 2, marginBottom: 10 },
  input: {
    backgroundColor: colors.bg, color: colors.text, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  hint: { color: colors.textDim, fontSize: 12.5, marginTop: 8, lineHeight: 17 },
  message: { color: colors.accent, fontSize: 13.5, marginTop: 10 },
  primary: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  primaryText: { color: colors.onAccent, fontWeight: 'bold', fontSize: 15 },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: colors.textDim, fontSize: 15 },
  dangerText: { color: colors.danger, fontSize: 15 },
});
