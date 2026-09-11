import type { Decision } from '../../schemas/evaluation.schema.js';
import type { EvidenceTrace } from '../../schemas/evaluation.schema.js';

export type RuleStatus = 'PASS' | 'FAIL' | 'UNKNOWN';

export interface RuleResult {
  ruleId: string;
  status: RuleStatus;
  reasonCode?: string;
  reason?: string;
  missingInformation?: string[];
  evidence?: EvidenceTrace[];
  suggestedAmountPaise?: number;
  suggestedText?: string;
}

export interface GateDecision {
  decision: Decision;
  reasonCodes: string[];
  reason: string;
  missingInformation: string[];
  evidence: EvidenceTrace[];
  suggestedModification?: {
    text?: string;
    amountPaise?: number;
  };
  questionForUser?: string;
}
