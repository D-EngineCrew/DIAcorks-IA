// src/components/HtmlPreview.js
// Vista previa de una página HTML generada por la IA.
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

export default function HtmlPreview({ visible, html, title, onClose, onSave }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.bar}>
          <Text style={styles.title} numberOfLines={1}>{title || 'Vista previa'}</Text>
          <TouchableOpacity onPress={onSave}><Text style={styles.btn}>Guardar</Text></TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={styles.btn}>Cerrar</Text></TouchableOpacity>
        </View>
        {visible ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: html || '', baseUrl: 'https://localhost/' }}
            javaScriptEnabled
            domStorageEnabled
            style={styles.web}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: colors.surfaceHigh, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  btn: { color: colors.accent, fontSize: 14, fontWeight: '600', marginLeft: 16 },
  web: { flex: 1, backgroundColor: '#fff' },
});
