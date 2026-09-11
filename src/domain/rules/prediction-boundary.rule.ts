import type { PolicyRule } from './types.js';

export const predictionBoundaryRule: PolicyRule = {
  id: 'PREDICTION_BOUNDARY',

  evaluate({ proposal }) {
    const isExactScorePrediction =
      proposal.type === 'CREDIT_SCORE_PREDICTION' ||
      proposal.claimedScoreChangePoints !== undefined;

    if (!isExactScorePrediction) {
      return {
        ruleId: 'PREDICTION_BOUNDARY',
        status: 'PASS',
      };
    }

    return {
      ruleId: 'PREDICTION_BOUNDARY',
      status: 'FAIL',
      reasonCode: 'UNSUPPORTED_CREDIT_SCORE_PREDICTION',
      reason: 'The available evidence cannot support a specific future credit score change.',
      suggestedText:
        'Reducing high credit utilisation may help your credit profile, but the exact score impact cannot be predicted.',
    };
  },
};
