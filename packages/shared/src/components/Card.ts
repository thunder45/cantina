import { BaseComponentProps, Colors, Spacing, BorderRadius } from './types';

export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  selected?: boolean;
  children?: unknown; // Platform-specific children type
}

// Style generator for Card component - platform-agnostic
export function getCardStyles(props: Pick<CardProps, 'selected' | 'onPress' | 'disabled'>) {
  const { selected = false, onPress, disabled = false } = props;
  const isClickable = !!onPress && !disabled;

  return {
    container: {
      backgroundColor: Colors.background,
      borderRadius: BorderRadius.lg,
      borderWidth: selected ? 2 : 1,
      borderColor: selected ? Colors.primary : Colors.border,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      cursor: isClickable ? 'pointer' : 'default',
      opacity: disabled ? 0.6 : 1,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    title: {
      fontSize: 18,
      fontWeight: 600,
      color: Colors.text,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginBottom: Spacing.sm,
    },
    content: {
      marginTop: Spacing.sm,
    },
  };
}

// Hover styles for web
export function getCardHoverStyles() {
  return {
    borderColor: Colors.primary,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  };
}
