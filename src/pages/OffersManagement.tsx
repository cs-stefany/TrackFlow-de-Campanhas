import { useState } from 'react';
import { Plus, Pencil, Search, ArrowUpDown, Eye, RefreshCw, Loader2, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge, MetricBadge } from '@/components/MetricBadge';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { PeriodoFilter, usePeriodo, type PeriodoValue } from '@/components/PeriodoFilter';
import { ThresholdsDialog } from '@/components/ThresholdsDialog';
import { formatCurrency, formatRoas, getMetricStatus, getMetricClass } from '@/lib/metrics';
import { formatDate, formatDateInput } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useOfertas,
  useOfertasAtivas,
  useCreateOferta,
  useUpdateOferta,
  useArchiveOferta,
  useNichos,
  usePaises,
  useCreateNicho,
  useCreatePais,
  useMetricasDiariasComOferta,
  useThresholdsVigentesBatch,
  type Thresholds,
} from '@/hooks/useSupabase';
import { parseThresholds, type Oferta, type MetricaDiariaOfertaComJoin } from '@/services/api';

type SortField = 'roas' | 'ic' | 'cpc' | 'date' | null;
type SortDirection = 'asc' | 'desc';

// Type alias for convenience
type MetricaDiaComOferta = MetricaDiariaOfertaComJoin;

