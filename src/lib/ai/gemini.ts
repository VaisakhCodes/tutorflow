import { GoogleGenAI } from "@google/genai";

const PRIMARY_GEMINI_MODEL = "gemini-3.7-flash";
const FALLBACK_GEMINI_MODEL = "gemini-3.6-flash";

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [2000, 5000];

export type SessionPlan = {
  objectives: string[];
  lesson_outline: string[];
  practice_questions: string[];
};

export type SessionReview = {
  summary: string;
  next_session_suggestion: string;
};

export type ProgressSummary = {
  summary: string;
  improving_areas: string[];
  struggling_areas: string[];
};

const SESSION_PLAN_SCHEMA = {
  type: "object",
  properties: {
    objectives: {
      type: "array",
      items: {
        type: "string",
      },
    },
    lesson_outline: {
      type: "array",
      items: {
        type: "string",
      },
    },
    practice_questions: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "objectives",
    "lesson_outline",
    "practice_questions",
  ],
};

const SESSION_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
    },
    next_session_suggestion: {
      type: "string",
    },
  },
  required: [
    "summary",
    "next_session_suggestion",
  ],
};

const PROGRESS_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
    },
    improving_areas: {
      type: "array",
      maxItems: 3,
      items: {
        type: "string",
      },
    },
    struggling_areas: {
      type: "array",
      maxItems: 3,
      items: {
        type: "string",
      },
    },
  },
  required: [
    "summary",
    "improving_areas",
    "struggling_areas",
  ],
};

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({
    apiKey,
  });
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
  };

  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (typeof candidate.code === "number") {
    return candidate.code;
  }

  if (typeof candidate.message === "string") {
    const match = candidate.message.match(/\b(429|500|503|504)\b/);

    if (match) {
      return Number(match[1]);
    }
  }

  return undefined;
}

function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);

  return (
    status === 429 ||
    status === 500 ||
    status === 503 ||
    status === 504
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  responseJsonSchema: Record<string, unknown>
) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      });
    } catch (error) {
      const retryable = isRetryableError(error);
      const hasRetriesLeft = attempt < MAX_RETRIES;

      if (!retryable || !hasRetriesLeft) {
        throw error;
      }

      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error(`Gemini request failed for model ${model}.`);
}

async function generateWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  responseJsonSchema: Record<string, unknown>
) {
  try {
    return await generateWithRetry(
      ai,
      PRIMARY_GEMINI_MODEL,
      prompt,
      responseJsonSchema
    );
  } catch (primaryError) {
    if (!isRetryableError(primaryError)) {
      throw primaryError;
    }

    try {
      return await generateWithRetry(
        ai,
        FALLBACK_GEMINI_MODEL,
        prompt,
        responseJsonSchema
      );
    } catch (fallbackError) {
      console.error(
        `Primary Gemini model "${PRIMARY_GEMINI_MODEL}" failed:`,
        primaryError
      );

      console.error(
        `Fallback Gemini model "${FALLBACK_GEMINI_MODEL}" failed:`,
        fallbackError
      );

      throw fallbackError;
    }
  }
}

function parseJsonResponse(responseText: string): unknown {
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }
}

