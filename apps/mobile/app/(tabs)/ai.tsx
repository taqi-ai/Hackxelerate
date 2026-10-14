import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/lib/theme";
import { VoiceAiVisualizer } from "../../src/components/VoiceAiVisualizer";
import { fetchDashboardStats, fetchStudentRows } from "../../src/lib/api";
import { triggerHaptic } from "../../src/lib/haptics";
import { BrandMark } from "../../src/components/BrandMark";
import { AnimatedAscoraArt } from "../../src/components/AnimatedAscoraArt";
import type { StudentRow } from "../../src/lib/types";


interface InsightResponse {
  query: string;
  summary: string;
  keyPoints: string[];
  suggestedAction: string;
  recommendedStudents?: StudentRow[];
}

export default function AiScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<InsightResponse | null>(null);
  const [stats, setStats] = useState({ highAcademic: 0, silentDecliners: 0 });

  useEffect(() => {
    (async () => {
      try {
        const st = await fetchDashboardStats();
        setStats({
          highAcademic: st.highAcademic,
          silentDecliners: st.silentDecliners,
        });
      } catch (err) {
        console.error("AiScreen stats load error:", err);
      }
    })();
  }, []);

  /** Answers are built only from the rows the signed-in user can see: no invented figures. */
  const handleRunQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    triggerHaptic("medium");
    setIsProcessing(true);
    setResponse(null);
    try {
      const lower = queryText.toLowerCase();
      const filter = /silent|decliner|lms|login/.test(lower)
        ? "silent_decliner"
        : /placement|interview|job|mock/.test(lower)
          ? "placement_high"
          : "academic_high";
      const [st, res] = await Promise.all([
        fetchDashboardStats(),
        fetchStudentRows({ filter, orderByPriority: true, pageSize: 100 }),
      ]);
      const rows = res.rows;
      if (st.totalStudents === 0) {
        setResponse({
          query: queryText,
          summary: "No student data is available for this account, so there is nothing to summarise yet.",
          keyPoints: ["Sign in with a head of department or mentor account to see cohort data."],
          suggestedAction: "Check your connection and sign in again.",
        });
        triggerHaptic("error");
        return;
      }
      const label =
        filter === "silent_decliner"
          ? "silent decliners"
          : filter === "placement_high"
            ? "students at high placement risk"
            : "students at high academic risk";
      const total =
        filter === "silent_decliner" ? st.silentDecliners : filter === "placement_high" ? st.highPlacement : st.highAcademic;
      // most common alert types among the listed students, counted from their real alerts
      const counts = new Map<string, { n: number; text: string }>();
      rows.forEach((r) => {
        const seen = new Set<string>();
        r.alerts.forEach((al) => {
          if (seen.has(al.type)) return;
          seen.add(al.type);
          const cur = counts.get(al.type);
          counts.set(al.type, { n: (cur?.n ?? 0) + 1, text: cur?.text ?? al.text });
        });
      });
      const top = [...counts.entries()].sort((x, y) => y[1].n - x[1].n).slice(0, 3);
      const ACTION: Record<string, string> = {
        attendance_drop: "a mentor meeting about attendance",
        backlogs: "peer tutoring for the backlog subjects",
        no_mock: "a mock interview",
        assignments: "peer tutoring on assignments",
        silent_decliner: "a short informal check-in before marks drop",
        lms_silent: "a short informal check-in before marks drop",
      };
      const first = top[0]?.[0];
      {
        const avg = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.success_score, 0) / rows.length) : null;
        setResponse({
          query: queryText,
          summary:
            `${total} of ${st.totalStudents} students you can see are ${label}` +
            (avg !== null ? `. The ${rows.length} highest priority of them average a Success Score of ${avg}, against ${st.avgScore} for everyone.` : "."),
          keyPoints: top.length
            ? top.map(([, v]) => `${v.n} of the top ${rows.length}: ${v.text}`)
            : ["No alert details are available for these students."],
          suggestedAction: first && ACTION[first] ? `Most common driver points to ${ACTION[first]}. Open a student to book it.` : "Open a student to see their drivers and book an intervention.",
          recommendedStudents: rows.slice(0, 3),
        });
        triggerHaptic("success");
      }
    } catch (err) {
      setResponse({
        query: queryText,
        summary: "Could not load the cohort data right now.",
        keyPoints: [err instanceof Error ? err.message : "Unknown error"],
        suggestedAction: "Try again in a moment.",
      });
      triggerHaptic("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const SUGGESTED_PROMPTS = [
    "Generate morning campus briefing",
    "Identify silent decliners needing check-ins",
    "Synthesize top actionable SHAP levers",
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 16) + 12,
          paddingBottom: Math.max(insets.bottom, 16) + 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
              Ask Ascora
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              Plain-language summaries of your live cohort data
            </Text>
          </View>
          <View style={styles.headerArt}>
            <AnimatedAscoraArt kind="chat" width={80} height={44} />
          </View>
        </View>
      </View>


      {/* Hero Visualizer matching user's reference */}
      <VoiceAiVisualizer
        onSelectPrompt={handleRunQuery}
        highRiskCount={stats.highAcademic}
        silentDeclinersCount={stats.silentDecliners}
      />

      {/* Natural language query bar */}
      <View
        style={[
          styles.queryCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <Text style={[styles.queryLabel, { color: colors.text }]}>Ask Campus Intelligence</Text>
        <View
          style={[
            styles.queryInputRow,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedText} />
          <TextInput
            style={[styles.queryInput, { color: colors.text }]}
            placeholder="Ask anything about student cohort or risk drivers..."
            placeholderTextColor={colors.mutedText}
            value={prompt}
            onChangeText={setPrompt}
            onSubmitEditing={() => handleRunQuery(prompt)}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.brand }]}
            onPress={() => handleRunQuery(prompt)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#07070b" />
            ) : (
              <Feather name="arrow-up" size={16} color="#07070b" />
            )}
          </TouchableOpacity>
        </View>

        {/* Prompt suggestion pills */}
        <View style={styles.promptPillsRow}>
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.promptPill,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() => {
                setPrompt(p);
                handleRunQuery(p);
              }}
            >
              <Text style={[styles.promptPillText, { color: colors.brand }]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Synthesis Output Display */}
      {response && (
        <View
          style={[
            styles.responseCard,
            {
              backgroundColor: isDark ? "#0d0d18" : colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.responseHeader}>
            <View style={[styles.aiBadge, { backgroundColor: colors.brandSoft }]}>
              <Feather name="check" size={12} color={colors.brand} />
              <Text style={[styles.aiBadgeText, { color: colors.brand }]}>Live data summary</Text>
            </View>
            <Text style={[styles.queryQuery, { color: colors.mutedText }]}>
              &quot;{response.query}&quot;
            </Text>
          </View>

          <Text style={[styles.summaryText, { color: colors.text }]}>
            {response.summary}
          </Text>

          <View style={styles.keyPointsList}>
            {response.keyPoints.map((pt, i) => (
              <View key={i} style={styles.keyPointRow}>
                <View style={[styles.bullet, { backgroundColor: colors.brand }]} />
                <Text style={[styles.keyPointText, { color: colors.text }]}>{pt}</Text>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.actionBox,
              { backgroundColor: colors.brandSoft, borderColor: colors.brand },
            ]}
          >
            <Feather name="arrow-right-circle" size={16} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.brand }]}>Recommended Action</Text>
              <Text style={[styles.actionBody, { color: colors.text }]}>
                {response.suggestedAction}
              </Text>
            </View>
          </View>

          {response.recommendedStudents && response.recommendedStudents.length > 0 && (
            <View style={styles.studentsFocus}>
              <Text style={[styles.focusTitle, { color: colors.mutedText }]}>
                Top students requiring outreach
              </Text>
              {response.recommendedStudents.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.studentPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => router.push(`/student/${st.id}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stName, { color: colors.text }]}>{st.name}</Text>
                    <Text style={[styles.stMeta, { color: colors.mutedText }]}>
                      {st.id} · Priority rank #{st.priority}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedText} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
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
  header: {
    marginBottom: 4,
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
  queryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  queryLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  queryInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 46,
    paddingHorizontal: 12,
    gap: 8,
  },
  queryInput: {
    flex: 1,
    height: "100%",
    fontSize: 13,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  promptPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  promptPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  promptPillText: {
    fontSize: 11,
    fontWeight: "500",
  },
  responseCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  responseHeader: {
    gap: 4,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  queryQuery: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  keyPointsList: {
    gap: 8,
  },
  keyPointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
  keyPointText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  actionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  actionBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  studentsFocus: {
    gap: 8,
    marginTop: 4,
  },
  focusTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  studentPill: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  stName: {
    fontSize: 13,
    fontWeight: "600",
  },
  stMeta: {
    fontSize: 11,
    marginTop: 2,
  },
});
