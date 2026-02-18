// TrackFlow Mock Data - Simulating real ad tracking scenarios

export type HealthStatus = 'success' | 'warning' | 'danger';

export interface OfferThresholds {
  roas: { green: number; yellow: number };
  ic: { green: number; yellow: number };
  cpc: { green: number; yellow: number };
}

export interface DailyMetric {
  date: string;
  revenue: number;
  spend: number;
  roas: number;
  ic: number;
  cpc: number;
  profit: number;
  mc: number;
}

export type CreativeSource = 'FB' | 'YT' | 'TT';

export interface Creative {
  id: string;
  offerId: string;
  source: CreativeSource;
  copy: string;
  status: 'active' | 'testing' | 'paused' | 'archived';
  thumbnail?: string;
  videoUrl?: string;
  observations?: string;
  copywriter?: string;
  createdAt: string;
  metrics: {
    date: string;
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }[];
}

export interface Offer {
  id: string;
  name: string;
  niche: string;
  country: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
  thresholds: OfferThresholds;
  metrics: {
    spendTotal: number;
    spendToday: number;
    spend7d: number;
    roasTotal: number;
    roasToday: number;
    roas7d: number;
    revenue: number;
    profit: number;
  };
  dailyMetrics: DailyMetric[];
  creativesCount: {
    total: number;
    active: number;
    testing: number;
    paused: number;
  };
}

// Default thresholds
export const defaultThresholds: OfferThresholds = {
  roas: { green: 1.30, yellow: 1.10 },
  ic: { green: 50, yellow: 60 },
  cpc: { green: 1.50, yellow: 2.00 },
};

// Generate daily metrics for an offer
const generateDailyMetrics = (
  days: number,
  baseSpend: number,
  baseRoas: number,
  variance: number
): DailyMetric[] => {
  const metrics: DailyMetric[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const spendVariance = (Math.random() - 0.5) * variance * baseSpend;
    const roasVariance = (Math.random() - 0.5) * variance * baseRoas;

    const spend = Math.max(100, baseSpend + spendVariance);
    const roas = Math.max(0.5, baseRoas + roasVariance);
    const revenue = spend * roas;
    const profit = revenue - spend;
    const mc = (profit / revenue) * 100;
    const ic = 30 + Math.random() * 40;
    const cpc = 1 + Math.random() * 1.5;

    metrics.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.round(revenue * 100) / 100,
      spend: Math.round(spend * 100) / 100,
      roas: Math.round(roas * 100) / 100,
      ic: Math.round(ic * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      mc: Math.round(mc * 100) / 100,
    });
  }

  return metrics;
};

// Mock Offers
export const mockOffers: Offer[] = [
  {
    id: 'offer-1',
    name: 'Nutra Max Pro',
    niche: 'Saúde',
    country: 'Brasil',
    status: 'active',
    createdAt: '2024-01-15',
    thresholds: {
      roas: { green: 1.30, yellow: 1.10 },
      ic: { green: 50, yellow: 60 },
      cpc: { green: 1.50, yellow: 2.00 },
    },
    metrics: {
      spendTotal: 45780.50,
      spendToday: 1250.00,
      spend7d: 8750.00,
      roasTotal: 1.85,
      roasToday: 1.92,
      roas7d: 1.78,
      revenue: 84693.93,
      profit: 38913.43,
    },
    dailyMetrics: generateDailyMetrics(30, 1200, 1.85, 0.15),
    creativesCount: {
      total: 24,
      active: 12,
      testing: 8,
      paused: 4,
    },
  },
  {
    id: 'offer-2',
    name: 'Crypto Academy',
    niche: 'Finanças',
    country: 'Brasil',
    status: 'active',
    createdAt: '2024-02-01',
    thresholds: {
      roas: { green: 1.25, yellow: 1.05 },
      ic: { green: 45, yellow: 55 },
      cpc: { green: 1.80, yellow: 2.20 },
    },
    metrics: {
      spendTotal: 32150.00,
      spendToday: 890.00,
      spend7d: 6230.00,
      roasTotal: 1.22,
      roasToday: 1.18,
      roas7d: 1.15,
      revenue: 39223.00,
      profit: 7073.00,
    },
    dailyMetrics: generateDailyMetrics(30, 900, 1.20, 0.20),
    creativesCount: {
      total: 18,
      active: 8,
      testing: 6,
      paused: 4,
    },
  },
  {
    id: 'offer-3',
    name: 'Slim Detox',
    niche: 'Emagrecimento',
    country: 'Portugal',
    status: 'active',
    createdAt: '2024-01-20',
    thresholds: {
      roas: { green: 1.35, yellow: 1.15 },
      ic: { green: 55, yellow: 65 },
      cpc: { green: 1.40, yellow: 1.80 },
    },
    metrics: {
      spendTotal: 18420.00,
      spendToday: 520.00,
      spend7d: 3640.00,
      roasTotal: 0.95,
      roasToday: 0.88,
      roas7d: 0.92,
      revenue: 17499.00,
      profit: -921.00,
    },
    dailyMetrics: generateDailyMetrics(30, 550, 0.95, 0.25),
    creativesCount: {
      total: 15,
      active: 5,
      testing: 4,
      paused: 6,
    },
  },
  {
    id: 'offer-4',
    name: 'English Fast',
    niche: 'Educação',
    country: 'Brasil',
    status: 'active',
    createdAt: '2024-02-10',
    thresholds: {
      roas: { green: 1.40, yellow: 1.20 },
      ic: { green: 40, yellow: 50 },
      cpc: { green: 1.20, yellow: 1.60 },
    },
    metrics: {
      spendTotal: 28900.00,
      spendToday: 780.00,
      spend7d: 5460.00,
      roasTotal: 1.65,
      roasToday: 1.72,
      roas7d: 1.68,
      revenue: 47685.00,
      profit: 18785.00,
    },
    dailyMetrics: generateDailyMetrics(30, 800, 1.65, 0.12),
    creativesCount: {
      total: 20,
      active: 14,
      testing: 4,
      paused: 2,
    },
  },
];

