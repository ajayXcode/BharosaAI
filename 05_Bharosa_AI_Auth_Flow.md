# Bharosa AI --- Authentication & Authorization Flow

## 1. Objective

Provide secure user authentication while ensuring that every financial
document, conversation and consent record is accessible only to the
authorized user.

------------------------------------------------------------------------

## 2. Recommended Auth Flow

``` mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Auth API
    participant DB as Database

    U->>FE: Enter email/phone + credentials
    FE->>API: POST /auth/login
    API->>DB: Verify account
    DB-->>API: User record
    API-->>FE: Short-lived access token + refresh session
    FE->>API: Authenticated API request
    API->>API: Validate token
    API->>DB: Check user/resource ownership
    DB-->>API: Authorized
    API-->>FE: Response
```

------------------------------------------------------------------------

## 3. Registration

``` mermaid
flowchart TD
    A[Enter email/phone] --> B[Validate input]
    B --> C[Create account]
    C --> D[Verify email/OTP]
    D --> E[Create user profile]
    E --> F[Login]
```

Store only the minimum required profile information.

------------------------------------------------------------------------

## 4. Login

``` text
User
 ↓
Login form
 ↓
Input validation
 ↓
Credential verification
 ↓
Rate-limit check
 ↓
Create authenticated session
 ↓
Access dashboard
```

Failed login responses should not reveal whether a particular account
exists.

------------------------------------------------------------------------

## 5. Token Strategy

For a web application:

### Access token

-   Short lifetime
-   Used for API access
-   Never place sensitive secrets inside the token

### Refresh session

-   Longer-lived
-   Rotate where supported
-   Revoke on logout/password/security events

For browser applications, prefer secure, HttpOnly cookies for
session/refresh material where the chosen architecture supports them.

------------------------------------------------------------------------

## 6. Authorization Model

Use role + ownership checks.

### Roles

``` text
USER
ADMIN
```

The normal user can access only their own:

-   Documents
-   Chat sessions
-   Findings
-   Financial scenarios
-   Consents
-   Decision receipts

Admin access should be minimized and audited.

------------------------------------------------------------------------

## 7. Document Authorization Flow

``` mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API
    participant DB as Database

    U->>FE: Open document
    FE->>API: GET /documents/:id
    API->>API: Validate session
    API->>DB: Find document
    API->>API: Check document.user_id == session.user_id
    alt Authorized
        API-->>FE: Document metadata/content
    else Unauthorized
        API-->>FE: 403/404
    end
```

Do not rely on frontend hiding unauthorized documents.

------------------------------------------------------------------------

## 8. Chat Authorization

A chat request must carry:

``` text
session_id
user_id from authenticated session
message
```

The backend determines the user ID from the authenticated session rather
than trusting a client-supplied user ID.

Retrieval must be filtered by the authenticated user's document
permissions.

------------------------------------------------------------------------

## 9. Consent Flow

``` mermaid
flowchart TD
    A[User requests financial action] --> B[Generate action preview]
    B --> C[Explain data + destination]
    C --> D[Show risks / assumptions]
    D --> E{User confirms?}
    E -->|No| F[Cancel]
    E -->|Yes| G[Create consent record]
    G --> H[Execute approved action]
    H --> I[Create audit event]
    I --> J[Decision Receipt]
```

The AI must never silently convert a recommendation into an external
financial action.

------------------------------------------------------------------------

## 10. Logout

``` text
User clicks Logout
 ↓
Invalidate/revoke refresh session
 ↓
Clear client session
 ↓
Redirect to login
```

For high-risk events, revoke all active sessions if appropriate.

------------------------------------------------------------------------

## 11. Password Reset

If password authentication is used:

``` text
Forgot password
 ↓
Enter email
 ↓
Send time-limited reset link
 ↓
Validate token
 ↓
Set new password
 ↓
Invalidate old sessions
```

Do not reveal whether an email address is registered.

------------------------------------------------------------------------

## 12. OTP Security

If OTP login is implemented:

-   Expire OTP quickly
-   Limit attempts
-   Rate-limit resend
-   Never log OTP
-   Do not store plaintext OTP unnecessarily
-   Invalidate after successful use

------------------------------------------------------------------------

## 13. Authorization Matrix

  Resource                                  User                         Admin
  ------------------------- -------------------- -----------------------------
  Own documents                Read/Write/Delete   Audited support access only
  Other user documents                        No                    Restricted
  Own chat                            Read/Write                            No
  Own financial scenarios      Read/Write/Delete                            No
  Own consent                        Read/Revoke                       Audited
  Audit logs                  Own limited events                    Restricted
  System configuration                        No                           Yes

Admin access should be narrowly scoped rather than treating
administrators as unrestricted users.

------------------------------------------------------------------------

## 14. Authentication Failure Handling

Return generic messages:

> "Invalid credentials."

Avoid:

> "This email does not exist."

For suspicious behavior:

-   Apply rate limits
-   Add progressive delays
-   Revoke suspicious sessions
-   Record security event

------------------------------------------------------------------------

## 15. Frontend Security

Do not store:

-   API keys
-   Database credentials
-   LLM provider secrets

in frontend JavaScript.

Use HTTPS and secure session handling.

Never assume frontend validation is sufficient; validate every sensitive
field again on the server.

------------------------------------------------------------------------

## 16. End-to-End User Flow

``` text
REGISTER
   ↓
VERIFY
   ↓
LOGIN
   ↓
DASHBOARD
   ↓
UPLOAD DOCUMENT
   ↓
ANALYZE
   ↓
ASK AI
   ↓
VIEW CITED FINDINGS
   ↓
RUN FINANCIAL SIMULATION
   ↓
REVIEW CONSENT
   ↓
CONFIRM ACTION
   ↓
AUDIT EVENT
   ↓
DECISION RECEIPT
```

------------------------------------------------------------------------

## 17. Security Rule

> **Authentication proves identity. Authorization proves permission.
> Consent proves user intent. Audit logs prove what happened.**

This separation should remain visible in the implementation and
architecture.
