import React, { useEffect, useState } from "react";
import { View, Animated, StyleSheet, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../lib/theme";

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  style?: any;
}

/**
 * AuroraBackground reproduces the website's drifting radial aurora gradient
 * (@keyframes drift / @keyframes aurora in apps/web/src/app/globals.css).
 */
export function AuroraBackground({ children, style }: AuroraBackgroundProps) {
  const { colors, isDark, reduceMotion } = useTheme();
  const [driftAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) return;

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(driftAnim, {
          toValue: 1,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftAnim, {
          toValue: 0,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    driftLoop.start();
    return () => driftLoop.stop();
  }, [reduceMotion, driftAnim]);

  const translateX = driftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 50],
  });

  const translateY = driftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 30],
  });

  const scale = driftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      {/* Drifting aurora glow sphere */}
      <Animated.View
        style={[
          styles.glowAura,
          {
            transform: reduceMotion
              ? []
              : [{ translateX }, { translateY }, { scale }],
          },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={
            isDark
              ? ["rgba(169, 180, 245, 0.16)", "rgba(145, 183, 240, 0.08)", "transparent"]
              : ["rgba(85, 96, 201, 0.12)", "rgba(76, 129, 219, 0.06)", "transparent"]
          }
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.gradientFill}
        />
      </Animated.View>

      {/* Grid line texture overlay matching website login background */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  glowAura: {
    position: "absolute",
    top: -100,
    left: -80,
    width: 380,
    height: 380,
    borderRadius: 190,
    overflow: "hidden",
  },
  gradientFill: {
    width: "100%",
    height: "100%",
    borderRadius: 190,
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    opacity: 0.03,
    borderWidth: 0,
  },
});
