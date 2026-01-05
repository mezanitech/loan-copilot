import { Text, View, TextInput, StyleSheet } from "react-native";
import { useState } from "react";
import { theme } from "../constants/theme";

type InputFieldProps = {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: "default" | "numeric" | "decimal-pad";
    formatNumber?: boolean; // New prop to enable number formatting with commas
    error?: boolean; // New prop to indicate validation error
    errorMessage?: string; // New prop to show error message
};

export default function InputField({ label, value, onChangeText, placeholder, keyboardType = "default", formatNumber = false, error = false, errorMessage }: InputFieldProps) {
    const [isFocused, setIsFocused] = useState(false);
    
    // Format number with commas for display
    const formatWithCommas = (text: string): string => {
        // Remove all non-digit characters
        const numericValue = text.replace(/[^0-9]/g, '');
        if (!numericValue) return '';
        
        // Add commas
        return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };
    
    // Handle text change - remove commas before passing to parent
    const handleChange = (text: string) => {
        if (formatNumber) {
            // Remove commas and pass only digits
            const numericValue = text.replace(/[^0-9]/g, '');
            onChangeText(numericValue);
        } else if (keyboardType === "decimal-pad") {
            // For decimal inputs, replace comma with period (for international keyboards)
            // and allow only digits, one decimal separator
            const normalized = text.replace(/,/g, '.');
            onChangeText(normalized);
        } else {
            onChangeText(text);
        }
    };
    
    // Get display value - add commas if formatNumber is true
    const displayValue = formatNumber ? formatWithCommas(value) : value;
    
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    isFocused && styles.inputFocused,
                    error && styles.inputError,
                ]}
                value={displayValue}
                onChangeText={handleChange}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.gray400}
                keyboardType={keyboardType}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            />
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
    inputError: {
        borderColor: '#EF4444',
        borderWidth: 2,
    },
    errorText: {
        color: '#EF4444',
        fontSize: theme.fontSize.xs,
        marginTop: theme.spacing.xs,
        fontWeight: theme.fontWeight.medium,
    },
});