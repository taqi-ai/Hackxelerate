import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from "@expo-google-fonts/bricolage-grotesque";
import { ThemeProvider, useTheme } from "../src/lib/theme";
import { supabase } from "../src/lib/supabase";
import { WebSimulatorWrapper } from "../src/components/WebSimulatorWrapper";

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { isDark, colors } = useTheme();

  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setSessionChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setSessionChecked(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;

    const currentRoute = segments[0];
    const isPublicRoute = currentRoute === "welcome" || currentRoute === "sign-in";

    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/welcome");
    } else if (isAuthenticated && isPublicRoute) {
      router.replace("/(tabs)");
    }
  }, [sessionChecked, isAuthenticated, segments, router]);

  if (!sessionChecked) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="student/[id]"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <WebSimulatorWrapper>
        <ThemeProvider>
          <AuthGate />
        </ThemeProvider>
      </WebSimulatorWrapper>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
