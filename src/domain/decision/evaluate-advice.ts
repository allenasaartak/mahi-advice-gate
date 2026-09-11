import { POLICY_LIMITS } from '../../config/policy.config.js';
import type { AdviceProposal } from '../../schemas/advice-proposal.schema.js';
import type { EvaluationResponse } from '../../schemas/evaluation.schema.js';
import type { FinancialProfile } from '../../schemas/financial-profile.schema.js';
import { resolveEvidence } from '../evidence/resolver.js';
import { accountValidityRule } from '../rules/account-validity.rule.js';
import { bureauGuidanceRule } from '../rules/bureau-guidance.rule.js';
import { debtPriorityRule } from '../rules/debt-priority.rule.js';
import { evidenceConflictRule } from '../rules/evidence-conflict.rule.js';
import { evidenceGroundingRule } from '../rules/evidence-grounding.rule.js';
import { inferenceBoundaryRule } from '../rules/inference-boundary.rule.js';
import { liquidityRule } from '../rules/liquidity.rule.js';
import { obligationProtectionRule } from '../rules/obligation-protection.rule.js';
import { predictionBoundaryRule } from '../rules/prediction-boundary.rule.js';
import type { PolicyRule } from '../rules/types.js';
import { resolveDecision } from './resolver.js';

const policyRules: PolicyRule[] = [
  accountValidityRule,
  evidenceConflictRule,
  evidenceGroundingRule,
  predictionBoundaryRule,
  liquidityRule,
  obligationProtectionRule,
  debtPriorityRule,
  bureauGuidanceRule,
  inferenceBoundaryRule,
];

if (policyRules.length > POLICY_LIMITS.maxDeterministicRules) {
  throw new Error(
    `Policy rule limit exceeded: ${policyRules.length}/${POLICY_LIMITS.maxDeterministicRules}`,
  );
}

export function evaluateAdvice(
  profile: FinancialProfile,
  proposal: AdviceProposal,
): EvaluationResponse {
  const evidence = resolveEvidence(profile, proposal);

  const context = {
    profile,
    proposal,
    evidence,
  };

  const results = policyRules.map((rule) => rule.evaluate(context));

  return resolveDecision(results, evidence);
}

export function getPolicyRuleCount(): number {
  return policyRules.length;
}
