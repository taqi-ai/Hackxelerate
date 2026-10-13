import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from "react-native";

interface WebSimulatorWrapperProps {
  children: React.ReactNode;
}

type DevicePreset = "iphone" | "android" | "tablet";

interface PresetConfig {
  name: string;
  width: number;
  height: number;
  hasNotch: boolean;
}

const PRESETS: Record<DevicePreset, PresetConfig> = {
  iphone: {
    name: "iPhone 14 (390×844)",
    width: 390,
    height: 844,
    hasNotch: true,
  },
  android: {
    name: "Android (360×800)",
    width: 360,
    height: 800,
    hasNotch: true,
  },
  tablet: {
    name: "Tablet (768×1024)",
    width: 768,
    height: 1024,
    hasNotch: false,
  },
};

export function WebSimulatorWrapper({ children }: WebSimulatorWrapperProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [device, setDevice] = useState<DevicePreset>("iphone");

  // On native platforms (iOS/Android), pass children directly
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  // On small mobile viewports, render full-screen with no frame
  if (windowWidth <= 520) {
    return <View style={styles.fullscreenRoot}>{children}</View>;
  }

  const currentPreset = PRESETS[device];
  const maxHeight = Math.min(currentPreset.height, windowHeight - 90);
  const frameWidth = currentPreset.width;

  return (
    <View style={styles.webContainer}>
      {/* Global CSS to hide scrollbars on web */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
            *::-webkit-scrollbar { display: none !important; width: 0px !important; height: 0px !important; }
          `,
        }}
      />
      {/* Simulator Toolbar in page margin */}
      <View style={styles.toolbar}>
        <View style={styles.titleWrap}>
          <View style={styles.pulseDot} />
          <Text style={styles.toolbarTitle}>ASCORA MOBILE SIMULATOR</Text>
        </View>

        <View style={styles.devicesRow}>
          {(["iphone", "android", "tablet"] as DevicePreset[]).map((p) => {
            const isActive = device === p;
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.deviceBtn,
                  isActive && styles.deviceBtnActive,
                ]}
                onPress={() => setDevice(p)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.deviceBtnText,
                    isActive && styles.deviceBtnTextActive,
                  ]}
                >
                  {PRESETS[p].name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main Stage */}
      <View style={styles.stage}>
        <View
          style={[
            styles.phoneFrame,
            {
              width: frameWidth,
              height: maxHeight,
              borderRadius: currentPreset.hasNotch ? 44 : 24,
            },
          ]}
        >
          {/* Top Notch Pill */}
          {currentPreset.hasNotch && (
            <View style={styles.notch}>
              <View style={styles.cameraDot} />
            </View>
          )}

          {/* Viewport for the application */}
          <View style={styles.viewport}>{children}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenRoot: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  webContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#030306",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "rgba(14, 14, 21, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    zIndex: 100,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#6fcf97",
  },
  toolbarTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#a9b4f5",
  },
  devicesRow: {
    flexDirection: "row",
    gap: 8,
  },
  deviceBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  deviceBtnActive: {
    backgroundColor: "#a9b4f5",
    borderColor: "#a9b4f5",
  },
  deviceBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(244, 244, 248, 0.75)",
  },
  deviceBtnTextActive: {
    color: "#07070b",
    fontWeight: "700",
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  phoneFrame: {
    position: "relative",
    backgroundColor: "#07070b",
    overflow: "hidden",
    borderWidth: 10,
    borderColor: "#12121c",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
    elevation: 24,
  },
  notch: {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: [{ translateX: -55 }],
    width: 110,
    height: 24,
    backgroundColor: "#12121c",
    borderRadius: 999,
    zIndex: 999,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 14,
  },
  cameraDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#030306",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  viewport: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
