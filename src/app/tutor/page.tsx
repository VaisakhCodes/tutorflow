import {
  getAuthRole,
  createClient,
} from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import AddStudentForm from "./add-student-form";
import ScheduleSessionForm from "./schedule-session-form";
import SessionAIPlan from "./session-ai-plan";
import SessionNotes from "./session-notes";
import SessionAIReview from "./session-ai-review";

import {
  createHomeworkAction,
  deleteHomeworkAction,
  updateSessionStatusAction,
} from "./actions";

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
  students:
    | SessionStudent
    | SessionStudent[]
    | null;
};

type AIPlanRecord = {
  id: string;
  session_id: string;
  objectives: unknown;
  lesson_outline: unknown;
  practice_questions: unknown;
};

type SessionNotesRecord = {
  id: string;
  session_id: string;
  notes: string;
};

type SessionAIReviewRecord = {
  id: string;
  session_id: string;
  summary: string;
  next_session_suggestion: string;
};

type HomeworkRecord = {
  id: string;
  student_id: string;
  session_id: string;
  task: string;
  completed: boolean;
  created_at: string;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

function getSessionStatusLabel(status: string): string {
  switch (status) {
    case "in_progress":
      return "In progress";

    case "ai_reviewed":
      return "AI reviewed";

    case "scheduled":
      return "Scheduled";

    case "completed":
      return "Completed";

    default:
      return (
        status.charAt(0).toUpperCase() +
        status.slice(1)
      );
  }
}

function getSessionStatusClasses(status: string): string {
  switch (status) {
    case "scheduled":
      return "ui-badge-warning";

    case "in_progress":
      return "ui-badge-info";

    case "completed":
      return "ui-badge-success";

    case "ai_reviewed":
      return "ui-badge-ai";

    default:
      return "ui-badge bg-surface-muted text-text-secondary";
  }
}

function getHomeworkStatusClasses(
  completed: boolean
): string {
  return completed
    ? "ui-badge-success"
    : "ui-badge-warning";
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
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="w-full max-w-md rounded-lg border border-error-border bg-surface p-6 text-center">
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

  const {
    data: students,
    error: studentsError,
  } = await supabase
    .from("students")
    .select(
      "id, name, subject, current_level, learning_goals, weak_areas, created_at"
    )
    .eq("tutor_id", auth.userId)
    .order("created_at", {
      ascending: false,
    });

  const {
    data: sessionsData,
    error: sessionsError,
  } = await supabase
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
    .order("scheduled_at", {
      ascending: true,
    });

  const sessions =
    (sessionsData ?? []) as SessionRecord[];

  const sessionIds = sessions.map(
    (session) => session.id
  );

  let aiPlans: AIPlanRecord[] = [];

  if (sessionIds.length > 0) {
    const {
      data: aiPlansData,
      error: aiPlansError,
    } = await supabase
      .from("ai_plans")
      .select(
        "id, session_id, objectives, lesson_outline, practice_questions"
      )
      .in("session_id", sessionIds);

    if (aiPlansError) {
      console.error(
        "Failed to load AI plans:",
        aiPlansError
      );
    } else {
      aiPlans =
        (aiPlansData ?? []) as AIPlanRecord[];
    }
  }

  const aiPlanBySessionId = new Map(
    aiPlans.map((plan) => [
      plan.session_id,
      {
        id: plan.id,
        objectives: normalizeStringArray(
          plan.objectives
        ),
        lesson_outline: normalizeStringArray(
          plan.lesson_outline
        ),
        practice_questions: normalizeStringArray(
          plan.practice_questions
        ),
      },
    ])
  );

  let sessionNotes: SessionNotesRecord[] = [];

  if (sessionIds.length > 0) {
    const {
      data: sessionNotesData,
      error: sessionNotesError,
    } = await supabase
      .from("session_notes")
      .select("id, session_id, notes")
      .in("session_id", sessionIds);

    if (sessionNotesError) {
      console.error(
        "Failed to load session notes:",
        sessionNotesError
      );
    } else {
      sessionNotes =
        (sessionNotesData ??
          []) as SessionNotesRecord[];
    }
  }

  const sessionNotesBySessionId = new Map(
    sessionNotes.map((note) => [
      note.session_id,
      note.notes,
    ])
  );

  let sessionReviews:
    SessionAIReviewRecord[] = [];

  if (sessionIds.length > 0) {
    const {
      data: sessionReviewsData,
      error: sessionReviewsError,
    } = await supabase
      .from("ai_reviews")
      .select(
        "id, session_id, summary, next_session_suggestion"
      )
      .in("session_id", sessionIds);

    if (sessionReviewsError) {
      console.error(
        "Failed to load AI session reviews:",
        sessionReviewsError
      );
    } else {
      sessionReviews =
        (sessionReviewsData ??
          []) as SessionAIReviewRecord[];
    }
  }

  const sessionReviewsBySessionId = new Map(
    sessionReviews.map((review) => [
      review.session_id,
      {
        id: review.id,
        summary: review.summary,
        next_session_suggestion:
          review.next_session_suggestion,
      },
    ])
  );

  let homework: HomeworkRecord[] = [];

  if (sessionIds.length > 0) {
    const {
      data: homeworkData,
      error: homeworkError,
    } = await supabase
      .from("homework")
      .select(
        "id, student_id, session_id, task, completed, created_at"
      )
      .in("session_id", sessionIds)
      .order("created_at", {
        ascending: true,
      });

    if (homeworkError) {
      console.error(
        "Failed to load homework:",
        homeworkError
      );
    } else {
      homework =
        (homeworkData ?? []) as HomeworkRecord[];
    }
  }

  const homeworkBySessionId = new Map<
    string,
    HomeworkRecord[]
  >();

  for (const homeworkItem of homework) {
    const items =
      homeworkBySessionId.get(
        homeworkItem.session_id
      ) ?? [];

    items.push(homeworkItem);

    homeworkBySessionId.set(
      homeworkItem.session_id,
      items
    );
  }

  const scheduleStudents =
    students?.map((student) => ({
      id: student.id,
      name: student.name,
      subject: student.subject,
    })) ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-xl font-bold tracking-tight text-primary">
            TutorFlow
          </span>

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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        {/* Page introduction */}
        <div className="mb-8">
          <div className="mb-3">
            <span className="ui-badge-success">
              Authorized
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Tutor Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
            Manage your students, sessions, and
            learning profiles.
          </p>
        </div>

        {/* Primary workflows */}
        <div className="space-y-8">
          <AddStudentForm />

          <ScheduleSessionForm
            students={scheduleStudents}
          />
        </div>

        {/* Sessions */}
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                Sessions
              </h2>

              <p className="mt-1 text-sm text-text-secondary">
                Your scheduled and active tutoring
                sessions.
              </p>
            </div>

            <span className="shrink-0 text-sm text-text-secondary">
              {sessions.length}{" "}
              {sessions.length === 1
                ? "session"
                : "sessions"}
            </span>
          </div>

          {sessionsError ? (
            <div className="py-6">
              <div
                role="alert"
                className="rounded-md border border-error-border bg-error-background p-4 text-sm text-error"
              >
                Failed to load sessions. Please try
                again.
              </div>
            </div>
          ) : sessions.length > 0 ? (
            <div className="divide-y divide-border">
              {sessions.map((session) => {
                const sessionStudent =
                  Array.isArray(session.students)
                    ? session.students[0] ?? null
                    : session.students;

                const scheduledDate =
                  new Date(
                    session.scheduled_at
                  );

                const aiPlan =
                  aiPlanBySessionId.get(
                    session.id
                  );

                const notes =
                  sessionNotesBySessionId.get(
                    session.id
                  ) ?? "";

                const review =
                  sessionReviewsBySessionId.get(
                    session.id
                  ) ?? null;

                const sessionHomework =
                  homeworkBySessionId.get(
                    session.id
                  ) ?? [];

                const canManageHomework =
                  session.status === "completed" ||
                  session.status === "ai_reviewed";

                const canStart =
                  session.status === "scheduled";

                const canComplete =
                  session.status === "in_progress";

                const nextStatus = canStart
                  ? "in_progress"
                  : canComplete
                    ? "completed"
                    : null;

                return (
                  <article
                    key={session.id}
                    className="py-6"
                  >
                    {/* Session summary */}
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-text-primary">
                            {sessionStudent?.name ??
                              "Unknown student"}
                          </h3>

                          <span className="ui-badge-info">
                            {sessionStudent?.subject ??
                              "Unknown subject"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-medium text-text-primary">
                          {session.topic}
                        </p>

                        <p className="mt-1 text-sm text-text-secondary">
                          {scheduledDate.toLocaleString(
                            [],
                            {
                              dateStyle:
                                "medium",
                              timeStyle:
                                "short",
                            }
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                        <span
                          className={getSessionStatusClasses(
                            session.status
                          )}
                        >
                          {getSessionStatusLabel(
                            session.status
                          )}
                        </span>

                        {nextStatus ? (
                          <form
                            action={
                              updateSessionStatusAction
                            }
                          >
                            <input
                              type="hidden"
                              name="sessionId"
                              value={session.id}
                            />

                            <input
                              type="hidden"
                              name="nextStatus"
                              value={nextStatus}
                            />

                            <button
                              type="submit"
                              className="ui-button-primary"
                            >
                              {canStart
                                ? "Start Session"
                                : "Complete Session"}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>

                    {/* Session workflow */}
                    <div className="mt-7">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                            Session workflow
                          </p>

                          <p className="mt-1 text-sm text-text-secondary">
                            Plan, record, review, then assign follow-up work.
                          </p>
                        </div>

                        <span className="shrink-0 text-xs text-text-muted">
                          4 stages
                        </span>
                      </div>

                      <div className="border-l border-border pl-4 sm:pl-6">
                        {/* Stage 1 — AI plan */}
                        <div className="relative">
                          <span className="absolute -left-[25px] top-6 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-semibold text-text-secondary sm:-left-[31px]">
                            1
                          </span>

                          <SessionAIPlan
                            sessionId={session.id}
                            plan={aiPlan ?? null}
                          />
                        </div>

                        {/* Stage 2 — Notes */}
                        <div className="relative">
                          <span className="absolute -left-[25px] top-6 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-semibold text-text-secondary sm:-left-[31px]">
                            2
                          </span>

                          <SessionNotes
                            sessionId={session.id}
                            initialNotes={notes}
                          />
                        </div>

                        {/* Stage 3 — AI review */}
                        <div className="relative">
                          <span className="absolute -left-[25px] top-6 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-semibold text-text-secondary sm:-left-[31px]">
                            3
                          </span>

                          <SessionAIReview
                            sessionId={session.id}
                            hasNotes={
                              notes.trim().length > 0
                            }
                            review={review}
                          />
                        </div>

                        {/* Stage 4 — Homework */}
                        <div className="relative">
                          <span className="absolute -left-[25px] top-6 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-semibold text-text-secondary sm:-left-[31px]">
                            4
                          </span>

                          <section className="mt-5 border-t border-border pt-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h4 className="text-base font-semibold text-text-primary">
                                  Homework
                                </h4>

                                <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
                                  Assign practice for this
                                  completed session and
                                  track student completion.
                                </p>
                              </div>

                              <span className="shrink-0 text-sm text-text-secondary">
                                {sessionHomework.length}{" "}
                                {sessionHomework.length ===
                                1
                                  ? "task"
                                  : "tasks"}
                              </span>
                            </div>

                            {sessionHomework.length > 0 ? (
                              <div className="mt-4 divide-y divide-border border-y border-border">
                                {sessionHomework.map(
                                  (homeworkItem) => (
                                    <div
                                      key={
                                        homeworkItem.id
                                      }
                                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                                    >
                                      <div className="min-w-0">
                                        <p
                                          className={`text-sm leading-6 ${
                                            homeworkItem.completed
                                              ? "text-text-muted line-through"
                                              : "text-text-primary"
                                          }`}
                                        >
                                          {
                                            homeworkItem.task
                                          }
                                        </p>

                                        <span
                                          className={`${getHomeworkStatusClasses(
                                            homeworkItem.completed
                                          )} mt-2`}
                                        >
                                          {homeworkItem.completed
                                            ? "Completed by student"
                                            : "Pending"}
                                        </span>
                                      </div>

                                      <form
                                        action={
                                          deleteHomeworkAction
                                        }
                                      >
                                        <input
                                          type="hidden"
                                          name="homeworkId"
                                          value={
                                            homeworkItem.id
                                          }
                                        />

                                        <button
                                          type="submit"
                                          className="ui-button-danger"
                                        >
                                          Delete
                                        </button>
                                      </form>
                                    </div>
                                  )
                                )}
                              </div>
                            ) : (
                              <div className="mt-4 rounded-md border border-dashed border-border-strong bg-surface-muted p-4 text-sm text-text-secondary">
                                No homework has been assigned
                                for this session yet.
                              </div>
                            )}

                            {canManageHomework ? (
                              <form
                                action={
                                  createHomeworkAction
                                }
                                className="mt-4 border-t border-border pt-4"
                              >
                                <input
                                  type="hidden"
                                  name="sessionId"
                                  value={session.id}
                                />

                                <label
                                  htmlFor={`homework-${session.id}`}
                                  className="block text-sm font-medium text-text-primary"
                                >
                                  Add homework task
                                </label>

                                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                                  <textarea
                                    id={`homework-${session.id}`}
                                    name="task"
                                    required
                                    maxLength={1000}
                                    rows={3}
                                    placeholder="e.g. Complete 10 practice questions on today's topic."
                                    className="ui-control min-h-24 resize-y"
                                  />

                                  <button
                                    type="submit"
                                    className="ui-button-secondary self-start sm:shrink-0"
                                  >
                                    Add homework
                                  </button>
                                </div>

                                <p className="mt-2 text-xs text-text-muted">
                                  Up to 1,000 characters.
                                </p>
                              </form>
                            ) : (
                              <div className="mt-4 rounded-md border border-warning-border bg-warning-background p-4 text-sm text-warning">
                                Homework can be assigned
                                after the session is completed
                                or AI-reviewed.
                              </div>
                            )}
                          </section>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="py-10">
              <h3 className="text-base font-semibold text-text-primary">
                No sessions yet
              </h3>

              <p className="mt-2 text-sm text-text-secondary">
                Scheduled sessions will appear here.
              </p>
            </div>
          )}
        </section>

        {/* Students */}
        <section className="mt-12 border-t border-border pt-8">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                Students
              </h2>

              <p className="mt-1 text-sm text-text-secondary">
                Students assigned to your tutor account.
              </p>
            </div>

            <span className="shrink-0 text-sm text-text-secondary">
              {students?.length ?? 0}{" "}
              {students?.length === 1
                ? "student"
                : "students"}
            </span>
          </div>

          {studentsError ? (
            <div className="py-6">
              <div
                role="alert"
                className="rounded-md border border-error-border bg-error-background p-4 text-sm text-error"
              >
                Failed to load students. Please try
                again.
              </div>
            </div>
          ) : students &&
            students.length > 0 ? (
            <div className="divide-y divide-border">
              {students.map((student) => (
                <article
                  key={student.id}
                  className="py-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-text-primary">
                        {student.name}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="ui-badge-info">
                          {student.subject}
                        </span>

                        <span className="ui-badge bg-surface-muted text-text-secondary">
                          {student.current_level}
                        </span>
                      </div>

                      <div className="mt-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                          Weak areas
                        </p>

                        <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
                          {student.weak_areas}
                        </p>
                      </div>
                    </div>

                    <div className="max-w-xl lg:text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        Learning goals
                      </p>

                      <p className="mt-1 text-sm leading-6 text-text-secondary">
                        {student.learning_goals}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-10">
              <h3 className="text-base font-semibold text-text-primary">
                No students yet
              </h3>

              <p className="mt-2 text-sm text-text-secondary">
                Student accounts and profiles will appear
                here once created.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}