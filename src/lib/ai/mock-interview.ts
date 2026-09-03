import { callNvidiaChat } from "./nvidia";
import { cleanAndParseJson } from "./json-parser";
import type { MockInterviewQuestion } from "@/types/mock-interview";
import type { NvidiaMessage } from "./nvidia";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeSkill(skill: unknown): string {
  if (
    typeof skill !== "string" ||
    !skill.trim()
  ) {
    return "General Technical";
  }

  const trimmed = skill.trim();

  return (
    trimmed.charAt(0).toUpperCase() +
    trimmed.slice(1)
  );
}

/* -------------------------------------------------------------------------- */
/* Shared fields                                                              */
/* -------------------------------------------------------------------------- */

const DifficultySchema = z
  .enum(["EASY", "MEDIUM", "HARD"])
  .default("MEDIUM");

/* -------------------------------------------------------------------------- */
/* MCQ                                                                        */
/* -------------------------------------------------------------------------- */

const MCQSchema = z.object({
  id: z.string(),

  type: z.literal("MCQ"),

  question: z
    .string()
    .min(5),

  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
      })
    )
    .min(2),

  correctOptionId: z.string(),

  explanation: z
    .string()
    .optional()
    .default(""),

  difficulty: DifficultySchema,

  skill: z
    .string()
    .transform(normalizeSkill),

  points: z
    .number()
    .default(10),
});

/* -------------------------------------------------------------------------- */
/* THEORY                                                                     */
/* -------------------------------------------------------------------------- */

const TheorySchema = z.object({
  id: z.string(),

  type: z.literal("THEORY"),

  question: z
    .string()
    .min(5),

  expectedTopics: z
    .array(z.string())
    .default([]),

  rubric: z
    .string()
    .optional()
    .default(""),

  referenceAnswer: z
    .string()
    .optional(),

  difficulty: DifficultySchema,

  skill: z
    .string()
    .transform(normalizeSkill),

  points: z
    .number()
    .default(10),
});

/* -------------------------------------------------------------------------- */
/* BEHAVIORAL                                                                 */
/* -------------------------------------------------------------------------- */

const BehavioralSchema = z.object({
  id: z.string(),

  type: z.literal("BEHAVIORAL"),

  question: z
    .string()
    .min(5),

  expectedTopics: z
    .array(z.string())
    .default([]),

  rubric: z
    .string()
    .optional()
    .default(""),

  referenceAnswer: z
    .string()
    .optional(),

  difficulty: DifficultySchema,

  skill: z
    .string()
    .transform(normalizeSkill),

  points: z
    .number()
    .default(10),
});

/* -------------------------------------------------------------------------- */
/* CODE                                                                       */
/* -------------------------------------------------------------------------- */

const CodeSchema = z.object({
  id: z.string(),

  type: z.literal("CODE"),

  question: z
    .string()
    .min(5),

  description: z
    .string()
    .optional(),

  constraints: z
    .array(z.string())
    .default([]),

  examples: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
        explanation: z
          .string()
          .optional(),
      })
    )
    .default([]),

  languageOptions: z
    .array(z.string())
    .default([
      "JavaScript",
      "TypeScript",
      "Python",
      "Java",
      "C++",
    ]),

  defaultLanguage: z
    .string()
    .default("TypeScript"),

  starterCode: z
    .string()
    .optional(),

  expectedConcepts: z
    .array(z.string())
    .default([]),

  difficulty: z
    .enum([
      "EASY",
      "MEDIUM",
      "HARD",
    ])
    .default("HARD"),

  skill: z
    .string()
    .transform(normalizeSkill),

  points: z
    .number()
    .default(15),
});

/* -------------------------------------------------------------------------- */
/* QUESTION UNION                                                             */
/* -------------------------------------------------------------------------- */

