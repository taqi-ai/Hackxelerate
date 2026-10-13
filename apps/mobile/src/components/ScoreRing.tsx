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
  label = "Success score",
}: ScoreRingProps) {
  const { colors, reduceMotion } = useTheme();
  const [animScore, setAnimScore] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    let start = 0;
    const duration = 800;
    const steps = 30;
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

  const displayScore = reduceMotion ? score : animScore;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(displayScore / 100, 0), 1);
  const strokeDashoffset = circumference - progress * circumference;
  const strokeColor = scoreToneColor(score, colors);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
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
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.content}>
        <Text
          style={[
            styles.scoreText,
            { color: strokeColor, fontFamily: "BricolageGrotesque_700Bold" },
          ]}
        >
          {displayScore}
        </Text>
        <Text style={[styles.labelText, { color: colors.mutedText }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  labelText: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
