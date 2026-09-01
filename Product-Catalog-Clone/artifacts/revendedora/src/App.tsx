import React from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Shell } from '@/components/layout/Shell';

// Pages
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import Consultants from '@/pages/Consultants';
import Orders from '@/pages/Orders';
import NewOrder from '@/pages/NewOrder';
import OrderDetails from '@/pages/OrderDetails';

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/produtos" component={Products} />
        <Route path="/consultoras" component={Consultants} />
        <Route path="/pedidos" component={Orders} />
        <Route path="/pedidos/novo" component={NewOrder} />
        <Route path="/pedidos/:id" component={OrderDetails} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
