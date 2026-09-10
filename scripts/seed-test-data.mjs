import { createHash } from 'node:crypto';

const site = 'https://track-flow-campaign.vercel.app';
const html = await (await fetch(site)).text();
const entry = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
if (!entry) throw new Error('Arquivo principal não encontrado.');
const main = await (await fetch(site + entry)).text();
const dependency = main.match(/useSupabase-[\w-]+\.js/)?.[0];
if (!dependency) throw new Error('Configuração publicada não encontrada.');
const bundle = await (await fetch(`${site}/assets/${dependency}`)).text();
const url = bundle.match(/https:\/\/[a-z]+\.supabase\.co/)?.[0];
const candidates = bundle.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
const key = candidates.find((candidate) => {
  try {
    const payload = JSON.parse(Buffer.from(candidate.split('.')[1], 'base64url'));
    return payload.role === 'anon' && url?.includes(payload.ref);
  } catch { return false; }
});
if (!url || !key) throw new Error('Chave pública e banco publicado não identificados.');

async function api(path, method = 'GET', rows) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: rows ? JSON.stringify(rows) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${body}`);
  return body ? JSON.parse(body) : [];
}

const tables = ['ofertas', 'criativos', 'metricas_diarias', 'metricas_diarias_oferta', 'ofertas_thresholds_historico', 'nichos', 'paises', 'copywriters'];
if (process.argv.includes('--remove-label')) {
  const offers = await api('ofertas?select=id,nome&nome=like.TESTE*');
  const creatives = await api('criativos?select=id,id_unico,observacoes&id_unico=like.TESTE*');
  const allIds = new Set((await api('criativos?select=id_unico&limit=1000')).map(row => row.id_unico));
  for (const row of creatives) {
    if (allIds.has(row.id_unico.replace(/^TESTE_/, 'CR_'))) throw new Error('Identificador de destino já existente.');
  }
  for (const row of offers) {
    const renamed = await api(`ofertas?id=eq.${row.id}&nome=eq.${encodeURIComponent(row.nome)}`, 'PATCH', { nome: row.nome.replace(/^TESTE\s*[•·-]?\s*/, '') });
    if (renamed.length !== 1) throw new Error('Oferta mudou durante a atualização.');
  }
  for (const row of creatives) {
    const renamed = await api(`criativos?id=eq.${row.id}&id_unico=eq.${encodeURIComponent(row.id_unico)}`, 'PATCH', {
      id_unico: row.id_unico.replace(/^TESTE_/, 'CR_'),
      observacoes: row.observacoes?.replace('DADOS FICTÍCIOS DE TESTE.', 'Dados demonstrativos.') ?? null,
    });
    if (renamed.length !== 1) throw new Error('Criativo mudou durante a atualização.');
  }
  console.log(JSON.stringify({ ofertasRenomeadas: offers.length, criativosRenomeados: creatives.length }));
} else if (!process.argv.includes('--apply')) {
  console.log('Banco publicado:', url);
  for (const table of tables) {
    const rows = await api(`${table}?select=*&limit=2`);
    console.log(table, JSON.stringify(rows));
  }
} else {
  await seed();
}

async function seed() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const prefix = `trackflow-test-${today}`;
  const day = (offset) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    return date.toISOString().slice(0, 10);
  };
  const uuid = (label) => {
    const hex = createHash('sha256').update(`${prefix}:${label}`).digest('hex');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
  };
  const thresholds = { roas: { verde: 1.4, amarelo: 1.1 }, ic: { verde: 50, amarelo: 65 }, cpc: { verde: 1.5, amarelo: 2 } };
  const previousThresholds = { roas: { verde: 1.6, amarelo: 1.2 }, ic: { verde: 45, amarelo: 60 }, cpc: { verde: 1.2, amarelo: 1.8 } };
  const nichos = await api('nichos?select=nome');
  const paises = await api('paises?select=nome');
  const writers = await api('copywriters?select=nome');
  if (!nichos.length || !paises.length || !writers.length) throw new Error('Cadastros básicos indisponíveis.');
  const names = [
    'Campanha lucrativa', 'Campanha em atenção', 'Campanha com prejuízo',
    'Campanha pausada', 'Campanha com nome muito longo para conferir a leitura dos cartões e das tabelas no celular',
    'Conversões zeradas', 'Investimento alto', 'Campanha multicanal',
    'Nova oferta sem métricas', 'Arquivo com criativos vinculados',
    'Arquivo para restauração parcial', 'Arquivo vazio para exclusão',
  ];
  const offers = names.map((nome, index) => ({
    id: uuid(`offer-${index}`), nome,
    nicho: nichos[index % nichos.length].nome, pais: paises[index % paises.length].nome,
    status: index >= 9 ? 'arquivado' : index === 3 ? 'pausado' : 'ativo',
    data: day(100), created_at: `${day(100)}T12:00:00Z`, thresholds,
    archived_at: index >= 9 ? `${day(index === 9 ? 2 : 10)}T12:00:00Z` : null,
  }));
  const sources = ['facebook', 'youtube', 'tiktok', 'outro'];
  const statuses = ['liberado', 'em_teste', 'nao_validado', 'pausado'];
  const urls = [
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    null,
    'https://example.com/',
  ];
  const creatives = offers.flatMap((offer, i) => {
    if (i === 11) return [];
    return Array.from({ length: i === 8 ? 1 : 3 }, (_, j) => ({
      id: uuid(`creative-${i}-${j}`), oferta_id: offer.id,
      id_unico: `CR_${today.replaceAll('-', '')}_${String(i+1).padStart(2,'0')}_${j+1}_${sources[(i+j)%4].toUpperCase()}${i === 4 ? '_IDENTIFICADOR_LONGO_PARA_VALIDAR_A_LEITURA_NO_MOBILE' : ''}`,
      fonte: sources[(i+j)%4], copy_responsavel: writers[(i+j)%writers.length].nome,
      status: i >= 9 || (i < 3 && j === 2) ? 'arquivado' : statuses[(i+j)%4],
      archived_at: i >= 9 ? offer.archived_at : i < 3 && j === 2 ? `${day(3)}T15:00:00Z` : null,
      url: urls[(i+j)%4], created_at: `${day(100)}T12:00:00Z`,
      observacoes: 'Dados demonstrativos. Pode editar, arquivar ou excluir este criativo.\nMaterial ilustrativo para validar filtros, métricas e reprodução.',
    }));
  });
  const history = offers.flatMap((offer) => [
    { id: uuid(`threshold-old-${offer.id}`), oferta_id: offer.id, data_inicio: day(100), thresholds: previousThresholds },
    { id: uuid(`threshold-new-${offer.id}`), oferta_id: offer.id, data_inicio: day(10), thresholds },
  ]);
  const money = (value) => Math.round(value * 100) / 100;
  const metrics = [];
  for (const [ci, creative] of creatives.entries()) {
    const oi = offers.findIndex((offer) => offer.id === creative.oferta_id);
    if (oi === 8 || (oi === 7 && ci % 3 === 2)) continue;
    const offsets = [...Array.from({ length: 31 }, (_, i) => i), 40, 60, 90];
    for (const offset of offsets) {
      if (creative.archived_at && day(offset) >= creative.archived_at.slice(0,10)) continue;
      const zero = oi === 5 && offset % 4 === 0;
      const spend = zero ? 0 : money((oi === 6 ? 8500 : 150 + ci * 11) * (0.8 + (offset % 7) * 0.07));
      const roas = [2.2,1.2,0.65,1.6,1.8,0,2.7,1.4,0,1.9,0.8][oi] + (oi === 5 ? 0 : (offset % 3 - 1) * 0.04);
      const faturado = money(spend * roas);
      const cliques = zero ? 0 : Math.max(1, Math.round(spend / [1.05,1.7,2.5][oi%3]));
      const conversoes = oi === 5 || zero ? 0 : Math.max(1,Math.round(spend / [35,58,90][oi%3]));
      const impressoes = cliques * (35 + offset % 10);
      metrics.push({ id: uuid(`metric-${creative.id}-${day(offset)}`), criativo_id: creative.id, data: day(offset), spend, faturado, cliques, conversoes, impressoes });
    }
  }
  async function insertMissing(table, rows) {
    let added = 0;
    for (let start=0; start<rows.length; start+=75) {
      const batch=rows.slice(start,start+75);
      const existing=await api(`${table}?select=id&id=in.(${batch.map(r=>r.id).join(',')})`);
      const seen=new Set(existing.map(r=>r.id));
      const missing=batch.filter(r=>!seen.has(r.id));
      if (missing.length) added += (await api(table,'POST',missing)).length;
    }
    console.log(`${table}: ${added} inseridos; ${rows.length-added} já presentes.`);
  }
  console.log('Destino:', url, '| Data:', today);
  await insertMissing('ofertas',offers);
  await insertMissing('ofertas_thresholds_historico',history);
  await insertMissing('criativos',creatives);
  await insertMissing('metricas_diarias',metrics);
  const offerIds=offers.map(o=>o.id).join(',');
  const aggregates=await api(`metricas_diarias_oferta?select=*&oferta_id=in.(${offerIds})&limit=1000`);
  const grouped=new Map();
  for (const metric of metrics) {
    const offerId=creatives.find(c=>c.id===metric.criativo_id).oferta_id;
    const key=`${offerId}|${metric.data}`;
    const total=grouped.get(key)||{oferta_id:offerId,data:metric.data,spend:0,faturado:0,cliques:0,conversoes:0,impressoes:0};
    for (const field of ['spend','faturado','cliques','conversoes','impressoes']) total[field]+=metric[field];
    grouped.set(key,total);
  }
  const existingPairs=new Set(aggregates.map(m=>`${m.oferta_id}|${m.data}`));
  for (const [pair,total] of grouped) {
    if (!existingPairs.has(pair)) {
      await api('rpc/fnc_recalcular_metricas_oferta_dia','POST',{p_data:total.data,p_oferta_id:total.oferta_id});
    }
  }
  const actual=await api(`metricas_diarias_oferta?select=*&oferta_id=in.(${offerIds})&limit=1000`);
  const mismatches=[];
  for (const [pair,expected] of grouped) {
    const row=actual.find(m=>`${m.oferta_id}|${m.data}`===pair);
    if (!row || ['spend','faturado','cliques','conversoes','impressoes'].some(field=>Math.abs(Number(row[field])-expected[field])>0.02)) mismatches.push(pair);
  }
  if(mismatches.length) throw new Error(`Agregações divergentes: ${mismatches.length}, exemplo ${mismatches[0]}`);
  console.log(JSON.stringify({ofertas:offers.length,criativos:creatives.length,metricas:metrics.length,historicos:history.length,diasPorOferta:actual.length,agregacoes:'conferidas',data:today}));
}
