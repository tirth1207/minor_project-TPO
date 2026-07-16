# TPO Placement Portal - AI Agent Rulebook

This document defines the strict workflow, technical stack, design system, and development guidelines for all AI agents working on the Training and Placement Office (TPO) Portal.

---

## 🔄 1. CRITICAL WORKFLOW (Always Follow)

Before writing any code or proposing solutions, you MUST follow these steps:

### Step 1: Read Project Documents First
- Locate and read the relevant specification files in the `documents/` directory.
- Never make assumptions about business logic (e.g. eligibility requirements, state transitions, approvals). Always refer to:
  - [PRD (Doc 2)](file:///c:/Users/ratho/OneDrive/Desktop/Dev/MinorProjectTPO/tpo/documents/DOCUMENT%202%20Product%20Requirement%20Document%20(PRD)%2039718be02a55809b8ed4eb4bff30cdb7.md)
  - [DB Schema (Doc 15)](file:///c:/Users/ratho/OneDrive/Desktop/Dev/MinorProjectTPO/tpo/documents/DOCUMENT%2015%20Database%20Schema%2039818be02a5580b1b3b0cfdbd545c9ab.md)
  - [API Spec (Doc 17)](file:///c:/Users/ratho/OneDrive/Desktop/Dev/MinorProjectTPO/tpo/documents/DOCUMENT%2017%20Complete%20API%20Specification%2039818be02a5580f59629c150ee8f6c7b.md)
  - [RBAC Matrix (Doc 18)](file:///c:/Users/ratho/OneDrive/Desktop/Dev/MinorProjectTPO/tpo/documents/DOCUMENT%2018%20RBAC%20Matrix%2039818be02a5580d8a4fbf5ff10888d78.md)

### Step 2: Propose Implementation Plan
- Always draft a brief implementation plan summarizing the files to modify, the code changes, and potential side-effects.
- Get user confirmation before proceeding with complex modifications.

### Step 3: Implement & Validate
- Write type-safe, clean, and modular code.
- Run `npm run lint` and `npm run build` to verify there are no TypeScript compiler or ESLint warnings.

---

## 💻 2. TECHNICAL STACK & CONVENTIONS

- **Framework**: Next.js App Router (using React Server Components by default).
- **Database / Auth**: Supabase Cloud via `@supabase/ssr` (no heavy ORMs like Prisma or Drizzle).
- **Custom JWT Claims**: Role-based access control (RBAC) relies on custom claims injected into `auth.users.raw_app_meta_data` via database triggers. Direct queries should use `auth.uid()` and `(auth.jwt() ->> 'org_id')::uuid`.
- **Database Safety**: Row Level Security (RLS) is enabled on all tables. Never bypass RLS in the frontend; always query within the authenticated session context. Use `service_role` client strictly in isolated API routes/Server Actions where auth-bypass is required.

---

## 🎨 3. UI/UX & DESIGN SYSTEM (Apple Minimalism)

All UI elements must look premium, modern, and clean:
- **Style**: Soft backgrounds, thin borders, high whitespace, subtle shadows, Outfit or Inter typography.
- **Colors**: Slick dark mode support, HSL-tailored colors. Avoid raw prime colors (e.g. pure red/blue/green). Use neutral slates and zincs.
- **Components**: Utilize shadcn/ui primitives. Avoid ad-hoc inline styles. Use pre-defined CSS tokens or Tailwind utility classes.
- **Micro-interactions**: Use smooth transitions (`transition-all duration-200`) and hover states.

---

## 🛡️ 4. KEY BUSINESS LOGIC ENFORCEMENT

- **Job Eligibility Rule**: Calculated dynamically as:
  `Student.Branch IN Job.Eligible_Branches` AND `Student.CGPA >= Job.Min_CGPA` AND `Student.Active_Backlogs <= Job.Max_Backlogs` (plus matching target college organization and approval status).
- **Profile Status Gate**: If a student updates a critical field (`name`, `cgpa`, `resume_url`), their profile status reverts automatically to `PENDING` and job-applying permissions are locked.
- **Placement State Machine**: Accepting a job offer automatically flips `is_placed` to `true`, changes the accepted application status to `OFFERED`, withdraws all other active applications (`WITHDRAWN`), and withdraws other extended offers (`AUTO_WITHDRAWN`).
- **Blind Applicant Count**: Students must only see the count of applicants for a job, never user profile details of other applicants. Enforced via the security-definer helper function `public.get_job_applicant_count(map_id)`.
