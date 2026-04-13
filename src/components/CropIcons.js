/**
 * CropIcons.js — Beautiful SVG illustrations for all 66 Indian crops
 *
 * Every icon:
 *   • viewBox="0 0 200 200"
 *   • radialGradient + linearGradient for 3D shading
 *   • Drop-shadow filter
 *   • Soft ground shadow ellipse at cy≈178
 *   • Highlight/shine overlay (top-left)
 *   • Realistic crop-specific colour palette
 *
 * Usage:
 *   <CropIcon crop="Tomato" size={56} />
 */

import React from 'react';
import Svg, {
  Defs, RadialGradient, LinearGradient, Stop,
  Filter, FeDropShadow, FeComposite, FeGaussianBlur,
  Ellipse, Circle, Path, Rect, G, Line, Polygon,
} from 'react-native-svg';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Tiny shadow ellipse at bottom of every icon */
const Shadow = ({ cx = 100, rx = 44, ry = 8 }) => (
  <Ellipse cx={cx} cy={178} rx={rx} ry={ry} fill="rgba(0,0,0,0.13)" />
);

// ─────────────────────────────────────────────────────────────────────────────
// ── VEGETABLES ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function TomatoIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="tBg" cx="38%" cy="32%" r="60%">
          <Stop offset="0%"   stopColor="#FF7043" />
          <Stop offset="55%"  stopColor="#E53935" />
          <Stop offset="100%" stopColor="#B71C1C" />
        </RadialGradient>
        <RadialGradient id="tSh" cx="30%" cy="25%" r="38%">
          <Stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>
      <Shadow />
      <Circle cx="100" cy="107" r="66" fill="url(#tBg)" opacity="0.18" />
      <Circle cx="100" cy="105" r="64" fill="url(#tBg)" />
      <Circle cx="100" cy="105" r="64" fill="url(#tSh)" />
      {/* Calyx */}
      <Path d="M88 50 Q100 38 112 50 Q106 44 100 47 Q94 44 88 50Z" fill="#388E3C" />
      <Path d="M82 55 Q88 42 100 47 Q88 56 82 55Z" fill="#2E7D32" />
      <Path d="M118 55 Q112 42 100 47 Q112 56 118 55Z" fill="#2E7D32" />
      {/* Stem */}
      <Path d="M100 47 Q102 38 104 31" stroke="#33691E" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function OnionIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="oBg" cx="35%" cy="30%" r="60%">
          <Stop offset="0%"   stopColor="#CE93D8" />
          <Stop offset="50%"  stopColor="#9C27B0" />
          <Stop offset="100%" stopColor="#6A1B9A" />
        </RadialGradient>
        <RadialGradient id="oSh" cx="28%" cy="22%" r="36%">
          <Stop offset="0%"   stopColor="rgba(255,255,255,0.5)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>
      <Shadow rx={42} />
      {/* Bulb */}
      <Ellipse cx="100" cy="112" rx="62" ry="58" fill="url(#oBg)" />
      <Ellipse cx="100" cy="112" rx="62" ry="58" fill="url(#oSh)" />
      {/* Layers */}
      <Path d="M58 100 Q60 90 80 85" stroke="rgba(255,255,255,0.22)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M62 115 Q65 105 90 100" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Neck */}
      <Path d="M88 58 Q100 42 112 58" fill="#6A1B9A" />
      {/* Green shoots */}
      <Path d="M97 48 Q94 28 90 16" stroke="#66BB6A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <Path d="M103 46 Q107 28 112 18" stroke="#43A047" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function PotatoIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="poBg" cx="35%" cy="30%" r="62%">
          <Stop offset="0%"   stopColor="#D7CCC8" />
          <Stop offset="50%"  stopColor="#A1887F" />
          <Stop offset="100%" stopColor="#795548" />
        </RadialGradient>
        <RadialGradient id="poSh" cx="28%" cy="22%" r="35%">
          <Stop offset="0%"   stopColor="rgba(255,255,255,0.45)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>
      <Shadow rx={52} ry={9} />
      <Ellipse cx="100" cy="106" rx="70" ry="54" fill="url(#poBg)" />
      <Ellipse cx="100" cy="106" rx="70" ry="54" fill="url(#poSh)" />
      {/* Eyes */}
      <Circle cx="80"  cy="100" r="4" fill="#5D4037" />
      <Circle cx="115" cy="108" r="3.5" fill="#5D4037" />
      <Circle cx="95"  cy="120" r="3"   fill="#5D4037" />
    </Svg>
  );
}

function BrinjalIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="brBg" x1="20%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0%"   stopColor="#CE93D8" />
          <Stop offset="40%"  stopColor="#7B1FA2" />
          <Stop offset="100%" stopColor="#4A148C" />
        </LinearGradient>
        <RadialGradient id="brSh" cx="28%" cy="20%" r="32%">
          <Stop offset="0%"   stopColor="rgba(255,255,255,0.5)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>
      <Shadow rx={34} ry={7} />
      <Ellipse cx="100" cy="118" rx="44" ry="66" fill="url(#brBg)" />
      <Ellipse cx="100" cy="118" rx="44" ry="66" fill="url(#brSh)" />
      {/* Calyx */}
      <Path d="M84 60 Q100 46 116 60 Q108 52 100 55 Q92 52 84 60Z" fill="#2E7D32" />
      <Path d="M100 55 Q98 44 96 35" stroke="#33691E" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function CauliflowerIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="cfBg" cx="40%" cy="35%" r="55%">
          <Stop offset="0%"   stopColor="#FFFDE7" />
          <Stop offset="60%"  stopColor="#F5F5F5" />
          <Stop offset="100%" stopColor="#CFD8DC" />
        </RadialGradient>
      </Defs>
      <Shadow rx={56} ry={9} />
      {/* Leaves */}
      <Path d="M30 130 Q20 100 50 85 Q60 115 70 125Z" fill="#2E7D32" />
      <Path d="M170 130 Q180 100 150 85 Q140 115 130 125Z" fill="#388E3C" />
      <Path d="M55 145 Q40 130 55 110 Q70 130 75 145Z" fill="#43A047" />
      <Path d="M145 145 Q160 130 145 110 Q130 130 125 145Z" fill="#2E7D32" />
      {/* Curd dome */}
      <Ellipse cx="100" cy="110" rx="68" ry="52" fill="url(#cfBg)" />
      {/* Bumpy texture */}
      {[
        [78,88],[100,80],[122,88],[68,105],[90,98],[112,98],[132,106],
        [80,118],[100,112],[120,118],[75,130],[100,126],[125,130],
      ].map(([cx,cy],i) => (
        <Circle key={i} cx={cx} cy={cy} r="10" fill="rgba(220,220,220,0.4)" />
      ))}
      <Ellipse cx="100" cy="110" rx="68" ry="52" fill="rgba(255,255,255,0.2)" />
    </Svg>
  );
}

function CabbageIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="caBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#C8E6C9" />
          <Stop offset="55%"  stopColor="#66BB6A" />
          <Stop offset="100%" stopColor="#2E7D32" />
        </RadialGradient>
        <RadialGradient id="caSh" cx="30%" cy="24%" r="36%">
          <Stop offset="0%"   stopColor="rgba(255,255,255,0.5)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>
      <Shadow rx={56} />
      {/* Outer leaves */}
      <Ellipse cx="100" cy="108" rx="70" ry="62" fill="#4CAF50" />
      {/* Leaf veins */}
      <Path d="M40 100 Q70 115 100 108" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" />
      <Path d="M160 100 Q130 115 100 108" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" />
      {/* Inner head */}
      <Ellipse cx="100" cy="108" rx="56" ry="50" fill="url(#caBg)" />
      <Ellipse cx="100" cy="108" rx="56" ry="50" fill="url(#caSh)" />
    </Svg>
  );
}

function OkraIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="okBg" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor="#A5D6A7" />
          <Stop offset="50%"  stopColor="#4CAF50" />
          <Stop offset="100%" stopColor="#2E7D32" />
        </LinearGradient>
      </Defs>
      <Shadow rx={28} ry={7} />
      {/* Pod */}
      <Path d="M100 32 Q118 45 118 108 Q108 162 100 172 Q92 162 82 108 Q82 45 100 32Z" fill="url(#okBg)" />
      {/* Ridge lines */}
      <Path d="M100 36 Q108 80 108 150" stroke="rgba(0,80,0,0.3)" strokeWidth="1.5" fill="none" />
      <Path d="M100 36 Q92 80 92 150" stroke="rgba(0,80,0,0.3)" strokeWidth="1.5" fill="none" />
      {/* Calyx */}
      <Path d="M90 38 Q100 28 110 38 Q105 32 100 34 Q95 32 90 38Z" fill="#1B5E20" />
      <Path d="M100 34 Q99 26 98 20" stroke="#2E7D32" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Shine */}
      <Path d="M96 45 Q92 75 93 120" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function CapsicumIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="capBg" cx="35%" cy="30%" r="60%">
          <Stop offset="0%"   stopColor="#FFCC80" />
          <Stop offset="50%"  stopColor="#FF9800" />
          <Stop offset="100%" stopColor="#E65100" />
        </RadialGradient>
        <RadialGradient id="capSh" cx="28%" cy="22%" r="34%">
          <Stop offset="0%"   stopColor="rgba(255,255,255,0.5)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>
      <Shadow rx={52} ry={8} />
      {/* Bell shape — 3 lobes */}
      <Path d="M60 80 Q55 60 70 50 Q90 44 100 48 Q110 44 130 50 Q145 60 140 80 Q148 100 140 130 Q128 162 100 168 Q72 162 60 130 Q52 100 60 80Z" fill="url(#capBg)" />
      <Path d="M60 80 Q55 60 70 50 Q90 44 100 48 Q110 44 130 50 Q145 60 140 80 Q148 100 140 130 Q128 162 100 168 Q72 162 60 130 Q52 100 60 80Z" fill="url(#capSh)" />
      {/* Lobe dividers */}
      <Path d="M100 68 Q100 110 100 165" stroke="rgba(0,0,0,0.15)" strokeWidth="2" fill="none" />
      <Path d="M80 65 Q75 100 78 155" stroke="rgba(0,0,0,0.1)" strokeWidth="1.5" fill="none" />
      <Path d="M120 65 Q125 100 122 155" stroke="rgba(0,0,0,0.1)" strokeWidth="1.5" fill="none" />
      {/* Stem */}
      <Path d="M100 48 Q101 36 102 28" stroke="#2E7D32" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M88 50 Q84 42 100 48 Q86 52 88 50Z" fill="#388E3C" />
    </Svg>
  );
}

function CucumberIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="cuBg" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor="#A5D6A7" />
          <Stop offset="40%"  stopColor="#388E3C" />
          <Stop offset="100%" stopColor="#1B5E20" />
        </LinearGradient>
      </Defs>
      <Shadow rx={34} ry={7} />
      <Ellipse cx="100" cy="105" rx="36" ry="72" fill="url(#cuBg)" />
      {/* Stripes */}
      {[0,1,2,3,4].map(i => (
        <Path key={i} d={`M${84+i*8} 38 Q${84+i*8} 105 ${84+i*8} 172`}
          stroke="rgba(0,100,0,0.2)" strokeWidth="2" fill="none" />
      ))}
      {/* Shine */}
      <Ellipse cx="88" cy="80" rx="10" ry="28" fill="rgba(255,255,255,0.25)" />
      {/* Blossom end */}
      <Path d="M100 173 Q108 168 100 163 Q92 168 100 173Z" fill="#FDD835" />
      {/* Stem */}
      <Path d="M100 34 Q99 26 99 20" stroke="#2E7D32" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function PumpkinIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="pumBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#FFCC80" />
          <Stop offset="55%"  stopColor="#FF6F00" />
          <Stop offset="100%" stopColor="#E65100" />
        </RadialGradient>
      </Defs>
      <Shadow rx={64} ry={9} />
      {/* Ribs */}
      {[-40,-20,0,20,40].map((dx, i) => (
        <Ellipse key={i} cx={100+dx} cy="112" rx="26" ry="56" fill="url(#pumBg)" opacity={i===2?1:0.85} />
      ))}
      {/* Highlight */}
      <Ellipse cx="86" cy="86" rx="16" ry="24" fill="rgba(255,255,255,0.28)" />
      {/* Stem */}
      <Path d="M100 56 Q98 44 96 34" stroke="#5D4037" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Path d="M96 44 Q88 36 84 28" stroke="#388E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function CarrotIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="carBg" x1="20%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0%"   stopColor="#FFCC80" />
          <Stop offset="50%"  stopColor="#FF7043" />
          <Stop offset="100%" stopColor="#E64A19" />
        </LinearGradient>
      </Defs>
      <Shadow rx={24} ry={6} />
      {/* Body */}
      <Path d="M80 44 Q116 44 114 100 Q110 148 100 172 Q90 148 86 100 Q84 44 80 44Z" fill="url(#carBg)" />
      {/* Rings */}
      {[70,90,110,135].map((y, i) => (
        <Path key={i} d={`M${86+i} ${y} Q100 ${y-3} ${114-i} ${y}`}
          stroke="rgba(180,60,0,0.22)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ))}
      {/* Shine */}
      <Path d="M90 50 Q88 90 89 140" stroke="rgba(255,255,255,0.38)" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Green top */}
      <Path d="M100 42 Q95 28 88 18" stroke="#388E3C" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M100 42 Q100 24 100 14" stroke="#43A047" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M100 42 Q105 28 112 18" stroke="#2E7D32" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function GreenChilliIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="gcBg" x1="15%" y1="0%" x2="85%" y2="100%">
          <Stop offset="0%"   stopColor="#AED581" />
          <Stop offset="50%"  stopColor="#7CB342" />
          <Stop offset="100%" stopColor="#33691E" />
        </LinearGradient>
      </Defs>
      <Shadow rx={22} ry={6} />
      <Path d="M100 42 Q130 55 138 100 Q140 148 120 172 Q108 162 100 172 Q92 162 80 172 Q60 148 62 100 Q70 55 100 42Z" fill="url(#gcBg)" />
      <Path d="M100 46 Q108 80 110 140" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Path d="M90 46 Q82 50 100 42 Q88 48 90 46Z" fill="#2E7D32" />
      <Path d="M100 42 Q99 32 98 24" stroke="#388E3C" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function GarlicIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="garBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#FAFAFA" />
          <Stop offset="60%"  stopColor="#F5F5F5" />
          <Stop offset="100%" stopColor="#CFD8DC" />
        </RadialGradient>
      </Defs>
      <Shadow rx={46} ry={8} />
      {/* Outer skin */}
      <Ellipse cx="100" cy="112" rx="58" ry="56" fill="#F5F5F5" />
      {/* Clove bumps */}
      {[[-22,0],[0,-18],[22,0],[0,18],[-14,-12],[14,-12],[-14,12],[14,12]].map(([dx,dy],i) => (
        <Ellipse key={i} cx={100+dx} cy={112+dy} rx="16" ry="14"
          fill="rgba(200,200,210,0.45)" />
      ))}
      {/* Highlights */}
      <Ellipse cx="100" cy="112" rx="58" ry="56" fill="url(#garBg)" opacity="0.6" />
      <Ellipse cx="82" cy="92" rx="16" ry="10" fill="rgba(255,255,255,0.4)" />
      {/* Stem */}
      <Path d="M100 56 Q99 42 98 30" stroke="#8D6E63" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M96 40 Q92 32 90 24" stroke="#A5D6A7" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function GingerIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="giBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#D7CCC8" />
          <Stop offset="50%"  stopColor="#A1887F" />
          <Stop offset="100%" stopColor="#6D4C41" />
        </LinearGradient>
      </Defs>
      <Shadow rx={60} ry={8} />
      {/* Main rhizome body */}
      <Ellipse cx="100" cy="115" rx="58" ry="36" fill="url(#giBg)" />
      {/* Knobs */}
      <Ellipse cx="58"  cy="105" rx="22" ry="18" fill="#8D6E63" />
      <Ellipse cx="142" cy="108" rx="20" ry="16" fill="#7D5548" />
      <Ellipse cx="80"  cy="136" rx="18" ry="14" fill="#8D6E63" />
      <Ellipse cx="125" cy="135" rx="16" ry="13" fill="#795548" />
      {/* Texture lines */}
      <Path d="M60 102 Q90 112 140 108" stroke="rgba(80,40,20,0.2)" strokeWidth="1.5" fill="none" />
      {/* Shine */}
      <Ellipse cx="84" cy="104" rx="18" ry="10" fill="rgba(255,255,255,0.22)" />
      {/* Small bud */}
      <Path d="M58 88 Q56 80 58 74" stroke="#A5D6A7" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function SpinachIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="spBg" cx="35%" cy="35%" r="60%">
          <Stop offset="0%"   stopColor="#C8E6C9" />
          <Stop offset="50%"  stopColor="#388E3C" />
          <Stop offset="100%" stopColor="#1B5E20" />
        </RadialGradient>
      </Defs>
      <Shadow rx={58} ry={8} />
      {/* Cluster of leaves */}
      <Path d="M100 150 Q70 130 50 90 Q60 60 90 55 Q100 52 110 55 Q130 52 145 75 Q155 100 140 125 Q125 148 100 150Z" fill="url(#spBg)" />
      <Path d="M100 150 Q80 140 72 110 Q80 80 100 75 Q120 80 128 110 Q120 140 100 150Z" fill="#43A047" opacity="0.6" />
      {/* Veins */}
      <Path d="M100 150 Q100 105 100 60" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none" />
      <Path d="M100 110 Q80 102 60 92" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
      <Path d="M100 110 Q120 102 140 92" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
      <Path d="M100 90 Q82 84 68 76" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none" />
      <Path d="M100 90 Q118 84 132 76" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none" />
    </Svg>
  );
}

function PeasIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="peBg" x1="10%" y1="0%" x2="90%" y2="100%">
          <Stop offset="0%"   stopColor="#C8E6C9" />
          <Stop offset="50%"  stopColor="#4CAF50" />
          <Stop offset="100%" stopColor="#1B5E20" />
        </LinearGradient>
      </Defs>
      <Shadow rx={60} ry={7} />
      {/* Pod */}
      <Path d="M38 100 Q40 60 100 50 Q160 60 162 100 Q160 140 100 150 Q40 140 38 100Z" fill="url(#peBg)" />
      {/* Pea bumps */}
      {[60,82,104,126,148].map((cx, i) => (
        <Circle key={i} cx={cx} cy="100" r="16" fill="rgba(76,175,80,0.5)" />
      ))}
      {/* Shine */}
      <Path d="M56 68 Q100 58 144 68" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Curl */}
      <Path d="M162 100 Q168 90 166 80" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── FRUITS ───────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function MangoIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="mgBg" cx="40%" cy="35%" r="58%">
          <Stop offset="0%"   stopColor="#FFF176" />
          <Stop offset="45%"  stopColor="#FFCA28" />
          <Stop offset="80%"  stopColor="#FF8F00" />
          <Stop offset="100%" stopColor="#E65100" />
        </RadialGradient>
        <RadialGradient id="mgSh" cx="30%" cy="25%" r="34%">
          <Stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>
      <Shadow rx={46} ry={8} />
      {/* Teardrop body */}
      <Path d="M100 40 Q148 60 148 120 Q148 168 100 172 Q52 168 52 120 Q52 60 100 40Z" fill="url(#mgBg)" />
      <Path d="M100 40 Q148 60 148 120 Q148 168 100 172 Q52 168 52 120 Q52 60 100 40Z" fill="url(#mgSh)" />
      {/* Stem */}
      <Path d="M100 40 Q100 28 100 20" stroke="#5D4037" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <Path d="M100 28 Q92 20 86 14" stroke="#388E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function BananaIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="bnBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFF9C4" />
          <Stop offset="50%"  stopColor="#FFEB3B" />
          <Stop offset="100%" stopColor="#F57F17" />
        </LinearGradient>
      </Defs>
      <Shadow rx={56} ry={7} />
      {/* Curved banana */}
      <Path d="M40 155 Q35 100 65 60 Q100 28 150 38 Q165 42 160 56 Q148 52 132 58 Q88 78 68 128 Q58 152 40 155Z" fill="url(#bnBg)" />
      {/* Ridge */}
      <Path d="M45 148 Q50 106 78 70 Q108 38 148 44" stroke="rgba(180,120,0,0.3)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Shine */}
      <Path d="M55 140 Q55 96 82 66 Q110 38 148 44" stroke="rgba(255,255,255,0.35)" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Tip */}
      <Path d="M40 155 Q34 160 30 165" stroke="#5D4037" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function GrapesIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="grBg" cx="35%" cy="30%" r="55%">
          <Stop offset="0%"   stopColor="#CE93D8" />
          <Stop offset="55%"  stopColor="#7B1FA2" />
          <Stop offset="100%" stopColor="#4A148C" />
        </RadialGradient>
      </Defs>
      <Shadow rx={50} ry={8} />
      {/* Bunch of grapes */}
      {[
        [70,74],[100,74],[130,74],
        [55,100],[85,100],[115,100],[145,100],
        [70,126],[100,126],[130,126],
        [85,152],[115,152],
        [100,175],
      ].map(([cx,cy],i) => (
        <G key={i}>
          <Circle cx={cx} cy={cy} r="22" fill="url(#grBg)" />
          <Ellipse cx={cx-6} cy={cy-6} rx="7" ry="5" fill="rgba(255,255,255,0.3)" />
        </G>
      ))}
      {/* Stem */}
      <Path d="M100 52 Q100 38 100 28" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M100 38 Q88 30 80 22" stroke="#388E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function OrangeIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="orBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#FFE082" />
          <Stop offset="50%"  stopColor="#FB8C00" />
          <Stop offset="100%" stopColor="#E65100" />
        </RadialGradient>
        <RadialGradient id="orSh" cx="28%" cy="22%" r="35%">
          <Stop offset="0%"   stopColor="rgba(255,255,255,0.5)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>
      <Shadow />
      <Circle cx="100" cy="106" r="66" fill="url(#orBg)" />
      <Circle cx="100" cy="106" r="66" fill="url(#orSh)" />
      {/* Dimple at top */}
      <Circle cx="100" cy="44" r="6" fill="rgba(200,80,0,0.3)" />
      {/* Texture bumps */}
      {[0,1,2,3,4,5].map(i => {
        const angle = (i / 6) * Math.PI * 2;
        return <Circle key={i} cx={100+38*Math.cos(angle)} cy={106+38*Math.sin(angle)} r="4" fill="rgba(200,80,0,0.12)" />;
      })}
      {/* Stem */}
      <Path d="M100 40 Q99 30 98 22" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M97 28 Q92 22 88 16" stroke="#388E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function AppleIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="apBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#EF9A9A" />
          <Stop offset="50%"  stopColor="#E53935" />
          <Stop offset="100%" stopColor="#B71C1C" />
        </RadialGradient>
        <RadialGradient id="apSh" cx="28%" cy="22%" r="35%">
          <Stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>
      <Shadow />
      {/* Apple shape — two lobes */}
      <Path d="M100 55 Q68 48 50 80 Q40 108 50 140 Q62 168 100 172 Q138 168 150 140 Q160 108 150 80 Q132 48 100 55Z" fill="url(#apBg)" />
      {/* Top cleft */}
      <Path d="M88 58 Q100 52 112 58" stroke="rgba(150,0,0,0.3)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M100 55 Q100 50 100 55Z" fill="none" />
      <Path d="M100 172 Q100 175 100 178" stroke="rgba(150,0,0,0.2)" strokeWidth="3" fill="none" />
      <Path d="M100 55 Q148 60 150 80 Q148 48 100 55Z" fill="url(#apSh)" />
      {/* Stem */}
      <Path d="M100 52 Q100 40 100 32" stroke="#5D4037" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <Path d="M100 44 Q92 36 86 28" stroke="#388E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function WatermelonIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="wmBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#A5D6A7" />
          <Stop offset="45%"  stopColor="#388E3C" />
          <Stop offset="100%" stopColor="#1B5E20" />
        </RadialGradient>
        <RadialGradient id="wmIn" cx="42%" cy="36%" r="56%">
          <Stop offset="0%"   stopColor="#FF8A80" />
          <Stop offset="55%"  stopColor="#F44336" />
          <Stop offset="100%" stopColor="#B71C1C" />
        </RadialGradient>
      </Defs>
      <Shadow rx={66} ry={9} />
      {/* Rind */}
      <Circle cx="100" cy="106" r="68" fill="url(#wmBg)" />
      {/* Stripes */}
      {[-30,-10,10,30].map((dy,i) => (
        <Path key={i} d={`M${32+i*4} ${106+dy} Q100 ${100+dy} ${168-i*4} ${106+dy}`}
          stroke="rgba(255,255,255,0.18)" strokeWidth="5" fill="none" />
      ))}
      {/* Flesh (cut face) — show a slice feel */}
      <Circle cx="100" cy="106" r="56" fill="url(#wmIn)" opacity="0.0" />
      {/* Shine */}
      <Ellipse cx="80" cy="82" rx="20" ry="12" fill="rgba(255,255,255,0.25)" />
    </Svg>
  );
}

function PineappleIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="pnBg" x1="20%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0%"   stopColor="#FFF176" />
          <Stop offset="50%"  stopColor="#FFCA28" />
          <Stop offset="100%" stopColor="#FF6F00" />
        </LinearGradient>
      </Defs>
      <Shadow rx={36} ry={7} />
      {/* Body */}
      <Ellipse cx="100" cy="130" rx="46" ry="60" fill="url(#pnBg)" />
      {/* Diamond texture */}
      {[0,1,2,3,4].map(row =>
        [0,1,2,3].map(col => (
          <Path key={`${row}-${col}`}
            d={`M${66+col*18} ${82+row*16} L${75+col*18} ${74+row*16} L${84+col*18} ${82+row*16} L${75+col*18} ${90+row*16} Z`}
            fill="rgba(180,100,0,0.2)" stroke="rgba(180,100,0,0.15)" strokeWidth="0.5" />
        ))
      )}
      {/* Crown leaves */}
      {[[-16,-10],[-8,-20],[0,-24],[8,-20],[16,-10]].map(([dx,dy],i) => (
        <Path key={i} d={`M${100+dx} 72 Q${100+dx+dy/3} 56 ${100+dx+dy/2} 46`}
          stroke="#2E7D32" strokeWidth={5-Math.abs(i-2)} strokeLinecap="round" fill="none" />
      ))}
    </Svg>
  );
}

function CoconutIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="coBg" cx="35%" cy="30%" r="60%">
          <Stop offset="0%"   stopColor="#D7CCC8" />
          <Stop offset="55%"  stopColor="#8D6E63" />
          <Stop offset="100%" stopColor="#4E342E" />
        </RadialGradient>
      </Defs>
      <Shadow rx={58} ry={9} />
      <Ellipse cx="100" cy="108" rx="70" ry="62" fill="url(#coBg)" />
      {/* Fiber texture */}
      {[-30,-15,0,15,30].map((dx,i) => (
        <Path key={i} d={`M${100+dx} 46 Q${100+dx+6} 108 ${100+dx} 168`}
          stroke="rgba(60,30,10,0.2)" strokeWidth="1.5" fill="none" />
      ))}
      {/* 3 eyes */}
      <Circle cx="88" cy="80" r="5" fill="#3E2723" />
      <Circle cx="104" cy="76" r="5" fill="#3E2723" />
      <Circle cx="112" cy="88" r="4" fill="#3E2723" />
      {/* Shine */}
      <Ellipse cx="78" cy="82" rx="20" ry="14" fill="rgba(255,255,255,0.18)" />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── CEREALS ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function WheatIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="whBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFF9C4" />
          <Stop offset="50%"  stopColor="#F9A825" />
          <Stop offset="100%" stopColor="#E65100" />
        </LinearGradient>
      </Defs>
      <Shadow rx={30} ry={6} />
      {/* Stalk */}
      <Path d="M100 175 Q100 100 100 50" stroke="#8BC34A" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* Grain spikelets — left and right alternating */}
      {[0,1,2,3,4,5,6].map(i => {
        const y = 50 + i * 18;
        const side = i % 2 === 0 ? -1 : 1;
        return (
          <G key={i}>
            <Ellipse cx={100 + side * 22} cy={y+5} rx="16" ry="9" fill="url(#whBg)" transform={`rotate(${side * -30}, ${100 + side * 22}, ${y+5})`} />
            <Path d={`M100 ${y} L${100 + side * 22} ${y+5}`} stroke="#8BC34A" strokeWidth="2" />
            {/* Awn */}
            <Path d={`M${100 + side * 36} ${y-2} L${100 + side * 44} ${y-14}`} stroke="#F9A825" strokeWidth="1.5" strokeLinecap="round" />
          </G>
        );
      })}
      {/* Top awn */}
      <Path d="M100 50 Q100 38 100 28" stroke="#F9A825" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function RiceIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="rcBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFFDE7" />
          <Stop offset="50%"  stopColor="#FDD835" />
          <Stop offset="100%" stopColor="#F57F17" />
        </LinearGradient>
      </Defs>
      <Shadow rx={28} ry={6} />
      {/* Stalk */}
      <Path d="M100 175 Q102 130 106 80 Q104 55 100 40" stroke="#8BC34A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {/* Drooping panicle with grains */}
      {[-3,-2,-1,0,1,2,3].map(col =>
        [0,1,2,3].map(row => {
          const cx = 100 + col * 10 + row * 3;
          const cy = 50 + row * 20 + Math.abs(col) * 5;
          return (
            <Ellipse key={`${col}-${row}`} cx={cx} cy={cy} rx="6" ry="9"
              fill="url(#rcBg)" transform={`rotate(15,${cx},${cy})`} />
          );
        })
      )}
    </Svg>
  );
}

function MaizeIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="mzBg" x1="15%" y1="0%" x2="85%" y2="100%">
          <Stop offset="0%"   stopColor="#FFF9C4" />
          <Stop offset="50%"  stopColor="#FFCA28" />
          <Stop offset="100%" stopColor="#FF8F00" />
        </LinearGradient>
      </Defs>
      <Shadow rx={30} ry={7} />
      {/* Husk leaves */}
      <Path d="M72 170 Q60 130 68 80 Q78 60 88 60 Q88 120 78 170Z" fill="#66BB6A" />
      <Path d="M128 170 Q140 130 132 80 Q122 60 112 60 Q112 120 122 170Z" fill="#4CAF50" />
      {/* Cob */}
      <Rect x="82" y="56" width="36" height="120" rx="18" fill="url(#mzBg)" />
      {/* Kernel grid */}
      {[0,1,2,3,4,5].map(col =>
        [0,1,2,3,4,5,6,7,8].map(row => (
          <Ellipse key={`${col}-${row}`}
            cx={88+col*6} cy={70+row*12}
            rx="2.5" ry="3"
            fill="rgba(200,120,0,0.3)" />
        ))
      )}
      {/* Silk */}
      <Path d="M100 56 Q96 44 94 34" stroke="#FFCC80" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path d="M100 56 Q102 42 104 32" stroke="#FFB74D" strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function BajraIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="bjBg" cx="40%" cy="35%" r="55%">
          <Stop offset="0%"   stopColor="#BCAAA4" />
          <Stop offset="55%"  stopColor="#795548" />
          <Stop offset="100%" stopColor="#4E342E" />
        </RadialGradient>
      </Defs>
      <Shadow rx={24} ry={6} />
      {/* Stalk */}
      <Path d="M100 175 Q100 120 100 80" stroke="#8BC34A" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* Head — cylindrical seed cluster */}
      <Ellipse cx="100" cy="80" rx="20" ry="52" fill="url(#bjBg)" />
      {/* Seed bumps */}
      {[0,1,2,3,4,5,6,7,8].map(row =>
        [-2,-1,0,1,2].map(col => (
          <Circle key={`${row}-${col}`}
            cx={100+col*7} cy={38+row*10}
            r="4" fill="rgba(60,30,10,0.25)" />
        ))
      )}
      {/* Shine */}
      <Ellipse cx="88" cy="54" rx="8" ry="24" fill="rgba(255,255,255,0.2)" />
    </Svg>
  );
}

// Generic stalk+round-head for Jowar/Barley/Ragi
function GrainHeadIcon({ size, bgFrom, bgTo, headRx = 22, headRy = 48 }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="ghBg" x1="20%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0%"   stopColor={bgFrom} />
          <Stop offset="100%" stopColor={bgTo} />
        </LinearGradient>
      </Defs>
      <Shadow rx={22} ry={6} />
      <Path d="M100 175 Q100 120 100 80" stroke="#8BC34A" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Ellipse cx="100" cy="78" rx={headRx} ry={headRy} fill="url(#ghBg)" />
      {[0,1,2,3,4,5].map(row =>
        [-1,0,1].map(col => (
          <Ellipse key={`${row}-${col}`}
            cx={100+col*10} cy={40+row*14}
            rx="5" ry="7" fill="rgba(0,0,0,0.12)" />
        ))
      )}
      <Ellipse cx="90" cy="52" rx="6" ry="20" fill="rgba(255,255,255,0.22)" />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── PULSES ───────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** Generic seeds scattered in a small pile */
function SeedPileIcon({ size, c1, c2, c3, seedRx = 14, seedRy = 11 }) {
  const seeds = [
    [72,120],[100,108],[128,120],[86,140],[114,140],[100,154],
    [60,138],[140,138],
  ];
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="sdBg" cx="35%" cy="30%" r="58%">
          <Stop offset="0%"   stopColor={c1} />
          <Stop offset="55%"  stopColor={c2} />
          <Stop offset="100%" stopColor={c3} />
        </RadialGradient>
      </Defs>
      <Shadow rx={56} ry={8} />
      {seeds.map(([cx,cy],i) => (
        <G key={i}>
          <Ellipse cx={cx} cy={cy} rx={seedRx} ry={seedRy} fill="url(#sdBg)" transform={`rotate(${i*22},${cx},${cy})`} />
          <Ellipse cx={cx-4} cy={cy-3} rx={4} ry={3} fill="rgba(255,255,255,0.28)" transform={`rotate(${i*22},${cx},${cy})`} />
        </G>
      ))}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── OILSEEDS ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function SunflowerIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="sfCtr" cx="50%" cy="50%" r="50%">
          <Stop offset="0%"   stopColor="#6D4C41" />
          <Stop offset="100%" stopColor="#3E2723" />
        </RadialGradient>
      </Defs>
      <Shadow rx={60} ry={8} />
      {/* Petals */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const angle = (i / 12) * Math.PI * 2;
        const cx = 100 + 52 * Math.cos(angle);
        const cy = 100 + 52 * Math.sin(angle);
        return (
          <Ellipse key={i} cx={cx} cy={cy} rx="16" ry="9"
            fill="#FDD835"
            transform={`rotate(${i * 30}, ${cx}, ${cy})`} />
        );
      })}
      {/* Disc */}
      <Circle cx="100" cy="100" r="40" fill="url(#sfCtr)" />
      {/* Seed pattern */}
      {[0,1,2,3,4,5,6,7].map(ring =>
        [0,1,2,3,4,5,6,7].map(pos => {
          const a = (pos / 8 + ring * 0.125) * Math.PI * 2;
          const r = 8 + ring * 4;
          return <Circle key={`${ring}-${pos}`} cx={100+r*Math.cos(a)} cy={100+r*Math.sin(a)} r="2" fill="rgba(255,255,255,0.2)" />;
        })
      )}
      {/* Shine */}
      <Ellipse cx="84" cy="86" rx="12" ry="8" fill="rgba(255,255,255,0.22)" />
      {/* Stalk */}
      <Path d="M100 140 Q100 158 100 175" stroke="#558B2F" strokeWidth="5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function GroundnutIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="gnBg" x1="15%" y1="0%" x2="85%" y2="100%">
          <Stop offset="0%"   stopColor="#FFCCBC" />
          <Stop offset="50%"  stopColor="#D7A86E" />
          <Stop offset="100%" stopColor="#A1662F" />
        </LinearGradient>
      </Defs>
      <Shadow rx={60} ry={8} />
      {/* Peanut shell — two lobes */}
      <Path d="M52 100 Q50 68 74 58 Q88 54 100 56 Q112 54 126 58 Q150 68 148 100 Q148 132 126 142 Q112 146 100 144 Q88 146 74 142 Q50 132 52 100Z" fill="url(#gnBg)" />
      {/* Middle constriction */}
      <Path d="M56 100 Q78 92 100 100 Q122 108 144 100" stroke="rgba(120,70,20,0.35)" strokeWidth="4" fill="none" />
      {/* Ridge texture */}
      {[-3,-1,1,3].map(i => (
        <Path key={i} d={`M${52+i*6} ${100+i*8} Q100 ${96+i*8} ${148+i*6} ${100+i*8}`}
          stroke="rgba(120,70,20,0.15)" strokeWidth="1.5" fill="none" />
      ))}
      {/* Shine */}
      <Ellipse cx="78" cy="76" rx="20" ry="12" fill="rgba(255,255,255,0.25)" />
    </Svg>
  );
}

function CottonIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <RadialGradient id="ctBg" cx="38%" cy="32%" r="56%">
          <Stop offset="0%"   stopColor="#FFFFFF" />
          <Stop offset="60%"  stopColor="#F5F5F5" />
          <Stop offset="100%" stopColor="#CFD8DC" />
        </RadialGradient>
      </Defs>
      <Shadow rx={52} ry={8} />
      {/* Boll segments / fluffy cloud */}
      {[
        [100,80],[76,96],[124,96],[72,120],[100,114],[128,120],
        [82,142],[100,150],[118,142],
      ].map(([cx,cy],i) => (
        <Circle key={i} cx={cx} cy={cy} r={i < 3 ? 28 : i < 6 ? 26 : 22}
          fill="url(#ctBg)" />
      ))}
      {/* Bract leaves */}
      <Path d="M70 135 Q52 120 50 100 Q62 112 70 135Z" fill="#33691E" />
      <Path d="M130 135 Q148 120 150 100 Q138 112 130 135Z" fill="#2E7D32" />
      <Path d="M100 158 Q92 170 88 182 Q100 165 100 158Z" fill="#388E3C" />
      {/* Shine */}
      <Ellipse cx="86" cy="82" rx="14" ry="9" fill="rgba(255,255,255,0.55)" />
    </Svg>
  );
}

function SugarcaneIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="scBg" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor="#A5D6A7" />
          <Stop offset="50%"  stopColor="#4CAF50" />
          <Stop offset="100%" stopColor="#1B5E20" />
        </LinearGradient>
      </Defs>
      <Shadow rx={20} ry={6} />
      {/* 3 stalks */}
      {[-14,0,14].map((dx, i) => (
        <G key={i}>
          <Rect x={95+dx} y={30} width={10} height={152} rx={5} fill="url(#scBg)" />
          {/* Nodes */}
          {[70,100,130,158].map(y => (
            <Rect key={y} x={93+dx} y={y} width={14} height={6} rx={3} fill="rgba(0,80,0,0.3)" />
          ))}
          {/* Leaf */}
          <Path d={`M${100+dx} ${70+i*20} Q${130+dx+i*8} ${55+i*20} ${155+dx+i*10} ${45+i*20}`}
            stroke="#388E3C" strokeWidth={4-i} strokeLinecap="round" fill="none" />
        </G>
      ))}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SPICES ───────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function TurmericIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="tmBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFF176" />
          <Stop offset="50%"  stopColor="#FF8F00" />
          <Stop offset="100%" stopColor="#E65100" />
        </LinearGradient>
      </Defs>
      <Shadow rx={62} ry={8} />
      {/* Main rhizome */}
      <Ellipse cx="100" cy="112" rx="58" ry="32" fill="url(#tmBg)" />
      {/* Fingers */}
      <Ellipse cx="48"  cy="102" rx="24" ry="15" fill="#FF8F00" transform="rotate(-20,48,102)" />
      <Ellipse cx="152" cy="104" rx="22" ry="14" fill="#F57F17" transform="rotate(15,152,104)" />
      <Ellipse cx="68"  cy="136" rx="20" ry="13" fill="#FF8F00" transform="rotate(-10,68,136)" />
      <Ellipse cx="134" cy="134" rx="18" ry="12" fill="#E65100" transform="rotate(10,134,134)" />
      {/* Texture */}
      <Path d="M52 108 Q100 112 148 108" stroke="rgba(180,80,0,0.2)" strokeWidth="1.5" fill="none" />
      <Ellipse cx="82" cy="102" rx="18" ry="10" fill="rgba(255,255,255,0.22)" />
    </Svg>
  );
}

