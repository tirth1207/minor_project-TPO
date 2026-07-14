# DOCUMENT 7: Functional Requirements

| **ID** | **Module** | **Requirement Description** | **Priority** | **Input** | **Output** |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Auth | System must issue a JWT with custom claims containing **`college_id`**, **`dept_id`**, and **`role`** upon login. | Must | Email/Password | Signed JWT, Refresh Token |
| FR-02 | Auth | System must require email verification for Students before they can access the dashboard. | Must | Email Token Click | User **`email_confirmed_at`** timestamp |
| FR-03 | Onboarding | College Admin must be able to generate a unique, single-use or multi-use magic link for a specific department. | Must | Dept ID | Unique URL String |
| FR-04 | Profile | System must categorize student profile fields into **`CRITICAL`** (CGPA, Resume, Name) and **`NON_CRITICAL`** (Hobbies, Bio). | Must | Field configuration | DB Schema constants |
| FR-05 | Profile | System must trigger a workflow reset to **`PENDING`** if any **`CRITICAL`** field is updated. | Must | Student PUT request | DB Update + Status Change |
| FR-06 | Jobs | System must prevent a Company from posting a job if their global account status is not **`APPROVED`**. | Must | Company POST /jobs | 403 Forbidden Error |
| FR-07 | Jobs | System must calculate eligibility strictly by: **`Student.Branch IN Job.Eligible_Branches`** AND **`Student.CGPA >= Job.Min_CGPA`** AND **`Student.Active_Backlogs <= Job.Max_Backlogs`**. | Must | Student ID, Job ID | Boolean (Eligible/Ineligible) |
| FR-08 | Jobs | College Admin can only Approve/Reject jobs posted for their specific **`college_id`**. | Must | Admin Action | Job-College Mapping Status Update |
| FR-09 | AI Mock | System must enqueue an AI mock interview request if the Nvidia NIM API rate limit (40 RPM) is near capacity. | Must | Student Request | "Processing" UI State, Background Job |
| FR-10 | AI Mock | If a Company sets **`require_mock=true`**, the system must check for a passing mock score before allowing the "Apply" button to render. | Must | Student App View | UI Logic check |
| FR-11 | Application | Students must only see a numerical count of total applicants for a job, not the identities of other applicants. | Must | Student viewing Job | Integer (e.g., "45") |
| FR-12 | Shortlist | Company must be able to sort the applicant list by CGPA (Descending) as the default view. | Must | Company viewing Applicants | Ordered List |
| FR-13 | Rounds | Company can define N number of custom interview rounds when creating the job posting. | Must | Array of Round Names | JSON array in Job table |
| FR-14 | Offers | System must atomically update all active offers to **`WITHDRAWN`** when a student accepts a single offer. | Must | Student Accept Action | Bulk DB Transaction |
| FR-15 | Offers | System must set **`is_placed = true`** on the student profile upon offer acceptance, blocking all future job views/applications. | Must | Student Accept Action | Student Profile Update |