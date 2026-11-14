# Bharosa AI --- Product Requirements Document (PRD)

## 1. Product Overview

**Product:** Bharosa AI\
**Hackathon:** Paytm Build for India AI Hackathon --- Pune\
**Track:** Track 2 --- AI-Powered Financial Journeys\
**Core promise:** Make insurance, lending and fintech journeys simpler,
faster and more human.

Bharosa AI is an AI-powered financial journey assistant that helps users
understand financial documents, identify important risks, compare
financial choices, simulate consequences and complete selected journeys
with greater confidence.

### Product principle

> **Decode → Warn → Simulate → Explain → Act**

The product must not behave like an unrestricted financial
decision-maker. It should explain evidence, calculate deterministic
values, surface uncertainty and request explicit user approval before
consequential actions.

------------------------------------------------------------------------

## 2. Problem Statement

Insurance and lending journeys often contain:

-   Complex financial and legal language
-   Important exclusions, fees, waiting periods and conditions
-   Long application forms
-   Multiple documents containing overlapping information
-   Difficulty comparing the real cost of financial products
-   Low confidence among first-time or less digitally confident users
-   Risk of misunderstanding before a customer commits money or data

The hackathon challenge asks builders to make these journeys simpler,
faster and more human using AI.

------------------------------------------------------------------------

## 3. Target Users

### Primary

1.  First-time borrowers
2.  Insurance customers
3.  Young digital-first customers
4.  Users more comfortable with Hindi/Hinglish
5.  Users who need help understanding financial documents

### Secondary

-   Families managing insurance documents
-   Fintech customer-support teams
-   Financial-product platforms
-   Banks, NBFCs and insurers as potential B2B users

------------------------------------------------------------------------

## 4. Goals

### MVP goals

-   Explain uploaded financial documents in simple language.
-   Extract important terms and clauses.
-   Detect potentially important risks and exclusions.
-   Show evidence for every important AI-generated finding.
-   Calculate loan/financial scenarios deterministically.
-   Allow users to ask contextual questions.
-   Provide multilingual explanations.
-   Prevent accidental submission or data sharing through explicit
    confirmation.

### Success metrics

For the hackathon prototype, measure:

-   Document extraction accuracy
-   Clause citation accuracy
-   Risk detection precision/recall on a small labeled test set
-   Arithmetic correctness
-   Average time to understand a document
-   Task completion rate
-   User comprehension/teach-back success rate
-   Number of unsupported answers/hallucinations

------------------------------------------------------------------------

## 5. Core Features

### 5.1 Document Decoder

User uploads an insurance policy, loan agreement, KFS, brochure or
related document.

Output:

-   Plain-language summary
-   Key terms
-   Important dates
-   Fees
-   Exclusions
-   Waiting periods
-   Penalties
-   Coverage/repayment limits
-   Source page/clause references

### 5.2 Red-Flag Engine

Each finding contains:

-   Severity
-   What the clause says
-   Why it matters
-   Potential customer impact
-   Recommended question/action
-   Source reference

Use labels such as:

-   Informational
-   Review carefully
-   Important
-   Requires human/official confirmation

Avoid claiming that an AI finding is legally or financially definitive.

### 5.3 Policy Reality Check

Map:

**User need → Relevant clause → Possible gap → Question to verify**

Example:

> User says they need immediate maternity coverage.

The system identifies relevant waiting-period language and explains the
possible mismatch.

### 5.4 TrueCost AI

For a loan, calculate:

-   Principal
-   Interest
-   Processing fee
-   Other disclosed charges
-   EMI
-   Total repayment
-   Repayment schedule
-   Scenario comparison

All arithmetic must come from deterministic calculation code.

### 5.5 Financial Digital Twin

Allow the user to enter:

-   Monthly income
-   Essential expenses
-   Existing EMIs
-   Savings/emergency fund
-   Proposed new financial commitment

