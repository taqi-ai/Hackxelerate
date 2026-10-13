import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import type { Drivers } from "../lib/types";

export function DriverList({ drivers }: { drivers: Drivers | null }) {
  const { colors } = useTheme();

  if (!drivers || (!drivers.raises.length && !drivers.lowers.length)) {
    return (
      <Text style={[styles.emptyText, { color: colors.mutedText }]}>
        No strong drivers. This student sits close to the cohort average on every model input.
      </Text>
    );
  }

  const allDrivers = [...drivers.raises, ...drivers.lowers];
  const maxImpact = Math.max(...allDrivers.map((d) => Math.abs(d.impact)), 0.01);

  return (
    <View style={styles.container}>
      {drivers.raises.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.riskHigh }]}>
            Increasing risk
          </Text>
          {drivers.raises.map((d, index) => {
            const barWidth = Math.min(100, Math.max(10, (100 * Math.abs(d.impact)) / maxImpact));
            return (
              <View key={`${d.feature}-${index}`} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={styles.headerRow}>
                  <View style={styles.titleWrap}>
                    <Feather name="arrow-up-right" size={15} color={colors.riskHigh} style={styles.icon} />
                    <Text style={[styles.label, { color: colors.text }]}>{d.label}</Text>
                  </View>
                  <Text style={[styles.valText, { color: colors.text }]}>
                    {d.value_text}{" "}
                    <Text style={{ color: colors.mutedText, fontSize: 11 }}>
                      (cohort {d.median_text})
                    </Text>
                  </Text>
                </View>

                {/* Impact bar */}
                <View style={[styles.barTrack, { backgroundColor: colors.cardBorder }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${barWidth}%`,
                        backgroundColor: colors.riskHigh,
                      },
                    ]}
                  />
                </View>

                {d.actionable && (
                  <View style={[styles.actionableBadge, { backgroundColor: colors.brandSoft }]}>
                    <Feather name="check-circle" size={12} color={colors.brand} />
                    <Text style={[styles.actionableText, { color: colors.brand }]}>
                      Something a mentor can act on
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {drivers.lowers.length > 0 && (
        <View style={[styles.section, { marginTop: 12 }]}>
          <Text style={[styles.sectionTitle, { color: colors.riskLow }]}>
            Working in their favour
          </Text>
          {drivers.lowers.map((d, index) => {
            const barWidth = Math.min(100, Math.max(10, (100 * Math.abs(d.impact)) / maxImpact));
            return (
              <View key={`${d.feature}-${index}`} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={styles.headerRow}>
                  <View style={styles.titleWrap}>
                    <Feather name="arrow-down-right" size={15} color={colors.riskLow} style={styles.icon} />
                    <Text style={[styles.label, { color: colors.text }]}>{d.label}</Text>
                  </View>
                  <Text style={[styles.valText, { color: colors.text }]}>
                    {d.value_text}{" "}
                    <Text style={{ color: colors.mutedText, fontSize: 11 }}>
                      (cohort {d.median_text})
                    </Text>
                  </Text>
                </View>

                <View style={[styles.barTrack, { backgroundColor: colors.cardBorder }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${barWidth}%`,
                        backgroundColor: colors.riskLow,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  icon: {
    marginTop: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  valText: {
    fontSize: 12,
    fontWeight: "500",
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    width: "100%",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  actionableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  actionableText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
