"use server";

import {
  createClient,
  getAuthRole,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSessionPlan } from "@/lib/ai/gemini";

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

  // Basic server-side validation.
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

  // Create the Auth account using the privileged server client.
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message ?? "Failed to create student account.",
    };
  }

  const studentUserId = authData.user.id;

  // Create the student's profile.
  const { error: profileError } = await admin
    .from("profiles")
    .insert({
      id: studentUserId,
      role: "student",
    });

  if (profileError) {
    // Remove the Auth user because the database setup failed.
    await admin.auth.admin.deleteUser(studentUserId);

    return {
      success: false,
      error: profileError.message,
    };
  }

  // Create the application-level student record.
  const { data: student, error: studentError } = await admin
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
    // Deleting the Auth user cascades to profiles because of the FK.
    await admin.auth.admin.deleteUser(studentUserId);

    return {
      success: false,
      error:
        studentError?.message ?? "Failed to create student record.",
    };
  }

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

  // Basic validation.
  if (!studentId || !scheduledAt || !topic) {
    return {
      success: false,
      error: "Student, date and time, and topic are required.",
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
      error: "A session must be scheduled for a future date and time.",
    };
  }

  // Verify authentication and tutor role.
  const auth = await getAuthRole();

  if (!auth) {
    return {
      success: false,
      error: "You must be signed in to schedule a session.",
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

  // Verify that the selected student belongs to this tutor.
  const { data: student, error: studentError } = await supabase
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

  // Create the session with its initial lifecycle state.
  const { data: session, error: sessionError } = await supabase
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
    // PostgreSQL unique-constraint violation.
    if (sessionError?.code === "23505") {
      return {
        success: false,
        error: "You already have a session scheduled at this time.",
      };
    }

    return {
      success: false,
      error:
        sessionError?.message ?? "Failed to schedule the session.",
    };
  }

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

  // Verify authentication and tutor role.
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
      error: "Only tutors can generate session plans.",
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      success: false,
      error: "Server configuration is incomplete.",
    };
  }

  // Fetch only a session belonging to the authenticated tutor.
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, student_id, topic, scheduled_at")
    .eq("id", normalizedSessionId)
    .eq("tutor_id", auth.userId)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: "Session could not be found.",
    };
  }

  // Prevent generating multiple plans for the same session.
  const { data: existingPlan, error: existingPlanError } =
    await supabase
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
      error: "Unable to check the existing session plan.",
    };
  }

  if (existingPlan) {
    return {
      success: true,
      planId: existingPlan.id,
    };
  }

  // Fetch the student's profile/application data.
  const { data: student, error: studentError } = await supabase
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

  // Fetch previous sessions to give Gemini learning-history context.
  const { data: pastSessions, error: pastSessionsError } =
    await supabase
      .from("sessions")
      .select("scheduled_at, topic, status")
      .eq("student_id", student.id)
      .eq("tutor_id", auth.userId)
      .neq("id", session.id)
      .order("scheduled_at", { ascending: false })
      .limit(10);

  if (pastSessionsError) {
    console.error(
      "Failed to load previous sessions:",
      pastSessionsError
    );

    return {
      success: false,
      error: "Unable to load the student's previous sessions.",
    };
  }

  let plan;

  try {
    plan = await generateSessionPlan({
      studentName: student.name,
      subject: student.subject,
      currentLevel: student.current_level,
      learningGoals: student.learning_goals,
      weakAreas: student.weak_areas,
      topic: session.topic,
      pastSessions: (pastSessions ?? []).map((pastSession) => ({
        scheduled_at: pastSession.scheduled_at,
        topic: pastSession.topic,
        status: pastSession.status,
      })),
    });
  } catch (error) {
    console.error("AI session-plan generation failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate the AI session plan.",
    };
  }

  // Save the structured AI result.
  const { data: aiPlan, error: aiPlanError } = await supabase
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
    console.error("Failed to save AI plan:", aiPlanError);

    return {
      success: false,
      error: "The AI plan was generated but could not be saved.",
    };
  }

  return {
    success: true,
    planId: aiPlan.id,
  };
}