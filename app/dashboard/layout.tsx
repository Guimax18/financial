'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase-browser';
import { Button } from '@/src/components/ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [userName, setUserName] = React.useState<string>('Carregando...');
  const [userEmail, setUserEmail] = React.useState<string>('');
  const [spaces, setSpaces] = React.useState<Array<{ id: string; name: string; type: string }>>([]);
  const [selectedSpaceId, setSelectedSpaceId] = React.useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    async function loadUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || '');

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile && profile.full_name) {
        setUserName(profile.full_name);
      } else {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário');
      }

      // Load spaces through members
      const { data: memberships } = await supabase
        .from('space_members')
        .select('space_id');

      if (memberships && memberships.length > 0) {
        const spaceIds = memberships.map((m) => m.space_id);
        const { data: spacesData } = await supabase
          .from('spaces')
          .select('id, name, type')
          .in('id', spaceIds);

        if (spacesData && spacesData.length > 0) {
          setSpaces(spacesData);
          setSelectedSpaceId(spacesData[0].id);
        }
      }
    }

    loadUserData();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { label: 'Visão Geral', href: '/dashboard', icon: '📊' },
    { label: 'Espaços & Convites', href: '/dashboard/spaces', icon: '👥' },
    { label: 'Minha Conta', href: '/dashboard/profile', icon: '⚙️' },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-900/30 p-4 justify-between">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              NC
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white leading-none">Nosso Controle</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Gestão Financeira</div>
            </div>
          </div>

          {/* Space Selector */}
          <div className="px-2">
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block mb-1.5">
              Espaço Ativo
            </label>
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              {spaces.length === 0 ? (
                <option value="">Nenhum espaço carregado</option>
              ) : (
                spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.type === 'personal' ? '🔒 ' : '👥 '} {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-3">
          <div className="px-2">
            <div className="text-xs font-semibold text-white truncate">{userName}</div>
            <div className="text-[11px] text-zinc-500 truncate">{userEmail}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
            🚪 Sair da Conta
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs">
              NC
            </div>
            <span className="font-bold text-sm text-white">Nosso Controle</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-900 border border-zinc-800 text-sm"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </header>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="text-xs font-medium text-zinc-400">Logado como: <span className="text-white font-semibold">{userName}</span></div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button variant="outline" size="sm" onClick={handleLogout} className="w-full text-xs text-rose-400">
              Sair
            </Button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
