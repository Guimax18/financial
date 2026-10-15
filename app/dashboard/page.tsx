'use client';
import { useSpaceId } from '@/src/components/space-context';
import { FinancialDashboard } from '@/src/components/finance/financial-dashboard';
export default function DashboardPage() {
  const spaceId = useSpaceId();
  return <FinancialDashboard key={spaceId} spaceId={spaceId} />;
}
