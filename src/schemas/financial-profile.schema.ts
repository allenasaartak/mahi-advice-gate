import { Type, type Static } from '@sinclair/typebox';

const MoneySchema = Type.Integer({
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
});

const DateSchema = Type.String({
  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
});

const AccountStatusSchema = Type.Union([
  Type.Literal('CURRENT'),
  Type.Literal('OVERDUE'),
  Type.Literal('CLOSED'),
]);

const CreditCardSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    type: Type.Literal('CREDIT_CARD'),
    lender: Type.String({ minLength: 1 }),
    limitPaise: MoneySchema,
    balancePaise: MoneySchema,
    status: AccountStatusSchema,
    minimumDuePaise: Type.Optional(MoneySchema),
    dueDate: Type.Optional(DateSchema),
    annualPercentageRateBps: Type.Optional(Type.Integer({ minimum: 0, maximum: 100000 })),
  },
  { additionalProperties: false },
);

const PersonalLoanSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    type: Type.Literal('PERSONAL_LOAN'),
    lender: Type.String({ minLength: 1 }),
    balancePaise: MoneySchema,
    emiPaise: MoneySchema,
    status: AccountStatusSchema,
    dueDate: Type.Optional(DateSchema),
    annualPercentageRateBps: Type.Optional(Type.Integer({ minimum: 0, maximum: 100000 })),
    prepaymentPenaltyPaise: Type.Optional(MoneySchema),
  },
  { additionalProperties: false },
);

export const CreditAccountSchema = Type.Union([CreditCardSchema, PersonalLoanSchema]);

export const EssentialObligationSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    amountPaise: MoneySchema,
    dueDate: DateSchema,
    category: Type.Union([
      Type.Literal('HOUSING'),
      Type.Literal('EDUCATION'),
      Type.Literal('HEALTHCARE'),
      Type.Literal('DEBT_PAYMENT'),
      Type.Literal('BUSINESS'),
      Type.Literal('HOUSEHOLD'),
      Type.Literal('OTHER'),
    ]),
  },
  { additionalProperties: false },
);

export const FinancialProfileSchema = Type.Object(
  {
    profileId: Type.String({ minLength: 1 }),
    asOfDate: DateSchema,

    bureau: Type.Object(
      {
        creditScore: Type.Optional(Type.Integer({ minimum: 300, maximum: 900 })),
        hardEnquiriesLast6Months: Type.Optional(Type.Integer({ minimum: 0 })),
        accounts: Type.Array(CreditAccountSchema),
      },
      { additionalProperties: false },
    ),

    userProvided: Type.Object(
      {
        monthlyIncomePaise: Type.Optional(MoneySchema),
        fixedMonthlyExpensesPaise: Type.Optional(MoneySchema),
        liquidSavingsPaise: Type.Optional(MoneySchema),
        nextIncomeDate: Type.Optional(DateSchema),
        essentialObligations: Type.Optional(Type.Array(EssentialObligationSchema)),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export type CreditAccount = Static<typeof CreditAccountSchema>;
export type EssentialObligation = Static<typeof EssentialObligationSchema>;
export type FinancialProfile = Static<typeof FinancialProfileSchema>;
