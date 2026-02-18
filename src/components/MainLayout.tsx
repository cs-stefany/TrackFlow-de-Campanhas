import { ReactNode, useState, createContext, useContext } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
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
        <main className={cn(
          "transition-all duration-300",
          collapsed ? "pl-16" : "pl-64"
        )}>
          <div className="p-6 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
