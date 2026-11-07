// Preserve the existing per-user category storage without changing the Supabase schema.
export async function persistCategories(userId: string, accountType: 'pessoal' | 'empresarial', categories: unknown[]) {
  if (!userId) throw new Error('Faça login para salvar categorias.');
  const prefix = accountType === 'pessoal' ? 'mco_custom_personal_categories_' : 'mco_custom_categories_';
  localStorage.setItem(prefix + userId, JSON.stringify(categories));
  window.dispatchEvent(new Event('mco-categories-changed'));
}
