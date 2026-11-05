// src/components/ProfileModal.js
// Cuenta: perfiles guardados en este teléfono (nombre, correo, foto), cambiar de perfil y cerrar sesión
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius } from '../theme';
import Avatar from './Avatar';
import {
  loadProfiles, createProfile, updateProfile, switchProfile, deleteProfile, pickPhoto,
} from './services/profileStore';

export default function ProfileModal({ visible, onClose, onChanged }) {
  const [data, setData] = useState({ profiles: [], activeId: null });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');

  const active = data.profiles.find((p) => p.id === data.activeId) || null;

  const reload = async () => {
    const d = await loadProfiles();
    setData(d);
    const act = d.profiles.find((p) => p.id === d.activeId);
    setName(act ? act.name : '');
    setEmail(act ? act.email : '');
  };

  useEffect(() => {
    if (visible) {
      setCreating(false);
      setNewName('');
      setNewEmail('');
      setMessage('');
      reload();
    }
  }, [visible]);

  const changed = () => onChanged && onChanged();

  const saveActive = async () => {
    if (!name.trim()) return setMessage('Escribe un nombre.');
    await updateProfile(active.id, { name: name.trim(), email: email.trim() });
    setMessage('Guardado. La IA ya sabe cómo te llamas.');
    await reload();
    changed();
  };

  const changePhoto = async () => {
    try {
      const uri = await pickPhoto();
      if (uri) {
        await updateProfile(active.id, { photoUri: uri });
        await reload();
        changed();
      }
    } catch (e) {
      setMessage('No se pudo cambiar la foto: ' + (e.message || e));
    }
  };

  const create = async () => {
    if (!newName.trim()) return setMessage('Escribe un nombre para el perfil.');
    if (newEmail.trim() && !/\S+@\S+\.\S+/.test(newEmail.trim())) return setMessage('Ese correo no parece válido.');
    await createProfile({ name: newName, email: newEmail });
    setCreating(false);
    setNewName('');
    setNewEmail('');
    setMessage('Perfil creado y activado.');
    await reload();
    changed();
  };

  const switchTo = async (id) => {
    await switchProfile(id);
    setMessage(id ? 'Perfil cambiado.' : 'Sesión cerrada. Estás como invitado.');
    await reload();
    changed();
  };

  const confirmDelete = (p) => {
    Alert.alert('Borrar perfil', `¿Borrar "${p.name}" con sus chats y su memoria? No se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await deleteProfile(p.id);
          await reload();
          changed();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Cuenta</Text>

            <View style={styles.head}>
              <Avatar profile={active} size={64} />
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={styles.name}>{active ? active.name : 'Invitado'}</Text>
                <Text style={styles.hint}>{active ? active.email || 'Sin correo' : 'No has iniciado sesión'}</Text>
              </View>
            </View>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            {active ? (
              <>
                <Text style={styles.label}>Nombre (así te llama la IA)</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Tu nombre"
                  placeholderTextColor={colors.textDim} />
                <Text style={styles.label}>Correo (opcional)</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="tucorreo@gmail.com"
                  placeholderTextColor={colors.textDim} autoCapitalize="none" keyboardType="email-address" />
                <TouchableOpacity style={styles.primary} onPress={saveActive}>
                  <Text style={styles.primaryText}>Guardar cambios</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondary} onPress={changePhoto}>
                  <Text style={styles.linkText}>Cambiar foto de perfil</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.hint}>
                Crea un perfil para que la IA sepa cómo te llamas y para tener tus chats y tu memoria separados de otros perfiles.
              </Text>
            )}

            <View style={styles.divider} />
            <Text style={styles.label}>Perfiles en este teléfono</Text>
            {data.profiles.length === 0 ? <Text style={styles.hint}>Todavía no hay perfiles.</Text> : null}
            {data.profiles.map((p) => (
              <View key={p.id} style={[styles.row, p.id === data.activeId && styles.rowActive]}>
                <TouchableOpacity style={styles.rowMain} onPress={() => switchTo(p.id)}>
                  <Avatar profile={p} size={36} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.rowName}>{p.name}{p.id === data.activeId ? '  · activo' : ''}</Text>
                    {p.email ? <Text style={styles.hint}>{p.email}</Text> : null}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(p)} style={styles.del}>
                  <Text style={styles.delText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {creating ? (
              <View style={{ marginTop: 10 }}>
                <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Nombre"
                  placeholderTextColor={colors.textDim} />
                <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail}
                  placeholder="Correo (opcional)" placeholderTextColor={colors.textDim}
                  autoCapitalize="none" keyboardType="email-address" />
                <TouchableOpacity style={styles.primary} onPress={create}>
                  <Text style={styles.primaryText}>Crear perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondary} onPress={() => setCreating(false)}>
                  <Text style={styles.secondaryText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.primary} onPress={() => setCreating(true)}>
                <Text style={styles.primaryText}>＋  Nuevo perfil</Text>
              </TouchableOpacity>
            )}

            {active ? (
              <TouchableOpacity style={styles.secondary} onPress={() => switchTo(null)}>
                <Text style={styles.danger}>Cerrar sesión</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={[styles.hint, { marginTop: 8 }]}>
              Los perfiles se guardan solo en este teléfono: no usan contraseña ni se sincronizan.
            </Text>
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
  title: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 12 },
  hint: { color: colors.textDim, fontSize: 12.5, marginTop: 4, lineHeight: 17 },
  message: { color: colors.accent, fontSize: 13.5, marginTop: 8 },
  input: {
    backgroundColor: colors.bg, color: colors.text, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginTop: 8,
  },
  primary: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  primaryText: { color: colors.onAccent, fontWeight: 'bold', fontSize: 15 },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: colors.textDim, fontSize: 15 },
  linkText: { color: colors.accent, fontSize: 14.5 },
  danger: { color: colors.danger, fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
  row: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, marginTop: 8, backgroundColor: colors.bg,
  },
  rowActive: { borderColor: colors.accent },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10 },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  del: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  delText: { color: colors.textDim, fontSize: 15 },
});
