import { useState, useMemo } from 'react';
import { RefreshCw, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KPIDualCard } from '@/components/KPICard';
import { OfferCard } from '@/components/OfferCard';
import { formatCurrency, formatRoas, getMetricStatus } from '@/lib/metrics';
import { parseThresholds } from '@/services/api';
import {
  useOfertas,
  useTotaisOfertas,
  useContadorCriativos,
  useNichos,
  usePaises,
  useAllOffersAggregatedMetrics,
  useCreativesCountByOffer,
} from '@/hooks/useSupabase';
import { toast } from 'sonner';

// Convert thresholds to format expected by metrics utils
function convertThresholds(thresholds: ReturnType<typeof parseThresholds>) {
  return {
    roas: { green: thresholds.roas.verde, yellow: thresholds.roas.amarelo },
    ic: { green: thresholds.ic.verde, yellow: thresholds.ic.amarelo },
    cpc: { green: thresholds.cpc.verde, yellow: thresholds.cpc.amarelo },
  };
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'ativo' | 'pausado'>('ativo');

  // Supabase hooks - busca todas as ofertas (exceto arquivadas) para permitir filtro por status
  const { data: todasOfertas, isLoading: isLoadingOfertas, refetch: refetchOfertas } = useOfertas();
  const { data: totais, isLoading: isLoadingTotais, refetch: refetchTotais } = useTotaisOfertas();
  const { data: contadorCriativos, isLoading: isLoadingContador, refetch: refetchContador } = useContadorCriativos();
  const { data: nichos } = useNichos();
  const { data: paises } = usePaises();
  const { data: aggregatedMetrics, refetch: refetchMetrics } = useAllOffersAggregatedMetrics();
  const { data: creativesCountByOffer, refetch: refetchCreativesCount } = useCreativesCountByOffer();

  const isLoading = isLoadingOfertas || isLoadingTotais || isLoadingContador;

  const handleRefresh = () => {
    refetchOfertas();
    refetchTotais();
    refetchContador();
    refetchMetrics();
    refetchCreativesCount();
    toast.success('Dados atualizados!');
  };

  // Filtrar ofertas por status (exclui arquivadas)
  const ofertas = useMemo(() => {
    if (!todasOfertas) return [];
    return todasOfertas.filter(o => o.status !== 'arquivado');
  }, [todasOfertas]);

  // Filter offers using REAL aggregated metrics
  const filteredOffers = useMemo(() => {
    if (!ofertas) return [];

    return ofertas.filter((offer) => {
      // Filtro de status (ativo/pausado)
      const matchesStatus = offer.status === statusFilter;
      const matchesSearch = offer.nome.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesNiche = nicheFilter === 'all' || offer.nicho === nicheFilter;
      const matchesCountry = countryFilter === 'all' || offer.pais === countryFilter;

      // Calculate health based on REAL ROAS from aggregated metrics
      const thresholds = convertThresholds(parseThresholds(offer.thresholds));
      const offerMetrics = aggregatedMetrics?.get(offer.id);
      const roasTotal = offerMetrics?.roasTotal ?? 0;
      const health = getMetricStatus(roasTotal, 'roas', thresholds);
      const matchesHealth = healthFilter === 'all' || health === healthFilter;

      return matchesStatus && matchesSearch && matchesNiche && matchesCountry && matchesHealth;
    });
  }, [ofertas, statusFilter, searchQuery, nicheFilter, countryFilter, healthFilter, aggregatedMetrics]);

  // Get unique values from database
  const nichosList = useMemo(() => {
    return nichos?.map(n => n.nome) || [];
  }, [nichos]);

  const paisesList = useMemo(() => {
    return paises?.map(p => p.nome) || [];
  }, [paises]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel de Ofertas</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral de performance</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIDualCard
          leftLabel="Spend Total"
          leftValue={isLoadingTotais ? '...' : formatCurrency(totais?.total.spend || 0)}
          rightLabel="ROAS Total"
          rightValue={isLoadingTotais ? '...' : formatRoas(totais?.total.roas || 0)}
          rightVariant={
            (totais?.total.roas || 0) >= 1.3 ? 'success' : 
            (totais?.total.roas || 0) >= 1.1 ? 'warning' : 'danger'
          }
        />
        <KPIDualCard
          leftLabel="Spend de Hoje"
          leftValue={isLoadingTotais ? '...' : formatCurrency(totais?.hoje.spend || 0)}
          rightLabel="ROAS de Hoje"
          rightValue={isLoadingTotais ? '...' : formatRoas(totais?.hoje.roas || 0)}
          rightVariant={
            (totais?.hoje.roas || 0) >= 1.3 ? 'success' :
            (totais?.hoje.roas || 0) >= 1.1 ? 'warning' : 'danger'
          }
        />
        <KPIDualCard
          leftLabel="Spend de 7 dias"
          leftValue={isLoadingTotais ? '...' : formatCurrency(totais?.seteDias.spend || 0)}
          rightLabel="ROAS de 7 dias"
          rightValue={isLoadingTotais ? '...' : formatRoas(totais?.seteDias.roas || 0)}
          rightVariant={
            (totais?.seteDias.roas || 0) >= 1.3 ? 'success' :
            (totais?.seteDias.roas || 0) >= 1.1 ? 'warning' : 'danger'
          }
        />
        <KPIDualCard
          leftLabel="Total Criativos"
          leftValue={isLoadingContador ? '...' : (contadorCriativos?.total || 0).toString()}
          rightLabel="Liberados / Teste"
          rightValue={isLoadingContador ? '...' : `${contadorCriativos?.liberado || 0} / ${contadorCriativos?.em_teste || 0}`}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border border-border shadow-card">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar oferta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-zinc-950 border-border"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'ativo' | 'pausado')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativo">Ativas</SelectItem>
            <SelectItem value="pausado">Pausadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={nicheFilter} onValueChange={setNicheFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Nicho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Nichos</SelectItem>
            {nichosList.map((niche) => (
              <SelectItem key={niche} value={niche}>{niche}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Países</SelectItem>
            {paisesList.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Saúde" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Saúdes</SelectItem>
            <SelectItem value="success">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                Verde
              </div>
            </SelectItem>
            <SelectItem value="warning">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-warning" />
                Amarelo
              </div>
            </SelectItem>
            <SelectItem value="danger">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-danger" />
                Vermelho
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoadingOfertas && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Offer Cards Grid */}
      {!isLoadingOfertas && filteredOffers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => (
            <OfferCard 
              key={offer.id} 
              oferta={offer} 
              metrics={aggregatedMetrics?.get(offer.id)}
              creativesCount={creativesCountByOffer?.get(offer.id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingOfertas && filteredOffers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma oferta encontrada com os filtros selecionados.</p>
        </div>
      )}
    </div>
  );
}
