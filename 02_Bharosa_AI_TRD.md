# Bharosa AI --- Technical Requirements Document (TRD)

## 1. Technical Objective

Build a modular AI financial-journey platform that combines document
intelligence, retrieval-augmented generation, deterministic financial
calculations, conversational AI and secure user workflows.

The architecture should be suitable for a hackathon MVP while allowing
future integration with fintech/insurance/lending platforms.

------------------------------------------------------------------------

## 2. High-Level Architecture

``` mermaid
flowchart TD
    U[Web / Mobile Client] --> A[API Gateway]
    A --> AUTH[Authentication & Authorization]
    A --> DOC[Document Service]
    A --> CHAT[AI Orchestrator]
    A --> FIN[Financial Calculation Engine]
    A --> JOURNEY[Journey Engine]

    DOC --> OCR[OCR / Text Extraction]
    DOC --> CHUNK[Chunking + Metadata]
    CHUNK --> EMB[Embedding Service]
    EMB --> VDB[(Vector Database)]

    CHAT --> RET[Retriever]
    RET --> VDB
    CHAT --> LLM[LLM]
    CHAT --> GUARD[Safety / Grounding Guard]

    FIN --> CALC[Deterministic Calculators]
    JOURNEY --> CONSENT[Consent Service]

    A --> DB[(PostgreSQL)]
    A --> LOG[Audit / Security Logs]
```

------------------------------------------------------------------------

## 3. Suggested Technology Stack

### Frontend

-   React + TypeScript
-   Tailwind CSS
-   Component library of choice
-   Browser speech APIs or approved voice provider for demo

### Backend

-   Python + FastAPI OR Node.js + TypeScript
-   REST APIs
-   Async job processing for document ingestion

### AI

-   LLM provider selected by the team
-   Embedding model
-   RAG pipeline
-   Structured JSON outputs
-   Guardrails and validation layer

### Data

-   PostgreSQL for application data
-   pgvector or another vector store for embeddings
-   Object storage for encrypted document files

### Authentication

-   JWT/session-based authentication
-   OAuth/OTP can be added for the demo

### Deployment

-   Frontend: Vercel or equivalent
-   Backend: Railway/Render/cloud VM or equivalent
-   Managed PostgreSQL
-   HTTPS everywhere

------------------------------------------------------------------------

## 4. Core Services

### 4.1 Auth Service

Responsibilities:

-   Register/login
-   Session/token handling
-   Role management
-   Logout/revocation
-   Password reset if password auth is used
-   Consent linkage

### 4.2 Document Service

Responsibilities:

-   Upload
-   MIME/type validation
-   Virus/malware scanning where supported
-   OCR/text extraction
-   Page segmentation
-   Metadata extraction
-   Secure storage
-   Deletion

### 4.3 Retrieval Service

Responsibilities:

-   Chunk documents
-   Preserve page/section metadata
-   Generate embeddings
-   Retrieve relevant chunks
-   Apply reranking if available

### 4.4 AI Orchestrator

Responsibilities:

-   Understand intent
-   Select tools
-   Retrieve evidence
-   Call LLM
-   Validate structured output
-   Apply safety policy
-   Return cited answer

### 4.5 Financial Engine

Functions:

``` text
calculate_emi()
calculate_total_repayment()
calculate_interest()
calculate_effective_cost()
generate_amortization_schedule()
run_affordability_scenario()
```

The LLM must never be the source of truth for these calculations.

### 4.6 Journey Engine

Represent a journey as:

``` text
Journey
 ├── User
 ├── Product
 ├── Documents
 ├── Tasks
 ├── Decisions
 ├── Consents
 └── Audit Events
```

------------------------------------------------------------------------

## 5. Data Model

### User

``` text
id
email/phone
name
preferred_language
created_at
updated_at
```

### Document

``` text
id
user_id
filename
document_type
storage_key
sha256
status
created_at
deleted_at
```

### DocumentChunk

``` text
id
document_id
page_number
section
content
embedding
```

### Finding

``` text
id
document_id
type
severity
title
explanation
impact
source_page
source_text
confidence_metadata
```

### FinancialScenario

