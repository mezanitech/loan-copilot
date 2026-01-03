import { Tabs, router } from "expo-router";
import { TouchableOpacity, Text, Platform } from "react-native";
import { theme } from "../../constants/theme";

export default function TabLayout() {
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
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.gray400,
                tabBarLabelStyle: {
                    fontSize: theme.fontSize.xs,
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
                    fontSize: theme.fontSize.xl,
                },
            }}
        >
            <Tabs.Screen 
                name="index" 
                options={{ 
                    title: "Dashboard",
                    tabBarLabel: "Loans",
                    tabBarIcon: ({ color }) => (
                        <TabIcon icon="💼" color={color} />
                    ),
                    tabBarStyle: { display: 'none' }
                }} 
            />
            <Tabs.Screen 
                name="createLoan" 
                options={{ 
                    title: "Create New Loan",
                    tabBarLabel: "Create",
                    tabBarIcon: ({ color }) => (
                        <TabIcon icon="➕" color={color} />
                    ),
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
                    tabBarStyle: { display: 'none' }
                }} 
            />
            <Tabs.Screen 
                name="[loanId]" 
                options={{ 
                    href: null,
                    headerShown: false,
                    tabBarStyle: { display: 'none' }
                }} 
            />
        </Tabs>
    );
}

// Simple emoji icon component for tabs
function TabIcon({ icon, color }: { icon: string; color: string }) {
    return <Text style={{ fontSize: 24, color }}>{icon}</Text>;
}
