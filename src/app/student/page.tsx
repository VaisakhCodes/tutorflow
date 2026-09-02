import { createClient, getAuthRole } from "@/lib/supabase/server";
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

type AIReviewRecord = {
  session_id: string;
  summary: string;
  next_session_suggestion: string;
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
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
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

  const supabase = await createClient();

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
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
   * The student's application record is linked to the authenticated
   * Supabase user through students.profile_id.
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
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-red-700">
            Student profile not found
          </h1>
          <p className="mt-2 text-sm text-slate-600">
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
  let reviews: AIReviewRecord[] = [];

  if (sessionIds.length > 0) {
    const [{ data: notesData }, { data: reviewsData }] = await Promise.all([
      supabase
        .from("session_notes")
        .select("session_id, notes")
        .in("session_id", sessionIds)
        .returns<SessionNoteRecord[]>(),

      supabase
        .from("ai_reviews")
        .select(
          "session_id, summary, next_session_suggestion"
        )
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
        .returns<AIReviewRecord[]>(),
    ]);

    notes = notesData ?? [];
    reviews = reviewsData ?? [];
  }

  const upcomingSessions = sessionRecords
    .filter((session) => {
      const status = session.status.toLowerCase();

      return status === "scheduled";
    })
    .slice(0, 5);

  const recentSessions = sessionRecords
    .filter((session) => {
      const status = session.status.toLowerCase();

      return status !== "scheduled" && status !== "cancelled";
    })
    .sort(
      (a, b) =>
        b.scheduled_at.localeCompare(a.scheduled_at)
    )
    .slice(0, 5);

  const notesBySessionId = new Map(
    notes.map((note) => [note.session_id, note])
  );

  const reviewBySessionId = new Map<string, AIReviewRecord>();

  for (const review of reviews) {
    if (!reviewBySessionId.has(review.session_id)) {
      reviewBySessionId.set(review.session_id, review);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-xl font-bold text-blue-600">
            TutorFlow
          </span>

          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Student Dashboard
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Welcome, {student.name}
          </h1>

          <p className="mt-2 text-slate-600">
            View your learning profile, tutoring sessions, and progress.
          </p>
        </div>

        {sessionsError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Your session history could not be loaded completely. Please try
            again later.
          </div>
        )}

        <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              My Learning Profile
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your current learning profile and goals.
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
                Areas to improve
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {student.weak_areas}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Upcoming Sessions
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your next scheduled tutoring sessions.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {upcomingSessions.length}{" "}
              {upcomingSessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>

          {upcomingSessions.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="px-6 py-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {session.topic}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {formatSessionDate(session.scheduled_at)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                        session.status
                      )}`}
                    >
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <h3 className="text-base font-semibold text-slate-900">
                No upcoming sessions
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Your next tutoring session will appear here once it is
                scheduled.
              </p>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Sessions
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your most recent tutoring activity and feedback.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {recentSessions.length}{" "}
              {recentSessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>

          {recentSessions.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {recentSessions.map((session) => {
                const note = notesBySessionId.get(session.id);
                const review = reviewBySessionId.get(session.id);

                return (
                  <article
                    key={session.id}
                    className="px-6 py-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {session.topic}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatSessionDate(session.scheduled_at)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          session.status
                        )}`}
                      >
                        {session.status}
                      </span>
                    </div>

                    {note?.notes && (
                      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Session notes
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {note.notes}
                        </p>
                      </div>
                    )}

                    {review && (
                      <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50/40 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold text-violet-900">
                            AI Session Review
                          </p>

                          <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                            AI Ready
                          </span>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Summary
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {review.summary}
                          </p>
                        </div>

                        {review.next_session_suggestion && (
                          <div className="mt-4 border-t border-violet-100 pt-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              Next learning step
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-700">
                              {review.next_session_suggestion}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <h3 className="text-base font-semibold text-slate-900">
                No previous sessions
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Your completed tutoring sessions will appear here.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}