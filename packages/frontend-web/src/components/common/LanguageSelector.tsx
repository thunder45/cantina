import React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, SupportedLanguage, Colors, FontSizes, Spacing, BorderRadius } from '@cantina-pos/shared';

const langLabels: Record<SupportedLanguage, string> = {
  pt: '🇵🇹 PT',
  en: '🇬🇧 EN',
  fr: '🇫🇷 FR',
};

export const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value as SupportedLanguage);
  };

  return (
    <select
      value={i18n.language}
      onChange={handleChange}
      style={{
        padding: `${Spacing.xs}px ${Spacing.sm}px`,
        fontSize: FontSizes.sm,
        border: `1px solid ${Colors.border}`,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background,
        cursor: 'pointer',
      }}
      title={t('language.select')}
    >
      {supportedLanguages.map((lang) => (
        <option key={lang} value={lang}>{langLabels[lang]}</option>
      ))}
    </select>
  );
};
