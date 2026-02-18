import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  // Ofertas
  fetchOfertas,
  fetchOfertaById,
  createOferta,
  updateOferta,
  archiveOferta,
  restoreOferta,
  deleteOferta,
  countCriativosArquivadosComOferta,
  // Criativos
  fetchCriativos,
  fetchCriativosComMedias,
  fetchCriativoById,
  createCriativo,
  updateCriativo,
  archiveCriativo,
  restoreCriativo,
  deleteCriativo,
  // Métricas
  fetchMetricasDiarias,
  fetchMetricasDiariasOferta,
  fetchMetricasDiariasOfertaComJoin,
  createMetricaDiaria,
  createMetricasBatch,
  upsertMetricaDiaria,
  fetchMetricaExistente,
  fetchCriativoByIdUnico,
  checkMetricaExiste,
  getDateRange,
  // Thresholds Histórico
  fetchThresholdVigente,
  fetchThresholdsVigentesBatch,
  fetchThresholdsHistorico,
  // Dados dinâmicos
  fetchNichos,
  fetchCopywriters,
  fetchPaises,
  createNicho,
  createCopywriter,
  createPais,
  // Types
  type OfertaInsert,
  type OfertaUpdate,
  type CriativoInsert,
  type CriativoUpdate,
  type MetricaDiariaInsert,
  type MetricaDiariaOfertaComJoin,
  type MetricaDiaria,
  type Thresholds,
  type ThresholdHistorico,
} from '@/services/api';

// ==================== QUERY KEYS ====================

export const queryKeys = {
  ofertas: {
    all: ['ofertas'] as const,
    list: (status?: string) => ['ofertas', 'list', status] as const,
    detail: (id: string) => ['ofertas', 'detail', id] as const,
    ativas: () => ['ofertas', 'list', 'ativo'] as const,
    arquivadas: () => ['ofertas', 'list', 'arquivado'] as const,
  },
  criativos: {
    all: ['criativos'] as const,
    list: (filters?: Record<string, string>) => ['criativos', 'list', filters] as const,
    byOferta: (ofertaId: string, fonte?: string) => ['criativos', 'byOferta', ofertaId, fonte] as const,
    comMedias: (filters?: Record<string, string>) => ['criativos', 'comMedias', filters] as const,
    arquivados: () => ['criativos', 'list', { status: 'arquivado' }] as const,
    detail: (id: string) => ['criativos', 'detail', id] as const,
  },
  metricas: {
    byCriativo: (criativoId: string, periodo?: string) => ['metricas', 'criativo', criativoId, periodo] as const,
    byOferta: (ofertaId: string, periodo?: string) => ['metricas', 'oferta', ofertaId, periodo] as const,
    diariasComOferta: (filters?: Record<string, string>) => ['metricas', 'diariasComOferta', filters] as const,
    diariasComCriativo: (filters?: any) => ['metricas', 'diarias', 'comCriativo', filters] as const,
    aggregatedByOferta: (ofertaId: string) => ['metricas', 'aggregated', ofertaId] as const,
    allAggregated: () => ['metricas', 'allAggregated'] as const,
    totais: () => ['metricas', 'totais'] as const,
    contadorCriativos: () => ['metricas', 'contadorCriativos'] as const,
  },
  thresholds: {
    all: ['thresholds'] as const,
    vigente: (ofertaId: string, data: string) => ['thresholds', 'vigente', ofertaId, data] as const,
    vigenteBatch: (ofertaIds: string[], data: string) => ['thresholds', 'vigenteBatch', ofertaIds.join(','), data] as const,
    historico: (ofertaId: string) => ['thresholds', 'historico', ofertaId] as const,
  },
  nichos: ['nichos'] as const,
  copywriters: ['copywriters'] as const,
  paises: ['paises'] as const,
};

// ==================== OFERTAS ====================

