import { CSSProperties } from 'react';
import { Platform, Orientation, Spacing, FontSizes, BorderRadius, TouchTargets } from '@cantina-pos/shared';

// Responsive style generator
export interface ResponsiveStyleOptions {
  platform: Platform;
  orientation: Orientation;
  isTouch: boolean;
}

// Get touch-optimized button styles
export function getTouchButtonStyles(
  options: ResponsiveStyleOptions,
  variant: 'primary' | 'secondary' | 'icon' = 'primary'
): CSSProperties {
  const { platform, isTouch } = options;
  const target = TouchTargets[platform];

  const baseStyles: CSSProperties = {
    minHeight: target.minSize,
    minWidth: variant === 'icon' ? target.minSize : target.recommended * 2,
    padding: `${target.spacing}px ${target.spacing * 2}px`,
    fontSize: platform === 'tablet' ? FontSizes.lg : FontSizes.md,
    borderRadius: BorderRadius.md,
    cursor: isTouch ? 'default' : 'pointer',
    // Prevent text selection on touch
    WebkitUserSelect: 'none',
    userSelect: 'none',
    // Improve touch response
    WebkitTapHighlightColor: 'transparent',
  };

  if (variant === 'icon') {
    return {
      ...baseStyles,
      padding: target.spacing,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }

  return baseStyles;
}

// Get responsive grid styles
export function getResponsiveGridStyles(
  options: ResponsiveStyleOptions,
  itemMinWidth: number = 150
): CSSProperties {
  const { platform, orientation } = options;

  // Adjust min width based on platform
  const adjustedMinWidth = platform === 'mobile' 
    ? Math.min(itemMinWidth, 120) 
    : platform === 'tablet' 
      ? itemMinWidth * 1.2 
      : itemMinWidth;

  // Calculate columns based on platform and orientation
  const columns = {
    mobile: orientation === 'landscape' ? 3 : 2,
    tablet: orientation === 'landscape' ? 4 : 3,
    desktop: orientation === 'landscape' ? 5 : 4,
  };

  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${adjustedMinWidth}px, 1fr))`,
    gap: platform === 'tablet' ? Spacing.lg : Spacing.md,
  };
}

// Get responsive container styles
export function getResponsiveContainerStyles(
  options: ResponsiveStyleOptions
): CSSProperties {
  const { platform, orientation } = options;

  const padding = {
    mobile: Spacing.sm,
    tablet: Spacing.lg,
    desktop: Spacing.md,
  };

  return {
    padding: padding[platform],
    maxWidth: platform === 'desktop' ? 1400 : '100%',
    margin: platform === 'desktop' ? '0 auto' : 0,
  };
}

// Get responsive layout styles for main content areas
export function getResponsiveLayoutStyles(
  options: ResponsiveStyleOptions
): CSSProperties {
  const { platform, orientation } = options;

  // Tablet landscape: side-by-side layout
  if (platform === 'tablet' && orientation === 'landscape') {
    return {
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
    };
  }

  // Mobile or portrait: stacked layout
  return {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  };
}

// Get responsive sidebar/panel width
export function getResponsivePanelWidth(
  options: ResponsiveStyleOptions
): string | number {
  const { platform, orientation } = options;

  if (platform === 'mobile') return '100%';
  if (platform === 'tablet') {
    return orientation === 'landscape' ? 350 : '100%';
  }
  return 400; // Desktop
}

// Get responsive font size
export function getResponsiveFontSize(
  options: ResponsiveStyleOptions,
  baseSize: keyof typeof FontSizes
): number {
  const { platform } = options;
  const base = FontSizes[baseSize];

  const scale = {
    mobile: 1,
    tablet: 1.15,
    desktop: 1,
  };

  return Math.round(base * scale[platform]);
}

// Get responsive spacing
export function getResponsiveSpacing(
  options: ResponsiveStyleOptions,
  baseSpacing: keyof typeof Spacing
): number {
  const { platform } = options;
  const base = Spacing[baseSpacing];

  const scale = {
    mobile: 0.875,
    tablet: 1.25,
    desktop: 1,
  };

  return Math.round(base * scale[platform]);
}

// Get navigation styles optimized for platform
export function getResponsiveNavStyles(
  options: ResponsiveStyleOptions
): CSSProperties {
  const { platform, isTouch } = options;
  const target = TouchTargets[platform];

  return {
    display: 'flex',
    gap: platform === 'mobile' ? Spacing.xs : Spacing.md,
    padding: `${Spacing.sm}px ${platform === 'mobile' ? Spacing.sm : Spacing.lg}px`,
    minHeight: target.recommended + Spacing.md * 2,
    alignItems: 'center',
    overflowX: platform === 'mobile' ? 'auto' : 'visible',
    WebkitOverflowScrolling: 'touch',
  };
}

// Get modal styles optimized for platform
export function getResponsiveModalStyles(
  options: ResponsiveStyleOptions
): CSSProperties {
  const { platform, orientation } = options;

  if (platform === 'mobile') {
    return {
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
      borderRadius: 0,
    };
  }

  if (platform === 'tablet') {
    return {
      width: orientation === 'landscape' ? '70%' : '90%',
      maxWidth: 700,
      maxHeight: '85vh',
      borderRadius: BorderRadius.lg,
    };
  }

  return {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80vh',
    borderRadius: BorderRadius.lg,
  };
}
