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
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
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
          {filterTabs.map((t) => {
            const isSelected = section === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.brand : colors.surface,
                    borderColor: isSelected ? colors.brand : colors.cardBorder,
                  },
                ]}
                onPress={() => {
                  playSound("soft");
                  setSection(t.key);
                }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected ? "#07070b" : colors.text,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
        ]}
      >
        {/* Section 1: Segments & Personas */}
        {(section === "all" || section === "segments") && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <Feather name="layers" size={16} color={colors.brand} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Student Personas & Segments
              </Text>
            </View>
            <Text style={[styles.sectionSub, { color: colors.mutedText }]}>
              Unsupervised clustering identifies cohort behavior patterns
            </Text>

            <View style={styles.cardsStack}>
              {SEGMENT_CARDS.map((seg) => (
                <View
                  key={seg.id}
                  style={[
                    styles.segmentCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={styles.segHeader}>
                    <Text style={[styles.segPersona, { color: colors.text }]}>
                      {seg.persona}
                    </Text>
                    <View style={[styles.segCountPill, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.segCountText, { color: colors.brand }]}>
                        {seg.count} students
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.segAction, { color: colors.brand }]}>
                    Action: {seg.action}
                  </Text>

                  <View style={styles.traitsRow}>
                    {seg.traits.map((tr, i) => (
                      <View
                        key={i}
                        style={[styles.traitBadge, { backgroundColor: colors.surface }]}
                      >
                        <Text style={[styles.traitText, { color: colors.mutedText }]}>
                          • {tr}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section 2: ML Models & Scoring Specs */}
        {(section === "all" || section === "models") && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <Feather name="cpu" size={16} color={colors.brand} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                ML Architecture & Scoring Models
              </Text>
            </View>
            <Text style={[styles.sectionSub, { color: colors.mutedText }]}>
              Dual calibrated pipelines with tree-based SHAP explainability
            </Text>

            <View style={styles.cardsStack}>
              {MODEL_SPECS.map((m, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.modelCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={styles.modelHeader}>
                    <Text style={[styles.modelName, { color: colors.text }]}>{m.name}</Text>
                    <View style={[styles.accPill, { backgroundColor: colors.riskLowSoft }]}>
                      <Text style={[styles.accText, { color: colors.riskLow }]}>{m.accuracy}</Text>
                    </View>
                  </View>
                  <Text style={[styles.modelAlgo, { color: colors.mutedText }]}>
                    Architecture: {m.algorithm}
                  </Text>
                  <Text style={[styles.modelTarget, { color: colors.text }]}>
                    Target: {m.target}
                  </Text>
                  <Text style={[styles.modelFeatures, { color: colors.brand }]}>
                    Top features: {m.topFeatures}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section 3: Fairness & Privacy Guardrails */}
        {(section === "all" || section === "fairness") && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <Feather name="shield" size={16} color={colors.riskLow} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Fairness & Privacy Safeguards
              </Text>
            </View>

            <View
              style={[
                styles.fairnessCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.fairnessRow}>
                <Feather name="check-circle" size={16} color={colors.riskLow} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fairnessHead, { color: colors.text }]}>
                    Demographic Parity Verified
                  </Text>
                  <Text style={[styles.fairnessBody, { color: colors.mutedText }]}>
                    Protected attributes (gender, domicile, category) are strictly excluded from feature sets to guarantee equal treatment.
                  </Text>
                </View>
              </View>

              <View style={[styles.fairnessRow, { borderTopWidth: 0.5, borderTopColor: colors.cardBorder, paddingTop: 10 }]}>
                <Feather name="lock" size={16} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fairnessHead, { color: colors.text }]}>
                    DPDP Act Compliance & Data Masking
                  </Text>
                  <Text style={[styles.fairnessBody, { color: colors.mutedText }]}>
                    Student phone numbers and email handles are masked across client views. Every access log is recorded immutably.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Section 4: Data Integration Health */}
        {(section === "all" || section === "data") && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <Feather name="database" size={16} color={colors.brand} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Data Pipelines & Ingestion Health
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
                    { borderBottomWidth: idx === SOURCES.length - 1 ? 0 : 0.5, borderBottomColor: colors.cardBorder },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sourceName, { color: colors.text }]}>{s.name}</Text>
                    <Text style={[styles.sourceFreq, { color: colors.mutedText }]}>{s.frequency}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.sourceCov, { color: colors.riskLow }]}>{s.coverage}</Text>
                    <Text style={[styles.sourceStatus, { color: colors.brand }]}>{s.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Settings Shortcut */}
        <TouchableOpacity
          style={[
            styles.settingsShortcut,
            { backgroundColor: colors.surface, borderColor: colors.cardBorder },
          ]}
          onPress={() => {
            playSound("tap");
            router.push("/(tabs)/settings");
          }}
          activeOpacity={0.8}
        >
          <View style={styles.shortcutLeft}>
            <Feather name="settings" size={18} color={colors.brand} />
            <Text style={[styles.shortcutText, { color: colors.text }]}>
              Account Settings & Preferences
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedText} />
        </TouchableOpacity>
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
    gap: 12,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  settingsIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPills: {
    gap: 8,
    paddingBottom: 4,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  content: {
    paddingHorizontal: 16,
    gap: 20,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSub: {
    fontSize: 12,
  },
  cardsStack: {
    gap: 10,
  },
  segmentCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  segHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  segPersona: {
    fontSize: 14,
    fontWeight: "700",
  },
  segCountPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  segCountText: {
    fontSize: 11,
    fontWeight: "600",
  },
  segAction: {
    fontSize: 12,
    fontWeight: "600",
  },
  traitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  traitBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  traitText: {
    fontSize: 11,
  },
  modelCard: {
    padding: 14,
    borderRadius: 16,
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
    fontWeight: "700",
  },
  accPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  accText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modelAlgo: {
    fontSize: 11,
  },
  modelTarget: {
    fontSize: 12,
    lineHeight: 16,
  },
  modelFeatures: {
    fontSize: 11,
    fontWeight: "600",
  },
  fairnessCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  fairnessRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  fairnessHead: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  fairnessBody: {
    fontSize: 11,
    lineHeight: 15,
  },
  dataCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  sourceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  sourceName: {
    fontSize: 13,
    fontWeight: "600",
  },
  sourceFreq: {
    fontSize: 10,
  },
  sourceCov: {
    fontSize: 12,
    fontWeight: "700",
  },
  sourceStatus: {
    fontSize: 10,
  },
  settingsShortcut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  shortcutLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  shortcutText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
