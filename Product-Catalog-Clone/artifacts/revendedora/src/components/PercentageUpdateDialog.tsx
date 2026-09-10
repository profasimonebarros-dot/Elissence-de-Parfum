import { useState, useEffect } from 'react';
import { getListProductsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Percent, Undo2, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getStoredToken } from '@/lib/auth';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? '';
}

function authHeaders() {
  return { 'content-type': 'application/json', authorization: 'Bearer ' + (getStoredToken() ?? '') };
}

type LatestBatch = {
  id: number;
  percentage: number;
  category: string | null;
  productsAffected: number;
  createdAt: string;
} | null;

interface PercentageUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PercentageUpdateDialog({ open, onOpenChange }: PercentageUpdateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [percentage, setPercentage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [latestBatch, setLatestBatch] = useState<LatestBatch>(null);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [reverting, setReverting] = useState(false);

  const loadLatestBatch = async () => {
    setLoadingBatch(true);
    try {
      const res = await fetch(apiBase() + '/api/products/price-batches/latest', { headers: authHeaders() });
      if (res.ok) setLatestBatch(await res.json());
    } finally {
      setLoadingBatch(false);
    }
  };

  useEffect(() => {
    if (open) loadLatestBatch();
  }, [open]);

  const handleApply = async () => {
    const value = parseFloat(percentage.replace(',', '.'));
    if (Number.isNaN(value) || value === 0) {
      toast({ title: 'Informe uma porcentagem valida (diferente de zero)', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiBase() + '/api/products/bulk-percentage-update', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ percentage: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Falha ao atualizar precos');
      }
      const data = await res.json();
      toast({ title: `Precos atualizados: ${data.updated} produto(s)` });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setPercentage('');
      loadLatestBatch();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao atualizar precos', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevert = async () => {
    if (!latestBatch) return;
    setReverting(true);
    try {
      const res = await fetch(apiBase() + '/api/products/price-batches/' + latestBatch.id + '/revert', {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Falha ao reverter');
      }
      const data = await res.json();
      toast({ title: `Revertido: ${data.restored} produto(s) voltaram ao preco anterior` });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setLatestBatch(null);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao reverter', variant: 'destructive' });
    } finally {
      setReverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Ajustar Precos em Massa (%)</DialogTitle>
          <DialogDescription>
            Aplica um aumento ou desconto percentual em todos os produtos ativos de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Porcentagem</Label>
            <Input
              placeholder="Ex: 10 para +10%, -5 para -5%"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use valores positivos para aumentar e negativos para diminuir os precos.
            </p>
          </div>

          <Button onClick={handleApply} disabled={submitting || !percentage} className="w-full font-medium">
            <Percent className="h-4 w-4 mr-2" />
            {submitting ? 'Aplicando...' : 'Aplicar a Todos os Produtos'}
          </Button>

          {!loadingBatch && latestBatch && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Ultima atualizacao em massa
              </div>
              <p className="text-xs text-amber-700">
                {latestBatch.percentage > 0 ? '+' : ''}
                {latestBatch.percentage}% em {latestBatch.productsAffected} produto(s), em {formatDate(latestBatch.createdAt)}.
              </p>
              <Button
                onClick={handleRevert}
                disabled={reverting}
                variant="outline"
                size="sm"
                className="w-full border-amber-400 text-amber-800 hover:bg-amber-100"
              >
                <Undo2 className="h-3.5 w-3.5 mr-2" />
                {reverting ? 'Revertendo...' : 'Reverter Esta Atualizacao'}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}