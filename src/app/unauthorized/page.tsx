import Link from "next/link"
import { IconAlertTriangle, IconArrowLeft } from "@tabler/icons-react"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950 font-sans">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-500">
          <IconAlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Access Denied
        </h1>
        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
          You don&apos;t have authorization to view this section of the portal. If you think this is a mistake, please reach out to your college administrator.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-zinc-50 transition-all hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-200 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus:ring-zinc-800"
          >
            Sign in with another account
          </Link>
          <Link
            href="/"
            className="flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850"
          >
            <IconArrowLeft className="mr-2 h-4 w-4" /> Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