function RedChilliIcon({ size }) {
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="rcBg2" x1="15%" y1="0%" x2="85%" y2="100%">
          <Stop offset="0%"   stopColor="#EF9A9A" />
          <Stop offset="50%"  stopColor="#F44336" />
          <Stop offset="100%" stopColor="#B71C1C" />
        </LinearGradient>
      </Defs>
      <Shadow rx={22} ry={6} />
      {/* Body — curved chilli */}
      <Path d="M100 42 Q136 55 140 110 Q136 155 110 175 Q100 180 90 175 Q64 155 60 110 Q64 55 100 42Z" fill="url(#rcBg2)" />
      {/* Shine */}
      <Path d="M96 52 Q92 90 93 145" stroke="rgba(255,255,255,0.38)" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Calyx */}
      <Path d="M90 44 Q100 34 110 44 Q105 38 100 40 Q95 38 90 44Z" fill="#2E7D32" />
      <Path d="M100 40 Q99 30 98 22" stroke="#388E3C" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function CuminIcon({ size }) {
  // Cumin seeds — small elongated brown seeds
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Defs>
        <LinearGradient id="cmBg" x1="15%" y1="0%" x2="85%" y2="100%">
          <Stop offset="0%"   stopColor="#D7CCC8" />
          <Stop offset="50%"  stopColor="#795548" />
          <Stop offset="100%" stopColor="#4E342E" />
        </LinearGradient>
      </Defs>
      <Shadow rx={56} ry={8} />
      {[
        [72,100,25],[100,88,20],[128,100,22],[86,122,18],[114,118,20],
        [60,120,16],[140,116,17],[98,145,19],[76,140,16],[122,142,18],
      ].map(([cx,cy,rx],i) => (
        <G key={i}>
          <Ellipse cx={cx} cy={cy} rx={rx} ry={rx*0.38}
            fill="url(#cmBg)" transform={`rotate(${i*18},${cx},${cy})`} />
          <Ellipse cx={cx-rx*0.28} cy={cy-2} rx={rx*0.25} ry={rx*0.14}
            fill="rgba(255,255,255,0.28)" transform={`rotate(${i*18},${cx},${cy})`} />
        </G>
      ))}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── ICON MAP ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const ICONS = {
  // Vegetables
  Tomato:        TomatoIcon,
  Onion:         OnionIcon,
  Potato:        PotatoIcon,
  Brinjal:       BrinjalIcon,
  Cauliflower:   CauliflowerIcon,
  Cabbage:       CabbageIcon,
  Okra:          OkraIcon,
  'Bitter Gourd': (p) => <OkraIcon {...p} />,   // reuse silhouette with green
  Capsicum:      CapsicumIcon,
  Cucumber:      CucumberIcon,
  'Bottle Gourd': CucumberIcon,
  Pumpkin:       PumpkinIcon,
  Carrot:        CarrotIcon,
  Radish:        (p) => (                        // white/red radish
    <Svg viewBox="0 0 200 200" width={p.size} height={p.size}>
      <Defs>
        <LinearGradient id="rdBg" x1="20%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0%"   stopColor="#FFCDD2" />
          <Stop offset="40%"  stopColor="#EF5350" />
          <Stop offset="100%" stopColor="#F5F5F5" />
        </LinearGradient>
      </Defs>
      <Shadow rx={24} ry={6} />
      <Path d="M80 44 Q116 44 114 100 Q110 148 100 172 Q90 148 86 100 Q84 44 80 44Z" fill="url(#rdBg)" />
      <Path d="M100 42 Q99 26 98 14" stroke="#388E3C" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M88 40 Q83 32 100 42 Q86 44 88 40Z" fill="#2E7D32" />
    </Svg>
  ),
  Spinach:       SpinachIcon,
  'Green Chilli': GreenChilliIcon,
  Garlic:        GarlicIcon,
  Ginger:        GingerIcon,
  Coriander:     SpinachIcon,
  Fenugreek:     SpinachIcon,
  'Sweet Potato': (p) => (
    <Svg viewBox="0 0 200 200" width={p.size} height={p.size}>
      <Defs>
        <RadialGradient id="spBg2" cx="35%" cy="30%" r="60%">
          <Stop offset="0%"   stopColor="#FFCCBC" />
          <Stop offset="55%"  stopColor="#FF7043" />
          <Stop offset="100%" stopColor="#BF360C" />
        </RadialGradient>
      </Defs>
      <Shadow rx={58} ry={8} />
      <Ellipse cx="100" cy="108" rx="68" ry="48" fill="url(#spBg2)" />
      <Ellipse cx="76" cy="90" rx="18" ry="10" fill="rgba(255,255,255,0.22)" />
      <Path d="M100 60 Q99 48 98 38" stroke="#388E3C" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  ),
  Peas:          PeasIcon,

  // Fruits
  Mango:         MangoIcon,
  Banana:        BananaIcon,
  Grapes:        GrapesIcon,
  Pomegranate:   (p) => (
    <Svg viewBox="0 0 200 200" width={p.size} height={p.size}>
      <Defs>
        <RadialGradient id="pmBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#EF9A9A" />
          <Stop offset="55%"  stopColor="#C62828" />
          <Stop offset="100%" stopColor="#880E4F" />
        </RadialGradient>
      </Defs>
      <Shadow />
      <Circle cx="100" cy="108" r="64" fill="url(#pmBg)" />
      {/* Crown */}
      <Path d="M78 52 L82 38 L88 52 L94 36 L100 52 L106 36 L112 52 L118 38 L122 52 Q110 48 100 50 Q90 48 78 52Z" fill="#880E4F" />
      <Ellipse cx="82" cy="84" rx="16" ry="10" fill="rgba(255,255,255,0.28)" />
    </Svg>
  ),
  Guava:         (p) => (
    <Svg viewBox="0 0 200 200" width={p.size} height={p.size}>
      <Defs>
        <RadialGradient id="guBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#F0F4C3" />
          <Stop offset="55%"  stopColor="#8BC34A" />
          <Stop offset="100%" stopColor="#33691E" />
        </RadialGradient>
      </Defs>
      <Shadow />
      <Ellipse cx="100" cy="108" rx="64" ry="60" fill="url(#guBg)" />
      <Ellipse cx="82" cy="84" rx="16" ry="10" fill="rgba(255,255,255,0.28)" />
      <Path d="M100 48 Q100 36 100 28" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M100 38 Q92 30 86 22" stroke="#388E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  ),
  Papaya:        (p) => (
    <Svg viewBox="0 0 200 200" width={p.size} height={p.size}>
      <Defs>
        <LinearGradient id="ppBg" x1="20%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0%"   stopColor="#FFF59D" />
          <Stop offset="50%"  stopColor="#FFB300" />
          <Stop offset="100%" stopColor="#FF6F00" />
        </LinearGradient>
      </Defs>
      <Shadow rx={44} ry={8} />
      <Ellipse cx="100" cy="116" rx="50" ry="72" fill="url(#ppBg)" />
      <Ellipse cx="82" cy="90" rx="14" ry="22" fill="rgba(255,255,255,0.22)" />
      <Path d="M100 44 Q99 32 98 22" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  ),
  Watermelon:    WatermelonIcon,
  Muskmelon:     (p) => (
    <Svg viewBox="0 0 200 200" width={p.size} height={p.size}>
      <Defs>
        <RadialGradient id="mmBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#FFF9C4" />
          <Stop offset="55%"  stopColor="#FFCA28" />
          <Stop offset="100%" stopColor="#E65100" />
        </RadialGradient>
      </Defs>
      <Shadow rx={62} ry={9} />
      <Ellipse cx="100" cy="108" rx="64" ry="60" fill="url(#mmBg)" />
      {/* Net pattern */}
      {[-3,-1,1,3].map(i => (
        <Path key={i} d={`M${48+i*12} 60 Q100 ${60+i*6} ${152-i*12} 60`}
          stroke="rgba(150,80,0,0.2)" strokeWidth="1.5" fill="none" />
      ))}
      {[-3,-1,1,3].map(i => (
        <Path key={i} d={`M${48} ${80+i*12} Q100 ${80+i*12-6} ${152} ${80+i*12}`}
          stroke="rgba(150,80,0,0.18)" strokeWidth="1.5" fill="none" />
      ))}
      <Ellipse cx="80" cy="84" rx="16" ry="10" fill="rgba(255,255,255,0.25)" />
    </Svg>
  ),
  Orange:        OrangeIcon,
  Lemon:         (p) => (
    <Svg viewBox="0 0 200 200" width={p.size} height={p.size}>
      <Defs>
        <RadialGradient id="lmBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#FFF9C4" />
          <Stop offset="55%"  stopColor="#FFEE58" />
          <Stop offset="100%" stopColor="#F9A825" />
        </RadialGradient>
      </Defs>
      <Shadow rx={52} ry={8} />
      <Ellipse cx="100" cy="108" rx="62" ry="56" fill="url(#lmBg)" />
      <Ellipse cx="82" cy="84" rx="16" ry="10" fill="rgba(255,255,255,0.32)" />
      <Path d="M100 52 Q100 40 100 32" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M100 44 Q92 36 86 28" stroke="#388E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  ),
  Apple:         AppleIcon,
  Sapota:        (p) => (
    <Svg viewBox="0 0 200 200" width={p.size} height={p.size}>
      <Defs>
        <RadialGradient id="saBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#D7CCC8" />
          <Stop offset="55%"  stopColor="#8D6E63" />
          <Stop offset="100%" stopColor="#4E342E" />
        </RadialGradient>
      </Defs>
      <Shadow />
      <Ellipse cx="100" cy="108" rx="62" ry="60" fill="url(#saBg)" />
      <Ellipse cx="82" cy="84" rx="16" ry="10" fill="rgba(255,255,255,0.22)" />
      <Path d="M100 48 Q100 36 100 28" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  ),
  Pineapple:     PineappleIcon,
  Litchi:        (p) => (
    <Svg viewBox="0 0 200 200" width={p.size} height={p.size}>
      <Defs>
        <RadialGradient id="ltBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#FFCDD2" />
          <Stop offset="55%"  stopColor="#C62828" />
          <Stop offset="100%" stopColor="#880E4F" />
        </RadialGradient>
      </Defs>
      <Shadow rx={54} ry={8} />
      <Ellipse cx="100" cy="108" rx="60" ry="62" fill="url(#ltBg)" />
      {/* Spiky bumps */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const a = (i/12)*Math.PI*2;
        return <Circle key={i} cx={100+46*Math.cos(a)} cy={108+50*Math.sin(a)} r="7" fill="rgba(150,0,0,0.3)" />;
      })}
      <Ellipse cx="82" cy="84" rx="14" ry="9" fill="rgba(255,255,255,0.28)" />
      <Path d="M100 46 Q100 34 100 26" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  ),
  Coconut:       CoconutIcon,

  // Cereals
  Wheat:         WheatIcon,
  Rice:          RiceIcon,
  Maize:         MaizeIcon,
  Bajra:         BajraIcon,
  Jowar:         (p) => <GrainHeadIcon {...p} bgFrom="#D7CCC8" bgTo="#795548" headRx={22} headRy={55} />,
  Barley:        (p) => <GrainHeadIcon {...p} bgFrom="#FFF9C4" bgTo="#F9A825" headRx={18} headRy={50} />,
  Ragi:          (p) => <GrainHeadIcon {...p} bgFrom="#BCAAA4" bgTo="#4E342E" headRx={24} headRy={44} />,

  // Pulses
  'Tur Dal':     (p) => <SeedPileIcon {...p} c1="#FFCC80" c2="#FF8F00" c3="#E65100" />,
  Gram:          (p) => <SeedPileIcon {...p} c1="#D7CCC8" c2="#A1887F" c3="#5D4037" seedRx={16} seedRy={14} />,
  Moong:         (p) => <SeedPileIcon {...p} c1="#C8E6C9" c2="#4CAF50" c3="#1B5E20" seedRx={12} seedRy={10} />,
  Urad:          (p) => <SeedPileIcon {...p} c1="#616161" c2="#212121" c3="#000000" seedRx={12} seedRy={10} />,
  Masoor:        (p) => <SeedPileIcon {...p} c1="#FFCCBC" c2="#FF5722" c3="#BF360C" seedRx={13} seedRy={8} />,

  // Oilseeds
  Soybean:       (p) => <PeasIcon {...p} />,
  Groundnut:     GroundnutIcon,
  Sunflower:     SunflowerIcon,
  Mustard:       (p) => <SeedPileIcon {...p} c1="#FFF9C4" c2="#F9A825" c3="#F57F17" seedRx={9} seedRy={9} />,
  Sesame:        (p) => <SeedPileIcon {...p} c1="#FAFAFA" c2="#D7CCC8" c3="#8D6E63" seedRx={8} seedRy={11} />,
  Castor:        (p) => <SeedPileIcon {...p} c1="#BCAAA4" c2="#6D4C41" c3="#3E2723" seedRx={14} seedRy={11} />,

  // Cash crops
  Cotton:        CottonIcon,
  Sugarcane:     SugarcaneIcon,
  Jute:          (p) => <SugarcaneIcon {...p} />,

  // Spices
  Turmeric:      TurmericIcon,
  'Red Chilli':  RedChilliIcon,
  Cumin:         CuminIcon,
  'Coriander Seeds': CuminIcon,
  Cardamom:      (p) => (
    <Svg viewBox="0 0 200 200" width={p.size} height={p.size}>
      <Defs>
        <RadialGradient id="cdBg" cx="38%" cy="32%" r="58%">
          <Stop offset="0%"   stopColor="#C8E6C9" />
          <Stop offset="55%"  stopColor="#43A047" />
          <Stop offset="100%" stopColor="#1B5E20" />
        </RadialGradient>
      </Defs>
      <Shadow rx={32} ry={7} />
      {/* Pod */}
      <Ellipse cx="100" cy="106" rx="38" ry="64" fill="url(#cdBg)" />
      {/* Ridges */}
      {[-2,-1,0,1,2].map(i => (
        <Path key={i} d={`M${86+i*8} 44 Q${86+i*8} 106 ${86+i*8} 168`}
          stroke="rgba(0,80,0,0.2)" strokeWidth="1.5" fill="none" />
      ))}
      <Ellipse cx="86" cy="78" rx="12" ry="28" fill="rgba(255,255,255,0.22)" />
    </Svg>
  ),
  'Black Pepper': (p) => <SeedPileIcon {...p} c1="#616161" c2="#212121" c3="#000000" seedRx={14} seedRy={14} />,
  Ajwain:        CuminIcon,
  Fennel:        (p) => <SeedPileIcon {...p} c1="#C8E6C9" c2="#66BB6A" c3="#2E7D32" seedRx={9} seedRy={12} />,
};

// ─────────────────────────────────────────────────────────────────────────────
// ── Public API ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders the SVG illustration for a given crop name.
 *
 * @param {string}  crop  — exact name from CROP_CATEGORIES (case-sensitive)
 * @param {number}  size  — rendered width & height in dp (default: 56)
 */
export function CropIcon({ crop, size = 56 }) {
  const Icon = ICONS[crop];
  if (!Icon) {
    // Fallback — coloured leaf emoji placeholder
    return (
      <Svg viewBox="0 0 200 200" width={size} height={size}>
        <Defs>
          <RadialGradient id="fbBg" cx="38%" cy="32%" r="58%">
            <Stop offset="0%"   stopColor="#C8E6C9" />
            <Stop offset="100%" stopColor="#2E7D32" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="100" cy="178" rx="44" ry="8" fill="rgba(0,0,0,0.12)" />
        <Path d="M100 160 Q60 130 55 80 Q70 40 100 35 Q130 40 145 80 Q140 130 100 160Z" fill="url(#fbBg)" />
        <Path d="M100 160 Q100 110 100 38" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" />
        <Path d="M100 120 Q75 108 60 92" stroke="rgba(255,255,255,0.22)" strokeWidth="2" fill="none" />
        <Path d="M100 120 Q125 108 140 92" stroke="rgba(255,255,255,0.22)" strokeWidth="2" fill="none" />
      </Svg>
    );
  }
  return <Icon size={size} />;
}

export default CropIcon;
