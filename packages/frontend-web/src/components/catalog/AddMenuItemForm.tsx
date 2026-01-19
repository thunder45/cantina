import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CatalogItem, MenuGroup, AddMenuItemInput } from '@cantina-pos/shared';
import { Colors, Spacing, FontSizes, BorderRadius, formatCurrency, parseCurrencyInput } from '@cantina-pos/shared';

interface AddMenuItemFormProps {
  catalogItem: CatalogItem;
  groups: MenuGroup[];
  onSubmit: (data: AddMenuItemInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const AddMenuItemForm: React.FC<AddMenuItemFormProps> = ({
  catalogItem,
  groups,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [price, setPrice] = useState(catalogItem.suggestedPrice.toString());
  const [stock, setStock] = useState('0');
  const [groupId, setGroupId] = useState(catalogItem.groupId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const priceValue = parseCurrencyInput(price);
    
    if (priceValue <= 0) {
      newErrors.price = t('menu.priceRequired');
    } else if (!/^\d+([.,]\d{0,2})?$/.test(price.trim())) {
      newErrors.price = t('menu.priceDecimals');
    }
    
    const stockValue = parseInt(stock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
      newErrors.stock = t('menu.stockRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        catalogItemId: catalogItem.id,
        description: catalogItem.description,
        price: parseCurrencyInput(price),
        stock: parseInt(stock, 10) || 0,
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
        {t('menu.addToMenu')}
      </h3>

      {/* Item Info */}
      <div style={{ 
        padding: Spacing.md, 
        backgroundColor: Colors.backgroundSecondary, 
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.lg,
      }}>
        <p style={{ margin: 0, fontWeight: 600, color: Colors.text }}>
          {catalogItem.description}
        </p>
        <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.sm, color: Colors.textSecondary }}>
          {t('menu.suggestedPrice')}: {formatCurrency(catalogItem.suggestedPrice)}
        </p>
      </div>

      {/* Price */}
      <div style={{ marginBottom: Spacing.md }}>
        <label style={labelStyle}>{t('menu.salePrice')} *</label>
        <input
          type="number"
          step="any"
          min="0.01"
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            setErrors({ ...errors, price: '' });
          }}
          style={{
            ...inputStyle,
            borderColor: errors.price ? Colors.error : Colors.border,
          }}
          disabled={loading}
        />
        {errors.price && (
          <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.xs, color: Colors.error }}>
            {errors.price}
          </p>
        )}
      </div>

      {/* Stock */}
      <div style={{ marginBottom: Spacing.md }}>
        <label style={labelStyle}>{t('menu.stockQuantity')}</label>
        <input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => {
            setStock(e.target.value);
            setErrors({ ...errors, stock: '' });
          }}
          style={{
            ...inputStyle,
            borderColor: errors.stock ? Colors.error : Colors.border,
          }}
          disabled={loading}
        />
        <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.xs, color: Colors.textSecondary }}>
          {t('menu.stockHint')}
        </p>
        {errors.stock && (
          <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.xs, color: Colors.error }}>
            {errors.stock}
          </p>
        )}
      </div>

      {/* Group */}
      <div style={{ marginBottom: Spacing.lg }}>
        <label style={labelStyle}>{t('common.group')}</label>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          style={inputStyle}
          disabled={loading}
        >
          {groups.map(group => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
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
          {loading ? t('menu.adding') : t('menu.addToMenu')}
        </button>
      </div>
    </form>
  );
};
