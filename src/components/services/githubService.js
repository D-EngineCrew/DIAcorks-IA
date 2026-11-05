// src/components/services/githubService.js
// Conector de GitHub con un token personal (no usa OAuth ni servidor).
// Crea el token en github.com/settings/tokens (permiso "repo", o "Contents: lectura y escritura").
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { encode, decode } from 'base-64';

const API = 'https://api.github.com';
const TOKEN_KEY = 'diacorks_github_token';
const TOKEN_FILE = FileSystem.documentDirectory + 'github_token.txt';
const USER_FILE = FileSystem.documentDirectory + 'github_user.json';
const MAX_READ_BYTES = 200 * 1024;

// ---- Guardado del token y del usuario ----
export const getGithubToken = async () => {
  try {
    const k = await SecureStore.getItemAsync(TOKEN_KEY);
    if (k) return k;
  } catch (e) {}
  try {
    const info = await FileSystem.getInfoAsync(TOKEN_FILE);
    if (info.exists) return (await FileSystem.readAsStringAsync(TOKEN_FILE)).trim() || null;
  } catch (e) {}
  return null;
};

const saveGithubToken = async (token) => {
  let saved = false;
  try { await SecureStore.setItemAsync(TOKEN_KEY, token); saved = true; } catch (e) {}
  try { await FileSystem.writeAsStringAsync(TOKEN_FILE, token); saved = true; } catch (e) {}
  if (!saved) throw new Error('No se pudo guardar el token en el teléfono.');
};

/** @returns {Promise<{login:string, avatar:string}|null>} */
export const getGithubUser = async () => {
  try {
    if (!(await getGithubToken())) return null;
    const info = await FileSystem.getInfoAsync(USER_FILE);
    if (info.exists) return JSON.parse(await FileSystem.readAsStringAsync(USER_FILE));
  } catch (e) {}
  return null;
};

export const disconnectGithub = async () => {
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch (e) {}
  try { await FileSystem.deleteAsync(TOKEN_FILE, { idempotent: true }); } catch (e) {}
  try { await FileSystem.deleteAsync(USER_FILE, { idempotent: true }); } catch (e) {}
};

// ---- Utilidades ----
const encodePath = (p) => String(p || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');

// Base64 <-> texto con tildes/emojis (UTF-8)
export const utf8ToBase64 = (str) =>
  encode(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));

export const base64ToUtf8 = (b64) => {
  const bin = decode(String(b64).replace(/\s/g, ''));
  return decodeURIComponent(
    bin.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
};

const gh = async (path, { method = 'GET', body, token } = {}) => {
  const t = token || (await getGithubToken());
  if (!t) throw new Error('GitHub no está conectado.');
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${t}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Token inválido o vencido.');
    throw new Error((data && data.message) || `GitHub respondió ${res.status}`);
  }
  return data;
};

// ---- API ----
/** Verifica el token, lo guarda y devuelve el usuario. */
export const connectGithub = async (token) => {
  const clean = String(token || '').trim();
  if (!clean) throw new Error('Pega tu token de GitHub.');
  const u = await gh('/user', { token: clean });
  await saveGithubToken(clean);
  const user = { login: u.login, avatar: u.avatar_url };
  await FileSystem.writeAsStringAsync(USER_FILE, JSON.stringify(user));
  return user;
};

export const listRepos = () =>
  gh('/user/repos?per_page=60&sort=updated&affiliation=owner,collaborator,organization_member');

/** Contenido de una carpeta: [{ name, path, type: 'dir'|'file', size }] (carpetas primero) */
export const listContents = async (repo, path = '') => {
  const data = await gh(`/repos/${repo}/contents/${encodePath(path)}`);
  const list = Array.isArray(data) ? data : [];
  return list
    .map((x) => ({ name: x.name, path: x.path, type: x.type === 'dir' ? 'dir' : 'file', size: x.size || 0 }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
};

/** Lee un archivo de texto. @returns {Promise<{type:'text', name:string, content:string}>} */
export const readRepoFile = async (repo, path) => {
  const data = await gh(`/repos/${repo}/contents/${encodePath(path)}`);
  if (Array.isArray(data) || data.type !== 'file') throw new Error('Eso no es un archivo.');
  if (data.size > MAX_READ_BYTES) throw new Error('El archivo es muy grande (máximo 200 KB).');
  const content = base64ToUtf8(data.content || '');
  if (content.includes('\u0000')) throw new Error('Parece un archivo binario, no de texto.');
  return { type: 'text', name: data.name, content };
};

/** Crea o actualiza un archivo en el repositorio. @returns {Promise<string>} enlace al archivo */
export const putRepoFile = async (repo, path, content, message) => {
  let sha;
  try {
    const existing = await gh(`/repos/${repo}/contents/${encodePath(path)}`);
    if (existing && !Array.isArray(existing)) sha = existing.sha;
  } catch (e) {}
  const res = await gh(`/repos/${repo}/contents/${encodePath(path)}`, {
    method: 'PUT',
    body: { message: message || `Actualizar ${path} desde DIAcorks`, content: utf8ToBase64(content), ...(sha ? { sha } : {}) },
  });
  return (res && res.content && res.content.html_url) || `https://github.com/${repo}/blob/HEAD/${path}`;
};
