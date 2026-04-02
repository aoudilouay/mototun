import { useI18n } from '../context/I18nContext';

function LanguageSwitcher({ className = '' }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className={`inline-flex items-center rounded-lg border border-slate-300 bg-white p-1 shadow-sm ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setLanguage('fr')}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
          language === 'fr' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
        aria-label="Switch to French"
      >
        {t('lang.fr')}
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ar')}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
          language === 'ar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
        aria-label="Switch to Arabic"
      >
        {t('lang.ar')}
      </button>
    </div>
  );
}

export default LanguageSwitcher;
