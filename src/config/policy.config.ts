export const POLICY_VERSION = '1.0.0';

export const POLICY_LIMITS = {
  maxDeterministicRules: 10,
} as const;

export const DECISION_PRIORITY = {
  ALLOW: 1,
  MODIFY: 2,
  ASK_USER: 3,
  BLOCK: 4,
} as const;
