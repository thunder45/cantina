import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateEventInput, EventCategory } from '@cantina-pos/shared';
import { Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';

interface EventFormProps {
  categories: EventCategory[];
  preSelectedCategoryId?: string;
  onSubmit: (data: CreateEventInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const EventForm: React.FC<EventFormProps> = ({
  categories,
  preSelectedCategoryId,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState(preSelectedCategoryId || '');
  const [name, setName] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (preSelectedCategoryId) {
      setCategoryId(preSelectedCategoryId);
    }
  }, [preSelectedCategoryId]);

  const handleAddDate = (date: string) => {
    if (date && !dates.includes(date)) {
      setDates([...dates, date].sort());
      setErrors({ ...errors, dates: '' });
    }
  };

  const handleRemoveDate = (date: string) => {
    setDates(dates.filter(d => d !== date));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!categoryId) {
      newErrors.categoryId = t('events.categoryRequired');
    }
    
    if (!name.trim()) {
      newErrors.name = t('events.nameRequired');
    }
    
    if (dates.length === 0) {
      newErrors.dates = t('events.selectAtLeastOneDate');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ categoryId, name: name.trim(), dates });
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
        {t('events.newEvent')}
      </h2>

      {/* Categoria */}
      <div style={{ marginBottom: Spacing.md }}>
        <label style={labelStyle}>{t('events.category')} *</label>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setErrors({ ...errors, categoryId: '' });
          }}
          style={{
            ...inputStyle,
            borderColor: errors.categoryId ? Colors.error : Colors.border,
          }}
          disabled={loading}
        >
          <option value="">{t('events.selectCategory')}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && <p style={errorStyle}>{errors.categoryId}</p>}
      </div>

      {/* Nome */}
      <div style={{ marginBottom: Spacing.md }}>
        <label style={labelStyle}>{t('events.name')} *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors({ ...errors, name: '' });
          }}
          placeholder="Ex: Culto Domingo 15/12"
          style={{
            ...inputStyle,
            borderColor: errors.name ? Colors.error : Colors.border,
          }}
          disabled={loading}
        />
        {errors.name && <p style={errorStyle}>{errors.name}</p>}
      </div>

      {/* Datas */}
      <div style={{ marginBottom: Spacing.lg }}>
        <label style={labelStyle}>{t('events.dates')} *</label>
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
        <p style={{ fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: Spacing.xs }}>
          {t('events.multipleDatesHint')}
        </p>
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
          {loading ? t('common.creating') : t('events.create')}
        </button>
      </div>
    </form>
  );
};
