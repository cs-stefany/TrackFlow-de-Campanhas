import { ReactNode, useState, createContext, useContext } from 'react';
import { AppSidebar, MobileNavigation } from '@/components/AppSidebar';
import { cn } from '@/lib/utils';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
});

export const useSidebarContext = () => useContext(SidebarContext);

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <MobileNavigation />
        <main className={cn(
          "min-w-0 pb-24 transition-[padding] duration-300 md:pb-0",
          collapsed ? "md:pl-16" : "md:pl-64"
        )}>
          <div className="mx-auto max-w-[1600px] p-4 sm:p-5 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
