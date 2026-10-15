'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/src/components/ui/button';
import { formatMoney, localDate } from '@/src/lib/money';
import { useFinance } from './use-finance';
import { FinanceForm, type FormMode } from './finance-form';
import { ResourcePanels } from './resource-panels';
import { TransactionHistory } from './transaction-history';
const tabs = ['Resumo', 'Contas', 'Movimentações', 'Categorias', 'Cartões', 'Dívidas', 'Previsões'];
const formModes: Record<string, FormMode> = { Contas: 'account', Categorias: 'category', Cartões: 'card', Dívidas: 'debt' };
const addLabels: Record<string, string> = { Contas: 'Nova conta', Categorias: 'Nova categoria', Cartões: 'Novo cartão', Dívidas: 'Nova dívida' };
export function FinancialDashboard({ spaceId }: { spaceId: string }) {
  const [tab, setTab] = useState('Resumo');
  const [form, setForm] = useState<FormMode | null>(null);
  const [page, setPage] = useState(0);
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const { data, error, loading, load } = useFinance(spaceId, page, month);
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5"><div><h1 className="text-2xl font-bold tracking-tight">Seu controle financeiro</h1><p className="mt-1 text-sm text-zinc-400">Contas, compromissos e próximos passos do espaço ativo.</p></div><Link href="/dashboard/spaces" className="text-sm text-emerald-400 underline underline-offset-4">Gerenciar espaços</Link></header>
    {!spaceId ? <p role="status" className="text-sm text-zinc-300">Selecione ou <Link href="/onboarding" className="text-emerald-400 underline">configure seu espaço</Link> para começar.</p> : <>
      <nav aria-label="Seções financeiras" className="flex flex-wrap gap-2">{tabs.map(item => <button key={item} onClick={() => { setTab(item); setForm(null); }} aria-current={tab === item ? 'page' : undefined} className={`rounded-lg border px-3 py-2 text-sm focus-visible:outline-emerald-400 ${tab === item ? 'border-emerald-600 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 text-zinc-300 hover:bg-zinc-900'}`}>{item}</button>)}</nav>
      {loading && <div role="status" aria-busy="true" className="space-y-3"><p className="text-sm text-zinc-400">Carregando finanças…</p><div className="h-24 animate-pulse rounded-xl bg-zinc-900" /></div>}
      {error && <div role="alert" className="space-y-3 rounded-lg border border-rose-900 p-4"><p className="text-sm text-rose-300">Não foi possível carregar: {error}</p><Button variant="outline" onClick={() => void load()}>Tentar novamente</Button></div>}
      {data && <>
        <div className="flex flex-wrap gap-2"><Button onClick={() => setForm(formModes[tab] || 'transaction')}>{addLabels[tab] || 'Nova movimentação'}</Button>{!data.accounts.length && tab !== 'Contas' && <Button variant="outline" onClick={() => setForm('account')}>Cadastrar conta</Button>}</div>
        {form && <FinanceForm key={form} mode={form} spaceId={spaceId} data={data} onSaved={load} onClose={() => setForm(null)} />}
        {tab === 'Resumo' && <>
          <section aria-label="Resumo financeiro" className="grid gap-4 sm:grid-cols-3">{[
            ['Saldo em contas', data.summary.balance_cents, 'Valores efetivados'],
            ['Receitas do mês', data.summary.income_cents, 'Até hoje'],
            ['Despesas do mês', data.summary.expense_cents, 'Inclui compras no cartão e pagamentos de dívidas'],
          ].map(([label, cents, hint]) => <article key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"><h2 className="text-sm text-zinc-300">{label}</h2><p className="mt-3 text-2xl font-semibold tabular-nums">{formatMoney(Number(cents))}</p><p className="mt-2 text-xs text-zinc-400">{hint}</p></article>)}</section>
          <ResourcePanels tab="Previsões" data={data} />
        </>}
        {(tab === 'Resumo' || tab === 'Movimentações') ? <TransactionHistory data={data} spaceId={spaceId} reload={load} page={page} setPage={setPage} month={month} setMonth={setMonth} /> : <ResourcePanels tab={tab} data={data} />}
      </>}
    </>}
  </div>;
}
