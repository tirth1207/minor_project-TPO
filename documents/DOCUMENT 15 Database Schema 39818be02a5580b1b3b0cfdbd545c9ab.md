# DOCUMENT 15: Database Schema

*Note: **`uuid`** is used for all primary keys. **`auth.users`** is Supabase's built-in table.*

### **15.1 Organization & Structure**

| **Table** | **Column** | **Type** | **Nullable** | **Default** | **Constraints** | **Description** |
| --- | --- | --- | --- | --- | --- | --- |
| **organizations** | id | uuid | No | gen_random_uuid() | PK | College ID |
|  | name | varchar | No |  |  | Name of Institution |
|  | status | enum | No | 'PENDING' | CHECK (PENDING, ACTIVE, REJECTED) | Super Admin approval status |
|  | created_at | timestamptz | No | now() |  |  |
| **departments** | id | uuid | No | gen_random_uuid() | PK |  |
|  | org_id | uuid | No |  | FK -> organizations.id | Tenant Isolation |
|  | name | varchar | No |  |  | e.g., Computer Engineering |
|  | status | enum | No | 'PENDING' | CHECK (PENDING, ACTIVE, REJECTED) | SA approval if added later |
|  | created_at | timestamptz | No | now() |  |  |
| **invite_links** | id | uuid | No | gen_random_uuid() | PK |  |
|  | dept_id | uuid | No |  | FK -> departments.id |  |
|  | token | varchar | No |  | UNIQUE | The magic link token |
|  | used_count | int | No | 0 |  | Can be multi-use |
|  | created_by | uuid | No |  | FK -> auth.users.id | College Admin who created it |
|  | expires_at | timestamptz | No |  |  |  |

### **15.2 Users & Profiles**

| **Table** | **Column** | **Type** | **Nullable** | **Default** | **Constraints** | **Description** |
| --- | --- | --- | --- | --- | --- | --- |
| **users** | id | uuid | No |  | PK, FK -> auth.users.id | 1:1 with Supabase Auth |
|  | role | enum | No |  | CHECK (SA, COLLEGE_ADMIN, MENTOR, STUDENT, COMPANY) | Global role |
|  | org_id | uuid | Yes |  | FK -> organizations.id | Null for Super Admin & Company |
|  | dept_id | uuid | Yes |  | FK -> departments.id | Null for non-department roles |
| **company_profiles** | id | uuid | No | gen_random_uuid() | PK |  |
|  | user_id | uuid | No |  | FK -> users.id, UNIQUE |  |
|  | company_name | varchar | No |  |  |  |
|  | website | varchar | Yes |  |  |  |
|  | status | enum | No | 'PENDING' | CHECK (PENDING, ACTIVE, REJECTED) | Super Admin approval |
| **student_profiles** | id | uuid | No | gen_random_uuid() | PK |  |
|  | user_id | uuid | No |  | FK -> users.id, UNIQUE |  |
|  | enrollment_no | varchar | No |  | UNIQUE |  |
|  | name | varchar | No |  |  | Critical Field |
|  | dob | date | Yes |  |  |  |
|  | address | text | Yes |  |  |  |
|  | phone | varchar | Yes |  |  |  |
|  | bio | text | Yes |  |  | Non-Critical |
|  | cgpa | decimal(3,2) | No | 0.00 | CHECK (cgpa <= 10.00) | Critical Field |
|  | active_backlogs | int | No | 0 |  | Used for eligibility |
|  | semester | int | No |  |  |  |
|  | branch | varchar | No |  |  | Denormalized for fast eligibility checks |
|  | skills | text[] | Yes |  | ARRAY | Non-Critical |
|  | hobbies | text[] | Yes |  | ARRAY | Non-Critical |
|  | resume_url | varchar | No |  |  | Critical Field (External Link) |
|  | marksheet_url | varchar | Yes |  |  |  |
|  | social_links | jsonb | Yes |  |  | {linkedin: "", github: ""} |
|  | profile_status | enum | No | 'PENDING' | CHECK (PENDING, APPROVED, REJECTED) | Mentor approval |
|  | is_placed | boolean | No | false |  | Locked upon offer acceptance |

### **15.3 Jobs & Applications**

