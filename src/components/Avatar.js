// src/components/Avatar.js
// Foto de perfil, o la inicial del nombre si no hay foto
import React from 'react';
import { View, Text, Image } from 'react-native';
import { colors } from '../theme';

export default function Avatar({ profile, size = 40 }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (profile && profile.photoUri) {
    return <Image source={{ uri: profile.photoUri }} style={style} />;
  }
  const initial = profile && profile.name ? profile.name.trim().charAt(0).toUpperCase() : '👤';
  return (
    <View style={[style, { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: colors.onAccent, fontWeight: 'bold', fontSize: size * 0.45 }}>{initial}</Text>
    </View>
  );
}
