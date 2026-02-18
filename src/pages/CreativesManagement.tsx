import { useState } from 'react';
import { Plus, Pencil, Search, ArrowUpDown, RefreshCw, Loader2, CalendarIcon, BarChart2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MetricBadge } from '@/components/MetricBadge';
import { VideoThumbnail } from '@/components/VideoPlayerDialog';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { PeriodoFilter, usePeriodo, type PeriodoValue } from '@/components/PeriodoFilter';
import { formatCurrency, formatRoas, copyToClipboard } from '@/lib/metrics';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useCriativos,
  useOfertasAtivas,
  useCopywriters,
  useCreateCriativo,
  useUpdateCriativo,
  useArchiveCriativo,
  useCreateCopywriter,
  useMetricasDiariasComCriativo,
  useThresholdsVigentesBatch,
  type MetricaDiariaComCriativo,
  type Thresholds,
} from '@/hooks/useSupabase';
import { parseThresholds, type Criativo } from '@/services/api';

type SortField = 'date' | null;
type SortDirection = 'asc' | 'desc';

// Status mapping
const statusLabels: Record<string, string> = {
  nao_validado: 'Não Validado',
  em_teste: 'Em Teste',
  liberado: 'Liberado',
  pausado: 'Pausado',
  arquivado: 'Arquivado',
};

const statusColors: Record<string, string> = {
  liberado: 'bg-success/10 text-success',
  em_teste: 'bg-info/10 text-info',
  nao_validado: 'bg-muted text-muted-foreground',
  pausado: 'bg-warning/10 text-warning',
  arquivado: 'bg-danger/10 text-danger',
};

const fonteLabels: Record<string, string> = {
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  outro: 'Outro',
};

const fonteColors: Record<string, string> = {
  facebook: 'bg-info/10 text-info',
  youtube: 'bg-danger/10 text-danger',
  tiktok: 'bg-purple-500/10 text-purple-500',
  outro: 'bg-muted text-muted-foreground',
};

// Creative Status Badge Component
function CreativeStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap",
        statusColors[status] || statusColors.nao_validado
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}

// Fonte Badge Component
function FonteBadge({ fonte }: { fonte: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
      fonteColors[fonte] || fonteColors.outro
    )}>
      {fonteLabels[fonte] || fonte}
    </span>
  );
}

