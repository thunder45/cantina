import React, { useState } from 'react';
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
  const [price, setPrice] = useState(catalogItem.suggestedPrice.toString());
  const [stock, setStock] = useState('0');
  const [groupId, setGroupId] = useState(catalogItem.groupId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const priceValue = parseCurrencyInput(price);
    
    if (priceValue <= 0) {
      newErrors.price = 'O preço deve ser maior que zero';
    }
    
    const stockValue = parseInt(stock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
      newErrors.stock = 'O estoque deve ser zero ou maior';
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
        Adicionar ao Menu
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
          Preço sugerido: {formatCurrency(catalogItem.suggestedPrice)}
        </p>
      </div>

      {/* Price */}
      <div style={{ marginBottom: Spacing.md }}>
        <label style={labelStyle}>Preço de Venda (€) *</label>
        <input
          type="number"
          step="0.01"
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
        <label style={labelStyle}>Quantidade em Estoque</label>
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
          Use 0 para estoque infinito
        </p>
        {errors.stock && (
          <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.xs, color: Colors.error }}>
            {errors.stock}
          </p>
        )}
      </div>

      {/* Group */}
      <div style={{ marginBottom: Spacing.lg }}>
        <label style={labelStyle}>Grupo</label>
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
          Cancelar
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
          {loading ? 'A adicionar...' : 'Adicionar ao Menu'}
        </button>
      </div>
    </form>
  );
};
