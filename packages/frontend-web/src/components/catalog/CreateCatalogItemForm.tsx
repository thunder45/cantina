import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MenuGroup, CreateCatalogItemInput } from '@cantina-pos/shared';
import { Colors, Spacing, FontSizes, BorderRadius, parseCurrencyInput } from '@cantina-pos/shared';

interface CreateCatalogItemFormProps {
  groups: MenuGroup[];
  onSubmit: (data: CreateCatalogItemInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const CreateCatalogItemForm: React.FC<CreateCatalogItemFormProps> = ({
  groups,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!description.trim()) {
      newErrors.description = t('menu.descriptionRequired');
    }
    
    const priceValue = parseCurrencyInput(suggestedPrice);
    if (priceValue <= 0) {
      newErrors.suggestedPrice = t('menu.priceRequired');
    } else if (!/^\d+([.,]\d{0,2})?$/.test(suggestedPrice.trim())) {
      newErrors.suggestedPrice = t('menu.priceDecimals');
    }
    
    if (!groupId) {
      newErrors.groupId = t('common.selectGroup');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        description: description.trim(),
        suggestedPrice: parseCurrencyInput(suggestedPrice),
        groupId,
      });
    }
  };

  const inputStyle = {
    width: '100%',
    padding: Spacing.sm,
    fontSize: FontSizes.md,
    border: `1px solid ${Colors.border}`,
    borderRadius: BorderRadius.md,
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: FontSizes.sm,
    fontWeight: 500,
    color: Colors.text,
    marginBottom: Spacing.xs,
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: Spacing.md }}>
      <h3 style={{ margin: 0, marginBottom: Spacing.lg, fontSize: FontSizes.lg, color: Colors.text }}>
        {t('menu.newCatalogItem')}
      </h3>

      {/* Description */}
      <div style={{ marginBottom: Spacing.md }}>
        <label style={labelStyle}>{t('common.description')} *</label>
        <input
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setErrors({ ...errors, description: '' });
          }}
          placeholder="Ex: Hambúrguer Completo"
          style={{
            ...inputStyle,
            borderColor: errors.description ? Colors.error : Colors.border,
          }}
          disabled={loading}
          autoFocus
        />
        {errors.description && (
          <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.xs, color: Colors.error }}>
            {errors.description}
          </p>
        )}
      </div>

      {/* Suggested Price */}
      <div style={{ marginBottom: Spacing.md }}>
        <label style={labelStyle}>{t('menu.suggestedPrice')} *</label>
        <input
          type="number"
          step="any"
          min="0.01"
          value={suggestedPrice}
          onChange={(e) => {
            setSuggestedPrice(e.target.value);
            setErrors({ ...errors, suggestedPrice: '' });
          }}
          placeholder="0.00"
          style={{
            ...inputStyle,
            borderColor: errors.suggestedPrice ? Colors.error : Colors.border,
          }}
          disabled={loading}
        />
        {errors.suggestedPrice && (
          <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.xs, color: Colors.error }}>
            {errors.suggestedPrice}
          </p>
        )}
      </div>

      {/* Group */}
      <div style={{ marginBottom: Spacing.lg }}>
        <label style={labelStyle}>{t('common.group')} *</label>
        <select
          value={groupId}
          onChange={(e) => {
            setGroupId(e.target.value);
            setErrors({ ...errors, groupId: '' });
          }}
          style={{
            ...inputStyle,
            borderColor: errors.groupId ? Colors.error : Colors.border,
          }}
          disabled={loading}
        >
          <option value="">{t('common.selectGroup')}</option>
          {groups.map(group => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        {errors.groupId && (
          <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.xs, color: Colors.error }}>
            {errors.groupId}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: Spacing.sm, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: `${Spacing.sm}px ${Spacing.lg}px`,
            backgroundColor: Colors.backgroundSecondary,
            color: Colors.text,
            border: `1px solid ${Colors.border}`,
            borderRadius: BorderRadius.md,
            fontSize: FontSizes.md,
            cursor: 'pointer',
          }}
          disabled={loading}
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          style={{
            padding: `${Spacing.sm}px ${Spacing.lg}px`,
            backgroundColor: Colors.primary,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.md,
            fontSize: FontSizes.md,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
          disabled={loading}
        >
          {loading ? t('common.creating') : t('common.create')}
        </button>
      </div>
    </form>
  );
};
