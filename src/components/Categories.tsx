import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { 
  CustomCategory, 
  SYSTEM_CATEGORIES, 
  PRESET_COLORS, 
  PRESET_ICONS, 
  getCustomCategories, 
  saveCustomCategories 
} from '../lib/categories';

interface CategoriesProps {
  profile: UserProfile;
  userId: string;
  onNavigateToPlanos: () => void;
}

export default function Categories({ profile, userId, onNavigateToPlanos }: CategoriesProps) {
  const isPro = (profile.plan || 'essential') === 'pro';

  // State
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | 'entrada' | 'saida' | 'sistema' | 'personalizadas'>('todos');

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'entrada' | 'saida'>('entrada');
  const [formIcon, setFormIcon] = useState('category');
  const [formColor, setFormColor] = useState('text-violet-400');
  const [formBgColor, setFormBgColor] = useState('bg-violet-400/10 border-violet-400/20');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Exclude modal state
  const [categoryToDelete, setCategoryToDelete] = useState<CustomCategory | null>(null);

  // Load custom categories on mount/userId change
  useEffect(() => {
    if (userId) {
      setCustomCategories(getCustomCategories(userId));
    }
  }, [userId]);

  // Combined categories
  const allCategories = [...SYSTEM_CATEGORIES, ...customCategories];

  // Search and Filter Logic
  const filteredCategories = allCategories.filter((cat) => {
    // Search filter
    const matchesSearch = 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.isCustom ? 'personalizada' : 'sistema').includes(searchQuery.toLowerCase()) ||
      (cat.type === 'entrada' ? 'receita' : 'despesa').includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Fast category filter buttons
    if (activeFilter === 'todos') return true;
    if (activeFilter === 'entrada') return cat.type === 'entrada';
    if (activeFilter === 'saida') return cat.type === 'saida';
    if (activeFilter === 'sistema') return !cat.isCustom;
    if (activeFilter === 'personalizadas') return cat.isCustom;

    return true;
  });

  // Separate into System and Personalizada for grouping
  const systemGroups = filteredCategories.filter(cat => !cat.isCustom);
  const customGroups = filteredCategories.filter(cat => cat.isCustom);

  // Handle Save (Create / Edit)
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanedName = formName.trim().replace(/\s+/g, ' ');
    if (!cleanedName) {
      setFormError('O nome da categoria é obrigatório.');
      return;
    }

    if (cleanedName.length > 40) {
      setFormError('O nome da categoria não pode exceder 40 caracteres.');
      return;
    }

    // Check duplication (excluding the one being edited)
    const isDuplicate = allCategories.some(
      (cat) => 
        cat.name.toLowerCase() === cleanedName.toLowerCase() && 
        cat.type === formType &&
        (!editingCategory || cat.id !== editingCategory.id)
    );

    if (isDuplicate) {
      setFormError(`Já existe uma categoria chamada "${cleanedName}" para ${formType === 'entrada' ? 'Receitas' : 'Despesas'}.`);
      return;
    }

    let updatedList: CustomCategory[] = [];

    if (editingCategory) {
      // Edit
      updatedList = customCategories.map((cat) => 
        cat.id === editingCategory.id 
          ? {
              ...cat,
              name: cleanedName,
              type: formType,
              icon: formIcon,
              color: formColor,
              bgColor: formBgColor,
              description: formDescription.trim() || undefined
            }
          : cat
      );
    } else {
      // Create
      const newCat: CustomCategory = {
        id: `custom_${Date.now()}`,
        name: cleanedName,
        type: formType,
        icon: formIcon,
        color: formColor,
        bgColor: formBgColor,
        description: formDescription.trim() || undefined,
        isCustom: true
      };
      updatedList = [newCat, ...customCategories];
    }

    setCustomCategories(updatedList);
    saveCustomCategories(userId, updatedList);
    
    // Close & reset
    setShowFormModal(false);
    setEditingCategory(null);
    resetForm();
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = () => {
    if (!categoryToDelete) return;

    const updatedList = customCategories.filter(cat => cat.id !== categoryToDelete.id);
    setCustomCategories(updatedList);
    saveCustomCategories(userId, updatedList);
    setCategoryToDelete(null);
  };

  // Edit Button Action
  const handleEditClick = (cat: CustomCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormIcon(cat.icon);
    setFormColor(cat.color);
    setFormBgColor(cat.bgColor);
    setFormDescription(cat.description || '');
    setFormError(null);
    setShowFormModal(true);
  };

  // Open Create Modal Action
  const handleCreateClick = () => {
    setEditingCategory(null);
    resetForm();
    setShowFormModal(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormType('entrada');
    setFormIcon('category');
    setFormColor('text-violet-400');
    setFormBgColor('bg-violet-400/10 border-violet-400/20');
    setFormDescription('');
    setFormError(null);
  };

  // Lock screen if user is not Pro
  if (!isPro) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4 select-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg glass-card rounded-[32px] p-8 bg-gradient-to-b from-[#1a1a22]/80 to-[#121217]/90 border border-primary/20 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full filter blur-2xl pointer-events-none"></div>
          
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(208,188,255,0.2)] mx-auto mb-6">
            <span className="material-symbols-outlined text-primary text-3xl font-black">lock</span>
          </div>

          <span className="text-[10px] font-black tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            Recurso Exclusivo MCO PRO
          </span>

          <h3 className="text-2xl font-extrabold text-on-surface mt-4 tracking-tight">
            Gerenciamento de Categorias
          </h3>
          
          <p className="text-xs text-on-surface-variant leading-relaxed mt-3 max-w-sm mx-auto">
            Crie categorias financeiras personalizadas ilimitadas com cores e ícones dedicados para mapear o seu negócio com precisão cirúrgica.
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2.5 text-left text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">check_circle</span>
              <span>Personalize ícones e cores de categorias</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">check_circle</span>
              <span>Crie categorias de Receitas e Despesas exclusivas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">check_circle</span>
              <span>Visualização completa nos gráficos e dashboards</span>
            </div>
          </div>

          <button
            onClick={onNavigateToPlanos}
            className="w-full bg-[#6d3bd7] hover:bg-[#8455ef] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 shadow-[0_4px_16px_rgba(109,59,215,0.35)] cursor-pointer mt-8 select-none border border-primary/20"
          >
            <span className="material-symbols-outlined text-sm font-bold">workspace_premium</span>
            <span>Fazer Upgrade para o PRO</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Upper header action area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-left">
          <h2 className="text-2xl font-black text-on-surface tracking-tight">Categorias</h2>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            Gerencie as categorias utilizadas nas movimentações financeiras do seu negócio.
          </p>
        </div>
        
        <button
          onClick={handleCreateClick}
          className="px-5 py-3 rounded-2xl bg-[#6d3bd7] hover:bg-[#8455ef] text-white font-bold text-xs tracking-wide uppercase transition-all duration-200 shadow-[0_4px_12px_rgba(109,59,215,0.25)] flex items-center justify-center gap-2 cursor-pointer border border-primary/20 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          Nova Categoria
        </button>
      </div>

      {/* Realtime Search & Filter Tabs */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Pesquisar categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 transition-colors font-semibold"
          />
        </div>

        {/* Filters Panel with horizontal smooth scrolling */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 cursor-default">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'entrada', label: 'Receitas' },
            { id: 'saida', label: 'Despesas' },
            { id: 'sistema', label: 'Sistema' },
            { id: 'personalizadas', label: 'Personalizadas' }
          ].map((filt) => (
            <button
              key={filt.id}
              onClick={() => setActiveFilter(filt.id as any)}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                activeFilter === filt.id
                  ? 'bg-primary/10 text-primary border-primary/20 shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border-transparent'
              }`}
            >
              {filt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories View Lists */}
      <div className="flex flex-col gap-8">
        {/* First section: Categorias do Sistema */}
        {systemGroups.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest text-left">
              Categorias do Sistema ({systemGroups.length})
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {systemGroups.map((cat) => (
                <div 
                  key={cat.id}
                  className="group relative bg-[#1c1b1d] border border-white/5 rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-white/10 hover:bg-white/[0.01] transition-all duration-300 min-h-[140px] text-left"
                >
                  <div className="flex items-start justify-between">
                    {/* Category Icon and Color badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.bgColor} border transition-all duration-300 group-hover:scale-105`}>
                      <span className={`material-symbols-outlined text-lg ${cat.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {cat.icon}
                      </span>
                    </div>
                    
                    {/* Category Badges */}
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        cat.type === 'entrada'
                          ? 'bg-[#10b981]/10 text-[#4edea3] border-[#10b981]/10'
                          : 'bg-[#ef4444]/10 text-[#f87171] border-[#ef4444]/10'
                      }`}>
                        {cat.type === 'entrada' ? 'Receita' : 'Despesa'}
                      </span>
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-white/5 text-on-surface-variant/60 border border-white/5">
                        Sistema
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-on-surface truncate tracking-tight">
                      {cat.name}
                    </h4>
                    <p className="text-[10px] text-on-surface-variant/50 line-clamp-1 mt-0.5">
                      {cat.description || `Categoria nativa para ${cat.type === 'entrada' ? 'entradas' : 'saídas'}`}
                    </p>
                  </div>

                  {/* Actions layer - System locked */}
                  <div className="flex items-center gap-2 border-t border-white/[0.03] pt-3 justify-end group/actions relative">
                    <button 
                      disabled
                      className="text-[10px] font-bold text-on-surface-variant/30 flex items-center gap-1 cursor-not-allowed opacity-50"
                    >
                      <span className="material-symbols-outlined text-xs">edit</span>
                      Editar
                    </button>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <button 
                      disabled
                      className="text-[10px] font-bold text-on-surface-variant/30 flex items-center gap-1 cursor-not-allowed opacity-50"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                      Excluir
                    </button>

                    {/* Tooltip on Actions Hover */}
                    <div className="pointer-events-none absolute bottom-full mb-2 right-0 bg-surface-container border border-outline-variant text-[9px] font-bold text-on-surface-variant px-2.5 py-1 rounded-lg opacity-0 group-hover/actions:opacity-100 transition-opacity duration-200 shadow-xl whitespace-nowrap z-20">
                      Categorias do sistema não podem ser alteradas.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Second section: Categorias Personalizadas */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest text-left">
            Categorias Personalizadas ({customGroups.length})
          </h3>

          {customGroups.length === 0 ? (
            <div className="p-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-[24px] flex flex-col items-center justify-center gap-2.5">
              <span className="material-symbols-outlined text-on-surface-variant/20 text-4xl">
                category
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface-variant">Nenhuma categoria personalizada criada</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5 leading-relaxed">
                  Crie suas próprias categorias para adaptar as movimentações perfeitamente às suas necessidades.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {customGroups.map((cat) => (
                <div 
                  key={cat.id}
                  className="group relative bg-[#1c1b1d] border border-white/5 rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-primary/20 hover:bg-white/[0.02] transition-all duration-300 min-h-[140px] text-left"
                >
                  <div className="flex items-start justify-between">
                    {/* Category Icon & Color badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.bgColor} border border-transparent group-hover:border-white/10 transition-all duration-300 group-hover:scale-105`}>
                      <span className={`material-symbols-outlined text-lg ${cat.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {cat.icon}
                      </span>
                    </div>

                    {/* Category Badges */}
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        cat.type === 'entrada'
                          ? 'bg-[#10b981]/10 text-[#4edea3] border-[#10b981]/10'
                          : 'bg-[#ef4444]/10 text-[#f87171] border-[#ef4444]/10'
                      }`}>
                        {cat.type === 'entrada' ? 'Receita' : 'Despesa'}
                      </span>
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-primary/10 text-primary border border-primary/10">
                        Personalizada
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-on-surface truncate tracking-tight">
                      {cat.name}
                    </h4>
                    <p className="text-[10px] text-on-surface-variant/50 line-clamp-1 mt-0.5">
                      {cat.description || 'Sem descrição cadastrada'}
                    </p>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 border-t border-white/[0.03] pt-3 justify-end relative">
                    <button 
                      onClick={() => handleEditClick(cat)}
                      className="text-[10px] font-bold text-primary hover:text-[#c0aeff] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">edit</span>
                      Editar
                    </button>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <button 
                      onClick={() => setCategoryToDelete(cat)}
                      className="text-[10px] font-bold text-error hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            
            {/* Backdrop click closer */}
            <div className="absolute inset-0 cursor-default" onClick={() => setShowFormModal(false)} />

            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="relative w-full sm:max-w-md bg-[#131315] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col gap-5 max-h-[90vh] overflow-y-auto z-10 text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-on-surface">
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </h3>
                  <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                    Preencha os dados e escolha um ícone e cor correspondente
                  </p>
                </div>
                <button 
                  onClick={() => setShowFormModal(false)}
                  className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl text-xs bg-error/10 border border-error/20 text-error font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm font-bold">warning</span>
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveCategory} className="flex flex-col gap-4">
                {/* Nome do Campo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/90 uppercase tracking-wider">Nome da Categoria</label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    placeholder="Ex: Consultoria, Embalagens"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-surface-container-low border border-white/5 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-primary text-on-surface font-semibold placeholder:text-on-surface-variant/35"
                  />
                </div>

                {/* Tipo de Categoria */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/90 uppercase tracking-wider">Tipo</label>
                  <div className="flex bg-black/30 p-1.5 rounded-2xl border border-white/5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormType('entrada')}
                      className={`flex-1 py-2 px-3 text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        formType === 'entrada'
                          ? 'bg-[#10b981]/15 text-[#4edea3] border border-[#10b981]/10'
                          : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-white/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">trending_up</span>
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('saida')}
                      className={`flex-1 py-2 px-3 text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        formType === 'saida'
                          ? 'bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/10'
                          : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-white/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">trending_down</span>
                      Despesa
                    </button>
                  </div>
                </div>

                {/* Selecionador de Cor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/90 uppercase tracking-wider">Cor de Identificação</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_COLORS.map((col) => {
                      const isSelected = formColor === col.color;
                      return (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => {
                            setFormColor(col.color);
                            setFormBgColor(col.bgColor);
                          }}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-white/5 border-primary shadow-lg shadow-primary/10' 
                              : 'bg-surface-container-low border-white/5 hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full ${col.bgColor} border border-white/10 flex items-center justify-center`}>
                            {isSelected && <span className="material-symbols-outlined text-[10px] text-primary font-black">done</span>}
                          </div>
                          <span className="text-[8px] text-on-surface-variant/60 truncate w-full text-center">
                            {col.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selecionador de Ícone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/90 uppercase tracking-wider">Ícone representativo</label>
                  <div className="grid grid-cols-6 gap-2 bg-surface-container-low p-2.5 rounded-2xl border border-white/5 max-h-[140px] overflow-y-auto">
                    {PRESET_ICONS.map((ico) => {
                      const isSelected = formIcon === ico.icon;
                      return (
                        <button
                          key={ico.icon}
                          type="button"
                          onClick={() => setFormIcon(ico.icon)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            isSelected
                              ? `${formBgColor} ${formColor} border-primary/25 scale-105 shadow-md`
                              : 'text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5'
                          }`}
                          title={ico.name}
                        >
                          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {ico.icon}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Descrição (Opcional) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/90 uppercase tracking-wider">Descrição (Opcional)</label>
                  <textarea
                    placeholder="Ex: Entradas referentes aos serviços mensais"
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-surface-container-low border border-white/5 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-primary text-on-surface font-semibold placeholder:text-on-surface-variant/35 resize-none"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-on-surface font-bold text-xs uppercase tracking-wide transition-all border border-white/5 cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-2xl bg-[#6d3bd7] hover:bg-[#8455ef] text-white font-bold text-xs uppercase tracking-wide transition-all shadow-[0_4px_12px_rgba(109,59,215,0.25)] cursor-pointer border border-primary/20 text-center"
                  >
                    Salvar Categoria
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EXCLUSION CONFIRMATION MODAL */}
      <AnimatePresence>
        {categoryToDelete && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            
            <div className="absolute inset-0 cursor-default" onClick={() => setCategoryToDelete(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 25 }}
              className="relative w-full sm:max-w-md bg-[#131315] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl flex flex-col gap-5 z-10 text-left"
            >
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-error/15 flex items-center justify-center border border-error/20 text-error animate-pulse">
                  <span className="material-symbols-outlined text-xl">delete_forever</span>
                </div>
                <div className="flex flex-col text-left">
                  <h3 className="text-lg font-black text-on-surface">Excluir categoria</h3>
                  <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-white/5">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Tem certeza que deseja excluir a categoria <strong className="text-on-surface">"{categoryToDelete.name}"</strong>? 
                  <br />
                  <span className="text-primary mt-1.5 block font-medium">💡 Movimentações antigas permanecerão registradas normalmente.</span>
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-on-surface font-bold text-xs uppercase tracking-wide transition-all border border-white/5 cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-3.5 rounded-2xl bg-[#ef4444] hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wide transition-all shadow-[0_4px_12px_rgba(239,68,68,0.2)] cursor-pointer border border-[#ef4444]/25 text-center"
                >
                  Excluir Categoria
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
