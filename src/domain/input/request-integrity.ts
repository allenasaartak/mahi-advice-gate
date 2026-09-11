import type { FinancialProfile } from '../../schemas/financial-profile.schema.js';

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

export function validateFinancialProfileIntegrity(profile: FinancialProfile): string[] {
  const errors: string[] = [];

  if (!isValidIsoDate(profile.asOfDate)) {
    errors.push('profile.asOfDate must be a valid calendar date');
  }

  const nextIncomeDate = profile.userProvided.nextIncomeDate;

  if (nextIncomeDate !== undefined) {
    if (!isValidIsoDate(nextIncomeDate)) {
      errors.push('userProvided.nextIncomeDate must be a valid calendar date');
    } else if (nextIncomeDate < profile.asOfDate) {
      errors.push('userProvided.nextIncomeDate cannot be earlier than profile.asOfDate');
    }
  }

  for (const [index, account] of profile.bureau.accounts.entries()) {
    if (account.dueDate !== undefined && !isValidIsoDate(account.dueDate)) {
      errors.push(`bureau.accounts[${index}].dueDate must be a valid calendar date`);
    }
  }

  const obligations = profile.userProvided.essentialObligations ?? [];

  for (const [index, obligation] of obligations.entries()) {
    if (!isValidIsoDate(obligation.dueDate)) {
      errors.push(
        `userProvided.essentialObligations[${index}].dueDate must be a valid calendar date`,
      );
    }
  }

  const accountIds = profile.bureau.accounts.map((account) => account.id);

  if (hasDuplicates(accountIds)) {
    errors.push('bureau account IDs must be unique');
  }

  const obligationIds = obligations.map((obligation) => obligation.id);

  if (hasDuplicates(obligationIds)) {
    errors.push('essential obligation IDs must be unique');
  }

  return errors;
}
