export const dynamic = 'force-dynamic'

import { requireApprovedStudent } from '@/lib/auth/require-approved-student'
import { NextResponse } from 'next/server'
import { evaluateMockInterview } from '@/lib/ai/mock-interview-evaluator'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, studentId } = auth

    const body = await request.json()
    const { answers } = body
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers array is required' }, { status: 400 })
    }

    // Fetch interview, verify ownership and that questions are ready
    const { data: mock, error: mockError } = await supabase
      .from('mock_interviews')
      .select('*, retry_count')
      .eq('id', id)
      .eq('student_id', studentId)
      .maybeSingle()
    if (mockError || !mock) {
      return NextResponse.json({ error: 'Mock interview not found' }, { status: 404 })
    }
    if (mock.status !== 'COMPLETED') {
      return NextResponse.json({ error: `Interview not ready for evaluation. Current status: ${mock.status}` }, { status: 400 })
    }

    // Transition to EVALUATING
    await supabase.from('mock_interviews').update({ status: 'EVALUATING' }).eq('id', id)

    // Prepare full question objects (stored as JSON in DB) and match answers by questionId
    const questions = mock.questions as any[]
    const formattedAnswers = answers.map((a: any) => ({ questionId: a.questionId ?? a.id, answer: a.answer, language: a.language }))

    // Call AI evaluator
    const report = await evaluateMockInterview(questions, formattedAnswers)

    // Persist results
    const { data: updatedMock, error: updateError } = await supabase
      .from('mock_interviews')
      .update({
        answers: formattedAnswers,
        overall_score: report.overallScore,
        ai_summary: report.summary,
        ai_results: report.results,
        completed_at: new Date().toISOString(),
        status: 'EVALUATED',
      })
      .eq('id', id)
      .select()
      .single()
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // Notify student
    const { data: studentProfile, error: studentError } = await supabase
      .from('student_profiles')
      .select('user_id')
      .eq('id', updatedMock.student_id)
      .single()
    if (!studentError && studentProfile) {
      await supabase.from('notifications').insert({
        user_id: studentProfile.user_id,
        title: 'Mock Interview Completed',
        message: `Your mock interview for "${updatedMock.job_role_context}" has been evaluated. Score: ${updatedMock.overall_score}%`,
        is_read: false,
      })
    }

    return NextResponse.json({ mock: updatedMock })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
