import { useState, useMemo } from 'react';
import { 
  useListProducts, 
  useListConsultants,
  useCreateOrder,
  type OrderInputPaymentMethod,
} from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Minus, Trash2, CheckCircle2, ShoppingBag, CreditCard } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function NewOrder() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: products = [], isLoading: loadingProducts } = useListProducts({ active: true });
  const { data: consultants = [], isLoading: loadingConsultants } = useListConsultants({ active: true });
  const createOrder = useCreateOrder();

  const [consultantId, setConsultantId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<OrderInputPaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cart state: Array of { product, quantity }
  const [cart, setCart] = useState<Array<{ product: any, quantity: number }>>([]);

  const selectedConsultant = useMemo(() => 
    consultants.find(c => c.id.toString() === consultantId), 
  [consultants, consultantId]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lower = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.brand.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower)
    );
  }, [products, searchTerm]);

  // Cart calculations
  const cartSubtotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
  [cart]);

  const estimatedCommission = useMemo(() => {
    if (!selectedConsultant) return 0;
    return Math.round(cartSubtotal * (selectedConsultant.commissionRate / 100));
  }, [cartSubtotal, selectedConsultant]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast({ title: "Adicionado ao pedido", description: product.name });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleSubmit = () => {
    if (!consultantId) {
      toast({ title: "Selecione uma consultora", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "O pedido está vazio", variant: "destructive" });
      return;
    }

    createOrder.mutate({
      data: {
        consultantId: parseInt(consultantId),
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        }))
      }
    }, {
      onSuccess: (order) => {
        toast({ title: "Pedido criado com sucesso" });
        setLocation(`/pedidos/${order.id}`);
      },
      onError: () => {
        toast({ title: "Erro ao criar pedido", variant: "destructive" });
      }
    });
  };

  if (loadingProducts || loadingConsultants) {
    return <div className="p-8 text-center animate-pulse">Carregando catálogo...</div>;
  }

  return (
    <div className="space-y-8 pb-12" data-testid="page-new-order">
      <div>
        <h1 className="text-3xl font-serif font-medium tracking-tight">Novo Pedido</h1>
        <p className="text-muted-foreground mt-1">Selecione os perfumes e a consultora para criar um pedido.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Products */}
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
              <div key={product.id} className="bg-card rounded-lg border border-border overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                <div className="h-40 bg-white relative flex items-center justify-center overflow-hidden">
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-2" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-2 left-3 right-3 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">{product.brand}</p>
                    <p className="font-serif font-medium text-sm leading-tight line-clamp-1">{product.name}</p>
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

        {/* Right Column: Order Summary */}
        <div className="w-full lg:w-1/3 bg-card rounded-lg border border-border shadow-sm sticky top-4 flex flex-col max-h-[calc(100vh-2rem)]">
          <div className="p-5 border-b border-border bg-muted/20">
            <h2 className="font-serif text-lg font-medium mb-4">Resumo do Pedido</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Consultora Responsável</label>
              <Select value={consultantId} onValueChange={setConsultantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a consultora..." />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name} ({c.commissionRate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Forma de Pagamento
              </label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as OrderInputPaymentMethod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartao de Credito</SelectItem>
                  <SelectItem value="cartao_debito">Cartao de Debito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 flex flex-col items-center">
                <ShoppingBag className="h-10 w-10 opacity-20 mb-2" />
                <p className="text-sm">O pedido está vazio</p>
                <p className="text-xs mt-1">Adicione perfumes pelo catálogo ao lado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-start justify-between gap-2 group">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)} un.</p>
                      
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
              
              {selectedConsultant && (
                <div className="flex justify-between text-primary font-medium">
                  <span>Comissão Estimada ({selectedConsultant.commissionRate}%)</span>
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
              disabled={cart.length === 0 || !consultantId || createOrder.isPending}
              onClick={handleSubmit}
            >
              {createOrder.isPending ? 'Criando...' : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" /> Confirmar Pedido
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
