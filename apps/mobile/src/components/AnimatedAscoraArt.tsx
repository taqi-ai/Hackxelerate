import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Easing } from "react-native";
import Svg, { Circle, Rect, Path, Ellipse } from "react-native-svg";
import { useTheme } from "../lib/theme";


export type ArtKind =
  | "bars"
  | "orbit"
  | "nodes"
  | "grid"
  | "shield"
  | "chat"
  | "calendar"
  | "stack";

export function getArtKindFor(title: string): ArtKind {
  const map: Record<string, ArtKind> = {
    Home: "orbit",
    "Campus Intelligence": "orbit",
    Students: "orbit",
    "Ask AI": "chat",
    "Voice AI": "chat",
    Planner: "calendar",
    "This Week": "calendar",
    Hub: "stack",
    "Platform Hub": "stack",
    "Student Overview": "orbit",
    "My Academics": "bars",
    "Plan & Improve": "grid",
    "Schedule & Tasks": "calendar",
    "Data & Portal": "stack",
    Settings: "grid",
    About: "shield",
  };
  return map[title] ?? "orbit";
}

interface AnimatedAscoraArtProps {
  kind: ArtKind;
  width?: number;
  height?: number;
}

/**
 * AnimatedAscoraArt recreates the web application's PageArt SVG components
 * with smooth native looping floating/rotation micro-animations.
 */
