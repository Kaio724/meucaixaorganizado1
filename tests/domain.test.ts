import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryLabel, categoryMatches, categoryRoot, orderedCategoryLabels, validateCategory, groupCategoryTotals, categorySelection, type CategoryNode } from '../src/lib/categoryHierarchy.ts';
import { calculateMonthlyFinancialMetrics, getTransactionDueStatus, getTodayDateStr } from '../src/lib/financialMath.ts';
import { generateRevenueDates, buildRecurringExpenseTransactions } from '../src/lib/revenueRecurrence.ts';
import type { Transaction } from '../src/types.ts';

const root: CategoryNode = { id: 'loja', name: 'Loja', type: 'saida' };
const child: CategoryNode = { id: 'energia', name: 'Energia', type: 'saida', parentId: 'loja' };
test('Seletores mostram apenas principais no primeiro campo e filhos do pai no segundo', () => {
  const selection = categorySelection(['Loja', 'Loja › Energia', 'Loja › Água', 'Casa', 'Casa › Energia'], 'Loja › Energia');
  assert.deepEqual(selection.roots, ['Loja', 'Casa']);
  assert.deepEqual(selection.children.map(item => item.name), ['Energia', 'Água']);
  assert.equal(selection.child, 'Loja › Energia');
});
test('Trocar a categoria principal elimina a seleção da subcategoria anterior', () => {
  const selection = categorySelection(['Loja', 'Loja › Energia', 'Transporte'], 'Transporte');
  assert.equal(selection.parent, 'Transporte');
  assert.equal(selection.child, '');
  assert.deepEqual(selection.children, []);
});
test('Edição mantém categoria e subcategoria históricas disponíveis', () => {
  const selection = categorySelection(['Outros'], 'Categoria antiga › Detalhe');
  assert.ok(selection.roots.includes('Categoria antiga'));
  assert.equal(selection.children[0].value, 'Categoria antiga › Detalhe');
});
test('Categoria e subcategoria mantêm o caminho completo', () => { assert.equal(categoryLabel(child, [root, child]), 'Loja › Energia'); assert.equal(categoryRoot('Loja › Energia'), 'Loja'); });
test('Filtro do grupo inclui filhos sem misturar nomes parecidos', () => { assert.ok(categoryMatches('Loja › Energia', 'Loja')); assert.ok(categoryMatches('Loja', 'Loja')); assert.ok(!categoryMatches('Loja 2 › Energia', 'Loja')); assert.ok(!categoryMatches('Loja › Água', 'Loja › Energia')); });
test('Seleção ordena cada subcategoria junto ao pai', () => { assert.deepEqual(orderedCategoryLabels([child, root, { id: 'r', name: 'Vendas', type: 'entrada' }], 'saida'), ['Loja', 'Loja › Energia']); });
test('Duplicata no mesmo pai ignora maiúsculas e espaços externos', () => { assert.match(validateCategory({ ...child, id: 'other', name: ' energia ' }, [root, child])!, /Já existe/); });
test('Mesmo nome é permitido em grupos e tipos diferentes', () => { const other: CategoryNode = { id: 'casa', name: 'Casa', type: 'saida' }; assert.equal(validateCategory({ ...child, id: 'other', parentId: 'casa' }, [root, child, other]), null); assert.equal(validateCategory({ id: 'r', name: 'Loja', type: 'entrada' }, [root]), null); });
test('Bloqueia pai inexistente, autorreferência e terceiro nível', () => { assert.ok(validateCategory({ ...child, parentId: 'missing' }, [root])); assert.ok(validateCategory({ ...root, parentId: root.id }, [root])); assert.ok(validateCategory({ id: 'x', name: 'Terceiro nível', type: 'saida', parentId: child.id }, [root, child])); });
test('Bloqueia mover um grupo com filhos para dentro de outro', () => { const other: CategoryNode = { id: 'casa', name: 'Casa', type: 'saida' }; assert.ok(validateCategory({ ...root, parentId: other.id }, [root, child, other])); });
test('Receita não pode ser filha de despesa', () => { assert.match(validateCategory({ ...child, type: 'entrada' }, [root])!, /mesmo tipo/); });
test('Nomes vazios, longos e com separador reservado são rejeitados', () => { for (const name of ['', ' ', 'x'.repeat(41), 'Loja › Energia']) assert.ok(validateCategory({ ...root, name }, [])); });
test('Editar a própria categoria sem mudar nome não gera duplicata', () => { assert.equal(validateCategory(child, [root, child]), null); });
test('Resumo soma o pai uma vez e detalha filhos sem duplicar valores', () => { const groups = groupCategoryTotals([{ category: 'Loja › Energia', amount: 25 }, { category: 'Loja › Água', amount: 10 }, { category: 'Loja', amount: 5 }, { category: 'Loja › Energia', amount: 3 }, { category: 'Transporte', amount: 7 }]); assert.deepEqual(groups.Loja, { total: 43, children: { Energia: 28, Água: 10 } }); assert.equal(Object.values(groups).reduce((sum, item) => sum + item.total, 0), 50); });
const tx = (id: string, extra: Partial<Transaction>): Transaction => ({ id, title: id, type: 'entrada', amount: 100, date: '2026-11-06', category: 'Vendas', paymentMethod: 'Pix', accountType: 'empresarial', status: 'realizado', ...extra });
test('Métricas separam realizado, previsto, cancelado e pagamento parcial', () => { const metrics = calculateMonthlyFinancialMetrics([tx('receipt', {}), tx('expense', { type: 'saida', amount: 40, amountPaid: 30 }), tx('pending', { type: 'saida', amount: 20, status: 'pendente' }), tx('cancelled', { amount: 900, status: 'cancelado' })], 2026, 10); assert.equal(metrics.entradasRealizadas, 100); assert.equal(metrics.saidasRealizadas, 30); assert.equal(metrics.realizadasCount, 2); assert.equal(metrics.pendentesCount, 1); });
test('Métricas usam data efetiva para caixa e vencimento para previsão', () => { const metrics = calculateMonthlyFinancialMetrics([tx('paid', { date: '2026-10-01', effectiveDate: '2026-11-06', amountPaid: 75 }), tx('pending', { date: '2026-10-01', dueDate: '2026-11-20', status: 'pendente', amount: 30 })], 2026, 10); assert.equal(metrics.entradasRealizadas, 75); assert.equal(metrics.pendentesCount, 1); });
test('Status distingue atraso, hoje, futuro e cancelamento', () => { assert.equal(getTransactionDueStatus(tx('a', { status: 'pendente', dueDate: '2026-11-05' }), '2026-11-06'), 'atrasado'); assert.equal(getTransactionDueStatus(tx('b', { status: 'pendente' }), '2026-11-06'), 'vence_hoje'); assert.equal(getTransactionDueStatus(tx('c', { status: 'pendente', dueDate: '2026-11-07' }), '2026-11-06'), 'a_vencer'); assert.equal(getTransactionDueStatus(tx('d', { status: 'cancelado' }), '2026-11-06'), 'cancelado'); });
test('Recorrência mensal ajusta dia 31 em fevereiro sem pular meses', () => { assert.deepEqual(generateRevenueDates('2028-01-31', 'mensal', 31, '2028-03-31'), ['2028-01-31', '2028-02-29', '2028-03-31']); });
test('Recorrência de despesa preserva subcategoria e conta em cada parcela', () => { const items = buildRecurringExpenseTransactions({ title: 'Energia', amount: 25, category: 'Loja › Energia', paymentMethod: 'Pix', accountType: 'empresarial', frequency: 'mensal', day: 10, startDate: '2026-11-10', endDate: '2027-01-10' }); assert.equal(items.length, 3); for (const item of items) { assert.equal(item.category, 'Loja › Energia'); assert.equal(item.status, 'pendente'); assert.equal(item.expenseType, 'fixa'); assert.equal(item.accountType, 'empresarial'); } });
test('Data local retorna um dia válido no formato ISO', () => { assert.match(getTodayDateStr(), /^\d{4}-\d{2}-\d{2}$/); });
test('À noite no Brasil, a data não avança junto com o UTC', context => {
  context.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-07T01:15:00Z') });
  assert.equal(getTodayDateStr(), '2026-11-06');
});

