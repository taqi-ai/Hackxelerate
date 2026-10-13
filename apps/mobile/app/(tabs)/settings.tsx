import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme, ThemeMode } from "../../src/lib/theme";
import { fetchCurrentProfile } from "../../src/lib/api";
import { supabase } from "../../src/lib/supabase";
import { triggerHaptic } from "../../src/lib/haptics";
import type { Profile } from "../../src/lib/types";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    colors,
    mode,
    setMode,
    reduceMotion,
    setReduceMotion,
    hapticsEnabled,
    setHapticsEnabled,
    defaultHours,
    setDefaultHours,
  } = useTheme();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const prof = await fetchCurrentProfile();
        setProfile(prof);
      } catch (err) {
        console.error("Settings load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSignOut = async () => {
    triggerHaptic("medium");
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/sign-in");
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setSigningOut(false);
    }
  };

  const handleHoursChange = (delta: number) => {
    triggerHaptic("light");
    const next = Math.min(10, Math.max(1, Math.round((defaultHours + delta) * 2) / 2));
    setDefaultHours(next);
  };

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
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
          ]}
        >
          Settings
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>
          Account preferences and device configuration
        </Text>
      </View>

      {/* Profile Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: colors.brandSoft, borderColor: colors.brand },
              ]}
            >
              <Feather name="user" size={24} color={colors.brand} />
            </View>

            <View style={styles.profileDetails}>
              <Text
                style={[
                  styles.profileName,
                  { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                ]}
              >
                {profile?.full_name || "Faculty Member"}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.mutedText }]}>
                {profile?.email || ""}
              </Text>

              <View style={styles.scopeBadge}>
                <Feather
                  name={profile?.role === "admin" ? "globe" : "shield"}
                  size={12}
                  color={colors.brand}
                />
                <Text style={[styles.scopeText, { color: colors.brand }]}>
                  {profile?.role === "admin"
                    ? "HOD Scope: All 1,200 students"
                    : "Mentor Scope: Assigned students"}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Theme Selection */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <View style={styles.themeOptionsRow}>
          {(["system", "dark", "light"] as ThemeMode[]).map((t) => {
            const isSelected = mode === t;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.themeBtn,
                  {
                    backgroundColor: isSelected ? colors.brand : colors.surface,
                    borderColor: isSelected ? colors.brand : colors.cardBorder,
                  },
                ]}
                onPress={() => {
                  triggerHaptic("light");
                  setMode(t);
                }}
              >
                <Feather
                  name={t === "dark" ? "moon" : t === "light" ? "sun" : "smartphone"}
                  size={14}
                  color={isSelected ? "#07070b" : colors.text}
                />
                <Text
                  style={[
                    styles.themeBtnText,
                    {
                      color: isSelected ? "#07070b" : colors.text,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Preferences Controls */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>

        {/* Reduce Motion */}
        <View style={styles.prefRow}>
          <View style={styles.prefLabelCol}>
            <Text style={[styles.prefLabel, { color: colors.text }]}>Reduce motion</Text>
            <Text style={[styles.prefSub, { color: colors.mutedText }]}>
              Minimize transitions and animations for smoother performance
            </Text>
          </View>
          <Switch
            value={reduceMotion}
            onValueChange={(v) => {
              triggerHaptic("light");
              setReduceMotion(v);
            }}
            trackColor={{ false: colors.cardBorder, true: colors.brand }}
          />
        </View>

        {/* Haptics */}
        <View style={[styles.prefRow, { borderTopColor: colors.cardBorder, borderTopWidth: 0.5, paddingTop: 12 }]}>
          <View style={styles.prefLabelCol}>
            <Text style={[styles.prefLabel, { color: colors.text }]}>Haptic feedback</Text>
            <Text style={[styles.prefSub, { color: colors.mutedText }]}>
              Subtle tactile response on taps and interactions
            </Text>
          </View>
          <Switch
            value={hapticsEnabled}
            onValueChange={(v) => {
              triggerHaptic("light");
              setHapticsEnabled(v);
            }}
            trackColor={{ false: colors.cardBorder, true: colors.brand }}
          />
        </View>

        {/* Default weekly hours */}
        <View style={[styles.prefRow, { borderTopColor: colors.cardBorder, borderTopWidth: 0.5, paddingTop: 12 }]}>
          <View style={styles.prefLabelCol}>
            <Text style={[styles.prefLabel, { color: colors.text }]}>Default weekly hours</Text>
            <Text style={[styles.prefSub, { color: colors.mutedText }]}>
              Initial budget for This Week planner ({defaultHours}h)
            </Text>
          </View>
          <View style={styles.stepperMini}>
            <TouchableOpacity
              style={[styles.miniStepBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={() => handleHoursChange(-0.5)}
            >
              <Feather name="minus" size={14} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.hoursNum, { color: colors.text }]}>{defaultHours}h</Text>
            <TouchableOpacity
              style={[styles.miniStepBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={() => handleHoursChange(0.5)}
            >
              <Feather name="plus" size={14} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Cohort Disclaimer Notice */}
      <View
        style={[
          styles.noticeCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <Feather name="info" size={15} color={colors.mutedText} />
        <Text style={[styles.noticeText, { color: colors.mutedText }]}>
          The students shown are a generated sample cohort. No real student data is used.
        </Text>
      </View>

      {/* Links & Actions */}
      <View style={styles.actionsList}>
        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
          onPress={() => router.push("/about")}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <Feather name="award" size={18} color={colors.brand} />
            <Text style={[styles.actionTitle, { color: colors.text }]}>About Ascora & Team</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.riskHigh,
            },
          ]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <Feather name="log-out" size={18} color={colors.riskHigh} />
            <Text style={[styles.actionTitle, { color: colors.riskHigh }]}>
              {signingOut ? "Signing out..." : "Sign out"}
            </Text>
          </View>
        </TouchableOpacity>
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileDetails: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
  },
  profileEmail: {
    fontSize: 12,
  },
  scopeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  scopeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  themeOptionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  themeBtnText: {
    fontSize: 12,
  },
  prefRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  prefLabelCol: {
    flex: 1,
    gap: 2,
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  prefSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  stepperMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hoursNum: {
    fontSize: 13,
    fontWeight: "700",
    minWidth: 28,
    textAlign: "center",
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  noticeText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  actionsList: {
    gap: 10,
  },
  actionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 52,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
});
