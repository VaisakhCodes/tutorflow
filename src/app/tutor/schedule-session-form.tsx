"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scheduleSession } from "./actions";

type StudentOption = {
  id: string;
  name: string;
  subject: string;
};

type ScheduleSessionFormProps = {
  students: StudentOption[];
};

export default function ScheduleSessionForm({
  students,
}: ScheduleSessionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [studentId, setStudentId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [topic, setTopic] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!studentId || !scheduledAt || !topic.trim()) {
      setError("Please complete all fields.");
      return;
    }

    const isoDate = new Date(scheduledAt).toISOString();

    startTransition(async () => {
      const result = await scheduleSession({
        studentId,
        scheduledAt: isoDate,
        topic,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess("Session scheduled successfully.");

      setStudentId("");
      setScheduledAt("");
      setTopic("");

      router.refresh();
    });
  }

  return (
    <section className="mb-8 overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="px-6 py-5 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">
          Schedule Session
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Schedule a session with one of your students.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {students.length === 0 ? (
          <div className="rounded-md bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            Create a student before scheduling a session.
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="session-student"
                  className="block text-sm font-medium text-slate-700"
                >
                  Student
                </label>

                <select
                  id="session-student"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  disabled={isPending}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                >
                  <option value="">Select a student</option>

                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} — {student.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="session-date"
                  className="block text-sm font-medium text-slate-700"
                >
                  Date and time
                </label>

                <input
                  id="session-date"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  disabled={isPending}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="session-topic"
                className="block text-sm font-medium text-slate-700"
              >
                Topic
              </label>

              <input
                id="session-topic"
                type="text"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                disabled={isPending}
                placeholder="Linear equations"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Scheduling..." : "Schedule session"}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
}