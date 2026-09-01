"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStudent } from "./actions";

export default function AddStudentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [weakAreas, setWeakAreas] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await createStudent({
        email,
        password,
        name,
        subject,
        currentLevel,
        learningGoals,
        weakAreas,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess("Student created successfully.");

      setEmail("");
      setPassword("");
      setName("");
      setSubject("");
      setCurrentLevel("");
      setLearningGoals("");
      setWeakAreas("");

      router.refresh();
    });
  }

  return (
    <section className="mb-8 bg-white border border-slate-200 rounded-xl shadow-xs">
      <div className="px-6 py-5 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">
          Add Student
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Create a student account and learning profile.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="student-name"
              className="block text-sm font-medium text-slate-700"
            >
              Student name
            </label>

            <input
              id="student-name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label
              htmlFor="student-email"
              className="block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="student-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isPending}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
              placeholder="student@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="student-password"
              className="block text-sm font-medium text-slate-700"
            >
              Temporary password
            </label>

            <input
              id="student-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
              placeholder="Enter a temporary password"
            />
          </div>

          <div>
            <label
              htmlFor="student-subject"
              className="block text-sm font-medium text-slate-700"
            >
              Subject
            </label>

            <input
              id="student-subject"
              type="text"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={isPending}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
              placeholder="Mathematics"
            />
          </div>

          <div>
            <label
              htmlFor="student-level"
              className="block text-sm font-medium text-slate-700"
            >
              Current level
            </label>

            <input
              id="student-level"
              type="text"
              required
              value={currentLevel}
              onChange={(event) => setCurrentLevel(event.target.value)}
              disabled={isPending}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
              placeholder="Grade 10"
            />
          </div>

          <div>
            <label
              htmlFor="student-goals"
              className="block text-sm font-medium text-slate-700"
            >
              Learning goals
            </label>

            <textarea
              id="student-goals"
              required
              rows={3}
              value={learningGoals}
              onChange={(event) => setLearningGoals(event.target.value)}
              disabled={isPending}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
              placeholder="Improve algebra and problem solving"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="student-weak-areas"
            className="block text-sm font-medium text-slate-700"
          >
            Weak areas
          </label>

          <textarea
            id="student-weak-areas"
            required
            rows={3}
            value={weakAreas}
            onChange={(event) => setWeakAreas(event.target.value)}
            disabled={isPending}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
            placeholder="Fractions, equations, word problems"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Creating student..." : "Create student"}
          </button>
        </div>
      </form>
    </section>
  );
}