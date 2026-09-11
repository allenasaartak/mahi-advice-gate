import { useState } from 'react';
import './App.css';

type Decision = 'ALLOW' | 'MODIFY' | 'ASK_USER' | 'BLOCK';

type AdviceType =
  | 'FACTUAL_CLAIM'
  | 'DEBT_PAYMENT'
  | 'DEBT_PRIORITY'
  | 'CREDIT_APPLICATION_GUIDANCE'
  | 'CREDIT_SCORE_PREDICTION'
  | 'SPENDING_ASSESSMENT';

type GateResponse = {
  decision: Decision;
  reasonCodes: string[];
  reason: string;
  missingInformation: string[];
  policyVersion: string;
  questionForUser?: string;
  suggestedModification?: {
    text: string;
  };
  evidence: Array<{
    key: string;
    value: unknown;
    source: string;
  }>;
};

type DemoAccount = {
  id: string;
  type: string;
  lender: string;
  balancePaise: number;
  status: string;
  limitPaise?: number;
  emiPaise?: number;
};

type EssentialObligation = {
  id: string;
  description: string;
  amountPaise: number;
  dueDate: string;
  category: string;
};

type DemoProfile = {
  profileId: string;
  asOfDate: string;
  bureau: {
    creditScore: number;
    hardEnquiriesLast6Months: number;
    accounts: DemoAccount[];
  };
  userProvided: {
    monthlyIncomePaise: number;
    fixedMonthlyExpensesPaise: number;
    liquidSavingsPaise: number;
    essentialObligations?: EssentialObligation[];
  };
};

type DemoProposal = {
  proposalId: string;
  text: string;
  type: AdviceType;
  targetAccountId?: string;
  secondaryAccountId?: string;
  factualClaimKind?: string;
  claimedUtilizationBps?: number;
  amountPaise?: number;
  timing?: string;
  claimedScoreChangePoints?: number;
  utilizationThresholdBps?: number;
};

type DemoScenario = {
  label: string;
  title: string;
  description: string;
  changeSummary: string;
  profile: DemoProfile;
  proposal: DemoProposal;
  expectedDecision: Decision;
};

const mahiProfile: DemoProfile = {
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
        limitPaise: 10000000,
        balancePaise: 9200000,
        status: 'CURRENT',
      },
      {
        id: 'ICICI_CARD',
        type: 'CREDIT_CARD',
        lender: 'ICICI',
        limitPaise: 5000000,
        balancePaise: 1200000,
        status: 'CURRENT',
      },
      {
        id: 'PERSONAL_LOAN',
        type: 'PERSONAL_LOAN',
        lender: 'Personal Loan',
        balancePaise: 18000000,
        emiPaise: 920000,
        status: 'CURRENT',
      },
    ],
  },

  userProvided: {
    monthlyIncomePaise: 5500000,
    fixedMonthlyExpensesPaise: 3200000,
    liquidSavingsPaise: 2500000,
  },
};

const profileWithKnownSchoolFees: DemoProfile = {
  ...mahiProfile,

  userProvided: {
    ...mahiProfile.userProvided,

    essentialObligations: [
      {
        id: 'school-fees',
        description: "Daughter's school fees",
        amountPaise: 1500000,
        dueDate: '2026-09-18',
        category: 'EDUCATION',
      },
    ],
  },
};

