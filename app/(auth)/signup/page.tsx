'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeRedirect } from '@/src/lib/safe-redirect';
import { createClient } from '@/src/lib/supabase-browser';
import { signupSchema } from '@/src/lib/validations';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/src/components/ui/card';

function SignupForm() {
  const searchParams = useSearchParams();
  const next = safeRedirect(searchParams.get('redirectTo'), '/onboarding');
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [confirmationSent, setConfirmationSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const validation = signupSchema.safeParse({ fullName, email, password });
    if (!validation.success) {
      const fieldErrors: { [key: string]: string } = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setServerError(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user && !data.session) {
        setConfirmationSent(true);
        setIsLoading(false);
        return;
      }
      if (data.user && data.session) {
        // Create initial profile record directly if session exists
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
        }, { onConflict: 'id', ignoreDuplicates: true });
        if (profileError) throw profileError;

        router.push(next);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro ao cadastrar';
      setServerError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xl mb-3">
            NC
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Nosso Controle</h1>
          <p className="text-sm text-zinc-400 mt-1">Gestão financeira pessoal e familiar inteligente</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar sua conta</CardTitle>
            <CardDescription>Cadastre-se para começar a gerenciar seus espaços financeiros</CardDescription>
          </CardHeader>
          <CardContent>
            {confirmationSent && <p role="status" className="mb-4 text-sm text-emerald-400">Confira seu e-mail para confirmar o cadastro e continuar.</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {serverError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Nome Completo</label>
                <Input
                  placeholder="Seu nome ou apelido"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={errors.fullName}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">E-mail</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Senha</label>
                <Input
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                Criar Conta
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-xs text-zinc-400">
            Já tem uma conta?{' '}
            <Link href={`/login?redirectTo=${encodeURIComponent(next)}`} className="ml-1 text-emerald-400 hover:text-emerald-300 font-medium">
              Fazer login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <React.Suspense fallback={<p role="status">Carregando cadastro…</p>}><SignupForm /></React.Suspense>;
}
