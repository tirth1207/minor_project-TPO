# DOCUMENT 23: Folder Structure

*Designed for absolute module isolation so junior devs don't cause merge conflicts.*

```json
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group for unauthenticated layouts
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Route group for authenticated layouts
│   │   ├── layout.tsx            # Sidebar/Navbar based on role
│   │   ├── super-admin/          # SA module pages
│   │   ├── college-admin/        # CA module pages
│   │   ├── mentor/               # Mentor module pages
│   │   ├── student/              # Student module pages
│   │   └── company/              # Company module pages
│   ├── api/                      # API Routes (Minimal - only for AI/Webhooks)
│   │   └── ai/
│   │       └── mock/route.ts     # Nvidia NIM proxy + Queue
│   └── globals.css
├── modules/                      # Isolated Feature Modules (Assign to devs)
│   ├── auth/
│   │   ├── components/
│   │   ├── actions.ts            # Server Actions for Auth
│   │   └── validations.ts        # Zod schemas
│   ├── organization/
│   ├── department/
│   ├── profile/
│   ├── job/
│   ├── application/
│   ├── offer/
│   ├── mock-interview/
│   └── notification/
├── components/                   # Shared UI Kit (Apple Minimalism)
│   ├── ui/                       # shadcn/ui components (Button, Input, Modal)
│   ├── layout/                   # AppShell, Sidebar, Header
│   └── feedback/                 # Loading spinners, Toast notifications
├── lib/                          # Core utilities
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (uses cookies)
│   │   └── admin.ts              # Admin client (bypasses RLS for SA)
│   ├── ai-queue.ts               # 40 RPM rate limiter logic
│   ├── eligibility-engine.ts     # Branch/CGPA/Backlog calculator
│   └── offer-state-machine.ts    # Accept/Withdraw transaction logic
├── hooks/                        # Shared React hooks
│   ├── use-auth.ts
│   └── use-realtime.ts           # Supabase subscription hooks
├── types/                        # Global TypeScript interfaces
│   └── database.ts               # Auto-generated Supabase types
└── middleware.ts                  # Route protection logic
```