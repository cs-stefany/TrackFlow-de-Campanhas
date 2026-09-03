import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchCriativoByIdUnico, checkMetricaExiste } from '@/services/api';
import { useCreateMetricasBatch } from '@/hooks/useSupabase';
import type { Criativo, MetricaDiariaInsert } from '@/services/api';

interface BulkMetricasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ofertaId: string;
  ofertaNome: string;
}

interface ParsedRow {
  linha: number;
  id_criativo: string;
  data: string;
  spend: number;
  faturado: number;
  impressoes: number;
  cliques: number;
  conversoes: number;
  // Validação
  criativoDb?: Criativo | null;
  erro?: string;
  jaExiste?: boolean;
}

// Parser de data flexível (aceita YYYY-MM-DD ou DD/MM/YYYY)
function parseData(dataStr: string): string | null {
  if (!dataStr) return null;

  // Formato YYYY-MM-DD
  const isValidDate = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  const isoMatch = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    return isValidDate(year, month, day) ? dataStr : null;
  }

  // Formato DD/MM/YYYY
  const match = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    return isValidDate(year, month, day) ? `${match[3]}-${match[2]}-${match[1]}` : null;
  }

  return null;
}

// Parser de número (aceita vírgula ou ponto como decimal)
function parseNumero(valor: string): number | null {
  if (!valor || valor.trim() === '') return null;
  let normalizado = valor.replace(/[^\d,.-]/g, '').trim();
  if (normalizado.includes(',') && normalizado.includes('.')) {
    normalizado = normalizado.lastIndexOf(',') > normalizado.lastIndexOf('.')
      ? normalizado.replace(/\./g, '').replace(',', '.')
      : normalizado.replace(/,/g, '');
  } else if (normalizado.includes(',')) {
    normalizado = normalizado.replace(',', '.');
  }
  const num = parseFloat(normalizado);
  return Number.isFinite(num) ? num : null;
}

// Parser de inteiro
function parseInteiro(valor: string): number | null {
  if (!valor || valor.trim() === '') return null;
  const normalizado = valor.replace(/[^\d-]/g, '');
  const num = parseInt(normalizado, 10);
  return Number.isFinite(num) ? num : null;
}

