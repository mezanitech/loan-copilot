import { Tabs, router } from "expo-router";
import { TouchableOpacity, Text, Platform } from "react-native";
import { theme } from "../../../constants/theme";

export default function LoanTabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: theme.colors.background,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.gray200,
                    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                    paddingTop: 8,
                    height: Platform.OS === 'ios' ? 85 : 60,
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 3,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.gray400,
                tabBarLabelStyle: {
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.semibold,
                    marginTop: 4,
                },
                headerStyle: {
                    backgroundColor: theme.colors.primary,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                headerTintColor: theme.colors.textInverse,
                headerTitleStyle: {
                    fontWeight: theme.fontWeight.bold,
                    fontSize: theme.fontSize.lg,
                },
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)')}
                        style={{ 
                            marginLeft: 16,
                            padding: 8,
                            borderRadius: 8,
                        }}
                    >
                        <Text style={{ 
                            color: theme.colors.textInverse, 
                            fontSize: 24,
                            fontWeight: theme.fontWeight.bold,
                        }}>←</Text>
                    </TouchableOpacity>
                ),
            }}
        >
            <Tabs.Screen 
                name="overview" 
                options={{ 
                    title: "Loan Details",
                    tabBarLabel: "Overview",
                    tabBarIcon: ({ color }) => (
                        <TabIcon icon="📊" color={color} />
                    ),
                }} 
            />
            <Tabs.Screen 
                name="payments" 
                options={{ 
                    title: "Extra Payments",
                    tabBarLabel: "Payments",
                    tabBarIcon: ({ color }) => (
                        <TabIcon icon="💰" color={color} />
                    ),
                }} 
            />
            <Tabs.Screen 
                name="schedule" 
                options={{ 
                    title: "Payment Schedule",
                    tabBarLabel: "Schedule",
                    tabBarIcon: ({ color }) => (
                        <TabIcon icon="📅" color={color} />
                    ),
                }} 
            />
        </Tabs>
    );
}

// Simple emoji icon component for tabs
function TabIcon({ icon, color }: { icon: string; color: string }) {
    return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}
