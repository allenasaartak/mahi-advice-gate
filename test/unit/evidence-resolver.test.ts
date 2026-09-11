import { describe, expect, it } from 'vitest';

import { getEvidenceFact, resolveEvidence } from '../../src/domain/evidence/resolver.js';
import type { AdviceProposal } from '../../src/schemas/advice-proposal.schema.js';
import { mahiProfile } from '../fixtures/mahi-profile.js';

const paymentProposal: AdviceProposal = {
  proposalId: 'proposal-001',
  text: 'Pay ₹20,000 toward HDFC this month.',
  type: 'DEBT_PAYMENT',
  targetAccountId: 'HDFC_CARD',
  amountPaise: 2_000_000,
  timing: 'THIS_MONTH',
};

describe('evidence resolver', () => {
  it('resolves known HDFC utilisation', () => {
    const evidence = resolveEvidence(mahiProfile, paymentProposal);

    const utilization = getEvidenceFact<number>(evidence, 'derived.targetUtilizationBps');

    expect(utilization?.state).toBe('KNOWN');
    expect(utilization?.value).toBe(9200);
  });

  it('marks next income date as unknown', () => {
    const evidence = resolveEvidence(mahiProfile, paymentProposal);

    const nextIncomeDate = getEvidenceFact<string>(evidence, 'user.nextIncomeDate');

    expect(nextIncomeDate?.state).toBe('UNKNOWN');
  });

  it('marks essential obligations as not explicitly known', () => {
    const evidence = resolveEvidence(mahiProfile, paymentProposal);

    const obligationsKnown = getEvidenceFact<boolean>(evidence, 'user.essentialObligationsKnown');

    expect(obligationsKnown?.state).toBe('KNOWN');
    expect(obligationsKnown?.value).toBe(false);
  });

  it('confirms the target account exists', () => {
    const evidence = resolveEvidence(mahiProfile, paymentProposal);

    const targetExists = getEvidenceFact<boolean>(evidence, 'proposal.targetAccountExists');

    expect(targetExists?.value).toBe(true);
  });
});
