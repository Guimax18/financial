import { redirect } from 'next/navigation';
import { createClient } from '@/src/lib/supabase-server';
import DashboardShell from '@/src/components/dashboard-shell';
import { Suspense } from 'react';
import { connection } from 'next/server';

async function AuthenticatedDashboard({ children }: { children: React.ReactNode }) {
  await connection();
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return <DashboardShell>{children}</DashboardShell>;
}
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p role="status" className="p-6">Verificando acesso…</p>}><AuthenticatedDashboard>{children}</AuthenticatedDashboard></Suspense>;
}
