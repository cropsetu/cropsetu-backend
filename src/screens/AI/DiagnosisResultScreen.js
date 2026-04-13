/**
 * DiagnosisResultScreen — Full AI diagnosis report (production-ready).
 *
 * Handles both:
 *  - Simple format (old): treatment[] = array of strings
 *  - Rich format (new):   treatment[] = array of objects with step/action/chemical/dose/timing
 *
 * Sections:
 *  1. Hero — disease name, confidence, severity, spread risk, urgency
 *  2. Immediate Action — what to do TODAY
 *  3. Treatment Protocol — step-by-step with chemicals/doses/timing
 *  4. Organic Alternative — natural treatment option
 *  5. AI Insight — weather risk, soil note, estimated yield loss
 *  6. Follow-up Schedule — day 3, 7, 14 actions
 *  7. Prevention — next season
 *  8. Recommended Products — buy from AgriStore
 *  9. Actions — Ask FarmMind / Buy Products
 */
import { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useLanguage } from '../../context/LanguageContext';
import logger from '../../utils/logger';

const { width: W } = Dimensions.get('window');

const SEV_CONFIG = {
  low:      { color: '#2ECC71', tKey: 'sevLow',      icon: 'checkmark-circle', bg: '#0D2B18' },
  moderate: { color: '#F39C12', tKey: 'sevModerate', icon: 'warning',          bg: '#2B1D00' },
  high:     { color: '#E74C3C', tKey: 'sevHigh',     icon: 'alert-circle',     bg: '#2B0D0D' },
  critical: { color: '#C0392B', tKey: 'sevCritical', icon: 'skull-outline',    bg: '#3A0808' },
};

const URGENCY_CONFIG = {
  immediate:  { color: '#E74C3C', tKey: 'urgImmediate', icon: 'flash'    },
  today:      { color: '#F39C12', tKey: 'urgToday',     icon: 'today'    },
  this_week:  { color: '#3498DB', tKey: 'urgWeek',      icon: 'calendar' },
};

function ConfidenceRing({ value, color, size = 80, confidenceLabel }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value / 100, duration: 900, delay: 300, useNativeDriver: false }).start();
  }, []);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: size * 0.1, borderColor: `${color}25`, position: 'absolute',
      }} />
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: size * 0.28, fontWeight: '900', color }}>{value}%</Text>
        <Text style={{ fontSize: size * 0.13, color: '#888', fontWeight: '600' }}>{confidenceLabel}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ color, title }) {
  return (
    <View style={D.sectionHeader}>
      <View style={[D.sectionDot, { backgroundColor: color }]} />
      <Text style={D.sectionTitle}>{title}</Text>
    </View>
  );
}

function InfoRow({ icon, iconColor = '#888', label, value }) {
  return (
    <View style={D.infoRow}>
      <Ionicons name={icon} size={13} color={iconColor} />
      <Text style={D.infoLabel}>{label}:</Text>
      <Text style={D.infoValue}>{value}</Text>
    </View>
  );
}