``` text
id
user_id
principal
rate
tenure
fees
income
expenses
existing_emi
scenario_parameters
result
```

### Consent

``` text
id
user_id
purpose
data_scope
destination
version
accepted_at
revoked_at
```

### AuditEvent

``` text
id
user_id
action
resource_type
resource_id
timestamp
ip_hash_or_metadata
result
```

------------------------------------------------------------------------

## 6. API Requirements

### Authentication

``` http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
```

### Documents

``` http
POST /api/documents
GET  /api/documents
GET  /api/documents/{id}
DELETE /api/documents/{id}
POST /api/documents/{id}/analyze
```

### Chat

``` http
POST /api/chat/sessions
POST /api/chat/sessions/{id}/messages
GET  /api/chat/sessions/{id}
```

### Financial calculations

``` http
POST /api/finance/loan/calculate
POST /api/finance/loan/compare
POST /api/finance/affordability/simulate
```

### Findings

``` http
GET /api/documents/{id}/findings
GET /api/findings/{id}
```

### Consent

``` http
POST /api/consents
GET  /api/consents
POST /api/consents/{id}/revoke
```

------------------------------------------------------------------------

## 7. RAG Pipeline

``` text
Upload
  ↓
Validate
  ↓
Extract text/OCR
  ↓
Page + section segmentation
  ↓
Chunk
  ↓
Embed
  ↓
Store vectors + metadata
  ↓
User question
  ↓
Intent detection
  ↓
Retrieve top-k chunks
  ↓
Optional reranking
  ↓
LLM grounded generation
  ↓
Citation validation
  ↓
Safety validation
  ↓
Response
```

### Grounding rule

If evidence is insufficient:

> "I could not verify this from the uploaded document."

Never fill missing terms using assumptions.

------------------------------------------------------------------------

## 8. AI Output Contract

Example:

``` json
{
  "answer": "Plain-language explanation",
  "sources": [
    {
      "page": 7,
      "section": "Waiting Period",
      "quote": "Relevant short evidence"
    }
  ],
  "risk_level": "important",
  "uncertainties": [
    "The document does not specify..."
  ],
  "next_action": "Confirm this condition with the insurer."
}
```

The backend should validate this schema before returning it to the
client.

------------------------------------------------------------------------

## 9. AI Guardrails

### Input

-   Prompt injection detection
-   File type validation
-   Maximum document size
-   Malicious content scanning
-   PII-aware logging

### Retrieval

-   User-specific access control
-   Document-level isolation
-   Metadata filtering

### Generation

-   Evidence requirement
-   Structured output
-   Uncertainty detection
-   Financial/legal advice restrictions

### Output

-   Citation check
-   PII leakage check
-   Unsupported claim check
-   Numerical consistency check

------------------------------------------------------------------------

## 10. Non-Functional Requirements

### Performance targets for prototype

-   UI response for normal API calls: \< 2 seconds where practical
-   Document processing: asynchronous
-   Chat response: streaming where possible
-   Calculator response: near-instant
-   System should remain usable on low-end mobile devices

These are engineering targets, not demonstrated benchmark results.

### Availability

For hackathon MVP:

-   Health endpoint
-   Error monitoring
-   Retry handling
-   Graceful AI provider failure

------------------------------------------------------------------------

## 11. Observability

Track:

-   API latency
-   Error rate
-   LLM latency
-   Token usage
-   Retrieval latency
-   Document processing failures
-   Citation validation failures
-   Calculator errors
-   Authentication failures

Never log raw passwords, OTPs, access tokens or unnecessary financial
documents.

------------------------------------------------------------------------

## 12. Testing

### Unit

-   EMI calculations
-   Fee calculations
-   Risk classification
-   Permission checks

### Integration

-   Upload → extraction → RAG
-   Auth → document access
-   Chat → retrieval → citation

### Security

-   Broken access control
-   Prompt injection
-   File upload abuse
-   Token theft simulation
-   Rate-limit testing

### AI evaluation

Create a small golden dataset:

``` text
Question
Expected answer
Expected source page
Expected risk
Expected calculation
```

Track grounded-answer accuracy and citation accuracy.
