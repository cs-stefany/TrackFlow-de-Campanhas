import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Re-export types for convenience
export type Oferta = Tables<'ofertas'>;
export type Criativo = Tables<'criativos'>;
export type MetricaDiaria = Tables<'metricas_diarias'>;
export type MetricaDiariaOferta = Tables<'metricas_diarias_oferta'>;
export type CriativoComMedias = Tables<'criativos_com_medias'>;
export type Nicho = Tables<'nichos'>;
export type Copywriter = Tables<'copywriters'>;
export type Pais = Tables<'paises'>;

export type OfertaInsert = TablesInsert<'ofertas'>;
export type OfertaUpdate = TablesUpdate<'ofertas'>;
export type CriativoInsert = TablesInsert<'criativos'>;
export type CriativoUpdate = TablesUpdate<'criativos'>;
export type MetricaDiariaInsert = TablesInsert<'metricas_diarias'>;
export type MetricaDiariaUpdate = TablesUpdate<'metricas_diarias'>;

// Thresholds type
export interface Thresholds {
  roas: { verde: number; amarelo: number };
  ic: { verde: number; amarelo: number };
  cpc: { verde: number; amarelo: number };
}

// Histórico de thresholds type
export interface ThresholdHistorico {
  id: string;
  oferta_id: string;
  thresholds: Thresholds;
  data_inicio: string;
  created_at: string;
}

// ==================== OFERTAS ====================

