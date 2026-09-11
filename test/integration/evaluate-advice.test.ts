import { describe, expect, it } from 'vitest';

import { evaluateAdvice } from '../../src/domain/decision/evaluate-advice.js';
import { requiredScenarios } from '../fixtures/required-scenarios.js';

describe('required Mahila Money scenarios', () => {
  for (const scenario of requiredScenarios) {
    it(`${scenario.id}: ${scenario.description}`, () => {
      const result = evaluateAdvice(scenario.profile, scenario.proposal);

      expect(result.decision).toBe(scenario.expectedDecision);

      expect(result.reason).toBeTruthy();
      expect(result.policyVersion).toBe('1.0.0');
      expect(result.evidence.length).toBeGreaterThan(0);
    });
  }
});
