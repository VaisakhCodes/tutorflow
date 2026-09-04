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
    <section className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Schedule Session
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Schedule a session with one of your students.
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

        {students.length === 0 ? (
          <div className="rounded-md border border-border bg-surface-muted p-4 text-sm text-text-secondary">
            Create a student before scheduling a session.
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="session-student"
                  className="block text-sm font-medium text-text-primary"
                >
                  Student
                </label>

                <select
                  id="session-student"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  disabled={isPending}
                  className="ui-control mt-1 disabled:bg-surface-muted"
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
                  className="block text-sm font-medium text-text-primary"
                >
                  Date and time
                </label>

                <input
                  id="session-date"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  disabled={isPending}
                  className="ui-control mt-1 disabled:bg-surface-muted"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="session-topic"
                className="block text-sm font-medium text-text-primary"
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
                className="ui-control mt-1 placeholder:text-text-muted"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="ui-button-primary"
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