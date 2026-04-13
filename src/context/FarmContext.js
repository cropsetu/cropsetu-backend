/**
 * FarmContext — Persistent farm profile for every Indian farmer using FarmEasy.
 *
 * Stores: location, crop list (with age), soil, irrigation, land size, previous crop.
 * All AI calls read from this context to personalise Groq/Gemini responses.
 * Persisted to AsyncStorage so it survives app restarts.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'farmeasy_farm_profile_v2';

export const SOIL_TYPES = [
  { key: 'black',    label: 'Black Cotton (Regur)' },
  { key: 'red',      label: 'Red Laterite' },
  { key: 'alluvial', label: 'Alluvial (River)' },
  { key: 'sandy',    label: 'Sandy / Loamy' },
  { key: 'clay',     label: 'Clay / Heavy' },
  { key: 'laterite', label: 'Laterite / Rocky' },
];

export const IRRIGATION_TYPES = [
  { key: 'drip',      label: 'Drip Irrigation' },
  { key: 'sprinkler', label: 'Sprinkler' },
  { key: 'flood',     label: 'Flood / Furrow' },
  { key: 'rainfed',   label: 'Rainfed (No irrigation)' },
  { key: 'canal',     label: 'Canal / River lift' },
];

export const COMMON_CROPS = [
  'Tomato', 'Onion', 'Wheat', 'Cotton', 'Rice', 'Soybean',
  'Potato', 'Maize', 'Sugarcane', 'Groundnut', 'Chilli', 'Brinjal',
  'Okra', 'Cauliflower', 'Cabbage', 'Mango', 'Grape', 'Pomegranate',
];

const DEFAULT_PROFILE = {
  name: '',
  location: {
    state: '',
    district: '',
    city: '',
    lat: null,
    lon: null,
  },
  landSize: '',          // in acres, e.g. "2.5"
  soilType: '',          // key from SOIL_TYPES
  irrigationType: '',    // key from IRRIGATION_TYPES
  previousCrop: '',      // crop name grown last season
  currentCrops: [],      // [{ name, plantingDate (ISO), field, ageInDays }]
};

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const [farmProfile, setFarmProfileState] = useState(DEFAULT_PROFILE);
  const [profileReady, setProfileReady]    = useState(false);

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          try { setFarmProfileState(prev => ({ ...prev, ...JSON.parse(raw) })); } catch { /* keep default */ }
        }
      })
      .catch(() => {})
      .finally(() => setProfileReady(true));
  }, []);

  /**
   * Update any fields in the farm profile and persist.
   * Deep-merges `location` if provided.
   */
  const updateFarmProfile = async (updates) => {
    setFarmProfileState(prev => {
      const next = {
        ...prev,
        ...updates,
        location: updates.location
          ? { ...prev.location, ...updates.location }
          : prev.location,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  /**
   * Add or update a crop in the currentCrops list.
   * Matches by crop name; adds if not found.
   */
  const upsertCrop = async (crop) => {
    setFarmProfileState(prev => {
      const exists = prev.currentCrops.findIndex(c => c.name === crop.name);
      let crops;
      if (exists >= 0) {
        crops = prev.currentCrops.map((c, i) => i === exists ? { ...c, ...crop } : c);
      } else {
        crops = [...prev.currentCrops, crop];
      }
      const next = { ...prev, currentCrops: crops };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  /**
   * Returns a flat context object suitable for sending to the backend with every AI call.
   */
  const getAIContext = () => {
    const primaryCrop = farmProfile.currentCrops[0] || null;
    const cropAge = primaryCrop?.plantingDate
      ? Math.floor((Date.now() - new Date(primaryCrop.plantingDate)) / 86400000)
      : primaryCrop?.ageInDays || null;

    return {
      state:         farmProfile.location?.state    || '',
      district:      farmProfile.location?.district || '',
      city:          farmProfile.location?.city     || '',
      landSize:      farmProfile.landSize  || '',
      soilType:      farmProfile.soilType  || '',
      irrigationType:farmProfile.irrigationType || '',
      previousCrop:  farmProfile.previousCrop   || '',
      currentCrops:  farmProfile.currentCrops   || [],
      // Convenience fields for primary crop
      primaryCropName: primaryCrop?.name || '',
      primaryCropAge:  cropAge,
      primaryCropField:primaryCrop?.field || '',
    };
  };

  return (
    <FarmContext.Provider value={{ farmProfile, updateFarmProfile, upsertCrop, profileReady, getAIContext }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarm must be used inside <FarmProvider>');
  return ctx;
}
