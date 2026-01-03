// Professional color palette and design tokens
export const theme = {
    colors: {
        // Primary colors
        primary: '#2563EB',      // Modern blue
        primaryDark: '#1E40AF',
        primaryLight: '#3B82F6',
        
        // Success/Money colors
        success: '#10B981',
        successDark: '#059669',
        successLight: '#34D399',
        
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
        background: '#FFFFFF',
        surface: '#F9FAFB',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        
        // Text colors
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
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
        sm: 6,
        md: 8,
        lg: 12,
        xl: 16,
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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
        },
    },
};
