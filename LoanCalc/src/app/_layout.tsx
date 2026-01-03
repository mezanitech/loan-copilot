import { Stack } from "expo-router";
import { theme } from "../constants/theme";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OnboardingSlider from "../components/OnboardingSlider";

const ONBOARDING_KEY = "hasSeenOnboarding";

export default function RootLayout() {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkOnboarding();
    }, []);

    const checkOnboarding = async () => {
        try {
            const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
            if (!hasSeenOnboarding) {
                setShowOnboarding(true);
            }
        } catch (error) {
            console.error("Error checking onboarding status:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOnboardingComplete = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, "true");
            setShowOnboarding(false);
        } catch (error) {
            console.error("Error saving onboarding status:", error);
        }
    };

    if (isLoading) {
        return null; // Or a loading screen
    }

    return (
        <>
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
            <OnboardingSlider 
                visible={showOnboarding} 
                onComplete={handleOnboardingComplete} 
            />
        </>
    );
}
