import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { theme } from '../constants/theme';

type SkeletonProps = {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
};

function SkeletonItem({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: theme.colors.gray200,
                    opacity,
                },
                style,
            ]}
        />
    );
}

export function LoanCardSkeleton() {
    return (
        <View style={styles.card}>
            <SkeletonItem width="60%" height={24} style={{ marginBottom: 12 }} />
            <SkeletonItem width="40%" height={18} style={{ marginBottom: 8 }} />
            <SkeletonItem width="50%" height={18} style={{ marginBottom: 8 }} />
            <SkeletonItem width="45%" height={18} />
        </View>
    );
}

export function DashboardSkeleton() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SkeletonItem width={200} height={32} />
                <SkeletonItem width={120} height={40} />
            </View>
            <View style={styles.grid}>
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.statCard}>
                        <SkeletonItem width="60%" height={16} style={{ marginBottom: 8 }} />
                        <SkeletonItem width="80%" height={28} />
                    </View>
                ))}
            </View>
            <View style={styles.tableContainer}>
                <SkeletonItem width="100%" height={50} style={{ marginBottom: 16 }} />
                {[1, 2, 3].map((i) => (
                    <SkeletonItem key={i} width="100%" height={60} style={{ marginBottom: 12 }} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: theme.spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    statCard: {
        flex: 1,
        minWidth: 200,
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.gray200,
    },
    tableContainer: {
        marginTop: theme.spacing.lg,
    },
    card: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.gray200,
        marginBottom: theme.spacing.md,
    },
});