export function useOfertas(status?: string) {
  return useQuery({
    queryKey: queryKeys.ofertas.list(status),
    queryFn: () => fetchOfertas(status),
  });
}

export function useOfertasAtivas() {
  return useQuery({
    queryKey: queryKeys.ofertas.ativas(),
    queryFn: () => fetchOfertas('ativo'),
  });
}

export function useOfertasArquivadas() {
  return useQuery({
    queryKey: queryKeys.ofertas.arquivadas(),
    queryFn: () => fetchOfertas('arquivado'),
  });
}

export function useOferta(id: string) {
  return useQuery({
    queryKey: queryKeys.ofertas.detail(id),
    queryFn: () => fetchOfertaById(id),
    enabled: !!id,
  });
}

export function useCreateOferta() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (oferta: OfertaInsert) => createOferta(oferta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ofertas.all });
    },
  });
}

export function useUpdateOferta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: OfertaUpdate }) =>
      updateOferta(id, updates),
    onSuccess: (_, { id, updates }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ofertas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.ofertas.detail(id) });
      // Se thresholds foram atualizados, invalidar cache de thresholds
      if (updates.thresholds) {
        queryClient.invalidateQueries({ queryKey: queryKeys.thresholds.all });
      }
    },
  });
}

export function useArchiveOferta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveOferta(id),
    onSuccess: () => {
      // Invalidar ofertas E criativos, pois ambos foram afetados
      queryClient.invalidateQueries({ queryKey: queryKeys.ofertas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.criativos.all });
    },
  });
}

export function useRestoreOferta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, criativoIdsToRestore }: { id: string; criativoIdsToRestore: string[] }) =>
      restoreOferta(id, criativoIdsToRestore),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ofertas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.criativos.all });
    },
  });
}

// Hook para contar criativos arquivados junto com a oferta
export function useCountCriativosArquivadosComOferta(ofertaId: string) {
  return useQuery({
    queryKey: ['criativos', 'countArquivadosComOferta', ofertaId],
    queryFn: () => countCriativosArquivadosComOferta(ofertaId),
    enabled: !!ofertaId,
  });
}

export function useDeleteOferta() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteOferta(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ofertas.all });
    },
  });
}

// ==================== CRIATIVOS ====================

export function useCriativos(filters?: {
  ofertaId?: string;
  status?: string;
  fonte?: string;
  copyResponsavel?: string;
}) {
  return useQuery({
    queryKey: queryKeys.criativos.list(filters as Record<string, string>),
    queryFn: () => fetchCriativos(filters),
  });
}

export function useCriativosPorOferta(ofertaId: string, fonte?: string) {
  return useQuery({
    queryKey: queryKeys.criativos.byOferta(ofertaId, fonte),
    queryFn: () => fetchCriativos({ 
      ofertaId, 
      fonte: fonte && fonte !== 'all' ? fonte : undefined 
    }),
    enabled: !!ofertaId,
  });
}

export function useCriativosComMedias(filters?: {
  ofertaId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: queryKeys.criativos.comMedias(filters as Record<string, string>),
    queryFn: () => fetchCriativosComMedias(filters),
  });
}

export function useCriativosArquivados() {
  return useQuery({
    queryKey: queryKeys.criativos.arquivados(),
    queryFn: () => fetchCriativos({ status: 'arquivado' }),
  });
}

export function useCriativo(id: string) {
  return useQuery({
    queryKey: queryKeys.criativos.detail(id),
    queryFn: () => fetchCriativoById(id),
    enabled: !!id,
  });
}

export function useCreateCriativo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (criativo: CriativoInsert) => createCriativo(criativo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.criativos.all });
      if (data.oferta_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.criativos.byOferta(data.oferta_id) 
        });
      }
    },
  });
}

export function useUpdateCriativo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CriativoUpdate }) => 
      updateCriativo(id, updates),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.criativos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.criativos.detail(id) });
      if (data.oferta_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.criativos.byOferta(data.oferta_id) 
        });
      }
    },
  });
}

