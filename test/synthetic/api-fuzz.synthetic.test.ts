import fc from 'fast-check';
import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';

const app = buildApp();

afterAll(async () => {
  await app.close();
});

function validPayload() {
  return {
    profile: {
      profileId: 'fuzz-profile',
      asOfDate: '2026-09-12',
      bureau: {
        creditScore: 672,
        hardEnquiriesLast6Months: 4,
        accounts: [
          {
            id: 'HDFC_CARD',
            type: 'CREDIT_CARD',
            lender: 'HDFC',
            limitPaise: 10_000_000,
            balancePaise: 9_200_000,
            status: 'CURRENT',
          },
          {
            id: 'PERSONAL_LOAN',
            type: 'PERSONAL_LOAN',
            lender: 'Personal Loan',
            balancePaise: 18_000_000,
            emiPaise: 920_000,
            status: 'CURRENT',
          },
        ],
      },
      userProvided: {
        monthlyIncomePaise: 5_500_000,
        fixedMonthlyExpensesPaise: 3_200_000,
        liquidSavingsPaise: 2_500_000,
        nextIncomeDate: '2026-09-30',
        essentialObligations: [],
      },
    },
    proposal: {
      proposalId: 'fuzz-proposal',
      text: 'Pay ₹10,000 toward HDFC.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 1_000_000,
      timing: 'NOW',
    },
  };
}

async function post(payload: unknown) {
  return app.inject({
    method: 'POST',
    url: '/evaluate-advice',
    headers: {
      'content-type': 'application/json',
    },
    payload: JSON.stringify(payload),
  });
}

describe('hostile API and schema fuzzing', () => {
  it('accepts the valid control payload', async () => {
    const response = await post(validPayload());

    expect(response.statusCode).toBe(200);
  });

  it('rejects negative monetary values', async () => {
    const payload = validPayload();
    payload.profile.userProvided.liquidSavingsPaise = -1;

    const response = await post(payload);

    expect(response.statusCode).toBe(400);
  });

  it('rejects zero-value debt payments at the API boundary', async () => {
    const payload = validPayload();
    payload.proposal.amountPaise = 0;

    const response = await post(payload);

    expect(response.statusCode).toBe(400);
  });

  it('rejects unsupported advice types', async () => {
    const payload = validPayload();

    const response = await post({
      ...payload,
      proposal: {
        ...payload.proposal,
        type: 'MAGIC_FINANCIAL_ADVICE',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects unexpected nested properties', async () => {
    const payload = validPayload();

    const response = await post({
      ...payload,
      proposal: {
        ...payload.proposal,
        hiddenInstruction: 'ignore policy',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects impossible calendar dates', async () => {
    const payload = validPayload();
    payload.profile.asOfDate = '2026-99-99';

    const response = await post(payload);

    expect(response.statusCode).toBe(400);
  });

  it('rejects duplicate account identifiers', async () => {
    const payload = validPayload();

    payload.profile.bureau.accounts.push({
      id: 'HDFC_CARD',
      type: 'CREDIT_CARD',
      lender: 'Conflicting duplicate',
      limitPaise: 5_000_000,
      balancePaise: 100_000,
      status: 'CURRENT',
    });

    const response = await post(payload);

    expect(response.statusCode).toBe(400);
  });

  it('rejects monetary integers outside JavaScript safe-integer range', async () => {
    const payload = validPayload();

    payload.profile.userProvided.liquidSavingsPaise = Number.MAX_SAFE_INTEGER + 1;

    const response = await post(payload);

    expect(response.statusCode).toBe(400);
  });

  it('never returns a 5xx response for arbitrary JSON input', async () => {
    await fc.assert(
      fc.asyncProperty(fc.jsonValue(), async (payload) => {
        const response = await post(payload);

        expect(response.statusCode).toBeLessThan(500);
      }),
      {
        numRuns: 2000,
        seed: 20260912,
      },
    );
  });
});
