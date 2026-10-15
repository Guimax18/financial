'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase-browser';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/card';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = React.useState<1 | 2>(1);
  const [personalSpaceName, setPersonalSpaceName] = React.useState('Meu Controle Pessoal');
  const [familySpaceName, setFamilySpaceName] = React.useState('Controle da Família');
  const [createFamily, setCreateFamily] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCreateSpaces = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user already has a personal space
      const { data: existingMemberships } = await supabase
        .from('space_members')
        .select('space_id')
        .eq('user_id', user.id);

      if (!existingMemberships || existingMemberships.length === 0) {
        // Try calling the atomic RPC function
        const { error: rpcError } = await supabase.rpc('create_space_with_owner', {
          p_name: personalSpaceName || 'Meu Espaço Pessoal',
          p_type: 'personal',
        });

        // Fallback: If RPC not yet applied, direct insert via client
        if (rpcError) {
          const { data: spaceData, error: insertError } = await supabase
            .from('spaces')
            .insert({
              owner_id: user.id,
              name: personalSpaceName || 'Meu Espaço Pessoal',
              type: 'personal',
            })
            .select('id')
            .single();

          if (!insertError && spaceData) {
            await supabase.from('space_members').insert({
              space_id: spaceData.id,
              user_id: user.id,
              role: 'owner',
            });
          }
        }

        // Create family space if selected
        if (createFamily && familySpaceName.trim()) {
          const { error: familyRpcError } = await supabase.rpc('create_space_with_owner', {
            p_name: familySpaceName,
            p_type: 'family',
          });

          if (familyRpcError) {
            const { data: familyData, error: familyInsertError } = await supabase
              .from('spaces')
              .insert({
                owner_id: user.id,
                name: familySpaceName,
                type: 'family',
              })
              .select('id')
              .single();

            if (!familyInsertError && familyData) {
              await supabase.from('space_members').insert({
                space_id: familyData.id,
                user_id: user.id,
                role: 'owner',
              });
            }
          }
        }
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao concluir configuração inicial');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xl mb-3">
            ✨
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Boas-vindas ao Nosso Controle!</h1>
          <p className="text-sm text-zinc-400 mt-1">Vamos preparar os seus espaços financeiros seguros</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{step === 1 ? '1. Espaço Pessoal' : '2. Espaço Familiar / Casal'}</CardTitle>
              <span className="text-xs text-zinc-500 font-medium">Passo {step} de 2</span>
            </div>
            <CardDescription>
              {step === 1
                ? 'Seu espaço individual e 100% privado para finanças pessoais'
                : 'Deseja também criar um espaço compartilhado para dividir gastos?'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>🔒</span> Espaço Privado
                  </div>
                  <p className="text-xs text-zinc-400">
                    Apenas você tem acesso às contas e transações cadastradas neste espaço.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Nome do Espaço</label>
                  <Input
                    value={personalSpaceName}
                    onChange={(e) => setPersonalSpaceName(e.target.value)}
                    placeholder="Ex: Minhas Finanças"
                  />
                </div>

                <Button className="w-full mt-4" onClick={() => setStep(2)}>
                  Continuar
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createFamily}
                      onChange={(e) => setCreateFamily(e.target.checked)}
                      className="mt-1 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30"
                    />
                    <div>
                      <span className="text-sm font-semibold text-white">Criar espaço familiar ou para casal</span>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Permite convidar seu parceiro(a) ou familiares para gerenciar orçamentos compartilhados.
                      </p>
                    </div>
                  </label>
                </div>

                {createFamily && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-xs font-medium text-zinc-300">Nome do Espaço Familiar</label>
                    <Input
                      value={familySpaceName}
                      onChange={(e) => setFamilySpaceName(e.target.value)}
                      placeholder="Ex: Finanças do Casal"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} disabled={isLoading} className="w-1/3">
                    Voltar
                  </Button>
                  <Button onClick={handleCreateSpaces} isLoading={isLoading} className="w-2/3">
                    Concluir e Ir ao Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
