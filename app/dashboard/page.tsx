'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Visão Geral</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Acompanhe o resumo financeiro consolidado do seu espaço ativo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/spaces">
            <Button variant="outline" size="sm">
              Gerenciar Espaços
            </Button>
          </Link>
          <Button size="sm">
            + Nova Movimentação
          </Button>
        </div>
      </div>

      {/* Metric Cards - Real empty state: 0,00 without mock values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Saldo em Contas</span>
              <span className="text-emerald-400 text-sm">💳</span>
            </div>
            <CardTitle className="text-2xl font-bold text-white mt-2">R$ 0,00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Nenhuma conta bancária vinculada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Receitas do Mês</span>
              <span className="text-emerald-400 text-sm">📈</span>
            </div>
            <CardTitle className="text-2xl font-bold text-white mt-2">R$ 0,00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Nenhuma receita registrada este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Despesas do Mês</span>
              <span className="text-rose-400 text-sm">📉</span>
            </div>
            <CardTitle className="text-2xl font-bold text-white mt-2">R$ 0,00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Nenhum gasto registrado este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty States Section - Modern, informative and without fake transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contas Bancárias Empty State */}
        <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed border-zinc-800">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-xl mb-3">
            🏦
          </div>
          <h3 className="text-base font-semibold text-white">Nenhuma conta cadastrada</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4">
            Cadastre suas contas correntes, poupanças ou carteiras para acompanhar seu saldo real.
          </p>
          <Button variant="outline" size="sm" disabled>
            Adicionar Conta (Fase 2)
          </Button>
        </Card>

        {/* Movimentações Recentes Empty State */}
        <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed border-zinc-800">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-xl mb-3">
            📄
          </div>
          <h3 className="text-base font-semibold text-white">Sem movimentações recentes</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4">
            Seus lançamentos de receitas e despesas serão listados aqui assim que forem adicionados.
          </p>
          <Button variant="outline" size="sm" disabled>
            Novo Lançamento (Fase 2)
          </Button>
        </Card>
      </div>

      {/* Objetivos Financeiros Empty State */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
              🎯
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Metas & Objetivos Financeiros</h4>
              <p className="text-xs text-zinc-400">Planeje reservas de emergência ou compras futuras em conjunto.</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" disabled>
            Criar Meta (Fase 2)
          </Button>
        </div>
      </Card>
    </div>
  );
}
