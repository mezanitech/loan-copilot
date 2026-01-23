import { View, Text, TouchableOpacity, Image as RNImage } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext.web';

type EmptyStateProps = {
    title: string;
    description: string;
    actionText: string;
    actionLink: string;
    icon?: string;
};

export default function EmptyState({ title, description, actionText, actionLink, icon = "📊" }: EmptyStateProps) {
    const { colors } = useTheme();
    
    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 40,
            minHeight: 400,
        }}>
            <RNImage 
                source={require('../../assets/icon.png')} 
                style={{
                    width: 96,
                    height: 96,
                    marginBottom: 20,
                    opacity: 0.9,
                    borderRadius: 20,
                }}
            />
            <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.textPrimary,
                marginBottom: 12,
                textAlign: 'center',
            }}>{title}</Text>
            <Text style={{
                fontSize: 16,
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: 20,
                maxWidth: 400,
                lineHeight: 24,
            }}>{description}</Text>
            <Link href={actionLink as any} asChild>
                <TouchableOpacity style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 12,
                }}>
                    <Text style={{
                        color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: '600',
                    }}>{actionText}</Text>
                </TouchableOpacity>
            </Link>
        </View>
    );
}
