"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import type { MCQQuestion } from "@/types/mock-interview"

interface QuestionnaireMCQProps {
  question: MCQQuestion
  selectedOptionId?: string
  onSelectOption: (optionId: string) => void
  disabled?: boolean
}

export function QuestionnaireMCQ({
  question,
  selectedOptionId,
  onSelectOption,
  disabled = false,
}: QuestionnaireMCQProps) {
  /**
   * Keyboard shortcuts:
   *
   * A -> option 1
   * B -> option 2
   * C -> option 3
   * D -> option 4
   */
  React.useEffect(() => {
    if (disabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      // Don't capture shortcuts while typing.
      if (target) {
        const tagName = target.tagName?.toLowerCase()

        if (
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          target.isContentEditable
        ) {
          return
        }
      }

      const key = event.key.toLowerCase()

      const keyboardIndexMap: Record<string, number> = {
        a: 0,
        b: 1,
        c: 2,
        d: 3,
      }

      const optionIndex = keyboardIndexMap[key]

      if (optionIndex === undefined) return

      const option = question.options?.[optionIndex]

      if (!option) return

      event.preventDefault()

      onSelectOption(option.id)
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [question.options, onSelectOption, disabled])

  return (
    <div className="w-full space-y-4">
      {/* Question header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="h-5 px-2 text-[10px] font-semibold text-primary"
          >
            MCQ
          </Badge>

          <Badge
            variant="secondary"
            className="h-5 px-2 text-[10px]"
          >
            {question.skill || "Technical"}
          </Badge>
        </div>

        <span className="text-xs font-medium text-muted-foreground">
          {question.points || 10} Points
        </span>
      </div>

      {/* Question */}
      <div className="rounded-xl border border-border bg-background px-5 py-5">
        <h2 className="text-sm font-medium leading-6 text-foreground">
          {question.question}
        </h2>
      </div>

      {/* Options */}
      <div
        className="space-y-2"
        role="radiogroup"
        aria-label="Answer options"
      >
        {question.options.map((option, index) => {
          const shortcut = String.fromCharCode(65 + index)
          const isSelected = selectedOptionId === option.id

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelectOption(option.id)}
              className={`
                group
                flex
                w-full
                items-center
                gap-3
                rounded-lg
                border
                px-4
                py-3
                text-left
                transition-all
                duration-150
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary/40
                ${
                  isSelected
                    ? "border-primary/60 bg-primary/[0.06]"
                    : "border-border bg-background hover:bg-muted/40"
                }
                ${
                  disabled
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer"
                }
              `}
            >
              {/* Single selection indicator */}
              <span
                aria-hidden="true"
                className={`
                  flex
                  h-4
                  w-4
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  border
                  transition-all
                  ${
                    isSelected
                      ? "border-primary"
                      : "border-muted-foreground/40"
                  }
                `}
              >
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </span>

              {/* Option text */}
              <span
                className={`
                  min-w-0
                  flex-1
                  text-sm
                  leading-5
                  ${
                    isSelected
                      ? "font-medium text-foreground"
                      : "text-foreground/90"
                  }
                `}
              >
                {option.text}
              </span>

              {/* Keyboard shortcut */}
              <kbd
                className={`
                  inline-flex
                  h-7
                  min-w-7
                  shrink-0
                  items-center
                  justify-center
                  rounded-md
                  border
                  px-2
                  text-[11px]
                  font-semibold
                  transition-all
                  ${
                    isSelected
                      ? "border-primary/50 bg-primary text-primary-foreground"
                      : "border-border bg-muted/50 text-muted-foreground group-hover:bg-muted"
                  }
                `}
              >
                {shortcut}
              </kbd>
            </button>
          )
        })}
      </div>

      {/* Keyboard hint */}
      <div className="flex items-center justify-end">
        <span className="text-[11px] text-muted-foreground">
          Press A, B, C, or D to select
        </span>
      </div>
    </div>
  )
}