import crypto from "crypto"
import { z } from "zod"
import { callNvidiaChat } from "./nvidia"
import { cleanAndParseJson } from "./json-parser"
import type { StudentCareerProfile, CareerRoadmapData } from "@/types/career"

const CareerRoadmapAIResponseSchema = z.object({
  careerGoal: z.object({
    dreamJob: z.string().min(1),
    dreamRole: z.string().min(1),
    targetCtc: z.number().nonnegative().nullable(),
    targetTimeline: z.string().min(1).nullable(),
  }),
  readiness: z.object({
    score: z.number().finite().min(0).max(100),
    summary: z.string().min(1),
  }),
  strengths: z.array(z.object({
    skill: z.string().min(1),
    reason: z.string().min(1),
  })),
  skillGaps: z.array(z.object({
    skill: z.string().min(1),
    currentLevel: z.string().min(1),
    requiredLevel: z.string().min(1),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
    reason: z.string().min(1),
  })),
  learningPlan: z.array(z.object({
    phase: z.string().min(1),
    duration: z.string().min(1),
    skills: z.array(z.string()),
    topics: z.array(z.string()),
    practiceTasks: z.array(z.string()),
  })),
  recommendedJobs: z.array(z.object({
    jobId: z.string().min(1),
    jobMappingId: z.string().min(1),
    matchScore: z.number().finite().min(0).max(100),
    why: z.array(z.string()),
    skillGaps: z.array(z.string()),
    readiness: z.string().min(1),
  })),
}).strict()

export function generateProfileHash(profile: any): string {
  if (!profile) return "no-profile"
  const canonicalStr = JSON.stringify({
    dream_job: profile.dream_job || "",
    dream_role: profile.dream_role || "",
    dream_ctc: profile.dream_ctc || 0,
    dream_skills: Array.isArray(profile.dream_skills) ? [...profile.dream_skills].sort() : [],
    current_skills: Array.isArray(profile.current_skills) ? [...profile.current_skills].sort() : [],
    skill_level: profile.skill_level || "",
    target_job_type: profile.target_job_type || "",
    preferred_work_mode: profile.preferred_work_mode || "",
    target_timeline: profile.target_timeline || "",
    target_companies: Array.isArray(profile.target_companies) ? [...profile.target_companies].sort() : [],
    current_challenges: profile.current_challenges || "",
  })
  return crypto.createHash("sha256").update(canonicalStr).digest("hex")
}

export function generateJobsHash(jobs: any[]): string {
  if (!Array.isArray(jobs) || jobs.length === 0) return "no-eligible-jobs"
  const canonicalJobs = jobs
    .map((j) => {
      const job = j.job || j
      const mapping = j.mapping || j
      return {
        jobId: job.id || "",
        mappingId: mapping.id || "",
        title: job.title || "",
        description: job.description || "",
        skills: Array.isArray(job.skills) ? [...job.skills].sort() : [],
        ctcMin: job.ctc_min || 0,
        ctcMax: job.ctc_max || 0,
        location: job.location || "",
        workMode: job.work_mode || "",
        minCgpa: job.min_cgpa || 0,
        maxBacklogs: job.max_backlogs ?? 0,
        requireMock: Boolean(job.require_mock),
        mockPassScore: job.mock_pass_score || 0,
        globalStatus: job.global_status || "",
        localStatus: mapping.local_status || "",
        branches: Array.isArray(job.job_eligible_branches)
          ? job.job_eligible_branches.map((b: any) => b.branch_name).sort()
          : [],
      }
    })
    .sort((a, b) => a.jobId.localeCompare(b.jobId))

  return crypto.createHash("sha256").update(JSON.stringify(canonicalJobs)).digest("hex")
}

