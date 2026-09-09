import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRoute } from 'wouter';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Bell, BellRing } from 'lucide-react';
import { useListProducts, type OrderInputPaymentMethod } from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ShoppingBag,
  CreditCard,
  PackageSearch,
  Wallet,
  ClipboardList,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

type PortalSummary = {
  id: number;
  name: string;
  commissionRate: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  pendingOrders: number;
};

type PortalOrderItem = {
  productName: string;
  productBrand: string;
  productImageUrl: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type PortalOrder = {
  id: number;
  status: string;
  paymentMethod: string | null;
  totalAmount: number;
  commissionAmount: number;
  notes: string | null;
  createdAt: string;
  items: PortalOrderItem[];
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  confirmed: 'secondary',
  delivered: 'default',
  cancelled: 'destructive',
};

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? '';
}

// Matches Tailwind's `lg` breakpoint. Used so the cart/checkout form (which
// contains interactive Radix components like Select) is only ever mounted
// ONCE at a time — either in the desktop sidebar or the mobile bottom sheet,
// never both simultaneously (having two live instances bound to the same
// state caused a crash on some mobile browsers).
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

export default function Portal() {
  const [, params] = useRoute('/portal/:token');
  const token = params?.token ?? '';
  const { supported: pushSupported, permission: pushPermission, subscribing: pushSubscribing, subscribe: pushSubscribe } = usePushNotifications(`/api/portal/${token}/push/subscribe`);
  const { toast } = useToast();
  const isDesktop = useIsDesktop();

  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const { data: products = [], isLoading: loadingProducts } = useListProducts({ active: true });

  const [paymentMethod, setPaymentMethod] = useState<OrderInputPaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<Array<{ product: (typeof products)[number]; quantity: number }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const [storeSettings, setStoreSettings] = useState<{
    pixKey: string | null;
    pixKeyType: string | null;
    pixRecipientName: string | null;
    pixEnabled: boolean;
    dinheiroEnabled: boolean;
    cartaoCreditoEnabled: boolean;
    cartaoDebitoEnabled: boolean;
    boletoEnabled: boolean;
    transferenciaEnabled: boolean;
  } | null>(null);

  useEffect(() => {
    fetch(`${apiBase()}/api/settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStoreSettings(data))
      .catch(() => {});
  }, []);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`${apiBase()}/api/portal/${token}`);
      if (!res.ok) throw new Error('not found');
      setSummary(await res.json());
      setSummaryError(false);
    } catch {
      setSummaryError(true);
    } finally {
      setLoadingSummary(false);
    }
  }, [token]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${apiBase()}/api/portal/${token}/orders`);
      if (res.ok) setOrders(await res.json());
    } finally {
      setLoadingOrders(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadSummary();
    loadOrders();
  }, [token, loadSummary, loadOrders]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lower = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.brand.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower),
    );
  }, [products, searchTerm]);

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart],
  );

  const estimatedCommission = useMemo(() => {
    if (!summary) return 0;
    return Math.round(cartSubtotal * (summary.commissionRate / 100));
  }, [cartSubtotal, summary]);

  const addToCart = (product: (typeof products)[number]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast({ title: 'Adicionado ao pedido', description: product.name });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast({ title: 'O pedido está vazio', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase()}/api/portal/${token}/orders`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: paymentMethod || undefined,
          notes: notes || undefined,
          items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        }),
      });
      if (!res.ok) throw new Error('failed');

      toast({ title: 'Pedido enviado com sucesso!' });
      setCart([]);
      setNotes('');
      setPaymentMethod('');
      setCartSheetOpen(false);
      loadSummary();
      loadOrders();
    } catch {
      toast({ title: 'Erro ao enviar o pedido', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const cartPanelBody = (
    <>
      <div className="p-5 border-b border-border bg-muted/20 space-y-4">
        <h2 className="font-serif text-lg font-medium">Resumo do Pedido</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Forma de Pagamento
          </label>
          <Select
            value={paymentMethod}
            onValueChange={(value) => setPaymentMethod(value as OrderInputPaymentMethod)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a forma de pagamento..." />
            </SelectTrigger>
            <SelectContent>
              {(storeSettings?.pixEnabled ?? true) && <SelectItem value="pix">PIX</SelectItem>}
              {(storeSettings?.dinheiroEnabled ?? true) && <SelectItem value="dinheiro">Dinheiro</SelectItem>}
              {(storeSettings?.cartaoCreditoEnabled ?? true) && (
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
              )}
              {(storeSettings?.cartaoDebitoEnabled ?? true) && (
                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
              )}
              {(storeSettings?.boletoEnabled ?? true) && <SelectItem value="boleto">Boleto</SelectItem>}
              {(storeSettings?.transferenciaEnabled ?? true) && (
                <SelectItem value="transferencia">Transferência Bancária</SelectItem>
              )}
            </SelectContent>
          </Select>

          {paymentMethod === 'pix' && storeSettings?.pixKey && (
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm space-y-0.5">
              <p className="font-medium text-primary">Chave PIX para pagamento</p>
              <p className="text-foreground break-all">{storeSettings.pixKey}</p>
              {storeSettings.pixRecipientName && (
                <p className="text-xs text-muted-foreground">Recebedor: {storeSettings.pixRecipientName}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {cart.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 flex flex-col items-center">
            <ShoppingBag className="h-10 w-10 opacity-20 mb-2" />
            <p className="text-sm">O pedido está vazio</p>
            <p className="text-xs mt-1">Adicione perfumes pelo catálogo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-start justify-between gap-2 group">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.product.price)} un.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border border-border rounded-md">
                      <button
                        className="w-7 h-7 flex items-center justify-center hover:bg-muted text-muted-foreground"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        className="w-7 h-7 flex items-center justify-center hover:bg-muted text-muted-foreground"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="font-semibold text-sm">
                  {formatCurrency(item.product.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-2">
          <label className="text-sm font-medium">Observações do Pedido</label>
          <Textarea
            placeholder="Endereço de entrega, embalagem p/ presente..."
            className="resize-none h-20 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="p-5 border-t border-border bg-muted/10">
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(cartSubtotal)}</span>
          </div>
          {summary && (
            <div className="flex justify-between text-primary font-medium">
              <span>Sua Comissão Estimada ({summary.commissionRate}%)</span>
              <span>{formatCurrency(estimatedCommission)}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between font-serif text-xl font-bold">
            <span>Total</span>
            <span>{formatCurrency(cartSubtotal)}</span>
          </div>
        </div>

        <Button
          className="w-full h-12 text-base font-medium"
          disabled={cart.length === 0 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? (
            'Enviando...'
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" /> Confirmar Pedido
            </>
          )}
        </Button>
      </div>
    </>
  );

  if (!token) return null;

  const pushButton = pushSupported && pushPermission !== 'granted' ? (
    <button
      onClick={() => pushSubscribe()}
      disabled={pushSubscribing}
      className="fixed bottom-20 right-4 md:bottom-4 z-20 flex items-center gap-2 bg-card border border-border shadow-lg rounded-full px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      data-testid="button-enable-notifications-portal"
    >
      <Bell className="h-4 w-4 text-primary" />
      {pushSubscribing ? 'Ativando...' : 'Ativar notificacoes'}
    </button>
  ) : pushPermission === 'granted' ? (
    <div className="fixed bottom-20 right-4 md:bottom-4 z-20 flex items-center gap-2 bg-card border border-border shadow-lg rounded-full px-4 py-2.5 text-xs text-muted-foreground">
      <BellRing className="h-4 w-4 text-primary" />
      Notificacoes ativas
    </div>
  ) : null;

  if (summaryError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          <PackageSearch className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h1 className="font-serif text-xl font-medium mb-2">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Esse link não é válido ou a consultora está inativa. Confirme o link com quem te enviou.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {pushButton}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <img src="/logo.png" alt="Elisssence Parfum" className="h-16 w-16 rounded-full object-cover shrink-0 ring-2 ring-primary/40 shadow-sm" />
          <div>
            <h1 translate="no" className="notranslate font-serif text-lg font-semibold tracking-wide text-primary leading-tight">Elisssence Parfum</h1>
            {loadingSummary ? (
              <div className="h-5 w-40 bg-muted rounded animate-pulse mt-1" />
            ) : (
              <p className="text-muted-foreground text-sm mt-0.5">
                Olá, <span className="font-medium text-foreground">{summary?.name}</span> — comissão de{' '}
                {summary?.commissionRate}% sobre suas vendas
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pedidos', value: summary?.totalOrders ?? 0, icon: ClipboardList },
            { label: 'Pendentes', value: summary?.pendingOrders ?? 0, icon: ShoppingBag },
            { label: 'Total vendido', value: formatCurrency(summary?.totalRevenue ?? 0), icon: PackageSearch },
            { label: 'Sua comissão', value: formatCurrency(summary?.totalCommission ?? 0), icon: Wallet },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-4">
              <Icon className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-xl font-serif font-semibold">{loadingSummary ? '—' : value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="novo">
          <TabsList>
            <TabsTrigger value="novo">Fazer Pedido</TabsTrigger>
            <TabsTrigger value="historico">Meus Pedidos</TabsTrigger>
          </TabsList>

          {/* Novo pedido */}
          <TabsContent value="novo" className="pt-6">
            {loadingProducts ? (
              <div className="p-8 text-center animate-pulse text-muted-foreground">Carregando catálogo...</div>
            ) : (
              <>
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="w-full lg:w-2/3 space-y-6">
                  <div className="bg-card p-2 rounded-lg border border-border shadow-sm flex items-center sticky top-0 z-10">
                    <Search className="h-4 w-4 text-muted-foreground ml-3 mr-2" />
                    <Input
                      placeholder="Buscar perfumes no catálogo..."
                      className="bg-transparent border-none shadow-none focus-visible:ring-0 flex-1"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="bg-card rounded-lg border border-border overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
                      >
                        <div className="h-40 bg-white relative flex items-center justify-center overflow-hidden">
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-contain p-2"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-3 right-3 text-white">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                              {product.brand}
                            </p>
                            <p className="font-serif font-medium text-sm leading-tight line-clamp-1">
                              {product.name}
                            </p>
                          </div>
                        </div>
                        <div className="p-3 flex items-center justify-between mt-auto">
                          <p className="font-semibold text-primary">{formatCurrency(product.price)}</p>
                          <Button size="sm" onClick={() => addToCart(product)} className="h-8 rounded px-3">
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {isDesktop && (
                  <div className="hidden lg:flex lg:flex-col w-full lg:w-1/3 bg-card rounded-lg border border-border shadow-sm sticky top-4 max-h-[calc(100vh-2rem)]">
                    {cartPanelBody}
                  </div>
                )}
              </div>

              {/* Mobile: sticky bottom bar + bottom-sheet checkout (only mounted on mobile, so the
                  interactive form isn't duplicated alongside the desktop panel above) */}
              {!isDesktop && (
                <>
                  <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-card border-t border-border p-3 flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">
                        {cart.length === 0 ? 'Nenhum item' : `${cart.reduce((n, i) => n + i.quantity, 0)} ite${cart.reduce((n, i) => n + i.quantity, 0) === 1 ? 'm' : 'ns'}`}
                      </p>
                      <p className="font-serif font-semibold">{formatCurrency(cartSubtotal)}</p>
                    </div>
                    <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
                      <SheetTrigger asChild>
                        <Button className="font-medium">
                          <ShoppingBag className="h-4 w-4 mr-2" /> Ver Pedido
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-0 flex flex-col">
                        {cartPanelBody}
                      </SheetContent>
                    </Sheet>
                  </div>
                  {/* Spacer so the sticky bar doesn't cover the last products */}
                  <div className="lg:hidden h-20" />
                </>
              )}
              </>
            )}
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="historico" className="pt-6">
            {loadingOrders ? (
              <div className="p-8 text-center animate-pulse text-muted-foreground">Carregando pedidos...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-lg border border-border border-dashed">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Você ainda não fez nenhum pedido.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-card border border-border rounded-lg p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-medium">Pedido #{order.id}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      <Badge variant={STATUS_VARIANTS[order.status] ?? 'outline'}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 mb-3">
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {item.quantity}x {item.productName}{' '}
                          <span className="text-xs">({formatCurrency(item.subtotal)})</span>
                        </p>
                      ))}
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Sua comissão: <span className="font-medium text-primary">{formatCurrency(order.commissionAmount)}</span>
                      </span>
                      <span className="font-serif font-semibold text-base">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
