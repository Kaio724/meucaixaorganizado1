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

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('historico'); // default to 'historico' like the screenshot
  const [showNotification, setShowNotification] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBusinessName, setEditBusinessName] = useState('');

  // Load configuration from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('mco_profile');
    const savedTransactions = localStorage.getItem('mco_transactions');

    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error('Error parsing profile', e);
      }
    }

    if (savedTransactions) {
      try {
        setTransactions(JSON.parse(savedTransactions));
      } catch (e) {
        console.error('Error parsing transactions', e);
        setTransactions(INITIAL_TRANSACTIONS);
      }
    } else {
      setTransactions(INITIAL_TRANSACTIONS);
    }
  }, []);

  // Complete onboarding
  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('mco_profile', JSON.stringify(newProfile));
    // If first time, also save the default transactions
    if (!localStorage.getItem('mco_transactions')) {
      localStorage.setItem('mco_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
    }
    setActiveTab('dashboard');
  };

  // Create Transaction (Add)
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const txWithId: Transaction = {
      ...newTx,
      id: Math.random().toString(36).substring(2, 9),
    };
    const updated = [txWithId, ...transactions];
    setTransactions(updated);
    localStorage.setItem('mco_transactions', JSON.stringify(updated));
  };

  // Update Transaction (Edit)
  const handleEditTransaction = (updatedTx: Transaction) => {
    const updated = transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t));
    setTransactions(updated);
    localStorage.setItem('mco_transactions', JSON.stringify(updated));
  };

  // Delete Transaction (Delete)
  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    localStorage.setItem('mco_transactions', JSON.stringify(updated));
  };

  // Update profile handler
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const updated = {
      ...profile,
      name: editName.trim(),
      businessName: editBusinessName.trim()
    };
    setProfile(updated);
    localStorage.setItem('mco_profile', JSON.stringify(updated));
    setShowEditProfileModal(false);
  };

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

      {/* Main Container */}
      <div className="w-full max-w-lg mx-auto px-4 z-10 relative flex-1 flex flex-col justify-between">
        
        {/* Onboarding Screen if profile is missing */}
        {!profile || !profile.isOnboarded ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <Onboarding onComplete={handleOnboardingComplete} />
          </div>
        ) : (
          /* Logged In Core Layout */
          <div className="flex-1 flex flex-col justify-between">
            
            {/* Top Navigation Bar matching screenshots */}
            <header className="py-4 flex items-center justify-between sticky top-0 bg-transparent z-30 mb-4">
              
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
                        <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Espaço Configurado</span>
                        <h4 className="text-xs font-bold text-on-surface mt-0.5 truncate">{profile.name}</h4>
                        <p className="text-[10px] text-on-surface-variant truncate">{profile.businessName}</p>
                      </div>

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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Title brand logo with bright purple glass bubble - updated to Meu Caixa Organizado */}
              <div className="px-4 py-1.5 rounded-full bg-primary/10 backdrop-blur-md border border-primary/30 shadow-[0_0_15px_rgba(208,188,255,0.25)] flex items-center justify-center max-w-[210px] text-center">
                <h1 className="text-[10px] xs:text-xs font-extrabold text-primary tracking-wider uppercase select-none truncate">
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
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        Tudo pronto! Seu fluxo de caixa local foi sincronizado e salvo no dispositivo com sucesso.
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
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Bottom Navigation matching screenshots */}
            <nav className="fixed bottom-0 left-0 right-0 py-3 bg-[#1c1b1d]/90 backdrop-blur-md border-t border-white/5 z-40">
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
    </div>
  );
}
