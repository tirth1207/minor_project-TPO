"use client"

import * as React from "react"
import { IconCheck, IconDownload, IconFileText, IconPlus, IconSparkles, IconTrash } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useStudent } from "../student-context"

type ResumeProject = { title: string; description: string; technologies: string }
type ResumeExperience = { company: string; role: string; duration: string; description: string }
type ResumeEducation = { institution: string; degree: string; duration: string; result: string }
type ResumeData = {
  headline: string; summary: string; email: string; phone: string; location: string
  linkedin: string; github: string; portfolio: string; skills: string
  education: ResumeEducation[]; projects: ResumeProject[]; experience: ResumeExperience[]
  certifications: string[]; achievements: string[]; languages: string
}

const STORAGE_KEY = "tpo-student-resume-builder"
const emptyProject = (): ResumeProject => ({ title: "", description: "", technologies: "" })
const emptyExperience = (): ResumeExperience => ({ company: "", role: "", duration: "", description: "" })
const emptyEducation = (): ResumeEducation => ({ institution: "", degree: "", duration: "", result: "" })

function splitItems(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean) }
function cleanUrl(value: string) { return value.trim().replace(/^https?:\/\//, "").replace(/\/$/, "") }

function calculateAtsScore(resume: ResumeData, targetText: string) {
  const content = [resume.headline, resume.summary, resume.skills,
    resume.education.map((item) => Object.values(item).join(" ")).join(" "),
    resume.projects.map((item) => Object.values(item).join(" ")).join(" "),
    resume.experience.map((item) => Object.values(item).join(" ")).join(" "),
    resume.certifications.join(" "), resume.achievements.join(" ")].join(" ").toLowerCase()
  const targetWords = Array.from(new Set(targetText.toLowerCase().replace(/[^a-z0-9+#.\- ]/g, " ").split(/\s+/).filter((word) => word.length >= 4)))
  const matches = targetWords.filter((word) => content.includes(word))
  let score = targetWords.length ? Math.min(35, Math.round((matches.length / targetWords.length) * 35)) : 20
  if (resume.headline.trim()) score += 8
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
    email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "",
    skills: (profileSkills || []).join(", "), education: [emptyEducation()], projects: [emptyProject()],
    experience: [], certifications: [], achievements: [], languages: "English, Hindi, Gujarati",
  }
}

function Field({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <div className={className}><label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function SectionEditor({ title, description, onAdd, children }: { title: string; description: string; onAdd: () => void; children: React.ReactNode }) {
  return <Card><CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div><Button variant="outline" size="sm" onClick={onAdd}><IconPlus className="mr-1.5 size-4" />Add</Button></CardHeader><CardContent className="space-y-3">{children}</CardContent></Card>
}

function TagListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [value, setValue] = React.useState("")
  const add = () => { if (!value.trim()) return; onChange([...items, value.trim()]); setValue("") }
  return <div><label className="mb-1.5 block text-sm font-medium">{label}</label><div className="flex gap-2"><Input value={value} placeholder={placeholder} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add() } }} /><Button type="button" variant="outline" onClick={add}><IconPlus className="size-4" /></Button></div>{items.length > 0 && <div className="mt-2 space-y-1.5">{items.map((item, index) => <div key={`${item}-${index}`} className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"><span>{item}</span><button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="text-muted-foreground hover:text-destructive"><IconTrash className="size-4" /></button></div>)}</div>}</div>
}

function ResumeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="resume-section"><div className="resume-section-heading"><span>{title}</span></div>{children}</section>
}

function ResumePreview({ resume, name }: { resume: ResumeData; name: string }) {
  const skills = splitItems(resume.skills), languages = splitItems(resume.languages)
  const contact = [resume.email, resume.phone, resume.location].filter(Boolean)
  const links = [resume.linkedin, resume.github, resume.portfolio].filter(Boolean)
  const education = resume.education.filter((item) => item.institution || item.degree || item.result)
  const projects = resume.projects.filter((item) => item.title || item.description || item.technologies)
  const experience = resume.experience.filter((item) => item.company || item.role || item.description)
  return <article className="resume-paper" aria-label="Resume preview">
    <header className="resume-header">
      <h1>{name || "Your Name"}</h1>
      {resume.headline && <p className="resume-headline">{resume.headline}</p>}
      {(contact.length > 0 || links.length > 0) && <div className="resume-contact">{contact.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}{links.map((item, index) => <span key={`${item}-${index}`}>{cleanUrl(item)}</span>)}</div>}
    </header>
    {resume.summary.trim() && <ResumeSection title="Professional Summary"><p className="resume-body-text">{resume.summary}</p></ResumeSection>}
    {skills.length > 0 && <ResumeSection title="Technical Skills"><p className="resume-skill-line">{skills.join("  •  ")}</p></ResumeSection>}
    {experience.length > 0 && <ResumeSection title="Experience"><div className="resume-stack">{experience.map((item, index) => <div className="resume-entry" key={index}><div className="resume-entry-top"><div><h3>{item.role || "Role"}</h3>{item.company && <p className="resume-muted-strong">{item.company}</p>}</div>{item.duration && <span className="resume-date">{item.duration}</span>}</div>{item.description && <p className="resume-body-text">{item.description}</p>}</div>)}</div></ResumeSection>}
    {projects.length > 0 && <ResumeSection title="Projects"><div className="resume-stack">{projects.map((item, index) => <div className="resume-entry" key={index}><div className="resume-entry-top"><div><h3>{item.title || "Project"}</h3>{item.technologies && <p className="resume-muted-strong">{item.technologies}</p>}</div></div>{item.description && <p className="resume-body-text">{item.description}</p>}</div>)}</div></ResumeSection>}
    {education.length > 0 && <ResumeSection title="Education"><div className="resume-stack">{education.map((item, index) => <div className="resume-entry" key={index}><div className="resume-entry-top"><div><h3>{item.degree || "Education"}</h3>{item.institution && <p className="resume-muted-strong">{item.institution}</p>}</div>{item.duration && <span className="resume-date">{item.duration}</span>}</div>{item.result && <p className="resume-body-text">{item.result}</p>}</div>)}</div></ResumeSection>}
    {resume.certifications.length > 0 && <ResumeSection title="Certifications"><ul className="resume-list">{resume.certifications.map((item, index) => <li key={index}>{item}</li>)}</ul></ResumeSection>}
    {resume.achievements.length > 0 && <ResumeSection title="Achievements"><ul className="resume-list">{resume.achievements.map((item, index) => <li key={index}>{item}</li>)}</ul></ResumeSection>}
    {languages.length > 0 && <ResumeSection title="Languages"><p className="resume-skill-line">{languages.join("  •  ")}</p></ResumeSection>}
  </article>
}

export default function StudentResumeBuilderPage() {
  const { profile } = useStudent()
  const [resume, setResume] = React.useState<ResumeData | null>(null)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    if (!profile) return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) { try { setResume(JSON.parse(stored) as ResumeData); return } catch { window.localStorage.removeItem(STORAGE_KEY) } }
    const social = profile.social_links || {}
    setResume({ ...defaultResume(profile.name, profile.skills), phone: profile.phone || "", location: profile.address || "", linkedin: social.linkedin || "", github: social.github || "", portfolio: social.portfolio || "", education: [{ institution: profile.user?.organization?.name || "", degree: `${profile.branch} — Semester ${profile.semester}`, duration: "", result: profile.cgpa ? `CGPA: ${profile.cgpa}` : "" }] })
  }, [profile])

  if (!resume) return <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">Loading resume builder...</div>

  const atsScore = calculateAtsScore(resume, "software developer engineer programming javascript typescript react nextjs python sql git api database communication problem solving")
  const update = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => { setResume((current) => current ? { ...current, [key]: value } : current); setSaved(false) }
  const saveResume = () => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resume)); setSaved(true) }
  const exportJson = () => { const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${(profile?.name || "student").replace(/\s+/g, "-").toLowerCase()}-resume.json`; anchor.click(); URL.revokeObjectURL(url) }
  const printResume = () => { saveResume(); window.setTimeout(() => window.print(), 80) }
  const addItem = (key: "projects" | "experience" | "education") => { if (key === "projects") update("projects", [...resume.projects, emptyProject()]); if (key === "experience") update("experience", [...resume.experience, emptyExperience()]); if (key === "education") update("education", [...resume.education, emptyEducation()]) }

  return <>
    <style jsx global>{`
      .resume-paper { width: 210mm; max-width: 100%; min-height: 297mm; margin: 0 auto; background: #fff; color: #151515; padding: 15mm 16mm 14mm; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
      .resume-header { border-bottom: 2px solid #171717; padding-bottom: 14px; }
      .resume-header h1 { margin: 0; font-size: 31px; line-height: 1; font-weight: 800; letter-spacing: -.03em; }
      .resume-headline { margin: 7px 0 9px; font-size: 13px; font-weight: 700; letter-spacing: .02em; color: #3d3d3d; }
      .resume-contact { display: flex; flex-wrap: wrap; font-size: 9.5px; line-height: 1.5; color: #444; }
      .resume-contact span:not(:last-child)::after { content: "|"; color: #aaa; margin: 0 8px; }
      .resume-section { margin-top: 14px; break-inside: avoid; }
      .resume-section-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #222; }
      .resume-section-heading::after { content: ""; height: 1px; flex: 1; background: #d2d2d2; }
      .resume-body-text { margin: 0; font-size: 10px; line-height: 1.55; color: #303030; }
      .resume-skill-line { margin: 0; font-size: 9.8px; line-height: 1.55; color: #303030; }
      .resume-stack { display: grid; gap: 10px; }
      .resume-entry { break-inside: avoid; }
      .resume-entry-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
      .resume-entry h3 { margin: 0; font-size: 11px; line-height: 1.35; font-weight: 800; }
      .resume-muted-strong { margin: 2px 0 0; font-size: 9.6px; line-height: 1.4; font-weight: 600; color: #555; }
      .resume-date { flex: 0 0 auto; font-size: 9px; line-height: 1.4; color: #555; white-space: nowrap; }
      .resume-entry .resume-body-text { margin-top: 4px; }
      .resume-list { margin: 0; padding-left: 16px; font-size: 9.8px; line-height: 1.55; color: #303030; }
      .resume-list li { padding-left: 2px; margin-bottom: 2px; }
      @media print {
        @page { size: A4; margin: 0; }
        html, body { width: 210mm; margin: 0 !important; padding: 0 !important; background: #fff !important; }
        body * { visibility: hidden !important; }
        .resume-print-root, .resume-print-root * { visibility: visible !important; }
        .resume-print-root { position: absolute !important; inset: 0 !important; width: 210mm !important; background: #fff !important; }
        .resume-paper { width: 210mm !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 14mm 15mm !important; box-shadow: none !important; }
        .resume-section, .resume-entry { break-inside: avoid; }
      }
    `}</style>

    <div className="resume-builder space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><IconSparkles className="size-4" />Career Preparation</div><h1 className="text-3xl font-semibold tracking-tight">ATS Resume Builder</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Create a polished, recruiter-ready resume from your verified profile. The exported document stays intentionally simple for Applicant Tracking Systems while looking professionally designed.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={saveResume}>{saved ? <><IconCheck className="mr-2 size-4" />Saved</> : "Save Draft"}</Button><Button variant="outline" onClick={exportJson}><IconDownload className="mr-2 size-4" />Backup JSON</Button><Button onClick={printResume}><IconFileText className="mr-2 size-4" />Export PDF</Button></div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="border-primary/15 shadow-sm"><CardHeader className="pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle>Resume readiness</CardTitle><CardDescription>Improve the content before you send it.</CardDescription></div><Badge variant={atsScore >= 75 ? "default" : "secondary"}>{atsScore}/100</Badge></div></CardHeader><CardContent><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${atsScore}%` }} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl border p-2.5"><p className="font-semibold">{resume.skills ? splitItems(resume.skills).length : 0}</p><p className="mt-0.5 text-muted-foreground">Skills</p></div><div className="rounded-xl border p-2.5"><p className="font-semibold">{resume.projects.filter((item) => item.title || item.description).length}</p><p className="mt-0.5 text-muted-foreground">Projects</p></div><div className="rounded-xl border p-2.5"><p className="font-semibold">{resume.experience.filter((item) => item.company || item.role).length}</p><p className="mt-0.5 text-muted-foreground">Experience</p></div></div></CardContent></Card>

          <Card><CardHeader><CardTitle>Personal & professional details</CardTitle><CardDescription>Keep these accurate and consistent with your student profile.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Professional headline" value={resume.headline} onChange={(value) => update("headline", value)} className="sm:col-span-2" />
            <Field label="Email" value={resume.email} onChange={(value) => update("email", value)} /><Field label="Phone" value={resume.phone} onChange={(value) => update("phone", value)} /><Field label="Location" value={resume.location} onChange={(value) => update("location", value)} /><Field label="LinkedIn" value={resume.linkedin} onChange={(value) => update("linkedin", value)} /><Field label="GitHub" value={resume.github} onChange={(value) => update("github", value)} /><Field label="Portfolio" value={resume.portfolio} onChange={(value) => update("portfolio", value)} />
            <div className="sm:col-span-2"><label className="mb-1.5 block text-xs font-medium text-muted-foreground">Professional summary</label><Textarea value={resume.summary} onChange={(event) => update("summary", event.target.value)} rows={5} /></div>
            <div className="sm:col-span-2"><label className="mb-1.5 block text-xs font-medium text-muted-foreground">Technical skills</label><Textarea value={resume.skills} onChange={(event) => update("skills", event.target.value)} rows={3} placeholder="React, Next.js, TypeScript, Python, SQL..." /><p className="mt-1.5 text-xs text-muted-foreground">Separate skills with commas. Only include skills you can genuinely demonstrate.</p></div>
          </CardContent></Card>

          <SectionEditor title="Education" description="Academic qualifications." onAdd={() => addItem("education")}>{resume.education.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"><Field label="Institution" value={item.institution} onChange={(value) => update("education", resume.education.map((entry, i) => i === index ? { ...entry, institution: value } : entry))} /><Field label="Degree / program" value={item.degree} onChange={(value) => update("education", resume.education.map((entry, i) => i === index ? { ...entry, degree: value } : entry))} /><Field label="Duration" value={item.duration} onChange={(value) => update("education", resume.education.map((entry, i) => i === index ? { ...entry, duration: value } : entry))} /><Field label="Result" value={item.result} onChange={(value) => update("education", resume.education.map((entry, i) => i === index ? { ...entry, result: value } : entry))} /></div>)}</SectionEditor>

          <SectionEditor title="Projects" description="Focus on what you built and your contribution." onAdd={() => addItem("projects")}>{resume.projects.map((item, index) => <div key={index} className="space-y-3 rounded-xl border p-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Project name" value={item.title} onChange={(value) => update("projects", resume.projects.map((entry, i) => i === index ? { ...entry, title: value } : entry))} /><Field label="Technologies" value={item.technologies} onChange={(value) => update("projects", resume.projects.map((entry, i) => i === index ? { ...entry, technologies: value } : entry))} /></div><Textarea value={item.description} onChange={(event) => update("projects", resume.projects.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry))} rows={3} placeholder="What did you build, how did it work, and what was your contribution?" /></div>)}</SectionEditor>

          <SectionEditor title="Experience" description="Internships, jobs, freelance or practical work." onAdd={() => addItem("experience")}>{resume.experience.map((item, index) => <div key={index} className="space-y-3 rounded-xl border p-4"><div className="grid gap-3 sm:grid-cols-3"><Field label="Company" value={item.company} onChange={(value) => update("experience", resume.experience.map((entry, i) => i === index ? { ...entry, company: value } : entry))} /><Field label="Role" value={item.role} onChange={(value) => update("experience", resume.experience.map((entry, i) => i === index ? { ...entry, role: value } : entry))} /><Field label="Duration" value={item.duration} onChange={(value) => update("experience", resume.experience.map((entry, i) => i === index ? { ...entry, duration: value } : entry))} /></div><Textarea value={item.description} onChange={(event) => update("experience", resume.experience.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry))} rows={3} placeholder="Describe responsibilities and results." /></div>)}</SectionEditor>

          <Card><CardHeader><CardTitle>Additional sections</CardTitle><CardDescription>Only include information that strengthens your application.</CardDescription></CardHeader><CardContent className="space-y-5"><TagListEditor label="Certifications" items={resume.certifications} onChange={(items) => update("certifications", items)} placeholder="e.g. AWS Cloud Practitioner" /><TagListEditor label="Achievements" items={resume.achievements} onChange={(items) => update("achievements", items)} placeholder="e.g. Hackathon finalist" /><div><label className="mb-1.5 block text-sm font-medium">Languages</label><Input value={resume.languages} onChange={(event) => update("languages", event.target.value)} placeholder="English, Hindi, Gujarati" /></div></CardContent></Card>
        </div>

        <div className="min-w-0 rounded-2xl border bg-muted/25 p-3 shadow-inner sm:p-5"><div className="mb-3 flex items-center justify-between gap-3 px-1"><div><p className="text-sm font-semibold">Live resume</p><p className="text-xs text-muted-foreground">A4 • ATS-friendly • single column</p></div><Badge variant="outline">Preview</Badge></div><div className="resume-print-root overflow-auto rounded-xl bg-neutral-950/90 p-2 shadow-2xl sm:p-5"><ResumePreview resume={resume} name={profile?.name || "Your Name"} /></div></div>
      </div>
    </div>
  </>
}
