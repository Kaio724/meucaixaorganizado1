import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, TransactionType } from '../types';
import { AVAILABLE_CATEGORIES, PAYMENT_METHODS } from '../initialData';

interface HistoryProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function History({ transactions, onAddTransaction, onEditTransaction, onDeleteTransaction }: HistoryProps) {
  const [filterType, setFilterType] = useState<'tudo' | 'entrada' | 'saida'>('tudo');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth()); // default to current month
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  
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
    const txDate = new Date(tx.date + 'T00:00:00'); // avoid timezone shifts
    const txMonth = txDate.getMonth();
    const txYear = txDate.getFullYear();

    // Month & Year Filter
    if (txMonth !== selectedMonthIndex || txYear !== selectedYear) return false;

    // Type Filter
    if (filterType !== 'tudo' && tx.type !== filterType) return false;

    // Search Query Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = tx.title.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchMethod = tx.paymentMethod.toLowerCase().includes(q);
      return matchTitle || matchCat || matchMethod;
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
  };

  // Open Add Form
  const startAdd = () => {
    setEditingTx(null);
    setFormType('entrada');
    setFormTitle('');
    setFormAmount('');
    setFormCategory(AVAILABLE_CATEGORIES.entrada[0]);
    setFormPaymentMethod('Pix');
    setFormDate(new Date().toISOString().split('T')[0]);
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
      paymentMethod: formPaymentMethod
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
      setFormCategory(AVAILABLE_CATEGORIES[formType][0]);
    }
  }, [formType, editingTx]);

  // Format currency
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Category specific icon mapping for a personalized touch
  const getCategoryIcon = (category: string, type: TransactionType) => {
    if (type === 'entrada') {
      switch (category) {
        case 'Venda': return 'local_mall';
        case 'Cliente Avulso': return 'person';
        case 'Sinal': return 'handshake';
        case 'Serviço': return 'construction';
        default: return 'arrow_upward';
      }
    } else {
      switch (category) {
        case 'Transporte': return 'local_gas_station';
        case 'Materiais': return 'inventory_2';
        case 'Aluguel': return 'home';
        case 'Impostos': return 'description';
        default: return 'arrow_downward';
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto pb-24">
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
        {/* Search input */}
        <div className="relative flex items-center bg-surface-container-low rounded-xl border border-outline-variant/30 px-3 py-2.5">
          <span className="material-symbols-outlined text-on-surface-variant text-lg mr-2">search</span>
          <input 
            type="text"
            placeholder="Buscar por descrição, tipo, pix..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-on-surface focus:outline-none w-full placeholder:text-on-surface-variant/40"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-on-surface-variant hover:text-on-surface text-xs">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Filters pills row */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setFilterType('tudo')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
              filterType === 'tudo'
                ? 'bg-primary text-on-primary shadow-md'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/10'
            }`}
          >
            Tudo
          </button>
          <button
            onClick={() => setFilterType('entrada')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
              filterType === 'entrada'
                ? 'bg-tertiary/20 text-tertiary border border-tertiary/40 shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/10'
            }`}
          >
            Entradas
          </button>
          <button
            onClick={() => setFilterType('saida')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
              filterType === 'saida'
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

      {/* Main Groups Container */}
      <div className="flex flex-col gap-6">
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
                          ? 'bg-surface-container-high border-2 border-primary/40 p-5' 
                          : 'bg-surface-container border border-outline-variant/15 p-4 hover:bg-surface-container-high'
                      }`}
                    >
                      {/* Normal Row view */}
                      {!isEditingThis ? (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              tx.type === 'entrada' ? 'bg-tertiary/10 text-tertiary' : 'bg-error/5 text-[#fca5a5]'
                            }`}>
                              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {getCategoryIcon(tx.category, tx.type)}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-on-surface leading-tight">{tx.title}</h4>
                              <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                                {tx.paymentMethod} • {tx.category}
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
                                {AVAILABLE_CATEGORIES[formType].map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
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

      {/* Add Transaction Dialog / Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-[24px] p-6 shadow-2xl border border-primary/20 w-full max-w-md flex flex-col gap-4 relative"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">add_box</span>
                  Registrar Lançamento
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                {/* Type Selection */}
                <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setFormType('entrada')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      formType === 'entrada' 
                        ? 'bg-tertiary/10 text-tertiary border border-tertiary/20' 
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('saida')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      formType === 'saida' 
                        ? 'bg-error/10 text-error border border-error/20' 
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Saída (-)
                  </button>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-on-surface-variant font-medium">Especificação do Item ou Serviço</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Venda de Bolo, Compra de Insumos..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/30"
                  />
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-on-surface-variant font-medium">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/30"
                  />
                </div>

                {/* Category & Payment Method row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-on-surface-variant font-medium">Categoria</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface"
                    >
                      {AVAILABLE_CATEGORIES[formType].map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-on-surface-variant font-medium">Forma de Pagamento</label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-on-surface-variant font-medium">Data</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-3 pt-3 border-t border-white/5 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 bg-surface-container rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-highest border border-outline-variant/20 transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1 ${
                      formType === 'entrada' 
                        ? 'bg-tertiary hover:bg-[#3bc691] text-on-primary' 
                        : 'bg-error hover:bg-[#ffa095] text-on-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">done</span>
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
    </div>
  );
}
