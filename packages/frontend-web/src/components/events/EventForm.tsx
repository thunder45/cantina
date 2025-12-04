import React, { useState } from 'react';
import { CreateEventInput } from '@cantina-pos/shared';
import { Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';

interface EventFormProps {
  onSubmit: (data: CreateEventInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const EventForm: React.FC<EventFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddDate = (date: string) => {
    if (date && !dates.includes(date)) {
      setDates([...dates, date].sort());
      setErrors({ ...errors, dates: '' });
    }
  };

  const handleRemoveDate = (date: string) => {
    setDates(dates.filter(d => d !== date));
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCategory();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'O nome é obrigatório';
    }
    
    if (dates.length === 0) {
      newErrors.dates = 'Selecione pelo menos uma data';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ name: name.trim(), dates, categories });
    }
  };

  const inputStyle = {
    width: '100%',
    padding: Spacing.sm,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: Colors.border,
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

  return (
    <form onSubmit={handleSubmit} style={{ padding: Spacing.md }}>
      <h2 style={{ fontSize: FontSizes.xl, fontWeight: 600, color: Colors.text, marginBottom: Spacing.lg }}>
        Novo Evento
      </h2>

      {/* Nome */}
      <div style={{ marginBottom: Spacing.md }}>
        <label style={labelStyle}>Nome do Evento *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors({ ...errors, name: '' });
          }}
          placeholder="Ex: Festa de Verão 2025"
          style={{
            ...inputStyle,
            borderColor: errors.name ? Colors.error : Colors.border,
          }}
          disabled={loading}
        />
        {errors.name && <p style={errorStyle}>{errors.name}</p>}
      </div>

      {/* Datas */}
      <div style={{ marginBottom: Spacing.md }}>
        <label style={labelStyle}>Datas do Evento *</label>
        <input
          type="date"
          onChange={(e) => handleAddDate(e.target.value)}
          style={{
            ...inputStyle,
            borderColor: errors.dates ? Colors.error : Colors.border,
          }}
          disabled={loading}
        />
        {errors.dates && <p style={errorStyle}>{errors.dates}</p>}
        
        {dates.length > 0 && (
          <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap', marginTop: Spacing.sm }}>
            {dates.map((date) => (
              <span
                key={date}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: Spacing.xs,
                  padding: `${Spacing.xs}px ${Spacing.sm}px`,
                  backgroundColor: Colors.primary,
                  color: Colors.textLight,
                  borderRadius: BorderRadius.full,
                  fontSize: FontSizes.sm,
                }}
              >
                {new Date(date).toLocaleDateString('pt-PT')}
                <button
                  type="button"
                  onClick={() => handleRemoveDate(date)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: Colors.textLight,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: FontSizes.md,
                    lineHeight: 1,
                  }}
                  disabled={loading}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Categorias */}
      <div style={{ marginBottom: Spacing.lg }}>
        <label style={labelStyle}>Categorias (opcional)</label>
        <div style={{ display: 'flex', gap: Spacing.sm }}>
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ex: Almoço, Jantar, Festival"
            style={{ ...inputStyle, flex: 1 }}
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleAddCategory}
            style={{
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: Colors.secondary,
              color: Colors.textLight,
              border: 'none',
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.md,
              cursor: 'pointer',
            }}
            disabled={loading || !newCategory.trim()}
          >
            Adicionar
          </button>
        </div>
        
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap', marginTop: Spacing.sm }}>
            {categories.map((category) => (
              <span
                key={category}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: Spacing.xs,
                  padding: `${Spacing.xs}px ${Spacing.sm}px`,
                  backgroundColor: Colors.backgroundSecondary,
                  color: Colors.text,
                  borderRadius: BorderRadius.md,
                  fontSize: FontSizes.sm,
                }}
              >
                {category}
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(category)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: Colors.textSecondary,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: FontSizes.md,
                    lineHeight: 1,
                  }}
                  disabled={loading}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Botões */}
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
          {loading ? 'A criar...' : 'Criar Evento'}
        </button>
      </div>
    </form>
  );
};
