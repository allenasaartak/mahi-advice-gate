# Mahi Advice Gate

A deterministic verification layer for financial advice.

Mahi Advice Gate sits between an upstream conversational/AI system and the user. The upstream system may propose a financial claim or recommendation, but the gate independently checks whether that advice is supported by the available evidence before it can reach the user.

The service does **not** generate financial advice, perform credit scoring, or implement a chatbot. Its responsibility is narrower: verify proposed advice against structured financial evidence and deterministic policy rules.

## Decision Model

Every request contains two inputs:

1. **User evidence** — bureau data and limited user-provided financial information.
2. **Proposed advice** — the claim or recommendation to be evaluated.

The gate returns one of four decisions:

| Decision   | Meaning                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| `ALLOW`    | Advice is supported by the available evidence.                            |
| `MODIFY`   | Directionally useful, but wording or certainty must be corrected.         |
| `ASK_USER` | Required information is missing or unresolved.                            |
| `BLOCK`    | Advice relies on unsupported evidence, inference, or invalid assumptions. |

Responses also include reason codes, missing information, evidence used, and—when appropriate—a safer modification or follow-up question.

## Architecture

```text
Structured Advice Proposal
        +
Financial Profile
        ↓
Schema & Integrity Validation
        ↓
Evidence Resolution
        ↓
Derived Financial Facts
        ↓
Evidence Contracts
        ↓
Deterministic Policy Rules
        ↓
Decision Resolver
        ↓
ALLOW / MODIFY / ASK_USER / BLOCK
```

The policy layer contains **9 deterministic rules**, covering evidence grounding, account validity, liquidity, obligations, debt prioritisation, bureau guidance, predictions, unsupported inference, and evidence conflicts.

Money values in the API are represented as integer paise.

## Required Scenarios

The implementation covers all eight supplied scenarios, including:

* verifying 92% HDFC utilisation;
* prioritising HDFC versus a personal loan;
* recommending a ₹20,000 payment;
* guidance after four recent credit enquiries;
* an unsupported 30-point score prediction;
* using ₹20,000 from ₹25,000 savings;
* the same payment with ₹15,000 school fees due;
* inferring excessive spending from card balances.

The demo UI exposes all eight scenarios and also provides a **Custom Test** mode where profile and proposal values can be edited directly. The exact generated API JSON can be previewed before evaluation.

## Running the Service

Requires Node.js 22+.

Install backend dependencies:

```bash
npm install
```

Start the API:

```bash
npm run dev
```

The service runs on:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

Main endpoint:

```text
POST /evaluate-advice
```

## Running the Demo UI

From the `frontend` directory:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Vite proxies API requests to the backend running on port 3000.

## Testing

Run the complete backend validation suite:

```bash
npm run check
```

The suite contains **175 automated tests**, including the eight required scenarios, independent edge cases, rule-level tests, semantic validation, randomized property tests, hostile API fuzzing, and exhaustive decision matrices.

Frontend verification:

```bash
cd frontend
npm run lint
npm run build
```

## Evidence vs Inference

The system deliberately distinguishes facts that can be derived from evidence from conclusions that require assumptions.

For example, a ₹92,000 balance on a ₹1,00,000 credit limit supports a 92% utilisation calculation. It does **not** establish that the user is “spending too much.”

Likewise, recent enquiries may justify caution but do not deterministically prove that another credit application should never be made.

## What I Would Not Trust an LLM to Decide

I would not delegate final decisions about affordability, debt prioritisation, account validity, exact credit-score outcomes, liquidity protection, or whether evidence is sufficient to support a financial claim to an LLM.

An LLM can help generate or phrase candidate advice. The final safety decision should remain reproducible, testable, explainable, and deterministic.
