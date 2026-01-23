// WEB-SPECIFIC VERSION - Loan Detail Tabs Layout
import { Tabs } from "expo-router";

export default function LoanTabLayoutWeb() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    display: 'none', // Hide the tab bar on web
                },
            }}
        >
            <Tabs.Screen name="overview" />
            <Tabs.Screen name="payments" />
            <Tabs.Screen name="schedule" />
        </Tabs>
    );
}