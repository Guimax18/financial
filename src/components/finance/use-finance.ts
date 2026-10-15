'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/src/lib/supabase-browser';
import { localDate } from '@/src/lib/money';
import type { accounts, cards, debts, categories, transactions } from '@/src/types/supabase';

export type Account = accounts & { balance_cents: number };
export type Card = cards & { owed_cents: number };
export type Debt = debts & { remaining_cents: number };
export type Summary = { balance_cents: number; income_cents: number; expense_cents: number; pending_cash_cents: number };
export type FinanceData = { accounts: Account[]; cards: Card[]; debts: Debt[]; categories: categories[]; transactions: transactions[]; total: number; summary: Summary };
export function useFinance(spaceId: string, page: number, month: string) {
  const client = createClient();
  const [data, setData] = useState<FinanceData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setError('');
    setData(null);
    if (!spaceId) return;
    setLoading(true);
    try {
      let history = client.from('transactions').select('*', { count: 'exact' }).eq('space_id', spaceId);
      if (month) {
        const [year, m] = month.split('-').map(Number);
        const last = new Date(year, m, 0).getDate();
        history = history.gte('occurred_on', `${month}-01`).lte('occurred_on', `${month}-${last}`);
      }
      const result = await Promise.all([
        client.from('account_balances').select('*').eq('space_id', spaceId).order('name').limit(1000),
        client.from('card_balances').select('*').eq('space_id', spaceId).order('name').limit(1000),
        client.from('debt_balances').select('*').eq('space_id', spaceId).order('due_date').limit(1000),
        client.from('categories').select('*').eq('space_id', spaceId).order('name').limit(1000),
        history.order('occurred_on', { ascending: false }).order('id').range(page * 25, page * 25 + 24),
        client.rpc('finance_summary', { p_space_id: spaceId, p_as_of: localDate() }),
      ]);
      for (const response of result) if (response.error) throw new Error(response.error.message);
      if (current !== generation.current) return;
      setData({ accounts: result[0].data!, cards: result[1].data!, debts: result[2].data!, categories: result[3].data!, transactions: result[4].data!, total: result[4].count ?? 0, summary: result[5].data as Summary });
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error ? e.message : 'Falha ao carregar finanças.');
    } finally { if (current === generation.current) setLoading(false); }
  }, [client, spaceId, page, month]);
  const invalidate = useCallback(() => { generation.current += 1; }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; invalidate(); };
  }, [load, invalidate]);
  return { data, error, loading, load };
}
