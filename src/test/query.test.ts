import { describe, expect, it, vi } from 'vitest';
import { refetchQueries } from '@/lib/query';

describe('refetchQueries', () => {
  it('aguarda todas as consultas', async () => {
    const first = vi.fn().mockResolvedValue({ error: null });
    const second = vi.fn().mockResolvedValue({ error: null });

    await expect(refetchQueries([first, second])).resolves.toBeUndefined();
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('informa falha quando uma consulta retorna erro', async () => {
    const error = new Error('Falha ao atualizar');

    await expect(refetchQueries([
      () => Promise.resolve({ error: null }),
      () => Promise.resolve({ error }),
    ])).rejects.toBe(error);
  });
});
