import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

type ThemeContextType = {
    mode: ThemeMode;
    toggleTheme: () => void;
    colors: typeof lightColors;
};

const lightColors = {
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    card: '#FFFFFF',
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    primaryLight: '#8B5CF6',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',
    border: '#E5E7EB',
    borderFocus: '#7C3AED',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
    sidebar: '#1E293B',
    sidebarText: '#E2E8F0',
    sidebarTextActive: '#FFFFFF',
    sidebarAccent: '#7C3AED',
};

const darkColors = {
    background: '#111827',
    backgroundSecondary: '#1F2937',
    card: '#1F2937',
    primary: '#A78BFA',
    primaryDark: '#8B5CF6',
    primaryLight: '#C4B5FD',
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    textInverse: '#111827',
    border: '#374151',
    borderFocus: '#A78BFA',
    success: '#34D399',
    error: '#FCA5A5',
    warning: '#FCD34D',
    gray50: '#1F2937',
    gray100: '#374151',
    gray200: '#4B5563',
    gray300: '#6B7280',
    gray400: '#9CA3AF',
    gray500: '#D1D5DB',
    gray600: '#E5E7EB',
    gray700: '#F3F4F6',
    gray800: '#F9FAFB',
    gray900: '#FFFFFF',
    sidebar: '#1F2937',
    sidebarText: '#9CA3AF',
    sidebarTextActive: '#F9FAFB',
    sidebarAccent: '#A78BFA',
};

const ThemeContext = createContext<ThemeContextType>({
    mode: 'light',
    toggleTheme: () => {},
    colors: lightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>('light');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('themeMode');
            if (savedTheme === 'dark' || savedTheme === 'light') {
                setMode(savedTheme);
            }
        } catch (error) {
            console.error('Failed to load theme:', error);
        }
        setIsLoaded(true);
    };

    const toggleTheme = async () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        try {
            await AsyncStorage.setItem('themeMode', newMode);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    const colors = mode === 'light' ? lightColors : darkColors;

    if (!isLoaded) {
        return null; // Or a loading screen
    }

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
