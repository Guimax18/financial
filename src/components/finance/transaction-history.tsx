'use client';
import { useState } from 'react';
import { createClient } from '@/src/lib/supabase-browser';
import { formatMoney, localDate } from '@/src/lib/money';
import { Button } from '@/src/components/ui/button';
import type { FinanceData } from './use-finance';
import { kindLabels } from './finance-form';
import { Empty } from './resource-panels';
const statusLabels = { pending: 'Previsto', posted: 'Efetivado', cancelled: 'Cancelado' };
export function TransactionHistory({ data, spaceId, reload, page, setPage, month, setMonth }: { data: FinanceData; spaceId: string; reload: () => Promise<void>; page: number; setPage: (page: number) => void; month: string; setMonth: (month: string) => void }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function changeStatus(id: string, status: 'posted' | 'cancelled') {
    if (status === 'cancelled' && !window.confirm('Cancelar esta movimentação? Ela deixará de compor os saldos.')) return;
    setBusy(id); setError('');
    try {
      const result = await createClient().from('transactions').update({ status }).eq('space_id', spaceId).eq('id', id).select('id');
      if (result.error) throw new Error(result.error.message);
      if (!result.data?.length) throw new Error('A movimentação não está mais disponível.');
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao atualizar.'); }
    finally { setBusy(''); }
  }
  return <section aria-labelledby="history-title" className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="history-title" className="text-lg font-semibold">Movimentações</h2><label className="text-sm text-zinc-300">Filtrar mês<input type="month" value={month} onChange={e => { setPage(0); setMonth(e.target.value); }} className="ml-2 rounded-lg border border-zinc-700 bg-zinc-900 p-2" /></label><Button variant="ghost" onClick={() => { setMonth(''); setPage(0); }}>Todos os meses</Button></div>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    {!data.transactions.length ? <Empty text="Nenhuma movimentação neste período. Registre uma receita, despesa ou previsão." /> : <div className="overflow-x-auto rounded-xl border border-zinc-800"><table className="w-full text-left text-sm"><caption className="sr-only">Histórico financeiro do espaço ativo</caption><thead className="bg-zinc-900 text-xs text-zinc-400"><tr>{['Data / descrição', 'Tipo / conta', 'Valor', 'Situação', 'Ações'].map(label => <th key={label} scope="col" className="whitespace-nowrap p-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800">{data.transactions.map(tx => <tr key={tx.id} className={tx.status === 'cancelled' ? 'text-zinc-400' : ''}>
      <td className="p-3"><span className="block whitespace-nowrap text-xs text-zinc-400">{tx.occurred_on.split('-').reverse().join('/')}</span><span className="block min-w-36 max-w-64 break-words">{tx.description}</span></td>
      <td className="p-3"><span className="block whitespace-nowrap">{kindLabels[tx.kind]}</span><span className="text-xs text-zinc-400">{data.accounts.find(a => a.id === tx.account_id)?.name || data.cards.find(c => c.id === tx.card_id)?.name}{tx.to_account_id && ` → ${data.accounts.find(a => a.id === tx.to_account_id)?.name}`}</span></td>
      <td className="whitespace-nowrap p-3 tabular-nums">{formatMoney(tx.amount_cents)}</td><td className="p-3">{statusLabels[tx.status]}</td>
      <td className="p-3"><div className="flex gap-2">{tx.status === 'pending' && tx.occurred_on <= localDate() && <Button size="sm" disabled={!!busy} onClick={() => void changeStatus(tx.id, 'posted')}>Efetivar</Button>}{tx.status !== 'cancelled' && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void changeStatus(tx.id, 'cancelled')}>Cancelar</Button>}</div></td>
    </tr>)}</tbody></table></div>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-zinc-400">{data.total} movimentações · página {page + 1} de {Math.max(1, Math.ceil(data.total / 25))}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button><Button size="sm" variant="outline" disabled={(page + 1) * 25 >= data.total} onClick={() => setPage(page + 1)}>Próxima</Button></div></div>
  </section>;
}
