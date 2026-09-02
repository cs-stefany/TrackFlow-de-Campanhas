import { describe, expect, it } from 'vitest';
import {
  calculateMC,
  calculateProfit,
  calculateRoas,
  getMetricStatus,
  type OfferThresholds,
} from '@/lib/metrics';
import { formatCurrency, formatDate } from '@/lib/format';
import { parseThresholds } from '@/services/api';

const thresholds: OfferThresholds = {
  roas: { green: 1.3, yellow: 1.1 },
  ic: { green: 50, yellow: 60 },
  cpc: { green: 1.5, yellow: 2 },
};

describe('cálculos de métricas', () => {
  it('calcula ROAS, lucro e margem', () => {
    expect(calculateRoas(300, 100)).toBe(3);
    expect(calculateRoas(300, 0)).toBe(0);
    expect(calculateProfit(300, 100)).toBe(200);
    expect(calculateMC(200, 300)).toBeCloseTo(66.67, 2);
    expect(calculateMC(0, 0)).toBe(0);
  });

  it('classifica métricas nos limites corretos', () => {
    expect(getMetricStatus(1.3, 'roas', thresholds)).toBe('success');
    expect(getMetricStatus(1.1, 'roas', thresholds)).toBe('warning');
    expect(getMetricStatus(1.09, 'roas', thresholds)).toBe('danger');
    expect(getMetricStatus(50, 'ic', thresholds)).toBe('success');
    expect(getMetricStatus(60, 'ic', thresholds)).toBe('warning');
    expect(getMetricStatus(61, 'ic', thresholds)).toBe('danger');
  });
});

describe('formatação e limites', () => {
  it('formata valores em real brasileiro', () => {
    const formatted = formatCurrency(1234.56);
    expect(formatted).toContain('R$');
    expect(formatted).toContain('1.234,56');
  });

  it('formata datas sem deslocar o dia', () => {
    expect(formatDate('2026-09-02')).toBe('02/09/2026');
  });

  it('preserva padrões quando os limites estão incompletos', () => {
    expect(parseThresholds({ roas: { verde: 2 } })).toEqual({
      roas: { verde: 2, amarelo: 1.1 },
      ic: { verde: 50, amarelo: 60 },
      cpc: { verde: 1.5, amarelo: 2 },
    });
  });
});
