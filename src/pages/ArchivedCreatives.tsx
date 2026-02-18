import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, RotateCcw, Search, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CreativeCard } from '@/components/CreativeCard';
import { MetricBadge } from '@/components/MetricBadge';
import { PeriodoFilter, usePeriodo } from '@/components/PeriodoFilter';
import { formatDate } from '@/lib/format';
import { formatCurrency, formatRoas, getMetricStatus, getMetricClass } from '@/lib/metrics';
import { parseThresholds } from '@/services/api';
import { toast } from 'sonner';
import {
  useCriativosArquivados,
  useUpdateCriativo,
  useDeleteCriativo,
  useOfertas,
  useCopywriters,
  useMetricasCriativo,
  useAllCriativosAggregatedMetrics,
} from '@/hooks/useSupabase';
import type { Criativo, Oferta } from '@/services/api';
import { cn } from '@/lib/utils';

// Convert thresholds to format expected by metrics utils
function convertThresholds(thresholds: ReturnType<typeof parseThresholds>) {
  return {
    roas: { green: thresholds.roas.verde, yellow: thresholds.roas.amarelo },
    ic: { green: thresholds.ic.verde, yellow: thresholds.ic.amarelo },
    cpc: { green: thresholds.cpc.verde, yellow: thresholds.cpc.amarelo },
  };
}

