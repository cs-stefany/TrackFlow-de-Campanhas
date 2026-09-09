import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BulkMetricasDialog } from '@/components/BulkMetricasDialog';

vi.mock('@/hooks/useSupabase', () => ({
  useCreateMetricasBatch: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

describe('BulkMetricasDialog', () => {
  it('renderiza sem quebrar a página de detalhes', () => {
    expect(() => render(
      <BulkMetricasDialog
        open={false}
        onOpenChange={vi.fn()}
        ofertaId="oferta-teste"
        ofertaNome="Oferta teste"
      />,
    )).not.toThrow();
  });
});
