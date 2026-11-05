// src/components/MessageBubble.js
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../theme';
import { parseMessage, isHtmlFile } from './services/codeParser';
import { lintCode } from './services/codeLinter';

function CodeBlock({ part, file, streaming, canUpload, onSaveFile, onPreview, onFix, onUpload }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(part.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };
  const writing = streaming && part.open;
  const title = file ? file.name : part.lang || 'código';
  // Revisión de sintaxis automática (solo cuando ya terminó de escribirse)
  const issues = !writing && !streaming ? lintCode(part.code, file ? file.name : part.lang) : [];

  return (
    <View style={styles.codeBox}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLang} numberOfLines={1}>{title + (writing ? ' · escribiendo…' : '')}</Text>
        <View style={styles.codeBtns}>
          {file && isHtmlFile(file) ? (
            <TouchableOpacity onPress={() => onPreview && onPreview(file)}>
              <Text style={styles.codeBtn}>▶ Vista previa</Text>
            </TouchableOpacity>
          ) : null}
          {file ? (
            <TouchableOpacity onPress={() => onSaveFile && onSaveFile(file)}>
              <Text style={styles.codeBtn}>Guardar</Text>
            </TouchableOpacity>
          ) : null}
          {file && canUpload ? (
            <TouchableOpacity onPress={() => onUpload && onUpload(file)}>
              <Text style={styles.codeBtn}>GitHub</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={copy}>
            <Text style={styles.codeBtn}>{copied ? '✓ Copiado' : 'Copiar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.code}>
        {part.code}
        {writing ? '▌' : ''}
      </Text>
      {issues.length ? (
        <View style={styles.warn}>
          <Text style={styles.warnTitle}>⚠ {issues.length === 1 ? 'Posible error' : `${issues.length} posibles errores`}</Text>
          {issues.slice(0, 3).map((it, i) => (
            <Text key={i} style={styles.warnText}>
              {it.line ? `Línea ${it.line}: ` : ''}{it.message}
            </Text>
          ))}
          {issues.length > 3 ? <Text style={styles.warnText}>… y {issues.length - 3} más</Text> : null}
          {file && onFix ? (
            <TouchableOpacity onPress={() => onFix(file, issues)} style={styles.fixBtn}>
              <Text style={styles.fixText}>🛠 Pedir a la IA que lo arregle</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function MessageBubble({
  msg, onSpeak, speaking, streaming, onLongPress, onCopy, onSaveFile, onPreview, onZip, onFix, onUpload, canUpload,
}) {
  const isUser = msg.role === 'user';
  const isText = msg.type === 'text';
  // Cuando la IA ya terminó, un bloque sin cerrar (respuesta cortada) también cuenta como archivo
  const { parts, files } = isText ? parseMessage(msg.text || '', !streaming) : { parts: [], files: [] };

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
                <CodeBlock
                  key={i}
                  part={p}
                  file={p.fileIndex !== undefined ? files[p.fileIndex] : null}
                  streaming={streaming}
                  canUpload={canUpload}
                  onSaveFile={onSaveFile}
                  onPreview={(f) => onPreview && onPreview(files, f)}
                  onFix={isUser ? null : onFix}
                  onUpload={onUpload}
                />
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
            {files.length >= 2 ? (
              <TouchableOpacity onPress={() => onZip && onZip(files)} style={styles.action}>
                <Text style={styles.actionText}>📦 ZIP ({files.length})</Text>
              </TouchableOpacity>
            ) : null}
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
  bubble: { maxWidth: '92%', padding: 12, borderRadius: radius.lg },
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
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
  codeLang: { color: colors.textDim, fontSize: 12, flexShrink: 1, marginRight: 8 },
  codeBtns: { flexDirection: 'row' },
  codeBtn: { color: colors.accent, fontSize: 12.5, fontWeight: '600', marginLeft: 12 },
  code: { color: colors.text, fontFamily: 'monospace', fontSize: 13, lineHeight: 19, padding: 10 },
  warn: { borderTopWidth: 1, borderTopColor: colors.border, padding: 10, backgroundColor: '#2a1a1f' },
  warnTitle: { color: colors.danger, fontSize: 12.5, fontWeight: '700', marginBottom: 4 },
  warnText: { color: colors.text, fontSize: 12.5, lineHeight: 18 },
  fixBtn: { marginTop: 8, alignSelf: 'flex-start' },
  fixText: { color: colors.accent, fontSize: 12.5, fontWeight: '600' },
});
