# DOCUMENT 17: Complete API Specification

*Structured for Next.js App Router (e.g., **`app/api/.../route.ts`**). All endpoints require Bearer JWT except Auth.*

### **Authentication & Users**

| Module | Method | Route | Path / Query Parameters | Request Body | Success Response | Authentication | Authorization | Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | POST | `/api/auth/register` | None | `{ email, password, inviteToken }` | `{ user, session }` | No | Public | Register a new student using an invitation token. |
| Auth | POST | `/api/auth/login` | None | `{ email, password }` | `{ user, session, role }` | No | Public | Authenticate a user and create a session. |
| Users | GET | `/api/users/me` | None | None | `{ user, studentProfile, companyProfile }` | Yes | Authenticated User | Retrieve the currently authenticated user's profile and role-specific information. |
| Users | PATCH | `/api/users/me` | None | `{ phone, bio }` | `{ updated: true, user }` | Yes | Owner (Self) | Update editable, non-critical profile information. |

### **Profile Management (Students)**

| Module | Method | Route | Path / Query Parameters | Request Body | Success Response | Authentication | Authorization | Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Profile | GET | `/api/students/profile` | None | None | `{ ...studentProfile }` | Yes | Student (Self) | Retrieve the authenticated student's profile. |
| Profile | PUT | `/api/students/profile` | None | `{ name, cgpa, resumeUrl }` | `{ profileStatus: "PENDING" }` | Yes | Student (Self) | Update critical profile fields. Changes require mentor re-approval and reset the profile status to **PENDING**. |
| Profile | GET | `/api/mentors/students` | `status=PENDING` *(optional)* | None | `{ students: [...] }` | Yes | Mentor | Retrieve assigned students, optionally filtered by profile status. |
| Profile | PATCH | `/api/mentors/students/{studentId}/approve` | `studentId: UUID` | None | `{ profileStatus: "APPROVED" }` | Yes | Mentor | Approve a student's profile after verification. |
| Profile | PATCH | `/api/mentors/students/{studentId}/reject` | `studentId: UUID` | `{ reasonTag, comment }` | `{ profileStatus: "REJECTED" }` | Yes | Mentor | Reject a student's profile with a predefined reason and optional comment. |

### **Organization & Onboarding**

| Module | Method | Route | Path / Query Parameters | Request Body | Success Response | Authentication | Authorization | Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Organizations | GET | `/api/super-admin/organizations` | `status=PENDING` *(optional)* | None | `{ organizations: [...] }` | Yes | Super Admin | Retrieve organizations (colleges) filtered by approval status. |
| Organizations | PATCH | `/api/super-admin/organizations/{organizationId}` | `organizationId: UUID` | `{ status }` | `{ success: true, organization }` | Yes | Super Admin | Approve, reject, suspend, or update an organization's status. |
| Departments | POST | `/api/college-admin/departments` | None | `{ name }` | `{ department, status: "PENDING" }` | Yes | College Admin | Submit a request to create a new department for approval. |
| Invitations | POST | `/api/college-admin/invites` | None | `{ departmentId }` | `{ inviteLink, expiresAt }` | Yes | College Admin | Generate a secure invitation link for student registration within a department. |

### **Jobs & Applications**

| Module | Method | Route | Path / Query Parameters | Request Body | Success Response | Authentication | Authorization | Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jobs | POST | `/api/company/jobs` | None | `{ title, description, branches, minCgpa, maxBacklogs, package, location, deadline, mockTestRequired }` | `{ job, globalStatus: "PENDING" }` | Yes | Company | Create a new job posting. The job remains pending until approved by the Super Admin. |
| Jobs | GET | `/api/super-admin/jobs` | `status=PENDING` *(optional)* | None | `{ jobs: [...] }` | Yes | Super Admin | Retrieve job postings awaiting global approval. |
| Jobs | GET | `/api/college-admin/jobs` | `status=PENDING` *(optional)* | None | `{ jobCollegeMappings: [...] }` | Yes | College Admin | View job postings assigned to the college for local approval. |
| Jobs | PATCH | `/api/college-admin/jobs/{mappingId}` | `mappingId: UUID` | `{ localStatus }` | `{ success: true, mapping }` | Yes | College Admin | Approve or reject a job posting for the college. |
| Jobs | GET | `/api/students/jobs` | `branch`, `page`, `limit`, `search` *(optional)* | None | `{ jobs: [...] }` | Yes | Student | Retrieve only the job postings for which the student is eligible. |
| Applications | POST | `/api/students/jobs/{mappingId}/apply` | `mappingId: UUID` | None | `{ applicationId, status }` | Yes | Student | Submit an application after all eligibility and AI mock test checks pass. |
| Applications | GET | `/api/company/jobs/{jobId}/applicants` | `jobId: UUID`, `sort`, `page`, `limit` *(optional)* | None | `{ applicants: [...] }` | Yes | Company | Retrieve applicants for a job with sorting and pagination support. |
| Applications | POST | `/api/company/applications/shortlist` | None | `{ applicationIds }` | `{ shortlisted: true, count }` | Yes | Company | Bulk shortlist multiple student applications. |

### **Offers & Placements**

| Module | Method | Route | Path / Query Parameters | Request Body | Success Response | Authentication | Authorization | Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Offers | POST | `/api/company/applications/{applicationId}/offer` | `applicationId: UUID` | `{ ctcOffered }` | `{ offer, offerStatus: "EXTENDED" }` | Yes | Company | Create and extend an offer to a shortlisted applicant. |
| Offers | PATCH | `/api/students/offers/{offerId}/accept` | `offerId: UUID` | None | `{ isPlaced: true, withdrawnApplications, acceptedOffer }` | Yes | Student | Accept an offer. Marks the student as placed and automatically withdraws all other active applications and offers. |
| Offers | PATCH | `/api/company/offers/{offerId}/revoke` | `offerId: UUID` | None | `{ offerStatus: "REVOKED" }` | Yes | Company | Revoke an offer before it has been accepted by the student. |

### **AI Mock Interviews**

| Module | Method | Route | Path / Query Parameters | Request Body | Success Response | Authentication | Authorization | Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mock Interviews | POST | `/api/students/mock-interviews` | None | `{ jobRoleContext }` | `{ mockInterviewId, status: "GENERATING" }` | Yes | Student | Create a new AI mock interview request. The interview enters the generation queue. |
| Mock Interviews | GET | `/api/students/mock-interviews/{mockInterviewId}` | `mockInterviewId: UUID` | None | `{ status, questions }` | Yes | Student | Retrieve the current status of question generation and, when ready, the generated interview questions. |
| Mock Interviews | POST | `/api/students/mock-interviews/{mockInterviewId}/submit` | `mockInterviewId: UUID` | `{ answers }` | `{ aiScore, aiFeedback, completedAt }` | Yes | Student | Submit interview answers for AI evaluation and receive a score with detailed feedback. |