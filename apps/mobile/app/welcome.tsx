import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../src/lib/theme";
import { playSound } from "../src/lib/sound";
import { BrandMark } from "../src/components/BrandMark";
import { AuroraBackground } from "../src/components/AuroraBackground";
import { AnimatedAscoraArt } from "../src/components/AnimatedAscoraArt";

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();


  const handleGetStarted = () => {
    playSound("whoosh");
    router.push("/sign-in");
  };

  return (
    <AuroraBackground>
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
        {/* Brand Header with Official Dark Tile Mark */}
        <View style={styles.header}>
          <BrandMark size={40} showSubtitle={false} />
          <View style={[styles.badgePill, { backgroundColor: colors.brandSoft }]}>
            <Feather name="zap" size={12} color={colors.brand} />
            <Text style={[styles.badgeText, { color: colors.brand }]}>
              HACXLERATE 2026 · CHALLENGE 04
            </Text>
          </View>
        </View>

        {/* Hero Section with Official Logo Banner & PageArt Graphic */}
        <View style={styles.heroSection}>
          <View style={styles.artContainer}>
            <AnimatedAscoraArt kind="orbit" width={220} height={110} />
          </View>

          <Text
            style={[
              styles.heroTitle,
              { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            From early warning to real intervention.
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedText }]}>
            Ascora joins ERP, attendance, LMS, placement, skills, clubs and feedback into one view of every student, explains who needs support and why, and tracks what mentors do about it.
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
                Explainable Drivers
              </Text>
              <Text style={[styles.featureDesc, { color: colors.mutedText }]}>
                Every score shows its SHAP drivers and counterfactuals—no black boxes.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.featureCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.featureIconWrap, { backgroundColor: colors.riskHighSoft }]}>
              <Feather name="shield" size={18} color={colors.riskHigh} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  styles.featureTitle,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                Two Distinct Risks
              </Text>
              <Text style={[styles.featureDesc, { color: colors.mutedText }]}>
                Academic risk and placement readiness are evaluated separately, never blended.
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
              <Feather name="calendar" size={18} color={colors.riskLow} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  styles.featureTitle,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                Audited & Role-Based
              </Text>
              <Text style={[styles.featureDesc, { color: colors.mutedText }]}>
                HOD whole-campus access vs. Mentor cohort privacy with full intervention audit logs.
              </Text>
            </View>
          </View>
        </View>

        {/* Call to Action Section */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.brand }]}
            onPress={handleGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get started</Text>
            <Feather name="arrow-right" size={18} color="#07070b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { backgroundColor: colors.surface, borderColor: colors.cardBorder },
            ]}
            onPress={() => {
              playSound("tap");
              router.push("/about");
            }}
            activeOpacity={0.7}
          >
            <Feather name="info" size={16} color={colors.mutedText} />
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              About Ascora & Challenge 04
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Meta */}
        <Text style={[styles.footerText, { color: colors.mutedText }]}>
          Ascora · KPMG Challenge 04 · byteXL HacXLerate 2026
        </Text>
      </ScrollView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroSection: {
    gap: 12,
    marginTop: 4,
  },
  artContainer: {
    alignItems: "center",
    marginBottom: -8,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  featuresList: {
    gap: 12,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  featureDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  ctaSection: {
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#07070b",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footerText: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 4,
  },
});
