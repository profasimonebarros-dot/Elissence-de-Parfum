import React, { Suspense, lazy } from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Shell } from '@/components/layout/Shell';
import { AuthProvider, useAuth } from '@/lib/auth';
import Login from '@/pages/Login';

// Pages (lazy-loaded so each route ships its own chunk)
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Products = lazy(() => import('@/pages/Products'));
const Consultants = lazy(() => import('@/pages/Consultants'));
const Orders = lazy(() => import('@/pages/Orders'));
const NewOrder = lazy(() => import('@/pages/NewOrder'));
const OrderDetails = lazy(() => import('@/pages/OrderDetails'));
const Portal = lazy(() => import('@/pages/Portal'));
const SettingsPage = lazy(() => import('@/pages/Settings'));

const queryClient = new QueryClient();

const routerFallback = (
  <div className="p-8 text-center text-muted-foreground">Carregando...</div>
);

function AdminApp() {
  return (
    <Shell>
      <Suspense fallback={routerFallback}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/produtos" component={Products} />
          <Route path="/consultoras" component={Consultants} />
          <Route path="/pedidos" component={Orders} />
          <Route path="/pedidos/novo" component={NewOrder} />
          <Route path="/pedidos/:id" component={OrderDetails} />
          <Route path="/configuracoes" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Shell>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return routerFallback;
  }

  if (!user) {
    return <Login />;
  }

  return <AdminApp />;
}

function Router() {
  return (
    <Suspense fallback={routerFallback}>
      <Switch>
        {/* Public consultant order-taking page — no admin sidebar/layout, no login required */}
        <Route path="/portal/:token" component={Portal} />
        {/* Everything else is the internal admin app, gated by login */}
        <Route>{() => <AuthGate />}</Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;