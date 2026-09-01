"use server";

import {
  createClient,
  getAuthRole,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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