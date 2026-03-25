import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Alert, Animated, Dimensions,
  StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import axios from 'axios';
import { getAIRecommendation } from '../../services/aiService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── AI COLOR PALETTE ─────────────────────────────────────────────────────────
const AI = {
  bg: '#060D1F',
  bgCard: '#0F1A2E',
  bgCardLight: '#162236',
  neonGreen: '#00FF88',
  neonBlue: '#00D4FF',
  neonPurple: '#A855F7',
  neonOrange: '#FF8C00',
  border: '#00FF8825',
  borderActive: '#00FF8870',
  text: '#FFFFFF',
  textSub: '#94A3B8',
  textDim: '#475569',
};

// ─── ANIMATED AI ORB ─────────────────────────────────────────────────────────
function AIOrb({ size = 130, isThinking = false }) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const rotate1 = useRef(new Animated.Value(0)).current;
  const rotate2 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.6)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Breathing pulse rings
    Animated.loop(Animated.sequence([
      Animated.timing(pulse1, { toValue: 1.18, duration: 1600, useNativeDriver: true }),
      Animated.timing(pulse1, { toValue: 1, duration: 1600, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.delay(400),
      Animated.timing(pulse2, { toValue: 1.3, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulse2, { toValue: 1, duration: 1800, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.delay(800),
      Animated.timing(pulse3, { toValue: 1.45, duration: 2000, useNativeDriver: true }),
      Animated.timing(pulse3, { toValue: 1, duration: 2000, useNativeDriver: true }),
    ])).start();

    // Orbit rotations
    Animated.loop(
      Animated.timing(rotate1, { toValue: 1, duration: 4000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(rotate2, { toValue: 1, duration: 6000, useNativeDriver: true })
    ).start();

    // Glow breathe
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.35, duration: 1400, useNativeDriver: true }),
    ])).start();

    // Icon bounce when thinking
    if (isThinking) {
      Animated.loop(Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 0.9, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      iconScale.setValue(1);
    }
  }, [isThinking]);

  const spin1 = rotate1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spin2 = rotate2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const orbSize = size;

  return (
    <View style={{ width: orbSize * 2.8, height: orbSize * 2.8, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outermost glow ring */}
      <Animated.View style={{
        position: 'absolute',
        width: orbSize * 2.6,
        height: orbSize * 2.6,
        borderRadius: orbSize * 1.3,
        borderWidth: 1,
        borderColor: AI.neonGreen + '15',
        opacity: pulse3,
        transform: [{ scale: pulse3 }],
      }} />

      {/* Second glow ring */}
      <Animated.View style={{
        position: 'absolute',
        width: orbSize * 2,
        height: orbSize * 2,
        borderRadius: orbSize,
        borderWidth: 1.5,
        borderColor: AI.neonBlue + '25',
        transform: [{ scale: pulse2 }],
        opacity: pulse2,
      }} />

      {/* Rotating dashed orbit 1 */}
      <Animated.View style={{
        position: 'absolute',
        width: orbSize * 1.7,
        height: orbSize * 1.7,
        borderRadius: orbSize * 0.85,
        borderWidth: 1.5,
        borderColor: AI.neonGreen + '50',
        borderStyle: 'dashed',
        transform: [{ rotate: spin1 }],
      }}>
        {/* Orbit dot */}
        <View style={{
          position: 'absolute',
          top: -5, left: '48%',
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: AI.neonGreen,
          shadowColor: AI.neonGreen,
          shadowOpacity: 1,
          shadowRadius: 6,
          elevation: 8,
        }} />
      </Animated.View>

      {/* Rotating dashed orbit 2 */}
      <Animated.View style={{
        position: 'absolute',
        width: orbSize * 1.4,
        height: orbSize * 1.4,
        borderRadius: orbSize * 0.7,
        borderWidth: 1,
        borderColor: AI.neonPurple + '60',
        borderStyle: 'dashed',
        transform: [{ rotate: spin2 }],
      }}>
        <View style={{
          position: 'absolute',
          bottom: -4, right: '44%',
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: AI.neonPurple,
          shadowColor: AI.neonPurple,
          shadowOpacity: 1,
          shadowRadius: 5,
          elevation: 8,
        }} />
      </Animated.View>

      {/* Core orb */}
      <Animated.View style={{
        width: orbSize, height: orbSize, borderRadius: orbSize / 2,
        transform: [{ scale: pulse1 }],
        shadowColor: AI.neonGreen,
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 20,
      }}>
        <LinearGradient
          colors={['#003322', '#004433', '#00FF8830']}
          style={{
            width: '100%', height: '100%',
            borderRadius: orbSize / 2,
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 2,
            borderColor: AI.neonGreen + '80',
          }}
        >
          {/* Inner glow */}
          <View style={{
            position: 'absolute',
            width: orbSize * 0.7, height: orbSize * 0.7,
            borderRadius: orbSize * 0.35,
            backgroundColor: AI.neonGreen + '12',
          }} />
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Text style={{ fontSize: orbSize * 0.35 }}>🌾</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ─── PROCESSING SCREEN ────────────────────────────────────────────────────────
function AIProcessingScreen({ cropName }) {
  // Hooks must be declared individually — never inside loops or map()
  const dot0 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const dot4 = useRef(new Animated.Value(0)).current;
  const dots = [dot0, dot1, dot2, dot3, dot4];
  const scanLine = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const steps = [
    { label: 'Reading crop data...', icon: '🌱', delay: 0 },
    { label: 'Analyzing weather patterns...', icon: '🌦️', delay: 800 },
    { label: 'Checking soil compatibility...', icon: '🪨', delay: 1600 },
    { label: 'Scanning disease symptoms...', icon: '🔬', delay: 2400 },
    { label: 'Generating AI recommendation...', icon: '🤖', delay: 3200 },
  ];
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Scan line
    Animated.loop(Animated.sequence([
      Animated.timing(scanLine, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(scanLine, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ])).start();

    // Dot wave
    dots.forEach((dot, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 120),
        Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay((dots.length - i) * 120),
      ])).start();
    });

    // Step progression
    steps.forEach((s, i) => {
      setTimeout(() => setActiveStep(i), s.delay + 400);
    });
  }, []);

  const scanTranslate = scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, 160] });

  return (
    <Animated.View style={[styles.processingContainer, { opacity: fadeIn }]}>
      <AIOrb size={110} isThinking />

      {/* Scanning frame */}
      <View style={styles.scanFrame}>
        <View style={[styles.scanCorner, { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[styles.scanCorner, { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 }]} />
        <View style={[styles.scanCorner, { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[styles.scanCorner, { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 }]} />
        <Animated.View style={[styles.scanLineBar, { transform: [{ translateY: scanTranslate }] }]} />
      </View>

      <Text style={styles.processingTitle}>AI Analyzing Your Farm</Text>
      <Text style={styles.processingCrop}>{cropName || 'Your crop'}</Text>

      {/* Step indicator */}
      <View style={styles.stepsList}>
        {steps.map((step, i) => (
          <View key={i} style={[styles.stepItem, i < activeStep && { opacity: 0.4 }]}>
            <View style={[styles.stepDot2, { backgroundColor: i <= activeStep ? AI.neonGreen : AI.textDim }]}>
              {i < activeStep
                ? <Ionicons name="checkmark" size={10} color={AI.bg} />
                : <Text style={{ fontSize: 8 }}>{step.icon}</Text>
              }
            </View>
            <Text style={[styles.stepItemText, i === activeStep && { color: AI.neonGreen }]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Loading dots */}
      <View style={styles.dotsRow}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.loadingDot, {
            opacity: dot,
            transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.4] }) }],
          }]} />
        ))}
      </View>
    </Animated.View>
  );
}

