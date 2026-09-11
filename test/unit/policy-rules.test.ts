import { describe, expect, it } from 'vitest';

import { resolveEvidence } from '../../src/domain/evidence/resolver.js';
import { accountValidityRule } from '../../src/domain/rules/account-validity.rule.js';
import { bureauGuidanceRule } from '../../src/domain/rules/bureau-guidance.rule.js';
import { debtPriorityRule } from '../../src/domain/rules/debt-priority.rule.js';
import { evidenceConflictRule } from '../../src/domain/rules/evidence-conflict.rule.js';
import { evidenceGroundingRule } from '../../src/domain/rules/evidence-grounding.rule.js';
import { inferenceBoundaryRule } from '../../src/domain/rules/inference-boundary.rule.js';
import { liquidityRule } from '../../src/domain/rules/liquidity.rule.js';
import { obligationProtectionRule } from '../../src/domain/rules/obligation-protection.rule.js';
import { predictionBoundaryRule } from '../../src/domain/rules/prediction-boundary.rule.js';
import type { AdviceProposal } from '../../src/schemas/advice-proposal.schema.js';
import type { FinancialProfile } from '../../src/schemas/financial-profile.schema.js';
import { mahiProfile } from '../fixtures/mahi-profile.js';

function context(profile: FinancialProfile, proposal: AdviceProposal) {
  return {
    profile,
    proposal,
    evidence: resolveEvidence(profile, proposal),
  };
}

