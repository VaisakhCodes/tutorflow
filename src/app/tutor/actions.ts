"use server";

import { revalidatePath } from "next/cache";
import {
  createClient,
  getAuthRole,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateProgressSummary,
  generateSessionPlan,
  generateSessionReview,
  type ProgressSummary,
  type SessionPlan,
} from "@/lib/ai/gemini";

export type CreateStudentInput = {
  email: string;
  password: string;
  name: string;
  subject: string;
  currentLevel: string;
  learningGoals: string;
  weakAreas: string;
};

export type CreateStudentResult =
  | {
      success: true;
      studentId: string;
    }
  | {
      success: false;
      error: string;
    };

export async function createStudent(
  input: CreateStudentInput
): Promise<CreateStudentResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();
  const name = input.name.trim();
  const subject = input.subject.trim();
  const currentLevel = input.currentLevel.trim();
  const learningGoals = input.learningGoals.trim();
  const weakAreas = input.weakAreas.trim();

  if (
    !email ||
    !password ||
    !name ||
    !subject ||
    !currentLevel ||
    !learningGoals ||
    !weakAreas
  ) {
    return {
      success: false,
      error: "All student fields are required.",
    };
  }

  if (!email.includes("@")) {
    return {
      success: false,
      error: "Please enter a valid email address.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in to create a student.",
    };
  }

  if (auth.role !== "tutor") {
    return {
      success: false,
      error: "Only tutors can create students.",
    };
  }

  const admin = createAdminClient();

  if (!admin) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return {
      success: false,
      error:
        authError?.message ??
        "Failed to create student account.",
    };
  }

  const studentUserId = authData.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .insert({
      id: studentUserId,
      role: "student",
    });

  if (profileError) {
    await admin.auth.admin.deleteUser(studentUserId);

    return {
      success: false,
      error: profileError.message,
    };
  }

  const { data: student, error: studentError } =
    await admin
      .from("students")
      .insert({
        profile_id: studentUserId,
        tutor_id: auth.userId,
        name,
        subject,
        current_level: currentLevel,
        learning_goals: learningGoals,
        weak_areas: weakAreas,
      })
      .select("id")
      .single();

  if (studentError || !student) {
    await admin.auth.admin.deleteUser(studentUserId);

    return {
      success: false,
      error:
        studentError?.message ??
        "Failed to create student record.",
    };
  }

  revalidatePath("/tutor");

  return {
    success: true,
    studentId: student.id,
  };
}

export type ScheduleSessionInput = {
  studentId: string;
  scheduledAt: string;
  topic: string;
};

export type ScheduleSessionResult =
  | {
      success: true;
      sessionId: string;
    }
  | {
      success: false;
      error: string;
    };

