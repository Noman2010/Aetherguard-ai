# AetherGuard AI — Urban Air Quality & Winter Smog Assistant

A GenAI-powered decision-support assistant built to help families and urban communities navigate severe winter smog and urban air pollution with **low-emission daily routines**, **indoor air quality hacks**, **sustainable alternatives**, and **quantified direct-impact explanations**.

---

## Key Features

- **Live Atmospheric & Air Quality Telemetry**
  - Pulls real-time `US AQI`, `PM2.5`, `PM10`, `NO₂`, `SO₂`, `O₃`, `CO`, temperature, humidity, and wind speed from the Open-Meteo Air Quality & Weather APIs (no API key required), with browser GPS detection and global city search.
  - Compares pollutants against WHO 24-hour guideline thresholds and classifies **Winter Thermal Inversion** severity (`Low`, `Moderate`, `Severe`).
- **24-Hour Clean-Air Window Finder**
  - Scans the 24-hour hourly forecast to locate the cleanest 3-hour atmospheric mixing window so families can time errands, school commutes, and brief cross-ventilation safely.
- **Household & Lifestyle Context Engine**
  - Adapts plans dynamically across household role, size, health sensitivities (asthma, infants, seniors, outdoor workers), daily mobility, cooking/heating fuel, indoor filtration access, and home envelope tightness.
- **4-Pillar GenAI Action Plan + Direct Impact Explained**
  - Generates tailored actions across **Low-Emission Daily Routines**, **Indoor Air Quality Hacks** (e.g., \$38 DIY Corsi-Rosenthal filter cube, positive-pressure sleep sanctuary, unvented cooking mitigation), **Sustainable Alternatives**, and **Community Multipliers**.
  - Every recommendation displays quantified `Exposure Drop %`, `PM2.5 Avoided/day`, `CO₂ Cut/week`, a plain-language **Direct Impact Explained** summary, and an expandable **Science Mechanism** card.
- **Interactive Direct Impact Simulator**
  - Computes compounding personal PM2.5 exposure reduction (capped at 86% to model realistic diminishing returns), daily fine soot avoided (`mg/day`), Berkeley Earth cigarette-equivalent lung load spared, weekly CO₂e cut, and **100-Home Ward Scale** winter savings.
- **Live Gemini 2.5 Flash + Zero-Config Fallback**
  - Works out of the box using the grounded contextual synthesis engine, and supports one-click connection to **Google Gemini 2.5 Flash** (`gemini-2.5-flash`) via the **Prompt & Gemini API** inspector modal.
- **Severe Winter Smog Crisis Simulator**
  - One-click header toggle (`Simulate Winter Smog`) lets evaluators test extreme inversion conditions (`US AQI 338`, `218 µg/m³ PM2.5`, `3.4 km/h` wind) regardless of local weather on demo day.

---

## Architecture

```text
src/
├── types/airQuality.ts              # Telemetry, household profile, action & prompt types
├── services/
│   ├── airQualityService.ts         # Open-Meteo geocoding, AQI/weather fetch, inversion & fallback
│   └── genAiService.ts              # Structured prompt builder, Gemini 2.5 Flash JSON API & Q&A advisor
├── components/
│   ├── HeaderBar.tsx                # City search, GPS detect, Severe Smog Sim toggle, Prompt Modal trigger
│   ├── SmogTelemetryHero.tsx        # US AQI gauge, WHO multiples, 24h clean-air window bar chart
│   ├── ImpactSimulatorPanel.tsx     # Compounding PM2.5, lung-load & 100-home CO2e community calculator
│   ├── LifestyleConfigurator.tsx    # Interactive household, health, mobility, fuel & purifier controls
│   ├── ActionPlanBoard.tsx          # Filterable 4-pillar action cards + Commit Action toggles
│   ├── GenAIChatDrawer.tsx          # Context-grounded conversational advisor with starter prompts
│   └── PromptInspectorModal.tsx     # Live system prompt + telemetry JSON viewer & Gemini key config
└── App.tsx                          # State orchestration and real-time plan synthesis
```

---

## Local Setup

### Prerequisites
- Node.js 20+ and npm

### Install & Run
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```
The production bundle is output to `dist/` and can be deployed directly to Vercel, Netlify, or Cloudflare Pages (`Build command: npm run build`, `Output directory: dist`).
