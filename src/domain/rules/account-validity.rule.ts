import type { PolicyRule } from './types.js';

export const accountValidityRule: PolicyRule = {
  id: 'ACCOUNT_VALIDITY',

  evaluate({ profile, proposal }) {
    const targetAccount = proposal.targetAccountId
      ? profile.bureau.accounts.find((account) => account.id === proposal.targetAccountId)
      : undefined;

    const secondaryAccount = proposal.secondaryAccountId
      ? profile.bureau.accounts.find((account) => account.id === proposal.secondaryAccountId)
      : undefined;

    if (proposal.targetAccountId && !targetAccount) {
      return {
        ruleId: 'ACCOUNT_VALIDITY',
        status: 'FAIL',
        reasonCode: 'TARGET_ACCOUNT_NOT_FOUND',
        reason:
          'The recommendation references a target account that is not present in the available bureau data.',
      };
    }

    if (proposal.secondaryAccountId && !secondaryAccount) {
      return {
        ruleId: 'ACCOUNT_VALIDITY',
        status: 'FAIL',
        reasonCode: 'SECONDARY_ACCOUNT_NOT_FOUND',
        reason:
          'The recommendation references a comparison account that is not present in the available bureau data.',
      };
    }

    const requiresActionableTarget =
      proposal.type === 'DEBT_PAYMENT' || proposal.type === 'DEBT_PRIORITY';

    if (requiresActionableTarget && targetAccount?.status === 'CLOSED') {
      return {
        ruleId: 'ACCOUNT_VALIDITY',
        status: 'FAIL',
        reasonCode: 'TARGET_ACCOUNT_CLOSED',
        reason: 'The recommendation proposes action on an account that is already closed.',
      };
    }

    if (proposal.type === 'DEBT_PRIORITY' && secondaryAccount?.status === 'CLOSED') {
      return {
        ruleId: 'ACCOUNT_VALIDITY',
        status: 'FAIL',
        reasonCode: 'SECONDARY_ACCOUNT_CLOSED',
        reason: 'The debt-priority comparison includes an account that is already closed.',
      };
    }

    return {
      ruleId: 'ACCOUNT_VALIDITY',
      status: 'PASS',
    };
  },
};