// Mock Creatives
export const mockCreatives: Creative[] = [
  // Nutra Max Pro Creatives
  {
    id: 'ID01_NUTRA_WL1',
    offerId: 'offer-1',
    source: 'FB',
    copy: 'João Silva',
    status: 'active',
    copywriter: 'João Silva',
    createdAt: '2024-01-16',
    observations: 'Melhor performance no público 35-44',
    metrics: [
      { date: '2024-01-25', spend: 450, revenue: 855, impressions: 12500, clicks: 380, conversions: 18 },
      { date: '2024-01-26', spend: 520, revenue: 988, impressions: 14200, clicks: 425, conversions: 21 },
    ],
  },
  {
    id: 'ID02_NUTRA_WL2',
    offerId: 'offer-1',
    source: 'FB',
    copy: 'Maria Santos',
    status: 'active',
    copywriter: 'Maria Santos',
    createdAt: '2024-01-18',
    metrics: [
      { date: '2024-01-25', spend: 380, revenue: 722, impressions: 10800, clicks: 310, conversions: 15 },
    ],
  },
  {
    id: 'ID03_NUTRA_YT1',
    offerId: 'offer-1',
    source: 'YT',
    copy: 'Carlos Oliveira',
    status: 'testing',
    copywriter: 'Carlos Oliveira',
    createdAt: '2024-01-22',
    observations: 'Teste A/B com gancho emocional',
    metrics: [],
  },
  {
    id: 'ID04_NUTRA_FB3',
    offerId: 'offer-1',
    source: 'FB',
    copy: 'Ana Costa',
    status: 'testing',
    copywriter: 'Ana Costa',
    createdAt: '2024-01-24',
    metrics: [],
  },
  // Crypto Academy Creatives
  {
    id: 'ID01_CRYPTO_FB1',
    offerId: 'offer-2',
    source: 'FB',
    copy: 'Pedro Lima',
    status: 'active',
    copywriter: 'Pedro Lima',
    createdAt: '2024-02-02',
    metrics: [
      { date: '2024-01-25', spend: 320, revenue: 390, impressions: 9500, clicks: 285, conversions: 8 },
    ],
  },
  {
    id: 'ID02_CRYPTO_YT1',
    offerId: 'offer-2',
    source: 'YT',
    copy: 'Lucas Mendes',
    status: 'paused',
    copywriter: 'Lucas Mendes',
    createdAt: '2024-02-05',
    observations: 'Pausado para otimização',
    metrics: [],
  },
  // Slim Detox Creatives
  {
    id: 'ID01_SLIM_FB1',
    offerId: 'offer-3',
    source: 'FB',
    copy: 'Fernanda Rocha',
    status: 'active',
    copywriter: 'Fernanda Rocha',
    createdAt: '2024-01-21',
    metrics: [
      { date: '2024-01-25', spend: 280, revenue: 252, impressions: 8200, clicks: 240, conversions: 5 },
    ],
  },
  {
    id: 'ID02_SLIM_FB2',
    offerId: 'offer-3',
    source: 'FB',
    copy: 'Rafael Souza',
    status: 'testing',
    copywriter: 'Rafael Souza',
    createdAt: '2024-01-23',
    metrics: [],
  },
  // English Fast Creatives
  {
    id: 'ID01_ENG_FB1',
    offerId: 'offer-4',
    source: 'FB',
    copy: 'Juliana Alves',
    status: 'active',
    copywriter: 'Juliana Alves',
    createdAt: '2024-02-11',
    observations: 'Alta conversão em mobile',
    metrics: [
      { date: '2024-01-25', spend: 420, revenue: 714, impressions: 11800, clicks: 355, conversions: 17 },
    ],
  },
  {
    id: 'ID02_ENG_YT1',
    offerId: 'offer-4',
    source: 'YT',
    copy: 'Bruno Martins',
    status: 'active',
    copywriter: 'Bruno Martins',
    createdAt: '2024-02-13',
    metrics: [
      { date: '2024-01-25', spend: 360, revenue: 612, impressions: 10200, clicks: 305, conversions: 14 },
    ],
  },
  // TikTok Creatives - Nutra Max Pro
  {
    id: 'ID05_NUTRA_TT1',
    offerId: 'offer-1',
    source: 'TT',
    copy: 'Ana Costa',
    status: 'active',
    copywriter: 'Ana Costa',
    createdAt: '2024-01-25',
    observations: 'Alta viralização no TikTok',
    metrics: [
      { date: '2024-01-26', spend: 280, revenue: 532, impressions: 45000, clicks: 890, conversions: 12 },
    ],
  },
  {
    id: 'ID06_NUTRA_TT2',
    offerId: 'offer-1',
    source: 'TT',
    copy: 'João Silva',
    status: 'testing',
    copywriter: 'João Silva',
    createdAt: '2024-01-28',
    metrics: [],
  },
  // TikTok Creatives - Crypto Academy
  {
    id: 'ID03_CRYPTO_TT1',
    offerId: 'offer-2',
    source: 'TT',
    copy: 'Pedro Lima',
    status: 'active',
    copywriter: 'Pedro Lima',
    createdAt: '2024-02-08',
    metrics: [
      { date: '2024-01-26', spend: 200, revenue: 240, impressions: 32000, clicks: 580, conversions: 5 },
    ],
  },
  // TikTok Creatives - Slim Detox
  {
    id: 'ID03_SLIM_TT1',
    offerId: 'offer-3',
    source: 'TT',
    copy: 'Fernanda Rocha',
    status: 'testing',
    copywriter: 'Fernanda Rocha',
    createdAt: '2024-01-24',
    metrics: [],
  },
  // TikTok Creatives - English Fast
  {
    id: 'ID03_ENG_TT1',
    offerId: 'offer-4',
    source: 'TT',
    copy: 'Juliana Alves',
    status: 'active',
    copywriter: 'Juliana Alves',
    createdAt: '2024-02-15',
    observations: 'Formato dueto funcionando bem',
    metrics: [
      { date: '2024-01-26', spend: 180, revenue: 306, impressions: 28000, clicks: 420, conversions: 8 },
    ],
  },
];

