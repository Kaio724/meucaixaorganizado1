export const CATEGORY_SEPARATOR = ' › ';
export interface CategoryNode {
  id: string;
  name: string;
  type: 'entrada' | 'saida';
  parentId?: string;
}

export function categoryLabel(category: CategoryNode, all: CategoryNode[]): string {
  const parent = all.find(item => item.id === category.parentId);
  return parent ? `${parent.name}${CATEGORY_SEPARATOR}${category.name}` : category.name;
}

export function categoryRoot(label: string): string {
  return label.split(CATEGORY_SEPARATOR)[0];
}

export function categorySelection(options: string[], value: string) {
  // Keep historical selections editable even when a default category was hidden.
  const available = Array.from(new Set([...options, ...(value ? [value] : [])]));
  const roots = Array.from(new Set(available.map(categoryRoot)));
  const parent = categoryRoot(value);
  const children = available.filter(label => label.startsWith(`${parent}${CATEGORY_SEPARATOR}`)).map(label => ({ value: label, name: label.slice(parent.length + CATEGORY_SEPARATOR.length) }));
  return { roots, parent, children, child: value.includes(CATEGORY_SEPARATOR) ? value : '' };
}

export function categoryMatches(label: string, selected: string): boolean {
  return label === selected || label.startsWith(`${selected}${CATEGORY_SEPARATOR}`);
}

export function orderedCategoryLabels(all: CategoryNode[], type: 'entrada' | 'saida'): string[] {
  return all.filter(item => item.type === type && !item.parentId).flatMap(parent => [
    parent.name,
    ...all.filter(child => child.type === type && child.parentId === parent.id).map(child => categoryLabel(child, all)),
  ]);
}

export function validateCategory(category: CategoryNode, all: CategoryNode[]): string | null {
  const name = category.name.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 40) return 'Informe um nome de 1 a 40 caracteres.';
  if (name.includes('›')) return 'O nome não pode conter o símbolo ›.';
  if (category.parentId) {
    const parent = all.find(item => item.id === category.parentId);
    if (!parent || parent.parentId || parent.id === category.id) return 'Selecione uma categoria principal válida.';
    if (parent.type !== category.type) return 'A subcategoria deve ter o mesmo tipo da categoria principal.';
    if (all.some(item => item.parentId === category.id)) return 'Uma categoria com subcategorias não pode ser movida para dentro de outra.';
  }
  if (all.some(item => item.id !== category.id && item.type === category.type && (item.parentId || '') === (category.parentId || '') && item.name.trim().toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) {
    return 'Já existe uma categoria com esse nome neste grupo e tipo.';
  }
  return null;
}

export function groupCategoryTotals(items: { category: string; amount: number }[]) {
  const groups: Record<string, { total: number; children: Record<string, number> }> = {};
  for (const item of items) {
    const root = categoryRoot(item.category);
    const group = groups[root] ||= { total: 0, children: {} };
    group.total += item.amount;
    const child = item.category.split(CATEGORY_SEPARATOR).slice(1).join(CATEGORY_SEPARATOR);
    if (child) group.children[child] = (group.children[child] || 0) + item.amount;
  }
  return groups;
}
