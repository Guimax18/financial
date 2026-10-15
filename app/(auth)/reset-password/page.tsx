'use client';

import * as React from 'react';
import Link from 'next/link';
import { createClient } from '@/src/lib/supabase-browser';
import { resetPasswordSchema } from '@/src/lib/validations';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/src/components/ui/card';

export default function ResetPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validation = resetPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'E-mail inválido');
      return;
    }

    setIsLoading(true);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/dashboard/profile`,
      });

      if (resetError) {
        setError(resetError.message);
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar recuperação');
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
          <p className="text-sm text-zinc-400 mt-1">Recuperação de Acesso</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Redefinir senha</CardTitle>
            <CardDescription>
              Enviaremos um link seguro para o seu e-mail para que você possa redefinir sua senha
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  <p className="font-medium">Link de recuperação enviado!</p>
                  <p className="text-xs text-emerald-500/80 mt-1">
                    Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                  </p>
                </div>
                <Link href="/login" className="block w-full">
                  <Button variant="outline" className="w-full">
                    Voltar para o Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">E-mail cadastrado</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                  Enviar Link de Recuperação
                </Button>
              </form>
            )}
          </CardContent>
          {!success && (
            <CardFooter className="justify-center text-xs text-zinc-400">
              Lembrou sua senha?{' '}
              <Link href="/login" className="ml-1 text-emerald-400 hover:text-emerald-300 font-medium">
                Voltar ao login
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
