import { Text, View, StyleSheet, ScrollView, Platform, TouchableOpacity, Linking } from "react-native";
import { theme } from '../../constants/theme';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCompletionPercentage, getAchievementProgress, ACHIEVEMENTS } from '../../utils/achievementUtils';
import { AchievementCategoryTabs, AchievementGrid } from '../../components/AchievementComponents';
import AchievementUnlockedModal from '../../components/AchievementUnlockedModal';
import type { AchievementProgress, AchievementCategory } from '../../utils/achievementUtils';

export default function AboutScreen() {
    const router = useRouter();
    const [showAchievements, setShowAchievements] = useState(false);
    const [completionPercentage, setCompletionPercentage] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
    const [progressData, setProgressData] = useState<AchievementProgress[]>([]);
    const [unlockedAchievement, setUnlockedAchievement] = useState<{
        id: string;
        title: string;
        description: string;
        icon: string;
        tier: string;
    } | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadAchievementData();
        }, [])
    );

    const loadAchievementData = async () => {
        const percentage = await getCompletionPercentage();
        setCompletionPercentage(percentage);
        
        const progress = await getAchievementProgress();
        setProgressData(progress);
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>About Loan Copilot</Text>
            
            {/* Achievements Section */}
            <View style={styles.section}>
                <View style={styles.achievementHeader}>
                    <Text style={styles.sectionTitle}>🏆 Achievements</Text>
                    <View style={styles.completionBadge}>
                        <Text style={styles.completionText}>{completionPercentage}%</Text>
                    </View>
                </View>
                <Text style={styles.text}>
                    Explore all features and unlock achievements! Tap below to view your collection.
                </Text>
                <TouchableOpacity 
                    style={styles.achievementsButton}
                    onPress={() => setShowAchievements(!showAchievements)}
                >
                    <Text style={styles.achievementsButtonText}>
                        {showAchievements ? '🔼 Hide Achievements' : '🔽 Show Achievements'}
                    </Text>
                </TouchableOpacity>
                
                {showAchievements && (
                    <View style={styles.achievementsContainer}>
                        <AchievementCategoryTabs
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                            progressData={progressData}
                            achievements={ACHIEVEMENTS}
                        />
                        <AchievementGrid
                            category={selectedCategory === 'all' ? undefined : selectedCategory}
                            progressData={progressData}
                            achievements={ACHIEVEMENTS}
                        />
                    </View>
                )}
            </View>
            
            {/* App Version */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Version</Text>
                <Text style={styles.text}>1.0.0</Text>
            </View>

            {/* What is Loan Copilot */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>What is Loan Copilot?</Text>
                <Text style={styles.text}>
                    Loan Copilot is a <Text style={styles.bold}>calculator and educational tool</Text> designed to help you track your loans, 
                    plan payments, and visualize your path to becoming debt-free. Calculate monthly payments, 
                    explore extra payment strategies, and stay on top of your financial goals.
                </Text>
                <Text style={styles.text}>
                    {"\n"}<Text style={styles.bold}>Important:</Text> We are NOT a financial institution, lender, or financial service provider. 
                    We do not offer loans, banking services, or financial products of any kind.
                </Text>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerSection}>
                <Text style={styles.disclaimerTitle}>⚠️ Important Disclaimer</Text>
                <Text style={styles.disclaimerText}>
                    This app is a <Text style={styles.bold}>calculator tool only</Text>, NOT a financial service provider. 
                    We do not provide loans, banking, lending, or any financial products or services.
                </Text>
                <Text style={styles.disclaimerText}>
                    Loan Copilot is provided for informational and educational purposes only. All calculations, 
                    recommendations, and strategies presented in this app are estimates and should not be 
                    considered professional financial advice.
                </Text>
                <Text style={styles.disclaimerText}>
                    The accuracy of calculations depends on the information you provide. We do not guarantee 
                    the accuracy, completeness, or reliability of any calculations or recommendations.
                </Text>
                <Text style={styles.disclaimerText}>
                    Financial decisions can have significant impacts on your financial health. Always consult 
                    with a qualified financial advisor, accountant, or other professional before making any 
                    financial decisions based on information from this app.
                </Text>
                <Text style={styles.disclaimerText}>
                    By using this app, you acknowledge and agree that the developers of Loan 
                    Copilot are not liable for any financial losses, damages, or adverse outcomes resulting 
                    from your use of this app or reliance on its calculations and recommendations.
                </Text>
            </View>

            {/* How Calculations Work */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>How Calculations Work</Text>
                <Text style={styles.text}>
                    Loan Copilot uses standard amortization formulas to calculate monthly payments, interest, 
                    and loan payoff schedules. The formula used is:
                </Text>
                <View style={styles.formulaBox}>
                    <Text style={styles.formulaText}>M = P × [r(1+r)ⁿ] / [(1+r)ⁿ - 1]</Text>
                </View>
                <Text style={styles.text}>
                    Where M = monthly payment, P = principal, r = monthly interest rate, and n = number of payments.
                </Text>
            </View>

            {/* Payment Strategies */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Strategies Explained</Text>
                
                <Text style={styles.strategyTitle}>Avalanche Method</Text>
                <Text style={styles.text}>
                    Pay off loans with the highest interest rates first while making minimum payments on others. 
                    This mathematically saves the most money in interest over time.
                </Text>

                <Text style={styles.strategyTitle}>Snowball Method</Text>
                <Text style={styles.text}>
                    Pay off loans with the smallest balances first while making minimum payments on others. 
                    This provides psychological wins and motivation as you eliminate debts faster.
                </Text>
            </View>

            {/* Privacy */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Privacy & Data</Text>
                <Text style={styles.text}>
                    All your loan data is stored locally on your device only. We do not collect, transmit, 
                    or store any of your personal or financial information on external servers. Your data 
                    remains private and under your control.
                </Text>
            </View>

            {/* Feedback */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Feedback & Support</Text>
                <Text style={styles.text}>
                    We'd love to hear from you! Share your ideas, report bugs, or ask questions in our 
                    community forum.
                </Text>
                <TouchableOpacity 
                    style={styles.feedbackButton}
                    onPress={() => Linking.openURL('https://github.com/mezanitech/loan-copilot-feedback/discussions')}
                >
                    <Text style={styles.feedbackButtonText}>💬 Send Feedback</Text>
                </TouchableOpacity>
                <Text style={[styles.text, { marginTop: theme.spacing.md }]}>
                    For privacy concerns or direct support: tareq_musmar@hotmail.com
                </Text>
            </View>

            {/* Contact */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Developer</Text>
                <Text style={styles.text}>© 2026 All rights reserved</Text>
            </View>

            {/* Terms of Use */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Terms of Use</Text>
                <Text style={styles.text}>
                    By using Loan Copilot, you agree to use this app responsibly and acknowledge that it is 
                    a tool for estimation and planning purposes only. You are solely responsible for any 
                    financial decisions you make.
                </Text>
                <Text style={styles.text}>
                    This app is provided "as is" without warranties of any kind, either express or implied. 
                    We reserve the right to modify or discontinue the app at any time without notice.
                </Text>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Made with care to help you achieve financial freedom 🚀</Text>
            </View>

            <AchievementUnlockedModal
                achievement={unlockedAchievement}
                visible={!!unlockedAchievement}
                onClose={() => setUnlockedAchievement(null)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    title: {
        fontSize: theme.fontSize.huge,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.xxl,
        color: theme.colors.textPrimary,
    },
    section: {
        marginBottom: theme.spacing.xxl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.md,
        color: theme.colors.textPrimary,
    },
    achievementHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    completionBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
    },
    completionText: {
        color: 'white',
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
    },
    achievementsButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
    achievementsButtonText: {
        color: 'white',
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
    achievementsContainer: {
        marginTop: theme.spacing.lg,
    },
    text: {
        fontSize: theme.fontSize.base,
        color: theme.colors.textSecondary,
        lineHeight: 24,
        marginBottom: theme.spacing.sm,
    },
    bold: {
        fontWeight: theme.fontWeight.bold,
    },
    disclaimerSection: {
        backgroundColor: '#FFF3CD',
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
        marginBottom: theme.spacing.xxl,
    },
    disclaimerTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: '#856404',
        marginBottom: theme.spacing.md,
    },
    disclaimerText: {
        fontSize: theme.fontSize.sm,
        color: '#856404',
        lineHeight: 22,
        marginBottom: theme.spacing.md,
    },
    formulaBox: {
        backgroundColor: theme.colors.gray50,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginVertical: theme.spacing.md,
        alignItems: 'center',
    },
    formulaText: {
        fontSize: theme.fontSize.base,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: theme.colors.textPrimary,
    },
    strategyTitle: {
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.primary,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    footer: {
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xxl,
        paddingTop: theme.spacing.xl,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray200,
    },
    footerText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    feedbackButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
    feedbackButtonText: {
        color: 'white',
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
    },
});
