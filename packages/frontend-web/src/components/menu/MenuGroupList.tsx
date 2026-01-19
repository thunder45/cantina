import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MenuGroup } from '@cantina-pos/shared';
import { Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';

interface MenuGroupListProps {
  groups: MenuGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onAddGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  loading?: boolean;
}

export const MenuGroupList: React.FC<MenuGroupListProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onAddGroup,
  onDeleteGroup,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddGroup = () => {
    const trimmed = newGroupName.trim();
    if (trimmed) {
      onAddGroup(trimmed);
      setNewGroupName('');
      setShowAddForm(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddGroup();
    } else if (e.key === 'Escape') {
      setShowAddForm(false);
      setNewGroupName('');
    }
  };

  return (
    <div style={{ 
      backgroundColor: Colors.background, 
      borderRadius: BorderRadius.lg,
      border: `1px solid ${Colors.border}`,
      overflow: 'hidden',
    }}>
      <div style={{ 
        padding: Spacing.md, 
        borderBottom: `1px solid ${Colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: FontSizes.md, fontWeight: 600, color: Colors.text }}>
          {t('menu.groups')}
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            padding: `${Spacing.xs}px ${Spacing.sm}px`,
            backgroundColor: Colors.primary,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.sm,
            fontSize: FontSizes.sm,
            cursor: 'pointer',
          }}
          disabled={loading}
        >
          + {t('common.new')}
        </button>
      </div>

      {/* Add Group Form */}
      {showAddForm && (
        <div style={{ padding: Spacing.sm, borderBottom: `1px solid ${Colors.border}` }}>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t('menu.groupName')}
            autoFocus
            style={{
              width: '100%',
              padding: Spacing.sm,
              fontSize: FontSizes.sm,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.sm,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: Spacing.xs, marginTop: Spacing.xs }}>
            <button
              onClick={handleAddGroup}
              style={{
                flex: 1,
                padding: Spacing.xs,
                backgroundColor: Colors.success,
                color: Colors.textLight,
                border: 'none',
                borderRadius: BorderRadius.sm,
                fontSize: FontSizes.xs,
                cursor: 'pointer',
              }}
              disabled={!newGroupName.trim()}
            >
              {t('common.add')}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewGroupName('');
              }}
              style={{
                flex: 1,
                padding: Spacing.xs,
                backgroundColor: Colors.backgroundSecondary,
                color: Colors.text,
                border: `1px solid ${Colors.border}`,
                borderRadius: BorderRadius.sm,
                fontSize: FontSizes.xs,
                cursor: 'pointer',
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* All Items Option */}
      <div
        onClick={() => onSelectGroup(null)}
        style={{
          padding: Spacing.md,
          cursor: 'pointer',
          backgroundColor: selectedGroupId === null ? Colors.primary : 'transparent',
          color: selectedGroupId === null ? Colors.textLight : Colors.text,
          borderBottom: `1px solid ${Colors.border}`,
          transition: 'background-color 0.2s',
        }}
      >
        {t('menu.allItems')}
      </div>

      {/* Group List */}
      {groups.map((group) => (
        <div
          key={group.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: Spacing.md,
            cursor: 'pointer',
            backgroundColor: selectedGroupId === group.id ? Colors.primary : 'transparent',
            color: selectedGroupId === group.id ? Colors.textLight : Colors.text,
            borderBottom: `1px solid ${Colors.border}`,
            transition: 'background-color 0.2s',
          }}
          onClick={() => onSelectGroup(group.id)}
        >
          <span>{group.name}</span>
          {!group.isDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteGroup(group.id);
              }}
              style={{
                padding: `${Spacing.xs}px`,
                backgroundColor: 'transparent',
                color: selectedGroupId === group.id ? Colors.textLight : Colors.danger,
                border: 'none',
                borderRadius: BorderRadius.sm,
                fontSize: FontSizes.sm,
                cursor: 'pointer',
                opacity: 0.7,
              }}
              title={t('common.removeGroup')}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {groups.length === 0 && (
        <div style={{ padding: Spacing.md, textAlign: 'center', color: Colors.textSecondary }}>
          {t('common.noGroupsCreated')}
        </div>
      )}
    </div>
  );
};
