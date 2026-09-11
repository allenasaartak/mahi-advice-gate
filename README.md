# Mahi Advice Gate

A deterministic safety layer between an AI-generated financial recommendation and the user.

The conversational model may propose advice, but the Advice Gate independently evaluates whether that advice is supported by available evidence before it can be shown.

```text
Model proposal
      ↓
Structured AdviceProposal
      ↓
Evidence resolution + derived facts
      ↓
Deterministic policy rules
      ↓
ALLOW | MODIFY | ASK_USER | BLOCK
```

## Run

Requires Node.js 22.

```bash
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Main endpoint:

```text
POST /evaluate-advice
```

Run all validation:

```bash
npm run check
```

Run coverage:

```bash
npm run test:coverage
```

## API

`POST /evaluate-advice` accepts:

- a structured financial profile containing bureau and user-provided facts
- a structured advice proposal produced upstream

It returns one of:

- `ALLOW` — evidence supports the recommendation
- `MODIFY` — the core idea is usable, but wording or amount must be changed
- `ASK_USER` — material evidence is missing
- `BLOCK` — the recommendation is unsupported or unsafe

Responses also contain deterministic reason codes, missing information, policy version and an evidence trace.

Money is represented as integer paise to avoid floating-point ambiguity.

## Design

The gate does not parse arbitrary natural-language advice or call an LLM internally. The upstream system must provide a typed `AdviceProposal` describing what it intends to claim or recommend.

This keeps the safety boundary deterministic and testable.

Evidence is classified before rule evaluation and derived facts such as credit-card utilisation and remaining liquidity are calculated from source data.

The current policy contains nine general rules:

1. Evidence grounding
2. Prediction boundary
3. Account validity
4. Liquidity sufficiency
5. Essential-obligation protection
6. Debt-priority evidence
7. Bureau-guidance boundary
8. Inference boundary
9. Evidence conflict

The rules are intentionally general rather than being hardcoded for the supplied scenarios.

For example, a payment recommendation is evaluated against available liquidity and known essential obligations. A debt-priority recommendation requires comparative evidence. An exact credit-score prediction is not allowed through unchanged because the supplied financial facts cannot deterministically establish the claimed point change.

## Evidence vs inference

The service distinguishes facts that can be directly established from available data from claims that require assumptions.

Examples:

- `₹92,000 / ₹1,00,000 = 92% utilisation` is deterministic.
- Reducing a card balance while its limit remains unchanged reduces utilisation.
- A high card balance does not prove that the user is “spending too much.”
- Recent hard enquiries are evidence that additional applications should be approached cautiously, but they are not sufficient for an unconditional prohibition.
- Available savings alone are not sufficient evidence that a specific debt payment is affordable when upcoming essential obligations are unknown.

## Tests

The suite includes:

- all 8 required exercise scenarios
- 8 additional edge cases
- direct policy-rule tests
- decision-precedence tests
- evidence and derived-fact unit tests
- HTTP/API validation tests
- property-based testing with `fast-check`
- synthetic red-team testing for account states, malformed input, evidence removal, semantic inconsistencies and boundary conditions

Property tests verify invariants across generated financial states, including deterministic repeatability, protection against payments exceeding savings, monotonic safety when essential obligations are added, and rejection of unsupported exact score predictions.

Current suite: **175 tests**, including randomized property tests, hostile API fuzzing, exhaustive cross-product matrices and semantic boundary tests.

Coverage is above the configured thresholds for statements, branches, functions and lines.

## What I would not trust an LLM to decide

I would not allow an LLM alone to decide:

- whether a specific payment is affordable
- whether known essential obligations can safely be displaced
- whether one debt should be prioritised without comparative evidence
- exact future credit-score movement
- whether a bureau account actually exists or matches a recommendation
- deterministic calculations such as utilisation
- whether missing financial context can safely be assumed
- whether conflicting evidence should be ignored

An LLM is useful for generating candidate recommendations and conversational wording. The final safety decision should remain grounded in explicit evidence and deterministic policy.
