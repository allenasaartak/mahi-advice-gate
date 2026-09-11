import { describe, expect, it } from 'vitest';

import {
  calculateMonthlyNetAfterFixedExpenses,
  calculateRemainingLiquidityAfterPayment,
  calculateUtilizationBps,
  findAccount,
  getCreditCardUtilization,
} from '../../src/domain/evidence/derived-facts.js';
import { mahiProfile } from '../fixtures/mahi-profile.js';

describe('derived financial facts', () => {
  it('calculates HDFC utilisation as 92%', () => {
    expect(calculateUtilizationBps(9_200_000, 10_000_000)).toBe(9200);
  });

  it('returns undefined when credit limit is zero', () => {
    expect(calculateUtilizationBps(100_000, 0)).toBeUndefined();
  });

  it('finds the HDFC account', () => {
    const account = findAccount(mahiProfile, 'HDFC_CARD');

    expect(account).toBeDefined();
    expect(account?.id).toBe('HDFC_CARD');
  });

  it('calculates card utilisation from the account', () => {
    const account = findAccount(mahiProfile, 'HDFC_CARD');

    expect(account).toBeDefined();

    const result = account ? getCreditCardUtilization(account) : undefined;

    expect(result?.utilizationBps).toBe(9200);
  });

  it('calculates monthly net after fixed expenses', () => {
    expect(calculateMonthlyNetAfterFixedExpenses(mahiProfile)).toBe(2_300_000);
  });

  it('calculates remaining liquidity after a payment', () => {
    expect(calculateRemainingLiquidityAfterPayment(2_500_000, 2_000_000)).toBe(500_000);
  });
});
