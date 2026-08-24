export interface StudentCareerProfile {
  id?: string
  student_id: string
  dream_job: string
  dream_role: string
  dream_ctc: number | null
  dream_skills: string[]
  current_skills: string[]
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced'
  target_job_type: string
  preferred_work_mode: string
  target_timeline: string
  target_companies: string[]
  current_challenges?: string
  onboarding_completed: boolean
  created_at?: string
  updated_at?: string
}

export interface CareerRoadmapData {
  careerGoal: {
    dreamJob: string
    dreamRole: string
    targetCtc: number | null
    targetTimeline: string | null
  }
  readiness: {
    score: number // 0-100
    summary: string
  }
  strengths: {
    skill: string
    reason: string
  }[]
  skillGaps: {
    skill: string
    currentLevel: string
    requiredLevel: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    reason: string
  }[]
  learningPlan: {
    phase: string
    duration: string
    skills: string[]
    topics: string[]
    practiceTasks: string[]
  }[]
  recommendedJobs: {
    jobId: string
    jobMappingId: string
    title: string
    companyName: string
    ctcMax: number
    location: string
    matchScore: number
    isEligible: boolean
    requireMock: boolean
    mockPassScore?: number
    userBestScore?: number | null
    why: string[]
    skillGaps: string[]
    readiness: string
  }[]
}

export interface StudentCareerRoadmap {
  id?: string
  student_id: string
  roadmap_data: CareerRoadmapData
  profile_hash?: string
  jobs_hash?: string
  generated_at: string
  created_at?: string
  updated_at?: string
}
