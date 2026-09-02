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

function normalizeStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

function getSessionStatusLabel(
  status: string
): string {
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

function getSessionStatusClasses(
  status: string
): string {
  switch (status) {
    case "scheduled":
      return "bg-amber-50 text-amber-700 border border-amber-100";

    case "in_progress":
      return "bg-blue-50 text-blue-700 border border-blue-100";

    case "completed":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";

    case "ai_reviewed":
      return "bg-violet-50 text-violet-700 border border-violet-100";

    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
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
        objectives:
          normalizeStringArray(
            plan.objectives
          ),
        lesson_outline:
          normalizeStringArray(
            plan.lesson_outline
          ),
        practice_questions:
          normalizeStringArray(
            plan.practice_questions
          ),
      },
    ])
  );

  let sessionNotes: SessionNotesRecord[] =
    [];

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

  const sessionNotesBySessionId =
    new Map(
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

  const sessionReviewsBySessionId =
    new Map(
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

  const homeworkBySessionId = new Map<string, HomeworkRecord[]>();

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600">
            TutorFlow
          </span>

          <form
            action="/auth/logout"
            method="POST"
          >
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

        <ScheduleSessionForm
          students={scheduleStudents}
        />

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
              {sessions.length === 1
                ? "session"
                : "sessions"}
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
                  session.status ===
                    "completed" ||
                  session.status ===
                    "ai_reviewed";

                const canStart =
                  session.status ===
                  "scheduled";

                const canComplete =
                  session.status ===
                  "in_progress";

                const nextStatus =
                  canStart
                    ? "in_progress"
                    : canComplete
                      ? "completed"
                      : null;

                return (
                  <div
                    key={session.id}
                    className="px-6 py-5 hover:bg-slate-50 transition"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {sessionStudent?.name ??
                              "Unknown student"}
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

                      <span
                        className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionStatusClasses(
                          session.status
                        )}`}
                      >
                        {getSessionStatusLabel(
                          session.status
                        )}
                      </span>
                    </div>

                    {/* Session status controls */}
                    {nextStatus ? (
                      <div className="mt-4 flex justify-end">
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
                            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            {canStart
                              ? "Start Session"
                              : "Complete Session"}
                          </button>
                        </form>
                      </div>
                    ) : null}

                    {/* AI Session Plan */}
                    <SessionAIPlan
                      sessionId={session.id}
                      plan={aiPlan ?? null}
                    />

                    {/* Session Notes */}
                    <SessionNotes
                      sessionId={session.id}
                      initialNotes={notes}
                    />

                    {/* AI Session Review */}
                    <SessionAIReview
                      sessionId={session.id}
                      hasNotes={
                        notes.trim().length > 0
                      }
                      review={review}
                    />

                    {/* Homework */}
                    <section className="mt-6 border-t border-slate-200 pt-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-slate-900">
                            Homework
                          </h4>

                          <p className="mt-1 text-sm text-slate-500">
                            Assign practice for this completed session
                            and track student completion.
                          </p>
                        </div>

                        <span className="text-sm font-medium text-slate-500">
                          {sessionHomework.length}{" "}
                          {sessionHomework.length === 1
                            ? "task"
                            : "tasks"}
                        </span>
                      </div>

                      {sessionHomework.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {sessionHomework.map(
                            (homeworkItem) => (
                              <div
                                key={homeworkItem.id}
                                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p
                                    className={`text-sm leading-6 ${
                                      homeworkItem.completed
                                        ? "text-slate-500 line-through"
                                        : "text-slate-800"
                                    }`}
                                  >
                                    {homeworkItem.task}
                                  </p>

                                  <span
                                    className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      homeworkItem.completed
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                        : "bg-amber-50 text-amber-700 border border-amber-100"
                                    }`}
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
                                    className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </form>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                          No homework has been assigned for this
                          session yet.
                        </div>
                      )}

                      {canManageHomework ? (
                        <form
                          action={
                            createHomeworkAction
                          }
                          className="mt-4 rounded-lg border border-slate-200 bg-white p-4"
                        >
                          <input
                            type="hidden"
                            name="sessionId"
                            value={session.id}
                          />

                          <label
                            htmlFor={`homework-${session.id}`}
                            className="block text-sm font-medium text-slate-700"
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
                              className="min-h-24 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />

                            <button
                              type="submit"
                              className="self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                              Add homework
                            </button>
                          </div>

                          <p className="mt-2 text-xs text-slate-400">
                            Up to 1,000 characters.
                          </p>
                        </form>
                      ) : (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                          Homework can be assigned after the
                          session is completed or AI-reviewed.
                        </div>
                      )}
                    </section>
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
              {students?.length === 1
                ? "student"
                : "students"}
            </span>
          </div>

          {studentsError ? (
            <div className="p-6">
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                Failed to load students. Please try again.
              </div>
            </div>
          ) : students &&
            students.length > 0 ? (
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