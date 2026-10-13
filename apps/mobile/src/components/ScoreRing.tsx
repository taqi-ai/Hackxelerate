import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../lib/theme";
import { scoreToneColor } from "../lib/format";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 10,
  label = "",
}: ScoreRingProps) {
  const { colors, reduceMotion } = useTheme();
  const [animScore, setAnimScore] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    let start = 0;
    const duration = 650;
    const steps = 25;
    const increment = score / steps;
    const intervalTime = duration / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setAnimScore(score);
        clearInterval(timer);
      } else {
        setAnimScore(Math.round(start));
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [score, reduceMotion]);

  const rawScore = reduceMotion ? score : animScore;
  const displayScore = Math.round(Number(rawScore || 0));

  const radius = Math.max((size - strokeWidth) / 2, 1);
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(displayScore / 100, 0), 1);
  const strokeDashoffset = circumference - progress * circumference;
  const strokeColor = scoreToneColor(displayScore, colors);

  // Dynamically calculate font size based on ring diameter
  const fontSize =
    size <= 48
      ? 13
      : size <= 60
      ? 15
      : size <= 90
      ? 22
      : 30;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        style={[styles.svg, { transform: [{ rotate: "-90deg" }] }]}
      >
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.cardBorder}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      <View style={styles.content}>
        <Text
          style={[
            styles.scoreText,
            {
              fontSize,
              lineHeight: fontSize + 2,
              color: strokeColor,
              fontFamily: "BricolageGrotesque_700Bold",
            },
          ]}
        >
          {displayScore}
        </Text>
        {label ? (
          <Text
            numberOfLines={1}
            style={[styles.labelText, { color: colors.mutedText }]}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  content: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
    includeFontPadding: false,
  },
  labelText: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
    textAlign: "center",
  },
});
