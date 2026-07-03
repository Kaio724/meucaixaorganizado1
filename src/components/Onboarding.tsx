import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<'cnpj' | 'autonomo'>('cnpj');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !businessName.trim()) return;
    onComplete({
      name: name.trim(),
      businessName: businessName.trim(),
      businessType,
      isOnboarded: true,
    });
  };

  return (
    <div className="w-full max-w-lg p-4 z-10 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-card rounded-[24px] p-6 md:p-10 shadow-2xl flex flex-col gap-8"
      >
        {/* Header Section */}
        <header className="flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(109,59,215,0.3)] mb-2">
            <img 
              src="/mco_logo.png" 
              alt="MCO Logo" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-on-surface tracking-tight">
            Boas-vindas ao <span className="text-primary font-bold">MCO</span>
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant max-w-xs leading-relaxed">
            Vamos configurar seu espaço para organizar as finanças de forma simples.
          </p>
        </header>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Input 1: Nome */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-on-surface-variant" htmlFor="user_name">
              Qual seu nome?
            </label>
            <div className="relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-200">
              <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-xl">
                person
              </span>
              <input
                id="user_name"
                name="user_name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-transparent border-none text-on-surface py-4 pl-12 pr-4 rounded-xl focus:outline-none placeholder:text-on-surface-variant/40"
              />
            </div>
          </div>

          {/* Input 2: Nome do negócio */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-on-surface-variant" htmlFor="business_name">
              Qual o nome do seu negócio?
            </label>
            <div className="relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-200">
              <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-xl">
                storefront
              </span>
              <input
                id="business_name"
                name="business_name"
                type="text"
                placeholder="Nome do negócio"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full bg-transparent border-none text-on-surface py-4 pl-12 pr-4 rounded-xl focus:outline-none placeholder:text-on-surface-variant/40"
              />
            </div>
          </div>

          {/* Question: CNPJ vs Conta */}
          <div className="flex flex-col gap-3 pt-2">
            <span className="text-sm font-medium text-on-surface-variant">
              Você tem CNPJ (MEI) ou trabalha por conta?
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: CNPJ */}
              <label className="cursor-pointer relative group block">
                <input
                  type="radio"
                  name="business_type"
                  value="cnpj"
                  checked={businessType === 'cnpj'}
                  onChange={() => setBusinessType('cnpj')}
                  className="sr-only"
                />
                <div className={`flex flex-col p-4 rounded-xl border transition-all duration-200 h-full relative overflow-hidden ${
                  businessType === 'cnpj'
                    ? 'border-primary bg-primary/10'
                    : 'border-outline-variant bg-surface-container hover:bg-surface-container-highest'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`material-symbols-outlined text-xl transition-colors ${
                      businessType === 'cnpj' ? 'text-primary' : 'text-on-surface-variant'
                    }`}>
                      badge
                    </span>
                    <span className={`font-semibold text-sm transition-colors ${
                      businessType === 'cnpj' ? 'text-primary' : 'text-on-surface'
                    }`}>
                      Tenho CNPJ
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant opacity-80">
                    MEI ou outras categorias
                  </span>
                  
                  {/* Selection Indicator */}
                  {businessType === 'cnpj' && (
                    <span className="material-symbols-outlined absolute top-4 right-4 text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  )}
                </div>
              </label>

              {/* Option 2: Por Conta */}
              <label className="cursor-pointer relative group block">
                <input
                  type="radio"
                  name="business_type"
                  value="autonomo"
                  checked={businessType === 'autonomo'}
                  onChange={() => setBusinessType('autonomo')}
                  className="sr-only"
                />
                <div className={`flex flex-col p-4 rounded-xl border transition-all duration-200 h-full relative overflow-hidden ${
                  businessType === 'autonomo'
                    ? 'border-primary bg-primary/10'
                    : 'border-outline-variant bg-surface-container hover:bg-surface-container-highest'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`material-symbols-outlined text-xl transition-colors ${
                      businessType === 'autonomo' ? 'text-primary' : 'text-on-surface-variant'
                    }`}>
                      engineering
                    </span>
                    <span className={`font-semibold text-sm transition-colors ${
                      businessType === 'autonomo' ? 'text-primary' : 'text-on-surface'
                    }`}>
                      Trabalho por conta
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant opacity-80">
                    Autônomo sem CNPJ
                  </span>
                  
                  {/* Selection Indicator */}
                  {businessType === 'autonomo' && (
                    <span className="material-symbols-outlined absolute top-4 right-4 text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-4 border-t border-white/5">
            <button
              type="submit"
              className="w-full bg-primary hover:bg-[#c0aeff] text-on-primary font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_14px_rgba(208,188,255,0.15)] hover:shadow-[0_6px_20px_rgba(208,188,255,0.3)] active:scale-[0.98]"
            >
              <span className="font-semibold text-sm">Começar a organizar</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
