import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency, formatRoas, getMetricStatus, getMetricClass } from "@/lib/metrics";
import { parseThresholds, type Criativo, type Oferta } from "@/services/api";
import { VideoThumbnail } from "@/components/VideoPlayerDialog";
import { toast } from "sonner";

interface CreativeCardProps {
  criativo: Criativo;
  oferta?: Oferta | null;
  metrics?: {
    spend: number;
    faturado: number;
    roas: number;
    ic: number;
    cpc: number;
  };
  onClick?: () => void;
}

const sourceColors: Record<string, string> = {
  facebook: 'bg-info/10 text-info border-info/20',
  youtube: 'bg-destructive/10 text-destructive border-destructive/20',
  tiktok: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const sourceLabels: Record<string, string> = {
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

// Convert thresholds to format expected by metrics utils
function convertThresholds(thresholds: ReturnType<typeof parseThresholds>) {
  return {
    roas: { green: thresholds.roas.verde, yellow: thresholds.roas.amarelo },
    ic: { green: thresholds.ic.verde, yellow: thresholds.ic.amarelo },
    cpc: { green: thresholds.cpc.verde, yellow: thresholds.cpc.amarelo },
  };
}

export function CreativeCard({ criativo, oferta, metrics, onClick }: CreativeCardProps) {
  const thresholds = oferta?.thresholds
    ? convertThresholds(parseThresholds(oferta.thresholds))
    : convertThresholds(parseThresholds(null));

  // Use metrics if available, otherwise show zeros
  const displayMetrics = {
    spend: metrics?.spend ?? 0,
    faturado: metrics?.faturado ?? 0,
    roas: metrics?.roas ?? 0,
    ic: metrics?.ic ?? 0,
    cpc: metrics?.cpc ?? 0,
  };

  // Calculate health based on ROAS
  const health = getMetricStatus(displayMetrics.roas, 'roas', thresholds);

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-primary/20 active:scale-[0.99]"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Thumbnail - clicável para abrir vídeo */}
        <div
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <VideoThumbnail url={criativo.url} creativeId={criativo.id_unico} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn(
              "h-2.5 w-2.5 rounded-full",
              health === 'success' && "bg-success",
              health === 'warning' && "bg-warning",
              health === 'danger' && "bg-danger",
              health === 'default' && "bg-muted-foreground"
            )} />
            <h3
              className="font-mono text-sm font-semibold text-foreground truncate cursor-pointer hover:text-primary hover:underline transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(criativo.id_unico);
                toast.success('ID copiado!');
              }}
              title="Clique para copiar"
            >
              {criativo.id_unico}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {oferta?.nome || 'Sem oferta'}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Left Column */}
        <div className="space-y-3">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Spend Total</p>
            <p className="text-sm font-semibold">{formatCurrency(displayMetrics.spend)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">IC</p>
            <p className={cn(
              "text-sm font-medium",
              getMetricClass(getMetricStatus(displayMetrics.ic, 'ic', thresholds))
            )}>
              {formatCurrency(displayMetrics.ic)}
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">ROAS Total</p>
            <p className={cn(
              "text-sm font-semibold",
              getMetricClass(health)
            )}>
              {formatRoas(displayMetrics.roas)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">CPC</p>
            <p className={cn(
              "text-sm font-medium",
              getMetricClass(getMetricStatus(displayMetrics.cpc, 'cpc', thresholds))
            )}>
              {formatCurrency(displayMetrics.cpc)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer - Badges */}
      <div className="flex items-center gap-2 pt-3 border-t border-border flex-wrap">
        <Badge
          variant="outline"
          className={cn("text-xs", sourceColors[criativo.fonte] || 'bg-muted text-muted-foreground')}
        >
          {sourceLabels[criativo.fonte] || criativo.fonte}
        </Badge>
        {criativo.copy_responsavel && (
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
            {criativo.copy_responsavel}
          </Badge>
        )}
      </div>
    </Card>
  );
}
