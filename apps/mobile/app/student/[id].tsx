import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/lib/theme";
import {
  fetchStudent360,
  fetchInterventions,
  updateInterventionStatus,
} from "../../src/lib/api";
import { ScoreRing } from "../../src/components/ScoreRing";
import { RiskBadge } from "../../src/components/RiskBadge";
import { DriverList } from "../../src/components/DriverList";
import { LmsBarChart } from "../../src/components/LmsBarChart";
import { InterventionModal } from "../../src/components/InterventionModal";
import { EmptyState } from "../../src/components/EmptyState";
import { BrandMark } from "../../src/components/BrandMark";
import {

  maskEmail,
  maskPhone,
  suggestIntervention,
  deriveMobileRecommendation,
  INTERVENTION_LABEL,
  INTENT_LABEL,
  COMPONENT_LABEL,
  scoreToneColor,
} from "../../src/lib/format";
import { triggerHaptic } from "../../src/lib/haptics";
import type { StudentScore, LMSActivity, Intervention } from "../../src/lib/types";

type SegmentTab = "why" | "helps" | "semester" | "interventions";

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [student, setStudent] = useState<any>(null);
  const [score, setScore] = useState<StudentScore | null>(null);
  const [lms, setLms] = useState<LMSActivity | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [activeTab, setActiveTab] = useState<SegmentTab>("why");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [d, ints] = await Promise.all([
        fetchStudent360(id),
        fetchInterventions(id),
      ]);

      if (!d || !d.score) {
        setError("Student record not found or inaccessible under your current role.");
        return;
      }

      setStudent(d.student);
      setScore(d.score);
      setLms(d.lms);
      setInterventions(ints);
      setError(null);
    } catch (e: any) {
      console.error("fetchStudent360 error:", e);
      setError(e.message || "Failed to load student details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    (async () => {
      try {
        const [d, ints] = await Promise.all([
          fetchStudent360(id),
          fetchInterventions(id),
        ]);
        if (!isMounted) return;
        if (!d || !d.score) {
          setError("Student record not found or inaccessible under your current role.");
          return;
        }
        setStudent(d.student);
        setScore(d.score);
        setLms(d.lms);
        setInterventions(ints);
        setError(null);
      } catch (e: any) {
        if (isMounted) setError(e.message || "Failed to load student details");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleUpdateStatus = async (
    intId: string,
    newStatus: "open" | "in_progress" | "done" | "cancelled"
  ) => {
    triggerHaptic("medium");
    try {
      const res = await updateInterventionStatus(intId, newStatus);
      if (res.ok) {
        triggerHaptic("success");
        setInterventions((prev) =>
          prev.map((i) => (i.id === intId ? { ...i, status: newStatus } : i))
        );
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error || !student || !score) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="alert-circle"
          title="Student not found"
          description={error || "Could not retrieve student details."}
          onRetry={() => router.back()}
          actionLabel="Go back"
        />
      </View>
    );
  }

  const topDriver = score.shap_academic?.raises?.[0] ?? score.shap_placement?.raises?.[0];
  const suggestedType = suggestIntervention(topDriver?.feature);
  const recourseItems = Object.values(score.recourse ?? {}).filter(Boolean);
  const placementTrack = score.placement_risk_level !== "N/A";
  const comps = Object.entries(score.components ?? {}) as [
    keyof typeof COMPONENT_LABEL,
    number
  ][];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Navbar */}
      <View
        style={[
          styles.topNav,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          accessibilityLabel="Back to students"
        >
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <BrandMark compact size={26} />
          <Text style={[styles.navTitle, { color: colors.text }]}>{student.id}</Text>
        </View>
        <View style={{ width: 36 }} />

      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
        ]}
      >
        {/* Header Profile Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.profileHeaderRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={[
                  styles.studentName,
                  { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
                ]}
              >
                {student.name}
              </Text>
              <Text style={[styles.metaText, { color: colors.mutedText }]}>
                {student.id} · {student.branch}, Year {student.year}, Sec {student.section}
              </Text>
              <Text style={[styles.mentorText, { color: colors.mutedText }]}>
                Mentor: {student.mentors?.name ?? student.mentor_id ?? "Assigned faculty"}
              </Text>
            </View>

            <ScoreRing score={score.success_score} size={84} strokeWidth={7} label="Success" />
          </View>

          {/* Risk Badges */}
          <View style={styles.badgesRow}>
            <RiskBadge
              level={score.academic_risk_level}
              prob={score.academic_risk_prob}
              label="Academic risk"
            />
            {placementTrack ? (
              <RiskBadge
                level={score.placement_risk_level}
                prob={score.placement_risk_prob}
                label="Placement risk"
              />
            ) : (
              <View style={[styles.goalPill, { backgroundColor: colors.surface }]}>
                <Text style={[styles.goalPillText, { color: colors.mutedText }]}>
                  Goal: {INTENT_LABEL[score.intent] || score.intent}
                </Text>
              </View>
            )}
            <View style={[styles.personaPill, { backgroundColor: colors.brandSoft }]}>
              <Text style={[styles.personaPillText, { color: colors.brand }]}>
                {score.persona}
              </Text>
            </View>
          </View>

          {/* Masked Contact Line */}
          <View style={[styles.contactLine, { borderTopColor: colors.cardBorder }]}>
            <Feather name="lock" size={12} color={colors.mutedText} />
            <Text style={[styles.contactText, { color: colors.mutedText }]}>
              {maskEmail(student.email)} · {maskPhone(student.phone)} · Contact masked; view logged.
            </Text>
          </View>
        </View>

        {/* Round 2 Prescribed Action & Owner Card */}
        {(() => {
          const rec = deriveMobileRecommendation(score, student);
          return (
            <View
              style={[
                styles.profileCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  marginTop: -4,
                  gap: 10,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather name="shield" size={14} color={colors.brand} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                    Prescribed Action & Owner
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor:
                      rec.priority === "P0 Immediate"
                        ? colors.riskHighSoft
                        : rec.priority === "P1 High"
                        ? colors.riskMediumSoft
                        : colors.brandSoft,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color:
                        rec.priority === "P0 Immediate"
                          ? colors.riskHigh
                          : rec.priority === "P1 High"
                          ? colors.riskMedium
                          : colors.brand,
                    }}
                  >
                    {rec.priority}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
                  {rec.action}
                </Text>
                <Text style={{ fontSize: 11, color: colors.mutedText, lineHeight: 16 }}>
                  {rec.reason}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.cardBorder,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Feather name="user-check" size={12} color={colors.brand} />
                  <Text style={{ fontSize: 11, color: colors.mutedText }}>
                    Owner: <Text style={{ fontWeight: "600", color: colors.text }}>{rec.owner}</Text>
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Feather name="trending-up" size={12} color={colors.mutedText} />
                  <Text style={{ fontSize: 10, color: colors.mutedText }}>Actual vs Predicted</Text>
                </View>
              </View>

              <Text style={{ fontSize: 10, color: colors.mutedText, fontStyle: "italic" }}>
                {rec.forecast}
              </Text>
            </View>
          );
        })()}

        {/* Alert Banner */}
        {score.alerts && score.alerts.length > 0 && (
          <View
            style={[
              styles.alertBanner,
              {
                backgroundColor: colors.riskHighSoft,
                borderColor: colors.riskHigh,
              },
            ]}
          >
            {score.alerts.map((a, idx) => (
              <View key={idx} style={styles.alertRow}>
                <Feather
                  name="alert-triangle"
                  size={15}
                  color={a.severity === "high" ? colors.riskHigh : colors.riskMedium}
                />
                <Text style={[styles.alertText, { color: colors.text }]}>{a.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Segmented Control Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {[
            { key: "why", label: "Why flagged" },
            { key: "helps", label: "What helps" },
            { key: "semester", label: "This semester" },
            { key: "interventions", label: `Interventions (${interventions.length})` },
          ].map((t) => {
            const isSelected = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tabItem,
                  {
                    backgroundColor: isSelected ? colors.card : "transparent",
                    borderColor: isSelected ? colors.cardBorder : "transparent",
                  },
                ]}
                onPress={() => {
                  triggerHaptic("light");
                  setActiveTab(t.key as SegmentTab);
                }}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    {
                      color: isSelected ? colors.brand : colors.mutedText,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab 1: Why flagged */}
        {activeTab === "why" && (
          <View style={styles.tabSection}>
            <View
              style={[
                styles.panelCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.panelTitle, { color: colors.text }]}>
                Academic risk drivers (SHAP)
              </Text>
              <Text style={[styles.panelSub, { color: colors.mutedText }]}>
                Strongest model drivers for this student in plain language
              </Text>
              <DriverList drivers={score.shap_academic} />
            </View>

            {placementTrack ? (
              <View
                style={[
                  styles.panelCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[styles.panelTitle, { color: colors.text }]}>
                  Placement risk drivers (SHAP)
                </Text>
                <Text style={[styles.panelSub, { color: colors.mutedText }]}>
                  Career readiness model indicators
                </Text>
                <DriverList drivers={score.shap_placement} />
              </View>
            ) : (
              <View
                style={[
                  styles.panelCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[styles.panelTitle, { color: colors.text }]}>
                  Goal readiness: {INTENT_LABEL[score.intent] || score.intent}
                </Text>
                {score.readiness ? (
                  <View style={{ gap: 8 }}>
                    <Text style={[styles.readinessScore, { color: colors.brand }]}>
                      Score: {score.readiness.score?.toFixed(0) ?? "-"} / 100
                    </Text>
                    {score.readiness.gaps && score.readiness.gaps.length > 0 && (
                      <View style={{ gap: 4 }}>
                        <Text style={[styles.gapTitle, { color: colors.mutedText }]}>Next steps:</Text>
                        {score.readiness.gaps.map((g, i) => (
                          <Text key={i} style={[styles.gapItem, { color: colors.text }]}>
                            • {g}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: colors.mutedText, fontSize: 13 }}>No readiness data</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Tab 2: What helps */}
        {activeTab === "helps" && (
          <View style={styles.tabSection}>
            <View
              style={[
                styles.panelCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.panelTitle, { color: colors.text }]}>
                Smallest changes that help (Recourse)
              </Text>
              <Text style={[styles.panelSub, { color: colors.mutedText }]}>
                Model-estimated counterfactual over modifiable levers
              </Text>

              {recourseItems.length === 0 ? (
                <Text style={{ color: colors.mutedText, fontSize: 13, lineHeight: 18 }}>
                  Not at high risk on either model, so no corrective plan is needed. Keep regular mentoring cadence.
                </Text>
              ) : (
                <View style={{ gap: 14 }}>
                  {recourseItems.map((r, i) => (
                    <View key={i} style={[styles.recourseBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                      <View style={styles.recourseHeader}>
                        <Feather name="target" size={15} color={colors.brand} />
                        <Text style={[styles.recourseTitle, { color: colors.text }]}>
                          {r.kind === "academic" ? "Academic" : "Placement"} risk:{" "}
                          {Math.round(r.from_prob * 100)}% down to {Math.round(r.to_prob * 100)}%
                        </Text>
                      </View>
                      <View style={{ gap: 6, marginTop: 4 }}>
                        {r.steps.map((st, sIdx) => (
                          <Text key={sIdx} style={[styles.recourseStep, { color: colors.text }]}>
                            {sIdx + 1}. {st}
                          </Text>
                        ))}
                      </View>
                    </View>
                  ))}
                  <Text style={[styles.recourseNote, { color: colors.mutedText }]}>
                    Optimized over attendance, assignments, and mock interviews only. A model estimate, not a guarantee.
                  </Text>
                </View>
              )}
            </View>

            {/* Score Breakdown Component Percentiles */}
            <View
              style={[
                styles.panelCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.panelTitle, { color: colors.text }]}>
                Score breakdown (Cohort Percentiles)
              </Text>
              <View style={styles.componentsGrid}>
                {comps.map(([k, v]) => (
                  <View
                    key={k}
                    style={[
                      styles.compItem,
                      { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                    ]}
                  >
                    <Text style={[styles.compLabel, { color: colors.mutedText }]}>
                      {COMPONENT_LABEL[k] || k}
                    </Text>
                    <Text
                      style={[
                        styles.compVal,
                        { color: scoreToneColor(v, colors) },
                      ]}
                    >
                      {v.toFixed(0)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Tab 3: This semester */}
        {activeTab === "semester" && (
          <View style={styles.tabSection}>
            <LmsBarChart lms={lms} />
          </View>
        )}

        {/* Tab 4: Interventions */}
        {activeTab === "interventions" && (
          <View style={styles.tabSection}>
            <View style={styles.interventionHeaderRow}>
              <View>
                <Text style={[styles.panelTitle, { color: colors.text }]}>Interventions</Text>
                <Text style={[styles.panelSub, { color: colors.mutedText }]}>
                  Support logged to close the loop
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.planBtn, { backgroundColor: colors.brand }]}
                onPress={() => {
                  triggerHaptic("light");
                  setModalOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#07070b" />
                <Text style={styles.planBtnText}>Plan new</Text>
              </TouchableOpacity>
            </View>

            {interventions.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="No interventions logged"
                description="Plan an intervention to support this student and track progress."
                actionLabel="Plan intervention"
                onRetry={() => setModalOpen(true)}
              />
            ) : (
              <View style={{ gap: 10 }}>
                {interventions.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.intCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.intTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.intType, { color: colors.text }]}>
                          {INTERVENTION_LABEL[item.type] || item.type}
                        </Text>
                        <Text style={[styles.intOwner, { color: colors.mutedText }]}>
                          {item.owner_name} · Due {item.due_date}
                        </Text>
                      </View>

                      {/* Status toggle chips */}
                      <View style={styles.statusChipsRow}>
                        {(["open", "in_progress", "done"] as const).map((st) => {
                          const active = item.status === st;
                          return (
                            <TouchableOpacity
                              key={st}
                              style={[
                                styles.statusChip,
                                {
                                  backgroundColor: active
                                    ? st === "done"
                                      ? colors.riskLow
                                      : colors.brand
                                    : colors.surface,
                                  borderColor: active
                                    ? "transparent"
                                    : colors.cardBorder,
                                },
                              ]}
                              onPress={() => handleUpdateStatus(item.id, st)}
                            >
                              <Text
                                style={[
                                  styles.statusChipText,
                                  {
                                    color: active ? "#07070b" : colors.mutedText,
                                    fontWeight: active ? "700" : "500",
                                  },
                                ]}
                              >
                                {st === "in_progress" ? "In prog" : st}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {item.notes && (
                      <Text style={[styles.intNotes, { color: colors.text }]}>
                        &quot;{item.notes}&quot;
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Plan Intervention Modal */}
      <InterventionModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        studentId={student.id}
        studentName={student.name}
        suggestedType={suggestedType}
        suggestedDriver={topDriver?.text || null}
        onSuccess={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  studentName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  metaText: {
    fontSize: 12,
  },
  mentorText: {
    fontSize: 11,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  goalPillText: {
    fontSize: 11,
  },
  personaPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  personaPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  contactLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  contactText: {
    fontSize: 10,
    flex: 1,
  },
  alertBanner: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    gap: 6,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertText: {
    fontSize: 12,
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  tabItemText: {
    fontSize: 11,
  },
  tabSection: {
    gap: 14,
  },
  panelCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  panelSub: {
    fontSize: 11,
  },
  readinessScore: {
    fontSize: 18,
    fontWeight: "700",
  },
  gapTitle: {
    fontSize: 11,
    fontWeight: "600",
  },
  gapItem: {
    fontSize: 12,
  },
  recourseBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  recourseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recourseTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  recourseStep: {
    fontSize: 12,
    lineHeight: 16,
  },
  recourseNote: {
    fontSize: 10,
    lineHeight: 14,
  },
  componentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  compItem: {
    width: "48%",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
  },
  compLabel: {
    fontSize: 11,
  },
  compVal: {
    fontSize: 13,
    fontWeight: "700",
  },
  interventionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  planBtnText: {
    color: "#07070b",
    fontSize: 12,
    fontWeight: "700",
  },
  intCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  intTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  intType: {
    fontSize: 13,
    fontWeight: "600",
  },
  intOwner: {
    fontSize: 11,
    marginTop: 2,
  },
  statusChipsRow: {
    flexDirection: "row",
    gap: 4,
  },
  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  statusChipText: {
    fontSize: 10,
  },
  intNotes: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
