'use client';

import * as React from 'react';
import { createClient } from '@/src/lib/supabase-browser';
import { createSpaceSchema, inviteMemberSchema } from '@/src/lib/validations';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Dialog } from '@/src/components/ui/dialog';

interface Space {
  id: string;
  name: string;
  type: 'personal' | 'family';
  owner_id: string;
  created_at: string;
}


export default function SpacesPage() {
  const supabase = createClient();

  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newSpaceName, setNewSpaceName] = React.useState('');
  const [newSpaceType, setNewSpaceType] = React.useState<'personal' | 'family'>('family');
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = React.useState(false);

  // Invite states
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [inviteSpaceId, setInviteSpaceId] = React.useState<string>('');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteResult, setInviteResult] = React.useState<{ link?: string; error?: string } | null>(null);
  const [isSubmittingInvite, setIsSubmittingInvite] = React.useState(false);

  const loadSpaces = React.useCallback(async () => {
    setIsLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;
    setCurrentUserId(user.id);

    // Get user's spaces through membership
    const { data: memberships } = await supabase
      .from('space_members')
      .select('space_id');

    if (memberships && memberships.length > 0) {
      const spaceIds = memberships.map((m) => m.space_id);
      const { data: spacesData } = await supabase
        .from('spaces')
        .select('*')
        .in('id', spaceIds);

      if (spacesData) {
        setSpaces(spacesData as Space[]);
      }
    } else {
      setSpaces([]);
    }
    setIsLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    void Promise.resolve().then(loadSpaces);
  }, [loadSpaces]);

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const validation = createSpaceSchema.safeParse({ name: newSpaceName, type: newSpaceType });
    if (!validation.success) {
      setCreateError(validation.error.issues[0]?.message || 'Dados inválidos');
      return;
    }

    setIsSubmittingCreate(true);

    try {
      // Use RPC if available
      const { error: rpcError } = await supabase.rpc('create_space_with_owner', {
        p_name: newSpaceName,
        p_type: newSpaceType,
      });

      if (rpcError) throw new Error(rpcError.message);

      setIsCreateOpen(false);
      setNewSpaceName('');
      await loadSpaces();
      window.dispatchEvent(new Event('spaces-updated'));
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Falha ao criar espaço');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteResult(null);

    const validation = inviteMemberSchema.safeParse({ email: inviteEmail });
    if (!validation.success) {
      setInviteResult({ error: validation.error.issues[0]?.message || 'E-mail inválido' });
      return;
    }

    setIsSubmittingInvite(true);

    try {
      // Generate a cryptographically random token
      const array = new Uint8Array(24);
      window.crypto.getRandomValues(array);
      const rawToken = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

      // Create SHA-256 hash of the token
      const encoder = new TextEncoder();
      const tokenBuffer = encoder.encode(rawToken);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', tokenBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase.from('space_invitations').insert({
        space_id: inviteSpaceId,
        email: inviteEmail.toLowerCase().trim(),
        token_hash: tokenHash,
        status: 'pending',
      });

      if (error) {
        setInviteResult({ error: error.message });
      } else {
        const inviteUrl = `${window.location.origin}/invite?token=${rawToken}`;
        setInviteResult({ link: inviteUrl });
      }
    } catch (err: unknown) {
      setInviteResult({ error: err instanceof Error ? err.message : 'Erro ao gerar convite' });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Espaços Financeiros</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerencie seus ambientes pessoais e familiares com isolamento completo de dados.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="sm">
          + Novo Espaço
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-zinc-400">Carregando seus espaços...</div>
      ) : spaces.length === 0 ? (
        <Card className="text-center p-8 border-dashed border-zinc-800">
          <p className="text-sm text-zinc-400 mb-4">Você ainda não possui nenhum espaço criado.</p>
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            Criar Primeiro Espaço
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spaces.map((space) => {
            const isOwner = space.owner_id === currentUserId;
            return (
              <Card key={space.id} className="relative flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        space.type === 'personal'
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {space.type === 'personal' ? '🔒 Espaço Pessoal' : '👥 Compartilhado / Família'}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {isOwner ? 'Proprietário' : 'Membro'}
                    </span>
                  </div>
                  <CardTitle className="mt-3 text-lg font-bold">{space.name}</CardTitle>
                  <CardDescription className="text-xs">
                    Criado em {new Date(space.created_at).toLocaleDateString('pt-BR')}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-2">
                  <div className="flex items-center gap-2">
                    {space.type === 'family' && isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setInviteSpaceId(space.id);
                          setInviteEmail('');
                          setInviteResult(null);
                          setIsInviteOpen(true);
                        }}
                      >
                        ✉️ Convidar Membro
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Criar Espaço */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Criar Novo Espaço"
        description="Defina se o espaço é privado ou para compartilhamento com parceiro/família."
      >
        <form onSubmit={handleCreateSpace} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {createError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Nome do Espaço</label>
            <Input
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              placeholder="Ex: Finanças Casa Nova"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Tipo de Espaço</label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setNewSpaceType('personal')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  newSpaceType === 'personal'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-white mb-0.5">🔒 Pessoal</div>
                <div>Apenas para uso individual</div>
              </button>

              <button
                type="button"
                onClick={() => setNewSpaceType('family')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  newSpaceType === 'family'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-white mb-0.5">👥 Compartilhado</div>
                <div>Para casais ou familiares</div>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmittingCreate}>
              Criar Espaço
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Convidar Membro */}
      <Dialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        title="Convidar Membro para o Espaço"
        description="Gere um link de convite seguro com token único criptografado e validade de 48 horas."
      >
        <form onSubmit={handleGenerateInvite} className="space-y-4">
          {inviteResult?.error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {inviteResult.error}
            </div>
          )}

          {inviteResult?.link ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                Convite gerado com sucesso! Envie o link abaixo para o usuário convidado:
              </div>
              <Input value={inviteResult.link} readOnly className="font-mono text-xs" />
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  if (inviteResult.link) {
                    navigator.clipboard.writeText(inviteResult.link);
                    alert('Link copiado para a área de transferência!');
                  }
                }}
              >
                📋 Copiar Link de Convite
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">E-mail do Convidado</label>
                <Input
                  type="email"
                  placeholder="parceiro@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" type="button" onClick={() => setIsInviteOpen(false)}>
                  Fechar
                </Button>
                <Button type="submit" isLoading={isSubmittingInvite}>
                  Gerar Link de Convite
                </Button>
              </div>
            </>
          )}
        </form>
      </Dialog>
    </div>
  );
}