export function useArchiveCriativo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => archiveCriativo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.criativos.all });
    },
  });
}

export function useRestoreCriativo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => restoreCriativo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.criativos.all });
    },
  });
}

export function useDeleteCriativo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteCriativo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.criativos.all });
    },
  });
}

// ==================== MÉTRICAS ====================

export function useMetricasCriativo(criativoId: string, periodo?: string) {
  const dateRange = periodo ? getDateRange(periodo) : undefined;

  return useQuery({
    queryKey: queryKeys.metricas.byCriativo(criativoId, periodo),
    queryFn: () => fetchMetricasDiarias({
      criativoId,
      dataInicio: dateRange?.dataInicio,
      dataFim: dateRange?.dataFim,
    }),
    enabled: !!criativoId,
  });
}

// Tipo para métricas agregadas por criativo
export interface CriativoAggregatedMetrics {
  criativoId: string;
  spend: number;
  faturado: number;
  roas: number;
  ic: number;
  cpc: number;
}

// Hook para buscar métricas agregadas de todos os criativos
export function useAllCriativosAggregatedMetrics() {
  return useQuery({
    queryKey: ['metricas', 'allCriativosAggregated'],
    queryFn: async () => {
      // Buscar todas as métricas de todos os criativos
      const allMetrics = await fetchMetricasDiarias({});

      // Agrupar por criativo_id
      const metricsByCriativo = new Map<string, typeof allMetrics>();

      allMetrics.forEach((m) => {
        if (!m.criativo_id) return;
        const existing = metricsByCriativo.get(m.criativo_id) || [];
        existing.push(m);
        metricsByCriativo.set(m.criativo_id, existing);
      });

      // Calcular agregados para cada criativo
      const aggregated = new Map<string, CriativoAggregatedMetrics>();

      metricsByCriativo.forEach((metricas, criativoId) => {
        const spend = metricas.reduce((acc, m) => acc + (m.spend || 0), 0);
        const faturado = metricas.reduce((acc, m) => acc + (m.faturado || 0), 0);
        const roas = spend > 0 ? faturado / spend : 0;

        // Média de IC e CPC
        const metricasComIC = metricas.filter(m => m.ic !== null && m.ic !== undefined);
        const ic = metricasComIC.length > 0
          ? metricasComIC.reduce((acc, m) => acc + (m.ic || 0), 0) / metricasComIC.length
          : 0;

        const metricasComCPC = metricas.filter(m => m.cpc !== null && m.cpc !== undefined);
        const cpc = metricasComCPC.length > 0
          ? metricasComCPC.reduce((acc, m) => acc + (m.cpc || 0), 0) / metricasComCPC.length
          : 0;

        aggregated.set(criativoId, {
          criativoId,
          spend,
          faturado,
          roas,
          ic,
          cpc,
        });
      });

      return aggregated;
    },
  });
}

export function useMetricasOferta(ofertaId: string, periodo?: string) {
  const dateRange = periodo ? getDateRange(periodo) : undefined;
  
  return useQuery({
    queryKey: queryKeys.metricas.byOferta(ofertaId, periodo),
    queryFn: () => fetchMetricasDiariasOferta({
      ofertaId,
      dataInicio: dateRange?.dataInicio,
      dataFim: dateRange?.dataFim,
    }),
    enabled: !!ofertaId,
  });
}

// Hook para buscar métricas diárias com dados da oferta (JOIN)
export function useMetricasDiariasComOferta(filters?: {
  dataInicio?: string;
  dataFim?: string;
  statusOferta?: string;
}) {
  return useQuery({
    queryKey: queryKeys.metricas.diariasComOferta(filters as Record<string, string>),
    queryFn: () => fetchMetricasDiariasOfertaComJoin(filters),
  });
}

