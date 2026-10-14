import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTheme } from "../lib/theme";

interface BrandMarkProps {
  compact?: boolean;
  size?: number;
  showSubtitle?: boolean;
}

/**
 * BrandMark: Official Ascora brand mark, matching apps/web/src/components/brand.tsx.
 * Renders the official Ascora mark on a dark tile (#07070b) with subtle ring border.
 */
export function BrandMark({
  compact = false,
  size = 36,
  showSubtitle = false,
}: BrandMarkProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
          },
        ]}
      >
        <Image
          source={require("../../assets/mark.png")}
          style={{
            width: Math.round(size * 0.62),
            height: Math.round(size * 0.5),
          }}
          resizeMode="contain"
        />
      </View>
      {!compact && (
        <View style={styles.textWrap}>
          <Text
            style={[
              styles.brandName,
              { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            Ascora
          </Text>
          {showSubtitle && (
            <Text style={[styles.brandSubtitle, { color: colors.mutedText }]}>
              Student Success Intelligence
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tile: {
    backgroundColor: "#07070b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  textWrap: {
    justifyContent: "center",
  },
  brandName: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
});