export default function DiagnosisResultScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const d = route?.params?.diagnosis || {};
  const farmCtx = route?.params?.farmContext || {};

  // Normalise to always have data
  const disease      = d.disease      || 'Unknown';
  const scientific   = d.scientific   || '';
  const crop         = d.crop         || farmCtx.cropName || 'Unknown';
  const confidence   = d.confidence   || 0;
  const severity     = d.severity     || 'moderate';
  const isHealthy    = d.isHealthy    || false;
  const stage        = d.stage        || '';
  const affectedArea = d.affectedAreaEstimate || farmCtx.affectedArea || '';
  const spreadRisk   = d.spreadRisk   || '';
  const urgency      = d.urgencyLevel || 'today';
  const estYieldLoss = d.estimatedYieldLoss || '';
  const immediateAction = d.immediateAction || '';
  const prevention   = d.prevention  || '';
  const weatherNote  = d.weatherRiskNote   || '';
  const soilNote     = d.soilConsideration || '';
  const prevCropNote = d.previousCropNote  || '';
  const notes        = d.notes        || '';
  const consultExpert = d.consultExpert || false;
  const causes        = Array.isArray(d.causes) ? d.causes : [];
  const followUp      = Array.isArray(d.followUpSchedule) ? d.followUpSchedule : [];
  const organicTx     = d.organicTreatment || null;

  // Treatment can be array of strings OR array of objects
  const rawTreatment  = Array.isArray(d.treatment) ? d.treatment : [];
  const treatmentIsObjects = rawTreatment.length > 0 && typeof rawTreatment[0] === 'object';

  // Products can be array of strings OR array of objects
  const rawProducts = Array.isArray(d.products) ? d.products : [];
  const productsAreObjects = rawProducts.length > 0 && typeof rawProducts[0] === 'object';

  const sev     = SEV_CONFIG[severity]     || SEV_CONFIG.moderate;
  const urgConf = URGENCY_CONFIG[urgency]  || URGENCY_CONFIG.today;

  const contentAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(contentAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const [downloading, setDownloading] = useState(false);

  const full = d._fullReport || {};
  const fullTx = full.treatment || {};
  const chemicals = fullTx.chemical || fullTx.chemical_controls || [];
  const organicList = fullTx.organic || fullTx.organic_alternatives || [];
  const fertList = fullTx.fertilizer || fullTx.fertilizer_recommendations || [];
  const sprayTiming = fullTx.spray_timing || fullTx.spray_timing_advisory || '';
  const nextStepsFull = Array.isArray(full.next_steps) ? full.next_steps : (Array.isArray(d.nextSteps) ? d.nextSteps : []);
  const reportId = full.meta?.report_id || full.report_id || '';
  const generatedAt = full.generated_at ? new Date(full.generated_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');

  // Weather details from full report
  const fullWeather = full.weather_outlook || {};
  const weatherRiskLevel   = fullWeather.risk || '';
  const weatherForecast    = fullWeather.forecast_risk || '';
  const weatherAdvisory    = fullWeather.advisory || '';
  const weatherSummaryText = fullWeather.summary || '';
  const weatherRiskFactors = Array.isArray(fullWeather.risk_factors) ? fullWeather.risk_factors : [];
  const weatherFavorable   = Array.isArray(fullWeather.favorable_diseases) ? fullWeather.favorable_diseases : [];
  const soilRisk           = fullWeather.soil_risk || '';
  const weatherUsed        = fullWeather.weather_used || false;
  const rawCurrent         = fullWeather.raw_current  || {};
  const rawSoil            = fullWeather.raw_soil     || {};
  const rawForecast        = fullWeather.raw_forecast || [];


  const buildReportHTML = () => {
    // ── helpers ──────────────────────────────────────────────────────────────
    const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const na  = (v, unit='') => (v != null && v !== '') ? `${v}${unit}` : '—';

    // ── confidence ring ───────────────────────────────────────────────────────
    const circ      = 276.46; // 2π × r44
    const dashOff   = (circ * (1 - confidence / 100)).toFixed(2);
    const confStroke = confidence >= 70 ? 'var(--confidence-high)' : confidence >= 50 ? 'var(--confidence-mid)' : 'var(--confidence-low)';

    // ── severity / risk classes ───────────────────────────────────────────────
    const sevLower  = (severity || 'moderate').toLowerCase();
    const sevBadge  = sevLower === 'critical' ? 'badge-critical' : sevLower === 'high' ? 'badge-high' : sevLower === 'moderate' ? 'badge-moderate' : 'badge-low';
    const sevLabel  = sevLower.charAt(0).toUpperCase() + sevLower.slice(1);
    const spreadLow = (spreadRisk || '').toLowerCase();
    const spreadBadge = spreadLow === 'high' || spreadLow === 'critical' ? 'badge-high' : spreadLow === 'moderate' ? 'badge-moderate' : 'badge-low';

    // ── weather colour ────────────────────────────────────────────────────────
    const wRisk        = fullWeather.risk || '';
    const wRiskBadge   = wRisk === 'CRITICAL' ? 'badge-critical' : wRisk === 'HIGH' ? 'badge-high' : wRisk === 'MODERATE' ? 'badge-moderate' : 'badge-low';
    const wRiskColor   = wRisk === 'CRITICAL' ? '#C62828' : wRisk === 'HIGH' ? '#E65100' : wRisk === 'MODERATE' ? '#F9A825' : '#2E7D32';
    const wRiskBg      = wRisk === 'CRITICAL' ? '#FFEBEE' : wRisk === 'HIGH' ? '#FFF3E0' : wRisk === 'MODERATE' ? '#FFFDE7' : '#E8F5E9';
    const wRFactors    = Array.isArray(fullWeather.risk_factors) ? fullWeather.risk_factors : [];
    const wFavDisease  = Array.isArray(fullWeather.favorable_diseases) ? fullWeather.favorable_diseases : [];
    const wForecast    = fullWeather.forecast_risk || '';
    const wAdvisory    = fullWeather.advisory || '';
    const wSummaryTxt  = fullWeather.summary || weatherNote || '';

    // ── raw atmospheric values ────────────────────────────────────────────────
    const tempV  = rawCurrent.temperature   != null ? rawCurrent.temperature  : null;
    const humV   = rawCurrent.humidity      != null ? rawCurrent.humidity     : null;
    const windV  = rawCurrent.wind_speed    != null ? rawCurrent.wind_speed   : null;
    const vpdV   = rawCurrent.vpd           != null ? rawCurrent.vpd.toFixed(2) : null;
    const etV    = rawCurrent.evapotranspiration != null ? rawCurrent.evapotranspiration.toFixed(2) : null;
    const dewV   = rawCurrent.dew_point     != null ? rawCurrent.dew_point   : null;
    const precipV= rawCurrent.precipitation != null ? rawCurrent.precipitation : null;
    const cloudV = rawCurrent.cloud_cover   != null ? rawCurrent.cloud_cover  : null;
    const wDescV = rawCurrent.weather_desc  || '—';

    // humidity/temp/wind badge
    const humNum  = humV  || 0;
    const tempNum = tempV || 0;
    const windNum = windV || 0;
    const humBadge  = humNum  > 85 ? 'badge-critical' : humNum  > 70 ? 'badge-high' : humNum  > 50 ? 'badge-moderate' : 'badge-low';
    const humLabel  = humNum  > 85 ? 'Critical' : humNum > 70 ? 'High' : humNum > 50 ? 'Moderate' : 'Low';
    const tempBadge = tempNum > 35 ? 'badge-high' : tempNum > 25 ? 'badge-moderate' : 'badge-low';
    const tempLabel = tempNum > 35 ? 'Very hot' : tempNum > 25 ? 'Warm' : 'Optimal';
    const windBadge = windNum > 20 ? 'badge-high' : windNum > 10 ? 'badge-moderate' : 'badge-low';
    const windLabel = windNum > 20 ? 'Spore spread' : windNum > 10 ? 'Some risk' : 'Low risk';

    // ── soil values ───────────────────────────────────────────────────────────
    const soilT0  = rawSoil.temperature_surface != null ? `${rawSoil.temperature_surface}°C` : '—';
    const soilT6  = rawSoil.temperature_6cm     != null ? `${rawSoil.temperature_6cm}°C`     : '—';
    const soilM01 = rawSoil.moisture_0_1cm      != null ? `${(rawSoil.moisture_0_1cm*100).toFixed(1)}%` : '—';
    const soilM13 = rawSoil.moisture_1_3cm      != null ? `${(rawSoil.moisture_1_3cm*100).toFixed(1)}%` : '—';
    const soilM39 = rawSoil.moisture_3_9cm      != null ? `${(rawSoil.moisture_3_9cm*100).toFixed(1)}%` : '—';

    // ── image quality ─────────────────────────────────────────────────────────
    const iq      = full.image_quality || {};
    const iqScore = iq.score || 0;
    const iqPct   = Math.round(iqScore * 100);
    const iqClass = iqScore >= 0.7 ? 'qf-good' : iqScore >= 0.5 ? 'qf-ok' : 'qf-poor';

    // ── symptom tags ──────────────────────────────────────────────────────────
    const syms = Array.isArray(farmCtx.symptoms) ? farmCtx.symptoms : [];
    const symptomTagsHTML = syms.length
      ? syms.map(s => `<span class="symptom-tag">${esc(s)}</span>`).join('')
      : '';

    // ── disease description from full report ──────────────────────────────────
    const fullDisease = full.disease || {};
    const diseaseDesc = fullDisease.description || '';

    // ── differentials ─────────────────────────────────────────────────────────
    const diffs = Array.isArray((full.meta || {}).differentials) ? full.meta.differentials : [];

    // ── medicine combo helpers ────────────────────────────────────────────────
    const renderComboItem = (item) => {
      if (!item) return '';
      return `<div class="combo-item">
        <div class="combo-item-name">${esc(item.product || item.name || '')}</div>
        <div class="combo-item-type">${esc(item.active_ingredient || '')}${item.application_method ? ` · ${esc(item.application_method.split('—')[0].trim())}` : ''}</div>
        <div class="combo-item-dosage">${esc(item.dosage || '')}${item.dosage_per_acre ? ` · ${esc(item.dosage_per_acre)}` : ''}</div>
      </div>`;
    };

    const renderProductCard = (item, isRec = false) => {
      if (!item) return '';
      const safety = Array.isArray(item.safety_precautions) ? item.safety_precautions : [];
      return `<div class="brand-card${isRec ? ' recommended' : ''}">
        ${isRec ? '<span class="brand-recommended-tag">Recommended</span>' : ''}
        <div class="brand-name">${esc(item.product || item.name || '')}</div>
        <div class="brand-company">${esc(item.active_ingredient || '')}</div>
        <div class="brand-info">${item.application_method ? esc(item.application_method) : ''}${item.phi_days != null ? `<br>PHI: ${item.phi_days} days before harvest` : ''}</div>
        <div class="brand-price"><span class="brand-price-value" style="font-size:13px;color:var(--brand-green)">${esc(item.dosage_per_acre || item.dosage || '')}</span></div>
        ${safety.length ? `<div style="margin-top:6px;font-size:11px;color:#E65100">⚠ ${esc(safety[0])}</div>` : ''}
      </div>`;
    };

    const buildComboCard = ({ label, tag, headerStyle, items, desc }) => {
      const isSingle = items.length === 1;
      return `<div class="combo-card" style="border-color:${headerStyle ? 'var(--border)' : 'var(--brand-green)'}">
        <div class="combo-header" style="${headerStyle || ''}">
          <span class="combo-title">${esc(label)}</span>
          <span class="combo-tag">${esc(tag)}</span>
        </div>
        <div class="combo-body">
          <div class="combo-desc">${esc(desc)}</div>
          <div class="combo-items" style="${isSingle ? 'grid-template-columns:1fr;' : ''}">
            ${renderComboItem(items[0])}
            ${!isSingle ? '<div class="combo-plus">+</div>' : ''}
            ${!isSingle && items[1] ? renderComboItem(items[1]) : ''}
          </div>
          <div class="brand-section-title">🏪 Product Details</div>
          <div class="brand-grid" style="${isSingle ? 'grid-template-columns:1fr 1fr;' : ''}">
            ${renderProductCard(items[0], true)}
            ${!isSingle && items[1] ? renderProductCard(items[1]) : ''}
          </div>
          ${sprayTiming ? `<div class="spray-warning" style="margin-top:16px">🕐 ${esc(sprayTiming)}</div>` : ''}
        </div>
      </div>`;
    };

    // build combo sections
    const combos = [];
    if (chemicals.length >= 2) {
      combos.push(buildComboCard({
        label: 'Combination 1 — Curative + Preventive',
        tag: '★ Recommended',
        headerStyle: '',
        items: chemicals.slice(0, 2),
        desc: `Tank mix of ${esc(chemicals[0].product||'')} and ${esc(chemicals[1].product||'')} for maximum disease control. Apply as combined foliar spray in early morning or evening.`,
      }));
    } else if (chemicals.length === 1) {
      combos.push(buildComboCard({
        label: 'Recommended Treatment',
        tag: '★ Primary',
        headerStyle: '',
        items: [chemicals[0]],
        desc: `Primary treatment: ${esc(chemicals[0].product||'')} for active disease control.`,
      }));
    }
    if (chemicals.length >= 4) {
      combos.push(buildComboCard({
        label: 'Combination 2 — Broad-Spectrum Alternative',
        tag: 'Alternative',
        headerStyle: 'background:linear-gradient(135deg,#4A5568 0%,#2D3748 100%)',
        items: chemicals.slice(2, 4),
        desc: 'Alternative when primary combination is unavailable, or when broader-spectrum protection is needed.',
      }));
    } else if (chemicals.length === 3) {
      combos.push(buildComboCard({
        label: 'Combination 2 — Alternative',
        tag: 'Alternative',
        headerStyle: 'background:linear-gradient(135deg,#4A5568 0%,#2D3748 100%)',
        items: [chemicals[2]],
        desc: 'Alternative option for broader disease control.',
      }));
    }
    if (organicList.length > 0) {
      const org = organicList.slice(0, 2);
      combos.push(buildComboCard({
        label: 'Organic / Bio-Control Alternative',
        tag: '🌿 Organic',
        headerStyle: 'background:linear-gradient(135deg,#2E7D32 0%,#1B5E20 100%)',
        items: org,
        desc: org.length > 1
          ? `Organic combination of ${esc(org[0].product||'')} and ${esc(org[1].product||'')}. Suitable for organic farming or as supplementary bio-control.`
          : `Organic alternative: ${esc(org[0].product||'')}. Lower chemical load, safe for soil ecosystem.`,
      }));
    }

    // ── fertilizer cards ──────────────────────────────────────────────────────
    const fertCardsHTML = fertList.map(f => `
      <div class="fertilizer-card">
        <div class="fertilizer-name">${esc(f.product || '')}</div>
        ${f.npk ? `<span class="fertilizer-npk">${esc(f.npk)}</span>` : ''}
        <div class="fertilizer-details">
          ${f.dosage_per_acre ? `<div><strong>Dosage/acre:</strong> ${esc(f.dosage_per_acre)}</div>` : ''}
          ${f.timing ? `<div><strong>Timing:</strong> ${esc(f.timing)}</div>` : ''}
        </div>
        ${f.reason ? `<div class="fertilizer-why">${esc(f.reason)}</div>` : ''}
      </div>`).join('');

    // ── next-steps timeline ───────────────────────────────────────────────────
    const timelineHTML = nextStepsFull.map(s => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-what">${esc(s)}</div>
      </div>`).join('');

    // ── causes ────────────────────────────────────────────────────────────────
    const causesHTML = causes.map((c, i) => `
      <li><span class="cause-num">${i + 1}</span>${esc(c)}</li>`).join('');

    // ── context grid ──────────────────────────────────────────────────────────
    const ctxRows = [
      ['Crop Name',     farmCtx.cropName   || crop],
      ['Crop Age',      farmCtx.cropAge    ? `${farmCtx.cropAge} days` : ''],
      ['Variety',       farmCtx.variety    || farmCtx.cropVariety || ''],
      ['Growth Stage',  stage],
      ['Soil Type',     farmCtx.soilType   || farmCtx.soil_type || ''],
      ['Irrigation',    farmCtx.irrigationType || farmCtx.irrigation || ''],
      ['Land Size',     farmCtx.landSize   ? `${farmCtx.landSize} acres` : ''],
      ['Season',        farmCtx.season     || ''],
      ['State / District', [farmCtx.state, farmCtx.district].filter(Boolean).join(' / ')],
      ['Previous Crop', farmCtx.previousCrop || ''],
      ['Affected Area', farmCtx.affectedArea || affectedArea],
      ['Symptoms',      syms.join(', ')],
      ['First Noticed', farmCtx.firstNoticed || ''],
      ['Additional Notes', farmCtx.additionalSymptoms || farmCtx.additionalText || ''],
    ].filter(([,v]) => v).map(([k,v]) => `
      <div class="context-item">
        <span class="context-key">${esc(k)}</span>
        <span class="context-val">${esc(v)}</span>
      </div>`).join('');

    // ── risk factor rows ──────────────────────────────────────────────────────
    const rFactorRows = wRFactors.map(f => `
      <div class="risk-corr-row">
        <span>${esc(f)}</span>
        <span>—</span>
        <span style="font-family:var(--font-mono);font-size:12px">Present</span>
        <span><span class="risk-match match-yes">⚠ Confirmed</span></span>
      </div>`).join('');

    // ── favorable disease chips ───────────────────────────────────────────────
    const favChips = wFavDisease.map(d =>
      `<span style="background:#E74C3C10;color:#E74C3C;border:1px solid #E74C3C20;padding:3px 12px;border-radius:999px;font-size:12px;margin:3px;">${esc(d)}</span>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FarmEasy — AI Crop Diagnosis Report</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--brand-green:#0B6E4F;--brand-green-light:#E8F5EE;--brand-green-dark:#084C37;--brand-leaf:#21A179;--severity-critical:#C62828;--severity-critical-bg:#FFEBEE;--severity-high:#E65100;--severity-high-bg:#FFF3E0;--severity-moderate:#F9A825;--severity-moderate-bg:#FFFDE7;--severity-low:#2E7D32;--severity-low-bg:#E8F5E9;--confidence-high:#0B6E4F;--confidence-mid:#F9A825;--confidence-low:#C62828;--ink:#1A1A1A;--ink-secondary:#4A5568;--ink-muted:#8896A6;--surface:#FFFFFF;--surface-raised:#F8FAFB;--surface-sunken:#F1F4F7;--border:#E2E8F0;--border-light:#EDF2F7;--font-display:'DM Serif Display',Georgia,serif;--font-body:'DM Sans',-apple-system,sans-serif;--font-mono:'JetBrains Mono',monospace;--space-xs:4px;--space-sm:8px;--space-md:16px;--space-lg:24px;--space-xl:32px;--space-2xl:48px;--radius-sm:6px;--radius-md:10px;--radius-lg:16px;--radius-xl:20px;--radius-full:999px}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font-body);color:var(--ink);background:#F4F6F8;line-height:1.6;-webkit-font-smoothing:antialiased}
.report{max-width:860px;margin:32px auto;background:var(--surface);border-radius:var(--radius-xl);box-shadow:0 1px 3px rgba(0,0,0,.04),0 8px 32px rgba(0,0,0,.06);overflow:hidden}
.report-header{background:linear-gradient(135deg,#0B6E4F 0%,#084C37 50%,#063B2B 100%);color:#fff;padding:40px 48px 32px;position:relative;overflow:hidden}
.report-header::before{content:'';position:absolute;top:-80px;right:-80px;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.03)}
.header-top{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1}
.brand{display:flex;align-items:center;gap:12px}
.brand-icon{width:40px;height:40px;background:rgba(255,255,255,.15);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:20px}
.brand-name{font-family:var(--font-display);font-size:28px;letter-spacing:-.5px}
.brand-sub{font-size:13px;opacity:.7;margin-top:2px}
.report-meta{text-align:right;font-size:13px;opacity:.7;line-height:1.7}
.report-meta .report-id{font-family:var(--font-mono);font-size:12px;background:rgba(255,255,255,.1);padding:2px 8px;border-radius:var(--radius-sm);display:inline-block;margin-top:4px}
.diagnosis-hero{margin:-20px 48px 0;position:relative;z-index:2;background:var(--surface);border-radius:var(--radius-lg);box-shadow:0 2px 8px rgba(0,0,0,.06),0 12px 40px rgba(0,0,0,.08);padding:var(--space-xl);display:grid;grid-template-columns:1fr auto;gap:var(--space-lg);align-items:center}
.severity-badges{display:flex;gap:var(--space-sm);margin-bottom:var(--space-md);flex-wrap:wrap}
.badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:var(--radius-full);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.badge-critical{background:var(--severity-critical-bg);color:var(--severity-critical)}
.badge-high{background:var(--severity-high-bg);color:var(--severity-high)}
.badge-moderate{background:var(--severity-moderate-bg);color:var(--severity-moderate)}
.badge-low{background:var(--severity-low-bg);color:var(--severity-low)}
.disease-name{font-family:var(--font-display);font-size:36px;line-height:1.1;color:var(--ink);margin-bottom:4px}
.disease-scientific{font-style:italic;color:var(--ink-muted);font-size:15px;margin-bottom:var(--space-lg)}
.crop-meta-row{display:flex;gap:var(--space-xl)}
.crop-meta-item{display:flex;flex-direction:column}
.crop-meta-value{font-weight:600;font-size:15px}
.crop-meta-label{font-size:12px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px}
.confidence-ring{width:110px;height:110px;position:relative;flex-shrink:0}
.confidence-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.confidence-ring .track{fill:none;stroke:var(--border-light);stroke-width:6}
.confidence-ring .fill{fill:none;stroke-width:6;stroke-linecap:round}
.confidence-value{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.confidence-pct{font-family:var(--font-display);font-size:32px;line-height:1}
.confidence-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--ink-muted);margin-top:2px}
.report-body{padding:var(--space-xl) 48px 48px}
.section-title{display:flex;align-items:center;gap:var(--space-sm);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--brand-green);margin:var(--space-2xl) 0 var(--space-md);padding-bottom:var(--space-sm);border-bottom:2px solid var(--brand-green-light)}
.section-title:first-child{margin-top:0}
.section-icon{width:24px;height:24px;background:var(--brand-green-light);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:13px}
.ai-summary{background:var(--brand-green-light);border-left:4px solid var(--brand-green);border-radius:0 var(--radius-md) var(--radius-md) 0;padding:var(--space-lg);font-size:15px;line-height:1.7;color:var(--brand-green-dark)}
.context-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border-light);border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-light)}
.context-item{background:var(--surface);padding:var(--space-md) var(--space-lg);display:flex;justify-content:space-between;align-items:center}
.context-item:nth-child(odd){background:var(--surface-raised)}
.context-key{font-size:13px;color:#2D3748}
.context-val{font-weight:600;font-size:14px;text-align:right;max-width:55%}
.param-matrix{display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-md)}
.param-card{border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden}
.param-card-header{background:var(--surface-raised);padding:var(--space-sm) var(--space-md);display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-light)}
.param-card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-muted)}
.param-source-badge{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:var(--radius-full)}
.source-user{background:#E3F2FD;color:#1565C0}.source-api{background:#F3E5F5;color:#7B1FA2}.source-ai{background:#FFF3E0;color:#E65100}
.param-card-body{padding:var(--space-md)}
.param-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light);font-size:13px}
.param-row:last-child{border-bottom:none}
.param-name{color:#2D3748}
.param-value{font-weight:600;font-family:var(--font-mono);font-size:12px}
.param-weight{display:flex;align-items:center;gap:var(--space-sm);font-size:12px;color:var(--ink-muted);margin-top:8px}
.weight-bar{width:60px;height:6px;background:var(--border-light);border-radius:3px;overflow:hidden}
.weight-fill{height:100%;border-radius:3px;background:var(--brand-green)}
.atmo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-md)}
.atmo-card{background:var(--surface-raised);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:var(--space-md);text-align:center}
.atmo-icon{font-size:22px;margin-bottom:var(--space-xs)}
.atmo-value{font-family:var(--font-display);font-size:24px;color:var(--ink);line-height:1.2}
.atmo-unit{font-family:var(--font-body);font-size:13px;color:var(--ink-muted);font-weight:400}
.atmo-label{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--ink-muted);margin-top:2px}
.atmo-risk{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:var(--radius-full);display:inline-block;margin-top:var(--space-sm)}
.soil-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-md);margin-top:var(--space-md)}
.soil-card{background:var(--surface-raised);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:var(--space-md)}
.soil-card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-muted);margin-bottom:var(--space-sm)}
.soil-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid var(--border-light)}
.soil-row:last-child{border-bottom:none}
.soil-depth{color:#2D3748}
.soil-val{font-weight:600;font-family:var(--font-mono);font-size:12px}
.risk-correlation{margin-top:var(--space-md);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden}
.risk-corr-header{background:var(--surface-raised);padding:var(--space-sm) var(--space-md);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-muted);border-bottom:1px solid var(--border-light)}
.risk-corr-body{padding:var(--space-md)}
.risk-corr-row{display:grid;grid-template-columns:3fr 1fr 1fr 2fr;gap:var(--space-sm);padding:8px 0;border-bottom:1px solid var(--border-light);font-size:13px;align-items:center}
.risk-corr-row:last-child{border-bottom:none}
.risk-corr-row.header-row{font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--ink-muted);padding-bottom:var(--space-sm)}
.risk-match{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:var(--radius-full)}
.match-yes{background:#E8F5E9;color:#2E7D32}.match-partial{background:#FFF8E1;color:#F9A825}.match-no{background:#FFEBEE;color:#C62828}
.weather-card{border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden}
.weather-header{display:flex;align-items:center;gap:var(--space-md);padding:var(--space-md) var(--space-lg);background:var(--surface-raised);border-bottom:1px solid var(--border-light)}
.risk-badge{padding:6px 14px;border-radius:var(--radius-full);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.weather-body{padding:var(--space-lg)}
.weather-body p{font-size:14px;color:var(--ink-secondary);margin-bottom:var(--space-md);line-height:1.6}
.weather-sub{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-top:var(--space-md)}
.weather-sub-card{background:var(--surface-raised);border-radius:var(--radius-sm);padding:var(--space-md)}
.weather-sub-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-muted);margin-bottom:var(--space-xs)}
.weather-sub-card p{font-size:13px;color:var(--ink-secondary);margin:0}
.action-hero{background:linear-gradient(135deg,#C62828 0%,#B71C1C 100%);color:#fff;border-radius:var(--radius-md);padding:var(--space-lg) var(--space-xl);display:flex;align-items:center;gap:var(--space-md)}
.action-hero-icon{width:48px;height:48px;background:rgba(255,255,255,.15);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.action-hero-text{font-size:17px;font-weight:600;line-height:1.4}
.causes-list{list-style:none}
.causes-list li{padding:var(--space-md) 0;border-bottom:1px solid var(--border-light);display:flex;align-items:flex-start;gap:var(--space-md);font-size:14px;color:var(--ink-secondary);line-height:1.5}
.causes-list li:last-child{border-bottom:none}
.cause-num{width:24px;height:24px;background:var(--severity-high-bg);color:var(--severity-high);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.combo-card{border:2px solid var(--brand-green);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:var(--space-lg)}
.combo-header{background:linear-gradient(135deg,var(--brand-green) 0%,var(--brand-green-dark) 100%);color:#fff;padding:var(--space-md) var(--space-lg);display:flex;justify-content:space-between;align-items:center}
.combo-title{font-weight:700;font-size:16px}
.combo-tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:rgba(255,255,255,.2);padding:4px 12px;border-radius:var(--radius-full)}
.combo-body{padding:var(--space-lg)}
.combo-desc{font-size:14px;color:var(--ink-secondary);margin-bottom:var(--space-lg);line-height:1.6}
.combo-items{display:grid;grid-template-columns:1fr 60px 1fr;gap:0;align-items:center;margin-bottom:var(--space-lg)}
.combo-item{border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-md)}
.combo-plus{display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:300;color:var(--ink-muted)}
.combo-item-name{font-weight:700;font-size:14px;margin-bottom:2px}
.combo-item-type{font-size:11px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:var(--space-sm)}
.combo-item-dosage{font-size:13px;color:var(--ink-secondary)}
.brand-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--ink-muted);margin-bottom:var(--space-md);display:flex;align-items:center;gap:var(--space-sm)}
.brand-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)}
.brand-card{border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-md);position:relative}
.brand-card.recommended{border-color:var(--brand-green);background:var(--brand-green-light)}
.brand-recommended-tag{position:absolute;top:-8px;right:12px;background:var(--brand-green);color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:var(--radius-full)}
.brand-name{font-weight:700;font-size:15px;margin-bottom:2px}
.brand-company{font-size:12px;color:var(--ink-muted);margin-bottom:var(--space-sm)}
.brand-info{font-size:12px;color:var(--ink-secondary);line-height:1.6}
.brand-price{margin-top:var(--space-sm);padding-top:var(--space-sm);border-top:1px solid var(--border-light)}
.spray-warning{background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-md) var(--space-lg);font-size:13px;color:var(--ink-secondary);display:flex;align-items:center;gap:var(--space-sm)}
.fertilizer-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)}
.fertilizer-card{border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-lg)}
.fertilizer-name{font-weight:700;font-size:15px;margin-bottom:var(--space-xs)}
.fertilizer-npk{font-family:var(--font-mono);font-size:13px;color:var(--brand-green);background:var(--brand-green-light);padding:2px 8px;border-radius:var(--radius-sm);display:inline-block;margin-bottom:var(--space-sm)}
.fertilizer-details{font-size:13px;color:var(--ink-secondary);line-height:1.7}
.fertilizer-why{font-size:12px;color:var(--ink-muted);font-style:italic;margin-top:var(--space-sm);padding-top:var(--space-sm);border-top:1px solid var(--border-light)}
.timeline{position:relative;padding-left:32px}
.timeline::before{content:'';position:absolute;left:11px;top:8px;bottom:8px;width:2px;background:var(--brand-green-light)}
.timeline-item{position:relative;padding-bottom:var(--space-lg)}
.timeline-item:last-child{padding-bottom:0}
.timeline-dot{position:absolute;left:-25px;top:4px;width:14px;height:14px;background:var(--brand-green);border-radius:50%;border:3px solid var(--brand-green-light)}
.timeline-when{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--brand-green);margin-bottom:2px}
.timeline-what{font-size:14px;color:var(--ink-secondary);line-height:1.5}
.prevention-box{background:var(--surface-raised);border:1px dashed var(--border);border-radius:var(--radius-md);padding:var(--space-lg);font-size:14px;color:var(--ink-secondary);line-height:1.7}
.report-footer{background:var(--surface-sunken);border-top:1px solid var(--border-light);padding:var(--space-lg) 48px;text-align:center}
.footer-brand{font-family:var(--font-display);font-size:18px;color:var(--brand-green);margin-bottom:4px}
.footer-disclaimer{font-size:12px;color:var(--ink-muted);line-height:1.6}
.footer-model{font-family:var(--font-mono);font-size:11px;color:var(--ink-muted);margin-top:var(--space-sm);opacity:.7}
.image-quality-bar{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border-light);font-size:13px}
.iq-bar-wrap{display:flex;align-items:center;gap:8px;width:55%}
.iq-bar{flex:1;height:6px;background:var(--border-light);border-radius:3px;overflow:hidden}
.iq-fill{height:100%;border-radius:3px}
.qf-good{background:var(--brand-green)}.qf-ok{background:var(--severity-moderate)}.qf-poor{background:var(--severity-critical)}
.iq-score{font-family:var(--font-mono);font-size:12px;font-weight:600;min-width:34px;text-align:right}
.symptom-tag{background:#FFF3E0;color:#E65100;font-size:12px;font-weight:500;padding:4px 10px;border-radius:var(--radius-full);border:1px solid #FFE0B2;display:inline-block;margin:3px}
@media print{body{background:#fff}.report{box-shadow:none;margin:0;border-radius:0;max-width:100%}.report-header,.action-hero,.combo-header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="report">

  <!-- HEADER -->
  <div class="report-header">
    <div class="header-top">
      <div class="brand">
        <div class="brand-icon">🌱</div>
        <div>
          <div class="brand-name">FarmEasy</div>
          <div class="brand-sub">AI Crop Diagnosis Report</div>
        </div>
      </div>
      <div class="report-meta">
        ${esc(generatedAt)}<br>
        ${reportId ? `<span class="report-id">ID: ${esc(reportId.slice(0,8))}</span>` : ''}
      </div>
    </div>
  </div>

  <!-- DIAGNOSIS HERO -->
  <div class="diagnosis-hero">
    <div class="diagnosis-info">
      <div class="severity-badges">
        <span class="badge ${sevBadge}">⚠ ${esc(sevLabel)} Severity</span>
        ${spreadRisk ? `<span class="badge ${spreadBadge}">↗ ${esc(spreadRisk.toUpperCase())} Spread Risk</span>` : ''}
      </div>
      <h1 class="disease-name">${esc(disease)}</h1>
      ${scientific ? `<p class="disease-scientific">${esc(scientific)}</p>` : ''}
      <div class="crop-meta-row">
        <div class="crop-meta-item"><span class="crop-meta-value">${esc(crop || '—')}</span><span class="crop-meta-label">Crop</span></div>
        ${stage ? `<div class="crop-meta-item"><span class="crop-meta-value">${esc(stage)}</span><span class="crop-meta-label">Growth Stage</span></div>` : ''}
        ${farmCtx.cropAge ? `<div class="crop-meta-item"><span class="crop-meta-value">${esc(farmCtx.cropAge)} days</span><span class="crop-meta-label">Crop Age</span></div>` : ''}
        ${farmCtx.landSize ? `<div class="crop-meta-item"><span class="crop-meta-value">${esc(farmCtx.landSize)} acres</span><span class="crop-meta-label">Farm Size</span></div>` : ''}
      </div>
    </div>
    <div class="confidence-ring">
      <svg viewBox="0 0 100 100">
        <circle class="track" cx="50" cy="50" r="44"/>
        <circle class="fill" cx="50" cy="50" r="44" stroke="${confStroke}" stroke-dasharray="${circ}" stroke-dashoffset="${dashOff}"/>
      </svg>
      <div class="confidence-value">
        <span class="confidence-pct" style="color:${confStroke}">${confidence}%</span>
        <span class="confidence-label">Confidence</span>
      </div>
    </div>
  </div>

  <div class="report-body">

    <!-- AI SUMMARY -->
    <div class="section-title"><span class="section-icon">🤖</span> AI Summary</div>
    <div class="ai-summary">${esc(notes || `Diagnosis: ${disease} at ${confidence}% confidence. Follow the treatment plan below.`)}</div>

    <!-- FARM CONTEXT -->
    <div class="section-title"><span class="section-icon">🌾</span> Farm Context Uploaded</div>
    <div class="context-grid">${ctxRows}</div>

    <!-- DIAGNOSTIC PARAMETERS -->
    <div class="section-title"><span class="section-icon">🧬</span> Diagnostic Parameters Tested</div>
    <div class="param-matrix">
      <div class="param-card">
        <div class="param-card-header">
          <span class="param-card-title">Image Analysis</span>
          <span class="param-source-badge source-ai">AI Vision</span>
        </div>
        <div class="param-card-body">
          <div class="param-row"><span class="param-name">Overall quality</span><span class="param-value">${iqPct}%</span></div>
          <div class="param-row"><span class="param-name">Image usable</span><span class="param-value">${iq.usable ? 'Yes' : 'No'}</span></div>
          ${syms.length ? `<div class="param-row"><span class="param-name">Symptoms</span><span class="param-value">${syms.length} detected</span></div>` : ''}
          ${diseaseDesc ? `<div style="margin-top:8px;font-size:12px;color:var(--ink-muted);line-height:1.5">${esc(diseaseDesc.slice(0,140))}${diseaseDesc.length > 140 ? '…' : ''}</div>` : ''}
          <div class="param-weight"><span>Weight in diagnosis</span><span class="weight-bar"><span class="weight-fill" style="width:40%"></span></span><strong>40%</strong></div>
        </div>
      </div>
      <div class="param-card">
        <div class="param-card-header">
          <span class="param-card-title">User Inputs</span>
          <span class="param-source-badge source-user">Farmer</span>
        </div>
        <div class="param-card-body">
          ${farmCtx.cropName   ? `<div class="param-row"><span class="param-name">Crop</span><span class="param-value">${esc(farmCtx.cropName)}</span></div>` : ''}
          ${stage              ? `<div class="param-row"><span class="param-name">Stage</span><span class="param-value">${esc(stage)}</span></div>` : ''}
          ${farmCtx.soilType   ? `<div class="param-row"><span class="param-name">Soil</span><span class="param-value">${esc(farmCtx.soilType)}</span></div>` : ''}
          ${farmCtx.irrigationType ? `<div class="param-row"><span class="param-name">Irrigation</span><span class="param-value">${esc(farmCtx.irrigationType)}</span></div>` : ''}
          ${farmCtx.previousCrop ? `<div class="param-row"><span class="param-name">Prev crop</span><span class="param-value">${esc(farmCtx.previousCrop)}</span></div>` : ''}
          <div class="param-weight"><span>Weight in diagnosis</span><span class="weight-bar"><span class="weight-fill" style="width:20%"></span></span><strong>20%</strong></div>
        </div>
      </div>
      <div class="param-card">
        <div class="param-card-header">
          <span class="param-card-title">Atmospheric Data</span>
          <span class="param-source-badge source-api">Weather API</span>
        </div>
        <div class="param-card-body">
          ${tempV != null ? `<div class="param-row"><span class="param-name">Temperature</span><span class="param-value">${tempV}°C</span></div>` : ''}
          ${humV  != null ? `<div class="param-row"><span class="param-name">Humidity</span><span class="param-value">${humV}%</span></div>` : ''}
          ${vpdV  != null ? `<div class="param-row"><span class="param-name">VPD</span><span class="param-value">${vpdV} kPa</span></div>` : ''}
          ${windV != null ? `<div class="param-row"><span class="param-name">Wind</span><span class="param-value">${windV} km/h</span></div>` : ''}
          ${tempV == null && humV == null ? `<div style="font-size:12px;color:var(--ink-muted);padding:8px 0">No GPS provided — weather not fetched</div>` : ''}
          <div class="param-weight"><span>Weight in diagnosis</span><span class="weight-bar"><span class="weight-fill" style="width:20%"></span></span><strong>20%</strong></div>
        </div>
      </div>
    </div>

    <!-- IMAGE QUALITY -->
    <div class="section-title"><span class="section-icon">📷</span> Crop Image Analysis</div>
    <div class="param-card" style="overflow:hidden">
      <div style="padding:var(--space-lg)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md)">
          <div>
            <div style="font-weight:700;font-size:15px">Image Quality Assessment</div>
            <div style="font-size:13px;color:var(--ink-muted);margin-top:3px">${esc(iq.enhancement_notes || 'Assessed by image quality agent')}</div>
          </div>
          <div style="text-align:center;background:${iqScore>=0.7?'var(--brand-green-light)':iqScore>=0.5?'#FFFDE7':'#FFEBEE'};border-radius:var(--radius-md);padding:10px 18px">
            <div style="font-family:var(--font-display);font-size:28px;color:${iqScore>=0.7?'var(--brand-green)':iqScore>=0.5?'var(--severity-moderate)':'var(--severity-critical)'}">${iqPct}%</div>
            <div style="font-size:11px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.8px">Quality</div>
          </div>
        </div>
        <div class="image-quality-bar"><span style="color:var(--ink-muted)">Usable for diagnosis</span><div class="iq-bar-wrap"><div class="iq-bar"><div class="iq-fill ${iqClass}" style="width:${iqPct}%"></div></div><span class="iq-score">${iqPct}%</span></div></div>
        <div class="image-quality-bar"><span style="color:var(--ink-muted)">Image readable</span><div class="iq-bar-wrap"><div class="iq-bar"><div class="iq-fill ${iq.usable?'qf-good':'qf-poor'}" style="width:${iq.usable?100:0}%"></div></div><span class="iq-score">${iq.usable?'Yes':'No'}</span></div></div>
        ${symptomTagsHTML ? `<div style="margin-top:var(--space-md)"><div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Farmer-Reported Symptoms</div><div>${symptomTagsHTML}</div></div>` : ''}
        ${iq.suggestions?.length ? `<div style="margin-top:var(--space-md);background:#FFFDE7;border-radius:var(--radius-sm);padding:10px 14px;font-size:13px;color:#F57F17">${iq.suggestions.map(s=>`• ${esc(s)}`).join('<br>')}</div>` : ''}
      </div>
    </div>

    <!-- ATMOSPHERIC CONDITIONS -->
    ${(tempV != null || humV != null) ? `
    <div class="section-title"><span class="section-icon">🌡</span> Atmospheric Conditions at Diagnosis</div>
    <div class="atmo-grid">
      ${tempV != null ? `<div class="atmo-card"><div class="atmo-icon">🌡</div><div class="atmo-value">${tempV}<span class="atmo-unit">°C</span></div><div class="atmo-label">Temperature</div><span class="atmo-risk ${tempBadge}">${tempLabel}</span></div>` : ''}
      ${humV  != null ? `<div class="atmo-card"><div class="atmo-icon">💧</div><div class="atmo-value">${humV}<span class="atmo-unit">%</span></div><div class="atmo-label">Humidity</div><span class="atmo-risk ${humBadge}">${humLabel}</span></div>` : ''}
      ${windV != null ? `<div class="atmo-card"><div class="atmo-icon">💨</div><div class="atmo-value">${windV}<span class="atmo-unit">km/h</span></div><div class="atmo-label">Wind Speed</div><span class="atmo-risk ${windBadge}">${windLabel}</span></div>` : ''}
      ${vpdV  != null ? `<div class="atmo-card"><div class="atmo-icon">🌤</div><div class="atmo-value">${vpdV}<span class="atmo-unit">kPa</span></div><div class="atmo-label">Vapour Pressure Deficit</div><span class="atmo-risk ${vpdV<0.4?'badge-critical':vpdV<0.8?'badge-high':'badge-low'}">${vpdV<0.4?'Leaf wet':vpdV<0.8?'Low VPD':'Normal'}</span></div>` : ''}
    </div>
    <div class="soil-strip">
      <div class="soil-card">
        <div class="soil-card-title">🌱 Soil Temperature</div>
        <div class="soil-row"><span class="soil-depth">Surface (0 cm)</span><span class="soil-val">${soilT0}</span></div>
        <div class="soil-row"><span class="soil-depth">6 cm depth</span><span class="soil-val">${soilT6}</span></div>
        ${etV != null ? `<div class="soil-row"><span class="soil-depth">Evapotrans.</span><span class="soil-val">${etV} mm</span></div>` : ''}
      </div>
      <div class="soil-card">
        <div class="soil-card-title">💧 Soil Moisture</div>
        <div class="soil-row"><span class="soil-depth">0–1 cm</span><span class="soil-val">${soilM01}</span></div>
        <div class="soil-row"><span class="soil-depth">1–3 cm</span><span class="soil-val">${soilM13}</span></div>
        <div class="soil-row"><span class="soil-depth">3–9 cm</span><span class="soil-val">${soilM39}</span></div>
      </div>
      <div class="soil-card">
        <div class="soil-card-title">☁ Other Conditions</div>
        ${dewV    != null ? `<div class="soil-row"><span class="soil-depth">Dew Point</span><span class="soil-val">${dewV}°C</span></div>` : ''}
        ${precipV != null ? `<div class="soil-row"><span class="soil-depth">Precipitation</span><span class="soil-val">${precipV} mm</span></div>` : ''}
        ${cloudV  != null ? `<div class="soil-row"><span class="soil-depth">Cloud Cover</span><span class="soil-val">${cloudV}%</span></div>` : ''}
        ${wDescV !== '—' ? `<div class="soil-row"><span class="soil-depth">Condition</span><span class="soil-val" style="font-size:11px">${esc(wDescV)}</span></div>` : ''}
      </div>
    </div>
    ${wRFactors.length > 0 ? `
    <div class="risk-correlation">
      <div class="risk-corr-header">Disease ↔ Weather Risk Factors</div>
      <div class="risk-corr-body">
        <div class="risk-corr-row header-row"><span>Risk Factor</span><span>—</span><span>Status</span><span>Assessment</span></div>
        ${rFactorRows}
        ${wFavDisease.length ? `<div style="margin-top:10px"><div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Diseases Favoured by Current Conditions</div><div>${favChips}</div></div>` : ''}
      </div>
    </div>` : ''}
    ` : ''}

    <!-- WEATHER RISK SUMMARY -->
    ${wRisk ? `
    <div class="section-title"><span class="section-icon">🌧</span> Weather Risk Assessment</div>
    <div class="weather-card">
      <div class="weather-header">
        <span class="risk-badge badge ${wRiskBadge}" style="background:${wRiskBg};color:${wRiskColor}">${wRisk} DISEASE RISK</span>
        ${fullWeather.soil_risk ? `<span class="risk-badge" style="background:#E8EAF6;color:#3949AB;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase">Soil: ${esc(fullWeather.soil_risk)}</span>` : ''}
        ${!weatherUsed ? `<span style="font-size:12px;color:var(--ink-muted)">(No GPS — estimate based on crop context)</span>` : ''}
      </div>
      <div class="weather-body">
        ${wSummaryTxt ? `<p>${esc(wSummaryTxt)}</p>` : ''}
        ${wForecast || wAdvisory ? `
        <div class="weather-sub">
          ${wForecast ? `<div class="weather-sub-card"><div class="weather-sub-title">📅 Forecast</div><p>${esc(wForecast)}</p></div>` : ''}
          ${wAdvisory ? `<div class="weather-sub-card"><div class="weather-sub-title">⚠ Advisory</div><p>${esc(wAdvisory)}</p></div>` : ''}
        </div>` : ''}
      </div>
    </div>` : ''}

    <!-- IMMEDIATE ACTION -->
    ${immediateAction ? `
    <div class="section-title"><span class="section-icon">⚡</span> Do Right Now</div>
    <div class="action-hero">
      <div class="action-hero-icon">🚨</div>
      <div class="action-hero-text">${esc(immediateAction)}</div>
    </div>` : ''}

    <!-- ROOT CAUSES -->
    ${causes.length > 0 ? `
    <div class="section-title"><span class="section-icon">🔍</span> Root Causes</div>
    <ul class="causes-list">${causesHTML}</ul>` : ''}

    <!-- MEDICINE COMBINATIONS + PRODUCTS -->
    ${combos.length > 0 ? `
    <div class="section-title"><span class="section-icon">💊</span> Recommended Treatment Combinations</div>
    ${combos.join('')}` : ''}

    <!-- FERTILIZER -->
    ${fertList.length > 0 ? `
    <div class="section-title"><span class="section-icon">🌱</span> Fertilizer Recommendations</div>
    <div class="fertilizer-grid">${fertCardsHTML}</div>` : ''}

    <!-- ACTION PLAN / NEXT STEPS -->
    ${nextStepsFull.length > 0 ? `
    <div class="section-title"><span class="section-icon">📋</span> Action Plan</div>
    <div class="timeline">${timelineHTML}</div>` : ''}

    <!-- PREVENTION -->
    ${prevention ? `
    <div class="section-title"><span class="section-icon">🛡</span> Prevention (Next Season)</div>
    <div class="prevention-box">${esc(prevention)}</div>` : ''}

    <!-- DIFFERENTIALS -->
    ${diffs.length > 0 ? `
    <div class="section-title"><span class="section-icon">🔬</span> Differential Diagnoses Considered</div>
    <div class="param-card"><div style="padding:var(--space-md)">
      <div style="display:grid;grid-template-columns:2fr 1fr 3fr;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ink-muted)"><span>Disease</span><span>Probability</span><span>Reason</span></div>
      ${diffs.map(d=>`<div style="display:grid;grid-template-columns:2fr 1fr 3fr;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-light);font-size:13px;align-items:start"><span style="font-weight:600">${esc(d.disease||d)}</span><span style="font-family:var(--font-mono);font-size:12px">${d.probability!=null?Math.round(d.probability*100)+'%':'—'}</span><span style="color:var(--ink-muted)">${esc(d.reason||'')}</span></div>`).join('')}
    </div></div>` : ''}

    <!-- EXPERT BANNER -->
    ${consultExpert ? `
    <div style="display:flex;align-items:flex-start;gap:16px;background:#FBF5FF;border:1.5px solid #9B59B225;border-radius:var(--radius-md);padding:var(--space-lg);margin-top:var(--space-lg)">
      <div style="font-size:28px;flex-shrink:0">👨‍🌾</div>
      <div>
        <div style="font-weight:800;font-size:14px;color:#7B1FA2;margin-bottom:4px">Expert Consultation Recommended</div>
        <div style="font-size:13px;color:var(--ink-muted);line-height:1.6">Confidence or image quality is low. Please consult your local KVK (Krishi Vigyan Kendra) with this printed report for a confirmed diagnosis before applying treatment.</div>
      </div>
    </div>` : ''}

  </div><!-- /report-body -->

  <!-- FOOTER -->
  <div class="report-footer">
    <div class="footer-brand">FarmEasy</div>
    <div class="footer-disclaimer">This report is AI-generated for informational purposes only. Always verify with a certified agronomist before applying chemical treatments. Do not apply pesticides without reading the product label.</div>
    <div class="footer-model">Generated: ${esc(generatedAt)} &nbsp;|&nbsp; Model: Gemini 2.5 Flash + Groq LLaMA-3.3 &nbsp;|&nbsp; Pipeline: 5-agent agentic diagnosis</div>
  </div>

</div>
</body>
</html>`;

  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const html = buildReportHTML();
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `FarmEasy Diagnosis — ${disease}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `Report saved to:\n${uri}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not generate report. Please try again.');
      logger.error('[Download Report] failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={D.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={[D.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={D.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#2ECC71" />
        </TouchableOpacity>
        <Text style={D.headerTitle}>{t('diagnosis.title')}</Text>
        <TouchableOpacity
          style={D.chatHeaderBtn}
          onPress={() => navigation.navigate('AIChat', {
            initialMessage: `I have ${disease} in my ${crop} at ${farmCtx.cropAge || '?'} days. Severity: ${severity}. What should I do?`
          })}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#2ECC71" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        <Animated.View style={{
          opacity: contentAnim,
          transform: [{ translateY: contentAnim.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }}>

          {/* ── 1. Hero card ── */}
          <View style={[D.heroCard, { borderColor: `${sev.color}30`, backgroundColor: sev.bg }]}>
            <View style={D.heroTop}>
              <View style={{ flex: 1 }}>
                <View style={D.heroTagRow}>
                  <View style={[D.sevBadge, { backgroundColor: `${sev.color}20` }]}>
                    <Ionicons name={sev.icon} size={11} color={sev.color} />
                    <Text style={[D.sevBadgeText, { color: sev.color }]}>{t(`diagnosis.${sev.tKey}`)}</Text>
                  </View>
                  {urgency && !isHealthy && (
                    <View style={[D.urgencyBadge, { backgroundColor: `${urgConf.color}15` }]}>
                      <Ionicons name={urgConf.icon} size={10} color={urgConf.color} />
                      <Text style={[D.urgencyText, { color: urgConf.color }]}>{t(`diagnosis.${urgConf.tKey}`)}</Text>
                    </View>
                  )}
                </View>
                <Text style={D.diseaseName}>{disease}</Text>
                {scientific ? <Text style={D.scientificName}>{scientific}</Text> : null}
                <View style={D.cropRow}>
                  <Ionicons name="leaf-outline" size={12} color="#888" />
                  <Text style={D.cropText}>{crop}</Text>
                  {stage ? (
                    <>
                      <View style={D.heroDivider} />
                      <Text style={D.cropText}>{t('diagnosis.stage', { stage })}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              <ConfidenceRing value={confidence} color={sev.color} size={84} confidenceLabel={t('diagnosis.confidence')} />
            </View>

            {/* Meta row */}
            <View style={D.heroMetaRow}>
              {affectedArea ? <InfoRow icon="warning-outline"      iconColor="#F39C12" label={t('diagnosis.areaAffected')} value={affectedArea} /> : null}
              {spreadRisk   ? <InfoRow icon="git-branch-outline"   iconColor={spreadRisk === 'high' ? '#E74C3C' : '#F39C12'} label={t('diagnosis.spreadRisk')} value={spreadRisk.toUpperCase()} /> : null}
              {estYieldLoss ? <InfoRow icon="trending-down-outline" iconColor="#E74C3C" label={t('diagnosis.yieldLoss')} value={estYieldLoss} /> : null}
            </View>
          </View>

          {/* ── 2. Immediate Action ── */}
          {immediateAction && !isHealthy && (
            <View style={[D.section, D.immediateCard]}>
              <View style={D.immediateHeader}>
                <Ionicons name="flash" size={16} color="#E74C3C" />
                <Text style={D.immediateTitle}>{t('diagnosis.doNow')}</Text>
              </View>
              <Text style={D.immediateText}>{immediateAction}</Text>
            </View>
          )}

          {/* ── 3. Causes ── */}
          {causes.length > 0 && (
            <View style={D.section}>
              <SectionHeader color="#9B59B6" title={t('diagnosis.rootCauses')} />
              <View style={D.causesCard}>
                {causes.map((cause, i) => (
                  <View key={i} style={D.causeRow}>
                    <View style={D.causeBullet} />
                    <Text style={D.causeText}>{cause}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── 4. Treatment Protocol ── */}
          {rawTreatment.length > 0 && !isHealthy && (
            <View style={D.section}>
              <SectionHeader color="#E74C3C" title={t('diagnosis.treatmentProtocol')} />
              <View style={D.stepsCard}>
                {rawTreatment.map((step, i) => {
                  // Handle both string and object treatments
                  if (!treatmentIsObjects || typeof step === 'string') {
                    return (
                      <View key={i}>
                        <View style={D.step}>
                          <View style={[D.stepNum, { backgroundColor: `${sev.color}18` }]}>
                            <Text style={[D.stepNumText, { color: sev.color }]}>{i + 1}</Text>
                          </View>
                          <Text style={D.stepText}>{step}</Text>
                        </View>
                        {i < rawTreatment.length - 1 && <View style={D.stepDiv} />}
                      </View>
                    );
                  }
                  // Rich object format
                  return (
                    <View key={i}>
                      <View style={D.richStep}>
                        <View style={D.richStepHeader}>
                          <View style={[D.stepNum, { backgroundColor: `${sev.color}18` }]}>
                            <Text style={[D.stepNumText, { color: sev.color }]}>{step.step || i + 1}</Text>
                          </View>
                          <Text style={D.richStepAction}>{step.action}</Text>
                        </View>
                        {step.chemical && (
                          <View style={D.richDetail}>
                            <Ionicons name="flask-outline" size={12} color="#9B59B6" />
                            <Text style={D.richDetailText}>
                              <Text style={{ color: '#9B59B6', fontWeight: '700' }}>{step.chemical}</Text>
                              {step.dose ? ` — ${step.dose}` : ''}
                            </Text>
                          </View>
                        )}
                        {step.applicationMethod && (
                          <View style={D.richDetail}>
                            <Ionicons name="water-outline" size={12} color="#3498DB" />
                            <Text style={D.richDetailText}>{step.applicationMethod}</Text>
                          </View>
                        )}
                        {step.timing && (
                          <View style={D.richDetail}>
                            <Ionicons name="time-outline" size={12} color="#F39C12" />
                            <Text style={D.richDetailText}>{step.timing}</Text>
                          </View>
                        )}
                        {step.interval && (
                          <View style={D.richDetail}>
                            <Ionicons name="refresh-outline" size={12} color="#888" />
                            <Text style={D.richDetailText}>{step.interval}</Text>
                          </View>
                        )}
                        {step.safetyNote && (
                          <View style={[D.richDetail, { backgroundColor: 'rgba(231,76,60,0.06)', borderRadius: 6, padding: 6 }]}>
                            <Ionicons name="shield-outline" size={12} color="#E74C3C" />
                            <Text style={[D.richDetailText, { color: '#E74C3C' }]}>{step.safetyNote}</Text>
                          </View>
                        )}
                      </View>
                      {i < rawTreatment.length - 1 && <View style={D.stepDiv} />}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── 5. Organic Alternative ── */}
          {organicTx && !isHealthy && (
            <View style={D.section}>
              <SectionHeader color="#27AE60" title={t('diagnosis.organicAlt')} />
              <View style={D.organicCard}>
                <View style={D.organicHeader}>
                  <Ionicons name="leaf" size={16} color="#27AE60" />
                  <Text style={D.organicTitle}>{organicTx.method}</Text>
                </View>
                {organicTx.dose && (
                  <View style={D.richDetail}>
                    <Ionicons name="beaker-outline" size={12} color="#27AE60" />
                    <Text style={D.richDetailText}>{t('diagnosis.dose', { dose: organicTx.dose })}</Text>
                  </View>
                )}
                {organicTx.frequency && (
                  <View style={D.richDetail}>
                    <Ionicons name="refresh" size={12} color="#27AE60" />
                    <Text style={D.richDetailText}>{t('diagnosis.frequency', { freq: organicTx.frequency })}</Text>
                  </View>
                )}
                {organicTx.effectiveness && (
                  <View style={D.richDetail}>
                    <Ionicons name="checkmark-circle-outline" size={12} color="#888" />
                    <Text style={D.richDetailText}>{organicTx.effectiveness}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── 6. AI Contextual Insights ── */}
          {(weatherNote || soilNote || prevCropNote || notes) && (
            <View style={D.section}>
              <SectionHeader color="#F39C12" title={t('diagnosis.aiInsights')} />
              <View style={D.insightCard}>
                {weatherNote && (
                  <View style={D.insightRow}>
                    <Ionicons name="rainy-outline" size={14} color="#3498DB" />
                    <Text style={D.insightText}>{weatherNote}</Text>
                  </View>
                )}
                {soilNote && (
                  <View style={D.insightRow}>
                    <Ionicons name="layers-outline" size={14} color="#E67E22" />
                    <Text style={D.insightText}>{soilNote}</Text>
                  </View>
                )}
                {prevCropNote && (
                  <View style={D.insightRow}>
                    <Ionicons name="repeat-outline" size={14} color="#9B59B6" />
                    <Text style={D.insightText}>{prevCropNote}</Text>
                  </View>
                )}
                {notes && (
                  <View style={D.insightRow}>
                    <Ionicons name="eye-outline" size={14} color="#888" />
                    <Text style={D.insightText}>{notes}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── 7. Follow-up Schedule ── */}
          {followUp.length > 0 && (
            <View style={D.section}>
              <SectionHeader color="#3498DB" title={t('diagnosis.followUp')} />
              <View style={D.followUpCard}>
                {followUp.map((fu, i) => (
                  <View key={i} style={D.followUpRow}>
                    <View style={D.followUpDay}>
                      <Text style={D.followUpDayText}>{t('diagnosis.dayLabel', { n: fu.day })}</Text>
                    </View>
                    <Text style={D.followUpAction}>{fu.action}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── 8. Prevention ── */}
          {prevention && (
            <View style={D.section}>
              <SectionHeader color="#2ECC71" title={t('diagnosis.prevention')} />
              <View style={D.preventCard}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#2ECC71" />
                <Text style={D.preventText}>{prevention}</Text>
              </View>
            </View>
          )}

          {/* ── 9. Recommended Products ── */}
          {rawProducts.length > 0 && (
            <View style={D.section}>
              <SectionHeader color="#F39C12" title={t('diagnosis.products')} />
              {productsAreObjects ? (
                <View style={D.productsCard}>
                  {rawProducts.map((p, i) => (
                    <TouchableOpacity key={i} style={D.productRow} onPress={() => navigation.navigate('AgriStore')} activeOpacity={0.8}>
                      <View style={D.productIconWrap}>
                        <Ionicons name="flask-outline" size={16} color="#F39C12" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={D.productName}>{p.name}</Text>
                        <Text style={D.productMeta}>
                          {p.type}{p.dose ? ` · ${p.dose}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color="#555" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={D.productsRow}>
                  {rawProducts.map((p, i) => (
                    <TouchableOpacity key={i} style={D.productChip} onPress={() => navigation.navigate('AgriStore')} activeOpacity={0.8}>
                      <Ionicons name="flask-outline" size={13} color="#F39C12" />
                      <Text style={D.productChipText}>{typeof p === 'object' ? p.name : p}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ── Consult expert banner ── */}
          {consultExpert && (
            <View style={D.consultBanner}>
              <Ionicons name="people-outline" size={18} color="#9B59B6" />
              <View style={{ flex: 1 }}>
                <Text style={D.consultTitle}>{t('diagnosis.consultExpert')}</Text>
                <Text style={D.consultText}>{t('diagnosis.consultText')}</Text>
              </View>
            </View>
          )}

          {/* ── Actions ── */}
          <View style={D.actions}>
            <TouchableOpacity
              style={D.actionOutline}
              onPress={() => navigation.navigate('AIChat', {
                initialMessage: `I have ${disease} in my ${crop} crop (${farmCtx.cropAge || '?'} days). Severity: ${severity}. ${immediateAction ? `AI suggests: ${immediateAction}` : ''} What additional advice can you give?`
              })}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-outline" size={15} color="#2ECC71" />
              <Text style={D.actionOutlineText}>{t('diagnosis.askFarmMind')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={D.actionFill} onPress={() => navigation.navigate('AgriStore')} activeOpacity={0.85}>
              <Ionicons name="cart-outline" size={15} color="#0A140A" />
              <Text style={D.actionFillText}>{t('diagnosis.buyProducts')}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Download Report ── */}
          <TouchableOpacity
            style={[D.downloadBtn, downloading && D.downloadBtnDisabled]}
            onPress={handleDownload}
            activeOpacity={0.85}
            disabled={downloading}
          >
            <Ionicons name={downloading ? 'hourglass-outline' : 'download-outline'} size={16} color="#fff" />
            <Text style={D.downloadBtnText}>
              {downloading ? 'Generating PDF…' : 'Download Full Report'}
            </Text>
          </TouchableOpacity>

          {/* ── Disclaimer ── */}
          <View style={D.disclaimer}>
            <Ionicons name="information-circle-outline" size={13} color="#555" />
            <Text style={D.disclaimerText}>{t('diagnosis.disclaimer')}</Text>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const D = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn:      { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { flex: 1, fontSize: 17, fontWeight: '800', color: '#1E293B', marginLeft: 6 },
  chatHeaderBtn:{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(46,204,113,0.1)' },

  heroCard: {
    marginHorizontal: 18, marginBottom: 6,
    borderRadius: 20, padding: 20, gap: 14,
    borderWidth: 1,
  },
  heroTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTagRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  sevBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sevBadgeText: { fontSize: 11, fontWeight: '700' },
  urgencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  urgencyText:  { fontSize: 10, fontWeight: '800' },
  diseaseName:  { fontSize: 22, fontWeight: '900', color: '#1E293B', marginBottom: 2 },
  scientificName:{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 6 },
  cropRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cropText:     { fontSize: 12, color: '#9CA3AF' },
  heroDivider:  { width: 1, height: 10, backgroundColor: 'rgba(0,0,0,0.15)' },
  heroMetaRow:  { gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 10 },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel:    { fontSize: 11, color: '#9CA3AF' },
  infoValue:    { fontSize: 11, fontWeight: '700', color: '#6B7280', flex: 1 },

  // Immediate action
  immediateCard: {
    backgroundColor: 'rgba(231,76,60,0.06)',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.2)',
  },
  immediateHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  immediateTitle: { fontSize: 11, fontWeight: '900', color: '#E74C3C', letterSpacing: 1 },
  immediateText:  { fontSize: 14, color: '#1E293B', lineHeight: 21, fontWeight: '600' },

  // Sections
  section:       { marginTop: 16, marginHorizontal: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionDot:    { width: 6, height: 6, borderRadius: 3 },
  sectionTitle:  { fontSize: 11, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.2, textTransform: 'uppercase' },

  // Causes
  causesCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  causeRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  causeBullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#9B59B6', marginTop: 7, flexShrink: 0 },
  causeText:   { fontSize: 13, color: '#6B7280', lineHeight: 19, flex: 1 },

  // Steps
  stepsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  step:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  stepNum:     { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText: { fontSize: 12, fontWeight: '800' },
  stepText:    { fontSize: 13, color: '#6B7280', lineHeight: 19, flex: 1 },
  stepDiv:     { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginHorizontal: 16 },

  richStep:       { padding: 16, gap: 8 },
  richStepHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  richStepAction: { fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1, lineHeight: 20 },
  richDetail:     { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingLeft: 34 },
  richDetailText: { fontSize: 12, color: '#9CA3AF', lineHeight: 17, flex: 1 },

  // Organic
  organicCard: {
    backgroundColor: 'rgba(39,174,96,0.06)', borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1, borderColor: 'rgba(39,174,96,0.2)',
  },
  organicHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  organicTitle:  { fontSize: 14, fontWeight: '700', color: '#27AE60', flex: 1 },

  // Insights
  insightCard: {
    backgroundColor: '#FFFBF0', borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: 'rgba(243,156,18,0.2)',
  },
  insightRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  insightText: { fontSize: 12, color: '#6B7280', lineHeight: 17, flex: 1 },

  // Follow-up
  followUpCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  followUpRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  followUpDay:     { width: 46, height: 32, borderRadius: 8, backgroundColor: 'rgba(52,152,219,0.1)', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  followUpDayText: { fontSize: 11, color: '#3498DB', fontWeight: '800' },
  followUpAction:  { fontSize: 12, color: '#6B7280', lineHeight: 18, flex: 1, paddingTop: 7 },

  // Prevention
  preventCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(46,204,113,0.06)', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.15)',
  },
  preventText: { flex: 1, fontSize: 13, color: '#6B7280', lineHeight: 19 },

  // Products
  productsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  productIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(243,156,18,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  productName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  productMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  productsRow: { gap: 8, paddingVertical: 2 },
  productChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(243,156,18,0.08)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(243,156,18,0.25)',
  },
  productChipText: { fontSize: 13, color: '#F39C12', fontWeight: '600' },

  // Consult banner
  consultBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 18, marginTop: 16,
    backgroundColor: 'rgba(155,89,182,0.06)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(155,89,182,0.15)',
  },
  consultTitle: { fontSize: 13, fontWeight: '800', color: '#9B59B6', marginBottom: 4 },
  consultText:  { fontSize: 11, color: '#6B7280', lineHeight: 17 },

  // Actions
  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 18, marginTop: 20 },
  actionOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: 'rgba(46,204,113,0.4)',
  },
  actionOutlineText: { fontSize: 13, fontWeight: '700', color: '#2ECC71' },
  actionFill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 14, paddingVertical: 14, backgroundColor: '#2ECC71',
  },
  actionFillText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  // Download button
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 18, marginTop: 10,
    backgroundColor: '#1E293B', borderRadius: 14, paddingVertical: 14,
  },
  downloadBtnDisabled: { opacity: 0.6 },
  downloadBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 18, marginTop: 14,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: '#9CA3AF', lineHeight: 16 },
});
