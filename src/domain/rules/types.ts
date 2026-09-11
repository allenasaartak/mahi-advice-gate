import type { AdviceProposal } from '../../schemas/advice-proposal.schema.js';
import type { FinancialProfile } from '../../schemas/financial-profile.schema.js';
import type { RuleResult } from '../types/decision.js';
import type { EvidenceCollection } from '../types/evidence.js';

export type RuleId =
  | 'EVIDENCE_GROUNDING'
  | 'PREDICTION_BOUNDARY'
  | 'ACCOUNT_VALIDITY'
  | 'LIQUIDITY_SUFFICIENCY'
  | 'OBLIGATION_PROTECTION'
  | 'DEBT_PRIORITY_EVIDENCE'
  | 'BUREAU_GUIDANCE_BOUNDARY'
  | 'INFERENCE_BOUNDARY'
  | 'EVIDENCE_CONFLICT';

export interface RuleContext {
  profile: FinancialProfile;
  proposal: AdviceProposal;
  evidence: EvidenceCollection;
}

export interface PolicyRule {
  id: RuleId;
  evaluate(context: RuleContext): RuleResult;
}
