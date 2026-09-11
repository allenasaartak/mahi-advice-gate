import { describe, expect, it } from 'vitest';

import { evaluateAdvice } from '../../src/domain/decision/evaluate-advice.js';
import type { AdviceProposal } from '../../src/schemas/advice-proposal.schema.js';
import type { FinancialProfile } from '../../src/schemas/financial-profile.schema.js';
import { mahiProfile } from '../fixtures/mahi-profile.js';

describe('semantic consistency red-team', () => {
  it('does not allow a debt-priority comparison against the same account', () => {
    const proposal: AdviceProposal = {
      proposalId: 'same-account-priority',
      text: 'Prioritise HDFC over HDFC.',
      type: 'DEBT_PRIORITY',
      targetAccountId: 'HDFC_CARD',
      secondaryAccountId: 'HDFC_CARD',
    };

    const result = evaluateAdvice(mahiProfile, proposal);

    expect(result.decision).toBe('BLOCK');
    expect(result.reasonCodes).toContain('DEBT_PRIORITY_SAME_ACCOUNT');
  });

  it('does not apply card-utilisation claims to a personal loan', () => {
    const proposal: AdviceProposal = {
      proposalId: 'loan-utilisation',
      text: 'Your personal loan utilisation is 50%.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'PERSONAL_LOAN',
      factualClaimKind: 'CARD_UTILIZATION',
      claimedUtilizationBps: 5000,
    };

    const result = evaluateAdvice(mahiProfile, proposal);

    expect(result.decision).toBe('BLOCK');
    expect(result.reasonCodes).toContain('UTILIZATION_REQUIRES_CREDIT_CARD');
  });

  it('does not apply balance-to-utilisation direction claims to a personal loan', () => {
    const proposal: AdviceProposal = {
      proposalId: 'loan-utilisation-direction',
      text: 'Reducing your personal loan balance will reduce card utilisation.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'PERSONAL_LOAN',
      factualClaimKind: 'BALANCE_REDUCTION_LOWERS_UTILIZATION',
    };

    const result = evaluateAdvice(mahiProfile, proposal);

    expect(result.decision).toBe('BLOCK');
    expect(result.reasonCodes).toContain('UTILIZATION_REQUIRES_CREDIT_CARD');
  });

  it('blocks payment advice when the target debt has no outstanding balance', () => {
    const profile: FinancialProfile = {
      ...mahiProfile,
      bureau: {
        ...mahiProfile.bureau,
        accounts: mahiProfile.bureau.accounts.map((account) =>
          account.id === 'HDFC_CARD'
            ? {
                ...account,
                balancePaise: 0,
              }
            : account,
        ),
      },
      userProvided: {
        ...mahiProfile.userProvided,
        nextIncomeDate: '2026-09-30',
        essentialObligations: [],
      },
    };

    const proposal: AdviceProposal = {
      proposalId: 'zero-balance-payment',
      text: 'Pay ₹1,000 toward HDFC.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 100_000,
      timing: 'NOW',
    };

    const result = evaluateAdvice(profile, proposal);

    expect(result.decision).toBe('BLOCK');
    expect(result.reasonCodes).toContain('NO_OUTSTANDING_BALANCE');
  });

  it('asks for the target account when payment advice does not identify one', () => {
    const proposal: AdviceProposal = {
      proposalId: 'missing-payment-target',
      text: 'Pay ₹10,000 toward your debt.',
      type: 'DEBT_PAYMENT',
      amountPaise: 1_000_000,
      timing: 'NOW',
    };

    const result = evaluateAdvice(mahiProfile, proposal);

    expect(result.decision).toBe('ASK_USER');
  });

  it('blocks debt priority when the secondary account is closed', () => {
    const profile: FinancialProfile = {
      ...mahiProfile,
      bureau: {
        ...mahiProfile.bureau,
        accounts: mahiProfile.bureau.accounts.map((account) => {
          if (account.id === 'HDFC_CARD') {
            return {
              ...account,
              annualPercentageRateBps: 3600,
            };
          }

          if (account.id === 'PERSONAL_LOAN') {
            return {
              ...account,
              status: 'CLOSED' as const,
              annualPercentageRateBps: 1400,
            };
          }

          return account;
        }),
      },
    };

    const proposal: AdviceProposal = {
      proposalId: 'closed-secondary',
      text: 'Prioritise HDFC over the personal loan.',
      type: 'DEBT_PRIORITY',
      targetAccountId: 'HDFC_CARD',
      secondaryAccountId: 'PERSONAL_LOAN',
    };

    const result = evaluateAdvice(profile, proposal);

    expect(result.decision).toBe('BLOCK');
    expect(result.reasonCodes).toContain('SECONDARY_ACCOUNT_CLOSED');
  });
});
