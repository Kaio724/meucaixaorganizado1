import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'compact' | 'segmented' | 'dropdown-item';
  className?: string;
}

export default function ThemeToggle({ variant = 'compact', className = '' }: ThemeToggleProps) {
  const { theme, isLight, toggleTheme, setTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">palette</span>
          <span>Tema do Sistema</span>
        </label>
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-surface-container-low border border-outline-variant/30 gap-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isLight
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base text-amber-500">light_mode</span>
            <span>Modo Dia</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !isLight
                ? 'bg-[#2a2638] text-white shadow-sm border border-primary/30'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base text-primary">dark_mode</span>
            <span>Modo Noite</span>
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'dropdown-item') {
    return (
      <div className={`flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-base">
              {isLight ? 'light_mode' : 'dark_mode'}
            </span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-on-surface">Tema</span>
            <span className="text-[10px] text-on-surface-variant font-medium">
              {isLight ? 'Modo Dia ativo' : 'Modo Noite ativo'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-[11px] font-bold text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
          title={isLight ? 'Mudar para Modo Noite' : 'Mudar para Modo Dia'}
        >
          <span className="material-symbols-outlined text-sm text-primary">
            {isLight ? 'dark_mode' : 'light_mode'}
          </span>
          <span>{isLight ? 'Noite' : 'Dia'}</span>
        </button>
      </div>
    );
  }

  // Compact header icon button
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer border ${
        isLight
          ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 hover:bg-amber-500/20 hover:border-amber-500/40 shadow-sm'
          : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40 shadow-[0_0_12px_rgba(160,120,255,0.15)]'
      } ${className}`}
      title={isLight ? 'Alternar para Modo Noite' : 'Alternar para Modo Dia'}
      aria-label={isLight ? 'Alternar para Modo Noite' : 'Alternar para Modo Dia'}
    >
      <span className="material-symbols-outlined text-lg sm:text-xl transition-transform duration-200 hover:rotate-12">
        {isLight ? 'dark_mode' : 'light_mode'}
      </span>
    </button>
  );
}
