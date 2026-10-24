import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/lib/theme";
import { fetchStudentRows } from "../../src/lib/api";
import { ScoreRing } from "../../src/components/ScoreRing";
import { RiskBadge } from "../../src/components/RiskBadge";
import { EmptyState } from "../../src/components/EmptyState";
import { InterventionModal } from "../../src/components/InterventionModal";
import { INTERVENTION_LABEL } from "../../src/lib/format";
import { triggerHaptic } from "../../src/lib/haptics";
import { playSound } from "../../src/lib/sound";
import { BrandMark } from "../../src/components/BrandMark";
import { AnimatedAscoraArt } from "../../src/components/AnimatedAscoraArt";
import type { StudentRow } from "../../src/lib/types";


const ALERT_TO_TYPE: Record<string, string> = {
  silent_decliner: "mentor_meeting",
  lms_silent: "mentor_meeting",
  core_attendance: "mentor_meeting",
  attendance_drop: "mentor_meeting",
  backlogs: "peer_tutoring",
  no_mock: "mock_interview",
  assignments: "peer_tutoring",
};

function minutesFor(r: StudentRow) {
  const base =
    r.academic_risk_level === "High" || r.placement_risk_level === "High"
      ? 40
      : 25;
  return base + Math.min(10, 5 * Math.max(0, r.alerts.length - 1));
}

