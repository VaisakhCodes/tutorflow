import {
  createClient,
  getAuthRole,
} from "@/lib/supabase/server";
import Link from "next/link";
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
  switch (status.toLowerCase()) {
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
  switch (status.toLowerCase()) {
    case "scheduled":
      return "ui-badge-warning";

    case "in_progress":
      return "ui-badge-info";

    case "completed":
      return "ui-badge-success";

    case "ai_reviewed":
      return "ui-badge-ai";

    case "cancelled":
      return "ui-badge-error";

    default:
      return "ui-badge bg-surface-muted text-text-secondary";
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
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="ui-surface-elevated w-full max-w-md border-l-4 border-l-error p-6 text-center">
          <h1 className="text-lg font-semibold text-error">
            Supabase is not configured
          </h1>

          <p className="mt-2 text-sm text-text-secondary">
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b-2 border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/tutor"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-text-primary"
            aria-label="TutorFlow tutor dashboard"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-sm font-bold text-primary-foreground">
              T
            </span>
            TutorFlow
          </Link>

          <form
            action="/auth/logout"
            method="POST"
          >
            <button
              type="submit"
              className="ui-button-ghost"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Back navigation */}
        <div className="mb-7">
          <Link
            href="/tutor"
            className="text-sm font-medium text-primary transition hover:text-primary-hover"
          >
            ← Back to Tutor Dashboard
          </Link>
        </div>

        {/* Page introduction */}
        <div className="mb-8">
          <span className="ui-badge-warning mb-3">
            Student Progress
          </span>

          <h1 className="font-serif text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            {student.name}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
            Track learning progress and previous tutoring sessions.
          </p>
        </div>

        {/* Student profile */}
        <section className="ui-card mb-10 overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold text-text-primary">
              Student Profile
            </h2>

            <p className="mt-1 text-sm text-text-secondary">
              Current learning profile and goals.
            </p>
          </div>

          <div className="grid gap-x-10 gap-y-7 px-6 py-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
                Subject
              </p>

              <p className="mt-1.5 text-sm font-medium text-text-primary">
                {student.subject}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
                Current level
              </p>

              <p className="mt-1.5 text-sm font-medium text-text-primary">
                {student.current_level}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
                Learning goals
              </p>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-secondary">
                {student.learning_goals}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
                Weak areas
              </p>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-secondary">
                {student.weak_areas}
              </p>
            </div>
          </div>
        </section>

        {/* AI progress summary */}
        <ProgressAISummary studentId={student.id} />

        {/* Session history */}
        <section className="mt-10">
          <div className="flex flex-col gap-3 border-b-2 border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                Session History
              </h2>

              <p className="mt-1 text-sm text-text-secondary">
                Sessions for this student in chronological order.
              </p>
            </div>

            <span className="text-sm text-text-secondary sm:shrink-0">
              {sessionRecords.length}{" "}
              {sessionRecords.length === 1
                ? "session"
                : "sessions"}
            </span>
          </div>

          {sessionsError ? (
            <div className="py-6">
              <div
                role="alert"
                className="rounded-[var(--radius-sm)] border border-error-border bg-error-background p-4 text-sm text-error"
              >
                Failed to load session history. Please try again.
              </div>
            </div>
          ) : sessionRecords.length > 0 ? (
            <div className="divide-y divide-border">
              {sessionRecords.map((session) => {
                const scheduledDate = new Date(
                  session.scheduled_at
                );

                return (
                  <article
                    key={session.id}
                    className="py-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-text-primary">
                          {session.topic}
                        </h3>

                        <p className="mt-1 text-sm text-text-secondary">
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
                        className={`${getStatusClasses(
                          session.status
                        )} shrink-0`}
                      >
                        {formatSessionStatus(
                          session.status
                        )}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="border-b border-border py-10">
              <h3 className="text-base font-semibold text-text-primary">
                No sessions yet
              </h3>

              <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
                Sessions for this student will appear here once scheduled.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
