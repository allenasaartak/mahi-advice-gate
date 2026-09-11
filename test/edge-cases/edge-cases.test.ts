import { describe, expect, it } from 'vitest';

import { evaluateAdvice } from '../../src/domain/decision/evaluate-advice.js';
import { edgeScenarios } from '../fixtures/edge-scenarios.js';

describe('independent advice gate edge cases', () => {
  for (const scenario of edgeScenarios) {
    it(`${scenario.id}: ${scenario.description}`, () => {
      const result = evaluateAdvice(scenario.profile, scenario.proposal);

      expect(result.decision).toBe(scenario.expectedDecision);

      if (scenario.expectedReasonCode) {
        expect(result.reasonCodes).toContain(scenario.expectedReasonCode);
      }
    });
  }
});
