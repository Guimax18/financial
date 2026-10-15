'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/src/lib/supabase-browser';
import { loginSchema } from '@/src/lib/validations';
import { safeRedirect } from '@/src/lib/safe-redirect';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/src/components/ui/card';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirectTo'));
  const supabase = createClient();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const validation = loginSchema.safeParse({ email, password });
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setServerError('E-mail ou senha incorretos.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao autenticar';
      setServerError(message);
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Informe suas credenciais de acesso</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {serverError}
            </div>
          )}

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
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">Senha</label>
              <Link
                href="/reset-password"
                className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
            Acessar Plataforma
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-xs text-zinc-400">
        Ainda não tem conta?{' '}
        <Link href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`} className="ml-1 text-emerald-400 hover:text-emerald-300 font-medium">
          Cadastre-se gratuitamente
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xl mb-3">
            NC
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Nosso Controle</h1>
          <p className="text-sm text-zinc-400 mt-1">Acesse sua conta para continuar</p>
        </div>

        <React.Suspense fallback={<div className="p-8 text-center text-zinc-500 text-xs">Carregando...</div>}>
          <LoginForm />
        </React.Suspense>
      </div>
    </div>
  );
}