const scenarios = {
  scenario1: {
    label: '1 · Utilisation',
    title: 'Verify a factual utilisation claim',
    description:
      'The proposal states that HDFC utilisation is 92% and that reducing the balance reduces utilisation.',
    changeSummary: 'Base profile + factual utilisation claim',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-1',
      text: 'Your HDFC card is at 92% utilisation. Bringing that balance down would reduce your utilisation.',
      type: 'FACTUAL_CLAIM',
      targetAccountId: 'HDFC_CARD',
      factualClaimKind: 'CARD_UTILIZATION',
      claimedUtilizationBps: 9200,
    },
    expectedDecision: 'ALLOW',
  },

  scenario2: {
    label: '2 · Debt Priority',
    title: 'Prioritise HDFC over personal loan',
    description:
      'The proposal recommends paying one debt before another, but the profile does not contain enough priority evidence such as APRs.',
    changeSummary: 'Same profile + debt-priority recommendation',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-2',
      text: 'Pay your HDFC card before your personal loan.',
      type: 'DEBT_PRIORITY',
      targetAccountId: 'HDFC_CARD',
      secondaryAccountId: 'PERSONAL_LOAN',
    },
    expectedDecision: 'ASK_USER',
  },

  scenario3: {
    label: '3 · Pay ₹20k',
    title: 'Recommend a ₹20,000 payment',
    description:
      'The proposal recommends a specific HDFC payment using the known income, expenses and savings information.',
    changeSummary: 'Same profile + specific ₹20k payment advice',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-3',
      text: 'Pay ₹20,000 toward HDFC this month.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 2000000,
      timing: 'THIS_MONTH',
    },
    expectedDecision: 'ASK_USER',
  },

  scenario4: {
    label: '4 · New Card',
    title: 'Avoid another credit application',
    description:
      'The proposal turns four recent enquiries into a categorical instruction not to apply for another card.',
    changeSummary: 'Same profile + categorical application advice',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-4',
      text: "Don't apply for another credit card right now. You've already had four enquiries recently.",
      type: 'CREDIT_APPLICATION_GUIDANCE',
    },
    expectedDecision: 'MODIFY',
  },

  scenario5: {
    label: '5 · +30 Score',
    title: 'Predict a 30-point score improvement',
    description:
      'The proposal makes an exact future credit-score prediction based on reducing HDFC utilisation.',
    changeSummary: 'Same profile + unsupported numeric prediction',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-5',
      text: 'Your credit score should improve by around 30 points if you reduce HDFC utilisation below 30%.',
      type: 'CREDIT_SCORE_PREDICTION',
      targetAccountId: 'HDFC_CARD',
      claimedScoreChangePoints: 30,
      utilizationThresholdBps: 3000,
    },
    expectedDecision: 'MODIFY',
  },

  scenario6: {
    label: '6 · Use Savings',
    title: 'Use ₹20,000 of ₹25,000 savings',
    description:
      'The user has ₹25,000 in liquid savings and the proposal recommends immediately putting ₹20,000 toward HDFC.',
    changeSummary: 'Same profile + immediate ₹20k payment from ₹25k savings',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-6',
      text: 'Yes. Put ₹20,000 toward HDFC.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 2000000,
      timing: 'NOW',
    },
    expectedDecision: 'ASK_USER',
  },

  scenario7: {
    label: '7 · School Fees',
    title: '₹15,000 school fees due next week',
    description:
      'This scenario adds a known ₹15,000 essential school-fee obligation while keeping the same ₹20,000 HDFC payment proposal.',
    changeSummary: 'Profile changes: + ₹15k school fee due 18 Sep · Same ₹20k advice',
    profile: profileWithKnownSchoolFees,
    proposal: {
      proposalId: 'scenario-7',
      text: 'Yes. Put ₹20,000 toward HDFC.',
      type: 'DEBT_PAYMENT',
      targetAccountId: 'HDFC_CARD',
      amountPaise: 2000000,
      timing: 'NOW',
    },
    expectedDecision: 'ASK_USER',
  },

  scenario8: {
    label: '8 · Spending',
    title: 'Infer excessive spending',
    description:
      'The proposal makes a behavioural judgement about spending using credit-card balances alone.',
    changeSummary: 'Same profile + unsupported behavioural inference',
    profile: mahiProfile,
    proposal: {
      proposalId: 'scenario-8',
      text: "You're spending too much on credit cards.",
      type: 'SPENDING_ASSESSMENT',
    },
    expectedDecision: 'BLOCK',
  },
} satisfies Record<string, DemoScenario>;

const initialCustom = {
  creditScore: '672',
  hardEnquiries: '4',

  monthlyIncome: '55000',
  fixedExpenses: '32000',
  savings: '25000',

  hdfcLimit: '100000',
  hdfcBalance: '92000',

  iciciLimit: '50000',
  iciciBalance: '12000',

  loanBalance: '180000',
  loanEmi: '9200',

  proposalText: 'Pay ₹20,000 toward HDFC this month.',
  proposalType: 'DEBT_PAYMENT' as AdviceType,

  targetAccountId: 'HDFC_CARD',
  secondaryAccountId: 'PERSONAL_LOAN',

  amount: '20000',
  timing: 'THIS_MONTH',

  factualClaimKind: 'CARD_UTILIZATION',
  claimedUtilizationPercent: '92',

  claimedScoreChange: '30',
  utilizationThresholdPercent: '30',
};

