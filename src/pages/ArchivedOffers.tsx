import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, RotateCcw, Search, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { OfferCard } from '@/components/OfferCard';
import { MobileFiltersSheet } from '@/components/MobileFiltersSheet';
import { QueryErrorState } from '@/components/QueryErrorState';
import { PeriodoFilter, usePeriodo } from '@/components/PeriodoFilter';
import { toast } from 'sonner';
import {
  useOfertasArquivadas,
  useUpdateOferta,
  useDeleteOferta,
  useRestoreOferta,
  useNichos,
  usePaises,
  useAllOffersAggregatedMetrics,
  useCreativesCountByOffer,
} from '@/hooks/useSupabase';
import { fetchCriativosArquivadosComOferta } from '@/services/api';
import type { Oferta, Criativo } from '@/services/api';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { refetchQueries } from '@/lib/query';

export default function ArchivedOffers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const { periodo, setPeriodo } = usePeriodo('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Oferta | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // Restore dialog state
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [offerToRestore, setOfferToRestore] = useState<Oferta | null>(null);
  const [criativosToRestore, setCriativosToRestore] = useState<Criativo[]>([]);
  const [selectedCriativoIds, setSelectedCriativoIds] = useState<Set<string>>(new Set());
  const [isLoadingCriativos, setIsLoadingCriativos] = useState(false);

  // Hooks
  const { data: ofertas, isLoading, isError: isOfertasError, refetch: refetchOfertas } = useOfertasArquivadas();
  const { data: nichos, isError: isNichosError, refetch: refetchNichos } = useNichos();
  const { data: paises, isError: isPaisesError, refetch: refetchPaises } = usePaises();
  const { data: aggregatedMetrics, isError: isMetricsError, refetch: refetchMetrics } = useAllOffersAggregatedMetrics();
  const { data: creativesCountByOffer, isError: isCountError, refetch: refetchCount } = useCreativesCountByOffer();
  const updateOferta = useUpdateOferta();
  const deleteOferta = useDeleteOferta();
  const restoreOfertaMutation = useRestoreOferta();

  // Filter offers
  const filteredOffers = (ofertas || []).filter((offer) => {
    const matchesSearch = offer.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNiche = nicheFilter === 'all' || offer.nicho === nicheFilter;
    const matchesCountry = countryFilter === 'all' || offer.pais === countryFilter;

    // Period filter using periodo state - filtra pela data de arquivamento
    if (periodo.tipo !== 'all') {
      // Usa archived_at se disponível, senão usa updated_at como fallback
      const archivedAt = new Date(offer.archived_at || offer.updated_at || '');
      const startDate = new Date(periodo.dataInicio);
      const endDate = new Date(periodo.dataFim);
      endDate.setHours(23, 59, 59, 999);

      if (archivedAt < startDate || archivedAt > endDate) return false;
    }

    return matchesSearch && matchesNiche && matchesCountry;
  });

  const handleDeleteClick = (offer: Oferta) => {
    setSelectedOffer(offer);
    setDeleteConfirmName('');
    setIsDeleteDialogOpen(true);
  };

  const handleRestoreClick = async (offer: Oferta) => {
    setOfferToRestore(offer);
    setIsLoadingCriativos(true);
    setIsRestoreDialogOpen(true);

    // Buscar criativos arquivados junto com a oferta
    const criativos = await fetchCriativosArquivadosComOferta(offer.id);
    setCriativosToRestore(criativos);
    // Por padrão, todos selecionados
    setSelectedCriativoIds(new Set(criativos.map(c => c.id)));
    setIsLoadingCriativos(false);
  };

  const handleToggleCriativo = (criativoId: string) => {
    setSelectedCriativoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(criativoId)) {
        newSet.delete(criativoId);
      } else {
        newSet.add(criativoId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedCriativoIds(new Set(criativosToRestore.map(c => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedCriativoIds(new Set());
  };

  const handleConfirmRestore = async () => {
    if (!offerToRestore) return;

    try {
      await restoreOfertaMutation.mutateAsync({
        id: offerToRestore.id,
        criativoIdsToRestore: Array.from(selectedCriativoIds)
      });

      const selectedCount = selectedCriativoIds.size;
      const totalCount = criativosToRestore.length;

      if (selectedCount === totalCount && totalCount > 0) {
        toast.success(`"${offerToRestore.nome}" foi restaurada com ${selectedCount} criativo(s).`);
      } else if (selectedCount > 0) {
        toast.success(`"${offerToRestore.nome}" foi restaurada com ${selectedCount} de ${totalCount} criativo(s).`);
      } else if (totalCount > 0) {
        toast.success(`"${offerToRestore.nome}" foi restaurada. ${totalCount} criativo(s) podem ser restaurados individualmente.`);
      } else {
        toast.success(`"${offerToRestore.nome}" foi restaurada com status pausado.`);
      }

      setIsRestoreDialogOpen(false);
      setOfferToRestore(null);
      setCriativosToRestore([]);
      setSelectedCriativoIds(new Set());
    } catch (error) {
      toast.error('Não foi possível restaurar a oferta.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOffer || deleteConfirmName !== selectedOffer.nome) return;

    try {
      await deleteOferta.mutateAsync(selectedOffer.id);
      toast.success(`"${selectedOffer.nome}" foi excluída permanentemente.`);
      setIsDeleteDialogOpen(false);
      setSelectedOffer(null);
      setDeleteConfirmName('');
    } catch (error) {
      toast.error('Não foi possível excluir a oferta. Verifique se não há criativos vinculados.');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchQueries([refetchOfertas, refetchNichos, refetchPaises, refetchMetrics, refetchCount]);
      toast.success('Lista de ofertas arquivadas foi atualizada.');
    } catch {
      toast.error('Não foi possível atualizar a lista.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isDeleteEnabled = selectedOffer && deleteConfirmName === selectedOffer.nome;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isOfertasError || isNichosError || isPaisesError || isMetricsError || isCountError) {
    return <QueryErrorState onRetry={handleRefresh} isRetrying={isRefreshing} />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ofertas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Ofertas Arquivadas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredOffers.length} oferta(s) arquivada(s)
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-11 shrink-0 sm:h-9" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3 md:p-4">
        <div className="flex items-center gap-2 md:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar oferta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 bg-white pl-9 dark:bg-zinc-950"
            />
          </div>
          <MobileFiltersSheet
            activeCount={
              Number(nicheFilter !== 'all') +
              Number(countryFilter !== 'all') +
              Number(periodo.tipo !== 'all')
            }
            onClear={() => {
              setNicheFilter('all');
              setCountryFilter('all');
              setPeriodo({ ...periodo, tipo: 'all' });
            }}
          >
            <Select value={nicheFilter} onValueChange={setNicheFilter}>
              <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Nicho" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Nichos</SelectItem>
                {(nichos || []).map((nicho) => <SelectItem key={nicho.id} value={nicho.nome}>{nicho.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="h-11 w-full"><SelectValue placeholder="País" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Países</SelectItem>
                {(paises || []).map((pais) => <SelectItem key={pais.id} value={pais.nome}>{pais.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <PeriodoFilter value={periodo} onChange={setPeriodo} showAllOption className="w-full" />
          </MobileFiltersSheet>
        </div>

        <div className="hidden flex-wrap items-center gap-3 md:flex">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar oferta arquivada..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white pl-9 dark:bg-zinc-950"
            />
          </div>
          <Select value={nicheFilter} onValueChange={setNicheFilter}>
            <SelectTrigger className="h-10 w-[140px]">
              <SelectValue placeholder="Nicho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Nichos</SelectItem>
              {(nichos || []).map((nicho) => (
                <SelectItem key={nicho.id} value={nicho.nome}>{nicho.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="h-10 w-[140px]">
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Países</SelectItem>
              {(paises || []).map((pais) => (
                <SelectItem key={pais.id} value={pais.nome}>{pais.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PeriodoFilter
            value={periodo}
            onChange={setPeriodo}
            showAllOption
            className="w-auto"
          />
        </div>
      </Card>

      {/* Cards Grid */}
      {filteredOffers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma oferta arquivada encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {filteredOffers.map((offer) => (
            <div key={offer.id} className="relative">
              <OfferCard
                oferta={offer}
                metrics={aggregatedMetrics?.get(offer.id)}
                creativesCount={creativesCountByOffer?.get(offer.id)}
                actionsOverlay
              />
              {/* Action icons overlay */}
              <TooltipProvider delayDuration={100}>
                <div className="absolute top-2 right-2 flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 bg-background/90 shadow-sm hover:bg-background sm:h-8 sm:w-8"
                        aria-label={`Restaurar ${offer.nome}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreClick(offer);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Restaurar oferta</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 bg-background/90 text-destructive shadow-sm hover:bg-background hover:text-destructive sm:h-8 sm:w-8"
                        aria-label={`Excluir ${offer.nome}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(offer);
                        }}
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

      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Restaurar Oferta</DialogTitle>
            <DialogDescription>
              A oferta "{offerToRestore?.nome}" será restaurada com status "Pausado".
            </DialogDescription>
          </DialogHeader>

          {/* Lista de criativos para restaurar */}
          {isLoadingCriativos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : criativosToRestore.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium">
                  Selecione os criativos para restaurar ({selectedCriativoIds.size}/{criativosToRestore.length})
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 text-xs sm:h-8"
                    onClick={handleSelectAll}
                  >
                    Todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 text-xs sm:h-8"
                    onClick={handleDeselectAll}
                  >
                    Nenhum
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-2">
                  {criativosToRestore.map((criativo) => (
                    <div
                      key={criativo.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleCriativo(criativo.id)}
                    >
                      <Checkbox
                        checked={selectedCriativoIds.has(criativo.id)}
                        onCheckedChange={() => handleToggleCriativo(criativo.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-2 break-all font-mono text-sm leading-5">{criativo.id_unico}</p>
                        <p className="text-xs text-muted-foreground capitalize">{criativo.fonte}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Criativos não selecionados poderão ser restaurados individualmente depois.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum criativo foi arquivado junto com esta oferta.
            </p>
          )}

          <DialogFooter className="grid grid-cols-2 border-t pt-4">
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRestore}
              disabled={restoreOfertaMutation.isPending || isLoadingCriativos}
            >
              {restoreOfertaMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Excluir oferta</DialogTitle>
            <DialogDescription>
              A exclusão é permanente e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <p id="confirm-name-reference" className="text-sm leading-relaxed text-muted-foreground">
              Você está prestes a excluir a oferta:{' '}
              <strong className="select-text whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-semibold text-foreground">
                {selectedOffer?.nome}
              </strong>
            </p>
            <div className="grid gap-2">
              <label htmlFor="confirm-name" className="text-sm font-medium">
                Digite o nome da oferta para confirmar
              </label>
              <Input
                id="confirm-name"
                aria-describedby="confirm-name-reference"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Digite o nome da oferta"
                className="h-11 text-base"
              />
            </div>
          </div>
          <DialogFooter className="grid grid-cols-2 border-t pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!isDeleteEnabled || deleteOferta.isPending}
            >
              {deleteOferta.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
