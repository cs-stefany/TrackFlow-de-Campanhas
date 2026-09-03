import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, ArrowUpDown, RefreshCw, Loader2, Plus, Settings, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { KPICard, KPIDualCard } from '@/components/KPICard';
import { MobileFiltersSheet } from '@/components/MobileFiltersSheet';
import { MetricBadge } from '@/components/MetricBadge';
import { LancarMetricaDialog } from '@/components/LancarMetricaDialog';
import { BulkMetricasDialog } from '@/components/BulkMetricasDialog';
import { PeriodoFilter, usePeriodo, type PeriodoValue } from '@/components/PeriodoFilter';
import { ThresholdsDialog } from '@/components/ThresholdsDialog';
import { formatCurrency, formatRoas, getMetricStatus, getMetricClass, copyToClipboard } from '@/lib/metrics';
import { formatDate } from '@/lib/format';
import { parseThresholds, type Thresholds, type Criativo, type MetricaDiariaOferta } from '@/services/api';
import { useOferta, useMetricasOferta, useCriativosPorOferta, useCopywriters, useMetricasDiariasComCriativo } from '@/hooks/useSupabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type SortField = 'roas' | 'ic' | 'cpc' | 'spend' | null;
type SortDirection = 'asc' | 'desc';

const STATUS_LABELS: Record<string, string> = {
  liberado: "Liberado",
  em_teste: "Em Teste",
  nao_validado: "Não Validado",
  pausado: "Pausado",
  arquivado: "Arquivado",
};

const STATUS_COLORS: Record<string, string> = {
  liberado: "bg-green-500/10 text-green-500 border-green-500/20",
  em_teste: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  nao_validado: "bg-muted text-muted-foreground border-border",
  pausado: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  arquivado: "bg-destructive/10 text-destructive border-destructive/20",
};

const FONTE_MAP: Record<string, string> = {
  facebook: 'FB',
  youtube: 'YT',
  tiktok: 'TT',
};

// Convert Supabase thresholds to the format expected by metrics utilities
function convertThresholds(thresholds: Thresholds) {
  return {
    roas: { green: thresholds.roas.verde, yellow: thresholds.roas.amarelo },
    ic: { green: thresholds.ic.verde, yellow: thresholds.ic.amarelo },
    cpc: { green: thresholds.cpc.verde, yellow: thresholds.cpc.amarelo },
  };
}

