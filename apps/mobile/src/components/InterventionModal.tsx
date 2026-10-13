import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme";
import { INTERVENTION_LABEL } from "../lib/format";
import { createIntervention } from "../lib/api";
import { triggerHaptic } from "../lib/haptics";

interface InterventionModalProps {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  suggestedType?: string;
  suggestedDriver?: string | null;
  onSuccess: () => void;
}

const TYPES = [
  "mentor_meeting",
  "peer_tutoring",
  "mock_interview",
  "counselling_referral",
  "parent_call",
  "skill_workshop",
];

export function InterventionModal({
  visible,
  onClose,
  studentId,
  studentName,
  suggestedType = "mentor_meeting",
  suggestedDriver = null,
  onSuccess,
}: InterventionModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState(suggestedType);
  const [owner, setOwner] = useState("Faculty Mentor");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!owner.trim()) {
      setError("Please specify an owner name");
      triggerHaptic("error");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await createIntervention({
        student_id: studentId,
        type,
        driver: suggestedDriver,
        owner_name: owner.trim(),
        due_date: dueDate,
        notes: notes.trim() || null,
      });

      if (!res.ok) {
        setError(res.error || "Failed to log intervention");
        triggerHaptic("error");
      } else {
        triggerHaptic("success");
        onSuccess();
        onClose();
      }
    } catch (e: any) {
      setError(e.message || "Failed to log intervention");
      triggerHaptic("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              paddingBottom: Math.max(insets.bottom, 20) + 16,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Plan intervention
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                For {studentName} ({studentId})
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              accessibilityLabel="Close"
            >
              <Feather name="x" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {suggestedDriver && (
            <View
              style={[
                styles.driverBanner,
                { backgroundColor: colors.brandSoft, borderColor: colors.brand },
              ]}
            >
              <Feather name="info" size={14} color={colors.brand} />
              <Text style={[styles.driverText, { color: colors.text }]}>
                Suggested from top driver: {suggestedDriver}
              </Text>
            </View>
          )}

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Type selector */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Intervention type</Text>
            <View style={styles.typeGrid}>
              {TYPES.map((t) => {
                const isSelected = type === t;
                const isSuggested = t === suggestedType;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isSelected
                          ? colors.brand
                          : colors.surface,
                        borderColor: isSelected
                          ? colors.brand
                          : colors.cardBorder,
                      },
                    ]}
                    onPress={() => {
                      setType(t);
                      triggerHaptic("light");
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? "#07070b" : colors.text,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {INTERVENTION_LABEL[t] || t}
                      {isSuggested ? " (rec)" : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Owner input */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Owner name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.cardBorder,
                },
              ]}
              value={owner}
              onChangeText={setOwner}
              placeholder="e.g. Prof. Manne"
              placeholderTextColor={colors.mutedText}
            />

            {/* Due date input */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Due date (YYYY-MM-DD)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.cardBorder,
                },
              ]}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedText}
            />

            {/* Notes */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.cardBorder,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Factual support plan details..."
              placeholderTextColor={colors.mutedText}
              multiline
              numberOfLines={3}
              maxLength={1000}
            />

            {error && (
              <View style={[styles.errorBanner, { backgroundColor: colors.riskHighSoft }]}>
                <Feather name="alert-circle" size={14} color={colors.riskHigh} />
                <Text style={[styles.errorText, { color: colors.riskHigh }]}>{error}</Text>
              </View>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.brand,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#07070b" />
              ) : (
                <Text style={styles.submitText}>Save intervention</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  driverBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 0.5,
    marginBottom: 14,
  },
  driverText: {
    fontSize: 12,
    flex: 1,
  },
  formScroll: {
    maxHeight: 460,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textArea: {
    height: 74,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  submitText: {
    color: "#07070b",
    fontSize: 15,
    fontWeight: "700",
  },
});
