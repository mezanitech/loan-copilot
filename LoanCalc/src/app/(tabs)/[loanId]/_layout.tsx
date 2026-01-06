import { Tabs, router } from "expo-router";
import { TouchableOpacity, Text, Platform, View } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { theme } from "../../../constants/theme";

export default function LoanTabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: theme.colors.background,
                    borderTopWidth: 2,
                    borderTopColor: theme.colors.primary,
                    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                    paddingTop: 12,
                    height: Platform.OS === 'ios' ? 90 : 65,
                    elevation: 8,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.gray400,
                tabBarLabelStyle: {
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.bold,
                    marginTop: 6,
                },
                tabBarIconStyle: {
                    marginTop: 4,
                },
                headerStyle: {
                    backgroundColor: theme.colors.background,
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0,
                },
                headerTintColor: theme.colors.textPrimary,
                headerTitleStyle: {
                    fontWeight: theme.fontWeight.bold,
                    fontSize: theme.fontSize.lg,
                    color: theme.colors.textPrimary,
                },
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)')}
                        style={{ 
                            marginLeft: 12,
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <Text style={{ 
                            color: theme.colors.textPrimary, 
                            fontSize: 18,
                            fontWeight: theme.fontWeight.bold,
                        }}>←</Text>
                        <Text style={{ 
                            color: theme.colors.textPrimary, 
                            fontSize: theme.fontSize.sm,
                            fontWeight: theme.fontWeight.semibold,
                        }}>Home</Text>
                    </TouchableOpacity>
                ),
            }}
        >
            <Tabs.Screen 
                name="overview" 
                options={{ 
                    title: "Loan Details",
                    tabBarLabel: "Loan Details",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text-outline" size={size || 24} color={color} />
                    ),
                }} 
            />
            <Tabs.Screen 
                name="payments" 
                options={{ 
                    title: "Extra Payments",
                    tabBarLabel: "Payments",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="wallet-outline" size={size || 24} color={color} />
                    ),
                }} 
            />
            <Tabs.Screen 
                name="schedule" 
                options={{ 
                    title: "Payment Schedule",
                    tabBarLabel: "Schedule",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={size || 24} color={color} />
                    ),
                }} 
            />
        </Tabs>
    );
}
