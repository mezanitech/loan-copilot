import { Text, View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { theme } from "../constants/theme";

type TermSelectorProps = {
    term: string;
    termUnit: "months" | "years";
    onTermChange: (text: string) => void;
    onTermUnitChange: (unit: "months" | "years") => void;
};

export default function TermSelector({ term, termUnit, onTermChange, onTermUnitChange }: TermSelectorProps) {
    const [isFocused, setIsFocused] = useState(false);
    
    return (
        <View style={styles.container}>
            <Text style={styles.label}>📅 Loan Term</Text>
            <View style={styles.termContainer}>
                <TextInput
                    style={[
                        styles.input,
                        styles.termInput,
                        isFocused && styles.inputFocused,
                    ]}
                    value={term}
                    onChangeText={onTermChange}
                    placeholder="Enter term"
                    placeholderTextColor={theme.colors.gray400}
                    keyboardType="numeric"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                <View style={styles.termToggle}>
                    <TouchableOpacity
                        style={[styles.toggleButton, termUnit === "months" && styles.toggleButtonActive]}
                        onPress={() => onTermUnitChange("months")}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.toggleText, termUnit === "months" && styles.toggleTextActive]}>
                            Months
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, termUnit === "years" && styles.toggleButtonActive]}
                        onPress={() => onTermUnitChange("years")}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.toggleText, termUnit === "years" && styles.toggleTextActive]}>
                            Years
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        marginBottom: theme.spacing.sm,
        color: theme.colors.textPrimary,
    },
    input: {
        borderWidth: 1.5,
        borderColor: theme.colors.gray200,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.base,
        backgroundColor: theme.colors.background,
        color: theme.colors.textPrimary,
    },
    inputFocused: {
        borderColor: theme.colors.primary,
        ...theme.shadows.sm,
    },
    termContainer: {
        flexDirection: "row",
        gap: theme.spacing.md,
    },
    termInput: {
        flex: 1,
    },
    termToggle: {
        flexDirection: "row",
        borderRadius: theme.borderRadius.md,
        overflow: "hidden",
        backgroundColor: theme.colors.gray100,
    },
    toggleButton: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        backgroundColor: 'transparent',
    },
    toggleButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    toggleText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.textSecondary,
    },
    toggleTextActive: {
        color: theme.colors.textInverse,
        fontWeight: theme.fontWeight.semibold,
    },
});