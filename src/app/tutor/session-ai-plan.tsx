"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateSessionPlanForSession } from "./actions";

type SessionAIPlanData = {
  id: string;
  objectives: string[];
  lesson_outline: string[];
  practice_questions: string[];
};

type SessionAIPlanProps = {
  sessionId: string;
  plan: SessionAIPlanData | null;
};

export default function SessionAIPlan({
  sessionId,
  plan,
}: SessionAIPlanProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);

    startTransition(async () => {
      const result = await generateSessionPlanForSession(sessionId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      {!plan ? (
        <>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Generating AI Plan..." : "Generate AI Plan"}
          </button>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                AI Session Plan
              </h4>

              <p className="mt-1 text-xs text-slate-500">
                Personalized from the student profile and previous
                sessions.
              </p>
            </div>

            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
              AI Ready
            </span>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <h5 className="text-sm font-semibold text-slate-900">
                Learning Objectives
              </h5>

              <ol className="mt-2 space-y-2">
                {plan.objectives.map((objective, index) => (
                  <li
                    key={`${plan.id}-objective-${index}`}
                    className="flex gap-3 text-sm text-slate-700"
                  >
                    <span className="font-semibold text-violet-600">
                      {index + 1}.
                    </span>

                    <span>{objective}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h5 className="text-sm font-semibold text-slate-900">
                Lesson Outline
              </h5>

              <ol className="mt-2 space-y-2">
                {plan.lesson_outline.map((step, index) => (
                  <li
                    key={`${plan.id}-outline-${index}`}
                    className="flex gap-3 text-sm text-slate-700"
                  >
                    <span className="font-semibold text-violet-600">
                      {index + 1}.
                    </span>

                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h5 className="text-sm font-semibold text-slate-900">
                Practice Questions
              </h5>

              <ol className="mt-2 space-y-2">
                {plan.practice_questions.map((question, index) => (
                  <li
                    key={`${plan.id}-question-${index}`}
                    className="flex gap-3 text-sm text-slate-700"
                  >
                    <span className="font-semibold text-violet-600">
                      {index + 1}.
                    </span>

                    <span>{question}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}