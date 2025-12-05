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
  primary: '#667eea',
  primaryHover: '#5568d3',
  secondary: '#64748b',
  secondaryHover: '#475569',
  danger: '#ef4444',
  dangerHover: '#dc2626',
  success: '#10b981',
  successHover: '#059669',
  background: '#ffffff',
  backgroundSecondary: '#f8fafc',
  border: '#e2e8f0',
  text: '#1e293b',
  textSecondary: '#64748b',
  textLight: '#ffffff',
  error: '#ef4444',
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
