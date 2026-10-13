# Ascora Mobile Companion

The companion mobile app for Ascora (built with Expo, React Native, and Supabase) for faculty mentors and heads of department. Designed to run on real phones via Expo Go and in desktop browsers inside an interactive phone-shaped simulator frame.

## Setup Instructions

### 1. Install dependencies
```bash
cd apps/mobile
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the Supabase public credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xomihahbrxacgrwclect.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(These match `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the web app).*

### 3. Run in Desktop Browser (Simulator Frame)
```bash
npm run web
```
Open [http://localhost:8082](http://localhost:8082) in your browser.
On screens wider than 520 px, the app is presented inside an interactive device simulator (390x844 iPhone 14, 360x800 Android, or 768x1024 Tablet).

### 4. Run on a Physical Phone via Expo Go
1. Install Expo Go from the Google Play Store (Android) or App Store (iOS).
2. Start the development server:
   ```bash
   npx expo start
   ```
3. Scan the QR code using your phone camera or the Expo Go app (ensure both phone and laptop are on the same Wi-Fi network).
4. If your phone and laptop are on different networks, run:
   ```bash
   npx expo start --tunnel
   ```

### 5. Verification Commands
```bash
npm run typecheck      # TypeScript compilation check (tsc --noEmit)
npm run lint           # ESLint verification (expo lint)
```

## Directory Structure

```
apps/mobile/
├── app/
│   ├── +html.tsx              # Web root with scrollbar suppression & responsive simulator
│   ├── _layout.tsx            # Global AuthGate, font loaders, and Stack navigator
│   ├── welcome.tsx            # "Get Started with Ascora" onboarding page
│   ├── sign-in.tsx            # Branded sign-in screen with one-tap demo role switcher
│   ├── (tabs)/
│   │   ├── _layout.tsx        # 5-tab bar with Android 3-button safe area insets
│   │   ├── index.tsx          # Home: Asia/Kolkata greeting, stat tiles, week strip, Meet First
│   │   ├── students.tsx       # Directory: search, risk filter chips, virtualized FlatList
│   │   ├── ai.tsx             # Voice AI: particle dome, glowing waveforms, real-time insights
│   │   ├── this-week.tsx      # Planner: greedy knapsack scheduler, hours stepper, modal logging
│   │   ├── hub.tsx            # Hub: Segments, ML models, Fairness/Privacy, Data health
│   │   └── settings.tsx       # Scope, theme switcher (dark/light), motion/haptic toggles
│   ├── student/
│   │   └── [id].tsx           # Student 360: ScoreRing, SHAP drivers, recourse, LMS chart, notes
│   └── about.tsx              # KPMG Challenge 04 credentials and roster
├── assets/                    # App icons, splash screens, logos
└── src/
    ├── components/            # ScoreRing, RiskBadge, DriverList, LmsBarChart, WebSimulatorWrapper...
    └── lib/                   # api.ts, supabase.ts, theme.tsx, sound.ts, haptics.ts, format.ts...
```

## Demo Accounts

| Role | Email | Password | Scope |
|---|---|---|---|
| HOD / Admin | `admin@ascora.test` | `AscoraDemo#2026` | Campus-wide (all 1,200 students) |
| Faculty mentor | `mentor@ascora.test` | `AscoraDemo#2026` | Assigned cohort (64 students) |

## Generated Cohort Disclaimer

The students shown in this application are a generated sample cohort for evaluation purposes. No real student data is used.
