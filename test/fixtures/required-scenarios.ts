import type { AdviceProposal } from '../../src/schemas/advice-proposal.schema.js';
import type { Decision } from '../../src/schemas/evaluation.schema.js';
import type { FinancialProfile } from '../../src/schemas/financial-profile.schema.js';
import { mahiProfile } from './mahi-profile.js';

export interface RequiredScenario {
  id: string;
  description: string;
  profile: FinancialProfile;
  proposal: AdviceProposal;
  expectedDecision: Decision;
}

const profileWithKnownSchoolFees: FinancialProfile = {
  ...mahiProfile,
  userProvided: {
    ...mahiProfile.userProvided,
    essentialObligations: [
      {
        id: 'school-fees',
        description: "Daughter's school fees",
        amountPaise: 1_500_000,
        dueDate: '2026-09-18',
        category: 'EDUCATION',
      },
    ],
  },
};

export const requiredScenarios: RequiredScenario[] = [
  {
    id: 'scenario-1',
    description: 'HDFC utilisation is 92% and reducing the balance reduces utilisation',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-1',
      text: 'Your HDFC card is at 92% utilisation. Bringing that balance down would reduce your utilisation.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'HDFC_CARD',
      factualClaimKind: 'CARD_UTILIZATION',
      claimedUtilizationBps: 9200,
    },
    expectedDecision: 'ALLOW',
  },

  {
    id: 'scenario-2',
    description: 'Prioritise HDFC card over personal loan',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-2',
      text: 'Pay your HDFC card before your personal loan.',
      type: 'DEBT_PRIORITY',
      targetAccountId: 'HDFC_CARD',
      secondaryAccountId: 'PERSONAL_LOAN',
    },
    expectedDecision: 'ASK_USER',
  },

  {
    id: 'scenario-3',
    description: 'Pay ₹20,000 toward HDFC this month',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-3',
      text: 'Pay ₹20,000 toward HDFC this month.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 2_000_000,
      timing: 'THIS_MONTH',
    },
    expectedDecision: 'ASK_USER',
  },

  {
    id: 'scenario-4',
    description: 'Do not apply for another card after four enquiries',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-4',
      text: "Don't apply for another credit card right now. You've already had four enquiries recently.",
      type: 'CREDIT_APPLICATION_GUIDANCE',
    },
    expectedDecision: 'MODIFY',
  },

  {
    id: 'scenario-5',
    description: 'Predict a 30-point credit score improvement',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-5',
      text: 'Your credit score should improve by around 30 points if you reduce HDFC utilisation below 30%.',
      type: 'CREDIT_SCORE_PREDICTION',
      targetAccountId: 'HDFC_CARD',
      claimedScoreChangePoints: 30,
      utilizationThresholdBps: 3000,
    },
    expectedDecision: 'MODIFY',
  },

  {
    id: 'scenario-6',
    description: 'Use ₹20,000 of ₹25,000 savings to pay HDFC',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-6',
      text: 'Yes. Put ₹20,000 toward HDFC.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 2_000_000,
      timing: 'NOW',
    },
    expectedDecision: 'ASK_USER',
  },

  {
    id: 'scenario-7',
    description: 'Use ₹20,000 of savings despite ₹15,000 school fees due next week',
    profile: profileWithKnownSchoolFees,
    proposal: {
      proposalId: 'scenario-7',
      text: 'Yes. Put ₹20,000 toward HDFC.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 2_000_000,
      timing: 'NOW',
    },
    expectedDecision: 'ASK_USER',
  },

  {
    id: 'scenario-8',
    description: 'Infer excessive spending from card balances',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-8',
      text: "You're spending too much on credit cards.",
      type: 'SPENDING_ASSESSMENT',
    },
    expectedDecision: 'BLOCK',
  },
];
