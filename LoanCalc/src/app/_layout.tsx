import { Stack } from "expo-router";
import { theme } from "../constants/theme";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OnboardingSlider from "../components/OnboardingSlider";
import FirstLaunchDisclaimer from "../components/FirstLaunchDisclaimer";

const ONBOARDING_KEY = "hasSeenOnboarding";
const DISCLAIMER_ACCEPTED_KEY = "@disclaimer_accepted";

export default function RootLayout() {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkOnboarding();
    }, []);

    const checkOnboarding = async () => {
        try {
            const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
            const hasAcceptedDisclaimer = await AsyncStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
            
            if (!hasSeenOnboarding) {
                setShowOnboarding(true);
            } else if (!hasAcceptedDisclaimer) {
                setShowDisclaimer(true);
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
            // Show disclaimer after onboarding completes
            const hasAcceptedDisclaimer = await AsyncStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
            if (!hasAcceptedDisclaimer) {
                setShowDisclaimer(true);
            }
        } catch (error) {
            console.error("Error saving onboarding status:", error);
        }
    };

    const handleDisclaimerAccept = async () => {
        try {
            await AsyncStorage.setItem(DISCLAIMER_ACCEPTED_KEY, "true");
            setShowDisclaimer(false);
        } catch (error) {
            console.error("Error saving disclaimer acceptance:", error);
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
            <FirstLaunchDisclaimer 
                visible={showDisclaimer}
                onAccept={handleDisclaimerAccept} 
            />
        </>
    );
}
