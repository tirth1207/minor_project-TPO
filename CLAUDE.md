# CLAUDE.md - Developer Guidelines

## 🚀 Commands Cheat Sheet
- **Dev Server**: `npm run dev`
- **Build Project**: `npm run build`
- **Lint Check**: `npm run lint`
- **Install Dependencies**: `npm install`
- **Supabase CLI**:
  - Check status: `supabase status`
  - Reset database migrations: `supabase db reset`
  - Create new migration: `supabase db diff --use-migra -f <name>` or `supabase migration new <name>`
  - Run database tests: `supabase test db`

## 🛠️ Code Style & Conventions
- **TypeScript**: Strict mode. Always define interfaces/types for props, parameters, and database schemas. Avoid the `any` type.
- **Next.js**: Use App Router layout conventions (`layout.tsx`, `page.tsx`, `error.tsx`). Use React Server Components (RSC) by default; only use Client Components (`"use client"`) when state or browser APIs are required.
- **Database Access**: Fetch data using `@supabase/ssr` client helper libraries inside components/actions (no Prisma/Drizzle).
- **Error Handling**: Standardize API and action responses: `{ data: T | null, error: string | null }`. Use `try-catch` blocks extensively in Server Actions.
- **CSS / UI**: Tailwind CSS + shadcn/ui. Strictly follow the Apple Minimalism design guidelines (soft slates/zincs, high whitespace, Outift/Inter font, smooth hover micro-animations).

## 🔄 Strict Vibecoding Workflow
1. **Get Context First**: Before implementing any requested feature, read the relevant specification documents inside the `/documents` folder.
2. **Review DB Schema**: Cross-reference fields with the `supabase/schema.sql` database file.
3. **Plan Changes**: Write a brief checklist or description of steps for the changes.
4. **Implement**: Keep changes localized and maintain existing code patterns.
5. **Verify**: Test compile-time correctness by running `npm run build` or `npm run lint`.
