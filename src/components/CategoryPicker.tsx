import { useId } from 'react';
import { categorySelection } from '../lib/categoryHierarchy';

interface Props {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function CategoryPicker({ options, value, onChange }: Props) {
  const id = useId();
  const { roots, parent, children, child } = categorySelection(options, value);
  const field = 'w-full min-w-0 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface focus:outline-none focus:border-primary';
  return <div className="flex min-w-0 flex-col gap-3">
    <div className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-on-surface-variant">
      <label htmlFor={`${id}-category`}>Categoria</label>
      <select id={`${id}-category`} className={field} value={parent} onChange={event => onChange(event.target.value)}>
        <option value="" disabled>Selecione a categoria</option>
        {roots.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
    </div>
    <div className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-on-surface-variant">
      <label htmlFor={`${id}-subcategory`}>Subcategoria (opcional)</label>
      <select id={`${id}-subcategory`} className={`${field} disabled:opacity-60`} disabled={!children.length} value={child} onChange={event => onChange(event.target.value || parent)}>
        <option value="">{children.length ? 'Sem subcategoria' : 'Nenhuma subcategoria cadastrada'}</option>
        {children.map(item => <option key={item.value} value={item.value}>{item.name}</option>)}
      </select>
    </div>
  </div>;
}
