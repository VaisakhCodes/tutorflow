"use server";

import { revalidatePath } from "next/cache";
import {
  createClient,
  getAuthRole,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateSessionPlan,
  generateSessionReview,
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
      error: "The selected student is not assigned to you.",
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

  return {
    success: true,
    sessionId: session.id,
  };
}

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

  const { data: session, error: sessionError } =
    await supabase
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

  const { data: student, error: studentError } =
    await supabase
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
    .select("scheduled_at, topic, status")
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
      learningGoals: student.learning_goals,
      weakAreas: student.weak_areas,
      topic: session.topic,
      pastSessions: (pastSessions ?? []).map(
        (pastSession) => ({
          scheduled_at: pastSession.scheduled_at,
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
      lesson_outline: plan.lesson_outline,
      practice_questions: plan.practice_questions,
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

  return {
    success: true,
    planId: aiPlan.id,
  };
}

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

  const { data: session, error: sessionError } =
    await supabase
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

  const notes = sessionNotes?.notes?.trim() ?? "";

  if (!notes) {
    return {
      success: false,
      error:
        "Add session notes before generating an AI review.",
    };
  }

  const { data: student, error: studentError } =
    await supabase
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

  let existingPlan: SessionPlan | null = null;

  if (
    aiPlanRecord &&
    Array.isArray(aiPlanRecord.objectives) &&
    Array.isArray(aiPlanRecord.lesson_outline) &&
    Array.isArray(aiPlanRecord.practice_questions)
  ) {
    const objectives = aiPlanRecord.objectives.filter(
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
        practice_questions: practiceQuestions,
      };
    }
  }

  const {
    data: pastSessions,
    error: pastSessionsError,
  } = await supabase
    .from("sessions")
    .select("scheduled_at, topic, status")
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
      currentLevel: student.current_level,
      learningGoals: student.learning_goals,
      weakAreas: student.weak_areas,
      topic: session.topic,
      sessionNotes: notes,
      scheduledAt: session.scheduled_at,
      pastSessions: (pastSessions ?? []).map(
        (pastSession) => ({
          scheduled_at: pastSession.scheduled_at,
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

  return {
    success: true,
    reviewId: aiReview.id,
  };
}