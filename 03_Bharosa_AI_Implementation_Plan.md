# Bharosa AI --- Implementation Plan

## 1. Objective

Build a reliable hackathon MVP for the Paytm Build for India AI
Hackathon --- Track 2.

The team should prioritize one excellent financial journey over a large
number of unfinished features.

------------------------------------------------------------------------

## 2. MVP Scope

### P0 --- Build first

1.  Authentication
2.  Secure document upload
3.  Document extraction
4.  RAG question answering
5.  Source/page citations
6.  Red-Flag Engine
7.  Deterministic loan calculator
8.  Risk/impact dashboard
9.  Consent confirmation
10. Demo-ready end-to-end journey

### P1 --- Add if P0 is stable

1.  Policy Reality Check
2.  Contract Contradiction Hunter
3.  Financial Teach-Back
4.  Voice
5.  Multilingual mode
6.  Financial Decision Receipt

### P2 --- Stretch

1.  Financial Digital Twin
2.  Policy Change Radar
3.  ClaimReady
4.  Family sharing
5.  Advanced journey automation

------------------------------------------------------------------------

## 3. Suggested Team Split

### Member A --- AI / RAG

Own:

-   PDF extraction
-   OCR fallback
-   Chunking
-   Embeddings
-   Retrieval
-   Prompting
-   Citation generation
-   Red-Flag Engine
-   AI evaluation

### Member B --- Frontend

Own:

-   Login/signup
-   Dashboard
-   Upload UI
-   Document viewer
-   Findings cards
-   Chat
-   Scenario calculator
-   Consent screens
-   Demo UX

### Member C --- Backend / Security / Fintech

Own:

-   APIs
-   PostgreSQL
-   Auth
-   Authorization
-   Financial calculation service
-   Consent service
-   Audit logs
-   Deployment
-   Monitoring

All members:

-   Integration
-   Testing
-   Demo rehearsal
-   Pitch

------------------------------------------------------------------------

## 4. Development Sequence

### Phase 1 --- Foundation

``` text
Repository
→ Environment configuration
→ Database
→ Backend skeleton
→ Frontend skeleton
→ Auth
→ CI checks
```

### Phase 2 --- Document Intelligence

``` text
Upload
→ Storage
→ Extraction
→ Chunking
→ Embedding
→ Vector search
```

### Phase 3 --- Bharosa Intelligence

``` text
RAG
→ Citation engine
→ Red-Flag Engine
→ Risk cards
→ Chat
```

### Phase 4 --- Financial Journey

``` text
Loan data
→ Deterministic calculations
→ Comparison
→ Scenario simulation
→ Decision summary
```

### Phase 5 --- Trust Layer

``` text
Consent
→ Audit events
→ Evidence labels
→ Uncertainty
→ Safety checks
```

### Phase 6 --- Polish

``` text
Loading states
→ Error states
→ Mobile UX
→ Demo dataset
→ Analytics
→ Pitch recording
```

------------------------------------------------------------------------

## 5. Six-Day Execution Strategy

### Day 1 --- Architecture + Auth

Deliver:

-   Git repository
-   Backend/frontend setup
-   Database
-   Auth
-   Basic dashboard
-   Environment variables

### Day 2 --- Document Pipeline

Deliver:

-   Upload
-   Extraction
-   Page metadata
-   Chunking
-   Vector storage
-   Basic document viewer

### Day 3 --- RAG + Red Flags

Deliver:

-   Contextual chat
-   Citations
-   Important clause extraction
-   Risk cards
-   Unsupported-answer fallback

### Day 4 --- Financial Intelligence

Deliver:

-   EMI calculator
-   Total repayment
-   Fees
-   Scenario comparison
-   Affordability simulation

### Day 5 --- Differentiation

Choose only 1--3:

-   Policy Reality Check
-   Contract Contradiction Hunter
-   Teach-Back
-   Consent Guardian
-   Decision Receipt

Then test the complete journey.

### Day 6 --- Demo + Reliability

Do:

-   Bug fixing
-   Security review
-   Performance checks
-   AI evaluation
-   Demo rehearsal
-   Backup demo
-   Final PPT
-   Architecture diagram
-   Q&A preparation

------------------------------------------------------------------------

## 6. Git Strategy

``` text
main
 ├── develop
 │    ├── feature/auth
 │    ├── feature/document-rag
 │    ├── feature/red-flags
 │    ├── feature/finance-engine
 │    └── feature/security
```

Use pull requests for merging into `develop`.

Before `main`:

-   Tests pass
-   Environment variables verified
-   No secrets committed
-   Demo flow verified

------------------------------------------------------------------------

## 7. Environment Configuration

Example:

``` env
DATABASE_URL=
JWT_SECRET=
LLM_API_KEY=
EMBEDDING_API_KEY=
OBJECT_STORAGE_KEY=
VECTOR_DATABASE_URL=
```

Never commit `.env`.

Commit:

``` text
.env.example
```

------------------------------------------------------------------------

## 8. Demo Data

Prepare fictional documents.

### Insurance

-   Policy document
-   Customer needs
-   Sample medical scenario

### Lending

-   Sample KFS
-   Loan agreement
-   Processing fee
-   Interest rate
-   Tenure

Never use real customer financial documents in the public demo.

------------------------------------------------------------------------

## 9. Evaluation Plan

Create 30--50 representative questions.

Measure:

### Retrieval

Did the system retrieve the correct page?

### Grounding

Is the answer supported by the retrieved text?

### Citation

Does the citation point to the correct page/section?

### Calculation

Does the result match the deterministic calculator?

### Safety

Does the system refuse to invent missing terms?

------------------------------------------------------------------------

## 10. Release Checklist

### Product

-   [ ] Core journey works
-   [ ] Errors have user-friendly messages
-   [ ] Mobile UI works
-   [ ] Loading states work
-   [ ] Demo data prepared

### AI

-   [ ] Citations work
-   [ ] Hallucination fallback works
-   [ ] Prompt injection handling exists
-   [ ] Calculation tools are deterministic
-   [ ] Evaluation results recorded

### Security

-   [ ] HTTPS
-   [ ] Auth enabled
-   [ ] Authorization enforced
-   [ ] Rate limits
-   [ ] Secure secrets
-   [ ] Audit logs
-   [ ] File validation
-   [ ] Sensitive logging disabled

### Presentation

-   [ ] Problem
-   [ ] Solution
-   [ ] Live demo
-   [ ] Architecture
-   [ ] USP
-   [ ] Impact
-   [ ] Business model
-   [ ] Future roadmap
