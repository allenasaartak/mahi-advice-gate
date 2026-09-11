import type { PolicyRule } from './types.js';

export const debtPriorityRule: PolicyRule = {
  id: 'DEBT_PRIORITY_EVIDENCE',

  evaluate({ profile, proposal }) {
    if (proposal.type !== 'DEBT_PRIORITY') {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'PASS',
      };
    }

    if (proposal.targetAccountId === undefined || proposal.secondaryAccountId === undefined) {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'UNKNOWN',
        reasonCode: 'DEBT_PRIORITY_ACCOUNTS_MISSING',
        reason: 'Both debts must be identified before a repayment priority can be evaluated.',
        missingInformation: ['Target debt', 'Comparison debt'],
      };
    }

    if (proposal.targetAccountId === proposal.secondaryAccountId) {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'FAIL',
        reasonCode: 'DEBT_PRIORITY_SAME_ACCOUNT',
        reason: 'A debt cannot be prioritised against itself.',
      };
    }

    const targetAccount = profile.bureau.accounts.find(
      (account) => account.id === proposal.targetAccountId,
    );

    const secondaryAccount = profile.bureau.accounts.find(
      (account) => account.id === proposal.secondaryAccountId,
    );

    if (!targetAccount || !secondaryAccount) {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'PASS',
      };
    }

    if (targetAccount.status !== 'CURRENT' || secondaryAccount.status !== 'CURRENT') {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'UNKNOWN',
        reasonCode: 'DEBT_PRIORITY_STATUS_REQUIRES_CONTEXT',
        reason: 'APR alone is not sufficient to prioritise debts when either account is overdue.',
        missingInformation: [
          'Arrears, minimum dues, penalties or payment urgency for overdue debts',
        ],
      };
    }

    const targetApr = targetAccount.annualPercentageRateBps;

    const secondaryApr = secondaryAccount.annualPercentageRateBps;

    if (targetApr === undefined || secondaryApr === undefined) {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'UNKNOWN',
        reasonCode: 'DEBT_PRIORITY_EVIDENCE_MISSING',
        reason:
          'Comparative interest-rate evidence is required before recommending one current debt over another.',
        missingInformation: ['Target account APR', 'Comparison account APR'],
      };
    }

    if (targetApr <= secondaryApr) {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'FAIL',
        reasonCode: 'DEBT_PRIORITY_NOT_SUPPORTED',
        reason:
          'The available APR evidence does not support prioritising the target debt over the comparison debt.',
      };
    }

    return {
      ruleId: 'DEBT_PRIORITY_EVIDENCE',
      status: 'PASS',
    };
  },
};
