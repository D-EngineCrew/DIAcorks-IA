// src/components/SettingsModal.js
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius } from '../theme';
import {
  getHfKey, saveHfKey, deleteHfKey, getHfModel, saveHfModel, getHfUrl, saveHfUrl,
  getMemoryNotes, saveMemoryNotes,
} from './services/storage';

export default function SettingsModal({ visible, onClose, onKeyChanged }) {
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState('');
  const [model, setModel] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [notesMessage, setNotesMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setKey('');
      setMessage('');
      setNotesMessage('');
      getHfKey().then((k) => setHasKey(!!k));
      getHfModel().then(setModel);
      getHfUrl().then(setUrl);
      getMemoryNotes().then(setNotes);
    }
  }, [visible]);

  const save = async () => {
    const clean = key.trim();
    if (!clean.startsWith('hf_')) {
      setMessage('El token debe empezar con "hf_". Cópialo completo desde huggingface.co/settings/tokens.');
      return;
    }
    try {
      await saveHfKey(clean);
      const back = await getHfKey();
      if (back !== clean) {
        setMessage('No se pudo verificar la clave guardada. Inténtalo otra vez.');
        return;
      }
      setHasKey(true);
      setKey('');
      setMessage('Token guardado en este teléfono.');
      onKeyChanged && onKeyChanged(true);
    } catch (e) {
      setMessage('Error al guardar: ' + (e.message || e));
    }
  };

  const remove = async () => {
    await deleteHfKey();
    setHasKey(false);
    setMessage('Token borrado.');
    onKeyChanged && onKeyChanged(false);
  };

  const saveModelSettings = async () => {
    try {
      await saveHfModel(model);
      await saveHfUrl(url);
      setMessage('Modelo y endpoint guardados.');
    } catch (e) {
      setMessage('No se pudo guardar: ' + (e.message || e));
    }
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

            <Text style={styles.label}>Token de Hugging Face</Text>
            <Text style={styles.status}>{hasKey ? '✓ Ya hay un token guardado' : 'Todavía no hay token guardado'}</Text>
            <TextInput
              style={styles.input}
              value={key}
              onChangeText={setKey}
              placeholder="hf_..."
              placeholderTextColor={colors.textDim}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>El token se guarda solo en este teléfono. No se sube a GitHub.</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <TouchableOpacity style={styles.primary} onPress={save}>
              <Text style={styles.primaryText}>Guardar token</Text>
            </TouchableOpacity>
            {hasKey ? (
              <TouchableOpacity style={styles.secondary} onPress={remove}>
                <Text style={styles.dangerText}>Borrar token</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.divider} />

            <Text style={styles.label}>Tu IA en Hugging Face</Text>
            <Text style={styles.hint}>Modelo: el ID de tu modelo, ej. tu-usuario/mi-ia</Text>
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder="tu-usuario/mi-ia"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Endpoint (opcional): solo si creaste un Inference Endpoint propio. Déjalo vacío para usar Inference Providers.
            </Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="https://xxxx.endpoints.huggingface.cloud/v1"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.primary} onPress={saveModelSettings}>
              <Text style={styles.primaryText}>Guardar modelo</Text>
            </TouchableOpacity>

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
