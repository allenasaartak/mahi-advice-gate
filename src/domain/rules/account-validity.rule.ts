import { getEvidenceFact } from '../evidence/resolver.js';
import type { PolicyRule } from './types.js';

export const accountValidityRule: PolicyRule = {
  id: 'ACCOUNT_VALIDITY',

  evaluate({ proposal, evidence }) {
    if (!proposal.targetAccountId && !proposal.secondaryAccountId) {
      return {
        ruleId: 'ACCOUNT_VALIDITY',
        status: 'PASS',
      };
    }

    if (proposal.targetAccountId) {
      const targetExists = getEvidenceFact<boolean>(evidence, 'proposal.targetAccountExists');

      if (targetExists?.value !== true) {
        return {
          ruleId: 'ACCOUNT_VALIDITY',
          status: 'FAIL',
          reasonCode: 'TARGET_ACCOUNT_NOT_FOUND',
          reason:
            'The proposed advice references an account that is not present in the financial profile.',
        };
      }
    }

    if (proposal.secondaryAccountId) {
      const secondaryExists = getEvidenceFact<boolean>(evidence, 'secondaryAccount.exists');

      if (secondaryExists?.value !== true) {
        return {
          ruleId: 'ACCOUNT_VALIDITY',
          status: 'FAIL',
          reasonCode: 'SECONDARY_ACCOUNT_NOT_FOUND',
          reason:
            'The proposed advice references a comparison account that is not present in the financial profile.',
        };
      }
    }

    return {
      ruleId: 'ACCOUNT_VALIDITY',
      status: 'PASS',
    };
  },
};
