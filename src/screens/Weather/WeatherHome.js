import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Dimensions, Animated, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../context/LanguageContext';

const { height: H } = Dimensions.get('window');
const HERO_H = H * 0.62;
const CARD_W = 84;
const CARD_GAP = 12;
const SNAP_W = CARD_W + CARD_GAP;

// ── WMO weather code helpers ───────────────────────────────────────────────────
function wmoIcon(code) {
  if (code === 0)   return 'sunny';
  if (code <= 2)    return 'partly-sunny';
  if (code <= 3)    return 'cloudy';
  if (code <= 48)   return 'partly-sunny';
  if (code <= 65)   return 'rainy';
  if (code <= 77)   return 'snow';
  if (code <= 82)   return 'rainy';
  if (code >= 95)   return 'thunderstorm';
  return 'partly-sunny';
}

function wmoCondition(code) {
  if (code === 0)   return 'Clear Sky';
  if (code <= 2)    return 'Partly Cloudy';
  if (code <= 3)    return 'Overcast';
  if (code <= 48)   return 'Foggy';
  if (code <= 55)   return 'Light Drizzle';
  if (code <= 65)   return 'Rainy';
  if (code <= 77)   return 'Snowy';
  if (code <= 82)   return 'Rain Showers';
  if (code >= 95)   return 'Thunderstorm';
  return 'Partly Cloudy';
}

function getFarmingTip(code, humidity, temp) {
  if (code >= 95) return 'Thunderstorm expected — stay indoors, postpone all field work.';
  if (code >= 61) return 'Rain likely — avoid pesticide/fertilizer spraying. Good time for sowing.';
  if (humidity > 80) return 'High humidity — watch for fungal diseases. Ensure good field drainage.';
  if (temp > 38)  return 'Heat wave — irrigate early morning or evening. Protect young seedlings.';
  if (temp < 15)  return 'Cool weather — ideal for rabi crops. Monitor for frost in low-lying fields.';
  return 'Good farming conditions. Ideal for field operations and crop inspection.';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatHour(isoString) {
  const h = new Date(isoString).getHours();
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function buildWeatherData(omData, cityName, stateName) {
  const c      = omData.current;
  const daily  = omData.daily;
  const hourly = omData.hourly;

  const nowMs = Date.now();
  const hourlyItems = [];
  for (let i = 0; i < hourly.time.length && hourlyItems.length < 24; i++) {
    if (new Date(hourly.time[i]).getTime() < nowMs) continue;
    hourlyItems.push({
      time: formatHour(hourly.time[i]),
      icon: wmoIcon(hourly.weather_code[i]),
      temp: Math.round(hourly.temperature_2m[i]),
      rain: hourly.precipitation_probability[i] || 0,
    });
  }

  const weekly = daily.time.slice(0, 7).map((date, i) => ({
    day:  DAY_NAMES[new Date(date).getDay()],
    icon: wmoIcon(daily.weather_code[i]),
    rain: daily.precipitation_probability_max?.[i] || 0,
    low:  Math.round(daily.temperature_2m_min[i]),
    high: Math.round(daily.temperature_2m_max[i]),
  }));

  return {
    city:  cityName,
    state: stateName,
    current: {
      temp:       Math.round(c.temperature_2m),
      feelsLike:  Math.round(c.apparent_temperature),
      humidity:   c.relative_humidity_2m,
      windSpeed:  Math.round(c.wind_speed_10m),
      rainChance: daily.precipitation_probability_max?.[0] || 0,
      icon:       wmoIcon(c.weather_code),
      condition:  wmoCondition(c.weather_code),
      visibility: 10,
      uvIndex:    Math.round(c.uv_index ?? 0),
      pressure:   Math.round(c.surface_pressure ?? 1013),
    },
    hourly: hourlyItems,
    weekly,
    alerts: [],
    farmingTip: getFarmingTip(c.weather_code, c.relative_humidity_2m, c.temperature_2m),
  };
}

const ICON_MAP = {
  'sunny': 'sunny', 'partly-sunny': 'partly-sunny',
  'cloudy': 'cloud', 'rainy': 'rainy',
  'thunderstorm': 'thunderstorm', 'snow': 'snow',
};

// ── Floating Ambient Particle ─────────────────────────────────────────────────
function FloatingParticle({ icon, size, color, particleStyle, delay, duration }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.6, 0.2] });
  const scale      = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 1.1, 0.85] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.particle, particleStyle, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <Ionicons name={icon} size={size} color={color || 'rgba(255,255,255,0.5)'} />
    </Animated.View>
  );
}

