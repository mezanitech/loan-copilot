// Professional color palette and design tokens - Glassy theme
export const theme = {
    colors: {
        // Primary colors - light and airy for glass effect
        primary: '#60A5FA',      // Soft blue
        primaryDark: '#3B82F6',
        primaryLight: '#93C5FD',
        primaryGlass: 'rgba(96, 165, 250, 0.15)',  // Semi-transparent primary
        
        // Success/Money colors
        success: '#10B981',
        successDark: '#059669',
        successLight: '#34D399',
        successGlass: 'rgba(16, 185, 129, 0.15)',
        
        // Neutral colors
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
        
        // Semantic colors
        background: '#F8FAFC',      // Very light background
        surface: '#FFFFFF',         // White cards
        surfaceGlass: 'rgba(255, 255, 255, 0.7)',  // Frosted glass
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        
        // Glass effect overlays
        glassOverlay: 'rgba(255, 255, 255, 0.4)',
        glassBorder: 'rgba(255, 255, 255, 0.6)',
        
        // Text colors
        textPrimary: '#0F172A',
        textSecondary: '#64748B',
        textTertiary: '#94A3B8',
        textInverse: '#FFFFFF',
    },
    
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
        xxxl: 32,
    },
    
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        full: 9999,
    },
    
    fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 28,
        huge: 32,
    },
    
    fontWeight: {
        normal: '400' as '400',
        medium: '500' as '500',
        semibold: '600' as '600',
        bold: '700' as '700',
    },
    
    shadows: {
        sm: {
            shadowColor: '#60A5FA',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#60A5FA',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 3,
        },
        lg: {
            shadowColor: '#60A5FA',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 5,
        },
        glass: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.04,
            shadowRadius: 24,
            elevation: 2,
        },
    },
};
