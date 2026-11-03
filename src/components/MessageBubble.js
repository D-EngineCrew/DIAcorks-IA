// src/components/MessageBubble.js
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function MessageBubble({ msg, onSpeak, speaking }) {
  const isUser = msg.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowBot]}>
      <View style={[styles.bubble, isUser ? styles.user : styles.bot, msg.isError && styles.error]}>
        {msg.fileName ? <Text style={styles.file}>📎 {msg.fileName}</Text> : null}

        {msg.type === 'image' ? (
          <Image source={{ uri: msg.uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.text} selectable>
            {msg.text}
          </Text>
        )}

        {!isUser && msg.type === 'text' && !msg.isError ? (
          <TouchableOpacity onPress={() => onSpeak(msg)} disabled={speaking} style={styles.speak}>
            <Text style={styles.speakText}>{speaking ? 'Generando voz…' : '🔊 Escuchar'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, marginVertical: 4, flexDirection: 'row' },
  rowUser: { justifyContent: 'flex-end' },
  rowBot: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '86%', padding: 12, borderRadius: radius.lg },
  user: { backgroundColor: colors.user, borderBottomRightRadius: radius.sm },
  bot: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { borderColor: colors.danger },
  text: { color: colors.text, fontSize: 15.5, lineHeight: 22 },
  file: { color: colors.text, opacity: 0.8, fontSize: 13, marginBottom: 6 },
  image: { width: 270, height: 270, borderRadius: radius.md },
  speak: { marginTop: 10, alignSelf: 'flex-start', paddingVertical: 4 },
  speakText: { color: colors.accent, fontSize: 13.5 },
});
