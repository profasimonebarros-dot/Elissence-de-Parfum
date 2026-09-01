import React from 'react';
import { useGetDashboardSummary, useGetTopConsultants, useGetRecentOrders } from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Package, Users, ShoppingBag, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: topConsultants, isLoading: isLoadingTop } = useGetTopConsultants();
  const { data: recentOrders, isLoading: isLoadingOrders } = useGetRecentOrders();

  const isLoading = isLoadingSummary || isLoadingTop || isLoadingOrders;

  if (isLoading || !summary || !topConsultants || !recentOrders) {
    return (
      <div className="space-y-6 animate-pulse" data-testid="dashboard-loading">
        <div className="h-10 w-64 bg-muted rounded-md"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-card rounded-lg border border-border"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-card rounded-lg border border-border"></div>
          <div className="h-96 bg-card rounded-lg border border-border"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12" data-testid="page-dashboard">
      <div>
        <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground mt-1">Resumo das vendas e desempenho das consultoras.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Faturamento Total" 
          value={formatCurrency(summary.totalRevenue)}
          icon={TrendingUp}
          trend={`${summary.totalOrders} pedidos`}
        />
        <StatCard 
          title="Comissões Pagas" 
          value={formatCurrency(summary.totalCommissions)}
          icon={CheckCircle}
          trend="Total distribuído"
        />
        <StatCard 
          title="Pedidos Pendentes" 
          value={summary.pendingOrders.toString()}
          icon={Clock}
          trend="Aguardando confirmação"
        />
        <StatCard 
          title="Consultoras Ativas" 
          value={summary.totalConsultants.toString()}
          icon={Users}
          trend="Equipe de vendas"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Consultoras */}
        <section className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-serif font-medium">Top Consultoras</h2>
            <Link href="/consultoras" className="text-sm text-primary hover:underline font-medium">
              Ver todas
            </Link>
          </div>
          
          <div className="space-y-5">
            {topConsultants.map((consultant, i) => (
              <div key={consultant.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif text-sm font-semibold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{consultant.name}</p>
                    <p className="text-xs text-muted-foreground">{consultant.totalOrders} pedidos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{formatCurrency(consultant.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{consultant.commissionRate}% comissão</p>
                </div>
              </div>
            ))}
            {topConsultants.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma consultora com vendas ainda.</p>
            )}
          </div>
        </section>

        {/* Recent Orders */}
        <section className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-serif font-medium">Pedidos Recentes</h2>
            <Link href="/pedidos" className="text-sm text-primary hover:underline font-medium">
              Ver todos
            </Link>
          </div>
          
          <div className="space-y-5">
            {recentOrders.map((order) => (
              <Link 
                key={order.id}
                href={`/pedidos/${order.id}`}
                className="flex items-center justify-between group cursor-pointer block"
              >
                <div>
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">
                    Pedido #{order.id.toString().padStart(4, '0')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.consultantName} • {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{formatCurrency(order.totalAmount)}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
            {recentOrders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido recente.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: { title: string, value: string, icon: React.ElementType, trend: string }) {
  return (
    <div className="bg-card rounded-lg border border-border p-5 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="w-8 h-8 rounded-md bg-primary/5 text-primary flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-serif font-semibold text-foreground tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string, classes: string }> = {
    pending: { label: 'Pendente', classes: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900' },
    confirmed: { label: 'Confirmado', classes: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900' },
    delivered: { label: 'Entregue', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900' },
    cancelled: { label: 'Cancelado', classes: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900' },
  };

  const config = map[status] || map.pending;

  return (
    <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-medium border uppercase tracking-wider ${config.classes}`}>
      {config.label}
    </span>
  );
}
