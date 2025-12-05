// Platform detection and responsive utilities

export type Platform = 'tablet' | 'desktop' | 'mobile';
export type Orientation = 'landscape' | 'portrait';

// Breakpoints for responsive design
export const Breakpoints = {
  mobile: 480,      // Small phones
  tablet: 768,      // Tablets in portrait
  tabletLandscape: 1024, // Tablets in landscape
  desktop: 1280,    // Desktop/laptop
} as const;

// Touch target sizes per platform (following accessibility guidelines)
export const TouchTargets = {
  mobile: {
    minSize: 44,      // iOS HIG minimum
    recommended: 48,  // Material Design recommended
    spacing: 8,
  },
  tablet: {
    minSize: 48,      // Larger for tablet touch
    recommended: 56,
    spacing: 12,
  },
  desktop: {
    minSize: 32,      // Smaller for mouse precision
    recommended: 40,
    spacing: 8,
  },
} as const;

// Detect current platform based on screen width
export function detectPlatform(width: number): Platform {
  if (width < Breakpoints.tablet) return 'mobile';
  if (width < Breakpoints.desktop) return 'tablet';
  return 'desktop';
}

// Detect orientation
export function detectOrientation(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait';
}

// Check if device supports touch
export function isTouchDevice(): boolean {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // Type assertion for browser globals
  const win = window as Window & typeof globalThis;
  const nav = navigator as Navigator;
  
  return 'ontouchstart' in win || nav.maxTouchPoints > 0;
}

// Get responsive value based on platform
export function getResponsiveValue<T>(
  platform: Platform,
  values: { mobile: T; tablet: T; desktop: T }
): T {
  return values[platform];
}

// Grid columns based on platform and orientation
export function getGridColumns(platform: Platform, orientation: Orientation): number {
  const columns = {
    mobile: { portrait: 2, landscape: 3 },
    tablet: { portrait: 3, landscape: 4 },
    desktop: { portrait: 4, landscape: 5 },
  };
  return columns[platform][orientation];
}

// Font scale based on platform
export const FontScale = {
  mobile: 1,
  tablet: 1.1,
  desktop: 1,
} as const;

// Spacing scale based on platform
export const SpacingScale = {
  mobile: 1,
  tablet: 1.25,
  desktop: 1,
} as const;
