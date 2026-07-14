# DOCUMENT 2: Product Requirement Document (PRD)

### **2.1 Product Vision**

To create the most seamless, frictionless placement experience for students and administrators by removing manual spreadsheet overhead and replacing it with an intelligent, highly secure, and visually refined web platform.

### **2.2 User Personas**

| **Persona** | **Goal** | **Pain Point** | **Feature Need** |
| --- | --- | --- | --- |
| **Super Admin** | Maintain platform integrity | Fake colleges or spam companies registering | Dashboard to approve Colleges, Companies, and Dept requests. |
| **College Admin** | Maximize student placements | Unqualified students applying; irrelevant jobs | Generate invite links, approve jobs, view mentor progress. |
| **Mentor** | Ensure students present well to companies | Students with private resume links or fake CGPA | Profile approval workflow with "Request Change" tags. |
| **Student** | Get a job seamlessly | Don't know if they are eligible; unprepared for interviews | 1-click eligibility check, AI mock tests, real-time offer tracking. |
| **Company** | Hire top talent efficiently | Sifting through hundreds of irrelevant resumes | Rule-based sorted applicant lists, bulk shortlisting, round management. |

### **2.3 Core Features (MoSCoW Method)**

**Must Have (V1):**

- Multi-tenant College/Department management with strict RLS.
- Magic-link based student onboarding.
- Mentor profile approval system (Critical vs Non-critical edit detection).
- Company Dual-Approval workflow (SA + College Admin).
- Rule-based eligibility engine (Branch, CGPA, Backlogs).
- Job application workflow with "Blind Count" (students only see "40 applied").
- Company shortlisting (Bulk & Individual) and custom interview round management.
- Offer State Machine (Extended, Accepted, Rejected, Revoked) with auto-withdrawal.
- Async AI Mock Interview queue system.

**Should Have (V1):**

- Real-time student dashboard for interview round status updates.
- In-app notification system for approvals, rejections, and offer updates.

**Won't Have (V1 - Future Roadmap):**

- Native file upload system (using URLs for V1).
- AI-powered shortlisting/ranking of applicants.
- Advanced eligibility (10th/12th %, specific skill matching).
- Multi-language support (English only for V1).