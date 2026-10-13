import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../lib/theme";
import { getRiskColor, getRiskSoftColor, pct } from "../lib/format";
import type { PlacementLevel } from "../lib/types";

interface RiskBadgeProps {
  level: PlacementLevel | string;
  prob?: number | null;
  label?: string;
  size?: "sm" | "md";
}

export function RiskBadge({ level, prob, label, size = "sm" }: RiskBadgeProps) {
  const { colors } = useTheme();

  const textColor = getRiskColor(level, colors);
  const bgColor = getRiskSoftColor(level, colors);
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          borderColor: textColor,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 10,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: textColor }]} />
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: isSmall ? 11 : 12,
            fontFamily: "BricolageGrotesque_600SemiBold",
          },
        ]}
      >
        {label ? `${label}: ` : ""}
        {level}
        {prob !== undefined && prob !== null ? ` (${pct(prob)})` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 0.5,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
