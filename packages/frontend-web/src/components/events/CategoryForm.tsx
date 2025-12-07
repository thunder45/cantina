import React, { useState, useEffect } from 'react';
import { EventCategory } from '@cantina-pos/shared';
import { Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';

interface CategoryFormProps {
  category?: EventCategory; // If provided, we're editing
  onSubmit: (name: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [name, setName] = useState(category?.name || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name);
    }
  }, [category]);

  const validate = (): boolean => {
    if (!name.trim()) {
      setError('O nome é obrigatório');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(name.trim());
    }
  };

  const inputStyle = {
    width: '100%',
    padding: Spacing.sm,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: error ? Colors.error : Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    color: Colors.text,
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: FontSizes.sm,
    fontWeight: 500,
    color: Colors.text,
    marginBottom: Spacing.xs,
  };

  const errorStyle = {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  };

  const isEditing = !!category;

  return (
    <form onSubmit={handleSubmit} style={{ padding: Spacing.md }}>
      <h2 style={{ fontSize: FontSizes.xl, fontWeight: 600, color: Colors.text, marginBottom: Spacing.lg }}>
        {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
      </h2>

      <div style={{ marginBottom: Spacing.lg }}>
        <label style={labelStyle}>Nome da Categoria *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="Ex: Retiro, Conferência"
          style={inputStyle}
          disabled={loading}
          autoFocus
        />
        {error && <p style={errorStyle}>{error}</p>}
      </div>

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
          {loading ? (isEditing ? 'A guardar...' : 'A criar...') : (isEditing ? 'Guardar' : 'Criar Categoria')}
        </button>
      </div>
    </form>
  );
};
