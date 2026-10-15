'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/src/lib/supabase-browser';
import { localDate, parseCents } from '@/src/lib/money';
import { Button } from '@/src/components/ui/button';
import type { transactions } from '@/src/types/supabase';
import type { FinanceData } from './use-finance';

export type FormMode = 'account' | 'category' | 'card' | 'debt' | 'transaction';
const inputClass = 'mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-emerald-500';
const titles = { account: 'Nova conta', category: 'Nova categoria', card: 'Novo cartão', debt: 'Nova dívida', transaction: 'Nova movimentação' };
export const kindLabels = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência', card_payment: 'Pagamento de cartão', debt_payment: 'Pagamento de dívida' };

function Field({ label, name, type = 'text', value, min, max }: { label: string; name: string; type?: string; value?: string; min?: number; max?: number }) {
  return <label className="block text-sm text-zinc-300">{label}<input className={inputClass} name={name} type={type} defaultValue={value} required min={min} max={max} maxLength={type === 'text' ? 200 : undefined} inputMode={name.includes('amount') ? 'decimal' : undefined} /></label>;
}
function Select({ label, name, options, optional = false }: { label: string; name: string; options: { id: string; name: string }[]; optional?: boolean }) {
  return <label className="block text-sm text-zinc-300">{label}<select aria-label={label} className={inputClass} name={name} required={!optional} defaultValue="">
    <option value="">{optional ? 'Sem categoria' : 'Selecione'}</option>
    {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
  </select></label>;
}
export function FinanceForm({ mode, spaceId, data, onSaved, onClose }: { mode: FormMode; spaceId: string; data: FinanceData; onSaved: () => Promise<void>; onClose: () => void }) {
  const [kind, setKind] = useState<transactions['kind']>('expense');
  const [source, setSource] = useState('account');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestKey = useRef<string | null>(null);
  const inFlight = useRef(false);
  const client = createClient();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) || '').trim();
    try {
      let failure: { message: string } | null = null;
      if (mode === 'account') {
        const result = await client.from('accounts').insert({ space_id: spaceId, name: text('name'), opening_cents: parseCents(text('amount')) }); failure = result.error;
      } else if (mode === 'category') {
        const result = await client.from('categories').insert({ space_id: spaceId, name: text('name'), kind: text('category_kind') as 'income' | 'expense' }); failure = result.error;
      } else if (mode === 'card') {
        const result = await client.from('cards').insert({ space_id: spaceId, name: text('name'), limit_cents: parseCents(text('amount')), closing_day: Number(text('closing_day')), due_day: Number(text('due_day')) }); failure = result.error;
      } else if (mode === 'debt') {
        const result = await client.from('debts').insert({ space_id: spaceId, name: text('name'), principal_cents: parseCents(text('amount')), due_date: text('date') }); failure = result.error;
      } else {
        requestKey.current ??= crypto.randomUUID();
        const amount = parseCents(text('amount'));
        if (amount <= 0) throw new Error('Informe um valor maior que zero.');
        const payload = {
          space_id: spaceId, request_key: requestKey.current, description: text('name'), kind, amount_cents: amount,
          occurred_on: text('date'), status: text('status') as transactions['status'],
          account_id: text('account_id') || null, to_account_id: text('to_account_id') || null,
          card_id: text('card_id') || null, debt_id: text('debt_id') || null, category_id: text('category_id') || null,
        };
        const result = await client.from('transactions').insert(payload);
        failure = result.error;
        // A retry after an ambiguous connection failure must not duplicate a movement.
        if (result.error?.code === '23505') {
          const existing = await client.from('transactions').select('*').eq('space_id', spaceId).eq('request_key', requestKey.current).maybeSingle();
          if (existing.data && !existing.error) {
            const saved = existing.data;
            if (!Object.entries(payload).every(([key, value]) => saved[key as keyof typeof payload] === value)) {
              throw new Error('Uma tentativa anterior já foi salva com outros dados. Feche o formulário e confira o histórico antes de continuar.');
            }
            failure = null;
          }
        }
      }
      if (failure) throw new Error(failure.message);
      onClose(); await onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const cashAccount = kind !== 'expense' || source === 'account';
  return <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 sm:p-6" aria-labelledby="finance-form-title">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 id="finance-form-title" className="text-lg font-semibold">{titles[mode]}</h2><Button variant="ghost" onClick={onClose} disabled={busy}>Fechar</Button></div>
    {error && <p role="alert" className="mb-4 text-sm text-rose-300">{error}</p>}
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label={mode === 'transaction' ? 'Descrição' : 'Nome'} name="name" />
      {mode !== 'category' && <Field label={mode === 'account' ? 'Saldo inicial (R$)' : mode === 'card' ? 'Limite (R$)' : mode === 'debt' ? 'Saldo devedor inicial (R$)' : 'Valor (R$)'} name="amount" value={mode === 'account' ? '0,00' : undefined} />}
      {mode === 'category' && <label className="text-sm">Tipo<select className={inputClass} name="category_kind"><option value="expense">Despesa</option><option value="income">Receita</option></select></label>}
      {mode === 'card' && <><Field label="Dia do fechamento (1–28)" name="closing_day" type="number" min={1} max={28} /><Field label="Dia do vencimento (1–28)" name="due_day" type="number" min={1} max={28} /></>}
      {mode === 'debt' && <Field label="Vencimento" name="date" type="date" value={localDate()} />}
      {mode === 'transaction' && <>
        <label className="text-sm">Tipo<select className={inputClass} value={kind} onChange={e => setKind(e.target.value as transactions['kind'])}>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <Field label="Data" name="date" type="date" value={localDate()} />
        <label className="text-sm">Situação<select className={inputClass} name="status"><option value="posted">Efetivado</option><option value="pending">Previsto</option></select></label>
        {kind === 'expense' && <label className="text-sm">Forma de pagamento<select className={inputClass} value={source} onChange={e => setSource(e.target.value)}><option value="account">Conta / carteira</option><option value="card">Cartão de crédito</option></select></label>}
        {cashAccount && <Select label={kind === 'transfer' ? 'Conta de origem' : 'Conta'} name="account_id" options={data.accounts} />}
        {kind === 'transfer' && <Select label="Conta de destino" name="to_account_id" options={data.accounts} />}
        {(kind === 'card_payment' || (kind === 'expense' && source === 'card')) && <Select label="Cartão" name="card_id" options={data.cards} />}
        {kind === 'debt_payment' && <Select label="Dívida" name="debt_id" options={data.debts} />}
        {(kind === 'income' || kind === 'expense') && <Select key={kind} label="Categoria" name="category_id" options={data.categories.filter(c => c.kind === kind)} optional />}
        <p className="text-xs text-zinc-400 sm:col-span-2">Use “Previsto” para datas futuras. Transferências ficam dentro do espaço ativo. Para corrigir um lançamento, cancele e registre novamente.</p>
      </>}
      <div className="sm:col-span-2"><Button type="submit" isLoading={busy}>Salvar {mode === 'transaction' ? 'movimentação' : 'cadastro'}</Button></div>
    </form>
  </section>;
}
