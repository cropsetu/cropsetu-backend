import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, StatusBar, Dimensions, Alert, Easing,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import {
  sendChatMessage, sendVoiceMessage,
  getConversationMessages, getConversations, getScanSessions,
} from '../../services/aiApi';
import { useFarm } from '../../context/FarmContext';
import { useLanguage } from '../../context/LanguageContext';
import { WebView } from 'react-native-webview';

const { width: W, height: H } = Dimensions.get('window');

// ─── Light Color Tokens ───────────────────────────────────────────────────────
const BG       = '#FFFFFF';
const CHAT_BG  = '#F4F8F5';
const PRIMARY  = '#16A34A';
const P_LIGHT  = '#22C55E';
const ACCENT   = '#0D9488';
const A_LIGHT  = '#14B8A6';
const BORDER   = '#D4EDD6';
const SURFACE  = '#F0F7F1';
const TEXT     = '#1A2E1A';
const TEXT2    = '#4A6E4A';
const MUTED    = '#8AAE8A';
const USER_A   = '#16A34A';
const USER_B   = '#0D9488';
const DANGER   = '#EF4444';

// ─── Voice modal dark tokens ──────────────────────────────────────────────────
const V_BG    = '#071009';
const V_GLASS = 'rgba(34,197,94,0.07)';
const V_BORD  = 'rgba(34,197,94,0.18)';
const V_TEXT  = '#F0FDF4';
const V_MUTED = 'rgba(134,239,172,0.55)';

// ─── Particle Word Sphere (WebView canvas — Fibonacci sphere → text morphing) ──
const SPHERE_H = H * 0.46;

