import type { EvaluationResponse } from '../../src/schemas/evaluation.schema.js';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';

describe('Advice Gate API', () => {
  const apps: ReturnType<typeof buildApp>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  function createApp() {
    const app = buildApp();
    apps.push(app);
    return app;
  }

  it('returns healthy status', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
    });
  });

  it('evaluates valid financial advice', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate-advice',
      payload: {
        profile: {
          profileId: 'api-profile',
          asOfDate: '2026-09-11',
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
            ],
          },
          userProvided: {
            monthlyIncomePaise: 5_500_000,
            fixedMonthlyExpensesPaise: 3_200_000,
            liquidSavingsPaise: 2_500_000,
          },
        },
        proposal: {
          proposalId: 'api-proposal',
          text: 'Your HDFC card utilisation is 92%.',
          type: 'FACTUAL_CLAIM',
          targetAccountId: 'HDFC_CARD',
          factualClaimKind: 'CARD_UTILIZATION',
          claimedUtilizationBps: 9200,
        },
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<EvaluationResponse>();

    expect(body.decision).toBe('ALLOW');
    expect(body.policyVersion).toBe('1.0.0');
  });

  it('rejects malformed requests before policy evaluation', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate-advice',
      payload: {
        profile: {
          profileId: 'invalid-profile',
        },
        proposal: {
          text: 'Pay ₹20,000.',
        },
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects unexpected request properties', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate-advice',
      payload: {
        unexpected: true,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