export function generateMocksHash(mocks: any[]): string {
  const canonicalMocks = (Array.isArray(mocks) ? mocks : [])
    .map((mock) => ({
      id: mock.id || "",
      mockType: mock.mock_type || "",
      overallScore: mock.overall_score ?? null,
      passed: mock.passed ?? null,
      completedAt: mock.completed_at || "",
      skillScores: mock.skill_scores || {},
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  return crypto.createHash("sha256").update(JSON.stringify(canonicalMocks)).digest("hex")
}

export async function generateGroundedCareerRoadmap(
  careerProfile: StudentCareerProfile,
  portalJobs: any[],
  mockResultsHistory: any[] = []
): Promise<CareerRoadmapData> {
  const model = process.env.NVIDIA_MODEL ?? "openai/gpt-oss-120b"

  const compactJobs = portalJobs.map((j) => {
    const job = j.job || j
    const mapping = j.mapping || j
    return {
      jobId: job.id,
      jobMappingId: mapping.id || job.id,
      title: job.title,
      companyName: job.company?.company_name || "Corporate Partner",
      ctcMax: job.ctc_max || 0,
      location: job.location || "Remote / Hybrid",
      workMode: job.work_mode || "",
      skills: Array.isArray(job.skills) ? job.skills : [],
      requireMock: Boolean(job.require_mock),
      mockPassScore: job.mock_pass_score || 70,
      minCgpa: job.min_cgpa || 0,
      maxBacklogs: job.max_backlogs ?? 0,
      eligible: true,
    }
  })

  const mockSkillScores: Record<string, number> = {}
  mockResultsHistory.forEach((mock) => {
    if (mock.skill_scores && typeof mock.skill_scores === "object") {
      Object.entries(mock.skill_scores).forEach(([skill, score]) => {
        const numScore = Number(score)
        if (!isNaN(numScore)) mockSkillScores[skill] = Math.max(mockSkillScores[skill] || 0, numScore)
      })
    }
  })

  const systemPrompt = `You are a Senior Placement Intelligence Advisor.
Analyse candidate profile data, mock interview scores, and AVAILABLE ELIGIBLE placement jobs.

GROUNDING RULES:
1. Every recommended job MUST come from the supplied Available Eligible Portal Jobs list.
2. The supplied jobs have already passed the platform's deterministic eligibility check. Never change that eligibility state.
3. Never invent job IDs, companies, job titles, requirements, scores, or facts.
4. matchScore is a relevance score among the supplied eligible jobs, not an eligibility score.
5. If the list is empty, recommendedJobs MUST be [].

Return ONLY a JSON object matching this exact structure:
{
  "careerGoal": { "dreamJob": string, "dreamRole": string, "targetCtc": number|null, "targetTimeline": string|null },
  "readiness": { "score": number, "summary": string },
  "strengths": [{ "skill": string, "reason": string }],
  "skillGaps": [{ "skill": string, "currentLevel": string, "requiredLevel": string, "priority": "HIGH"|"MEDIUM"|"LOW", "reason": string }],
  "learningPlan": [{ "phase": string, "duration": string, "skills": string[], "topics": string[], "practiceTasks": string[] }],
  "recommendedJobs": [{ "jobId": string, "jobMappingId": string, "matchScore": number, "why": string[], "skillGaps": string[], "readiness": string }]
}
Do not add extra top-level or nested fields.`

  const userPrompt = `Candidate Career Profile:
Dream Role: ${careerProfile.dream_role} (${careerProfile.dream_job})
Target CTC: ₹${careerProfile.dream_ctc || "N/A"} LPA
Target Timeline: ${careerProfile.target_timeline}
Current Skills: ${careerProfile.current_skills?.join(", ") || "None listed"}
Target/Dream Skills: ${careerProfile.dream_skills?.join(", ") || "None listed"}
Self-reported Skill Level: ${careerProfile.skill_level}
Current Challenges: ${careerProfile.current_challenges || "None"}

Mock Performance History:
${JSON.stringify(mockSkillScores, null, 2)}

Available Eligible Portal Jobs (${compactJobs.length} drive postings):
${JSON.stringify(compactJobs, null, 2)}`

  let raw = ""
  try {
    const aiResponse = await callNvidiaChat(model, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ])
    raw = aiResponse?.choices?.[0]?.message?.content?.trim() || ""
  } catch (err: any) {
    console.error("AI Roadmap generation call failed:", err)
    throw new Error("AI Roadmap service failed")
  }

  if (!raw) throw new Error("Empty response received from AI Roadmap generator")

  const parsedJson = cleanAndParseJson(raw)
  const parsed = CareerRoadmapAIResponseSchema.safeParse(parsedJson)
  if (!parsed.success) {
    console.error("AI Roadmap response validation failed:", parsed.error.flatten())
    throw new Error("AI Roadmap returned an invalid response")
  }

  const recommendedJobs: CareerRoadmapData["recommendedJobs"] = []
  const seen = new Set<string>()

  for (const rec of parsed.data.recommendedJobs) {
    const matchedJob = compactJobs.find(
      (j) => j.jobId === rec.jobId || j.jobMappingId === rec.jobMappingId
    )
    if (!matchedJob || seen.has(matchedJob.jobId)) continue
    seen.add(matchedJob.jobId)

    recommendedJobs.push({
      jobId: matchedJob.jobId,
      jobMappingId: matchedJob.jobMappingId,
      title: matchedJob.title,
      companyName: matchedJob.companyName,
      ctcMax: matchedJob.ctcMax,
      location: matchedJob.location,
      matchScore: Math.min(100, Math.max(0, Math.round(rec.matchScore))),
      isEligible: true,
      requireMock: matchedJob.requireMock,
      mockPassScore: matchedJob.mockPassScore,
      why: rec.why.slice(0, 5),
      skillGaps: rec.skillGaps.slice(0, 10),
      readiness: rec.readiness,
    })
  }

  const readinessScore = Math.min(100, Math.max(0, parsed.data.readiness.score))
  let readinessSummary = parsed.data.readiness.summary
  if (compactJobs.length === 0) {
    readinessSummary += " Note: No eligible active campus placement drives are currently mapped to your institute."
  }

  return {
    careerGoal: parsed.data.careerGoal,
    readiness: { score: readinessScore, summary: readinessSummary },
    strengths: parsed.data.strengths,
    skillGaps: parsed.data.skillGaps,
    learningPlan: parsed.data.learningPlan,
    recommendedJobs,
  }
}