export async function generateSessionPlan(params: {
  studentName: string;
  subject: string;
  currentLevel: string;
  learningGoals: string;
  weakAreas: string;
  topic: string;
  pastSessions: Array<{
    scheduled_at: string;
    topic: string;
    status: string;
  }>;
}): Promise<SessionPlan> {
  const ai = getGeminiClient();

  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }

  const pastSessionsText =
    params.pastSessions.length > 0
      ? params.pastSessions
          .map(
            (session) =>
              `- ${session.scheduled_at}: ${session.topic} (${session.status})`
          )
          .join("\n")
      : "No previous sessions available.";

  const prompt = `
You are an expert private tutor planning a focused tutoring session.

Create a personalized lesson plan using the student's profile and previous tutoring history.

STUDENT PROFILE
Name: ${params.studentName}
Subject: ${params.subject}
Current level: ${params.currentLevel}
Learning goals: ${params.learningGoals}
Weak areas: ${params.weakAreas}

CURRENT SESSION
Topic: ${params.topic}

PREVIOUS SESSIONS
${pastSessionsText}

REQUIREMENTS
1. Create exactly 3 concise learning objectives.
2. Create exactly 4 lesson-outline steps in a logical teaching sequence.
3. Create exactly 3 practice questions appropriate for the student's level.
4. Personalize the plan to the student's learning goals and weak areas.
5. Use previous session topics to avoid unnecessary repetition and build on prior learning.
6. Keep all content practical and suitable for a one-on-one tutoring session.
7. Return only the requested structured JSON data.
`;

  const response = await generateWithFallback(
    ai,
    prompt,
    SESSION_PLAN_SCHEMA
  );

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = parseJsonResponse(response.text);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("objectives" in parsed) ||
    !("lesson_outline" in parsed) ||
    !("practice_questions" in parsed)
  ) {
    throw new Error("Gemini returned an invalid session plan.");
  }

  const plan = parsed as SessionPlan;

  if (
    !Array.isArray(plan.objectives) ||
    plan.objectives.length !== 3 ||
    !plan.objectives.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0
    ) ||
    !Array.isArray(plan.lesson_outline) ||
    plan.lesson_outline.length !== 4 ||
    !plan.lesson_outline.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0
    ) ||
    !Array.isArray(plan.practice_questions) ||
    plan.practice_questions.length !== 3 ||
    !plan.practice_questions.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0
    )
  ) {
    throw new Error(
      "Gemini returned an incorrectly structured session plan."
    );
  }

  return plan;
}

export async function generateSessionReview(params: {
  studentName: string;
  subject: string;
  currentLevel: string;
  learningGoals: string;
  weakAreas: string;
  topic: string;
  sessionNotes: string;
  scheduledAt: string;
  pastSessions: Array<{
    scheduled_at: string;
    topic: string;
    status: string;
  }>;
  existingPlan?: SessionPlan | null;
}): Promise<SessionReview> {
  const ai = getGeminiClient();

  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }

  const pastSessionsText =
    params.pastSessions.length > 0
      ? params.pastSessions
          .map(
            (session) =>
              `- ${session.scheduled_at}: ${session.topic} (${session.status})`
          )
          .join("\n")
      : "No previous sessions available.";

  const existingPlanText = params.existingPlan
    ? `
CURRENT AI SESSION PLAN

Objectives:
${params.existingPlan.objectives
  .map((item) => `- ${item}`)
  .join("\n")}

Lesson outline:
${params.existingPlan.lesson_outline
  .map((item) => `- ${item}`)
  .join("\n")}

Practice questions:
${params.existingPlan.practice_questions
  .map((item) => `- ${item}`)
  .join("\n")}
`
    : "No AI session plan was created for this session.";

  const prompt = `
You are an expert private tutor reviewing a completed one-on-one tutoring session.

Analyze the student's actual session notes in the context of their profile, goals, weak areas, previous sessions, and planned lesson when available.

STUDENT PROFILE
Name: ${params.studentName}
Subject: ${params.subject}
Current level: ${params.currentLevel}
Learning goals: ${params.learningGoals}
Weak areas: ${params.weakAreas}

CURRENT SESSION
Topic: ${params.topic}
Scheduled at: ${params.scheduledAt}

SESSION NOTES
${params.sessionNotes}

PREVIOUS SESSIONS
${pastSessionsText}

${existingPlanText}

REQUIREMENTS
1. Write a concise but useful summary of what happened in the session.
2. Evaluate progress using only evidence available in the session notes and provided context.
3. Mention meaningful strengths or improvements when supported by the notes.
4. Identify important areas that still need attention when supported by the notes.
5. Recommend a specific next-session focus based on the student's goals and current needs.
6. Do not invent events, performance, scores, or achievements that are not present in the provided information.
7. Return only the requested structured JSON data.
`;

  const response = await generateWithFallback(
    ai,
    prompt,
    SESSION_REVIEW_SCHEMA
  );

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = parseJsonResponse(response.text);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("summary" in parsed) ||
    !("next_session_suggestion" in parsed)
  ) {
    throw new Error("Gemini returned an invalid session review.");
  }

  const review = parsed as SessionReview;

  if (
    typeof review.summary !== "string" ||
    review.summary.trim().length === 0 ||
    typeof review.next_session_suggestion !== "string" ||
    review.next_session_suggestion.trim().length === 0
  ) {
    throw new Error(
      "Gemini returned an incorrectly structured session review."
    );
  }

  return review;
}

