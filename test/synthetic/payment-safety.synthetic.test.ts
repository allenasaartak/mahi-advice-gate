import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { evaluateAdvice } from '../../src/domain/decision/evaluate-advice.js';
import type { AdviceProposal } from '../../src/schemas/advice-proposal.schema.js';
import type { FinancialProfile } from '../../src/schemas/financial-profile.schema.js';
import { mahiProfile } from '../fixtures/mahi-profile.js';

const PROPERTY_CONFIG = {
  numRuns: 2000,
  seed: 20260912,
} as const;

function buildProfile(
  savingsPaise: number,
  hdfcBalancePaise: number,
  obligationPaise = 0,
  status: 'CURRENT' | 'OVERDUE' | 'CLOSED' = 'CURRENT',
): FinancialProfile {
  return {
    ...mahiProfile,
    bureau: {
      ...mahiProfile.bureau,
      accounts: mahiProfile.bureau.accounts.map((account) => {
        if (account.id === 'HDFC_CARD' && account.type === 'CREDIT_CARD') {
          return {
            ...account,
            balancePaise: hdfcBalancePaise,
            status,
          };
        }

        return account;
      }),
    },
    userProvided: {
      ...mahiProfile.userProvided,
      liquidSavingsPaise: savingsPaise,
      nextIncomeDate: '2026-09-30',
      essentialObligations:
        obligationPaise > 0
          ? [
              {
                id: 'synthetic-obligation',
                description: 'Synthetic essential obligation',
                amountPaise: obligationPaise,
                dueDate: '2026-09-20',
                category: 'HOUSEHOLD',
              },
            ]
          : [],
    },
  };
}

function paymentProposal(amountPaise: number): AdviceProposal {
  return {
    proposalId: 'synthetic-payment',
    text: 'Pay toward HDFC.',
    type: 'DEBT_PAYMENT',
    targetAccountId: 'HDFC_CARD',
    amountPaise,
    timing: 'NOW',
  };
}

describe('synthetic payment safety', () => {
  it('allows payments within savings, balance and known obligation limits', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 1, max: 9_200_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (savingsPaise, balancePaise, selector) => {
          const maximumSafePayment = Math.min(savingsPaise, balancePaise);

          const paymentPaise = 1 + (selector % maximumSafePayment);

          const result = evaluateAdvice(
            buildProfile(savingsPaise, balancePaise),
            paymentProposal(paymentPaise),
          );

          expect(result.decision).toBe('ALLOW');
        },
      ),
      PROPERTY_CONFIG,
    );
  });

  it('never allows a payment above available savings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 1, max: 3_000_000 }),
        (savingsPaise, excessPaise) => {
          const paymentPaise = savingsPaise + excessPaise;

          const result = evaluateAdvice(
            buildProfile(savingsPaise, Math.max(paymentPaise, 9_200_000)),
            paymentProposal(paymentPaise),
          );

          expect(result.decision).not.toBe('ALLOW');
          expect(result.reasonCodes).toContain('PAYMENT_EXCEEDS_AVAILABLE_LIQUIDITY');
        },
      ),
      PROPERTY_CONFIG,
    );
  });

  it('never allows a payment above the outstanding debt balance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 1, max: 3_000_000 }),
        (balancePaise, excessPaise) => {
          const paymentPaise = balancePaise + excessPaise;
          const savingsPaise = paymentPaise + 5_000_000;

          const result = evaluateAdvice(
            buildProfile(savingsPaise, balancePaise),
            paymentProposal(paymentPaise),
          );

          expect(result.decision).not.toBe('ALLOW');
        },
      ),
      PROPERTY_CONFIG,
    );
  });

  it('does not allow debt payment advice for a closed account', () => {
    const result = evaluateAdvice(
      buildProfile(2_500_000, 9_200_000, 0, 'CLOSED'),
      paymentProposal(1_000_000),
    );

    expect(result.decision).not.toBe('ALLOW');
  });

  it('does not allow a zero-value debt payment recommendation', () => {
    const result = evaluateAdvice(buildProfile(2_500_000, 9_200_000), paymentProposal(0));

    expect(result.decision).not.toBe('ALLOW');
  });

  it('respects the exact essential-obligation liquidity boundary', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200_000, max: 5_000_000 }),
        fc.integer({ min: 1, max: 199_999 }),
        (savingsPaise, selector) => {
          const obligationPaise = 1 + (selector % Math.min(199_999, savingsPaise));

          const maximumSafePayment = savingsPaise - obligationPaise;

          if (maximumSafePayment <= 0) {
            return;
          }

          const safeResult = evaluateAdvice(
            buildProfile(savingsPaise, 9_200_000, obligationPaise),
            paymentProposal(maximumSafePayment),
          );

          const unsafeResult = evaluateAdvice(
            buildProfile(savingsPaise, 9_200_000, obligationPaise),
            paymentProposal(maximumSafePayment + 1),
          );

          expect(safeResult.decision).toBe('ALLOW');
          expect(unsafeResult.decision).not.toBe('ALLOW');
          expect(unsafeResult.reasonCodes).toContain('PAYMENT_CONFLICTS_WITH_ESSENTIAL_OBLIGATION');
        },
      ),
      PROPERTY_CONFIG,
    );
  });
});
