import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabase } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: (session: any) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = getSupabase();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase não está configurado. Por favor, configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações.');
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authErr) throw authErr;
        if (data?.session) {
          onAuthSuccess(data.session);
        }
      } else if (mode === 'signup') {
        const { data, error: authErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (authErr) throw authErr;
        if (data?.session) {
          onAuthSuccess(data.session);
        } else {
          setMessage('Cadastro realizado! Por favor, verifique seu e-mail para confirmar a conta.');
          setMode('login');
        }
      } else if (mode === 'forgot') {
        const { error: authErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (authErr) throw authErr;
        setMessage('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.');
        setMode('login');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Translate typical Supabase errors to friendly Portuguese
      let friendlyMsg = err.message || 'Ocorreu um erro, tente novamente.';
      if (err.message?.includes('Invalid login credentials')) {
        friendlyMsg = 'E-mail ou senha incorretos.';
      } else if (err.message?.includes('User already registered')) {
        friendlyMsg = 'Este e-mail já está cadastrado.';
      } else if (err.message?.includes('Password should be at least 6 characters')) {
        friendlyMsg = 'A senha deve conter pelo menos 6 caracteres.';
      } else if (err.message?.includes('Email not confirmed')) {
        friendlyMsg = 'Por favor, confirme seu e-mail antes de realizar o login. (Dica: Você pode desativar a confirmação de e-mail em "Authentication -> Providers -> Email -> Confirm email" no painel do seu Supabase para testar instantaneamente sem precisar confirmar o e-mail!)';
      }
      setError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-4 z-10 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-card rounded-[32px] p-6 md:p-10 shadow-2xl flex flex-col gap-8 bg-gradient-to-b from-[#1a1a22]/80 to-[#121217]/90 border border-primary/20"
      >
        {/* Header Section */}
        <header className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/25 shadow-[0_0_15px_rgba(109,59,215,0.15)] mb-1">
            <span className="material-symbols-outlined text-primary text-3xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
            Meu Caixa <span className="text-primary font-bold">Organizado</span>
          </h1>
          <p className="text-xs text-on-surface-variant/80 max-w-xs leading-relaxed font-medium">
            {mode === 'login' && 'Faça login para acessar suas finanças em nuvem'}
            {mode === 'signup' && 'Crie sua conta SaaS gratuita para salvar seus dados'}
            {mode === 'forgot' && 'Insira seu e-mail para redefinir sua senha'}
          </p>
        </header>

        {/* Form Section */}
        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {/* Error and Message Banners */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-error/10 border border-error/20 rounded-2xl p-4 text-xs font-semibold text-error text-center"
              >
                {error}
              </motion.div>
            )}
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-tertiary/10 border border-tertiary/20 rounded-2xl p-4 text-xs font-semibold text-tertiary text-center"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* E-mail Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-on-surface-variant/90" htmlFor="email">
              Endereço de E-mail
            </label>
            <div className="relative flex items-center rounded-2xl bg-surface-container-low border border-outline-variant focus-within:border-primary transition-all duration-200">
              <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-xl">
                mail
              </span>
              <input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-none text-on-surface py-3.5 pl-12 pr-4 rounded-2xl focus:outline-none text-sm placeholder:text-on-surface-variant/30"
              />
            </div>
          </div>

          {/* Password Input (only on Login/Signup) */}
          {mode !== 'forgot' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-on-surface-variant/90" htmlFor="password">
                  Senha secreta
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative flex items-center rounded-2xl bg-surface-container-low border border-outline-variant focus-within:border-primary transition-all duration-200">
                <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-xl">
                  vpn_key
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="Sua senha segura"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border-none text-on-surface py-3.5 pl-12 pr-4 rounded-2xl focus:outline-none text-sm placeholder:text-on-surface-variant/30"
                />
              </div>
            </div>
          )}

          {/* CTA Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6d3bd7] hover:bg-[#8455ef] disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_14px_rgba(109,59,215,0.25)] border border-primary/30 mt-2 cursor-pointer select-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="text-sm">
                  {mode === 'login' && 'Entrar na Conta'}
                  {mode === 'signup' && 'Cadastrar Grátis'}
                  {mode === 'forgot' && 'Enviar link de recuperação'}
                </span>
                <span className="material-symbols-outlined text-lg font-bold">arrow_forward</span>
              </>
            )}
          </button>

          {/* Toggle Modes */}
          <div className="text-center mt-3 pt-3 border-t border-white/5">
            {mode === 'login' && (
              <p className="text-xs text-on-surface-variant font-medium">
                Novo por aqui?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline font-bold cursor-pointer"
                >
                  Crie sua conta agora
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p className="text-xs text-on-surface-variant font-medium">
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary hover:underline font-bold cursor-pointer"
                >
                  Fazer login
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-primary hover:underline font-bold cursor-pointer"
              >
                Voltar para o login
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
