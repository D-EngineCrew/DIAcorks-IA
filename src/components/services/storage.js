// src/components/services/storage.js
// La API key de Claude se guarda cifrada en el teléfono (no en el código ni en GitHub)
import * as SecureStore from 'expo-secure-store';

const CLAUDE_KEY = 'diacorks_claude_api_key';

export const saveClaudeKey = (key) => SecureStore.setItemAsync(CLAUDE_KEY, key.trim());

export const getClaudeKey = async () => {
  try {
    return await SecureStore.getItemAsync(CLAUDE_KEY);
  } catch (e) {
    return null;
  }
};

export const deleteClaudeKey = () => SecureStore.deleteItemAsync(CLAUDE_KEY);
