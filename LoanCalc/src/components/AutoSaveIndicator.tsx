import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';

export interface AutoSaveHandle {
    trigger: () => void;
}

interface AutoSaveIndicatorProps {
    onSave: () => Promise<void>;
}

export const AutoSaveIndicator = forwardRef<AutoSaveHandle, AutoSaveIndicatorProps>(
    ({ onSave }, ref) => {
        const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
        const [showIndicator, setShowIndicator] = useState(false);
        const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
        const displayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
        const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        const trigger = useCallback(() => {
            // Clear any existing timers
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (displayTimeoutRef.current) {
                clearTimeout(displayTimeoutRef.current);
            }
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }

            // Start display timer (show indicator after 2 seconds of first change)
            if (!showIndicator) {
                displayTimeoutRef.current = setTimeout(() => {
                    setShowIndicator(true);
                }, 2000);
            }

            // Set up auto-save with debounce (1 second after last change)
            saveTimeoutRef.current = setTimeout(async () => {
                setStatus('saving');
                setShowIndicator(true); // Ensure it's visible when saving starts
                
                try {
                    await onSave();
                    setStatus('saved');
                    
                    // Hide the indicator after 2 seconds of showing "Saved"
                    hideTimeoutRef.current = setTimeout(() => {
                        setShowIndicator(false);
                        setStatus('idle');
                    }, 2000);
                } catch (error) {
                    console.error('Auto-save failed:', error);
                    setStatus('idle');
                    setShowIndicator(false);
                }
            }, 1000);
        }, [onSave, showIndicator]);

        useImperativeHandle(ref, () => ({
            trigger,
        }));

        if (!showIndicator) {
            return null;
        }

        return (
            <View style={styles.container}>
                {status === 'saving' && (
                    <>
                        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                        <Text style={styles.text}>Saving...</Text>
                    </>
                )}
                {status === 'saved' && (
                    <Text style={styles.textSaved}>✓ Saved</Text>
                )}
            </View>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.sm,
        minHeight: 30,
        gap: theme.spacing.xs,
    },
    text: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
    },
    textSaved: {
        color: theme.colors.success,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
    },
});
