import React, { ReactNode } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

type EditModalProps = {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    variant?: 'bottom-sheet' | 'centered';
};

export default function EditModal({ 
    visible, 
    onClose, 
    title, 
    children, 
    footer,
    variant = 'bottom-sheet'
}: EditModalProps) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                style={[
                    styles.modalOverlay,
                    variant === 'centered' && styles.modalOverlayCentered
                ]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[
                    styles.modalContent,
                    variant === 'centered' && styles.modalContentCentered
                ]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.modalClose}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {children}
                    </ScrollView>

                    {footer && (
                        <View style={styles.modalFooter}>
                            {footer}
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalOverlayCentered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '85%',
        ...theme.shadows.lg,
    },
    modalContentCentered: {
        borderRadius: theme.borderRadius.lg,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        width: '90%',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray200,
    },
    modalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    modalClose: {
        fontSize: theme.fontSize.xxl,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.normal,
    },
    modalBody: {
        padding: theme.spacing.xl,
    },
    modalFooter: {
        padding: theme.spacing.xl,
        borderTopWidth: 1,
        borderTopColor: theme.colors.gray200,
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
});
