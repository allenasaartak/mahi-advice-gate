import { getEvidenceFact } from '../evidence/resolver.js';
import type { PolicyRule } from './types.js';

export const debtPriorityRule: PolicyRule = {
  id: 'DEBT_PRIORITY_EVIDENCE',

  evaluate({ proposal, evidence }) {
    if (proposal.type !== 'DEBT_PRIORITY') {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'PASS',
      };
    }

    if (!proposal.targetAccountId || !proposal.secondaryAccountId) {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'UNKNOWN',
        reasonCode: 'DEBT_COMPARISON_INCOMPLETE',
        reason: 'Both debt accounts are required to evaluate repayment priority.',
        missingInformation: ['Primary debt account', 'Comparison debt account'],
      };
    }

    const targetApr = getEvidenceFact<number>(evidence, 'targetAccount.annualPercentageRateBps');

    const secondaryApr = getEvidenceFact<number>(
      evidence,
      'secondaryAccount.annualPercentageRateBps',
    );

    if (
      targetApr?.state !== 'KNOWN' ||
      secondaryApr?.state !== 'KNOWN' ||
      targetApr.value === undefined ||
      secondaryApr.value === undefined
    ) {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'UNKNOWN',
        reasonCode: 'DEBT_PRIORITY_EVIDENCE_MISSING',
        reason:
          'The available evidence is insufficient to determine which debt should be prioritised.',
        missingInformation: ['Primary debt interest rate', 'Comparison debt interest rate'],
      };
    }

    if (targetApr.value <= secondaryApr.value) {
      return {
        ruleId: 'DEBT_PRIORITY_EVIDENCE',
        status: 'FAIL',
        reasonCode: 'DEBT_PRIORITY_NOT_SUPPORTED',
        reason:
          'The available interest-rate evidence does not support prioritising the proposed account.',
      };
    }

    return {
      ruleId: 'DEBT_PRIORITY_EVIDENCE',
      status: 'PASS',
    };
  },
};
