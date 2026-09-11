import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { evaluateAdvice } from '../../src/domain/decision/evaluate-advice.js';
import type { AdviceProposal } from '../../src/schemas/advice-proposal.schema.js';
import type { FinancialProfile } from '../../src/schemas/financial-profile.schema.js';
import { mahiProfile } from '../fixtures/mahi-profile.js';

const decisionRank = {
  ALLOW: 1,
  MODIFY: 2,
  ASK_USER: 3,
  BLOCK: 4,
} as const;

function buildPaymentProfile(savingsPaise: number, obligationPaise: number): FinancialProfile {
  return {
    ...mahiProfile,
    userProvided: {
      ...mahiProfile.userProvided,
      liquidSavingsPaise: savingsPaise,
      nextIncomeDate: '2026-09-30',
      essentialObligations:
        obligationPaise > 0
          ? [
              {
                id: 'generated-obligation',
                description: 'Generated essential obligation',
                amountPaise: obligationPaise,
                dueDate: '2026-09-20',
                category: 'HOUSEHOLD',
              },
            ]
          : [],
    },
  };
}

function buildPaymentProposal(amountPaise: number): AdviceProposal {
  return {
    proposalId: 'property-payment',
    text: 'Pay toward HDFC.',
    type: 'DEBT_PAYMENT',
    targetAccountId: 'HDFC_CARD',
    amountPaise,
    timing: 'NOW',
  };
}

describe('advice gate properties', () => {
  it('is deterministic for identical inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 0, max: 5_000_000 }),
        (savingsPaise, obligationPaise, paymentPaise) => {
          const profile = buildPaymentProfile(savingsPaise, obligationPaise);
          const proposal = buildPaymentProposal(paymentPaise);

          const first = evaluateAdvice(profile, proposal);
          const second = evaluateAdvice(profile, proposal);

          expect(second).toEqual(first);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('never allows a payment larger than known liquid savings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 1, max: 5_000_000 }),
        (savingsPaise, excessPaise) => {
          const paymentPaise = savingsPaise + excessPaise;

          const result = evaluateAdvice(
            buildPaymentProfile(savingsPaise, 0),
            buildPaymentProposal(paymentPaise),
          );

          expect(result.decision).not.toBe('ALLOW');
          expect(result.reasonCodes).toContain('PAYMENT_EXCEEDS_AVAILABLE_LIQUIDITY');
        },
      ),
      { numRuns: 500 },
    );
  });

  it('adding an essential obligation never makes debt-payment advice more permissive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100_000, max: 5_000_000 }),
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 1, max: 5_000_000 }),
        (savingsPaise, paymentPaise, obligationPaise) => {
          const proposal = buildPaymentProposal(paymentPaise);

          const withoutObligation = evaluateAdvice(buildPaymentProfile(savingsPaise, 0), proposal);

          const withObligation = evaluateAdvice(
            buildPaymentProfile(savingsPaise, obligationPaise),
            proposal,
          );

          expect(decisionRank[withObligation.decision]).toBeGreaterThanOrEqual(
            decisionRank[withoutObligation.decision],
          );
        },
      ),
      { numRuns: 500 },
    );
  });

  it('never allows an exact credit-score prediction', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 100 }), (scoreChange) => {
        const proposal: AdviceProposal = {
          proposalId: 'property-score-prediction',
          text: `Your score will change by ${scoreChange} points.`,
          type: 'CREDIT_SCORE_PREDICTION',
          targetAccountId: 'HDFC_CARD',
          claimedScoreChangePoints: scoreChange,
        };

        const result = evaluateAdvice(mahiProfile, proposal);

        expect(result.decision).not.toBe('ALLOW');
        expect(result.reasonCodes).toContain('UNSUPPORTED_CREDIT_SCORE_PREDICTION');
      }),
      { numRuns: 500 },
    );
  });
});
