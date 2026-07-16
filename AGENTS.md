# TPO Placement Portal - AI Agent Rulebook

This document defines the strict workflow, technical stack, design system, and development guidelines for all AI agents working on the Training and Placement Office (TPO) Portal.

---

## 🔄 1. CRITICAL WORKFLOW (Always Follow)

Before writing any code or proposing solutions, you MUST follow these steps in order. This ensures consistency across all AI models:

### Step 1: Get Context First (Read Project Documents)
- Do NOT make assumptions about business logic or architecture.
- Locate and read the relevant specification files in the `documents/` directory:
  - [PRD (Doc 2)](file:///c:/Users/ratho/OneDrive/Desktop/Dev/MinorProjectTPO/tpo/documents/DOCUMENT%202%20Product%20Requirement%20Document%20(PRD)%2039718be02a55809b8ed4eb4bff30cdb7.md) - Features, scope, and MoSCoW.
  - [DB Schema (Doc 15)](file:///c:/Users/ratho/OneDrive/Desktop/Dev/MinorProjectTPO/tpo/documents/DOCUMENT%2015%20Database%20Schema%2039818be02a5580b1b3b0cfdbd545c9ab.md) - Relational designs and constraints.
  - [API Spec (Doc 17)](file:///c:/Users/ratho/OneDrive/Desktop/Dev/MinorProjectTPO/tpo/documents/DOCUMENT%2017%20Complete%20API%20Specification%2039818be02a5580f59629c150ee8f6c7b.md) - Route and action payloads.
  - [RBAC Matrix (Doc 18)](file:///c:/Users/ratho/OneDrive/Desktop/Dev/MinorProjectTPO/tpo/documents/DOCUMENT%2018%20RBAC%20Matrix%2039818be02a5580d8a4fbf5ff10888d78.md) - Role-based permissions.
- Check the active database schema definition in [schema.sql](file:///c:/Users/ratho/OneDrive/Desktop/Dev/MinorProjectTPO/tpo/supabase/schema.sql) to align with actual columns, triggers, functions, and RLS policies.

### Step 2: Propose Implementation Plan
- Formulate a brief, structured implementation plan in your thinking or as an artifact.
- Outline:
  1. The files that will be modified, created, or deleted.
  2. The code structure, variables, and logic.
  3. Potential side effects on existing workflows, triggers, or RLS policies.
- Wait for user feedback or approval before performing complex modifications.

### Step 3: Implement Clean & Type-Safe Code
- Implement modular, readable, and highly typed code.
- Avoid shortcuts (like using TypeScript `any`, skipping error handling, or writing inline styles).

### Step 4: Verify & Validate
- Validate your code compilation and correctness:
  - Run Lint Check: `npm run lint`
  - Run Project Build: `npm run build`
- Address all warnings, compilation errors, and lint rule violations before concluding the task.

---

## 💻 2. TECHNICAL STACK & CONVENTIONS

- **Framework**: Next.js App Router.
  - React Server Components (RSC) by default for data fetching and layout structure.
  - Client Components (`"use client"`) strictly reserved for client-side state, user events (clicks, input changes), or browser API usage.
- **Database / Auth**: Supabase Cloud accessed via `@supabase/ssr` (client/server cookie-based authentication).
  - No heavy ORMs (like Prisma or Drizzle) to avoid bundle bloating and API latency.
  - Handle Supabase sessions, cookies, and middleware standard practices.
- **Custom JWT Claims (RBAC)**: Role-based access control relies on custom claims injected into `auth.users.raw_app_meta_data` via database triggers:
  - `role`: `'SA' | 'COLLEGE_ADMIN' | 'MENTOR' | 'STUDENT' | 'COMPANY'`
  - `org_id`: UUID of the organization (null for SA and COMPANY).
  - `dept_id`: UUID of the department (null for SA, COMPANY, and COLLEGE_ADMIN).
  - Read these claims on the server/client side using metadata helpers.
- **Database Safety & RLS**: RLS is strictly enabled on all tables. Never bypass RLS in public endpoints or client components. If a bypass is required (e.g. signup auth-syncing), run isolated Server Actions / API routes using a securely initialized `service_role` client.

---

## 🎨 3. UI/UX & DESIGN SYSTEM (Apple Minimalism)

All UI elements must look premium, modern, and clean:
- **Style**: High whitespace, thin slate/zinc borders, subtle shadows, and Outfit or Inter typography.
- **Colors**: Curated, harmonious, Apple-minimalist palettes (shadcn primaru,foreground,background defined colors,etc). Avoid raw prime colors (e.g., bright red/blue/green). Use dark modes cleanly.
- **Components**: Utilize shadcn/ui primitives. Avoid ad-hoc inline styles. Use pre-defined CSS tokens or Tailwind utility classes.
- **Micro-interactions**: Use smooth transitions (`transition-all duration-200`) and hover states.

---

## 🛡️ 4. KEY BUSINESS LOGIC ENFORCEMENT

- **Job Eligibility Rule**: Calculated dynamically as:
  `Student.Branch IN Job.Eligible_Branches` AND `Student.CGPA >= Job.Min_CGPA` AND `Student.Active_Backlogs <= Job.Max_Backlogs` (plus matching target college organization and approval status).
- **Profile Status Gate**: If a student updates a critical field (`name`, `cgpa`, `resume_url`), their profile status reverts automatically to `PENDING` and job-applying permissions are locked.
- **Placement State Machine**: Accepting a job offer automatically flips `is_placed` to `true`, changes the accepted application status to `OFFERED`, withdraws all other active applications (`WITHDRAWN`), and withdraws other extended offers (`AUTO_WITHDRAWN`).
- **Blind Applicant Count**: Students must only see the count of applicants for a job, never user profile details of other applicants. Enforced via the security-definer helper function `public.get_job_applicant_count(map_id)`.
