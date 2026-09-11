import type { PolicyRule } from './types.js';

export const evidenceConflictRule: PolicyRule = {
  id: 'EVIDENCE_CONFLICT',

  evaluate({ evidence }) {
    const conflictingFacts = Object.values(evidence.facts).filter(
      (fact) => fact.state === 'CONFLICTING',
    );

    if (conflictingFacts.length === 0) {
      return {
        ruleId: 'EVIDENCE_CONFLICT',
        status: 'PASS',
      };
    }

    return {
      ruleId: 'EVIDENCE_CONFLICT',
      status: 'UNKNOWN',
      reasonCode: 'CONFLICTING_EVIDENCE',
      reason:
        'Conflicting financial information must be resolved before the recommendation can be validated.',
      missingInformation: conflictingFacts.map(
        (fact) => `Resolve conflicting value for ${fact.key}`,
      ),
    };
  },
};