export async function fetchOfertas(status?: string) {
  let query = supabase.from('ofertas').select('*').order('created_at', { ascending: false });
  
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchOfertaById(id: string) {
  const { data, error } = await supabase
    .from('ofertas')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createOferta(oferta: OfertaInsert) {
  const { data, error } = await supabase
    .from('ofertas')
    .insert(oferta)
    .select()
    .single();

  if (error) throw error;

  // Inserir threshold inicial no histórico
  if (data && oferta.thresholds) {
    await insertThresholdHistorico(data.id, oferta.thresholds as Thresholds);
  }

  return data;
}

export async function updateOferta(id: string, updates: OfertaUpdate) {
  // Se estiver atualizando thresholds, inserir no histórico
  if (updates.thresholds) {
    await insertThresholdHistorico(id, updates.thresholds as Thresholds);
  }

  const { data, error } = await supabase
    .from('ofertas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOferta(id: string) {
  const { error } = await supabase
    .from('ofertas')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function archiveOferta(id: string) {
  const archivedTimestamp = new Date().toISOString();

  // 1. Arquivar todos os criativos vinculados a esta oferta (que não estão já arquivados)
  const { error: criativosError } = await supabase
    .from('criativos')
    .update({
      status: 'arquivado',
      archived_at: archivedTimestamp  // Mesma timestamp da oferta para identificar arquivamento conjunto
    })
    .eq('oferta_id', id)
    .neq('status', 'arquivado');  // Não sobrescreve criativos já arquivados manualmente

  if (criativosError) {
    console.error('Erro ao arquivar criativos:', criativosError);
    throw criativosError;
  }

  // 2. Arquivar a oferta e registrar a data de arquivamento
  return updateOferta(id, {
    status: 'arquivado',
    archived_at: archivedTimestamp
  });
}

export async function restoreOferta(
  id: string,
  criativoIdsToRestore: string[] = []
) {
  // Primeiro, buscar a oferta para pegar o archived_at
  const oferta = await fetchOfertaById(id);

  if (oferta?.archived_at) {
    // Se há criativos específicos para restaurar
    if (criativoIdsToRestore.length > 0) {
      // Restaurar apenas os criativos selecionados
      const { error: restoreError } = await supabase
        .from('criativos')
        .update({
          status: 'em_teste',
          archived_at: null
        })
        .in('id', criativoIdsToRestore);

      if (restoreError) {
        console.error('Erro ao restaurar criativos selecionados:', restoreError);
        throw restoreError;
      }
    }

    // Atualizar os criativos NÃO selecionados para terem archived_at próprio
    // (desvinculando-os do arquivamento da oferta, permitindo restauração individual)
    const { error: unlinkError } = await supabase
      .from('criativos')
      .update({
        archived_at: new Date().toISOString() // Novo timestamp independente
      })
      .eq('oferta_id', id)
      .eq('archived_at', oferta.archived_at)
      .eq('status', 'arquivado');

    if (unlinkError) {
      console.error('Erro ao desvincular criativos:', unlinkError);
      throw unlinkError;
    }
  }

  // Restaurar a oferta
  return updateOferta(id, {
    status: 'pausado',
    archived_at: null
  });
}

// Conta quantos criativos foram arquivados junto com a oferta
export async function countCriativosArquivadosComOferta(ofertaId: string): Promise<number> {
  const oferta = await fetchOfertaById(ofertaId);

  if (!oferta?.archived_at) return 0;

  const { count, error } = await supabase
    .from('criativos')
    .select('*', { count: 'exact', head: true })
    .eq('oferta_id', ofertaId)
    .eq('archived_at', oferta.archived_at);

  if (error) {
    console.error('Erro ao contar criativos:', error);
    return 0;
  }

  return count || 0;
}

// Busca criativos que foram arquivados junto com a oferta
export async function fetchCriativosArquivadosComOferta(ofertaId: string): Promise<Criativo[]> {
  const oferta = await fetchOfertaById(ofertaId);

  if (!oferta?.archived_at) return [];

  const { data, error } = await supabase
    .from('criativos')
    .select('*')
    .eq('oferta_id', ofertaId)
    .eq('archived_at', oferta.archived_at)
    .order('id_unico', { ascending: true });

  if (error) {
    console.error('Erro ao buscar criativos arquivados:', error);
    return [];
  }

  return data || [];
}

// ==================== CRIATIVOS ====================

export async function fetchCriativos(filters?: {
  ofertaId?: string;
  status?: string;
  fonte?: string;
  copyResponsavel?: string;
}) {
  let query = supabase.from('criativos').select('*').order('created_at', { ascending: false });
  
  if (filters?.ofertaId) {
    query = query.eq('oferta_id', filters.ofertaId);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.fonte && filters.fonte !== 'all') {
    query = query.eq('fonte', filters.fonte);
  }
  if (filters?.copyResponsavel && filters.copyResponsavel !== 'all') {
    query = query.eq('copy_responsavel', filters.copyResponsavel);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchCriativosComMedias(filters?: {
  ofertaId?: string;
  status?: string;
}) {
  let query = supabase.from('criativos_com_medias').select('*');
  
  if (filters?.ofertaId) {
    query = query.eq('oferta_id', filters.ofertaId);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchCriativoById(id: string) {
  const { data, error } = await supabase
    .from('criativos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createCriativo(criativo: CriativoInsert) {
  const { data, error } = await supabase
    .from('criativos')
    .insert(criativo)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCriativo(id: string, updates: CriativoUpdate) {
  const { data, error } = await supabase
    .from('criativos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteCriativo(id: string) {
  const { error } = await supabase
    .from('criativos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function archiveCriativo(id: string) {
  return updateCriativo(id, {
    status: 'arquivado',
    archived_at: new Date().toISOString()
  });
}

export async function restoreCriativo(id: string) {
  return updateCriativo(id, {
    status: 'em_teste',
    archived_at: null
  });
}

// ==================== MÉTRICAS DIÁRIAS ====================

export async function fetchMetricasDiarias(filters?: {
  criativoId?: string;
  dataInicio?: string;
  dataFim?: string;
}) {
  let query = supabase.from('metricas_diarias').select('*').order('data', { ascending: false });
  
  if (filters?.criativoId) {
    query = query.eq('criativo_id', filters.criativoId);
  }
  if (filters?.dataInicio) {
    query = query.gte('data', filters.dataInicio);
  }
  if (filters?.dataFim) {
    query = query.lte('data', filters.dataFim);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createMetricaDiaria(metrica: MetricaDiariaInsert) {
  const { data, error } = await supabase
    .from('metricas_diarias')
    .insert(metrica)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Cria múltiplas métricas de uma vez (batch insert)
export async function createMetricasBatch(metricas: MetricaDiariaInsert[]) {
  if (metricas.length === 0) return [];

  const { data, error } = await supabase
    .from('metricas_diarias')
    .insert(metricas)
    .select();

  if (error) throw error;
  return data;
}

// Busca criativo por id_unico
export async function fetchCriativoByIdUnico(idUnico: string, ofertaId?: string) {
  let query = supabase
    .from('criativos')
    .select('*')
    .eq('id_unico', idUnico)
    .neq('status', 'arquivado');

  if (ofertaId) {
    query = query.eq('oferta_id', ofertaId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data;
}

// Verifica se já existe métrica para criativo/data
export async function checkMetricaExiste(criativoId: string, data: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('metricas_diarias')
    .select('*', { count: 'exact', head: true })
    .eq('criativo_id', criativoId)
    .eq('data', data);

  if (error) throw error;
  return (count || 0) > 0;
}

export async function updateMetricaDiaria(id: string, updates: MetricaDiariaUpdate) {
  const { data, error } = await supabase
    .from('metricas_diarias')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function upsertMetricaDiaria(metrica: MetricaDiariaInsert) {
  const { data, error } = await supabase
    .from('metricas_diarias')
    .upsert(metrica, { onConflict: 'criativo_id,data' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Busca métrica existente por criativo_id + data
export async function fetchMetricaExistente(criativoId: string, data: string): Promise<MetricaDiaria | null> {
  const { data: metrica, error } = await supabase
    .from('metricas_diarias')
    .select('*')
    .eq('criativo_id', criativoId)
    .eq('data', data)
    .maybeSingle();

  if (error) throw error;
  return metrica;
}

// ==================== MÉTRICAS DIÁRIAS OFERTA ====================

export async function fetchMetricasDiariasOferta(filters?: {
  ofertaId?: string;
  dataInicio?: string;
  dataFim?: string;
}) {
  let query = supabase.from('metricas_diarias_oferta').select('*').order('data', { ascending: false });
  
  if (filters?.ofertaId) {
    query = query.eq('oferta_id', filters.ofertaId);
  }
  if (filters?.dataInicio) {
    query = query.gte('data', filters.dataInicio);
  }
  if (filters?.dataFim) {
    query = query.lte('data', filters.dataFim);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Type for metrics with joined offer data
export interface MetricaDiariaOfertaComJoin extends MetricaDiariaOferta {
  oferta: Oferta | null;
}

export async function fetchMetricasDiariasOfertaComJoin(filters?: {
  dataInicio?: string;
  dataFim?: string;
  statusOferta?: string;
}): Promise<MetricaDiariaOfertaComJoin[]> {
  let query = supabase
    .from('metricas_diarias_oferta')
    .select(`
      *,
      oferta:ofertas(id, nome, nicho, pais, status, thresholds)
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
  
  // Filter by offer status if specified (can't do this in the query directly with join)
  let result = (data || []) as MetricaDiariaOfertaComJoin[];
  
  if (filters?.statusOferta && filters.statusOferta !== 'all') {
    result = result.filter(m => m.oferta?.status === filters.statusOferta);
  } else {
    // By default, exclude archived offers
    result = result.filter(m => m.oferta?.status !== 'arquivado');
  }
  
  return result;
}

// ==================== NICHOS ====================

export async function fetchNichos() {
  const { data, error } = await supabase
    .from('nichos')
    .select('*')
    .order('nome', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function createNicho(nome: string) {
  const { data, error } = await supabase
    .from('nichos')
    .insert({ nome })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteNicho(id: string) {
  const { error } = await supabase
    .from('nichos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ==================== COPYWRITERS ====================

export async function fetchCopywriters() {
  const { data, error } = await supabase
    .from('copywriters')
    .select('*')
    .order('nome', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function createCopywriter(nome: string) {
  const { data, error } = await supabase
    .from('copywriters')
    .insert({ nome })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteCopywriter(id: string) {
  const { error } = await supabase
    .from('copywriters')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ==================== PAÍSES ====================

export async function fetchPaises() {
  const { data, error } = await supabase
    .from('paises')
    .select('*')
    .order('nome', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function createPais(nome: string, codigo?: string) {
  const { data, error } = await supabase
    .from('paises')
    .insert({ nome, codigo })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deletePais(id: string) {
  const { error } = await supabase
    .from('paises')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ==================== THRESHOLDS HISTÓRICO ====================

/**
 * Busca o threshold vigente para uma oferta em uma data específica
 * Usado para colorir métricas com os thresholds corretos do período
 */
export async function fetchThresholdVigente(ofertaId: string, data: string): Promise<Thresholds> {
  const defaultThresholds: Thresholds = {
    roas: { verde: 1.3, amarelo: 1.1 },
    ic: { verde: 50, amarelo: 60 },
    cpc: { verde: 1.5, amarelo: 2.0 },
  };

  const { data: historico, error } = await supabase
    .from('ofertas_thresholds_historico')
    .select('thresholds')
    .eq('oferta_id', ofertaId)
    .lte('data_inicio', data)
    .order('data_inicio', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar threshold vigente:', error);
    return defaultThresholds;
  }

  if (!historico?.thresholds) {
    return defaultThresholds;
  }

  return parseThresholds(historico.thresholds);
}

/**
 * Busca thresholds vigentes para múltiplas ofertas em uma data específica
 * Retorna um Map de ofertaId -> Thresholds
 */
export async function fetchThresholdsVigentesBatch(
  ofertaIds: string[],
  data: string
): Promise<Map<string, Thresholds>> {
  const result = new Map<string, Thresholds>();
  const defaultThresholds: Thresholds = {
    roas: { verde: 1.3, amarelo: 1.1 },
    ic: { verde: 50, amarelo: 60 },
    cpc: { verde: 1.5, amarelo: 2.0 },
  };

  if (ofertaIds.length === 0) return result;

  // Busca todos os thresholds históricos para as ofertas até a data especificada
  const { data: historicos, error } = await supabase
    .from('ofertas_thresholds_historico')
    .select('oferta_id, thresholds, data_inicio')
    .in('oferta_id', ofertaIds)
    .lte('data_inicio', data)
    .order('data_inicio', { ascending: false });

  if (error) {
    console.error('Erro ao buscar thresholds batch:', error);
    // Retorna defaults para todas as ofertas
    ofertaIds.forEach(id => result.set(id, defaultThresholds));
    return result;
  }

  // Para cada oferta, pega o threshold mais recente (primeiro do array ordenado DESC)
  const processedOfertas = new Set<string>();
  for (const h of historicos || []) {
    if (!processedOfertas.has(h.oferta_id)) {
      result.set(h.oferta_id, parseThresholds(h.thresholds));
      processedOfertas.add(h.oferta_id);
    }
  }

  // Ofertas sem histórico recebem defaults
  ofertaIds.forEach(id => {
    if (!result.has(id)) {
      result.set(id, defaultThresholds);
    }
  });

  return result;
}

/**
 * Insere ou atualiza threshold no histórico
 * Chamada quando usuário altera thresholds de uma oferta
 */
export async function insertThresholdHistorico(
  ofertaId: string,
  thresholds: Thresholds,
  dataInicio?: string
): Promise<void> {
  const data = dataInicio || new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('ofertas_thresholds_historico')
    .upsert(
      {
        oferta_id: ofertaId,
        thresholds: thresholds,
        data_inicio: data,
      },
      { onConflict: 'oferta_id,data_inicio' }
    );

  if (error) {
    console.error('Erro ao inserir threshold no histórico:', error);
    throw error;
  }
}

/**
 * Busca histórico completo de thresholds de uma oferta (para auditoria)
 */
export async function fetchThresholdsHistorico(ofertaId: string): Promise<ThresholdHistorico[]> {
  const { data, error } = await supabase
    .from('ofertas_thresholds_historico')
    .select('*')
    .eq('oferta_id', ofertaId)
    .order('data_inicio', { ascending: false });

  if (error) {
    console.error('Erro ao buscar histórico de thresholds:', error);
    return [];
  }

  return (data || []).map(h => ({
    ...h,
    thresholds: parseThresholds(h.thresholds),
  })) as ThresholdHistorico[];
}

// ==================== HELPERS ====================

export function getDateRange(period: string): { dataInicio: string; dataFim: string } {
  const hoje = new Date();
  const dataFim = hoje.toISOString().split('T')[0];
  
  let dataInicio: string;
  
  switch (period) {
    case 'today':
      dataInicio = dataFim;
      break;
    case '7d':
      const seteDias = new Date(hoje);
      seteDias.setDate(seteDias.getDate() - 6);
      dataInicio = seteDias.toISOString().split('T')[0];
      break;
    case '30d':
      const trintaDias = new Date(hoje);
      trintaDias.setDate(trintaDias.getDate() - 29);
      dataInicio = trintaDias.toISOString().split('T')[0];
      break;
    case 'all':
    default:
      dataInicio = '2020-01-01';
      break;
  }
  
  return { dataInicio, dataFim };
}

export function parseThresholds(thresholds: unknown): Thresholds {
  const defaultThresholds: Thresholds = {
    roas: { verde: 1.3, amarelo: 1.1 },
    ic: { verde: 50, amarelo: 60 },
    cpc: { verde: 1.5, amarelo: 2.0 },
  };
  
  if (!thresholds || typeof thresholds !== 'object') {
    return defaultThresholds;
  }
  
  return {
    roas: (thresholds as any).roas || defaultThresholds.roas,
    ic: (thresholds as any).ic || defaultThresholds.ic,
    cpc: (thresholds as any).cpc || defaultThresholds.cpc,
  };
}
