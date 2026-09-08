import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface QueryErrorStateProps {
  onRetry: () => void | Promise<void>;
  isRetrying?: boolean;
  title?: string;
}

export function QueryErrorState({
  onRetry,
  isRetrying = false,
  title = 'Não foi possível carregar os dados',
}: QueryErrorStateProps) {
  return (
    <Card className="flex min-h-52 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
      </div>
      <Button className="h-11 gap-2 sm:h-9" onClick={() => void onRetry()} disabled={isRetrying}>
        {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Tentar novamente
      </Button>
    </Card>
  );
}
