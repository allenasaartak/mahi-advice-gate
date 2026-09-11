import type { AdviceProposal } from '../../src/schemas/advice-proposal.schema.js';
import type { Decision } from '../../src/schemas/evaluation.schema.js';
import type { FinancialProfile } from '../../src/schemas/financial-profile.schema.js';
import { mahiProfile } from './mahi-profile.js';

export interface EdgeScenario {
  id: string;
  description: string;
  profile: FinancialProfile;
  proposal: AdviceProposal;
  expectedDecision: Decision;
  expectedReasonCode: string;
}

const completeLiquidityProfile: FinancialProfile = {
  ...mahiProfile,
  userProvided: {
    ...mahiProfile.userProvided,
    nextIncomeDate: '2026-09-30',
    essentialObligations: [],
  },
};

const profileWithDebtRates: FinancialProfile = {
  ...mahiProfile,
  bureau: {
    ...mahiProfile.bureau,
    accounts: mahiProfile.bureau.accounts.map((account) => {
      if (account.id === 'HDFC_CARD') {
        return {
          ...account,
          annualPercentageRateBps: 3600,
        };
      }

      if (account.id === 'PERSONAL_LOAN') {
        return {
          ...account,
          annualPercentageRateBps: 1400,
        };
      }

      return account;
    }),
  },
};

const profileWithReverseDebtRates: FinancialProfile = {
  ...mahiProfile,
  bureau: {
    ...mahiProfile.bureau,
    accounts: mahiProfile.bureau.accounts.map((account) => {
      if (account.id === 'HDFC_CARD') {
        return {
          ...account,
          annualPercentageRateBps: 1200,
        };
      }

      if (account.id === 'PERSONAL_LOAN') {
        return {
          ...account,
          annualPercentageRateBps: 1800,
        };
      }

      return account;
    }),
  },
};

const profileWithoutEnquiries: FinancialProfile = {
  ...mahiProfile,
  bureau: {
    accounts: mahiProfile.bureau.accounts,
    ...(mahiProfile.bureau.creditScore !== undefined
      ? { creditScore: mahiProfile.bureau.creditScore }
      : {}),
  },
};

export const edgeScenarios: EdgeScenario[] = [
  {
    id: 'edge-1',
    description: 'Advice references an account that does not exist',
    profile: mahiProfile,
    proposal: {
      proposalId: 'edge-1',
      text: 'Pay ₹10,000 toward your Axis card.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'AXIS_CARD',
      amountPaise: 1_000_000,
      timing: 'NOW',
    },
    expectedDecision: 'BLOCK',
    expectedReasonCode: 'TARGET_ACCOUNT_NOT_FOUND',
  },

  {
    id: 'edge-2',
    description: 'Proposed payment exceeds known liquid savings',
    profile: completeLiquidityProfile,
    proposal: {
      proposalId: 'edge-2',
      text: 'Pay ₹30,000 toward HDFC.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 3_000_000,
      timing: 'NOW',
    },
    expectedDecision: 'MODIFY',
    expectedReasonCode: 'PAYMENT_EXCEEDS_AVAILABLE_LIQUIDITY',
  },

  {
    id: 'edge-3',
    description: 'Incorrect claimed utilisation is rejected',
    profile: mahiProfile,
    proposal: {
      proposalId: 'edge-3',
      text: 'Your HDFC card utilisation is 70%.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'HDFC_CARD',
      factualClaimKind: 'CARD_UTILIZATION',
      claimedUtilizationBps: 7000,
    },
    expectedDecision: 'BLOCK',
    expectedReasonCode: 'FACTUAL_CLAIM_MISMATCH',
  },

  {
    id: 'edge-4',
    description: 'Correct utilisation claim is allowed',
    profile: mahiProfile,
    proposal: {
      proposalId: 'edge-4',
      text: 'Your HDFC card utilisation is 92%.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'HDFC_CARD',
      factualClaimKind: 'CARD_UTILIZATION',
      claimedUtilizationBps: 9200,
    },
    expectedDecision: 'ALLOW',
    expectedReasonCode: '',
  },

  {
    id: 'edge-5',
    description: 'Debt priority is allowed when comparative rates support it',
    profile: profileWithDebtRates,
    proposal: {
      proposalId: 'edge-5',
      text: 'Prioritise HDFC before the personal loan.',
      type: 'DEBT_PRIORITY',
      targetAccountId: 'HDFC_CARD',
      secondaryAccountId: 'PERSONAL_LOAN',
    },
    expectedDecision: 'ALLOW',
    expectedReasonCode: '',
  },

  {
    id: 'edge-6',
    description: 'Debt priority is blocked when rates contradict it',
    profile: profileWithReverseDebtRates,
    proposal: {
      proposalId: 'edge-6',
      text: 'Prioritise HDFC before the personal loan.',
      type: 'DEBT_PRIORITY',
      targetAccountId: 'HDFC_CARD',
      secondaryAccountId: 'PERSONAL_LOAN',
    },
    expectedDecision: 'BLOCK',
    expectedReasonCode: 'DEBT_PRIORITY_NOT_SUPPORTED',
  },

  {
    id: 'edge-7',
    description: 'Behavioural judgment from balances alone is blocked',
    profile: mahiProfile,
    proposal: {
      proposalId: 'edge-7',
      text: 'You rely too heavily on credit cards.',
      type: 'SPENDING_ASSESSMENT',
    },
    expectedDecision: 'BLOCK',
    expectedReasonCode: 'UNSUPPORTED_BEHAVIOURAL_INFERENCE',
  },

  {
    id: 'edge-8',
    description: 'Credit application guidance asks for missing enquiry evidence',
    profile: profileWithoutEnquiries,
    proposal: {
      proposalId: 'edge-8',
      text: 'Avoid applying for another credit card right now.',
      type: 'CREDIT_APPLICATION_GUIDANCE',
    },
    expectedDecision: 'ASK_USER',
    expectedReasonCode: 'REQUIRED_EVIDENCE_MISSING',
  },
];
