import { describe, it, expect } from 'vitest';
import { computeFee } from '@/lib/constants';
describe('费用计算', () => {
  it('5-10万 -> 760', () => { expect(computeFee('5-10万').total).toBe(760); });
  it('1-5万 -> 310', () => { expect(computeFee('1-5万').total).toBe(310); });
  it('未知预算回退默认', () => { expect(computeFee('xxx').total).toBe(310); });
});
