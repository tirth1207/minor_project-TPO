import { callNvidiaChat } from './nvidia'
import { normalizeSkill, parseAndCleanJson } from './mock-interview'
import type { StudentCareerProfile, CareerRoadmapData } from '@/types/career'
import crypto from 'crypto'

export function generateProfileHash(profile: StudentCareerProfile): string {
  const content = [
    profile.dream_job || "",
    profile.dream_role || "",
    profile.dream_ctc || "",
    (profile.dream_skills || []).map(normalizeSkill).sort().join(","),
    (profile.current_skills || []).map(normalizeSkill).sort().join(","),
    profile.skill_level || "",
    profile.target_job_type || "",
    profile.preferred_work_mode || "",
    profile.target_timeline || "",
    (profile.target_companies || []).sort().join(","),
    profile.current_challenges || "",
  ].join("|")

  return crypto.createHash("sha256").update(content).digest("hex")
}

export function generateJobsHash(jobs: any[]): string {
  const signatures = jobs
    .map((j) => {
      const job = j.job || j
      const mapping = j.mapping || j
      return `${job.id}:${mapping.id || job.id}:${job.title}:${job.global_status}`
    })
    .sort()

  return crypto.createHash("sha256").update(signatures.join("|")).digest("hex")
}

function extractStructuredJobSkills(job: any): string[] {
  const skills: string[] = []

  if (Array.isArray(job.skills)) {
    skills.push(...job.skills)
  }

  if (job.description) {
    const knownTech = [
      "react", "node", "nodejs", "javascript", "typescript", "python", "java", "c++", "c#",
      "sql", "postgresql", "postgres", "mongodb", "aws", "docker", "kubernetes", "git", "express",
      "next.js", "nextjs", "html", "css", "tailwind", "dsa", "algorithms", "system design"
    ]
    const words = job.description.match(/\b[A-Za-z0-9#+.]+\b/g) || []
    words.forEach((w: string) => {
      const lower = w.toLowerCase()
      if (knownTech.includes(lower)) {
        skills.push(w)
      }
    })
  }

  const normalized = skills.map(normalizeSkill).filter(Boolean)
  return Array.from(new Set(normalized)).slice(0, 8)
}

export async function generateGroundedCareerRoadmap(
  careerProfile: StudentCareerProfile,
  portalJobs: any[],
  mockResultsHistory: any[] = []
): Promise<CareerRoadmapData> {
  const model = process.env.NVIDIA_MODEL ?? "openai/gpt-oss-120b"

  // Process available jobs into structured compact drives
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
      eligibleBranches: job.job_eligible_branches?.map((b: any) => b.branch_name) || job.branches?.map((b: any) => b.branch_name) || [],
      requiredSkills: extractStructuredJobSkills(job),
    }
  })

  // Normalize mock performance history with normalized skill keys
  const mockSkillScores: Record<string, number> = {}
  // Sort by completed_at ascending so recent scores naturally overwrite older scores
  const sortedMocks = [...mockResultsHistory].sort((a, b) => {
    const tA = a.completed_at ? new Date(a.completed_at).getTime() : 0
    const tB = b.completed_at ? new Date(b.completed_at).getTime() : 0
    return tA - tB
  })

  sortedMocks.forEach((mock) => {
    if (mock.skill_scores && typeof mock.skill_scores === 'object') {
      Object.entries(mock.skill_scores).forEach(([skill, score]) => {
        const normSkill = normalizeSkill(skill)
        const numScore = Number(score)
        if (normSkill && !isNaN(numScore)) {
          mockSkillScores[normSkill] = numScore
        }
      })
    }
  })

  // Zero active campus drives scenario
  if (compactJobs.length === 0) {
    console.log(`[CAREER_ROADMAP] student=${careerProfile.student_id} active_jobs=0 creating base roadmap`)
    const currentSkills = (careerProfile.current_skills || []).map(normalizeSkill)
    const dreamSkills = (careerProfile.dream_skills || []).map(normalizeSkill)

    return {
      careerGoal: {
        dreamJob: careerProfile.dream_job || "Software Engineer",
        dreamRole: careerProfile.dream_role || "Full Stack Developer",
        targetCtc: careerProfile.dream_ctc,
        targetTimeline: careerProfile.target_timeline || "3 months",
      },
      readiness: {
        score: 65,
        summary: "Profile analysis complete. Currently, no active campus placement drives match your profile.",
      },
      strengths: currentSkills.map((s) => ({
        skill: s,
        reason: "Core self-reported technical competency",
      })),
      skillGaps: dreamSkills.map((s) => ({
        skill: s,
        currentLevel: careerProfile.skill_level || "Beginner",
        requiredLevel: "Advanced",
        priority: "HIGH" as const,
        reason: "Target skill required for desired role profile",
      })),
      learningPlan: [
        {
          phase: "Phase 1 - Skill Foundation",
          duration: "Weeks 1-4",
          skills: dreamSkills.slice(0, 3),
          topics: ["Core concepts", "Project implementations"],
          practiceTasks: ["Build portfolio project showcasing target skills"],
        },
      ],
      recommendedJobs: [],
    }
  }

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
Current Skills: ${careerProfile.current_skills.map(normalizeSkill).join(', ') || 'None listed'}
Target/Dream Skills: ${careerProfile.dream_skills.map(normalizeSkill).join(', ') || 'None listed'}
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

  console.log(`[CAREER_ROADMAP] student=${careerProfile.student_id} jobs=${compactJobs.length} AI generation started`)
  const start = Date.now()

  const aiResponse = await callNvidiaChat(model, messages)
  const raw = aiResponse?.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error("Failed to receive career roadmap AI response")

  const parsed = parseAndCleanJson<any>(raw)
  console.log(`[CAREER_ROADMAP] student=${careerProfile.student_id} AI generation completed durationMs=${Date.now() - start}`)

  // Strictly match recommended jobs against compactJobs array. NEVER fallback to compactJobs[0] for unmatched entries.
  const recommendedJobs: any[] = []
  if (Array.isArray(parsed.recommendedJobs)) {
    parsed.recommendedJobs.forEach((rec: any) => {
      const matchedJob = compactJobs.find(
        (j) => j.jobId === rec.jobId || j.jobMappingId === rec.jobMappingId || j.jobMappingId === rec.jobId
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
          skillGaps: Array.isArray(rec.skillGaps) ? rec.skillGaps.map(normalizeSkill) : [],
          readiness: rec.readiness || "Ready to evaluate.",
        })
      } else {
        console.warn(`[CAREER_ROADMAP_WARN] Discarded AI job recommendation with invalid ID: ${rec.jobId} / ${rec.jobMappingId}`)
      }
    })
  }

  // If no AI recommendations matched actual jobs, map up to 3 real jobs cleanly
  if (recommendedJobs.length === 0 && compactJobs.length > 0) {
    compactJobs.slice(0, 3).forEach((j) => {
      recommendedJobs.push({
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
      })
    })
  }

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
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.map((s: any) => ({
          skill: normalizeSkill(s.skill || ""),
          reason: s.reason || "Demonstrated skill proficiency",
        }))
      : [],
    skillGaps: Array.isArray(parsed.skillGaps)
      ? parsed.skillGaps.map((g: any) => ({
          skill: normalizeSkill(g.skill || ""),
          currentLevel: g.currentLevel || "Beginner",
          requiredLevel: g.requiredLevel || "Intermediate",
          priority: (g.priority === "HIGH" || g.priority === "LOW") ? g.priority : "MEDIUM",
          reason: g.reason || "Skill gap for target placement role",
        }))
      : [],
    learningPlan: Array.isArray(parsed.learningPlan)
      ? parsed.learningPlan.map((lp: any) => ({
          phase: lp.phase || "Action Phase",
          duration: lp.duration || "2 weeks",
          skills: Array.isArray(lp.skills) ? lp.skills.map(normalizeSkill) : [],
          topics: Array.isArray(lp.topics) ? lp.topics : [],
          practiceTasks: Array.isArray(lp.practiceTasks) ? lp.practiceTasks : [],
        }))
      : [],
    recommendedJobs,
  }
}
