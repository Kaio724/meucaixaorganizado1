export default function SubcategoryBreakdown({ childrenTotals }: { childrenTotals: Record<string, number> }) {
  if (!Object.keys(childrenTotals).length) return null;
  return <ul className="mt-1 space-y-1 border-l border-primary/30 pl-3 text-xs text-on-surface-variant" aria-label="Detalhamento por subcategoria">{Object.entries(childrenTotals).sort((a, b) => b[1] - a[1]).map(([name, amount]) => <li key={name} className="flex justify-between gap-3"><span className="break-words">{name}</span><span className="shrink-0">{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></li>)}</ul>;
}