import { buildMonthlyForecasts } from '../src/lib/monthlyForecasts.ts';
test('Receita fixa aparece de novembro a janeiro como previsão sem afetar caixa', () => {
  const items = buildMonthlyForecasts(tx('base', { dueDate: '2026-11-10', amount: 500 }), '2027-01-10');
  assert.deepEqual(items.map(item => item.dueDate), ['2026-11-10', '2026-12-10', '2027-01-10']);
  assert.equal(new Set(items.map(item => item.recurrenceId)).size, 1);
  for (const item of items) { assert.equal(item.status, 'pendente'); assert.equal(item.revenueType, 'fixa'); }
  const saved = items.map((item, index) => ({ ...item, id: String(index) }));
  for (const [year, month] of [[2026, 10], [2026, 11], [2027, 0]]) {
    const metrics = calculateMonthlyFinancialMetrics(saved, year, month);
    assert.equal(metrics.pendentesCount, 1); assert.equal(metrics.entradasRealizadas, 0);
  }
});
test('Receber a primeira parcela mantém as futuras pendentes', () => {
  const items = buildMonthlyForecasts(tx('base', { dueDate: '2026-11-10' }), '2027-01-10', false);
  assert.equal(items[0].status, 'realizado'); assert.equal(items[0].amountPaid, 100);
  assert.ok(items.slice(1).every(item => item.status === 'pendente' && !item.effectiveDate && !item.amountPaid));
});
test('Previsão mensal preserva subcategoria e ajusta fevereiro', () => {
  const items = buildMonthlyForecasts(tx('base', { type: 'saida', dueDate: '2028-01-31', category: 'Loja › Energia' }), '2028-03-31');
  assert.deepEqual(items.map(item => item.dueDate), ['2028-01-31', '2028-02-29', '2028-03-31']);
  assert.ok(items.every(item => item.expenseType === 'fixa' && item.category === 'Loja › Energia'));
});
test('Previsão rejeita datas inválidas, fim anterior, valor inválido e mais de 120 parcelas', () => {
  const base = tx('base', { dueDate: '2026-11-10' });
  for (const end of ['', '2026-11-09', '2027-02-30', '2036-11-10']) assert.throws(() => buildMonthlyForecasts(base, end));
  assert.throws(() => buildMonthlyForecasts({ ...base, amount: 0 }, '2027-01-10'));
  assert.equal(buildMonthlyForecasts(base, '2026-11-10').length, 1);
  assert.equal(buildMonthlyForecasts(base, '2036-10-10').length, 120);
});
