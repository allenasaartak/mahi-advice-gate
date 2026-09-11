import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { evaluateAdvice } from '../../src/domain/decision/evaluate-advice.js';
import { calculateUtilizationBps } from '../../src/domain/evidence/derived-facts.js';
import type { AdviceProposal } from '../../src/schemas/advice-proposal.schema.js';
import type { FinancialProfile } from '../../src/schemas/financial-profile.schema.js';
import { mahiProfile } from '../fixtures/mahi-profile.js';

const CONFIG = {
  numRuns: 2000,
  seed: 20260912,
} as const;

function completePaymentProfile(
  savingsPaise: number,
  obligationPaise = 0,
  status: 'CURRENT' | 'OVERDUE' | 'CLOSED' = 'CURRENT',
): FinancialProfile {
  return {
    ...mahiProfile,
    bureau: {
      ...mahiProfile.bureau,
      accounts: mahiProfile.bureau.accounts.map((account) =>
        account.id === 'HDFC_CARD'
          ? {
              ...account,
              status,
            }
          : account,
      ),
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

function withCardValues(limitPaise: number, balancePaise: number): FinancialProfile {
  return {
    ...mahiProfile,
    bureau: {
      ...mahiProfile.bureau,
      accounts: mahiProfile.bureau.accounts.map((account) => {
        if (account.id === 'HDFC_CARD' && account.type === 'CREDIT_CARD') {
          return {
            ...account,
            limitPaise,
            balancePaise,
          };
        }

        return account;
      }),
    },
  };
}

function withDebtRates(cardAprBps: number, loanAprBps: number): FinancialProfile {
  return {
    ...mahiProfile,
    bureau: {
      ...mahiProfile.bureau,
      accounts: mahiProfile.bureau.accounts.map((account) => {
        if (account.id === 'HDFC_CARD') {
          return {
            ...account,
            annualPercentageRateBps: cardAprBps,
          };
        }

        if (account.id === 'PERSONAL_LOAN') {
          return {
            ...account,
            annualPercentageRateBps: loanAprBps,
          };
        }

        return account;
      }),
    },
  };
}

describe('large synthetic decision matrix', () => {
  it('removing known savings never leaves safe payment advice ALLOWed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (paymentPaise, obligationPaise, reservePaise) => {
          const savingsPaise = paymentPaise + obligationPaise + reservePaise;

          const complete = completePaymentProfile(savingsPaise, obligationPaise);

          const safe = evaluateAdvice(complete, paymentProposal(paymentPaise));

          expect(safe.decision).toBe('ALLOW');

          const userProvided = {
            ...complete.userProvided,
          };

          delete userProvided.liquidSavingsPaise;

          const missingSavings: FinancialProfile = {
            ...complete,
            userProvided,
          };

          const result = evaluateAdvice(missingSavings, paymentProposal(paymentPaise));

          expect(result.decision).not.toBe('ALLOW');
          expect(result.reasonCodes).toContain('REQUIRED_EVIDENCE_MISSING');
        },
      ),
      CONFIG,
    );
  });

  it('removing essential-obligation knowledge never leaves payment advice ALLOWed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2_000_000 }),
        fc.integer({ min: 1, max: 2_000_000 }),
        (paymentPaise, reservePaise) => {
          const complete = completePaymentProfile(paymentPaise + reservePaise, 0);

          expect(evaluateAdvice(complete, paymentProposal(paymentPaise)).decision).toBe('ALLOW');

          const userProvided = {
            ...complete.userProvided,
          };

          delete userProvided.essentialObligations;

          const unknownObligations: FinancialProfile = {
            ...complete,
            userProvided,
          };

          const result = evaluateAdvice(unknownObligations, paymentProposal(paymentPaise));

          expect(result.decision).not.toBe('ALLOW');
          expect(result.reasonCodes).toContain('ESSENTIAL_OBLIGATIONS_UNKNOWN');
        },
      ),
      CONFIG,
    );
  });

  it('increasing an already unaffordable payment never makes it ALLOWed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 1, max: 2_000_000 }),
        fc.integer({ min: 1, max: 2_000_000 }),
        (savingsPaise, firstExcess, additionalExcess) => {
          const firstPayment = savingsPaise + firstExcess;

          const largerPayment = firstPayment + additionalExcess;

          fc.pre(largerPayment <= 9_200_000);

          const profile = completePaymentProfile(savingsPaise);

          const first = evaluateAdvice(profile, paymentProposal(firstPayment));

          const larger = evaluateAdvice(profile, paymentProposal(largerPayment));

          expect(first.decision).not.toBe('ALLOW');
          expect(larger.decision).not.toBe('ALLOW');

          expect(first.reasonCodes).toContain('PAYMENT_EXCEEDS_AVAILABLE_LIQUIDITY');

          expect(larger.reasonCodes).toContain('PAYMENT_EXCEEDS_AVAILABLE_LIQUIDITY');
        },
      ),
      CONFIG,
    );
  });

  it('accepts exact utilisation facts and rejects one-basis-point mutations', () => {
    fc.assert(
      fc.property(
        fc.integer({
          min: 100_000,
          max: 10_000_000,
        }),
        fc.integer({
          min: 0,
          max: 20_000,
        }),
        (limitPaise, targetUtilizationBps) => {
          const balancePaise = Math.round((limitPaise * targetUtilizationBps) / 10_000);

          const actualUtilizationBps = calculateUtilizationBps(balancePaise, limitPaise);

          expect(actualUtilizationBps).toBeDefined();

          const profile = withCardValues(limitPaise, balancePaise);

          const correct: AdviceProposal = {
            proposalId: 'correct-utilisation',
            text: 'Card utilisation claim.',
            type: 'FACTUAL_CLAIM',
            targetAccountId: 'HDFC_CARD',
            factualClaimKind: 'CARD_UTILIZATION',
            claimedUtilizationBps: actualUtilizationBps!,
          };

          const mutated: AdviceProposal = {
            ...correct,
            proposalId: 'mutated-utilisation',
            claimedUtilizationBps: actualUtilizationBps! + 1,
          };

          const correctResult = evaluateAdvice(profile, correct);

          const mutatedResult = evaluateAdvice(profile, mutated);

          expect(correctResult.decision).toBe('ALLOW');

          expect(mutatedResult.decision).toBe('BLOCK');
          expect(mutatedResult.reasonCodes).toContain('FACTUAL_CLAIM_MISMATCH');
        },
      ),
      CONFIG,
    );
  });

  it('debt-priority decisions follow comparative APR evidence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 4000 }),
        fc.integer({ min: 1, max: 3000 }),
        (lowerAprBps, gapBps) => {
          const higherAprBps = lowerAprBps + gapBps;

          const proposal: AdviceProposal = {
            proposalId: 'apr-priority',
            text: 'Prioritise HDFC over the personal loan.',
            type: 'DEBT_PRIORITY',
            targetAccountId: 'HDFC_CARD',
            secondaryAccountId: 'PERSONAL_LOAN',
          };

          const supported = evaluateAdvice(withDebtRates(higherAprBps, lowerAprBps), proposal);

          const contradicted = evaluateAdvice(withDebtRates(lowerAprBps, higherAprBps), proposal);

          expect(supported.decision).toBe('ALLOW');

          expect(contradicted.decision).toBe('BLOCK');
          expect(contradicted.reasonCodes).toContain('DEBT_PRIORITY_NOT_SUPPORTED');
        },
      ),
      CONFIG,
    );
  });

  it('closed target accounts always block actionable payment advice', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2_500_000 }),
        fc.integer({ min: 1, max: 2_500_000 }),
        (paymentPaise, reservePaise) => {
          const profile = completePaymentProfile(paymentPaise + reservePaise, 0, 'CLOSED');

          const result = evaluateAdvice(profile, paymentProposal(paymentPaise));

          expect(result.decision).toBe('BLOCK');
          expect(result.reasonCodes).toContain('TARGET_ACCOUNT_CLOSED');
        },
      ),
      CONFIG,
    );
  });
});
