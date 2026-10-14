import React, { useState } from "react";
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
import { useTheme } from "../../src/lib/theme";
import { playSound } from "../../src/lib/sound";
import { BrandMark } from "../../src/components/BrandMark";
import { AnimatedAscoraArt } from "../../src/components/AnimatedAscoraArt";

type HubSection = "all" | "segments" | "models" | "fairness" | "data";

const SEGMENT_CARDS = [
  {
    id: 1,
    persona: "Silent LMS Ghost",
    count: 18,
    action: "Proactive 15-min faculty check-in before exams",
    traits: ["High past CGPA", "0 logins in 14 days", "Missed quiz"],
    riskTone: "riskMedium",
  },
  {
    id: 2,
    persona: "Gatekeeper Subject Struggle",
    count: 34,
    action: "Assign peer tutoring in Data Structures and Math",
    traits: ["Backlogs >= 1", "Low internal marks", "High attendance"],
    riskTone: "riskHigh",
  },
  {
    id: 3,
    persona: "Placement Skill Drift",
    count: 27,
    action: "Schedule mock interview & soft-skills workshop",
    traits: ["Good academics", "Low coding score", "0 mock interviews"],
    riskTone: "riskMedium",
  },
  {
    id: 4,
    persona: "Consistent High-Flyers",
    count: 45,
    action: "Encourage competitive hackathons and research labs",
    traits: ["CGPA > 8.5", "High LMS activity", "Active club lead"],
    riskTone: "riskLow",
  },
];

const MODEL_SPECS = [
  {
    name: "Academic Risk Classifier",
    algorithm: "LightGBM + SHAP TreeExplainer",
    target: "Predicts semester backlogs & SGPA drops",
    accuracy: "92.4% AUC-ROC",
    topFeatures: "Internal exam delta, Core attendance, Gatekeeper marks",
  },
  {
    name: "Placement Readiness Model",
    algorithm: "Gradient Boosted Trees (Calibrated)",
    target: "Predicts Day-1 company interview clearance",
    accuracy: "89.1% AUC-ROC",
    topFeatures: "Mock rating, Coding percentile, Aptitude score",
  },
  {
    name: "Counterfactual Recourse Engine",
    algorithm: "Actionable constrained search (MACE)",
    target: "Smallest feasible student effort to reach safety",
    accuracy: "100% strictly actionable levers",
    topFeatures: "Attendance +12%, +2 mock interviews, +3 LMS submissions",
  },
];

const SOURCES = [
  { name: "ERP Academics", frequency: "Daily sync", coverage: "100%", status: "Healthy" },
  { name: "Attendance Register", frequency: "Bi-daily RFID", coverage: "99.8%", status: "Healthy" },
  { name: "LMS Activity Log", frequency: "Real-time streaming", coverage: "99.2%", status: "Healthy" },
  { name: "Placement Cell", frequency: "Weekly batch", coverage: "94.5%", status: "Healthy" },
  { name: "Skills Assessment", frequency: "Monthly", coverage: "96.1%", status: "Healthy" },
];

