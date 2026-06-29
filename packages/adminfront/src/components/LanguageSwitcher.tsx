import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  const Flag = ({ code, flag }: { code: string; flag: string }) => {
    // Detect Windows to handle abbreviation fallback
    const isWindows = typeof window !== 'undefined' && /Win/i.test(navigator.userAgent || navigator.platform || '');

    if (code === 'zh-TW') {
      if (isWindows) {
        return <span className="text-[10px] font-bold tracking-tight text-gray-800">TW</span>;
      }
      return (
        <img 
          src="/flag_tw.svg" 
          className="w-5 h-3.5 shadow-sm rounded-sm object-cover border border-black/5" 
          alt="TW Flag"
        />
      );
    }
    
    // For other countries, use system emoji
    return <span className="leading-none">{flag}</span>;
  };

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
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        type="button"
      >
        <span className="flex items-center justify-center min-w-[20px]">
          <Flag code={currentLanguage.code} flag={currentLanguage.flag} />
        </span>
        <span className="hidden sm:inline text-gray-700">{currentLanguage.name}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-[100] py-1">
          <div className="max-h-64 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  i18n.language === lang.code
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="leading-none flex items-center justify-center min-w-[20px]">
                  <Flag code={lang.code} flag={lang.flag} />
                </span>
                <span>{lang.name}</span>
                {i18n.language === lang.code && (
                  <svg className="ml-auto w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
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
