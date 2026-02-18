import { LayoutDashboard, Tags, Video, ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSidebarContext } from '@/components/MainLayout';

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
        'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300',
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