export default function ThisWeekScreen() {
  const router = useRouter();
  const { colors, defaultHours } = useTheme();
  const insets = useSafeAreaInsets();

  const [hours, setHours] = useState(defaultHours || 3);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for logging an intervention
  const [modalStudent, setModalStudent] = useState<StudentRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Load top 80 students by priority
        const res = await fetchStudentRows({
          page: 0,
          pageSize: 80,
          orderByPriority: true,
        });
        setStudents(res.rows);
      } catch (e: any) {
        console.error("ThisWeek load error:", e);
        setError(e.message || "Failed to load priority students");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const plan = useMemo(() => {
    const budget = hours * 60;
    const scored = students.map((r) => {
      const m = minutesFor(r);
      return { r, m, value: r.priority / m };
    }).sort((a, b) => b.value - a.value);

    const picked: typeof scored = [];
    let used = 0;
    for (const s of scored) {
      if (used + s.m <= budget) {
        picked.push(s);
        used += s.m;
      }
    }
    picked.sort((a, b) => b.r.priority - a.r.priority);
    const covered = picked.reduce((a, b) => a + b.r.priority, 0);
    const total = students.reduce((a, b) => a + b.priority, 0);

    return {
      picked,
      used,
      share: total ? covered / total : 0,
    };
  }, [students, hours]);

  const changeHours = (delta: number) => {
    triggerHaptic("light");
    playSound("tick");
    setHours((prev) => Math.min(10, Math.max(1, Math.round((prev + delta) * 2) / 2)));
  };

  if (loading) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.background }]}>
        <EmptyState
          title="Could not load planner"
          description={error}
          onRetry={() => {}}
        />
      </View>
    );
  }

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
        <View style={styles.headerTitleRow}>
          <BrandMark compact size={32} />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.title,
                { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
              ]}
            >
              Who to meet this week
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              Greedy knapsack scheduling optimized by student priority
            </Text>
          </View>
          <View style={styles.headerArt}>
            <AnimatedAscoraArt kind="calendar" width={90} height={48} />
          </View>
        </View>
      </View>


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
        ]}
      >
        {/* Hours Budget Controller Card */}
        <View
          style={[
            styles.budgetCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.budgetRow}>
            <View>
              <Text style={[styles.budgetLabel, { color: colors.mutedText }]}>
                Hours available this week
              </Text>
              <Text
                style={[
                  styles.hoursBig,
                  { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
                ]}
              >
                {hours}h
              </Text>
            </View>

            {/* Stepper controls */}
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[
                  styles.stepBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.cardBorder,
                    opacity: hours <= 1 ? 0.4 : 1,
                  },
                ]}
                onPress={() => changeHours(-0.5)}
                disabled={hours <= 1}
                accessibilityLabel="Decrease hours"
              >
                <Feather name="minus" size={18} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.stepBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.cardBorder,
                    opacity: hours >= 10 ? 0.4 : 1,
                  },
                ]}
                onPress={() => changeHours(0.5)}
                disabled={hours >= 10}
                accessibilityLabel="Increase hours"
              >
                <Feather name="plus" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Metrics summary */}
          <View
            style={[
              styles.summaryGrid,
              { borderTopColor: colors.cardBorder, borderTopWidth: 1 },
            ]}
          >
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryItemLabel, { color: colors.mutedText }]}>
                Meetings
              </Text>
              <Text
                style={[
                  styles.summaryItemValue,
                  { color: colors.brand, fontFamily: "BricolageGrotesque_700Bold" },
                ]}
              >
                {plan.picked.length}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryItemLabel, { color: colors.mutedText }]}>
                Time planned
              </Text>
              <Text
                style={[
                  styles.summaryItemValue,
                  { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
                ]}
              >
                {(plan.used / 60).toFixed(1)}h
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryItemLabel, { color: colors.mutedText }]}>
                Priority covered
              </Text>
              <Text
                style={[
                  styles.summaryItemValue,
                  { color: colors.riskLow, fontFamily: "BricolageGrotesque_700Bold" },
                ]}
              >
                {(plan.share * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Meetings List */}
        <View style={styles.listSection}>
          <Text
            style={[
              styles.listSectionTitle,
              { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            Suggested meetings ({plan.picked.length})
          </Text>

          {plan.picked.length === 0 ? (
            <EmptyState
              icon="clock"
              title="Not enough time for a single meeting"
              description="Increase your available hours using the controls above."
            />
          ) : (
            <View style={styles.meetingsList}>
              {plan.picked.map(({ r, m }, idx) => {
                const a = r.alerts[0];
                const suggestedType = a
                  ? ALERT_TO_TYPE[a.type] || "mentor_meeting"
                  : r.placement_risk_level === "High"
                  ? "mock_interview"
                  : "mentor_meeting";

                return (
                  <View
                    key={r.id}
                    style={[
                      styles.meetingCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.indexCol}>
                      <Text
                        style={[
                          styles.indexText,
                          { color: colors.mutedText, fontFamily: "BricolageGrotesque_700Bold" },
                        ]}
                      >
                        #{idx + 1}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.meetingInfo}
                      onPress={() => router.push(`/student/${r.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.nameRow}>
                        <Text
                          style={[
                            styles.studentName,
                            { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                          ]}
                        >
                          {r.name}
                        </Text>
                        <ScoreRing score={r.success_score} size={36} strokeWidth={3} label="" />
                      </View>

                      <Text style={[styles.personaText, { color: colors.mutedText }]}>
                        {a?.text || r.persona}
                      </Text>

                      <View
                        style={{
                          backgroundColor: colors.surface,
                          borderRadius: 6,
                          padding: 6,
                          marginVertical: 4,
                          gap: 3,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: colors.brand }}>
                            Owner: {r.academic_risk_level === "High" ? "Faculty Mentor" : r.placement_risk_level === "High" ? "Training & Placement Cell" : "Faculty Mentor"}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: "700",
                              color:
                                r.academic_risk_prob >= 0.65
                                  ? colors.riskHigh
                                  : r.academic_risk_prob >= 0.4
                                  ? colors.riskMedium
                                  : colors.brand,
                            }}
                          >
                            {r.academic_risk_prob >= 0.65 ? "P0 (48h)" : r.academic_risk_prob >= 0.4 ? "P1 (7d)" : "P2 (14d)"}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.text }}>
                          {INTERVENTION_LABEL[suggestedType] || suggestedType} · ~{m} min
                        </Text>
                      </View>

                      <View style={styles.badgeRow}>
                        <RiskBadge
                          level={r.academic_risk_level}
                          prob={r.academic_risk_prob}
                          label="Acad"
                        />
                        {r.placement_risk_level !== "N/A" && (
                          <RiskBadge
                            level={r.placement_risk_level}
                            prob={r.placement_risk_prob}
                            label="Place"
                          />
                        )}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.logBtn, { backgroundColor: colors.surface, borderColor: colors.brand }]}
                      onPress={() => {
                        triggerHaptic("light");
                        setModalStudent(r);
                      }}
                      accessibilityLabel={`Log intervention for ${r.name}`}
                    >
                      <Feather name="calendar" size={14} color={colors.brand} />
                      <Text style={[styles.logBtnText, { color: colors.brand }]}>Log</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Intervention Modal */}
      {modalStudent && (
        <InterventionModal
          visible={!!modalStudent}
          onClose={() => setModalStudent(null)}
          studentId={modalStudent.id}
          studentName={modalStudent.name}
          suggestedType={
            modalStudent.alerts[0]
              ? ALERT_TO_TYPE[modalStudent.alerts[0].type] || "mentor_meeting"
              : "mentor_meeting"
          }
          suggestedDriver={modalStudent.alerts[0]?.text || null}
          onSuccess={() => {}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerArt: {
    opacity: 0.8,
  },
  title: {

    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  budgetCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  hoursBig: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  stepperRow: {
    flexDirection: "row",
    gap: 8,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  summaryItem: {
    gap: 2,
  },
  summaryItemLabel: {
    fontSize: 11,
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  listSection: {
    gap: 12,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  meetingsList: {
    gap: 10,
  },
  meetingCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  indexCol: {
    width: 26,
    alignItems: "center",
  },
  indexText: {
    fontSize: 13,
    fontWeight: "700",
  },
  meetingInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studentName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  personaText: {
    fontSize: 11,
  },
  suggestedText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 36,
  },
  logBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
