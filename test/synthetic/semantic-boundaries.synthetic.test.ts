import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { evaluateAdvice } from '../../src/domain/decision/evaluate-advice.js';
import type { AdviceProposal } from '../../src/schemas/advice-proposal.schema.js';
import type { FinancialProfile } from '../../src/schemas/financial-profile.schema.js';
import { mahiProfile } from '../fixtures/mahi-profile.js';

const app = buildApp();

afterAll(async () => {
  await app.close();
});

function priorityProfile(
  targetStatus: 'CURRENT' | 'OVERDUE',
  secondaryStatus: 'CURRENT' | 'OVERDUE',
  targetAprBps: number,
  secondaryAprBps: number,
): FinancialProfile {
  return {
    ...mahiProfile,
    bureau: {
      ...mahiProfile.bureau,
      accounts: mahiProfile.bureau.accounts.map((account) => {
        if (account.id === 'HDFC_CARD') {
          return {
            ...account,
            status: targetStatus,
            annualPercentageRateBps: targetAprBps,
          };
        }

        if (account.id === 'PERSONAL_LOAN') {
          return {
            ...account,
            status: secondaryStatus,
            annualPercentageRateBps: secondaryAprBps,
          };
        }

        return account;
      }),
    },
  };
}

const priorityProposal: AdviceProposal = {
  proposalId: 'semantic-priority',
  text: 'Pay HDFC before the personal loan.',
  type: 'DEBT_PRIORITY',
  targetAccountId: 'HDFC_CARD',
  secondaryAccountId: 'PERSONAL_LOAN',
};

describe('semantic decision boundaries', () => {
  it('does not prioritise purely by APR when the target account is overdue', () => {
    const result = evaluateAdvice(
      priorityProfile('OVERDUE', 'CURRENT', 3600, 1400),
      priorityProposal,
    );

    expect(result.decision).toBe('ASK_USER');
  });

  it('does not prioritise purely by APR when the comparison account is overdue', () => {
    const result = evaluateAdvice(
      priorityProfile('CURRENT', 'OVERDUE', 3600, 1400),
      priorityProposal,
    );

    expect(result.decision).toBe('ASK_USER');
  });

  it('allows APR-based priority when both debts are current and evidence supports it', () => {
    const result = evaluateAdvice(
      priorityProfile('CURRENT', 'CURRENT', 3600, 1400),
      priorityProposal,
    );

    expect(result.decision).toBe('ALLOW');
  });

  it('does not support arbitrary priority when APRs are equal', () => {
    const result = evaluateAdvice(
      priorityProfile('CURRENT', 'CURRENT', 1800, 1800),
      priorityProposal,
    );

    expect(result.decision).toBe('BLOCK');
    expect(result.reasonCodes).toContain('DEBT_PRIORITY_NOT_SUPPORTED');
  });

  it('does not validate utilisation when the credit limit is zero', () => {
    const profile: FinancialProfile = {
      ...mahiProfile,
      bureau: {
        ...mahiProfile.bureau,
        accounts: mahiProfile.bureau.accounts.map((account) =>
          account.id === 'HDFC_CARD' && account.type === 'CREDIT_CARD'
            ? {
                ...account,
                limitPaise: 0,
                balancePaise: 0,
              }
            : account,
        ),
      },
    };

    const proposal: AdviceProposal = {
      proposalId: 'zero-limit',
      text: 'Your HDFC utilisation is 0%.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'HDFC_CARD',
      factualClaimKind: 'CARD_UTILIZATION',
      claimedUtilizationBps: 0,
    };

    const result = evaluateAdvice(profile, proposal);

    expect(result.decision).toBe('ASK_USER');
    expect(result.reasonCodes).toContain('UTILIZATION_EVIDENCE_INCOMPLETE');
  });

  it('correctly validates utilisation above 100 percent', () => {
    const profile: FinancialProfile = {
      ...mahiProfile,
      bureau: {
        ...mahiProfile.bureau,
        accounts: mahiProfile.bureau.accounts.map((account) =>
          account.id === 'HDFC_CARD' && account.type === 'CREDIT_CARD'
            ? {
                ...account,
                limitPaise: 1_000_000,
                balancePaise: 1_500_000,
              }
            : account,
        ),
      },
    };

    const proposal: AdviceProposal = {
      proposalId: 'over-limit-card',
      text: 'Your HDFC utilisation is 150%.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'HDFC_CARD',
      factualClaimKind: 'CARD_UTILIZATION',
      claimedUtilizationBps: 15000,
    };

    const result = evaluateAdvice(profile, proposal);

    expect(result.decision).toBe('ALLOW');
  });

  it('asks for missing target account information instead of assuming one', () => {
    const proposal: AdviceProposal = {
      proposalId: 'missing-target',
      text: 'Pay ₹10,000 toward your card.',
      type: 'DEBT_PAYMENT',
      amountPaise: 1_000_000,
      timing: 'NOW',
    };

    const result = evaluateAdvice(mahiProfile, proposal);

    expect(result.decision).toBe('ASK_USER');
  });

  it('rejects a next-income date that is earlier than the profile date', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate-advice',
      payload: {
        profile: {
          ...mahiProfile,
          asOfDate: '2026-09-12',
          userProvided: {
            ...mahiProfile.userProvided,
            nextIncomeDate: '2026-09-01',
            essentialObligations: [],
          },
        },
        proposal: {
          proposalId: 'past-next-income',
          text: 'Pay ₹10,000 toward HDFC.',
          type: 'DEBT_PAYMENT',
          targetAccountId: 'HDFC_CARD',
          amountPaise: 1_000_000,
          timing: 'NOW',
        },
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
