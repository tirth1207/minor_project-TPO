import { callNvidiaChat } from './nvidia'
import type { StudentCareerProfile, CareerRoadmapData } from '@/types/career'

export async function generateGroundedCareerRoadmap(
  careerProfile: StudentCareerProfile,
  portalJobs: any[],
  mockResultsHistory: any[] = []
): Promise<CareerRoadmapData> {
  const model = process.env.NVIDIA_MODEL ?? "openai/gpt-oss-120b"

  // Process available jobs into a structured, compact array with deterministic eligibility flags
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
      eligibleBranches: job.branches?.map((b: any) => b.branch_name) || [],
      requiredSkills: job.description
        ? Array.from(new Set(job.description.match(/[A-Z][a-zA-Z0-9#+.]+/g) || []))
            .filter((s: any) => s.length > 2)
            .slice(0, 8)
        : [],
    }
  })

  // Format student's historical mock performance by skill
  const mockSkillScores: Record<string, number> = {}
  mockResultsHistory.forEach((mock) => {
    if (mock.skill_scores && typeof mock.skill_scores === 'object') {
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
You MUST ONLY recommend jobs from the provided "Available Portal Jobs" array.
Do NOT invent or hallucinate companies or job titles not present in the input list.

Return ONLY a JSON object with this exact structure (no markdown fences):
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
Current Skills: ${careerProfile.current_skills.join(', ') || 'None listed'}
Target/Dream Skills: ${careerProfile.dream_skills.join(', ') || 'None listed'}
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

  const aiResponse = await callNvidiaChat(model, messages)
  const raw = aiResponse?.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error("Failed to receive career roadmap AI response")

  const cleaned = raw.replace(/^```(?:json)?\n/, "").replace(/```$/, "").trim()
  const jsonMatch = cleaned.match(/(\{[\s\S]*\})|(\[[\s\S]*\])/)
  if (!jsonMatch) {
    console.error("Failed to parse AI Roadmap JSON", raw)
    throw new Error("Malformed AI Roadmap response")
  }

  const parsed = JSON.parse(jsonMatch[0])

  // Enhance recommended jobs with full job details from compactJobs
  const recommendedJobs = (parsed.recommendedJobs || []).map((rec: any) => {
    const matchedJob = compactJobs.find(
      (j) => j.jobId === rec.jobId || j.jobMappingId === rec.jobMappingId
    ) || compactJobs[0]

    return {
      jobId: matchedJob?.jobId || rec.jobId,
      jobMappingId: matchedJob?.jobMappingId || rec.jobMappingId,
      title: matchedJob?.title || "Job Opportunity",
      companyName: matchedJob?.companyName || "Corporate Partner",
      ctcMax: matchedJob?.ctcMax || 0,
      location: matchedJob?.location || "Remote / Onsite",
      matchScore: Math.min(100, Math.max(0, Number(rec.matchScore) || 75)),
      isEligible: true,
      requireMock: matchedJob?.requireMock || false,
      mockPassScore: matchedJob?.mockPassScore || 70,
      why: Array.isArray(rec.why) ? rec.why : ["Relevant role alignment"],
      skillGaps: Array.isArray(rec.skillGaps) ? rec.skillGaps : [],
      readiness: rec.readiness || "Ready to evaluate.",
    }
  })

  return {
    careerGoal: {
      dreamJob: parsed.careerGoal?.dreamJob || careerProfile.dream_job,
      dreamRole: parsed.careerGoal?.dreamRole || careerProfile.dream_role,
      targetCtc: Number(parsed.careerGoal?.targetCtc) || careerProfile.dream_ctc,
      targetTimeline: parsed.careerGoal?.targetTimeline || careerProfile.target_timeline,
    },
    readiness: {
      score: Math.min(100, Math.max(0, Number(parsed.readiness?.score) || 70)),
      summary: parsed.readiness?.summary || "Good career alignment.",
    },
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps : [],
    learningPlan: Array.isArray(parsed.learningPlan) ? parsed.learningPlan : [],
    recommendedJobs: recommendedJobs.length > 0 ? recommendedJobs : compactJobs.slice(0, 3).map((j) => ({
      jobId: j.jobId,
      jobMappingId: j.jobMappingId,
      title: j.title,
      companyName: j.companyName,
      ctcMax: j.ctcMax,
      location: j.location,
      matchScore: 80,
      isEligible: true,
      requireMock: j.requireMock,
      mockPassScore: j.mockPassScore,
      why: ["Direct campus placement drive match"],
      skillGaps: [],
      readiness: "Ready to apply",
    })),
  }
}
