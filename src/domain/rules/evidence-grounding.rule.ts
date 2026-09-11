import { getEvidenceContract } from '../contracts/evidence-contracts.js';
import { getEvidenceFact, isKnown } from '../evidence/resolver.js';
import type { PolicyRule } from './types.js';

export const evidenceGroundingRule: PolicyRule = {
  id: 'EVIDENCE_GROUNDING',

  evaluate({ proposal, evidence }) {
    if (proposal.type === 'FACTUAL_CLAIM') {
      if (!proposal.factualClaimKind) {
        return {
          ruleId: 'EVIDENCE_GROUNDING',
          status: 'FAIL',
          reasonCode: 'UNSTRUCTURED_FACTUAL_CLAIM',
          reason:
            'A factual claim must declare the specific fact being asserted so it can be checked deterministically.',
        };
      }

      if (proposal.factualClaimKind === 'CARD_UTILIZATION') {
        const utilization = getEvidenceFact<number>(evidence, 'derived.targetUtilizationBps');

        if (
          utilization?.state !== 'KNOWN' ||
          utilization.value === undefined ||
          proposal.claimedUtilizationBps === undefined
        ) {
          return {
            ruleId: 'EVIDENCE_GROUNDING',
            status: 'UNKNOWN',
            reasonCode: 'UTILIZATION_EVIDENCE_INCOMPLETE',
            reason:
              'Card utilisation cannot be validated without the calculated utilisation and claimed value.',
            missingInformation: ['Target card balance and limit', 'Claimed card utilisation'],
          };
        }

        if (utilization.value !== proposal.claimedUtilizationBps) {
          return {
            ruleId: 'EVIDENCE_GROUNDING',
            status: 'FAIL',
            reasonCode: 'FACTUAL_CLAIM_MISMATCH',
            reason:
              'The claimed card utilisation does not match the value derived from the available bureau data.',
          };
        }

        return {
          ruleId: 'EVIDENCE_GROUNDING',
          status: 'PASS',
        };
      }

      if (proposal.factualClaimKind === 'BALANCE_REDUCTION_LOWERS_UTILIZATION') {
        const utilization = getEvidenceFact<number>(evidence, 'derived.targetUtilizationBps');

        if (utilization?.state !== 'KNOWN' || utilization.value === undefined) {
          return {
            ruleId: 'EVIDENCE_GROUNDING',
            status: 'UNKNOWN',
            reasonCode: 'UTILIZATION_EVIDENCE_INCOMPLETE',
            reason:
              'The utilisation relationship cannot be validated without valid card balance and limit data.',
            missingInformation: ['Target card balance and limit'],
          };
        }

        return {
          ruleId: 'EVIDENCE_GROUNDING',
          status: 'PASS',
        };
      }
    }

    const contract = getEvidenceContract(proposal.type);

    const missingInformation = contract.requirements
      .filter((requirement) => requirement.required)
      .filter((requirement) => !isKnown(evidence, requirement.key))
      .map((requirement) => requirement.description);

    if (missingInformation.length === 0) {
      return {
        ruleId: 'EVIDENCE_GROUNDING',
        status: 'PASS',
      };
    }

    return {
      ruleId: 'EVIDENCE_GROUNDING',
      status: 'UNKNOWN',
      reasonCode: 'REQUIRED_EVIDENCE_MISSING',
      reason: 'The recommendation cannot be fully validated with the available evidence.',
      missingInformation,
    };
  },
};
