import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../src/lib/theme";
import { playSound } from "../src/lib/sound";

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    playSound("whoosh");
    router.push("/sign-in");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background ambient radial glow */}
      <View style={styles.glowAura} pointerEvents="none">
        <LinearGradient
          colors={
            isDark
              ? ["rgba(169, 180, 245, 0.15)", "transparent"]
              : ["rgba(85, 96, 201, 0.12)", "transparent"]
          }
          style={styles.glowGradient}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          },
        ]}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <Image
            source={require("../assets/icon-512-transparent.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={[styles.badgePill, { backgroundColor: colors.brandSoft }]}>
            <Feather name="zap" size={12} color={colors.brand} />
            <Text style={[styles.badgeText, { color: colors.brand }]}>
              HACXLERATE 2026 · CHALLENGE 04
            </Text>
          </View>
        </View>

        {/* Hero Typography */}
        <View style={styles.heroSection}>
          <Text
            style={[
              styles.heroTitle,
              { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            Student success at the speed of thought
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedText }]}>
            Ascora bridges campus ERP records, attendance registers, and LMS activity logs to give faculty leaders proactive early warnings and measurable interventions.
          </Text>
        </View>

        {/* Feature Cards Showcase */}
        <View style={styles.featuresList}>
          <View
            style={[
              styles.featureCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.featureIconWrap, { backgroundColor: colors.brandSoft }]}>
              <Feather name="activity" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  styles.featureTitle,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                Proactive Early Warning
              </Text>
              <Text style={[styles.featureDesc, { color: colors.mutedText }]}>
                Detects academic drops and silent decliners weeks before exam scores reflect disengagement.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.featureCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.featureIconWrap, { backgroundColor: colors.riskLowSoft }]}>
              <Feather name="shield" size={18} color={colors.riskLow} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  styles.featureTitle,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                Explainable SHAP Drivers
              </Text>
              <Text style={[styles.featureDesc, { color: colors.mutedText }]}>
                No black boxes: mentors see exactly which factors raise or lower student risk with counterfactuals.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.featureCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.featureIconWrap, { backgroundColor: colors.brandSoft }]}>
              <Feather name="calendar" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  styles.featureTitle,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                Knapsack Meeting Planner
              </Text>
              <Text style={[styles.featureDesc, { color: colors.mutedText }]}>
                Allocates available faculty hours to the highest-priority students to maximize cohort outcomes.
              </Text>
            </View>
          </View>
        </View>

        {/* Call to Action Section */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.brand }]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Get started with Ascora</Text>
            <Feather name="arrow-right" size={18} color="#07070b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.cardBorder }]}
            onPress={() => {
              playSound("tap");
              router.push("/sign-in");
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.mutedText }]}>
              Already have an evaluation account? <Text style={{ color: colors.brand, fontWeight: "600" }}>Sign in</Text>
            </Text>
          </TouchableOpacity>

          <Text style={[styles.sampleCohortText, { color: colors.mutedText }]}>
            The students shown are a generated sample cohort. Built for KPMG Smart Campus Analytics challenge at HacXLerate 2026.
          </Text>
        </View>
      </ScrollView>
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
    left: -50,
    right: -50,
    height: 380,
  },
  glowGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 200,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 72,
    height: 72,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroSection: {
    alignItems: "center",
    gap: 10,
    textAlign: "center",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    textAlign: "center",
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
  featuresList: {
    gap: 10,
    marginTop: 6,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  ctaSection: {
    gap: 12,
    marginTop: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 16,
  },
  primaryBtnText: {
    color: "#07070b",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
  },
  sampleCohortText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
});
