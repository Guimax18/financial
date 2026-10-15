import Link from 'next/link';
import { Button } from '@/src/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 backdrop-blur-md sticky top-0 z-40 bg-zinc-950/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              NC
            </div>
            <span className="font-bold text-base tracking-tight text-white">Nosso Controle</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Fase 1: Multi-tenant, Segurança RLS & Espaços Compartilhados
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Gestão financeira simples para você, <span className="text-emerald-400">seu parceiro</span> e sua família.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Mantenha seus gastos pessoais 100% privados e compartilhe apenas o que for de interesse comum.
          Sem contagem dupla, sem invasão de privacidade e com isolamento total em nível de banco de dados.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Criar Conta Gratuita →
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Acessar Minha Conta
            </Button>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left w-full">
          <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40">
            <div className="text-2xl mb-2">🔒</div>
            <h3 className="font-semibold text-white text-sm">Privacidade Real</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Políticas de Row Level Security (RLS) garantem que ninguém acesse suas finanças pessoais.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40">
            <div className="text-2xl mb-2">👥</div>
            <h3 className="font-semibold text-white text-sm">Espaços Compartilhados</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Crie ambientes de casal ou família e convide membros com tokens seguros criptografados.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold text-white text-sm">Moderno & Responsivo</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Desenvolvido com Next.js, TypeScript e Tailwind CSS para funcionar em celulares e computadores.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 text-center text-xs text-zinc-500">
        © 2026 Nosso Controle — Plataforma de Gestão Financeira. Todos os direitos reservados.
      </footer>
    </div>
  );
}
