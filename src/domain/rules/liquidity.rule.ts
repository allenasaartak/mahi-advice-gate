import type { PolicyRule } from './types.js';

export const liquidityRule: PolicyRule = {
  id: 'LIQUIDITY_SUFFICIENCY',

  evaluate({ profile, proposal }) {
    if (proposal.type !== 'DEBT_PAYMENT') {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'PASS',
      };
    }

    const amountPaise = proposal.amountPaise;

    if (amountPaise === undefined) {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'UNKNOWN',
        reasonCode: 'PAYMENT_AMOUNT_UNKNOWN',
        reason:
          'The proposed debt payment amount is required before affordability can be evaluated.',
        missingInformation: ['Proposed payment amount'],
      };
    }

    if (amountPaise <= 0) {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'FAIL',
        reasonCode: 'NON_POSITIVE_PAYMENT_AMOUNT',
        reason: 'A debt payment recommendation must specify a positive payment amount.',
      };
    }

    const targetAccount = proposal.targetAccountId
      ? profile.bureau.accounts.find((account) => account.id === proposal.targetAccountId)
      : undefined;

    if (targetAccount?.balancePaise === 0) {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'FAIL',
        reasonCode: 'NO_OUTSTANDING_BALANCE',
        reason: 'The target account has no outstanding balance to pay.',
      };
    }

    if (targetAccount && amountPaise > targetAccount.balancePaise) {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'FAIL',
        reasonCode: 'PAYMENT_EXCEEDS_OUTSTANDING_BALANCE',
        reason: 'The proposed payment exceeds the outstanding balance on the target account.',
        suggestedAmountPaise: targetAccount.balancePaise,
      };
    }

    const savingsPaise = profile.userProvided.liquidSavingsPaise;

    if (savingsPaise === undefined) {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'UNKNOWN',
        reasonCode: 'LIQUID_SAVINGS_UNKNOWN',
        reason:
          'Available liquid savings are required before the proposed payment can be evaluated.',
        missingInformation: ['Available liquid savings'],
      };
    }

    if (amountPaise > savingsPaise) {
      return {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'FAIL',
        reasonCode: 'PAYMENT_EXCEEDS_AVAILABLE_LIQUIDITY',
        reason: 'The proposed payment exceeds the user’s known liquid savings.',
        suggestedAmountPaise: savingsPaise,
      };
    }

    return {
      ruleId: 'LIQUIDITY_SUFFICIENCY',
      status: 'PASS',
    };
  },
};
