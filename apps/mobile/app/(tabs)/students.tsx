import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/lib/theme";
import { fetchStudentRows } from "../../src/lib/api";
import { ScoreRing } from "../../src/components/ScoreRing";
import { RiskBadge } from "../../src/components/RiskBadge";
import { StudentRowSkeleton } from "../../src/components/Skeleton";
import { EmptyState } from "../../src/components/EmptyState";
import { triggerHaptic } from "../../src/lib/haptics";
import { BrandMark } from "../../src/components/BrandMark";
import { AnimatedAscoraArt } from "../../src/components/AnimatedAscoraArt";
import type { StudentRow } from "../../src/lib/types";


type FilterType = "all" | "academic_high" | "placement_high" | "silent_decliner";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "academic_high", label: "High academic risk" },
  { key: "placement_high", label: "High placement risk" },
  { key: "silent_decliner", label: "Silent decliners" },
];

export default function StudentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  const debounceTimer = useRef<any>(null);
  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 300);
  };

  const loadStudents = useCallback(
    async (targetPage = 0, append = false) => {
      try {
        if (append) setLoadingMore(true);
        const res = await fetchStudentRows({
          page: targetPage,
          pageSize: 50,
          search: debouncedSearch,
          filter,
        });

        if (append) {
          setStudents((prev) => [...prev, ...res.rows]);
        } else {
          setStudents(res.rows);
        }

        setHasMore(res.hasMore);
        setPage(targetPage);
        setError(null);
      } catch (e: any) {
        console.error("fetchStudentRows error:", e);
        setError(e.message || "Failed to load students");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, filter]
  );

  useEffect(() => {
    let isCurrent = true;
    (async () => {
      try {
        const res = await fetchStudentRows({
          page: 0,
          pageSize: 50,
          search: debouncedSearch,
          filter,
        });
        if (!isCurrent) return;
        setStudents(res.rows);
        setHasMore(res.hasMore);
        setPage(0);
        setError(null);
      } catch (e: any) {
        if (isCurrent) setError(e.message || "Failed to load students");
      } finally {
        if (isCurrent) setLoading(false);
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [debouncedSearch, filter]);

  const onEndReached = () => {
    if (!loading && !loadingMore && hasMore) {
      loadStudents(page + 1, true);
    }
  };

  const renderItem = ({ item }: { item: StudentRow }) => (
    <TouchableOpacity
      style={[
        styles.rowCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
      onPress={() => {
        triggerHaptic("light");
        router.push(`/student/${item.id}`);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.scoreCol}>
        <ScoreRing score={item.success_score} size={46} strokeWidth={4} label="" />
      </View>

      <View style={styles.detailsCol}>
        <View style={styles.nameRow}>
          <Text
            style={[
              styles.nameText,
              { color: colors.text, fontFamily: "BricolageGrotesque_600SemiBold" },
            ]}
          >
            {item.name}
          </Text>
          <Text style={[styles.idText, { color: colors.mutedText }]}>{item.id}</Text>
        </View>

        <Text style={[styles.metaText, { color: colors.mutedText }]}>
          {item.branch} · Yr {item.year} · Sec {item.section}
        </Text>

        <View style={styles.pillsRow}>
          <RiskBadge
            level={item.academic_risk_level}
            prob={item.academic_risk_prob}
            label="Acad"
          />
          {item.placement_risk_level !== "N/A" && (
            <RiskBadge
              level={item.placement_risk_level}
              prob={item.placement_risk_prob}
              label="Place"
            />
          )}
          {item.alerts.length > 0 && (
            <View style={[styles.alertPill, { backgroundColor: colors.riskHighSoft }]}>
              <Feather name="alert-triangle" size={10} color={colors.riskHigh} />
              <Text style={[styles.alertPillText, { color: colors.riskHigh }]}>
                {item.alerts.length}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Feather name="chevron-right" size={18} color={colors.mutedText} />
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Math.max(insets.top, 16) + 12,
        },
      ]}
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
              Students
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              Continuous risk profiling and success indicators
            </Text>
          </View>
          <View style={styles.headerArt}>
            <AnimatedAscoraArt kind="orbit" width={80} height={44} />
          </View>
        </View>
      </View>


      {/* Search Input */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchWrapper,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by student name or ID..."
            placeholderTextColor={colors.mutedText}
            value={search}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange("")} style={styles.clearBtn}>
              <Feather name="x" size={14} color={colors.mutedText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterScrollWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = filter === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? colors.brand
                      : colors.card,
                    borderColor: isSelected
                      ? colors.brand
                      : colors.cardBorder,
                  },
                ]}
                onPress={() => {
                  triggerHaptic("light");
                  setFilter(item.key);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? "#07070b" : colors.text,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Students List */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 6 }).map((_, i) => (
            <StudentRowSkeleton key={i} />
          ))}
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle"
          title="Could not load students"
          description={error}
          onRetry={() => loadStudents(0, false)}
        />
      ) : students.length === 0 ? (
        <EmptyState
          icon="users"
          title="No students found"
          description="Try modifying your search term or filter selection."
          actionLabel="Clear filters"
          onRetry={() => {
            setSearch("");
            setDebouncedSearch("");
            setFilter("all");
          }}
        />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 32 },
          ]}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={colors.brand} />
              </View>
            ) : null
          }
          // Performance optimization for low-end devices
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS !== "web"}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
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
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 13,
  },
  clearBtn: {
    padding: 4,
  },
  filterScrollWrapper: {
    marginBottom: 12,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  scoreCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  detailsCol: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  nameText: {
    fontSize: 14,
    fontWeight: "600",
  },
  idText: {
    fontSize: 11,
    fontFamily: "monospace",
  },
  metaText: {
    fontSize: 11,
  },
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    flexWrap: "wrap",
  },
  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alertPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
