import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { theme } from '../constants/theme';

interface PieChartData {
    value: number;
    color: string;
    label: string;
}

interface PieChartProps {
    data: PieChartData[];
    size?: number;
    strokeWidth?: number;
}

export default function PieChart({ data, size = 100, strokeWidth = 20 }: PieChartProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    // Calculate total value
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Calculate segments
    let currentAngle = -90; // Start from top
    const segments = data.map((item) => {
        const percentage = item.value / total;
        const angle = percentage * 360;
        const dashArray = `${(percentage * circumference)} ${circumference}`;
        
        const segment = {
            ...item,
            percentage,
            dashArray,
            rotation: currentAngle,
        };
        
        currentAngle += angle;
        return segment;
    });

    return (
        <View style={styles.container}>
            <Svg width={size} height={size}>
                <G rotation={0} origin={`${center}, ${center}`}>
                    {segments.map((segment, index) => (
                        <Circle
                            key={index}
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={segment.dashArray}
                            strokeDashoffset={0}
                            rotation={segment.rotation}
                            origin={`${center}, ${center}`}
                            strokeLinecap="butt"
                        />
                    ))}
                </G>
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