describe('policy rules', () => {
  it('blocks advice referencing a missing account', () => {
    const proposal: AdviceProposal = {
      proposalId: 'missing-account',
      text: 'Pay your Axis card.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'AXIS_CARD',
      amountPaise: 500_000,
    };

    const result = accountValidityRule.evaluate(context(mahiProfile, proposal));

    expect(result.status).toBe('FAIL');
    expect(result.reasonCode).toBe('TARGET_ACCOUNT_NOT_FOUND');
  });

  it('rejects exact score predictions', () => {
    const proposal: AdviceProposal = {
      proposalId: 'score-prediction',
      text: 'Your score will improve by 30 points.',
      type: 'CREDIT_SCORE_PREDICTION',
      claimedScoreChangePoints: 30,
    };

    const result = predictionBoundaryRule.evaluate(context(mahiProfile, proposal));

    expect(result.status).toBe('FAIL');
    expect(result.reasonCode).toBe('UNSUPPORTED_CREDIT_SCORE_PREDICTION');
  });

  it('rejects unsupported spending inference', () => {
    const proposal: AdviceProposal = {
      proposalId: 'spending-inference',
      text: "You're spending too much on credit cards.",
      type: 'SPENDING_ASSESSMENT',
    };

    const result = inferenceBoundaryRule.evaluate(context(mahiProfile, proposal));

    expect(result.status).toBe('FAIL');
    expect(result.reasonCode).toBe('UNSUPPORTED_BEHAVIOURAL_INFERENCE');
  });

  it('flags payment above known savings', () => {
    const profile: FinancialProfile = {
      ...mahiProfile,
      userProvided: {
        ...mahiProfile.userProvided,
        nextIncomeDate: '2026-09-30',
        essentialObligations: [],
      },
    };

    const proposal: AdviceProposal = {
      proposalId: 'over-liquidity',
      text: 'Pay ₹30,000 toward HDFC.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 3_000_000,
    };

    const result = liquidityRule.evaluate(context(profile, proposal));

    expect(result.status).toBe('FAIL');
    expect(result.reasonCode).toBe('PAYMENT_EXCEEDS_AVAILABLE_LIQUIDITY');
  });

  it('protects known essential obligations', () => {
    const profile: FinancialProfile = {
      ...mahiProfile,
      userProvided: {
        ...mahiProfile.userProvided,
        nextIncomeDate: '2026-09-30',
        essentialObligations: [
          {
            id: 'school-fee',
            description: 'School fee',
            amountPaise: 1_500_000,
            dueDate: '2026-09-18',
            category: 'EDUCATION',
          },
        ],
      },
    };

    const proposal: AdviceProposal = {
      proposalId: 'obligation-conflict',
      text: 'Pay ₹20,000 toward HDFC.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 2_000_000,
    };

    const result = obligationProtectionRule.evaluate(context(profile, proposal));

    expect(result.status).toBe('FAIL');
    expect(result.reasonCode).toBe('PAYMENT_CONFLICTS_WITH_ESSENTIAL_OBLIGATION');
    expect(result.suggestedAmountPaise).toBe(1_000_000);
  });

  it('requires comparative debt evidence before prioritising debt', () => {
    const proposal: AdviceProposal = {
      proposalId: 'debt-priority',
      text: 'Pay HDFC before the personal loan.',
      type: 'DEBT_PRIORITY',
      targetAccountId: 'HDFC_CARD',
      secondaryAccountId: 'PERSONAL_LOAN',
    };

    const result = debtPriorityRule.evaluate(context(mahiProfile, proposal));

    expect(result.status).toBe('UNKNOWN');
    expect(result.reasonCode).toBe('DEBT_PRIORITY_EVIDENCE_MISSING');
  });

  it('modifies categorical credit-application guidance', () => {
    const proposal: AdviceProposal = {
      proposalId: 'application-guidance',
      text: "Don't apply for another credit card.",
      type: 'CREDIT_APPLICATION_GUIDANCE',
    };

    const result = bureauGuidanceRule.evaluate(context(mahiProfile, proposal));

    expect(result.status).toBe('FAIL');
    expect(result.reasonCode).toBe('CATEGORICAL_APPLICATION_ADVICE_UNSUPPORTED');
    expect(result.suggestedText).toBeTruthy();
  });

  it('rejects an incorrect factual utilisation claim', () => {
    const proposal: AdviceProposal = {
      proposalId: 'wrong-utilisation',
      text: 'Your HDFC utilisation is 70%.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'HDFC_CARD',
      factualClaimKind: 'CARD_UTILIZATION',
      claimedUtilizationBps: 7000,
    };

    const result = evidenceGroundingRule.evaluate(context(mahiProfile, proposal));

    expect(result.status).toBe('FAIL');
    expect(result.reasonCode).toBe('FACTUAL_CLAIM_MISMATCH');
  });

  it('rejects an unstructured factual claim', () => {
    const proposal: AdviceProposal = {
      proposalId: 'unstructured-fact',
      text: 'Your financial situation looks risky.',
      type: 'FACTUAL_CLAIM',
    };

    const result = evidenceGroundingRule.evaluate(context(mahiProfile, proposal));

    expect(result.status).toBe('FAIL');
    expect(result.reasonCode).toBe('UNSTRUCTURED_FACTUAL_CLAIM');
  });

  it('allows a supported balance-reduction utilisation fact', () => {
    const proposal: AdviceProposal = {
      proposalId: 'utilisation-direction',
      text: 'Reducing your HDFC balance would reduce its utilisation.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'HDFC_CARD',
      factualClaimKind: 'BALANCE_REDUCTION_LOWERS_UTILIZATION',
    };

    const result = evidenceGroundingRule.evaluate(context(mahiProfile, proposal));

    expect(result.status).toBe('PASS');
  });

  it('detects conflicting evidence', () => {
    const proposal: AdviceProposal = {
      proposalId: 'conflict-test',
      text: 'Your HDFC card utilisation is 92%.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'HDFC_CARD',
      factualClaimKind: 'CARD_UTILIZATION',
      claimedUtilizationBps: 9200,
    };

    const ruleContext = context(mahiProfile, proposal);

    ruleContext.evidence.facts['synthetic.conflict'] = {
      key: 'synthetic.conflict',
      state: 'CONFLICTING',
      source: 'SYSTEM',
    };

    const result = evidenceConflictRule.evaluate(ruleContext);

    expect(result.status).toBe('UNKNOWN');
    expect(result.reasonCode).toBe('CONFLICTING_EVIDENCE');
  });

  it('passes when no conflicting evidence exists', () => {
    const proposal: AdviceProposal = {
      proposalId: 'no-conflict-test',
      text: 'Your HDFC card utilisation is 92%.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'HDFC_CARD',
      factualClaimKind: 'CARD_UTILIZATION',
      claimedUtilizationBps: 9200,
    };

    const result = evidenceConflictRule.evaluate(context(mahiProfile, proposal));

    expect(result.status).toBe('PASS');
  });
});
