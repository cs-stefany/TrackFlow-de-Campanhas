import { useState } from 'react';
import { LayoutDashboard, Tags, Video, ChevronLeft, ChevronRight, Archive, MoreHorizontal } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSidebarContext } from '@/components/MainLayout';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const navigation = [
  { name: 'Painel', href: '/', icon: LayoutDashboard },
  { name: 'Minhas Ofertas', href: '/ofertas', icon: Tags },
  { name: 'Meus Criativos', href: '/criativos', icon: Video },
];

const archiveNavigation = [
  { name: 'Ofertas Arquivadas', href: '/ofertas-arquivadas', icon: Archive },
  { name: 'Criativos Arquivados', href: '/criativos-arquivados', icon: Archive },
];

export function AppSidebar() {
  const location = useLocation();
  const { collapsed, setCollapsed } = useSidebarContext();

  // Get the referrer path from navigation state for offer details pages
  const fromPath = (location.state as { from?: string })?.from;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-screen border-r border-border bg-card transition-all duration-300 md:block',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">TF</span>
              </div>
              <span className="text-lg font-semibold text-foreground">TrackFlow</span>
            </div>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
              <span className="text-sm font-bold text-primary-foreground">TF</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            // Check if we're on an offer details page (/ofertas/:id)
            const isOfferDetailsPage = location.pathname.match(/^\/ofertas\/[^/]+$/);

            let isActive = false;
            if (isOfferDetailsPage && fromPath) {
              // On offer details page with referrer - highlight based on where user came from
              isActive = item.href === fromPath;
            } else if (isOfferDetailsPage) {
              // On offer details page without referrer - highlight "Minhas Ofertas"
              isActive = item.href === '/ofertas';
            } else {
              // Normal page - exact match or prefix match (excluding archive pages)
              isActive = location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href) && !location.pathname.includes('arquivad'));
            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
          
          {/* Archive Section */}
          {!collapsed && (
            <div className="pt-4 mt-4 border-t border-border">
              <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Arquivados
              </p>
            </div>
          )}
          {archiveNavigation.map((item) => {
            // Check if we're on an offer details page (/ofertas/:id)
            const isOfferDetailsPage = location.pathname.match(/^\/ofertas\/[^/]+$/);

            let isActive = false;
            if (isOfferDetailsPage && fromPath) {
              // On offer details page with referrer - highlight based on where user came from
              isActive = item.href === fromPath;
            } else {
              isActive = location.pathname === item.href;
            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full justify-center text-muted-foreground hover:text-foreground',
              collapsed && 'px-2'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Recolher</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNavigation() {
  const location = useLocation();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const isArchiveRoute = location.pathname.includes('arquivad');

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur md:hidden">
        <NavLink to="/" className="flex items-center gap-2.5" aria-label="Ir para o painel">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <span className="text-sm font-bold text-primary-foreground">TF</span>
          </div>
          <div>
            <p className="text-base font-semibold leading-none text-foreground">TrackFlow</p>
            <p className="mt-1 text-[11px] leading-none text-muted-foreground">Campanhas em foco</p>
          </div>
        </NavLink>
        <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
          Online
        </span>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden" aria-label="Navegação principal">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {navigation.map((item) => {
            const isActive = item.href === '/'
              ? location.pathname === '/'
              : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground active:bg-muted'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.href === '/' ? 'Painel' : item.href === '/ofertas' ? 'Ofertas' : 'Criativos'}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors',
              isArchiveRoute ? 'bg-primary text-primary-foreground' : 'text-muted-foreground active:bg-muted'
            )}
            aria-label="Abrir itens arquivados"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Arquivo</span>
          </button>
        </div>
      </nav>

      <Sheet open={archiveOpen} onOpenChange={setArchiveOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 md:hidden">
          <SheetHeader className="text-left">
            <SheetTitle>Itens arquivados</SheetTitle>
            <SheetDescription>Consulte, restaure ou exclua itens antigos.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 grid gap-2">
            {archiveNavigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setArchiveOpen(false)}
                className={({ isActive }) => cn(
                  'flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition-colors',
                  isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground active:bg-muted'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
