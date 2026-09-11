import type { FinancialProfile } from '../../src/schemas/financial-profile.schema.js';

export const mahiProfile: FinancialProfile = {
  profileId: 'mahi-synthetic-profile-001',
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
      {
        id: 'ICICI_CARD',
        type: 'CREDIT_CARD',
        lender: 'ICICI',
        limitPaise: 5_000_000,
        balancePaise: 1_200_000,
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
  },
};
