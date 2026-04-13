/**
 * WeatherHome — FarmEasy Field Monitor
 *
 * Sections:
 *  1. Hero card  — gradient bg + ImageBackground field photo + temp + sun arc
 *  2. IMD alert banner  (if alerts exist)
 *  3. Farming advisories  (horizontal scroll)
 *  4. Hourly forecast     (horizontal scroll)
 *  5. 7-day forecast      (vertical list)
 *  6. Soil dashboard      (temp depths + moisture bars + ET)
 *  7. Sunrise / Sunset arc
 *
 * Data: backend /api/v1/weather (Open-Meteo + IMD)
 * Offline: AsyncStorage cache → rendered immediately on open
 * Temperature: Celsius (°C) — Indian standard
 */
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, StatusBar, Platform,
  ImageBackground, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchWeatherForCurrentLocation, formatLastUpdated } from '../../services/weatherApi';
import { useLanguage } from '../../context/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');
const CARD_W = (W - 32 - 10) / 2;

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  green:      '#1B5E20',
  greenLight: '#2D7D46',
  amber:      '#F57F17',
  amberLight: '#FFB300',
  bg:         '#F0F4F0',
  card:       '#FFFFFF',
  text:       '#1A1A1A',
  sub:        '#6B7280',
  border:     '#EBEBEB',
};

// ── Dynamic hero gradient by weather code + hour ──────────────────────────────
function heroGradient(weatherCode, hour) {
  const isNight = hour < 6 || hour >= 19;
  if (weatherCode >= 95) return ['#1A237E', '#37474F'];              // storm — dark blue-grey
  if (weatherCode >= 61) return ['#263238', '#37474F'];              // rain  — dark grey-blue
  if (weatherCode >= 3)  return isNight ? ['#1C1C2E', '#2C3E50'] : ['#546E7A', '#78909C']; // cloudy
  // Clear
  if (isNight) return ['#0D1B2A', '#1B2A4A'];                        // clear night — deep blue
  if (hour < 8 || hour >= 17) return ['#E65100', '#F57F17'];         // sunrise/sunset — amber
  return ['#1565C0', '#1976D2'];                                     // clear day — sky blue
}

// ── Weather image selector ────────────────────────────────────────────────────
// Each image maps to a WMO condition range + time of day.
// Images live in assets/weather/ — see naming guide in project docs.
const WEATHER_IMAGES = {
  rain_day:      require('../../../assets/weather/wx_rain_day.jpg'),
  rain_night:    require('../../../assets/weather/wx_rain_night.jpg'),
  thunderstorm:  require('../../../assets/weather/wx_thunderstorm.jpg'),
  clear_night:   require('../../../assets/weather/wx_clear_night.jpg'),
  clear_morning: require('../../../assets/weather/wx_clear_morning.jpg'),
  clear_day:     require('../../../assets/weather/wx_clear_day.jpg'),
  sunrise:       require('../../../assets/weather/wx_sunrise.jpg'),
  cloudy:        require('../../../assets/weather/wx_cloudy.jpg'),
};

function getWeatherImage(weatherCode, hour) {
  const isNight = hour < 6 || hour >= 19;

  if (weatherCode >= 95) return WEATHER_IMAGES.thunderstorm;             // WMO 95-99 — thunder/lightning
  if (weatherCode >= 51) return isNight                                   // WMO 51-82 — rain
    ? WEATHER_IMAGES.rain_night
    : WEATHER_IMAGES.rain_day;
  if (weatherCode >= 3)  return WEATHER_IMAGES.cloudy;                   // WMO 3-48  — overcast/fog

  // WMO 0-2 — clear sky, split by hour
  if (isNight)                        return WEATHER_IMAGES.clear_night;  // 19:00 – 05:59
  if (hour >= 5  && hour < 8)         return WEATHER_IMAGES.sunrise;      // early golden light
  if (hour >= 17 && hour < 20)        return WEATHER_IMAGES.sunrise;      // evening golden light
  if (hour >= 8  && hour < 10)        return WEATHER_IMAGES.clear_morning;// misty morning
  return WEATHER_IMAGES.clear_day;                                        // 10:00 – 16:59
}

// ── Advisory color ────────────────────────────────────────────────────────────
const ADVISORY_COLORS = {
  green:  { bg: 'rgba(27,94,32,0.10)',  border: '#1B5E20', icon: '#1B5E20' },
  orange: { bg: 'rgba(245,127,23,0.10)', border: '#F57F17', icon: '#F57F17' },
  red:    { bg: 'rgba(183,28,28,0.10)', border: '#B71C1C', icon: '#B71C1C' },
};

// ── Alert colours ─────────────────────────────────────────────────────────────
const ALERT_COLORS = {
  red:    { bg: 'rgba(220,38,38,0.07)',  border: '#DC2626', icon: '#DC2626', badge: '#DC2626' },
  orange: { bg: 'rgba(234,88,12,0.07)',  border: '#EA580C', icon: '#EA580C', badge: '#EA580C' },
  blue:   { bg: 'rgba(59,130,246,0.07)', border: '#3B82F6', icon: '#3B82F6', badge: '#3B82F6' },
  yellow: { bg: 'rgba(202,138,4,0.07)',  border: '#CA8A04', icon: '#CA8A04', badge: '#CA8A04' },
};

