"use client"

import * as React from "react"
import {
  IconDownload,
  IconFileText,
  IconPlus,
  IconSparkles,
  IconTrash,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useStudent } from "../student-context"

type ResumeProject = {
  title: string
  description: string
  technologies: string
}

type ResumeExperience = {
  company: string
  role: string
  duration: string
  description: string
}

type ResumeEducation = {
  institution: string
  degree: string
  duration: string
  result: string
}

type ResumeData = {
  headline: string
  summary: string
  email: string
  phone: string
  location: string
  linkedin: string
  github: string
  portfolio: string
  skills: string
  education: ResumeEducation[]
  projects: ResumeProject[]
  experience: ResumeExperience[]
  certifications: string[]
  achievements: string[]
  languages: string
}

const STORAGE_KEY = "tpo-student-resume-builder"

const emptyProject = (): ResumeProject => ({
  title: "",
  description: "",
  technologies: "",
})

const emptyExperience = (): ResumeExperience => ({
  company: "",
  role: "",
  duration: "",
  description: "",
})

const emptyEducation = (): ResumeEducation => ({
  institution: "",
  degree: "",
  duration: "",
  result: "",
})

function splitItems(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function calculateAtsScore(resume: ResumeData, targetText: string) {
  const sections = [
    resume.headline,
    resume.summary,
    resume.skills,
    resume.education.map((item) => Object.values(item).join(" ")).join(" "),
    resume.projects.map((item) => Object.values(item).join(" ")).join(" "),
    resume.experience.map((item) => Object.values(item).join(" ")).join(" "),
    resume.certifications.join(" "),
    resume.achievements.join(" "),
  ]
    .join(" ")
    .toLowerCase()

  const targetWords = Array.from(
    new Set(
      targetText
        .toLowerCase()
        .replace(/[^a-z0-9+#.\- ]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 4)
    )
  )

  const keywordMatches = targetWords.filter((word) => sections.includes(word))
  const keywordScore = targetWords.length
    ? Math.min(35, Math.round((keywordMatches.length / targetWords.length) * 35))
    : 20

  let score = keywordScore
  if (resume.headline.trim()) score += 10
  if (resume.summary.trim()) score += 10
  if (resume.skills.trim()) score += 15
  if (resume.education.some((item) => item.institution || item.degree)) score += 10
  if (resume.projects.some((item) => item.title || item.description)) score += 10
  if (resume.experience.some((item) => item.company || item.role)) score += 5
  if (resume.certifications.length) score += 2
  if (resume.achievements.length) score += 2
  if (resume.languages.trim()) score += 1

  return Math.min(100, score)
}

function defaultResume(name: string, profileSkills: string[] | null): ResumeData {
  return {
    headline: "Software Developer",
    summary: `Motivated ${name || "student"} with a strong foundation in software development and a focus on building practical, reliable applications.`,
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
    skills: (profileSkills || []).join(", "),
    education: [emptyEducation()],
    projects: [emptyProject()],
    experience: [],
    certifications: [],
    achievements: [],
    languages: "English, Hindi, Gujarati",
  }
}

export default function StudentResumeBuilderPage() {
  const { profile } = useStudent()
  const [resume, setResume] = React.useState<ResumeData | null>(null)
  const [targetJobId, setTargetJobId] = React.useState("general")
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    if (!profile) return

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setResume(JSON.parse(stored) as ResumeData)
        return
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }

    const social = profile.social_links || {}
    setResume({
      ...defaultResume(profile.name, profile.skills),
      phone: profile.phone || "",
      location: profile.address || "",
      linkedin: social.linkedin || "",
      github: social.github || "",
      portfolio: social.portfolio || "",
      education: [
        {
          institution: profile.user?.organization?.name || "",
          degree: `${profile.branch} — Semester ${profile.semester}`,
          duration: "",
          result: profile.cgpa ? `CGPA: ${profile.cgpa}` : "",
        },
      ],
    })
  }, [profile])

  if (!resume) {
    return <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">Loading resume builder...</div>
  }

  const targetJob = targetJobId === "general" ? null : undefined
  const targetText = targetJob
    ? ""
    : "software developer engineer programming javascript typescript react nextjs python sql git api database communication problem solving"
  const atsScore = calculateAtsScore(resume, targetText)

  const update = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setResume((current) => (current ? { ...current, [key]: value } : current))
    setSaved(false)
  }

  const saveResume = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resume))
    setSaved(true)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${(profile?.name || "student").replace(/\s+/g, "-").toLowerCase()}-resume.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const addItem = (key: "projects" | "experience" | "education") => {
    if (key === "projects") update("projects", [...resume.projects, emptyProject()])
    if (key === "experience") update("experience", [...resume.experience, emptyExperience()])
    if (key === "education") update("education", [...resume.education, emptyEducation()])
  }

  const printResume = () => {
    saveResume()
    window.setTimeout(() => window.print(), 50)
  }

  return (
    <>
      <div className="resume-builder space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <IconSparkles className="size-4" />
              Career Preparation
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">ATS Resume Builder</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Build a clean, machine-readable resume from your verified student profile. Review every detail before exporting.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveResume}>{saved ? "Saved" : "Save Draft"}</Button>
            <Button variant="outline" onClick={exportJson}><IconDownload className="mr-2 size-4" />JSON</Button>
            <Button onClick={printResume}><IconFileText className="mr-2 size-4" />Export PDF</Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Target & ATS readiness</CardTitle>
                <CardDescription>Use a job description later for targeted keyword matching. This first version starts with a general software role profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">ATS compatibility</p>
                      <p className="mt-1 text-3xl font-semibold">{atsScore}<span className="text-base text-muted-foreground">/100</span></p>
                    </div>
                    <Badge variant={atsScore >= 75 ? "default" : "secondary"}>{atsScore >= 75 ? "Strong" : "Needs improvement"}</Badge>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${atsScore}%` }} />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Target job</label>
                  <select value={targetJobId} onChange={(event) => setTargetJobId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="general">General Software Developer Resume</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Personal & professional details</CardTitle><CardDescription>These values are prefilled from the student profile where available.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Professional headline" value={resume.headline} onChange={(value) => update("headline", value)} className="sm:col-span-2" />
                <Field label="Email" value={resume.email} onChange={(value) => update("email", value)} />
                <Field label="Phone" value={resume.phone} onChange={(value) => update("phone", value)} />
                <Field label="Location" value={resume.location} onChange={(value) => update("location", value)} />
                <Field label="LinkedIn" value={resume.linkedin} onChange={(value) => update("linkedin", value)} />
                <Field label="GitHub" value={resume.github} onChange={(value) => update("github", value)} />
                <Field label="Portfolio" value={resume.portfolio} onChange={(value) => update("portfolio", value)} />
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium">Professional summary</label>
                  <Textarea value={resume.summary} onChange={(event) => update("summary", event.target.value)} rows={5} placeholder="Write a concise, truthful summary of your profile." />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium">Technical skills</label>
                  <Textarea value={resume.skills} onChange={(event) => update("skills", event.target.value)} rows={3} placeholder="React, Next.js, TypeScript, Python, SQL..." />
                  <p className="mt-1 text-xs text-muted-foreground">Separate skills with commas. Only include skills you can genuinely demonstrate.</p>
                </div>
              </CardContent>
            </Card>

            <SectionEditor title="Education" description="Add your academic qualifications." onAdd={() => addItem("education")}>
              {resume.education.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
                  <Field label="Institution" value={item.institution} onChange={(value) => update("education", resume.education.map((entry, i) => i === index ? { ...entry, institution: value } : entry))} />
                  <Field label="Degree / program" value={item.degree} onChange={(value) => update("education", resume.education.map((entry, i) => i === index ? { ...entry, degree: value } : entry))} />
                  <Field label="Duration" value={item.duration} onChange={(value) => update("education", resume.education.map((entry, i) => i === index ? { ...entry, duration: value } : entry))} />
                  <Field label="Result" value={item.result} onChange={(value) => update("education", resume.education.map((entry, i) => i === index ? { ...entry, result: value } : entry))} />
                </div>
              ))}
            </SectionEditor>

            <SectionEditor title="Projects" description="Show practical work with measurable, truthful outcomes." onAdd={() => addItem("projects")}>
              {resume.projects.map((item, index) => (
                <div key={index} className="space-y-3 rounded-xl border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Project name" value={item.title} onChange={(value) => update("projects", resume.projects.map((entry, i) => i === index ? { ...entry, title: value } : entry))} />
                    <Field label="Technologies" value={item.technologies} onChange={(value) => update("projects", resume.projects.map((entry, i) => i === index ? { ...entry, technologies: value } : entry))} />
                  </div>
                  <Textarea value={item.description} onChange={(event) => update("projects", resume.projects.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry))} rows={3} placeholder="What did you build, what problem did it solve, and what was your contribution?" />
                </div>
              ))}
            </SectionEditor>

            <SectionEditor title="Experience" description="Internships, jobs, freelance work, or relevant practical experience." onAdd={() => addItem("experience")}>
              {resume.experience.map((item, index) => (
                <div key={index} className="space-y-3 rounded-xl border p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Company" value={item.company} onChange={(value) => update("experience", resume.experience.map((entry, i) => i === index ? { ...entry, company: value } : entry))} />
                    <Field label="Role" value={item.role} onChange={(value) => update("experience", resume.experience.map((entry, i) => i === index ? { ...entry, role: value } : entry))} />
                    <Field label="Duration" value={item.duration} onChange={(value) => update("experience", resume.experience.map((entry, i) => i === index ? { ...entry, duration: value } : entry))} />
                  </div>
                  <Textarea value={item.description} onChange={(event) => update("experience", resume.experience.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry))} rows={3} placeholder="Describe your responsibilities and results." />
                </div>
              ))}
            </SectionEditor>

            <Card>
              <CardHeader><CardTitle>Additional sections</CardTitle><CardDescription>Keep these concise and relevant to the target role.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <TagListEditor label="Certifications" items={resume.certifications} onChange={(items) => update("certifications", items)} placeholder="e.g. AWS Cloud Practitioner" />
                <TagListEditor label="Achievements" items={resume.achievements} onChange={(items) => update("achievements", items)} placeholder="e.g. Hackathon finalist" />
                <Field label="Languages" value={resume.languages} onChange={(value) => update("languages", value)} />
              </CardContent>
            </Card>
          </div>

          <div className="xl:sticky xl:top-6 xl:self-start">
            <Card className="overflow-hidden border-0 shadow-lg print:shadow-none">
              <CardHeader className="resume-preview-toolbar flex-row items-center justify-between border-b bg-muted/30 print:hidden">
                <div><CardTitle>Live Preview</CardTitle><CardDescription>Clean single-column format designed for ATS parsing.</CardDescription></div>
                <Button size="sm" variant="outline" onClick={printResume}><IconDownload className="mr-2 size-4" />PDF</Button>
              </CardHeader>
              <CardContent className="bg-zinc-100 p-4 dark:bg-zinc-950 print:bg-white print:p-0">
                <article id="resume-print" className="mx-auto min-h-[1056px] w-full max-w-[794px] bg-white p-10 text-zinc-900 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
                  <header className="border-b-2 border-zinc-900 pb-5">
                    <h2 className="text-3xl font-bold tracking-tight">{profile?.name || "Your Name"}</h2>
                    <p className="mt-1 text-base font-medium">{resume.headline || "Professional Title"}</p>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600">
                      {[resume.email, resume.phone, resume.location, resume.linkedin, resume.github, resume.portfolio].filter(Boolean).map((value) => <span key={value}>{value}</span>)}
                    </div>
                  </header>

                  <ResumeSection title="Professional Summary"><p>{resume.summary || "Add a concise professional summary."}</p></ResumeSection>
                  <ResumeSection title="Skills"><p>{resume.skills || "Add your technical skills."}</p></ResumeSection>
                  <ResumeSection title="Education">
                    {resume.education.filter((item) => item.institution || item.degree).map((item, index) => <div key={index} className="mb-3"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{item.degree || "Degree"}</p><p className="text-sm">{item.institution}</p></div><div className="text-right text-xs text-zinc-600"><p>{item.duration}</p><p>{item.result}</p></div></div></div>)}
                  </ResumeSection>
                  {resume.projects.some((item) => item.title || item.description) && <ResumeSection title="Projects">{resume.projects.filter((item) => item.title || item.description).map((item, index) => <div key={index} className="mb-3"><div className="flex items-baseline justify-between gap-3"><p className="font-semibold">{item.title || "Project"}</p><p className="text-xs text-zinc-600">{item.technologies}</p></div><p className="mt-1 text-sm leading-5">{item.description}</p></div>)}</ResumeSection>}
                  {resume.experience.length > 0 && <ResumeSection title="Experience">{resume.experience.filter((item) => item.company || item.role).map((item, index) => <div key={index} className="mb-3"><div className="flex items-baseline justify-between gap-3"><p className="font-semibold">{item.role || "Role"} — {item.company}</p><p className="text-xs text-zinc-600">{item.duration}</p></div><p className="mt-1 text-sm leading-5">{item.description}</p></div>)}</ResumeSection>}
                  {resume.certifications.length > 0 && <ResumeSection title="Certifications"><ul className="list-disc pl-5">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></ResumeSection>}
                  {resume.achievements.length > 0 && <ResumeSection title="Achievements"><ul className="list-disc pl-5">{resume.achievements.map((item) => <li key={item}>{item}</li>)}</ul></ResumeSection>}
                  {resume.languages && <ResumeSection title="Languages"><p>{resume.languages}</p></ResumeSection>}
                </article>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: white !important; }
          body * { visibility: hidden; }
          #resume-print, #resume-print * { visibility: visible; }
          #resume-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </>
  )
}

function Field({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <div className={className}><label className="mb-2 block text-sm font-medium">{label}</label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function SectionEditor({ title, description, onAdd, children }: { title: string; description: string; onAdd: () => void; children: React.ReactNode }) {
  return <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div><Button size="sm" variant="outline" onClick={onAdd}><IconPlus className="mr-1 size-4" />Add</Button></div></CardHeader><CardContent className="space-y-3">{children}</CardContent></Card>
}

function TagListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [value, setValue] = React.useState("")
  return <div><label className="mb-2 block text-sm font-medium">{label}</label><div className="flex gap-2"><Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} onKeyDown={(event) => { if (event.key === "Enter" && value.trim()) { event.preventDefault(); onChange([...items, value.trim()]); setValue("") } }} /><Button type="button" variant="outline" onClick={() => { if (value.trim()) { onChange([...items, value.trim()]); setValue("") } }}>Add</Button></div><div className="mt-2 flex flex-wrap gap-2">{items.map((item, index) => <Badge key={`${item}-${index}`} variant="secondary" className="gap-1 py-1.5">{item}<button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={`Remove ${item}`}><IconTrash className="size-3" /></button></Badge>)}</div></div>
}

function ResumeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-5"><h3 className="mb-2 border-b border-zinc-300 pb-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-800">{title}</h3><div className="text-sm leading-5 text-zinc-800">{children}</div></section>
}
