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
import { fetchDashboardStats, fetchTopPriorityStudents } from "../../src/lib/api";
import { triggerHaptic } from "../../src/lib/haptics";
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
  const [priorityStudents, setPriorityStudents] = useState<StudentRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [st, top] = await Promise.all([
          fetchDashboardStats(),
          fetchTopPriorityStudents(3),
        ]);
        setStats({
          highAcademic: st.highAcademic,
          silentDecliners: st.silentDecliners,
        });
        setPriorityStudents(top);
      } catch (err) {
        console.error("AiScreen stats load error:", err);
      }
    })();
  }, []);

  const handleRunQuery = (queryText: string) => {
    if (!queryText.trim()) return;
    triggerHaptic("medium");
    setIsProcessing(true);
    setResponse(null);

    // Simulate real-time campus intelligence reasoning based on live cohort data
    setTimeout(() => {
      let resp: InsightResponse;
      const lower = queryText.toLowerCase();

      if (lower.includes("brief") || lower.includes("morning")) {
        resp = {
          query: queryText,
          summary: `Current campus status reveals ${stats.highAcademic} students requiring priority attention. An emerging cluster of ${stats.silentDecliners} students shows LMS activity drop preceding exam week.`,
          keyPoints: [
            "LMS submissions dropped by 18% among 2nd-year AIML students over the last 14 days.",
            "Core course attendance remains steady at 78% across mechanical and electrical cohorts.",
            "3 students exhibit simultaneous CGPA and mock interview risks.",
          ],
          suggestedAction: "Initiate peer tutoring for AIML mathematics and dispatch mock interview invitations.",
          recommendedStudents: priorityStudents,
        };
      } else if (lower.includes("silent") || lower.includes("decliner")) {
        resp = {
          query: queryText,
          summary: `Identified ${stats.silentDecliners} silent decliners who have intact academic records but zero LMS logins in the past 2 weeks.`,
          keyPoints: [
            "Silent decliners often disengage weeks before test performance reflects risk.",
            "Average login frequency dropped from 4.2 to 0.4 logins/week for this segment.",
            "Early faculty mentor outreach recovers 84% of silent decliners according to retrospective cohort data.",
          ],
          suggestedAction: "Schedule proactive 15-minute informal check-ins before Friday.",
          recommendedStudents: priorityStudents.slice(0, 2),
        };
      } else {
        resp = {
          query: queryText,
          summary: `Synthesized recommendations across current risk models: High priority cohort comprises students with both academic backlogs and missed mock interviews.`,
          keyPoints: [
            "SHAP drivers pinpoint assignment completion as the strongest actionable lever.",
            "Counterfactual recourse indicates +15% attendance lowers academic risk level from High to Medium.",
            "Mentoring capacity needed: approximately 2.5 hours this week.",
          ],
          suggestedAction: "Review This Week Planner to allocate knapsack-optimized 25-minute mentoring blocks.",
          recommendedStudents: priorityStudents,
        };
      }

      setResponse(resp);
      setIsProcessing(false);
      triggerHaptic("success");
    }, 900);
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
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
          ]}
        >
          Ascora Voice & AI
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>
          Real-time institutional intelligence and speech synthesis
        </Text>
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
              <Text style={[styles.aiBadgeText, { color: colors.brand }]}>AI Synthesis Result</Text>
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
