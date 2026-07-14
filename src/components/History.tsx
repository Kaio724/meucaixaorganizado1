import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, UserProfile, TransactionType } from '../types';
import { AVAILABLE_CATEGORIES, PAYMENT_METHODS, ACCOUNT_OPTIONS } from '../initialData';
import { getCategoryNamesByType, getCategoryInfo } from '../lib/categories';

const CHECKOUT_PRO_URL = import.meta.env.VITE_CHECKOUT_PRO_URL || 'https://pay.cakto.com.br/rdvxqwt';

interface HistoryProps {
  profile: UserProfile;
  userId?: string;
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function History({ profile, userId = 'default_user', transactions, onAddTransaction, onEditTransaction, onDeleteTransaction }: HistoryProps) {
  const isPro = (profile.plan || 'essential') === 'pro';
  const [showProModal, setShowProModal] = useState(false);
  const [filterType, setFilterType] = useState<'tudo' | 'entrada' | 'saida'>('tudo');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth()); // default to current month
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced search states
  const [searchScope, setSearchScope] = useState<'all' | 'current' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [advType, setAdvType] = useState<'tudo' | 'entrada' | 'saida' | 'retirada'>('tudo');
  const [advCategory, setAdvCategory] = useState('todas');
  const [advPaymentMethod, setAdvPaymentMethod] = useState('todas');
  const [advMinAmount, setAdvMinAmount] = useState('');
  const [advMaxAmount, setAdvMaxAmount] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Get all unique categories dynamically
  const allCategories = React.useMemo(() => {
    return Array.from(new Set([
      ...getCategoryNamesByType(userId, 'entrada'),
      ...getCategoryNamesByType(userId, 'saida'),
      ...transactions.map(t => t.category)
    ])).sort();
  }, [userId, transactions]);

  const isAnyAdvancedFilterActive = () => {
    return searchScope !== 'all' || 
           advType !== 'tudo' || 
           advCategory !== 'todas' || 
           advPaymentMethod !== 'todas' || 
           advMinAmount !== '' || 
           advMaxAmount !== '';
  };

  // Editing state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Add/Edit Form states
  const [formType, setFormType] = useState<TransactionType>('entrada');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Pix');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAccount, setFormAccount] = useState<string | undefined>(undefined);

  // Handle month switching
  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonthIndex(selectedMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonthIndex(selectedMonthIndex + 1);
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    // 1. Scope / Date Filter
    const txDateStr = tx.date; // e.g. "2026-07-13"

    if (searchScope === 'current') {
      const txDate = new Date(tx.date + 'T12:00:00');
      const txMonth = txDate.getMonth();
      const txYear = txDate.getFullYear();
      if (txMonth !== selectedMonthIndex || txYear !== selectedYear) return false;
    } else if (searchScope === 'custom') {
      if (customStartDate && txDateStr < customStartDate) return false;
      if (customEndDate && txDateStr > customEndDate) return false;
    } else {
      // Default scope 'all' (Todo histórico)
      // If search query is empty AND no advanced filters are active, default to showing selected month/year.
      const isAnyFilterActive = searchQuery.trim() !== '' || 
                                advType !== 'tudo' || 
                                advCategory !== 'todas' || 
                                advPaymentMethod !== 'todas' || 
                                advMinAmount !== '' || 
                                advMaxAmount !== '';
      if (!isAnyFilterActive) {
        const txDate = new Date(tx.date + 'T12:00:00');
        const txMonth = txDate.getMonth();
        const txYear = txDate.getFullYear();
        if (txMonth !== selectedMonthIndex || txYear !== selectedYear) return false;
      }
    }

    // 2. Type Filter (Combining top pill filters and advanced filters)
    const activeType = advType !== 'tudo' ? advType : (filterType === 'tudo' ? 'tudo' : filterType);
    if (activeType !== 'tudo') {
      if (activeType === 'retirada') {
        if (tx.type !== 'saida' || tx.category !== 'Pro-Labore') return false;
      } else if (activeType === 'saida') {
        if (tx.type !== 'saida' || tx.category === 'Pro-Labore') return false;
      } else {
        if (tx.type !== activeType) return false;
      }
    }

    // 3. Category Filter
    if (advCategory !== 'todas' && tx.category !== advCategory) return false;

    // 4. Payment Method Filter
    if (advPaymentMethod !== 'todas' && tx.paymentMethod !== advPaymentMethod) return false;

    // 5. Min Amount Filter
    if (advMinAmount !== '') {
      const minVal = parseFloat(advMinAmount);
      if (!isNaN(minVal) && tx.amount < minVal) return false;
    }

    // 6. Max Amount Filter
    if (advMaxAmount !== '') {
      const maxVal = parseFloat(advMaxAmount);
      if (!isNaN(maxVal) && tx.amount > maxVal) return false;
    }

    // 7. Search Query Filter (Matches: title, category, paymentMethod, account, value, date, type)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      const words = query.split(/\s+/);
      
      const match = words.every(word => {
        // Match Title
        if (tx.title.toLowerCase().includes(word)) return true;
        
        // Match Category
        if (tx.category.toLowerCase().includes(word)) return true;
        
        // Match Payment Method
        if (tx.paymentMethod.toLowerCase().includes(word)) return true;
        
        // Match Account
        if (tx.account && tx.account.toLowerCase().includes(word)) return true;
        
        // Match Type (converting types to pt-BR labels)
        const typePt = tx.type === 'entrada' ? 'entrada' : tx.type === 'saida' ? 'saída despesa' : 'retirada pró-labore';
        if (typePt.includes(word)) return true;
        
        // Match Date (e.g. 15/03/2026 or "março" or "2026")
        const dateObj = new Date(tx.date + 'T12:00:00');
        const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const monthName = MONTHS_PT[dateObj.getMonth()].toLowerCase();
        const yearStr = String(dateObj.getFullYear());
        if (formattedDate.includes(word) || monthName.includes(word) || yearStr.includes(word)) return true;
        
        // Match Value
        const amountStr = String(tx.amount);
        const amountFormatted = tx.amount.toFixed(2).replace('.', ',');
        if (amountStr.includes(word) || amountFormatted.includes(word)) return true;
        
        return false;
      });

      if (!match) return false;
    }

