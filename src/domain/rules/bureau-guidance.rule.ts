import { getEvidenceFact } from '../evidence/resolver.js';
import type { PolicyRule } from './types.js';

export const bureauGuidanceRule: PolicyRule = {
  id: 'BUREAU_GUIDANCE_BOUNDARY',

  evaluate({ proposal, evidence }) {
    if (proposal.type !== 'CREDIT_APPLICATION_GUIDANCE') {
      return {
        ruleId: 'BUREAU_GUIDANCE_BOUNDARY',
        status: 'PASS',
      };
    }

    const enquiries = getEvidenceFact<number>(evidence, 'bureau.hardEnquiriesLast6Months');

    if (enquiries?.state !== 'KNOWN' || enquiries.value === undefined) {
      return {
        ruleId: 'BUREAU_GUIDANCE_BOUNDARY',
        status: 'UNKNOWN',
        reasonCode: 'RECENT_ENQUIRIES_UNKNOWN',
        reason:
          'Recent hard enquiry information is required to support credit application guidance.',
        missingInformation: ['Hard enquiries in the last six months'],
      };
    }

    return {
      ruleId: 'BUREAU_GUIDANCE_BOUNDARY',
      status: 'FAIL',
      reasonCode: 'CATEGORICAL_APPLICATION_ADVICE_UNSUPPORTED',
      reason:
        'Recent enquiries can support caution, but they do not justify a categorical instruction not to apply for credit.',
      suggestedText:
        'You have had several recent credit enquiries, so another application may be worth considering carefully.',
    };
  },
};