export async function generateProgressSummary(params: {
  studentName: string;
  subject: string;
  currentLevel: string;
  learningGoals: string;
  weakAreas: string;
  sessions: Array<{
    scheduled_at: string;
    topic: string;
    status: string;
    reviewSummary?: string | null;
    nextSessionSuggestion?: string | null;
  }>;
}): Promise<ProgressSummary> {
  const ai = getGeminiClient();

  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }

  const reviewedSessions = params.sessions.filter(
    (session) =>
      typeof session.reviewSummary === "string" &&
      session.reviewSummary.trim().length > 0
  );

  const sessionHistory =
    reviewedSessions.length > 0
      ? reviewedSessions
          .map(
            (session) => `
- Date: ${session.scheduled_at}
- Topic: ${session.topic}
- Status: ${session.status}
- Session review summary: ${session.reviewSummary}
- Next-session suggestion: ${
              session.nextSessionSuggestion?.trim() ||
              "No suggestion available."
            }
`
          )
          .join("\n")
      : "No previous AI session reviews are available.";

  const prompt = `
You are an expert private tutor analyzing a student's learning progress over time.

Use the student's profile and the available AI session reviews to produce a concise progress assessment.

STUDENT PROFILE
Name: ${params.studentName}
Subject: ${params.subject}
Current level: ${params.currentLevel}
Learning goals: ${params.learningGoals}
Known weak areas: ${params.weakAreas}

PAST AI SESSION REVIEWS
${sessionHistory}

REQUIREMENTS
1. Write one concise overall progress summary.
2. Identify up to 3 areas where the student is improving, but include only improvements that are supported by the available evidence.
3. Identify up to 3 areas where the student is still struggling, but include only challenges that are supported by the available evidence.
4. Do not invent progress, strengths, weaknesses, achievements, scores, or behaviors.
5. If there is not enough evidence to identify 3 improving areas, return fewer than 3 improving areas.
6. If there is not enough evidence to identify 3 struggling areas, return fewer than 3 struggling areas.
7. Clearly acknowledge limited evidence in the overall summary when only a small number of reviewed sessions are available.
8. Use the student's learning goals and known weak areas as context, but do not treat them as proof of current progress or struggle unless the session reviews support that conclusion.
9. Base every conclusion only on the supplied student profile and AI session reviews.
10. Keep each improving or struggling area concise and specific.
11. Return only the requested structured JSON data.
`;

  const response = await generateWithFallback(
    ai,
    prompt,
    PROGRESS_SUMMARY_SCHEMA
  );

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = parseJsonResponse(response.text);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("summary" in parsed) ||
    !("improving_areas" in parsed) ||
    !("struggling_areas" in parsed)
  ) {
    throw new Error(
      "Gemini returned an invalid progress summary."
    );
  }

  const progressSummary = parsed as ProgressSummary;

  if (
    typeof progressSummary.summary !== "string" ||
    progressSummary.summary.trim().length === 0 ||
    !Array.isArray(progressSummary.improving_areas) ||
    progressSummary.improving_areas.length > 3 ||
    !progressSummary.improving_areas.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0
    ) ||
    !Array.isArray(progressSummary.struggling_areas) ||
    progressSummary.struggling_areas.length > 3 ||
    !progressSummary.struggling_areas.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0
    )
  ) {
    throw new Error(
      "Gemini returned an incorrectly structured progress summary."
    );
  }

  return progressSummary;
}