import { getEvidenceFact } from '../evidence/resolver.js';
import type { PolicyRule } from './types.js';

export const liquidityRule: PolicyRule = {
  id: 'LIQUIDITY_SUFFICIENCY',

  evaluate({ proposal, evidence }) {
    if (proposal.type !== 'DEBT_PAYMENT') {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'PASS',
      };
    }

    if (proposal.amountPaise === undefined) {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'UNKNOWN',
        reasonCode: 'PAYMENT_AMOUNT_MISSING',
        reason: 'A payment amount is required to evaluate liquidity.',
        missingInformation: ['Proposed payment amount'],
      };
    }

    const savings = getEvidenceFact<number>(evidence, 'user.liquidSavingsPaise');

    if (savings?.state !== 'KNOWN' || savings.value === undefined) {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'UNKNOWN',
        reasonCode: 'LIQUID_SAVINGS_UNKNOWN',
        reason: 'Available liquid savings are required to validate the payment.',
        missingInformation: ['Available liquid savings'],
      };
    }

    if (proposal.amountPaise > savings.value) {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'FAIL',
        reasonCode: 'PAYMENT_EXCEEDS_AVAILABLE_LIQUIDITY',
        reason: 'The proposed payment exceeds the user’s known liquid savings.',
        suggestedAmountPaise: savings.value,
      };
    }

    return {
      ruleId: 'LIQUIDITY_SUFFICIENCY',
      status: 'PASS',
    };
  },
};