    return true;
  });

  // Group filtered transactions by date
  const groupTransactionsByDate = () => {
    const groups: { [dateStr: string]: Transaction[] } = {};
    
    // Sort transactions by date descending
    const sorted = [...filteredTransactions].sort((a, b) => {
      return b.date.localeCompare(a.date);
    });

    sorted.forEach(tx => {
      if (!groups[tx.date]) {
        groups[tx.date] = [];
      }
      groups[tx.date].push(tx);
    });

    return groups;
  };

  const grouped = groupTransactionsByDate();

  // Helper to format date header
  const formatDateHeader = (dateStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const monthName = MONTHS_PT[dateObj.getMonth()];

    if (dateStr === todayStr) {
      return `Hoje, ${day} de ${monthName}`;
    } else if (dateStr === yesterdayStr) {
      return `Ontem, ${day} de ${monthName}`;
    } else {
      // Ex: Quarta, 12 de Junho
      const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const weekday = weekdays[dateObj.getDay()];
      return `${weekday}, ${day} de ${monthName}`;
    }
  };

  // Open Edit Form
  const startEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setFormTitle(tx.title);
    setFormAmount(String(tx.amount));
    setFormCategory(tx.category);
    setFormPaymentMethod(tx.paymentMethod);
    setFormDate(tx.date);
    setFormAccount(tx.account);
  };

  // Open Add Form
  const startAdd = () => {
    setEditingTx(null);
    setFormType('entrada');
    setFormTitle('');
    setFormAmount('');
    setFormCategory(getCategoryNamesByType(userId, 'entrada')[0] || 'Outros');
    setFormPaymentMethod('Pix');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAccount(undefined);
    setShowAddModal(true);
  };

  // Handle Form Submit (Both Add and Edit)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount) return;

    const txData = {
      title: formTitle.trim(),
      amount: Math.abs(parseFloat(formAmount)),
      type: formType,
      date: formDate,
      category: formCategory,
      paymentMethod: formPaymentMethod,
      account: formAccount
    };

    if (editingTx) {
      onEditTransaction({
        ...editingTx,
        ...txData
      });
      setEditingTx(null);
    } else {
      onAddTransaction(txData);
      setShowAddModal(false);
    }

    // Reset Form
    setFormTitle('');
    setFormAmount('');
  };

  // Set category dropdown when type shifts
  React.useEffect(() => {
    if (!editingTx) {
      const cats = getCategoryNamesByType(userId, formType);
      setFormCategory(cats[0] || 'Outros');
    }
  }, [formType, editingTx, userId]);

  // Format currency
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Category specific icon mapping for a personalized touch
  const getCategoryIcon = (category: string, type: TransactionType) => {
    return getCategoryInfo(category, type, userId).icon;
  };

      const isCurrentMonth = selectedMonthIndex === new Date().getMonth() && selectedYear === new Date().getFullYear();

      const sortedFilteredTransactions = [...filteredTransactions].sort((a, b) => b.date.localeCompare(a.date));

      return (
        <div className="flex flex-col gap-6 w-full max-w-lg md:max-w-4xl lg:max-w-full pb-24 lg:pb-0 text-left">
          {/* Month Selector Header */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-on-surface tracking-tight">Histórico</h2>
            
            {/* Month Picker controls */}
            <div className="flex items-center bg-surface-container-high rounded-full p-1 border border-outline-variant/20">
              <button 
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-sm font-bold">chevron_left</span>
              </button>
              <span className="text-xs font-bold text-on-surface px-3 min-w-[90px] text-center select-none">
                {MONTHS_PT[selectedMonthIndex]}
              </span>
              <button 
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-sm font-bold">chevron_right</span>
              </button>
            </div>
          </div>
    
          {/* Filter and Search Section */}
          <div className="flex flex-col gap-3">
            {/* Search Input and Filters Button Row */}
            <div className="flex gap-2 w-full">
              <div className="relative flex-1 flex items-center bg-surface-container-low rounded-xl border border-outline-variant/30 px-3 py-2.5">
                <span className="material-symbols-outlined text-on-surface-variant text-lg mr-2">search</span>
                <input 
                  type="text"
                  placeholder="Buscar por descrição, tipo, valor, data..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs text-on-surface focus:outline-none w-full placeholder:text-on-surface-variant/40"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-on-surface-variant hover:text-on-surface text-xs mr-2 cursor-pointer">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showFilterPanel || isAnyAdvancedFilterActive()
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">tune</span>
                <span>Filtros</span>
                {isAnyAdvancedFilterActive() && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Advanced Filters Drawer/Panel */}
            <AnimatePresence>
              {showFilterPanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden bg-surface-container border border-outline-variant/20 rounded-2xl p-4 flex flex-col gap-4 shadow-xl z-20"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Column 1: Scope */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Pesquisar em</label>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                          <input 
                            type="radio" 
                            name="searchScope" 
                            checked={searchScope === 'all'} 
                            onChange={() => setSearchScope('all')}
                            className="accent-primary"
                          />
                          Todo histórico (padrão)
                        </label>
                        <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                          <input 
                            type="radio" 
                            name="searchScope" 
                            checked={searchScope === 'current'} 
                            onChange={() => setSearchScope('current')}
                            className="accent-primary"
                          />
                          Apenas mês atual
                        </label>
                        <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                          <input 
                            type="radio" 
                            name="searchScope" 
                            checked={searchScope === 'custom'} 
                            onChange={() => setSearchScope('custom')}
                            className="accent-primary"
                          />
                          Período personalizado
                        </label>
                      </div>

                      {searchScope === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 mt-1.5">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-on-surface-variant font-semibold">Início</span>
                            <input 
                              type="date" 
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-on-surface-variant font-semibold">Fim</span>
                            <input 
                              type="date" 
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Types & Categories */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Filtros adicionais</label>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-on-surface-variant font-semibold">Tipo</span>
                          <select
                            value={advType}
                            onChange={(e) => setAdvType(e.target.value as any)}
                            className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="tudo" className="bg-[#121217] text-white">Todos os tipos</option>
                            <option value="entrada" className="bg-[#121217] text-white">Entrada</option>
                            <option value="saida" className="bg-[#121217] text-white">Saída</option>
                            <option value="retirada" className="bg-[#121217] text-white">Retirada</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-on-surface-variant font-semibold">Categoria</span>
                          <select
                            value={advCategory}
                            onChange={(e) => setAdvCategory(e.target.value)}
                            className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="todas" className="bg-[#121217] text-white">Todas as categorias</option>
                            {allCategories.map(cat => (
                              <option key={cat} value={cat} className="bg-[#121217] text-white">{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Payment & Amount */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Forma & Valores</label>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-on-surface-variant font-semibold">Forma de pagamento</span>
                          <select
                            value={advPaymentMethod}
                            onChange={(e) => setAdvPaymentMethod(e.target.value)}
                            className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="todas" className="bg-[#121217] text-white">Todas as formas</option>
                            {PAYMENT_METHODS.map(method => (
                              <option key={method} value={method} className="bg-[#121217] text-white">{method}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-on-surface-variant font-semibold">Min (R$)</span>
                            <input 
                              type="number" 
                              placeholder="0"
                              value={advMinAmount}
                              onChange={(e) => setAdvMinAmount(e.target.value)}
                              className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-on-surface-variant font-semibold">Max (R$)</span>
                            <input 
                              type="number" 
                              placeholder="Indefinido"
                              value={advMaxAmount}
                              onChange={(e) => setAdvMaxAmount(e.target.value)}
                              className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-outline-variant/10 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchScope('all');
                        setCustomStartDate('');
                        setCustomEndDate('');
                        setAdvType('tudo');
                        setAdvCategory('todas');
                        setAdvPaymentMethod('todas');
                        setAdvMinAmount('');
                        setAdvMaxAmount('');
                      }}
                      className="px-3.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded-xl font-bold text-xs transition-all cursor-pointer border border-outline-variant/10"
                    >
                      Limpar Filtros
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFilterPanel(false)}
                      className="px-4 py-1.5 bg-primary hover:bg-[#c0aeff] text-on-primary rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md"
                    >
                      Aplicar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
    
            {/* Filters pills row */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => { setFilterType('tudo'); setAdvType('tudo'); }}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                  filterType === 'tudo' && advType === 'tudo'
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/10'
                }`}
              >
                Tudo
              </button>
              <button
                onClick={() => { setFilterType('entrada'); setAdvType('entrada'); }}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                  filterType === 'entrada' || advType === 'entrada'
                    ? 'bg-tertiary/20 text-tertiary border border-tertiary/40 shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/10'
                }`}
              >
                Entradas
              </button>
              <button
                onClick={() => { setFilterType('saida'); setAdvType('saida'); }}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                  filterType === 'saida' || advType === 'saida'
                    ? 'bg-error/20 text-error border border-error/40 shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/10'
                }`}
              >
                Saídas
              </button>
    
              {/* Quick Add Floating Button trigger */}
              <button
                onClick={startAdd}
                className="ml-auto w-8 h-8 rounded-full bg-primary hover:bg-[#c0aeff] text-on-primary flex items-center justify-center transition-all duration-200 shadow-md"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span>
              </button>
            </div>
          </div>
    
          {/* Main Groups Container (Mobile Card List) */}
          <div className="flex flex-col gap-6 relative min-h-[300px] lg:hidden">
            {Object.keys(grouped).length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface-container-low border border-outline-variant/10 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl">inventory_2</span>
            <div>
              <p className="text-sm font-bold text-on-surface">Sem registros para este período</p>
              <p className="text-xs text-on-surface-variant mt-1">Altere o filtro ou adicione um novo lançamento para começar.</p>
            </div>
            <button
              onClick={startAdd}
              className="mt-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-bold text-xs px-4 py-2 rounded-xl transition-colors"
            >
              Adicionar Lançamento
            </button>
          </div>
        ) : (
          Object.keys(grouped).map(dateStr => (
            <div key={dateStr} className="flex flex-col gap-3">
              {/* Date Header */}
              <h3 className="text-xs font-bold text-on-surface-variant/80 tracking-wide px-1">
                {formatDateHeader(dateStr)}
              </h3>

              {/* Transactions on this Date */}
              <div className="flex flex-col gap-2">
                {grouped[dateStr].map(tx => {
                  const isEditingThis = editingTx?.id === tx.id;
                  
                  return (
                    <div 
                      key={tx.id} 
                      className={`rounded-2xl transition-all duration-300 relative overflow-hidden ${
                        isEditingThis 
                          ? 'bg-surface-container-high border-2 border-primary/40 p-4 sm:p-5' 
                          : 'bg-surface-container border border-outline-variant/15 p-3 sm:p-4 hover:bg-surface-container-high'
                      }`}
                    >
                      {/* Normal Row view */}
                      {!isEditingThis ? (
                        <div className="flex items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${getCategoryInfo(tx.category, tx.type, userId).bgColor} ${getCategoryInfo(tx.category, tx.type, userId).color}`}>
                              <span className="material-symbols-outlined text-lg sm:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {getCategoryIcon(tx.category, tx.type)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-on-surface leading-tight truncate">{tx.title}</h4>
                              <p className="text-[11px] text-on-surface-variant/80 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                {tx.paymentMethod} • 
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] ${getCategoryInfo(tx.category, tx.type, userId).color}`}>
                                  <span className="material-symbols-outlined text-[10px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {getCategoryIcon(tx.category, tx.type)}
                                  </span>
                                  <span>{tx.category}</span>
                                </span>
                                {tx.account && ` (${tx.account})`}
                              </p>
                            </div>
                          </div>

                          {/* Values and Action triggers */}
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className={`text-sm font-extrabold tracking-tight ${
                                tx.type === 'entrada' ? 'text-tertiary' : 'text-on-surface'
                              }`}>
                                {tx.type === 'entrada' ? '+' : '-'} {formatBRL(tx.amount)}
                              </span>
                            </div>
                            
                            {/* Actions overlay / Inline triggers */}
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => startEdit(tx)}
                                className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:text-primary transition-all duration-200"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>
                              <button 
                                onClick={() => setDeletingTxId(tx.id)}
                                className="w-8 h-8 rounded-full bg-error/10 hover:bg-error/20 flex items-center justify-center text-error transition-all duration-200 cursor-pointer"
                                title="Excluir"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Inline Edit Form view */
                        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-xs">edit</span>
                              Editando Lançamento
                            </span>
                            <button 
                              type="button" 
                              onClick={() => setEditingTx(null)}
                              className="text-xs font-bold text-on-surface-variant hover:text-on-surface"
                            >
                              Cancelar
                            </button>
                          </div>

                          {/* Quick inputs */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-on-surface-variant">Especificação do Item/Serviço</label>
                              <input 
                                type="text"
                                required
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-on-surface-variant">Valor (R$)</label>
                              <input 
                                type="number"
                                step="0.01"
                                required
                                value={formAmount}
                                onChange={(e) => setFormAmount(e.target.value)}
                                className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-on-surface-variant">Categoria</label>
                              <select 
                                value={formCategory}
                                onChange={(e) => setFormCategory(e.target.value)}
                                className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface"
                              >
                                {getCategoryNamesByType(userId, formType).map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-on-surface-variant">Método</label>
                              <select 
                                value={formPaymentMethod}
                                onChange={(e) => setFormPaymentMethod(e.target.value)}
                                className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface"
                              >
                                {PAYMENT_METHODS.map(method => (
                                  <option key={method} value={method}>{method}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-on-surface-variant">
                                {formType === 'entrada' ? 'Conta Destino' : 'Conta Origem'}
                              </label>
                              <select 
                                value={formAccount || ''}
                                onChange={(e) => setFormAccount(e.target.value || undefined)}
                                className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface w-full"
                              >
                                <option value="">Não especificada</option>
                                {ACCOUNT_OPTIONS.map(acc => (
                                  <option key={acc} value={acc}>{acc}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-on-surface-variant">Data</label>
                            <input 
                              type="date"
                              required
                              value={formDate}
                              onChange={(e) => setFormDate(e.target.value)}
                              className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface"
                            />
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingTx(null)}
                              className="px-3 py-2 bg-surface-container rounded-lg text-[11px] font-bold text-on-surface hover:bg-surface-container-low border border-outline-variant/20"
                            >
                              Voltar
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-primary text-on-primary rounded-lg text-[11px] font-bold hover:bg-[#c0aeff] flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">done</span>
                              Salvar Alterações
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block min-h-[300px]">
        {sortedFilteredTransactions.length === 0 ? (
          <div className="p-16 rounded-3xl bg-surface-container-low border border-outline-variant/10 text-center flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-on-surface-variant/30 text-6xl">inventory_2</span>
            <div>
              <p className="text-base font-bold text-on-surface">Sem registros para este período</p>
              <p className="text-xs text-on-surface-variant mt-1.5">Altere o filtro ou adicione um novo lançamento para começar.</p>
            </div>
            <button
              onClick={startAdd}
              className="mt-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
            >
              Adicionar Lançamento
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline-variant/20 select-none">
                  <th className="p-4 font-bold text-on-surface-variant/80 uppercase tracking-wider">Tipo</th>
                  <th className="p-4 font-bold text-on-surface-variant/80 uppercase tracking-wider">Data</th>
                  <th className="p-4 font-bold text-on-surface-variant/80 uppercase tracking-wider">Especificação</th>
                  <th className="p-4 font-bold text-on-surface-variant/80 uppercase tracking-wider">Categoria</th>
                  <th className="p-4 font-bold text-on-surface-variant/80 uppercase tracking-wider">Pagamento</th>
                  <th className="p-4 font-bold text-on-surface-variant/80 uppercase tracking-wider text-right">Valor</th>
                  <th className="p-4 font-bold text-on-surface-variant/80 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {sortedFilteredTransactions.map(tx => {
                  const isEditingThis = editingTx?.id === tx.id;
                  const dateObj = new Date(tx.date + 'T12:00:00');
                  const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                  if (isEditingThis) {
                    return (
                      <tr key={tx.id} className="bg-surface-container-high border-2 border-primary/30">
                        <td colSpan={7} className="p-5">
                          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-xs">edit</span>
                                Editando Lançamento
                              </span>
                              <button 
                                type="button" 
                                onClick={() => setEditingTx(null)}
                                className="text-xs font-bold text-on-surface-variant hover:text-on-surface"
                              >
                                Cancelar
                              </button>
                            </div>

                             <div className="grid grid-cols-5 gap-4">
                              <div className="flex flex-col gap-1 col-span-2">
                                <label className="text-[10px] font-bold text-on-surface-variant">Especificação</label>
                                <input 
                                  type="text"
                                  required
                                  value={formTitle}
                                  onChange={(e) => setFormTitle(e.target.value)}
                                  className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-on-surface-variant">Valor (R$)</label>
                                <input 
                                  type="number"
                                  step="0.01"
                                  required
                                  value={formAmount}
                                  onChange={(e) => setFormAmount(e.target.value)}
                                  className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-on-surface-variant">Categoria</label>
                                <select 
                                  value={formCategory}
                                  onChange={(e) => setFormCategory(e.target.value)}
                                  className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface w-full"
                                >
                                  {getCategoryNamesByType(userId, formType).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-on-surface-variant">Pagamento</label>
                                <select 
                                  value={formPaymentMethod}
                                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                                  className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface w-full"
                                >
                                  {PAYMENT_METHODS.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-on-surface-variant">Data</label>
                                <input 
                                  type="date"
                                  required
                                  value={formDate}
                                  onChange={(e) => setFormDate(e.target.value)}
                                  className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-on-surface-variant">
                                  {formType === 'entrada' ? 'Conta de Destino' : 'Conta de Origem'}
                                </label>
                                <select 
                                  value={formAccount || ''}
                                  onChange={(e) => setFormAccount(e.target.value || undefined)}
                                  className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary text-on-surface w-full"
                                >
                                  <option value="">Não especificada</option>
                                  {ACCOUNT_OPTIONS.map(acc => (
                                    <option key={acc} value={acc}>{acc}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingTx(null)}
                                className="px-4 py-2 bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded-xl font-bold transition-all border border-outline-variant/10 text-xs"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-2 bg-primary hover:bg-[#c0aeff] text-on-primary rounded-xl font-bold transition-all shadow-md text-xs"
                              >
                                Salvar Lançamento
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={tx.id} className="hover:bg-surface-container-high transition-colors">
                      <td className="p-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getCategoryInfo(tx.category, tx.type, userId).bgColor} ${getCategoryInfo(tx.category, tx.type, userId).color}`}>
                          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {getCategoryIcon(tx.category, tx.type)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-on-surface-variant/90">{formattedDate}</td>
                      <td className="p-4 font-bold text-on-surface">{tx.title}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-full ${getCategoryInfo(tx.category, tx.type, userId).color}`}>
                          <span className="material-symbols-outlined text-sm leading-none shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {getCategoryIcon(tx.category, tx.type)}
                          </span>
                          <span>{tx.category}</span>
                        </span>
                      </td>
                      <td className="p-4 text-on-surface-variant/80 font-medium">
                        <div>{tx.paymentMethod}</div>
                        {tx.account && (
                          <div className="text-[10px] text-on-surface-variant/50 flex items-center gap-0.5 mt-0.5">
                            <span className="material-symbols-outlined text-[10px]">account_balance_wallet</span>
                            {tx.account}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-extrabold tracking-tight ${
                          tx.type === 'entrada' ? 'text-tertiary' : 'text-on-surface'
                        }`}>
                          {tx.type === 'entrada' ? '+' : '-'} {formatBRL(tx.amount)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => startEdit(tx)}
                            className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:text-primary transition-all duration-200"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button 
                            onClick={() => setDeletingTxId(tx.id)}
                            className="w-8 h-8 rounded-full bg-error/10 hover:bg-error/20 flex items-center justify-center text-error transition-all duration-200 cursor-pointer"
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Dialog / Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="glass-card rounded-[28px] p-6 sm:p-8 border border-white/[0.08] w-full max-w-lg flex flex-col gap-6 relative bg-gradient-to-b from-[#181822]/98 to-[#0f0f14]/98 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.8)]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex flex-col gap-1 text-left">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_box</span>
                    Registrar Lançamento
                  </h3>
                  <p className="text-[11px] sm:text-xs text-on-surface-variant/70 font-medium">
                    Adicione uma receita ou despesa ao histórico de movimentações
                  </p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="w-9 h-9 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition-all cursor-pointer text-on-surface-variant hover:text-white"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex flex-col gap-5 text-left">
                {/* Type Selection */}
                <div className="grid grid-cols-2 p-1 bg-[#0d0d12] rounded-2xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setFormType('entrada')}
                    className={`py-3 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                      formType === 'entrada' 
                        ? 'bg-tertiary text-on-primary shadow-[0_2px_8px_rgba(16,185,129,0.2)] border border-white/10' 
                        : 'text-on-surface-variant/80 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                    Receita (Entrada)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('saida')}
                    className={`py-3 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                      formType === 'saida' 
                        ? 'bg-error text-on-primary shadow-[0_2px_8px_rgba(239,68,68,0.2)] border border-white/10' 
                        : 'text-on-surface-variant/80 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>trending_down</span>
                    Despesa (Saiu)
                  </button>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest leading-none">Especificação do Item ou Serviço</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Venda de Bolo, Compra de Insumos..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#171721] border border-white/[0.08] hover:border-white/[0.15] focus:border-primary focus:bg-[#1b1b26] rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none text-white placeholder:text-white/[0.15] transition-all"
                  />
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest leading-none">Valor (R$)</label>
                  <div className="relative flex items-center bg-[#171721] border border-white/[0.08] hover:border-white/[0.15] focus-within:border-primary/60 rounded-xl px-4 py-3 focus-within:bg-[#1b1b26] focus-within:shadow-[0_0_20px_rgba(109,59,215,0.15)] transition-all">
                    <span className="text-sm font-extrabold text-on-surface-variant/50 mr-2 select-none">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full bg-transparent border-none text-white font-extrabold text-sm focus:outline-none placeholder:text-white/[0.15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* Category & Payment Method row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest leading-none">Categoria</label>
                    <div className="relative">
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full bg-[#171721] border border-white/[0.08] hover:border-white/[0.15] focus:border-primary focus:bg-[#1b1b26] rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none text-white cursor-pointer appearance-none pr-8 transition-all"
                      >
                        {getCategoryNamesByType(userId, formType).map((cat) => (
                          <option key={cat} value={cat} className="bg-[#121217] text-white">
                            {cat}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 pointer-events-none text-base">
                        keyboard_arrow_down
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest leading-none">Forma de Pagamento</label>
                    <div className="relative">
                      <select
                        value={formPaymentMethod}
                        onChange={(e) => setFormPaymentMethod(e.target.value)}
                        className="w-full bg-[#171721] border border-white/[0.08] hover:border-white/[0.15] focus:border-primary focus:bg-[#1b1b26] rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none text-white cursor-pointer appearance-none pr-8 transition-all"
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method} className="bg-[#121217] text-white">
                            {method}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 pointer-events-none text-base">
                        keyboard_arrow_down
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conta de Origem/Destino */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest leading-none">
                    {formType === 'entrada' ? 'Conta de Destino (Opcional)' : 'Conta de Origem (Opcional)'}
                  </label>
                  <div className="relative">
                    <select
                      value={formAccount || ''}
                      onChange={(e) => setFormAccount(e.target.value || undefined)}
                      className="w-full bg-[#171721] border border-white/[0.08] hover:border-white/[0.15] focus:border-primary focus:bg-[#1b1b26] rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none text-white cursor-pointer appearance-none pr-8 transition-all"
                    >
                      <option value="" className="bg-[#121217] text-on-surface-variant/50">Não especificada</option>
                      {ACCOUNT_OPTIONS.map((acc) => (
                        <option key={acc} value={acc} className="bg-[#121217] text-white">
                          {acc}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 pointer-events-none text-base">
                      keyboard_arrow_down
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest leading-none">Data</label>
                  <div className="relative flex items-center bg-[#171721] border border-white/[0.08] hover:border-white/[0.15] focus-within:border-primary focus-within:bg-[#1b1b26] rounded-xl px-4 py-3 transition-all">
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-transparent border-none text-xs sm:text-sm text-white focus:outline-none cursor-pointer scheme-dark"
                    />
                    <span className="material-symbols-outlined absolute right-4 text-on-surface-variant/70 pointer-events-none text-base">calendar_today</span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/[0.06] mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-xs sm:text-sm font-extrabold text-white transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                      formType === 'entrada' 
                        ? 'bg-tertiary hover:bg-[#3bc691] text-on-primary border border-tertiary/25 shadow-[0_4px_12px_rgba(16,185,129,0.2)]' 
                        : 'bg-error hover:bg-[#ffa095] text-on-primary border border-error/25 shadow-[0_4px_12px_rgba(239,68,68,0.2)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm font-bold">done</span>
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingTxId && (() => {
          const tx = transactions.find(t => t.id === deletingTxId);
          if (!tx) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-[28px] p-6 shadow-2xl border border-error/20 w-full max-w-sm flex flex-col gap-6 relative bg-gradient-to-b from-[#1a1315]/90 to-[#120d0e]/95"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-error/5 rounded-full filter blur-xl pointer-events-none"></div>

                <div className="flex flex-col items-center text-center gap-4">
                  {/* Warning Icon */}
                  <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 flex items-center justify-center text-error shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse">
                    <span className="material-symbols-outlined text-2xl font-bold">
                      warning
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold text-on-surface">
                      Excluir Lançamento?
                    </h3>
                    <p className="text-xs text-on-surface-variant/80 max-w-[240px] leading-relaxed">
                      Esta ação não pode ser desfeita. O seguinte registro será apagado permanentemente:
                    </p>
                  </div>

                  {/* Transaction info capsule */}
                  <div className="w-full bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col gap-1.5 items-center">
                    <span className="text-xs font-bold text-on-surface-variant">
                      {tx.title}
                    </span>
                    <span className={`text-lg font-extrabold ${tx.type === 'entrada' ? 'text-tertiary' : 'text-error'}`}>
                      {tx.type === 'entrada' ? '+' : '-'} {formatBRL(tx.amount)}
                    </span>
                    <span className="text-[10px] text-on-surface-variant/50">
                      {tx.date.split('-').reverse().join('/')} • {tx.category}
                    </span>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingTxId(null)}
                    className="flex-1 py-3.5 bg-surface-container hover:bg-surface-container-highest rounded-xl text-xs font-bold text-on-surface border border-outline-variant/20 transition-all cursor-pointer select-none"
                  >
                    Não, voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteTransaction(deletingTxId);
                      setDeletingTxId(null);
                    }}
                    className="flex-1 py-3.5 bg-error hover:bg-red-400 text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(239,68,68,0.2)] cursor-pointer select-none"
                  >
                    Sim, excluir
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Modal de confirmação/aquisição do Plano PRO */}
      {showProModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-md bg-surface-container-high border border-white/10 rounded-[32px] p-6 text-center shadow-2xl relative overflow-hidden flex flex-col gap-5"
          >
            {/* Background premium gradient glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full filter blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full filter blur-3xl pointer-events-none"></div>

            {/* Icon decoration */}
            <div className="mx-auto w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
              <span className="material-symbols-outlined text-3xl animate-pulse">workspace_premium</span>
              <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90">
                PRO
              </span>
            </div>

            {/* Warning Message */}
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-black text-on-surface tracking-tight leading-snug">
                Você ainda não tem acesso ao Plano PRO.
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                Libere recursos avançados como relatórios completos em PDF/Excel, metas de economia automáticas com IA, múltiplos caixas de controle e suporte prioritário!
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 mt-2">
              <a
                href={CHECKOUT_PRO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowProModal(false)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-[#8b6eff] hover:from-[#8b6eff] hover:to-[#a18cff] text-on-primary font-black text-xs transition-all duration-300 flex items-center justify-center gap-2 border border-primary/30 shadow-[0_6px_24px_rgba(109,59,215,0.35)] hover:shadow-[0_8px_30px_rgba(109,59,215,0.55)] hover:-translate-y-0.5 select-none text-center"
              >
                <span className="material-symbols-outlined text-base">shopping_bag</span>
                Quero Acessar o PRO.
              </a>
              
              <button
                type="button"
                onClick={() => setShowProModal(false)}
                className="w-full py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface border border-outline-variant/20 transition-all duration-200 text-xs font-bold cursor-pointer"
              >
                Voltar
              </button>
            </div>

            {/* Security Note */}
            <span className="text-[10px] text-on-surface-variant/60 font-semibold flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-xs">lock</span>
              Pagamento 100% seguro & acesso vitalício imediato.
            </span>
          </motion.div>
        </div>
      )}
    </div>
  );
}
