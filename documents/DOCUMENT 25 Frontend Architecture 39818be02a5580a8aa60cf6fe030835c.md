# DOCUMENT 25: Frontend Architecture

| Aspect | Decision | Rationale |
| --- | --- | --- |
| **Framework** | Next.js 14+ (App Router) | Required for Server Actions and React Server Components (RSC). |
| **UI Library** | `shadcn/ui` + Tailwind CSS | Not a dependency; copied into project. Highly customizable. Perfect for "Apple Minimalism" (clean borders, subtle shadows, SF Pro font). |
| **State Management** | React Server Components + `nuqs` (URL state) | Minimal client-side state. Filters/sorting stored in URL params so pages are shareable and bookmarkable. |
| **Forms** | `react-hook-form` + `@hookform/resolvers` (Zod) | Industry standard. Keeps re-renders low on complex profile forms. |
| **Tables** | `@tanstack/react-table` | Headless UI. Junior dev can style it using shadcn Table component. Handles sorting/filtering elegantly. |
| **Realtime** | Supabase `channel.on('postgres_changes')` | Used strictly for Notifications and Interview Round status updates. |
| **Mutations** | `useTransition` / `useActionState` | Native React 19 hooks for handling Server Action loading states without external libraries like SWR/React Query. |