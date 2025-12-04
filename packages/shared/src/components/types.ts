// Shared component types and styling constants

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';
export type ButtonSize = 'small' | 'medium' | 'large';

export type InputType = 'text' | 'number' | 'password' | 'email' | 'search';

export interface BaseComponentProps {
  testId?: string;
  disabled?: boolean;
  className?: string;
}

// Design tokens for consistent styling across platforms
export const Colors = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  secondary: '#6b7280',
  secondaryHover: '#4b5563',
  danger: '#dc2626',
  dangerHover: '#b91c1c',
  success: '#16a34a',
  successHover: '#15803d',
  background: '#ffffff',
  backgroundSecondary: '#f3f4f6',
  border: '#d1d5db',
  text: '#111827',
  textSecondary: '#6b7280',
  textLight: '#ffffff',
  error: '#dc2626',
  warning: '#f59e0b',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;
