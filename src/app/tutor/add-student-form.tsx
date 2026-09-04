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
    <section className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Add Student
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Create a student account and learning profile.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-error-border bg-error-background p-4 text-sm text-error"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-md border border-success-border bg-success-background p-4 text-sm text-success"
          >
            {success}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="student-name"
              className="block text-sm font-medium text-text-primary"
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
              className="ui-control mt-1 placeholder:text-text-muted"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label
              htmlFor="student-email"
              className="block text-sm font-medium text-text-primary"
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
              className="ui-control mt-1 placeholder:text-text-muted"
              placeholder="student@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="student-password"
              className="block text-sm font-medium text-text-primary"
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
              className="ui-control mt-1 placeholder:text-text-muted"
              placeholder="Enter a temporary password"
            />
          </div>

          <div>
            <label
              htmlFor="student-subject"
              className="block text-sm font-medium text-text-primary"
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
              className="ui-control mt-1 placeholder:text-text-muted"
              placeholder="Mathematics"
            />
          </div>

          <div>
            <label
              htmlFor="student-level"
              className="block text-sm font-medium text-text-primary"
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
              className="ui-control mt-1 placeholder:text-text-muted"
              placeholder="Grade 10"
            />
          </div>

          <div>
            <label
              htmlFor="student-goals"
              className="block text-sm font-medium text-text-primary"
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
              className="ui-control mt-1 resize-y placeholder:text-text-muted"
              placeholder="Improve algebra and problem solving"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="student-weak-areas"
            className="block text-sm font-medium text-text-primary"
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
            className="ui-control mt-1 resize-y placeholder:text-text-muted"
            placeholder="Fractions, equations, word problems"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="ui-button-primary"
          >
            {isPending ? "Creating student..." : "Create student"}
          </button>
        </div>
      </form>
    </section>
  );
}