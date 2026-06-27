import { lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

// Lazy-load each role dashboard for code splitting
const SuperAdminDashboard  = lazy(() => import('./dashboards/SuperAdminDashboard'));
const OwnerDashboard       = lazy(() => import('./dashboards/OwnerDashboard'));
const PMDashboard          = lazy(() => import('./dashboards/PMDashboard'));
const TeamLeaderDashboard  = lazy(() => import('./dashboards/TeamLeaderDashboard'));
const EmployeeDashboard    = lazy(() => import('./dashboards/EmployeeDashboard'));

const DashLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-10 w-10 text-brand animate-spin" />
      <span className="text-xs text-ink-faint tracking-[0.3em] uppercase font-semibold">
        Loading Dashboard…
      </span>
    </div>
  </div>
);

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) return <DashLoader />;
  if (!user)   return null;

  const role = user.role;

  const renderDashboard = () => {
    switch (role) {
      case 'super_admin':
        return <SuperAdminDashboard user={user} />;
      case 'owner':
      case 'admin':
        return <OwnerDashboard user={user} />;
      case 'manager':
        return <PMDashboard user={user} />;
      case 'team_leader':
        return <TeamLeaderDashboard user={user} />;
      default:
        return <EmployeeDashboard user={user} />;
    }
  };

  return <Suspense fallback={<DashLoader />}>{renderDashboard()}</Suspense>;
}