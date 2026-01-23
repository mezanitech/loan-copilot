import { Text, View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import { theme } from "../constants/theme";

type TermSelectorProps = {
    term: string;
    termUnit: "months" | "years";
    onTermChange: (text: string) => void;
    onTermUnitChange: (unit: "months" | "years") => void;
    error?: boolean;
    errorMessage?: string;
};

export default function TermSelector({ term, termUnit, onTermChange, onTermUnitChange, error = false, errorMessage }: TermSelectorProps) {
    const [isFocused, setIsFocused] = useState(false);
    
    // Always use column layout on web to prevent overflow
    const useColumnLayout = true;
    
    return (
        <View style={styles.container}>
            <Text style={styles.label}>📅 Loan Term</Text>
            <View style={[styles.termContainer, useColumnLayout && styles.termContainerColumn]}>
                <TextInput
                    style={[
                        styles.input,
                        styles.termInput,
                        useColumnLayout && styles.termInputFull,
                        isFocused && styles.inputFocused,
                        error && styles.inputError,
                    ]}
                    value={term}
                    onChangeText={onTermChange}
                    placeholder="Enter term"
                    placeholderTextColor={theme.colors.gray400}
                    keyboardType="numeric"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                <View style={[styles.termToggle, useColumnLayout && styles.termToggleFull]}>
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
            {error && errorMessage && (
                <Text style={styles.errorText}>{errorMessage}</Text>
            )}
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
    termContainerColumn: {
        flexDirection: "column",
    },
    termInput: {
        flex: 1,
        minWidth: 0, // Allow flex child to shrink below content size
    },
    termInputFull: {
        width: '100%',
    },
    termToggle: {
        flexDirection: "row",
        borderRadius: theme.borderRadius.md,
        overflow: "hidden",
        backgroundColor: theme.colors.gray100,
        flexShrink: 0, // Prevent toggle from shrinking
    },
    termToggleFull: {
        width: '100%',
    },
    toggleButton: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        backgroundColor: 'transparent',
        flex: 1, // Make buttons equal width
        alignItems: 'center',
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
    inputError: {
        borderColor: theme.colors.error,
        borderWidth: 2,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.fontSize.xs,
        marginTop: theme.spacing.xs,
        fontWeight: theme.fontWeight.medium,
    },
});
