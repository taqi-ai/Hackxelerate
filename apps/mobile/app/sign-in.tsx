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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../src/lib/theme";
import { supabase, isSupabaseConfigured } from "../src/lib/supabase";
import { triggerHaptic } from "../src/lib/haptics";

import { playSound } from "../src/lib/sound";

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

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
          setError("Invalid email or password. Pick a quick role below to fill.");
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
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
          <Image
            source={require("../assets/mark.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.appName,
              { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            Ascora
          </Text>
          <Text style={[styles.appTagline, { color: colors.mutedText }]}>
            AI Student Success Companion
          </Text>
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
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
            ]}
          >
            Sign in to your account
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
                placeholder="name@college.edu"
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
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#07070b" />
            ) : (
              <Text style={styles.signInBtnText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Sign-in Section */}
        <View style={styles.quickSection}>
          <Text
            style={[
              styles.quickSectionTitle,
              { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
            ]}
          >
            Quick sign-in
          </Text>
          <Text style={[styles.quickSectionSubtitle, { color: colors.mutedText }]}>
            Evaluation roles with shared credentials
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

          <Text style={[styles.disclaimerText, { color: colors.mutedText }]}>
            Shared password: <Text style={{ fontFamily: "monospace", color: colors.brand }}>{SHARED_PASSWORD}</Text>
            . Select a role above to auto-fill.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  signInBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  signInBtnText: {
    color: "#07070b",
    fontSize: 15,
    fontWeight: "700",
  },
  quickSection: {
    gap: 10,
  },
  quickSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  quickSectionSubtitle: {
    fontSize: 12,
  },
  quickGrid: {
    gap: 10,
    marginTop: 4,
  },
  quickCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    minHeight: 56,
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickRoleLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  quickEmail: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  quickHint: {
    fontSize: 11,
    marginTop: 2,
  },
  disclaimerText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 8,
  },
});
