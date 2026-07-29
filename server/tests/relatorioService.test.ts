import { describe, it, expect } from 'vitest';
import { buildPresencaCountMap, getPresencaCount } from '../services/relatorioService';

describe('relatorioService — agregação de presenças', () => {
  it('soma presentes por tipo corretamente', () => {
    const map = buildPresencaCountMap([
      { relatorioId: 1, tipo: 0, status: 1, _count: { _all: 3 } },
      { relatorioId: 1, tipo: 0, status: 0, _count: { _all: 2 } },
      { relatorioId: 1, tipo: 1, status: 1, _count: { _all: 4 } },
      { relatorioId: 1, tipo: 1, status: 0, _count: { _all: 1 } },
    ]);

    expect(getPresencaCount(map, 1, 0, 1)).toBe(3);
    expect(getPresencaCount(map, 1, 0)).toBe(5);
    expect(getPresencaCount(map, 1, 1, 1)).toBe(4);
    expect(getPresencaCount(map, 1, 1)).toBe(5);
  });
});
