import { callNvidiaChat } from "./nvidia";
import type {
  MockInterviewQuestion,
  MockInterviewAnswer,
  MockInterviewReport,
} from "@/types/mock-interview";

const systemPrompt = `
You are a rigorous technical interview evaluator.

You will receive JSON containing:

questions:
[
  {
    "id": number | string,
    "text": string
  }
]

answers:
[
  {
    "questionId": number | string,
    "answer": string,
    "language": string | null
  }
]

optional jobInfo.

Evaluate every question independently.

For each question return:

{
  "questionId": "1",
  "score": 0,
  "verdict": "strong",
  "summary": "Brief evaluation",
  "strengths": ["..."],
  "improvements": ["..."]
}

Rules:

- score must be an integer from 0 to 100.
- verdict must be exactly:
  "strong", "partial", or "needs-work".
- Evaluate the answer based on the actual question.
- Do not invent facts about the candidate.
- Do not give credit for information that is not present.
- Focus on technical correctness, completeness, reasoning,
  practical understanding, and clarity.
- Every question must have exactly one result.
- overallScore must be the arithmetic average of all question scores.
- summary must be concise.
- Return ONLY valid JSON.
- Do not use markdown.
- Do not wrap JSON in code fences.

Return exactly:

{
  "overallScore": 0,
  "summary": "...",
  "results": [
    {
      "questionId": "1",
      "score": 0,
      "verdict": "strong",
      "summary": "...",
      "strengths": ["..."],
      "improvements": ["..."]
    }
  ]
}
`;

async function evaluateMockInterview(
  questions: MockInterviewQuestion[],
  answers: MockInterviewAnswer[],
  jobInfo?: unknown
): Promise<MockInterviewReport> {
  const payload = {
    questions,
    answers,
    jobInfo: jobInfo ?? null,
  };

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    {
      role: "user" as const,
      content: JSON.stringify(payload),
    },
  ];

  console.log("[Mock AI] Sending evaluation to NVIDIA...");

  const start = Date.now();

  const data = await callNvidiaChat(
    "openai/gpt-oss-120b",
    messages
  );

  console.log(
    `[Mock AI] NVIDIA response received in ${Date.now() - start}ms`
  );

  const raw = data?.choices?.[0]?.message?.content?.trim();

  if (!raw) {
    throw new Error("Empty AI evaluation response");
  }
  console.log(
    "[Mock AI] Raw response length:",
    raw?.length ?? 0
  );

  let parsed: any;
  
  try {
    parsed = JSON.parse(raw);
    console.log("[Mock AI] Evaluation parsed successfully");
    console.log("[Mock AI] Score:", parsed?.overallScore);
    console.log("[Mock AI] Results:", parsed?.results?.length);
  } catch (error) {
    console.error("Failed to parse evaluation JSON:", raw);
    throw new Error("Malformed evaluation response");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as any).overallScore !== "number" ||
    typeof (parsed as any).summary !== "string" ||
    !Array.isArray((parsed as any).results)
  ) {
    throw new Error("Invalid evaluation format");
  }

  return parsed as MockInterviewReport;
}

export { evaluateMockInterview };