export function AnimatedAscoraArt({
  kind,
  width = 220,
  height = 120,
}: AnimatedAscoraArtProps) {
  const { colors, reduceMotion } = useTheme();
  const [animState] = useState(() => ({
    float: new Animated.Value(0),
    pulse: new Animated.Value(0),
  }));

  useEffect(() => {
    if (reduceMotion) return;

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(animState.float, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(animState.float, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(animState.pulse, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animState.pulse, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [reduceMotion, animState]);

  const translateY = animState.float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const scale = animState.pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const brandColor = colors.brand;
  const chart2 = colors.chart2;
  const chart3 = colors.chart3;
  const chart4 = colors.chart4;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          width,
          height,
          transform: reduceMotion ? [] : [{ translateY }, { scale }],
        },
      ]}
      pointerEvents="none"
    >
      <Svg viewBox="0 0 220 120" width="100%" height="100%">
        {/* Soft background aura circles */}
        <Circle cx="170" cy="40" r="70" fill={brandColor} opacity={0.08} />
        <Circle cx="170" cy="40" r="44" fill={brandColor} opacity={0.12} />

        {/* Kind: bars */}
        {kind === "bars" &&
          [30, 52, 38, 74, 60, 92].map((h, i) => (
            <Rect
              key={i}
              x={70 + i * 24}
              y={110 - h}
              width={14}
              height={h}
              rx={7}
              fill={i % 2 ? chart2 : brandColor}
              opacity={i % 2 ? 0.75 : 0.85}
            />
          ))}

        {/* Kind: orbit */}
        {kind === "orbit" && (
          <>
            <Ellipse
              cx="150"
              cy="62"
              rx="70"
              ry="26"
              stroke={brandColor}
              strokeWidth="1.5"
              transform="rotate(-18 150 62)"
              opacity={0.4}
            />
            <Ellipse
              cx="150"
              cy="62"
              rx="46"
              ry="16"
              stroke={chart2}
              strokeWidth="1.5"
              transform="rotate(-18 150 62)"
              opacity={0.5}
            />
            <Circle cx="150" cy="62" r="13" fill={brandColor} opacity={0.8} />
            <Circle cx="205" cy="44" r="5" fill={chart3} opacity={0.9} />
            <Circle cx="98" cy="78" r="4" fill={chart4} opacity={0.9} />
          </>
        )}

        {/* Kind: nodes */}
        {kind === "nodes" && (
          <>
            <Path
              d="M100 80 L150 38 L196 70 L150 98 Z"
              stroke={brandColor}
              strokeWidth="1.5"
              opacity={0.35}
            />
            {[
              [100, 80, 9, 0.6],
              [150, 38, 13, 0.75],
              [196, 70, 8, 0.55],
              [150, 98, 10, 0.65],
            ].map(([x, y, r, o], idx) => (
              <Circle
                key={idx}
                cx={x}
                cy={y}
                r={r}
                fill={brandColor}
                opacity={o}
              />
            ))}
            <Circle
              cx="150"
              cy="38"
              r="22"
              stroke={chart2}
              strokeWidth="1.5"
              opacity={0.4}
            />
          </>
        )}

        {/* Kind: grid */}
        {kind === "grid" &&
          Array.from({ length: 4 }).flatMap((_, r) =>
            Array.from({ length: 7 }).map((__, k) => (
              <Rect
                key={`${r}-${k}`}
                x={72 + k * 20}
                y={22 + r * 22}
                width="15"
                height="15"
                rx="5"
                fill={
                  (r * 3 + k * 5) % 7 < 2
                    ? brandColor
                    : (r + k) % 3 === 0
                    ? chart2
                    : brandColor
                }
                opacity={
                  (r * 3 + k * 5) % 7 < 2
                    ? 0.75
                    : (r + k) % 3 === 0
                    ? 0.45
                    : 0.18
                }
              />
            ))
          )}

        {/* Kind: shield */}
        {kind === "shield" && (
          <>
            <Path
              d="M150 16 L192 32 V62 C192 86 174 102 150 110 C126 102 108 86 108 62 V32 Z"
              fill={brandColor}
              opacity={0.2}
              stroke={brandColor}
              strokeWidth="1.5"
            />
            <Path
              d="M132 62 l13 13 l25 -28"
              stroke={chart4}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Kind: chat */}
        {kind === "chat" && (
          <>
            <Rect
              x="84"
              y="22"
              width="92"
              height="40"
              rx="16"
              fill={brandColor}
              opacity={0.3}
            />
            <Rect
              x="102"
              y="38"
              width="46"
              height="6"
              rx="3"
              fill={brandColor}
              opacity={0.8}
            />
            <Rect
              x="120"
              y="68"
              width="88"
              height="34"
              rx="14"
              fill={chart2}
              opacity={0.4}
            />
            <Rect
              x="136"
              y="82"
              width="40"
              height="6"
              rx="3"
              fill={chart2}
              opacity={0.9}
            />
            <Path
              d="M192 14 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z"
              fill={brandColor}
              opacity={0.85}
            />
          </>
        )}

        {/* Kind: calendar */}
        {kind === "calendar" && (
          <>
            <Rect
              x="96"
              y="22"
              width="100"
              height="84"
              rx="16"
              fill={brandColor}
              opacity={0.15}
              stroke={brandColor}
              strokeWidth="1.5"
            />
            <Path d="M96 46 H196" stroke={brandColor} strokeWidth="1.5" opacity={0.45} />
            {Array.from({ length: 10 }).map((_, i) => (
              <Circle
                key={i}
                cx={114 + (i % 5) * 18}
                cy={64 + Math.floor(i / 5) * 18}
                r={i === 6 ? 6 : 3.5}
                fill={brandColor}
                opacity={i === 6 ? 0.9 : 0.4}
              />
            ))}
          </>
        )}

        {/* Kind: stack */}
        {kind === "stack" && (
          <>
            {[0, 1, 2].map((i) => (
              <Rect
                key={i}
                x={86 + i * 10}
                y={78 - i * 22}
                width="96"
                height="22"
                rx="9"
                fill={i === 2 ? brandColor : i === 1 ? chart2 : brandColor}
                opacity={i === 2 ? 0.75 : i === 1 ? 0.45 : 0.28}
                stroke={brandColor}
                strokeWidth="1"
              />
            ))}
            <Path
              d="M184 34 V62"
              stroke={chart4}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="1 7"
              opacity={0.8}
            />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
  },
});
