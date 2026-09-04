import { createClient, getAuthRole } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type StudentRecord = {
  id: string;
  profile_id: string;
  name: string;
  subject: string;
  current_level: string;
  learning_goals: string;
  weak_areas: string;
};

type SessionRecord = {
  id: string;
  scheduled_at: string;
  topic: string;
  status: string;
};

type SessionNoteRecord = {
  session_id: string;
  notes: string;
};

type HomeworkRecord = {
  id: string;
  session_id: string;
  student_id: string;
  task: string;
  completed: boolean;
  created_at: string;
};

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusClasses(status: string): string {
  switch (status.toLowerCase()) {
    case "scheduled":
      return "ui-badge-warning";

    case "in_progress":
      return "ui-badge-info";

    case "completed":
    case "ai_reviewed":
      return "ui-badge-success";

    case "cancelled":
      return "ui-badge-error";

    default:
      return "ui-badge bg-surface-muted text-text-secondary";
  }
}

function getDisplayStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "in_progress":
      return "In progress";

    case "ai_reviewed":
      return "Completed";

    case "scheduled":
      return "Scheduled";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return status;
  }
}

export default async function StudentPage() {
  const auth = await getAuthRole();

  // Server-side authorization.
  if (!auth) {
    redirect("/login");
  }

  if (auth.role === "tutor") {
    redirect("/tutor");
  }

  if (auth.role !== "student") {
    redirect("/login");
  }

  /*
   * Student homework completion is handled by a server action.
   *
   * The action derives the student from the authenticated user instead
   * of trusting a student_id sent by the browser.
   */
  async function toggleHomeworkAction(formData: FormData) {
    "use server";

    const homeworkId = String(formData.get("homeworkId") ?? "");
    const completedValue = String(formData.get("completed") ?? "");

    if (!homeworkId) {
      return;
    }

    const completed = completedValue === "true";

    const actionAuth = await getAuthRole();

    if (!actionAuth || actionAuth.role !== "student") {
      return;
    }

    const actionSupabase = await createClient();

    if (!actionSupabase) {
      return;
    }

    const { data: actionStudent, error: actionStudentError } =
      await actionSupabase
        .from("students")
        .select("id")
        .eq("profile_id", actionAuth.userId)
        .single<{ id: string }>();

    if (actionStudentError || !actionStudent) {
      return;
    }

    /*
     * Scope the update to the authenticated student's own homework.
     * The browser cannot use this action to modify another student's task.
     */
    const { error: updateError } = await actionSupabase
      .from("homework")
      .update({
        completed,
      })
      .eq("id", homeworkId)
      .eq("student_id", actionStudent.id);

    if (updateError) {
      return;
    }

    revalidatePath("/student");
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
   * students.profile_id is linked to the authenticated Supabase user.
   */
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      "id, profile_id, name, subject, current_level, learning_goals, weak_areas"
    )
    .eq("profile_id", auth.userId)
    .single<StudentRecord>();

  if (studentError || !student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="ui-surface-elevated w-full max-w-md border-l-4 border-l-error p-6 text-center">
          <h1 className="text-lg font-semibold text-error">
            Student profile not found
          </h1>

          <p className="mt-2 text-sm text-text-secondary">
            Your student profile could not be loaded. Please contact your
            tutor.
          </p>
        </div>
      </div>
    );
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, scheduled_at, topic, status")
    .eq("student_id", student.id)
    .order("scheduled_at", { ascending: true })
    .returns<SessionRecord[]>();

  const sessionRecords = sessions ?? [];

  const sessionIds = sessionRecords.map((session) => session.id);

  let notes: SessionNoteRecord[] = [];
  let homework: HomeworkRecord[] = [];

  if (sessionIds.length > 0) {
    const [{ data: notesData }, { data: homeworkData }] =
      await Promise.all([
        supabase
          .from("session_notes")
          .select("session_id, notes")
          .in("session_id", sessionIds)
          .returns<SessionNoteRecord[]>(),

        supabase
          .from("homework")
          .select(
            "id, session_id, student_id, task, completed, created_at"
          )
          .eq("student_id", student.id)
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false })
          .returns<HomeworkRecord[]>(),
      ]);

    notes = notesData ?? [];
    homework = homeworkData ?? [];
  }

  const upcomingSessions = sessionRecords
    .filter((session) => session.status.toLowerCase() === "scheduled")
    .slice(0, 5);

  const completedSessions = sessionRecords
    .filter((session) => {
      const status = session.status.toLowerCase();

      return status === "completed" || status === "ai_reviewed";
    })
    .sort((a, b) => {
      return b.scheduled_at.localeCompare(a.scheduled_at);
    })
    .slice(0, 5);

  const notesBySessionId = new Map(
    notes.map((note) => [note.session_id, note])
  );

  const sessionById = new Map(
    sessionRecords.map((session) => [session.id, session])
  );

  const completedHomeworkCount = homework.filter(
    (item) => item.completed
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b-2 border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-text-primary">
            <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-sm font-bold text-primary-foreground">
              T
            </span>
            TutorFlow
          </span>

          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="ui-button-ghost"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        {/* Page introduction */}
        <div className="mb-8">
          <span className="ui-badge-warning mb-3">
            Student Dashboard
          </span>

          <h1 className="font-serif text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Welcome, {student.name}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
            View your learning profile, tutoring sessions, and progress.
          </p>
        </div>

        {sessionsError && (
          <div className="mb-8 rounded-[var(--radius-sm)] border border-error-border bg-error-background p-4 text-sm text-error">
            Your session history could not be loaded completely. Please try
            again later.
          </div>
        )}

        {/* Learning Profile */}
        <section className="ui-card mb-10 overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold text-text-primary">
              My Learning Profile
            </h2>

            <p className="mt-1 text-sm text-text-secondary">
              Your current learning profile and goals.
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
                Areas to improve
              </p>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-secondary">
                {student.weak_areas}
              </p>
            </div>
          </div>
        </section>

        {/* Upcoming Sessions */}
        <section className="mb-10">
          <div className="flex items-end justify-between gap-4 border-b-2 border-border pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                Upcoming Sessions
              </h2>

              <p className="mt-1 text-sm text-text-secondary">
                Your next scheduled tutoring sessions.
              </p>
            </div>

            <span className="shrink-0 text-sm text-text-secondary">
              {upcomingSessions.length}{" "}
              {upcomingSessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>

          {upcomingSessions.length > 0 ? (
            <div className="divide-y divide-border">
              {upcomingSessions.map((session) => (
                <article
                  key={session.id}
                  className="py-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">
                        {session.topic}
                      </h3>

                      <p className="mt-1 text-sm text-text-secondary">
                        {formatSessionDate(session.scheduled_at)}
                      </p>
                    </div>

                    <span className={getStatusClasses(session.status)}>
                      {getDisplayStatus(session.status)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border-b border-border py-8">
              <h3 className="text-base font-semibold text-text-primary">
                No upcoming sessions
              </h3>

              <p className="mt-1.5 text-sm leading-6 text-text-secondary">
                Your next tutoring session will appear here once it is
                scheduled.
              </p>
            </div>
          )}
        </section>

        {/* Recent Sessions */}
        <section className="mb-10">
          <div className="flex items-end justify-between gap-4 border-b-2 border-border pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                Recent Sessions
              </h2>

              <p className="mt-1 text-sm text-text-secondary">
                Notes from your completed tutoring sessions.
              </p>
            </div>

            <span className="shrink-0 text-sm text-text-secondary">
              {completedSessions.length}{" "}
              {completedSessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>

          {completedSessions.length > 0 ? (
            <div className="divide-y divide-border">
              {completedSessions.map((session) => {
                const note = notesBySessionId.get(session.id);

                return (
                  <article
                    key={session.id}
                    className="py-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-text-primary">
                          {session.topic}
                        </h3>

                        <p className="mt-1 text-sm text-text-secondary">
                          {formatSessionDate(session.scheduled_at)}
                        </p>
                      </div>

                      <span className={getStatusClasses(session.status)}>
                        {getDisplayStatus(session.status)}
                      </span>
                    </div>

                    <div className="mt-4 border-l-2 border-border pl-4">
                      <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
                        Session notes
                      </p>

                      {note?.notes ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                          {note.notes}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-text-muted">
                          No session notes were recorded.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="border-b border-border py-8">
              <h3 className="text-base font-semibold text-text-primary">
                No previous sessions
              </h3>

              <p className="mt-1.5 text-sm leading-6 text-text-secondary">
                Notes from completed tutoring sessions will appear here.
              </p>
            </div>
          )}
        </section>

        {/* Homework */}
        <section>
          <div className="flex flex-col gap-3 border-b-2 border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                Homework
              </h2>

              <p className="mt-1 text-sm text-text-secondary">
                Homework assigned by your tutor.
              </p>
            </div>

            <span className="text-sm text-text-secondary">
              {completedHomeworkCount}/{homework.length} completed
            </span>
          </div>

          {homework.length > 0 ? (
            <div className="divide-y divide-border">
              {homework.map((item) => {
                const session = sessionById.get(item.session_id);

                return (
                  <article
                    key={item.id}
                    className="py-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`whitespace-pre-wrap text-sm leading-6 ${
                            item.completed
                              ? "text-text-muted line-through"
                              : "text-text-primary"
                          }`}
                        >
                          {item.task}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span
                            className={
                              item.completed
                                ? "ui-badge-success"
                                : "ui-badge-warning"
                            }
                          >
                            {item.completed ? "Completed" : "Pending"}
                          </span>

                          {session && (
                            <span className="text-xs text-text-muted">
                              Session: {session.topic}
                            </span>
                          )}
                        </div>
                      </div>

                      <form
                        action={toggleHomeworkAction}
                        className="shrink-0"
                      >
                        <input
                          type="hidden"
                          name="homeworkId"
                          value={item.id}
                        />

                        <input
                          type="hidden"
                          name="completed"
                          value={String(!item.completed)}
                        />

                        <button
                          type="submit"
                          className="ui-button-secondary"
                        >
                          {item.completed
                            ? "Mark as pending"
                            : "Mark as completed"}
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="py-8">
              <h3 className="text-base font-semibold text-text-primary">
                No homework assigned
              </h3>

              <p className="mt-1.5 text-sm leading-6 text-text-secondary">
                Homework assigned by your tutor will appear here.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
