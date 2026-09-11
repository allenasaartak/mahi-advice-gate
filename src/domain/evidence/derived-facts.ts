import type { CreditAccount, FinancialProfile } from '../../schemas/financial-profile.schema.js';

export interface CreditCardUtilization {
  accountId: string;
  balancePaise: number;
  limitPaise: number;
  utilizationBps: number;
}

export function calculateUtilizationBps(
  balancePaise: number,
  limitPaise: number,
): number | undefined {
  if (limitPaise <= 0) {
    return undefined;
  }

  return Math.round((balancePaise / limitPaise) * 10_000);
}

export function getCreditCardUtilization(
  account: CreditAccount,
): CreditCardUtilization | undefined {
  if (account.type !== 'CREDIT_CARD') {
    return undefined;
  }

  const utilizationBps = calculateUtilizationBps(account.balancePaise, account.limitPaise);

  if (utilizationBps === undefined) {
    return undefined;
  }

  return {
    accountId: account.id,
    balancePaise: account.balancePaise,
    limitPaise: account.limitPaise,
    utilizationBps,
  };
}

export function findAccount(
  profile: FinancialProfile,
  accountId: string,
): CreditAccount | undefined {
  return profile.bureau.accounts.find((account) => account.id === accountId);
}

export function calculateMonthlyNetAfterFixedExpenses(
  profile: FinancialProfile,
): number | undefined {
  const { monthlyIncomePaise, fixedMonthlyExpensesPaise } = profile.userProvided;

  if (monthlyIncomePaise === undefined || fixedMonthlyExpensesPaise === undefined) {
    return undefined;
  }

  return monthlyIncomePaise - fixedMonthlyExpensesPaise;
}

export function sumEssentialObligations(profile: FinancialProfile): number {
  return (
    profile.userProvided.essentialObligations?.reduce(
      (total, obligation) => total + obligation.amountPaise,
      0,
    ) ?? 0
  );
}

export function calculateRemainingLiquidityAfterPayment(
  liquidSavingsPaise: number,
  paymentPaise: number,
): number {
  return liquidSavingsPaise - paymentPaise;
}
