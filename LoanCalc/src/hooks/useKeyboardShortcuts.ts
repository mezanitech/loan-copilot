import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export function useKeyboardShortcuts() {
    const router = useRouter();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleKeyPress = (event: KeyboardEvent) => {
            // Ignore if user is typing in an input field
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                // Allow '/' to focus search even in inputs (like GitHub)
                if (event.key !== '/') return;
            }

            // Keyboard shortcuts
            switch (event.key.toLowerCase()) {
                case 'n':
                    event.preventDefault();
                    router.push('/(tabs)/createLoan');
                    break;
                case 'd':
                    event.preventDefault();
                    router.push('/(tabs)/');
                    break;
                case '/':
                    event.preventDefault();
                    // Focus search input if it exists
                    const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"]');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                    break;
                case '?':
                    event.preventDefault();
                    // Show keyboard shortcuts help
                    showKeyboardShortcutsHelp();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [router]);
}

function showKeyboardShortcutsHelp() {
    const helpText = `
Keyboard Shortcuts:
━━━━━━━━━━━━━━━━━━
N - Create New Loan
D - Go to Dashboard
/ - Focus Search
? - Show this help
ESC - Close dialogs
━━━━━━━━━━━━━━━━━━`;
    
    if (typeof window !== 'undefined' && window.alert) {
        window.alert(helpText);
    }
}
