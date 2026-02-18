import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Search, ChevronLeft, Loader2, Check, AlertTriangle, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { useCriativosPorOferta, useUpsertMetricaDiaria, useMetricaExistente } from "@/hooks/useSupabase";
import type { Criativo, MetricaDiaria } from "@/services/api";

interface LancarMetricaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ofertaId: string;
  fonte?: string;
}

const STATUS_LABELS: Record<string, string> = {
  liberado: "Liberado",
  em_teste: "Em Teste",
  nao_validado: "Nao Validado",
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

const FONTE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  outro: "Outro",
};

type Step = 1 | 2 | 3 | "new_form" | "edit_existing" | 4;

interface FieldsToEdit {
  spend: boolean;
  faturado: boolean;
  impressoes: boolean;
  cliques: boolean;
  conversoes: boolean;
}

export function LancarMetricaDialog({
  open,
  onOpenChange,
  ofertaId,
  fonte: fonteProp,
}: LancarMetricaDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedCriativo, setSelectedCriativo] = useState<Criativo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fonteFilter, setFonteFilter] = useState<string>(fonteProp || "all");

  // Form fields
  const [data, setData] = useState<Date | undefined>(new Date());
  const [spend, setSpend] = useState("");
  const [faturado, setFaturado] = useState("");
  const [impressoes, setImpressoes] = useState("");
  const [cliques, setCliques] = useState("");
  const [conversoes, setConversoes] = useState("");

  // Existing metric state
  const [existingMetric, setExistingMetric] = useState<MetricaDiaria | null>(null);
  const [fieldsToEdit, setFieldsToEdit] = useState<FieldsToEdit>({
    spend: false,
    faturado: false,
    impressoes: false,
    cliques: false,
    conversoes: false,
  });

  const { data: criativos, isLoading: isLoadingCriativos } = useCriativosPorOferta(
    ofertaId,
    fonteProp || undefined
  );
  const upsertMetricaMutation = useUpsertMetricaDiaria();

  // Query for existing metric
  const dataFormatted = data ? format(data, "yyyy-MM-dd") : null;
  const { data: metricaExistente, isLoading: isCheckingMetric } = useMetricaExistente(
    selectedCriativo?.id || null,
    dataFormatted
  );

  // When metric check returns, update state
  useEffect(() => {
    if (step === 3 && metricaExistente) {
      setExistingMetric(metricaExistente);
    } else if (step === 3 && !metricaExistente && !isCheckingMetric) {
      setExistingMetric(null);
    }
  }, [metricaExistente, isCheckingMetric, step]);

  // Filter criativos
  const filteredCriativos = useMemo(() => {
    if (!criativos) return [];

    return criativos.filter((c) => {
      const matchesSearch = searchTerm === "" ||
        c.id_unico.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFonte = fonteFilter === "all" || c.fonte === fonteFilter;
      const notArchived = c.status !== "arquivado";
      return matchesSearch && matchesFonte && notArchived;
    });
  }, [criativos, searchTerm, fonteFilter]);

  const resetForm = () => {
    setStep(1);
    setSelectedCriativo(null);
    setSearchTerm("");
    setFonteFilter(fonteProp || "all");
    setData(new Date());
    setSpend("");
    setFaturado("");
    setImpressoes("");
    setCliques("");
    setConversoes("");
    setExistingMetric(null);
    setFieldsToEdit({
      spend: false,
      faturado: false,
      impressoes: false,
      cliques: false,
      conversoes: false,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSelectCriativo = (criativo: Criativo) => {
    setSelectedCriativo(criativo);
    setStep(2);
  };

  const handleConfirm = () => {
    setStep(3);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
      setExistingMetric(null);
    } else if (step === "new_form") {
      setStep(3);
    } else if (step === "edit_existing") {
      setStep(3);
    } else if (step === 4) {
      if (existingMetric) {
        setStep("edit_existing");
      } else {
        setStep("new_form");
      }
    }
  };

  const handleGoToEditExisting = () => {
    // Pre-fill fields with existing values
    if (existingMetric) {
      setSpend(existingMetric.spend?.toString() || "");
      setFaturado(existingMetric.faturado?.toString() || "");
      setImpressoes(existingMetric.impressoes?.toString() || "");
      setCliques(existingMetric.cliques?.toString() || "");
      setConversoes(existingMetric.conversoes?.toString() || "");
    }
    setStep("edit_existing");
  };

  const handleGoToConfirmation = () => {
    // Validate at least one field is selected for edit if in edit mode
    if (existingMetric) {
      const hasFieldSelected = Object.values(fieldsToEdit).some(v => v);
      if (!hasFieldSelected) {
        toast.error('Selecione pelo menos um campo para editar.');
        return;
      }

      // Check if any value actually changed
      const changes = getChangedValues();
      if (Object.keys(changes).length === 0) {
        toast.error('Nenhum valor foi alterado. Modifique pelo menos um campo.');
        return;
      }
    } else {
      // New metric - validate all required fields
      if (!data) {
        toast.error('O campo Data é obrigatório.');
        return;
      }
      if (!spend || spend.trim() === '') {
        toast.error('O campo Spend é obrigatório.');
        return;
      }
      if (!faturado || faturado.trim() === '') {
        toast.error('O campo Faturado é obrigatório.');
        return;
      }
      if (!impressoes || impressoes.trim() === '') {
        toast.error('O campo Impressões é obrigatório.');
        return;
      }
      if (!cliques || cliques.trim() === '') {
        toast.error('O campo Cliques é obrigatório.');
        return;
      }
      if (!conversoes || conversoes.trim() === '') {
        toast.error('O campo Conversões é obrigatório.');
        return;
      }
    }

    setStep(4);
  };

  const getChangedValues = () => {
    if (!existingMetric) return {};

    const changes: Record<string, { old: number; new: number }> = {};

    if (fieldsToEdit.spend) {
      const oldVal = existingMetric.spend || 0;
      const newVal = parseFloat(spend) || 0;
      if (oldVal !== newVal) {
        changes.spend = { old: oldVal, new: newVal };
      }
    }
    if (fieldsToEdit.faturado) {
      const oldVal = existingMetric.faturado || 0;
      const newVal = parseFloat(faturado) || 0;
      if (oldVal !== newVal) {
        changes.faturado = { old: oldVal, new: newVal };
      }
    }
    if (fieldsToEdit.impressoes) {
      const oldVal = existingMetric.impressoes || 0;
      const newVal = parseInt(impressoes) || 0;
      if (oldVal !== newVal) {
        changes.impressoes = { old: oldVal, new: newVal };
      }
    }
    if (fieldsToEdit.cliques) {
      const oldVal = existingMetric.cliques || 0;
      const newVal = parseInt(cliques) || 0;
      if (oldVal !== newVal) {
        changes.cliques = { old: oldVal, new: newVal };
      }
    }
    if (fieldsToEdit.conversoes) {
      const oldVal = existingMetric.conversoes || 0;
      const newVal = parseInt(conversoes) || 0;
      if (oldVal !== newVal) {
        changes.conversoes = { old: oldVal, new: newVal };
      }
    }

    return changes;
  };

  const handleSave = async () => {
    if (!selectedCriativo || !data) {
      toast.error('Criativo e data são obrigatórios.');
      return;
    }

    // If editing existing, check for changes
    if (existingMetric) {
      const changes = getChangedValues();
      if (Object.keys(changes).length === 0) {
        toast.error('Nenhum valor foi alterado. A operação foi cancelada.');
        return;
      }
    }

    // Build the metric data - for existing, merge with old values
    const metricData = existingMetric ? {
      criativo_id: selectedCriativo.id,
      data: format(data, "yyyy-MM-dd"),
      spend: fieldsToEdit.spend ? parseFloat(spend) : existingMetric.spend,
      faturado: fieldsToEdit.faturado ? parseFloat(faturado) : existingMetric.faturado,
      impressoes: fieldsToEdit.impressoes ? parseInt(impressoes) : existingMetric.impressoes,
      cliques: fieldsToEdit.cliques ? parseInt(cliques) : existingMetric.cliques,
      conversoes: fieldsToEdit.conversoes ? parseInt(conversoes) : existingMetric.conversoes,
      fonte_dados: "manual",
    } : {
      criativo_id: selectedCriativo.id,
      data: format(data, "yyyy-MM-dd"),
      spend: parseFloat(spend),
      faturado: parseFloat(faturado),
      impressoes: parseInt(impressoes),
      cliques: parseInt(cliques),
      conversoes: parseInt(conversoes),
      fonte_dados: "manual",
    };

    try {
      await upsertMetricaMutation.mutateAsync(metricData);

      toast.success(existingMetric
        ? 'Metricas atualizadas com sucesso!'
        : 'Metricas salvas com sucesso!'
      );

      handleOpenChange(false);
    } catch (error) {
      toast.error('Falha ao salvar métricas. Tente novamente.');
    }
  };

  const toggleFieldToEdit = (field: keyof FieldsToEdit) => {
    setFieldsToEdit(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Lancar Metricas - Selecionar Criativo"}
            {step === 2 && "Lancar Metricas - Confirmar Criativo"}
            {step === 3 && "Lancar Metricas - Selecionar Data"}
            {step === "new_form" && "Lancar Metricas - Preencher Valores"}
            {step === "edit_existing" && "Lancar Metricas - Editar Valores"}
            {step === 4 && "Lancar Metricas - Revisao Final"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Selecione o criativo para lancar as metricas diarias."}
            {step === 2 && "Confirme o criativo selecionado antes de continuar."}
            {step === 3 && "Selecione a data das metricas."}
            {step === "new_form" && "Preencha os valores das metricas. Todos os campos sao obrigatorios."}
            {step === "edit_existing" && "Selecione os campos que deseja editar e altere os valores."}
            {step === 4 && "Revise os dados antes de salvar."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Creative */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {!fonteProp && (
                <Select value={fonteFilter} onValueChange={setFonteFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <ScrollArea className="h-[300px] border rounded-md">
              {isLoadingCriativos ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCriativos.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum criativo encontrado.
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCriativos.map((criativo) => (
                    <button
                      key={criativo.id}
                      onClick={() => handleSelectCriativo(criativo)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{criativo.id_unico}</span>
                        <span className="text-xs text-muted-foreground">
                          {FONTE_LABELS[criativo.fonte] || criativo.fonte} - {criativo.copy_responsavel}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("whitespace-nowrap", STATUS_COLORS[criativo.status || "em_teste"])}
                      >
                        {STATUS_LABELS[criativo.status || "em_teste"]}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && selectedCriativo && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">ID Unico</Label>
                  <p
                    className="font-medium font-mono cursor-pointer hover:text-primary hover:underline transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedCriativo.id_unico);
                      toast.success('ID copiado!');
                    }}
                    title="Clique para copiar"
                  >
                    {selectedCriativo.id_unico}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fonte</Label>
                  <p className="font-medium">
                    {FONTE_LABELS[selectedCriativo.fonte] || selectedCriativo.fonte}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Copywriter</Label>
                  <p className="font-medium">{selectedCriativo.copy_responsavel}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge
                    variant="outline"
                    className={cn("mt-1 whitespace-nowrap", STATUS_COLORS[selectedCriativo.status || "em_teste"])}
                  >
                    {STATUS_LABELS[selectedCriativo.status || "em_teste"]}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button onClick={handleConfirm}>
                Confirmar
                <Check className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Select Date & Check for Existing */}
        {step === 3 && selectedCriativo && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Badge variant="outline" className={cn("whitespace-nowrap", STATUS_COLORS[selectedCriativo.status || "em_teste"])}>
                {FONTE_LABELS[selectedCriativo.fonte] || selectedCriativo.fonte}
              </Badge>
              <span
                className="font-medium font-mono cursor-pointer hover:text-primary hover:underline transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(selectedCriativo.id_unico);
                  toast.success('ID copiado!');
                }}
                title="Clique para copiar"
              >
                {selectedCriativo.id_unico}
              </span>
              <span className="text-muted-foreground text-sm">
                {selectedCriativo.copy_responsavel}
              </span>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !data && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? format(data, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data}
                    onSelect={setData}
                    initialFocus
                    className="pointer-events-auto"
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Loading state */}
            {isCheckingMetric && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Verificando metricas existentes...</span>
              </div>
            )}

            {/* Existing metric warning */}
            {existingMetric && !isCheckingMetric && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                  <p className="font-medium mb-2">Ja existem metricas para esta data!</p>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Spend:</span>{" "}
                      <span className="font-medium">R$ {(existingMetric.spend || 0).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Faturado:</span>{" "}
                      <span className="font-medium">R$ {(existingMetric.faturado || 0).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Impressoes:</span>{" "}
                      <span className="font-medium">{(existingMetric.impressoes || 0).toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cliques:</span>{" "}
                      <span className="font-medium">{(existingMetric.cliques || 0).toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conversoes:</span>{" "}
                      <span className="font-medium">{(existingMetric.conversoes || 0).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                {existingMetric ? (
                  <Button onClick={handleGoToEditExisting} disabled={isCheckingMetric}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar Valores
                  </Button>
                ) : (
                  <Button onClick={() => setStep("new_form")} disabled={!data || isCheckingMetric}>
                    Preencher Metricas
                    <Check className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step new_form: New Metrics Form (only for new metrics) */}
        {step === "new_form" && selectedCriativo && !existingMetric && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Badge variant="outline" className={cn("whitespace-nowrap", STATUS_COLORS[selectedCriativo.status || "em_teste"])}>
                {FONTE_LABELS[selectedCriativo.fonte] || selectedCriativo.fonte}
              </Badge>
              <span className="font-medium font-mono">{selectedCriativo.id_unico}</span>
              <span className="text-muted-foreground text-sm">
                {data && format(data, "dd/MM/yyyy")}
              </span>
            </div>

            {/* Metrics Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spend">Spend (R$) <span className="text-destructive">*</span></Label>
                <Input
                  id="spend"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={spend}
                  onChange={(e) => setSpend(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faturado">Faturado (R$) <span className="text-destructive">*</span></Label>
                <Input
                  id="faturado"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={faturado}
                  onChange={(e) => setFaturado(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="impressoes">Impressoes <span className="text-destructive">*</span></Label>
                <Input
                  id="impressoes"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={impressoes}
                  onChange={(e) => setImpressoes(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliques">Cliques <span className="text-destructive">*</span></Label>
                <Input
                  id="cliques"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={cliques}
                  onChange={(e) => setCliques(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="conversoes">Conversoes <span className="text-destructive">*</span></Label>
                <Input
                  id="conversoes"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={conversoes}
                  onChange={(e) => setConversoes(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleGoToConfirmation}>
                  Revisar
                  <Check className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step Edit Existing: Select fields to edit */}
        {step === "edit_existing" && selectedCriativo && existingMetric && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Badge variant="outline" className={cn("whitespace-nowrap", STATUS_COLORS[selectedCriativo.status || "em_teste"])}>
                {FONTE_LABELS[selectedCriativo.fonte] || selectedCriativo.fonte}
              </Badge>
              <span className="font-medium font-mono">{selectedCriativo.id_unico}</span>
              <span className="text-muted-foreground text-sm">
                {data && format(data, "dd/MM/yyyy")}
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              Selecione os campos que deseja editar e altere os valores:
            </p>

            {/* Editable Fields */}
            <div className="space-y-3">
              {/* Spend */}
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="edit-spend"
                  checked={fieldsToEdit.spend}
                  onCheckedChange={() => toggleFieldToEdit('spend')}
                />
                <div className="flex-1">
                  <Label htmlFor="edit-spend" className="text-sm font-medium cursor-pointer">
                    Spend (R$)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Atual: R$ {(existingMetric.spend || 0).toFixed(2)}
                  </p>
                </div>
                {fieldsToEdit.spend && (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={spend}
                    onChange={(e) => setSpend(e.target.value)}
                    className="w-32"
                  />
                )}
              </div>

              {/* Faturado */}
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="edit-faturado"
                  checked={fieldsToEdit.faturado}
                  onCheckedChange={() => toggleFieldToEdit('faturado')}
                />
                <div className="flex-1">
                  <Label htmlFor="edit-faturado" className="text-sm font-medium cursor-pointer">
                    Faturado (R$)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Atual: R$ {(existingMetric.faturado || 0).toFixed(2)}
                  </p>
                </div>
                {fieldsToEdit.faturado && (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={faturado}
                    onChange={(e) => setFaturado(e.target.value)}
                    className="w-32"
                  />
                )}
              </div>

              {/* Impressoes */}
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="edit-impressoes"
                  checked={fieldsToEdit.impressoes}
                  onCheckedChange={() => toggleFieldToEdit('impressoes')}
                />
                <div className="flex-1">
                  <Label htmlFor="edit-impressoes" className="text-sm font-medium cursor-pointer">
                    Impressoes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Atual: {(existingMetric.impressoes || 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                {fieldsToEdit.impressoes && (
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={impressoes}
                    onChange={(e) => setImpressoes(e.target.value)}
                    className="w-32"
                  />
                )}
              </div>

              {/* Cliques */}
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="edit-cliques"
                  checked={fieldsToEdit.cliques}
                  onCheckedChange={() => toggleFieldToEdit('cliques')}
                />
                <div className="flex-1">
                  <Label htmlFor="edit-cliques" className="text-sm font-medium cursor-pointer">
                    Cliques
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Atual: {(existingMetric.cliques || 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                {fieldsToEdit.cliques && (
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={cliques}
                    onChange={(e) => setCliques(e.target.value)}
                    className="w-32"
                  />
                )}
              </div>

              {/* Conversoes */}
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="edit-conversoes"
                  checked={fieldsToEdit.conversoes}
                  onCheckedChange={() => toggleFieldToEdit('conversoes')}
                />
                <div className="flex-1">
                  <Label htmlFor="edit-conversoes" className="text-sm font-medium cursor-pointer">
                    Conversoes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Atual: {(existingMetric.conversoes || 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                {fieldsToEdit.conversoes && (
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={conversoes}
                    onChange={(e) => setConversoes(e.target.value)}
                    className="w-32"
                  />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleGoToConfirmation}>
                  Revisar
                  <Check className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && selectedCriativo && data && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="text-center pb-2 border-b">
                <p className="text-sm text-muted-foreground">Criativo</p>
                <p
                  className="font-semibold font-mono cursor-pointer hover:text-primary hover:underline transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedCriativo.id_unico);
                    toast.success('ID copiado!');
                  }}
                  title="Clique para copiar"
                >
                  {selectedCriativo.id_unico}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {FONTE_LABELS[selectedCriativo.fonte] || selectedCriativo.fonte} - {selectedCriativo.copy_responsavel}
                </p>
              </div>

              <div className="text-center pb-2 border-b">
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-semibold">{format(data, "PPP", { locale: ptBR })}</p>
              </div>

              {/* Show changes for existing metric */}
              {existingMetric ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center">Alteracoes a serem aplicadas:</p>
                  {Object.entries(getChangedValues()).map(([field, { old, new: newVal }]) => (
                    <div key={field} className="flex items-center justify-between p-2 bg-background rounded border">
                      <span className="font-medium capitalize">{field}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through">
                          {field === 'spend' || field === 'faturado' ? `R$ ${old.toFixed(2)}` : old.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-primary font-medium">
                          {field === 'spend' || field === 'faturado' ? `R$ ${newVal.toFixed(2)}` : newVal.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Spend</p>
                      <p className="font-semibold text-lg">R$ {parseFloat(spend || '0').toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Faturado</p>
                      <p className="font-semibold text-lg">R$ {parseFloat(faturado || '0').toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Impressoes</p>
                      <p className="font-semibold">{parseInt(impressoes || '0').toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Cliques</p>
                      <p className="font-semibold">{parseInt(cliques || '0').toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="text-center col-span-2">
                      <p className="text-xs text-muted-foreground">Conversoes</p>
                      <p className="font-semibold">{parseInt(conversoes || '0').toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* Calculated Metrics Preview */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground text-center mb-2">Metricas Calculadas</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">ROAS</p>
                        <p className="font-medium">
                          {parseFloat(spend || '0') > 0
                            ? (parseFloat(faturado || '0') / parseFloat(spend || '1')).toFixed(2)
                            : '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CPC</p>
                        <p className="font-medium">
                          R$ {parseInt(cliques || '0') > 0
                            ? (parseFloat(spend || '0') / parseInt(cliques || '1')).toFixed(2)
                            : '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CTR</p>
                        <p className="font-medium">
                          {parseInt(impressoes || '0') > 0
                            ? ((parseInt(cliques || '0') / parseInt(impressoes || '1')) * 100).toFixed(2)
                            : '0.00'}%
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={upsertMetricaMutation.isPending}
                >
                  {upsertMetricaMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {existingMetric ? 'Confirmar Alteracoes' : 'Confirmar e Salvar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
