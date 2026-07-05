import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <label className={`relative inline-flex items-center shrink-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked} 
        onChange={(e) => !disabled && onChange(e.target.checked)} 
        disabled={disabled}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
    </label>
  );
}

interface ToggleRowProps {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function ToggleRow({ title, description, checked, onChange, className = '', disabled = false }: ToggleRowProps) {
  return (
    <div className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div>
        <span className={`font-medium block transition-colors duration-200 ${checked ? 'text-gray-900' : 'text-gray-400'}`}>
          {title}
        </span>
        {description && (
          <span className={`text-xs transition-colors duration-200 ${checked ? 'text-gray-500' : 'text-gray-400 opacity-70'}`}>
            {description}
          </span>
        )}
      </div>
      <div className="ml-4 flex-shrink-0">
        <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}