export default function ArchivedCreatives() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [offerFilter, setOfferFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [copywriterFilter, setCopywriterFilter] = useState<string>('all');
  const { periodo, setPeriodo } = usePeriodo('all');

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<Criativo | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState('');

  // Restore dialog state
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [restoreCreative, setRestoreCreative] = useState<Criativo | null>(null);

  // Metrics dialog state
  const [isMetricsDialogOpen, setIsMetricsDialogOpen] = useState(false);
  const [metricsCreative, setMetricsCreative] = useState<Criativo | null>(null);

  // Hooks - usar useOfertas() para obter todas as ofertas (inclusive arquivadas)
  const { data: criativos, isLoading, refetch } = useCriativosArquivados();
  const { data: ofertas } = useOfertas();
  const { data: copywriters } = useCopywriters();
  const { data: aggregatedMetrics } = useAllCriativosAggregatedMetrics();
  const updateCriativo = useUpdateCriativo();
  const deleteCriativo = useDeleteCriativo();

  // Hook para buscar métricas do criativo selecionado
  const { data: selectedCreativeMetrics, isLoading: isLoadingMetrics } = useMetricasCriativo(
    metricsCreative?.id || '',
    'all'
  );

  // Calcular métricas agregadas por criativo usando o hook
  const criativosComMetricas = useMemo(() => {
    if (!criativos) return [];

    return criativos.map(criativo => {
      const metrics = aggregatedMetrics?.get(criativo.id);
      return {
        criativo,
        metrics: {
          spend: metrics?.spend ?? 0,
          faturado: metrics?.faturado ?? 0,
          roas: metrics?.roas ?? 0,
          ic: metrics?.ic ?? 0,
          cpc: metrics?.cpc ?? 0,
        }
      };
    });
  }, [criativos, aggregatedMetrics]);

  // Filter creatives
  const filteredCreatives = criativosComMetricas.filter(({ criativo }) => {
    const matchesSearch = criativo.id_unico.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOffer = offerFilter === 'all' || criativo.oferta_id === offerFilter;
    const matchesSource = sourceFilter === 'all' || criativo.fonte === sourceFilter;
    const matchesCopywriter = copywriterFilter === 'all' || criativo.copy_responsavel === copywriterFilter;

    // Period filter using periodo state - filtra pela data de arquivamento
    if (periodo.tipo !== 'all') {
      // Usa archived_at se disponível, senão usa updated_at como fallback
      const archivedAt = new Date(criativo.archived_at || criativo.updated_at || '');
      const startDate = new Date(periodo.dataInicio);
      const endDate = new Date(periodo.dataFim);
      endDate.setHours(23, 59, 59, 999);

      if (archivedAt < startDate || archivedAt > endDate) return false;
    }

    return matchesSearch && matchesOffer && matchesSource && matchesCopywriter;
  });

  const getOffer = (offerId: string | null): Oferta | null => {
    if (!offerId) return null;
    return (ofertas || []).find((o) => o.id === offerId) || null;
  };

  // Verifica se o criativo foi arquivado automaticamente junto com a oferta
  const wasArchivedWithOffer = (criativo: Criativo): boolean => {
    const offer = getOffer(criativo.oferta_id);
    if (!offer) return false;
    // Se a oferta está arquivada e tem o mesmo archived_at do criativo, foi arquivamento automático
    return offer.status === 'arquivado' &&
           offer.archived_at !== null &&
           criativo.archived_at === offer.archived_at;
  };

  const handleDeleteClick = (creative: Criativo, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCreative(creative);
    setDeleteConfirmId('');
    setIsDeleteDialogOpen(true);
  };

  const handleRestoreClick = (creative: Criativo, e: React.MouseEvent) => {
    e.stopPropagation();
    setRestoreCreative(creative);
    setIsRestoreDialogOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!restoreCreative) return;
    try {
      await updateCriativo.mutateAsync({
        id: restoreCreative.id,
        updates: { status: 'pausado' }
      });
      toast.success(`"${restoreCreative.id_unico}" foi restaurado com status pausado.`);
      setIsRestoreDialogOpen(false);
      setRestoreCreative(null);
    } catch (error) {
      toast.error('Não foi possível restaurar o criativo.');
    }
  };

  const handleCardClick = (creative: Criativo) => {
    setMetricsCreative(creative);
    setIsMetricsDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCreative || deleteConfirmId !== selectedCreative.id_unico) return;

    try {
      await deleteCriativo.mutateAsync(selectedCreative.id);
      toast.success(`"${selectedCreative.id_unico}" foi excluído permanentemente.`);
      setIsDeleteDialogOpen(false);
      setSelectedCreative(null);
      setDeleteConfirmId('');
    } catch (error) {
      toast.error('Não foi possível excluir o criativo. Verifique se não há métricas vinculadas.');
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Lista de criativos arquivados foi atualizada.');
  };

  const isDeleteEnabled = selectedCreative && deleteConfirmId === selectedCreative.id_unico;

  // Calcular totais das métricas para o dialog
  const metricsTotals = useMemo(() => {
    if (!selectedCreativeMetrics || selectedCreativeMetrics.length === 0) {
      return { spend: 0, faturado: 0, roas: 0, ic: 0, cpc: 0 };
    }

    const spend = selectedCreativeMetrics.reduce((acc, m) => acc + (m.spend || 0), 0);
    const faturado = selectedCreativeMetrics.reduce((acc, m) => acc + (m.faturado || 0), 0);
    const roas = spend > 0 ? faturado / spend : 0;

    // Média de IC e CPC
    const totalMetricsWithIC = selectedCreativeMetrics.filter(m => m.ic !== null && m.ic !== undefined);
    const ic = totalMetricsWithIC.length > 0
      ? totalMetricsWithIC.reduce((acc, m) => acc + (m.ic || 0), 0) / totalMetricsWithIC.length
      : 0;

    const totalMetricsWithCPC = selectedCreativeMetrics.filter(m => m.cpc !== null && m.cpc !== undefined);
    const cpc = totalMetricsWithCPC.length > 0
      ? totalMetricsWithCPC.reduce((acc, m) => acc + (m.cpc || 0), 0) / totalMetricsWithCPC.length
      : 0;

    return { spend, faturado, roas, ic, cpc };
  }, [selectedCreativeMetrics]);

  // Get thresholds from the offer for metrics dialog
  const metricsThresholds = useMemo(() => {
    if (!metricsCreative) return convertThresholds(parseThresholds(null));
    const offer = getOffer(metricsCreative.oferta_id);
    return convertThresholds(parseThresholds(offer?.thresholds || null));
  }, [metricsCreative, ofertas]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/criativos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Criativos Arquivados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredCreatives.length} criativo(s) arquivado(s)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID do criativo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-zinc-950 border-border"
            />
          </div>
          <Select value={offerFilter} onValueChange={setOfferFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Oferta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Ofertas</SelectItem>
              {(ofertas || []).map((offer) => (
                <SelectItem key={offer.id} value={offer.id}>{offer.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Fontes</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
            </SelectContent>
          </Select>
          <Select value={copywriterFilter} onValueChange={setCopywriterFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Copywriter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Copywriters</SelectItem>
              {(copywriters || []).map((copy) => (
                <SelectItem key={copy.id} value={copy.nome}>{copy.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PeriodoFilter
            value={periodo}
            onChange={setPeriodo}
            showAllOption
          />
        </div>
      </Card>

      {/* Cards Grid */}
      {filteredCreatives.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum criativo arquivado encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCreatives.map(({ criativo, metrics }) => (
            <div key={criativo.id} className="relative">
              <CreativeCard
                criativo={criativo}
                oferta={getOffer(criativo.oferta_id)}
                metrics={metrics}
                onClick={() => handleCardClick(criativo)}
              />
              {/* Action icons overlay */}
              <TooltipProvider delayDuration={100}>
                <div className="absolute top-2 right-2 flex gap-1">
                  {wasArchivedWithOffer(criativo) ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-background/80 opacity-50 pointer-events-none"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-center">
                        Restaure a oferta "{getOffer(criativo.oferta_id)?.nome}" para restaurar este criativo
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-background/80 hover:bg-background"
                          onClick={(e) => handleRestoreClick(criativo, e)}
                          disabled={updateCriativo.isPending}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Restaurar criativo</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-background/80 hover:bg-background text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteClick(criativo, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir permanentemente</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          ))}
        </div>
      )}

      {/* Metrics History Dialog */}
      <Dialog open={isMetricsDialogOpen} onOpenChange={setIsMetricsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Histórico de Métricas -
              <span
                className="font-mono cursor-pointer hover:text-primary hover:underline transition-colors"
                onClick={() => {
                  if (metricsCreative?.id_unico) {
                    navigator.clipboard.writeText(metricsCreative.id_unico);
                    toast.success('ID copiado!');
                  }
                }}
                title="Clique para copiar"
              >
                {metricsCreative?.id_unico}
              </span>
            </DialogTitle>
            <DialogDescription>
              Oferta: {getOffer(metricsCreative?.oferta_id || null)?.nome || 'Sem oferta'}
            </DialogDescription>
          </DialogHeader>

          {/* Summary */}
          <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Spend Total</p>
              <p className="text-lg font-semibold">{formatCurrency(metricsTotals.spend)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Faturado</p>
              <p className="text-lg font-semibold">{formatCurrency(metricsTotals.faturado)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">ROAS</p>
              <p className={cn(
                "text-lg font-semibold",
                getMetricClass(getMetricStatus(metricsTotals.roas, 'roas', metricsThresholds))
              )}>
                {formatRoas(metricsTotals.roas)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">IC Médio</p>
              <p className={cn(
                "text-lg font-semibold",
                getMetricClass(getMetricStatus(metricsTotals.ic, 'ic', metricsThresholds))
              )}>
                {formatCurrency(metricsTotals.ic)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">CPC Médio</p>
              <p className={cn(
                "text-lg font-semibold",
                getMetricClass(getMetricStatus(metricsTotals.cpc, 'cpc', metricsThresholds))
              )}>
                {formatCurrency(metricsTotals.cpc)}
              </p>
            </div>
          </div>

          {/* Metrics Table */}
          {isLoadingMetrics ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedCreativeMetrics && selectedCreativeMetrics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="text-right">IC</TableHead>
                  <TableHead className="text-right">CPC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCreativeMetrics.map((metric) => {
                  const spend = metric.spend || 0;
                  const faturado = metric.faturado || 0;
                  const roas = spend > 0 ? faturado / spend : 0;
                  const ic = metric.ic || 0;
                  const cpc = metric.cpc || 0;

                  return (
                    <TableRow key={metric.id}>
                      <TableCell>{formatDate(metric.data)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(spend)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(faturado)}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'font-medium',
                          getMetricClass(getMetricStatus(roas, 'roas', metricsThresholds))
                        )}>
                          {formatRoas(roas)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'font-medium',
                          getMetricClass(getMetricStatus(ic, 'ic', metricsThresholds))
                        )}>
                          {formatCurrency(ic)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'font-medium',
                          getMetricClass(getMetricStatus(cpc, 'cpc', metricsThresholds))
                        )}>
                          {formatCurrency(cpc)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma métrica encontrada para este criativo.</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMetricsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Criativo</DialogTitle>
            <DialogDescription>
              O criativo será restaurado com status "Pausado" e voltará a aparecer na gestão de criativos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-muted border">
              <p className="text-sm font-medium mb-1">
                Criativo: <span className="font-mono">{restoreCreative?.id_unico}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Oferta: {getOffer(restoreCreative?.oferta_id || null)?.nome || 'Sem oferta'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRestore}
              disabled={updateCriativo.isPending}
            >
              {updateCriativo.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirmar Restauração
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir Criativo Permanentemente</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Todos os dados do criativo serão perdidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium mb-2">
                Você está prestes a excluir: <strong>{selectedCreative?.id_unico}</strong>
              </p>
              <p className="text-xs text-destructive/80">
                Para confirmar, digite exatamente o ID do criativo abaixo:
              </p>
              <p className="text-sm font-mono font-bold text-destructive mt-1">
                {selectedCreative?.id_unico}
              </p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="confirm-id" className="text-sm font-medium">
                Digite o ID do criativo para confirmar
              </label>
              <Input
                id="confirm-id"
                value={deleteConfirmId}
                onChange={(e) => setDeleteConfirmId(e.target.value)}
                placeholder="Digite o ID do criativo"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!isDeleteEnabled || deleteCriativo.isPending}
            >
              {deleteCriativo.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Permanentemente'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