export default function OffersManagement() {
  const navigate = useNavigate();
  const { periodo, setPeriodo } = usePeriodo('7d');
  
  // Supabase hooks - agora busca métricas diárias com JOIN na oferta
  const { data: metricasDiarias, isLoading: isLoadingMetricas, refetch: refetchMetricas } = useMetricasDiariasComOferta({
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
  });
  const { data: ofertas, isLoading: isLoadingOfertas, refetch: refetchOfertas } = useOfertas();
  const { data: ofertasAtivas } = useOfertasAtivas();
  const { data: nichos, isLoading: isLoadingNichos } = useNichos();
  const { data: paises, isLoading: isLoadingPaises } = usePaises();

  // Extrair oferta_ids únicos das métricas para buscar thresholds históricos
  const ofertaIdsFromMetricas = Array.from(
    new Set(
      (metricasDiarias || [])
        .map(m => m.oferta_id)
        .filter((id): id is string => !!id)
    )
  );

  // Buscar thresholds vigentes para o último dia do período (Opção A acordada)
  const { data: thresholdsMap } = useThresholdsVigentesBatch(
    ofertaIdsFromMetricas,
    periodo.dataFim
  );
  
  const createOfertaMutation = useCreateOferta();
  const updateOfertaMutation = useUpdateOferta();
  const archiveOfertaMutation = useArchiveOferta();
  const createNichoMutation = useCreateNicho();
  const createPaisMutation = useCreatePais();
  
  // UI State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isThresholdsDialogOpen, setIsThresholdsDialogOpen] = useState(false);
  const [viewingOffer, setViewingOffer] = useState<Oferta | null>(null);
  const [viewingMetrica, setViewingMetrica] = useState<MetricaDiaComOferta | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // New offer form state
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferNiche, setNewOfferNiche] = useState('');
  const [newOfferCountry, setNewOfferCountry] = useState('');
  const [newOfferStatus, setNewOfferStatus] = useState('ativo');
  const [newOfferDate, setNewOfferDate] = useState<Date>(new Date());
  const [roasGreen, setRoasGreen] = useState('1.30');
  const [roasYellow, setRoasYellow] = useState('1.10');
  const [icGreen, setIcGreen] = useState('50.00');
  const [icYellow, setIcYellow] = useState('60.00');
  const [cpcGreen, setCpcGreen] = useState('1.50');
  const [cpcYellow, setCpcYellow] = useState('2.00');
  
  // Edit form state
  const [editingOffer, setEditingOffer] = useState<Oferta | null>(null);
  const [editName, setEditName] = useState('');
  const [editNiche, setEditNiche] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Convert nichos/paises to combobox options
  const nichosOptions = (nichos || []).map(n => ({ value: n.nome, label: n.nome }));
  const paisesOptions = (paises || []).map(p => ({ value: p.nome, label: p.nome }));

  // Refresh function
  const handleRefresh = async () => {
    await Promise.all([refetchMetricas(), refetchOfertas()]);
    toast.success('Dados atualizados!');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Converte Thresholds (verde/amarelo) para formato do MetricBadge (green/yellow)
  const convertThresholdsFormat = (t: Thresholds) => ({
    roas: { green: t.roas.verde, yellow: t.roas.amarelo },
    ic: { green: t.ic.verde, yellow: t.ic.amarelo },
    cpc: { green: t.cpc.verde, yellow: t.cpc.amarelo },
  });

  // Busca thresholds do histórico para uma oferta
  // Usa thresholds vigentes no último dia do período selecionado
  const getOfferThresholds = (ofertaId: string | null | undefined) => {
    const defaultThresholds = { roas: { green: 1.3, yellow: 1.1 }, ic: { green: 50, yellow: 60 }, cpc: { green: 1.5, yellow: 2 } };
    if (!ofertaId || !thresholdsMap) return defaultThresholds;

    const historicalThresholds = thresholdsMap.get(ofertaId);
    if (!historicalThresholds) return defaultThresholds;

    return convertThresholdsFormat(historicalThresholds);
  };

  // Filter metrics based on search and filters
  const filteredMetricas = (metricasDiarias || []).filter((metrica) => {
    if (!metrica.oferta) return false;

    const matchesSearch = metrica.oferta.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNiche = nicheFilter === 'all' || metrica.oferta.nicho === nicheFilter;
    const matchesCountry = countryFilter === 'all' || metrica.oferta.pais === countryFilter;
    const matchesStatus = statusFilter === 'all' || metrica.oferta.status === statusFilter;

    // For health filter, use historical thresholds
    const thresholds = getOfferThresholds(metrica.oferta_id);
    const health = getMetricStatus(metrica.roas || 0, 'roas', thresholds);
    const matchesHealth = healthFilter === 'all' || health === healthFilter;

    return matchesSearch && matchesNiche && matchesCountry && matchesStatus && matchesHealth;
  });

  // Sort metrics
  const sortedMetricas = [...filteredMetricas].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: number, bValue: number;
    
    switch (sortField) {
      case 'roas':
        aValue = a.roas || 0;
        bValue = b.roas || 0;
        break;
      case 'ic':
        aValue = a.ic || 0;
        bValue = b.ic || 0;
        break;
      case 'cpc':
        aValue = a.cpc || 0;
        bValue = b.cpc || 0;
        break;
      case 'date':
        aValue = new Date(a.data).getTime();
        bValue = new Date(b.data).getTime();
        break;
      default:
        return 0;
    }
    
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const resetNewOfferForm = () => {
    setNewOfferName('');
    setNewOfferNiche('');
    setNewOfferCountry('');
    setNewOfferStatus('ativo');
    setNewOfferDate(new Date());
    setRoasGreen('1.30');
    setRoasYellow('1.10');
    setIcGreen('50.00');
    setIcYellow('60.00');
    setCpcGreen('1.50');
    setCpcYellow('2.00');
  };

  const handleCreateOffer = async () => {
    if (!newOfferName || !newOfferNiche || !newOfferCountry) {
      toast.error('Preencha nome, nicho e país');
      return;
    }

    try {
      await createOfertaMutation.mutateAsync({
        nome: newOfferName,
        nicho: newOfferNiche,
        pais: newOfferCountry,
        status: newOfferStatus,
        data: format(newOfferDate, 'yyyy-MM-dd'),
        thresholds: {
          roas: { verde: parseFloat(roasGreen), amarelo: parseFloat(roasYellow) },
          ic: { verde: parseFloat(icGreen), amarelo: parseFloat(icYellow) },
          cpc: { verde: parseFloat(cpcGreen), amarelo: parseFloat(cpcYellow) },
        },
      });

      toast.success(`A oferta "${newOfferName}" foi criada com sucesso.`);

      resetNewOfferForm();
      setIsSheetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar oferta');
    }
  };

  const handleCreateNicho = async (nome: string) => {
    await createNichoMutation.mutateAsync(nome);
    setNewOfferNiche(nome);
  };

  const handleCreatePais = async (nome: string) => {
    await createPaisMutation.mutateAsync({ nome });
    setNewOfferCountry(nome);
  };

  const handleCreateNichoEdit = async (nome: string) => {
    await createNichoMutation.mutateAsync(nome);
    setEditNiche(nome);
  };

  const handleCreatePaisEdit = async (nome: string) => {
    await createPaisMutation.mutateAsync({ nome });
    setEditCountry(nome);
  };

  const openEditSheet = (offer: Oferta) => {
    setEditingOffer(offer);
    setEditName(offer.nome);
    setEditNiche(offer.nicho);
    setEditCountry(offer.pais);
    setEditStatus(offer.status || 'ativo');
    setIsEditSheetOpen(true);
  };

  const openThresholdsDialog = (metrica: MetricaDiaComOferta) => {
    if (metrica.oferta) {
      setViewingOffer(metrica.oferta);
      setViewingMetrica(metrica);
    }
    setIsThresholdsDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingOffer) return;

    // Verificar se houve alteração real em algum campo
    const hasChanges =
      editName !== editingOffer.nome ||
      editNiche !== editingOffer.nicho ||
      editCountry !== editingOffer.pais ||
      editStatus !== (editingOffer.status || 'ativo');

    if (!hasChanges) {
      toast.error('Nenhuma alteração foi detectada.');
      return;
    }

    setIsConfirmDialogOpen(true);
  };

  const handleConfirmEdit = async () => {
    if (!editingOffer) return;

    try {
      // Verificar se está arquivando a oferta
      const isArchiving = editStatus === 'arquivado' && editingOffer.status !== 'arquivado';

      if (isArchiving) {
        // Usar archiveOfertaMutation para arquivar oferta E criativos
        await archiveOfertaMutation.mutateAsync(editingOffer.id);

        // Se houver outras alterações além do status, aplicá-las também
        const otherUpdates: Record<string, any> = {};
        if (editName !== editingOffer.nome) otherUpdates.nome = editName;
        if (editNiche !== editingOffer.nicho) otherUpdates.nicho = editNiche;
        if (editCountry !== editingOffer.pais) otherUpdates.pais = editCountry;

        if (Object.keys(otherUpdates).length > 0) {
          await updateOfertaMutation.mutateAsync({
            id: editingOffer.id,
            updates: otherUpdates,
          });
        }

        toast.success('Oferta arquivada com sucesso. Todos os criativos vinculados também foram arquivados.');
      } else {
        // Atualização normal (sem arquivamento)
        const updates: Record<string, any> = {};

        if (editName !== editingOffer.nome) updates.nome = editName;
        if (editNiche !== editingOffer.nicho) updates.nicho = editNiche;
        if (editCountry !== editingOffer.pais) updates.pais = editCountry;
        if (editStatus !== (editingOffer.status || 'ativo')) updates.status = editStatus;

        await updateOfertaMutation.mutateAsync({
          id: editingOffer.id,
          updates,
        });

        toast.success('As alterações foram salvas com sucesso.');
      }

      setIsConfirmDialogOpen(false);
      setIsEditSheetOpen(false);
      setEditingOffer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar oferta');
    }
  };

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={cn("cursor-pointer hover:bg-muted/50 transition-colors", className)}
      onClick={() => handleSort(field)}
    >
      <div className={cn(
        "flex items-center gap-1",
        className?.includes('text-right') && "justify-end",
        className?.includes('text-center') && "justify-center"
      )}>
        {children}
        <ArrowUpDown className={cn(
          "h-3 w-3",
          sortField === field ? "text-foreground" : "text-muted-foreground"
        )} />
      </div>
    </TableHead>
  );

  const mapStatusToDisplay = (status: string): 'active' | 'paused' | 'archived' => {
    switch (status) {
      case 'ativo': return 'active';
      case 'pausado': return 'paused';
      case 'arquivado': return 'archived';
      default: return 'active';
    }
  };

  // Encontrar ofertas ativas que não têm métricas no período selecionado
  const ofertasComMetricas = new Set(
    (metricasDiarias || [])
      .filter(m => m.oferta)
      .map(m => m.oferta!.id)
  );

  const ofertasSemMetricas = (ofertasAtivas || []).filter(oferta => {
    const semMetricas = !ofertasComMetricas.has(oferta.id);
    const matchesSearch = oferta.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNiche = nicheFilter === 'all' || oferta.nicho === nicheFilter;
    const matchesCountry = countryFilter === 'all' || oferta.pais === countryFilter;
    const matchesStatus = statusFilter === 'all' || oferta.status === statusFilter;
    return semMetricas && matchesSearch && matchesNiche && matchesCountry && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Ofertas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {(ofertas || []).filter(o => o.status !== 'arquivado').length} oferta(s) cadastrada(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleRefresh}
            disabled={isLoadingMetricas}
          >
            {isLoadingMetricas ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </Button>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Oferta
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[550px] sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>Nova Oferta</SheetTitle>
                <SheetDescription>
                  Cadastre uma nova oferta no sistema
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="grid gap-4 py-6 px-2">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome da Oferta <span className="text-destructive">*</span></Label>
                    <Input 
                      id="name" 
                      placeholder="Ex: Nutra Max Pro"
                      value={newOfferName}
                      onChange={(e) => setNewOfferName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="niche">Nicho <span className="text-destructive">*</span></Label>
                      <CreatableCombobox
                        options={nichosOptions}
                        value={newOfferNiche}
                        onChange={setNewOfferNiche}
                        onCreateNew={handleCreateNicho}
                        placeholder="Selecione"
                        searchPlaceholder="Buscar nicho..."
                        emptyText="Nenhum nicho encontrado"
                        createText="Criar"
                        isLoading={isLoadingNichos}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="country">País <span className="text-destructive">*</span></Label>
                      <CreatableCombobox
                        options={paisesOptions}
                        value={newOfferCountry}
                        onChange={setNewOfferCountry}
                        onCreateNew={handleCreatePais}
                        placeholder="Selecione"
                        searchPlaceholder="Buscar país..."
                        emptyText="Nenhum país encontrado"
                        createText="Criar"
                        isLoading={isLoadingPaises}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                    <Select value={newOfferStatus} onValueChange={setNewOfferStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ROAS Threshold Section */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-medium">Thresholds – ROAS</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Defina quando o ROAS é considerado excelente, atenção ou crítico
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-success" />
                          Verde (ROAS &gt;) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={roasGreen}
                          onChange={(e) => setRoasGreen(e.target.value)}
                          placeholder="1.30"
                          className="placeholder:text-muted-foreground/40"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-warning" />
                          Amarelo (ROAS &gt;) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={roasYellow}
                          onChange={(e) => setRoasYellow(e.target.value)}
                          placeholder="1.10"
                          className="placeholder:text-muted-foreground/40"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ✓ Verde: ROAS &gt; {roasGreen} (ótimo) | ⚠ Amarelo: {roasYellow}–{roasGreen} (atenção) | ✗ Vermelho: &lt; {roasYellow} (crítico)
                    </p>
                  </div>

                  {/* IC Threshold Section */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-medium">Thresholds – IC (Custo por Inicialização)</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Defina quando o IC é considerado excelente, atenção ou crítico
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-success" />
                          Verde (IC &lt;) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          value={icGreen}
                          onChange={(e) => setIcGreen(e.target.value)}
                          placeholder="50.00"
                          className="placeholder:text-muted-foreground/40"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-warning" />
                          Amarelo (IC &lt;) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          value={icYellow}
                          onChange={(e) => setIcYellow(e.target.value)}
                          placeholder="60.00"
                          className="placeholder:text-muted-foreground/40"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ✓ Verde: IC &lt; R${icGreen} (ótimo) | ⚠ Amarelo: R${icGreen}–R${icYellow} (atenção) | ✗ Vermelho: &gt; R${icYellow} (crítico)
                    </p>
                  </div>

                  {/* CPC Threshold Section */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-medium">Thresholds – CPC (Custo por Clique)</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Defina quando o CPC é considerado excelente, atenção ou crítico
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-success" />
                          Verde (CPC &lt;) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={cpcGreen}
                          onChange={(e) => setCpcGreen(e.target.value)}
                          placeholder="1.50"
                          className="placeholder:text-muted-foreground/40"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-warning" />
                          Amarelo (CPC &lt;) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={cpcYellow}
                          onChange={(e) => setCpcYellow(e.target.value)}
                          placeholder="2.00"
                          className="placeholder:text-muted-foreground/40"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ✓ Verde: CPC &lt; R${cpcGreen} (ótimo) | ⚠ Amarelo: R${cpcGreen}–R${cpcYellow} (atenção) | ✗ Vermelho: &gt; R${cpcYellow} (crítico)
                    </p>
                  </div>
                </div>
              </ScrollArea>
              <SheetFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateOffer}
                  disabled={createOfertaMutation.isPending}
                >
                  {createOfertaMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Criar Oferta
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
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
              {(nichos || []).map((niche) => (
                <SelectItem key={niche.id} value={niche.nome}>{niche.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Países</SelectItem>
              {(paises || []).map((pais) => (
                <SelectItem key={pais.id} value={pais.nome}>{pais.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger className="w-[140px]">
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
          <PeriodoFilter 
            value={periodo} 
            onChange={setPeriodo}
            showAllOption
          />
        </div>
      </Card>

      {/* Ofertas sem métricas no período */}
      {ofertasSemMetricas.length > 0 && (
        <Card className="p-4 border-warning/50 bg-warning/5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-2 w-2 rounded-full bg-warning" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground mb-2">
                {ofertasSemMetricas.length} oferta(s) sem métricas no período selecionado
              </h3>
              <div className="flex flex-wrap gap-2">
                {ofertasSemMetricas.map((oferta) => (
                  <div
                    key={oferta.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => openEditSheet(oferta)}
                  >
                    <span className="text-sm font-medium">{oferta.nome}</span>
                    <StatusBadge status={mapStatusToDisplay(oferta.status || 'ativo')} />
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/ofertas/${oferta.id}`);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver detalhes e lançar métricas</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditSheet(oferta);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar oferta</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Essas ofertas foram criadas mas ainda não têm métricas lançadas. Clique para editar ou lance métricas para vê-las na tabela.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoadingMetricas ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        /* Table */
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="date" className="text-center">Data</SortableHeader>
                <TableHead className="text-center">Nome</TableHead>
                <TableHead className="text-center">Nicho</TableHead>
                <TableHead className="text-center">País</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <SortableHeader field="roas" className="text-center">ROAS</SortableHeader>
                <SortableHeader field="ic" className="text-center">IC</SortableHeader>
                <SortableHeader field="cpc" className="text-center">CPC</SortableHeader>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMetricas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum resultado encontrado para o período selecionado
                  </TableCell>
                </TableRow>
              ) : (
                sortedMetricas.map((metrica) => {
                  if (!metrica.oferta) return null;

                  const thresholds = getOfferThresholds(metrica.oferta_id);
                  const lucro = (metrica.faturado || 0) - (metrica.spend || 0);
                  const mc = metrica.faturado && metrica.faturado > 0
                    ? (lucro / metrica.faturado) * 100
                    : 0;

                  return (
                    <TableRow key={metrica.id}>
                      <TableCell className="text-center">{formatDate(metrica.data)}</TableCell>
                      <TableCell className="text-center font-medium">{metrica.oferta.nome}</TableCell>
                      <TableCell className="text-center">{metrica.oferta.nicho}</TableCell>
                      <TableCell className="text-center">{metrica.oferta.pais}</TableCell>
                      <TableCell className="text-center"><StatusBadge status={mapStatusToDisplay(metrica.oferta.status || 'ativo')} /></TableCell>
                      <TableCell className="text-center">
                        <MetricBadge
                          value={metrica.roas || 0}
                          metricType="roas"
                          thresholds={thresholds}
                          format={formatRoas}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <MetricBadge
                          value={metrica.ic || 0}
                          metricType="ic"
                          thresholds={thresholds}
                          format={(v) => formatCurrency(v)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <MetricBadge
                          value={metrica.cpc || 0}
                          metricType="cpc"
                          thresholds={thresholds}
                          format={(v) => formatCurrency(v)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider delayDuration={100}>
                          <div className="flex items-center justify-center gap-1">
                            <Popover>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <BarChart2 className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Ver detalhes financeiros</TooltipContent>
                              </Tooltip>
                              <PopoverContent className="w-64" align="end">
                                <div className="grid gap-3">
                                  <div className="font-medium text-sm border-b pb-2">
                                    Detalhes - {formatDate(metrica.data)}
                                  </div>
                                  <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Lucro</span>
                                      <span className={`font-medium ${lucro >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {formatCurrency(lucro)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">MC</span>
                                      <span className="font-medium">{mc.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Faturamento</span>
                                      <span className="font-medium">{formatCurrency(metrica.faturado || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Spend</span>
                                      <span className="font-medium">{formatCurrency(metrica.spend || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openThresholdsDialog(metrica)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver métricas</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => metrica.oferta && openEditSheet(metrica.oferta)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar oferta</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Thresholds Dialog */}
      <ThresholdsDialog
        open={isThresholdsDialogOpen}
        onOpenChange={setIsThresholdsDialogOpen}
        oferta={viewingOffer}
        metricas={{
          roas: viewingMetrica?.roas || 0,
          ic: viewingMetrica?.ic || 0,
          cpc: viewingMetrica?.cpc || 0,
        }}
        dataMetrica={viewingMetrica?.data}
      />

      {/* Edit Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="w-[550px] sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Editar Oferta</SheetTitle>
            <SheetDescription>
              Altere as informações da oferta
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="grid gap-4 py-6 px-2">
              {/* Name field */}
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nome da Oferta</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              {/* Niche and Country */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Nicho</Label>
                  <CreatableCombobox
                    options={nichosOptions}
                    value={editNiche}
                    onChange={setEditNiche}
                    onCreateNew={handleCreateNichoEdit}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar nicho..."
                    emptyText="Nenhum nicho encontrado"
                    createText="Criar"
                    isLoading={isLoadingNichos}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>País</Label>
                  <CreatableCombobox
                    options={paisesOptions}
                    value={editCountry}
                    onChange={setEditCountry}
                    onCreateNew={handleCreatePaisEdit}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar país..."
                    emptyText="Nenhum país encontrado"
                    createText="Criar"
                    isLoading={isLoadingPaises}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="arquivado">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </ScrollArea>
          <SheetFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditSheetOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateOfertaMutation.isPending}
            >
              {updateOfertaMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar Alterações
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alterações</DialogTitle>
            <DialogDescription>
              Revise as informações antes de confirmar
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Nome</Label>
              <Input value={editName} disabled className="bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Nicho</Label>
                <Input value={editNiche} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">País</Label>
                <Input value={editCountry} disabled className="bg-muted" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Status</Label>
              <div className="flex items-center">
                <StatusBadge status={mapStatusToDisplay(editStatus)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmEdit}
              disabled={updateOfertaMutation.isPending}
            >
              {updateOfertaMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
