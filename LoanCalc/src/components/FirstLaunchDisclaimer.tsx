import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { theme } from '../constants/theme';

interface FirstLaunchDisclaimerProps {
    visible: boolean;
    onAccept: () => void;
}

export default function FirstLaunchDisclaimer({ visible, onAccept }: FirstLaunchDisclaimerProps) {
    const handleAccept = () => {
        onAccept();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={false}
            statusBarTranslucent
        >
            <View style={styles.container}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.title}>Welcome to Loan Copilot</Text>
                    
                    <View style={styles.disclaimerBox}>
                        <Text style={styles.disclaimerTitle}>⚠️ Important Disclaimer</Text>
                        
                        <Text style={styles.text}>
                            Before using this app, please read and understand the following:
                        </Text>

                        <View style={styles.bulletSection}>
                            <Text style={styles.bulletPoint}>
                                • <Text style={styles.bold}>Not Financial Advice:</Text> This app is for informational and educational purposes only. It does not provide financial, legal, or professional advice.
                            </Text>
                            
                            <Text style={styles.bulletPoint}>
                                • <Text style={styles.bold}>Estimates Only:</Text> All calculations are estimates based on standard amortization formulas. Actual loan terms, fees, and interest may vary.
                            </Text>
                            
                            <Text style={styles.bulletPoint}>
                                • <Text style={styles.bold}>No Liability:</Text> We are not responsible for any financial decisions made based on information from this app. Always consult with qualified financial professionals.
                            </Text>
                            
                            <Text style={styles.bulletPoint}>
                                • <Text style={styles.bold}>Verify Information:</Text> Always verify loan details, payment amounts, and payoff strategies with your lender before making financial decisions.
                            </Text>
                            
                            <Text style={styles.bulletPoint}>
                                • <Text style={styles.bold}>Your Responsibility:</Text> You are solely responsible for managing your finances and making informed decisions.
                            </Text>
                        </View>

                        <View style={styles.privacySection}>
                            <Text style={styles.sectionTitle}>Privacy & Data</Text>
                            <Text style={styles.text}>
                                All your loan data is stored locally on your device. We do not collect, transmit, or store any personal or financial information on external servers.
                            </Text>
                        </View>

                        <Text style={styles.acceptanceText}>
                            By tapping "I Understand and Accept" below, you acknowledge that you have read and understood this disclaimer and agree to use this app at your own risk.
                        </Text>
                    </View>
                </ScrollView>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={styles.acceptButton}
                        onPress={handleAccept}
                    >
                        <Text style={styles.acceptButtonText}>I Understand and Accept</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 100,
    },
    title: {
        fontSize: 28,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.primary,
        textAlign: 'center',
        marginBottom: 24,
    },
    disclaimerBox: {
        backgroundColor: '#FFF9E6',
        borderWidth: 2,
        borderColor: theme.colors.warning,
        borderRadius: 12,
        padding: 20,
    },
    disclaimerTitle: {
        fontSize: 20,
        fontWeight: theme.fontWeight.bold,
        color: '#CC6600',
        marginBottom: 16,
        textAlign: 'center',
    },
    text: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textPrimary,
        lineHeight: 22,
        marginBottom: 16,
    },
    bulletSection: {
        marginBottom: 20,
    },
    bulletPoint: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textPrimary,
        lineHeight: 24,
        marginBottom: 12,
    },
    bold: {
        fontWeight: theme.fontWeight.bold,
    },
    privacySection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray200,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    acceptanceText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 16,
        lineHeight: 20,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    acceptButton: {
        backgroundColor: theme.colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: theme.colors.textInverse,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
    },
});
