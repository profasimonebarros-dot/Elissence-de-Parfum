import { useState, useEffect } from 'react';
import { 
  useListConsultants, 
  useCreateConsultant, 
  useUpdateConsultant, 
  useDeleteConsultant,
  getListConsultantsQueryKey,
  useGetConsultantStats
} from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin, User, ChevronRight, Link2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'wouter';

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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Consultants() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: consultants = [], isLoading } = useListConsultants({ 
    search: searchTerm || undefined
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editConsultant, setEditConsultant] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  return (
    <div className="space-y-8 pb-12" data-testid="page-consultants">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Equipe de Consultoras</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas parceiras de vendas e comissÃµes.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto font-medium" data-testid="btn-add-consultant">
          <Plus className="h-4 w-4 mr-2" />
          Nova Consultora
        </Button>
      </div>

      <div className="bg-card p-2 rounded-lg border border-border shadow-sm flex items-center">
        <Search className="h-4 w-4 text-muted-foreground ml-3 mr-2" />
        <Input 
          placeholder="Buscar por nome, email ou telefone..." 
          className="bg-transparent border-none shadow-none focus-visible:ring-0 flex-1"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 bg-card rounded-lg border border-border"></div>
          ))}
        </div>
      ) : consultants.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-lg border border-border border-dashed">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhuma consultora encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchTerm ? "Tente buscar com outros termos." : "Cadastre sua primeira consultora para comeÃ§ar a registrar vendas."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {consultants.map((consultant) => (
            <ConsultantCard 
              key={consultant.id} 
              consultant={consultant} 
              onEdit={() => setEditConsultant(consultant)}
              onDelete={() => setDeleteId(consultant.id)}
            />
          ))}
        </div>
      )}

      <ConsultantDialog 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
      />

      {editConsultant && (
        <ConsultantDialog 
          open={!!editConsultant} 
          onOpenChange={(open) => !open && setEditConsultant(null)} 
          consultant={editConsultant} 
        />
      )}

      <DeleteConsultantDialog 
        id={deleteId} 
        onClose={() => setDeleteId(null)} 
      />
    </div>
  );
}

