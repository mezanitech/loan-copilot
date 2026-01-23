// WEB-SPECIFIC COMPONENT - Mobile App Promotional Banner
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext.web';

interface MobileAppPromotionProps {
    insightCardStyle?: any;
    insightBadgeStyle?: any;
    insightTextStyle?: any;
}

export default function MobileAppPromotion({ 
    insightCardStyle, 
    insightBadgeStyle, 
    insightTextStyle 
}: MobileAppPromotionProps) {
    const { mode, colors } = useTheme();

    return (
        <View style={[
            styles.container, 
            { 
                backgroundColor: mode === 'dark' ? '#1a1a2e' : '#f8f9ff', 
                borderColor: '#667eea', 
                borderWidth: 2 
            },
            insightCardStyle
        ]}>
            <Text style={[
                styles.badge, 
                { backgroundColor: '#667eea', color: 'white' },
                insightBadgeStyle
            ]}>
                GET THE MOBILE APP
            </Text>
            <Text style={[
                styles.title, 
                { color: colors.textPrimary },
                insightTextStyle
            ]}>
                Unlock powerful features in the iOS app:
            </Text>
            <View style={styles.featureList}>
                <Text style={[styles.feature, { color: colors.textSecondary }, insightTextStyle]}>
                    • Achievement system with 18 milestones to unlock
                </Text>
                <Text style={[styles.feature, { color: colors.textSecondary }, insightTextStyle]}>
                    • Export amortization schedules as PDF reports
                </Text>
                <Text style={[styles.feature, { color: colors.textSecondary }, insightTextStyle]}>
                    • Payment reminders and notifications
                </Text>
                <Text style={[styles.feature, { color: colors.textSecondary }, insightTextStyle]}>
                    • Duplicate loans for scenario planning
                </Text>
                <Text style={[styles.feature, { color: colors.textSecondary }, insightTextStyle]}>
                    • Track interest saved and time saved milestones
                </Text>
                <Text style={[styles.feature, { color: colors.textSecondary }, insightTextStyle]}>
                    • Multiple currency support with 25+ currencies
                </Text>
            </View>
            <TouchableOpacity 
                style={styles.downloadButton}
                onPress={() => typeof window !== 'undefined' && window.open('https://apps.apple.com/app/apple-store/id6757390003?pt=128423727&ct=WebRef&mt=8', '_blank')}
            >
                <Text style={styles.downloadButtonText}>Download Loan Co-Pilot</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 14,
        borderRadius: 8,
        marginBottom: 12,
    },
    badge: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 3,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    title: {
        fontSize: 11,
        lineHeight: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    featureList: {
        gap: 6,
    },
    feature: {
        fontSize: 12,
        lineHeight: 16,
    },
    downloadButton: {
        marginTop: 12,
        backgroundColor: '#667eea',
        padding: 10,
        borderRadius: 6,
        alignItems: 'center',
    },
    downloadButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
});