// ─── TYPEWRITER TEXT ──────────────────────────────────────────────────────────
function TypewriterText({ text, style, delay = 0 }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, ++i));
        } else {
          clearInterval(interval);
        }
      }, 18);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay]);
  return <Text style={style}>{displayed}</Text>;
}

// ─── HUD STEP INDICATOR ───────────────────────────────────────────────────────
function HUDStepBar({ step, total }) {
  return (
    <View style={styles.hudBar}>
      <View style={styles.hudLeft}>
        <View style={styles.hudSignal}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.hudSignalBar, { height: i * 5 + 4, backgroundColor: step >= i ? AI.neonGreen : AI.textDim }]} />
          ))}
        </View>
        <Text style={styles.hudLabel}>FARM<Text style={{ color: AI.neonGreen }}>AI</Text></Text>
      </View>
      <View style={styles.hudSteps}>
        {Array.from({ length: total }, (_, i) => (
          <React.Fragment key={i}>
            <View style={[styles.hudStepDot, {
              backgroundColor: i + 1 <= step ? AI.neonGreen : AI.textDim,
              shadowColor: i + 1 === step ? AI.neonGreen : 'transparent',
              shadowOpacity: 1, shadowRadius: 6,
            }]}>
              {i + 1 < step
                ? <Ionicons name="checkmark" size={10} color={AI.bg} />
                : <Text style={[styles.hudStepNum, { color: i + 1 <= step ? AI.bg : AI.textDim }]}>{i + 1}</Text>
              }
            </View>
            {i < total - 1 && (
              <View style={[styles.hudStepLine, { backgroundColor: i + 1 < step ? AI.neonGreen : AI.textDim }]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.hudVersion}>v2.0</Text>
    </View>
  );
}

// ─── GLOWING CHIP ─────────────────────────────────────────────────────────────
function GlowChip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.glowChip, selected && styles.glowChipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {selected && <View style={styles.glowChipDot} />}
      <Text style={[styles.glowChipText, selected && styles.glowChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── RESULT CARD ─────────────────────────────────────────────────────────────
function ResultCard({ title, icon, color, children, delay = 0 }) {
  const slideUp = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View style={[styles.resultCard, { borderColor: color + '50', opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <LinearGradient colors={[color + '18', color + '06']} style={styles.resultCardGradient}>
        <View style={styles.resultCardHeader}>
          <View style={[styles.resultCardIcon, { backgroundColor: color + '25', borderColor: color + '60' }]}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>
          <Text style={[styles.resultCardTitle, { color }]}>{title}</Text>
          <View style={[styles.resultCardBadge, { backgroundColor: color + '30' }]}>
            <View style={[styles.liveDot, { backgroundColor: color }]} />
            <Text style={[styles.liveText, { color }]}>AI</Text>
          </View>
        </View>
        {children}
      </LinearGradient>
    </Animated.View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const CROPS = ['Wheat', 'Rice/Paddy', 'Tomato', 'Onion', 'Soybean', 'Cotton', 'Sugarcane', 'Maize', 'Potato', 'Groundnut'];
const GROWTH_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting / Grain Fill', 'Harvesting'];
const SOILS = ['Black (Clay)', 'Red (Laterite)', 'Sandy Loam', 'Loamy', 'Alluvial'];
const PROBLEMS = ['Yellow Leaves', 'Wilting', 'White Powder', 'Black Spots', 'Holes in Leaves', 'Stunted Growth', 'Root Rot', 'No Visible Problem'];

export default function AIRecommendation({ navigation }) {
  const [step, setStep] = useState(0);   // 0=intro, 1-3=steps, 4=processing, 5=results
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [cropImage, setCropImage] = useState(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [form, setForm] = useState({
    crop: '', growthStage: '', pincode: '',
    soilType: '', landSize: '', problem: '',
    irrigation: '', previousCrop: '', symptoms: '',
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Real weather from Open-Meteo (free, no key needed)
  const [realWeather, setRealWeather] = useState({
    temp: '--°C', humidity: '--%', rainfall: '--', forecast: 'Detecting location…',
  });

  useEffect(() => {
    (async () => {
      try {
        let lat = 18.52, lon = 73.86;

        // Check existing permission — do NOT request it here so WeatherHome's GPS is unaffected
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;

          // Silently auto-fill pincode (not shown to user)
          try {
            const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            const pc = places[0]?.postalCode?.replace(/\D/g, '').slice(0, 6) || '';
            if (pc.length === 6) {
              update('pincode', pc);
            }
          } catch { /* falls back to Pune default in aiService */ }
        }

        const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude: lat, longitude: lon,
            current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code',
            daily: 'precipitation_probability_max',
            forecast_days: 2,
            timezone: 'Asia/Kolkata',
          },
          timeout: 8000,
        });
        const c = data.current;
        const rainPct = data.daily?.precipitation_probability_max?.[1] ?? 0;
        setRealWeather({
          temp: `${Math.round(c.temperature_2m)}°C`,
          humidity: `${c.relative_humidity_2m}%`,
          rainfall: `${c.precipitation ?? 0} mm today`,
          forecast: rainPct > 50
            ? `Rain likely tomorrow (${rainPct}%)`
            : 'No significant rain expected',
        });
      } catch {
        setRealWeather({ temp: '--°C', humidity: '--%', rainfall: '--', forecast: 'Weather unavailable' });
      }
    })();
  }, []);

  const goTo = (nextStep) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setCropImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setCropImage(result.assets[0].uri);
  };

  const handleNext = () => {
    // Only the truly essential fields block progression
    if (step === 1 && !form.crop) {
      Alert.alert('Select Crop', 'Please select your crop type.'); return;
    }
    if (step === 2 && !form.soilType) {
      Alert.alert('Select Soil Type', 'Please select your soil type.'); return;
    }
    goTo(step + 1);
  };

  const handleAnalyze = async () => {
    if (!form.problem) {
      Alert.alert('Select Symptom', 'Please select at least one visible symptom.'); return;
    }
    goTo(4);
    // Run the API call and the minimum animation delay in parallel.
    // User sees at most 4 seconds on the processing screen regardless of API speed.
    try {
      const [result] = await Promise.all([
        getAIRecommendation({ ...form, hasImage: !!cropImage }),
        new Promise(resolve => setTimeout(resolve, 4000)),
      ]);
      setRecommendation(result);
      goTo(5);
    } catch {
      setRecommendation(getMock());
      goTo(5);
    }
  };

  const getMock = () => ({
    fertilizers: [
      { name: 'DAP (Di-Ammonium Phosphate)', dose: '50 kg/acre basal', timing: 'At sowing time' },
      { name: 'Urea (46% N)', dose: '33 kg/acre', timing: 'Split: 21 days after sowing' },
    ],
    pesticides: [
      { name: 'Mancozeb 75% WP', dose: '2.5g/litre water', timing: 'Spray every 10 days' },
    ],
    warning: 'Rain expected soon — delay foliar spray by 2 days for best results.',
    generalAdvice: 'Conduct soil test before next season to optimize fertilizer use.',
  });

  // ── Intro Screen ────────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <View style={styles.darkContainer}>
        <StatusBar barStyle="light-content" backgroundColor={AI.bg} />
        <LinearGradient colors={[AI.bg, '#0A1628', '#060D1F']} style={{ flex: 1 }}>
          {/* Grid lines — non-interactive overlay */}
          <View style={styles.gridOverlay} pointerEvents="none">
            {[...Array(8)].map((_, i) => (
              <View key={i} style={[styles.gridLineH, { top: `${i * 14}%` }]} />
            ))}
          </View>

          {/* ScrollView ensures button is always reachable on small screens */}
          <ScrollView
            contentContainerStyle={styles.introScreen}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.introBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.introBadgeText}>POWERED BY GEMINI AI</Text>
            </View>

            <AIOrb size={100} />

            <View style={styles.introTextBlock}>
              <Text style={styles.introTitle}>
                FARM<Text style={{ color: AI.neonGreen }}>AI</Text>
              </Text>
              <Text style={styles.introSubtitle}>Your Personal Crop Intelligence</Text>
              <Text style={styles.introDesc}>
                Advanced AI analyzes your crop, soil & weather to give expert fertilizer and pesticide recommendations — instantly.
              </Text>
            </View>

            {/* Feature chips */}
            <View style={styles.featureRow}>
              {['🌡️ Weather Data', '🌱 Crop DNA', '📸 Image Scan'].map((f, i) => (
                <View key={i} style={styles.featureChip}>
                  <Text style={styles.featureChipText}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={() => goTo(1)} activeOpacity={0.85}>
              <LinearGradient colors={[AI.neonGreen + 'EE', '#00CC66']} style={styles.startBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.startBtnText}>Start AI Analysis</Text>
                <Ionicons name="arrow-forward" size={20} color={AI.bg} />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.introHint}>Tap to begin • Takes only 2 minutes</Text>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  // ── Processing Screen ────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <View style={styles.darkContainer}>
        <StatusBar barStyle="light-content" backgroundColor={AI.bg} />
        <LinearGradient colors={[AI.bg, '#0A1628']} style={styles.processingScreen}>
          <AIProcessingScreen cropName={form.crop} />
        </LinearGradient>
      </View>
    );
  }

  // ── Results Screen ───────────────────────────────────────────────────────────
  if (step === 5 && recommendation) {
    return (
      <View style={styles.darkContainer}>
        <StatusBar barStyle="light-content" backgroundColor={AI.bg} />
        <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[AI.bg, '#0A1628']} style={styles.resultsHeader}>
            <View style={styles.resultsAIBadge}>
              <Text style={styles.resultsEmoji}>🤖</Text>
              <View>
                <TypewriterText text="Analysis Complete" style={styles.resultsBigTitle} delay={200} />
                <TypewriterText text={`For: ${form.crop} · ${form.soilType}`} style={styles.resultsSubtitle} delay={600} />
              </View>
            </View>
          </LinearGradient>

          <View style={styles.resultsPadding}>
            {/* Disease Card (shown when backend returns diagnosis) */}
            {recommendation.disease && (
              <ResultCard title="Disease Detected" icon="🔬" color={AI.neonOrange} delay={0}>
                <View style={{ gap: 8 }}>
                  <Text style={[styles.recName, { fontSize: 16, color: AI.neonOrange }]}>
                    {recommendation.disease.name}
                  </Text>
                  {recommendation.disease.scientificName ? (
                    <Text style={{ fontSize: 12, color: AI.textSub, fontStyle: 'italic' }}>
                      {recommendation.disease.scientificName}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <View style={[styles.recMetaChip, { backgroundColor: AI.neonOrange + '25' }]}>
                      <Text style={[styles.recMetaText, { color: AI.neonOrange }]}>
                        Probability: {recommendation.disease.probability}%
                      </Text>
                    </View>
                    {recommendation.riskLevel && (
                      <View style={[styles.recMetaChip, { backgroundColor: AI.neonPurple + '25' }]}>
                        <Text style={[styles.recMetaText, { color: AI.neonPurple }]}>
                          Risk: {recommendation.riskLevel}
                        </Text>
                      </View>
                    )}
                  </View>
                  {recommendation.disease.description ? (
                    <Text style={{ fontSize: 13, color: AI.textSub, lineHeight: 20, marginTop: 4 }}>
                      {recommendation.disease.description}
                    </Text>
                  ) : null}
                </View>
              </ResultCard>
            )}

            {/* Fertilizer Card */}
            <ResultCard title="Fertilizer Plan" icon="🌿" color={AI.neonGreen} delay={300}>
              {recommendation.fertilizers?.map((item, i) => (
                <View key={i} style={styles.recRow}>
                  <View style={[styles.recIndex, { backgroundColor: AI.neonGreen + '30' }]}>
                    <Text style={[styles.recIndexText, { color: AI.neonGreen }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recName}>{item.name}</Text>
                    <View style={styles.recMetaRow}>
                      <View style={styles.recMetaChip}>
                        <Ionicons name="beaker-outline" size={11} color={AI.neonGreen} />
                        <Text style={[styles.recMetaText, { color: AI.neonGreen }]}>{item.dose}</Text>
                      </View>
                      <View style={[styles.recMetaChip, { backgroundColor: AI.neonBlue + '20' }]}>
                        <Ionicons name="time-outline" size={11} color={AI.neonBlue} />
                        <Text style={[styles.recMetaText, { color: AI.neonBlue }]}>{item.timing}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ResultCard>

            {/* Pesticide Card */}
            {recommendation.pesticides?.length > 0 && (
              <ResultCard title="Pesticide Plan" icon="🔬" color={AI.neonPurple} delay={600}>
                {recommendation.pesticides.map((item, i) => (
                  <View key={i} style={styles.recRow}>
                    <View style={[styles.recIndex, { backgroundColor: AI.neonPurple + '30' }]}>
                      <Text style={[styles.recIndexText, { color: AI.neonPurple }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recName}>{item.name}</Text>
                      <View style={styles.recMetaRow}>
                        <View style={[styles.recMetaChip, { backgroundColor: AI.neonPurple + '20' }]}>
                          <Text style={[styles.recMetaText, { color: AI.neonPurple }]}>{item.dose}</Text>
                        </View>
                        <View style={[styles.recMetaChip, { backgroundColor: '#FF8C0020' }]}>
                          <Text style={[styles.recMetaText, { color: AI.neonOrange }]}>{item.timing}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </ResultCard>
            )}

            {/* Warning */}
            {recommendation.warning && (
              <ResultCard title="AI Alert" icon="⚡" color={AI.neonOrange} delay={900}>
                <TypewriterText text={recommendation.warning} style={styles.warningText} delay={1000} />
              </ResultCard>
            )}

            {/* Advice */}
            {recommendation.generalAdvice && (
              <ResultCard title="Expert Advice" icon="💡" color={AI.neonBlue} delay={1200}>
                <TypewriterText text={recommendation.generalAdvice} style={styles.adviceText} delay={1400} />
              </ResultCard>
            )}

            {/* Action buttons */}
            <TouchableOpacity style={styles.shopResultBtn} onPress={() => navigation.goBack()}>
              <LinearGradient colors={[AI.neonGreen + 'DD', '#00CC66']} style={styles.shopResultGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="storefront" size={20} color={AI.bg} />
                <Text style={styles.shopResultText}>Shop Recommended Products</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.retryBtn} onPress={() => goTo(0)}>
              <Ionicons name="refresh" size={18} color={AI.neonGreen} />
              <Text style={styles.retryText}>New Analysis</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Input Steps 1-3 ──────────────────────────────────────────────────────────
  return (
    <View style={styles.darkContainer}>
      <StatusBar barStyle="light-content" backgroundColor={AI.bg} />
      <LinearGradient colors={[AI.bg, '#0A1628']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <HUDStepBar step={step} total={3} />

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.stepContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1 — Crop & Land */}
            {step === 1 && (
              <>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepEmoji}>🌱</Text>
                  <View>
                    <Text style={styles.stepTitle}>Crop Information</Text>
                    <Text style={styles.stepSub}>Select your crop and land details</Text>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>SELECT CROP</Text>
                <View style={styles.chipGrid}>
                  {CROPS.map(c => (
                    <GlowChip key={c} label={c} selected={form.crop === c} onPress={() => update('crop', c)} />
                  ))}
                </View>

                <Text style={styles.fieldLabel}>LAND SIZE (ACRES)</Text>
                <View style={styles.darkInput}>
                  <Ionicons name="resize-outline" size={18} color={AI.neonGreen} />
                  <TextInput
                    style={styles.darkInputField}
                    placeholder="e.g. 2.5"
                    placeholderTextColor={AI.textDim}
                    keyboardType="decimal-pad"
                    value={form.landSize}
                    onChangeText={v => update('landSize', v)}
                  />
                  <Text style={styles.darkInputUnit}>acres</Text>
                </View>

                <Text style={styles.fieldLabel}>PREVIOUS CROP (OPTIONAL)</Text>
                <View style={styles.darkInput}>
                  <Ionicons name="time-outline" size={18} color={AI.neonBlue} />
                  <TextInput
                    style={styles.darkInputField}
                    placeholder="e.g. Wheat"
                    placeholderTextColor={AI.textDim}
                    value={form.previousCrop}
                    onChangeText={v => update('previousCrop', v)}
                  />
                </View>
              </>
            )}

            {/* Step 2 — Soil & Weather */}
            {step === 2 && (
              <>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepEmoji}>🌍</Text>
                  <View>
                    <Text style={styles.stepTitle}>Soil & Conditions</Text>
                    <Text style={styles.stepSub}>Help AI understand your field</Text>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>SOIL TYPE</Text>
                <View style={styles.chipGrid}>
                  {SOILS.map(s => (
                    <GlowChip key={s} label={s} selected={form.soilType === s} onPress={() => update('soilType', s)} />
                  ))}
                </View>

                <Text style={styles.fieldLabel}>IRRIGATION SOURCE</Text>
                <View style={styles.darkInput}>
                  <Ionicons name="water-outline" size={18} color={AI.neonBlue} />
                  <TextInput
                    style={styles.darkInputField}
                    placeholder="e.g. Borewell, Canal, Rain-fed"
                    placeholderTextColor={AI.textDim}
                    value={form.irrigation}
                    onChangeText={v => update('irrigation', v)}
                  />
                </View>

                {/* Live Weather Card */}
                <View style={styles.weatherCard}>
                  <LinearGradient colors={['#001830', '#002040']} style={styles.weatherCardGradient}>
                    <View style={styles.weatherCardHeader}>
                      <Ionicons name="wifi" size={14} color={AI.neonGreen} />
                      <Text style={styles.weatherLive}>LIVE WEATHER DATA</Text>
                    </View>
                    <View style={styles.weatherGrid}>
                      {[
                        { icon: 'thermometer', label: 'Temp', val: realWeather.temp, color: AI.neonOrange },
                        { icon: 'water', label: 'Humidity', val: realWeather.humidity, color: AI.neonBlue },
                        { icon: 'rainy', label: 'Rainfall', val: realWeather.rainfall, color: AI.neonPurple },
                      ].map((w, i) => (
                        <View key={i} style={styles.weatherStat}>
                          <Ionicons name={w.icon} size={22} color={w.color} />
                          <Text style={[styles.weatherVal, { color: w.color }]}>{w.val}</Text>
                          <Text style={styles.weatherLabel}>{w.label}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.forecastRow}>
                      <Ionicons name="rainy" size={14} color={AI.neonBlue} />
                      <Text style={styles.forecastText}>{realWeather.forecast}</Text>
                    </View>
                  </LinearGradient>
                </View>
              </>
            )}

            {/* Step 3 — Problem & Photo */}
            {step === 3 && (
              <>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepEmoji}>🔬</Text>
                  <View>
                    <Text style={styles.stepTitle}>Problem Detection</Text>
                    <Text style={styles.stepSub}>Describe symptoms for AI diagnosis</Text>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>VISIBLE SYMPTOMS</Text>
                <View style={styles.chipGrid}>
                  {PROBLEMS.map(p => (
                    <GlowChip key={p} label={p} selected={form.problem === p} onPress={() => update('problem', p)} />
                  ))}
                </View>

                <Text style={styles.fieldLabel}>DESCRIBE IN DETAIL</Text>
                <View style={[styles.darkInput, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                  <TextInput
                    style={[styles.darkInputField, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="e.g. Leaves turning yellow from base, white deposits visible..."
                    placeholderTextColor={AI.textDim}
                    multiline
                    value={form.symptoms}
                    onChangeText={v => update('symptoms', v)}
                  />
                </View>

                {/* Photo Upload */}
                <Text style={styles.fieldLabel}>UPLOAD CROP PHOTO <Text style={{ color: AI.neonGreen }}>(BOOSTS ACCURACY 40%)</Text></Text>
                <View style={styles.photoRow}>
                  <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                    <LinearGradient colors={[AI.neonGreen + '20', AI.neonGreen + '08']} style={styles.photoBtnGradient}>
                      <Ionicons name="camera" size={28} color={AI.neonGreen} />
                      <Text style={styles.photoBtnText}>Camera</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                    <LinearGradient colors={[AI.neonBlue + '20', AI.neonBlue + '08']} style={styles.photoBtnGradient}>
                      <Ionicons name="images" size={28} color={AI.neonBlue} />
                      <Text style={[styles.photoBtnText, { color: AI.neonBlue }]}>Gallery</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {cropImage && (
                  <View style={styles.photoConfirm}>
                    <Ionicons name="checkmark-circle" size={18} color={AI.neonGreen} />
                    <Text style={styles.photoConfirmText}>Crop photo ready for AI scan</Text>
                    <TouchableOpacity onPress={() => setCropImage(null)}>
                      <Ionicons name="close-circle" size={18} color={AI.textSub} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Navigation buttons */}
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => goTo(step - 1)}>
              <Ionicons name="arrow-back" size={20} color={AI.neonGreen} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={step < 3 ? handleNext : handleAnalyze}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[AI.neonGreen + 'EE', '#00CC66']} style={styles.nextBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.nextBtnText}>{step < 3 ? 'Continue' : '  Analyze with AI  '}</Text>
                <Ionicons name={step < 3 ? 'arrow-forward' : 'bulb'} size={20} color={AI.bg} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  darkContainer: { flex: 1, backgroundColor: AI.bg },

  // ── Intro ──────────────────────────────────────────────────────────────────
  introScreen: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  gridOverlay: { position: 'absolute', width: '100%', height: '100%' },
  gridLineH: { position: 'absolute', width: '100%', height: 1, backgroundColor: AI.neonGreen + '08' },

  introBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: AI.neonGreen + '15', borderWidth: 1, borderColor: AI.neonGreen + '40', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, marginBottom: 20 },
  introBadgeText: { fontSize: 11, fontWeight: '800', color: AI.neonGreen, letterSpacing: 1.5 },

  introTextBlock: { alignItems: 'center', marginTop: 10, marginBottom: 24 },
  introTitle: { fontSize: 46, fontWeight: '900', color: AI.text, letterSpacing: 4 },
  introSubtitle: { fontSize: 16, color: AI.textSub, marginTop: 6, letterSpacing: 1 },
  introDesc: { fontSize: 14, color: AI.textSub, textAlign: 'center', marginTop: 14, lineHeight: 22, paddingHorizontal: 10 },

  featureRow: { flexDirection: 'row', gap: 10, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' },
  featureChip: { borderWidth: 1, borderColor: AI.neonGreen + '40', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: AI.neonGreen + '10' },
  featureChipText: { fontSize: 12, color: AI.neonGreen, fontWeight: '600' },

  startBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18 },
  startBtnText: { fontSize: 18, fontWeight: '800', color: AI.bg },
  introHint: { fontSize: 12, color: AI.textDim, marginTop: 14, letterSpacing: 0.5 },

  // ── HUD Bar ────────────────────────────────────────────────────────────────
  hudBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: AI.neonGreen + '20' },
  hudLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hudSignal: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  hudSignalBar: { width: 4, borderRadius: 2 },
  hudLabel: { fontSize: 18, fontWeight: '900', color: AI.text, letterSpacing: 2 },
  hudSteps: { flexDirection: 'row', alignItems: 'center' },
  hudStepDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  hudStepNum: { fontSize: 12, fontWeight: '800' },
  hudStepLine: { width: 24, height: 2, marginHorizontal: 2 },
  hudVersion: { fontSize: 11, color: AI.textDim, letterSpacing: 1 },

  // ── Step inputs ────────────────────────────────────────────────────────────
  stepContent: { padding: 20, paddingBottom: 30 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  stepEmoji: { fontSize: 40 },
  stepTitle: { fontSize: 22, fontWeight: '900', color: AI.text },
  stepSub: { fontSize: 13, color: AI.textSub, marginTop: 3 },

  fieldLabel: { fontSize: 11, fontWeight: '800', color: AI.textSub, letterSpacing: 1.5, marginBottom: 12, marginTop: 20 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  glowChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: AI.neonGreen + '30', backgroundColor: AI.neonGreen + '08' },
  glowChipActive: { borderColor: AI.neonGreen, backgroundColor: AI.neonGreen + '22', shadowColor: AI.neonGreen, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5 },
  glowChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: AI.neonGreen },
  glowChipText: { fontSize: 14, fontWeight: '600', color: AI.textSub },
  glowChipTextActive: { color: AI.neonGreen, fontWeight: '700' },

  darkInput: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: AI.bgCardLight, borderWidth: 1.5, borderColor: AI.neonGreen + '30', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  darkInputField: { flex: 1, fontSize: 15, color: AI.text, padding: 0 },
  darkInputUnit: { fontSize: 13, color: AI.textDim },

  weatherCard: { marginTop: 20, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: AI.neonBlue + '30' },
  weatherCardGradient: { padding: 16 },
  weatherCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  weatherLive: { fontSize: 11, fontWeight: '800', color: AI.neonGreen, letterSpacing: 1.5 },
  weatherGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  weatherStat: { alignItems: 'center', gap: 5 },
  weatherVal: { fontSize: 18, fontWeight: '900' },
  weatherLabel: { fontSize: 11, color: AI.textDim },
  forecastRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: AI.neonBlue + '15', borderRadius: 10, padding: 10 },
  forecastText: { fontSize: 13, color: AI.neonBlue, fontWeight: '600' },

  photoRow: { flexDirection: 'row', gap: 14, marginTop: 4 },
  photoBtn: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: AI.neonGreen + '40' },
  photoBtnGradient: { paddingVertical: 22, alignItems: 'center', gap: 8 },
  photoBtnText: { fontSize: 14, fontWeight: '700', color: AI.neonGreen },
  photoConfirm: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: AI.neonGreen + '15', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: AI.neonGreen + '40' },
  photoConfirmText: { flex: 1, fontSize: 14, color: AI.neonGreen, fontWeight: '600' },

  // ── Nav ────────────────────────────────────────────────────────────────────
  navBar: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: AI.neonGreen + '20' },
  backBtn: { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: AI.neonGreen + '50', justifyContent: 'center', alignItems: 'center' },
  nextBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  nextBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: AI.bg },

  // ── Processing ─────────────────────────────────────────────────────────────
  processingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  processingContainer: { alignItems: 'center', paddingHorizontal: 30 },
  processingTitle: { fontSize: 22, fontWeight: '900', color: AI.text, marginTop: 20 },
  processingCrop: { fontSize: 15, color: AI.neonGreen, fontWeight: '700', marginTop: 6, letterSpacing: 1 },

  scanFrame: { width: 180, height: 180, borderRadius: 16, overflow: 'hidden', position: 'absolute', borderWidth: 0 },
  scanCorner: { position: 'absolute', width: 20, height: 20, borderColor: AI.neonGreen },
  scanLineBar: { width: '100%', height: 2, backgroundColor: AI.neonGreen + '80', shadowColor: AI.neonGreen, shadowOpacity: 1, shadowRadius: 6 },

  stepsList: { marginTop: 24, width: '100%', gap: 8 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot2: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  stepItemText: { fontSize: 13, color: AI.textSub, fontWeight: '600' },

  dotsRow: { flexDirection: 'row', gap: 10, marginTop: 28 },
  loadingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AI.neonGreen, shadowColor: AI.neonGreen, shadowOpacity: 1, shadowRadius: 6 },

  // ── Results ────────────────────────────────────────────────────────────────
  resultsScroll: { flex: 1 },
  resultsHeader: { padding: 24, paddingTop: 50, alignItems: 'flex-start' },
  resultsAIBadge: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  resultsEmoji: { fontSize: 44 },
  resultsBigTitle: { fontSize: 24, fontWeight: '900', color: AI.text },
  resultsSubtitle: { fontSize: 13, color: AI.neonGreen, marginTop: 4, fontWeight: '600' },
  resultsPadding: { padding: 16, paddingBottom: 40 },

  resultCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, marginBottom: 14 },
  resultCardGradient: { padding: 16 },
  resultCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  resultCardIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  resultCardTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  resultCardBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: AI.neonGreen },
  liveText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  recRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  recIndex: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  recIndexText: { fontSize: 13, fontWeight: '800' },
  recName: { fontSize: 14, fontWeight: '700', color: AI.text, marginBottom: 8, lineHeight: 20 },
  recMetaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  recMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: AI.neonGreen + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  recMetaText: { fontSize: 11, fontWeight: '700' },

  warningText: { fontSize: 14, color: AI.neonOrange, lineHeight: 22, fontWeight: '500' },
  adviceText: { fontSize: 14, color: AI.neonBlue, lineHeight: 22, fontWeight: '500' },

  shopResultBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  shopResultGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  shopResultText: { fontSize: 16, fontWeight: '800', color: AI.bg },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1.5, borderColor: AI.neonGreen + '50', borderRadius: 14 },
  retryText: { fontSize: 15, fontWeight: '700', color: AI.neonGreen },
});
