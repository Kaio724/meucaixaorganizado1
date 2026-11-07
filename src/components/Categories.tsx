import ModalLayer from './ModalLayer';
import React, { useEffect, useState } from 'react';
import { AccountType, Transaction, UserProfile } from '../types';
import { CustomCategory, getCombinedCategories, PRESET_COLORS, PRESET_ICONS, getCustomCategories, saveCustomCategories } from '../lib/categories';
import { PERSONAL_SYSTEM_CATEGORIES, getCustomPersonalCategories, saveCustomPersonalCategories } from '../lib/personalCategories';
import { categoryLabel, categoryMatches, validateCategory } from '../lib/categoryHierarchy';

interface Props { profile: UserProfile; userId: string; accountType?: AccountType; transactions?: Transaction[]; onNavigateToPlanos: () => void; }

export default function Categories({ userId, accountType = 'empresarial', transactions = [] }: Props) {
  const [custom, setCustom] = useState<CustomCategory[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [draft, setDraft] = useState<CustomCategory | null>(null);
  const [deleting, setDeleting] = useState<CustomCategory | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const system = (accountType === 'pessoal' ? PERSONAL_SYSTEM_CATEGORIES : getCombinedCategories(userId).filter(category => !category.isCustom)) as CustomCategory[];
  const all = [...system, ...custom];
  const roots = all.filter(item => !item.parentId);
  const isUsed = (category: CustomCategory) => transactions.some(tx => (tx.accountType || 'empresarial') === accountType && tx.type === category.type && categoryMatches(tx.category, categoryLabel(category, all)));
  useEffect(() => {
    setCustom((accountType === 'pessoal' ? getCustomPersonalCategories(userId) : getCustomCategories(userId)) as CustomCategory[]);
    setDraft(null); setDeleting(null); setError(''); setSearch(''); setFilter('todos');
  }, [userId, accountType]);
  async function persist(next: CustomCategory[]) {
    if (accountType === 'pessoal') await saveCustomPersonalCategories(userId, next);
    else await saveCustomCategories(userId, next);
    setCustom(next);
  }
  function create(parent?: CustomCategory) {
    setError('');
    setDraft({ id: `custom_${crypto.randomUUID()}`, name: '', type: parent?.type || 'saida', parentId: parent?.id, icon: parent?.icon || 'category', color: parent?.color || PRESET_COLORS[2].color, bgColor: parent?.bgColor || PRESET_COLORS[2].bgColor, isCustom: true });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || saving) return;
    const next = { ...draft, name: draft.name.trim().replace(/\s+/g, ' ') };
    const validation = validateCategory(next, all);
    if (validation) { setError(validation); return; }
    const previous = custom.find(item => item.id === next.id);
    if (previous && isUsed(previous) && (previous.name !== next.name || previous.type !== next.type || previous.parentId !== next.parentId)) {
      setError('Esta categoria ou suas subcategorias têm lançamentos. Preserve nome, tipo e grupo para manter o histórico.'); return;
    }
    if (all.some(item => item.parentId === next.id && item.type !== next.type)) { setError('O tipo deve ser igual ao das subcategorias.'); return; }
    setSaving(true); setError('');
    try { await persist(previous ? custom.map(item => item.id === next.id ? next : item) : [...custom, next]); setDraft(null); }
    catch (error: any) { setError(error.message || 'Não foi possível salvar a categoria.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!deleting || saving) return;
    if (all.some(item => item.parentId === deleting.id)) { setError('Exclua ou mova as subcategorias antes de excluir a categoria principal.'); return; }
    if (isUsed(deleting)) { setError('Esta categoria tem lançamentos e não pode ser excluída. O histórico foi preservado.'); return; }
    setSaving(true); setError('');
    try { await persist(custom.filter(item => item.id !== deleting.id)); setDeleting(null); }
    catch (error: any) { setError(error.message || 'Não foi possível excluir.'); }
    finally { setSaving(false); }
  }
  const matches = (item: CustomCategory) => (filter === 'todos' || item.type === filter) && categoryLabel(item, all).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR').trim());
  const visible = roots.filter(root => matches(root) || all.some(child => child.parentId === root.id && matches(child)));
  const editing = draft && custom.some(item => item.id === draft.id);
  const field = 'w-full rounded-xl border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface';
  const action = 'rounded-xl border border-primary/30 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50';
  function row(item: CustomCategory, child = false) {
    return <div key={item.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${child ? 'ml-5 border-l-2 border-primary/30 bg-primary/5' : ''}`} data-testid={`category-${item.id}`}>
      <div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className={`material-symbols-outlined rounded-xl p-2 ${item.color} ${item.bgColor}`}>{item.icon}</span><div className="min-w-0"><p className="break-words text-sm font-bold text-on-surface">{item.name}</p><p className="text-xs text-on-surface-variant">{child ? 'Subcategoria' : item.type === 'entrada' ? 'Receita' : 'Despesa'}{!item.isCustom ? ' · Sistema' : ''}</p></div></div>
      <div className="flex flex-wrap gap-2">{!child && <button className={action} onClick={() => create(item)} aria-label={`Adicionar subcategoria em ${item.name} (${item.type === 'entrada' ? 'receita' : 'despesa'})`}>+ Subcategoria</button>}{item.isCustom && <><button className={action} aria-label={`Editar ${categoryLabel(item, all)}`} onClick={() => { setError(''); setDraft({ ...item }); }}>Editar</button><button className={action} aria-label={`Excluir ${categoryLabel(item, all)}`} onClick={() => { setError(''); setDeleting(item); }}>Excluir</button></>}</div>
    </div>;
  }
  return <section className="flex flex-col gap-5 pb-16 text-left">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-surface-container-low p-5"><div><h2 className="text-xl font-bold text-on-surface">Categorias e subcategorias</h2><p className="mt-1 text-sm text-on-surface-variant">Conta {accountType === 'pessoal' ? 'pessoal' : 'empresarial'} · Organize despesas e receitas em grupos.</p><p className="mt-2 text-xs text-on-surface-variant">Exemplo: Loja → Água/Esgoto, Telefone, Energia, IPTU.</p></div><button className="rounded-2xl bg-primary px-5 py-3 font-bold text-on-primary" onClick={() => create()}>Nova categoria</button></div>
    <label className="flex flex-col gap-2 text-sm text-on-surface-variant">Buscar categoria ou subcategoria<input className={field} value={search} onChange={event => setSearch(event.target.value)} placeholder="Ex.: Loja ou Energia" /></label>
    <div className="flex gap-2" role="group" aria-label="Filtrar categorias por tipo">{(['todos', 'entrada', 'saida'] as const).map(type => <button key={type} aria-pressed={filter === type} className={`${action} ${filter === type ? 'bg-primary/15' : ''}`} onClick={() => setFilter(type)}>{type === 'todos' ? 'Todas' : type === 'entrada' ? 'Receitas' : 'Despesas'}</button>)}</div>
    {!visible.length && <p role="status" className="p-6 text-on-surface-variant">Nenhuma categoria encontrada.</p>}
    <div className="grid items-start gap-4 md:grid-cols-2">{visible.map(parent => <article key={parent.id} className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">{row(parent)}{all.filter(child => child.parentId === parent.id && (matches(parent) || matches(child))).map(child => row(child, true))}</article>)}</div>
    {(draft || deleting) && <ModalLayer className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4"><div role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" className="my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-outline-variant bg-surface-container-low p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between gap-3"><h3 id="category-dialog-title" className="text-lg font-bold text-on-surface">{deleting ? 'Excluir categoria' : editing ? 'Editar categoria' : draft?.parentId ? 'Nova subcategoria' : 'Nova categoria'}</h3><button aria-label="Fechar categorias" disabled={saving} className={action} onClick={() => { setDraft(null); setDeleting(null); setError(''); }}>Fechar</button></div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-error/10 p-3 text-sm text-error">{error}</p>}
      {draft && <form onSubmit={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-on-surface">Nome<input autoFocus required maxLength={40} className={field} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="flex flex-col gap-2 text-sm text-on-surface">Tipo<select className={field} value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value as 'entrada' | 'saida', parentId: undefined })}><option value="saida">Despesa</option><option value="entrada">Receita</option></select></label>
        <label className="flex flex-col gap-2 text-sm text-on-surface">Categoria principal<select className={field} value={draft.parentId || ''} onChange={event => setDraft({ ...draft, parentId: event.target.value || undefined })}><option value="">Nenhuma — categoria principal</option>{roots.filter(item => item.type === draft.type && item.id !== draft.id).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-sm text-on-surface">Ícone<select className={field} value={draft.icon} onChange={event => setDraft({ ...draft, icon: event.target.value })}>{PRESET_ICONS.map(icon => <option key={icon.icon} value={icon.icon}>{icon.name}</option>)}</select></label>
        <fieldset><legend className="mb-2 text-sm text-on-surface">Cor</legend><div className="flex flex-wrap gap-2">{PRESET_COLORS.map(color => <button type="button" key={color.color} aria-label={color.name} aria-pressed={draft.color === color.color} className={`rounded-full border-2 p-2 ${color.bgColor} ${draft.color === color.color ? 'border-primary' : 'border-transparent'}`} onClick={() => setDraft({ ...draft, color: color.color, bgColor: color.bgColor })}><span aria-hidden="true" className={`${color.color} text-lg`}>●</span></button>)}</div></fieldset>
        <label className="flex flex-col gap-2 text-sm text-on-surface">Descrição (opcional)<input maxLength={200} className={field} value={draft.description || ''} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
        <button disabled={saving} type="submit" className="rounded-xl bg-primary p-3 font-bold text-on-primary disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar categoria'}</button>
      </form>}
      {deleting && <div className="flex flex-col gap-4"><p className="text-sm text-on-surface">Excluir “{categoryLabel(deleting, all)}”? Categorias com lançamentos ou subcategorias serão preservadas.</p><button disabled={saving} className="rounded-xl bg-error p-3 font-bold text-on-error disabled:opacity-50" onClick={remove}>{saving ? 'Excluindo…' : 'Confirmar exclusão'}</button></div>}
    </div></ModalLayer>}
  </section>;
}
