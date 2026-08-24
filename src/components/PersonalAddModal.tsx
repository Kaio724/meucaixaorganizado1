import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Transaction, TransactionType } from '../types';
import { PAYMENT_METHODS } from '../initialData';
import { 
  getPersonalCategoryNamesByType, 
  getPersonalCategoryInfo,
  getCombinedPersonalCategories,
  saveCustomPersonalCategories,
  PersonalCategory
} from '../lib/personalCategories';

interface PersonalAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'> & { id?: string }) => void;
  editingTx?: Transaction | null;
  userId?: string;
  defaultType?: TransactionType;
}

export default function PersonalAddModal({
  isOpen,
  onClose,
  onSave,
  editingTx = null,
  userId = 'default_user',
  defaultType = 'entrada'
}: PersonalAddModalProps) {
  const [txType, setTxType] = useState<TransactionType>(defaultType);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  // Custom category creation modal state inside add modal
  const [showAddCustomCat, setShowAddCustomCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form values
  useEffect(() => {
    if (isOpen) {
      if (editingTx) {
        setTxType(editingTx.type);
        setTitle(editingTx.title || '');
        setAmount(editingTx.amount ? editingTx.amount.toString() : '');
        setCategory(editingTx.category || '');
        setPaymentMethod(editingTx.paymentMethod || 'Pix');
        setDate(editingTx.date || new Date().toISOString().split('T')[0]);
        setDescription(editingTx.description || '');
      } else {
        setTxType(defaultType);
        setTitle('');
        setAmount('');
        const cats = getPersonalCategoryNamesByType(userId, defaultType);
        setCategory(cats[0] || 'Outros');
        setPaymentMethod('Pix');
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('');
      }

      // Auto focus on amount field
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingTx, defaultType, userId]);

  // When type changes, update category to first available
  const handleTypeChange = (newType: TransactionType) => {
    setTxType(newType);
    const cats = getPersonalCategoryNamesByType(userId, newType);
    if (!editingTx || editingTx.type !== newType) {
      setCategory(cats[0] || 'Outros');
    }
  };

  const handleCreateCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const currentCats = getCombinedPersonalCategories(userId);
    const newCategoryObj: PersonalCategory = {
      id: 'pers_custom_' + Date.now(),
      name: newCatName.trim(),
      type: txType,
      icon: txType === 'entrada' ? 'payments' : 'category',
      color: txType === 'entrada' ? 'text-emerald-400' : 'text-purple-400',
      bgColor: txType === 'entrada' ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-purple-400/10 border-purple-400/20',
      isCustom: true
    };

    const customOnly = currentCats.filter(c => c.isCustom);
    saveCustomPersonalCategories(userId, [...customOnly, newCategoryObj]);
    setCategory(newCatName.trim());
    setNewCatName('');
    setShowAddCustomCat(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    // Use category as title if title is empty
    const effectiveTitle = title.trim() || category || (txType === 'entrada' ? 'Entrada Pessoal' : 'Despesa Pessoal');

    onSave({
      id: editingTx ? editingTx.id : undefined,
      title: effectiveTitle,
      amount: parsedAmount,
      type: txType,
      date,
      category: category || 'Outros',
      paymentMethod,
      description: description.trim() || undefined,
      accountType: 'pessoal'
    });

    onClose();
  };

  if (!isOpen) return null;

  const availableCategories = getPersonalCategoryNamesByType(userId, txType);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Backdrop Click */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full sm:max-w-lg bg-[#120f1e] border-t sm:border border-primary/25 rounded-t-[28px] sm:rounded-[28px] p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col gap-4 sm:gap-5 max-h-[92vh] overflow-y-auto contain-scroll z-10 text-left"
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-white/25 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0"></div>

        {/* Subtle Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#7C3AED]/15 rounded-full filter blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_15px_rgba(124,58,237,0.3)]">
              <span className="material-symbols-outlined text-xl">
                {editingTx ? 'edit_note' : 'account_balance_wallet'}
              </span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                {editingTx ? 'Editar Lançamento Pessoal' : 'Novo Lançamento Pessoal'}
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                Conta Pessoal MCO
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer tap-target"
            aria-label="Fechar modal"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Type Switcher: Entrou (Receita) ↔ Saiu (Despesa) */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-white/5 gap-1 select-none h-12">
          <button
            type="button"
            onClick={() => handleTypeChange('entrada')}
            className={`h-full px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer tap-target ${
              txType === 'entrada'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-base font-bold">arrow_downward</span>
            <span>Receita (Entrou)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('saida')}
            className={`h-full px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer tap-target ${
              txType === 'saida'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-base font-bold">arrow_upward</span>
            <span>Despesa (Saiu)</span>
          </button>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 sm:gap-4">
          
          {/* Valor Input (Hero field) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
              Valor (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-400">
                R$
              </span>
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full bg-[#181426] border rounded-2xl pl-12 pr-4 min-h-[48px] py-3 text-xl font-extrabold text-white placeholder:text-zinc-600 focus:outline-none transition-all ${
                  txType === 'entrada'
                    ? 'border-emerald-500/30 focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-rose-500/30 focus:border-rose-400 focus:shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                }`}
              />
            </div>
          </div>

          {/* Categorias Pessoais Chips / Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                Categoria Pessoal *
              </label>
              <button
                type="button"
                onClick={() => setShowAddCustomCat(!showAddCustomCat)}
                className="text-[11px] font-bold text-[#c4b5fd] hover:text-white flex items-center gap-1 transition-colors cursor-pointer tap-target py-1"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                <span>Nova categoria</span>
              </button>
            </div>

            {/* Inline Custom Category Creator */}
            {showAddCustomCat && (
              <div className="p-3 rounded-2xl bg-black/40 border border-[#7C3AED]/30 flex flex-col gap-2 mb-1 animate-fade-in">
                <span className="text-[11px] font-bold text-white">Criar Categoria Personalizada</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nome da categoria..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 bg-[#181426] border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustomCategory}
                    className="px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#8b4bf0] text-white font-bold text-xs transition-all shadow-[0_0_10px_rgba(124,58,237,0.4)] cursor-pointer tap-target"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {/* Categorias Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
              {availableCategories.map((catName) => {
                const isSelected = category === catName;
                const info = getPersonalCategoryInfo(catName, txType, userId);

                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setCategory(catName)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer truncate min-h-[44px] tap-target ${
                      isSelected
                        ? 'bg-[#7C3AED]/25 border-[#7C3AED] text-white shadow-[0_0_12px_rgba(124,58,237,0.35)]'
                        : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-base shrink-0 ${isSelected ? 'text-[#c4b5fd]' : info.color}`}>
                      {info.icon}
                    </span>
                    <span className="truncate">{catName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descrição / Título */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
              Descrição (Opcional)
            </label>
            <input
              type="text"
              placeholder={txType === 'entrada' ? 'Ex: Salário da empresa X, Freela design...' : 'Ex: Almoço de domingo, Mercado semanal...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#181426] border border-white/10 rounded-2xl px-4 py-3 min-h-[48px] text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Data e Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Data */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                Data *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#181426] border border-white/10 rounded-2xl px-4 py-3 min-h-[48px] text-base sm:text-xs text-white focus:outline-none focus:border-[#7C3AED] scheme-dark"
              />
            </div>

            {/* Forma de Pagamento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#181426] border border-white/10 rounded-2xl px-4 py-3 min-h-[48px] text-base sm:text-xs text-white focus:outline-none focus:border-[#7C3AED] cursor-pointer"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm} className="bg-[#181426] text-white">
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-2 h-[52px] rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8b4bf0] hover:to-[#a855f7] text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_20px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_25px_rgba(124,58,237,0.6)] cursor-pointer select-none border border-[#c4b5fd]/30 tap-target"
          >
            <span className="material-symbols-outlined text-xl font-bold">
              {editingTx ? 'save' : 'add_circle'}
            </span>
            <span>{editingTx ? 'Salvar Alterações' : 'Salvar Lançamento Pessoal'}</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
}
