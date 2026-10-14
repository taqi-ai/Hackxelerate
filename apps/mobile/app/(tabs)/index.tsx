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
import { BrandMark } from "../../src/components/BrandMark";
import { AnimatedAscoraArt } from "../../src/components/AnimatedAscoraArt";
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
      {/* Top Greeting Header with Official Brand Mark */}
      <View style={styles.greetingHeader}>
        <View style={styles.greetingTitleRow}>
          <BrandMark compact size={36} />
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
        </View>
        <TouchableOpacity
          style={[styles.profileButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          onPress={() => router.push("/(tabs)/settings")}
          accessibilityLabel="Settings"
        >
          <Feather name="user" size={18} color={colors.brand} />
        </TouchableOpacity>
      </View>

      {/* Campus Intelligence Gradient Card with Animated PageArt */}
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
        <View style={styles.artPositioner}>
          <AnimatedAscoraArt kind="orbit" width={180} height={90} />
        </View>

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
          <Text style={[styles.statTitle, { color: colors.mutedText }]}>Academic Risk</Text>
          <Text
            style={[
              styles.statNumber,
              { color: colors.riskHigh, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            {stats.highAcademic}
          </Text>
          <Text style={[styles.statDetail, { color: colors.mutedText }]}>Requires support</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.statTitle, { color: colors.mutedText }]}>Silent Drift</Text>
          <Text
            style={[
              styles.statNumber,
              { color: colors.riskMedium, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            {stats.silentDecliners}
          </Text>
          <Text style={[styles.statDetail, { color: colors.mutedText }]}>Early warning</Text>
        </View>
      </View>

      {/* Week Calendar Strip */}
      <View style={styles.sectionHeader}>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
          ]}
        >
          This Week
        </Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/this-week")}>
          <Text style={[styles.seeAllText, { color: colors.brand }]}>View planner</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.calendarStrip}
      >
        {weekDays.map((d) => (
          <View
            key={d.dateStr}
            style={[
              styles.calendarDayCard,
              {
                backgroundColor: d.isToday ? colors.brandSoft : colors.card,
                borderColor: d.isToday ? colors.brand : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.calendarDayName,
                { color: d.isToday ? colors.brand : colors.mutedText },
              ]}
            >
              {d.dayName}
            </Text>
            <Text
              style={[
                styles.calendarDayNum,
                {
                  color: d.isToday ? colors.brand : colors.text,
                  fontFamily: "BricolageGrotesque_700Bold",
                },
              ]}
            >
              {d.dayNum}
            </Text>
            {d.dayInts.length > 0 ? (
              <View style={[styles.meetingDot, { backgroundColor: colors.brand }]} />
            ) : (
              <View style={{ height: 6 }} />
            )}
          </View>
        ))}
      </ScrollView>

      {/* Top Priority Students */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
            ]}
          >
            Who to meet first
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: colors.riskHighSoft }]}>
            <Text style={[styles.priorityBadgeText, { color: colors.riskHigh }]}>Top 5</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/students")}>
          <Text style={[styles.seeAllText, { color: colors.brand }]}>All students</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.studentsList}>
        {meetFirst.map((st) => (
          <TouchableOpacity
            key={st.id}
            style={[
              styles.studentCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => router.push(`/student/${st.id}`)}
            activeOpacity={0.7}
          >
            <ScoreRing score={st.success_score ?? 50} size={50} strokeWidth={5} />
            <View style={styles.studentInfo}>
              <Text
                style={[
                  styles.studentName,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                {st.name}
              </Text>
              <Text style={[styles.studentMeta, { color: colors.mutedText }]}>
                {st.id} · {st.branch} (Yr {st.year})
              </Text>
              <View style={styles.riskRow}>
                <RiskBadge level={st.academic_risk_level} label="Academic" size="sm" />
                {st.placement_risk_level && st.placement_risk_level !== "N/A" && (
                  <RiskBadge level={st.placement_risk_level} label="Placement" size="sm" />
                )}
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedText} />
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
    gap: 16,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: "700",
  },
  roleBadge: {
    fontSize: 11.5,
    marginTop: 1,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  intelCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  artPositioner: {
    position: "absolute",
    right: -20,
    top: -15,
    opacity: 0.5,
  },
  intelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  intelPillText: {
    fontSize: 11,
    fontWeight: "700",
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
    fontSize: 14.5,
    lineHeight: 20,
  },
  intelFootnote: {
    fontSize: 11,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  statTitle: {
    fontSize: 10,
    fontWeight: "600",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 1,
  },
  statDetail: {
    fontSize: 9.5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  seeAllText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  calendarStrip: {
    gap: 8,
  },
  calendarDayCard: {
    width: 52,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  calendarDayName: {
    fontSize: 11,
    fontWeight: "600",
  },
  calendarDayNum: {
    fontSize: 15,
  },
  meetingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  studentsList: {
    gap: 8,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  studentInfo: {
    flex: 1,
    gap: 3,
  },
  studentName: {
    fontSize: 14,
  },
  studentMeta: {
    fontSize: 11.5,
  },
  riskRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
});
