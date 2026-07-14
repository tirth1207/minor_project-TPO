# DOCUMENT 22: Navigation Flow

| **Page Name** | **URL Path** | **Access Role(s)** | **Primary Components** | **API Used** |
| --- | --- | --- | --- | --- |
| Login | **`/login`** | Public | Email/Pass Form | **`supabase.auth.signIn`** |
| Register | **`/register?token=xxx`** | Public (via link) | Registration Form | **`POST /api/auth/register`** |
| SA Dashboard | **`/super-admin`** | Super Admin | Stats Cards, Pending Tables | **`GET /api/super-admin/*`** |
| College Admin Dept Mgmt | **`/college-admin/departments`** | College Admin | Dept Table, Request Form | **`POST /api/college-admin/departments`** |
| College Admin Invites | **`/college-admin/invites`** | College Admin | Link Generator, QR Code | **`POST /api/college-admin/invites`** |
| College Admin Jobs | **`/college-admin/jobs`** | College Admin | Job List, Approve/Reject Btns | **`PATCH /api/college-admin/jobs/:id`** |
| Mentor Students | **`/mentor/students`** | Mentor | Tabs (Pending/Approved), Student Cards | **`GET /api/mentors/students`** |
| Mentor Profile Review | **`/mentor/students/:id`** | Mentor | Profile View, External Link Checker, Action Btns | **`PATCH /api/mentors/students/:id/approve`** |
| Student Profile | **`/student/profile`** | Student | Form (Critical/Non-Critical sections) | **`PUT /api/students/profile`** |
| Student Jobs Feed | **`/student/jobs`** | Student | Job Cards, Eligibility Tags, Blind Count | **`GET /api/students/jobs`** |
| Student Applications | **`/student/applications`** | Student | Application Tracker, Round Status | **`GET /api/students/applications`** |
| Student Offers | **`/student/offers`** | Student | Offer Cards, Accept/Reject Buttons | **`PATCH /api/students/offers/:id/accept`** |
| Student Mock AI | **`/student/mock`** | Student | Chat UI, Loading Queue, Score Display | **`POST /api/students/mock/start`** |
| Company Dashboard | **`/company`** | Company | Stats, Quick Actions | - |
| Company Post Job | **`/company/jobs/new`** | Company | Multi-step Form, Branch Selector | **`POST /api/company/jobs`** |
| Company Applicants | **`/company/jobs/:id/applicants`** | Company | Sortable Table, Checkboxes, Bulk Action | **`GET /api/company/jobs/:id/applicants`** |
| Company Rounds | **`/company/applications/:id/rounds`** | Company | Kanban/List view, Feedback Forms | **`POST /api/company/rounds/update`** |