import { useState } from 'react';
import * as XLSX from 'xlsx';
import { getListProductsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Upload, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getStoredToken } from '@/lib/auth';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? '';
}

const ID_HEADER_CANDIDATES = ['id', 'id do produto', 'codigo', 'cÃƒÂ³digo'];
const NAME_HEADER_CANDIDATES = ['nome do produto', 'nome', 'produto'];
const PRICE_HEADER_CANDIDATES = ['preÃƒÂ§o', 'preco', 'novo preÃƒÂ§o', 'novo preco', 'valor'];

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parsePriceToCents(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number') return Math.round(raw * 100);
  let cleaned = String(raw).replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const value = parseFloat(cleaned);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

type ParsedRow = { id?: number; name: string; price: number };

export function PriceUpdateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ updated: number; notFound: string[] } | null>(null);

  const reset = () => {
    setFileName('');
    setParsedRows([]);
    setParseError('');
    setResult(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParseError('');
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (rows.length === 0) {
        setParseError('A planilha estÃƒÂ¡ vazia.');
        return;
      }

      const headers = Object.keys(rows[0]);
      const idHeader = headers.find((h) => ID_HEADER_CANDIDATES.includes(normalizeHeader(h)));
      const nameHeader = headers.find((h) => NAME_HEADER_CANDIDATES.includes(normalizeHeader(h)));
      const priceHeader = headers.find((h) => PRICE_HEADER_CANDIDATES.includes(normalizeHeader(h)));

      if (!nameHeader || !priceHeader) {
        setParseError(
          'NÃƒÂ£o encontrei as colunas esperadas. Use uma coluna "Nome do Produto" e outra "PreÃƒÂ§o".',
        );
        return;
      }

      const parsed: ParsedRow[] = [];
      for (const row of rows) {
        const name = String(row[nameHeader] ?? '').trim();
        const price = parsePriceToCents(row[priceHeader]);
        if (!name || price === null) continue;
        const rawId = idHeader ? row[idHeader] : undefined;
        const id =
          rawId !== undefined && rawId !== '' && !Number.isNaN(Number(rawId)) ? Number(rawId) : undefined;
        parsed.push({ id, name, price });
      }

      if (parsed.length === 0) {
        setParseError('Nenhuma linha vÃƒÂ¡lida encontrada na planilha.');
        return;
      }

      setParsedRows(parsed);
    } catch {
      setParseError('NÃƒÂ£o consegui ler esse arquivo. Confirme que ÃƒÂ© um .xlsx vÃƒÂ¡lido.');
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase()}/api/products/bulk-price-update`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (getStoredToken() ?? '') },
        body: JSON.stringify({ updates: parsedRows }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setResult(data);
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      toast({ title: `${data.updated} produto(s) atualizado(s)` });
    } catch {
      toast({ title: 'Erro ao atualizar preÃƒÂ§os', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Atualizar PreÃƒÂ§os via Planilha</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!result && (
            <>
              <p className="text-sm text-muted-foreground">
                Envie um arquivo <strong>.xlsx</strong> com uma coluna <strong>Nome do Produto</strong> e uma
                coluna <strong>PreÃƒÂ§o</strong> (ex: 199,90). Se a planilha tiver uma coluna <strong>ID</strong>{' '}
                (como a exportada pelo sistema), ela ÃƒÂ© usada pra identificar o produto com mais precisÃƒÂ£o.
              </p>

              <label
                htmlFor="price-update-file"
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-8 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName || 'Clique para escolher a planilha'}</span>
                <span className="text-xs text-muted-foreground">.xlsx ou .xls</span>
                <input
                  id="price-update-file"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </label>

              {parseError && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}

              {parsedRows.length > 0 && (
                <div className="border border-border rounded-md">
                  <div className="px-3 py-2 border-b border-border bg-muted/30 text-sm font-medium">
                    {parsedRows.length} linha(s) prontas para atualizar
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <div key={idx} className="px-3 py-1.5 text-sm flex justify-between gap-2">
                        <span className="truncate">
                          {row.id !== undefined && (
                            <span className="text-muted-foreground">#{row.id} </span>
                          )}
                          {row.name}
                        </span>
                        <span className="text-muted-foreground shrink-0">{formatCurrency(row.price)}</span>
                      </div>
                    ))}
                    {parsedRows.length > 50 && (
                      <div className="px-3 py-1.5 text-xs text-muted-foreground">
                        + {parsedRows.length - 50} outra(s) linha(s)...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary bg-primary/10 rounded-md p-3">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">{result.updated} produto(s) atualizado(s) com sucesso.</span>
              </div>
              {result.notFound.length > 0 && (
                <div className="border border-border rounded-md">
                  <div className="px-3 py-2 border-b border-border bg-muted/30 text-sm font-medium">
                    {result.notFound.length} nome(s) nÃƒÂ£o encontrados no catÃƒÂ¡logo
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-border">
                    {result.notFound.map((name, idx) => (
                      <div key={idx} className="px-3 py-1.5 text-sm text-muted-foreground">
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          {result ? (
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={parsedRows.length === 0 || submitting}>
                {submitting ? 'Atualizando...' : `Atualizar ${parsedRows.length || ''} Produto(s)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
