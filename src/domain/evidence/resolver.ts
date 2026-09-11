import type { AdviceProposal } from '../../schemas/advice-proposal.schema.js';
import type { FinancialProfile } from '../../schemas/financial-profile.schema.js';
import type { EvidenceCollection, EvidenceFact } from '../types/evidence.js';
import {
  calculateMonthlyNetAfterFixedExpenses,
  findAccount,
  getCreditCardUtilization,
  sumEssentialObligations,
} from './derived-facts.js';

function known<T>(
  key: string,
  value: T,
  source: EvidenceFact<T>['source'],
  asOf?: string,
): EvidenceFact<T> {
  return {
    key,
    state: 'KNOWN',
    value,
    source,
    ...(asOf ? { asOf } : {}),
  };
}

function unknown<T>(key: string, source: EvidenceFact<T>['source']): EvidenceFact<T> {
  return {
    key,
    state: 'UNKNOWN',
    source,
  };
}

function addAccountEvidence(
  facts: Record<string, EvidenceFact<unknown>>,
  prefix: 'targetAccount' | 'secondaryAccount',
  profile: FinancialProfile,
  accountId: string,
): void {
  const account = findAccount(profile, accountId);

  facts[`${prefix}.exists`] = known(`${prefix}.exists`, account !== undefined, 'DERIVED');

  if (!account) {
    return;
  }

  facts[`${prefix}.id`] = known(`${prefix}.id`, account.id, 'BUREAU', profile.asOfDate);

  facts[`${prefix}.type`] = known(`${prefix}.type`, account.type, 'BUREAU', profile.asOfDate);

  facts[`${prefix}.balancePaise`] = known(
    `${prefix}.balancePaise`,
    account.balancePaise,
    'BUREAU',
    profile.asOfDate,
  );

  facts[`${prefix}.status`] = known(`${prefix}.status`, account.status, 'BUREAU', profile.asOfDate);

  facts[`${prefix}.annualPercentageRateBps`] =
    account.annualPercentageRateBps !== undefined
      ? known(
          `${prefix}.annualPercentageRateBps`,
          account.annualPercentageRateBps,
          'BUREAU',
          profile.asOfDate,
        )
      : unknown(`${prefix}.annualPercentageRateBps`, 'BUREAU');

  if (prefix === 'targetAccount') {
    const utilization = getCreditCardUtilization(account);

    facts['derived.targetUtilizationBps'] =
      utilization !== undefined
        ? known('derived.targetUtilizationBps', utilization.utilizationBps, 'DERIVED')
        : unknown('derived.targetUtilizationBps', 'DERIVED');
  }
}

export function resolveEvidence(
  profile: FinancialProfile,
  proposal: AdviceProposal,
): EvidenceCollection {
  const facts: Record<string, EvidenceFact<unknown>> = {};

  facts['profile.asOfDate'] = known(
    'profile.asOfDate',
    profile.asOfDate,
    'SYSTEM',
    profile.asOfDate,
  );

  facts['bureau.creditScore'] =
    profile.bureau.creditScore !== undefined
      ? known('bureau.creditScore', profile.bureau.creditScore, 'BUREAU', profile.asOfDate)
      : unknown('bureau.creditScore', 'BUREAU');

  facts['bureau.hardEnquiriesLast6Months'] =
    profile.bureau.hardEnquiriesLast6Months !== undefined
      ? known(
          'bureau.hardEnquiriesLast6Months',
          profile.bureau.hardEnquiriesLast6Months,
          'BUREAU',
          profile.asOfDate,
        )
      : unknown('bureau.hardEnquiriesLast6Months', 'BUREAU');

  facts['user.monthlyIncomePaise'] =
    profile.userProvided.monthlyIncomePaise !== undefined
      ? known('user.monthlyIncomePaise', profile.userProvided.monthlyIncomePaise, 'USER_PROVIDED')
      : unknown('user.monthlyIncomePaise', 'USER_PROVIDED');

  facts['user.fixedMonthlyExpensesPaise'] =
    profile.userProvided.fixedMonthlyExpensesPaise !== undefined
      ? known(
          'user.fixedMonthlyExpensesPaise',
          profile.userProvided.fixedMonthlyExpensesPaise,
          'USER_PROVIDED',
        )
      : unknown('user.fixedMonthlyExpensesPaise', 'USER_PROVIDED');

  facts['user.liquidSavingsPaise'] =
    profile.userProvided.liquidSavingsPaise !== undefined
      ? known('user.liquidSavingsPaise', profile.userProvided.liquidSavingsPaise, 'USER_PROVIDED')
      : unknown('user.liquidSavingsPaise', 'USER_PROVIDED');

  facts['user.nextIncomeDate'] =
    profile.userProvided.nextIncomeDate !== undefined
      ? known('user.nextIncomeDate', profile.userProvided.nextIncomeDate, 'USER_PROVIDED')
      : unknown('user.nextIncomeDate', 'USER_PROVIDED');

  const monthlyNet = calculateMonthlyNetAfterFixedExpenses(profile);

  facts['derived.monthlyNetAfterFixedExpensesPaise'] =
    monthlyNet !== undefined
      ? known('derived.monthlyNetAfterFixedExpensesPaise', monthlyNet, 'DERIVED')
      : unknown('derived.monthlyNetAfterFixedExpensesPaise', 'DERIVED');

  facts['user.essentialObligationsKnown'] = known(
    'user.essentialObligationsKnown',
    profile.userProvided.essentialObligations !== undefined,
    'SYSTEM',
  );

  facts['derived.totalEssentialObligationsPaise'] = known(
    'derived.totalEssentialObligationsPaise',
    sumEssentialObligations(profile),
    'DERIVED',
  );

  if (proposal.targetAccountId) {
    addAccountEvidence(facts, 'targetAccount', profile, proposal.targetAccountId);

    facts['proposal.targetAccountExists'] = known(
      'proposal.targetAccountExists',
      findAccount(profile, proposal.targetAccountId) !== undefined,
      'DERIVED',
    );
  }

  if (proposal.secondaryAccountId) {
    addAccountEvidence(facts, 'secondaryAccount', profile, proposal.secondaryAccountId);
  }

  if (proposal.amountPaise !== undefined) {
    facts['proposal.amountPaise'] = known('proposal.amountPaise', proposal.amountPaise, 'SYSTEM');
  }

  if (proposal.claimedScoreChangePoints !== undefined) {
    facts['proposal.claimedScoreChangePoints'] = known(
      'proposal.claimedScoreChangePoints',
      proposal.claimedScoreChangePoints,
      'SYSTEM',
    );
  }

  if (proposal.utilizationThresholdBps !== undefined) {
    facts['proposal.utilizationThresholdBps'] = known(
      'proposal.utilizationThresholdBps',
      proposal.utilizationThresholdBps,
      'SYSTEM',
    );
  }

  if (proposal.claimedUtilizationBps !== undefined) {
    facts['proposal.claimedUtilizationBps'] = known(
      'proposal.claimedUtilizationBps',
      proposal.claimedUtilizationBps,
      'SYSTEM',
    );
  }

  return { facts };
}

export function getEvidenceFact<T>(
  evidence: EvidenceCollection,
  key: string,
): EvidenceFact<T> | undefined {
  return evidence.facts[key] as EvidenceFact<T> | undefined;
}

export function isKnown(evidence: EvidenceCollection, key: string): boolean {
  return evidence.facts[key]?.state === 'KNOWN';
}
