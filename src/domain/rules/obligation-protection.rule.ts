import { getEvidenceFact } from '../evidence/resolver.js';
import type { PolicyRule } from './types.js';

export const obligationProtectionRule: PolicyRule = {
  id: 'OBLIGATION_PROTECTION',

  evaluate({ proposal, evidence }) {
    if (proposal.type !== 'DEBT_PAYMENT') {
      return {
        ruleId: 'OBLIGATION_PROTECTION',
        status: 'PASS',
      };
    }

    if (proposal.amountPaise === undefined) {
      return {
        ruleId: 'OBLIGATION_PROTECTION',
        status: 'UNKNOWN',
        reasonCode: 'PAYMENT_AMOUNT_MISSING',
        reason: 'The payment amount is required to evaluate obligation protection.',
        missingInformation: ['Proposed payment amount'],
      };
    }

    const obligationsKnown = getEvidenceFact<boolean>(evidence, 'user.essentialObligationsKnown');

    if (obligationsKnown?.value !== true) {
      return {
        ruleId: 'OBLIGATION_PROTECTION',
        status: 'UNKNOWN',
        reasonCode: 'ESSENTIAL_OBLIGATIONS_UNKNOWN',
        reason: 'Upcoming essential obligations must be known before validating this payment.',
        missingInformation: ['Upcoming essential obligations'],
      };
    }

    const savings = getEvidenceFact<number>(evidence, 'user.liquidSavingsPaise');

    const obligations = getEvidenceFact<number>(evidence, 'derived.totalEssentialObligationsPaise');

    if (savings?.value === undefined || obligations?.value === undefined) {
      return {
        ruleId: 'OBLIGATION_PROTECTION',
        status: 'UNKNOWN',
        reasonCode: 'OBLIGATION_LIQUIDITY_CONTEXT_INCOMPLETE',
        reason: 'Liquidity and obligation information is incomplete.',
        missingInformation: ['Available liquid savings', 'Upcoming essential obligations'],
      };
    }

    const remainingAfterPayment = savings.value - proposal.amountPaise;

    if (remainingAfterPayment < obligations.value) {
      const safeMaximum = Math.max(0, savings.value - obligations.value);

      return {
        ruleId: 'OBLIGATION_PROTECTION',
        status: 'FAIL',
        reasonCode: 'PAYMENT_CONFLICTS_WITH_ESSENTIAL_OBLIGATION',
        reason:
          'The proposed payment would leave insufficient funds for known essential obligations.',
        suggestedAmountPaise: safeMaximum,
      };
    }

    return {
      ruleId: 'OBLIGATION_PROTECTION',
      status: 'PASS',
    };
  },
};