type ScenarioKey = keyof typeof scenarios;
type Selection = ScenarioKey | 'custom';

function money(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function rupeesToPaise(value: string) {
  return Math.round(Number(value) * 100);
}

function percentToBps(value: string) {
  return Math.round(Number(value) * 100);
}

function App() {
  const [selected, setSelected] = useState<Selection>('scenario1');
  const [custom, setCustom] = useState(initialCustom);

  const [result, setResult] = useState<GateResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const [error, setError] = useState('');

  const scenario = selected === 'custom' ? null : (scenarios[selected] as DemoScenario);

  const activeProfile = scenario?.profile;

  const activeHdfc = activeProfile?.bureau.accounts.find((account) => account.id === 'HDFC_CARD');

  const activeIcici = activeProfile?.bureau.accounts.find((account) => account.id === 'ICICI_CARD');

  const activeLoan = activeProfile?.bureau.accounts.find(
    (account) => account.id === 'PERSONAL_LOAN',
  );

  const activeObligations = activeProfile?.userProvided.essentialObligations ?? [];

  function clearOutput() {
    setResult(null);
    setError('');
    setShowEvidence(false);
  }

  function selectScenario(key: ScenarioKey) {
    setSelected(key);
    setShowJson(false);
    clearOutput();
  }

  function selectCustom() {
    setSelected('custom');
    setShowJson(false);
    clearOutput();
  }

  function updateCustom<K extends keyof typeof initialCustom>(
    key: K,
    value: (typeof initialCustom)[K],
  ) {
    setCustom((current) => ({
      ...current,
      [key]: value,
    }));

    clearOutput();
  }

  function buildCustomRequest() {
    const proposal: Record<string, unknown> = {
      proposalId: 'custom-demo-proposal',
      text: custom.proposalText,
      type: custom.proposalType,
    };

    if (custom.proposalType === 'FACTUAL_CLAIM') {
      proposal.targetAccountId = custom.targetAccountId;
      proposal.factualClaimKind = custom.factualClaimKind;

      if (custom.factualClaimKind === 'CARD_UTILIZATION') {
        proposal.claimedUtilizationBps = percentToBps(custom.claimedUtilizationPercent);
      }
    }

    if (custom.proposalType === 'DEBT_PAYMENT') {
      proposal.targetAccountId = custom.targetAccountId;
      proposal.amountPaise = rupeesToPaise(custom.amount);
      proposal.timing = custom.timing;
    }

    if (custom.proposalType === 'DEBT_PRIORITY') {
      proposal.targetAccountId = custom.targetAccountId;
      proposal.secondaryAccountId = custom.secondaryAccountId;
    }

    if (custom.proposalType === 'CREDIT_SCORE_PREDICTION') {
      proposal.targetAccountId = custom.targetAccountId;

      proposal.claimedScoreChangePoints = Number(custom.claimedScoreChange);

      proposal.utilizationThresholdBps = percentToBps(custom.utilizationThresholdPercent);
    }

    return {
      profile: {
        profileId: 'custom-demo-user',
        asOfDate: '2026-09-11',

        bureau: {
          creditScore: Number(custom.creditScore),
          hardEnquiriesLast6Months: Number(custom.hardEnquiries),

          accounts: [
            {
              id: 'HDFC_CARD',
              type: 'CREDIT_CARD',
              lender: 'HDFC',
              limitPaise: rupeesToPaise(custom.hdfcLimit),
              balancePaise: rupeesToPaise(custom.hdfcBalance),
              status: 'CURRENT',
            },

            {
              id: 'ICICI_CARD',
              type: 'CREDIT_CARD',
              lender: 'ICICI',
              limitPaise: rupeesToPaise(custom.iciciLimit),
              balancePaise: rupeesToPaise(custom.iciciBalance),
              status: 'CURRENT',
            },

            {
              id: 'PERSONAL_LOAN',
              type: 'PERSONAL_LOAN',
              lender: 'Personal Loan',
              balancePaise: rupeesToPaise(custom.loanBalance),
              emiPaise: rupeesToPaise(custom.loanEmi),
              status: 'CURRENT',
            },
          ],
        },

        userProvided: {
          monthlyIncomePaise: rupeesToPaise(custom.monthlyIncome),
          fixedMonthlyExpensesPaise: rupeesToPaise(custom.fixedExpenses),
          liquidSavingsPaise: rupeesToPaise(custom.savings),
        },
      },

      proposal,
    };
  }

  async function evaluateAdvice() {
    const requestBody =
      selected === 'custom'
        ? buildCustomRequest()
        : {
            profile: scenarios[selected].profile,
            proposal: scenarios[selected].proposal,
          };

    setLoading(true);
    setError('');
    setResult(null);
    setShowEvidence(false);

    try {
      const response = await fetch('/evaluate-advice', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(requestBody),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(`HTTP ${response.status}\n${JSON.stringify(data, null, 2)}`);
        return;
      }

      setResult(data as GateResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to evaluate advice.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <div>
          <div className="brand">MAHI</div>

          <h1>Advice Gate</h1>

          <p>Deterministic verification before financial advice reaches the user.</p>
        </div>

        <div className="flow">
          <span>User Evidence</span>
          <span>+</span>
          <span>AI Proposal</span>
          <span>→</span>
          <strong>Advice Gate</strong>
          <span>→</span>
          <span>Decision</span>
        </div>
      </header>

      <section className="presets">
        <p>Required demo scenarios</p>

        <div className="preset-list">
          {(Object.keys(scenarios) as ScenarioKey[]).map((key) => (
            <button
              key={key}
              className={selected === key ? 'preset active' : 'preset'}
              onClick={() => selectScenario(key)}
            >
              {scenarios[key].label}
            </button>
          ))}

          <button
            className={selected === 'custom' ? 'preset active' : 'preset'}
            onClick={selectCustom}
          >
            Custom Test
          </button>
        </div>
      </section>

      {scenario && (
        <section className="scenario-banner">
          <div>
            <span className="eyebrow">CURRENT SCENARIO</span>

            <h2>{scenario.title}</h2>

            <p>{scenario.description}</p>
          </div>

          <div className="scenario-note">
            <strong>What changed?</strong>
            <span>{scenario.changeSummary}</span>

            <div className="expected-decision">
              Expected
              <b>{scenario.expectedDecision}</b>
            </div>
          </div>
        </section>
      )}

      {selected === 'custom' ? (
        <section className="workspace">
          <article className="card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">INPUT 1 · USER EVIDENCE</span>
                <h2>Financial Profile</h2>
              </div>

              <span className="source-badge">Editable</span>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>profile.bureau.creditScore</span>

                <input
                  type="number"
                  value={custom.creditScore}
                  onChange={(event) => updateCustom('creditScore', event.target.value)}
                />
              </label>

              <label className="field">
                <span>profile.bureau.hardEnquiriesLast6Months</span>

                <input
                  type="number"
                  value={custom.hardEnquiries}
                  onChange={(event) => updateCustom('hardEnquiries', event.target.value)}
                />
              </label>

              <label className="field">
                <span>userProvided.monthlyIncome ₹</span>

                <input
                  type="number"
                  value={custom.monthlyIncome}
                  onChange={(event) => updateCustom('monthlyIncome', event.target.value)}
                />
              </label>

              <label className="field">
                <span>userProvided.fixedExpenses ₹</span>

                <input
                  type="number"
                  value={custom.fixedExpenses}
                  onChange={(event) => updateCustom('fixedExpenses', event.target.value)}
                />
              </label>

              <label className="field">
                <span>userProvided.liquidSavings ₹</span>

                <input
                  type="number"
                  value={custom.savings}
                  onChange={(event) => updateCustom('savings', event.target.value)}
                />
              </label>
            </div>

            <div className="section-divider">
              <span>ACCOUNTS</span>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>HDFC limit ₹</span>

                <input
                  type="number"
                  value={custom.hdfcLimit}
                  onChange={(event) => updateCustom('hdfcLimit', event.target.value)}
                />
              </label>

              <label className="field">
                <span>HDFC balance ₹</span>

                <input
                  type="number"
                  value={custom.hdfcBalance}
                  onChange={(event) => updateCustom('hdfcBalance', event.target.value)}
                />
              </label>

              <label className="field">
                <span>ICICI limit ₹</span>

                <input
                  type="number"
                  value={custom.iciciLimit}
                  onChange={(event) => updateCustom('iciciLimit', event.target.value)}
                />
              </label>

              <label className="field">
                <span>ICICI balance ₹</span>

                <input
                  type="number"
                  value={custom.iciciBalance}
                  onChange={(event) => updateCustom('iciciBalance', event.target.value)}
                />
              </label>

              <label className="field">
                <span>Personal loan balance ₹</span>

                <input
                  type="number"
                  value={custom.loanBalance}
                  onChange={(event) => updateCustom('loanBalance', event.target.value)}
                />
              </label>

              <label className="field">
                <span>Personal loan EMI ₹</span>

                <input
                  type="number"
                  value={custom.loanEmi}
                  onChange={(event) => updateCustom('loanEmi', event.target.value)}
                />
              </label>
            </div>
          </article>

          <article className="card proposal-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">INPUT 2 · PROPOSED ADVICE</span>
                <h2>Advice Proposal</h2>
              </div>

              <span className="source-badge">Editable</span>
            </div>

            <label className="field full-field">
              <span>proposal.text</span>

              <textarea
                value={custom.proposalText}
                onChange={(event) => updateCustom('proposalText', event.target.value)}
              />
            </label>

            <label className="field full-field">
              <span>proposal.type</span>

              <select
                value={custom.proposalType}
                onChange={(event) => updateCustom('proposalType', event.target.value as AdviceType)}
              >
                <option value="FACTUAL_CLAIM">FACTUAL_CLAIM</option>
                <option value="DEBT_PAYMENT">DEBT_PAYMENT</option>
                <option value="DEBT_PRIORITY">DEBT_PRIORITY</option>

                <option value="CREDIT_APPLICATION_GUIDANCE">CREDIT_APPLICATION_GUIDANCE</option>

                <option value="CREDIT_SCORE_PREDICTION">CREDIT_SCORE_PREDICTION</option>

                <option value="SPENDING_ASSESSMENT">SPENDING_ASSESSMENT</option>
              </select>
            </label>

            {['FACTUAL_CLAIM', 'DEBT_PAYMENT', 'DEBT_PRIORITY', 'CREDIT_SCORE_PREDICTION'].includes(
              custom.proposalType,
            ) && (
              <label className="field full-field">
                <span>proposal.targetAccountId</span>

                <select
                  value={custom.targetAccountId}
                  onChange={(event) => updateCustom('targetAccountId', event.target.value)}
                >
                  <option value="HDFC_CARD">HDFC_CARD</option>
                  <option value="ICICI_CARD">ICICI_CARD</option>
                  <option value="PERSONAL_LOAN">PERSONAL_LOAN</option>
                </select>
              </label>
            )}

            {custom.proposalType === 'DEBT_PAYMENT' && (
              <>
                <label className="field full-field">
                  <span>proposal.amount ₹</span>

                  <input
                    type="number"
                    value={custom.amount}
                    onChange={(event) => updateCustom('amount', event.target.value)}
                  />
                </label>

                <label className="field full-field">
                  <span>proposal.timing</span>

                  <select
                    value={custom.timing}
                    onChange={(event) => updateCustom('timing', event.target.value)}
                  >
                    <option value="THIS_MONTH">THIS_MONTH</option>
                    <option value="NOW">NOW</option>
                  </select>
                </label>
              </>
            )}

            {custom.proposalType === 'DEBT_PRIORITY' && (
              <label className="field full-field">
                <span>proposal.secondaryAccountId</span>

                <select
                  value={custom.secondaryAccountId}
                  onChange={(event) => updateCustom('secondaryAccountId', event.target.value)}
                >
                  <option value="PERSONAL_LOAN">PERSONAL_LOAN</option>
                  <option value="HDFC_CARD">HDFC_CARD</option>
                  <option value="ICICI_CARD">ICICI_CARD</option>
                </select>
              </label>
            )}

            {custom.proposalType === 'FACTUAL_CLAIM' && (
              <>
                <label className="field full-field">
                  <span>proposal.factualClaimKind</span>

                  <select
                    value={custom.factualClaimKind}
                    onChange={(event) => updateCustom('factualClaimKind', event.target.value)}
                  >
                    <option value="CARD_UTILIZATION">CARD_UTILIZATION</option>

                    <option value="BALANCE_REDUCTION_LOWERS_UTILIZATION">
                      BALANCE_REDUCTION_LOWERS_UTILIZATION
                    </option>
                  </select>
                </label>

                {custom.factualClaimKind === 'CARD_UTILIZATION' && (
                  <label className="field full-field">
                    <span>proposal.claimedUtilization %</span>

                    <input
                      type="number"
                      value={custom.claimedUtilizationPercent}
                      onChange={(event) =>
                        updateCustom('claimedUtilizationPercent', event.target.value)
                      }
                    />
                  </label>
                )}
              </>
            )}

            {custom.proposalType === 'CREDIT_SCORE_PREDICTION' && (
              <>
                <label className="field full-field">
                  <span>proposal.claimedScoreChangePoints</span>

                  <input
                    type="number"
                    value={custom.claimedScoreChange}
                    onChange={(event) => updateCustom('claimedScoreChange', event.target.value)}
                  />
                </label>

                <label className="field full-field">
                  <span>proposal.utilizationThreshold %</span>

                  <input
                    type="number"
                    value={custom.utilizationThresholdPercent}
                    onChange={(event) =>
                      updateCustom('utilizationThresholdPercent', event.target.value)
                    }
                  />
                </label>
              </>
            )}

            <div className="custom-actions">
              <button
                className="secondary-button"
                onClick={() => setShowJson((current) => !current)}
              >
                {showJson ? 'Hide JSON' : 'Preview JSON'}
              </button>

              <button className="evaluate" onClick={() => void evaluateAdvice()} disabled={loading}>
                {loading ? 'Evaluating…' : 'Evaluate Custom Test'}
              </button>
            </div>
          </article>
        </section>
      ) : (
        scenario &&
        activeProfile && (
          <section className="workspace">
            <article className="card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">INPUT 1 · USER EVIDENCE</span>
                  <h2>Financial Profile</h2>
                </div>

                <span className="source-badge">Synthetic</span>
              </div>

              <div className="stat-grid">
                <div className="stat">
                  <span>Credit score</span>
                  <strong>{activeProfile.bureau.creditScore}</strong>
                </div>

                <div className="stat">
                  <span>Hard enquiries</span>

                  <strong>{activeProfile.bureau.hardEnquiriesLast6Months}</strong>
                </div>

                <div className="stat">
                  <span>Monthly income</span>

                  <strong>{money(activeProfile.userProvided.monthlyIncomePaise)}</strong>
                </div>

                <div className="stat">
                  <span>Liquid savings</span>

                  <strong>{money(activeProfile.userProvided.liquidSavingsPaise)}</strong>
                </div>
              </div>

              <div className="accounts">
                <div className="account">
                  <div>
                    <strong>HDFC Credit Card</strong>
                    <span>{activeHdfc?.status}</span>
                  </div>

                  <div className="amount">
                    {money(activeHdfc?.balancePaise ?? 0)}

                    <small>of {money(activeHdfc?.limitPaise ?? 0)}</small>
                  </div>
                </div>

                <div className="utilisation-track">
                  <div className="utilisation-fill" />
                </div>

                <div className="account">
                  <div>
                    <strong>ICICI Credit Card</strong>
                    <span>{activeIcici?.status}</span>
                  </div>

                  <div className="amount">
                    {money(activeIcici?.balancePaise ?? 0)}

                    <small>of {money(activeIcici?.limitPaise ?? 0)}</small>
                  </div>
                </div>

                <div className="account">
                  <div>
                    <strong>Personal Loan</strong>

                    <span>
                      {activeLoan?.status} · EMI {money(activeLoan?.emiPaise ?? 0)}
                    </span>
                  </div>

                  <div className="amount">{money(activeLoan?.balancePaise ?? 0)}</div>
                </div>

                <div className="context-summary">
                  <div>
                    <span>Essential obligations</span>

                    <strong>
                      {activeObligations.length === 0
                        ? 'Not provided'
                        : `${activeObligations.length} known`}
                    </strong>
                  </div>

                  <div>
                    <span>Next income timing</span>
                    <strong>Not provided</strong>
                  </div>
                </div>

                {activeObligations.map((obligation) => (
                  <div className="obligation-card" key={obligation.id}>
                    <div>
                      <span className="obligation-label">ESSENTIAL OBLIGATION</span>

                      <strong>{obligation.description}</strong>

                      <small>Due {obligation.dueDate}</small>
                    </div>

                    <div className="obligation-amount">{money(obligation.amountPaise)}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="card proposal-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">INPUT 2 · PROPOSED ADVICE</span>

                  <h2>Advice Proposal</h2>
                </div>

                <span className="source-badge">{scenario.proposal.type}</span>
              </div>

              <div className="advice-text">{scenario.proposal.text}</div>

              <div className="metadata">
                <div>
                  <span>Advice type</span>

                  <strong>{scenario.proposal.type.replaceAll('_', ' ')}</strong>
                </div>

                {scenario.proposal.targetAccountId && (
                  <div>
                    <span>Target</span>

                    <strong>{scenario.proposal.targetAccountId}</strong>
                  </div>
                )}

                {scenario.proposal.secondaryAccountId && (
                  <div>
                    <span>Compared with</span>

                    <strong>{scenario.proposal.secondaryAccountId}</strong>
                  </div>
                )}

                {scenario.proposal.amountPaise !== undefined && (
                  <div>
                    <span>Amount</span>

                    <strong>{money(scenario.proposal.amountPaise)}</strong>
                  </div>
                )}

                {scenario.proposal.timing && (
                  <div>
                    <span>Timing</span>
                    <strong>{scenario.proposal.timing}</strong>
                  </div>
                )}
              </div>

              <button className="evaluate" onClick={() => void evaluateAdvice()} disabled={loading}>
                {loading ? 'Evaluating…' : 'Evaluate Advice'}
              </button>
            </article>
          </section>
        )
      )}

      {selected === 'custom' && showJson && (
        <section className="json-preview">
          <div className="card-heading">
            <div>
              <span className="eyebrow">REQUEST PREVIEW</span>
              <h2>Generated API JSON</h2>
            </div>

            <span className="source-badge">POST /evaluate-advice</span>
          </div>

          <pre>{JSON.stringify(buildCustomRequest(), null, 2)}</pre>
        </section>
      )}

      {error && <pre className="error-box">{error}</pre>}

      {result && (
        <section className={`result result-${result.decision.toLowerCase()}`}>
          <div className="result-top">
            <div>
              <span className="eyebrow">GATE DECISION</span>
              <h2>{result.decision}</h2>
            </div>

            <span className="policy">Policy {result.policyVersion}</span>
          </div>

          <p className="reason">{result.reason}</p>

          {result.reasonCodes.length > 0 && (
            <div className="reason-codes">
              {result.reasonCodes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>
          )}

          {result.missingInformation.length > 0 && (
            <div className="result-details">
              <h3>Missing information</h3>

              <ul>
                {result.missingInformation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {result.questionForUser && (
            <div className="highlight">
              <span>Question for user</span>
              <strong>{result.questionForUser}</strong>
            </div>
          )}

          {result.suggestedModification && (
            <div className="highlight">
              <span>Suggested modification</span>

              <strong>{result.suggestedModification.text}</strong>
            </div>
          )}

          <button
            className="evidence-button"
            onClick={() => setShowEvidence((current) => !current)}
          >
            {showEvidence ? 'Hide evidence' : `View evidence (${result.evidence.length})`}
          </button>

          {showEvidence && (
            <div className="evidence">
              {result.evidence.map((item) => (
                <div className="evidence-row" key={`${item.key}-${item.source}`}>
                  <div>
                    <strong>{item.key}</strong>
                    <span>{item.source}</span>
                  </div>

                  <code>{String(item.value)}</code>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
