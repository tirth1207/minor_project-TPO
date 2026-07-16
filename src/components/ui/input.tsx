import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:placeholder:text-zinc-500 dark:focus-visible:border-zinc-700 dark:focus-visible:bg-zinc-950 dark:focus-visible:ring-zinc-900/50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
