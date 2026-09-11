import { Type, type Static } from '@sinclair/typebox';

import { AdviceProposalSchema } from './advice-proposal.schema.js';
import { FinancialProfileSchema } from './financial-profile.schema.js';

export const EvaluateAdviceRequestSchema = Type.Object(
  {
    profile: FinancialProfileSchema,
    proposal: AdviceProposalSchema,
  },
  { additionalProperties: false },
);

export type EvaluateAdviceRequest = Static<typeof EvaluateAdviceRequestSchema>;
