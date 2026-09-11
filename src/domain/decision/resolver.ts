import { POLICY_VERSION } from '../../config/policy.config.js';
import type { EvaluationResponse } from '../../schemas/evaluation.schema.js';
import type { EvidenceCollection } from '../types/evidence.js';
import type { RuleResult } from '../types/decision.js';

const BLOCKING_REASON_CODES = new Set([
  'TARGET_ACCOUNT_NOT_FOUND',
  'SECONDARY_ACCOUNT_NOT_FOUND',
  'TARGET_ACCOUNT_CLOSED',
  'SECONDARY_ACCOUNT_CLOSED',
  'DEBT_PRIORITY_SAME_ACCOUNT',
  'UTILIZATION_REQUIRES_CREDIT_CARD',
  'NON_POSITIVE_PAYMENT_AMOUNT',
  'NO_OUTSTANDING_BALANCE',
  'UNSUPPORTED_BEHAVIOURAL_INFERENCE',
  'DEBT_PRIORITY_NOT_SUPPORTED',
]);

function buildEvidenceTrace(evidence: EvidenceCollection) {
  return Object.values(evidence.facts)
    .filter((fact) => fact.state === 'KNOWN' && fact.value !== undefined)
    .filter(
      (fact) =>
        typeof fact.value === 'string' ||
        typeof fact.value === 'number' ||
        typeof fact.value === 'boolean' ||
        fact.value === null,
    )
    .map((fact) => ({
      key: fact.key,
      value: fact.value as string | number | boolean | null,
      source: fact.source,
    }));
}

function collectReasonCodes(results: RuleResult[]): string[] {
  return [
    ...new Set(
      results
        .map((result) => result.reasonCode)
        .filter((code): code is string => code !== undefined),
    ),
  ];
}

function collectMissingInformation(results: RuleResult[]): string[] {
  return [...new Set(results.flatMap((result) => result.missingInformation ?? []))];
}

function buildQuestion(missing: string[]): string {
  if (missing.some((item) => item.toLowerCase().includes('essential obligation'))) {
    return 'Do you have any essential payments due before your next income?';
  }

  if (missing.some((item) => item.toLowerCase().includes('income'))) {
    return 'When do you expect your next reliable income?';
  }

  if (missing.some((item) => item.toLowerCase().includes('interest rate'))) {
    return 'What are the interest rates on the debts being compared?';
  }

  return `I need a little more information before validating this advice: ${missing.join(', ')}.`;
}

export function resolveDecision(
  results: RuleResult[],
  evidence: EvidenceCollection,
): EvaluationResponse {
  const evidenceTrace = buildEvidenceTrace(evidence);
  const reasonCodes = collectReasonCodes(results);
  const missingInformation = collectMissingInformation(results);

  const blockingFailure = results.find(
    (result) =>
      result.status === 'FAIL' &&
      result.reasonCode !== undefined &&
      BLOCKING_REASON_CODES.has(result.reasonCode),
  );

  if (blockingFailure) {
    return {
      decision: 'BLOCK',
      reasonCodes,
      reason:
        blockingFailure.reason ?? 'The proposed advice is not supported by the available evidence.',
      missingInformation,
      evidence: evidenceTrace,
      policyVersion: POLICY_VERSION,
    };
  }

  const unknownResults = results.filter((result) => result.status === 'UNKNOWN');

  if (unknownResults.length > 0) {
    return {
      decision: 'ASK_USER',
      reasonCodes,
      reason:
        unknownResults[0]?.reason ??
        'More information is required before this advice can be validated.',
      missingInformation,
      evidence: evidenceTrace,
      questionForUser: buildQuestion(missingInformation),
      policyVersion: POLICY_VERSION,
    };
  }

  const modifiableFailure = results.find(
    (result) =>
      result.status === 'FAIL' &&
      (result.suggestedAmountPaise !== undefined || result.suggestedText !== undefined),
  );

  if (modifiableFailure) {
    const suggestedModification: {
      text?: string;
      amountPaise?: number;
    } = {};

    if (modifiableFailure.suggestedText !== undefined) {
      suggestedModification.text = modifiableFailure.suggestedText;
    }

    if (modifiableFailure.suggestedAmountPaise !== undefined) {
      suggestedModification.amountPaise = modifiableFailure.suggestedAmountPaise;
    }

    return {
      decision: 'MODIFY',
      reasonCodes,
      reason:
        modifiableFailure.reason ??
        'The direction of the advice can be retained, but it requires modification.',
      missingInformation,
      evidence: evidenceTrace,
      suggestedModification,
      policyVersion: POLICY_VERSION,
    };
  }

  const remainingFailure = results.find((result) => result.status === 'FAIL');

  if (remainingFailure) {
    return {
      decision: 'BLOCK',
      reasonCodes,
      reason:
        remainingFailure.reason ??
        'The proposed advice is not supported by the available evidence.',
      missingInformation,
      evidence: evidenceTrace,
      policyVersion: POLICY_VERSION,
    };
  }

  return {
    decision: 'ALLOW',
    reasonCodes: [],
    reason:
      'The proposed advice is supported by the available evidence and passes all deterministic checks.',
    missingInformation: [],
    evidence: evidenceTrace,
    policyVersion: POLICY_VERSION,
  };
}
