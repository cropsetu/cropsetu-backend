import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LANGUAGES } from '../i18n/translations';
import { getLangForState } from '../i18n/stateMappings';

const LANG_KEY  = 'farmeasy_language';
const STATE_KEY = 'farmeasy_state';
const LanguageContext = createContext(null);

const SUPPORTED_CODES = new Set(LANGUAGES.map((l) => l.code));

/** Map a raw BCP-47 locale (e.g. 'hi-IN', 'bn') to a supported code or 'en'. */
function resolveLocale(raw) {
  if (!raw) return 'en';
  const base = raw.split(/[-_]/)[0].toLowerCase();
  if (SUPPORTED_CODES.has(base)) return base;
  return 'en';
}

/** Try to read the device's preferred locale without requiring expo-localization. */
function getDeviceLocale() {
  // expo-localization (optional install)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getLocales } = require('expo-localization');
    const locales = getLocales?.();
    if (Array.isArray(locales) && locales.length > 0) {
      return locales[0].languageCode || locales[0].languageTag || 'en';
    }
  } catch { /* not installed */ }

  // Intl API (available in Hermes / modern RN)
  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch { /* not available */ }

  return 'en';
}

export function LanguageProvider({ children }) {
  const [language,      setLanguageState] = useState('en');
  const [selectedState, setSelectedState] = useState(null);
  const [langReady,     setLangReady]     = useState(false);

  // ── Restore persisted language on mount, fall back to device locale ─────────
  useEffect(() => {
    (async () => {
      try {
        const [stored, storedState] = await Promise.all([
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(STATE_KEY),
        ]);
        if (storedState) setSelectedState(storedState);
        if (stored && SUPPORTED_CODES.has(stored)) {
          setLanguageState(stored);
        } else {
          setLanguageState(resolveLocale(getDeviceLocale()));
        }
      } catch {
        // Keep default 'en' on AsyncStorage error
      } finally {
        setLangReady(true);
      }
    })();
  }, []);

  /** Change language manually and persist. */
  async function setLanguage(code) {
    const resolved = SUPPORTED_CODES.has(code) ? code : 'en';
    setLanguageState(resolved);
    try { await AsyncStorage.setItem(LANG_KEY, resolved); } catch { /* ignore */ }
  }

  /**
   * Select a state — automatically switches the app to that state's native language.
   * @param {string} stateName  e.g. 'Maharashtra'
   */
  async function setLanguageByState(stateName) {
    const langCode = getLangForState(stateName);
    setSelectedState(stateName);
    setLanguageState(SUPPORTED_CODES.has(langCode) ? langCode : 'en');
    try {
      await Promise.all([
        AsyncStorage.setItem(STATE_KEY, stateName),
        AsyncStorage.setItem(LANG_KEY, langCode),
      ]);
    } catch { /* ignore */ }
  }

  /**
   * Translate a dot-notation key with optional interpolation.
   *
   * @param {string} key  e.g. 'cart.emptyTitle' or 'loading'
   * @param {object} [params]  e.g. { amount: '250', name: 'Rajesh' }
   *
   * Falls back: current language → English → raw key string.
   * Interpolation: replaces {{param}} placeholders with params values.
   */
  function t(key, params) {
    const parts = key.split('.');

    // Walk the current language tree
    let value = translations[language];
    for (const k of parts) { value = value?.[k]; }

    // English fallback
    if (value === undefined || value === null) {
      let fallback = translations.en;
      for (const k of parts) { fallback = fallback?.[k]; }
      value = fallback ?? key;
    }

    // Non-string (nested object) or missing → return key
    if (typeof value !== 'string') return key;

    // Interpolation: replace {{param}} tokens
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, p) => (params[p] !== undefined ? String(params[p]) : `{{${p}}}`));
    }
    return value;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, setLanguageByState, selectedState, t, LANGUAGES, langReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
