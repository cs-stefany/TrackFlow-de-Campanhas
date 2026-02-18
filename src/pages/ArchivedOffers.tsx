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

export default function ArchivedOffers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const { periodo, setPeriodo } = usePeriodo('all');

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
  const { data: ofertas, isLoading, refetch } = useOfertasArquivadas();
  const { data: nichos } = useNichos();
  const { data: paises } = usePaises();
  const { data: aggregatedMetrics } = useAllOffersAggregatedMetrics();
  const { data: creativesCountByOffer } = useCreativesCountByOffer();
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
      toast.error('Nao foi possivel restaurar a oferta.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOffer || deleteConfirmName !== selectedOffer.nome) return;

    try {
      await deleteOferta.mutateAsync(selectedOffer.id);
      toast.success(`"${selectedOffer.nome}" foi excluida permanentemente.`);
      setIsDeleteDialogOpen(false);
      setSelectedOffer(null);
      setDeleteConfirmName('');
    } catch (error) {
      toast.error('Nao foi possivel excluir a oferta. Verifique se nao ha criativos vinculados.');
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Lista de ofertas arquivadas foi atualizada.');
  };

  const isDeleteEnabled = selectedOffer && deleteConfirmName === selectedOffer.nome;

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
        <Button variant="ghost" size="icon" onClick={() => navigate('/ofertas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Ofertas Arquivadas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredOffers.length} oferta(s) arquivada(s)
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
              placeholder="Buscar oferta arquivada..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-zinc-950 border-border"
            />
          </div>
          <Select value={nicheFilter} onValueChange={setNicheFilter}>
            <SelectTrigger className="w-[140px]">
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
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Pais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Paises</SelectItem>
              {(paises || []).map((pais) => (
                <SelectItem key={pais.id} value={pais.nome}>{pais.nome}</SelectItem>
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
      {filteredOffers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma oferta arquivada encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => (
            <div key={offer.id} className="relative">
              <OfferCard
                oferta={offer}
                metrics={aggregatedMetrics?.get(offer.id)}
                creativesCount={creativesCountByOffer?.get(offer.id)}
              />
              {/* Action icons overlay */}
              <TooltipProvider delayDuration={100}>
                <div className="absolute top-2 right-2 flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-background/80 hover:bg-background"
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
                        className="h-7 w-7 bg-background/80 hover:bg-background text-destructive hover:text-destructive"
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
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Selecione os criativos para restaurar ({selectedCriativoIds.size}/{criativosToRestore.length})
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleSelectAll}
                  >
                    Todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
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
                        <p className="font-mono text-sm truncate">{criativo.id_unico}</p>
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

          <DialogFooter>
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
                  Restaurar Oferta
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
            <DialogTitle className="text-destructive">Excluir Oferta Permanentemente</DialogTitle>
            <DialogDescription>
              Esta acao nao pode ser desfeita. Todos os dados da oferta serao perdidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium mb-2">
                Voce esta prestes a excluir: <strong>{selectedOffer?.nome}</strong>
              </p>
              <p className="text-xs text-destructive/80">
                Para confirmar, digite exatamente o nome da oferta abaixo:
              </p>
              <p className="text-sm font-mono font-bold text-destructive mt-1">
                {selectedOffer?.nome}
              </p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="confirm-name" className="text-sm font-medium">
                Digite o nome da oferta para confirmar
              </label>
              <Input
                id="confirm-name"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Digite o nome da oferta"
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
              disabled={!isDeleteEnabled || deleteOferta.isPending}
            >
              {deleteOferta.isPending ? (
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
