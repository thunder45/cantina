import { BaseComponentProps, Colors, Spacing, BorderRadius, FontSizes } from './types';

export interface ModalProps extends BaseComponentProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children?: unknown; // Platform-specific children type
}

// Style generator for Modal component - platform-agnostic
export function getModalStyles() {
  return {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    container: {
      backgroundColor: Colors.background,
      borderRadius: BorderRadius.lg,
      maxWidth: 500,
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    title: {
      fontSize: FontSizes.lg,
      fontWeight: 600,
      color: Colors.text,
    },
    closeButton: {
      padding: Spacing.xs,
      cursor: 'pointer',
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: FontSizes.xl,
      color: Colors.textSecondary,
    },
    content: {
      padding: Spacing.md,
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: Spacing.sm,
      padding: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
  };
}