export default function CreativesManagement() {
  const navigate = useNavigate();
  // UI State - moved up for use in hook
  const { periodo, setPeriodo } = usePeriodo('7d');

  // Supabase hooks
  const { data: metricasDiarias, isLoading: isLoadingMetricas, refetch } = useMetricasDiariasComCriativo({
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
  });
  const { data: criativos } = useCriativos(); // Keep for edit dialog
  const { data: ofertas, isLoading: isLoadingOfertas } = useOfertasAtivas();
  const { data: copywriters, isLoading: isLoadingCopywriters } = useCopywriters();

  // Extrair oferta_ids únicos das métricas para buscar thresholds históricos
  const ofertaIdsFromMetricas = Array.from(
    new Set(
      (metricasDiarias || [])
        .map(m => m.criativo?.oferta_id)
        .filter((id): id is string => !!id)
    )
  );

  // Buscar thresholds vigentes para o último dia do período (Opção A acordada)
  // Para períodos agregados (7d, 30d), usa threshold do último dia
  const { data: thresholdsMap } = useThresholdsVigentesBatch(
    ofertaIdsFromMetricas,
    periodo.dataFim
  );
  
  const createCriativoMutation = useCreateCriativo();
  const updateCriativoMutation = useUpdateCriativo();
  const archiveCriativoMutation = useArchiveCriativo();
  const createCopywriterMutation = useCreateCopywriter();
  
  // UI State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [offerFilter, setOfferFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copywriterFilter, setCopywriterFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // New creative form state
  const [newOferta, setNewOferta] = useState('');
  const [newIdUnico, setNewIdUnico] = useState('ID01_OFERTA_WL1');
  const [newFonte, setNewFonte] = useState('');
  const [newCopywriter, setNewCopywriter] = useState('');
  const [newStatus, setNewStatus] = useState('em_teste');
  const [newUrl, setNewUrl] = useState('');
  const [newObservacoes, setNewObservacoes] = useState('');

  // Edit state
  const [editingCreative, setEditingCreative] = useState<Criativo | null>(null);
  const [editOffer, setEditOffer] = useState('');
  const [editId, setEditId] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editCopywriter, setEditCopywriter] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editObservations, setEditObservations] = useState('');

  // Convert copywriters to combobox options
  const copywritersOptions = (copywriters || []).map(c => ({ value: c.nome, label: c.nome }));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter metrics (each row is criativo + day)
  const filteredMetricas = (metricasDiarias || []).filter((metrica) => {
    if (!metrica.criativo) return false;

    const matchesSearch = metrica.criativo.id_unico.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOffer = offerFilter === 'all' || metrica.criativo.oferta_id === offerFilter;
    const matchesSource = sourceFilter === 'all' || metrica.criativo.fonte === sourceFilter;
    const matchesStatus = statusFilter === 'all' || metrica.criativo.status === statusFilter;
    const matchesCopywriter = copywriterFilter === 'all' || metrica.criativo.copy_responsavel === copywriterFilter;
    const notArchived = metrica.criativo.status !== 'arquivado';

    return matchesSearch && matchesOffer && matchesSource && matchesStatus && matchesCopywriter && notArchived;
  });

  // Encontrar criativos ativos que não têm métricas no período selecionado
  const criativosComMetricas = new Set(
    (metricasDiarias || [])
      .filter(m => m.criativo)
      .map(m => m.criativo!.id)
  );

  const criativosSemMetricas = (criativos || []).filter(criativo => {
    const semMetricas = !criativosComMetricas.has(criativo.id);
    const notArchived = criativo.status !== 'arquivado';
    const matchesSearch = criativo.id_unico.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOffer = offerFilter === 'all' || criativo.oferta_id === offerFilter;
    const matchesSource = sourceFilter === 'all' || criativo.fonte === sourceFilter;
    const matchesStatus = statusFilter === 'all' || criativo.status === statusFilter;
    const matchesCopywriter = copywriterFilter === 'all' || criativo.copy_responsavel === copywriterFilter;
    return semMetricas && notArchived && matchesSearch && matchesOffer && matchesSource && matchesStatus && matchesCopywriter;
  });

  // Sort metrics
  const sortedMetricas = [...filteredMetricas].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: number, bValue: number;

    switch (sortField) {
      case 'date':
        aValue = new Date(a.data).getTime();
        bValue = new Date(b.data).getTime();
        break;
      default:
        return 0;
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const getOfferName = (ofertaId: string | null) => {
    if (!ofertaId) return 'N/A';
    const offer = ofertas?.find((o) => o.id === ofertaId);
    return offer?.nome || 'N/A';
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

  // Get offer name from oferta_id (for edit dialog)
  const getOfferNameById = (ofertaId: string | null) => {
    if (!ofertaId) return 'N/A';
    const offer = ofertas?.find((o) => o.id === ofertaId);
    return offer?.nome || 'N/A';
  };

  const resetNewForm = () => {
    setNewOferta('');
    setNewIdUnico('ID01_OFERTA_WL1');
    setNewFonte('');
    setNewCopywriter('');
    setNewStatus('em_teste');
    setNewUrl('');
    setNewObservacoes('');
  };

  const handleCreateCriativo = async () => {
    if (!newOferta || !newIdUnico || !newFonte || !newCopywriter || !newStatus || !newUrl) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validate URL format
    try {
      new URL(newUrl);
    } catch {
      toast.error('URL inválida. Insira uma URL válida (ex: https://...)');
      return;
    }

    try {
      await createCriativoMutation.mutateAsync({
        oferta_id: newOferta,
        id_unico: newIdUnico,
        fonte: newFonte,
        copy_responsavel: newCopywriter,
        status: newStatus,
        url: newUrl || null,
        observacoes: newObservacoes || null,
      });

      toast.success(`O criativo "${newIdUnico}" foi criado com sucesso.`);

      resetNewForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar criativo');
    }
  };

  const handleCreateCopywriter = async (nome: string) => {
    await createCopywriterMutation.mutateAsync(nome);
    setNewCopywriter(nome);
  };

  const handleCreateCopywriterEdit = async (nome: string) => {
    await createCopywriterMutation.mutateAsync(nome);
    setEditCopywriter(nome);
  };

  const openEditDialog = (criativoId: string) => {
    const creative = criativos?.find(c => c.id === criativoId);
    if (!creative) {
      toast.error('Criativo não encontrado');
      return;
    }
    setEditingCreative(creative);
    setEditOffer(creative.oferta_id || '');
    setEditId(creative.id_unico);
    setEditSource(creative.fonte);
    setEditCopywriter(creative.copy_responsavel || '');
    setEditStatus(creative.status || 'em_teste');
    setEditUrl(creative.url || '');
    setEditObservations(creative.observacoes || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingCreative) return;

    // Verificar se houve alteração real em algum campo
    const hasChanges =
      editOffer !== (editingCreative.oferta_id || '') ||
      editId !== editingCreative.id_unico ||
      editSource !== editingCreative.fonte ||
      editCopywriter !== (editingCreative.copy_responsavel || '') ||
      editStatus !== (editingCreative.status || 'em_teste') ||
      editUrl !== (editingCreative.url || '') ||
      editObservations !== (editingCreative.observacoes || '');

    if (!hasChanges) {
      toast.error('Nenhuma alteração foi detectada.');
      return;
    }

    setIsConfirmDialogOpen(true);
  };

  const handleConfirmEdit = async () => {
    if (!editingCreative) return;

    try {
      const updates: Record<string, any> = {};

      if (editOffer !== (editingCreative.oferta_id || '')) updates.oferta_id = editOffer;
      if (editId !== editingCreative.id_unico) updates.id_unico = editId;
      if (editSource !== editingCreative.fonte) updates.fonte = editSource;
      if (editCopywriter !== (editingCreative.copy_responsavel || '')) updates.copy_responsavel = editCopywriter;
      if (editStatus !== (editingCreative.status || 'em_teste')) updates.status = editStatus;
      if (editUrl !== (editingCreative.url || '')) updates.url = editUrl || null;
      if (editObservations !== (editingCreative.observacoes || '')) updates.observacoes = editObservations || null;

      await updateCriativoMutation.mutateAsync({
        id: editingCreative.id,
        updates,
      });

      toast.success('As alterações foram salvas com sucesso.');

      setIsConfirmDialogOpen(false);
      setIsEditDialogOpen(false);
      setEditingCreative(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar criativo');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Criativos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {(criativos || []).length} criativo(s) cadastrado(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={async () => {
              await refetch();
              toast.success('Dados atualizados!');
            }}
            disabled={isLoadingMetricas}
          >
            {isLoadingMetricas ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </Button>
          <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Criativo
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[550px] sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>Novo Criativo</SheetTitle>
                <SheetDescription>
                  Cadastre um novo criativo no sistema
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="grid gap-4 py-6 px-2">
                  <div className="grid gap-2">
                    <Label htmlFor="offer">Oferta <span className="text-destructive">*</span></Label>
                    <Select value={newOferta} onValueChange={setNewOferta}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma oferta" />
                      </SelectTrigger>
                      <SelectContent>
                        {(ofertas || []).map((offer) => (
                          <SelectItem key={offer.id} value={offer.id}>{offer.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="id">ID Único <span className="text-destructive">*</span></Label>
                    <Input
                      id="id"
                      placeholder="Ex: ID01_OFERTA_WL1"
                      className={cn(
                        "font-mono",
                        newIdUnico === 'ID01_OFERTA_WL1' && "text-muted-foreground"
                      )}
                      value={newIdUnico}
                      onChange={(e) => setNewIdUnico(e.target.value)}
                      onFocus={(e) => {
                        if (newIdUnico === 'ID01_OFERTA_WL1') {
                          e.target.select();
                        }
                      }}
                    />
                    {newIdUnico === 'ID01_OFERTA_WL1' && (
                      <p className="text-xs text-muted-foreground">
                        Substitua pelo ID real do criativo
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="source">Fonte <span className="text-destructive">*</span></Label>
                      <Select value={newFonte} onValueChange={setNewFonte}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="copywriter">Copywriter <span className="text-destructive">*</span></Label>
                      <CreatableCombobox
                        options={copywritersOptions}
                        value={newCopywriter}
                        onChange={setNewCopywriter}
                        onCreateNew={handleCreateCopywriter}
                        placeholder="Selecione"
                        searchPlaceholder="Buscar copywriter..."
                        emptyText="Nenhum copywriter encontrado"
                        createText="Criar"
                        isLoading={isLoadingCopywriters}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao_validado">Não Validado</SelectItem>
                        <SelectItem value="em_teste">Em Teste</SelectItem>
                        <SelectItem value="liberado">Liberado</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="url">URL do Vídeo/Imagem <span className="text-destructive">*</span></Label>
                    <Input
                      id="url"
                      placeholder="https://..."
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="observations">Observações</Label>
                    <Textarea
                      id="observations"
                      placeholder="Anotações sobre o criativo..."
                      rows={3}
                      value={newObservacoes}
                      onChange={(e) => setNewObservacoes(e.target.value)}
                    />
                  </div>
                </div>
              </ScrollArea>
              <SheetFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateCriativo}
                  disabled={createCriativoMutation.isPending}
                >
                  {createCriativoMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Criar Criativo
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
              placeholder="Buscar por ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-zinc-950 border-border"
            />
          </div>
          <Select value={offerFilter} onValueChange={setOfferFilter}>
            <SelectTrigger className="w-[140px]">
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
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Fontes</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="liberado">Liberado</SelectItem>
              <SelectItem value="em_teste">Em Teste</SelectItem>
              <SelectItem value="nao_validado">Não Validado</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={copywriterFilter} onValueChange={setCopywriterFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Copywriter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Copys</SelectItem>
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

      {/* Criativos sem métricas no período */}
      {criativosSemMetricas.length > 0 && (
        <Card className="p-4 border-warning/50 bg-warning/5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-2 w-2 rounded-full bg-warning" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground mb-2">
                {criativosSemMetricas.length} criativo(s) sem métricas no período selecionado
              </h3>
              <div className="flex flex-wrap gap-2">
                {criativosSemMetricas.map((criativo) => (
                  <div
                    key={criativo.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => openEditDialog(criativo.id)}
                  >
                    <span
                      className="font-mono text-xs cursor-pointer hover:text-primary hover:underline transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(criativo.id_unico);
                      }}
                      title="Clique para copiar"
                    >
                      {criativo.id_unico}
                    </span>
                    <CreativeStatusBadge status={criativo.status || 'nao_validado'} />
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (criativo.oferta_id) {
                                navigate(`/ofertas/${criativo.oferta_id}`);
                              }
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver oferta e lançar métricas</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(criativo.id);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar criativo</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Esses criativos foram criados mas ainda não têm métricas lançadas. Clique para editar ou lance métricas para vê-los na tabela.
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
        /* Table - now shows one row per criativo + day */
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="date" className="text-center">Data</SortableHeader>
                <TableHead className="w-[60px] text-center">Thumb</TableHead>
                <TableHead className="text-center">ID</TableHead>
                <TableHead className="text-center">Oferta</TableHead>
                <TableHead className="text-center">Fonte</TableHead>
                <TableHead className="text-center">Copywriter</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMetricas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma metrica encontrada para o periodo selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                sortedMetricas.map((metrica) => {
                  if (!metrica.criativo) return null;
                  const thresholds = getOfferThresholds(metrica.criativo.oferta_id);

                  return (
                    <TableRow key={metrica.id}>
                      <TableCell className="text-center">
                        {formatDate(metrica.data)}
                      </TableCell>
                      <TableCell className="text-center">
                        <VideoThumbnail url={metrica.criativo.url} creativeId={metrica.criativo.id_unico} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className="font-mono text-sm cursor-pointer hover:text-primary hover:underline transition-colors"
                          onClick={() => copyToClipboard(metrica.criativo!.id_unico)}
                          title="Clique para copiar"
                        >
                          {metrica.criativo.id_unico}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{metrica.criativo.oferta?.nome || 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <FonteBadge fonte={metrica.criativo.fonte} />
                      </TableCell>
                      <TableCell className="text-center">{metrica.criativo.copy_responsavel || '-'}</TableCell>
                      <TableCell className="text-center">
                        <CreativeStatusBadge status={metrica.criativo.status || 'nao_validado'} />
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
                              <TooltipContent>Ver métricas</TooltipContent>
                            </Tooltip>
                            <PopoverContent className="w-[520px] p-0" align="end" side="left">
                              <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                                <span className="font-semibold text-sm">Métricas do Criativo</span>
                                <span className="text-xs text-muted-foreground">{formatDate(metrica.data)}</span>
                              </div>
                              <div className="p-3">
                                <div className="grid grid-cols-3 gap-x-6 gap-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">ROAS</span>
                                    <MetricBadge
                                      value={metrica.roas || 0}
                                      metricType="roas"
                                      thresholds={thresholds}
                                      format={formatRoas}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">IC</span>
                                    <MetricBadge
                                      value={metrica.ic || 0}
                                      metricType="ic"
                                      thresholds={thresholds}
                                      format={(v) => formatCurrency(v)}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">CPC</span>
                                    <MetricBadge
                                      value={metrica.cpc || 0}
                                      metricType="cpc"
                                      thresholds={thresholds}
                                      format={(v) => formatCurrency(v)}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Conversões</span>
                                    <span className="text-xs font-medium">{(metrica.conversoes || 0).toLocaleString('de-DE')}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Cliques</span>
                                    <span className="text-xs font-medium">{(metrica.cliques || 0).toLocaleString('de-DE')}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Impressões</span>
                                    <span className="text-xs font-medium">{(metrica.impressoes || 0).toLocaleString('de-DE')}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">CTR</span>
                                    <span className="text-xs font-medium">{((metrica.ctr || 0) * 100).toFixed(2)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">CPM</span>
                                    <span className="text-xs font-medium">{formatCurrency(metrica.cpm || 0)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Spend</span>
                                    <span className="text-xs font-medium">{formatCurrency(metrica.spend || 0)}</span>
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
                                onClick={() => openEditDialog(metrica.criativo!.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar criativo</TooltipContent>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editar Criativo</DialogTitle>
            <DialogDescription>
              Edite os campos necessários
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid gap-4 py-4 px-2">
              {/* Offer field */}
              <div className="grid gap-2">
                <Label>Oferta</Label>
                <Select value={editOffer} onValueChange={setEditOffer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma oferta" />
                  </SelectTrigger>
                  <SelectContent>
                    {(ofertas || []).map((offer) => (
                      <SelectItem key={offer.id} value={offer.id}>{offer.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ID field */}
              <div className="grid gap-2">
                <Label>ID Único</Label>
                <Input
                  value={editId}
                  onChange={(e) => setEditId(e.target.value)}
                  className="font-mono"
                />
              </div>

              {/* Source and Copywriter */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Fonte</Label>
                  <Select value={editSource} onValueChange={setEditSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Copywriter</Label>
                  <CreatableCombobox
                    options={copywritersOptions}
                    value={editCopywriter}
                    onChange={setEditCopywriter}
                    onCreateNew={handleCreateCopywriterEdit}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar copywriter..."
                    emptyText="Nenhum copywriter encontrado"
                    createText="Criar"
                    isLoading={isLoadingCopywriters}
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
                    <SelectItem value="nao_validado">Não Validado</SelectItem>
                    <SelectItem value="em_teste">Em Teste</SelectItem>
                    <SelectItem value="liberado">Liberado</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="arquivado">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* URL field */}
              <div className="grid gap-2">
                <Label>URL do Vídeo/Imagem</Label>
                <Input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* Observations field */}
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea
                  value={editObservations}
                  onChange={(e) => setEditObservations(e.target.value)}
                  placeholder="Anotações sobre o criativo..."
                  rows={3}
                />
              </div>

            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateCriativoMutation.isPending}
            >
              {updateCriativoMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label className="text-muted-foreground">ID do Criativo</Label>
              <Input value={editId} disabled className="bg-muted font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Oferta</Label>
                <Input value={getOfferNameById(editOffer)} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Fonte</Label>
                <Input value={fonteLabels[editSource] || editSource} disabled className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Copywriter</Label>
                <Input value={editCopywriter || '-'} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Status</Label>
                <div className="flex items-center h-10">
                  <CreativeStatusBadge status={editStatus} />
                </div>
              </div>
            </div>
            {editUrl && (
              <div className="grid gap-2">
                <Label className="text-muted-foreground">URL</Label>
                <Input value={editUrl} disabled className="bg-muted text-xs" />
              </div>
            )}
            {editObservations && (
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Observações</Label>
                <Textarea value={editObservations} disabled className="bg-muted" rows={2} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmEdit}
              disabled={updateCriativoMutation.isPending}
            >
              {updateCriativoMutation.isPending && (
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
