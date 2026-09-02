import React from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Package, Users, ShoppingBag, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: '/', label: 'Painel', icon: LayoutDashboard },
    { href: '/produtos', label: 'Catálogo', icon: Package },
    { href: '/consultoras', label: 'Consultoras', icon: Users },
    { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen flex bg-background w-full font-sans text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex-shrink-0 hidden md:flex flex-col">
        <div className="h-20 flex items-center gap-3 px-5 border-b border-border">
          <img src="/logo.png" alt="Elisssence Parfum" className="h-14 w-14 rounded-full shrink-0 object-cover ring-2 ring-primary/40 shadow-sm" />
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
        <div className="p-4 border-t border-border">
          <Link
            href="/pedidos/novo"
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:brightness-110 transition-all shadow-sm"
            data-testid="nav-new-order"
          >
            <PlusCircle className="h-4 w-4" />
            Novo Pedido
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:hidden">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Elisssence Parfum" className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/40 shadow-sm" />
            <h1 translate="no" className="notranslate font-serif text-base font-semibold text-primary">Elisssence Parfum</h1>
          </div>
          <Link href="/pedidos/novo" className="text-primary p-2">
            <PlusCircle className="h-5 w-5" />
          </Link>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
      
      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card z-10 flex justify-around p-2 pb-safe">
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
