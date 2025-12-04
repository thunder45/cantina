import { BaseComponentProps, Colors, Spacing, FontSizes, BorderRadius } from './types';

export interface ListItem<T = unknown> {
  id: string;
  data: T;
}

export interface ListProps<T = unknown> extends BaseComponentProps {
  items: ListItem<T>[];
  renderItem: (item: ListItem<T>, index: number) => unknown;
  emptyMessage?: string;
  loading?: boolean;
  onItemPress?: (item: ListItem<T>) => void;
  keyExtractor?: (item: ListItem<T>) => string;
}

// Style generator for List component - platform-agnostic
export function getListStyles() {
  return {
    container: {
      flex: 1,
    },
    item: {
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      backgroundColor: Colors.background,
    },
    itemPressed: {
      backgroundColor: Colors.backgroundSecondary,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    emptyText: {
      fontSize: FontSizes.md,
      color: Colors.textSecondary,
      textAlign: 'center' as const,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    separator: {
      height: 1,
      backgroundColor: Colors.border,
    },
  };
}

// Search/filter list items helper
export function filterListItems<T>(
  items: ListItem<T>[],
  searchQuery: string,
  searchFields: (keyof T)[]
): ListItem<T>[] {
  if (!searchQuery.trim()) return items;
  
  const query = searchQuery.toLowerCase().trim();
  
  return items.filter(item => {
    return searchFields.some(field => {
      const value = item.data[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(query);
      }
      if (typeof value === 'number') {
        return value.toString().includes(query);
      }
      return false;
    });
  });
}

// Group list items by a field
export function groupListItems<T>(
  items: ListItem<T>[],
  groupBy: keyof T
): Map<string, ListItem<T>[]> {
  const groups = new Map<string, ListItem<T>[]>();
  
  items.forEach(item => {
    const key = String(item.data[groupBy] ?? 'Other');
    const existing = groups.get(key) || [];
    groups.set(key, [...existing, item]);
  });
  
  return groups;
}