| **Table** | **Column** | **Type** | **Nullable** | **Default** | **Constraints** | **Description** |
| --- | --- | --- | --- | --- | --- | --- |
| **job_postings** | id | uuid | No | gen_random_uuid() | PK |  |
|  | company_id | uuid | No |  | FK -> company_profiles.id |  |
|  | title | varchar | No |  |  |  |
|  | description | text | No |  |  |  |
|  | ctc_min | decimal | Yes |  |  |  |
|  | ctc_max | decimal | Yes |  |  |  |
|  | location | varchar | No |  |  |  |
|  | work_mode | enum | No |  | CHECK (REMOTE, ONSITE, HYBRID) |  |
|  | min_cgpa | decimal(3,2) | No | 0.00 |  | Eligibility |
|  | max_backlogs | int | No | 0 |  | Eligibility |
|  | date_of_visit | date | Yes |  |  |  |
|  | require_mock | boolean | No | false |  | AI gate toggle |
|  | mock_pass_score | int | Yes | 50 |  | Score needed to apply if mock required |
|  | global_status | enum | No | 'PENDING' | CHECK (PENDING, APPROVED, REJECTED) | Super Admin approval |
|  | rounds | jsonb | No | '[]' |  | ["Aptitude", "Technical", "HR"] |
| **job_eligible_branches** | job_id | uuid | No |  | FK -> job_postings.id, PK (composite) |  |
|  | branch_name | varchar | No |  | PK (composite) | e.g., "Computer Engineering" |
| **job_college_mappings** | id | uuid | No | gen_random_uuid() | PK |  |
|  | job_id | uuid | No |  | FK -> job_postings.id |  |
|  | org_id | uuid | No |  | FK -> organizations.id | Target College |
|  | local_status | enum | No | 'PENDING' | CHECK (PENDING, APPROVED, REJECTED) | College Admin approval |
| **applications** | id | uuid | No | gen_random_uuid() | PK |  |
|  | student_id | uuid | No |  | FK -> student_profiles.id |  |
|  | job_college_map_id | uuid | No |  | FK -> job_college_mappings.id |  |
|  | status | enum | No | 'APPLIED' | CHECK (APPLIED, WITHDRAWN, SHORTLISTED, REJECTED, OFFERED) | Application state |
|  | applied_at | timestamptz | No | now() |  |  |
|  | mock_score | int | Yes |  |  | Populated if company requires mock |

### **15.4 Interviews & Offers**

| **Table** | **Column** | **Type** | **Nullable** | **Default** | **Constraints** | **Description** |
| --- | --- | --- | --- | --- | --- | --- |
| **application_rounds** | id | uuid | No | gen_random_uuid() | PK |  |
|  | application_id | uuid | No |  | FK -> applications.id |  |
|  | round_name | varchar | No |  |  | e.g., "Technical Round 1" |
|  | status | enum | No | 'PENDING' | CHECK (PENDING, CLEARED, FAILED, SCHEDULED) |  |
|  | company_feedback | text | Yes |  |  |  |
| **offers** | id | uuid | No | gen_random_uuid() | PK |  |
|  | application_id | uuid | No |  | FK -> applications.id, UNIQUE |  |
|  | ctc_offered | decimal | No |  |  |  |
|  | status | enum | No | 'EXTENDED' | CHECK (EXTENDED, ACCEPTED, REJECTED, REVOKED, AUTO_WITHDRAWN) | State Machine |
|  | extended_at | timestamptz | No | now() |  |  |
|  | decided_at | timestamptz | Yes |  |  | When accepted/rejected/revoked |

### **15.5 AI & Notifications**

| **Table** | **Column** | **Type** | **Nullable** | **Default** | **Constraints** | **Description** |
| --- | --- | --- | --- | --- | --- | --- |
| **mock_interviews** | id | uuid | No | gen_random_uuid() | PK |  |
|  | student_id | uuid | No |  | FK -> student_profiles.id |  |
|  | job_role_context | varchar | No |  |  | e.g., "Frontend Developer" |
|  | questions | jsonb | No | '[]' |  | AI generated questions |
|  | answers | jsonb | No | '[]' |  | Student responses |
|  | ai_score | int | Yes |  |  | 0-100 |
|  | ai_feedback | text | Yes |  |  |  |
|  | status | enum | No | 'GENERATING' | CHECK (GENERATING, READY, COMPLETED, FAILED) | Async queue state |
| **notifications** | id | uuid | No | gen_random_uuid() | PK |  |
|  | user_id | uuid | No |  | FK -> users.id | Recipient |
|  | title | varchar | No |  |  |  |
|  | message | text | No |  |  |  |
|  | is_read | boolean | No | false |  |  |
|  | created_at | timestamptz | No | now() |  |  |