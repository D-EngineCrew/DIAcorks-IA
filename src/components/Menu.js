// src/components/Menu.js
// Menú lateral que se desliza desde la izquierda
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, Animated, StyleSheet, Platform, StatusBar } from 'react-native';
import { colors, radius } from '../theme';

const PANEL_W = 300;

export const MODES = [
  { id: 'auto', title: 'Automático', desc: 'Claude responde. Si pides una imagen, la dibuja Gemini.' },
  { id: 'claude', title: 'Solo Claude', desc: 'Texto, código y archivos.' },
  { id: 'image', title: 'Imágenes', desc: 'Cada mensaje genera una imagen con Gemini.' },
  { id: 'voice', title: 'Respuestas con voz', desc: 'Claude responde y Gemini lo lee en voz alta.' },
];

export default function Menu({ visible, onClose, mode, onChangeMode, onNewChat, onOpenSettings }) {
  const x = useRef(new Animated.Value(-PANEL_W)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(x, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(x, { toValue: -PANEL_W, duration: 180, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.panel, { transform: [{ translateX: x }] }]}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>D</Text>
            </View>
            <View>
              <Text style={styles.brandName}>DIAcorks IA</Text>
              <Text style={styles.brandSub}>Claude + Gemini</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.newChat} onPress={() => { onNewChat(); onClose(); }}>
            <Text style={styles.newChatText}>＋  Nuevo chat</Text>
          </TouchableOpacity>

          <Text style={styles.section}>Modo</Text>
          {MODES.map((m) => {
            const active = m.id === mode;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.mode, active && styles.modeActive]}
                onPress={() => { onChangeMode(m.id); onClose(); }}
              >
                <Text style={[styles.modeTitle, active && styles.modeTitleActive]}>{m.title}</Text>
                <Text style={styles.modeDesc}>{m.desc}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ flex: 1 }} />

          <TouchableOpacity style={styles.item} onPress={() => { onClose(); onOpenSettings(); }}>
            <Text style={styles.itemText}>⚙️  Configuración</Text>
          </TouchableOpacity>
          <Text style={styles.version}>DIAcorks v1.0.0 · DF-PM Projects</Text>
        </Animated.View>

        <Pressable style={styles.overlay} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  panel: {
    width: PANEL_W,
    backgroundColor: colors.surface,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 40) + 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logo: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  logoText: { color: colors.onAccent, fontSize: 22, fontWeight: 'bold' },
  brandName: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  brandSub: { color: colors.textDim, fontSize: 13 },
  newChat: {
    backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12,
    alignItems: 'center', marginBottom: 22,
  },
  newChatText: { color: colors.onAccent, fontWeight: 'bold', fontSize: 15 },
  section: { color: colors.textDim, fontSize: 13, marginBottom: 8, marginLeft: 4 },
  mode: { padding: 12, borderRadius: radius.md, marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  modeActive: { backgroundColor: colors.surfaceHigh, borderColor: colors.accent },
  modeTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  modeTitleActive: { color: colors.accent },
  modeDesc: { color: colors.textDim, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  item: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
  itemText: { color: colors.text, fontSize: 15 },
  version: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 14 },
});
