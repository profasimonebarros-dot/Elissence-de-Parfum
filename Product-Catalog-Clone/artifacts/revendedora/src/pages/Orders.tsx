import { useState } from 'react';
import { 
  useListOrders, 
  getListOrdersQueryKey,
  useListConsultants
} from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, Filter, CalendarDays, ShoppingBag } from 'lucide-react';

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
};
import { Link, useLocation } from 'wouter';

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function Orders() {
  const [_, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [consultantFilter, setConsultantFilter] = useState<string>('all');

  // We could use URL params to set initial state here if passed from Consultant details
  
  const { data: consultants = [] } = useListConsultants();
  
  const { data: orders = [], isLoading } = useListOrders({
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    consultantId: consultantFilter !== 'all' ? parseInt(consultantFilter) : undefined
  });

  return (
    <div className="space-y-8 pb-12" data-testid="page-orders">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Registro de Pedidos</h1>
          <p className="text-muted-foreground mt-1">Acompanhe todos os pedidos e gerencie entregas.</p>
        </div>
        <Button onClick={() => setLocation('/pedidos/novo')} className="w-full sm:w-auto font-medium shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-3 rounded-lg border border-border shadow-sm">
        <div className="flex-1 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-[250px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full bg-transparent border-border">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status do Pedido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="confirmed">Confirmados</SelectItem>
                <SelectItem value="delivered">Entregues</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[300px]">
            <Select value={consultantFilter} onValueChange={setConsultantFilter}>
              <SelectTrigger className="w-full bg-transparent border-border">
                <Search className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por Consultora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Consultoras</SelectItem>
                {consultants.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-20 bg-card rounded-lg border border-border"></div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-lg border border-border border-dashed">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhum pedido encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Ajuste os filtros ou crie um novo pedido para sua consultora.
          </p>
          <Button onClick={() => setLocation('/pedidos/novo')} variant="outline" className="mt-6">
            Criar Novo Pedido
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-2">Nº Pedido</div>
            <div className="col-span-2">Consultora</div>
            <div className="col-span-2">Data</div>
            <div className="col-span-2">Pagamento</div>
            <div className="col-span-2 text-right">Valor Total</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          
          <div className="divide-y divide-border">
            {orders.map((order) => (
              <Link 
                href={`/pedidos/${order.id}`} 
                key={order.id}
                className="block p-4 hover:bg-muted/50 transition-colors group cursor-pointer"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="col-span-12 md:col-span-2 flex justify-between md:block">
                    <span className="md:hidden text-muted-foreground text-sm">Pedido</span>
                    <span className="font-serif font-semibold text-primary group-hover:underline">
                      #{order.id.toString().padStart(5, '0')}
                    </span>
                  </div>
                  
                  <div className="col-span-12 md:col-span-2 font-medium text-foreground">
                    {order.consultantName}
                  </div>
                  
                  <div className="col-span-12 md:col-span-2 flex items-center text-sm text-muted-foreground gap-2">
                    <CalendarDays className="h-4 w-4 md:hidden" />
                    {formatDate(order.createdAt)}
                  </div>

                  <div className="col-span-12 md:col-span-2 text-sm text-muted-foreground">
                    <span className="md:hidden font-medium text-foreground mr-1">Pagamento:</span>
                    {order.paymentMethod ? PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod : <span className="italic opacity-50">—</span>}
                  </div>
                  
                  <div className="col-span-12 md:col-span-2 flex justify-between md:block md:text-right">
                    <span className="md:hidden text-muted-foreground text-sm">Total</span>
                    <div className="font-semibold">{formatCurrency(order.totalAmount)}</div>
                  </div>
                  
                  <div className="col-span-12 md:col-span-2 flex justify-between md:justify-end">
                    <span className="md:hidden text-muted-foreground text-sm">Status</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
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
    <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold border uppercase tracking-wider ${config.classes}`}>
      {config.label}
    </span>
  );
}