function parseCSVLine(line: string, separator: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === separator && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

export function BulkMetricasDialog({
  open,
  onOpenChange,
  ofertaId,
  ofertaNome,
}: BulkMetricasDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const createBatchMutation = useCreateMetricasBatch();

  const resetState = () => {
    setParsedRows([]);
    setFileName(null);
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const parseCSV = useCallback(async (content: string) => {
    setIsProcessing(true);

    const lines = content.split(/\r?\n/).filter(line => line.trim());

    if (lines.length < 2) {
      toast.error('Arquivo CSV vazio ou sem dados.');
      setIsProcessing(false);
      return;
    }

    // Detectar separador (vírgula ou ponto-e-vírgula)
    const header = lines[0];
    const separator = header.includes(';') ? ';' : ',';

    // Mapear colunas do header
    const colunas = parseCSVLine(header.toLowerCase(), separator);
    const colIdx = {
      id_criativo: colunas.findIndex(c => c.includes('id_criativo') || c.includes('id') || c.includes('criativo')),
      data: colunas.findIndex(c => c === 'data' || c === 'date'),
      spend: colunas.findIndex(c => c === 'spend' || c === 'gasto' || c === 'custo'),
      faturado: colunas.findIndex(c => c === 'faturado' || c === 'faturamento' || c === 'receita' || c === 'revenue'),
      impressoes: colunas.findIndex(c => c.includes('impress')),
      cliques: colunas.findIndex(c => c.includes('clique') || c.includes('click')),
      conversoes: colunas.findIndex(c => c.includes('convers') || c.includes('vendas')),
    };

    // Verificar colunas obrigatórias
    const colunasObrigatorias = ['id_criativo', 'data', 'spend', 'faturado', 'impressoes', 'cliques', 'conversoes'];
    const colunasFaltando = colunasObrigatorias.filter(col => colIdx[col as keyof typeof colIdx] === -1);

    if (colunasFaltando.length > 0) {
      toast.error(`Colunas não encontradas: ${colunasFaltando.join(', ')}`);
      setIsProcessing(false);
      return;
    }

    // Processar linhas de dados
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const valores = parseCSVLine(lines[i], separator);

      if (valores.length < 7) continue; // Linha incompleta

      const row: ParsedRow = {
        linha: i + 1,
        id_criativo: valores[colIdx.id_criativo] || '',
        data: parseData(valores[colIdx.data]) || valores[colIdx.data],
        spend: parseNumero(valores[colIdx.spend]) || 0,
        faturado: parseNumero(valores[colIdx.faturado]) || 0,
        impressoes: parseInteiro(valores[colIdx.impressoes]) || 0,
        cliques: parseInteiro(valores[colIdx.cliques]) || 0,
        conversoes: parseInteiro(valores[colIdx.conversoes]) || 0,
      };

      // Validações básicas
      if (!row.id_criativo) {
        row.erro = 'ID do criativo vazio';
      } else if (!row.data || !/^\d{4}-\d{2}-\d{2}$/.test(row.data)) {
        row.erro = 'Data inválida (use YYYY-MM-DD ou DD/MM/YYYY)';
      } else if (row.spend < 0) {
        row.erro = 'Spend não pode ser negativo';
      } else if (row.faturado < 0) {
        row.erro = 'Faturado não pode ser negativo';
      }

      rows.push(row);
    }

    // Validar criativos no banco (em paralelo)
    await Promise.all(
      rows.map(async (row) => {
        if (row.erro) return;

        try {
          // Buscar criativo pelo id_unico
          const criativo = await fetchCriativoByIdUnico(row.id_criativo, ofertaId);

          if (!criativo) {
            row.erro = `Criativo não encontrado ou não pertence a esta oferta`;
          } else {
            row.criativoDb = criativo;

            // Verificar se já existe métrica para esta data
            const existe = await checkMetricaExiste(criativo.id, row.data);
            if (existe) {
              row.jaExiste = true;
              row.erro = 'Já existe métrica para esta data (será sobrescrita)';
            }
          }
        } catch (error) {
          row.erro = 'Erro ao validar criativo';
        }
      })
    );

    setParsedRows(rows);
    setIsProcessing(false);
  }, [ofertaId]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV.');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      parseCSV(content);
    };
    reader.onerror = () => {
      toast.error('Erro ao ler arquivo.');
    };
    reader.readAsText(file);
  }, [parseCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const removeRow = (linha: number) => {
    setParsedRows(prev => prev.filter(r => r.linha !== linha));
  };

  const validRows = parsedRows.filter(r => !r.erro || r.jaExiste);
  const errorRows = parsedRows.filter(r => r.erro && !r.jaExiste);
  const warningRows = parsedRows.filter(r => r.jaExiste);

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error('Nenhuma linha válida para importar.');
      return;
    }

    const metricas: MetricaDiariaInsert[] = validRows.map(row => ({
      criativo_id: row.criativoDb!.id,
      data: row.data,
      spend: row.spend,
      faturado: row.faturado,
      impressoes: row.impressoes,
      cliques: row.cliques,
      conversoes: row.conversoes,
      // Métricas calculadas
      roas: row.spend > 0 ? row.faturado / row.spend : 0,
      ic: row.conversoes > 0 ? row.spend / row.conversoes : 0,
      cpc: row.cliques > 0 ? row.spend / row.cliques : 0,
      ctr: row.impressoes > 0 ? row.cliques / row.impressoes : 0,
      cpm: row.impressoes > 0 ? (row.spend / row.impressoes) * 1000 : 0,
    }));

    try {
      await createBatchMutation.mutateAsync(metricas);
      toast.success(`${metricas.length} métrica(s) importada(s) com sucesso!`);
      handleClose();
    } catch (error) {
      toast.error('Erro ao importar métricas. Tente novamente.');
    }
  };

  const downloadTemplate = () => {
    const template = `id_criativo,data,spend,faturado,impressoes,cliques,conversoes
CR_EXEMPLO_01,2026-02-05,150.50,450.00,10000,250,15
CR_EXEMPLO_02,2026-02-05,200.00,600.00,15000,300,20`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_metricas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Métricas via CSV
          </DialogTitle>
          <DialogDescription>
            Importe métricas de múltiplos criativos da oferta "{ofertaNome}" de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {parsedRows.length === 0 ? (
          // Upload Area
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                "hover:border-primary/50 cursor-pointer"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">
                    Arraste o arquivo CSV aqui
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    ou clique para selecionar
                  </p>
                  <input
                    id="csv-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleInputChange}
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <p className="font-medium">Formato esperado:</p>
                <p className="text-muted-foreground text-xs">
                  id_criativo, data, spend, faturado, impressoes, cliques, conversoes
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
            </div>
          </div>
        ) : (
          // Preview Area
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {validRows.length - warningRows.length} válidas
                </span>
                {warningRows.length > 0 && (
                  <span className="flex items-center gap-1 text-warning">
                    <AlertCircle className="h-4 w-4" />
                    {warningRows.length} sobrescrever
                  </span>
                )}
                {errorRows.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errorRows.length} com erro
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={resetState}>
                Trocar arquivo
              </Button>
            </div>

            {/* Results preview */}
            <div className="h-[350px] overflow-y-auto rounded-md border">
              <div className="grid gap-2 p-2 sm:hidden">
                {parsedRows.map((row) => (
                  <div
                    key={row.linha}
                    className={cn(
                      'rounded-lg border p-3 text-sm',
                      row.erro && !row.jaExiste && 'border-destructive/30 bg-destructive/10',
                      row.jaExiste && 'border-warning/30 bg-warning/10',
                      !row.erro && 'border-success/20 bg-success/5'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-semibold">{row.id_criativo}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Linha {row.linha} · {row.data}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeRow(row.linha)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5 text-xs">
                      <span className="text-muted-foreground">Spend</span><span className="text-right font-medium">{row.spend.toFixed(2)}</span>
                      <span className="text-muted-foreground">Faturado</span><span className="text-right font-medium">{row.faturado.toFixed(2)}</span>
                      <span className="text-muted-foreground">Impressões</span><span className="text-right font-medium">{row.impressoes}</span>
                      <span className="text-muted-foreground">Cliques / Conversões</span><span className="text-right font-medium">{row.cliques} / {row.conversoes}</span>
                    </div>
                    <div className="mt-2 border-t pt-2 text-xs">
                      {row.erro ? (
                        <span className={row.jaExiste ? 'text-warning' : 'text-destructive'}>{row.erro}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Pronta para importar</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <table className="hidden min-w-[860px] text-sm sm:table">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left font-medium">Linha</th>
                    <th className="p-2 text-left font-medium">ID Criativo</th>
                    <th className="p-2 text-left font-medium">Data</th>
                    <th className="p-2 text-right font-medium">Spend</th>
                    <th className="p-2 text-right font-medium">Faturado</th>
                    <th className="p-2 text-right font-medium">Impr.</th>
                    <th className="p-2 text-right font-medium">Cliques</th>
                    <th className="p-2 text-right font-medium">Conv.</th>
                    <th className="p-2 text-center font-medium">Status</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.linha}
                      className={cn(
                        "border-b",
                        row.erro && !row.jaExiste && "bg-destructive/10",
                        row.jaExiste && "bg-warning/10",
                        !row.erro && "bg-success/5"
                      )}
                    >
                      <td className="p-2 text-muted-foreground">{row.linha}</td>
                      <td className="p-2 font-mono text-xs">{row.id_criativo}</td>
                      <td className="p-2">{row.data}</td>
                      <td className="p-2 text-right">{row.spend.toFixed(2)}</td>
                      <td className="p-2 text-right">{row.faturado.toFixed(2)}</td>
                      <td className="p-2 text-right">{row.impressoes}</td>
                      <td className="p-2 text-right">{row.cliques}</td>
                      <td className="p-2 text-right">{row.conversoes}</td>
                      <td className="p-2 text-center">
                        {row.erro ? (
                          <span className={cn(
                            "text-xs",
                            row.jaExiste ? "text-warning" : "text-destructive"
                          )}>
                            {row.erro}
                          </span>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                        )}
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeRow(row.linha)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {parsedRows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || createBatchMutation.isPending}
            >
              {createBatchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {validRows.length} Métrica(s)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