/**
 * IMPORTANT:
 *
 * Every discriminator value must exist exactly once.
 *
 * MCQ          -> MCQSchema
 * THEORY       -> TheorySchema
 * BEHAVIORAL   -> BehavioralSchema
 * CODE         -> CodeSchema
 *
 * Do NOT use TheorySchema.extend({
 *   type: z.literal("BEHAVIORAL")
 * })
 * because that creates duplicate discriminator definitions.
 */

const QuestionUnionSchema =
  z.discriminatedUnion("type", [
    MCQSchema,
    TheorySchema,
    BehavioralSchema,
    CodeSchema,
  ]);

/* -------------------------------------------------------------------------- */
/* Generate structured mock interview                                         */
/* -------------------------------------------------------------------------- */

export async function generateStructuredMockInterview(
  mockType:
    | "PRACTICE"
    | "JOB_REQUIRED",

  jobRoleContext: string,

  jobInfo?: any,

  studentCareerContext?: any
): Promise<MockInterviewQuestion[]> {
  const model =
    process.env.NVIDIA_MODEL ??
    "openai/gpt-oss-20b";

  /* ------------------------------------------------------------------------ */
  /* SYSTEM PROMPT                                                            */
  /* ------------------------------------------------------------------------ */

  const systemPrompt = `
You are an expert technical interviewer and assessment designer.

Generate a realistic, balanced technical interview assessment.

Return ONLY a valid JSON array.

Do NOT return:
- Markdown
- Code fences
- Explanations outside the JSON
- Comments
- Trailing commas

Every array element MUST be one of these four types:

1. MCQ
2. THEORY
3. BEHAVIORAL
4. CODE

Each question MUST have a unique id.

--------------------------------------------------
1. MCQ
--------------------------------------------------

{
  "id": "q1",
  "type": "MCQ",
  "question": "Question text...",
  "options": [
    {
      "id": "opt1",
      "text": "Option A text"
    },
    {
      "id": "opt2",
      "text": "Option B text"
    },
    {
      "id": "opt3",
      "text": "Option C text"
    },
    {
      "id": "opt4",
      "text": "Option D text"
    }
  ],
  "correctOptionId": "opt1",
  "explanation": "Why opt1 is correct",
  "difficulty": "EASY",
  "skill": "React",
  "points": 10
}

--------------------------------------------------
2. THEORY
--------------------------------------------------

{
  "id": "q2",
  "type": "THEORY",
  "question": "Explain optimistic vs pessimistic locking in database transactions.",
  "expectedTopics": [
    "Optimistic locking",
    "Pessimistic locking",
    "Concurrency"
  ],
  "rubric": "Look for explicit trade-offs and performance implications.",
  "referenceAnswer": "Detailed expected reference answer...",
  "difficulty": "MEDIUM",
  "skill": "PostgreSQL",
  "points": 10
}

--------------------------------------------------
3. BEHAVIORAL
--------------------------------------------------

{
  "id": "q3",
  "type": "BEHAVIORAL",
  "question": "Tell me about a difficult technical problem you solved.",
  "expectedTopics": [
    "Problem solving",
    "Communication",
    "Technical ownership"
  ],
  "rubric": "Look for a clear situation, action, reasoning and measurable result.",
  "referenceAnswer": "Strong answers should describe the situation, actions taken and outcome.",
  "difficulty": "MEDIUM",
  "skill": "Problem Solving",
  "points": 10
}

--------------------------------------------------
4. CODE
--------------------------------------------------

{
  "id": "q4",
  "type": "CODE",
  "question": "Implement an API rate limiter function.",
  "description": "Write a function rateLimiter(userId, windowMs, maxRequests) that returns boolean.",
  "constraints": [
    "1 <= maxRequests <= 1000",
    "windowMs is in milliseconds"
  ],
  "examples": [
    {
      "input": "userId='u1', windowMs=1000, maxRequests=2",
      "output": "true",
      "explanation": "First call succeeds"
    }
  ],
  "languageOptions": [
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "C++"
  ],
  "defaultLanguage": "TypeScript",
  "starterCode": "function rateLimiter(userId: string, windowMs: number, maxRequests: number): boolean {\\n  // Your code here\\n}",
  "expectedConcepts": [
    "Sliding window",
    "Map / Hash table",
    "Timestamps"
  ],
  "difficulty": "HARD",
  "skill": "System Architecture",
  "points": 15
}

--------------------------------------------------
QUESTION DISTRIBUTION
--------------------------------------------------

Generate between 6 and 10 questions total.

Prefer a balanced distribution such as:

- 2-3 MCQs
- 1-2 THEORY
- 1 BEHAVIORAL
- 1-2 CODE

Do NOT generate generic filler questions.

Questions must be relevant to the target role.

Questions should test practical engineering ability rather than only definitions.

Ensure every question is valid JSON.

Ensure every "type" value is EXACTLY one of:

"MCQ"
"THEORY"
"BEHAVIORAL"
"CODE"
`;

  /* ------------------------------------------------------------------------ */
  /* USER PROMPT                                                              */
  /* ------------------------------------------------------------------------ */

  let userPrompt = "";

  if (
    mockType === "JOB_REQUIRED" &&
    jobInfo
  ) {
    userPrompt = `
Mode: JOB_REQUIRED

Target Job Title:
${jobInfo.title || jobRoleContext}

Role:
${jobRoleContext}

Company:
${jobInfo.companyName || "Employer"}

Job Description:
${jobInfo.description || "N/A"}

Required Skills:
${
  Array.isArray(jobInfo.skills)
    ? jobInfo.skills.join(", ")
    : jobInfo.skills || "N/A"
}

CTC:
${
  jobInfo.ctcMax
    ? `₹${jobInfo.ctcMax} LPA`
    : "N/A"
}

Tailor EVERY question strictly to this exact job specification.

Do not ask questions unrelated to the job requirements.
`;
  } else {
    const currentSkills =
      Array.isArray(
        studentCareerContext?.current_skills
      )
        ? studentCareerContext.current_skills.join(
            ", "
          )
        : "General";

    const targetSkills =
      Array.isArray(
        studentCareerContext?.dream_skills
      )
        ? studentCareerContext.dream_skills.join(
            ", "
          )
        : "General";

    userPrompt = `
Mode: PRACTICE

Role Focus:
${jobRoleContext}

Student Current Skills:
${currentSkills}

Student Target Skills:
${targetSkills}

Target CTC:
${
  studentCareerContext?.dream_ctc
    ? `₹${studentCareerContext.dream_ctc} LPA`
    : "N/A"
}

Skill Level:
${
  studentCareerContext?.skill_level ||
  "Intermediate"
}

Generate a comprehensive practice mock interview to help the student master this role.

Prioritize practical and interview-relevant questions.
`;
  }

  /* ------------------------------------------------------------------------ */
  /* NVIDIA MESSAGES                                                          */
  /* ------------------------------------------------------------------------ */

  const messages: NvidiaMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  /* ------------------------------------------------------------------------ */
  /* CALL NVIDIA                                                              */
  /* ------------------------------------------------------------------------ */

  let raw = "";

  try {
    const data =
      await callNvidiaChat(
        model,
        messages
      );

    raw =
      data?.choices?.[0]?.message?.content?.trim() ||
      "";

    console.log(
      `[Mock Interview] NVIDIA response received | Characters: ${raw.length}`
    );
  } catch (err: any) {
    console.error(
      "[Mock Interview] AI generation call failed:",
      err
    );

    throw new Error(
      `AI Mock Question Service failed: ${
        err?.message ||
        "Service unavailable"
      }`
    );
  }

  /* ------------------------------------------------------------------------ */
  /* EMPTY RESPONSE                                                           */
  /* ------------------------------------------------------------------------ */

  if (!raw) {
    throw new Error(
      "Empty AI response received"
    );
  }

  /* ------------------------------------------------------------------------ */
  /* PARSE JSON                                                               */
  /* ------------------------------------------------------------------------ */

  let parsed: unknown;

  try {
    parsed =
      cleanAndParseJson(raw);
  } catch (error: any) {
    console.error(
      "[Mock Interview] JSON parsing failed:",
      error
    );

    throw new Error(
      `AI returned malformed JSON: ${
        error?.message ||
        "Invalid JSON response"
      }`
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ARRAY VALIDATION                                                         */
  /* ------------------------------------------------------------------------ */

  if (
    !Array.isArray(parsed) ||
    parsed.length === 0
  ) {
    throw new Error(
      "AI returned an empty question list"
    );
  }

  /* ------------------------------------------------------------------------ */
  /* VALIDATE QUESTIONS                                                       */
  /* ------------------------------------------------------------------------ */

  const validatedQuestions: MockInterviewQuestion[] =
    [];

  for (
    let i = 0;
    i < parsed.length;
    i++
  ) {
    const rawQuestion =
      parsed[i];

    if (
      !rawQuestion ||
      typeof rawQuestion !==
        "object"
    ) {
      console.warn(
        `[Mock Interview] Question ${
          i + 1
        } is not an object. Skipping.`
      );

      continue;
    }

    const rawQ =
      rawQuestion as Record<
        string,
        any
      >;

    /* ---------------------------------------------------------------------- */
    /* DEFAULT ID                                                             */
    /* ---------------------------------------------------------------------- */

    if (
      typeof rawQ.id !==
        "string" ||
      !rawQ.id.trim()
    ) {
      rawQ.id = `q${i + 1}`;
    }

    /* ---------------------------------------------------------------------- */
    /* DEFAULT POINTS                                                         */
    /* ---------------------------------------------------------------------- */

    if (
      typeof rawQ.points !==
        "number" ||
      rawQ.points <= 0
    ) {
      rawQ.points =
        rawQ.type === "CODE"
          ? 15
          : 10;
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE                                                               */
    /* ---------------------------------------------------------------------- */

    const result =
      QuestionUnionSchema.safeParse(
        rawQ
      );

    if (result.success) {
      validatedQuestions.push(
        result.data as MockInterviewQuestion
      );
    } else {
      console.warn(
        `[Mock Interview] Question ${
          i + 1
        } validation failed:`,
        result.error.flatten()
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* MINIMUM QUESTIONS                                                        */
  /* ------------------------------------------------------------------------ */

  if (
    validatedQuestions.length < 3
  ) {
    throw new Error(
      `Failed to validate sufficient AI generated questions. Valid questions: ${validatedQuestions.length}. Minimum required: 3.`
    );
  }

  /* ------------------------------------------------------------------------ */
  /* UNIQUE IDS                                                               */
  /* ------------------------------------------------------------------------ */

  const seenIds =
    new Set<string>();

  const uniqueQuestions =
    validatedQuestions.filter(
      (question, index) => {
        if (
          seenIds.has(question.id)
        ) {
          console.warn(
            `[Mock Interview] Duplicate question ID "${question.id}" at index ${index}. Skipping.`
          );

          return false;
        }

        seenIds.add(
          question.id
        );

        return true;
      }
    );

  if (
    uniqueQuestions.length < 3
  ) {
    throw new Error(
      "AI generated duplicate question IDs resulting in fewer than 3 unique questions"
    );
  }

  console.log(
    `[Mock Interview] Successfully validated ${uniqueQuestions.length} questions`
  );

  return uniqueQuestions;
}

/* -------------------------------------------------------------------------- */
/* Backward-compatible helper                                                 */
/* -------------------------------------------------------------------------- */

export async function generateMockInterview(
  jobRoleContext: string,
  jobInfo?: any
): Promise<MockInterviewQuestion[]> {
  return generateStructuredMockInterview(
    "PRACTICE",
    jobRoleContext,
    jobInfo
  );
}
