import { useState, useEffect, useCallback } from 'react';
import {
  Platform,
  Orientation,
  detectPlatform,
  detectOrientation,
  isTouchDevice,
  TouchTargets,
  getGridColumns,
  FontScale,
  SpacingScale,
} from '@cantina-pos/shared';

export interface PlatformInfo {
  platform: Platform;
  orientation: Orientation;
  isTouch: boolean;
  width: number;
  height: number;
  touchTarget: typeof TouchTargets[Platform];
  gridColumns: number;
  fontScale: number;
  spacingScale: number;
}

export function usePlatform(): PlatformInfo {
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    // Also listen for orientation change on mobile devices
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const platform = detectPlatform(dimensions.width);
  const orientation = detectOrientation(dimensions.width, dimensions.height);
  const isTouch = isTouchDevice();

  return {
    platform,
    orientation,
    isTouch,
    width: dimensions.width,
    height: dimensions.height,
    touchTarget: TouchTargets[platform],
    gridColumns: getGridColumns(platform, orientation),
    fontScale: FontScale[platform],
    spacingScale: SpacingScale[platform],
  };
}

// Hook for keyboard shortcuts (desktop optimization)
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [handleKeyDown, enabled]);
}
