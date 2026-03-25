/**
 * Platform-aware secure storage.
 * - Native (iOS/Android): expo-secure-store  (encrypted keychain/keystore)
 * - Web:                  localStorage        (tokens stored in plaintext — dev only)
 */
import { Platform } from 'react-native';

// Lazy-load SecureStore so it never even imports on web
let _SecureStore = null;
function getSecureStore() {
  if (!_SecureStore) _SecureStore = require('expo-secure-store');
  return _SecureStore;
}

export async function setItem(key, value) {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await getSecureStore().setItemAsync(key, value);
}

export async function getItem(key) {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key) ?? null;
  }
  return getSecureStore().getItemAsync(key);
}

export async function deleteItem(key) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await getSecureStore().deleteItemAsync(key);
}
