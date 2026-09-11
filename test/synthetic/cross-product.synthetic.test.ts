import { describe, expect, it } from 'vitest';

import { evaluateAdvice } from '../../src/domain/decision/evaluate-advice.js';
import type { AdviceProposal } from '../../src/schemas/advice-proposal.schema.js';
import type { FinancialProfile } from '../../src/schemas/financial-profile.schema.js';
import { mahiProfile } from '../fixtures/mahi-profile.js';

type SavingsMode = 'UNKNOWN' | 'LOW' | 'HIGH';
type ObligationMode = 'UNKNOWN' | 'NONE' | 'KNOWN';
type AccountStatus = 'CURRENT' | 'CLOSED';

const savingsValues: Record<Exclude<SavingsMode, 'UNKNOWN'>, number> = {
  LOW: 500_000,
  HIGH: 3_000_000,
};

const paymentAmounts = [250_000, 750_000, 1_500_000] as const;

function paymentProfile(
  savingsMode: SavingsMode,
  obligationMode: ObligationMode,
  accountStatus: AccountStatus,
): FinancialProfile {
  const baseUserProvided = {
    monthlyIncomePaise: 5_500_000,
    fixedMonthlyExpensesPaise: 3_200_000,
    nextIncomeDate: '2026-09-30',
  };

  return {
    ...mahiProfile,
    bureau: {
      ...mahiProfile.bureau,
      accounts: mahiProfile.bureau.accounts.map((account) =>
        account.id === 'HDFC_CARD'
          ? {
              ...account,
              status: accountStatus,
            }
          : account,
      ),
    },
    userProvided: {
      ...baseUserProvided,

      ...(savingsMode !== 'UNKNOWN'
        ? {
            liquidSavingsPaise: savingsValues[savingsMode],
          }
        : {}),

      ...(obligationMode === 'NONE'
        ? {
            essentialObligations: [],
          }
        : {}),

      ...(obligationMode === 'KNOWN'
        ? {
            essentialObligations: [
              {
                id: 'cross-product-obligation',
                description: 'Essential household payment',
                amountPaise: 500_000,
                dueDate: '2026-09-20',
                category: 'HOUSEHOLD' as const,
              },
            ],
          }
        : {}),
    },
  };
}

function paymentProposal(amountPaise: number): AdviceProposal {
  return {
    proposalId: `payment-${amountPaise}`,
    text: 'Pay toward HDFC.',
    type: 'DEBT_PAYMENT',
    targetAccountId: 'HDFC_CARD',
    amountPaise,
    timing: 'NOW',
  };
}

function expectedPaymentDecision(
  savingsMode: SavingsMode,
  obligationMode: ObligationMode,
  accountStatus: AccountStatus,
  paymentPaise: number,
) {
  if (accountStatus === 'CLOSED') {
    return 'BLOCK';
  }

  if (savingsMode === 'UNKNOWN' || obligationMode === 'UNKNOWN') {
    return 'ASK_USER';
  }

  const savingsPaise = savingsValues[savingsMode];

  if (paymentPaise > savingsPaise) {
    return 'MODIFY';
  }

  const obligationPaise = obligationMode === 'KNOWN' ? 500_000 : 0;

  if (savingsPaise - paymentPaise < obligationPaise) {
    return 'MODIFY';
  }

  return 'ALLOW';
}

describe('payment cross-product matrix', () => {
  const savingsModes: SavingsMode[] = ['UNKNOWN', 'LOW', 'HIGH'];

  const obligationModes: ObligationMode[] = ['UNKNOWN', 'NONE', 'KNOWN'];

  const accountStatuses: AccountStatus[] = ['CURRENT', 'CLOSED'];

  for (const savingsMode of savingsModes) {
    for (const obligationMode of obligationModes) {
      for (const accountStatus of accountStatuses) {
        for (const paymentPaise of paymentAmounts) {
          it(`${savingsMode} savings | ${obligationMode} obligations | ${accountStatus} account | payment ${paymentPaise}`, () => {
            const result = evaluateAdvice(
              paymentProfile(savingsMode, obligationMode, accountStatus),
              paymentProposal(paymentPaise),
            );

            expect(result.decision).toBe(
              expectedPaymentDecision(savingsMode, obligationMode, accountStatus, paymentPaise),
            );
          });
        }
      }
    }
  }
});

type AprValue = number | 'UNKNOWN';

const targetAprValues: AprValue[] = ['UNKNOWN', 1200, 1800];

const secondaryAprValues: AprValue[] = ['UNKNOWN', 1400, 1600];

function debtPriorityProfile(
  targetApr: AprValue,
  secondaryApr: AprValue,
  targetStatus: AccountStatus,
  secondaryStatus: AccountStatus,
): FinancialProfile {
  return {
    ...mahiProfile,
    bureau: {
      ...mahiProfile.bureau,
      accounts: mahiProfile.bureau.accounts.map((account) => {
        if (account.id === 'HDFC_CARD') {
          const updatedAccount = { ...account };

          delete updatedAccount.annualPercentageRateBps;

          return {
            ...updatedAccount,
            status: targetStatus,
            ...(targetApr !== 'UNKNOWN'
              ? {
                  annualPercentageRateBps: targetApr,
                }
              : {}),
          };
        }

        if (account.id === 'PERSONAL_LOAN') {
          const updatedAccount = { ...account };

          delete updatedAccount.annualPercentageRateBps;

          return {
            ...updatedAccount,
            status: secondaryStatus,
            ...(secondaryApr !== 'UNKNOWN'
              ? {
                  annualPercentageRateBps: secondaryApr,
                }
              : {}),
          };
        }

        return account;
      }),
    },
  };
}

const priorityProposal: AdviceProposal = {
  proposalId: 'cross-product-priority',
  text: 'Prioritise HDFC before the personal loan.',
  type: 'DEBT_PRIORITY',
  targetAccountId: 'HDFC_CARD',
  secondaryAccountId: 'PERSONAL_LOAN',
};

function expectedPriorityDecision(
  targetApr: AprValue,
  secondaryApr: AprValue,
  targetStatus: AccountStatus,
  secondaryStatus: AccountStatus,
) {
  if (targetStatus === 'CLOSED' || secondaryStatus === 'CLOSED') {
    return 'BLOCK';
  }

  if (targetApr === 'UNKNOWN' || secondaryApr === 'UNKNOWN') {
    return 'ASK_USER';
  }

  return targetApr > secondaryApr ? 'ALLOW' : 'BLOCK';
}

describe('debt-priority cross-product matrix', () => {
  const statuses: AccountStatus[] = ['CURRENT', 'CLOSED'];

  for (const targetStatus of statuses) {
    for (const secondaryStatus of statuses) {
      for (const targetApr of targetAprValues) {
        for (const secondaryApr of secondaryAprValues) {
          it(`target=${targetStatus}/${targetApr} | secondary=${secondaryStatus}/${secondaryApr}`, () => {
            const result = evaluateAdvice(
              debtPriorityProfile(targetApr, secondaryApr, targetStatus, secondaryStatus),
              priorityProposal,
            );

            expect(result.decision).toBe(
              expectedPriorityDecision(targetApr, secondaryApr, targetStatus, secondaryStatus),
            );
          });
        }
      }
    }
  }
});
