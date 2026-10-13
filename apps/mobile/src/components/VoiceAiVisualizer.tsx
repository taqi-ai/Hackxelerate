import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { triggerHaptic } from "../lib/haptics";

interface VoiceAiVisualizerProps {
  onSelectPrompt?: (prompt: string) => void;
  highRiskCount?: number;
  silentDeclinersCount?: number;
}

export function VoiceAiVisualizer({
  onSelectPrompt,
  highRiskCount = 42,
  silentDeclinersCount = 18,
}: VoiceAiVisualizerProps) {
  const { colors, isDark } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeVoice, setActiveVoice] = useState<"briefing" | "insights" | "actions">("briefing");
  const [waveOffset, setWaveOffset] = useState(0);

  // Animated wave pulse
  useEffect(() => {
    let animId: any;
    if (isPlaying) {
      animId = setInterval(() => {
        setWaveOffset((prev) => (prev + 1) % 40);
      }, 50);
    }
    return () => {
      if (animId) clearInterval(animId);
    };
  }, [isPlaying]);

  const togglePlayback = () => {
    triggerHaptic("medium");
    setIsPlaying(!isPlaying);
  };

  const selectVoice = (voice: "briefing" | "insights" | "actions") => {
    triggerHaptic("light");
    setActiveVoice(voice);
    setIsPlaying(true);
    if (onSelectPrompt) {
      if (voice === "briefing") onSelectPrompt("Generate morning campus briefing");
      else if (voice === "insights") onSelectPrompt("Analyze academic vs placement risk correlations");
      else onSelectPrompt("Suggest immediate intervention priority order");
    }
  };

  // Generate waveform path points
  const generateWavePath = (amplitude: number, freq: number, phase: number) => {
    const width = 280;
    const midY = 32;
    let d = `M 0 ${midY}`;
    for (let x = 0; x <= width; x += 10) {
      const y =
        midY +
        Math.sin((x / width) * Math.PI * freq + phase) *
          Math.sin((x / width) * Math.PI) *
          amplitude;
      d += ` L ${x} ${y.toFixed(1)}`;
    }
    return d;
  };

  const wave1 = generateWavePath(isPlaying ? 22 : 6, 4, waveOffset * 0.15);
  const wave2 = generateWavePath(isPlaying ? 16 : 4, 6, -waveOffset * 0.2 + 1);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#06060a" : colors.card, borderColor: colors.cardBorder }]}>
      {/* Background stippled particle grid / glow dome */}
      <View style={styles.domeWrapper}>
        <Svg width="100%" height={160} viewBox="0 0 320 160">
          <Defs>
            <LinearGradient id="domeGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colors.brand} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={colors.brand} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
          {/* Subtle dotted particles in radial arc */}
          {Array.from({ length: 42 }).map((_, i) => {
            const angle = (i / 42) * Math.PI;
            const r = 110 + (i % 3) * 12;
            const cx = 160 + r * Math.cos(angle);
            const cy = 150 - r * Math.sin(angle);
            return (
              <Circle
                key={i}
                cx={cx}
                cy={cy}
                r={i % 4 === 0 ? 1.8 : 1}
                fill={colors.brand}
                opacity={(i % 2 === 0 ? 0.45 : 0.2) * (isPlaying ? 1 : 0.6)}
              />
            );
          })}
        </Svg>
      </View>

      {/* Main card content */}
      <View style={styles.cardHeader}>
        <View style={styles.tagPill}>
          <View style={[styles.liveDot, { backgroundColor: colors.brand }]} />
          <Text style={[styles.tagText, { color: colors.brand }]}>ASCORA VOICE AI</Text>
        </View>
        <Text style={[styles.headline, { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" }]}>
          Campus intelligence at the speed of thought
        </Text>
        <Text style={[styles.subheadline, { color: colors.mutedText }]}>
          Real-time proactive voice synthesis and student risk analytics for university leadership.
        </Text>
      </View>

      {/* Central Interactive Voice Player Console */}
      <View style={[styles.consoleCard, { backgroundColor: isDark ? "rgba(18, 18, 28, 0.7)" : colors.surface, borderColor: colors.cardBorder }]}>
        <View style={styles.consoleHeader}>
          <View>
            <Text style={[styles.consoleTitle, { color: colors.text }]}>
              {activeVoice === "briefing"
                ? "Daily Faculty Briefing"
                : activeVoice === "insights"
                ? "Cohort Risk Synthesis"
                : "Intervention Routing"}
            </Text>
            <Text style={[styles.consoleMeta, { color: colors.mutedText }]}>
              {isPlaying ? "Streaming voice output..." : "Ready to synthesize"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.brand }]}
            onPress={togglePlayback}
            accessibilityLabel={isPlaying ? "Pause voice" : "Play voice"}
          >
            <Feather
              name={isPlaying ? "pause" : "play"}
              size={18}
              color="#07070b"
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          </TouchableOpacity>
        </View>

        {/* Dynamic audio waveform visualizer */}
        <View style={styles.waveformContainer}>
          <Svg width="100%" height={64} viewBox="0 0 280 64">
            <Path
              d={wave1}
              stroke={colors.brand}
              strokeWidth={2}
              fill="none"
              opacity={0.9}
            />
            <Path
              d={wave2}
              stroke={colors.riskLow}
              strokeWidth={1.5}
              fill="none"
              opacity={0.65}
            />
          </Svg>
        </View>

        {/* Quick action triggers */}
        <View style={styles.voiceActions}>
          <TouchableOpacity
            style={[
              styles.actionPill,
              {
                backgroundColor: activeVoice === "briefing" ? colors.brandSoft : "transparent",
                borderColor: activeVoice === "briefing" ? colors.brand : colors.cardBorder,
              },
            ]}
            onPress={() => selectVoice("briefing")}
          >
            <Feather name="mic" size={12} color={activeVoice === "briefing" ? colors.brand : colors.mutedText} />
            <Text
              style={[
                styles.actionPillText,
                { color: activeVoice === "briefing" ? colors.brand : colors.mutedText },
              ]}
            >
              Morning Brief
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionPill,
              {
                backgroundColor: activeVoice === "insights" ? colors.brandSoft : "transparent",
                borderColor: activeVoice === "insights" ? colors.brand : colors.cardBorder,
              },
            ]}
            onPress={() => selectVoice("insights")}
          >
            <Feather name="activity" size={12} color={activeVoice === "insights" ? colors.brand : colors.mutedText} />
            <Text
              style={[
                styles.actionPillText,
                { color: activeVoice === "insights" ? colors.brand : colors.mutedText },
              ]}
            >
              Risk Summary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionPill,
              {
                backgroundColor: activeVoice === "actions" ? colors.brandSoft : "transparent",
                borderColor: activeVoice === "actions" ? colors.brand : colors.cardBorder,
              },
            ]}
            onPress={() => selectVoice("actions")}
          >
            <Feather name="check-circle" size={12} color={activeVoice === "actions" ? colors.brand : colors.mutedText} />
            <Text
              style={[
                styles.actionPillText,
                { color: activeVoice === "actions" ? colors.brand : colors.mutedText },
              ]}
            >
              Plan Actions
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Real-time stats footer cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: isDark ? "#0d0d16" : colors.surface, borderColor: colors.cardBorder }]}>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>Priority flags</Text>
          <Text style={[styles.statValue, { color: colors.riskHigh }]}>{highRiskCount}</Text>
          <Text style={[styles.statSub, { color: colors.mutedText }]}>high academic risk</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: isDark ? "#0d0d16" : colors.surface, borderColor: colors.cardBorder }]}>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>Silent decliners</Text>
          <Text style={[styles.statValue, { color: colors.riskMedium }]}>{silentDeclinersCount}</Text>
          <Text style={[styles.statSub, { color: colors.mutedText }]}>lms drop alerts</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    position: "relative",
    overflow: "hidden",
  },
  domeWrapper: {
    position: "absolute",
    top: -20,
    left: 0,
    right: 0,
    alignItems: "center",
    opacity: 0.9,
  },
  cardHeader: {
    marginBottom: 16,
    zIndex: 2,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headline: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subheadline: {
    fontSize: 13,
    lineHeight: 18,
  },
  consoleCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    zIndex: 2,
  },
  consoleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  consoleTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  consoleMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  waveformContainer: {
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  voiceActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    zIndex: 2,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statSub: {
    fontSize: 10,
    marginTop: 2,
  },
});
