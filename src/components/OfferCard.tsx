import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency, formatRoas, getOfferHealth, getHealthColor, getMetricStatus } from "@/lib/metrics";
import { parseThresholds, type Oferta } from "@/services/api";
import type { OfferAggregatedMetrics } from "@/hooks/useSupabase";

interface OfferCardProps {
  oferta: Oferta;
  metrics?: OfferAggregatedMetrics;
  creativesCount?: { liberado: number; em_teste: number; nao_validado: number; arquivado?: number };
}

// Convert thresholds to format expected by metrics utils
function convertThresholds(thresholds: ReturnType<typeof parseThresholds>) {
  return {
    roas: { green: thresholds.roas.verde, yellow: thresholds.roas.amarelo },
    ic: { green: thresholds.ic.verde, yellow: thresholds.ic.amarelo },
    cpc: { green: thresholds.cpc.verde, yellow: thresholds.cpc.amarelo },
  };
}

export function OfferCard({ oferta, metrics, creativesCount }: OfferCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const thresholds = convertThresholds(parseThresholds(oferta.thresholds));
  
  // Use real metrics if available, otherwise show zeros
  const displayMetrics = {
    spendTotal: metrics?.spendTotal ?? 0,
    spendToday: metrics?.spendToday ?? 0,
    spend7d: metrics?.spend7d ?? 0,
    roasTotal: metrics?.roasTotal ?? 0,
    roasToday: metrics?.roasToday ?? 0,
    roas7d: metrics?.roas7d ?? 0,
  };
  
  // Use real creative counts if available
  const displayCreativesCount = {
    liberado: creativesCount?.liberado ?? 0,
    em_teste: creativesCount?.em_teste ?? 0,
    nao_validado: creativesCount?.nao_validado ?? 0,
  };
  
  // Calculate health based on REAL ROAS total
  const health = getOfferHealth(displayMetrics.roasTotal, thresholds);

  return (
    <Card
      onClick={() => navigate(`/ofertas/${oferta.id}`, { state: { from: location.pathname } })}
      className="cursor-pointer p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-primary/20 active:scale-[0.99]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={cn("h-2.5 w-2.5 rounded-full", getHealthColor(health))} />
            <h3 className="font-semibold text-foreground">{oferta.nome}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{oferta.nicho}</span>
            <span>•</span>
            <span>{oferta.pais}</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Spend Column */}
        <div className="space-y-3">
          <div className="space-y-0.5 h-10">
            <p className="text-xs text-muted-foreground">Spend Total</p>
            <p className="text-sm font-semibold">{formatCurrency(displayMetrics.spendTotal)}</p>
          </div>
          <div className="space-y-0.5 h-10">
            <p className="text-xs text-muted-foreground">Spend de Hoje</p>
            <p className="text-sm font-medium">{formatCurrency(displayMetrics.spendToday)}</p>
          </div>
          <div className="space-y-0.5 h-10">
            <p className="text-xs text-muted-foreground">Spend de 7 dias</p>
            <p className="text-sm font-medium">{formatCurrency(displayMetrics.spend7d)}</p>
          </div>
        </div>

        {/* ROAS Column */}
        <div className="space-y-3">
          <div className="space-y-0.5 h-10">
            <p className="text-xs text-muted-foreground">ROAS Total</p>
            <p
              className={cn(
                "text-sm font-semibold",
                health === "success" && "text-success",
                health === "warning" && "text-warning",
                health === "danger" && "text-danger",
              )}
            >
              {formatRoas(displayMetrics.roasTotal)}
            </p>
          </div>
          <div className="space-y-0.5 h-10">
            <p className="text-xs text-muted-foreground">ROAS de Hoje</p>
            <p
              className={cn(
                "text-sm font-medium",
                getMetricStatus(displayMetrics.roasToday, 'roas', thresholds) === "success" && "text-success",
                getMetricStatus(displayMetrics.roasToday, 'roas', thresholds) === "warning" && "text-warning",
                getMetricStatus(displayMetrics.roasToday, 'roas', thresholds) === "danger" && "text-danger",
              )}
            >
              {formatRoas(displayMetrics.roasToday)}
            </p>
          </div>
          <div className="space-y-0.5 h-10">
            <p className="text-xs text-muted-foreground">ROAS de 7 dias</p>
            <p
              className={cn(
                "text-sm font-medium",
                getMetricStatus(displayMetrics.roas7d, 'roas', thresholds) === "success" && "text-success",
                getMetricStatus(displayMetrics.roas7d, 'roas', thresholds) === "warning" && "text-warning",
                getMetricStatus(displayMetrics.roas7d, 'roas', thresholds) === "danger" && "text-danger",
              )}
            >
              {formatRoas(displayMetrics.roas7d)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer - Creative Badges */}
      <div className="flex items-center gap-1 pt-3 border-t border-border flex-nowrap">
        {oferta.status === 'arquivado' ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-foreground/70">
            Arquivados: {creativesCount?.arquivado ?? 0}
          </Badge>
        ) : (
          <>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-success/10 text-success border-success/30">
              Liberados: {displayCreativesCount.liberado}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-info/10 text-info border-info/30">
              Em teste: {displayCreativesCount.em_teste}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-muted text-foreground/70 border-border">
              Não validados: {displayCreativesCount.nao_validado}
            </Badge>
          </>
        )}
      </div>
    </Card>
  );
}
