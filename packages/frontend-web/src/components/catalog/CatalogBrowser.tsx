import React, { useState, useEffect } from 'react';
import { CatalogItem, MenuGroup } from '@cantina-pos/shared';
import { Colors, Spacing, FontSizes, BorderRadius, formatCurrency } from '@cantina-pos/shared';

interface CatalogBrowserProps {
  catalogItems: CatalogItem[];
  groups: MenuGroup[];
  onSelectItem: (item: CatalogItem) => void;
  onCreateItem: () => void;
  loading?: boolean;
}

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({
  catalogItems,
  groups,
  onSelectItem,
  onCreateItem,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const getGroupName = (groupId: string): string => {
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'Sem grupo';
  };

  const filteredItems = catalogItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = !selectedGroupId || item.groupId === selectedGroupId;
    return matchesSearch && matchesGroup && !item.deletedAt;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search and Filter */}
      <div style={{ marginBottom: Spacing.md }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar no catálogo..."
          style={{
            width: '100%',
            padding: Spacing.sm,
            fontSize: FontSizes.md,
            border: `1px solid ${Colors.border}`,
            borderRadius: BorderRadius.md,
            boxSizing: 'border-box',
            marginBottom: Spacing.sm,
          }}
        />
        <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedGroupId(null)}
            style={{
              padding: `${Spacing.xs}px ${Spacing.sm}px`,
              backgroundColor: selectedGroupId === null ? Colors.primary : Colors.backgroundSecondary,
              color: selectedGroupId === null ? Colors.textLight : Colors.text,
              border: 'none',
              borderRadius: BorderRadius.full,
              fontSize: FontSizes.xs,
              cursor: 'pointer',
            }}
          >
            Todos
          </button>
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              style={{
                padding: `${Spacing.xs}px ${Spacing.sm}px`,
                backgroundColor: selectedGroupId === group.id ? Colors.primary : Colors.backgroundSecondary,
                color: selectedGroupId === group.id ? Colors.textLight : Colors.text,
                border: 'none',
                borderRadius: BorderRadius.full,
                fontSize: FontSizes.xs,
                cursor: 'pointer',
              }}
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: Colors.textSecondary }}>A carregar...</p>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: Spacing.lg }}>
            <p style={{ color: Colors.textSecondary, marginBottom: Spacing.md }}>
              {searchQuery ? 'Nenhum item encontrado' : 'Catálogo vazio'}
            </p>
            <button
              onClick={onCreateItem}
              style={{
                padding: `${Spacing.sm}px ${Spacing.md}px`,
                backgroundColor: Colors.primary,
                color: Colors.textLight,
                border: 'none',
                borderRadius: BorderRadius.md,
                fontSize: FontSizes.sm,
                cursor: 'pointer',
              }}
            >
              + Criar Novo Item
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                style={{
                  padding: Spacing.sm,
                  backgroundColor: Colors.background,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = Colors.primary;
                  e.currentTarget.style.backgroundColor = Colors.backgroundSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = Colors.border;
                  e.currentTarget.style.backgroundColor = Colors.background;
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500, color: Colors.text }}>
                      {item.description}
                    </p>
                    <p style={{ margin: 0, fontSize: FontSizes.xs, color: Colors.textSecondary }}>
                      {getGroupName(item.groupId)}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, color: Colors.primary }}>
                    {formatCurrency(item.suggestedPrice)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create New Button */}
      {filteredItems.length > 0 && (
        <button
          onClick={onCreateItem}
          style={{
            marginTop: Spacing.md,
            padding: Spacing.sm,
            backgroundColor: Colors.backgroundSecondary,
            color: Colors.text,
            border: `1px dashed ${Colors.border}`,
            borderRadius: BorderRadius.md,
            fontSize: FontSizes.sm,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          + Criar Novo Item no Catálogo
        </button>
      )}
    </div>
  );
};
