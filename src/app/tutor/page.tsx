import { getAuthRole, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AddStudentForm from "./add-student-form";
import ScheduleSessionForm from "./schedule-session-form";
import SessionAIPlan from "./session-ai-plan";

type SessionStudent = {
  name: string;
  subject: string;
};

type SessionRecord = {
  id: string;
  scheduled_at: string;
  topic: string;
  status: string;
  student_id: string;
  students: SessionStudent | SessionStudent[] | null;
};

type AIPlanRecord = {
  id: string;
  session_id: string;
  objectives: unknown;
  lesson_outline: unknown;
  practice_questions: unknown;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string"
  );
}

export default async function TutorPage() {
  const auth = await getAuthRole();

  // Server-side authorization.
  if (!auth) {
    redirect("/login");
  }

  if (auth.role === "student") {
    redirect("/student");
  }

  if (auth.role !== "tutor") {
    redirect("/login");
  }

  const supabase = await createClient();

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-xl p-6 max-w-md text-center">
          <h1 className="text-lg font-semibold text-red-700">
            Supabase is not configured
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Please check the environment configuration.
          </p>
        </div>
      </div>
    );
  }

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(
      "id, name, subject, current_level, learning_goals, weak_areas, created_at"
    )
    .eq("tutor_id", auth.userId)
    .order("created_at", { ascending: false });

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("sessions")
    .select(
      `
        id,
        scheduled_at,
        topic,
        status,
        student_id,
        students (
          name,
          subject
        )
      `
    )
    .eq("tutor_id", auth.userId)
    .order("scheduled_at", { ascending: true });

  const sessions = (sessionsData ?? []) as SessionRecord[];

  const sessionIds = sessions.map((session) => session.id);

  let aiPlans: AIPlanRecord[] = [];

  if (sessionIds.length > 0) {
    const { data: aiPlansData, error: aiPlansError } = await supabase
      .from("ai_plans")
      .select(
        "id, session_id, objectives, lesson_outline, practice_questions"
      )
      .in("session_id", sessionIds);

    if (aiPlansError) {
      console.error("Failed to load AI plans:", aiPlansError);
    } else {
      aiPlans = (aiPlansData ?? []) as AIPlanRecord[];
    }
  }

  const aiPlanBySessionId = new Map(
    aiPlans.map((plan) => [
      plan.session_id,
      {
        id: plan.id,
        objectives: normalizeStringArray(plan.objectives),
        lesson_outline: normalizeStringArray(plan.lesson_outline),
        practice_questions: normalizeStringArray(
          plan.practice_questions
        ),
      },
    ])
  );

  const scheduleStudents =
    students?.map((student) => ({
      id: student.id,
      name: student.name,
      subject: student.subject,
    })) ?? [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600">
            TutorFlow
          </span>

          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md cursor-pointer transition"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-4">
            Server-Side Authorization Passed
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Tutor Dashboard
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your students, sessions, and learning profiles.
          </p>
        </div>

        <AddStudentForm />

        <ScheduleSessionForm students={scheduleStudents} />

        {/* Sessions */}
        <section className="mb-8 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Sessions
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Your scheduled and active tutoring sessions.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {sessions.length}{" "}
              {sessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>

          {sessionsError ? (
            <div className="p-6">
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                Failed to load sessions. Please try again.
              </div>
            </div>
          ) : sessions.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {sessions.map((session) => {
                const sessionStudent = Array.isArray(session.students)
                  ? session.students[0] ?? null
                  : session.students;

                const scheduledDate = new Date(
                  session.scheduled_at
                );

                const aiPlan = aiPlanBySessionId.get(session.id);

                return (
                  <div
                    key={session.id}
                    className="px-6 py-5 hover:bg-slate-50 transition"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {sessionStudent?.name ?? "Unknown student"}
                          </h3>

                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                            {sessionStudent?.subject ??
                              "Unknown subject"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-medium text-slate-800">
                          {session.topic}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {scheduledDate.toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          session.status === "scheduled"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : session.status === "in_progress"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : session.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-violet-50 text-violet-700 border border-violet-100"
                        }`}
                      >
                        {session.status === "in_progress"
                          ? "In progress"
                          : session.status === "ai_reviewed"
                            ? "AI reviewed"
                            : session.status.charAt(0).toUpperCase() +
                              session.status.slice(1)}
                      </span>
                    </div>

                    <SessionAIPlan
                      sessionId={session.id}
                      plan={aiPlan ?? null}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center">
              <h3 className="text-base font-semibold text-slate-900">
                No sessions yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Scheduled sessions will appear here.
              </p>
            </div>
          )}
        </section>

        {/* Students */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Students
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Students assigned to your tutor account.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {students?.length ?? 0}{" "}
              {students?.length === 1 ? "student" : "students"}
            </span>
          </div>

          {studentsError ? (
            <div className="p-6">
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                Failed to load students. Please try again.
              </div>
            </div>
          ) : students && students.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="px-6 py-5 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-900">
                        {student.name}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                          {student.subject}
                        </span>

                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          {student.current_level}
                        </span>
                      </div>
                    </div>

                    <div className="text-right max-w-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Learning goals
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {student.learning_goals}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Weak areas
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {student.weak_areas}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <h3 className="text-base font-semibold text-slate-900">
                No students yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Student accounts and profiles will appear here once
                created.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}