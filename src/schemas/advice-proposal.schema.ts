import { Type, type Static } from '@sinclair/typebox';

const MoneySchema = Type.Integer({ minimum: 0 });

export const AdviceTypeSchema = Type.Union([
  Type.Literal('FACTUAL_CLAIM'),
  Type.Literal('DEBT_PAYMENT'),
  Type.Literal('DEBT_PRIORITY'),
  Type.Literal('CREDIT_APPLICATION_GUIDANCE'),
  Type.Literal('CREDIT_SCORE_PREDICTION'),
  Type.Literal('SPENDING_ASSESSMENT'),
]);

export const FactualClaimKindSchema = Type.Union([
  Type.Literal('CARD_UTILIZATION'),
  Type.Literal('BALANCE_REDUCTION_LOWERS_UTILIZATION'),
]);

export const AdviceProposalSchema = Type.Object(
  {
    proposalId: Type.String({ minLength: 1 }),
    text: Type.String({ minLength: 1 }),
    type: AdviceTypeSchema,

    targetAccountId: Type.Optional(Type.String({ minLength: 1 })),
    secondaryAccountId: Type.Optional(Type.String({ minLength: 1 })),

    amountPaise: Type.Optional(MoneySchema),

    factualClaimKind: Type.Optional(FactualClaimKindSchema),

    claimedUtilizationBps: Type.Optional(Type.Integer({ minimum: 0, maximum: 100000 })),

    claimedScoreChangePoints: Type.Optional(Type.Integer({ minimum: -600, maximum: 600 })),

    utilizationThresholdBps: Type.Optional(Type.Integer({ minimum: 0, maximum: 10000 })),

    timing: Type.Optional(
      Type.Union([
        Type.Literal('NOW'),
        Type.Literal('THIS_WEEK'),
        Type.Literal('THIS_MONTH'),
        Type.Literal('BEFORE_NEXT_INCOME'),
        Type.Literal('UNSPECIFIED'),
      ]),
    ),
  },
  { additionalProperties: false },
);

export type AdviceType = Static<typeof AdviceTypeSchema>;
export type FactualClaimKind = Static<typeof FactualClaimKindSchema>;
export type AdviceProposal = Static<typeof AdviceProposalSchema>;
