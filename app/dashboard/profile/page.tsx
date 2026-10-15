'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase-browser';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [msg, setMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || '');
      }
    }

    loadProfile();
  }, [router, supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) { setIsLoading(false); router.push('/login'); return; }

    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
    }).eq('id', user.id).select('id').single();

    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    }
    setIsLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMsg({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    setIsLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setNewPassword('');
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 max-w-2xl animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Minha Conta</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Gerencie seus dados cadastrais e credenciais de segurança.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>Informações básicas do seu perfil no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">E-mail</label>
              <Input value={email} disabled className="opacity-60 cursor-not-allowed" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Nome Completo</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>

            <Button type="submit" size="sm" isLoading={isLoading}>
              Salvar Alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security / Password */}
      <Card>
        <CardHeader>
          <CardTitle>Segurança & Senha</CardTitle>
          <CardDescription>Altere sua senha de acesso a qualquer momento</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Nova Senha</label>
              <Input
                type="password"
                placeholder="Mínimo de 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <Button type="submit" variant="secondary" size="sm" isLoading={isLoading}>
              Atualizar Senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
