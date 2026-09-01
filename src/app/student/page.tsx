import { getAuthRole } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentPage() {
  const auth = await getAuthRole();

  // Server-side authorization rules:
  // 1. Unauthenticated -> redirect to /login
  if (!auth) {
    redirect("/login");
  }

  // 2. Tutor visiting student area -> redirect to /tutor
  if (auth.role === "tutor") {
    redirect("/tutor");
  }

  // 3. Fallback for unresolvable roles -> redirect to /login
  if (auth.role !== "student") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs max-w-2xl mx-auto">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-4">
            Server-Side Authorization Passed
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Student Area</h1>
          <p className="text-slate-600 mb-6">Authenticated as student.</p>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 text-slate-600 font-mono">
            <div><strong>User ID:</strong> {auth.userId}</div>
            <div><strong>Role:</strong> {auth.role}</div>
            <div><strong>Verification:</strong> Enforced server-side via getClaims() & profiles table</div>
          </div>
        </div>
      </main>
    </div>
  );
}
