import { 
  useGetOrder, 
  useUpdateOrder,
  getGetOrderQueryKey,
  useDeleteOrder,
  type OrderUpdatePaymentMethod,
} from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Printer, Trash2, CheckCircle2, Clock, XCircle, Package, CreditCard, Wallet } from 'lucide-react';

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto',
  transferencia: 'Transferência Bancária',
};
import { useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from 'react';

export default function OrderDetails() {
  const [_, setLocation] = useLocation();
  const { id } = useParams();
  const orderId = id ? parseInt(id) : 0;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: order, isLoading } = useGetOrder(orderId, { 
    query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) } 
  });

  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading || !order) {
    return (
      <div className="space-y-8 pb-12 animate-pulse" data-testid="page-order-details-loading">
        <div className="h-10 w-48 bg-muted rounded-md mb-4"></div>
        <div className="h-64 bg-card rounded-lg border border-border"></div>
        <div className="h-64 bg-card rounded-lg border border-border"></div>
      </div>
    );
  }

  const handleStatusChange = (newStatus: any) => {
    updateOrder.mutate({ id: orderId, data: { status: newStatus } }, {
      onSuccess: () => {
        // Optimistic update of local cache to avoid full refetch bounce
        queryClient.setQueryData(getGetOrderQueryKey(orderId), (old: any) => 
          old ? { ...old, status: newStatus } : old
        );
        toast({ title: "Status atualizado" });
      },
      onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" })
    });
  };

  const handleDelete = () => {
    deleteOrder.mutate({ id: orderId }, {
      onSuccess: () => {
        toast({ title: "Pedido excluído" });
        setLocation('/pedidos');
      },
      onError: () => toast({ title: "Erro ao excluir pedido", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto" data-testid="page-order-details">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => window.history.back()} className="rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-serif font-medium tracking-tight">
              Pedido #{order.id.toString().padStart(5, '0')}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Realizado em {formatDate(order.createdAt)}
          </p>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex">
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h2 className="font-serif font-medium text-lg">Itens do Pedido ({order.items?.length || 0})</h2>
            </div>
            
            <div className="divide-y divide-border">
              {order.items?.map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center shrink-0 border border-border overflow-hidden">
                    {item.productImageUrl ? (
                      <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground opacity-30" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-0.5">{item.productBrand}</p>
                    <p className="font-medium text-base leading-tight truncate">{item.productName}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-sm font-medium px-3 py-1 bg-muted/50 rounded-md border border-border">
                      {item.quantity} un.
                    </div>
                    <div className="font-semibold text-right min-w-[100px]">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Notes */}
          {order.notes && (
            <div className="bg-card rounded-lg border border-border shadow-sm p-4">
              <h3 className="font-medium text-sm mb-2 text-muted-foreground">Observações</h3>
              <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Payment Method */}
          <div className="bg-card rounded-lg border border-border shadow-sm p-5">
            <h3 className="font-serif font-medium text-base mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> Forma de Pagamento
            </h3>
            <Select
              value={order.paymentMethod ?? ''}
              onValueChange={(val) =>
                updateOrder.mutate({
                  id: orderId,
                  data: {
                    paymentMethod: val
                      ? (val as Exclude<OrderUpdatePaymentMethod, null>)
                      : null,
                  },
                }, {
                  onSuccess: () => {
                    queryClient.setQueryData(getGetOrderQueryKey(orderId), (old: any) =>
                      old ? { ...old, paymentMethod: val || null } : old
                    );
                    toast({ title: 'Forma de pagamento atualizada' });
                  },
                  onError: () => toast({ title: 'Erro ao atualizar pagamento', variant: 'destructive' }),
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar forma de pagamento..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="transferencia">Transferência Bancária</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Control */}
          <div className="bg-card rounded-lg border border-border shadow-sm p-5">
            <h3 className="font-serif font-medium text-lg mb-4">Gerenciar Status</h3>
            <Select value={order.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-amber-500" /> Pendente</div>
                </SelectItem>
                <SelectItem value="confirmed">
                  <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" /> Confirmado</div>
                </SelectItem>
                <SelectItem value="delivered">
                  <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Entregue</div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center"><XCircle className="w-4 h-4 mr-2 text-red-500" /> Cancelado</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Consultant & Financials */}
          <div className="bg-card rounded-lg border border-border shadow-sm p-5">
            <h3 className="font-serif font-medium text-lg mb-4">Resumo Financeiro</h3>
            
            <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Consultora</p>
              <p className="font-medium">{order.consultantName}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal dos Produtos</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-primary font-medium">
                <span>Comissão da Consultora</span>
                <span>{formatCurrency(order.commissionAmount)}</span>
              </div>
              
              <Separator className="my-3" />
              
              <div className="flex justify-between font-serif text-2xl font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs mt-1">
                <span>Lucro Líquido (Maison)</span>
                <span>{formatCurrency(order.totalAmount - order.commissionAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir este pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O histórico financeiro será alterado. Considere marcar como "Cancelado" em vez de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string, classes: string, icon: any }> = {
    pending: { label: 'Pendente', classes: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
    confirmed: { label: 'Confirmado', classes: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2 },
    delivered: { label: 'Entregue', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
    cancelled: { label: 'Cancelado', classes: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  };

  const config = map[status] || map.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border uppercase tracking-wider ${config.classes}`}>
      <Icon className="w-3.5 h-3.5 mr-1" />
      {config.label}
    </span>
  );
}