// ── 3D Tilt Card ──────────────────────────────────────────────────────────────
function TiltCard({ children, style, innerStyle }) {
  const tilt  = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Animated.spring(scale, { toValue: 1.03, useNativeDriver: true, tension: 120, friction: 8 }).start();
      },
      onPanResponderMove: (_, gs) => {
        tilt.setValue({
          x: Math.max(-12, Math.min(12, gs.dx / 6)),
          y: Math.max(-12, Math.min(12, gs.dy / 6)),
        });
      },
      onPanResponderRelease: () => {
        Animated.parallel([
          Animated.spring(tilt, { toValue: { x: 0, y: 0 }, useNativeDriver: true, tension: 100, friction: 7 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
        ]).start();
      },
    })
  ).current;

  const rotateX = tilt.y.interpolate({ inputRange: [-12, 12], outputRange: ['8deg', '-8deg'] });
  const rotateY = tilt.x.interpolate({ inputRange: [-12, 12], outputRange: ['-8deg', '8deg'] });

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]} {...panResponder.panHandlers}>
      <Animated.View style={[innerStyle, { transform: [{ perspective: 600 }, { rotateX }, { rotateY }] }]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

// ── 3D Hourly Card ────────────────────────────────────────────────────────────
function HourlyCard3D({ item, index, scrollX }) {
  const inputRange = [
    (index - 1) * SNAP_W,
    index * SNAP_W,
    (index + 1) * SNAP_W,
  ];

  const rotateY = scrollX.interpolate({
    inputRange, outputRange: ['28deg', '0deg', '-28deg'], extrapolate: 'clamp',
  });
  const cardScale = scrollX.interpolate({
    inputRange, outputRange: [0.86, 1, 0.86], extrapolate: 'clamp',
  });
  const opacity = scrollX.interpolate({
    inputRange, outputRange: [0.65, 1, 0.65], extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.hourlyCard,
        { opacity, transform: [{ perspective: 900 }, { rotateY }, { scale: cardScale }] },
      ]}
    >
      <Text style={styles.hourlyTime}>{item.time}</Text>
      <Ionicons name={ICON_MAP[item.icon] || 'partly-sunny'} size={26} color="#fff" />
      <Text style={styles.hourlyTemp}>{item.temp}°</Text>
      {item.rain > 0 && (
        <View style={styles.rainRow}>
          <Ionicons name="water" size={10} color="#93C5FD" />
          <Text style={styles.rainText}>{item.rain}%</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ── Animated Daily Row ────────────────────────────────────────────────────────
function DailyRow3D({ item, index }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 450, delay: 300 + index * 80, useNativeDriver: true,
    }).start();
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-44, 0] });
  const opacity    = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Animated.View style={[styles.dailyRow, { opacity, transform: [{ translateX }] }]}>
      <Text style={styles.dailyDay}>{item.day}</Text>
      <Ionicons name={ICON_MAP[item.icon] || 'partly-sunny'} size={22} color="rgba(255,255,255,0.75)" />
      <View style={styles.dailyRainBar}>
        <View style={[styles.dailyRainFill, { width: `${Math.min(item.rain, 100)}%` }]} />
      </View>
      <Text style={styles.dailyRainPct}>{item.rain}%</Text>
      <Text style={styles.dailyLow}>{item.low}°</Text>
      <Text style={styles.dailyHigh}>{item.high}°</Text>
    </Animated.View>
  );
}