export default function OfferDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the referrer path from navigation state, default to /ofertas
  const fromPath = (location.state as { from?: string })?.from || '/ofertas';
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { periodo, setPeriodo } = usePeriodo('7d');
  const [copyFilter, setCopyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeTab, setActiveTab] = useState('daily');
  
  // Dialog states
  const [isLancarMetricaOpen, setIsLancarMetricaOpen] = useState(false);
  const [lancarMetricaFonte, setLancarMetricaFonte] = useState<string | undefined>(undefined);
  const [isThresholdsDialogOpen, setIsThresholdsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  // Supabase hooks - pass periodo for filtering
  const { data: oferta, isLoading: isLoadingOferta, refetch: refetchOferta } = useOferta(id || '');
  const { data: metricasOferta, isLoading: isLoadingMetricas, refetch: refetchMetricas } = useMetricasOferta(id || '', periodo.tipo !== 'custom' ? periodo.tipo : undefined);
  const { data: criativosFB, isLoading: isLoadingFB, refetch: refetchFB } = useCriativosPorOferta(id || '', 'facebook');
  const { data: criativosYT, isLoading: isLoadingYT, refetch: refetchYT } = useCriativosPorOferta(id || '', 'youtube');
  const { data: criativosTT, isLoading: isLoadingTT, refetch: refetchTT } = useCriativosPorOferta(id || '', 'tiktok');
  const { data: metricasCriativos, refetch: refetchCriativosMedias } = useMetricasDiariasComCriativo({
    ofertaId: id || '',
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
  });
  const { data: copywriters } = useCopywriters();

  const isLoading = isLoadingOferta || isLoadingMetricas;
  
  const handleRefreshAll = () => {
    refetchOferta();
    refetchMetricas();
    refetchFB();
    refetchYT();
    refetchTT();
    refetchCriativosMedias();
    toast.success('Dados atualizados!');
  };

  const creativeMetricsById = useMemo(() => {
    const grouped = new Map<string, {
      spend: number;
      faturado: number;
      icTotal: number;
      icCount: number;
      cpcTotal: number;
      cpcCount: number;
    }>();

    for (const metric of metricasCriativos || []) {
      const creativeId = metric.criativo?.id;
      if (!creativeId) continue;

      const current = grouped.get(creativeId) || {
        spend: 0,
        faturado: 0,
        icTotal: 0,
        icCount: 0,
        cpcTotal: 0,
        cpcCount: 0,
      };

      current.spend += metric.spend || 0;
      current.faturado += metric.faturado || 0;
      if (metric.ic !== null && metric.ic !== undefined) {
        current.icTotal += metric.ic;
        current.icCount += 1;
      }
      if (metric.cpc !== null && metric.cpc !== undefined) {
        current.cpcTotal += metric.cpc;
        current.cpcCount += 1;
      }
      grouped.set(creativeId, current);
    }

    const result = new Map<string, { spend: number; roas: number; ic: number; cpc: number }>();
    grouped.forEach((metric, creativeId) => {
      result.set(creativeId, {
        spend: metric.spend,
        roas: metric.spend > 0 ? metric.faturado / metric.spend : 0,
        ic: metric.icCount > 0 ? metric.icTotal / metric.icCount : 0,
        cpc: metric.cpcCount > 0 ? metric.cpcTotal / metric.cpcCount : 0,
      });
    });

    return result;
  }, [metricasCriativos]);

  // Métricas do criativo no período selecionado
  const getCreativeMetrics = (criativoId: string) => {
    return creativeMetricsById.get(criativoId) || { spend: 0, roas: 0, ic: 0, cpc: 0 };
  };

  // Parse thresholds from the offer
  const thresholds = useMemo(() => {
    if (!oferta?.thresholds) return convertThresholds(parseThresholds(null));
    return convertThresholds(parseThresholds(oferta.thresholds));
  }, [oferta?.thresholds]);

  // Filter daily metrics by date range
  const filteredDailyMetrics = useMemo(() => {
    if (!metricasOferta) return [];
    
    let filtered = [...metricasOferta];
    
    // Apply date filter
    filtered = filtered.filter((m) => m.data >= periodo.dataInicio && m.data <= periodo.dataFim);
    
    // Sort by date descending
    return filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [metricasOferta, periodo.dataInicio, periodo.dataFim]);

  // Totais sempre acompanham o período visível
  const totals = useMemo(() => {
    if (filteredDailyMetrics.length === 0) {
      return { spend: 0, faturado: 0, roas: 0, lucro: 0, ic: 0, cpc: 0 };
    }

    const spend = filteredDailyMetrics.reduce((acc, metric) => acc + (metric.spend || 0), 0);
    const faturado = filteredDailyMetrics.reduce((acc, metric) => acc + (metric.faturado || 0), 0);
    const icValues = filteredDailyMetrics.filter(metric => metric.ic !== null).map(metric => metric.ic || 0);
    const cpcValues = filteredDailyMetrics.filter(metric => metric.cpc !== null).map(metric => metric.cpc || 0);

    return {
      spend,
      faturado,
      roas: spend > 0 ? faturado / spend : 0,
      lucro: faturado - spend,
      ic: icValues.length > 0 ? icValues.reduce((acc, value) => acc + value, 0) / icValues.length : 0,
      cpc: cpcValues.length > 0 ? cpcValues.reduce((acc, value) => acc + value, 0) / cpcValues.length : 0,
    };
  }, [filteredDailyMetrics]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleCopyId = (text: string) => {
    copyToClipboard(text);
  };

  const filterAndSortCreatives = (criativos: Criativo[] | undefined) => {
    if (!criativos) return [];

    // Se a oferta estiver arquivada, mostrar criativos arquivados também
    const isOfertaArquivada = oferta?.status === 'arquivado';

    let filtered = criativos.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesSearch = c.id_unico.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCopy = copyFilter === 'all' || c.copy_responsavel === copyFilter;
      // Se a oferta estiver arquivada, mostrar criativos arquivados; senão, filtrar
      const notArchived = isOfertaArquivada || c.status !== 'arquivado';
      return matchesStatus && matchesSearch && matchesCopy && notArchived;
    });

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = getCreativeMetrics(a.id)[sortField];
        const bValue = getCreativeMetrics(b.id)[sortField];
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }

    return filtered;
  };

  const openLancarMetrica = (fonte?: string) => {
    setLancarMetricaFonte(fonte);
    setIsLancarMetricaOpen(true);
  };

  const renderCreativesTable = (criativos: Criativo[] | undefined, fonte: 'facebook' | 'youtube' | 'tiktok', isLoadingCreatives: boolean) => {
    const filtered = filterAndSortCreatives(criativos);
    const fonteLabel = fonte === 'facebook' ? 'Facebook' : fonte === 'youtube' ? 'YouTube' : 'TikTok';
    
    const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
      <TableHead 
        className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center justify-end gap-1">
          {children}
          <ArrowUpDown className={cn(
            "h-3 w-3",
            sortField === field ? "text-foreground" : "text-muted-foreground"
          )} />
        </div>
      </TableHead>
    );
    
    return (
      <div className="space-y-4">
        {/* Header with title */}
        <h3 className="text-sm font-medium text-muted-foreground">
          Criativos {fonteLabel}
        </h3>

        {/* Filters */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-9"
            />
          </div>
          <MobileFiltersSheet
            activeCount={
              Number(oferta?.status !== 'arquivado' && statusFilter !== 'all') +
              Number(copyFilter !== 'all') +
              Number(periodo.tipo !== '7d') +
              Number(sortField !== null)
            }
            onClear={() => {
              setStatusFilter('all');
              setCopyFilter('all');
              setSortField(null);
              setSortDirection('desc');
              setPeriodo({ ...periodo, tipo: '7d' });
            }}
          >
            {oferta?.status !== 'arquivado' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="liberado">Liberado</SelectItem>
                  <SelectItem value="em_teste">Em Teste</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="nao_validado">Não Validado</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={copyFilter} onValueChange={setCopyFilter}>
              <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Copywriter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Copywriters</SelectItem>
                {copywriters?.map((copy) => <SelectItem key={copy.id} value={copy.nome}>{copy.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={sortField ? `${sortField}-${sortDirection}` : 'default'}
              onValueChange={(value) => {
                if (value === 'default') {
                  setSortField(null);
                  setSortDirection('desc');
                  return;
                }
                const [field, direction] = value.split('-') as [Exclude<SortField, null>, SortDirection];
                setSortField(field);
                setSortDirection(direction);
              }}
            >
              <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Ordenar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Ordem padrão</SelectItem>
                <SelectItem value="spend-desc">Maior spend</SelectItem>
                <SelectItem value="roas-desc">Maior ROAS</SelectItem>
                <SelectItem value="ic-asc">Menor IC</SelectItem>
                <SelectItem value="cpc-asc">Menor CPC</SelectItem>
              </SelectContent>
            </Select>
            <PeriodoFilter value={periodo} onChange={setPeriodo} showAllOption className="w-full" />
          </MobileFiltersSheet>
        </div>

        {oferta?.status !== 'arquivado' && (
          <div className="grid grid-cols-2 gap-2 md:hidden">
            <Button className="h-11 gap-2" onClick={() => setIsBulkDialogOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" />
              Importar CSV
            </Button>
            <Button className="h-11 gap-2" onClick={() => openLancarMetrica(fonte)}>
              <Plus className="h-4 w-4" />
              Lançar Métrica
            </Button>
          </div>
        )}

        <div className="hidden flex-wrap items-center gap-3 md:flex">
          <div className="relative min-w-[220px] flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {oferta?.status !== 'arquivado' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="liberado">Liberado</SelectItem>
                <SelectItem value="em_teste">Em Teste</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="nao_validado">Não Validado</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={copyFilter} onValueChange={setCopyFilter}>
            <SelectTrigger className="h-10 w-[180px]">
              <SelectValue placeholder="Copywriter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Copywriters</SelectItem>
              {copywriters?.map((copy) => (
                <SelectItem key={copy.id} value={copy.nome}>{copy.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PeriodoFilter
            value={periodo}
            onChange={setPeriodo}
            showAllOption
            className="w-auto"
          />
          {/* Botões de lançar métricas ao lado do filtro de período */}
          {oferta?.status !== 'arquivado' && (
            <>
              <Button className="h-10 gap-2" onClick={() => setIsBulkDialogOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" />
                Importar CSV
              </Button>
              <Button className="h-10 gap-2" onClick={() => openLancarMetrica(fonte)}>
                <Plus className="h-4 w-4" />
                Lançar Métrica
              </Button>
            </>
          )}
        </div>

        {/* Mobile cards */}
        {isLoadingCreatives ? (
          <div className="flex h-32 items-center justify-center rounded-xl border bg-card md:hidden">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3 md:hidden">
            {filtered.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Nenhum criativo encontrado.
              </Card>
            ) : (
              filtered.map((criativo) => {
                const { spend, roas, ic, cpc } = getCreativeMetrics(criativo.id);

                return (
                  <Card key={criativo.id} className="overflow-hidden p-0 shadow-sm">
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="max-w-full truncate text-left font-mono text-sm font-semibold hover:text-primary"
                          onClick={() => handleCopyId(criativo.id_unico)}
                        >
                          {criativo.id_unico}
                        </button>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {criativo.copy_responsavel || 'Sem copywriter'}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('shrink-0 whitespace-nowrap', STATUS_COLORS[criativo.status || 'em_teste'])}>
                        {STATUS_LABELS[criativo.status || 'em_teste']}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 border-t bg-muted/25">
                      <div className="border-b p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Spend</p>
                        <p className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums">{formatCurrency(spend)}</p>
                      </div>
                      <div className="border-b border-l p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">ROAS</p>
                        <MetricBadge className="mt-1" value={roas} metricType="roas" thresholds={thresholds} format={formatRoas} />
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">IC</p>
                        <MetricBadge className="mt-1" value={ic} metricType="ic" thresholds={thresholds} format={formatCurrency} />
                      </div>
                      <div className="border-l p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">CPC</p>
                        <MetricBadge className="mt-1" value={cpc} metricType="cpc" thresholds={thresholds} format={formatCurrency} />
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
          {isLoadingCreatives ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Copywriter</TableHead>
                  <SortableHeader field="spend">Spend</SortableHeader>
                  <SortableHeader field="roas">ROAS</SortableHeader>
                  <SortableHeader field="ic">IC</SortableHeader>
                  <SortableHeader field="cpc">CPC</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum criativo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((criativo) => {
                    // Get real metrics from criativos_com_medias view
                    const metrics = getCreativeMetrics(criativo.id);
                    const { spend, roas, ic, cpc } = metrics;

                    return (
                      <TableRow key={criativo.id}>
                        <TableCell>
                          <span
                            className="font-mono text-sm cursor-pointer hover:text-primary hover:underline transition-colors"
                            onClick={() => handleCopyId(criativo.id_unico)}
                            title="Clique para copiar"
                          >
                            {criativo.id_unico}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("whitespace-nowrap", STATUS_COLORS[criativo.status || "em_teste"])}
                          >
                            {STATUS_LABELS[criativo.status || "em_teste"]}
                          </Badge>
                        </TableCell>
                        <TableCell>{criativo.copy_responsavel}</TableCell>
                        <TableCell className="text-right">{formatCurrency(spend)}</TableCell>
                        <TableCell className="text-right">
                          <MetricBadge
                            value={roas}
                            metricType="roas"
                            thresholds={thresholds}
                            format={formatRoas}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <MetricBadge
                            value={ic}
                            metricType="ic"
                            thresholds={thresholds}
                            format={(v) => formatCurrency(v)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <MetricBadge
                            value={cpc}
                            metricType="cpc"
                            thresholds={thresholds}
                            format={(v) => formatCurrency(v)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!oferta) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Oferta não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(fromPath)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 break-words text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">{oferta.nome}</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{oferta.nicho} • {oferta.pais}</p>
        </div>
        <Button
          variant="outline"
          className="h-11 w-11 shrink-0 gap-2 px-0 sm:h-10 sm:w-auto sm:px-4"
          onClick={() => setIsThresholdsDialogOpen(true)}
          aria-label="Métricas esperadas"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Métricas Esperadas</span>
        </Button>
        <Button
          variant="outline"
          className="h-11 w-11 shrink-0 gap-2 px-0 sm:h-10 sm:w-auto sm:px-4"
          onClick={handleRefreshAll}
          aria-label="Atualizar dados"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      {/* Main KPIs */}
      <div className="grid gap-3 sm:hidden">
        <KPIDualCard
          leftLabel="Spend Total"
          leftValue={formatCurrency(totals.spend)}
          rightLabel="ROAS Total"
          rightValue={formatRoas(totals.roas)}
          rightVariant={getMetricStatus(totals.roas, 'roas', thresholds) as 'success' | 'warning' | 'danger' | 'default'}
        />
        <KPIDualCard
          leftLabel="Faturamento"
          leftValue={formatCurrency(totals.faturado)}
          leftVariant="success"
          rightLabel="Lucro Líquido"
          rightValue={formatCurrency(totals.lucro)}
          rightVariant={totals.lucro >= 0 ? 'success' : 'danger'}
        />
      </div>
      <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Spend Total"
          value={formatCurrency(totals.spend)}
        />
        <KPICard
          label="ROAS Total"
          value={formatRoas(totals.roas)}
          variant={getMetricStatus(totals.roas, 'roas', thresholds) as 'success' | 'warning' | 'danger' | 'default'}
        />
        <KPICard
          label="Faturamento"
          value={formatCurrency(totals.faturado)}
          variant="success"
        />
        <KPICard
          label="Lucro Líquido"
          value={formatCurrency(totals.lucro)}
          variant={totals.lucro >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:max-w-2xl sm:grid-cols-4">
          <TabsTrigger value="daily" className="min-w-0 px-2 py-2 text-xs">Resultado Diário</TabsTrigger>
          <TabsTrigger value="fb" className="min-w-0 px-2 py-2 text-xs">
            Criativos FB ({oferta?.status === 'arquivado'
              ? criativosFB?.length || 0
              : criativosFB?.filter(c => c.status !== 'arquivado').length || 0})
          </TabsTrigger>
          <TabsTrigger value="yt" className="min-w-0 px-2 py-2 text-xs">
            Criativos YT ({oferta?.status === 'arquivado'
              ? criativosYT?.length || 0
              : criativosYT?.filter(c => c.status !== 'arquivado').length || 0})
          </TabsTrigger>
          <TabsTrigger value="tt" className="min-w-0 px-2 py-2 text-xs">
            Criativos TT ({oferta?.status === 'arquivado'
              ? criativosTT?.length || 0
              : criativosTT?.filter(c => c.status !== 'arquivado').length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-6">
          <div className="space-y-4">
            {/* Period filter for daily results */}
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-2.5 sm:justify-start sm:border-0 sm:bg-transparent sm:p-0">
              <span className="text-sm font-medium sm:hidden">Período</span>
              <PeriodoFilter 
                value={periodo} 
                onChange={setPeriodo}
                showAllOption
                className="w-[210px] sm:w-auto"
              />
            </div>

            {isLoadingMetricas ? (
              <Card className="flex h-32 items-center justify-center p-0 md:hidden">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </Card>
            ) : (
              <div className="grid gap-3 md:hidden">
                {filteredDailyMetrics.length === 0 ? (
                  <Card className="p-6 text-center text-sm text-muted-foreground">
                    Nenhuma métrica encontrada para o período.
                  </Card>
                ) : (
                  filteredDailyMetrics.map((metric) => {
                    const faturado = metric.faturado || 0;
                    const spend = metric.spend || 0;
                    const roas = spend > 0 ? faturado / spend : 0;
                    const ic = metric.ic || 0;
                    const cpc = metric.cpc || 0;
                    const lucro = faturado - spend;
                    const mc = faturado > 0 ? (lucro / faturado) * 100 : 0;

                    return (
                      <Card key={metric.id} className="overflow-hidden p-0 shadow-sm">
                        <div className="flex items-center justify-between gap-3 p-4">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resultado do dia</p>
                            <p className="mt-1 font-semibold">{formatDate(metric.data)}</p>
                          </div>
                          <MetricBadge value={roas} metricType="roas" thresholds={thresholds} format={formatRoas} />
                        </div>
                        <div className="grid grid-cols-2 border-y bg-muted/25">
                          <div className="p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Faturamento</p>
                            <p className="mt-1 whitespace-nowrap font-semibold tabular-nums text-success">{formatCurrency(faturado)}</p>
                          </div>
                          <div className="border-l p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Spend</p>
                            <p className="mt-1 whitespace-nowrap font-semibold tabular-nums">{formatCurrency(spend)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-2 p-4 text-sm">
                          <span className="text-muted-foreground">IC</span>
                          <span className={cn('text-right font-medium', getMetricClass(getMetricStatus(ic, 'ic', thresholds)))}>{formatCurrency(ic)}</span>
                          <span className="text-muted-foreground">CPC</span>
                          <span className={cn('text-right font-medium', getMetricClass(getMetricStatus(cpc, 'cpc', thresholds)))}>{formatCurrency(cpc)}</span>
                          <span className="text-muted-foreground">Lucro</span>
                          <span className={cn('text-right font-medium', lucro >= 0 ? 'text-success' : 'text-danger')}>{formatCurrency(lucro)}</span>
                          <span className="text-muted-foreground">Margem</span>
                          <span className="text-right font-medium">{mc.toFixed(1)}%</span>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            <Card className="hidden overflow-hidden p-0 md:block">
              {isLoadingMetricas ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="text-right">IC</TableHead>
                      <TableHead className="text-right">CPC</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">MC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDailyMetrics.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhuma métrica encontrada para o período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDailyMetrics.map((metric) => {
                        const faturado = metric.faturado || 0;
                        const spend = metric.spend || 0;
                        const roas = spend > 0 ? faturado / spend : 0;
                        const ic = metric.ic || 0;
                        const cpc = metric.cpc || 0;
                        const lucro = faturado - spend;
                        const mc = faturado > 0 ? (lucro / faturado) * 100 : 0;

                        const roasStatus = getMetricStatus(roas, 'roas', thresholds);
                        const icStatus = getMetricStatus(ic, 'ic', thresholds);
                        const cpcStatus = getMetricStatus(cpc, 'cpc', thresholds);

                        return (
                          <TableRow key={metric.id}>
                            <TableCell className="font-medium">
                              {formatDate(metric.data)}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(faturado)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(spend)}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn('font-medium', getMetricClass(roasStatus))}>
                                {formatRoas(roas)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn('font-medium', getMetricClass(icStatus))}>
                                {formatCurrency(ic)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn('font-medium', getMetricClass(cpcStatus))}>
                                {formatCurrency(cpc)}
                              </span>
                            </TableCell>
                            <TableCell className={cn(
                              'text-right font-medium',
                              lucro >= 0 ? 'text-success' : 'text-danger'
                            )}>
                              {formatCurrency(lucro)}
                            </TableCell>
                            <TableCell className="text-right">{mc.toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fb" className="mt-6">
          {renderCreativesTable(criativosFB, 'facebook', isLoadingFB)}
        </TabsContent>

        <TabsContent value="yt" className="mt-6">
          {renderCreativesTable(criativosYT, 'youtube', isLoadingYT)}
        </TabsContent>

        <TabsContent value="tt" className="mt-6">
          {renderCreativesTable(criativosTT, 'tiktok', isLoadingTT)}
        </TabsContent>
      </Tabs>

      {/* Lancar Metrica Dialog */}
      <LancarMetricaDialog
        open={isLancarMetricaOpen}
        onOpenChange={setIsLancarMetricaOpen}
        ofertaId={id || ''}
        fonte={lancarMetricaFonte}
      />

      {/* Bulk Metricas Dialog */}
      <BulkMetricasDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        ofertaId={id || ''}
        ofertaNome={oferta?.nome || ''}
      />

      {/* Thresholds Dialog */}
      <ThresholdsDialog
        open={isThresholdsDialogOpen}
        onOpenChange={setIsThresholdsDialogOpen}
        oferta={oferta}
        metricas={{
          roas: totals.roas,
          ic: totals.ic,
          cpc: totals.cpc,
        }}
      />
    </div>
  );
}