export async function scheduleSession(
  input: ScheduleSessionInput
): Promise<ScheduleSessionResult> {
  const studentId = input.studentId.trim();
  const scheduledAt = input.scheduledAt.trim();
  const topic = input.topic.trim();

  if (!studentId || !scheduledAt || !topic) {
    return {
      success: false,
      error:
        "Student, date and time, and topic are required.",
    };
  }

  if (topic.length > 200) {
    return {
      success: false,
      error: "Topic must be 200 characters or fewer.",
    };
  }

  const parsedDate = new Date(scheduledAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      success: false,
      error: "Please provide a valid date and time.",
    };
  }

  if (parsedDate <= new Date()) {
    return {
      success: false,
      error:
        "A session must be scheduled for a future date and time.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error:
        "You must be signed in to schedule a session.",
    };
  }

  if (auth.role !== "tutor") {
    return {
      success: false,
      error: "Only tutors can schedule sessions.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const { data: student, error: studentError } =
    await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("tutor_id", auth.userId)
      .single();

  if (studentError || !student) {
    return {
      success: false,
      error:
        "The selected student is not assigned to you.",
    };
  }

  const { data: session, error: sessionError } =
    await supabase
      .from("sessions")
      .insert({
        tutor_id: auth.userId,
        student_id: studentId,
        scheduled_at: parsedDate.toISOString(),
        topic,
        status: "scheduled",
      })
      .select("id")
      .single();

  if (sessionError || !session) {
    if (sessionError?.code === "23505") {
      return {
        success: false,
        error:
          "You already have a session scheduled at this time.",
      };
    }

    return {
      success: false,
      error:
        sessionError?.message ??
        "Failed to schedule the session.",
    };
  }

  revalidatePath("/tutor");
  revalidatePath("/student");

  return {
    success: true,
    sessionId: session.id,
  };
}

/* -------------------------------------------------------------------------- */
/* Session status                                                             */
/* -------------------------------------------------------------------------- */

export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "ai_reviewed";

export type UpdateSessionStatusResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

export async function updateSessionStatus(
  formData: FormData
): Promise<UpdateSessionStatusResult> {
  const sessionId = String(
    formData.get("sessionId") ?? ""
  ).trim();

  const nextStatus = String(
    formData.get("nextStatus") ?? ""
  ).trim();

  if (!sessionId) {
    return {
      success: false,
      error: "Session ID is required.",
    };
  }

  if (
    nextStatus !== "in_progress" &&
    nextStatus !== "completed"
  ) {
    return {
      success: false,
      error: "Invalid session status.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (auth.role !== "tutor") {
    return {
      success: false,
      error:
        "Only tutors can update session status.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("sessions")
    .select("id, student_id, status")
    .eq("id", sessionId)
    .eq("tutor_id", auth.userId)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: "Session could not be found.",
    };
  }

  const currentStatus =
    session.status as SessionStatus;

  const allowedNextStatus: Partial<
    Record<SessionStatus, SessionStatus>
  > = {
    scheduled: "in_progress",
    in_progress: "completed",
  };

  const expectedNextStatus =
    allowedNextStatus[currentStatus];

  if (expectedNextStatus !== nextStatus) {
    return {
      success: false,
      error:
        `Invalid status transition: ${currentStatus} -> ${nextStatus}.`,
    };
  }

  const { error: updateError } =
    await supabase
      .from("sessions")
      .update({
        status: nextStatus,
      })
      .eq("id", session.id)
      .eq("tutor_id", auth.userId);

  if (updateError) {
    console.error(
      "Failed to update session status:",
      updateError
    );

    return {
      success: false,
      error:
        "Failed to update the session status.",
    };
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  revalidatePath(
    `/tutor/student/${session.student_id}`
  );

  return {
    success: true,
  };
}

/**
 * Dedicated Server Action for the <form action={...}> API.
 *
 * This wrapper intentionally returns void so it can be used directly
 * as a form action without creating an inline function in page.tsx.
 */
export async function updateSessionStatusAction(
  formData: FormData
): Promise<void> {
  await updateSessionStatus(formData);
}

/* -------------------------------------------------------------------------- */
/* Session notes                                                              */
/* -------------------------------------------------------------------------- */

export type SaveSessionNotesResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

export async function saveSessionNotes(
  sessionId: string,
  notes: string
): Promise<SaveSessionNotesResult> {
  const normalizedSessionId = sessionId.trim();
  const normalizedNotes = notes.trim();

  if (!normalizedSessionId) {
    return {
      success: false,
      error: "Session ID is required.",
    };
  }

  if (!normalizedNotes) {
    return {
      success: false,
      error: "Session notes cannot be empty.",
    };
  }

  if (normalizedNotes.length > 10000) {
    return {
      success: false,
      error:
        "Session notes must be 10,000 characters or fewer.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (auth.role !== "tutor") {
    return {
      success: false,
      error: "Only tutors can save session notes.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("sessions")
    .select("id, student_id")
    .eq("id", normalizedSessionId)
    .eq("tutor_id", auth.userId)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: "Session could not be found.",
    };
  }

  const {
    data: existingNotes,
    error: existingNotesError,
  } = await supabase
    .from("session_notes")
    .select("id")
    .eq("session_id", session.id)
    .maybeSingle();

  if (existingNotesError) {
    console.error(
      "Failed to check existing session notes:",
      existingNotesError
    );

    return {
      success: false,
      error:
        "Unable to load the existing session notes.",
    };
  }

  if (existingNotes) {
    const { error: updateError } =
      await supabase
        .from("session_notes")
        .update({
          notes: normalizedNotes,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", existingNotes.id);

    if (updateError) {
      console.error(
        "Failed to update session notes:",
        updateError
      );

      return {
        success: false,
        error: "Failed to save session notes.",
      };
    }
  } else {
    const { error: insertError } =
      await supabase
        .from("session_notes")
        .insert({
          session_id: session.id,
          notes: normalizedNotes,
        });

    if (insertError) {
      console.error(
        "Failed to create session notes:",
        insertError
      );

      return {
        success: false,
        error: "Failed to save session notes.",
      };
    }
  }

  revalidatePath("/tutor");
  revalidatePath(
    `/tutor/student/${session.student_id}`
  );

  return {
    success: true,
  };
}

/* -------------------------------------------------------------------------- */
/* AI session plan                                                            */
/* -------------------------------------------------------------------------- */

export type GenerateSessionPlanResult =
  | {
      success: true;
      planId: string;
    }
  | {
      success: false;
      error: string;
    };

export async function generateSessionPlanForSession(
  sessionId: string
): Promise<GenerateSessionPlanResult> {
  const normalizedSessionId = sessionId.trim();

  if (!normalizedSessionId) {
    return {
      success: false,
      error: "Session ID is required.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (auth.role !== "tutor") {
    return {
      success: false,
      error:
        "Only tutors can generate session plans.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("sessions")
    .select(
      "id, student_id, topic, scheduled_at"
    )
    .eq("id", normalizedSessionId)
    .eq("tutor_id", auth.userId)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: "Session could not be found.",
    };
  }

  const {
    data: existingPlan,
    error: existingPlanError,
  } = await supabase
    .from("ai_plans")
    .select("id")
    .eq("session_id", session.id)
    .maybeSingle();

  if (existingPlanError) {
    console.error(
      "Failed to check for an existing AI plan:",
      existingPlanError
    );

    return {
      success: false,
      error:
        "Unable to check the existing session plan.",
    };
  }

  if (existingPlan) {
    return {
      success: true,
      planId: existingPlan.id,
    };
  }

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select(
      "id, name, subject, current_level, learning_goals, weak_areas"
    )
    .eq("id", session.student_id)
    .eq("tutor_id", auth.userId)
    .single();

  if (studentError || !student) {
    return {
      success: false,
      error: "Student profile could not be found.",
    };
  }

  const {
    data: pastSessions,
    error: pastSessionsError,
  } = await supabase
    .from("sessions")
    .select(
      "scheduled_at, topic, status"
    )
    .eq("student_id", student.id)
    .eq("tutor_id", auth.userId)
    .neq("id", session.id)
    .order("scheduled_at", {
      ascending: false,
    })
    .limit(10);

  if (pastSessionsError) {
    console.error(
      "Failed to load previous sessions:",
      pastSessionsError
    );

    return {
      success: false,
      error:
        "Unable to load the student's previous sessions.",
    };
  }

  let plan: SessionPlan;

  try {
    plan = await generateSessionPlan({
      studentName: student.name,
      subject: student.subject,
      currentLevel: student.current_level,
      learningGoals:
        student.learning_goals,
      weakAreas: student.weak_areas,
      topic: session.topic,
      pastSessions:
        (pastSessions ?? []).map(
          (pastSession) => ({
            scheduled_at:
              pastSession.scheduled_at,
            topic: pastSession.topic,
            status: pastSession.status,
          })
        ),
    });
  } catch (error) {
    console.error(
      "AI session-plan generation failed:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate the AI session plan.",
    };
  }

  const {
    data: aiPlan,
    error: aiPlanError,
  } = await supabase
    .from("ai_plans")
    .insert({
      session_id: session.id,
      objectives: plan.objectives,
      lesson_outline:
        plan.lesson_outline,
      practice_questions:
        plan.practice_questions,
      raw_response: plan,
    })
    .select("id")
    .single();

  if (aiPlanError || !aiPlan) {
    console.error(
      "Failed to save AI plan:",
      aiPlanError
    );

    return {
      success: false,
      error:
        "The AI plan was generated but could not be saved.",
    };
  }

  revalidatePath("/tutor");
  revalidatePath(
    `/tutor/student/${session.student_id}`
  );

  return {
    success: true,
    planId: aiPlan.id,
  };
}

/* -------------------------------------------------------------------------- */
/* AI session review                                                          */
/* -------------------------------------------------------------------------- */

export type GenerateSessionReviewResult =
  | {
      success: true;
      reviewId: string;
    }
  | {
      success: false;
      error: string;
    };

export async function generateSessionReviewForSession(
  sessionId: string
): Promise<GenerateSessionReviewResult> {
  const normalizedSessionId = sessionId.trim();

  if (!normalizedSessionId) {
    return {
      success: false,
      error: "Session ID is required.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (auth.role !== "tutor") {
    return {
      success: false,
      error:
        "Only tutors can generate session reviews.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("sessions")
    .select(
      "id, student_id, topic, scheduled_at"
    )
    .eq("id", normalizedSessionId)
    .eq("tutor_id", auth.userId)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: "Session could not be found.",
    };
  }

  const {
    data: existingReview,
    error: existingReviewError,
  } = await supabase
    .from("ai_reviews")
    .select("id")
    .eq("session_id", session.id)
    .maybeSingle();

  if (existingReviewError) {
    console.error(
      "Failed to check for an existing AI review:",
      existingReviewError
    );

    return {
      success: false,
      error:
        "Unable to check the existing session review.",
    };
  }

  if (existingReview) {
    return {
      success: true,
      reviewId: existingReview.id,
    };
  }

  const {
    data: sessionNotes,
    error: sessionNotesError,
  } = await supabase
    .from("session_notes")
    .select("notes")
    .eq("session_id", session.id)
    .maybeSingle();

  if (sessionNotesError) {
    console.error(
      "Failed to load session notes:",
      sessionNotesError
    );

    return {
      success: false,
      error: "Unable to load the session notes.",
    };
  }

  const notes =
    sessionNotes?.notes?.trim() ?? "";

  if (!notes) {
    return {
      success: false,
      error:
        "Add session notes before generating an AI review.",
    };
  }

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select(
      "id, name, subject, current_level, learning_goals, weak_areas"
    )
    .eq("id", session.student_id)
    .eq("tutor_id", auth.userId)
    .single();

  if (studentError || !student) {
    return {
      success: false,
      error: "Student profile could not be found.",
    };
  }

  const {
    data: aiPlanRecord,
    error: aiPlanError,
  } = await supabase
    .from("ai_plans")
    .select(
      "objectives, lesson_outline, practice_questions"
    )
    .eq("session_id", session.id)
    .maybeSingle();

  if (aiPlanError) {
    console.error(
      "Failed to load the AI session plan:",
      aiPlanError
    );
  }

  let existingPlan: SessionPlan | null =
    null;

  if (
    aiPlanRecord &&
    Array.isArray(aiPlanRecord.objectives) &&
    Array.isArray(aiPlanRecord.lesson_outline) &&
    Array.isArray(
      aiPlanRecord.practice_questions
    )
  ) {
    const objectives =
      aiPlanRecord.objectives.filter(
        (item): item is string =>
          typeof item === "string"
      );

    const lessonOutline =
      aiPlanRecord.lesson_outline.filter(
        (item): item is string =>
          typeof item === "string"
      );

    const practiceQuestions =
      aiPlanRecord.practice_questions.filter(
        (item): item is string =>
          typeof item === "string"
      );

    if (
      objectives.length === 3 &&
      lessonOutline.length === 4 &&
      practiceQuestions.length === 3
    ) {
      existingPlan = {
        objectives,
        lesson_outline: lessonOutline,
        practice_questions:
          practiceQuestions,
      };
    }
  }

  const {
    data: pastSessions,
    error: pastSessionsError,
  } = await supabase
    .from("sessions")
    .select(
      "scheduled_at, topic, status"
    )
    .eq("student_id", student.id)
    .eq("tutor_id", auth.userId)
    .neq("id", session.id)
    .order("scheduled_at", {
      ascending: false,
    })
    .limit(10);

  if (pastSessionsError) {
    console.error(
      "Failed to load previous sessions:",
      pastSessionsError
    );

    return {
      success: false,
      error:
        "Unable to load the student's previous sessions.",
    };
  }

  let review;

  try {
    review = await generateSessionReview({
      studentName: student.name,
      subject: student.subject,
      currentLevel:
        student.current_level,
      learningGoals:
        student.learning_goals,
      weakAreas: student.weak_areas,
      topic: session.topic,
      sessionNotes: notes,
      scheduledAt:
        session.scheduled_at,
      pastSessions:
        (pastSessions ?? []).map(
          (pastSession) => ({
            scheduled_at:
              pastSession.scheduled_at,
            topic: pastSession.topic,
            status: pastSession.status,
          })
        ),
      existingPlan,
    });
  } catch (error) {
    console.error(
      "AI session-review generation failed:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate the AI session review.",
    };
  }

  const {
    data: aiReview,
    error: aiReviewError,
  } = await supabase
    .from("ai_reviews")
    .insert({
      session_id: session.id,
      summary: review.summary,
      next_session_suggestion:
        review.next_session_suggestion,
      raw_response: review,
    })
    .select("id")
    .single();

  if (aiReviewError || !aiReview) {
    console.error(
      "Failed to save AI session review:",
      aiReviewError
    );

    return {
      success: false,
      error:
        "The AI review was generated but could not be saved.",
    };
  }

  revalidatePath("/tutor");
  revalidatePath(
    `/tutor/student/${session.student_id}`
  );

  return {
    success: true,
    reviewId: aiReview.id,
  };
}

/* -------------------------------------------------------------------------- */
/* AI progress summary                                                        */
/* -------------------------------------------------------------------------- */

export type GenerateProgressSummaryResult =
  | {
      success: true;
      progressSummary: ProgressSummary;
    }
  | {
      success: false;
      error: string;
    };

export async function generateProgressSummaryForStudent(
  studentId: string
): Promise<GenerateProgressSummaryResult> {
  const normalizedStudentId =
    studentId.trim();

  if (!normalizedStudentId) {
    return {
      success: false,
      error: "Student ID is required.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (auth.role !== "tutor") {
    return {
      success: false,
      error:
        "Only tutors can generate progress summaries.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select(
      "id, name, subject, current_level, learning_goals, weak_areas"
    )
    .eq("id", normalizedStudentId)
    .eq("tutor_id", auth.userId)
    .single();

  if (studentError || !student) {
    return {
      success: false,
      error: "Student could not be found.",
    };
  }

  const {
    data: sessions,
    error: sessionsError,
  } = await supabase
    .from("sessions")
    .select(
      "id, scheduled_at, topic, status"
    )
    .eq("student_id", student.id)
    .eq("tutor_id", auth.userId)
    .order("scheduled_at", {
      ascending: true,
    })
    .limit(20);

  if (sessionsError) {
    console.error(
      "Failed to load student sessions for progress summary:",
      sessionsError
    );

    return {
      success: false,
      error:
        "Unable to load the student's session history.",
    };
  }

  const sessionRecords = sessions ?? [];

  if (sessionRecords.length === 0) {
    return {
      success: false,
      error:
        "No sessions are available for this student yet.",
    };
  }

  const sessionIds =
    sessionRecords.map(
      (session) => session.id
    );

  const {
    data: reviews,
    error: reviewsError,
  } = await supabase
    .from("ai_reviews")
    .select(
      "session_id, summary, next_session_suggestion"
    )
    .in("session_id", sessionIds);

  if (reviewsError) {
    console.error(
      "Failed to load AI session reviews for progress summary:",
      reviewsError
    );

    return {
      success: false,
      error:
        "Unable to load the student's AI session reviews.",
    };
  }

  const reviewBySessionId =
    new Map(
      (reviews ?? []).map((review) => [
        review.session_id,
        review,
      ])
    );

  const reviewedSessions =
    sessionRecords
      .map((session) => {
        const review =
          reviewBySessionId.get(
            session.id
          );

        return {
          scheduled_at:
            session.scheduled_at,
          topic: session.topic,
          status: session.status,
          reviewSummary:
            review?.summary ?? null,
          nextSessionSuggestion:
            review?.next_session_suggestion ??
            null,
        };
      })
      .filter(
        (session) =>
          typeof session.reviewSummary ===
            "string" &&
          session.reviewSummary.trim()
            .length > 0
      );

  if (reviewedSessions.length === 0) {
    return {
      success: false,
      error:
        "Generate at least one AI session review before creating a progress summary.",
    };
  }

  let progressSummary: ProgressSummary;

  try {
    progressSummary =
      await generateProgressSummary({
        studentName: student.name,
        subject: student.subject,
        currentLevel:
          student.current_level,
        learningGoals:
          student.learning_goals,
        weakAreas:
          student.weak_areas,
        sessions:
          reviewedSessions,
      });
  } catch (error) {
    console.error(
      "AI progress-summary generation failed:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate the AI progress summary.",
    };
  }

  revalidatePath(
    `/tutor/student/${student.id}`
  );

  return {
    success: true,
    progressSummary,
  };
}

/* -------------------------------------------------------------------------- */
/* Homework                                                                   */
/* -------------------------------------------------------------------------- */

export type HomeworkRecord = {
  id: string;
  student_id: string;
  session_id: string;
  task: string;
  completed: boolean;
  created_at: string;
};

export type CreateHomeworkResult =
  | {
      success: true;
      homeworkId: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Create one homework task for a tutor-owned session.
 *
 * The student_id is always derived from the session on the server.
 * The database trigger also enforces that the session is completed
 * or already reviewed by AI.
 */
export async function createHomework(
  sessionId: string,
  task: string
): Promise<CreateHomeworkResult> {
  const normalizedSessionId = sessionId.trim();
  const normalizedTask = task.trim();

  if (!normalizedSessionId) {
    return {
      success: false,
      error: "Session ID is required.",
    };
  }

  if (!normalizedTask) {
    return {
      success: false,
      error: "Homework task cannot be empty.",
    };
  }

  if (normalizedTask.length > 1000) {
    return {
      success: false,
      error: "Homework task must be 1,000 characters or fewer.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (auth.role !== "tutor") {
    return {
      success: false,
      error: "Only tutors can create homework.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("sessions")
    .select("id, student_id, status")
    .eq("id", normalizedSessionId)
    .eq("tutor_id", auth.userId)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: "Session could not be found.",
    };
  }

  if (
    session.status !== "completed" &&
    session.status !== "ai_reviewed"
  ) {
    return {
      success: false,
      error:
        "Homework can only be created for completed or AI-reviewed sessions.",
    };
  }

  const {
    data: homework,
    error: homeworkError,
  } = await supabase
    .from("homework")
    .insert({
      student_id: session.student_id,
      session_id: session.id,
      task: normalizedTask,
      completed: false,
    })
    .select("id")
    .single();

  if (homeworkError || !homework) {
    console.error(
      "Failed to create homework:",
      homeworkError
    );

    return {
      success: false,
      error:
        homeworkError?.message ??
        "Failed to create homework.",
    };
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  revalidatePath(
    `/tutor/student/${session.student_id}`
  );

  return {
    success: true,
    homeworkId: homework.id,
  };
}

/**
 * Form-action wrapper for createHomework().
 *
 * This keeps page.tsx free from inline functions passed to <form action={...}>.
 */
export async function createHomeworkAction(
  formData: FormData
): Promise<void> {
  const sessionId = String(
    formData.get("sessionId") ?? ""
  );
  const task = String(
    formData.get("task") ?? ""
  );

  await createHomework(sessionId, task);
}

export type CreateHomeworkBatchResult =
  | {
      success: true;
      homeworkIds: string[];
    }
  | {
      success: false;
      error: string;
    };

/**
 * Create 2-3 homework tasks for one tutor-owned completed/reviewed session.
 *
 * This is intended for AI-generated homework or other batch-created tasks.
 */
export async function createHomeworkBatch(
  sessionId: string,
  tasks: string[]
): Promise<CreateHomeworkBatchResult> {
  const normalizedSessionId = sessionId.trim();

  const normalizedTasks = Array.from(
    new Set(
      tasks
        .filter(
          (task): task is string =>
            typeof task === "string"
        )
        .map((task) => task.trim())
        .filter(Boolean)
    )
  );

  if (!normalizedSessionId) {
    return {
      success: false,
      error: "Session ID is required.",
    };
  }

  if (
    normalizedTasks.length < 2 ||
    normalizedTasks.length > 3
  ) {
    return {
      success: false,
      error: "Homework must contain 2 to 3 tasks.",
    };
  }

  if (
    normalizedTasks.some(
      (task) => task.length > 1000
    )
  ) {
    return {
      success: false,
      error:
        "Each homework task must be 1,000 characters or fewer.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (auth.role !== "tutor") {
    return {
      success: false,
      error: "Only tutors can create homework.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("sessions")
    .select("id, student_id, status")
    .eq("id", normalizedSessionId)
    .eq("tutor_id", auth.userId)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: "Session could not be found.",
    };
  }

  if (
    session.status !== "completed" &&
    session.status !== "ai_reviewed"
  ) {
    return {
      success: false,
      error:
        "Homework can only be created for completed or AI-reviewed sessions.",
    };
  }

  const {
    data: existingHomework,
    error: existingHomeworkError,
  } = await supabase
    .from("homework")
    .select("id")
    .eq("session_id", session.id);

  if (existingHomeworkError) {
    console.error(
      "Failed to check existing homework:",
      existingHomeworkError
    );

    return {
      success: false,
      error: "Unable to check existing homework.",
    };
  }

  /*
   * Keep the batch operation idempotent. If homework already exists
   * for this session, return the existing rows instead of duplicating them.
   */
  if (
    existingHomework &&
    existingHomework.length > 0
  ) {
    return {
      success: true,
      homeworkIds: existingHomework.map(
        (item) => item.id
      ),
    };
  }

  const {
    data: homework,
    error: homeworkError,
  } = await supabase
    .from("homework")
    .insert(
      normalizedTasks.map((task) => ({
        student_id: session.student_id,
        session_id: session.id,
        task,
        completed: false,
      }))
    )
    .select("id");

  if (homeworkError || !homework) {
    console.error(
      "Failed to create homework batch:",
      homeworkError
    );

    return {
      success: false,
      error:
        homeworkError?.message ??
        "Failed to create homework.",
    };
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  revalidatePath(
    `/tutor/student/${session.student_id}`
  );

  return {
    success: true,
    homeworkIds: homework.map(
      (item) => item.id
    ),
  };
}

/**
 * Form-action wrapper for createHomeworkBatch().
 */
export async function createHomeworkBatchAction(
  formData: FormData
): Promise<void> {
  const sessionId = String(
    formData.get("sessionId") ?? ""
  );

  const tasks = formData
    .getAll("task")
    .map((value) => String(value));

  await createHomeworkBatch(sessionId, tasks);
}

export type GetHomeworkForSessionResult =
  | {
      success: true;
      homework: HomeworkRecord[];
    }
  | {
      success: false;
      error: string;
    };

/**
 * Load homework for a session.
 *
 * Tutors can load homework for their own sessions.
 * Students can load homework for their own student record.
 */
export async function getHomeworkForSession(
  sessionId: string
): Promise<GetHomeworkForSessionResult> {
  const normalizedSessionId = sessionId.trim();

  if (!normalizedSessionId) {
    return {
      success: false,
      error: "Session ID is required.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  if (auth.role === "tutor") {
    const {
      data: session,
      error: sessionError,
    } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", normalizedSessionId)
      .eq("tutor_id", auth.userId)
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        error: "Session could not be found.",
      };
    }

    const {
      data: homework,
      error: homeworkError,
    } = await supabase
      .from("homework")
      .select(
        "id, student_id, session_id, task, completed, created_at"
      )
      .eq("session_id", session.id)
      .order("created_at", {
        ascending: true,
      });

    if (homeworkError) {
      console.error(
        "Failed to load homework:",
        homeworkError
      );

      return {
        success: false,
        error: "Failed to load homework.",
      };
    }

    return {
      success: true,
      homework:
        (homework ?? []) as HomeworkRecord[],
    };
  }

  if (auth.role === "student") {
    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", auth.userId)
      .single();

    if (studentError || !student) {
      return {
        success: false,
        error: "Student profile could not be found.",
      };
    }

    const {
      data: homework,
      error: homeworkError,
    } = await supabase
      .from("homework")
      .select(
        "id, student_id, session_id, task, completed, created_at"
      )
      .eq("session_id", normalizedSessionId)
      .eq("student_id", student.id)
      .order("created_at", {
        ascending: true,
      });

    if (homeworkError) {
      console.error(
        "Failed to load homework:",
        homeworkError
      );

      return {
        success: false,
        error: "Failed to load homework.",
      };
    }

    return {
      success: true,
      homework:
        (homework ?? []) as HomeworkRecord[],
    };
  }

  return {
    success: false,
    error: "You are not authorized to view homework.",
  };
}

export type GetCurrentStudentHomeworkResult =
  | {
      success: true;
      homework: HomeworkRecord[];
    }
  | {
      success: false;
      error: string;
    };

/**
 * Load all homework for the currently signed-in student.
 */
export async function getCurrentStudentHomework(): Promise<GetCurrentStudentHomeworkResult> {
  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (auth.role !== "student") {
    return {
      success: false,
      error: "Only students can access their homework here.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", auth.userId)
    .single();

  if (studentError || !student) {
    return {
      success: false,
      error: "Student profile could not be found.",
    };
  }

  const {
    data: homework,
    error: homeworkError,
  } = await supabase
    .from("homework")
    .select(
      "id, student_id, session_id, task, completed, created_at"
    )
    .eq("student_id", student.id)
    .order("created_at", {
      ascending: false,
    });

  if (homeworkError) {
    console.error(
      "Failed to load student homework:",
      homeworkError
    );

    return {
      success: false,
      error: "Failed to load homework.",
    };
  }

  return {
    success: true,
    homework:
      (homework ?? []) as HomeworkRecord[],
  };
}

export type UpdateHomeworkCompletionResult =
  | {
      success: true;
      completed: boolean;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Students may change only the completed state.
 *
 * The database trigger protects student_id, session_id, task, and created_at
 * independently, so this action intentionally sends only { completed }.
 */
export async function updateHomeworkCompletion(
  homeworkId: string,
  completed: boolean
): Promise<UpdateHomeworkCompletionResult> {
  const normalizedHomeworkId =
    homeworkId.trim();

  if (!normalizedHomeworkId) {
    return {
      success: false,
      error: "Homework ID is required.",
    };
  }

  if (typeof completed !== "boolean") {
    return {
      success: false,
      error: "Invalid completion value.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (auth.role !== "student") {
    return {
      success: false,
      error:
        "Only students can update homework completion.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", auth.userId)
    .single();

  if (studentError || !student) {
    return {
      success: false,
      error: "Student profile could not be found.",
    };
  }

  const {
    data: homework,
    error: homeworkError,
  } = await supabase
    .from("homework")
    .update({
      completed,
    })
    .eq("id", normalizedHomeworkId)
    .eq("student_id", student.id)
    .select("completed")
    .single();

  if (homeworkError || !homework) {
    console.error(
      "Failed to update homework completion:",
      homeworkError
    );

    return {
      success: false,
      error: "Homework could not be updated.",
    };
  }

  revalidatePath("/student");
  revalidatePath("/tutor");

  return {
    success: true,
    completed: homework.completed,
  };
}

/**
 * Form-action wrapper for updateHomeworkCompletion().
 */
export async function updateHomeworkCompletionAction(
  formData: FormData
): Promise<void> {
  const homeworkId = String(
    formData.get("homeworkId") ?? ""
  );

  const completedValue = String(
    formData.get("completed") ?? ""
  ).toLowerCase();

  await updateHomeworkCompletion(
    homeworkId,
    completedValue === "true"
  );
}

export type DeleteHomeworkResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Tutors may delete homework belonging only to their own sessions.
 *
 * Authorization is checked with the authenticated Supabase client first.
 * The actual DELETE uses the service-role client so a missing/overly strict
 * DELETE RLS policy cannot block an already-authorized tutor operation.
 */
export async function deleteHomework(
  homeworkId: string
): Promise<DeleteHomeworkResult> {
  const normalizedHomeworkId = homeworkId.trim();

  if (!normalizedHomeworkId) {
    return {
      success: false,
      error: "Homework ID is required.",
    };
  }

  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  if (auth.role !== "tutor") {
    return {
      success: false,
      error: "Only tutors can delete homework.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  // Load the homework record first so we can establish ownership.
  const {
    data: homework,
    error: homeworkLookupError,
  } = await supabase
    .from("homework")
    .select("id, session_id, student_id")
    .eq("id", normalizedHomeworkId)
    .single();

  if (homeworkLookupError || !homework) {
    console.error(
      "Homework lookup failed:",
      homeworkLookupError
    );

    return {
      success: false,
      error: "Homework could not be found.",
    };
  }

  // Verify that the linked session belongs to the authenticated tutor.
  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("sessions")
    .select("id, student_id")
    .eq("id", homework.session_id)
    .eq("tutor_id", auth.userId)
    .single();

  if (sessionError || !session) {
    console.error(
      "Homework session authorization failed:",
      sessionError
    );

    return {
      success: false,
      error:
        "You are not authorized to delete this homework.",
    };
  }

  // Defensive ownership/integrity check.
  if (session.student_id !== homework.student_id) {
    return {
      success: false,
      error:
        "Homework is not linked to the selected student.",
    };
  }

  // Perform the mutation with the server-only service-role client.
  const admin = createAdminClient();

  if (!admin) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  const {
    data: deletedHomework,
    error: deleteError,
  } = await admin
    .from("homework")
    .delete()
    .eq("id", homework.id)
    .eq("session_id", session.id)
    .eq("student_id", session.student_id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    console.error(
      "Failed to delete homework:",
      deleteError
    );

    return {
      success: false,
      error: deleteError.message || "Failed to delete homework.",
    };
  }

  if (!deletedHomework) {
    console.error(
      "Homework deletion affected no rows:",
      normalizedHomeworkId
    );

    return {
      success: false,
      error: "Homework could not be deleted.",
    };
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  revalidatePath(
    `/tutor/student/${session.student_id}`
  );

  return {
    success: true,
  };
}

/**
 * Form-action wrapper for deleteHomework().
 */
export async function deleteHomeworkAction(
  formData: FormData
): Promise<void> {
  const homeworkId = String(
    formData.get("homeworkId") ?? ""
  );

  const result = await deleteHomework(homeworkId);

  // Server Actions used by <form action={...}> cannot conveniently return
  // a value to the current page. Throwing here makes an unexpected failure
  // visible in development instead of silently appearing successful.
  if (!result.success) {
    throw new Error(result.error);
  }
}