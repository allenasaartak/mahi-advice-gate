import { describe, expect, it } from 'vitest';

import { resolveDecision } from '../../src/domain/decision/resolver.js';
import type { RuleResult } from '../../src/domain/types/decision.js';
import type { EvidenceCollection } from '../../src/domain/types/evidence.js';

const emptyEvidence: EvidenceCollection = {
  facts: {},
};

describe('decision resolver precedence', () => {
  it('returns BLOCK when a blocking failure exists', () => {
    const results: RuleResult[] = [
      {
        ruleId: 'ACCOUNT_VALIDITY',
        status: 'FAIL',
        reasonCode: 'TARGET_ACCOUNT_NOT_FOUND',
        reason: 'Target account not found.',
      },
      {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'UNKNOWN',
        reasonCode: 'LIQUID_SAVINGS_UNKNOWN',
        reason: 'Savings are unknown.',
        missingInformation: ['Available liquid savings'],
      },
    ];

    const result = resolveDecision(results, emptyEvidence);

    expect(result.decision).toBe('BLOCK');
  });

  it('returns ASK_USER before MODIFY when critical evidence is missing', () => {
    const results: RuleResult[] = [
      {
        ruleId: 'OBLIGATION_PROTECTION',
        status: 'UNKNOWN',
        reasonCode: 'ESSENTIAL_OBLIGATIONS_UNKNOWN',
        reason: 'Essential obligations are unknown.',
        missingInformation: ['Upcoming essential obligations'],
      },
      {
        ruleId: 'LIQUIDITY_SUFFICIENCY',
        status: 'FAIL',
        reasonCode: 'PAYMENT_EXCEEDS_AVAILABLE_LIQUIDITY',
        reason: 'Payment exceeds available liquidity.',
        suggestedAmountPaise: 1_000_000,
      },
    ];

    const result = resolveDecision(results, emptyEvidence);

    expect(result.decision).toBe('ASK_USER');
  });

  it('returns MODIFY when a safe correction exists and nothing higher priority applies', () => {
    const results: RuleResult[] = [
      {
        ruleId: 'BUREAU_GUIDANCE_BOUNDARY',
        status: 'FAIL',
        reasonCode: 'CATEGORICAL_APPLICATION_ADVICE_UNSUPPORTED',
        reason: 'The wording is too categorical.',
        suggestedText: 'Consider another application carefully.',
      },
    ];

    const result = resolveDecision(results, emptyEvidence);

    expect(result.decision).toBe('MODIFY');
    expect(result.suggestedModification?.text).toBe('Consider another application carefully.');
  });

  it('returns ALLOW when all rules pass', () => {
    const results: RuleResult[] = [
      {
        ruleId: 'ACCOUNT_VALIDITY',
        status: 'PASS',
      },
      {
        ruleId: 'EVIDENCE_GROUNDING',
        status: 'PASS',
      },
    ];

    const result = resolveDecision(results, emptyEvidence);

    expect(result.decision).toBe('ALLOW');
  });
});
