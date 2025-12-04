import { BaseComponentProps, InputType, Colors, Spacing, FontSizes, BorderRadius } from './types';

export interface InputProps extends BaseComponentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: InputType;
  label?: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}

// Style generator for Input component - platform-agnostic
export function getInputStyles(props: Pick<InputProps, 'disabled' | 'error'>) {
  const { disabled = false, error } = props;

  return {
    container: {
      marginBottom: Spacing.md,
    },
    label: {
      fontSize: FontSizes.sm,
      fontWeight: 500,
      color: Colors.text,
      marginBottom: Spacing.xs,
    },
    input: {
      width: '100%',
      padding: Spacing.sm,
      fontSize: FontSizes.md,
      borderWidth: 1,
      borderColor: error ? Colors.error : Colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: disabled ? Colors.backgroundSecondary : Colors.background,
      color: Colors.text,
      opacity: disabled ? 0.6 : 1,
    },
    error: {
      fontSize: FontSizes.xs,
      color: Colors.error,
      marginTop: Spacing.xs,
    },
  };
}

// Focus styles for web
export function getInputFocusStyles() {
  return {
    borderColor: Colors.primary,
    outline: 'none',
    boxShadow: `0 0 0 2px ${Colors.primary}33`,
  };
}

// Currency formatting helper for Euro values
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

// Parse currency input to number
export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}