// Tipo para métricas diárias com dados do criativo
export interface MetricaDiariaComCriativo {
  id: string;
  data: string;
  spend: number | null;
  faturado: number | null;
  roas: number | null;
  ic: number | null;
  cpc: number | null;
  cliques: number | null;
  impressoes: number | null;
  conversoes: number | null;
  ctr: number | null;
  cpm: number | null;
  criativo: {
    id: string;
    id_unico: string;
    oferta_id: string | null;
    fonte: string;
    copy_responsavel: string;
    status: string | null;
    url: string | null;
    oferta: {
      id: string;
      nome: string;
      thresholds: any;
    } | null;
  } | null;
}

// Hook para buscar métricas diárias com dados do criativo (JOIN)
export function useMetricasDiariasComCriativo(filters?: {
  dataInicio?: string;
  dataFim?: string;
  ofertaId?: string;
  fonte?: string;
  copywriter?: string;
}) {
  return useQuery({
    queryKey: queryKeys.metricas.diariasComCriativo(filters),
    queryFn: async (): Promise<MetricaDiariaComCriativo[]> => {
      let query = supabase
        .from('metricas_diarias')
        .select(`
          *,
          criativo:criativos(
            id,
            id_unico,
            oferta_id,
            fonte,
            copy_responsavel,
            status,
            url,
            oferta:ofertas(id, nome, thresholds)
          )
        `)
        .order('data', { ascending: false });

      if (filters?.dataInicio) {
        query = query.gte('data', filters.dataInicio);
      }
      if (filters?.dataFim) {
        query = query.lte('data', filters.dataFim);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MetricaDiariaComCriativo[];
    },
  });
}

export function useCreateMetricaDiaria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metrica: MetricaDiariaInsert) => createMetricaDiaria(metrica),
    onSuccess: (data) => {
      // Invalida todas as queries de métricas (criativos e ofertas)
      queryClient.invalidateQueries({ queryKey: ['metricas'] });
      // Invalida especificamente métricas de ofertas (trigger popula metricas_diarias_oferta)
      queryClient.invalidateQueries({ queryKey: ['metricas', 'diariasComOferta'] });
      queryClient.invalidateQueries({ queryKey: ['metricas', 'totais'] });
      if (data.criativo_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.metricas.byCriativo(data.criativo_id)
        });
      }
    },
  });
}

export function useCreateMetricasBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metricas: MetricaDiariaInsert[]) => createMetricasBatch(metricas),
    onSuccess: () => {
      // Invalida todas as queries de métricas
      queryClient.invalidateQueries({ queryKey: ['metricas'] });
      queryClient.invalidateQueries({ queryKey: ['metricas', 'diariasComOferta'] });
      queryClient.invalidateQueries({ queryKey: ['metricas', 'totais'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.criativos.all });
    },
  });
}

export function useUpsertMetricaDiaria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metrica: MetricaDiariaInsert) => upsertMetricaDiaria(metrica),
    onSuccess: (data) => {
      // Invalida todas as queries de métricas (criativos e ofertas)
      queryClient.invalidateQueries({ queryKey: ['metricas'] });
      // Invalida especificamente métricas de ofertas (trigger popula metricas_diarias_oferta)
      queryClient.invalidateQueries({ queryKey: ['metricas', 'diariasComOferta'] });
      queryClient.invalidateQueries({ queryKey: ['metricas', 'totais'] });
      if (data.criativo_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.metricas.byCriativo(data.criativo_id)
        });
      }
    },
  });
}

// Hook para verificar se já existe métrica para criativo + data
export function useMetricaExistente(criativoId: string | null, data: string | null) {
  return useQuery({
    queryKey: ['metricas', 'existente', criativoId, data],
    queryFn: () => fetchMetricaExistente(criativoId!, data!),
    enabled: !!criativoId && !!data,
  });
}

