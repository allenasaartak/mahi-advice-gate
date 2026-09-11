export type EvidenceState = 'KNOWN' | 'UNKNOWN' | 'CONFLICTING';

export type EvidenceSource = 'BUREAU' | 'USER_PROVIDED' | 'DERIVED' | 'SYSTEM';

export interface EvidenceFact<T> {
  key: string;
  state: EvidenceState;
  value?: T;
  source: EvidenceSource;
  asOf?: string;
}

export interface EvidenceCollection {
  facts: Record<string, EvidenceFact<unknown>>;
}
