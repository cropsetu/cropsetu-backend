# FarmEasy — UI Design Document

> Rooted in the soil. Grown for every farmer.

A comprehensive design reference for the FarmEasy mobile application — an agricultural super-app built for Indian farmers, covering AI advisory, crop marketplace, livestock trading, machinery rental, veterinary services, and hyperlocal weather.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design System](#2-design-system)
3. [Navigation Architecture](#3-navigation-architecture)
4. [Authentication Flow](#4-authentication-flow)
5. [AI Assistant (FarmMind)](#5-ai-assistant-farmmind)
6. [AgriStore — Crop Marketplace](#6-agristore--crop-marketplace)
7. [Animal Trade — Livestock Market](#7-animal-trade--livestock-market)
8. [Rent — Machinery & Labour](#8-rent--machinery--labour)
9. [Doctor — Veterinary Services](#9-doctor--veterinary-services)
10. [Weather & Farm Calendar](#10-weather--farm-calendar)
11. [Seller Portal](#11-seller-portal)
12. [Profile & Account](#12-profile--account)
13. [API Endpoint Reference](#13-api-endpoint-reference)
14. [Localization & Accessibility](#14-localization--accessibility)

---

## 1. Design Philosophy

### Seed → Sprout → Harvest Metaphor

FarmEasy's UI follows the natural agricultural cycle as a mental model:

| Stage | Represents | UI Principle |
|-------|------------|--------------|
| **Seed** | Onboarding & data entry | Minimal friction, big tap targets |
| **Sprout** | AI insights & recommendations | Progressive disclosure, card-first |
| **Harvest** | Transactions & outcomes | Clear CTAs, trust signals |

### Core Principles

- **Field-First:** Designed for use under bright sunlight, with one hand, often with dusty gloves — high contrast, large touch targets (min 48×48 dp), no tiny icons.
- **Offline-First:** Every screen degrades gracefully. Cached data renders immediately; network data updates silently.
- **Bharat-First:** 9 Indian languages, state-language auto-detection, rupee (₹) as the default currency.
- **Low-Bandwidth Friendly:** Images compressed before upload, API responses cached aggressively, skeleton loaders eliminate layout shift.

---

## 2. Design System

### 2.1 Color Palette

The palette is drawn from the Indian agricultural landscape.

#### Primary Palette

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| `color.primary` | `#2D9162` | Kharif Green | Primary CTAs, navigation active state, AgriStore theme |
| `color.primaryDark` | `#1B6B45` | Deep Forest | Pressed states, headers |
| `color.primaryLight` | `#4CAF80` | Seedling | Hover states, secondary accents |
| `color.cta` | `#E65100` | Harvest Orange | Action buttons, FABs, Seller Portal |
| `color.ctaDark` | `#BF360C` | Fired Clay | Pressed CTA states |
| `color.secondary` | `#00897B` | Irrigation Teal | Rent & Machinery section |
| `color.sky` | `#0288D1` | Monsoon Blue | Weather section |
| `color.earth` | `#6D4C41` | Tilled Soil | Animal Trade section |
| `color.gold` | `#F59E0B` | Ripe Wheat | Ratings, badges, MSP highlights |

#### Surface Palette

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| `color.background` | `#EEF8F4` | Morning Mist | Page backgrounds |
| `color.surface` | `#FFFFFF` | White | Cards, sheets, inputs |
| `color.surfaceAlt` | `#F5FAF7` | Light Meadow | Alternate row backgrounds |
| `color.border` | `#D4EBE0` | Dew Line | Card borders, dividers |

#### Semantic Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `color.success` | `#22C55E` | Crop health OK, order confirmed |
| `color.warning` | `#F59E0B` | Pest alerts, low stock |
| `color.error` | `#EF4444` | Disease detected, payment failed |
| `color.info` | `#3B82F6` | Govt schemes, tips |

#### AI Assistant Dark Theme

| Token | Hex | Name |
|-------|-----|------|
| `ai.background` | `#0A140A` | Midnight Field |
| `ai.surface` | `#0F1F10` | Shadow Soil |
| `ai.accent` | `#2ECC71` | Bioluminescent |
| `ai.text` | `#F1F1EE` | Moonlit White |
| `ai.textMuted` | `#8FAF91` | Silver Leaf |

---

### 2.2 Typography

Font family: **System default** (SF Pro on iOS, Roboto on Android).

| Scale Token | Size | Weight | Line Height | Usage |
|-------------|------|--------|-------------|-------|
| `type.hero` | 36px | 800 | 1.2 | Splash headlines |
| `type.h1` | 28px | 700 | 1.25 | Screen titles |
| `type.h2` | 22px | 700 | 1.3 | Section headers |
| `type.h3` | 18px | 600 | 1.35 | Card titles |
| `type.body` | 15px | 400 | 1.6 | Body text, descriptions |
| `type.bodyMd` | 15px | 500 | 1.6 | Emphasized body |
| `type.small` | 13px | 400 | 1.5 | Labels, captions |
| `type.xs` | 11px | 400 | 1.4 | Badges, timestamps |

---

### 2.3 Spacing

8-point grid system.

| Token | Value | Usage |
|-------|-------|-------|
| `space.1` | 4px | Icon padding, micro gaps |
| `space.2` | 8px | Inline element gaps |
| `space.3` | 12px | Component internal padding |
| `space.4` | 16px | Standard padding, card gaps |
| `space.5` | 20px | Section spacing |
| `space.6` | 24px | Large card padding |
| `space.8` | 32px | Screen horizontal padding |
| `space.10` | 40px | Hero section gaps |

---

### 2.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius.xs` | 4px | Chips, inline badges |
| `radius.sm` | 8px | Input fields, small cards |
| `radius.md` | 12px | Standard cards |
| `radius.lg` | 16px | Bottom sheets, large cards |
| `radius.xl` | 20px | Feature cards, modals |
| `radius.xxl` | 28px | FABs, pill buttons |
| `radius.full` | 999px | Avatars, tags, chips |

---

### 2.5 Shadows & Elevation

| Level | Usage |
|-------|-------|
| `shadow.xs` | Subtle separation (e.g., input field border) |
| `shadow.sm` | Default card elevation |
| `shadow.md` | Active card, bottom sheet |
| `shadow.lg` | Modals, FABs |
| `shadow.greenGlow` | AI response bubble glow |
| `shadow.orangeGlow` | CTA button glow, seller highlight |

---

### 2.6 Iconography

- **Library:** React Native Vector Icons (MaterialCommunityIcons, Ionicons)
- **Size scale:** 16px (inline) → 20px (list) → 24px (tab bar) → 32px (feature)
- **Agriculture icons used throughout:**
  - `sprout` — crops, AI
  - `tractor` — machinery rental
  - `cow` — animal trade
  - `weather-partly-cloudy` — weather
  - `store` — AgriStore
  - `stethoscope` — veterinary
  - `leaf` — general farming context
  - `water` — irrigation
  - `bug` — pest alerts
  - `calendar-check` — planner
  - `currency-inr` — price/loan screens

---

## 3. Navigation Architecture

### Bottom Tab Bar (6 Tabs)

```
┌────────────────────────────────────────────────────────────┐
│  [AgriStore]  [FarmMind AI]  [AnimalTrade]  [Rent]  [Vet]  [Account]  │
└────────────────────────────────────────────────────────────┘
```

| Tab | Icon | Active Color | Stack Screens |
|-----|------|--------------|---------------|
| **AgriStore** | store | Kharif Green | Home → ProductDetail → Cart → Checkout → OrderConfirmed |
| **FarmMind AI** | sprout | Bioluminescent Green | AIHome → Chat / CropScan / Market / Planner / Weather / MSP / Soil / Pest / Calendar / Irrigation / Inputs / Loan / Mandi |
| **AnimalTrade** | cow | Tilled Soil | Home → AnimalDetail → AddListing → Chat |
| **Rent** | tractor | Irrigation Teal | Home → MachineryDetail / LabourDetail → AddMachinery / AddWorker → Bookings → MyListings |
| **Doctor** | stethoscope | Monsoon Blue | Home → DoctorDetail |
| **Account** | account-circle | Kharif Green | Profile → MyListings / SellerPortal |

### Tab Bar Design

- **Pill indicator:** Active tab shows a rounded pill behind icon + label.
- **Spring animation:** Pill slides between tabs with a spring curve (tension 70, friction 10).
- **Background:** Frosted white (`rgba(255,255,255,0.96)`) with `shadow.md`.
- **Safe area:** Respects iOS home indicator & Android navigation bar insets.

---

## 4. Authentication Flow

### Screen: `LoginScreen`

**API Endpoints Used:**
- `POST /auth/send-otp` — Request OTP for phone number
- `POST /auth/verify-otp` — Verify OTP, receive tokens
- `PUT /users/me` — Set display name for new users
- `POST /auth/refresh` — Refresh access token silently

### Step 1 — Phone Number Entry

```
┌──────────────────────────────────┐
│   [FarmEasy Logo - Sprout Leaf]  │
│                                  │
│   "Your farm's digital helper"   │
│                                  │
│  +91  [___________________]      │  ← Number input, numeric keyboard
│                                  │
│  [Get OTP  →]                    │  ← Harvest Orange CTA
│                                  │
│  Available in: हिन्दी తెలుగు ...</         │
└──────────────────────────────────┘
```

- Phone field: `+91` prefix fixed, 10-digit input.
- Validation inline (red border if < 10 digits on blur).
- "Get OTP" button disables + shows spinner on tap.

### Step 2 — OTP Verification

```
┌──────────────────────────────────┐
│   Verify your number             │
│   Sent to +91 98765 43210        │
│                                  │
│   [_] [_] [_] [_] [_] [_]       │  ← 6 individual OTP boxes
│                                  │
│   Resend in 28s                  │  ← Countdown timer
│                                  │
│   [Verify & Continue]            │
└──────────────────────────────────┘
```

- OTP boxes: auto-advance on each digit, backspace moves backward.
- Dev mode: OTP auto-fills after 1 second.
- 5-attempt limit: after 5 failures, a "Blocked" state with cooldown.
- 30-second resend cooldown enforced both client and server.

### Step 3 — Name Entry (New Users Only)

```
┌──────────────────────────────────┐
│   What should we call you?       │
│   (New account detected)         │
│                                  │
│   [___Your Name_______________]  │
│                                  │
│   [Start Farming  →]             │
└──────────────────────────────────┘
```

---

## 5. AI Assistant (FarmMind)

> "FarmMind — your 24/7 field advisor"

### 5.1 AIAssistantHome

**API Endpoints Used:**
- `GET /weather?lat=&lon=&lang=` — Hero weather widget
- `GET /ai/alerts` — Smart farm alerts banner

```
┌─────────────────────────────────────────────────────┐
│  Header: "FarmMind"  [leaf icon]  [Alerts bell]     │
│                                                     │
│  ┌─────────────── Weather Widget ───────────────┐   │
│  │  Pune, MH   28°C   Humidity 72%             │   │
│  │  "Good day for spraying"                     │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Quick Actions (4 horizontal pills):                │
│  [Chat] [Scan Crop] [Prices] [Plan]                │
│                                                     │
│  AI Tools Grid (2x2 cards):                         │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Soil Test    │  │ Pest Alert   │                │
│  └──────────────┘  └──────────────┘                │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Irrigation   │  │ MSP Rates    │                │
│  └──────────────┘  └──────────────┘                │
│                                                     │
│  More Tools (horizontal scroll):                   │
│  [Loan Calc] [Mandi Bhav] [Inputs] [Calendar]      │
└─────────────────────────────────────────────────────┘
```

**Color Theme:** Dark background (`#0A140A`) with bright green (`#2ECC71`) accents.

---

### 5.2 AIChatScreen — FarmMind Chat

**API Endpoints Used:**
- `POST /ai/chat` — Send text message to AI
- `POST /ai/voice` — Send voice message
- `GET /ai/conversations` — Chat history list
- `GET /ai/conversations/{id}` — Load specific conversation

```
┌─────────────────────────────────────────────────────┐
│  <- [History]    FarmMind Chat    [Farm Profile]    │
│─────────────────────────────────────────────────────│
│  [Farm context pill: Wheat, Pune, Sandy Loam]       │
│─────────────────────────────────────────────────────│
│                                                     │
│  AI:  "Namaste! I'm FarmMind, your AI farm advisor. │
│        What would you like to know today?"          │
│                                                     │
│                  [User bubble: right-aligned]       │
│  "My wheat leaves are turning yellow at the tips"   │
│                                                     │
│  AI:  "Yellow tips on wheat leaves often indicate   │
│        nitrogen deficiency or frost burn. Given     │
│        your soil type (Sandy Loam) and current      │
│        28°C temperature..."                         │
│       [See remedy]  [Buy medicine]                 │
│                                                     │
│─────────────────────────────────────────────────────│
│  [Attach] [___Type a question___________] [voice] [send] │
└─────────────────────────────────────────────────────┘
```

- AI bubbles: dark surface with green glow, left-aligned.
- User bubbles: Kharif Green, right-aligned.
- Inline action buttons within AI responses for remedy / purchase links.
- Voice: tap-and-hold microphone for recording; shows audio waveform animation.

---

### 5.3 CropScanScreen — Disease Scanner

**API Endpoints Used:**
- `POST /ai/scan` — Upload crop image for analysis (multipart)
- `GET /ai/scan/history` — Past scan results
- `GET /ai/scan/sessions` — Scan session list
- `GET /ai/scan/{id}/chat` — Follow-up chat for a scan

```
┌─────────────────────────────────────────────────────┐
│  <- Crop Disease Scanner                            │
│─────────────────────────────────────────────────────│
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │        [Camera viewfinder / image preview]  │   │
│  │                                             │   │
│  │  Tip: Center the affected leaf              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Take Photo]    [Upload from Gallery]              │
│                                                     │
│  Recent Scans:                                      │
│  ┌─────┬──────────────────────────────────┐        │
│  │ img │ Wheat leaf rust — 3 days ago    │  ->    │
│  ├─────┼──────────────────────────────────┤        │
│  │ img │ Corn blight — 5 days ago        │  ->    │
│  └─────┴──────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

---

### 5.4 DiagnosisResultScreen

Receives scan data via navigation params. No additional API call on this screen.

```
┌─────────────────────────────────────────────────────┐
│  <- Diagnosis Result                                │
│─────────────────────────────────────────────────────│
│  [Scanned image thumbnail]                          │
│                                                     │
│  [!] Wheat Stem Rust Detected                       │
│  Confidence: 87%                                    │
│                                                     │
│  Symptoms Matched:                                  │
│  - Orange-brown pustules on leaves                  │
│  - Yellowing around lesions                         │
│                                                     │
│  Recommended Treatment:                             │
│  - Propiconazole 25% EC — 1 ml/L spray             │
│  - Apply in morning; repeat after 10 days           │
│                                                     │
│  [Buy Treatment ->]   (links to AgriStore)         │
│  [Ask FarmMind about this]                         │
└─────────────────────────────────────────────────────┘
```

---

### 5.5 MarketScreen — Price Intelligence

**API Endpoints Used:**
- `GET /market/prices?crop=&state=` — Current prices
- `GET /market/predict?crop=&state=` — Price prediction
- `GET /market/forecast?crop=&state=&months=` — Long-range forecast
- `GET /market/crops` — Available crop list

```
┌─────────────────────────────────────────────────────┐
│  <- Market Prices    [State: Maharashtra v]         │
│─────────────────────────────────────────────────────│
│  Crop: [Wheat v]   Range: [7d] [1m] [3m] [6m]     │
│                                                     │
│  ┌────────── Price Chart (line graph) ───────────┐  │
│  │  Rs 2,400 ────────────────────────────────── │  │
│  │  Rs 2,200       trend line                   │  │
│  │  Rs 2,000  ────────────────────             │  │
│  │             Mon  Tue  Wed  Thu  Fri          │  │
│  └───────────────────────────────────────────── ┘  │
│                                                     │
│  Current: Rs 2,380/qtl   MSP: Rs 2,275/qtl         │
│  AI Prediction (30d): Rs 2,450 (+2.9%)              │
│                                                     │
│  Top Mandis:                                        │
│  - Nashik — Rs 2,395   - Pune — Rs 2,370           │
│  - Solapur — Rs 2,360                              │
└─────────────────────────────────────────────────────┘
```

---

### 5.6 SchemeScreen — Government Schemes

No live API; displays curated scheme cards.

```
┌─────────────────────────────────────────────────────┐
│  <- Government Schemes                              │
│─────────────────────────────────────────────────────│
│  Filter: [All] [Subsidy] [Insurance] [Loan]         │
│                                                     │
│  ┌────────────────────────────────────────────┐    │
│  │  PM-KISAN                                  │    │
│  │  Rs 6,000/year direct income support       │    │
│  │  Eligibility: All land-holding farmers     │    │
│  │  Deadline: Ongoing  [Apply ->]             │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
│  ┌────────────────────────────────────────────┐    │
│  │  PMFBY Crop Insurance                      │    │
│  │  Protect against natural calamities        │    │
│  │  Premium: 1.5% – 2% of sum insured         │    │
│  │  [View Details ->]                         │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

### 5.7 DailyPlannerScreen

**API Endpoints Used:**
- `GET /planner/tasks` — Fetch today's & upcoming tasks
- `POST /planner/generate` — AI generate tasks for week
- `PATCH /planner/tasks/{id}` — Mark complete / reschedule
- `DELETE /planner/tasks/{id}` — Remove task

```
┌─────────────────────────────────────────────────────┐
│  <- Daily Farm Planner     [+ Generate with AI]    │
│─────────────────────────────────────────────────────│
│  Today, Mon 14 Apr — Wheat, Irrigated              │
│                                                     │
│  Morning                                            │
│  [ ]  6:00 AM — Check irrigation pump pressure    │
│  [x]  8:00 AM — Spray Propiconazole (field B)      │
│                                                     │
│  Afternoon                                          │
│  [ ]  2:00 PM — Top-dress urea (field A)           │
│  [ ]  4:00 PM — Scout for aphids                   │
│                                                     │
│  Tomorrow Preview                                   │
│  - Soil moisture check                              │
│  - Irrigation cycle — field C                      │
│                                                     │
│  [+ Add Custom Task]                               │
└─────────────────────────────────────────────────────┘
```

---

### 5.8 MSPTrackerScreen — Minimum Support Price

**API Endpoints Used:**
- `GET /msp/rates` — All commodities MSP
- `GET /msp/rates/{commodity}` — Single commodity history
- `GET /msp/compare/{commodity}` — MSP vs market price

```
┌─────────────────────────────────────────────────────┐
│  <- MSP Tracker    Year: [2024-25 v]               │
│─────────────────────────────────────────────────────│
│  Commodity       MSP (Rs/qtl)   Market    Change    │
│  ─────────────────────────────────────────          │
│  Wheat            2,275         2,380     +4.6%     │
│  Paddy (comm)     2,300         2,190     -4.8%     │
│  Maize            2,090         1,980     -5.3%     │
│  Arhar (Tur)      7,550         7,200     -4.6%     │
│                                                     │
│  Tap any row to see history chart                   │
│                                                     │
│  [How MSP is calculated]                           │
└─────────────────────────────────────────────────────┘
```

---

### 5.9 SoilHealthScreen

**API Endpoints Used:**
- `POST /soil/manual` — Submit manual soil test values
- `GET /soil/reports` — Past soil reports
- `GET /soil/recommendation` — AI fertilizer recommendation

```
┌─────────────────────────────────────────────────────┐
│  <- Soil Health                                     │
│─────────────────────────────────────────────────────│
│  Enter Latest Soil Test Results:                    │
│                                                     │
│  pH:        [______]   N (kg/ha): [______]          │
│  P (kg/ha): [______]   K (kg/ha): [______]          │
│  Organic C: [______]   EC:        [______]          │
│                                                     │
│  [Get AI Recommendation]                           │
│─────────────────────────────────────────────────────│
│  Last Report — 15 Mar 2025:                         │
│  pH: 6.8 OK   N: Low [!]   P: Adequate             │
│                                                     │
│  Recommendation:                                    │
│  - Apply 40 kg/acre urea before next irrigation    │
│  - Lime application not required                   │
└─────────────────────────────────────────────────────┘
```

---

### 5.10 PestAlertsScreen

**API Endpoints Used:**
- `GET /pest/alerts?lat=&lon=` — Location-based pest alerts
- `GET /pest/forecast?lat=&lon=` — Upcoming pest risk forecast

```
┌─────────────────────────────────────────────────────┐
│  <- Pest Alerts    Location: Nashik District        │
│─────────────────────────────────────────────────────│
│  Active Alerts:                                     │
│                                                     │
│  [HIGH]   Aphid Infestation                         │
│  Crops: Wheat, Mustard    Radius: 25 km             │
│  "Peak activity expected 2-3 days"                  │
│  [View Control Measures]                           │
│                                                     │
│  [MEDIUM]  Fall Armyworm                            │
│  Crops: Maize            Radius: 50 km             │
│  [View Control Measures]                           │
│                                                     │
│  7-Day Forecast:                                    │
│  Mon - Low   Tue - Low   Wed - Med   Thu - High    │
└─────────────────────────────────────────────────────┘
```

---

### 5.11 FarmCalendarScreen

**API Endpoints Used:**
- `POST /calendar/generate` — AI generate crop calendar
- `GET /calendar` — Fetch calendar tasks
- `GET /calendar/today` — Today's calendar tasks
- `PATCH /calendar/tasks/{id}` — Update task status

```
┌─────────────────────────────────────────────────────┐
│  <- Farm Calendar    [Crop: Wheat v]   [April 2025] │
│─────────────────────────────────────────────────────│
│  Mo Tu We Th Fr Sa Su                               │
│  ── ── ── ── ── ── ──                               │
│   7  8  9 10 11 12 13                               │
│  14 15[16]17 18 19 20   <- [16] = today             │
│  21 22 23 24 25 26 27                               │
│                                                     │
│  Apr 16 — Tasks:                                    │
│  [water]  Irrigation — Field B (2 hrs)              │
│  [leaf]   Inter-cultivation weeding                 │
│  [pill]   2nd fertilizer dose (DAP)                │
│                                                     │
│  Upcoming Milestones:                               │
│  Apr 25 — Heading stage begins                     │
│  May 10 — Harvest window opens                     │
└─────────────────────────────────────────────────────┘
```

---

### 5.12 IrrigationScreen

**API Endpoints Used:**
- `GET /irrigation/today` — Today's irrigation schedule
- `GET /irrigation/weekly` — Weekly schedule
- `POST /irrigation/log` — Log an irrigation event

```
┌─────────────────────────────────────────────────────┐
│  <- Irrigation Scheduler                            │
│─────────────────────────────────────────────────────│
│  Today's Schedule:                                  │
│  Field A — 6:00 AM  [Logged]                       │
│  Field C — 4:00 PM  [Log Now]                      │
│                                                     │
│  Soil Moisture (field avg): 38%  Moderate           │
│  Last rain: 3 days ago (14 mm)                     │
│                                                     │
│  Weekly Plan:                                       │
│  Mon - A,B   Wed - C   Fri - A,C   Sun - B        │
│                                                     │
│  [+ Log Irrigation Event]                          │
└─────────────────────────────────────────────────────┘
```

---

### 5.13 InputCalculatorScreen

**API Endpoints Used:**
- `POST /inputs/calculate` — Calculate required inputs
- `GET /inputs/price-list` — Current input prices

```
┌─────────────────────────────────────────────────────┐
│  <- Input Calculator                                │
│─────────────────────────────────────────────────────│
│  Crop:     [Wheat v]                               │
│  Stage:    [Flowering v]                            │
│  Land:     [______] acres                           │
│                                                     │
│  [Calculate ->]                                     │
│─────────────────────────────────────────────────────│
│  Results:                                           │
│  Urea        — 40 kg/acre x 5 acres = 200 kg       │
│  DAP         — 25 kg/acre x 5 acres = 125 kg       │
│  Potash      — 20 kg/acre x 5 acres = 100 kg       │
│                                                     │
│  Estimated Cost: Rs 4,200                          │
│  [Order from AgriStore]                            │
└─────────────────────────────────────────────────────┘
```

---

### 5.14 LoanCalculatorScreen

**API Endpoints Used:**
- `POST /loan/kcc-eligibility` — KCC eligibility check
- `POST /loan/emi` — EMI calculation
- `GET /loan/compare` — Loan product comparison

```
┌─────────────────────────────────────────────────────┐
│  <- Loan Calculator    [KCC] [EMI] [Compare]       │
│─────────────────────────────────────────────────────│
│  KCC Eligibility Check:                             │
│  Land owned: [______] acres                        │
│  Crop:       [Wheat v]                              │
│  State:      [Maharashtra v]                        │
│                                                     │
│  [Check Eligibility]                               │
│─────────────────────────────────────────────────────│
│  Eligible for KCC                                   │
│  Recommended Limit: Rs 1,50,000                    │
│  Interest Rate: 4% (with subsidy)                  │
│  Apply at: SBI, Bank of Maharashtra, UCO Bank      │
│                                                     │
│  [Calculate EMI for term loan ->]                  │
└─────────────────────────────────────────────────────┘
```

---

### 5.15 MandiBhavScreen — Real Mandi Prices

**API Endpoints Used:**
- `GET /mandi/prices?commodity=&state=` — Current mandi prices
- `GET /mandi/prices/{commodity}/trend` — Historical trend
- `GET /mandi/nearby?lat=&lon=` — Nearby mandis

```
┌─────────────────────────────────────────────────────┐
│  <- Mandi Bhav     Near You                         │
│─────────────────────────────────────────────────────│
│  [Search commodity or mandi...]                    │
│                                                     │
│  Nearby Mandis (sorted by distance):               │
│  ┌──────────────────────────────────────────┐      │
│  │  Nashik APMC              2.3 km away    │      │
│  │  Wheat: Rs 2,380/qtl   Onion: Rs 1,200  │      │
│  │  Updated: 2 hours ago                   │      │
│  └──────────────────────────────────────────┘      │
│  ┌──────────────────────────────────────────┐      │
│  │  Niphad Mandi             18 km away     │      │
│  │  Wheat: Rs 2,395/qtl   Grapes: Rs 85/kg │      │
│  └──────────────────────────────────────────┘      │
│                                                     │
│  Source: data.gov.in (via FarmEasy API)            │
└─────────────────────────────────────────────────────┘
```

---

## 6. AgriStore — Crop Marketplace

> "From seed to harvest — everything in one store"

### 6.1 AgriStoreHome

**API Endpoints Used:**
- `GET /shop/categories` — Category list
- `GET /shop/products?category=&page=` — Product grid
- `GET /shop/products/search?q=` — Search

```
┌─────────────────────────────────────────────────────┐
│  AgriStore  [search icon]  [Cart (3)]               │
│─────────────────────────────────────────────────────│
│  [Search seeds, fertilizers, tools...]              │
│                                                     │
│  Categories (horizontal scroll):                   │
│  [Seeds] [Fertilizers] [Pesticides]                │
│  [Irrigation] [Tools] [Organic]                    │
│                                                     │
│  Today's Deals:                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ [image]      │  │ [image]      │                │
│  │ Hybrid Wheat │  │ Urea 50kg    │                │
│  │ Seed 1kg     │  │ Bag          │                │
│  │ 4.5 (120)    │  │ 4.2 (85)    │                │
│  │ Rs 280       │  │ Rs 590       │                │
│  │ ~~Rs 350~~   │  │ ~~Rs 650~~   │                │
│  │ [Add to Cart]│  │ [Add to Cart]│                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

- Left-slide drawer opens category sub-tree.
- Skeleton loaders during product fetch.
- "Add to Cart" triggers bouncing cart icon animation.

---

### 6.2 ProductDetail

**API Endpoint Used:**
- `GET /shop/products/{id}`

```
┌─────────────────────────────────────────────────────┐
│  <- Product Detail               [Wishlist]         │
│─────────────────────────────────────────────────────│
│  [Image Gallery — swipeable, up to 3 images]        │
│                                                     │
│  Hybrid Wheat Seed (HD-2967) — 1 kg Pack           │
│  4.5 stars  (120 reviews)   In Stock               │
│                                                     │
│  Rs 280   ~~Rs 350~~   20% off                     │
│                                                     │
│  Variants: [500g] [1kg (selected)] [5kg]           │
│                                                     │
│  Description:                                       │
│  High-yield, rust-resistant wheat variety...        │
│  Suitable for: Irrigated conditions, Rabi season   │
│                                                     │
│  Reviews (4 most recent):                          │
│  5 stars  Ramesh K — "Good germination rate"       │
│                                                     │
│  [Add to Cart]   [Buy Now ->]                      │
└─────────────────────────────────────────────────────┘
```

---

### 6.3 CartScreen

Cart stored in local state. Shows item list with quantity controls (+/−), subtotal, delivery estimate, and "Proceed to Checkout" CTA.

---

### 6.4 CheckoutScreen

**API Endpoints Used:**
- `POST /orders` — Create order
- `POST /payments/initiate` — Initiate payment gateway

Collects:
- Delivery address (GPS autofill available)
- Payment method: UPI / COD / Net Banking
- Order summary confirmation before placing

---

### 6.5 OrderConfirmedScreen

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│            Order Placed!                            │
│                                                     │
│  Order #FE-2024-98732                               │
│  Estimated delivery: 3-5 working days               │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Hybrid Wheat Seed 1kg   x2   Rs 560        │   │
│  │  Urea 50kg Bag            x1   Rs 590        │   │
│  │  Delivery charge               Rs 40         │   │
│  │  Total                        Rs 1,190       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Track Order]   [Continue Shopping]               │
└─────────────────────────────────────────────────────┘
```

---

## 7. Animal Trade — Livestock Market

> "Your trusted mela, in your pocket"

### 7.1 AnimalTradeHome

**API Endpoints Used:**
- `GET /animals?category=&lat=&lon=&page=` — Listings with GPS distance
- `GET /animals?category=Cow` — Category filter

```
┌─────────────────────────────────────────────────────┐
│  Animal Trade   Near You   [+ Sell Animal]          │
│─────────────────────────────────────────────────────│
│  Category: [All] [Cow] [Buffalo] [Goat]            │
│            [Bullock] [Sheep] [Other]                │
│                                                     │
│  Sort: [Nearest v]   Filter: [Price v]             │
│─────────────────────────────────────────────────────│
│  ┌────────────────────────────────────────────┐    │
│  │ [3 photos]   HF Cow — High Milk Yield      │    │
│  │  Ahmednagar  2.4 km  4.7 stars            │    │
│  │  Age: 4 years   Daily milk: 18 L           │    │
│  │  Rs 55,000   [View Details ->]            │    │
│  └────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────┐    │
│  │ [2 photos]   Surti Buffalo — Pregnant      │    │
│  │  Nashik  8.1 km   4.3 stars               │    │
│  │  Rs 80,000   [View Details ->]            │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

### 7.2 AnimalDetail

**API Endpoints Used:**
- `GET /animals/{id}`
- `GET /animals/{id}/reviews`

```
┌─────────────────────────────────────────────────────┐
│  <- Animal Detail                  [Share]          │
│─────────────────────────────────────────────────────│
│  [Photo Gallery — swipeable, 3-5 photos]            │
│                                                     │
│  HF Cow — High Milk Yield                           │
│  4.7 stars  (12 reviews)   2.4 km away             │
│                                                     │
│  Details:                                           │
│  Breed: Holstein Friesian   Age: 4 years           │
│  Daily yield: 18-20 L      Lactation: 3rd          │
│  Vaccinations: FMD [done]  BQ [done]  Dewormed [done] │
│                                                     │
│  Asking Price: Rs 55,000  (Negotiable)             │
│                                                     │
│  Seller: Ramesh Patil   Ahmednagar                 │
│  Member since Jan 2023   20 listings sold          │
│                                                     │
│  [Chat with Seller]   [Call]                       │
└─────────────────────────────────────────────────────┘
```

---

### 7.3 AddAnimalListing

**API Endpoint Used:**
- `POST /animals` — Multipart form with image upload

Form fields: category, breed, age, price, description, photos (up to 5), vaccination status, location (GPS autofill).

---

### 7.4 ChatScreen — Real-time Messaging

**Connection:** Socket.io (`socket.js` service)

```
┌─────────────────────────────────────────────────────┐
│  <- Ramesh Patil     Online                         │
│─────────────────────────────────────────────────────│
│  [Conversation context: HF Cow — Rs 55,000]        │
│─────────────────────────────────────────────────────│
│                                                     │
│                  "Is the price negotiable?"         │
│  "Yes, can consider Rs 52,000 for quick sale"      │
│                                                     │
│                  "Can I visit tomorrow at 3pm?"    │
│  "Sure, here's the location: [Map pin]"            │
│                                                     │
│─────────────────────────────────────────────────────│
│  [photo attach] [___Type message___________] [send] │
└─────────────────────────────────────────────────────┘
```

---

## 8. Rent — Machinery & Labour

> "The right machine at the right time"

### 8.1 RentHome

**API Endpoints Used:**
- `GET /rent/items?category=&lat=&lon=&radius=` — Machinery listings
- `GET /rent/workers?lat=&lon=&radius=` — Labour listings

```
┌─────────────────────────────────────────────────────┐
│  Rent & Hire   [Machinery tab] [Labour tab]         │
│─────────────────────────────────────────────────────│
│  Within: [5km] [10km] [25km (active)] [50km]       │
│─────────────────────────────────────────────────────│
│  Machinery Categories:                              │
│  [Tractor] [Harvester] [Sprayer]                   │
│  [Rotavator] [Seed Drill] [More...]                 │
│                                                     │
│  ┌────────────────────────────────────────────┐    │
│  │  Mahindra 475 Tractor                     │    │
│  │  Kopargaon  8 km   4.8 stars              │    │
│  │  Rs 800/hr   Available: Mon-Sat           │    │
│  │  [Book Now ->]                            │    │
│  └────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────┐    │
│  │  Sanjay R. — Farm Labour                  │    │
│  │  Rahuri  14 km   4.6 stars                │    │
│  │  Rs 450/day  Exp: 8 yrs  Available Thu    │    │
│  │  [View Profile ->]                        │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

### 8.2 MachineryDetail

**API Endpoints Used:**
- `GET /rent/items/{id}`
- `GET /rent/items/{id}/reviews`

Displays: photo gallery, specifications, owner info, pricing per hour/day/acre, availability calendar, reviews, and "Book Now" CTA.

---

### 8.3 LabourDetail

**API Endpoints Used:**
- `GET /rent/workers/{id}`

Displays: profile photo, skills, experience, daily rate, availability calendar (highlighted available dates), languages spoken, and contact options.

---

### 8.4 AddMachineryScreen

**API Endpoint Used:**
- `POST /rent/items` — Create machinery listing

Fields: machinery type, model/brand, photos (up to 5), pricing per hour/day/acre, available days, location (GPS autofill), description.

---

### 8.5 AddWorkerScreen

**API Endpoint Used:**
- `POST /rent/workers` — Register as worker

Fields: name, skills (multi-select), experience years, daily rate, availability (weekly calendar), languages, location, ID proof photo.

---

### 8.6 RentBookingsScreen

**API Endpoints Used:**
- `GET /rent/bookings`
- `GET /rent/bookings/{id}`

Status badges: Pending (gold) → Confirmed (green) → In Progress (blue) → Completed (grey) → Cancelled (red).

---

### 8.7 MyRentListingsScreen

**API Endpoint Used:**
- `GET /users/me/rent-listings`

Shows combined list of user's own machinery and worker listings with edit/deactivate options.

---

## 9. Doctor — Veterinary Services

> "Your animals deserve the best care"

### 9.1 DoctorHome

**API Endpoints Used:**
- `GET /doctors?lat=&lng=` — Nearby vets (public, no auth required)
- `GET /doctors/nearby?lat=&lng=` — Alternate GPS endpoint

```
┌─────────────────────────────────────────────────────┐
│  Veterinary Doctors   Near You  [Search]            │
│─────────────────────────────────────────────────────│
│  Specialization: [All] [Cattle] [Poultry] [Goat]   │
│                                                     │
│  ┌────────────────────────────────────────────┐    │
│  │  Dr. Anil Sharma — BVSc, MVSc             │    │
│  │  Nashik  3.2 km   4.8 stars  (64 reviews) │    │
│  │  Specialization: Cattle, Buffalo           │    │
│  │  Clinic: Mon-Sat, 9am-6pm                 │    │
│  │  [View Profile]  [Call]  [WhatsApp]       │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
│  ┌────────────────────────────────────────────┐    │
│  │  Dr. Priya Desai — BVSc                   │    │
│  │  Manmad  12 km   4.5 stars  (28 reviews)  │    │
│  │  Specialization: Goat, Sheep, Poultry      │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

### 9.2 DoctorDetail

**API Endpoints Used:**
- `GET /doctors/{id}`
- `GET /doctors/{id}/reviews`
- `POST /doctors/{id}/reviews` — Submit review (auth required)

Displays: doctor photo, qualifications, specializations, clinic hours, GPS directions link, call/WhatsApp buttons, and paginated reviews.

---

## 10. Weather & Farm Calendar

### 10.1 WeatherHome (AIWeatherHub)

**API Endpoint Used:**
- `GET /weather?lat=&lon=&lang=` — Cached, offline-first (1-hour TTL)

```
┌─────────────────────────────────────────────────────┐
│  [ImageBackground — weather-themed crop photo]      │
│                                                     │
│  Nashik, Maharashtra                                │
│  Partly Cloudy                                      │
│                                                     │
│  28°C                                               │
│  Feels like 31°C                                    │
│                                                     │
│  Humidity: 72%   Wind: 14 km/h NE                  │
│  Sunrise: 6:12 AM    Sunset: 6:48 PM               │
│─────────────────────────────────────────────────────│
│  [Sunrise arc visualization]                        │
│─────────────────────────────────────────────────────│
│  Hourly Forecast (horizontal scroll):               │
│  6pm 28°  7pm 26°  8pm 24°  ...                    │
│─────────────────────────────────────────────────────│
│  7-Day Forecast:                                    │
│  Mon 30/20  Tue 28/19  Wed 24/18  ...              │
│─────────────────────────────────────────────────────│
│  Soil Conditions:                                   │
│  Soil Temp: 24°C   Soil Moisture: 42%              │
│─────────────────────────────────────────────────────│
│  [ALERT: Heat wave advisory 15-17 Apr — IMD]       │
└─────────────────────────────────────────────────────┘
```

Weather background image changes based on condition (sunny field, rain on crops, overcast sky).

Caching strategy: L0 in-memory cache + L1 AsyncStorage (key `fe_wx_{lat}_{lon}`), 1-hour TTL. Cached data renders instantly; fresh data updates silently in background.

---

### 10.2 CropCalendar / StateCropsScreen

**API Endpoint Used:**
- `GET /crops/state-crops?state=Maharashtra`

Displays: sowing calendar for all major crops in selected state, sorted by Kharif / Rabi / Zaid season. Tapping a crop opens CropDetail with optimal temperature range, water needs, and fertilizer schedule.

---

## 11. Seller Portal

> "Grow your agri-business online"

Color theme: Harvest Orange (`#E65100`) for headers, stat cards, and CTAs throughout seller screens.

### 11.1 SellerDashboard

**API Endpoints Used:**
- `GET /seller/dashboard`
- `GET /seller/stats`

```
┌─────────────────────────────────────────────────────┐
│  Seller Dashboard   Ramesh Agro Pvt Ltd             │
│─────────────────────────────────────────────────────│
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Rs 84,200│  │    12    │  │    38    │          │
│  │ Revenue  │  │ Pending  │  │ Products │          │
│  │ (30 days)│  │  Orders  │  │ Listed   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│  (animated counter on screen entry)                 │
│─────────────────────────────────────────────────────│
│  Recent Orders:                                     │
│  #98732 — Wheat Seed 1kg x5   Rs 1,400  [Pending] │
│  #98704 — Urea 50kg Bag x2    Rs 1,180  [Shipped] │
│                                                     │
│  Quick Actions:                                     │
│  [+ Add Product]  [View Orders]  [Analytics]       │
└─────────────────────────────────────────────────────┘
```

---

### 11.2 MyProductsScreen

**API Endpoints Used:**
- `GET /seller/products`
- `DELETE /seller/products/{id}`

Paginated product list with thumbnail, price, stock count, active/inactive toggle. Swipe left to reveal Edit and Delete actions.

---

### 11.3 AddProductScreen

**API Endpoints Used:**
- `POST /seller/products` — Create (multipart with image upload)
- `PUT /seller/products/{id}` — Edit (same screen, pre-filled)

Form fields: title, category, description, price, stock quantity, unit, images (up to 5, compressed client-side), delivery availability toggle.

---

### 11.4 OrdersScreen

**API Endpoints Used:**
- `GET /seller/orders?status=`
- `GET /seller/orders/{id}`

Status tabs: All / Pending / Confirmed / Shipped / Delivered / Cancelled.

Order cards show: buyer name, items summary, amount, status badge, and action buttons (Confirm / Mark Shipped / Print Label).

A sound effect plays when a new Pending order arrives while the screen is open.

---

### 11.5 SellerProfileScreen

**API Endpoints Used:**
- `GET /seller/profile`
- `PUT /seller/profile`

Editable fields: display name, business name, description, profile photo, bank account details, contact info.

---

### 11.6 BusinessProfileScreen (KYC)

**API Endpoints Used:**
- `POST /seller/kyc` — Submit KYC documents
- `PUT /seller/kyc` — Update KYC

Collects: business name, GSTIN, PAN, bank account + IFSC, and document uploads (Aadhaar card, PAN card, shop photograph) as multipart form.

---

## 12. Profile & Account

### 12.1 ProfileScreen

**API Endpoints Used:**
- `GET /users/me`
- `PUT /users/me` — Update name, photo, location

```
┌─────────────────────────────────────────────────────┐
│  Account                                            │
│─────────────────────────────────────────────────────│
│  [Avatar]  Ramesh Patil                             │
│  Nashik, Maharashtra   +91 98765 43210             │
│                                                     │
│  Farm Profile (used by AI):                         │
│  Crops:     [Wheat] [Onion] [+ Add]                │
│  Soil:      Sandy Loam                              │
│  Irrigation: Drip                                  │
│  Land:      5 acres                                │
│                                                     │
│  Preferences:                                       │
│  Language:  [Hindi v]                               │
│  State:     [Maharashtra v]                        │
│                                                     │
│  ─────────────────────────────────                 │
│  [Seller Portal]                                   │
│  [My Rent Listings]                                │
│  [My Orders]                                       │
│  [Logout]                                          │
└─────────────────────────────────────────────────────┘
```

Farm Profile fields are persisted in `FarmContext` (AsyncStorage key `farmeasy_farm_profile_v2`) and auto-injected into all AI tool requests for personalised recommendations.

---

## 13. API Endpoint Reference

**Base URL:** `https://resilient-vision-production-e784.up.railway.app/api/v1`

All authenticated endpoints require `Authorization: Bearer <access_token>` header. Token is auto-refreshed on 401 via the base axios interceptor.

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/send-otp` | Request OTP for phone number | No |
| POST | `/auth/verify-otp` | Verify OTP, receive access + refresh tokens | No |
| POST | `/auth/refresh` | Exchange refresh token for new access token | Refresh token |
| POST | `/auth/logout` | Invalidate current tokens | Yes |

### User

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user profile | Yes |
| PUT | `/users/me` | Update name, photo, location | Yes |

### AI & FarmMind Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat` | Text message to FarmMind AI |
| POST | `/ai/voice` | Voice message + transcription |
| GET | `/ai/conversations` | Chat history list |
| GET | `/ai/conversations/{id}` | Load conversation thread |
| POST | `/ai/scan` | Crop disease image scan (multipart) |
| GET | `/ai/scan/history` | Past scan results |
| GET | `/ai/scan/sessions` | Scan session list |
| GET | `/ai/scan/{id}/chat` | Follow-up chat for a scan |
| GET | `/ai/alerts` | Smart farm alerts for current user |

### Market Intelligence

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/market/prices` | Current crop prices `?crop=&state=` |
| GET | `/market/predict` | AI price prediction `?crop=&state=` |
| GET | `/market/forecast` | Long-range forecast `?crop=&state=&months=` |
| GET | `/market/crops` | Available crops for price tracking |
| GET | `/mandi/prices` | Real mandi prices from data.gov.in `?commodity=&state=` |
| GET | `/mandi/prices/{commodity}/trend` | Historical price trend |
| GET | `/mandi/nearby` | Nearby mandis `?lat=&lon=` |
| GET | `/msp/rates` | MSP rates for all commodities |
| GET | `/msp/rates/{commodity}` | Single commodity MSP history |
| GET | `/msp/compare/{commodity}` | MSP vs market price comparison |

### AI Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/planner/generate` | AI-generate weekly farm plan |
| GET | `/planner/tasks` | Fetch today's and upcoming tasks |
| PATCH | `/planner/tasks/{id}` | Mark complete / reschedule |
| DELETE | `/planner/tasks/{id}` | Remove task |
| POST | `/soil/manual` | Submit soil test values for analysis |
| GET | `/soil/reports` | Past soil reports |
| GET | `/soil/recommendation` | AI fertilizer recommendation |
| GET | `/pest/alerts` | Location-based pest alerts `?lat=&lon=` |
| GET | `/pest/forecast` | Upcoming pest risk `?lat=&lon=` |
| POST | `/calendar/generate` | AI generate crop calendar |
| GET | `/calendar` | All calendar tasks |
| GET | `/calendar/today` | Today's calendar tasks |
| PATCH | `/calendar/tasks/{id}` | Update calendar task status |
| GET | `/irrigation/today` | Today's irrigation schedule |
| GET | `/irrigation/weekly` | Weekly irrigation plan |
| POST | `/irrigation/log` | Log completed irrigation event |
| POST | `/inputs/calculate` | Calculate fertilizer/seed quantities |
| GET | `/inputs/price-list` | Current input prices |
| POST | `/loan/kcc-eligibility` | KCC loan eligibility check |
| POST | `/loan/emi` | EMI calculation |
| GET | `/loan/compare` | Loan product comparison |
| GET | `/crops` | Crop database |
| GET | `/crops/search` | Search crops `?q=` |
| GET | `/crops/state-crops` | Crops by state `?state=` |

### Weather

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/weather` | Weather data `?lat=&lon=&lang=` — 1-hour TTL cache |

### AgriStore

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shop/categories` | Product category tree |
| GET | `/shop/products` | Browse products `?category=&page=` |
| GET | `/shop/products/{id}` | Product detail with variants and reviews |
| GET | `/shop/products/search` | Search products `?q=` |
| POST | `/orders` | Create order |
| POST | `/payments/initiate` | Initiate payment gateway |

### Animal Trade

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/animals` | Listings `?category=&lat=&lon=&page=` |
| GET | `/animals/{id}` | Animal detail |
| GET | `/animals/{id}/reviews` | Listing reviews |
| POST | `/animals` | Create listing (multipart with photos) |

### Rent

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rent/items` | Machinery listings `?category=&lat=&lon=&radius=` |
| GET | `/rent/items/{id}` | Machinery detail |
| GET | `/rent/items/{id}/reviews` | Machinery reviews |
| POST | `/rent/items` | Create machinery listing (multipart) |
| GET | `/rent/workers` | Labour listings `?lat=&lon=&radius=` |
| GET | `/rent/workers/{id}` | Worker profile |
| POST | `/rent/workers` | Register as worker |
| GET | `/rent/bookings` | Current user's bookings |
| GET | `/rent/bookings/{id}` | Booking detail |
| GET | `/users/me/rent-listings` | User's own machinery + worker listings |

### Veterinary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/doctors` | Vet listings `?lat=&lng=` | No |
| GET | `/doctors/nearby` | GPS-based vet search `?lat=&lng=` | No |
| GET | `/doctors/{id}` | Vet profile | No |
| GET | `/doctors/{id}/reviews` | Vet reviews | No |
| POST | `/doctors/{id}/reviews` | Submit review | Yes |

### Seller Portal

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/seller/dashboard` | Dashboard stats |
| GET | `/seller/stats` | Extended analytics |
| GET | `/seller/products` | Seller's product list |
| POST | `/seller/products` | Create product (multipart) |
| PUT | `/seller/products/{id}` | Update product |
| DELETE | `/seller/products/{id}` | Delete product |
| GET | `/seller/orders` | Order list `?status=` |
| GET | `/seller/orders/{id}` | Order detail |
| GET | `/seller/profile` | Seller profile |
| PUT | `/seller/profile` | Update seller profile |
| POST | `/seller/kyc` | Submit KYC documents (multipart) |
| PUT | `/seller/kyc` | Update KYC documents |

---

## 14. Localization & Accessibility

### Supported Languages

| Code | Language | Default States |
|------|----------|----------------|
| `en` | English | Default fallback for all states |
| `hi` | Hindi | UP, MP, Rajasthan, Haryana, Bihar, Uttarakhand |
| `ta` | Tamil | Tamil Nadu |
| `kn` | Kannada | Karnataka |
| `ml` | Malayalam | Kerala |
| `te` | Telugu | Andhra Pradesh, Telangana |
| `bn` | Bengali | West Bengal |
| `gu` | Gujarati | Gujarat |
| `pa` | Punjabi | Punjab |

State-language auto-detection: when user selects a state in Profile, the app suggests the corresponding regional language. All translation keys (~1000+ per language) stored in `src/i18n/lang/*.js`.

### Offline Behavior

| Section | Offline State |
|---------|---------------|
| Weather | Shows last cached data with "Last updated X min ago" badge |
| Market Prices | Shows last 24h cached data |
| AI Chat | "Connect to internet for AI responses" empty state |
| AgriStore | Cached product catalog browsable; checkout blocked with message |
| Animal Trade / Rent | Cached listings visible; contact and booking blocked |
| All screens | Persistent "No connection" banner at top of affected screens |

### Accessibility Guidelines

- **Touch targets:** Minimum 48×48 dp on all interactive elements.
- **Color contrast:** WCAG AA compliant — 4.5:1 for body text, 3:1 for large text/UI.
- **Screen reader:** All images have `accessibilityLabel`; interactive elements have `accessibilityRole` and `accessibilityHint`.
- **Dynamic text:** `allowFontScaling` enabled on all `Text` components.
- **High brightness:** High-contrast palette designed for outdoor direct sunlight readability.

### Local Storage Keys

| Key | Contents | TTL |
|-----|----------|-----|
| `farmeasy_access_token` | JWT access token | Until refresh |
| `farmeasy_refresh_token` | Refresh token | Long-lived |
| `farmeasy_user_id` | User ID string | Persistent |
| `farmeasy_farm_profile_v2` | Farm profile JSON (crops, soil, location) | Persistent |
| `farmeasy_language` | Language code | Persistent |
| `farmeasy_state` | Selected state name | Persistent |
| `fe_wx_{lat}_{lon}` | Weather response cache | 1 hour |
| `fe_loc` | GPS location cache | 15 minutes |

---

*FarmEasy — Powered by the farmer, for the farmer.*
