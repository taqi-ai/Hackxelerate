import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../src/lib/theme";
import { supabase, isSupabaseConfigured } from "../src/lib/supabase";
import { triggerHaptic } from "../src/lib/haptics";
import { playSound } from "../src/lib/sound";
import { BrandMark } from "../src/components/BrandMark";
import { AuroraBackground } from "../src/components/AuroraBackground";

const SHARED_PASSWORD = "AscoraDemo#2026";

const QUICK_ROLES = [
  {
    label: "HOD / Admin",
    email: "admin@ascora.test",
    hint: "Whole campus access (all 1,200 students)",
  },
  {
    label: "Faculty mentor",
    email: "mentor@ascora.test",
    hint: "Assigned mentoring cohort (64 students)",
  },
];

const STUDENT_DEMO_PICKS = [
  { id: "CU24AIML0001", name: "Daksh Bakshi", branch: "CSE-AIML", year: 3 },
  { id: "CU24AIML0039", name: "Arjun Gupta", branch: "CSE-AIML", year: 3 },
];

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<"institutional" | "student">("institutional");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      triggerHaptic("error");
      playSound("error");
      setError("Enter your email and password, or pick a role below.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        triggerHaptic("error");
        playSound("error");
        if (!isSupabaseConfigured || signInError.message?.toLowerCase().includes("invalid api key")) {
          setError(
            "Supabase credentials not configured in apps/mobile/.env. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to log in."
          );
        } else if (signInError.message === "Invalid login credentials") {
          setError("That email and password do not match an account. Check them or pick an account below.");
        } else {
          setError(signInError.message);
        }
      } else {
        triggerHaptic("success");
        playSound("success");
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      triggerHaptic("error");
      playSound("error");
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleEmail: string) => {
    triggerHaptic("light");
    playSound("tap");
    setEmail(roleEmail);
    setPassword(SHARED_PASSWORD);
    setError(null);
  };

  const handleStudentPick = (studentId: string) => {
    triggerHaptic("medium");
    playSound("tap");
    // Navigate straight to student detail preview
    router.push({
      pathname: "/student/[id]",
      params: { id: studentId },
    });
  };

  return (
    <AuroraBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 24) + 16,
              paddingBottom: Math.max(insets.bottom, 24) + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.header}>
            <BrandMark size={42} showSubtitle={false} />
            <Text
              style={[
                styles.appTagline,
                { color: colors.mutedText },
              ]}
            >
              From early warning to real intervention
            </Text>
          </View>

          {/* Role Navigation Tab Switcher matching Website LoginForm */}
          <View
            style={[
              styles.tabSwitcher,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "institutional" && {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
              onPress={() => {
                playSound("toggle");
                setActiveTab("institutional");
              }}
              activeOpacity={0.8}
            >
              <Feather
                name="key"
                size={14}
                color={activeTab === "institutional" ? colors.brand : colors.mutedText}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === "institutional" ? colors.text : colors.mutedText,
                    fontWeight: activeTab === "institutional" ? "700" : "500",
                  },
                ]}
              >
                Faculty & Admin
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "student" && {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
              onPress={() => {
                playSound("toggle");
                setActiveTab("student");
              }}
              activeOpacity={0.8}
            >
              <Feather
                name="user"
                size={14}
                color={activeTab === "student" ? colors.brand : colors.mutedText}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === "student" ? colors.text : colors.mutedText,
                    fontWeight: activeTab === "student" ? "700" : "500",
                  },
                ]}
              >
                Student Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {activeTab === "institutional" ? (
              <>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                  ]}
                >
                  Welcome back
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.mutedText }]}>
                  Use your college account. Access depends on your role.
                </Text>

                {/* Email input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <Feather name="mail" size={16} color={colors.mutedText} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="name@college.edu..."
                      placeholderTextColor={colors.mutedText}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <Feather name="lock" size={16} color={colors.mutedText} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Password"
                      placeholderTextColor={colors.mutedText}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {error && (
                  <View
                    style={[
                      styles.errorBox,
                      { backgroundColor: colors.riskHighSoft, borderColor: colors.riskHigh },
                    ]}
                  >
                    <Feather name="alert-circle" size={15} color={colors.riskHigh} />
                    <Text style={[styles.errorText, { color: colors.riskHigh }]}>{error}</Text>
                  </View>
                )}

                {/* Sign in button */}
                <TouchableOpacity
                  style={[
                    styles.signInBtn,
                    {
                      backgroundColor: colors.brand,
                      opacity: loading ? 0.75 : 1,
                    },
                  ]}
                  onPress={handleSignIn}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#07070b" />
                  ) : (
                    <Text style={styles.signInBtnText}>Sign in</Text>
                  )}
                </TouchableOpacity>

                {/* Quick sign-in list */}
                <View style={styles.quickSection}>
                  <Text
                    style={[
                      styles.quickSectionTitle,
                      { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                    ]}
                  >
                    Quick sign-in
                  </Text>

                  <View style={styles.quickGrid}>
                    {QUICK_ROLES.map((role) => (
                      <TouchableOpacity
                        key={role.email}
                        style={[
                          styles.quickCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.cardBorder,
                          },
                        ]}
                        onPress={() => handleQuickFill(role.email)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.quickRow}>
                          <Text
                            style={[
                              styles.quickRoleLabel,
                              { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                            ]}
                          >
                            {role.label}
                          </Text>
                          <Feather name="arrow-right" size={14} color={colors.brand} />
                        </View>
                        <Text style={[styles.quickEmail, { color: colors.brand }]}>{role.email}</Text>
                        <Text style={[styles.quickHint, { color: colors.mutedText }]}>{role.hint}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            ) : (
              /* Student Portal Quick Chooser matching Website */
              <View style={styles.studentChooserWrap}>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                  ]}
                >
                  Student 360 View
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.mutedText }]}>
                  Select a student profile from the cohort to view personal grades, attendance simulators, and ML recourse.
                </Text>

                <View style={styles.studentGrid}>
                  {STUDENT_DEMO_PICKS.map((st) => (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.quickCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.cardBorder,
                        },
                      ]}
                      onPress={() => handleStudentPick(st.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.quickRow}>
                        <Text
                          style={[
                            styles.quickRoleLabel,
                            { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
                          ]}
                        >
                          {st.name}
                        </Text>
                        <Feather name="arrow-right" size={14} color={colors.brand} />
                      </View>
                      <Text style={[styles.quickEmail, { color: colors.brand }]}>{st.id}</Text>
                      <Text style={[styles.quickHint, { color: colors.mutedText }]}>
                        {st.branch} · Year {st.year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <Text style={[styles.disclaimerText, { color: colors.mutedText }]}>
            Shared evaluation credentials · Synthetic data only · KPMG Challenge 04
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },
  tabSwitcher: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabBtnText: {
    fontSize: 13,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  errorText: {
    fontSize: 12.5,
    flex: 1,
    lineHeight: 16,
  },
  signInBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  signInBtnText: {
    color: "#07070b",
    fontSize: 15,
    fontWeight: "700",
  },
  quickSection: {
    marginTop: 8,
    gap: 10,
  },
  quickSectionTitle: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  quickGrid: {
    gap: 8,
  },
  quickCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickRoleLabel: {
    fontSize: 13,
  },
  quickEmail: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  quickHint: {
    fontSize: 11,
  },
  studentChooserWrap: {
    gap: 12,
  },
  studentGrid: {
    gap: 8,
    marginTop: 4,
  },
  disclaimerText: {
    textAlign: "center",
    fontSize: 11.5,
    marginTop: 4,
  },
});