// ── 3D Stat Card ──────────────────────────────────────────────────────────────
function StatCard3D({ icon, label, value, unit, color, index }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 550, delay: 200 + index * 100, useNativeDriver: true,
    }).start();
  }, []);

  const cardScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const opacity   = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <TiltCard style={styles.statCardOuter} innerStyle={styles.statCardInner}>
      <Animated.View style={[styles.statCardContent, { opacity, transform: [{ scale: cardScale }] }]}>
        <View style={[styles.statIconRing, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={24} color={color || '#60A5FA'} />
        </View>
        <Text style={styles.statValue}>{value}{unit}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </Animated.View>
    </TiltCard>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WeatherHome({ navigation }) {
  const { t } = useLanguage();
  const [weather,  setWeather]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [locLabel, setLocLabel] = useState('Detecting location…');
  const [error,    setError]    = useState(null);

  // Scroll values
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

  // Ambient animations
  const pulse        = useRef(new Animated.Value(1)).current;
  const heroEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing weather icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.13, duration: 1900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1900, useNativeDriver: true }),
      ])
    ).start();

    // Hero entrance
    Animated.timing(heroEntrance, {
      toValue: 1, duration: 850, delay: 200, useNativeDriver: true,
    }).start();
  }, []);

  // Hero scroll-driven 3D transforms
  const heroScale   = scrollY.interpolate({ inputRange: [0, 220], outputRange: [1, 0.88],   extrapolate: 'clamp' });
  const heroRotateX = scrollY.interpolate({ inputRange: [0, 220], outputRange: ['0deg', '5deg'], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 180], outputRange: [1, 0.55],   extrapolate: 'clamp' });

  const heroEntranceStyle = {
    opacity:   heroEntrance,
    transform: [{ translateY: heroEntrance.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }],
  };

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let lat = 18.52, lon = 73.86;
      let cityName = 'Pune', stateName = 'Maharashtra';

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
        const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (places.length > 0) {
          const p = places[0];
          cityName  = p.city || p.district || p.subregion || p.name || 'Your Location';
          stateName = p.region || 'India';
        }
      }
      setLocLabel(`${cityName}, ${stateName}`);

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,cloud_cover,surface_pressure,uv_index` +
        `&hourly=temperature_2m,weather_code,precipitation_probability` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
        `&forecast_days=7&timezone=Asia/Kolkata&wind_speed_unit=kmh`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setWeather(buildWeatherData(data, cityName, stateName));
    } catch (e) {
      console.error('[Weather]', e.message);
      setError('Could not load weather. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient colors={['#060D1A', '#0F2A1A']} style={styles.fullCenter}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Ionicons name="partly-sunny-outline" size={72} color="rgba(255,255,255,0.35)" />
        </Animated.View>
        <ActivityIndicator size="large" color="rgba(255,255,255,0.7)" style={{ marginTop: 28 }} />
        <Text style={styles.loadingText}>{locLabel}</Text>
      </LinearGradient>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !weather) {
    return (
      <LinearGradient colors={['#060D1A', '#101820']} style={styles.fullCenter}>
        <Ionicons name="cloud-offline-outline" size={68} color="rgba(255,255,255,0.3)" />
        <Text style={styles.errorText}>{error || 'No weather data'}</Text>
        <TouchableOpacity onPress={fetchWeather} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // Dynamic gradient per condition
  const bgColors =
    weather.current.rainChance > 50 ? ['#060E1F', '#0A2040', '#1A3A6A'] :
    weather.current.temp > 35       ? ['#1A0800', '#5C1A00', '#C2410C'] :
                                      ['#060E1F', '#0A1F3A', '#0D3524'];

  const PARTICLES = [
    { icon: 'cloud',        size: 30, color: 'rgba(255,255,255,0.3)', delay: 0,   duration: 3200, particleStyle: { top: '10%', left: '6%' }  },
    { icon: 'cloud',        size: 18, color: 'rgba(255,255,255,0.2)', delay: 500, duration: 2900, particleStyle: { top: '22%', right: '8%' }  },
    { icon: 'star',         size: 12, color: 'rgba(255,220,100,0.6)', delay: 200, duration: 2500, particleStyle: { top: '7%',  left: '38%' }  },
    { icon: 'star',         size: 8,  color: 'rgba(255,220,100,0.5)', delay: 700, duration: 3100, particleStyle: { top: '33%', left: '18%' }  },
    { icon: 'star',         size: 10, color: 'rgba(255,220,100,0.4)', delay: 100, duration: 2700, particleStyle: { top: '5%',  right: '28%' } },
    { icon: 'water',        size: 16, color: 'rgba(147,197,253,0.6)', delay: 600, duration: 3400, particleStyle: { top: '38%', right: '5%' }  },
    { icon: 'leaf-outline', size: 14, color: 'rgba(134,239,172,0.5)', delay: 900, duration: 2800, particleStyle: { top: '43%', left: '4%' }   },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* ────────── HERO ────────── */}
        <Animated.View
          style={[
            styles.heroWrapper,
            {
              transform: [
                { perspective: 1200 },
                { scale: heroScale },
                { rotateX: heroRotateX },
              ],
              opacity: heroOpacity,
            },
          ]}
        >
          <LinearGradient colors={bgColors} style={styles.heroGradient}>
            {/* Ambient particles */}
            {PARTICLES.map((p, i) => <FloatingParticle key={i} {...p} />)}

            {/* Location bar */}
            <Animated.View style={[styles.locationBar, heroEntranceStyle]}>
              <Ionicons name="location" size={15} color="rgba(255,255,255,0.8)" />
              <Text style={styles.locationName}>{weather.city}, {weather.state}</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={fetchWeather}>
                <Ionicons name="refresh" size={18} color="#fff" />
              </TouchableOpacity>
            </Animated.View>

            {/* Main weather content */}
            <Animated.View style={[styles.heroCenter, heroEntranceStyle]}>
              {/* Glowing pulsing icon */}
              <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }] }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)']}
                  style={styles.iconGlow}
                >
                  <Ionicons
                    name={ICON_MAP[weather.current.icon] || 'partly-sunny'}
                    size={92}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </Animated.View>

              <Text style={styles.tempText}>{weather.current.temp}°</Text>
              <Text style={styles.conditionText}>{weather.current.condition}</Text>
              <Text style={styles.feelsLikeText}>Feels like {weather.current.feelsLike}°C</Text>
            </Animated.View>

            {/* Quick stats strip */}
            <Animated.View style={[styles.statsStrip, heroEntranceStyle]}>
              <View style={styles.stripStat}>
                <Ionicons name="water" size={17} color="#93C5FD" />
                <Text style={styles.stripVal}>{weather.current.humidity}%</Text>
                <Text style={styles.stripLabel}>Humidity</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripStat}>
                <Ionicons name="rainy" size={17} color="#93C5FD" />
                <Text style={styles.stripVal}>{weather.current.rainChance}%</Text>
                <Text style={styles.stripLabel}>Rain</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripStat}>
                <Ionicons name="leaf" size={17} color="#86EFAC" />
                <Text style={styles.stripVal}>{weather.current.windSpeed}</Text>
                <Text style={styles.stripLabel}>km/h</Text>
              </View>
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        {/* ────────── BODY ────────── */}
        <View style={styles.body}>

          {/* Farming Tip — tiltable 3D card */}
          <TiltCard style={styles.tipOuter} innerStyle={styles.tipInner}>
            <LinearGradient colors={['#0F2A14', '#183D20']} style={styles.tipGradient}>
              <View style={styles.tipIconRing}>
                <Ionicons name="bulb" size={26} color="#FCD34D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Farming Tip</Text>
                <Text style={styles.tipText}>{weather.farmingTip}</Text>
              </View>
            </LinearGradient>
          </TiltCard>

          {/* Hourly — 3D perspective carousel */}
          {weather.hourly.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('todayHourly')}</Text>
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                snapToInterval={SNAP_W}
                decelerationRate="fast"
                contentContainerStyle={styles.hourlyContent}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: true }
                )}
              >
                {weather.hourly.map((item, i) => (
                  <HourlyCard3D key={i} item={item} index={i} scrollX={scrollX} />
                ))}
              </Animated.ScrollView>
            </View>
          )}

          {/* Stats — 2×2 tiltable grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('moreDetails')}</Text>
            <View style={styles.statsGrid}>
              <StatCard3D icon="eye"         label="Visibility" value={weather.current.visibility} unit=" km"  color="#60A5FA" index={0} />
              <StatCard3D icon="sunny"       label="UV Index"   value={weather.current.uvIndex}    unit=""     color="#FBBF24" index={1} />
              <StatCard3D icon="speedometer" label="Pressure"   value={weather.current.pressure}   unit=" hPa" color="#C084FC" index={2} />
              <StatCard3D icon="water"       label="Humidity"   value={weather.current.humidity}   unit="%"    color="#34D399" index={3} />
            </View>
          </View>

          {/* 7-Day forecast — staggered rows */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('weekForecast')}</Text>
            <View style={styles.weekCard}>
              {weather.weekly.map((item, i) => (
                <DailyRow3D key={i} item={item} index={i} />
              ))}
            </View>
          </View>

          {/* Nav buttons */}
          <TouchableOpacity
            style={styles.navBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CropCalendar')}
          >
            <LinearGradient colors={['#0D3020', '#1B5E37']} style={styles.navBtnGrad}>
              <View style={styles.navBtnIcon}>
                <Ionicons name="calendar" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.navBtnTitle}>{t('cropPersonalization')}</Text>
                <Text style={styles.navBtnSub}>{t('cropCalendarSub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, { marginBottom: 32 }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('StateCrops', { state: weather.state })}
          >
            <LinearGradient colors={['#0D1040', '#1A237E']} style={styles.navBtnGrad}>
              <View style={[styles.navBtnIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="map-outline" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.navBtnTitle}>State Farming Guide</Text>
                <Text style={styles.navBtnSub}>Crops & practices for {weather.state}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          </TouchableOpacity>

        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#060E1F' },
  fullCenter:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.5)', marginTop: 14, fontSize: 14, letterSpacing: 0.4 },
  errorText:   { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  retryBtn:    { marginTop: 22, backgroundColor: '#1B5E37', paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14 },
  retryText:   { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Hero
  heroWrapper: {
    height: HERO_H,
    overflow: 'hidden',
  },
  heroGradient: {
    flex: 1,
    paddingTop: 52,
    paddingHorizontal: 22,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  particle: { position: 'absolute' },

  locationBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10,
  },
  locationName: {
    flex: 1, fontSize: 15, fontWeight: '700',
    color: 'rgba(255,255,255,0.85)', letterSpacing: 0.3,
  },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  heroCenter: { alignItems: 'center', flex: 1, justifyContent: 'center', marginTop: -8 },
  iconWrap:   { marginBottom: 10 },
  iconGlow:   {
    width: 136, height: 136, borderRadius: 68,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  tempText:      { fontSize: 90, fontWeight: '900', color: '#fff', letterSpacing: -4, lineHeight: 96 },
  conditionText: { fontSize: 20, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 4 },
  feelsLikeText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 6 },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  stripStat:    { flex: 1, alignItems: 'center', gap: 4 },
  stripDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  stripVal:     { fontSize: 18, fontWeight: '800', color: '#fff' },
  stripLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },

  // Body
  body: { backgroundColor: '#060E1F', paddingTop: 4 },

  // Farming Tip
  tipOuter:    { marginHorizontal: 16, marginVertical: 12, borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium },
  tipInner:    { borderRadius: 20, overflow: 'hidden' },
  tipGradient: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  tipIconRing: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(252,211,77,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  tipTitle: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: 0.4 },
  tipText:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },

  // Sections
  section:      { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 14, letterSpacing: 0.2 },

  // Hourly
  hourlyContent: { gap: CARD_GAP, paddingHorizontal: 4, paddingVertical: 10 },
  hourlyCard: {
    width: CARD_W, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 22, padding: 14, gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  hourlyTime: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  hourlyTemp: { fontSize: 19, fontWeight: '800', color: '#fff' },
  rainRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rainText:   { fontSize: 11, color: '#93C5FD' },

  // Stats grid
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCardOuter:  { width: '47%' },
  statCardInner:  { borderRadius: 20, overflow: 'hidden' },
  statCardContent: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20, padding: 18, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  statIconRing: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },

  // Weekly
  weekCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, padding: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  dailyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dailyDay:     { width: 36, fontSize: 14, fontWeight: '700', color: '#fff' },
  dailyRainBar: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  dailyRainFill:{ height: '100%', backgroundColor: '#60A5FA', borderRadius: 3 },
  dailyRainPct: { width: 32, fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  dailyLow:     { width: 30, fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'right' },
  dailyHigh:    { width: 36, fontSize: 14, fontWeight: '800', color: '#fff', textAlign: 'right' },

  // Nav buttons
  navBtn: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium,
  },
  navBtnGrad: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  navBtnIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  navBtnTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  navBtnSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
});
