import crypto from "crypto"
import { callNvidiaChat } from "./nvidia"
import { cleanAndParseJson } from "./json-parser"
import type { StudentCareerProfile, CareerRoadmapData } from "@/types/career"

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
  if (!Array.isArray(jobs) || jobs.length === 0) return "no-approved-jobs"
  const canonicalJobs = jobs
    .map((j) => {
      const job = j.job || j
      const mapping = j.mapping || j
      return {
        jobId: job.id || "",
        mappingId: mapping.id || "",
        title: job.title || "",
        ctcMax: job.ctc_max || 0,
        globalStatus: job.global_status || "",
      }
    })
    .sort((a, b) => (a.jobId || "").localeCompare(b.jobId || ""))

  return crypto.createHash("sha256").update(JSON.stringify(canonicalJobs)).digest("hex")
}

export async function generateGroundedCareerRoadmap(
  careerProfile: StudentCareerProfile,
  portalJobs: any[],
  mockResultsHistory: any[] = []
): Promise<CareerRoadmapData> {
  const model = process.env.NVIDIA_MODEL ?? "openai/gpt-oss-120b"

  // Compact portal jobs representation
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
      requireMock: Boolean(job.require_mock),
      mockPassScore: job.mock_pass_score || 70,
      minCgpa: job.min_cgpa || 0,
      maxBacklogs: job.max_backlogs || 0,
    }
  })

  // Format student's historical mock performance by skill
  const mockSkillScores: Record<string, number> = {}
  mockResultsHistory.forEach((mock) => {
    if (mock.skill_scores && typeof mock.skill_scores === "object") {
      Object.entries(mock.skill_scores).forEach(([skill, score]) => {
        const numScore = Number(score)
        if (!isNaN(numScore)) {
          mockSkillScores[skill] = Math.max(mockSkillScores[skill] || 0, numScore)
        }
      })
    }
  })

  const systemPrompt = `You are a Senior Placement Intelligence Advisor.
Analyse candidate profile data, mock interview scores, and available placement jobs.

STRICT RULE:
You MUST ONLY recommend jobs from the provided "Available Portal Jobs" list.
If the list is empty, return an empty array [] for "recommendedJobs".
Do NOT invent or hallucinate companies or job titles.

Return ONLY a JSON object with this exact structure:
{
  "careerGoal": {
    "dreamJob": "Software Engineer",
    "dreamRole": "Full Stack Developer",
    "targetCtc": 12,
    "targetTimeline": "6 months"
  },
  "readiness": {
    "score": 75,
    "summary": "Concise summary of readiness..."
  },
  "strengths": [
    { "skill": "React", "reason": "Demonstrated high proficiency in mock interview." }
  ],
  "skillGaps": [
    {
      "skill": "System Design",
      "currentLevel": "Beginner",
      "requiredLevel": "Intermediate",
      "priority": "HIGH",
      "reason": "Required for target senior developer roles."
    }
  ],
  "learningPlan": [
    {
      "phase": "Phase 1 - Core Foundations",
      "duration": "Weeks 1-3",
      "skills": ["SQL", "Node.js"],
      "topics": ["Index optimization", "Middleware error handling"],
      "practiceTasks": ["Build REST API with Postgres indexing"]
    }
  ],
  "recommendedJobs": [
    {
      "jobId": "exact-uuid-from-input",
      "jobMappingId": "exact-mapping-uuid-from-input",
      "matchScore": 85,
      "why": ["Branch matches", "CGPA meets requirements", "React skill overlap"],
      "skillGaps": ["System Design"],
      "readiness": "High readiness - complete required job mock interview."
    }
  ]
}`

  const userPrompt = `Candidate Career Profile:
Dream Role: ${careerProfile.dream_role} (${careerProfile.dream_job})
Target CTC: ₹${careerProfile.dream_ctc || 'N/A'} LPA
Target Timeline: ${careerProfile.target_timeline}
Current Skills: ${careerProfile.current_skills?.join(', ') || 'None listed'}
Target/Dream Skills: ${careerProfile.dream_skills?.join(', ') || 'None listed'}
Self-reported Skill Level: ${careerProfile.skill_level}
Current Challenges: ${careerProfile.current_challenges || 'None'}

Mock Performance History:
${JSON.stringify(mockSkillScores, null, 2)}

Available Portal Jobs (${compactJobs.length} drive postings):
${JSON.stringify(compactJobs, null, 2)}`

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ]

  let raw = ""
  try {
    const aiResponse = await callNvidiaChat(model, messages)
    raw = aiResponse?.choices?.[0]?.message?.content?.trim() || ""
  } catch (err: any) {
    console.error("AI Roadmap generation call failed:", err)
    throw new Error(`AI Roadmap service failed: ${err?.message || "Service unavailable"}`)
  }

  if (!raw) throw new Error("Empty response received from AI Roadmap generator")

  const parsed = cleanAndParseJson(raw)

  // Strict matching of recommended jobs: only keep jobs present in compactJobs
  const recommendedJobs: any[] = []
  if (Array.isArray(parsed.recommendedJobs) && compactJobs.length > 0) {
    parsed.recommendedJobs.forEach((rec: any) => {
      const matchedJob = compactJobs.find(
        (j) => j.jobId === rec.jobId || j.jobMappingId === rec.jobMappingId
      )

      if (matchedJob) {
        recommendedJobs.push({
          jobId: matchedJob.jobId,
          jobMappingId: matchedJob.jobMappingId,
          title: matchedJob.title,
          companyName: matchedJob.companyName,
          ctcMax: matchedJob.ctcMax,
          location: matchedJob.location,
          matchScore: Math.min(100, Math.max(0, Number(rec.matchScore) || 75)),
          isEligible: true,
          requireMock: matchedJob.requireMock,
          mockPassScore: matchedJob.mockPassScore,
          why: Array.isArray(rec.why) ? rec.why : ["Relevant role alignment"],
          skillGaps: Array.isArray(rec.skillGaps) ? rec.skillGaps : [],
          readiness: rec.readiness || "Ready to evaluate.",
        })
      }
    })
  }

  const readinessScore = Math.min(100, Math.max(0, Number(parsed.readiness?.score) || 70))
  let readinessSummary = parsed.readiness?.summary || "Good career alignment."
  if (compactJobs.length === 0) {
    readinessSummary += " Note: No active campus placement drives are currently mapped to your institute."
  }

  return {
    careerGoal: {
      dreamJob: parsed.careerGoal?.dreamJob || careerProfile.dream_job,
      dreamRole: parsed.careerGoal?.dreamRole || careerProfile.dream_role,
      targetCtc: Number(parsed.careerGoal?.targetCtc) || careerProfile.dream_ctc,
      targetTimeline: parsed.careerGoal?.targetTimeline || careerProfile.target_timeline,
    },
    readiness: {
      score: readinessScore,
      summary: readinessSummary,
    },
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps : [],
    learningPlan: Array.isArray(parsed.learningPlan) ? parsed.learningPlan : [],
    recommendedJobs,
  }
}
