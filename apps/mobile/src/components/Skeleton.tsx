import React from "react";
import { View, StyleSheet, DimensionValue } from "react-native";
import { useTheme } from "../lib/theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.cardBorder,
        },
        style,
      ]}
    />
  );
}

export function StudentRowSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderColor: colors.cardBorder }]}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.content}>
        <Skeleton width="60%" height={16} borderRadius={4} />
        <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={64} height={24} borderRadius={999} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  content: {
    flex: 1,
  },
});
