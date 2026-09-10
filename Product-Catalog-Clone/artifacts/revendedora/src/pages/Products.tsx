import { useState } from 'react';
import * as XLSX from 'xlsx';
import { PriceUpdateDialog } from '@/components/PriceUpdateDialog';
import { PercentageUpdateDialog } from '@/components/PercentageUpdateDialog';
import { 
  useListProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  getListProductsQueryKey
} from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Edit2, Trash2, X, AlertCircle, Package, FileSpreadsheet, Download, Percent } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import React from 'react';

const CATEGORIES = [
  'Perfume Árabe',
  'Perfume Francês',
  'Perfumes De Nicho',
  'Perfumes Miniatura',
  'Body Splash',
  'Kits',
  'Óleo Perfumado',
  'Gel De Banho / Sabonete Liquido',
  'Hidratantes',
  'Cabelo',
  'Pasta',
  'Skincare',
  'Spray Corporal',
  'Aerosol Ambiente',
];

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  // Load all products once; filter client-side for instant sidebar interaction
  const { data: allProducts = [], isLoading } = useListProducts({});

  const handleExport = () => {
    const rows = allProducts.map((p) => ({
      ID: p.id,
      'Nome do Produto': p.name,
      Marca: p.brand,
      Categoria: p.category,
      Preço: Math.round(p.price) / 100,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [{ wch: 8 }, { wch: 55 }, { wch: 22 }, { wch: 22 }, { wch: 12 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Produtos');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `catalogo-precos-${today}.xlsx`);
  };

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isPriceUpdateOpen, setIsPriceUpdateOpen] = useState(false);
  const [isPercentUpdateOpen, setIsPercentUpdateOpen] = useState(false);

  // Reset brand when category changes
  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setBrandFilter('all');
  };

  // Brands available for the current category selection
  const brandsInCategory = React.useMemo(() => {
    const pool = categoryFilter === 'all'
      ? allProducts
      : allProducts.filter(p => p.category === categoryFilter);
    const map = new Map<string, number>();
    pool.forEach(p => { if (p.brand) map.set(p.brand, (map.get(p.brand) ?? 0) + 1); });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([brand, count]) => ({ brand, count }));
  }, [allProducts, categoryFilter]);

  // Final filtered list
  const filtered = React.useMemo(() => {
    return allProducts.filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (brandFilter !== 'all' && p.brand !== brandFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allProducts, categoryFilter, brandFilter, searchTerm]);

  return (
    <div className="pb-12" data-testid="page-products">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Catálogo de Produtos</h1>
          <p className="text-muted-foreground mt-1">
            {allProducts.length} produtos em {CATEGORIES.length} categorias
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleExport} variant="outline" className="flex-1 sm:flex-none font-medium" data-testid="btn-export-catalog">
            <Download className="h-4 w-4 mr-2" />
            Exportar Catálogo
          </Button>
          <Button onClick={() => setIsPriceUpdateOpen(true)} variant="outline" className="flex-1 sm:flex-none font-medium" data-testid="btn-bulk-price-update">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Atualizar Preços
          </Button>
          <Button onClick={() => setIsPercentUpdateOpen(true)} variant="outline" className="flex-1 sm:flex-none font-medium" data-testid="btn-percent-price-update">
            <Percent className="h-4 w-4 mr-2" />
            Ajustar %
          </Button>
          <Button onClick={() => setIsPercentUpdateOpen(true)} variant="outline" className="flex-1 sm:flex-none font-medium" data-testid="btn-percent-price-update">
            <Percent className="h-4 w-4 mr-2" />
            Ajustar %
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="flex-1 sm:flex-none font-medium" data-testid="btn-add-product">
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou marca..."
          className="pl-9 bg-card border-border shadow-sm"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setBrandFilter('all'); }}
        />
      </div>

      {/* Category tabs — matches top nav of atlanticostor */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => handleCategoryChange('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            categoryFilter === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-foreground hover:bg-muted'
          }`}
        >
          Todos
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              categoryFilter === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground hover:bg-muted'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Two-column: sidebar + grid */}
      <div className="flex gap-6 items-start">

        {/* Brand sidebar — "Subcategorias" like the site */}
        <aside className="hidden lg:block w-52 shrink-0 bg-card border border-border rounded-lg overflow-hidden sticky top-4">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Marcas</p>
          </div>
          <div className="py-2 max-h-[70vh] overflow-y-auto">
            <button
              onClick={() => setBrandFilter('all')}
              className={`w-full text-left px-4 py-2 text-sm transition-colors flex justify-between items-center ${
                brandFilter === 'all'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <span>Todas as marcas</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {categoryFilter === 'all' ? allProducts.length : allProducts.filter(p => p.category === categoryFilter).length}
              </span>
            </button>
            {brandsInCategory.map(({ brand, count }) => (
              <button
                key={brand}
                onClick={() => setBrandFilter(brand)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors flex justify-between items-center ${
                  brandFilter === brand
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <span className="truncate pr-2">{brand}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{count}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main grid */}
        <div className="flex-1 min-w-0">
          {/* Mobile brand filter (chips) */}
          {brandsInCategory.length > 0 && (
            <div className="lg:hidden flex gap-2 flex-wrap mb-4">
              <button
                onClick={() => setBrandFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  brandFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'
                }`}
              >
                Todas
              </button>
              {brandsInCategory.map(({ brand }) => (
                <button
                  key={brand}
                  onClick={() => setBrandFilter(brand)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    brandFilter === brand ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          )}

          {/* Result count */}
          {!isLoading && (
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length === allProducts.length
                ? `${filtered.length} produtos`
                : `${filtered.length} de ${allProducts.length} produtos`}
              {brandFilter !== 'all' && <span className="font-medium text-foreground"> · {brandFilter}</span>}
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 animate-pulse">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-72 bg-card rounded-lg border border-border" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-lg border border-border border-dashed">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchTerm ? 'Tente buscar com outros termos.' : 'Ajuste os filtros acima.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className={`bg-card rounded-lg border overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-md ${
                    !product.active ? 'opacity-60 grayscale-[0.4]' : 'border-border'
                  }`}
                >
                  <div className="aspect-[4/5] bg-white relative overflow-hidden flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                        <Package className="h-12 w-12 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 text-black hover:bg-white" onClick={() => setEditProduct(product)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => setDeleteId(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {!product.active && (
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded uppercase tracking-widest font-semibold backdrop-blur-sm">
                        Inativo
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-white/90 text-black text-[10px] px-2 py-1 rounded uppercase tracking-wider font-medium shadow-sm backdrop-blur-sm">
                      {product.brand}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
                    <h3 className="font-serif text-base font-semibold leading-tight line-clamp-2 mb-2">{product.name}</h3>
                    <div className="mt-auto pt-3 flex items-end justify-between">
                      <div>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.originalPrice)}</p>
                        )}
                        <p className="font-medium text-lg text-primary">{formatCurrency(product.price)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ProductDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      {editProduct && (
        <ProductDialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)} product={editProduct} />
      )}
      <DeleteProductDialog id={deleteId} onClose={() => setDeleteId(null)} />

      <PriceUpdateDialog open={isPriceUpdateOpen} onOpenChange={setIsPriceUpdateOpen} />
      <PercentageUpdateDialog open={isPercentUpdateOpen} onOpenChange={setIsPercentUpdateOpen} />
      <PercentageUpdateDialog open={isPercentUpdateOpen} onOpenChange={setIsPercentUpdateOpen} />
    </div>
  );
}

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  brand: z.string().min(1, "Marca é obrigatória"),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Preço inválido"),
  originalPrice: z.coerce.number().optional(),
  imageUrl: z.string().url("URL de imagem inválida").or(z.literal("")),
  active: z.boolean().default(true)
});

type ProductFormValues = z.infer<typeof productSchema>;

function ProductDialog({ open, onOpenChange, product }: { open: boolean, onOpenChange: (open: boolean) => void, product?: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const isEditing = !!product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      brand: product?.brand || '',
      category: product?.category || '',
      description: product?.description || '',
      price: product ? product.price / 100 : 0, // form works with reais
      originalPrice: product?.originalPrice ? product.originalPrice / 100 : undefined,
      imageUrl: product?.imageUrl || '',
      active: product?.active ?? true,
    }
  });

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: product?.name || '',
        brand: product?.brand || '',
        category: product?.category || '',
        description: product?.description || '',
        price: product ? product.price / 100 : 0,
        originalPrice: product?.originalPrice ? product.originalPrice / 100 : undefined,
        imageUrl: product?.imageUrl || '',
        active: product?.active ?? true,
      });
    }
  }, [open, product, form]);

  const onSubmit = (data: ProductFormValues) => {
    // Convert to cents
    const payload = {
      ...data,
      price: Math.round(data.price * 100),
      originalPrice: data.originalPrice ? Math.round(data.originalPrice * 100) : undefined,
    };

    if (isEditing) {
      updateProduct.mutate({ id: product.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: "Produto atualizado com sucesso" });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Erro ao atualizar produto", variant: "destructive" })
      });
    } else {
      createProduct.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: "Produto adicionado com sucesso" });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Erro ao adicionar produto", variant: "destructive" })
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{isEditing ? 'Editar Perfume' : 'Adicionar Perfume'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>Nome do Perfume</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>Marca (Maison)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>Categoria / Família</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Oriental, Floral, Amadeirado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>URL da Imagem</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Venda (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Original (opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none h-20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Produto Ativo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Produtos inativos não aparecem na listagem para novos pedidos.
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                {isEditing ? 'Salvar Alterações' : 'Adicionar Produto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProductDialog({ id, onClose }: { id: number | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteProduct = useDeleteProduct();

  const confirmDelete = () => {
    if (!id) return;
    deleteProduct.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast({ title: "Produto excluído com sucesso" });
        onClose();
      },
      onError: () => {
        toast({ title: "Erro ao excluir produto", description: "Ele pode estar vinculado a pedidos.", variant: "destructive" });
        onClose();
      }
    });
  };

  return (
    <AlertDialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Remover perfume do catálogo?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O produto será removido permanentemente, mas o histórico de pedidos não será afetado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Sim, remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
