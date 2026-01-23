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
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    card: '#1E293B',
    primary: '#8B5CF6',
    primaryDark: '#7C3AED',
    primaryLight: '#A78BFA',
    textPrimary: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textInverse: '#0F172A',
    border: '#334155',
    borderFocus: '#8B5CF6',
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    gray50: '#1E293B',
    gray100: '#334155',
    gray200: '#475569',
    gray300: '#64748B',
    gray400: '#94A3B8',
    gray500: '#CBD5E1',
    gray600: '#E2E8F0',
    gray700: '#F1F5F9',
    gray800: '#F8FAFC',
    gray900: '#FFFFFF',
    sidebar: '#020617',
    sidebarText: '#94A3B8',
    sidebarTextActive: '#F1F5F9',
    sidebarAccent: '#8B5CF6',
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
