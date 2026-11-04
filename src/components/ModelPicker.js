// src/components/ModelPicker.js
// Botón junto al título que muestra los modelos y permite cambiar entre ellos
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, Platform, StatusBar } from 'react-native';
import { colors, radius } from '../theme';
import { MODELS, getDownloadedMap } from './services/localModel';

export default function ModelPicker({ selectedId, onSelect, onNeedDownload, disabled }) {
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState({});

  const selected = MODELS.find((m) => m.id === selectedId) || MODELS[0];

  const show = async () => {
    if (disabled) return;
    setOpen(true);
    setDownloaded(await getDownloadedMap());
  };

  const choose = (m) => {
    setOpen(false);
    if (downloaded[m.id]) onSelect(m.id);
    else onNeedDownload(m.id); // sin descargar: te lleva a Configuración
  };

  return (
    <>
      <TouchableOpacity style={[styles.pill, disabled && { opacity: 0.5 }]} onPress={show}>
        <Text style={styles.pillLabel}>Modelos</Text>
        <Text style={styles.pillName}>{selected.name} ▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.heading}>Modelos disponibles</Text>
            {MODELS.map((m) => {
              const isSel = m.id === selectedId;
              const isDown = !!downloaded[m.id];
              return (
                <TouchableOpacity key={m.id} style={[styles.row, isSel && styles.rowSel]} onPress={() => choose(m)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{m.name}</Text>
                    <Text style={styles.desc}>{m.desc}</Text>
                  </View>
                  <Text style={[styles.state, isDown ? styles.stateOk : styles.stateOff]}>
                    {isSel && isDown ? '✓ En uso' : isDown ? 'Listo' : `⬇ ${m.sizeText}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.footer}>Los que dicen ⬇ se descargan en Configuración.</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHigh, alignItems: 'flex-end',
  },
  pillLabel: { color: colors.textDim, fontSize: 10.5 },
  pillName: { color: colors.accent, fontSize: 14, fontWeight: 'bold' },
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'flex-end',
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 40) + 56, paddingHorizontal: 12,
  },
  dropdown: {
    width: 300, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: 10,
  },
  heading: { color: colors.textDim, fontSize: 12.5, marginBottom: 6, marginLeft: 6 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: radius.sm },
  rowSel: { backgroundColor: colors.surfaceHigh },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  desc: { color: colors.textDim, fontSize: 12, marginTop: 1 },
  state: { fontSize: 12.5, marginLeft: 8 },
  stateOk: { color: colors.accent },
  stateOff: { color: colors.textDim },
  footer: { color: colors.textDim, fontSize: 11.5, marginTop: 8, marginLeft: 6 },
});
