import { BaseComponentProps, ButtonVariant, ButtonSize, Colors, Spacing, FontSizes, BorderRadius } from './types';

export interface ButtonProps extends BaseComponentProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  onPress: () => void;
}

// Style generator for Button component - platform-agnostic
export function getButtonStyles(props: Pick<ButtonProps, 'variant' | 'size' | 'fullWidth' | 'disabled' | 'loading'>) {
  const { variant = 'primary', size = 'medium', fullWidth = false, disabled = false, loading = false } = props;

  const baseStyles = {
    borderRadius: BorderRadius.md,
    borderWidth: 0,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
  };

  const sizeStyles = {
    small: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      fontSize: FontSizes.sm,
      minHeight: 32,
    },
    medium: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      fontSize: FontSizes.md,
      minHeight: 40,
    },
    large: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      fontSize: FontSizes.lg,
      minHeight: 48,
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: Colors.primary,
      color: Colors.textLight,
    },
    secondary: {
      backgroundColor: Colors.secondary,
      color: Colors.textLight,
    },
    danger: {
      backgroundColor: Colors.danger,
      color: Colors.textLight,
    },
    success: {
      backgroundColor: Colors.success,
      color: Colors.textLight,
    },
  };

  return {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };
}

// Hover styles for web
export function getButtonHoverStyles(variant: ButtonVariant = 'primary') {
  const hoverColors = {
    primary: Colors.primaryHover,
    secondary: Colors.secondaryHover,
    danger: Colors.dangerHover,
    success: Colors.successHover,
  };

  return {
    backgroundColor: hoverColors[variant],
  };
}
