import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../src/lib/theme";

const TEAM = [
  { name: "Taqi", role: "Team Lead" },
  { name: "Ashmit Tiwari", role: "Full Stack & ML" },
  { name: "Ujjwal Gupta", role: "Data Engineering" },
  { name: "Harsh Gupta", role: "Systems & Security" },
  { name: "Lakshya Singh Parihar", role: "UI & Product" },
];

export default function AboutScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
          accessibilityLabel="Back to settings"
        >
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>About Ascora</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
        ]}
      >
        {/* Brand Hero */}
        <View style={styles.brandHero}>
          <Image
            source={require("../assets/icon-512-transparent.png")}
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
          <Text style={[styles.challengeBadge, { color: colors.brand }]}>
            HacXLerate 2026 · Challenge 04
          </Text>
        </View>

        {/* Mission Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            Challenge Overview
          </Text>
          <Text style={[styles.bodyText, { color: colors.text }]}>
            Ascora was built for KPMG in India&apos;s Smart Campus Analytics challenge at HacXLerate 2026 by byteXL.
          </Text>
          <Text style={[styles.bodyText, { color: colors.mutedText, marginTop: 6 }]}>
            It empowers university leadership, heads of department, and faculty mentors with continuous student-success intelligence, explainable SHAP risk drivers, counterfactual recourse, and closed-loop intervention tracking.
          </Text>
        </View>

        {/* Team Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text, fontFamily: "BricolageGrotesque_700Bold" },
            ]}
          >
            Engineering Team
          </Text>
          <Text style={[styles.collegeMeta, { color: colors.brand }]}>
            B.Tech AIML, 2nd year, Sem 3, CU UP campus
          </Text>

          <View style={styles.teamList}>
            {TEAM.map((member, i) => (
              <View
                key={member.name}
                style={[
                  styles.teamRow,
                  { borderBottomColor: colors.cardBorder, borderBottomWidth: i === TEAM.length - 1 ? 0 : 0.5 },
                ]}
              >
                <View style={[styles.memberDot, { backgroundColor: colors.brand }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.name}
                  </Text>
                  <Text style={[styles.memberRole, { color: colors.mutedText }]}>
                    {member.role}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Generated Cohort Disclaimer */}
        <View
          style={[
            styles.disclaimerCard,
            { backgroundColor: colors.surface, borderColor: colors.cardBorder },
          ]}
        >
          <Feather name="shield" size={18} color={colors.mutedText} />
          <Text style={[styles.disclaimerText, { color: colors.mutedText }]}>
            The students shown are a generated sample cohort. No real student data is used.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  brandHero: {
    alignItems: "center",
    paddingVertical: 12,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  challengeBadge: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  collegeMeta: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  teamList: {
    marginTop: 6,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  memberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
  },
  memberRole: {
    fontSize: 11,
    marginTop: 1,
  },
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
});