export function useTotaisOfertas() {
  return useQuery({
    queryKey: queryKeys.metricas.totais(),
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const seteDias = new Date();
      seteDias.setDate(seteDias.getDate() - 6);
      const seteDiasStr = seteDias.toISOString().split('T')[0];
      
      // Fetch all metrics for calculation
      const [metricasHoje, metricas7d, metricasTotal] = await Promise.all([
        fetchMetricasDiariasOferta({ dataInicio: hoje, dataFim: hoje }),
        fetchMetricasDiariasOferta({ dataInicio: seteDiasStr, dataFim: hoje }),
        fetchMetricasDiariasOferta({}),
      ]);
      
      const sumMetrics = (metricas: typeof metricasTotal) => {
        const spend = metricas.reduce((acc, m) => acc + (m.spend || 0), 0);
        const faturado = metricas.reduce((acc, m) => acc + (m.faturado || 0), 0);
        const roas = spend > 0 ? faturado / spend : 0;
        return { spend, faturado, roas };
      };
      
      return {
        hoje: sumMetrics(metricasHoje),
        seteDias: sumMetrics(metricas7d),
        total: sumMetrics(metricasTotal),
      };
    },
  });
}

export function useContadorCriativos() {
  return useQuery({
    queryKey: queryKeys.metricas.contadorCriativos(),
    queryFn: async () => {
      const criativos = await fetchCriativos();
      
      const contador = {
        total: criativos.length,
        liberado: 0,
        em_teste: 0,
        nao_validado: 0,
        pausado: 0,
        arquivado: 0,
      };
      
      criativos.forEach((c) => {
        const status = c.status as keyof typeof contador;
        if (status in contador) {
          contador[status]++;
        }
      });
      
      // For backwards compatibility
      const active = contador.liberado;
      const testing = contador.em_teste;
      
      return {
        ...contador,
        active,
        testing,
      };
    },
  });
}

// Tipo para métricas agregadas por oferta
export interface OfferAggregatedMetrics {
  ofertaId: string;
  spendTotal: number;
  spendToday: number;
  spend7d: number;
  faturadoTotal: number;
  faturadoToday: number;
  faturado7d: number;
  roasTotal: number;
  roasToday: number;
  roas7d: number;
}

// Hook para buscar métricas agregadas de TODAS as ofertas (para Dashboard)
export function useAllOffersAggregatedMetrics() {
  return useQuery({
    queryKey: queryKeys.metricas.allAggregated(),
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const seteDias = new Date();
      seteDias.setDate(seteDias.getDate() - 6);
      const seteDiasStr = seteDias.toISOString().split('T')[0];
      
      // Fetch all metrics
      const allMetrics = await fetchMetricasDiariasOferta({});
      
      // Agrupar por oferta_id
      const metricsByOffer = new Map<string, typeof allMetrics>();
      
      allMetrics.forEach((m) => {
        if (!m.oferta_id) return;
        const existing = metricsByOffer.get(m.oferta_id) || [];
        existing.push(m);
        metricsByOffer.set(m.oferta_id, existing);
      });
      
      // Calcular agregados para cada oferta
      const aggregated = new Map<string, OfferAggregatedMetrics>();
      
      metricsByOffer.forEach((metricas, ofertaId) => {
        // Total
        const spendTotal = metricas.reduce((acc, m) => acc + (m.spend || 0), 0);
        const faturadoTotal = metricas.reduce((acc, m) => acc + (m.faturado || 0), 0);
        const roasTotal = spendTotal > 0 ? faturadoTotal / spendTotal : 0;
        
        // Hoje
        const metricasHoje = metricas.filter((m) => m.data === hoje);
        const spendToday = metricasHoje.reduce((acc, m) => acc + (m.spend || 0), 0);
        const faturadoToday = metricasHoje.reduce((acc, m) => acc + (m.faturado || 0), 0);
        const roasToday = spendToday > 0 ? faturadoToday / spendToday : 0;
        
        // 7 dias
        const metricas7d = metricas.filter((m) => m.data >= seteDiasStr && m.data <= hoje);
        const spend7d = metricas7d.reduce((acc, m) => acc + (m.spend || 0), 0);
        const faturado7d = metricas7d.reduce((acc, m) => acc + (m.faturado || 0), 0);
        const roas7d = spend7d > 0 ? faturado7d / spend7d : 0;
        
        aggregated.set(ofertaId, {
          ofertaId,
          spendTotal,
          spendToday,
          spend7d,
          faturadoTotal,
          faturadoToday,
          faturado7d,
          roasTotal,
          roasToday,
          roas7d,
        });
      });
      
      return aggregated;
    },
  });
}

