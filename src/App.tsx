import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Transaction, ActiveTab } from './types';
import { INITIAL_TRANSACTIONS } from './initialData';

// Components
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Withdraw from './components/Withdraw';
import Summary from './components/Summary';
import Auth from './components/Auth';
import Plans from './components/Plans';

// Supabase Helpers
import { 
  getSupabase, 
  isSupabaseConfigured, 
  fetchProfile, 
  upsertProfile, 
  fetchTransactions, 
  insertTransaction, 
  updateTransaction, 
  deleteTransaction 
} from './lib/supabase';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard'); // default to 'dashboard'
  const [showNotification, setShowNotification] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBusinessName, setEditBusinessName] = useState('');
  
  // Migration states
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbSchemaError, setDbSchemaError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sqlTab, setSqlTab] = useState<'upgrade' | 'full'>('upgrade');

  // Check session and load configuration on mount
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        loadUserData(currentSession.user.id, currentSession.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadUserData(newSession.user.id, newSession.user.email);
      } else {
        setProfile(null);
        setTransactions([]);
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadUserData = async (userId: string, email?: string) => {
    setLoading(true);
    setDbError(null);
    try {
      let dbProfile = await fetchProfile(userId);
      const isPromoUser = email?.toLowerCase() === 'kaiopatrick42@gmail.com' || email?.toLowerCase() === 'kaioparick42@gmail.com';
      if (dbProfile) {
        if (isPromoUser && dbProfile.plan !== 'pro') {
          dbProfile.plan = 'pro';
          try {
            await upsertProfile(userId, dbProfile);
            localStorage.setItem(`mco_profile_plan_${userId}`, 'pro');
          } catch (e) {
            console.warn('Silent upgrade profile to pro failed:', e);
          }
        }
        setProfile(dbProfile);
        const dbTxs = await fetchTransactions(userId);
        setTransactions(dbTxs);
        
        // After loading profile successfully, check if we need to migrate local storage
        const localTxsSaved = localStorage.getItem('mco_transactions');
        if (localTxsSaved) {
          try {
            const parsed = JSON.parse(localTxsSaved);
            if (parsed && parsed.length > 0) {
              setShowMigrationModal(true);
            } else {
              // No user transactions to migrate or empty, clean local state
              localStorage.removeItem('mco_transactions');
              localStorage.removeItem('mco_profile');
            }
          } catch (e) {
            localStorage.removeItem('mco_transactions');
            localStorage.removeItem('mco_profile');
          }
        }
      } else {
        // No profile in cloud yet, they need to onboard
        setProfile(null);
        setTransactions([]);
        
        // Check if there is local profile to prefill onboarding
        const savedProfile = localStorage.getItem('mco_profile');
        if (savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile);
            if (parsed && parsed.name) {
              setEditName(parsed.name);
              setEditBusinessName(parsed.businessName || '');
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading cloud data:', error);
      const isSchemaError = error.message?.includes('profiles') || 
                            error.message?.includes('lancamentos') || 
                            error.message?.includes('schema cache') || 
                            error.message?.includes('relation') ||
                            error.message?.includes('not found');
      if (isSchemaError) {
        setDbSchemaError(true);
      } else {
        setDbError('Sem conexão, tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Complete onboarding
  const handleOnboardingComplete = async (newProfile: UserProfile) => {
    if (!session?.user) return;
    setLoading(true);
    setDbError(null);
    try {
      const isPromoUser = session?.user?.email?.toLowerCase() === 'kaiopatrick42@gmail.com' || session?.user?.email?.toLowerCase() === 'kaioparick42@gmail.com';
      if (isPromoUser) {
        newProfile.plan = 'pro';
      }
      await upsertProfile(session.user.id, newProfile);
      setProfile(newProfile);

      // Check for migration immediately
      const localTxsSaved = localStorage.getItem('mco_transactions');
      let migrated = false;
      if (localTxsSaved) {
        try {
          const parsed = JSON.parse(localTxsSaved);
          if (parsed && parsed.length > 0) {
            setShowMigrationModal(true);
            migrated = true;
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (!migrated) {
        // If no migration needed, insert initial default transactions
        try {
          for (const item of INITIAL_TRANSACTIONS) {
            await insertTransaction(session.user.id, item);
          }
          const cloudTxs = await fetchTransactions(session.user.id);
          setTransactions(cloudTxs);
        } catch (err) {
          console.error('Error inserting initial transactions:', err);
          setTransactions([]);
        }
      }

      setActiveTab('dashboard');
    } catch (err: any) {
      console.error('Error on onboarding:', err);
      const isSchemaError = err.message?.includes('profiles') || 
                            err.message?.includes('lancamentos') || 
                            err.message?.includes('schema cache') || 
                            err.message?.includes('relation') ||
                            err.message?.includes('not found');
      if (isSchemaError) {
        setDbSchemaError(true);
      } else {
        setDbError('Erro ao salvar perfil. Sem conexão, tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Create Transaction (Add)
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    if (!session?.user) return;
    setDbError(null);
    try {
      const savedTx = await insertTransaction(session.user.id, newTx);
      setTransactions((prev) => [savedTx, ...prev]);
    } catch (err) {
      setDbError('Sem conexão, tente novamente');
    }
  };

  // Update Transaction (Edit)
  const handleEditTransaction = async (updatedTx: Transaction) => {
    if (!session?.user) return;
    setDbError(null);
    try {
      const savedTx = await updateTransaction(session.user.id, updatedTx);
      setTransactions((prev) => prev.map((t) => (t.id === savedTx.id ? savedTx : t)));
    } catch (err) {
      setDbError('Sem conexão, tente novamente');
    }
  };

  // Delete Transaction (Delete)
  const handleDeleteTransaction = async (id: string) => {
    if (!session?.user) return;
    setDbError(null);
    try {
      await deleteTransaction(session.user.id, id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setDbError('Sem conexão, tente novamente');
    }
  };

  // Update profile handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !session?.user) return;
    setDbError(null);
    try {
      const updatedProfile: UserProfile = {
        ...profile,
        name: editName.trim(),
        businessName: editBusinessName.trim()
      };
      await upsertProfile(session.user.id, updatedProfile);
      setProfile(updatedProfile);
      setShowEditProfileModal(false);
    } catch (err) {
      setDbError('Sem conexão, tente novamente');
    }
  };

  // Update plan handler
  const handleUpdatePlan = async (newPlan: 'essential' | 'pro') => {
    if (!profile) return;
    const userId = session?.user?.id || 'local';
    setDbError(null);
    try {
      const updatedProfile: UserProfile = {
        ...profile,
        plan: newPlan
      };
      await upsertProfile(userId, updatedProfile);
      setProfile(updatedProfile);
      
      // Also update in local storage if not logged in
      if (userId === 'local') {
        localStorage.setItem('mco_profile', JSON.stringify(updatedProfile));
      }
    } catch (err: any) {
      console.error('Error updating plan:', err);
      const isSchemaError = err.message?.includes('profiles') || 
                            err.message?.includes('schema cache') || 
                            err.message?.includes('plano') ||
                            err.message?.includes('relation');
      if (isSchemaError) {
        setDbSchemaError(true);
      } else {
        setDbError('Sem conexão para atualizar plano. Tente novamente.');
      }
      throw err;
    }
  };

  // Perform migration of local transactions to Supabase
  const handlePerformMigration = async (importData: boolean) => {
    setShowMigrationModal(false);
    if (!session?.user) return;
    
    setLoading(true);
    setDbError(null);
    
    try {
      if (importData) {
        const localTxsSaved = localStorage.getItem('mco_transactions');
        if (localTxsSaved) {
          const parsed: Transaction[] = JSON.parse(localTxsSaved);
          if (parsed && parsed.length > 0) {
            // Save transactions to cloud
            for (const tx of parsed) {
              await insertTransaction(session.user.id, tx);
            }
          }
        }
      }
      
      // Clear localStorage
      localStorage.removeItem('mco_transactions');
      localStorage.removeItem('mco_profile');
      
      // Reload fresh data from Supabase
      const cloudTxs = await fetchTransactions(session.user.id);
      setTransactions(cloudTxs);
      
      setShowNotification(true);
    } catch (err) {
      console.error('Migration failed:', err);
      setDbError('Falha ao migrar dados. Sem conexão, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setTransactions([]);
      setActiveTab('dashboard');
      setShowProfileMenu(false);
    }
  };

  // If Supabase keys are not configured yet, show helper instructions screen
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-[#131315] text-[#e5e1e4] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md glass-card rounded-[32px] p-8 shadow-2xl flex flex-col gap-6 bg-gradient-to-b from-[#1a1a22]/80 to-[#121217]/90 border border-primary/20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/25 shadow-[0_0_15px_rgba(208,188,255,0.15)] mx-auto">
            <span className="material-symbols-outlined text-primary text-3xl font-bold">settings</span>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-extrabold text-on-surface">Configuração Necessária</h1>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              O aplicativo <strong>Meu Caixa Organizado</strong> foi promovido a um SaaS real com persistência na nuvem!
            </p>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-4 text-left border border-white/5 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-primary">Próximos passos:</span>
            <ol className="text-xs text-on-surface-variant leading-relaxed list-decimal pl-4 flex flex-col gap-1.5 font-medium">
              <li>Acesse o menu de Configurações do seu espaço de desenvolvimento.</li>
              <li>Defina as seguintes chaves/segredos no painel:</li>
            </ol>
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-[11px] font-mono text-on-surface-variant flex flex-col gap-1">
              <div>VITE_SUPABASE_URL=sua_url</div>
              <div>VITE_SUPABASE_ANON_KEY=sua_chave</div>
            </div>
          </div>
          <p className="text-[10px] text-on-surface-variant/60">
            Depois de definir as variáveis de ambiente, reinicie o servidor de desenvolvimento para que as alterações entrem em vigor.
          </p>
        </div>
      </div>
    );
  }

  // If Supabase tables are not configured yet, show helper instructions screen
  if (dbSchemaError) {
    const upgradeScript = `-- ATUALIZAÇÃO SÓ DE COLUNAS (Se você já tem as tabelas criadas)
-- Use isso para corrigir o erro 'plano column' ou 'policy already exists'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'essential' CHECK (plano IN ('essential', 'pro'));`;

    const sqlScript = `-- 1. Criar a tabela de perfis (profiles) vinculada ao auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    nome_negocio TEXT NOT NULL,
    tipo_negocio TEXT NOT NULL CHECK (tipo_negocio IN ('mei', 'autonomo')),
    plano TEXT DEFAULT 'essential' CHECK (plano IN ('essential', 'pro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criar a tabela de lançamentos (lancamentos)
CREATE TABLE IF NOT EXISTS public.lancamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    categoria TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    titulo TEXT NOT NULL,
    forma_pagamento TEXT NOT NULL,
    descricao TEXT,
    data DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar o RLS (Row Level Security) em ambas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

-- 4. Criar as políticas de segurança RLS (Garantindo privacidade total)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can read own transactions" ON public.lancamentos;
CREATE POLICY "Users can read own transactions" ON public.lancamentos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.lancamentos;
CREATE POLICY "Users can insert own transactions" ON public.lancamentos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.lancamentos;
CREATE POLICY "Users can update own transactions" ON public.lancamentos FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.lancamentos;
CREATE POLICY "Users can delete own transactions" ON public.lancamentos FOR DELETE USING (auth.uid() = user_id);`;

    const handleCopySql = () => {
      const activeScript = sqlTab === 'upgrade' ? upgradeScript : sqlScript;
      navigator.clipboard.writeText(activeScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleRetry = () => {
      setDbSchemaError(false);
      if (session?.user) {
        loadUserData(session.user.id);
      }
    };

    return (
      <div className="min-h-screen bg-[#131315] text-[#e5e1e4] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-lg glass-card rounded-[32px] p-6 md:p-8 shadow-2xl flex flex-col gap-5 bg-gradient-to-b from-[#1a1a22]/85 to-[#121217]/95 border border-primary/20">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(208,188,255,0.2)] mx-auto">
            <span className="material-symbols-outlined text-primary text-2xl font-bold">database</span>
          </div>
          
          <div className="flex flex-col gap-1.5 text-center">
            <h1 className="text-lg font-extrabold text-on-surface">Configurar Tabelas no Supabase</h1>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Escolha a opção que corresponde ao estado atual do seu banco de dados no Supabase.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-black/30 p-1.5 rounded-2xl border border-white/5 gap-1">
            <button
              type="button"
              onClick={() => setSqlTab('upgrade')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                sqlTab === 'upgrade'
                  ? 'bg-[#6d3bd7] text-white shadow-md shadow-[#6d3bd7]/20'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`}
            >
              🔄 Apenas Atualizar (Recomendado)
            </button>
            <button
              type="button"
              onClick={() => setSqlTab('full')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                sqlTab === 'full'
                  ? 'bg-[#6d3bd7] text-white shadow-md shadow-[#6d3bd7]/20'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`}
            >
              ✨ Instalação do Zero
            </button>
          </div>

          {sqlTab === 'upgrade' ? (
            <div className="bg-surface-container-low rounded-2xl p-4 text-left border border-white/5 flex flex-col gap-3">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">info</span> Correção do erro de coluna / políticas:
              </span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Se você já possui as tabelas <strong>profiles</strong> e <strong>lancamentos</strong> criadas, você não precisa criá-las de novo nem recriar políticas.
              </p>
              <ol className="text-xs text-on-surface-variant leading-relaxed list-decimal pl-4 flex flex-col gap-1">
                <li>Copie o comando simples de atualização abaixo.</li>
                <li>Cole no seu <strong>SQL Editor</strong> do Supabase e clique em <strong>Run</strong>.</li>
                <li>Isso adiciona a nova coluna de planos sem recriar políticas e evita o erro <code>policy already exists</code>.</li>
              </ol>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-2xl p-4 text-left border border-white/5 flex flex-col gap-3">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">info</span> Instalação do Zero:
              </span>
              <ol className="text-xs text-on-surface-variant leading-relaxed list-decimal pl-4 flex flex-col gap-1">
                <li>Selecione esta opção caso você esteja iniciando um banco de dados novo no Supabase.</li>
                <li>Cole o código SQL completo no SQL Editor e execute-o.</li>
              </ol>
            </div>
          )}

          <div className="flex flex-col gap-2 relative">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">
                {sqlTab === 'upgrade' ? 'SQL de Atualização' : 'SQL Completo do Zero'}
              </span>
              <button 
                onClick={handleCopySql}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-container bg-primary/10 hover:bg-primary/25 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">{copied ? 'done' : 'content_copy'}</span>
                {copied ? 'Copiado!' : 'Copiar Código'}
              </button>
            </div>
            <pre className="bg-black/40 p-3.5 rounded-xl border border-white/5 text-[10px] font-mono text-on-surface-variant overflow-x-auto max-h-48 text-left leading-relaxed">
              {sqlTab === 'upgrade' ? upgradeScript : sqlScript}
            </pre>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleRetry}
              className="w-full bg-[#6d3bd7] hover:bg-[#8455ef] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_14px_rgba(109,59,215,0.25)] cursor-pointer text-xs"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Já executei o script, Tentar Novamente
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full bg-surface-container hover:bg-surface-container-highest border border-outline-variant/20 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs text-on-surface"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#131315] text-[#e5e1e4] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-on-surface-variant tracking-wider uppercase animate-pulse">
            Carregando Caixa...
          </span>
        </div>
      </div>
    );
  }

  // Navigation Items definitions
  const NAV_ITEMS = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: 'home' },
    { id: 'historico' as ActiveTab, label: 'Histórico', icon: 'history' },
    { id: 'retirar' as ActiveTab, label: 'Retirar', icon: 'payments' },
    { id: 'resumo' as ActiveTab, label: 'Resumo', icon: 'pie_chart' },
  ];

  return (
    <div className="min-h-screen bg-[#131315] text-[#e5e1e4] flex flex-col justify-between relative overflow-x-hidden antialiased font-sans">
      
      {/* Ambient background glow gradient */}
      <div className="absolute inset-0 ambient-glow pointer-events-none z-0"></div>

      {/* Connection Error Toast */}
      <AnimatePresence>
        {dbError && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-4 right-4 z-50 p-4 bg-error/95 border border-error/20 rounded-2xl text-xs font-bold text-white shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">cloud_off</span>
              <span>{dbError}</span>
            </div>
            <button onClick={() => setDbError(null)} className="text-white/80 hover:text-white">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="w-full max-w-lg lg:max-w-7xl xl:max-w-[1440px] mx-auto px-4 lg:px-8 z-10 relative flex-1 flex flex-col lg:flex-row justify-between lg:justify-start lg:gap-8">
        
        {/* Render Auth Screen if not logged in */}
        {!session ? (
          <div className="flex-1 flex items-center justify-center py-8 w-full max-w-lg mx-auto">
            <Auth onAuthSuccess={(newSession) => setSession(newSession)} />
          </div>
        ) : !profile || !profile.isOnboarded ? (
          /* Render Onboarding if logged in but profile is missing */
          <div className="flex-1 flex items-center justify-center py-8 w-full max-w-lg mx-auto">
            <Onboarding onComplete={handleOnboardingComplete} />
          </div>
        ) : (
          /* Logged In Core Layout */
          <>
            {/* Sidebar - Visible on Desktop only */}
            <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 py-8 border-r border-white/5 pr-6 z-30 select-none">
              {/* Logo */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-primary/10 border border-primary/30 shadow-[0_0_15px_rgba(208,188,255,0.25)] mb-8">
                <span className="material-symbols-outlined text-primary text-xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_balance_wallet
                </span>
                <span className="text-sm font-extrabold text-primary tracking-wider uppercase font-sans">
                  MCO
                </span>
              </div>

              {/* Menu */}
              <div className="flex flex-col gap-1.5 mb-auto">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowProfileMenu(false);
                        setShowNotification(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-primary/20 text-primary border border-primary/15'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                
                {/* Plans button in side menu */}
                <button
                  onClick={() => {
                    setActiveTab('planos');
                    setShowProfileMenu(false);
                    setShowNotification(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                    activeTab === 'planos'
                      ? 'bg-primary/20 text-primary border border-primary/15'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">workspace_premium</span>
                  <span>Planos</span>
                </button>
              </div>

              {/* Plano Atual & Botão Upgrade */}
              <div className="bg-surface-container-low rounded-2xl p-4 border border-white/5 mb-4 flex flex-col gap-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Plano Atual</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border ${
                    (profile.plan || 'essential') === 'pro'
                      ? 'bg-primary/20 text-primary border-primary/30'
                      : 'bg-white/5 text-on-surface-variant/80 border-white/10'
                  }`}>
                    {profile.plan || 'essential'}
                  </span>
                </div>
                {(profile.plan || 'essential') !== 'pro' && (
                  <button
                    onClick={() => setActiveTab('planos')}
                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-[#c0aeff] text-on-primary font-black text-xs transition-all duration-200 border border-primary/30 shadow-[0_4px_12px_rgba(160,120,255,0.15)] text-center cursor-pointer"
                  >
                    Upgrade para o PRO
                  </button>
                )}
              </div>

              {/* Perfil */}
              <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-3 relative">
                <div 
                  onClick={() => {
                    if (profile) {
                      setEditName(profile.name);
                      setEditBusinessName(profile.businessName);
                    }
                    setShowEditProfileModal(true);
                  }}
                  className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1 group text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-on-surface transition-all group-hover:bg-surface-container-highest shrink-0">
                    <span className="material-symbols-outlined text-lg">person</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">{profile.name}</span>
                    <span className="text-[10px] text-on-surface-variant truncate">{profile.businessName}</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-full bg-surface-container hover:bg-error/15 text-on-surface-variant hover:text-error border border-outline-variant/30 flex items-center justify-center transition-all cursor-pointer shrink-0"
                  title="Sair da Conta"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                </button>
              </div>
            </aside>

            {/* Core page layout on the right of the sidebar */}
            <div className="flex-1 flex flex-col justify-between pb-24 lg:pb-8 min-w-0">
              {/* Desktop Header */}
              <header className="hidden lg:flex items-center justify-between py-6 border-b border-white/5 mb-8 shrink-0 select-none">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest leading-none mb-1">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <h2 className="text-xl font-bold text-on-surface tracking-tight leading-none uppercase">
                    {activeTab === 'dashboard' && 'Dashboard Financeiro'}
                    {activeTab === 'historico' && 'Histórico de Lançamentos'}
                    {activeTab === 'retirar' && 'Retirar e Retornos'}
                    {activeTab === 'resumo' && 'Resumo Financeiro'}
                    {activeTab === 'planos' && 'Upgrade de Plano'}
                  </h2>
                </div>

                <div className="flex items-center gap-4">
                  {/* Plano atual pill */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-on-surface-variant font-medium tracking-wider uppercase">
                      Plano Atual
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-extrabold border ${
                      (profile.plan || 'essential') === 'pro'
                        ? 'bg-primary/20 text-primary border-primary/30'
                        : 'bg-white/10 text-on-surface-variant border-white/10'
                    }`}>
                      {profile.plan || 'essential'}
                    </span>
                  </div>

                  {/* Botão Upgrade if not pro */}
                  {(profile.plan || 'essential') !== 'pro' && (
                    <button
                      onClick={() => setActiveTab('planos')}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-[#c0aeff] text-on-primary text-xs font-black transition-all duration-200 shadow-[0_4px_12px_rgba(160,120,255,0.15)] hover:shadow-[0_6px_20px_rgba(160,120,255,0.3)] hover:-translate-y-0.5 cursor-pointer"
                    >
                      Fazer Upgrade
                    </button>
                  )}

                  {/* Perfil avatar */}
                  <div 
                    onClick={() => {
                      if (profile) {
                        setEditName(profile.name);
                        setEditBusinessName(profile.businessName);
                      }
                      setShowEditProfileModal(true);
                    }}
                    className="flex items-center gap-2.5 pl-3 border-l border-white/5 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-on-surface group-hover:bg-surface-container-highest transition-colors">
                      <span className="material-symbols-outlined text-base">person</span>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{profile.name}</span>
                      <span className="text-[9px] text-on-surface-variant">{profile.businessName}</span>
                    </div>
                  </div>
                </div>
              </header>

              {/* Top Navigation Bar */}
              <header className="py-4 flex items-center justify-between sticky top-0 bg-transparent z-30 mb-4 lg:hidden">
              
              {/* Profile/Settings button */}
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center transition-all cursor-pointer relative"
                  title="Configurações do Espaço"
                >
                  <span className="material-symbols-outlined text-on-surface text-xl">person</span>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 mt-2 w-56 rounded-2xl bg-surface-container border border-outline-variant shadow-2xl p-3 z-50 flex flex-col gap-1.5"
                    >
                      <div className="px-3 py-2 border-b border-white/5">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Espaço Configurado</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-extrabold border ${
                            (profile.plan || 'essential') === 'pro'
                              ? 'bg-primary/20 text-primary border-primary/30'
                              : 'bg-white/5 text-on-surface-variant border-white/10'
                          }`}>
                            {profile.plan || 'essential'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-on-surface mt-0.5 truncate">{profile.name}</h4>
                        <p className="text-[10px] text-on-surface-variant truncate">{profile.businessName}</p>
                      </div>

                      {/* Alterar Perfil Option */}
                      <button
                        onClick={() => {
                          if (profile) {
                            setEditName(profile.name);
                            setEditBusinessName(profile.businessName);
                          }
                          setShowEditProfileModal(true);
                          setShowProfileMenu(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-primary hover:bg-primary/10 transition-colors w-full cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">manage_accounts</span>
                        Alterar Perfil
                      </button>

                      {/* Gerenciar Planos Option */}
                      <button
                        onClick={() => {
                          setActiveTab('planos');
                          setShowProfileMenu(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-primary hover:bg-primary/10 transition-colors w-full cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">workspace_premium</span>
                        Gerenciar Planos
                      </button>

                      {/* Logout option */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-error hover:bg-error/10 transition-colors w-full cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">logout</span>
                        Sair da Conta
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Title brand logo with bright purple glass bubble */}
              <div className="px-3 py-1.5 rounded-full bg-primary/10 backdrop-blur-md border border-primary/30 shadow-[0_0_15px_rgba(208,188,255,0.25)] flex items-center gap-2 max-w-[210px] text-center">
                <span className="material-symbols-outlined text-primary text-base flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_balance_wallet
                </span>
                <h1 className="text-[10px] xs:text-xs font-extrabold text-primary tracking-wider uppercase select-none truncate font-sans">
                  Meu Caixa Organizado
                </h1>
              </div>

              {/* Notification icon */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotification(true)}
                  className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-on-surface text-xl">notifications</span>
                  {/* Indicator Dot */}
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary ring-2 ring-[#131315]"></span>
                </button>

                {/* Instant interactive feedback overlay */}
                <AnimatePresence>
                  {showNotification && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-container border border-outline-variant shadow-2xl p-4 z-50 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                          Notificações
                        </span>
                        <button 
                          onClick={() => setShowNotification(false)}
                          className="text-on-surface-variant hover:text-on-surface"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed font-semibold">
                        Tudo pronto! Seu fluxo de caixa foi sincronizado e salvo na nuvem com sucesso.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </header>

            {/* Dynamic Content Views */}
            <main className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  {activeTab === 'dashboard' && (
                    <Dashboard 
                      profile={profile}
                      transactions={transactions}
                      onAddTransaction={handleAddTransaction}
                      onNavigateToTab={setActiveTab}
                    />
                  )}

                  {activeTab === 'historico' && (
                    <History 
                      profile={profile}
                      transactions={transactions}
                      onAddTransaction={handleAddTransaction}
                      onEditTransaction={handleEditTransaction}
                      onDeleteTransaction={handleDeleteTransaction}
                    />
                  )}

                  {activeTab === 'retirar' && (
                    <Withdraw 
                      transactions={transactions}
                      onAddTransaction={handleAddTransaction}
                      onNavigateToTab={setActiveTab}
                    />
                  )}

                  {activeTab === 'resumo' && (
                    <Summary 
                      transactions={transactions}
                      profile={profile}
                      onNavigateToPlanos={() => setActiveTab('planos')}
                    />
                  )}

                  {activeTab === 'planos' && (
                    <Plans 
                      profile={profile}
                      onUpdatePlan={handleUpdatePlan}
                      onNavigateToTab={setActiveTab}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 py-3 bg-[#1c1b1d]/95 backdrop-blur-md border-t border-white/5 z-40 shadow-xl lg:hidden">
              <div className="max-w-lg mx-auto px-6 flex items-center justify-between">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowProfileMenu(false);
                        setShowNotification(false);
                      }}
                      className="flex flex-col items-center gap-1 cursor-pointer transition-all relative"
                    >
                      {/* Active state styling with rounded container overlay */}
                      <div className={`px-5 py-1.5 rounded-full flex items-center justify-center transition-all ${
                        isActive 
                          ? 'bg-primary/20 text-primary' 
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}>
                        <span className="material-symbols-outlined text-xl">
                          {item.icon}
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold tracking-wide uppercase transition-colors ${
                        isActive ? 'text-primary' : 'text-on-surface-variant'
                      }`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
          </>
        )}
      </div>

      {/* Alterar Perfil Modal */}
      <AnimatePresence>
        {showEditProfileModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            
            {/* Backdrop click closer */}
            <div className="absolute inset-0 cursor-default" onClick={() => setShowEditProfileModal(false)} />

            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full sm:max-w-md bg-[#131315] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col gap-6 max-h-[92vh] overflow-y-auto z-10"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-xl pointer-events-none"></div>

              <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-on-surface">
                      Alterar Perfil
                    </h3>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                      Atualize seus dados de cadastro e empresa
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowEditProfileModal(false)}
                    className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors cursor-pointer select-none"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">close</span>
                  </button>
                </div>

                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
                  
                  {/* Seu Nome */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-on-surface-variant/90">Seu Nome</label>
                    <input
                      type="text"
                      required
                      placeholder="Seu nome completo"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/30 font-semibold"
                    />
                  </div>

                  {/* Nome do Negócio */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-on-surface-variant/90">Nome do seu Negócio</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Minha Confeitaria, Salão..."
                      value={editBusinessName}
                      onChange={(e) => setEditBusinessName(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/30 font-semibold"
                    />
                  </div>

                  {/* Submit action */}
                  <button
                    type="submit"
                    className="w-full bg-[#6d3bd7] hover:bg-[#8455ef] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_14px_rgba(109,59,215,0.25)] cursor-pointer border border-primary/30 mt-3 select-none"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">done</span>
                    <span className="text-sm">Salvar Alterações</span>
                  </button>

                </form>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Migration Confirmation Modal */}
      <AnimatePresence>
        {showMigrationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-[28px] p-6 shadow-2xl border border-primary/20 w-full max-w-sm flex flex-col gap-6 relative bg-gradient-to-b from-[#1a141b]/95 to-[#120e11]/98"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full filter blur-xl pointer-events-none"></div>

              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(109,59,215,0.15)] animate-pulse">
                  <span className="material-symbols-outlined text-2xl font-bold">cloud_upload</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-bold text-on-surface">Importar Seus Dados?</h3>
                  <p className="text-xs text-on-surface-variant/80 max-w-[260px] leading-relaxed font-semibold">
                    Identificamos lançamentos salvos no seu navegador. Gostaria de importá-los para sua nova conta em nuvem?
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handlePerformMigration(true)}
                  className="w-full py-3.5 bg-primary hover:bg-[#8455ef] text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(109,59,215,0.2)] cursor-pointer select-none flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm font-bold">cloud_upload</span>
                  Sim, importar dados antigos
                </button>
                <button
                  type="button"
                  onClick={() => handlePerformMigration(false)}
                  className="w-full py-3.5 bg-surface-container hover:bg-surface-container-highest rounded-xl text-xs font-bold text-on-surface border border-outline-variant/20 transition-all cursor-pointer select-none"
                >
                  Não, começar do zero na nuvem
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
