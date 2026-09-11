import type { PolicyRule } from './types.js';

export const inferenceBoundaryRule: PolicyRule = {
  id: 'INFERENCE_BOUNDARY',

  evaluate({ proposal }) {
    if (proposal.type !== 'SPENDING_ASSESSMENT') {
      return {
        ruleId: 'INFERENCE_BOUNDARY',
        status: 'PASS',
      };
    }

    return {
      ruleId: 'INFERENCE_BOUNDARY',
      status: 'FAIL',
      reasonCode: 'UNSUPPORTED_BEHAVIOURAL_INFERENCE',
      reason: 'Credit balances alone do not establish whether the user is spending excessively.',
    };
  },
};
