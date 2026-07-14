# DOCUMENT 10: Sequence Diagrams

*Rendered using Mermaid.js syntax. You can copy/paste these into any Markdown viewer that supports Mermaid (like Notion, GitHub, or Mermaid Live Editor) to see the visual diagrams.*

**Diagram 1: Student Registration & College Mapping Flow**

```mermaid
sequenceDiagram
actor CA as College Admin
participant App as Next.js App
participant DB as Supabase DB
actor S as Student
CA->>App: Generate Dept Invite Link
App->>DB: Insert Invite Record (dept_id, token)
DB-->>App: Return Magic Link URL
CA->>S: Share Link via WhatsApp/Email

S->>App: Click Magic Link & Fill Form
App->>DB: Create Auth User (email/pass)
DB-->>App: User Created (Unverified)
App->>DB: Insert Student Profile (mapped via token)
DB-->>App: Profile Created
App-->>S: Prompt "Check Email for Verification"

S->>App: Click Email Verification Link
App->>DB: Set email_confirmed_at
DB-->>App: Verified
App-->>S: Redirect to Dashboard (Status: PENDING_APPROVAL)
```

**Diagram 2: Job Posting Dual-Approval Flow**

```mermaid
sequenceDiagram
actor C as Company
participant App as Next.js App
participant DB as Supabase DB
actor SA as Super Admin
actor ColA as College Admin
C->>App: Submit Job Posting
App->>DB: Check Company Status
alt Company Status != APPROVED
    DB-->>App: Error (403 Forbidden)
    App-->>C: "Account pending approval"
else Company Status == APPROVED
    App->>DB: Create Job (Status: PENDING_GLOBAL)
    DB-->>App: Job Created
    App-->>C: "Job submitted, awaiting platform review"

    SA->>App: Views Pending Jobs
    App->>DB: Fetch Pending Jobs
    DB-->>App: Return Jobs
    SA->>App: Approve Job
    App->>DB: Update Job Status to APPROVED_GLOBAL
    DB-->>App: Updated

    Note over App,ColA: Job is now visible to targeted College Admins
    ColA->>App: Views Incoming Jobs
    App->>DB: Fetch Jobs for ColA's College
    DB-->>App: Return Jobs
    ColA->>App: Approve Job for College
    App->>DB: Create Job_College_Mapping (Status: APPROVED_LOCAL)
    DB-->>App: Mapping Created
    App-->>ColA: "Job is now live for your students"
end
```

**Diagram 3: Offer Acceptance & Auto-Withdrawal State Machine**

```mermaid
sequenceDiagram
actor S as Student
participant App as Next.js App
participant DB as Supabase DB
actor C1 as Company A (Accepted)
actor C2 as Company B (Withdrawn)
S->>App: Clicks "Accept Offer" for Company A
App->>DB: Begin Transaction
App->>DB: UPDATE offers SET status = 'ACCEPTED' WHERE id = Offer_A
App->>DB: UPDATE offers SET status = 'AUTO_WITHDRAWN' WHERE student_id = S AND id != Offer_A
App->>DB: UPDATE student_profile SET is_placed = TRUE WHERE id = S
DB-->>App: Transaction Committed Successfully

par Notify Company A
    App-->>C1: Notification: "Student has accepted your offer!"
and Notify Company B
    App-->>C2: Notification: "Student has accepted another offer. Your offer is withdrawn."
and Update Student UI
    App-->>S: Dashboard updates: "Congratulations! Placed at Company A". All job applications locked.
end
```