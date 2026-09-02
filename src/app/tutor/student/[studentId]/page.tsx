import {
  createClient,
  getAuthRole,
} from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProgressAISummary from "./progress-ai-summary";

type SessionRecord = {
  id: string;
  scheduled_at: string;
  topic: string;
  status: string;
};

type StudentProgressPageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

function formatSessionStatus(status: string): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "ai_reviewed":
      return "AI reviewed";
    case "cancelled":
      return "Cancelled";
    default:
      return (
        status.charAt(0).toUpperCase() +
        status.slice(1)
      );
  }
}

function getStatusClasses(status: string): string {
  switch (status) {
    case "scheduled":
      return "bg-amber-50 text-amber-700 border-amber-100";

    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-100";

    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";

    case "ai_reviewed":
      return "bg-violet-50 text-violet-700 border-violet-100";

    case "cancelled":
      return "bg-red-50 text-red-700 border-red-100";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default async function StudentProgressPage({
  params,
}: StudentProgressPageProps) {
  const { studentId } = await params;

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
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
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

  /*
   * Fetch the requested student while also verifying
   * that the student belongs to the authenticated tutor.
   */
  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select(
      "id, name, subject, current_level, learning_goals, weak_areas"
    )
    .eq("id", studentId)
    .eq("tutor_id", auth.userId)
    .single();

  /*
   * Do not reveal whether a student exists when the
   * student is not assigned to this tutor.
   */
  if (studentError || !student) {
    redirect("/tutor");
  }

  /*
   * Load all sessions for this student belonging to
   * the authenticated tutor, in chronological order.
   */
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
    });

  const sessionRecords =
    (sessions ?? []) as SessionRecord[];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-xl font-bold text-blue-600">
            TutorFlow
          </span>

          <form
            action="/auth/logout"
            method="POST"
          >
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-6">
          <a
            href="/tutor"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Tutor Dashboard
          </a>
        </div>

        <div className="mb-8">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Student Progress
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            {student.name}
          </h1>

          <p className="mt-2 text-slate-600">
            Track learning progress and previous tutoring
            sessions.
          </p>
        </div>

        {/* Student profile */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Student Profile
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current learning profile and goals.
            </p>
          </div>

          <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Subject
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {student.subject}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Current level
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {student.current_level}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Learning goals
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                {student.learning_goals}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Weak areas
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                {student.weak_areas}
              </p>
            </div>
          </div>
        </section>

        {/* AI progress summary */}
        <ProgressAISummary studentId={student.id} />

        {/* Session history */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Session History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Sessions for this student in chronological order.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {sessionRecords.length}{" "}
              {sessionRecords.length === 1
                ? "session"
                : "sessions"}
            </span>
          </div>

          {sessionsError ? (
            <div className="p-6">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Failed to load session history. Please try
                again.
              </div>
            </div>
          ) : sessionRecords.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {sessionRecords.map((session) => {
                const scheduledDate = new Date(
                  session.scheduled_at
                );

                return (
                  <div
                    key={session.id}
                    className="px-6 py-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-900">
                          {session.topic}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {scheduledDate.toLocaleString(
                            [],
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }
                          )}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          session.status
                        )}`}
                      >
                        {formatSessionStatus(
                          session.status
                        )}
                      </span>
                    </div>
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
                Sessions for this student will appear here once
                scheduled.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}