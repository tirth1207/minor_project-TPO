"use client"

import * as React from "react"
import {
  Questionnaire,
  QuestionnaireItem,
  QuestionnaireTitle,
  QuestionnaireChoices,
  QuestionnaireChoice,
  QuestionnaireChoiceLabel,
} from "@/components/ui/questionnaire"
import type { MCQQuestion } from "@/types/mock-interview"
import { Badge } from "@/components/ui/badge"

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
  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-semibold text-primary">
            MCQ
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {question.skill || "Technical"}
          </Badge>
        </div>

        <span className="text-xs font-semibold text-zinc-500">
          {question.points || 10} Points
        </span>
      </div>

      <Questionnaire className="w-full">
        <QuestionnaireItem name={question.id}>
          <QuestionnaireTitle className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {question.question}
          </QuestionnaireTitle>

          <QuestionnaireChoices className="mt-3 gap-2.5">
            {question.options.map((option) => {
              const isChecked = selectedOptionId === option.id

              return (
                <QuestionnaireChoice
                  key={option.id}
                  value={option.id}
                  data-checked={isChecked ? true : undefined}
                  data-disabled={disabled ? true : undefined}
                  onClick={() => {
                    if (!disabled) onSelectOption(option.id)
                  }}
                  className={`cursor-pointer rounded-lg border p-3 text-xs transition-colors ${
                    isChecked
                      ? "border-primary/50 bg-primary/5 text-primary font-medium"
                      : "border-zinc-200 bg-transparent hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  <QuestionnaireChoiceLabel className="flex items-center gap-2 text-xs">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                        isChecked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-zinc-300 text-zinc-500"
                      }`}
                    >
                      {option.id.replace(/^opt/, "").toUpperCase()}
                    </span>
                    <span>{option.text}</span>
                  </QuestionnaireChoiceLabel>
                </QuestionnaireChoice>
              )
            })}
          </QuestionnaireChoices>
        </QuestionnaireItem>
      </Questionnaire>
    </div>
  )
}