function ConsultantCard({ consultant, onEdit, onDelete }: { consultant: any, onEdit: () => void, onDelete: () => void }) {
  const { toast } = useToast();

  const copyPortalLink = async () => {
    const link = `${window.location.origin}/portal/${consultant.accessToken}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: 'Link copiado!', description: 'Envie esse link pra consultora fazer pedidos.' });
    } catch {
      toast({ title: 'Não foi possível copiar', description: link, variant: 'destructive' });
    }
  };
  const [isOpen, setIsOpen] = useState(false);
  const { data: stats } = useGetConsultantStats(consultant.id, {
    query: { enabled: isOpen, queryKey: ['consultantStats', consultant.id] }
  });

  return (
    <div className={`bg-card rounded-lg border transition-all duration-300 ${!consultant.active ? 'opacity-70 bg-muted/50 border-border/50' : 'border-border shadow-sm hover:shadow-md'}`}>
      <div className="p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif text-lg font-semibold">
              {consultant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg leading-none">{consultant.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium bg-secondary/10 text-secondary px-2 py-0.5 rounded">
                  {consultant.commissionRate}% ComissÃ£o
                </span>
                {!consultant.active && (
                  <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Inativa
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={copyPortalLink} title="Copiar link do portal da consultora">
              <Link2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 mt-2 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{consultant.phone || 'Sem telefone'}</span>
          </div>
          {consultant.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{consultant.email}</span>
            </div>
          )}
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4 pt-4 border-t border-border">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex justify-between items-center p-0 h-auto font-medium text-primary hover:bg-transparent">
              <span>Desempenho de Vendas</span>
              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4 animate-in slide-in-from-top-2">
            {stats ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-muted-foreground text-xs mb-1">Pedidos Totais</p>
                  <p className="font-semibold">{stats.totalOrders}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-muted-foreground text-xs mb-1">Faturamento</p>
                  <p className="font-semibold text-primary">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-muted-foreground text-xs mb-1">ComissÃµes (Total)</p>
                  <p className="font-semibold">{formatCurrency(stats.totalCommission)}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-muted-foreground text-xs mb-1">Pedidos Pendentes</p>
                  <p className="font-semibold text-amber-600">{stats.pendingOrders}</p>
                </div>
              </div>
            ) : (
              <div className="h-24 bg-muted/50 rounded-md animate-pulse"></div>
            )}
            
            <div className="flex justify-end pt-2">
              <Link href={`/pedidos?consultantId=${consultant.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  Ver todos os pedidos
                </Button>
              </Link>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

const consultantSchema = z.object({
  name: z.string().min(1, "Nome Ã© obrigatÃ³rio"),
  email: z.string().email("Email invÃ¡lido").or(z.literal("")),
  phone: z.string().min(8, "Telefone Ã© obrigatÃ³rio"),
  cpf: z.string().optional(),
  address: z.string().optional(),
  commissionRate: z.coerce.number().min(0, "MÃ­nimo 0").max(100, "MÃ¡ximo 100"),
  active: z.boolean().default(true),
  notes: z.string().optional()
});

type ConsultantFormValues = z.infer<typeof consultantSchema>;

function ConsultantDialog({ open, onOpenChange, consultant }: { open: boolean, onOpenChange: (open: boolean) => void, consultant?: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createConsultant = useCreateConsultant();
  const updateConsultant = useUpdateConsultant();

  const isEditing = !!consultant;

  const form = useForm<ConsultantFormValues>({
    resolver: zodResolver(consultantSchema),
    defaultValues: {
      name: consultant?.name || '',
      email: consultant?.email || '',
      phone: consultant?.phone || '',
      cpf: consultant?.cpf || '',
      address: consultant?.address || '',
      commissionRate: consultant?.commissionRate ?? 20,
      active: consultant?.active ?? true,
      notes: consultant?.notes || '',
    }
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        name: consultant?.name || '',
        email: consultant?.email || '',
        phone: consultant?.phone || '',
        cpf: consultant?.cpf || '',
        address: consultant?.address || '',
        commissionRate: consultant?.commissionRate ?? 20,
        active: consultant?.active ?? true,
        notes: consultant?.notes || '',
      });
    }
  }, [open, consultant, form]);

  const onSubmit = (data: ConsultantFormValues) => {
    if (isEditing) {
      updateConsultant.mutate({ id: consultant.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConsultantsQueryKey() });
          toast({ title: "Consultora atualizada com sucesso" });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Erro ao atualizar consultora", variant: "destructive" })
      });
    } else {
      createConsultant.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConsultantsQueryKey() });
          toast({ title: "Consultora adicionada com sucesso" });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Erro ao adicionar consultora", variant: "destructive" })
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{isEditing ? 'Editar Consultora' : 'Nova Consultora'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>WhatsApp / Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>Email (opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="nome@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>CPF (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commissionRate"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>% de ComissÃ£o</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" min="0" max="100" {...field} className="pr-8" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EndereÃ§o Completo (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ObservaÃ§Ãµes (opcional)</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none h-20" placeholder="PreferÃªncias, rota de entrega..." {...field} />
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
                    <FormLabel className="text-base">Cadastro Ativo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Pode realizar novos pedidos.
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
              <Button type="submit" disabled={createConsultant.isPending || updateConsultant.isPending}>
                {isEditing ? 'Salvar AlteraÃ§Ãµes' : 'Cadastrar Consultora'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { AlertCircle, Users } from 'lucide-react';
function DeleteConsultantDialog({ id, onClose }: { id: number | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteConsultant = useDeleteConsultant();

  const confirmDelete = () => {
    if (!id) return;
    deleteConsultant.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConsultantsQueryKey() });
        toast({ title: "Consultora removida com sucesso" });
        onClose();
      },
      onError: () => {
        toast({ title: "Erro ao remover", description: "Ela pode possuir pedidos vinculados. Considere inativÃ¡-la.", variant: "destructive" });
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
            Remover consultora?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta aÃ§Ã£o nÃ£o pode ser desfeita. Se ela possuir histÃ³rico de vendas, recomendamos apenas marcar o cadastro como "Inativo" editando o perfil.
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
