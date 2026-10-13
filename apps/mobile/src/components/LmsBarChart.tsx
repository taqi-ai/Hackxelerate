import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useTheme } from "../lib/theme";
import type { LMSActivity } from "../lib/types";

export function LmsBarChart({ lms }: { lms: LMSActivity | null }) {
  const { colors } = useTheme();

  // 12 weeks array
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const found = lms?.weekly?.find((w) => w.week === i + 1);
    return {
      week: i + 1,
      logins: found?.logins || 0,
    };
  });

  const maxLogins = Math.max(...weeks.map((w) => w.logins), 5);
  const chartHeight = 80;
  const barWidth = 14;
  const gap = 8;
  const svgWidth = 12 * (barWidth + gap);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>12-week LMS login frequency</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>Peak: {maxLogins} logins/wk</Text>
      </View>

      <View style={styles.chartWrapper}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${svgWidth} ${chartHeight}`}>
          {weeks.map((w, index) => {
            const h = Math.max(4, (w.logins / maxLogins) * (chartHeight - 10));
            const x = index * (barWidth + gap) + 4;
            const y = chartHeight - h;
            const isHigh = w.logins >= maxLogins * 0.6;
            const isLow = w.logins === 0;

            const barColor = isLow ? colors.riskHigh : isHigh ? colors.brand : colors.mutedText;

            return (
              <Rect
                key={w.week}
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={3}
                fill={barColor}
                opacity={isLow ? 0.4 : 0.85}
              />
            );
          })}
        </Svg>
      </View>

      <View style={styles.labelRow}>
        <Text style={[styles.weekLabel, { color: colors.mutedText }]}>W1</Text>
        <Text style={[styles.weekLabel, { color: colors.mutedText }]}>W6</Text>
        <Text style={[styles.weekLabel, { color: colors.mutedText }]}>W12</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 11,
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 80,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  weekLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});
