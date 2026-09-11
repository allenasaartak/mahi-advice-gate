import type { AdviceType } from '../../schemas/advice-proposal.schema.js';

export interface EvidenceRequirement {
  key: string;
  description: string;
  required: boolean;
}

export interface EvidenceContract {
  adviceType: AdviceType;
  requirements: EvidenceRequirement[];
}

export const evidenceContracts: Record<AdviceType, EvidenceContract> = {
  FACTUAL_CLAIM: {
    adviceType: 'FACTUAL_CLAIM',
    requirements: [],
  },

  DEBT_PAYMENT: {
    adviceType: 'DEBT_PAYMENT',
    requirements: [
      {
        key: 'proposal.targetAccountExists',
        description: 'Target account must exist',
        required: true,
      },
      {
        key: 'targetAccount.balancePaise',
        description: 'Current target account balance is required',
        required: true,
      },
      {
        key: 'proposal.amountPaise',
        description: 'Proposed payment amount is required',
        required: true,
      },
      {
        key: 'user.liquidSavingsPaise',
        description: 'Available liquid savings are required',
        required: true,
      },
      {
        key: 'user.essentialObligationsKnown',
        description: 'Near-term essential obligations must be known',
        required: true,
      },
      {
        key: 'user.nextIncomeDate',
        description: 'Next income timing is required for affordability checks',
        required: true,
      },
    ],
  },

  DEBT_PRIORITY: {
    adviceType: 'DEBT_PRIORITY',
    requirements: [
      {
        key: 'proposal.targetAccountExists',
        description: 'Primary debt account must exist',
        required: true,
      },
      {
        key: 'secondaryAccount.exists',
        description: 'Comparison debt account must exist',
        required: true,
      },
      {
        key: 'targetAccount.annualPercentageRateBps',
        description: 'Primary debt interest rate is required',
        required: true,
      },
      {
        key: 'secondaryAccount.annualPercentageRateBps',
        description: 'Comparison debt interest rate is required',
        required: true,
      },
    ],
  },

  CREDIT_APPLICATION_GUIDANCE: {
    adviceType: 'CREDIT_APPLICATION_GUIDANCE',
    requirements: [
      {
        key: 'bureau.hardEnquiriesLast6Months',
        description: 'Recent hard enquiry count is required',
        required: true,
      },
    ],
  },

  CREDIT_SCORE_PREDICTION: {
    adviceType: 'CREDIT_SCORE_PREDICTION',
    requirements: [
      {
        key: 'bureau.creditScore',
        description: 'Current credit score is required',
        required: true,
      },
    ],
  },

  SPENDING_ASSESSMENT: {
    adviceType: 'SPENDING_ASSESSMENT',
    requirements: [],
  },
};

export function getEvidenceContract(adviceType: AdviceType): EvidenceContract {
  return evidenceContracts[adviceType];
}