// Minified HTML+JS for the particle word visualizer.
// Rendering pipeline: Fibonacci sphere (idle) → off-screen canvas text sampling
// → Fisher-Yates shuffled pixel targets → spring physics → perspective projection
// Messages accepted: {type:'listening',value:bool}, {type:'audioLevel',value:0-1},
//                    {type:'transcript',value:string}, {type:'reset'}
const PARTICLE_WORD_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:transparent;overflow:hidden;height:100vh;width:100vw;}
canvas{position:fixed;inset:0;width:100%;height:100%;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
(function(){
  var canvas=document.getElementById('c');
  var ctx=canvas.getContext('2d');
  var W,H,CX,CY,dpr;
  var appState=0,isListening=false,audioLevel=0,t=0,rotY=0;
  var N=6000;
  var px=new Float32Array(N),py=new Float32Array(N),pz=new Float32Array(N);
  var vx=new Float32Array(N),vy=new Float32Array(N),vz=new Float32Array(N);
  var tx=new Float32Array(N),ty=new Float32Array(N),tz=new Float32Array(N);
  var hue=new Float32Array(N),phase=new Float32Array(N);
  var PHI=Math.PI*(1+Math.sqrt(5)),FOV=450,CAM=500;

  function resize(){
    dpr=window.devicePixelRatio||1;W=window.innerWidth;H=window.innerHeight;
    CX=W/2;CY=H/2;canvas.width=W*dpr;canvas.height=H*dpr;
    canvas.style.width=W+'px';canvas.style.height=H+'px';
    ctx.scale(dpr,dpr);
    if(appState===0)initSphere();
  }

  function initSphere(){
    var R=Math.min(W,H)*0.38;
    for(var i=0;i<N;i++){
      var p=Math.acos(1-2*(i+0.5)/N),a=PHI*i;
      tx[i]=Math.sin(p)*Math.cos(a)*R;
      ty[i]=Math.sin(p)*Math.sin(a)*R;
      tz[i]=Math.cos(p)*R;
    }
  }

  function initParticles(){
    for(var i=0;i<N;i++){
      px[i]=(Math.random()-.5)*W*2;py[i]=(Math.random()-.5)*H*2;pz[i]=(Math.random()-.5)*800;
      vx[i]=vy[i]=vz[i]=0;hue[i]=120+(i/N)*55;phase[i]=Math.random()*Math.PI*2;
    }
  }

  function sampleText(phrase){
    var fW=Math.floor(W),fH=Math.floor(H);
    var off=document.createElement('canvas');off.width=fW;off.height=fH;
    var c2=off.getContext('2d');
    var words=phrase.split(' ');var lines=[];var cur='';
    var maxC=phrase.length>20?10:16;
    for(var wi=0;wi<words.length;wi++){
      var w=words[wi];
      if((cur+w).length>maxC){lines.push(cur.trim());cur=w+' ';}else cur+=w+' ';
    }
    lines.push(cur.trim());
    var fs=Math.min(fW*0.65/(maxC*0.5),fH*0.45/lines.length,140);
    if(phrase.length>25)fs*=0.8;
    c2.fillStyle='#fff';c2.font='900 '+fs+'px Arial';c2.textAlign='center';c2.textBaseline='middle';
    var lh=fs*1.1,sy=fH/2-((lines.length-1)*lh/2);
    for(var li=0;li<lines.length;li++)c2.fillText(lines[li],fW/2,sy+li*lh);
    var d=c2.getImageData(0,0,fW,fH).data;
    var pts=[];var step=phrase.length>30?2:1;
    for(var y=0;y<fH;y+=step)for(var x=0;x<fW;x+=step)
      if(d[(y*fW+x)*4+3]>120)pts.push(x-fW/2+(Math.random()-.5)*.8,y-fH/2+(Math.random()-.5)*.8);
    for(var i=pts.length/2-1;i>0;i--){
      var j=Math.floor(Math.random()*(i+1));var ia=i*2,ja=j*2;
      var tmp=pts[ia];pts[ia]=pts[ja];pts[ja]=tmp;
      tmp=pts[ia+1];pts[ia+1]=pts[ja+1];pts[ja+1]=tmp;
    }
    return pts;
  }

  function formWord(phrase){
    if(!phrase.trim())return;
    appState=1;
    var pts=sampleText(phrase);var pc=pts.length/2;
    for(var i=0;i<N;i++){var idx=(i%pc)*2;tx[i]=pts[idx];ty[i]=pts[idx+1];tz[i]=0;}
    rotY=0;
    setTimeout(function(){if(appState===1)appState=2;},2000);
  }

  function resetSphere(){appState=0;initSphere();}

  function update(){
    t+=0.005;
    if(appState===0)rotY+=isListening?0.012:0.006;
    var jitter=appState===0?(isListening?2.5+audioLevel*8:1.8):0;
    var breathe=appState===0&&isListening?Math.sin(t*3)*0.15:0;
    for(var i=0;i<N;i++){
      var bx=tx[i]*(1+breathe),by=ty[i]*(1+breathe),bz=tz[i]*(1+breathe);
      var cY2=Math.cos(rotY),sY2=Math.sin(rotY);
      var rx=bx*cY2-bz*sY2,ry=by,rz=bx*sY2+bz*cY2;
      if(appState===0){
        rx+=Math.sin(t*8+phase[i])*jitter;ry+=Math.cos(t*9+phase[i])*jitter;rz+=Math.sin(t*7+phase[i]*2)*jitter;
        if(isListening&&audioLevel>0.3){var f=(audioLevel-0.3)*6;rx+=Math.sin(phase[i]*3)*f;ry+=Math.cos(phase[i]*5)*f;}
      }
      var sp=appState===0?0.02:0.022;
      vx[i]+=(rx-px[i])*sp;vy[i]+=(ry-py[i])*sp;vz[i]+=(rz-pz[i])*sp;
      vx[i]*=0.82;vy[i]*=0.82;vz[i]*=0.82;
      px[i]+=vx[i];py[i]+=vy[i];pz[i]+=vz[i];
    }
  }

  function draw(){
    ctx.fillStyle='rgba(7,16,9,0.22)';ctx.fillRect(0,0,W,H);
    for(var i=0;i<N;i++){
      var z=pz[i]+CAM;if(z<10)continue;
      var sc=FOV/z,sx=px[i]*sc+CX,sy2=py[i]*sc+CY;
      var spd=Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i]+vz[i]*vz[i]);
      var a=Math.min(1,(0.18+spd*0.1)*(sc*0.65));
      var sz=(0.4+spd*0.12)*sc;
      var h,s,l;
      if(appState>=1){h=142;s=90;l=75;a=Math.min(1,a*1.5);sz*=0.9;}
      else{
        h=(hue[i]+t*25)%360;
        s=isListening?85+audioLevel*15:80;l=isListening?65+audioLevel*20:70;
        if(isListening){a=Math.min(1,a*(1.2+audioLevel*0.8));sz*=(1+audioLevel*0.5);}
      }
      ctx.beginPath();ctx.arc(sx,sy2,sz,0,6.2832);
      ctx.fillStyle='hsla('+h+','+s+'%,'+l+'%,'+a+')';ctx.fill();
    }
    if(appState===0&&isListening){
      var gr=80+audioLevel*60;
      var grd=ctx.createRadialGradient(CX,CY,0,CX,CY,gr);
      grd.addColorStop(0,'rgba(22,163,74,'+(0.08+audioLevel*0.12)+')');
      grd.addColorStop(0.5,'rgba(13,148,136,'+(0.04+audioLevel*0.06)+')');
      grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath();ctx.arc(CX,CY,gr,0,6.2832);ctx.fillStyle=grd;ctx.fill();
    }
  }

  function loop(){update();draw();requestAnimationFrame(loop);}

  function onMsg(e){
    try{
      var raw=typeof e==='string'?e:(e.data||'');
      var d=JSON.parse(raw);
      if(d.type==='listening')isListening=d.value;
      if(d.type==='audioLevel')audioLevel=d.value;
      if(d.type==='transcript')formWord(d.value||'');
      if(d.type==='reset')resetSphere();
    }catch(err){}
  }
  document.addEventListener('message',onMsg);
  window.addEventListener('message',onMsg);

  resize();initParticles();loop();
  window.addEventListener('resize',function(){ctx.resetTransform();resize();});
})();
</script>
</body>
</html>`;

function ParticleWordSphere({ isListening, audioLevel, transcript }) {
  const wvRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    wvRef.current?.postMessage(JSON.stringify({ type: 'listening', value: isListening }));
  }, [isListening]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    wvRef.current?.postMessage(JSON.stringify({ type: 'audioLevel', value: audioLevel }));
  }, [audioLevel]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (transcript) {
      wvRef.current?.postMessage(JSON.stringify({ type: 'transcript', value: transcript }));
    } else {
      wvRef.current?.postMessage(JSON.stringify({ type: 'reset' }));
    }
  }, [transcript]);

  // WebView native module is not available on web preview — render a placeholder
  if (Platform.OS === 'web') {
    return <View style={{ width: W, height: SPHERE_H, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: V_MUTED, fontSize: 12 }}>Voice sphere — run on device</Text>
    </View>;
  }

  return (
    <View style={{ width: W, height: SPHERE_H }}>
      <WebView
        ref={wvRef}
        source={{ html: PARTICLE_WORD_HTML }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        originWhitelist={['*']}
        backgroundColor="transparent"
        allowsInlineMediaPlayback
      />
    </View>
  );
}

// ─── Voice full-screen modal (slides up, dark bg so particles look great) ─────
function VoiceModal({ visible, isRecording, isProcessing, audioLevel, recordDuration, voiceResult, onStart, onSend, onCancel, onClose, insets }) {
  const slideAnim = useRef(new Animated.Value(H)).current;
  const transFade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(slideAnim, { toValue: 0, speed: 16, bounciness: 0, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: H, duration: 280, easing: Easing.in(Easing.ease), useNativeDriver: true })
        .start(() => setMounted(false));
    }
  }, [visible]);

  useEffect(() => {
    if (voiceResult?.transcription) Animated.timing(transFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    else transFade.setValue(0);
  }, [voiceResult]);

  if (!mounted) return null;

  const mins = Math.floor(recordDuration / 60).toString().padStart(2, '0');
  const secs = (recordDuration % 60).toString().padStart(2, '0');
  const statusLabel = isProcessing ? 'Analysing…' : isRecording ? `Listening  ${mins}:${secs}` : 'Tap mic to speak';

  return (
    <Animated.View style={[VM.root, { transform: [{ translateY: slideAnim }] }]}>
      {/* Close / header */}
      <View style={[VM.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onClose} style={VM.closeBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={24} color={V_MUTED} />
        </TouchableOpacity>
        <Text style={VM.headerTitle}>Voice Assistant</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Particle Word Sphere: idle=rotating Fibonacci sphere, listening=audio-reactive,
          transcription received=particles morph into the spoken text */}
      <ParticleWordSphere
        isListening={isRecording}
        audioLevel={audioLevel}
        transcript={voiceResult?.transcription || ''}
      />

      {/* Status */}
      <View style={[VM.statusPill, isRecording && VM.statusPillActive]}>
        <View style={[VM.statusDot, { backgroundColor: isProcessing ? '#F59E0B' : isRecording ? P_LIGHT : V_MUTED }]} />
        <Text style={VM.statusLabel}>{statusLabel}</Text>
      </View>

      {/* Transcript result */}
      {voiceResult && !isRecording && !isProcessing && (
        <Animated.View style={[VM.resultCard, { opacity: transFade }]}>
          {voiceResult.error ? (
            <Text style={VM.errorText}>⚠ {voiceResult.error}</Text>
          ) : (
            <>
              <View style={VM.resultRow}><Ionicons name="mic-outline" size={13} color={V_MUTED} /><Text style={VM.resultTrans} numberOfLines={2}>{voiceResult.transcription}</Text></View>
              <View style={[VM.resultRow, { marginTop: 8 }]}><Ionicons name="leaf-outline" size={13} color={P_LIGHT} /><Text style={VM.resultReply} numberOfLines={3}>{voiceResult.reply}</Text></View>
              <TouchableOpacity style={VM.viewChatBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={VM.viewChatText}>View full reply in Chat →</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      )}

      {/* Controls */}
      <View style={[VM.controls, { paddingBottom: insets.bottom + 24 }]}>
        {isProcessing ? (
          <ActivityIndicator color={P_LIGHT} size="large" />
        ) : isRecording ? (
          <View style={VM.activeRow}>
            <TouchableOpacity style={VM.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color={DANGER} />
            </TouchableOpacity>
            <TouchableOpacity style={VM.sendRecBtn} onPress={onSend} activeOpacity={0.8}>
              <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={VM.sendRecGrad}>
                <Ionicons name="arrow-up" size={22} color="#FFF" />
                <Text style={VM.sendRecText}>Send</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={VM.micBtn} onPress={onStart} activeOpacity={0.8}>
            <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={VM.micGrad}>
              <Ionicons name="mic" size={32} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        <Text style={VM.hint}>
          {isRecording ? 'Tap send when done, or cancel' : isProcessing ? 'Processing your voice…' : 'Speak in Hindi, Marathi, English or any Indian language'}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Chat sub-components (light theme)
// ─────────────────────────────────────────────────────────────────────────────

function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    Animated.parallel(dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: 1, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]))
    )).start();
  }, []);
  return (
    <View style={S.dotsRow}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[S.dot, { opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }] }]} />
      ))}
    </View>
  );
}

function DiagnosisCard({ data, onBuyMedicine }) {
  const sevColor = { low: PRIMARY, moderate: '#D97706', high: '#DC2626', critical: '#9B1C1C' }[data.severity] || MUTED;
  const steps = Array.isArray(data.treatment)
    ? data.treatment
    : data.treatment && typeof data.treatment === 'object'
      ? Object.entries(data.treatment).filter(([, v]) => v).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
      : [];
  const note = data.prevention || data.expectedRecovery || data.additionalNotes || '';
  return (
    <View style={S.diagCard}>
      <View style={S.diagHeader}>
        <View style={[S.diagSevDot, { backgroundColor: sevColor }]} />
        <Text style={S.diagName}>{data.disease || data.name}</Text>
        <View style={[S.diagConf, { backgroundColor: `${sevColor}18` }]}>
          <Text style={[S.diagConfText, { color: sevColor }]}>{data.confidence}% match</Text>
        </View>
      </View>
      <View style={S.diagMeta}><Ionicons name="leaf-outline" size={12} color={MUTED} /><Text style={S.diagMetaText}>{data.crop ? `${data.crop} · ` : ''}{data.severity}</Text></View>
      <View style={S.diagDivider} />
      <Text style={S.diagSectionLabel}>Treatment Plan</Text>
      {steps.map((step, i) => (
        <View key={i} style={S.diagStep}>
          <View style={S.diagStepNum}><Text style={S.diagStepNumText}>{i + 1}</Text></View>
          <Text style={S.diagStepText}>{typeof step === 'string' ? step : step.action}</Text>
        </View>
      ))}
      {!!note && <View style={S.diagTip}><Ionicons name="shield-checkmark-outline" size={12} color={PRIMARY} /><Text style={S.diagTipText}>{note}</Text></View>}
      <TouchableOpacity style={S.buyBtn} onPress={onBuyMedicine} activeOpacity={0.8}>
        <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.buyBtnGrad}>
          <Ionicons name="cart-outline" size={14} color="#FFF" />
          <Text style={S.buyBtnText}>Buy Products</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function MarketCard({ data }) {
  const prices  = data.prices || [];
  const insight = data.insight || data.sellingAdvice || '';
  const metaRows = [
    data.msp         && { label: 'MSP',         value: data.msp },
    data.marketRange && { label: 'Market range', value: data.marketRange },
    data.trend       && { label: 'Trend',        value: data.trend },
    data.bestMarket  && { label: 'Best market',  value: data.bestMarket },
  ].filter(Boolean);
  return (
    <View style={S.mktCard}>
      <Text style={S.mktCrop}>{data.crop} Prices Today</Text>
      {prices.map((p, i) => <View key={i} style={S.mktRow}><Text style={S.mktMandi}>{p.mandi}</Text><Text style={S.mktPrice}>₹{(p.price || 0).toLocaleString()}</Text></View>)}
      {metaRows.map((r, i) => <View key={i} style={S.mktRow}><Text style={S.mktMandi}>{r.label}</Text><Text style={S.mktPrice}>{r.value}</Text></View>)}
      {!!insight && <View style={S.mktTip}><Ionicons name="bulb-outline" size={12} color="#D97706" /><Text style={S.mktTipText}>{insight}</Text></View>}
    </View>
  );
}

function MessageBubble({ msg, onBuyMedicine }) {
  const isUser = msg.role === 'user';
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);
  const formatText = (text) =>
    (text || '').split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <Text key={i} style={{ fontWeight: '800' }}>{p.slice(2, -2)}</Text>
        : <Text key={i}>{p}</Text>
    );
  if (isUser) {
    return (
      <Animated.View style={[S.userBubbleWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.userBubble}>
          {msg.isVoice && <View style={S.voiceTag}><Ionicons name="mic" size={10} color="rgba(255,255,255,0.7)" /><Text style={S.voiceTagText}>voice</Text></View>}
          <Text style={S.userBubbleText}>{msg.transcribing ? '…' : msg.text}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[S.aiBubbleWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={S.aiAvatar}><Ionicons name="leaf" size={13} color={PRIMARY} /></View>
      <View style={{ flex: 1, gap: 8 }}>
        {msg.text && <View style={S.aiBubble}><Text style={S.aiBubbleText}>{formatText(msg.text)}</Text></View>}
        {msg.diagnosisData && <DiagnosisCard data={msg.diagnosisData} onBuyMedicine={onBuyMedicine} />}
        {msg.marketData    && <MarketCard data={msg.marketData} />}
      </View>
    </Animated.View>
  );
}

// ── Sidebar (light theme) ──────────────────────────────────────────────────
function Sidebar({ isOpen, onClose, sessions, historyLoading, onSessionPress, onNewChat, insets }) {
  const translateX     = useRef(new Animated.Value(-W * 0.82)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX,     { toValue: isOpen ? 0 : -W * 0.82, speed: 18, bounciness: 0, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: isOpen ? 1 : 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[SB.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[SB.panel, { paddingTop: insets.top + 12, transform: [{ translateX }] }]}>
        <View style={SB.panelHeader}>
          <View style={SB.panelTitleRow}>
            <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={SB.panelAvatar}>
              <Ionicons name="leaf" size={14} color="#FFF" />
            </LinearGradient>
            <Text style={SB.panelTitle}>FarmMind AI</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={SB.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={MUTED} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={SB.newChatBtn} onPress={() => { onNewChat(); onClose(); }} activeOpacity={0.8}>
          <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={SB.newChatGrad}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={SB.newChatText}>New Chat</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={SB.sectionLabel}>Recent History</Text>
        {historyLoading ? (
          <View style={SB.loaderRow}>
            <ActivityIndicator color={PRIMARY} size="small" />
            <Text style={SB.loaderText}>Loading…</Text>
          </View>
        ) : sessions.length === 0 ? (
          <Text style={SB.emptyText}>No conversations yet</Text>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={s => s.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => {
              const isScan  = item.isScanSession;
              const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              return (
                <TouchableOpacity style={SB.sessionRow} onPress={() => { onSessionPress(item); onClose(); }} activeOpacity={0.75}>
                  <View style={[SB.sessionIcon, { backgroundColor: isScan ? 'rgba(22,163,74,0.10)' : 'rgba(13,148,136,0.10)' }]}>
                    <Ionicons name={isScan ? 'scan-outline' : 'chatbubble-ellipses-outline'} size={16} color={isScan ? PRIMARY : ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={SB.sessionTitle} numberOfLines={1}>{item.title || 'AI Chat'}</Text>
                    <Text style={SB.sessionMeta}>{dateStr} · {item._count?.messages || item.messages?.length || 0} msgs</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AIChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const farmCtx      = useFarm();
  const getAIContext = farmCtx?.getAIContext || (() => ({}));

  const initialMsg             = route?.params?.initialMessage;
  const existingConversationId = route?.params?.conversationId;

  // ── State ───────────────────────────────────────────────────────────────────
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [voiceVisible, setVoiceVisible] = useState(route?.params?.voiceMode || false);

  const [messages, setMessages]     = useState([{ id: '0', role: 'ai', text: 'Hello! I am FarmMind AI. Ask me anything about your crops, diseases, mandi prices, or farming schemes.' }]);
  const [input,    setInput]        = useState('');
  const [typing,   setTyping]       = useState(false);
  const [conversationId, setConvId] = useState(existingConversationId || null);
  const flatRef    = useRef(null);
  const lastSentAt = useRef(0);

  const [isRecording,  setIsRecording]  = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordDuration, setRecDur]     = useState(0);
  const [audioLevel,   setAudioLevel]   = useState(0);
  const [voiceResult,  setVoiceResult]  = useState(null);
  const recordRef   = useRef(null);
  const recTimerRef = useRef(null);

  const [sessions,       setSessions]  = useState([]);
  const [historyLoading, setHLoading]  = useState(false);
  const [historyLoaded,  setHLoaded]   = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id: String(Date.now() + Math.random()), ...msg }]);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || typing) return;
    const now = Date.now();
    if (now - lastSentAt.current < 6000) {
      addMessage({ role: 'ai', text: `Please wait ${Math.ceil((6000 - (now - lastSentAt.current)) / 1000)}s before sending another message.` });
      return;
    }
    lastSentAt.current = now;
    setInput('');
    addMessage({ role: 'user', text: msg });
    setTyping(true);
    try {
      const result = await sendChatMessage(msg, conversationId, getAIContext());
      if (result.conversationId && !conversationId) setConvId(result.conversationId);
      const aiMsg = { role: 'ai', text: result.reply };
      if (result.type === 'diagnosis' && result.card) aiMsg.diagnosisData = result.card;
      if (result.type === 'market'    && result.card) aiMsg.marketData    = result.card;
      addMessage(aiMsg);
    } catch (err) {
      addMessage({ role: 'ai', text: `⚠ ${err.response?.status === 429 ? 'Too many requests — wait 30s.' : 'Could not reach FarmMind AI. Check your connection.'}` });
    } finally { setTyping(false); }
  }, [input, typing, conversationId, addMessage, getAIContext]);

  const startRecording = useCallback(async () => {
    if (isProcessing) return;
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Microphone Permission', 'Please allow microphone access in settings.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({ ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true });
      let lastUpdate = 0;
      recording.setOnRecordingStatusUpdate((s) => {
        const now = Date.now();
        if (s.isRecording && s.metering !== undefined && now - lastUpdate > 90) {
          lastUpdate = now;
          setAudioLevel(Math.max(0, Math.min(1, (s.metering + 60) / 48)));
        }
      });
      recordRef.current = recording;
      setIsRecording(true); setVoiceResult(null); setRecDur(0); setAudioLevel(0);
      recTimerRef.current = setInterval(() => setRecDur(d => d + 1), 1000);
    } catch { Alert.alert('Error', 'Could not start recording. Please try again.'); }
  }, [isProcessing]);

  const stopAndSend = useCallback(async () => {
    if (!recordRef.current) return;
    clearInterval(recTimerRef.current);
    setIsRecording(false); setIsProcessing(true); setAudioLevel(0);
    try {
      await recordRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordRef.current.getURI();
      recordRef.current = null;
      if (!uri) { setIsProcessing(false); return; }
      const result = await sendVoiceMessage(uri, conversationId, getAIContext());
      if (result.conversationId && !conversationId) setConvId(result.conversationId);
      setVoiceResult(result);
      addMessage({ role: 'user', text: result.transcription || '(voice)', isVoice: true });
      const aiMsg = { role: 'ai', text: result.reply };
      if (result.type === 'diagnosis' && result.card) aiMsg.diagnosisData = result.card;
      if (result.type === 'market'    && result.card) aiMsg.marketData    = result.card;
      addMessage(aiMsg);
    } catch (err) {
      recordRef.current = null;
      setVoiceResult({ error: err.response?.status === 429 ? 'Rate limit — wait 30s.' : 'Processing failed. Try again.' });
    } finally { setIsProcessing(false); setRecDur(0); }
  }, [conversationId, addMessage, getAIContext]);

  const cancelRecording = useCallback(async () => {
    clearInterval(recTimerRef.current);
    if (recordRef.current) {
      try { await recordRef.current.stopAndUnloadAsync(); await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); } catch { }
      recordRef.current = null;
    }
    setIsRecording(false); setIsProcessing(false); setRecDur(0); setAudioLevel(0);
  }, []);

  const loadHistory = useCallback(async () => {
    if (historyLoading) return;
    setHLoading(true);
    try {
      const [convos, scans] = await Promise.allSettled([getConversations(), getScanSessions()]);
      const convoList = convos.status === 'fulfilled' ? (convos.value || []).map(c => ({ ...c, isScanSession: false })) : [];
      const scanList  = scans.status  === 'fulfilled' ? (scans.value  || []).map(s => ({ ...s, isScanSession: true  })) : [];
      setSessions([...convoList, ...scanList].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
      setHLoaded(true);
    } finally { setHLoading(false); }
  }, [historyLoading]);

  useEffect(() => { if (sidebarOpen && !historyLoaded) loadHistory(); }, [sidebarOpen]);

  useEffect(() => {
    if (existingConversationId) {
      getConversationMessages(existingConversationId)
        .then(convo => {
          if (convo?.messages?.length) {
            setMessages(convo.messages.map(m => ({
              id: m.id, role: m.role === 'assistant' ? 'ai' : 'user', text: m.content,
              diagnosisData: m.messageType === 'diagnosis' ? m.structuredData : null,
              marketData:    m.messageType === 'market'    ? m.structuredData : null,
            })));
          }
        }).catch(() => {});
    }
  }, []);

  useEffect(() => { if (initialMsg) setTimeout(() => sendMessage(initialMsg), 600); }, []);
  useEffect(() => { setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80); }, [messages, typing]);

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[S.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => setSidebarOpen(true)} style={S.headerBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <View style={S.headerCenter}>
          <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.headerAvatar}>
            <Ionicons name="leaf" size={14} color="#FFF" />
          </LinearGradient>
          <View>
            <Text style={S.headerTitle}>FarmMind AI</Text>
            <View style={S.onlineRow}><View style={S.onlineDot} /><Text style={S.onlineText}>Online</Text></View>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.headerBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={TEXT2} />
        </TouchableOpacity>
      </View>

      {/* ── Chat ── */}
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: CHAT_BG }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={S.msgList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MessageBubble msg={item} onBuyMedicine={() => navigation.navigate('AgriStore')} />
          )}
          ListFooterComponent={typing ? (
            <View style={S.aiBubbleWrap}>
              <View style={S.aiAvatar}><Ionicons name="leaf" size={13} color={PRIMARY} /></View>
              <View style={S.aiBubble}><TypingDots /></View>
            </View>
          ) : null}
        />

        {/* Compact suggestion chips */}
        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chipsList}>
            {['Brown spots on tomato', 'Fertilizer for wheat', 'PM-KISAN details', 'Mandi price today', 'Pest scouting'].map((s, i) => (
              <TouchableOpacity key={i} style={S.chip} onPress={() => sendMessage(s)} activeOpacity={0.7}>
                <Text style={S.chipText} numberOfLines={1}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar — mic inside left, send on right */}
        <View style={[S.inputBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View style={S.inputRow}>
            {/* Mic button — inside input row, left side */}
            <TouchableOpacity
              style={S.micInBtn}
              onPress={() => setVoiceVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="mic" size={20} color={PRIMARY} />
            </TouchableOpacity>

            <TextInput
              style={S.textInput}
              placeholder="Ask about crops, diseases, prices…"
              placeholderTextColor={MUTED}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={() => sendMessage()}
            />

            {/* Send button — right side */}
            <TouchableOpacity
              style={[S.sendBtn, (!input.trim() || typing) && S.sendBtnOff]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || typing}
              activeOpacity={0.8}
            >
              {typing ? (
                <ActivityIndicator size="small" color={MUTED} />
              ) : (
                <LinearGradient
                  colors={input.trim() ? [USER_A, USER_B] : [SURFACE, SURFACE]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={S.sendBtnGrad}
                >
                  <Ionicons name="arrow-up" size={17} color={input.trim() ? '#FFF' : MUTED} />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Voice modal (slides up, dark bg) ── */}
      <VoiceModal
        visible={voiceVisible}
        isRecording={isRecording}
        isProcessing={isProcessing}
        audioLevel={audioLevel}
        recordDuration={recordDuration}
        voiceResult={voiceResult}
        insets={insets}
        onStart={startRecording}
        onSend={stopAndSend}
        onCancel={cancelRecording}
        onClose={() => {
          if (isRecording) cancelRecording();
          setVoiceVisible(false);
        }}
      />

      {/* ── Sidebar ── */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        historyLoading={historyLoading}
        insets={insets}
        onNewChat={() => {
          setMessages([{ id: '0', role: 'ai', text: 'Hello! I am FarmMind AI. Ask me anything about your crops, diseases, mandi prices, or farming schemes.' }]);
          setConvId(null);
        }}
        onSessionPress={(item) => navigation.push('AIChat', { conversationId: item.id })}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Styles (light theme)
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 10,
    backgroundColor: BG,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerBtn:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  headerAvatar: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '800', color: TEXT },
  onlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  onlineText:   { fontSize: 10, color: PRIMARY, fontWeight: '600' },

  msgList: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, gap: 10 },

  aiBubbleWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 2 },
  aiAvatar:     { width: 28, height: 28, borderRadius: 8, marginTop: 2, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  aiBubble:     { backgroundColor: '#FFFFFF', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 11, maxWidth: W * 0.78, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  aiBubbleText: { fontSize: 14, color: TEXT, lineHeight: 21 },

  userBubbleWrap: { alignItems: 'flex-end', marginBottom: 2 },
  userBubble:     { borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 11, maxWidth: W * 0.78 },
  voiceTag:       { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  voiceTagText:   { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.5 },
  userBubbleText: { fontSize: 14, color: '#FFF', lineHeight: 20 },

  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 20 },
  dot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: PRIMARY },

  chipsList: { paddingHorizontal: 14, paddingVertical: 8, gap: 8, backgroundColor: CHAT_BG },
  chip:      { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  chipText:  { fontSize: 13, color: TEXT2, fontWeight: '500' },

  inputBar: { backgroundColor: BG, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    backgroundColor: SURFACE, borderRadius: 26,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  micInBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(22,163,74,0.08)' },
  textInput: { flex: 1, fontSize: 14, color: TEXT, maxHeight: 100, minHeight: 34, paddingVertical: 4 },
  sendBtn:    { width: 34, height: 34, borderRadius: 17, overflow: 'hidden' },
  sendBtnOff: { opacity: 0.45 },
  sendBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  diagCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: BORDER, maxWidth: W * 0.78, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  diagHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diagSevDot: { width: 8, height: 8, borderRadius: 4 },
  diagName: { fontSize: 15, fontWeight: '800', color: TEXT, flex: 1 },
  diagConf: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  diagConfText: { fontSize: 11, fontWeight: '700' },
  diagMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  diagMetaText: { fontSize: 11, color: MUTED },
  diagDivider: { height: 1, backgroundColor: BORDER },
  diagSectionLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  diagStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  diagStepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  diagStepNumText: { fontSize: 10, color: PRIMARY, fontWeight: '800' },
  diagStepText: { fontSize: 12, color: TEXT2, lineHeight: 18, flex: 1 },
  diagTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: SURFACE, borderRadius: 8, padding: 10 },
  diagTipText: { fontSize: 11, color: TEXT2, lineHeight: 16, flex: 1 },
  buyBtn: { borderRadius: 10, overflow: 'hidden', marginTop: 2 },
  buyBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  buyBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },

  mktCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: BORDER, maxWidth: W * 0.78 },
  mktCrop: { fontSize: 13, fontWeight: '800', color: '#D97706' },
  mktRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mktMandi: { fontSize: 12, color: MUTED, flex: 1 },
  mktPrice: { fontSize: 13, fontWeight: '700', color: TEXT },
  mktTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginTop: 2 },
  mktTipText: { fontSize: 11, color: TEXT2, lineHeight: 16, flex: 1 },
});

// ── Voice modal styles (dark) ──────────────────────────────────────────────
const VM = StyleSheet.create({
  root: { position: 'absolute', inset: 0, backgroundColor: V_BG, zIndex: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 4 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: V_GLASS },
  headerTitle: { fontSize: 15, fontWeight: '700', color: V_TEXT },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: V_GLASS, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: V_BORD },
  statusPillActive: { borderColor: P_LIGHT },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14, fontWeight: '700', color: V_TEXT },

  resultCard: { backgroundColor: V_GLASS, borderRadius: 20, padding: 16, gap: 4, borderWidth: 1, borderColor: V_BORD, maxWidth: W - 48, marginHorizontal: 24 },
  errorText: { fontSize: 13, color: DANGER, textAlign: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resultTrans: { fontSize: 13, color: V_MUTED, flex: 1, lineHeight: 18 },
  resultReply: { fontSize: 13, color: V_TEXT, flex: 1, lineHeight: 18 },
  viewChatBtn: { alignItems: 'flex-end', marginTop: 8 },
  viewChatText: { fontSize: 12, color: P_LIGHT, fontWeight: '700' },

  controls: { alignItems: 'center', gap: 12, width: '100%', paddingHorizontal: 32 },
  activeRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  micBtn: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', shadowColor: P_LIGHT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 10 },
  micGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1.5, borderColor: DANGER, justifyContent: 'center', alignItems: 'center' },
  sendRecBtn: { borderRadius: 28, overflow: 'hidden' },
  sendRecGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  sendRecText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  hint: { fontSize: 12, color: V_MUTED, textAlign: 'center', maxWidth: 260, lineHeight: 18 },
});

// ── Sidebar styles (light) ─────────────────────────────────────────────────
const SB = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: { position: 'absolute', left: 0, top: 0, bottom: 0, width: W * 0.82, backgroundColor: BG, borderRightWidth: 1, borderRightColor: BORDER, paddingHorizontal: 16 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelAvatar: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  panelTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },

  newChatBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  newChatGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 16 },
  newChatText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 },
  loaderText: { fontSize: 13, color: TEXT2 },
  emptyText: { fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 24 },

  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SURFACE },
  sessionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sessionTitle: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 2 },
  sessionMeta: { fontSize: 11, color: MUTED },
});
