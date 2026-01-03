import { Stack } from "expo-router";
import { theme } from "../constants/theme";

export default function RootLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.textInverse,
                headerTitleStyle: {
                    fontWeight: theme.fontWeight.bold,
                    fontSize: theme.fontSize.lg,
                },
                headerShadowVisible: false,
                contentStyle: {
                    backgroundColor: theme.colors.surface,
                },
            }}
        >
            <Stack.Screen 
                name="(tabs)" 
                options={{ 
                    headerShown: false 
                }} 
            />
        </Stack>
    );
}