export default function HubScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<HubSection>("all");

  const filterTabs: { key: HubSection; label: string }[] = [
    { key: "all", label: "All Hub" },
    { key: "segments", label: "Segments" },
    { key: "models", label: "ML Models" },
    { key: "fairness", label: "Fairness" },
    { key: "data", label: "Data Quality" },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Math.max(insets.top, 16) + 12,
        },
      ]}
    >
      {/* Top Header with BrandMark */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <BrandMark compact size={32} />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.title,
                { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
              ]}
            >
              Platform Hub
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              Campus data integration, ML explainability & trust
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsIconBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => {
              playSound("tap");
              router.push("/(tabs)/settings");
            }}
          >
            <Feather name="settings" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPills}
        >
          {filterTabs.map((tab) => {
            const isActive = section === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isActive ? colors.brand : colors.surface,
                    borderColor: isActive ? colors.brand : colors.cardBorder,
                  },
                ]}
                onPress={() => {
                  playSound("tap");
                  setSection(tab.key);
                }}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: isActive ? "#07070b" : colors.text,
                      fontFamily: isActive ? "BricolageGrotesque_700Bold" : "BricolageGrotesque_600SemiBold",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
      >
        {/* Banner with Animated Stack Art */}
        <View
          style={[
            styles.bannerCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.bannerText}>
            <Text
              style={[
                styles.bannerTitle,
                { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
              ]}
            >
              Multi-source Intelligence
            </Text>
            <Text style={[styles.bannerDesc, { color: colors.mutedText }]}>
              Live feeds normalized from RFID turnstiles, Moodle, and ERP records.
            </Text>
          </View>
          <View style={styles.bannerArt}>
            <AnimatedAscoraArt kind="stack" width={120} height={70} />
          </View>
        </View>

        {/* 1. Cohort Segments */}
        {(section === "all" || section === "segments") && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeadingRow}>
              <Text
                style={[
                  styles.sectionHeading,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                Student Archetypes & Segments
              </Text>
              <Text style={[styles.sectionCountBadge, { color: colors.brand }]}>
                {SEGMENT_CARDS.length} profiles
              </Text>
            </View>

            <View style={styles.cardsGrid}>
              {SEGMENT_CARDS.map((card) => {
                const toneColor =
                  card.riskTone === "riskHigh"
                    ? colors.riskHigh
                    : card.riskTone === "riskMedium"
                    ? colors.riskMedium
                    : colors.riskLow;
                return (
                  <View
                    key={card.id}
                    style={[
                      styles.segmentCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.segmentTopRow}>
                      <Text
                        style={[
                          styles.segmentName,
                          { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                        ]}
                      >
                        {card.persona}
                      </Text>
                      <View style={[styles.countPill, { backgroundColor: colors.brandSoft }]}>
                        <Text style={[styles.countPillText, { color: colors.brand }]}>
                          {card.count} students
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.segmentAction, { color: toneColor }]}>
                      Recommended: {card.action}
                    </Text>

                    <View style={styles.traitsWrap}>
                      {card.traits.map((t, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.traitTag,
                            { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                          ]}
                        >
                          <Text style={[styles.traitTagText, { color: colors.mutedText }]}>
                            {t}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 2. ML Models */}
        {(section === "all" || section === "models") && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeadingRow}>
              <Text
                style={[
                  styles.sectionHeading,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                Machine Learning Specs
              </Text>
              <Text style={[styles.sectionCountBadge, { color: colors.brand }]}>
                3 production pipelines
              </Text>
            </View>

            <View style={styles.cardsGrid}>
              {MODEL_SPECS.map((spec, i) => (
                <View
                  key={i}
                  style={[
                    styles.modelCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.modelHeader}>
                    <Text
                      style={[
                        styles.modelName,
                        { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                      ]}
                    >
                      {spec.name}
                    </Text>
                    <View style={[styles.accuracyBadge, { backgroundColor: colors.riskLowSoft }]}>
                      <Text style={[styles.accuracyText, { color: colors.riskLow }]}>
                        {spec.accuracy}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.modelAlgorithm, { color: colors.brand }]}>
                    {spec.algorithm}
                  </Text>
                  <Text style={[styles.modelTarget, { color: colors.mutedText }]}>
                    Target: {spec.target}
                  </Text>

                  <View style={[styles.featureListWrap, { borderColor: colors.cardBorder }]}>
                    <Text style={[styles.featureTitle, { color: colors.mutedText }]}>
                      Key SHAP drivers:
                    </Text>
                    <Text style={[styles.featureValues, { color: colors.text }]}>
                      {spec.topFeatures}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 3. Fairness and Ethics */}
        {(section === "all" || section === "fairness") && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeadingRow}>
              <Text
                style={[
                  styles.sectionHeading,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                Fairness & Demographic Parity
              </Text>
            </View>

            <View
              style={[
                styles.fairnessCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.fairnessRow}>
                <Feather name="shield" size={18} color={colors.riskLow} />
                <Text
                  style={[
                    styles.fairnessTitle,
                    { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                  ]}
                >
                  Demographic Parity Ratio: 0.96
                </Text>
              </View>
              <Text style={[styles.fairnessDesc, { color: colors.mutedText }]}>
                Strict threshold enforced across gender, reservation categories, and domicile. Protected attributes are excluded from feature matrices.
              </Text>
            </View>
          </View>
        )}

        {/* 4. Data Quality */}
        {(section === "all" || section === "data") && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeadingRow}>
              <Text
                style={[
                  styles.sectionHeading,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                Data Feed Quality
              </Text>
            </View>

            <View
              style={[
                styles.dataCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              {SOURCES.map((s, idx) => (
                <View
                  key={s.name}
                  style={[
                    styles.sourceRow,
                    { borderBottomColor: colors.cardBorder, borderBottomWidth: idx === SOURCES.length - 1 ? 0 : 0.5 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sourceName, { color: colors.text }]}>
                      {s.name}
                    </Text>
                    <Text style={[styles.sourceMeta, { color: colors.mutedText }]}>
                      {s.frequency} · {s.coverage} coverage
                    </Text>
                  </View>
                  <View style={[styles.statusTag, { backgroundColor: colors.riskLowSoft }]}>
                    <Text style={[styles.statusText, { color: colors.riskLow }]}>
                      {s.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  settingsIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPills: {
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
  },
  scrollBody: {
    paddingHorizontal: 16,
    gap: 20,
  },
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  bannerText: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 15,
  },
  bannerDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  bannerArt: {
    marginLeft: 8,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeading: {
    fontSize: 15,
  },
  sectionCountBadge: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  cardsGrid: {
    gap: 10,
  },
  segmentCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  segmentTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  segmentName: {
    fontSize: 14,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  segmentAction: {
    fontSize: 12,
    fontWeight: "600",
  },
  traitsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  traitTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  traitTagText: {
    fontSize: 11,
  },
  modelCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  modelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modelName: {
    fontSize: 14,
  },
  accuracyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  accuracyText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modelAlgorithm: {
    fontSize: 12,
    fontWeight: "600",
  },
  modelTarget: {
    fontSize: 11.5,
  },
  featureListWrap: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 0.5,
    gap: 2,
  },
  featureTitle: {
    fontSize: 11,
  },
  featureValues: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  fairnessCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  fairnessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fairnessTitle: {
    fontSize: 14,
  },
  fairnessDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  dataCard: {
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  sourceName: {
    fontSize: 13,
    fontWeight: "600",
  },
  sourceMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
