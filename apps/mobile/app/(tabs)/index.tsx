import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../src/lib/theme";
import {
  fetchCurrentProfile,
  fetchDashboardStats,
  fetchTopPriorityStudents,
  fetchInterventions,
} from "../../src/lib/api";
import { ScoreRing } from "../../src/components/ScoreRing";
import { RiskBadge } from "../../src/components/RiskBadge";
import { EmptyState } from "../../src/components/EmptyState";
import { triggerHaptic } from "../../src/lib/haptics";
import type { Profile, StudentRow, Intervention } from "../../src/lib/types";

function getKolkataGreeting(fullName?: string) {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kolkataDate = new Date(utc + 3600000 * 5.5);
  const hour = kolkataDate.getHours();

  let salutation = "Good morning";
  if (hour >= 12 && hour < 17) salutation = "Good afternoon";
  else if (hour >= 17) salutation = "Good evening";

  const firstName = fullName ? fullName.split(" ")[0] : "Faculty";
  return `${salutation}, ${firstName}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgScore: 0,
    highAcademic: 0,
    highPlacement: 0,
    silentDecliners: 0,
  });
  const [meetFirst, setMeetFirst] = useState<StudentRow[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [prof, stData, top5, ints] = await Promise.all([
        fetchCurrentProfile(),
        fetchDashboardStats(),
        fetchTopPriorityStudents(5),
        fetchInterventions(),
      ]);
      setProfile(prof);
      setStats(stData);
      setMeetFirst(top5);
      setInterventions(ints);
      setError(null);
    } catch (e: any) {
      console.error("Home loadData error:", e);
      setError(e.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [prof, stData, top5, ints] = await Promise.all([
          fetchCurrentProfile(),
          fetchDashboardStats(),
          fetchTopPriorityStudents(5),
          fetchInterventions(),
        ]);
        if (!isMounted) return;
        setProfile(prof);
        setStats(stData);
        setMeetFirst(top5);
        setInterventions(ints);
      } catch (e: any) {
        if (isMounted) setError(e.message || "Failed to load dashboard data");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    triggerHaptic("light");
    loadData();
  };

  // Next 6 days strip
  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.getDate();
    const dayInts = interventions.filter((it) => it.due_date === dateStr);
    return { dateStr, dayName, dayNum, dayInts, isToday: i === 0 };
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueCount = interventions.filter(
    (it) => it.status === "open" && it.due_date && it.due_date < todayStr
  ).length;

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
          title="Could not load dashboard"
          description={error}
          onRetry={loadData}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 16) + 12,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Top Greeting */}
      <View style={styles.greetingHeader}>
        <View>
          <Text
            style={[
              styles.greetingText,
              { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            {getKolkataGreeting(profile?.full_name)}
          </Text>
          <Text style={[styles.roleBadge, { color: colors.mutedText }]}>
            {profile?.role === "admin"
              ? "Head of Department (Whole Campus)"
              : "Faculty Mentor"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.profileButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          onPress={() => router.push("/(tabs)/settings")}
          accessibilityLabel="Settings"
        >
          <Feather name="user" size={18} color={colors.brand} />
        </TouchableOpacity>
      </View>

      {/* Campus Intelligence Gradient Card */}
      <LinearGradient
        colors={
          isDark
            ? ["#1a1936", "#0e0e1a", "#07070c"]
            : ["#eef0ff", "#ffffff", "#ffffff"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.intelCard, { borderColor: isDark ? "rgba(169, 180, 245, 0.25)" : colors.cardBorder }]}
      >
        <View style={styles.intelHeader}>
          <View style={[styles.intelPill, { backgroundColor: colors.brandSoft }]}>
            <Feather name="zap" size={13} color={colors.brand} />
            <Text style={[styles.intelPillText, { color: colors.brand }]}>
              Campus Intelligence
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/ai")}
            style={styles.voicePromptBtn}
          >
            <Feather name="mic" size={14} color={colors.brand} />
            <Text style={[styles.voicePromptText, { color: colors.brand }]}>Ask AI</Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.intelSummary,
            { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
          ]}
        >
          {stats.highAcademic} students are currently flagged for high academic risk, and{" "}
          {stats.silentDecliners} silent decliners require immediate mentor check-ins.
        </Text>

        <Text style={[styles.intelFootnote, { color: colors.mutedText }]}>
          Continuous synthesis across ERP, attendance registers, and LMS activity logs.
        </Text>
      </LinearGradient>

      {/* 4 Stat Tiles */}
      <View style={styles.statsGrid}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.statTitle, { color: colors.mutedText }]}>Students</Text>
          <Text
            style={[
              styles.statNumber,
              { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            {stats.totalStudents}
          </Text>
          <Text style={[styles.statDetail, { color: colors.mutedText }]}>Cohort scope</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.statTitle, { color: colors.mutedText }]}>Avg Score</Text>
          <Text
            style={[
              styles.statNumber,
              { color: colors.brand, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            {stats.avgScore}
          </Text>
          <Text style={[styles.statDetail, { color: colors.mutedText }]}>Success index</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.statTitle, { color: colors.mutedText }]}>High Academic</Text>
          <Text
            style={[
              styles.statNumber,
              { color: colors.riskHigh, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            {stats.highAcademic}
          </Text>
          <Text style={[styles.statDetail, { color: colors.riskHigh }]}>Needs action</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.statTitle, { color: colors.mutedText }]}>High Placement</Text>
          <Text
            style={[
              styles.statNumber,
              { color: colors.riskMedium, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            {stats.highPlacement}
          </Text>
          <Text style={[styles.statDetail, { color: colors.riskMedium }]}>Career gap</Text>
        </View>
      </View>

      {/* Horizontal 6-day Week Strip */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            This week schedule
          </Text>
          {overdueCount > 0 && (
            <View style={[styles.overdueBadge, { backgroundColor: colors.riskHighSoft }]}>
              <Text style={[styles.overdueText, { color: colors.riskHigh }]}>
                {overdueCount} overdue
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/this-week")}>
          <Text style={[styles.seeAllText, { color: colors.brand }]}>Planner</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekStrip}
      >
        {weekDays.map((day) => {
          const hasInts = day.dayInts.length > 0;
          return (
            <View
              key={day.dateStr}
              style={[
                styles.dayCard,
                {
                  backgroundColor: day.isToday
                    ? colors.brandSoft
                    : colors.card,
                  borderColor: day.isToday
                    ? colors.brand
                    : colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  { color: day.isToday ? colors.brand : colors.mutedText },
                ]}
              >
                {day.dayName}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  {
                    color: colors.text,
                    fontFamily: "BricolageGrotesque_700Bold",
                  },
                ]}
              >
                {day.dayNum}
              </Text>

              {hasInts ? (
                <View style={styles.dueInterventionsList}>
                  {day.dayInts.slice(0, 2).map((it) => (
                    <View
                      key={it.id}
                      style={[
                        styles.duePill,
                        {
                          backgroundColor:
                            it.status === "done"
                              ? colors.riskLowSoft
                              : colors.surface,
                          borderColor:
                            it.status === "done"
                              ? colors.riskLow
                              : colors.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.duePillText,
                          {
                            color:
                              it.status === "done"
                                ? colors.riskLow
                                : colors.text,
                          },
                        ]}
                      >
                        {it.student_name || it.student_id}
                      </Text>
                    </View>
                  ))}
                  {day.dayInts.length > 2 && (
                    <Text style={[styles.moreCount, { color: colors.mutedText }]}>
                      +{day.dayInts.length - 2} more
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.noDueText, { color: colors.mutedText }]}>
                  Open
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Meet First (Top 5 Priority Students) */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
          ]}
        >
          Meet first
        </Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/students")}>
          <Text style={[styles.seeAllText, { color: colors.brand }]}>View all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.meetFirstList}>
        {meetFirst.map((student, idx) => (
          <TouchableOpacity
            key={student.id}
            style={[
              styles.studentCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => router.push(`/student/${student.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.rankBadge}>
              <Text
                style={[
                  styles.rankNumber,
                  { color: colors.mutedText, fontFamily: "BricolageGrotesque_700Bold" },
                ]}
              >
                #{idx + 1}
              </Text>
            </View>

            <View style={styles.studentInfo}>
              <View style={styles.studentNameRow}>
                <Text
                  style={[
                    styles.studentName,
                    { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                  ]}
                >
                  {student.name}
                </Text>
              </View>
              <Text style={[styles.studentMeta, { color: colors.mutedText }]}>
                {student.id} · {student.branch} · Yr {student.year} · Sec {student.section}
              </Text>

              <View style={styles.badgesRow}>
                <RiskBadge
                  level={student.academic_risk_level}
                  prob={student.academic_risk_prob}
                  label="Acad"
                />
                {student.placement_risk_level !== "N/A" && (
                  <RiskBadge
                    level={student.placement_risk_level}
                    prob={student.placement_risk_prob}
                    label="Place"
                  />
                )}
              </View>
            </View>

            <View style={styles.scoreWrap}>
              <ScoreRing score={student.success_score} size={54} strokeWidth={5} label="" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  greetingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  roleBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  intelCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    gap: 10,
  },
  intelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  intelPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  voicePromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  voicePromptText: {
    fontSize: 12,
    fontWeight: "600",
  },
  intelSummary: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  intelFootnote: {
    fontSize: 11,
    lineHeight: 15,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
  },
  statDetail: {
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  overdueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  overdueText: {
    fontSize: 11,
    fontWeight: "700",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  weekStrip: {
    gap: 10,
    paddingBottom: 4,
  },
  dayCard: {
    width: 90,
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
  },
  dayName: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dayNum: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 4,
  },
  dueInterventionsList: {
    width: "100%",
    gap: 4,
    marginTop: 4,
  },
  duePill: {
    borderRadius: 6,
    borderWidth: 0.5,
    paddingVertical: 2,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  duePillText: {
    fontSize: 9,
    fontWeight: "600",
  },
  moreCount: {
    fontSize: 9,
    textAlign: "center",
  },
  noDueText: {
    fontSize: 10,
    marginTop: 8,
  },
  meetFirstList: {
    gap: 10,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  rankBadge: {
    width: 28,
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: "700",
  },
  studentInfo: {
    flex: 1,
    gap: 4,
  },
  studentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "600",
  },
  studentMeta: {
    fontSize: 11,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  scoreWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
