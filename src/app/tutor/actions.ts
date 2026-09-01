"use server";

import { getAuthRole } from "@/lib/supabase/server";
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
  const { error: profileError } = await admin.from("profiles").insert({
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
      error: studentError?.message ?? "Failed to create student record.",
    };
  }

  return {
    success: true,
    studentId: student.id,
  };
}