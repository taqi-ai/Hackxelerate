# Ascora Mobile Companion

The companion mobile app for Ascora (built with Expo, React Native, and Supabase) for faculty mentors and heads of department. Designed to run on real phones via **Expo Go** and in desktop browsers inside a phone-shaped simulator frame.

## Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the Supabase public credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-supabase-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```
*(These match `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the web app).*

### 3. Run in Desktop Browser (Simulator Frame)
```bash
npm run web
```
Open [http://localhost:8082](http://localhost:8082) in your browser.
On screens wider than 520 px, the app is presented inside an interactive device simulator (390×844 iPhone, 360×800 Android, or 768×1024 Tablet).

### 4. Run on a Physical Phone via Expo Go
1. Install **Expo Go** from the Google Play Store (Android) or App Store (iOS).
2. Start the development server:
   ```bash
   npm start
   ```
3. Scan the QR code using your phone camera or the Expo Go app (ensure both phone and laptop are on the same Wi-Fi).
4. If your phone and laptop are on different networks, run:
   ```bash
   npm run start:tunnel
   ```

### 5. Typecheck & Lint
```bash
npm run typecheck
npm run lint
```

## Generated Cohort Disclaimer

The students shown in this application are a generated sample cohort for evaluation purposes. No real student data is used.
