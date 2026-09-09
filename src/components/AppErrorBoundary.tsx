import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro ao renderizar a página:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mx-auto flex min-h-64 max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="font-semibold text-foreground">Não foi possível abrir esta página</h1>
            <p className="text-sm text-muted-foreground">Recarregue para tentar novamente.</p>
          </div>
          <Button className="h-11 gap-2 sm:h-9" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Recarregar página
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
