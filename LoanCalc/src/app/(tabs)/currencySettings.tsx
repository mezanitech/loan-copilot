import { useState, useEffect } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { router } from 'expo-router';
import { theme } from '../../constants/theme';
import { getCurrencyPreference, saveCurrencyPreference, CURRENCIES, Currency } from '../../utils/storage';
import { updateProgress } from '../../utils/achievementUtils';

export default function CurrencySettingsScreen() {
    const [selectedCurrency, setSelectedCurrency] = useState<Currency>(CURRENCIES[0]);

    // Load currency preference on mount
    useEffect(() => {
        loadCurrencyPreference();
    }, []);

    const loadCurrencyPreference = async () => {
        const currency = await getCurrencyPreference();
        setSelectedCurrency(currency);
    };

    const handleCurrencySelect = async (currency: Currency) => {
        await saveCurrencyPreference(currency.code);
        setSelectedCurrency(currency);
        
        // Track achievement: changed currency
        await updateProgress('currency_changed', 1);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Currency Settings</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.description}>
                    Select your preferred currency. This will be used to display all loan amounts throughout the app.
                </Text>

                <View style={styles.currencyList}>
                    {CURRENCIES.map((currency) => (
                        <TouchableOpacity
                            key={currency.code}
                            style={[
                                styles.currencyOption,
                                selectedCurrency.code === currency.code && styles.currencyOptionSelected
                            ]}
                            onPress={() => handleCurrencySelect(currency)}
                        >
                            <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                            <View style={styles.currencyInfo}>
                                <Text style={styles.currencyName}>{currency.name}</Text>
                                <Text style={styles.currencyCode}>{currency.code}</Text>
                            </View>
                            {selectedCurrency.code === currency.code && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoIcon}>💡</Text>
                    <Text style={styles.infoText}>
                        This setting only changes how amounts are displayed. It doesn't convert between currencies.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingTop: Platform.OS === 'ios' ? 50 : theme.spacing.lg,
        paddingBottom: theme.spacing.lg,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray200,
    },
    backButton: {
        padding: theme.spacing.sm,
    },
    backButtonText: {
        fontSize: 28,
        color: theme.colors.textPrimary,
        fontWeight: theme.fontWeight.bold,
    },
    headerTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    headerSpacer: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: theme.spacing.xl,
    },
    description: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        lineHeight: 24,
        marginBottom: theme.spacing.xl,
    },
    currencyList: {
        marginBottom: theme.spacing.xl,
    },
    currencyOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
        backgroundColor: theme.colors.background,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    currencyOptionSelected: {
        backgroundColor: theme.colors.primary + '20',
        borderColor: theme.colors.primary,
    },
    currencySymbol: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        width: 50,
        textAlign: 'center',
    },
    currencyInfo: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    currencyName: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textPrimary,
        fontWeight: theme.fontWeight.medium,
    },
    currencyCode: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    checkmark: {
        fontSize: theme.fontSize.xxl,
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.bold,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.info,
        alignItems: 'flex-start',
        ...theme.shadows.glass,
    },
    infoIcon: {
        fontSize: theme.fontSize.xl,
        marginRight: theme.spacing.md,
    },
    infoText: {
        flex: 1,
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
});
