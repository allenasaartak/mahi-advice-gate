import { Type, type Static } from '@sinclair/typebox';

export const DecisionSchema = Type.Union([
  Type.Literal('ALLOW'),
  Type.Literal('MODIFY'),
  Type.Literal('ASK_USER'),
  Type.Literal('BLOCK'),
]);

export const EvidenceTraceSchema = Type.Object(
  {
    key: Type.String({ minLength: 1 }),
    value: Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]),
    source: Type.Union([
      Type.Literal('BUREAU'),
      Type.Literal('USER_PROVIDED'),
      Type.Literal('DERIVED'),
      Type.Literal('SYSTEM'),
    ]),
  },
  { additionalProperties: false },
);

export const EvaluationResponseSchema = Type.Object(
  {
    decision: DecisionSchema,

    reasonCodes: Type.Array(Type.String({ minLength: 1 })),

    reason: Type.String({ minLength: 1 }),

    missingInformation: Type.Array(Type.String({ minLength: 1 })),

    evidence: Type.Array(EvidenceTraceSchema),

    suggestedModification: Type.Optional(
      Type.Object(
        {
          text: Type.Optional(Type.String({ minLength: 1 })),
          amountPaise: Type.Optional(Type.Integer({ minimum: 0 })),
        },
        { additionalProperties: false },
      ),
    ),

    questionForUser: Type.Optional(Type.String({ minLength: 1 })),

    policyVersion: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export type Decision = Static<typeof DecisionSchema>;
export type EvidenceTrace = Static<typeof EvidenceTraceSchema>;
export type EvaluationResponse = Static<typeof EvaluationResponseSchema>;
