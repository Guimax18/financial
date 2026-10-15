'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase-browser';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const supabase = createClient();

  const [isLoading, setIsLoading] = React.useState(false);
  const [currentUserEmail, setCurrentUserEmail] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });

  React.useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserEmail(user.email || null);
      }
    }
    checkAuth();
  }, [supabase]);

  const handleAcceptInvite = async () => {
    if (!token) {
      setStatus({ type: 'error', message: 'Token de convite não encontrado na URL.' });
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirectTo=/invite?token=${token}`);
        return;
      }

      // Compute SHA-256 hash of the incoming raw token
      const encoder = new TextEncoder();
      const tokenBuffer = encoder.encode(token);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', tokenBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // Try secure RPC function first
      const { error: rpcError } = await supabase.rpc('accept_invitation_secure', {
        p_token_hash: tokenHash,
      });

      if (rpcError) {
        // Fallback: Client-side validation if RPC not yet deployed
        const { data: invite, error: fetchError } = await supabase
          .from('space_invitations')
          .select('*')
          .eq('token_hash', tokenHash)
          .eq('status', 'pending')
          .single();

        if (fetchError || !invite) {
          throw new Error('Convite inválido, já utilizado ou expirado.');
        }

        if (new Date(invite.expires_at) < new Date()) {
          throw new Error('Este convite expirou.');
        }

        if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
          throw new Error(`Este convite foi enviado exclusivamente para ${invite.email}. Você está autenticado como ${user.email}.`);
        }

        // Add user as member
        await supabase.from('space_members').insert({
          space_id: invite.space_id,
          user_id: user.id,
          role: 'member',
        });

        // Mark invitation as accepted
        await supabase
          .from('space_invitations')
          .update({ status: 'accepted' })
          .eq('id', invite.id);
      }

      setStatus({ type: 'success', message: 'Convite aceito com sucesso! Você agora é membro deste espaço.' });
    } catch (err: unknown) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao processar aceite do convite.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar no Espaço Compartilhado</CardTitle>
        <CardDescription>
          Ao aceitar, você poderá visualizar e colaborar no planejamento deste espaço
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.type === 'error' && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {status.message}
          </div>
        )}

        {status.type === 'success' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              {status.message}
            </div>
            <Link href="/dashboard" className="block w-full">
              <Button className="w-full">Ir para o Dashboard</Button>
            </Link>
          </div>
        ) : (
          <>
            {currentUserEmail ? (
              <p className="text-xs text-zinc-400">
                Você está autenticado como <span className="text-white font-medium">{currentUserEmail}</span>.
              </p>
            ) : (
              <p className="text-xs text-zinc-400">
                Você precisará fazer login ou se cadastrar com o mesmo e-mail para o qual o convite foi enviado.
              </p>
            )}

            <Button
              onClick={handleAcceptInvite}
              isLoading={isLoading}
              disabled={!token}
              className="w-full mt-2"
            >
              {currentUserEmail ? 'Aceitar Convite' : 'Fazer Login e Aceitar'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function InviteAcceptPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xl mb-3">
            ✉️
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Convite para Espaço</h1>
          <p className="text-sm text-zinc-400 mt-1">Você foi convidado para colaborar em um espaço financeiro</p>
        </div>

        <React.Suspense fallback={<div className="p-8 text-center text-zinc-500 text-xs">Carregando convite...</div>}>
          <InviteContent />
        </React.Suspense>
      </div>
    </div>
  );
}
