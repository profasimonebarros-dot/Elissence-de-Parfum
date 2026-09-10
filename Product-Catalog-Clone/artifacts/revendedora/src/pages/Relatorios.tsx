import { useState, useMemo } from 'react';
import { useListOrders, useListConsultants } from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function Relatorios() {
  const [fromDate, setFromDate] = useState(firstDayOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());

  const { data: orders = [] } = useListOrders({});
  const { data: consultants = [] } = useListConsultants();

  const filteredOrders = useMemo(() => {
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');
    return orders
      .filter((o: any) => {
        const created = new Date(o.createdAt);
        return created >= from && created <= to;
      })
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, fromDate, toDate]);

  const totals = useMemo(() => {
    return filteredOrders.reduce(
      (acc: any, o: any) => {
        acc.count += 1;
        acc.revenue += o.totalAmount;
        acc.commission += o.commissionAmount;
        return acc;
      },
      { count: 0, revenue: 0, commission: 0 },
    );
  }, [filteredOrders]);

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  };

  return (
    <div className="space-y-8 pb-12" data-testid="page-relatorios">
      <div className="print:hidden">
        <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">Relatorios</h1>
        <p className="text-muted-foreground mt-1">Vendas por periodo e cadastro de consultoras.</p>
      </div>

      <Tabs defaultValue="vendas">
        <TabsList className="print:hidden">
          <TabsTrigger value="vendas">
            <FileText className="h-4 w-4 mr-2" />
            Vendas por Periodo
          </TabsTrigger>
          <TabsTrigger value="consultoras">
            <Users className="h-4 w-4 mr-2" />
            Consultoras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-6">
          <div className="flex flex-wrap items-end gap-4 print:hidden">
            <div className="space-y-2">
              <Label>De</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ate</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <Button onClick={() => window.print()} className="font-medium">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>

          <div className="hidden print:block mb-4">
            <h1 className="text-2xl font-serif font-semibold">Relatorio de Vendas</h1>
            <p className="text-sm text-muted-foreground">
              Periodo: {formatDate(fromDate)} a {formatDate(toDate)}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="text-sm text-muted-foreground">Pedidos</p>
              <p className="text-2xl font-serif font-semibold">{totals.count}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="text-sm text-muted-foreground">Faturamento</p>
              <p className="text-2xl font-serif font-semibold">{formatCurrency(totals.revenue)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="text-sm text-muted-foreground">Comissoes</p>
              <p className="text-2xl font-serif font-semibold">{formatCurrency(totals.commission)}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-3">Data</th>
                  <th className="p-3">Pedido</th>
                  <th className="p-3">Consultora</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Comissao</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o: any) => (
                  <tr key={o.id} className="border-b border-border last:border-b-0">
                    <td className="p-3">{formatDate(o.createdAt)}</td>
                    <td className="p-3">#{o.id.toString().padStart(4, '0')}</td>
                    <td className="p-3">{o.consultantName}</td>
                    <td className="p-3">{STATUS_LABELS[o.status] ?? o.status}</td>
                    <td className="p-3 text-right">{formatCurrency(o.totalAmount)}</td>
                    <td className="p-3 text-right">{formatCurrency(o.commissionAmount)}</td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Nenhum pedido nesse periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="consultoras" className="space-y-6">
          <div className="flex justify-end print:hidden">
            <Button onClick={() => window.print()} className="font-medium">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>

          <div className="hidden print:block mb-4">
            <h1 className="text-2xl font-serif font-semibold">Consultoras Cadastradas</h1>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-3">Nome</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">CPF</th>
                  <th className="p-3">Endereco</th>
                  <th className="p-3 text-right">Comissao</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Cadastrada em</th>
                </tr>
              </thead>
              <tbody>
                {consultants.map((c: any) => (
                  <tr key={c.id} className="border-b border-border last:border-b-0">
                    <td className="p-3">{c.name}</td>
                    <td className="p-3">{c.email}</td>
                    <td className="p-3">{c.phone}</td>
                    <td className="p-3">{c.cpf ?? '-'}</td>
                    <td className="p-3">{c.address ?? '-'}</td>
                    <td className="p-3 text-right">{c.commissionRate}%</td>
                    <td className="p-3">{c.active ? 'Ativa' : 'Inativa'}</td>
                    <td className="p-3">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
                {consultants.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      Nenhuma consultora cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}