// Filter options
export const niches = ['Saúde', 'Finanças', 'Emagrecimento', 'Educação', 'Relacionamento', 'Tecnologia'];
export const countries = ['Brasil', 'Portugal', 'Estados Unidos', 'Espanha'];
export const copywriters = ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Lima', 'Lucas Mendes', 'Fernanda Rocha', 'Rafael Souza', 'Juliana Alves', 'Bruno Martins'];

// Helper functions
export const getOfferById = (id: string): Offer | undefined => {
  return mockOffers.find(offer => offer.id === id);
};

export const getCreativesByOfferId = (offerId: string): Creative[] => {
  return mockCreatives.filter(creative => creative.offerId === offerId);
};

export const getCreativesBySource = (offerId: string, source: CreativeSource): Creative[] => {
  return mockCreatives.filter(creative => creative.offerId === offerId && creative.source === source);
};

// Calculate totals
export const calculateTotals = () => {
  const totals = mockOffers.reduce(
    (acc, offer) => {
      acc.spendTotal += offer.metrics.spendTotal;
      acc.spendToday += offer.metrics.spendToday;
      acc.spend7d += offer.metrics.spend7d;
      acc.revenue += offer.metrics.revenue;
      return acc;
    },
    { spendTotal: 0, spendToday: 0, spend7d: 0, revenue: 0 }
  );

  const creativeTotals = mockCreatives.reduce(
    (acc, creative) => {
      acc.total++;
      if (creative.status === 'active') acc.active++;
      if (creative.status === 'testing') acc.testing++;
      return acc;
    },
    { total: 0, active: 0, testing: 0 }
  );

  return {
    ...totals,
    roasTotal: totals.spendTotal > 0 ? totals.revenue / totals.spendTotal : 0,
    creativeTotals,
  };
};
