import { useEffect, useState } from 'react';
import { Wallet, CreditCard, Banknote, Landmark, ArrowLeftRight, QrCode, Save, Lock, Eye, EyeOff, UserPlus, Users, Check, X, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStoredToken } from '@/lib/auth';

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
  infinitepayEnabled: boolean;
  infinitepayHandle: string | null;
};

const PIX_KEY_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'Email',
  telefone: 'Telefone',
  aleatoria: 'Chave Aleatória',
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
  { key: 'infinitepayEnabled', label: 'InfinitePay (Link Cartao/Pix)', icon: Link2 },
];

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('');
  const [pixRecipientName, setPixRecipientName] = useState('');
  const [infinitepayHandle, setInfinitepayHandle] = useState('');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    pixEnabled: true,
    dinheiroEnabled: true,
    cartaoCreditoEnabled: true,
    cartaoDebitoEnabled: true,
    boletoEnabled: true,
    transferenciaEnabled: true,
    infinitepayEnabled: false,
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
          setInfinitepayHandle(data.infinitepayHandle ?? '');
          setToggles({
            pixEnabled: data.pixEnabled,
            dinheiroEnabled: data.dinheiroEnabled,
            cartaoCreditoEnabled: data.cartaoCreditoEnabled,
            cartaoDebitoEnabled: data.cartaoDebitoEnabled,
            boletoEnabled: data.boletoEnabled,
            transferenciaEnabled: data.transferenciaEnabled,
            infinitepayEnabled: data.infinitepayEnabled,
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
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (getStoredToken() ?? '') },
        body: JSON.stringify({
          pixKey: pixKey.trim() || null,
          pixKeyType: pixKeyType || null,
          pixRecipientName: pixRecipientName.trim() || null,
          infinitepayHandle: infinitepayHandle.trim() || null,
          ...toggles,
        }),
      });
      if (!res.ok) throw new Error('failed');
      toast({ title: 'Configurações salvas com sucesso' });
    } catch {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await fetch(apiBase() + '/api/users', { headers: { authorization: 'Bearer ' + (getStoredToken() ?? '') } });
      if (res.ok) setAdmins(await res.json());
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleCreateAdmin = async () => {
    setCreatingAdmin(true);
    try {
      const res = await fetch(apiBase() + '/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (getStoredToken() ?? '') },
        body: JSON.stringify({ name: newAdminName, email: newAdminEmail, password: newAdminPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Falha ao criar administrador');
      }
      toast({ title: 'Administrador criado com sucesso' });
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      loadAdmins();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao criar administrador', variant: 'destructive' });
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleToggleAdmin = async (id: number, active: boolean) => {
    try {
      const res = await fetch(apiBase() + '/api/users/' + id, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (getStoredToken() ?? '') },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Falha ao atualizar administrador');
      }
      loadAdmins();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao atualizar administrador', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch(apiBase() + '/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (getStoredToken() ?? '') },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Falha ao trocar senha');
      }
      toast({ title: 'Senha alterada com sucesso' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao trocar senha', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-8 pb-12" data-testid="page-settings">
      <div>
        <h1 className="text-3xl font-serif font-medium tracking-tight">Configurações</h1>
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
              placeholder="CPF, email, telefone ou chave aleatória"
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

      {/* InfinitePay */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-3 max-w-2xl">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-medium">InfinitePay</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-3">
          Gera um link de pagamento (cartao ate 12x ou Pix) direto no pedido da consultora. Informe sua InfiniteTag, sem o $.
        </p>
        <div className="space-y-2">
          <Label>InfiniteTag (handle)</Label>
          <Input
            placeholder="sua-infinite-tag"
            value={infinitepayHandle}
            onChange={(e) => setInfinitepayHandle(e.target.value)}
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
          Desative as formas de pagamento que você não aceita - elas somem da tela de pedido da consultora.
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
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </Button>

      {/* Change password */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4 max-w-2xl">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-medium">Trocar Senha</h2>
        </div>

        <div className="space-y-2">
          <Label>Senha atual</Label>
          <div className="relative">
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar nova senha</Label>
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
            />
          </div>
        </div>

        <Button
          onClick={handleChangePassword}
          disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
          variant="outline"
          className="font-medium"
        >
          {changingPassword ? 'Alterando...' : 'Alterar Senha'}
        </Button>
      </div>

      {/* Admin management */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4 max-w-2xl">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-medium">Administradores</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-3">
          Pessoas com acesso completo ao painel (produtos, pedidos, consultoras e configurações).
        </p>

        {loadingAdmins ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{admin.name}</p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </div>
                <button
                  onClick={() => handleToggleAdmin(admin.id, !admin.active)}
                  className={"flex items-center gap-1 text-xs px-2 py-1 rounded-full border " + (admin.active ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-border text-muted-foreground")}
                >
                  {admin.active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {admin.active ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-border space-y-3">
          <Label className="text-sm font-medium">Adicionar novo administrador</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Nome" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} />
            <Input placeholder="Email" type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
          </div>
          <Input placeholder="Senha (mínimo 6 caracteres)" type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} />
          <Button
            onClick={handleCreateAdmin}
            disabled={creatingAdmin || !newAdminName || !newAdminEmail || newAdminPassword.length < 6}
            variant="outline"
            className="font-medium"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {creatingAdmin ? 'Criando...' : 'Criar Administrador'}
          </Button>
        </div>
      </div>
    </div>
  );
}