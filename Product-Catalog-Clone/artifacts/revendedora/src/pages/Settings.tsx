import { useEffect, useState } from 'react';
import { Wallet, CreditCard, Banknote, Landmark, ArrowLeftRight, QrCode, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SettingsData = {
  pixKey: string | null;
  pixKeyType: string | null;
  pixRecipientName: string | null;
  pixEnabled: boolean;
  dinheiroEnabled: boolean;
  cartaoCreditoEnabled: boolean;
  cartaoDebitoEnabled: boolean;
  boletoEnabled: boolean;
  transferenciaEnabled: boolean;
};

const PIX_KEY_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'Email',
  telefone: 'Telefone',
  aleatoria: 'Chave Aleatoria',
};

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? '';
}

const PAYMENT_TOGGLES: Array<{ key: keyof SettingsData; label: string; icon: typeof Wallet }> = [
  { key: 'pixEnabled', label: 'PIX', icon: QrCode },
  { key: 'dinheiroEnabled', label: 'Dinheiro', icon: Banknote },
  { key: 'cartaoCreditoEnabled', label: 'Cartao de Credito', icon: CreditCard },
  { key: 'cartaoDebitoEnabled', label: 'Cartao de Debito', icon: CreditCard },
  { key: 'boletoEnabled', label: 'Boleto', icon: Landmark },
  { key: 'transferenciaEnabled', label: 'Transferencia Bancaria', icon: ArrowLeftRight },
];

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('');
  const [pixRecipientName, setPixRecipientName] = useState('');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    pixEnabled: true,
    dinheiroEnabled: true,
    cartaoCreditoEnabled: true,
    cartaoDebitoEnabled: true,
    boletoEnabled: true,
    transferenciaEnabled: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiBase() + '/api/settings', { credentials: 'include' });
        if (res.ok) {
          const data: SettingsData = await res.json();
          setPixKey(data.pixKey ?? '');
          setPixKeyType(data.pixKeyType ?? '');
          setPixRecipientName(data.pixRecipientName ?? '');
          setToggles({
            pixEnabled: data.pixEnabled,
            dinheiroEnabled: data.dinheiroEnabled,
            cartaoCreditoEnabled: data.cartaoCreditoEnabled,
            cartaoDebitoEnabled: data.cartaoDebitoEnabled,
            boletoEnabled: data.boletoEnabled,
            transferenciaEnabled: data.transferenciaEnabled,
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(apiBase() + '/api/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pixKey: pixKey.trim() || null,
          pixKeyType: pixKeyType || null,
          pixRecipientName: pixRecipientName.trim() || null,
          ...toggles,
        }),
      });
      if (!res.ok) throw new Error('failed');
      toast({ title: 'Configuracoes salvas com sucesso' });
    } catch {
      toast({ title: 'Erro ao salvar configuracoes', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-8 pb-12" data-testid="page-settings">
      <div>
        <h1 className="text-3xl font-serif font-medium tracking-tight">Configuracoes</h1>
        <p className="text-muted-foreground mt-1">Chave PIX e formas de pagamento disponiveis para as consultoras.</p>
      </div>

      {/* PIX */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-medium">Chave PIX</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-3">
          Essa chave aparece pra consultora quando ela escolhe PIX como forma de pagamento no pedido.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de chave</Label>
            <Select value={pixKeyType} onValueChange={setPixKeyType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PIX_KEY_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Chave PIX</Label>
            <Input
              placeholder="CPF, email, telefone ou chave aleatoria"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Nome do recebedor (opcional)</Label>
          <Input
            placeholder="Nome que aparece pra consultora conferir"
            value={pixRecipientName}
            onChange={(e) => setPixRecipientName(e.target.value)}
          />
        </div>
      </div>

      {/* Payment methods */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-1 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-medium">Formas de Pagamento</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-3 mb-4">
          Desative as formas de pagamento que voce nao aceita - elas somem da tela de pedido da consultora.
        </p>

        {PAYMENT_TOGGLES.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
            <div className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <Switch
              checked={toggles[key]}
              onCheckedChange={(checked) => setToggles((prev) => ({ ...prev, [key]: checked }))}
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="font-medium">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Salvando...' : 'Salvar Configuracoes'}
      </Button>
    </div>
  );
}