import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "dark" | "light";

export interface ColorTokens {
  background: string;
  surface: string;
  card: string;
  cardBorder: string;
  border: string;
  text: string;
  mutedText: string;
  brand: string;
  brandSoft: string;
  riskHigh: string;
  riskHighSoft: string;
  riskMedium: string;
  riskMediumSoft: string;
  riskLow: string;
  riskLowSoft: string;
  inputBg: string;
}

export const DARK_TOKENS: ColorTokens = {
  background: "#07070b",
  surface: "#0b0b12",
  card: "#0e0e15",
  cardBorder: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.08)",
  text: "#f4f4f8",
  mutedText: "rgba(244,244,248,0.55)",
  brand: "#a9b4f5",
  brandSoft: "rgba(169,180,245,0.14)",
  riskHigh: "#f0786e",
  riskHighSoft: "rgba(240,120,110,0.16)",
  riskMedium: "#e8b84f",
  riskMediumSoft: "rgba(232,184,79,0.16)",
  riskLow: "#6fcf97",
  riskLowSoft: "rgba(111,207,151,0.16)",
  inputBg: "#14141e",
};

export const LIGHT_TOKENS: ColorTokens = {
  background: "#f6f6fb",
  surface: "#ffffff",
  card: "#ffffff",
  cardBorder: "rgba(20,20,40,0.08)",
  border: "rgba(20,20,40,0.08)",
  text: "#14141f",
  mutedText: "rgba(20,20,31,0.55)",
  brand: "#5560c9",
  brandSoft: "rgba(85,96,201,0.12)",
  riskHigh: "#c8372d",
  riskHighSoft: "rgba(200,55,45,0.14)",
  riskMedium: "#a8730a",
  riskMediumSoft: "rgba(168,115,10,0.14)",
  riskLow: "#1f8a4c",
  riskLowSoft: "rgba(31,138,76,0.14)",
  inputBg: "#efeff6",
};

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorTokens;
  setMode: (mode: ThemeMode) => Promise<void>;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => Promise<void>;
  hapticsEnabled: boolean;
  setHapticsEnabled: (v: boolean) => Promise<void>;
  defaultHours: number;
  setDefaultHours: (h: number) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  isDark: true,
  colors: DARK_TOKENS,
  setMode: async () => {},
  reduceMotion: false,
  setReduceMotion: async () => {},
  hapticsEnabled: true,
  setHapticsEnabled: async () => {},
  defaultHours: 3,
  setDefaultHours: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [defaultHours, setDefaultHoursState] = useState(3);

  useEffect(() => {
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem("ascora_theme_mode");
        if (savedMode === "dark" || savedMode === "light" || savedMode === "system") {
          setModeState(savedMode);
        }
        const savedMotion = await AsyncStorage.getItem("ascora_reduce_motion");
        if (savedMotion !== null) {
          setReduceMotionState(savedMotion === "true");
        }
        const savedHaptics = await AsyncStorage.getItem("ascora_haptics");
        if (savedHaptics !== null) {
          setHapticsEnabledState(savedHaptics === "true");
        }
        const savedHours = await AsyncStorage.getItem("ascora_default_hours");
        if (savedHours !== null) {
          const parsed = parseFloat(savedHours);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
            setDefaultHoursState(parsed);
          }
        }
      } catch {
        // Fall back to defaults
      }
    })();
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    await AsyncStorage.setItem("ascora_theme_mode", m);
  };

  const setReduceMotion = async (v: boolean) => {
    setReduceMotionState(v);
    await AsyncStorage.setItem("ascora_reduce_motion", v ? "true" : "false");
  };

  const setHapticsEnabled = async (v: boolean) => {
    setHapticsEnabledState(v);
    await AsyncStorage.setItem("ascora_haptics", v ? "true" : "false");
  };

  const setDefaultHours = async (h: number) => {
    setDefaultHoursState(h);
    await AsyncStorage.setItem("ascora_default_hours", h.toString());
  };

  const isDark = mode === "dark" || (mode === "system" && systemScheme !== "light");
  const colors = isDark ? DARK_TOKENS : LIGHT_TOKENS;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        colors,
        setMode,
        reduceMotion,
        setReduceMotion,
        hapticsEnabled,
        setHapticsEnabled,
        defaultHours,
        setDefaultHours,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