// ── Generate alerts from 7-day forecast + IMD ─────────────────────────────────
function generateWeatherAlerts(daily, imdAlerts, lang) {
  const list = [];
  const hi = lang === 'hi';

  for (const day of (daily || [])) {
    // Thunderstorm (WMO 95–99)
    if (day.weatherCode >= 95) {
      list.push({
        color: 'red', severity: 'HIGH',
        icon:  'thunderstorm-outline',
        title: hi ? 'तूफान चेतावनी' : 'Thunderstorm Warning',
        day:   day.dateLabel,
        desc:  hi
          ? `${day.dateLabel} को बिजली के साथ भारी तूफान की संभावना है।`
          : `Severe thunderstorm with lightning likely on ${day.dateLabel}.`,
      });
    }
    // Heavy rain (WMO 63–82) or rainfall ≥ 15 mm
    else if (day.weatherCode >= 63 || day.precipitationSum >= 15) {
      list.push({
        color: 'orange', severity: 'MED',
        icon:  'rainy-outline',
        title: hi ? 'भारी बारिश चेतावनी' : 'Heavy Rain Warning',
        day:   day.dateLabel,
        desc:  hi
          ? `${day.dateLabel} को ${day.precipitationSum} mm वर्षा अपेक्षित।`
          : `${day.precipitationSum} mm rainfall expected on ${day.dateLabel}.`,
      });
    }
    // Rain likely (≥ 70 % probability, WMO 51+)
    else if (day.precipitationProbability >= 70 && day.weatherCode >= 51) {
      list.push({
        color: 'blue', severity: 'LOW',
        icon:  'water-outline',
        title: hi ? 'बारिश की संभावना' : 'Rain Expected',
        day:   day.dateLabel,
        desc:  hi
          ? `${day.dateLabel} को ${day.precipitationProbability}% बारिश की संभावना।`
          : `${day.precipitationProbability}% chance of rain on ${day.dateLabel}.`,
      });
    }

    // Strong wind ≥ 50 km/h
    if (day.windSpeedMax >= 50) {
      list.push({
        color: day.windSpeedMax >= 70 ? 'red' : 'orange',
        severity: day.windSpeedMax >= 70 ? 'HIGH' : 'MED',
        icon:  'navigate-outline',
        title: hi ? 'तेज़ हवा चेतावनी' : 'Strong Wind Warning',
        day:   day.dateLabel,
        desc:  hi
          ? `${day.dateLabel} को ${day.windSpeedMax} km/h तेज़ हवा।`
          : `Wind gusts up to ${day.windSpeedMax} km/h on ${day.dateLabel}.`,
      });
    }

    // Extreme UV ≥ 8
    if (day.uvIndexMax >= 8) {
      list.push({
        color: 'yellow', severity: day.uvIndexMax >= 11 ? 'HIGH' : 'MED',
        icon:  'sunny-outline',
        title: hi ? 'उच्च UV स्तर' : 'High UV Index',
        day:   day.dateLabel,
        desc:  hi
          ? `${day.dateLabel} को UV इंडेक्स ${day.uvIndexMax} — धूप में सावधान रहें।`
          : `UV Index ${day.uvIndexMax} on ${day.dateLabel}. Avoid midday sun.`,
      });
    }
  }

  // Append IMD alerts (already fetched by backend)
  for (const a of (imdAlerts || [])) {
    list.push({
      color:    a.severity === 'high' ? 'red' : a.severity === 'medium' ? 'orange' : 'yellow',
      severity: a.severity === 'high' ? 'HIGH' : a.severity === 'medium' ? 'MED' : 'LOW',
      icon:     'warning-outline',
      title:    a.title,
      day:      'IMD',
      desc:     a.description,
    });
  }

  return list.slice(0, 3);
}

// ── Severity color for IMD alerts ─────────────────────────────────────────────
const SEVERITY_BG = { high: '#B71C1C', medium: '#E65100', low: '#F57F17' };

// ── Soil moisture bar color ───────────────────────────────────────────────────
function moistureColor(pct) {
  if (pct == null) return '#9CA3AF';
  if (pct < 20) return '#EF4444';   // dry — red
  if (pct < 50) return '#F59E0B';   // low — amber
  if (pct < 75) return '#22C55E';   // good — green
  return '#3B82F6';                  // wet — blue
}

// ── Sun arc: compute progress 0→1 ────────────────────────────────────────────
function sunProgress(sunriseIso, sunsetIso) {
  const now     = Date.now();
  const sunrise = new Date(sunriseIso).getTime();
  const sunset  = new Date(sunsetIso).getTime();
  if (now <= sunrise) return 0;
  if (now >= sunset)  return 1;
  return (now - sunrise) / (sunset - sunrise);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return <Text style={S.sectionHeader}>{title}</Text>;
}

// ── Hourly item (memoised for FlatList perf) ──────────────────────────────────
const HourlyItem = memo(({ item }) => (
  <View style={[S.hourlyItem, item.isNow && S.hourlyItemNow]}>
    <Text style={[S.hourlyTime, item.isNow && S.hourlyTimeNow]}>{item.isNow ? 'Now' : item.time}</Text>
    <Ionicons
      name={`${item.conditionIcon}-outline`}
      size={20}
      color={item.isNow ? '#FFFFFF' : C.greenLight}
    />
    <Text style={[S.hourlyTemp, item.isNow && S.hourlyTempNow]}>{item.temperature}°</Text>
    {item.precipitationProbability > 0 && (
      <View style={S.rainRow}>
        <Ionicons name="water" size={9} color={item.isNow ? 'rgba(255,255,255,0.8)' : '#3B82F6'} />
        <Text style={[S.rainPct, item.isNow && { color: 'rgba(255,255,255,0.8)' }]}>
          {item.precipitationProbability}%
        </Text>
      </View>
    )}
  </View>
));

// ── Daily row (memoised) ──────────────────────────────────────────────────────
const DailyRow = memo(({ item, isToday }) => {
  const range = item.maxTemp - item.minTemp || 1;
  return (
    <View style={[S.dailyRow, isToday && S.dailyRowToday]}>
      <Text style={[S.dailyDay, isToday && S.dailyDayToday]}>{item.dateLabel}</Text>
      <Ionicons name={`${item.conditionIcon}-outline`} size={22} color={isToday ? C.green : C.sub} />
      <View style={S.dailyTempWrap}>
        <Text style={S.dailyLow}>{item.minTemp}°</Text>
        {/* Temperature bar */}
        <View style={S.dailyBar}>
          <View style={[S.dailyBarFill, { flex: range }]} />
        </View>
        <Text style={S.dailyHigh}>{item.maxTemp}°</Text>
      </View>
      <View style={S.dailyRainBadge}>
        <Ionicons name="water" size={9} color="#3B82F6" />
        <Text style={S.dailyRainPct}>{item.precipitationProbability}%</Text>
      </View>
    </View>
  );
});