Then simulate scenarios such as:

-   Normal income
-   Temporary income reduction
-   Increased expenses
-   Additional EMI

Results must be presented as scenarios, not predictions.

### 5.6 Contract Contradiction Hunter

Compare multiple documents such as:

-   Brochure
-   KFS
-   Agreement
-   Policy summary

Highlight materially different claims, fees, conditions or limits.

### 5.7 Financial Teach-Back

After explaining an important clause, ask a simple comprehension
question.

If the user misunderstands, explain again with a simpler example.

### 5.8 Voice + Vernacular Copilot

Support conversational interaction with:

-   English
-   Hindi
-   Hinglish

Marathi can be added if adequately tested for the demo.

### 5.9 Consent Guardian

Before a consequential action:

1.  Explain what data is being shared.
2.  Explain the destination/purpose.
3.  Show optional vs required information.
4.  Ask for explicit confirmation.
5.  Record consent event.

### 5.10 Financial Decision Receipt

After a journey, create a summary containing:

-   Documents reviewed
-   Important findings
-   Calculations
-   Assumptions
-   User confirmations
-   Actions completed
-   Items requiring official confirmation

------------------------------------------------------------------------

## 6. User Journey

### Insurance journey

1.  User uploads policy.
2.  Bharosa extracts and indexes content.
3.  AI creates a simple summary.
4.  Red-Flag Engine finds important clauses.
5.  Policy Reality Check compares user needs with policy terms.
6.  User asks questions in natural language.
7.  AI cites evidence.
8.  Teach-Back verifies understanding.
9.  Decision Receipt is generated.

### Lending journey

1.  User uploads/enters loan offer.
2.  Bharosa extracts disclosed terms.
3.  TrueCost engine calculates repayment.
4.  User compares scenarios.
5.  Digital Twin evaluates affordability scenarios.
6.  AI explains trade-offs.
7.  User reviews consent.
8.  Mock/approved action flow is triggered only after confirmation.

------------------------------------------------------------------------

## 7. Non-Goals

The MVP will not:

-   Guarantee loan approval
-   Guarantee insurance claim approval
-   Replace a financial advisor/lawyer
-   Make autonomous payments
-   Submit real financial applications without explicit authorization
-   Invent missing policy terms
-   Present assumptions as facts
-   Store unnecessary sensitive financial information

------------------------------------------------------------------------

## 8. Product USP

> **Bharosa AI does not just explain financial products. It shows what
> matters, what could go wrong, what the numbers mean, and what the user
> should verify before taking action.**

------------------------------------------------------------------------

## 9. Hackathon MVP

### Must have

-   PDF/document upload
-   OCR/text extraction fallback
-   RAG-based question answering
-   Clause/source citations
-   Red-flag extraction
-   Loan calculator
-   Risk/impact cards
-   Simple chat
-   Consent confirmation
-   Demo dataset
-   Evaluation dashboard

### Nice to have

-   Voice
-   Marathi
-   Policy comparison
-   Contract contradiction detection
-   Financial Digital Twin
-   Teach-Back
-   Decision Receipt

------------------------------------------------------------------------

## 10. Product Risks

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Hallucinated financial advice       RAG + citations + refusal rules

  Incorrect calculations              Deterministic calculation service

  Sensitive data exposure             Encryption, access controls,
                                      minimal retention

  Overconfident answers               Evidence/uncertainty labels

  Poor OCR                            Confidence threshold + user
                                      verification

  Misleading recommendations          Explain trade-offs instead of
                                      forced recommendations

  Unauthorized action                 Explicit confirmation +
                                      authorization checks
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 11. Definition of Done

A feature is complete when:

-   It works end-to-end.
-   Important outputs have evidence.
-   Financial arithmetic is deterministic.
-   Errors are handled gracefully.
-   Security controls are implemented.
-   The feature has at least a basic test set.
-   The demo can be repeated reliably.
