import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Exercise the real SDK and database mapping with an intercepted transport.
// This test must never send a request to the production Supabase project.
test('Supabase: grava série completa, preserva campos e propaga falhas sem fallback local', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'mco-supabase-test-'));
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  const storage = new Map([['mco_db_has_status', 'false'], ['mco_db_has_tipo_receita', 'false'], ['mco_db_has_tipo_despesa', 'false']]);
  globalThis.window = {};
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  let requests = [];
  let fail = false;
  try {
    await build({ entryPoints: ['src/lib/supabase.ts'], outfile: path.join(temp, 'adapter.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://mco-test.invalid', VITE_SUPABASE_ANON_KEY: 'test-public-key' }) } });
    // Keep package resolution rooted in this project while loading the temporary bundle.
    const { readFile } = await import('node:fs/promises');
    let source = await readFile(path.join(temp, 'adapter.mjs'), 'utf8');
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    source = source.replaceAll('"@supabase/supabase-js"', JSON.stringify(pathToFileURL(require.resolve('@supabase/supabase-js', { conditions: ['import'] })).href));
    globalThis.fetch = async (url, options) => {
      assert.equal(new URL(url).host, 'mco-test.invalid');
      const rows = JSON.parse(options.body); requests.push(rows);
      return new Response(JSON.stringify(fail ? { message: 'erro simulado', code: '42501' } : rows), { status: fail ? 403 : 201, headers: { 'Content-Type': 'application/json' } });
    };
    const adapter = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    const items = ['2026-11-10', '2026-12-10', '2027-01-10'].map(date => ({ title: 'Teste', type: 'entrada', amount: 500, category: 'Serviços › Contrato', paymentMethod: 'Pix', date, dueDate: date, status: 'pendente', accountType: 'empresarial', revenueType: 'fixa', recurrenceId: 'serie-teste', recurrenceFrequency: 'mensal', recurrenceDay: 10, recurrenceStartDate: '2026-11-10', recurrenceEndDate: '2027-01-10' }));
    const saved = await adapter.insertTransactionBatch('usuario-teste', items);
    assert.equal(requests.length, 1); assert.equal(requests[0].length, 3);
    assert.equal(new Set(saved.map(item => item.id)).size, 3);
    assert.deepEqual(saved.map(item => item.dueDate), items.map(item => item.date));
    for (const row of requests[0]) { assert.equal(row.user_id, 'usuario-teste'); assert.equal(row.categoria, 'Serviços › Contrato'); assert.equal(row.tipo_receita, 'fixa'); assert.equal(row.status, 'pendente'); assert.equal(row.recorrencia_id, 'serie-teste'); }
    assert.ok(saved.every(item => item.status === 'pendente' && item.revenueType === 'fixa'));
    fail = true;
    await assert.rejects(adapter.insertTransactionBatch('usuario-teste', items), /erro simulado/);
    await assert.rejects(adapter.insertTransactionBatch('local', items), /login/);
    await assert.rejects(adapter.insertTransactionBatch('usuario-teste', []), /120/);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.localStorage = originalStorage;
    await rm(temp, { recursive: true, force: true });
  }
});


