# TutorFlow

TutorFlow is a tutoring management application built for tutors and students.

## Features

- Tutor and student authentication with role-based access
- Student profiles with learning goals and weak areas
- Session scheduling with clash prevention
- Session state flow: scheduled → in progress → completed → AI reviewed
- Session notes with autosave
- AI-generated session plans
- AI-generated session reviews
- Student progress summaries
- Homework assignment and completion tracking
- Student dashboard for upcoming sessions, completed-session notes, and homework

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Google Gemini API

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env.local` file with the required environment variables.

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

For a production build:

```bash
npm run build
```

For linting:

```bash
npm run lint
```

## Database Structure

TutorFlow uses Supabase/PostgreSQL.

### `profiles`

Stores authenticated user profiles and their application role.

- `id` - profile/user identifier
- `role` - `tutor` or `student`

### `students`

Stores each student's tutoring profile.

- `id` - primary key
- `profile_id` - linked student profile
- `tutor_id` - tutor responsible for the student
- `name`
- `subject`
- `current_level`
- `learning_goals`
- `weak_areas`
- `created_at`

### `sessions`

Stores tutoring sessions and their current state.

- `id` - primary key
- `tutor_id` - tutor who owns the session
- `student_id` - student assigned to the session
- `scheduled_at`
- `topic`
- `status`
- `created_at`

Session status values are:

- `scheduled`
- `in_progress`
- `completed`
- `ai_reviewed`

The database also prevents a tutor from being double-booked at the same scheduled time.

### `session_notes`

Stores notes for a tutoring session.

- `id`
- `session_id`
- `notes`
- `updated_at`

Each session has one notes record.

### `ai_plans`

Stores AI-generated session plans.

- `id`
- `session_id`
- `objectives`
- `lesson_outline`
- `practice_questions`
- `raw_response`
- `created_at`

### `ai_reviews`

Stores AI-generated session reviews.

- `id`
- `session_id`
- `summary`
- `next_session_suggestion`
- `raw_response`
- `created_at`

### `homework`

Stores homework assigned from tutoring sessions.

- `id`
- `student_id`
- `session_id`
- `task`
- `completed`
- `created_at`

## Database Relationships

The main relationships are:

```text
profiles
  └── students.profile_id → profiles.id

profiles
  └── students.tutor_id → profiles.id

students
  └── sessions.student_id → students.id

profiles
  └── sessions.tutor_id → profiles.id

sessions
  └── session_notes.session_id → sessions.id

sessions
  └── ai_plans.session_id → sessions.id

sessions
  └── ai_reviews.session_id → sessions.id

students
  └── homework.student_id → students.id

sessions
  └── homework.session_id → sessions.id
```

`homework(session_id, student_id)` also has a composite foreign-key relationship to `sessions(id, student_id)` so homework cannot be attached to a session belonging to a different student.

## Data Access and Security

Tutor-owned records are restricted using Supabase Row Level Security policies.

Tutors can access only their own students, sessions, session notes, AI plans, AI reviews, and related homework.

Students can access only their own profile, sessions, completed-session notes, and homework.

The application also enforces role-based route protection on the server: students attempting to access `/tutor` are redirected to `/student`, while tutors attempting to access `/student` are redirected to `/tutor`.

## Session State Flow

Sessions follow this order:

```text
Scheduled
    ↓
In Progress
    ↓
Completed
    ↓
AI Reviewed
```

The normal session flow does not allow skipping or moving backward through these states. Completed sessions are protected from normal editing, while AI review remains the post-completion action.

## AI Prompts

TutorFlow uses Gemini for three AI workflows. The prompts are designed to use the student's actual profile and session history so the generated content is personalized rather than generic.

### 1. AI Session Plan

The application sends a prompt in this form:

```text
You are an expert private tutor planning a focused tutoring session.

Create a personalized lesson plan using the student's profile and previous tutoring history.

STUDENT PROFILE
Name: ${studentName}
Subject: ${subject}
Current level: ${currentLevel}
Learning goals: ${learningGoals}
Weak areas: ${weakAreas}

CURRENT SESSION
Topic: ${topic}

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
```

Why it is written this way:

- It supplies the student's profile, current topic, and previous sessions as context.
- It explicitly requires exactly 3 objectives, 4 lesson-outline steps, and 3 practice questions.
- It instructs Gemini to personalize the lesson and build on previous learning.
- It requires structured JSON so the application can validate and store the response reliably.

### 2. AI Session Review

The application sends a prompt in this form:

```text
You are an expert private tutor reviewing a completed one-on-one tutoring session.

Analyze the student's actual session notes in the context of their profile, goals, weak areas, previous sessions, and planned lesson when available.

STUDENT PROFILE
Name: ${studentName}
Subject: ${subject}
Current level: ${currentLevel}
Learning goals: ${learningGoals}
Weak areas: ${weakAreas}

CURRENT SESSION
Topic: ${topic}
Scheduled at: ${scheduledAt}

SESSION NOTES
${sessionNotes}

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
```

Why it is written this way:

- It gives Gemini the actual session notes rather than asking for a generic review.
- It provides student goals, weak areas, previous sessions, and the existing lesson plan when available.
- It explicitly prevents invented performance claims.
- It asks for a concrete next-session focus and structured JSON for reliable validation.

### 3. AI Progress Summary

The application sends a prompt in this form:

```text
You are an expert private tutor analyzing a student's learning progress over time.

Use the student's profile and the available AI session reviews to produce a concise progress assessment.

STUDENT PROFILE
Name: ${studentName}
Subject: ${subject}
Current level: ${currentLevel}
Learning goals: ${learningGoals}
Known weak areas: ${weakAreas}

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
```

Why it is written this way:

- It analyzes reviewed sessions rather than inventing progress from the profile alone.
- It limits improvement and struggle areas to evidence-supported findings.
- It explicitly handles limited history by allowing fewer results.
- It separates profile context from evidence of actual progress.

## AI Response Validation and Failure Handling

Gemini responses are requested as structured JSON and validated before being stored.

The AI layer also handles common failure cases such as:

- Missing Gemini API configuration
- Retryable API errors
- Empty AI responses
- Malformed JSON
- Invalid or incomplete response structures

The application returns readable error messages to the UI when an AI request or save operation fails instead of treating the failure as a successful result.

## Test Logins

### Tutor

Email: `tutor@gmail.com`

Password: `TutorFlow@2026!`

### Student

Email: `student@gmail.com`

Password: `student@2026`

## Live Demo

Live URL: https://tutorflow-flax.vercel.app/

## GitHub Repository

Repository: https://github.com/VaisakhCodes/tutorflow

## Project Status

The implemented project currently includes authentication, server-side role protection, student profiles, scheduling, session state management, session notes, AI session plans, AI session reviews, progress summaries, homework assignment/completion tracking, and the student dashboard.

## What I Would Build Next

With another day, I would improve the student experience by adding clearer progress visualizations based on completed sessions and AI reviews.
I would add richer homework tracking so tutors can see completion trends over time.
I would improve the scheduling experience with a more flexible calendar view and clearer availability feedback.
I would add email notifications for important session and homework events.
I would expand the AI workflow with more longitudinal context so recommendations improve as more sessions are completed.
