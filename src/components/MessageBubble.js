// src/components/MessageBubble.js
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../theme';

// Separa el texto en partes normales y bloques de código (```lenguaje ... ```)
// Un bloque sin cerrar (la IA todavía está escribiendo) se muestra como código abierto.
const parseParts = (text) => {
  const parts = [];
  const re = /```([^\n`]*)\n?([\s\S]*?)(```|$)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', text: text.slice(last, m.index) });
    parts.push({ type: 'code', lang: m[1].trim(), code: m[2].replace(/\n$/, ''), open: m[3] !== '```' });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) });
  return parts;
};

function CodeBlock({ part, streaming }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(part.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };
  const writing = streaming && part.open;
  return (
    <View style={styles.codeBox}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLang}>{(part.lang || 'código') + (writing ? ' · escribiendo…' : '')}</Text>
        <TouchableOpacity onPress={copy}>
          <Text style={styles.codeCopy}>{copied ? '✓ Copiado' : 'Copiar'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.code}>
        {part.code}
        {writing ? '▌' : ''}
      </Text>
    </View>
  );
}

export default function MessageBubble({ msg, onSpeak, speaking, streaming, onLongPress, onCopy }) {
  const isUser = msg.role === 'user';
  const isText = msg.type === 'text';
  const parts = isText ? parseParts(msg.text || '') : [];

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowBot]}>
      <Pressable
        onLongPress={() => onLongPress && onLongPress(msg)}
        delayLongPress={350}
        style={[styles.bubble, isUser ? styles.user : styles.bot, msg.isError && styles.error]}
      >
        {msg.fileName ? <Text style={styles.file}>📎 {msg.fileName}</Text> : null}

        {msg.type === 'image' ? (
          <Image source={{ uri: msg.uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <>
            {parts.map((p, i) =>
              p.type === 'code' ? (
                <CodeBlock key={i} part={p} streaming={streaming} />
              ) : (
                <Text key={i} style={styles.text}>
                  {p.text}
                  {streaming && i === parts.length - 1 ? '▌' : ''}
                </Text>
              )
            )}
            {streaming && parts.length === 0 ? <Text style={styles.text}>▌</Text> : null}
          </>
        )}

        {!isUser && isText && !msg.isError && !streaming && msg.text ? (
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => onSpeak(msg)} disabled={speaking} style={styles.action}>
              <Text style={styles.actionText}>{speaking ? 'Generando voz…' : '🔊 Escuchar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onCopy && onCopy(msg)} style={styles.action}>
              <Text style={styles.actionText}>Copiar</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, marginVertical: 4, flexDirection: 'row' },
  rowUser: { justifyContent: 'flex-end' },
  rowBot: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '90%', padding: 12, borderRadius: radius.lg },
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
  actions: { flexDirection: 'row', marginTop: 10 },
  action: { paddingVertical: 4, marginRight: 18 },
  actionText: { color: colors.accent, fontSize: 13.5 },
  codeBox: {
    backgroundColor: colors.bg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    marginVertical: 6, overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surfaceHigh,
  },
  codeLang: { color: colors.textDim, fontSize: 12 },
  codeCopy: { color: colors.accent, fontSize: 12.5, fontWeight: '600' },
  code: { color: colors.text, fontFamily: 'monospace', fontSize: 13, lineHeight: 19, padding: 10 },
});
