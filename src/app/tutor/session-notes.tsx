"use client";

import { useState, useTransition } from "react";
import { saveSessionNotes } from "./actions";

type SessionNotesProps = {
  sessionId: string;
  initialNotes: string;
};

export default function SessionNotes({
  sessionId,
  initialNotes,
}: SessionNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      const result = await saveSessionNotes(sessionId, notes);

      if (!result.success) {
        setIsError(true);
        setMessage(result.error);
        return;
      }

      setIsError(false);
      setMessage("Session notes saved successfully.");
    });
  };

  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-900">
          Session Notes
        </h4>

        <p className="mt-1 text-xs text-slate-500">
          Record what was covered, student progress, challenges, and
          important observations.
        </p>
      </div>

      <textarea
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setMessage(null);
        }}
        rows={5}
        maxLength={10000}
        placeholder="Write notes about this tutoring session..."
        disabled={isPending}
        className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-xs text-slate-400">
          {notes.length}/10000
        </span>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !notes.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Saving..." : "Save notes"}
        </button>
      </div>

      {message && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}