// Hook para buscar contagem de criativos por oferta
export function useCreativesCountByOffer() {
  return useQuery({
    queryKey: ['criativos', 'countByOffer'],
    queryFn: async () => {
      const criativos = await fetchCriativos();

      const countByOffer = new Map<string, { liberado: number; em_teste: number; nao_validado: number; arquivado: number }>();

      criativos.forEach((c) => {
        if (!c.oferta_id) return;

        const existing = countByOffer.get(c.oferta_id) || { liberado: 0, em_teste: 0, nao_validado: 0, arquivado: 0 };

        if (c.status === 'liberado') existing.liberado++;
        else if (c.status === 'em_teste') existing.em_teste++;
        else if (c.status === 'nao_validado') existing.nao_validado++;
        else if (c.status === 'arquivado') existing.arquivado++;

        countByOffer.set(c.oferta_id, existing);
      });

      return countByOffer;
    },
  });
}

// ==================== THRESHOLDS HISTÓRICO ====================

/**
 * Hook para buscar threshold vigente para uma oferta em uma data específica
 */
export function useThresholdVigente(ofertaId: string | null, data: string | null) {
  return useQuery({
    queryKey: queryKeys.thresholds.vigente(ofertaId || '', data || ''),
    queryFn: () => fetchThresholdVigente(ofertaId!, data!),
    enabled: !!ofertaId && !!data,
  });
}

/**
 * Hook para buscar thresholds vigentes para múltiplas ofertas em uma data
 * Útil para listas de métricas onde cada uma pode ser de uma oferta diferente
 */
export function useThresholdsVigentesBatch(ofertaIds: string[], data: string | null) {
  return useQuery({
    queryKey: queryKeys.thresholds.vigenteBatch(ofertaIds, data || ''),
    queryFn: () => fetchThresholdsVigentesBatch(ofertaIds, data!),
    enabled: ofertaIds.length > 0 && !!data,
  });
}

/**
 * Hook para buscar histórico completo de thresholds de uma oferta
 */
export function useThresholdsHistorico(ofertaId: string | null) {
  return useQuery({
    queryKey: queryKeys.thresholds.historico(ofertaId || ''),
    queryFn: () => fetchThresholdsHistorico(ofertaId!),
    enabled: !!ofertaId,
  });
}

// Re-export types para uso nos componentes
export type { Thresholds, ThresholdHistorico };

// ==================== NICHOS ====================

export function useNichos() {
  return useQuery({
    queryKey: queryKeys.nichos,
    queryFn: fetchNichos,
  });
}

export function useCreateNicho() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nome: string) => createNicho(nome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nichos });
    },
  });
}

// ==================== COPYWRITERS ====================

export function useCopywriters() {
  return useQuery({
    queryKey: queryKeys.copywriters,
    queryFn: fetchCopywriters,
  });
}

export function useCreateCopywriter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nome: string) => createCopywriter(nome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.copywriters });
    },
  });
}

// ==================== PAÍSES ====================

export function usePaises() {
  return useQuery({
    queryKey: queryKeys.paises,
    queryFn: fetchPaises,
  });
}

export function useCreatePais() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ nome, codigo }: { nome: string; codigo?: string }) => 
      createPais(nome, codigo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paises });
    },
  });
}
