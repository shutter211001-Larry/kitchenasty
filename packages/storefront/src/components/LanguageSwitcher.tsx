import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-main bg-surface border border-input rounded-full hover:bg-surface-soft transition-all shadow-sm active:scale-95"
        type="button"
      >
        <span className="text-xs font-bold leading-none flex items-center justify-center min-w-[20px] text-main">
          {currentLanguage.flag}
        </span>
        <span className="hidden sm:inline text-main">{currentLanguage.name}</span>
        <svg
          className={`w-4 h-4 text-sub transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 surface-card border border-input rounded-2xl shadow-xl z-[100] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-64 overflow-y-auto scrollbar-hide">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  i18n.language === lang.code
                    ? 'bg-primary-600 text-white font-semibold'
                    : 'text-main hover:bg-surface-soft'
                }`}
              >
                <span className="text-lg leading-none flex items-center justify-center">
                  {lang.flag}
                </span>
                <span className="text-main">{lang.name}</span>
                {i18n.language === lang.code && (
                  <svg className="ml-auto w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