// ── Soil moisture bar ─────────────────────────────────────────────────────────
function MoistureBar({ label, value }) {
  const pct   = value != null ? Math.min(100, Math.max(0, value)) : 0;
  const color = moistureColor(value);
  const stateLabel = value == null ? '—'
    : value < 20  ? 'Dry'
    : value < 50  ? 'Low'
    : value < 75  ? 'Good'
    : 'Wet';

  return (
    <View style={S.moistureRow}>
      <Text style={S.moistureLabel}>{label}</Text>
      <View style={S.moistureTrack}>
        <Animated.View style={[S.moistureFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[S.moistureVal, { color }]}>{value != null ? `${value.toFixed(0)}%` : '—'} · {stateLabel}</Text>
    </View>
  );
}

// ── Soil temperature row ──────────────────────────────────────────────────────
function SoilTempRow({ label, value }) {
  return (
    <View style={S.soilTempRow}>
      <Ionicons name="thermometer-outline" size={14} color={C.amber} />
      <Text style={S.soilTempLabel}>{label}</Text>
      <Text style={S.soilTempVal}>{value != null ? `${value}°C` : '—'}</Text>
    </View>
  );
}

// ── Sun arc ───────────────────────────────────────────────────────────────────
// Renders a semicircle arc made of 40 coloured dots.
// Orange → amber → sky-blue → indigo as the day progresses.
// Sun glows at the current position; grey dots = remaining daylight.
function SunArc({ sunriseIso, sunsetIso, sunrise, sunset }) {
  const progress = sunProgress(sunriseIso, sunsetIso);
  const ARC_W    = W - 64;
  const ARC_H    = 120;
  const CX       = ARC_W / 2;
  const RX       = ARC_W / 2 - 6;
  const RY       = ARC_H - 14;

  // ── 40 dots along a semicircle (left = sunrise, right = sunset)
  const SEGMENTS = 40;
  const dots = Array.from({ length: SEGMENTS + 1 }, (_, i) => {
    const t     = i / SEGMENTS;
    const angle = Math.PI - t * Math.PI;           // π → 0
    return {
      x:    CX + RX * Math.cos(angle),
      y:    ARC_H - RY * Math.sin(angle),
      t,
      past: t <= progress,
    };
  });

  // ── Sun glow position
  const sunAngle = Math.PI - progress * Math.PI;
  const sunX     = CX + RX * Math.cos(sunAngle);
  const sunY     = ARC_H - RY * Math.sin(sunAngle);

  // ── Daylight duration label
  const durMs       = new Date(sunsetIso).getTime() - new Date(sunriseIso).getTime();
  const totalH      = Math.floor(durMs / 3_600_000);
  const totalM      = Math.round((durMs % 3_600_000) / 60_000);
  const daylightLbl = `${totalH}h ${totalM}m`;

  const isDay = progress > 0 && progress < 1;

  // dot colour — gradient across the arc
  function dotColor(t) {
    if (t < 0.20) return '#FB923C';   // early morning — orange
    if (t < 0.45) return '#FBBF24';   // morning       — amber
    if (t < 0.70) return '#38BDF8';   // afternoon     — sky blue
    return '#818CF8';                  // evening       — soft indigo
  }

  return (
    <View style={S.arcWrap}>

      {/* ── Arc canvas */}
      <View style={{ width: ARC_W, height: ARC_H + 8 }}>

        {/* Horizon baseline */}
        <View style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          height: 1.5, backgroundColor: '#E5E7EB', borderRadius: 1,
        }} />

        {/* Coloured dot segments */}
        {dots.map((d, i) => (
          <View key={i} style={{
            position:    'absolute',
            left:        d.x - 3,
            top:         d.y - 3,
            width:       6, height: 6, borderRadius: 3,
            backgroundColor: d.past ? dotColor(d.t) : '#D1D5DB',
            opacity:     d.past ? 1 : 0.40,
          }} />
        ))}

        {/* Glowing sun — moves along arc during day, sits at endpoints before/after */}
        <View style={{
          position:     'absolute',
          left:         sunX - 15, top: sunY - 15,
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: '#FFFBEB',
          alignItems: 'center', justifyContent: 'center',
          shadowColor:  '#F59E0B', shadowOpacity: 0.85,
          shadowOffset: { width: 0, height: 0 }, shadowRadius: 10,
          elevation:    10,
        }}>
          <Ionicons name="sunny" size={20} color="#F59E0B" />
        </View>
      </View>

      {/* ── Sunrise / duration / sunset labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', width: ARC_W, marginTop: 10 }}>
        <View style={{ alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 9, color: '#FB923C', fontWeight: '800', letterSpacing: 0.8 }}>SUNRISE</Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: C.text, marginTop: 1 }}>{sunrise}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Ionicons name="sunny-outline" size={15} color="#FBBF24" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.sub, marginTop: 3 }}>{daylightLbl}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, color: '#818CF8', fontWeight: '800', letterSpacing: 0.8 }}>SUNSET</Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: C.text, marginTop: 1 }}>{sunset}</Text>
        </View>
      </View>

      {/* ── Daylight progress bar */}
      <View style={{ width: ARC_W, marginTop: 14 }}>
        <View style={{ height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#FB923C', '#FBBF24', '#38BDF8']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ height: 4, width: `${Math.min(100, Math.round(progress * 100))}%`, borderRadius: 2 }}
          />
        </View>
        <Text style={{ fontSize: 10, color: C.sub, marginTop: 5, textAlign: 'center' }}>
          {isDay
            ? `${Math.round(progress * 100)}% of daylight passed`
            : progress === 0 ? 'Before sunrise' : 'After sunset'}
        </Text>
      </View>

    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════════
export default function WeatherHome({ navigation, embeddedInHub }) {
  const { language } = useLanguage();
  const lang = language === 'hi' ? 'hi' : 'en';

  const [weather,    setWeather]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [stale,      setStale]      = useState(false);
  const [cachedAt,   setCachedAt]   = useState(null);
  const [error,      setError]      = useState(null);
  const [dismissed,  setDismissed]  = useState(false); // IMD alert dismiss

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const applyData = useCallback(({ data, stale: s, cachedAt: ca }) => {
    if (!data) return;
    setWeather(data);
    setStale(!!s);
    setCachedAt(ca);
    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDismissed(false);
    fadeAnim.setValue(0);

    try {
      const result = await fetchWeatherForCurrentLocation({
        lang,
        onCacheHit: applyData, // renders cached data immediately
      });
      applyData(result);       // then overwrite with fresh data
    } catch (err) {
      setError(err.message || 'Could not load weather data');
      setLoading(false);
    }
  }, [lang, applyData, fadeAnim]);

  useEffect(() => { load(); }, []);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && !weather) {
    return (
      <View style={[S.root, S.center]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={C.green} />
        <Text style={S.loadTxt}>Fetching field data…</Text>
      </View>
    );
  }

  // ── Error (no cache) ───────────────────────────────────────────────────────
  if (error && !weather) {
    return (
      <View style={[S.root, S.center]}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={S.errTxt}>{error}</Text>
        <Text style={S.errSub}>कृपया इंटरनेट कनेक्ट करें{'\n'}Please connect to the internet</Text>
        <TouchableOpacity style={S.retryBtn} onPress={load}>
          <Text style={S.retryTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { current, hourly, daily, agriculture, advisories = [], alerts = [] } = weather;
  const today   = daily?.[0];
  const hour    = new Date().getHours();
  const gradient = heroGradient(current.weatherCode, hour);
  const visibleAlerts = dismissed ? [] : alerts;

  return (
    <Animated.View style={[S.root, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Standalone header (hidden inside AIWeatherHub) ─────────────── */}
      {!embeddedInHub && (
        <View style={[S.header, { paddingTop: Platform.OS === 'ios' ? 52 : 14 }]}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={S.headerCenter}>
            <Ionicons name="location" size={14} color={C.green} />
            <Text style={S.headerTitle}>Field Monitor</Text>
          </View>
          <TouchableOpacity onPress={load}>
            <Ionicons name="refresh-outline" size={22} color={C.text} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

        {/* ══ 1. HERO CARD ════════════════════════════════════════════════ */}
        <ImageBackground
          source={getWeatherImage(current.weatherCode, hour)}
          style={S.hero}
          imageStyle={S.heroImg}
          resizeMode="cover"
          blurRadius={1}
        >
          {/* Semi-transparent overlay — lets image show while keeping text readable */}
          <LinearGradient
            colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.62)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Location row */}
          <View style={S.heroLocRow}>
            <Ionicons name="location" size={12} color="rgba(255,255,255,0.80)" />
            <Text style={S.heroLoc}>
              {weather.meta?.location?.name
                ? weather.meta.location.name.toUpperCase()
                : `${parseFloat(weather.meta?.location?.lat ?? 0).toFixed(4)}°N, ${parseFloat(weather.meta?.location?.lon ?? 0).toFixed(4)}°E`}
            </Text>
            {stale && cachedAt ? (
              <Text style={S.staleBadge}>· {formatLastUpdated(cachedAt)}</Text>
            ) : null}
          </View>

          {/* Main temp */}
          <Text style={S.heroTemp}>{current.temperature}°C</Text>
          <Text style={S.heroCond}>{current.condition}</Text>

          {/* Secondary stats row */}
          <View style={S.heroStats}>
            <View style={S.heroStat}>
              <Ionicons name="thermometer-outline" size={13} color="rgba(255,255,255,0.70)" />
              <Text style={S.heroStatTxt}>Feels {current.feelsLike}°C</Text>
            </View>
            <View style={S.heroStatDivider} />
            <View style={S.heroStat}>
              <Ionicons name="water-outline" size={13} color="rgba(255,255,255,0.70)" />
              <Text style={S.heroStatTxt}>{current.humidity}%</Text>
            </View>
            <View style={S.heroStatDivider} />
            <View style={S.heroStat}>
              <Ionicons name="navigate-outline" size={13} color="rgba(255,255,255,0.70)" />
              <Text style={S.heroStatTxt}>{current.windSpeed} km/h {current.windCompass}</Text>
            </View>
            {current.uvIndex > 0 && (
              <>
                <View style={S.heroStatDivider} />
                <View style={S.heroStat}>
                  <Ionicons name="sunny-outline" size={13} color="rgba(255,255,255,0.70)" />
                  <Text style={S.heroStatTxt}>UV {current.uvIndex}</Text>
                </View>
              </>
            )}
          </View>

          {/* Today min/max */}
          {today && (
            <View style={S.heroMinMax}>
              <Text style={S.heroMinMaxTxt}>
                H: {today.maxTemp}°C · L: {today.minTemp}°C
              </Text>
            </View>
          )}
        </ImageBackground>

        {/* ══ 2. IMD ALERT BANNER ═════════════════════════════════════════ */}
        {visibleAlerts.length > 0 && (
          <View style={[S.alertBanner, { backgroundColor: SEVERITY_BG[visibleAlerts[0].severity] + '22', borderColor: SEVERITY_BG[visibleAlerts[0].severity] }]}>
            <Ionicons name="warning" size={20} color={SEVERITY_BG[visibleAlerts[0].severity]} />
            <View style={S.alertBody}>
              <Text style={[S.alertTitle, { color: SEVERITY_BG[visibleAlerts[0].severity] }]}>
                {visibleAlerts[0].title}
              </Text>
              <Text style={S.alertDesc} numberOfLines={2}>{visibleAlerts[0].description}</Text>
            </View>
            <TouchableOpacity onPress={() => setDismissed(true)}>
              <Ionicons name="close" size={18} color={C.sub} />
            </TouchableOpacity>
          </View>
        )}

        {/* ══ 3. FARMING ADVISORIES ═══════════════════════════════════════ */}
        {advisories.length > 0 && (
          <View style={S.section}>
            <SectionHeader title={lang === 'hi' ? 'कृषि सलाह' : 'Farming Advisories'} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.advisoryRow}>
              {advisories.map((adv, i) => {
                const col = ADVISORY_COLORS[adv.color] || ADVISORY_COLORS.green;
                return (
                  <View key={i} style={[S.advisoryCard, { backgroundColor: col.bg, borderColor: col.border }]}>
                    <Ionicons name={`${adv.icon}-outline`} size={22} color={col.icon} />
                    <Text style={[S.advisoryTitle, { color: col.icon }]}>{adv.title}</Text>
                    <Text style={S.advisoryDesc}>{adv.desc}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ══ 4. HOURLY FORECAST ══════════════════════════════════════════ */}
        {hourly?.length > 0 && (
          <View style={S.section}>
            <SectionHeader title={lang === 'hi' ? 'प्रति घंटा पूर्वानुमान' : 'Hourly Forecast'} />
            <View style={S.card}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.hourlyRow}>
                {hourly.slice(0, 24).map((item, i) => (
                  <HourlyItem key={i} item={item} />
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* ══ 5. 7-DAY FORECAST ═══════════════════════════════════════════ */}
        {daily?.length > 0 && (
          <View style={S.section}>
            <SectionHeader title={lang === 'hi' ? '7-दिन का पूर्वानुमान' : '7-Day Forecast'} />
            <View style={S.card}>
              {daily.map((item, i) => (
                <React.Fragment key={i}>
                  <DailyRow item={item} isToday={i === 0} />
                  {i < daily.length - 1 && <View style={S.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* ══ 6. WEATHER ALERTS ══════════════════════════════════════════ */}
        {(() => {
          const wxAlerts = generateWeatherAlerts(daily, alerts, lang);
          return (
            <View style={S.section}>
              {/* Header row */}
              <View style={S.alertsHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="notifications" size={15} color={C.text} />
                  <Text style={S.sectionHeader}>
                    {lang === 'hi' ? 'मौसम अलर्ट' : 'Weather Alerts'}
                  </Text>
                </View>
                {wxAlerts.length > 0 && (
                  <View style={S.alertCountBadge}>
                    <Text style={S.alertCountTxt}>{wxAlerts.length}</Text>
                  </View>
                )}
              </View>

              {wxAlerts.length === 0 ? (
                /* All-clear card */
                <View style={S.allClearCard}>
                  <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={S.allClearTitle}>
                      {lang === 'hi' ? 'सब ठीक है!' : 'All Clear!'}
                    </Text>
                    <Text style={S.allClearDesc}>
                      {lang === 'hi'
                        ? 'अगले 7 दिनों में कोई गंभीर मौसम चेतावनी नहीं है।'
                        : 'No severe weather events expected in the next 7 days.'}
                    </Text>
                  </View>
                </View>
              ) : (
                wxAlerts.map((al, i) => {
                  const col = ALERT_COLORS[al.color] || ALERT_COLORS.yellow;
                  return (
                    <View key={i} style={[S.alertCard, { backgroundColor: col.bg, borderColor: col.border }]}>
                      {/* Left colour bar */}
                      <View style={[S.alertBar, { backgroundColor: col.border }]} />

                      {/* Icon */}
                      <View style={[S.alertIcon, { backgroundColor: col.border + '20' }]}>
                        <Ionicons name={al.icon} size={20} color={col.icon} />
                      </View>

                      {/* Text */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <Text style={[S.alertCardTitle, { color: col.icon }]}>{al.title}</Text>
                          <View style={[S.severityBadge, { backgroundColor: col.badge }]}>
                            <Text style={S.severityTxt}>{al.severity}</Text>
                          </View>
                        </View>
                        <Text style={S.alertDayTxt}>
                          <Ionicons name="calendar-outline" size={10} color={C.sub} /> {al.day}
                        </Text>
                        <Text style={S.alertCardDesc}>{al.desc}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          );
        })()}

        {/* ══ 7. SOIL DASHBOARD ═══════════════════════════════════════════ */}
        {agriculture && (
          <View style={S.section}>
            <SectionHeader title={lang === 'hi' ? 'मिट्टी का डैशबोर्ड' : 'Soil Dashboard'} />
            <View style={S.card}>

              {/* Soil temperatures */}
              <Text style={S.soilGroupLabel}>{lang === 'hi' ? 'मिट्टी का तापमान' : 'Soil Temperature'}</Text>
              <SoilTempRow label={lang === 'hi' ? 'सतह (0cm)'   : 'Surface (0cm)'}  value={agriculture.soilTemperature.surface}  />
              <SoilTempRow label={lang === 'hi' ? 'गहराई 6cm'    : 'Depth 6cm'}      value={agriculture.soilTemperature.depth6cm} />
              <SoilTempRow label={lang === 'hi' ? 'गहराई 18cm'   : 'Depth 18cm'}     value={agriculture.soilTemperature.depth18cm} />

              <View style={S.divider} />

              {/* Soil moisture */}
              <Text style={S.soilGroupLabel}>{lang === 'hi' ? 'मिट्टी की नमी' : 'Soil Moisture'}</Text>
              <MoistureBar label={lang === 'hi' ? 'सतह 0–1cm'   : 'Surface 0–1cm'}   value={agriculture.soilMoisture.surface}     />
              <MoistureBar label={lang === 'hi' ? 'गहराई 1–3cm' : 'Depth 1–3cm'}     value={agriculture.soilMoisture.depth1to3cm} />
              <MoistureBar label={lang === 'hi' ? 'गहराई 3–9cm' : 'Depth 3–9cm'}     value={agriculture.soilMoisture.depth3to9cm} />

              <View style={S.divider} />

              {/* Evapotranspiration */}
              <View style={S.etRow}>
                <Ionicons name="leaf-outline" size={16} color={C.green} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={S.etLabel}>{lang === 'hi' ? 'वाष्पोत्सर्जन (ET)' : 'Evapotranspiration (ET)'}</Text>
                  <Text style={S.etSub}>
                    {lang === 'hi'
                      ? 'पौधे + मिट्टी से पानी का वाष्पीकरण'
                      : 'Water lost from crop + soil to atmosphere'}
                  </Text>
                </View>
                <Text style={S.etVal}>
                  {agriculture.evapotranspiration != null ? `${agriculture.evapotranspiration} mm` : '—'}
                </Text>
              </View>
              {agriculture.referenceET != null && (
                <View style={[S.etRow, { marginTop: 6 }]}>
                  <Ionicons name="water-outline" size={16} color="#3B82F6" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={S.etLabel}>
                      {lang === 'hi' ? 'संदर्भ ET (FAO-56)' : 'Reference ET (FAO-56)'}
                    </Text>
                    <Text style={S.etSub}>
                      {lang === 'hi' ? 'सिंचाई निर्णय का आधार' : 'Basis for irrigation scheduling'}
                    </Text>
                  </View>
                  <Text style={S.etVal}>{agriculture.referenceET} mm</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ══ 7. SUNRISE / SUNSET ARC ═════════════════════════════════════ */}
        {today?.sunriseIso && today?.sunsetIso && (
          <View style={S.section}>
            <SectionHeader title={lang === 'hi' ? 'सूर्योदय / सूर्यास्त' : 'Sunrise & Sunset'} />
            <View style={S.card}>
              <SunArc
                sunriseIso={today.sunriseIso}
                sunsetIso={today.sunsetIso}
                sunrise={today.sunrise}
                sunset={today.sunset}
              />
            </View>
          </View>
        )}

        {/* ══ 8. ATMOSPHERE DASHBOARD ════════════════════════════════════ */}
        {current && (
          <View style={S.section}>
            <SectionHeader title={lang === 'hi' ? 'वायुमंडल डेटा' : 'Atmosphere'} />
            <View style={S.card}>
              <View style={S.atmoGrid}>

                {/* Visibility */}
                <View style={S.atmoItem}>
                  <Ionicons name="eye-outline" size={20} color="#6366F1" />
                  <Text style={S.atmoVal}>{current.visibility != null ? `${current.visibility} km` : '—'}</Text>
                  <Text style={S.atmoLabel}>{lang === 'hi' ? 'दृश्यता' : 'Visibility'}</Text>
                </View>

                {/* Dew Point */}
                <View style={S.atmoItem}>
                  <Ionicons name="thermometer-outline" size={20} color="#0EA5E9" />
                  <Text style={S.atmoVal}>{current.dewPoint != null ? `${current.dewPoint}°C` : '—'}</Text>
                  <Text style={S.atmoLabel}>{lang === 'hi' ? 'ओस बिंदु' : 'Dew Point'}</Text>
                </View>

                {/* Wind Gusts */}
                <View style={S.atmoItem}>
                  <Ionicons name="navigate-outline" size={20} color="#F59E0B" />
                  <Text style={S.atmoVal}>{current.windGusts != null ? `${current.windGusts} km/h` : '—'}</Text>
                  <Text style={S.atmoLabel}>{lang === 'hi' ? 'हवा के झोंके' : 'Wind Gusts'}</Text>
                </View>

                {/* Leaf Wetness */}
                <View style={S.atmoItem}>
                  <Ionicons name="leaf-outline" size={20} color="#16A34A" />
                  <Text style={[S.atmoVal, { color: (current.leafWetness ?? 0) > 60 ? '#DC2626' : C.text }]}>
                    {current.leafWetness != null ? `${Math.round(current.leafWetness)}%` : '—'}
                  </Text>
                  <Text style={S.atmoLabel}>{lang === 'hi' ? 'पत्ती नमी' : 'Leaf Wetness'}</Text>
                </View>

                {/* VPD */}
                <View style={S.atmoItem}>
                  <Ionicons name="water-outline" size={20} color="#EA580C" />
                  <Text style={[S.atmoVal, { color: (current.vapourPressureDeficit ?? 0) > 2 ? '#DC2626' : C.text }]}>
                    {current.vapourPressureDeficit != null ? `${current.vapourPressureDeficit} kPa` : '—'}
                  </Text>
                  <Text style={S.atmoLabel}>{lang === 'hi' ? 'VPD (जल तनाव)' : 'VPD'}</Text>
                </View>

                {/* CAPE */}
                <View style={S.atmoItem}>
                  <Ionicons name="flash-outline" size={20} color={(current.cape ?? 0) > 1000 ? '#DC2626' : '#818CF8'} />
                  <Text style={[S.atmoVal, { color: (current.cape ?? 0) > 1000 ? '#DC2626' : C.text }]}>
                    {current.cape != null ? `${current.cape} J/kg` : '—'}
                  </Text>
                  <Text style={S.atmoLabel}>{lang === 'hi' ? 'तूफ़ान तीव्रता' : 'CAPE'}</Text>
                </View>

                {/* Solar Radiation */}
                <View style={S.atmoItem}>
                  <Ionicons name="sunny-outline" size={20} color="#FBBF24" />
                  <Text style={S.atmoVal}>{current.solarRadiation != null ? `${current.solarRadiation} W/m²` : '—'}</Text>
                  <Text style={S.atmoLabel}>{lang === 'hi' ? 'सौर विकिरण' : 'Solar Rad.'}</Text>
                </View>

                {/* Pressure */}
                <View style={S.atmoItem}>
                  <Ionicons name="speedometer-outline" size={20} color="#6B7280" />
                  <Text style={S.atmoVal}>{current.pressure} hPa</Text>
                  <Text style={S.atmoLabel}>{lang === 'hi' ? 'वायु दाब' : 'Pressure'}</Text>
                </View>

              </View>
            </View>
          </View>
        )}

        {/* ══ 9. GROWING DEGREE DAYS ════════════════════════════════════════ */}
        {daily?.some(d => d.growingDegreeDays != null) && (
          <View style={S.section}>
            <SectionHeader title={lang === 'hi' ? 'फसल परिपक्वता ट्रैकर' : 'Crop Maturity Tracker'} />
            <View style={S.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="stats-chart-outline" size={16} color={C.green} />
                <Text style={{ fontSize: 12, color: C.sub, marginLeft: 6, flex: 1 }}>
                  {lang === 'hi'
                    ? 'ग्रोइंग डिग्री डेज (GDD) — फसल के विकास का माप'
                    : 'Growing Degree Days (GDD) — measures crop development rate'}
                </Text>
              </View>
              {daily.slice(0, 7).map((d, i) => (
                d.growingDegreeDays != null && (
                  <View key={i} style={S.gddRow}>
                    <Text style={S.gddDay}>{d.dateLabel}</Text>
                    <View style={S.gddBarTrack}>
                      <View style={[S.gddBarFill, {
                        width: `${Math.min(100, (d.growingDegreeDays / 25) * 100)}%`,
                        backgroundColor: d.growingDegreeDays > 20 ? '#16A34A' : d.growingDegreeDays > 10 ? '#F59E0B' : '#9CA3AF',
                      }]} />
                    </View>
                    <Text style={S.gddVal}>{d.growingDegreeDays} GDD</Text>
                  </View>
                )
              ))}
              <Text style={{ fontSize: 9, color: C.sub, marginTop: 8, fontStyle: 'italic' }}>
                {lang === 'hi' ? 'Base 0°C / Limit 50°C (Open-Meteo)' : 'Base 0°C / Limit 50°C (Open-Meteo)'}
              </Text>
            </View>
          </View>
        )}

        {/* ══ 10. DAILY SUNSHINE + SOLAR ═══════════════════════════════════ */}
        {daily?.some(d => d.sunshineDuration != null) && (
          <View style={S.section}>
            <SectionHeader title={lang === 'hi' ? 'धूप और सौर ऊर्जा' : 'Sunshine & Solar'} />
            <View style={S.card}>
              {daily.slice(0, 7).map((d, i) => (
                <View key={i} style={{ marginBottom: i < 6 ? 10 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{d.dateLabel}</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '700' }}>
                        ☀ {d.sunshineDuration != null ? `${d.sunshineDuration}h` : '—'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>
                        {d.solarRadiationSum != null ? `${d.solarRadiationSum} MJ/m²` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ height: 5, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                    <LinearGradient
                      colors={['#FBBF24', '#FB923C']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ height: 5, width: `${Math.min(100, ((d.sunshineDuration ?? 0) / 12) * 100)}%`, borderRadius: 3 }}
                    />
                  </View>
                  {i < 6 && <View style={[S.divider, { marginTop: 10, marginBottom: 0 }]} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══ 11. RAIN BREAKDOWN ═══════════════════════════════════════════ */}
        {daily?.some(d => d.rainSum > 0 || d.showersSum > 0) && (
          <View style={S.section}>
            <SectionHeader title={lang === 'hi' ? 'वर्षा विवरण' : 'Rain Breakdown'} />
            <View style={S.card}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ flex: 2, fontSize: 10, fontWeight: '700', color: C.sub }}>DAY</Text>
                <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: '#3B82F6', textAlign: 'center' }}>STEADY</Text>
                <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: '#818CF8', textAlign: 'center' }}>SHOWERS</Text>
                <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: C.sub, textAlign: 'center' }}>HRS</Text>
              </View>
              <View style={[S.divider, { marginBottom: 8, marginTop: 0 }]} />
              {daily.slice(0, 7).map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 7, alignItems: 'center' }}>
                  <Text style={{ flex: 2, fontSize: 12, color: C.text, fontWeight: '600' }}>{d.dateLabel}</Text>
                  <Text style={{ flex: 1, fontSize: 12, color: '#3B82F6', fontWeight: '700', textAlign: 'center' }}>
                    {d.rainSum > 0 ? `${d.rainSum}mm` : '—'}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 12, color: '#818CF8', fontWeight: '700', textAlign: 'center' }}>
                    {d.showersSum > 0 ? `${d.showersSum}mm` : '—'}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 12, color: C.sub, textAlign: 'center' }}>
                    {d.precipitationHours > 0 ? `${d.precipitationHours}h` : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* IMD source note */}
        {weather.meta?.imdAvailable && (
          <Text style={S.sourceNote}>
            {lang === 'hi'
              ? '⚡ IMD डेटा + Open-Meteo से संयुक्त पूर्वानुमान'
              : '⚡ Combined forecast: Open-Meteo + IMD'}
          </Text>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════
const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, backgroundColor: C.bg },
  scroll: { paddingBottom: 16 },

  // ── Header (standalone)
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: C.text },

  // ── Hero
  hero: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 6,
    borderRadius: 20, overflow: 'hidden', paddingTop: 20, paddingBottom: 18, paddingHorizontal: 20,
    minHeight: 200,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 16, elevation: 8,
  },
  heroImg:      { borderRadius: 20 },
  heroLocRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  heroLoc:      { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.82)', letterSpacing: 1.1 },
  staleBadge:   { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' },
  heroTemp:     { fontSize: 64, fontWeight: '900', color: '#FFFFFF', lineHeight: 70 },
  heroCond:     { fontSize: 15, color: 'rgba(255,255,255,0.80)', marginTop: 2, marginBottom: 14 },
  heroStats:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 0 },
  heroStat:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatTxt:  { fontSize: 12, color: 'rgba(255,255,255,0.80)', fontWeight: '500' },
  heroStatDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.30)', marginHorizontal: 8 },
  heroMinMax:   { marginTop: 10 },
  heroMinMaxTxt:{ fontSize: 12, color: 'rgba(255,255,255,0.70)', fontWeight: '600' },

  // ── IMD Alert banner
  alertBanner: {
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    borderRadius: 14, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12,
  },
  alertBody:  { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  alertDesc:  { fontSize: 11, color: C.sub, lineHeight: 15 },

  // ── Section
  section: { marginTop: 18, marginHorizontal: 16 },
  sectionHeader: {
    fontSize: 11, fontWeight: '900', color: C.sub,
    letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 10,
  },
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },

  // ── Advisories
  advisoryRow: { paddingRight: 4, gap: 10 },
  advisoryCard: {
    width: 160, borderRadius: 14, borderWidth: 1.5,
    padding: 12, gap: 6,
  },
  advisoryTitle: { fontSize: 13, fontWeight: '800' },
  advisoryDesc:  { fontSize: 11, color: C.sub, lineHeight: 15 },

  // ── Hourly
  hourlyRow: { paddingRight: 4, gap: 8 },
  hourlyItem: {
    alignItems: 'center', gap: 5,
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 14, backgroundColor: '#F4F6F4', minWidth: 58,
  },
  hourlyItemNow:  { backgroundColor: C.green },
  hourlyTime:     { fontSize: 10, fontWeight: '700', color: C.sub },
  hourlyTimeNow:  { color: 'rgba(255,255,255,0.80)' },
  hourlyTemp:     { fontSize: 14, fontWeight: '800', color: C.text },
  hourlyTempNow:  { color: '#FFFFFF' },
  rainRow:        { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rainPct:        { fontSize: 9, color: '#3B82F6', fontWeight: '600' },

  // ── Daily
  dailyRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dailyRowToday: { backgroundColor: 'rgba(27,94,32,0.05)', borderRadius: 10, paddingHorizontal: 6 },
  dailyDay:      { width: 72, fontSize: 13, fontWeight: '600', color: C.sub },
  dailyDayToday: { color: C.green, fontWeight: '800' },
  dailyTempWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dailyLow:      { fontSize: 12, color: C.sub, fontWeight: '500', width: 28, textAlign: 'right' },
  dailyHigh:     { fontSize: 13, fontWeight: '800', color: C.text, width: 28 },
  dailyBar:      { flex: 1, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  dailyBarFill:  { height: 5, backgroundColor: C.greenLight, borderRadius: 3 },
  dailyRainBadge:{ flexDirection: 'row', alignItems: 'center', gap: 2, width: 36 },
  dailyRainPct:  { fontSize: 10, color: '#3B82F6', fontWeight: '600' },

  // ── Soil dashboard
  soilGroupLabel: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  soilTempRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  soilTempLabel:  { flex: 1, fontSize: 12, color: C.sub },
  soilTempVal:    { fontSize: 14, fontWeight: '700', color: C.text },

  moistureRow:   { marginBottom: 10 },
  moistureLabel: { fontSize: 12, color: C.sub, marginBottom: 5 },
  moistureTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 3 },
  moistureFill:  { height: 8, borderRadius: 4 },
  moistureVal:   { fontSize: 11, fontWeight: '700' },

  etRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  etLabel: { fontSize: 12, fontWeight: '700', color: C.text },
  etSub:   { fontSize: 10, color: C.sub, marginTop: 1 },
  etVal:   { fontSize: 14, fontWeight: '800', color: C.green },

  // ── Weather alerts section
  alertsHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  alertCountBadge: {
    backgroundColor: '#DC2626', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  alertCountTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },

  allClearCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#16A34A',
    padding: 14,
  },
  allClearTitle: { fontSize: 14, fontWeight: '800', color: '#15803D', marginBottom: 2 },
  allClearDesc:  { fontSize: 12, color: '#166534', lineHeight: 17 },

  alertCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 14, borderWidth: 1.5,
    marginBottom: 10, overflow: 'hidden',
    paddingRight: 12, paddingVertical: 12,
  },
  alertBar:  { width: 4, alignSelf: 'stretch', marginRight: 10 },
  alertIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  alertCardTitle: { fontSize: 13, fontWeight: '800' },
  alertDayTxt:   { fontSize: 10, color: C.sub, fontWeight: '600', marginBottom: 4 },
  alertCardDesc: { fontSize: 11, color: C.sub, lineHeight: 16 },
  severityBadge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  severityTxt:   { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  // ── Sun arc
  arcWrap: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },

  // ── Atmosphere grid
  atmoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  atmoItem: {
    width: (W - 64 - 10) / 2 - 5,
    backgroundColor: '#F8FAFC', borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: C.border,
  },
  atmoVal:   { fontSize: 15, fontWeight: '900', color: C.text },
  atmoLabel: { fontSize: 10, color: C.sub, fontWeight: '600', textAlign: 'center' },

  // ── GDD tracker
  gddRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  gddDay:      { width: 60, fontSize: 11, fontWeight: '600', color: C.sub },
  gddBarTrack: { flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  gddBarFill:  { height: 6, borderRadius: 3 },
  gddVal:      { width: 60, fontSize: 11, fontWeight: '700', color: C.text, textAlign: 'right' },

  // ── Source note
  sourceNote: {
    fontSize: 10, color: C.sub, textAlign: 'center',
    marginTop: 16, fontStyle: 'italic',
  },

  // ── Loading / Error
  loadTxt:  { fontSize: 14, color: C.sub, marginTop: 10 },
  errTxt:   { fontSize: 14, color: '#EF4444', textAlign: 'center', paddingHorizontal: 40 },
  errSub:   { fontSize: 12, color: C.sub, textAlign: 'center', lineHeight: 20, marginTop: 4 },
  retryBtn: { backgroundColor: C.green, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, marginTop: 10 },
  retryTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
