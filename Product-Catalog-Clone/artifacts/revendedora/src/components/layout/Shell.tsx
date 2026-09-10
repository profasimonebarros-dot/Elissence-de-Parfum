import React from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Package, Users, ShoppingBag, PlusCircle, Settings as SettingsIcon, LogOut, Bell, BellRing, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { usePushNotifications } from '@/hooks/use-push-notifications';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { supported, permission, subscribing, subscribe } = usePushNotifications('/api/push/subscribe');

  const navItems = [
    { href: '/', label: 'Painel', icon: LayoutDashboard },
    { href: '/produtos', label: 'Catálogo', icon: Package },
    { href: '/consultoras', label: 'Consultoras', icon: Users },
    { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
    { href: '/relatorios', label: 'Relatórios', icon: FileText },
    { href: '/configuracoes', label: 'Configurações', icon: SettingsIcon },
  ];

  const notifEnabled = permission === 'granted';

  return (
    <div className="min-h-screen flex bg-background w-full font-sans text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex-shrink-0 hidden md:flex flex-col print:hidden">
        <div className="h-20 flex items-center gap-3 px-5 border-b border-border">
          <img src="/logo.png" alt="Elisssence Parfum" className="h-14 w-14 rounded-full shrink-0 object-cover" />
          <h1 translate="no" className="notranslate font-serif text-base font-semibold tracking-wide text-primary leading-tight">Elisssence<br />Parfum</h1>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-3">
          {supported && !notifEnabled && (
            <button
              onClick={() => subscribe()}
              disabled={subscribing}
              className="flex items-center justify-center gap-2 w-full border border-border py-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              data-testid="button-enable-notifications"
            >
              <Bell className="h-3.5 w-3.5" />
              {subscribing ? 'Ativando...' : 'Ativar notificações'}
            </button>
          )}
          {notifEnabled && (
            <div className="flex items-center justify-center gap-2 w-full py-1 rounded-md text-xs text-muted-foreground">
              <BellRing className="h-3.5 w-3.5 text-primary" />
              Notificações ativas
            </div>
          )}
          <Link
            href="/pedidos/novo"
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:brightness-110 transition-all shadow-sm"
            data-testid="nav-new-order"
          >
            <PlusCircle className="h-4 w-4" />
            Novo Pedido
          </Link>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground truncate">{user?.name}</span>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:hidden print:hidden">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Elisssence Parfum" className="h-12 w-12 rounded-full object-cover" />
            <h1 translate="no" className="notranslate font-serif text-base font-semibold text-primary">Elisssence Parfum</h1>
          </div>
          <div className="flex items-center gap-3">
            {supported && !notifEnabled && (
              <button onClick={() => subscribe()} disabled={subscribing} className="text-muted-foreground p-2" data-testid="button-enable-notifications-mobile">
                <Bell className="h-5 w-5" />
              </button>
            )}
            <button onClick={() => logout()} className="text-muted-foreground p-2" data-testid="button-logout-mobile">
              <LogOut className="h-5 w-5" />
            </button>
            <Link href="/pedidos/novo" className="text-primary p-2">
              <PlusCircle className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 print:overflow-visible print:p-0">
          <div className="max-w-6xl mx-auto print:max-w-none">
            {children}
          </div>
        </div>
        <footer className="px-4 md:px-8 py-4 text-center text-xs text-muted-foreground border-t border-border print:hidden">
          Imagens meramente ilustrativas. Todos os direitos sobre marcas e imagens pertencem aos seus respectivos fabricantes. Prazo de entrega: até 15 dias úteis.
        </footer>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card z-10 flex justify-around p-2 pb-safe print:hidden">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-16 rounded-md",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}