import { getAuthRole } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function TutorPage() {
  const auth = await getAuthRole();

  // Server-side authorization
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600">TutorFlow</span>

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
            Manage your students and their learning profiles.
          </p>
        </div>

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
                Student accounts and profiles will appear here once created.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}